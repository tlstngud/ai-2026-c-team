import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { addLogByUserId, getLogsByUserId } from '../utils/LogService';
import { storage } from '../utils/localStorage';
import { startGpsMonitoring, stopGpsMonitoring, requestMotionPermission, getCurrentPosition, getAddressFromCoords, SCORE_CONFIG } from '../utils/GpsService';
import { modelAPI } from '../utils/modelAPI';
import { voiceService } from '../utils/VoiceService';
import { wordChainService } from '../utils/WordChainService';
import { AlertTriangle, X, MapPin, Search, Award } from 'lucide-react';
import { STATE_CONFIG, APPLE_STATE_CONFIG } from './constants';
import Header from './Header';
import BottomNav from './BottomNav';
import DrivePage from './DrivePage';
import InsurancePage from './InsurancePage';
import InsurancePolicyPage from './InsurancePolicyPage';
import DrivingLogPage from './DrivingLogPage';
import LogDetailPage from './LogDetailPage';
import MyPage from './MyPage';
import Toast from './Toast';

// 지자체별 챌린지 데이터베이스
const MUNICIPALITY_DB = {
    '춘천': {
        name: '춘천시',
        campaign: '스마일 춘천 안전운전',
        color: 'bg-emerald-500',
        accent: 'text-emerald-600',
        target: 90,
        reward: '춘천사랑상품권 3만원 + 보험할인',
        bgImage: 'from-emerald-900 to-slate-900'
    },
    '서울': {
        name: '서울특별시',
        campaign: '서울 마이-티 드라이버',
        color: 'bg-indigo-600',
        accent: 'text-indigo-600',
        target: 92,
        reward: '서울시 공영주차장 50% 할인권',
        bgImage: 'from-indigo-900 to-slate-900'
    },
    'default': {
        name: '전국 공통',
        campaign: '대한민국 안전운전 챌린지',
        color: 'bg-blue-600',
        accent: 'text-blue-600',
        target: 90,
        reward: '안전운전 인증서 발급',
        bgImage: 'from-blue-900 to-slate-900'
    }
};

const Dashboard = () => {
    // --- React Router ---
    const navigate = useNavigate();
    const location = useLocation();

    // --- Onboarding & User Region State ---
    const { user, setUser } = useAuth();
    const [step, setStep] = useState(() => {
        // 저장된 주소가 있으면 바로 대시보드로
        const savedRegion = localStorage.getItem('userRegion');
        return savedRegion ? 'dashboard' : 'onboarding';
    });
    const [inputAddress, setInputAddress] = useState('');
    const [voiceEnabled, setVoiceEnabled] = useState(() => {
        return localStorage.getItem('voiceEnabled') !== 'false';
    });
    const voiceEnabledRef = useRef(voiceEnabled); // Ref로 최신 상태 추적

    // voiceEnabled 변경 시 ref 업데이트
    useEffect(() => {
        voiceEnabledRef.current = voiceEnabled;
    }, [voiceEnabled]);

    const [userRegion, setUserRegion] = useState(() => {
        // localStorage에서 지역 정보 확인
        const saved = localStorage.getItem('userRegion');
        if (saved) return JSON.parse(saved);
        return null;
    });

    // --- Refs & State ---
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    // [추가] 누락된 Refs 추가 (카메라 복구용)
    const watchdogPausedUntilRef = useRef(0);
    const consecutivePausedCountRef = useRef(0);
    // 카메라 복구 시스템 refs (PR #16 - Watchdog 제거, 이벤트 기반)
    const captureVideoRef = useRef(null);  // 추론 전용 숨겨진 비디오
    const captureStreamRef = useRef(null);  // 추론 전용 클론 스트림
    const showCameraViewRef = useRef(false);
    const cameraWasActiveRef = useRef(false);
    const cameraRestartingRef = useRef(false);
    const cameraRestartAtRef = useRef(0);
    const cameraMuteTimeoutRef = useRef(null);
    const playbackRefreshAtRef = useRef(0);
    // 깜박임 방지를 위한 스트림 ID 추적
    const streamIdRef = useRef(null);

    const [showCameraView, setShowCameraView] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isActive, setIsActive] = useState(false);

    // showCameraView를 ref로 동기화 (이벤트 콜백에서 최신 값 접근용)
    useEffect(() => {
        showCameraViewRef.current = showCameraView;
    }, [showCameraView]);

    // 가중치 기반 점수 계산을 위한 상태
    const [driverBehaviorScore, setDriverBehaviorScore] = useState(100); // 운전자 행동 점수 (40%)
    const [speedLimitScore, setSpeedLimitScore] = useState(100); // 제한속도 준수 점수 (35%)
    const [accelDecelScore, setAccelDecelScore] = useState(100); // 급가속/감속 점수 (25%)

    // 최종 가중 평균 점수
    const [score, setScore] = useState(100);
    const [sessionTime, setSessionTime] = useState(0);
    const [currentState, setCurrentState] = useState(0);
    const [eventCount, setEventCount] = useState(0);
    const [drowsyCount, setDrowsyCount] = useState(0); // 졸음 횟수
    const [phoneCount, setPhoneCount] = useState(0); // 휴대폰 사용 횟수
    const [distractedCount, setDistractedCount] = useState(0); // 주시 태만 횟수
    const [showSummary, setShowSummary] = useState(false);
    const [finalSessionScore, setFinalSessionScore] = useState(null); // 세션 종료 시 최종 점수 저장
    const [history, setHistory] = useState([]);

    // GPS 관련 상태
    const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
    const [gpsAcceleration, setGpsAcceleration] = useState(0); // m/s²
    const [gpsEvents, setGpsEvents] = useState({ hardAccel: 0, hardBrake: 0, overspeed: 0 });
    const [sensorStatus, setSensorStatus] = useState({ gps: false, motion: false }); // 센서 작동 상태
    const [gpsAccuracy, setGpsAccuracy] = useState(null); // GPS 정확도 (미터)
    const [gpsStatus, setGpsStatus] = useState('GPS 검색중...'); // GPS 상태 메시지
    const [speedLimit, setSpeedLimit] = useState(null); // 도로 제한 속도 (km/h)
    const [roadName, setRoadName] = useState(null); // 도로명
    const [speedLimitLoading, setSpeedLimitLoading] = useState(false); // 제한 속도 조회 중 상태
    const [speedLimitDebug, setSpeedLimitDebug] = useState(null); // 디버깅 정보 (모바일용)
    const [showChallengeDetail, setShowChallengeDetail] = useState(false); // 챌린지 상세 페이지 표시 여부

    // 음성 서비스 상태
    const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, speaking
    const [lastTranscript, setLastTranscript] = useState(''); // 마지막 인식된 텍스트
    const [interimTranscript, setInterimTranscript] = useState(''); // 중간 인식 텍스트
    const [coupons, setCoupons] = useState([]);
    const [toast, setToast] = useState({ isVisible: false, message: '' });
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false); // 졸음 2회 누적 시 답변 대기 상태
    const [waitingReason, setWaitingReason] = useState(null); // 대기 원인: 'drowsy' | 'assault'
    const [isWordChainActive, setIsWordChainActive] = useState(false); // [NEW] 끝말잇기 게임 활성화 상태
    // [추가] 실시간 위치 정보 (기본값: 춘천시청 부근, heading 추가)
    const [currentLocation, setCurrentLocation] = useState({ lat: 37.8813153, lng: 127.7299707, heading: 0 });

    const gpsWatchIdRef = useRef(null);

    // 가중치 상수
    const WEIGHTS = {
        DRIVER_BEHAVIOR: 0.40,  // 운전자 행동 40%
        SPEED_LIMIT: 0.35,      // 제한속도 준수 35%
        ACCEL_DECEL: 0.25       // 급가속/감속 25%
    };

    // 각 요소별 점수 ref
    const driverBehaviorScoreRef = useRef(100);
    const speedLimitScoreRef = useRef(100);
    const accelDecelScoreRef = useRef(100);
    const scoreRef = useRef(100);
    const finalSessionScoreRef = useRef(null); // 세션 종료 시 최종 점수 저장 (ref로 즉시 접근 가능)

    // 투표 시스템 설정 (동적 - 백엔드에서 조절)
    const alertThresholdRef = useRef(20);  // 기본값: 20회 (1초에 경고)
    const voteBufferSizeRef = useRef(20);  // 기본값: 20 (alert_threshold와 동일)
    const inferenceBufferRef = useRef([]);  // 최근 추론 결과 버퍼
    const consecutiveCountRef = useRef(0);  // 연속 동일 상태 카운트
    const lastInferenceStateRef = useRef(0);  // 마지막 추론 상태
    const lastVotedStateRef = useRef(0);  // 마지막 투표 결과 상태
    const transcriptTimeoutRef = useRef(null); // STT 텍스트 자동 사라짐 타이머

    // 상태별 연속 카운트 (2초마다 반복 카운트용)
    const stateConsecutiveCountRef = useRef({
        drowsy: 0,
        distracted: 0
    });
    const CONSECUTIVE_THRESHOLD = 240; // 4초 = 240프레임 (60 FPS 기준)

    // TMAP 스타일 점수 설정
    const SCORE_CONFIG = {
        // 감점 (Penalty)
        PENALTY: {
            DROWSY: 8.0,      // 졸음 (4초 연속 감지 시)
            DISTRACTED: 4.0,  // 주시태만 (4초 연속 감지 시)
            ASSAULT: 10.0,    // 폭행 (즉시)
            HARD_BRAKE: 5.0,  // 급감속 (GPS)
            HARD_ACCEL: 3.0,  // 급가속 (GPS)
            OVERSPEED: 0.2    // 과속 (GPS)
        },
        // 회복 (Recovery)
        RECOVERY_PER_KM: 0.8, // 1km 주행당 회복 점수
        DIFFICULTY_MULTIPLIER: 1.5 // 90점 이상일 때 감점 가중치
    };

    // TMAP 점수 업데이트 함수
    const updateScore = (changeType, value) => {
        let currentScore = scoreRef.current;
        let newScore = currentScore;

        if (changeType === 'PENALTY') {
            let penalty = value;
            // 90점 이상일 때 감점 가중치 적용
            if (currentScore >= 90) {
                penalty *= SCORE_CONFIG.DIFFICULTY_MULTIPLIER;
            }
            newScore = Math.max(0, currentScore - penalty);
            console.log(`📉 감점: -${penalty.toFixed(1)} (현재: ${newScore.toFixed(1)}점)`);
        }
        else if (changeType === 'RECOVERY') {
            let recovery = value;
            // 80점 이상일 때 회복 속도 감소
            if (currentScore >= 80) {
                recovery *= 0.5;
            }
            newScore = Math.min(100, currentScore + recovery);
        }

        // 상태 업데이트
        scoreRef.current = newScore;

        // UI 렌더링 최적화를 위해 정수값이 변할 때만 setScore 호출
        if (Math.floor(currentScore) !== Math.floor(newScore)) {
            setScore(Math.floor(newScore));
        }

        // 개별 점수들도 동일하게 맞춰줌 (UI 표시용)
        setDriverBehaviorScore(newScore);
        setSpeedLimitScore(newScore);
        setAccelDecelScore(newScore);
    };

    // 가중 평균 점수 계산 함수
    const calculateWeightedScore = () => {
        const weightedScore =
            (driverBehaviorScoreRef.current * WEIGHTS.DRIVER_BEHAVIOR) +
            (speedLimitScoreRef.current * WEIGHTS.SPEED_LIMIT) +
            (accelDecelScoreRef.current * WEIGHTS.ACCEL_DECEL);
        return Math.max(0, Math.min(100, weightedScore));
    };
    const sessionTimeRef = useRef(0);
    const accumulatedDistanceRef = useRef(0); // 누적 거리 (미터 단위)
    const lastGpsTimeRef = useRef(null); // 마지막 GPS 업데이트 시간
    const normalStateDurationRef = useRef(0); // [NEW] 정상 상태 유지 시간 (초)

    // --- Initialize History & User Region ---
    useEffect(() => {
        const loadHistory = async () => {
            if (user) {
                try {
                    const saved = await getLogsByUserId(user.id);
                    setHistory(saved || []);
                } catch (error) {
                    console.error('주행 기록 로드 오류:', error);
                    setHistory([]);
                }

                // user에 region이 있으면 복원
                if (user.region && !userRegion) {
                    setUserRegion(user.region);
                    localStorage.setItem('userRegion', JSON.stringify(user.region));
                    if (step === 'onboarding') {
                        setStep('dashboard');
                    }
                }
            } else {
                // 로그인하지 않은 경우 빈 배열
                setHistory([]);
            }
        };
        loadHistory();
    }, [user]);

    // [초기화] '전국 공통'으로 잘못 잡힌 경우 다시 위치 찾기 유도
    useEffect(() => {
        if (userRegion && userRegion.name === '전국 공통') {
            console.log("전국 공통 감지 -> 온보딩으로 리셋 및 재검사");
            localStorage.removeItem('userRegion');
            setUserRegion(null);
            setStep('onboarding');
        }
    }, [userRegion]); // userRegion이 변경되거나 마운트될 때 체크

    // --- GPS 기반 자동 위치 찾기 (Onboarding 진입 시) ---
    useEffect(() => {
        if (step === 'onboarding' && !inputAddress) {
            const detectLocation = async () => {
                try {
                    setInputAddress("위치 확인 중...");
                    const pos = await getCurrentPosition();
                    const address = await getAddressFromCoords(pos.latitude, pos.longitude);

                    if (address) {
                        setInputAddress(address);
                        // 자동 제출 (사용자 편의)
                        setTimeout(() => handleAddressSubmit(address), 500);
                    } else {
                        setInputAddress("");
                        setToast({ isVisible: true, message: '주소를 찾을 수 없습니다. 직접 입력해주세요.' });
                    }
                } catch (error) {
                    console.error("Auto location failed:", error);
                    setInputAddress("");
                }
            };
            detectLocation();
        }
    }, [step]); // step이 onboarding이 될 때 실행

    // --- 주소 입력 및 지자체 배정 로직 ---
    const handleAddressSubmit = (manualAddress = null) => {
        const targetAddress = manualAddress || inputAddress;

        if (!targetAddress || targetAddress.trim().length < 2 || targetAddress === "위치 확인 중...") {
            alert("정확한 주소를 입력해주세요.");
            return;
        }

        setStep('loading');

        // 지자체 매칭 시뮬레이션 (1.5초 후 배정)
        setTimeout(() => {
            let assigned = MUNICIPALITY_DB['default'];
            if (targetAddress.includes('춘천') || targetAddress.includes('강원')) assigned = MUNICIPALITY_DB['춘천'];
            else if (targetAddress.includes('서울')) assigned = MUNICIPALITY_DB['서울'];

            const regionData = {
                ...assigned,
                address: targetAddress
            };

            setUserRegion(regionData);
            localStorage.setItem('userRegion', JSON.stringify(regionData));
            setStep('dashboard');
            navigate('/drive'); // 대시보드로 이동
        }, 1500);
    };


    // --- Camera Recovery System (PR #14 카메라 버그 수정) ---
    const isStreamLive = (stream) => {
        if (!stream || stream.active === false) return false;
        const tracks = stream.getVideoTracks();
        return tracks.length > 0 && tracks.some((track) => track.readyState === 'live');
    };

    const restartCamera = async (reason) => {
        if (!showCameraViewRef.current) return;
        if (!cameraWasActiveRef.current) return;
        if (cameraRestartingRef.current) return;
        const now = Date.now();
        if (now - cameraRestartAtRef.current < 5000) return;  // 5초 쿨다운 (깜박임 방지)
        cameraRestartAtRef.current = now;
        cameraRestartingRef.current = true;

        // Watchdog 일시 중지 (race condition 방지)
        watchdogPausedUntilRef.current = now + 5000;
        consecutivePausedCountRef.current = 0;

        console.warn(`[camera] restart requested: ${reason}`);
        try {
            stopCamera();
            await startCamera();
        } finally {
            cameraRestartingRef.current = false;
            // 재시작 완료 후 1초 뒤 watchdog 재개
            watchdogPausedUntilRef.current = Date.now() + 1000;
        }
    };

    const refreshVideoPlayback = (reason) => {
        const stream = streamRef.current;
        if (!stream) return;
        const now = Date.now();
        if (now - playbackRefreshAtRef.current < 2000) return;  // 2000ms 쿨다운 (깜박임 방지)
        playbackRefreshAtRef.current = now;
        if (!isStreamLive(stream)) {
            restartCamera(`refresh fallback: ${reason}`);
            return;
        }
        console.log(`[camera] refresh playback: ${reason}`);

        // srcObject가 없을 때만 다시 연결 (깜박임 방지)
        if (videoRef.current && !videoRef.current.srcObject) {
            attachStreamToVideo(stream);
            return;
        }

        // srcObject가 있으면 play()만 호출 (재설정 없이)
        if (videoRef.current && videoRef.current.paused && !videoRef.current.ended) {
            videoRef.current.play().catch(() => { });
        }
    };

    const bindStreamEvents = (stream) => {
        if (!stream) return;
        stream.oninactive = () => restartCamera('stream inactive');
        stream.onremovetrack = () => restartCamera('stream track removed');
        stream.getTracks().forEach((track) => {
            track.onended = () => restartCamera(`track ended: ${track.kind}`);
            track.onmute = () => {
                if (track.kind === 'video') {
                    // 백그라운드 상태에서는 무시 (iOS Safari 안정성)
                    if (document.hidden) {
                        console.log('[camera] track muted while backgrounded - ignoring');
                        return;
                    }
                    if (cameraMuteTimeoutRef.current) {
                        clearTimeout(cameraMuteTimeoutRef.current);
                    }
                    cameraMuteTimeoutRef.current = setTimeout(() => {
                        if (track.muted && !document.hidden) {
                            refreshVideoPlayback('video track muted');
                        }
                    }, 2500);  // 2500ms 타임아웃 (깜박임 방지)
                }
            };
        });
    };

    const attachStreamToCapture = (stream) => {
        if (!stream || !captureVideoRef.current) return;
        const [videoTrack] = stream.getVideoTracks();
        if (!videoTrack) return;

        // 기존 캡처 스트림 정리
        if (captureStreamRef.current) {
            captureStreamRef.current.getTracks().forEach(track => track.stop());
            captureStreamRef.current = null;
        }

        // 트랙 클론하여 독립적인 스트림 생성
        const clonedTrack = videoTrack.clone();
        const captureStream = new MediaStream([clonedTrack]);
        captureStreamRef.current = captureStream;

        const captureVideo = captureVideoRef.current;
        captureVideo.srcObject = captureStream;
        captureVideo.muted = true;
        captureVideo.autoplay = true;
        captureVideo.playsInline = true;
        captureVideo.onloadedmetadata = () => {
            captureVideo.play().catch(() => { });
        };
        console.log('[camera] captureVideoRef attached');
    };

    // --- Camera Setup ---
    const attachStreamToVideo = (stream) => {
        if (!stream) {
            console.error("❌ No stream");
            return;
        }

        const tracks = stream.getTracks();
        console.log("📹 Stream tracks:", tracks.length, tracks.map(t => t.readyState));

        const setupVideo = (videoEl, name) => {
            if (!videoEl) {
                console.log(`⚠️ ${name} is null`);
                return;
            }

            // 스트림 ID 비교로 동일 스트림인지 확인 (객체 참조 비교 대신 - 깜박임 방지)
            const currentStreamId = videoEl.dataset?.streamId;
            if (currentStreamId === streamIdRef.current && videoEl.srcObject) {
                // 이미 같은 스트림이 설정됨 - play만 호출
                if (videoEl.paused && !videoEl.ended) {
                    videoEl.play().catch(() => { });
                }
                return;
            }

            console.log(`🎥 Setting up ${name} (streamId: ${streamIdRef.current})`);

            // srcObject 설정
            videoEl.srcObject = stream;
            videoEl.dataset.streamId = streamIdRef.current;  // 스트림 ID 저장
            videoEl.muted = true;
            videoEl.autoplay = true;
            videoEl.playsInline = true;

            // 이벤트 리스너
            videoEl.onloadedmetadata = () => {
                console.log(`✅ ${name} metadata: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
                videoEl.play().catch(e => console.log(`${name} play:`, e.message));
            };

            videoEl.onplaying = () => console.log(`▶️ ${name} playing`);
            videoEl.onerror = (e) => console.error(`❌ ${name} error:`, videoEl.error);

            // 자동 복구: 간단히 play()만 호출 (refreshVideoPlayback 호출하지 않음 - 깜박임 방지)
            // Watchdog이 2초마다 상태 체크하므로 여기서는 단순 play() 재시도만 함
            videoEl.onpause = () => {
                if (!showCameraViewRef.current) return;
                if (!videoEl.ended) {
                    videoEl.play().catch(() => { });
                }
            };
            videoEl.onstalled = () => videoEl.play().catch(() => { });
            videoEl.onwaiting = () => { }; // 대기 상태는 무시 (버퍼링 중)
            videoEl.onended = () => restartCamera(`video ${name} ended`);

            // 즉시 재생
            videoEl.play().catch(() => { });
        };

        // 즉시 설정 시도 (단일 비디오 요소)
        setupVideo(videoRef.current, "videoRef");

        // videoRef가 null이면 DOM 렌더링 후 재시도
        if (!videoRef.current) {
            console.log("🔄 Video ref not ready, retrying in 200ms...");
            setTimeout(() => {
                setupVideo(videoRef.current, "videoRef-retry");
            }, 200);

            setTimeout(() => {
                setupVideo(videoRef.current, "videoRef-retry2");
            }, 500);
        }
    };

    const startCamera = async () => {
        try {
            // 기존 스트림이 있으면 재사용
            if (streamRef.current && streamRef.current.active) {
                bindStreamEvents(streamRef.current);
                attachStreamToVideo(streamRef.current);
                attachStreamToCapture(streamRef.current);
                setHasPermission(true);
                cameraWasActiveRef.current = true;
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("Camera Error: mediaDevices.getUserMedia not available");
                setHasPermission(false);
                return;
            }

            // 카메라 설정 - 480x480 @ 60FPS (네트워크 최적화 + 모델 성능)
            const primaryConstraints = {
                video: {
                    facingMode: "user",
                    width: { ideal: 480, min: 320 },   // 480x480 (224x224로 리사이즈됨)
                    height: { ideal: 480, min: 320 },
                    frameRate: { ideal: 60, max: 60 } // FPS 60 (모델 성능 향상)
                },
                audio: false
            };
            const fallbackConstraints = { video: { facingMode: "user" }, audio: false };
            const bareConstraints = { video: true, audio: false };

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
            } catch (err) {
                if (err.name === 'OverconstrainedError' || err.name === 'NotFoundError') {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                    } catch (fallbackErr) {
                        stream = await navigator.mediaDevices.getUserMedia(bareConstraints);
                    }
                } else {
                    throw err;
                }
            }
            streamRef.current = stream;
            streamIdRef.current = `stream_${Date.now()}`;
            console.log(`[camera] New stream ID: ${streamIdRef.current}`);
            bindStreamEvents(stream);
            attachStreamToVideo(stream);
            attachStreamToCapture(stream);
            setHasPermission(true);
            cameraWasActiveRef.current = true;
        } catch (err) {
            console.error("Camera Error:", err);
            setHasPermission(false);
            if (err.name === 'NotAllowedError') {
                console.error("?????????????????????????????????");
            } else if (err.name === 'NotFoundError') {
                console.error("?????????? ?????? ????????????.");
            } else if (err.name === 'OverconstrainedError') {
                console.error("????????????? ????????????????????????????:", err.constraint);
            }
        }
    };

    const stopCamera = () => {
        const oldStreamId = streamIdRef.current;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        streamIdRef.current = null;  // 스트림 ID 정리

        // 타임아웃 정리
        if (cameraMuteTimeoutRef.current) {
            clearTimeout(cameraMuteTimeoutRef.current);
            cameraMuteTimeoutRef.current = null;
        }
        // 캡처 스트림 정리
        if (captureStreamRef.current) {
            captureStreamRef.current.getTracks().forEach(track => track.stop());
            captureStreamRef.current = null;
        }
        // srcObject 및 스트림 ID 정리
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            delete videoRef.current.dataset.streamId;
        }
        if (captureVideoRef.current) {
            captureVideoRef.current.srcObject = null;
            delete captureVideoRef.current.dataset.streamId;
        }
        setHasPermission(false);
        console.log(`[camera] stopped (was streamId: ${oldStreamId})`);
    };

    // 앱 시작 시 카메라 시작 (한번만)
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // NOTE: showCameraView 변경 시 srcObject 재연결 로직 제거됨
    // DrivePage에서 video 요소가 단일 return으로 항상 DOM에 유지되므로 불필요
    // 이전 로직이 깜박임의 원인이었음

    // showCameraView 변경 시 스트림 재연결 (PR #16 - Watchdog 제거, 이벤트 기반으로 변경)
    useEffect(() => {
        if (showCameraView && streamRef.current && streamRef.current.active) {
            // streamId 비교를 통한 안정적인 스트림 추적
            const currentStreamId = videoRef.current?.dataset?.streamId;
            const targetStreamId = streamIdRef.current;

            if (currentStreamId === targetStreamId && videoRef.current?.srcObject) {
                // 스트림이 이미 연결되어 있으면 스킵
                console.log('[camera] Stream already connected, skipping');
                return;
            }

            // srcObject 재연결이 필요한 경우만 처리
            if (videoRef.current) {
                console.log('[camera] Reconnecting stream on showCameraView change');
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.dataset.streamId = targetStreamId;
                videoRef.current.play().catch(() => { });
            }
        }
    }, [showCameraView]);

    // 앱 백그라운드/포그라운드 처리 (PR #16 - 간소화)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log('[camera] App backgrounded');
            } else {
                console.log('[camera] App foregrounded');
                // 포그라운드 복귀 후 1초 딜레이 후 비디오 재생 재시도
                setTimeout(() => {
                    if (videoRef.current?.paused && streamRef.current?.active) {
                        videoRef.current.play().catch(() => { });
                    }
                }, 1000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // 페이지 이동 후 돌아왔을 때 스트림 재연결
    useEffect(() => {
        if ((location.pathname === '/drive' || location.pathname === '/') && streamRef.current && streamRef.current.active) {
            setTimeout(() => {
                attachStreamToVideo(streamRef.current);
            }, 100);
        }
    }, [location.pathname]);

    // --- Session Time Counter ---
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                sessionTimeRef.current += 1;
                setSessionTime(sessionTimeRef.current);

                // [NEW] 30초 정상 상태 유지 시 점수 회복
                // 0 = Normal State
                if (lastVotedStateRef.current === 0) {
                    normalStateDurationRef.current += 1;

                    if (normalStateDurationRef.current >= 30) {
                        const baseRecovery = SCORE_CONFIG.RECOVERY_30_SEC || 1.0;
                        // 90점 이상일 때는 회복량 50% 감소
                        const recoveryMultiplier = scoreRef.current >= 90 ? 0.5 : 1.0;
                        const pointsToRecover = baseRecovery * recoveryMultiplier;

                        // 모든 항목 골고루 회복 (총점 +1 효과)
                        driverBehaviorScoreRef.current = Math.min(100, driverBehaviorScoreRef.current + pointsToRecover);
                        speedLimitScoreRef.current = Math.min(100, speedLimitScoreRef.current + pointsToRecover);
                        accelDecelScoreRef.current = Math.min(100, accelDecelScoreRef.current + pointsToRecover);

                        setDriverBehaviorScore(driverBehaviorScoreRef.current);
                        setSpeedLimitScore(speedLimitScoreRef.current);
                        setAccelDecelScore(accelDecelScoreRef.current);

                        // 점수 재계산
                        const newScore = calculateWeightedScore();
                        scoreRef.current = newScore;
                        setScore(newScore);

                        console.log(`🎁 30초 정상 주행 달성! +${pointsToRecover}점 회복`);
                        normalStateDurationRef.current = 0; // 카운터 초기화
                    }
                } else {
                    normalStateDurationRef.current = 0; // 비정상 상태 시 카운터 초기화
                }
            }, 1000);
        } else {
            sessionTimeRef.current = 0;
            setSessionTime(0);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // --- GPS + 가속도 센서 Monitoring ---
    useEffect(() => {
        if (isActive) {
            // GPS + 가속도 센서 모니터링 시작
            // (권한은 toggleSession에서 사용자 상호작용 시 요청됨)
            const cleanup = startGpsMonitoring(
                (data) => {
                    if (data.type === 'GPS') {
                        // GPS 데이터: 속도 업데이트
                        // GPS 데이터: 속도 업데이트
                        // GPS 데이터: 속도 업데이트
                        setCurrentSpeed(data.speed);

                        // [추가] 지도 이동을 위해 실시간 좌표 업데이트
                        if (data.latitude && data.longitude) {
                            setCurrentLocation({
                                lat: data.latitude,
                                lng: data.longitude,
                                heading: data.heading || 0
                            });
                            setSensorStatus(prev => ({ ...prev, gps: true }));
                        }



                        // 거리 계산 (이전 시간 대비 이동 거리 누적)
                        const now = Date.now();
                        if (lastGpsTimeRef.current) {
                            const timeDeltaSeconds = (now - lastGpsTimeRef.current) / 1000;
                            // 속도 (km/h -> m/s) * 시간 (s) = 거리 (m)
                            // 속도가 1km/h 미만인 경우(정지 상태 등)는 계산에서 제외하여 노이즈 감소
                            if (data.speed > 1) {
                                const speedMs = data.speed / 3.6;
                                const distanceDelta = speedMs * timeDeltaSeconds; // meters
                                accumulatedDistanceRef.current += distanceDelta;

                                // [NEW] 거리 기반 점수 회복 (1km당 0.8점)
                                // 90점 이상일 때는 회복량 50% 감소
                                const distanceKm = distanceDelta / 1000;
                                const recoveryMultiplier = scoreRef.current >= 90 ? 0.5 : 1.0;
                                const pointsToRecover = distanceKm * SCORE_CONFIG.RECOVERY_PER_KM * recoveryMultiplier;

                                if (pointsToRecover > 0) {
                                    // 모든 항목 골고루 회복
                                    driverBehaviorScoreRef.current = Math.min(100, driverBehaviorScoreRef.current + pointsToRecover);
                                    speedLimitScoreRef.current = Math.min(100, speedLimitScoreRef.current + pointsToRecover);
                                    accelDecelScoreRef.current = Math.min(100, accelDecelScoreRef.current + pointsToRecover);

                                    setDriverBehaviorScore(driverBehaviorScoreRef.current);
                                    setSpeedLimitScore(speedLimitScoreRef.current);
                                    setAccelDecelScore(accelDecelScoreRef.current);

                                    // 점수 재계산
                                    const newScore = calculateWeightedScore();
                                    scoreRef.current = newScore;
                                    setScore(newScore);
                                }
                            }
                        }
                        lastGpsTimeRef.current = now;

                        setGpsAcceleration(0); // GPS 기반 가속도는 사용 안 함
                        setGpsAccuracy(data.accuracy);
                        setGpsStatus(data.status || 'GPS 검색중...');

                        // 제한 속도 및 도로명 업데이트
                        if (data.speedLimit !== undefined) {
                            setSpeedLimit(data.speedLimit);
                        }
                        if (data.roadName !== undefined) {
                            setRoadName(data.roadName);
                        }

                        // GPS 작동 상태 업데이트 (위치 정보가 있으면 작동 중)
                        if (data.latitude && data.longitude) {
                            setSensorStatus(prev => ({ ...prev, gps: true }));
                        }

                        // 과속 감지 (제한 속도 기준 또는 기본 100km/h)
                        if (data.isOverspeed) {
                            const limitText = data.speedLimit
                                ? `제한 속도 ${data.speedLimit}km/h 초과`
                                : '100km/h 초과';
                            console.log('⚠️ 과속 감지!', {
                                speed: data.speed.toFixed(1) + ' km/h',
                                limit: limitText,
                                road: data.roadName || '알 수 없음'
                            });
                            setGpsEvents(prev => ({
                                ...prev,
                                overspeed: prev.overspeed + 1
                            }));
                            setEventCount(prev => prev + 1);
                            // 제한속도 준수 점수 감점 (35% 가중치)
                            // 과속 감점: 기본 -0.2점 (90점 이상 시 1.5배)
                            const multiplier = scoreRef.current >= 90 ? SCORE_CONFIG.DIFFICULTY_MULTIPLIER : 1.0;
                            const penalty = SCORE_CONFIG.PENALTY.OVERSPEED * multiplier;

                            speedLimitScoreRef.current = Math.max(0, speedLimitScoreRef.current - penalty);
                            setSpeedLimitScore(speedLimitScoreRef.current);

                            // 가중 평균 점수 재계산
                            const newScore = calculateWeightedScore();
                            scoreRef.current = newScore;
                            setScore(newScore);
                        }
                    } else if (data.type === 'SPEED_LIMIT') {
                        // 제한 속도 업데이트 (TMAP API 응답)
                        setSpeedLimitLoading(false); // 조회 완료

                        // 디버깅 정보 저장 (모바일용) - 실제 API 응답 전체 포함
                        setSpeedLimitDebug({
                            speedLimit: data.speedLimit,
                            roadName: data.roadName,
                            timestamp: new Date().toLocaleTimeString(),
                            hasData: !!(data.speedLimit || data.roadName),
                            rawResponse: data.rawResponse, // 실제 API 응답 전체
                            matchedPointKeys: data.matchedPointKeys, // matchedPoint의 모든 키
                            matchedPointRaw: data.matchedPointRaw, // matchedPoint 원본 데이터
                            error: data.error, // 오류 메시지 (있는 경우)
                            errorCode: data.errorCode, // 에러 코드 (있는 경우)
                            responseKeys: data.responseKeys, // 응답의 최상위 키 (있는 경우)
                            requestInfo: data.requestInfo // 요청 정보 (있는 경우)
                        });

                        if (data.speedLimit !== undefined) {
                            setSpeedLimit(data.speedLimit);
                        }
                        if (data.roadName !== undefined) {
                            setRoadName(data.roadName);
                        }
                    } else if (data.type === 'SPEED_LIMIT_LOADING') {
                        // 제한 속도 조회 시작
                        setSpeedLimitLoading(true);
                        setSpeedLimitDebug({
                            status: '조회 중...',
                            timestamp: new Date().toLocaleTimeString()
                        });
                    } else if (data.type === 'MOTION') {
                        // 가속도 센서 데이터: 급가속/급감속 감지
                        setGpsAcceleration(data.accelValue);

                        // 가속도 센서 작동 상태 업데이트
                        setSensorStatus(prev => ({ ...prev, motion: true }));

                        // 급가속 감지
                        if (data.isHardAccel) {
                            console.log('🚀 급가속 감지! (가속도 센서)', {
                                speed: data.speed.toFixed(1) + ' km/h',
                                acceleration: data.accelValue.toFixed(2) + ' m/s²'
                            });
                            setGpsEvents(prev => ({
                                ...prev,
                                hardAccel: prev.hardAccel + 1
                            }));
                            setEventCount(prev => prev + 1);
                            // 급가속/감속 점수 감점 (25% 가중치)
                            // 급가속 감점: 기본 -3.0점 (90점 이상 시 1.5배)
                            const multiplier = scoreRef.current >= 90 ? SCORE_CONFIG.DIFFICULTY_MULTIPLIER : 1.0;
                            const penalty = SCORE_CONFIG.PENALTY.HARD_ACCEL * multiplier;

                            accelDecelScoreRef.current = Math.max(0, accelDecelScoreRef.current - penalty);
                            setAccelDecelScore(accelDecelScoreRef.current);

                            // 가중 평균 점수 재계산
                            const newScore = calculateWeightedScore();
                            scoreRef.current = newScore;
                            setScore(newScore);
                        }

                        // 급감속 감지
                        if (data.isHardBrake) {
                            console.log('🛑 급감속 감지! (가속도 센서)', {
                                speed: data.speed.toFixed(1) + ' km/h',
                                acceleration: data.accelValue.toFixed(2) + ' m/s²'
                            });
                            setGpsEvents(prev => ({
                                ...prev,
                                hardBrake: prev.hardBrake + 1
                            }));
                            setEventCount(prev => prev + 1);
                            // 급가속/감속 점수 감점 (25% 가중치)
                            // 급감속 감점: 기본 -5.0점 (90점 이상 시 1.5배)
                            const multiplier = scoreRef.current >= 90 ? SCORE_CONFIG.DIFFICULTY_MULTIPLIER : 1.0;
                            const penalty = SCORE_CONFIG.PENALTY.HARD_BRAKE * multiplier;

                            accelDecelScoreRef.current = Math.max(0, accelDecelScoreRef.current - penalty);
                            setAccelDecelScore(accelDecelScoreRef.current);

                            // 가중 평균 점수 재계산
                            const newScore = calculateWeightedScore();
                            scoreRef.current = newScore;
                            setScore(newScore);
                        }
                    }
                },
                (error) => {
                    // GPS 오류 처리
                    if (error.errorType === 'permission_denied') {
                        console.warn('📍 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
                        // 권한 거부 시 센서 상태 업데이트 안 함
                    } else if (error.errorType === 'position_unavailable') {
                        console.warn('📍 위치 서비스를 사용할 수 없습니다.');
                        // 위치 정보 없이도 가속도 센서는 작동 가능
                    } else {
                        console.error('GPS 모니터링 오류:', error);
                    }
                    // GPS 오류 시에도 계속 진행 (가속도 센서는 작동 가능)
                }
            );

            gpsWatchIdRef.current = cleanup;
        } else {
            // GPS 모니터링 중지
            if (gpsWatchIdRef.current !== null) {
                stopGpsMonitoring(gpsWatchIdRef.current);
                gpsWatchIdRef.current = null;
            }
            // 상태 초기화
            setCurrentSpeed(0);
            setGpsAcceleration(0);
            setGpsEvents({ hardAccel: 0, hardBrake: 0, overspeed: 0 });
            setSensorStatus({ gps: false, motion: false });
            setSpeedLimit(null);
            setRoadName(null);
            // 점수 초기화
            driverBehaviorScoreRef.current = 100;
            speedLimitScoreRef.current = 100;
            accelDecelScoreRef.current = 100;
            setDriverBehaviorScore(100);
            setSpeedLimitScore(100);
            setAccelDecelScore(100);
            scoreRef.current = 100;
            setScore(100);

            // 거리 초기화
            accumulatedDistanceRef.current = 0;
            lastGpsTimeRef.current = null;
        }

        return () => {
            if (gpsWatchIdRef.current !== null) {
                stopGpsMonitoring(gpsWatchIdRef.current);
            }
        };
    }, [isActive]);

    // --- AI 모델 추론 연결 ---
    // 카메라 프레임 -> GPU 서버 -> 추론 결과 수신
    const [modelConnectionStatus, setModelConnectionStatus] = useState('idle'); // idle, connecting, connected, error

    useEffect(() => {
        let isCancelled = false;

        // captureVideoRef 우선 사용 (추론 전용 안정적인 비디오)
        const captureTarget = (captureVideoRef.current && captureVideoRef.current.srcObject)
            ? captureVideoRef.current
            : videoRef.current;

        if (isActive && captureTarget) {
            setModelConnectionStatus('connecting');

            // 먼저 srcObject 연결 확인 및 재연결
            if (!captureTarget.srcObject && streamRef.current && streamRef.current.active) {
                console.log('[Dashboard] 🔧 isActive 시작 시 srcObject 재연결');
                if (captureTarget === captureVideoRef.current) {
                    attachStreamToCapture(streamRef.current);
                } else {
                    captureTarget.srcObject = streamRef.current;
                    captureTarget.play().catch(() => { });
                }
            }

            // 상태별 감점량 계산 함수 (SCORE_CONFIG 사용)
            const getPenaltyForState = (state) => {
                // 0=Normal, 1=Drowsy, 2=Searching(Distracted), 3=Phone, 4=Assault
                switch (state) {
                    case 1: return SCORE_CONFIG.PENALTY.DROWSY;
                    case 2: return SCORE_CONFIG.PENALTY.DISTRACTED; // Searching/Distracted 통합
                    case 3: return SCORE_CONFIG.PENALTY.DISTRACTED; // Phone -> Distracted (4점)
                    case 4: return SCORE_CONFIG.PENALTY.ASSAULT;
                    default: return 0;
                }
            };

            // 점수 적용 함수
            const applyPenalty = (state, isConsecutive = false) => {
                let penalty = getPenaltyForState(state);

                // 90점 이상일 때 난이도 상승 (1.5배)
                const difficultyMultiplier = scoreRef.current >= 90 ? SCORE_CONFIG.DIFFICULTY_MULTIPLIER : 1.0;
                penalty *= difficultyMultiplier;

                // 연속 감지 시 추가 감점 (1.5배) -> 총 2.25배까지 가능
                if (isConsecutive && state !== 0) {
                    penalty *= 1.5;
                    console.log(`⚡ 연속 ${alertThresholdRef.current}회 감지! 추가 감점 적용`);
                }

                // 회복 로직(0.05점) 삭제됨 -> 거리 기반 회복으로 변경

                if (state !== 0) {
                    // setEventCount(prev => prev + 1); // 4초 카운트 로직으로 이관 (중복 방지)
                }

                // 운전자 행동 점수 업데이트
                if (penalty > 0) {
                    driverBehaviorScoreRef.current = Math.max(0, driverBehaviorScoreRef.current - penalty);
                    setDriverBehaviorScore(driverBehaviorScoreRef.current);

                    // 가중 평균 점수 재계산
                    const newScore = calculateWeightedScore();
                    scoreRef.current = newScore;
                    setScore(newScore);
                }
            };

            // 투표로 최종 상태 결정
            const getVotedState = (buffer) => {
                if (buffer.length === 0) return 0;

                // 각 상태별 카운트
                const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
                buffer.forEach(state => {
                    counts[state] = (counts[state] || 0) + 1;
                });

                // 가장 많은 상태 찾기
                let maxCount = 0;
                let votedState = 0;
                for (const [state, count] of Object.entries(counts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        votedState = parseInt(state);
                    }
                }

                console.log(`🗳️ 투표 결과: ${['Normal', 'Drowsy', 'Searching', 'Phone', 'Assault'][votedState]} (${maxCount}/${buffer.length}표)`);
                return votedState;
            };

            // 추론 결과 콜백 (투표 시스템 적용)
            const handleInferenceResult = (result) => {
                // result: { class_id, class_name, confidence, probabilities, alert_threshold, interval_ms }
                let rawState = result.class_id;

                // [수정] 상태코드 3번(Phone)을 2번(Distracted)으로 통합
                if (rawState === 3) {
                    rawState = 2;
                }

                // 동적 설정 업데이트 (백엔드에서 사용자 수에 따라 조절)
                if (result.alert_threshold && result.alert_threshold !== alertThresholdRef.current) {
                    console.log(`⚙️ 동적 설정 변경: threshold=${result.alert_threshold}, interval=${result.interval_ms}ms`);
                    alertThresholdRef.current = result.alert_threshold;
                    voteBufferSizeRef.current = result.alert_threshold;  // 투표 버퍼도 동일하게
                }

                // 각 상태별 2초마다 반복 카운트 증가
                if (rawState === 1) {  // Drowsy (졸음)
                    stateConsecutiveCountRef.current.drowsy += 1;
                    stateConsecutiveCountRef.current.distracted = 0;

                    // 240프레임(4초)마다 누적 카운트 증가 (4초, 8초, 12초...)
                    if (stateConsecutiveCountRef.current.drowsy % CONSECUTIVE_THRESHOLD === 0 && stateConsecutiveCountRef.current.drowsy > 0) {
                        setDrowsyCount(prev => {
                            const newCount = prev + 1;

                            // TMAP 감점 적용 (8점)
                            updateScore('PENALTY', SCORE_CONFIG.PENALTY.DROWSY);

                            // TTS 음성 알림 (2회 누적 시 질문, 그 외에는 경고)
                            console.log(`🔊 TTS 시도: voiceEnabled=${voiceEnabledRef.current}, count=${newCount}`);
                            if (voiceEnabledRef.current) {
                                if (newCount % 2 === 0) {
                                    console.log('🔊 TTS 호출: 휴게소/게임 질문');
                                    voiceService.speak("졸음운전이 반복되고 있어요. 근처 휴게소를 탐색할까요? 아니면 끝말잇기를 시작할까요?");
                                    setIsWaitingForResponse(true);
                                    setWaitingReason('drowsy');
                                } else {
                                    console.log('🔊 TTS 호출: 설마 자는거에요?');
                                    voiceService.speak("설마 자는거에요?");
                                }
                            } else {
                                console.log('🔇 TTS 비활성화 - voiceEnabled가 false');
                            }
                            return newCount;
                        });
                        setEventCount(prev => prev + 1); // Total Events 연동
                        console.log(`😴 졸음 4초마다 감지 → 카운트 +1 (누적: ${stateConsecutiveCountRef.current.drowsy / CONSECUTIVE_THRESHOLD}회)`);
                    }
                } else if (rawState === 2 || rawState === 3) {  // Distracted (주시태만) - 2(Searching), 3(Phone) 통합
                    stateConsecutiveCountRef.current.distracted += 1;
                    stateConsecutiveCountRef.current.drowsy = 0;
                    stateConsecutiveCountRef.current.phone = 0;
                    stateConsecutiveCountRef.current.assault = 0;

                    // 240프레임(4초)마다 누적 카운트 증가
                    if (stateConsecutiveCountRef.current.distracted % CONSECUTIVE_THRESHOLD === 0 && stateConsecutiveCountRef.current.distracted > 0) {
                        setDistractedCount(prev => prev + 1);
                        setEventCount(prev => prev + 1); // Total Events 연동

                        // TMAP 감점 적용 (4점)
                        updateScore('PENALTY', SCORE_CONFIG.PENALTY.DISTRACTED);

                        console.log(`👀 주시태만 4초마다 감지 → 카운트 +1 (누적: ${stateConsecutiveCountRef.current.distracted / CONSECUTIVE_THRESHOLD}회)`);

                        // TTS 음성 알림
                        if (voiceEnabledRef.current) {
                            voiceService.speak("전방을 주시해주세요!");
                        }
                    }
                } else if (rawState === 4) { // Assault (폭행)
                    stateConsecutiveCountRef.current.assault = (stateConsecutiveCountRef.current.assault || 0) + 1;
                    stateConsecutiveCountRef.current.drowsy = 0;
                    stateConsecutiveCountRef.current.phone = 0;
                    stateConsecutiveCountRef.current.distracted = 0;

                    if (stateConsecutiveCountRef.current.assault === CONSECUTIVE_THRESHOLD) {
                        setEventCount(prev => prev + 1);
                        console.log(`🚨 폭행 4초 연속 감지 → 신고 프로세스 가동`);

                        // TTS 음성 알림 (질문형으로 변경)
                        if (voiceEnabledRef.current) {
                            voiceService.speak("폭행이 의심됩니다. 경찰서에 신고할까요?");
                            setIsWaitingForResponse(true);
                            setWaitingReason('assault');
                        }
                    }
                } else {  // Normal (0)
                    // 정상 상태로 돌아오면 모든 연속 카운트 리셋
                    stateConsecutiveCountRef.current.drowsy = 0;
                    stateConsecutiveCountRef.current.distracted = 0;
                    stateConsecutiveCountRef.current.assault = 0;
                }

                // 1. 연속 감지 체크 (점수 감점용)
                if (rawState === lastInferenceStateRef.current && rawState !== 0) {
                    consecutiveCountRef.current += 1;
                }


                // 2. N회 연속 비정상 상태 → 즉시 감점 (동적 임계값)
                if (consecutiveCountRef.current >= alertThresholdRef.current) {
                    console.log(`🚨 ${alertThresholdRef.current}회 연속 감지: ${['Normal', 'Drowsy', 'Searching', 'Phone', 'Assault'][rawState]}`);
                    setCurrentState(rawState);
                    applyPenalty(rawState, true);  // 연속 감지 추가 감점
                    consecutiveCountRef.current = 0;  // 리셋
                    inferenceBufferRef.current = [];  // 버퍼 클리어
                    lastVotedStateRef.current = rawState;
                    return;
                }

                // 3. 버퍼에 추가
                inferenceBufferRef.current.push(rawState);
                if (inferenceBufferRef.current.length > voteBufferSizeRef.current) {
                    inferenceBufferRef.current.shift();  // 오래된 것 제거
                }

                // 4. N개 모이면 투표 (동적 버퍼 크기)
                if (inferenceBufferRef.current.length >= voteBufferSizeRef.current) {
                    const votedState = getVotedState(inferenceBufferRef.current);
                    setCurrentState(votedState);

                    // 투표 결과가 이전과 다를 때만 감점/회복 적용
                    if (votedState !== lastVotedStateRef.current) {
                        applyPenalty(votedState, false);
                        lastVotedStateRef.current = votedState;
                    } else if (votedState === 0) {
                        // Normal 상태 유지 시 회복 로직 삭제 (거리 기반 회복으로 대체됨)
                        // driverBehaviorScoreRef.current = Math.min(100, driverBehaviorScoreRef.current + 0.05);
                        // setDriverBehaviorScore(driverBehaviorScoreRef.current);
                        // const newScore = calculateWeightedScore();
                        // scoreRef.current = newScore;
                        // setScore(newScore);
                    }

                    // 버퍼 절반 클리어 (슬라이딩 윈도우)
                    inferenceBufferRef.current = inferenceBufferRef.current.slice(Math.floor(voteBufferSizeRef.current / 2));
                }
            };

            // 🧪 시뮬레이션용 함수 (테스트용)
            // 5초간 졸음(1) 신호를 60FPS로 주입
            window.simulateDrowsy5Sec = () => {
                console.log("🧪 5초 졸음 시뮬레이션 시작 (예상: 카운트 1회, 음성 1회 - 4초 시점)");
                let frame = 0;
                const totalFrames = 300; // 60fps * 5초

                const interval = setInterval(() => {
                    if (frame >= totalFrames) {
                        clearInterval(interval);
                        console.log("🧪 시뮬레이션 종료 - 정상 상태 복귀");
                        // 정상 상태로 복귀 신호 20번 보냄 (버퍼를 정상으로 채워서 즉시 복귀)
                        for (let i = 0; i < 20; i++) {
                            handleInferenceResult({
                                class_id: 0,
                                class_name: 'Normal',
                                alert_threshold: 20
                            });
                        }
                        return;
                    }

                    handleInferenceResult({
                        class_id: 1, // Drowsy
                        class_name: 'Drowsy',
                        confidence: 0.95,
                        probabilities: [0.05, 0.95, 0, 0, 0],
                        alert_threshold: 20,
                        interval_ms: 16
                    });

                    frame++;
                }, 16); // 약 16ms (60fps)
            };

            // 📱 4초간 휴대폰(3) 신호를 60FPS로 주입
            window.simulatePhone4Sec = () => {
                console.log("📱 4초 휴대폰 시뮬레이션 시작 (예상: 카운트 1회 - 4초 시점)");
                let frame = 0;
                const totalFrames = 240; // 60fps * 4초

                const interval = setInterval(() => {
                    if (frame >= totalFrames) {
                        clearInterval(interval);
                        console.log("📱 시뮬레이션 종료 - 정상 상태 복귀");
                        // 정상 상태로 복귀 신호 20번 보냄
                        for (let i = 0; i < 20; i++) {
                            handleInferenceResult({
                                class_id: 0,
                                class_name: 'Normal',
                                alert_threshold: 20
                            });
                        }
                        return;
                    }

                    handleInferenceResult({
                        class_id: 3, // Phone
                        class_name: 'phone_use',
                        confidence: 0.98,
                        probabilities: [0.02, 0, 0, 0.98, 0],
                        alert_threshold: 20,
                        interval_ms: 16
                    });

                    frame++;
                }, 16); // 1000/60 ms
            };

            // 🚨 4초간 폭행(4) 신호를 60FPS로 주입
            window.simulateAssault4Sec = () => {
                console.log("🚨 4초 폭행 시뮬레이션 시작");
                let frame = 0;
                const totalFrames = 240; // 60fps * 4초

                const interval = setInterval(() => {
                    if (frame >= totalFrames) {
                        clearInterval(interval);
                        console.log("🚨 시뮬레이션 종료 - 정상 상태 복귀");
                        for (let i = 0; i < 20; i++) {
                            handleInferenceResult({
                                class_id: 0,
                                class_name: 'Normal',
                                alert_threshold: 20
                            });
                        }
                        return;
                    }

                    handleInferenceResult({
                        class_id: 4, // Assault
                        class_name: 'Assault',
                        confidence: 0.99,
                        probabilities: [0, 0, 0, 0, 0.99],
                        alert_threshold: 20,
                        interval_ms: 16
                    });

                    frame++;
                }, 16);
            };

            // 에러 콜백
            const handleModelError = (error) => {
                console.error('[Dashboard] AI 모델 에러:', error.message);
                setModelConnectionStatus('error');
                // 에러 발생해도 앱은 계속 동작 (GPS/센서 기반 점수 계산)
            };

            // srcObject가 설정될 때까지 대기하는 함수 (captureTarget 우선 사용)
            const waitForSrcObject = () => {
                return new Promise((resolve) => {
                    const maxWait = 5000; // 최대 5초 대기
                    const startTime = Date.now();
                    let checkCount = 0;

                    const checkSrcObject = () => {
                        if (isCancelled) {
                            resolve(false);
                            return;
                        }

                        checkCount++;
                        const video = captureTarget;  // captureVideoRef 우선 사용

                        // srcObject와 active 상태만 확인 (readyState는 불필요)
                        if (video && video.srcObject && video.srcObject.active) {
                            console.log(`[Dashboard] ✅ srcObject 설정됨 (${checkCount * 100}ms 후, readyState: ${video.readyState})`);
                            resolve(true);
                            return;
                        }

                        // srcObject가 없으면 재연결 시도
                        if (video && !video.srcObject && streamRef.current && streamRef.current.active) {
                            console.log(`[Dashboard] 🔄 srcObject 재연결 시도...`);
                            if (video === captureVideoRef.current) {
                                attachStreamToCapture(streamRef.current);
                            } else {
                                video.srcObject = streamRef.current;
                                video.play().catch(() => { });
                            }
                        }

                        if (Date.now() - startTime > maxWait) {
                            console.warn('[Dashboard] ⚠️ srcObject 대기 타임아웃', {
                                hasVideo: !!video,
                                hasSrcObject: !!video?.srcObject,
                                isStreamActive: video?.srcObject?.active,
                                streamActive: streamRef.current?.active,
                                readyState: video?.readyState
                            });
                            resolve(false);
                            return;
                        }

                        // 100ms마다 재확인
                        setTimeout(checkSrcObject, 100);
                    };

                    // 초기 딜레이 후 시작 (DOM 렌더링 대기)
                    setTimeout(checkSrcObject, 200);
                });
            };

            // srcObject가 설정된 후 AI 모델 연결 시작
            const startModelCapture = async () => {
                console.log('[Dashboard] AI 모델 연결 시작 - srcObject 대기 중...');

                // srcObject가 설정될 때까지 대기
                const srcObjectReady = await waitForSrcObject();

                if (isCancelled) return;

                if (!srcObjectReady) {
                    console.warn('[Dashboard] ⚠️ srcObject 설정 실패 - AI 모델 연결 취소');
                    setModelConnectionStatus('error');
                    return;
                }

                try {
                    // captureTarget 사용 (추론 전용 비디오 우선)
                    const success = await modelAPI.startCapture(captureTarget, handleInferenceResult, 60, handleModelError);
                    if (isCancelled) return;

                    if (success) {
                        console.log('[Dashboard] ✅ AI 모델 프레임 캡처 시작됨');
                        const status = modelAPI.getStatus();
                        setModelConnectionStatus(status.isConnected ? 'connected' : 'error');
                    } else {
                        console.warn('[Dashboard] ⚠️ AI 모델 프레임 캡처 실패');
                        setModelConnectionStatus('error');
                    }
                } catch (err) {
                    if (isCancelled) return;
                    console.error('[Dashboard] AI 모델 연결 실패:', err);
                    setModelConnectionStatus('error');
                }
            };

            // AI 모델 캡처 시작
            startModelCapture();
        } else {
            // 세션 종료시 연결 해제
            modelAPI.stopCapture();
            setModelConnectionStatus('idle');
        }

        return () => {
            isCancelled = true;
            modelAPI.stopCapture();
        };
    }, [isActive]);

    // --- 음성 서비스 (STT/TTS) 연동 ---
    useEffect(() => {
        if (isActive && voiceEnabled) {
            console.log('[Dashboard] 음성 서비스 시작');

            // 콜백 설정
            voiceService.setCallbacks({
                onResult: (result) => {
                    if (result.isFinal) {
                        setLastTranscript(result.text);
                        setInterimTranscript('');
                        console.log('[Dashboard] 음성 인식 완료:', result.text);

                        // 기존 타이머 취소
                        if (transcriptTimeoutRef.current) {
                            clearTimeout(transcriptTimeoutRef.current);
                        }
                        // 1.5초 뒤에 텍스트 사라지게 설정 (사용자 요청: 바로 없어지게)
                        transcriptTimeoutRef.current = setTimeout(() => {
                            setLastTranscript('');
                        }, 1500);
                    } else {
                        // 자막이 너무 많이 뜬다는 피드백 반영: 중간 결과는 표시하지 않음
                        // setInterimTranscript(result.text);
                    }
                },
                onError: (error) => {
                    console.error('[Dashboard] 음성 에러:', error);
                    if (error.type === 'not-allowed') {
                        setToast({ isVisible: true, message: '마이크 권한이 필요합니다.' });
                    }
                },
                onStateChange: (state) => {
                    console.log('[Dashboard] 음성 상태 변경:', state);
                    if (state.type === 'listening') {
                        setVoiceStatus('listening');
                    } else if (state.type === 'speaking') {
                        setVoiceStatus('speaking');
                    } else if (state.type === 'speakEnd') {
                        setVoiceStatus('listening');
                    } else if (state.type === 'stopped') {
                        setVoiceStatus('idle');
                    }
                }
            });

            // 음성 인식 시작
            voiceService.start();
            setVoiceStatus('listening');

        } else {
            // 세션 종료 또는 음성 비활성화 시 중지
            voiceService.stop();
            setVoiceStatus('idle');
            setLastTranscript('');
            setInterimTranscript('');
            setIsWaitingForResponse(false);
        }

        return () => {
            voiceService.stop();
            if (transcriptTimeoutRef.current) {
                clearTimeout(transcriptTimeoutRef.current);
            }
        };
    }, [isActive, voiceEnabled]);

    // --- 사용자 답변 처리 (졸음 2회 누적 질문에 대한 응답) ---
    useEffect(() => {
        if (isWaitingForResponse && lastTranscript) {
            console.log(`🗣️ 답변 대기 중(${waitingReason}) 인식된 텍스트: ${lastTranscript}`);

            if (waitingReason === 'assault') {
                const POSITIVE_ANSWERS = ['응', '네', '어', '신고해줘', '신고해', '그래', '맞아'];
                if (POSITIVE_ANSWERS.some(ans => lastTranscript.includes(ans))) {
                    voiceService.speak("경찰서에 신고합니다.");
                    setToast({ isVisible: true, message: '🚨 경찰서 신고 접수 중...' });
                    // 실제 신고 로직 호출 (TODO)
                } else {
                    voiceService.speak("오작동으로 판단하고 주행을 계속합니다.");
                    setToast({ isVisible: true, message: '신고가 취소되었습니다.' });
                }
                setIsWaitingForResponse(false);
                setWaitingReason(null);

            } else if (waitingReason === 'drowsy' || !waitingReason) { // 하위 호환성 (reason 없는 경우 졸음으로 간주)
                if (lastTranscript.includes('휴게소') || lastTranscript.includes('탐색')) {
                    voiceService.speak("휴게소를 검색합니다.");
                    setToast({ isVisible: true, message: '휴게소를 검색합니다.' });
                    setIsWaitingForResponse(false);
                    setWaitingReason(null);
                    // TODO: 추후 TMAP API 연동하여 실제 검색 로직 추가
                    // TODO: 추후 TMAP API 연동하여 실제 검색 로직 추가
                } else if (lastTranscript.includes('끝말잇기') || lastTranscript.includes('게임') || lastTranscript.includes('시작') || lastTranscript.includes('좋아') || lastTranscript.includes('응')) {
                    // '응'이나 '좋아'도 긍정 응답으로 처리 (끝말잇기 맥락에서)
                    const startMent = wordChainService.startGame();
                    voiceService.speak(startMent);

                    setIsWordChainActive(true); // 게임 모드 활성화
                    setToast({ isVisible: true, message: '🎮 끝말잇기 시작! ("그만"이라고 말하면 종료됩니다)' });

                    setIsWaitingForResponse(false);
                    setWaitingReason(null);
                }
            }
        }
    }, [lastTranscript, isWaitingForResponse, waitingReason]);

    // --- 끝말잇기 게임 루프 (음성 인식 결과 처리) ---
    useEffect(() => {
        if (isWordChainActive && lastTranscript) {
            const userText = lastTranscript.trim();
            console.log(`🎮 끝말잇기 진행 중: 사용자 입력 '${userText}'`);
            setLastTranscript(''); // 처리했으므로 초기화

            // 게임 종료 명령어
            if (userText.includes('그만') || userText.includes('종료') || userText.includes('멈춰')) {
                voiceService.speak("알겠습니다. 끝말잇기를 종료합니다. 안전운전 하세요!");
                setIsWordChainActive(false);
                setToast({ isVisible: true, message: '끝말잇기가 종료되었습니다.' });
                return;
            }

            // 다음 단어 생성 및 음성 출력
            // 비동기 처리
            (async () => {
                const aiResponse = await wordChainService.getNextWord(userText);
                voiceService.speak(aiResponse);
                setToast({ isVisible: true, message: `AI: ${aiResponse}` });
            })();
        }
    }, [lastTranscript, isWordChainActive]);

    // 음성 기능 토글 함수
    const toggleVoice = () => {
        if (!voiceService.isSupported) {
            setToast({ isVisible: true, message: '이 브라우저에서는 음성 인식이 지원되지 않습니다.' });
            return;
        }
        setVoiceEnabled(prev => !prev);
    };

    // --- Handlers ---
    const toggleSession = async () => {
        if (!isActive) {
            // 기록 시작 전: iOS 가속도 센서 권한 요청 (사용자 상호작용 이벤트 내에서만 가능)
            await requestMotionPermission();
        }

        if (isActive) {
            // 점수 초기화 전에 최종 점수 저장
            const finalScore = Math.floor(score);
            const finalDuration = Math.floor(sessionTime);

            // 최종 점수를 ref와 state에 모두 저장 (ref는 즉시 접근 가능)
            finalSessionScoreRef.current = finalScore;
            setFinalSessionScore(finalScore);

            // 디버깅: 세션 종료 시 데이터 확인
            console.log('📊 세션 종료 데이터:', {
                user: user ? { id: user.id, name: user.name } : null,
                score: finalScore,
                duration: finalDuration,
                events: eventCount,
                gpsEvents: gpsEvents,
                distance: accumulatedDistanceRef.current / 1000, // 미터 -> km 변환
                maxSpeed: Math.round(currentSpeed),
                sessionTime: sessionTime,
                scoreRef: scoreRef.current,
                scoreState: score,
                finalSessionScore: finalScore,
                finalSessionScoreRef: finalSessionScoreRef.current
            });

            // setIsActive(false)는 나중에 호출 (모달이 먼저 렌더링되도록)

            const now = new Date();
            const newEntry = {
                date: now.toISOString(), // ISO 형식으로 저장 (파싱 안전)
                dateDisplay: now.toLocaleString(), // 표시용 날짜 (선택적)
                score: finalScore,
                duration: finalDuration,
                events: eventCount,
                drowsyCount: drowsyCount,
                phoneCount: phoneCount,
                distractedCount: distractedCount,
                gpsEvents: {
                    hardAccel: gpsEvents.hardAccel,
                    hardBrake: gpsEvents.hardBrake,
                    overspeed: gpsEvents.overspeed
                },
                distance: accumulatedDistanceRef.current / 1000, // 미터 -> km 변환
                maxSpeed: Math.round(currentSpeed)
            };

            // Save log for specific user (localStorage 기반)
            if (user) {
                console.log('💾 기록 저장 시도:', { userId: user.id, entry: newEntry });
                addLogByUserId(user.id, newEntry).then(updatedLogs => {
                    console.log('✅ 기록 저장 성공:', { count: updatedLogs.length, logs: updatedLogs.slice(0, 3) });
                    setHistory(updatedLogs); // Update local state with returned logs
                }).catch(error => {
                    console.error('❌ 주행 기록 저장 오류:', error);
                    setToast({ isVisible: true, message: '기록 저장에 실패했습니다. 다시 시도해주세요.' });
                });

                // Update user score in localStorage and AuthContext
                const savedUser = storage.getUser();
                if (savedUser) {
                    const updatedUser = {
                        ...savedUser,
                        score: finalScore,
                        updatedAt: new Date().toISOString()
                    };
                    storage.setUser(updatedUser);
                    setUser({
                        id: updatedUser.id,
                        name: updatedUser.name,
                        score: updatedUser.score,
                        region: updatedUser.region
                    });
                } else {
                    console.warn('⚠️ localStorage에서 사용자 정보를 찾을 수 없습니다.');
                }
            } else {
                // Fallback for no user context (though should be protected)
                console.warn('⚠️ 사용자 정보가 없어 기록이 저장되지 않습니다. 로그인 상태를 확인해주세요.');
                setToast({ isVisible: true, message: '로그인이 필요합니다. 기록이 저장되지 않았습니다.' });
                const newHistory = [newEntry, ...history].slice(0, 10);
                setHistory(newHistory);
                localStorage.setItem('drivingHistory', JSON.stringify(newHistory));
            }

            // 세션 시간이 너무 짧으면 경고
            if (finalDuration < 3) {
                console.warn('⚠️ 세션 시간이 너무 짧습니다 (3초 미만). 기록은 저장되지만 의미 있는 데이터가 아닐 수 있습니다.');
            }

            // 음성 서비스 즉시 중단 및 대기 상태 초기화 (STOP 버튼 반응성 향상)
            voiceService.stop();
            setIsWaitingForResponse(false);
            setWaitingReason(null);
            setVoiceEnabled(false); // 마이크 버튼 상태 끄기

            // 모달을 먼저 열고, 약간의 지연 후에 isActive를 false로 설정하여 점수 초기화
            setShowSummary(true);

            // 다음 틱에서 점수 초기화 (모달이 먼저 렌더링되도록)
            setTimeout(() => {
                setIsActive(false);
            }, 0);
        } else {
            // 모든 점수 초기화
            console.log('🚀 세션 시작:', {
                user: user ? { id: user.id, name: user.name } : null,
                timestamp: new Date().toISOString()
            });
            driverBehaviorScoreRef.current = 100;
            speedLimitScoreRef.current = 100;
            accelDecelScoreRef.current = 100;
            setDriverBehaviorScore(100);
            setSpeedLimitScore(100);
            setAccelDecelScore(100);
            scoreRef.current = 100;
            setScore(100);
            setCurrentState(0);
            setEventCount(0);
            setDrowsyCount(0);
            setPhoneCount(0);
            setDistractedCount(0);
            setSessionTime(0);
            sessionTimeRef.current = 0;
            setShowSummary(false);
            setFinalSessionScore(null); // 세션 시작 시 최종 점수 초기화
            // 투표 시스템 초기화
            inferenceBufferRef.current = [];
            consecutiveCountRef.current = 0;
            lastInferenceStateRef.current = 0;
            lastVotedStateRef.current = 0;
            // 상태별 연속 카운트 리셋
            stateConsecutiveCountRef.current = {
                drowsy: 0,
                phone: 0,
                distracted: 0
            };
            normalStateDurationRef.current = 0; // 리셋
            finalSessionScoreRef.current = null; // ref도 초기화
            setVoiceEnabled(true); // 세션 시작 시 마이크 자동 켜기
            setIsActive(true);
            setWaitingReason(null);
        }
    };

    const getAverageScore = () => {
        const MIN_RECORDS_FOR_SCORE = 7;
        if (history.length === 0) return null;

        // 7개 미만: 전체 기록의 평균 점수
        // 7개 이상: 최근 7개 기록의 평균 점수
        const recordsToUse = history.length < MIN_RECORDS_FOR_SCORE
            ? history  // 전체 기록 사용
            : history.slice(0, 7);  // 최근 7개만 사용

        const sum = recordsToUse.reduce((acc, curr) => acc + (curr.score || 0), 0);
        return Math.floor(sum / recordsToUse.length);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const CurrentIcon = showCameraView ? STATE_CONFIG[currentState].icon : APPLE_STATE_CONFIG[currentState].icon;
    const currentConfig = showCameraView ? STATE_CONFIG : APPLE_STATE_CONFIG;

    // 쿠폰 목록 localStorage에서 불러오기
    useEffect(() => {
        const loadCoupons = () => {
            if (user) {
                try {
                    const savedCoupons = storage.getCoupons(user.id);
                    // 기존 형식으로 변환
                    const formattedCoupons = savedCoupons.map(coupon => ({
                        id: coupon.couponId || coupon.id,
                        type: coupon.type,
                        name: coupon.name,
                        amount: coupon.amount,
                        provider: coupon.provider,
                        status: coupon.status || 'AVAILABLE',
                        expiry: coupon.expiry ? (typeof coupon.expiry === 'string' ? coupon.expiry.split('T')[0].replace(/-/g, '.') : coupon.expiry) : '2026.12.31',
                        theme: coupon.theme
                    }));
                    setCoupons(formattedCoupons);
                } catch (error) {
                    console.error('쿠폰 목록 로드 오류:', error);
                    setCoupons([]);
                }
            } else {
                setCoupons([]);
            }
        };
        loadCoupons();
    }, [user]);

    // 쿠폰 추가 함수 (localStorage 기반)
    const addCoupon = async (couponData) => {
        try {
            if (!user) {
                setToast({ isVisible: true, message: '로그인이 필요합니다.' });
                return;
            }

            // 쿠폰 데이터 생성
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 6); // 6개월 후 만료

            const newCoupon = {
                userId: user.id,
                type: couponData.type || 'VOUCHER',
                name: couponData.name || '안전운전 보상',
                amount: couponData.amount || '10,000원',
                provider: couponData.provider || userRegion?.name || '전국 공통',
                status: 'AVAILABLE',
                expiry: expiryDate.toISOString(),
                theme: couponData.theme || 'blue',
                challengeId: couponData.challengeId || null
            };

            const savedCoupon = storage.addCoupon(newCoupon);

            if (savedCoupon) {
                // 상태에 추가
                const formattedCoupon = {
                    id: savedCoupon.couponId,
                    type: savedCoupon.type,
                    name: savedCoupon.name,
                    amount: savedCoupon.amount,
                    provider: savedCoupon.provider,
                    status: savedCoupon.status,
                    expiry: savedCoupon.expiry.split('T')[0].replace(/-/g, '.'),
                    theme: savedCoupon.theme
                };
                setCoupons(prev => [formattedCoupon, ...prev]);
                setToast({ isVisible: true, message: '쿠폰이 쿠폰함에 추가되었습니다!' });
            } else {
                setToast({ isVisible: true, message: '쿠폰 발급에 실패했습니다.' });
            }
        } catch (error) {
            console.error('쿠폰 발급 오류:', error);
            setToast({ isVisible: true, message: '쿠폰 발급 중 오류가 발생했습니다.' });
        }
    };

    // 토스트 닫기 함수
    const closeToast = () => {
        setToast({ isVisible: false, message: '' });
    };

    const handlePageChange = (page) => {
        // React Router를 사용하여 페이지 이동
        switch (page) {
            case 'drive':
                navigate('/drive');
                break;
            case 'insurance':
                navigate('/insurance');
                break;
            case 'log':
                navigate('/log');
                break;
            case 'mypage':
                navigate('/mypage');
                break;
            default:
                navigate('/drive');
        }
        setSelectedLog(null);
    };

    // 페이지별 렌더링 컴포넌트 (PR #16 - videoRef, onStartCamera 제거)
    // [성능 최적화] DrivePage props 객체화 (불필요한 리렌더링 방지)
    const drivePageProps = {
        showCameraView,
        setShowCameraView,
        hasPermission,
        isActive,
        score,
        sessionTime,
        currentState,
        eventCount,
        toggleSession,
        formatTime,
        currentConfig,
        CurrentIcon,
        userRegion,
        currentSpeed,
        gpsAcceleration,
        gpsEvents,
        sensorStatus,
        gpsAccuracy,
        gpsStatus,
        speedLimit,
        roadName,
        speedLimitLoading,
        speedLimitDebug,
        modelConnectionStatus,
        voiceEnabled,
        voiceStatus,
        lastTranscript,
        interimTranscript,
        toggleVoice,
        currentLocation
    };

    const InsurancePageWrapper = () => {
        const avgScore = getAverageScore() ?? score;
        return <InsurancePage score={avgScore} history={history} userRegion={userRegion} onShowChallengeDetail={setShowChallengeDetail} onClaimReward={addCoupon} showChallengeDetail={showChallengeDetail} />;
    };

    const LogPageWrapper = () => {
        return <DrivingLogPage onSelectLog={(log) => {
            setSelectedLog(log);
            navigate(`/log/${log.logId || log.id || Date.now()}`);
        }} history={history} />;
    };

    const LogDetailWrapper = () => {
        const { logId } = useParams();

        // selectedLog가 있으면 사용, 없으면 history에서 찾기
        const log = selectedLog || history.find(l => (l.logId || l.id) === logId);

        if (!log) {
            return <div className="p-6">로그를 찾을 수 없습니다.</div>;
        }

        const enrichedLog = {
            ...log,
            msg: log.msg || `안전 운전 점수 ${log.score}점`,
            status: log.status || (log.score >= 90 ? 'perfect' : 'warning'),
            time: log.duration || 0,
            distance: log.distance || 0
        };

        return <LogDetailPage data={enrichedLog} onBack={() => {
            setSelectedLog(null);
            navigate('/log');
        }} />;
    };

    const MyPageWrapper = () => {
        const avgScore = history.length > 0 ? getAverageScore() : score;
        return <MyPage user={user} score={avgScore} history={history} userRegion={userRegion} coupons={coupons} />;
    };

    const ChallengeDetailWrapper = () => {
        const { challengeId } = useParams();
        const navigate = useNavigate();

        // challenge를 찾거나 기본값 생성
        const challengeData = challenge || {
            challengeId: challengeId || `challenge_${userRegion?.name?.replace(/\s/g, '_') || 'default'}`,
            region: userRegion?.name || '전국 공통',
            name: userRegion?.campaign || '대한민국 안전운전 챌린지',
            title: `${userRegion?.name || '전국 공통'} 안전운전 챌린지`,
            targetScore: userRegion?.target || 90,
            reward: userRegion?.reward || '안전운전 인증서 발급',
            participants: 0,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            description: `${userRegion?.name || '전국 공통'}에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.`,
            rules: ['지정된 기간 동안 안전운전 실천', `안전운전 점수 ${userRegion?.target || 90}점 이상 유지`, '급가속/급감속 최소화'],
            conditions: [`${userRegion?.name || '전국 공통'} 거주자 또는 주 활동 운전자`, '최근 1년 내 중과실 사고 이력 없음', '마케팅 활용 동의 필수']
        };

        return (
            <ChallengeDetail
                challenge={{
                    region: challengeData.region,
                    title: challengeData.name || challengeData.title,
                    targetScore: challengeData.targetScore,
                    myScore: score,
                    reward: challengeData.reward,
                    participants: challengeData.participants || 0,
                    period: challengeData.period || `${challengeData.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]} ~ ${challengeData.endDate?.split('T')[0] || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
                    description: challengeData.description,
                    rules: challengeData.rules || [],
                    conditions: challengeData.conditions || []
                }}
                currentScore={score}
                onBack={() => {
                    navigate('/insurance');
                    setShowChallengeDetail(false);
                }}
            />
        );
    };

    /* ================================================================================== */
    /* Layout: Desktop Background + Mobile Container Wrapper */
    /* ================================================================================== */
    return (
        // 1. 최상위 컨테이너: 데스크탑 배경 (회색) & 중앙 정렬
        <div className="min-h-screen bg-gray-200 flex justify-center items-center font-sans">

            {/* 2. 모바일 컨테이너: 최대 너비 제한 (430px - iPhone Pro Max 급), 그림자, 둥근 모서리 */}
            <div
                className="w-full max-w-[430px] bg-white sm:rounded-[40px] shadow-2xl overflow-hidden relative border-0 sm:border-[8px] sm:border-gray-900 ring-1 ring-black/5 flex flex-col"
                style={showCameraView ? {
                    height: '100vh',
                    minHeight: '100vh',
                    maxHeight: '100vh'
                } : {
                    minHeight: '100vh',
                    height: '100vh',
                    maxHeight: '100vh'
                }}
            >

                {/* --- CASE 1: ONBOARDING (주소 입력) --- */}
                {step === 'onboarding' && (
                    <div className="flex-1 flex flex-col p-8 bg-white animate-in fade-in duration-700">
                        <div className="mt-12 mb-8">
                            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/20">
                                <MapPin className="text-white" size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 mb-2">어디에<br />거주하시나요?</h1>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                거주하시는 지자체의 안전운전 챌린지에<br />자동으로 연결해 드립니다.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="relative">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">도로명 주소</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={inputAddress}
                                        onChange={(e) => setInputAddress(e.target.value)}
                                        placeholder="예) 강원도 춘천시 중앙로 1"
                                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddressSubmit()}
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    * 입력하신 주소지 관할 지자체의 예산으로 보험 할인 혜택이 제공됩니다.<br />
                                    * 추후 증빙 서류 제출이 요구될 수 있습니다.
                                </p>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <button
                                onClick={handleAddressSubmit}
                                className="w-full h-16 bg-black text-white rounded-2xl font-bold text-lg shadow-xl shadow-black/10 active:scale-95 transition-all"
                            >
                                내 지자체 확인하기
                            </button>
                        </div>
                    </div>
                )}

                {/* 테스트용 시뮬레이션 버튼 (개발용) - 화면 좌측 고정 */}
                <div className="fixed top-1/2 left-4 z-[9999] -translate-y-1/2 flex flex-col gap-2">
                    <button
                        onClick={() => window.simulateDrowsy5Sec && window.simulateDrowsy5Sec()}
                        className="bg-purple-600 text-white px-3 py-1 rounded shadow-lg text-sm hover:bg-purple-700 transition-colors"
                        style={{ opacity: 0.7 }}
                    >
                        🧪 5초 졸음 테스트
                    </button>
                    <button
                        onClick={() => window.simulatePhone4Sec && window.simulatePhone4Sec()}
                        className="bg-blue-600 text-white px-3 py-1 rounded shadow-lg text-sm hover:bg-blue-700 transition-colors"
                        style={{ opacity: 0.7 }}
                    >
                        📱 4초 휴대폰 테스트
                    </button>
                    <button
                        onClick={() => window.simulateAssault4Sec && window.simulateAssault4Sec()}
                        className="bg-red-600 text-white px-3 py-1 rounded shadow-lg text-sm hover:bg-red-700 transition-colors"
                        style={{ opacity: 0.7 }}
                    >
                        🚨 4초 폭행 테스트
                    </button>
                </div>

                {/* Top Bar: Speed, RPM (Simulated), Signal */}
                {/* --- CASE 2: LOADING (지자체 배정 중) --- */}
                {step === 'loading' && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 animate-in fade-in">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div>
                            <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">지자체 확인 중...</h2>
                        <p className="text-sm text-slate-500">입력하신 주소의 관할 구역을 찾고 있습니다.</p>
                    </div>
                )}

                {/* --- CASE 3: DASHBOARD (메인 앱) --- */}
                {step === 'dashboard' && (
                    <>
                        {/* 실제 앱 컨텐츠 영역 */}
                        <div className={`flex-1 scrollbar-hide bg-white relative ${showCameraView ? 'overflow-hidden' : 'overflow-y-auto pb-24'}`} style={showCameraView ? { height: '100%', minHeight: '100%', maxHeight: '100%' } : {}}>
                            {/* 메인 카메라 비디오 (PR #16 - Dashboard로 이동, absolute 위치) */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    position: 'absolute',
                                    // showCameraView일 때: 우측 상단 배치 (Top 20px, Right 20px - 점수 표시 영역 아래)
                                    top: showCameraView ? '20px' : '0',
                                    right: showCameraView ? '20px' : '0',
                                    left: showCameraView ? 'auto' : '0', // 전체 화면 해제

                                    // 크기 축소 (가로 120px, 세로 160px)
                                    width: showCameraView ? '120px' : '1px',
                                    height: showCameraView ? '160px' : '1px',

                                    // 스타일링 (둥근 모서리, 테두리, 그림자)
                                    borderRadius: showCameraView ? '16px' : '0',
                                    border: showCameraView ? '2px solid rgba(255,255,255,0.3)' : 'none',
                                    boxShadow: showCameraView ? '0 10px 25px rgba(0,0,0,0.5)' : 'none',

                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)', // 거울 모드 (좌우 반전)
                                    WebkitTransform: 'scaleX(-1)', // 크로스브라우징용 (iOS 등)
                                    opacity: showCameraView ? 1 : 0,
                                    zIndex: showCameraView ? 50 : -1, // UI 위에 뜨도록 z-index 높임
                                    pointerEvents: 'none'
                                }}
                            />
                            {/* React Router를 사용한 페이지 라우팅 */}
                            <Routes>
                                <Route index element={
                                    <>
                                        {!showCameraView && <Header isActive={isActive} averageScore={getAverageScore()} />}
                                        <DrivePage {...drivePageProps} />
                                    </>
                                } />
                                <Route path="drive" element={
                                    <>
                                        {!showCameraView && <Header isActive={isActive} averageScore={getAverageScore()} />}
                                        <DrivePage {...drivePageProps} />
                                    </>
                                } />
                                <Route path="insurance" element={<InsurancePageWrapper />} />
                                <Route path="insurance-policy" element={<InsurancePolicyPage />} />
                                <Route path="challenge" element={<InsurancePageWrapper />} />
                                <Route path="challenge/:challengeId" element={<ChallengeDetailWrapper />} />
                                <Route path="log" element={<LogPageWrapper />} />
                                <Route path="log/:logId" element={<LogDetailWrapper />} />
                                <Route path="mypage" element={<MyPageWrapper />} />
                            </Routes>
                        </div>

                        {/* Summary Modal (Inside Container) */}
                        {showSummary && (
                            <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                                <div className="bg-white w-full rounded-t-[32px] p-8 shadow-2xl animate-slide-up">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-gray-500 text-sm font-medium">Session Ended</p>
                                            <h2 className="text-3xl font-bold text-black mt-1">
                                                {finalSessionScoreRef.current !== null ? finalSessionScoreRef.current : (finalSessionScore !== null ? finalSessionScore : Math.floor(score))} <span className="text-lg text-gray-400 font-normal">pts</span>
                                            </h2>
                                        </div>
                                        <button onClick={() => setShowSummary(false)} className="p-2 bg-gray-100 rounded-full">
                                            <X size={20} className="text-gray-600" />
                                        </button>
                                    </div>
                                    <div className="space-y-4 mb-8">
                                        {userRegion && (
                                            <div className={`bg-gradient-to-br ${userRegion.bgImage} p-4 rounded-2xl flex items-center gap-3 text-white`}>
                                                <Award size={24} />
                                                <div>
                                                    <p className="text-sm font-bold">{userRegion.name} 챌린지</p>
                                                    <p className="text-xs text-white/80">
                                                        {(finalSessionScoreRef.current !== null ? finalSessionScoreRef.current : (finalSessionScore !== null ? finalSessionScore : Math.floor(score))) >= userRegion.target
                                                            ? "목표 점수 달성! 포인트가 적립되었습니다."
                                                            : `목표(${userRegion.target}점)까지 조금만 더 힘내세요!`}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
                                            <AlertTriangle className="text-blue-500" size={24} />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Driving Tip</p>
                                                <p className="text-xs text-gray-500">
                                                    {(finalSessionScoreRef.current !== null ? finalSessionScoreRef.current : (finalSessionScore !== null ? finalSessionScore : Math.floor(score))) > 90 ? "Excellent focus! Keep maintaining this rhythm." : "Try to reduce phone usage during stops."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 pt-6">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-4">Recent History</p>
                                        <div className="space-y-3 max-h-40 overflow-y-auto">
                                            {history.slice(0, 3).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500">{item.date.split(',')[1]}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${item.score >= 90 ? 'text-green-600' : 'text-gray-900'}`}>
                                                            {item.score} pts
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bottom Nav (Fixed to viewport) */}
                        <BottomNav
                            onPageChange={handlePageChange}
                            selectedLog={selectedLog}
                            showCameraView={showCameraView}
                            showChallengeDetail={showChallengeDetail}
                        />

                        {/* Toast Notification */}
                        <Toast
                            message={toast.message}
                            isVisible={toast.isVisible}
                            onClose={closeToast}
                        />
                    </>
                )}
            </div>
            {/* 추론 전용 숨겨진 비디오 (PR #14 카메라 버그 수정) */}
            <video
                ref={captureVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                    position: 'fixed',
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: 'none',
                    left: 0,
                    top: 0
                }}
            />
        </div>
    );
};

export default Dashboard;
