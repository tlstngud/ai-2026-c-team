import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { addLogByUserId, getLogsByUserId } from '../utils/LogService';
import { storage } from '../utils/localStorage';
import { startGpsMonitoring, stopGpsMonitoring, requestMotionPermission } from '../utils/GpsService';
import { AlertTriangle, X, MapPin, Search, Award } from 'lucide-react';
import { STATE_CONFIG, APPLE_STATE_CONFIG } from './constants';
import Header from './Header';
import BottomNav from './BottomNav';
import DrivePage from './DrivePage';
import InsurancePage from './InsurancePage';
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
    const [userRegion, setUserRegion] = useState(() => {
        // localStorage에서 지역 정보 확인
        const saved = localStorage.getItem('userRegion');
        if (saved) return JSON.parse(saved);
        return null;
    });

    // --- Refs & State ---
    const videoRef = useRef(null);
    const videoRef2 = useRef(null);
    const streamRef = useRef(null);
    
    const [showCameraView, setShowCameraView] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isActive, setIsActive] = useState(false);
    // 가중치 기반 점수 계산을 위한 상태
    const [driverBehaviorScore, setDriverBehaviorScore] = useState(100); // 운전자 행동 점수 (40%)
    const [speedLimitScore, setSpeedLimitScore] = useState(100); // 제한속도 준수 점수 (35%)
    const [accelDecelScore, setAccelDecelScore] = useState(100); // 급가속/감속 점수 (25%)

    // 최종 가중 평균 점수
    const [score, setScore] = useState(100);
    const [sessionTime, setSessionTime] = useState(0);
    const [currentState, setCurrentState] = useState(0);
    const [eventCount, setEventCount] = useState(0);
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
    const [coupons, setCoupons] = useState([]);
    const [toast, setToast] = useState({ isVisible: false, message: '' });
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

    // 가중 평균 점수 계산 함수
    const calculateWeightedScore = () => {
        const weightedScore =
            (driverBehaviorScoreRef.current * WEIGHTS.DRIVER_BEHAVIOR) +
            (speedLimitScoreRef.current * WEIGHTS.SPEED_LIMIT) +
            (accelDecelScoreRef.current * WEIGHTS.ACCEL_DECEL);
        return Math.max(0, Math.min(100, weightedScore));
    };
    const sessionTimeRef = useRef(0);

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

    // --- 주소 입력 및 지자체 배정 로직 ---
    const handleAddressSubmit = () => {
        if (inputAddress.trim().length < 2) {
            alert("정확한 주소를 입력해주세요.");
            return;
        }

        setStep('loading');

        // 지자체 매칭 시뮬레이션 (1.5초 후 배정)
        setTimeout(() => {
            let assigned = MUNICIPALITY_DB['default'];
            if (inputAddress.includes('춘천')) assigned = MUNICIPALITY_DB['춘천'];
            else if (inputAddress.includes('서울')) assigned = MUNICIPALITY_DB['서울'];

            const regionData = {
                ...assigned,
                address: inputAddress
            };

            setUserRegion(regionData);
            localStorage.setItem('userRegion', JSON.stringify(regionData));
            setStep('dashboard');
            navigate('/drive'); // 대시보드로 이동
        }, 1500);
    };


    // --- Camera Setup ---
    const attachStreamToVideo = (stream) => {
        if (!stream) return;

        const setupVideo = (videoEl) => {
            if (!videoEl) return;
            videoEl.srcObject = stream;
            videoEl.setAttribute("playsinline", "true"); // iOS 블랙스크린 방지
            videoEl.setAttribute("webkit-playsinline", "true");

            videoEl.onloadedmetadata = () => {
                videoEl.play().catch(e => console.warn("Video play failed:", e));
            };

            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // 모바일에서 video 요소 강제 표시
                        videoEl.style.display = 'block';
                        videoEl.style.visibility = 'visible';
                    })
                    .catch(e => console.warn("Video play failed:", e));
            }
        };

        if (videoRef.current) setupVideo(videoRef.current);
        if (videoRef2.current) setupVideo(videoRef2.current);
    };

    const startCamera = async () => {
        try {
            // 이미 스트림이 있다면 재연결만 수행
            if (streamRef.current && streamRef.current.active) {
                attachStreamToVideo(streamRef.current);
                setHasPermission(true);
                return;
            }

            // 모바일 호환성을 위해 제약 완화 및 사용자 정의 제약 적용
            const constraints = {
                video: {
                    facingMode: "user",
                    width: { ideal: 1280, min: 640 }, // 기본 720p, 최소 480p
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 30, max: 30 } // FPS 30 고정
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            attachStreamToVideo(stream);
            setHasPermission(true);
        } catch (err) {
            console.error("Camera Error:", err);
            setHasPermission(false);
            if (err.name === 'NotAllowedError') {
                console.error("카메라 권한이 거부되었습니다.");
            } else if (err.name === 'NotFoundError') {
                console.error("카메라를 찾을 수 없습니다.");
            } else if (err.name === 'OverconstrainedError') {
                console.error("카메라 제약 조건을 만족할 수 없습니다:", err.constraint);
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        if (videoRef2.current) videoRef2.current.srcObject = null;
        setHasPermission(false);
    };

    useEffect(() => {
        if (showCameraView) {
            startCamera();
        } else {
            // Stop camera only if we really want to stop it completely. 
            // But based on user request, maybe we should keep it running if active?
            // For now, follow existing logic but startCamera handles existing stream.
            stopCamera();
        }
        return () => {
            // Cleanup only if component unmounts completely, or leave it to logic
            if (!showCameraView) stopCamera();
        };
    }, [showCameraView]);

    // 페이지 이동 후 돌아왔을 때 스트림 재연결 (카메라가 켜져있는 상태라면)
    useEffect(() => {
        if ((location.pathname === '/drive' || location.pathname === '/') && showCameraView && streamRef.current && streamRef.current.active) {
            // 약간의 지연을 주어 DOM이 확실히 렌더링 된 후 연결 시도
            setTimeout(() => {
                attachStreamToVideo(streamRef.current);
            }, 100);
        }
    }, [location.pathname, showCameraView]);

    // --- Session Time Counter ---
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                sessionTimeRef.current += 1;
                setSessionTime(sessionTimeRef.current);
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
                        setCurrentSpeed(data.speed);
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
                            // 과속 1회당 5점 감점 (제한속도 준수 요소만)
                            speedLimitScoreRef.current = Math.max(0, speedLimitScoreRef.current - 5);
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
                            // 급가속 1회당 4점 감점 (급가속/감속 요소만)
                            accelDecelScoreRef.current = Math.max(0, accelDecelScoreRef.current - 4);
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
                            // 급감속 1회당 5점 감점 (급가속/감속 요소만)
                            accelDecelScoreRef.current = Math.max(0, accelDecelScoreRef.current - 5);
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
        }

        return () => {
            if (gpsWatchIdRef.current !== null) {
                stopGpsMonitoring(gpsWatchIdRef.current);
            }
        };
    }, [isActive]);

    // --- Simulation Logic (Scoring) ---
    // 운전자 행동 점수 계산 (40% 가중치)
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                const rand = Math.random();
                let nextState = 0;
                if (rand > 0.96) nextState = 3;
                else if (rand > 0.93) nextState = 1;
                else if (rand > 0.90) nextState = 2;
                setCurrentState(nextState);

                // 운전자 행동 점수 감점 (40% 가중치)
                let penalty = 0;
                let recovery = 0.05;
                if (nextState !== 0) {
                    // 상태별 감점량 조정 (운전자 행동 요소만)
                    if (nextState === 1) penalty = 3.0;  // 경미한 부주의
                    if (nextState === 2) penalty = 4.0;  // 중간 부주의
                    if (nextState === 3) penalty = 8.0;   // 심각한 부주의 (졸음 등)
                    setEventCount(prev => prev + 1);
                    recovery = 0;
                }

                // 운전자 행동 점수만 업데이트
                driverBehaviorScoreRef.current = Math.max(0, Math.min(100, driverBehaviorScoreRef.current - penalty + recovery));
                setDriverBehaviorScore(driverBehaviorScoreRef.current);

                // 가중 평균 점수 재계산
                const newScore = calculateWeightedScore();
                scoreRef.current = newScore;
                setScore(newScore);
            }, 300);
        }
        return () => clearInterval(interval);
    }, [isActive]);

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
                gpsEvents: {
                    hardAccel: gpsEvents.hardAccel,
                    hardBrake: gpsEvents.hardBrake,
                    overspeed: gpsEvents.overspeed
                },
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
            setSessionTime(0);
            sessionTimeRef.current = 0;
            setShowSummary(false);
            setFinalSessionScore(null); // 세션 시작 시 최종 점수 초기화
            finalSessionScoreRef.current = null; // ref도 초기화
            setIsActive(true);
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
        switch(page) {
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

    // 페이지별 렌더링 컴포넌트
    const DrivePageWrapper = () => (
        <>
            {!showCameraView && (
                <Header isActive={isActive} averageScore={getAverageScore()} />
            )}
            <DrivePage
                showCameraView={showCameraView}
                setShowCameraView={setShowCameraView}
                hasPermission={hasPermission}
                videoRef={videoRef}
                videoRef2={videoRef2}
                isActive={isActive}
                score={score}
                sessionTime={sessionTime}
                currentState={currentState}
                eventCount={eventCount}
                toggleSession={toggleSession}
                formatTime={formatTime}
                currentConfig={currentConfig}
                CurrentIcon={CurrentIcon}
                userRegion={userRegion}
                currentSpeed={currentSpeed}
                gpsAcceleration={gpsAcceleration}
                gpsEvents={gpsEvents}
                sensorStatus={sensorStatus}
                gpsAccuracy={gpsAccuracy}
                gpsStatus={gpsStatus}
                speedLimit={speedLimit}
                roadName={roadName}
                speedLimitLoading={speedLimitLoading}
                speedLimitDebug={speedLimitDebug}
            />
        </>
    );

    const InsurancePageWrapper = () => {
        const avgScore = getAverageScore() ?? score;
        return <InsurancePage score={avgScore} history={history} userRegion={userRegion} onShowChallengeDetail={setShowChallengeDetail} onClaimReward={addCoupon} />;
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
                            {/* React Router를 사용한 페이지 라우팅 */}
                            <Routes>
                                <Route index element={<DrivePageWrapper />} />
                                <Route path="drive" element={<DrivePageWrapper />} />
                                <Route path="insurance" element={<InsurancePageWrapper />} />
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
        </div>
    );
};

export default Dashboard;
