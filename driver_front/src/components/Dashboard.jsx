import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, MapPin, Search, Award } from 'lucide-react';
import { STATE_CONFIG, APPLE_STATE_CONFIG } from './constants';
import Header from './Header';
import BottomNav from './BottomNav';
import DrivePage from './DrivePage';
import InsurancePage from './InsurancePage';
import DrivingLogPage from './DrivingLogPage';
import LogDetailPage from './LogDetailPage';

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
    // --- Onboarding & User Region State ---
    const [step, setStep] = useState(() => {
        // 저장된 주소가 있으면 바로 대시보드로
        const savedRegion = localStorage.getItem('userRegion');
        return savedRegion ? 'dashboard' : 'onboarding';
    });
    const [inputAddress, setInputAddress] = useState('');
    const [userRegion, setUserRegion] = useState(() => {
        const saved = localStorage.getItem('userRegion');
        return saved ? JSON.parse(saved) : null;
    });

    // --- Refs & State ---
    const videoRef = useRef(null);
    const videoRef2 = useRef(null);
    const streamRef = useRef(null);
    const [currentPage, setCurrentPage] = useState('drive'); // drive, insurance, log
    const [showCameraView, setShowCameraView] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [score, setScore] = useState(100);
    const [sessionTime, setSessionTime] = useState(0);
    const [currentState, setCurrentState] = useState(0);
    const [eventCount, setEventCount] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [history, setHistory] = useState([]);

    const scoreRef = useRef(100);
    const sessionTimeRef = useRef(0);

    // --- Initialize History ---
    useEffect(() => {
        const saved = localStorage.getItem('drivingHistory');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

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
        if (currentPage === 'drive' && showCameraView && streamRef.current && streamRef.current.active) {
            // 약간의 지연을 주어 DOM이 확실히 렌더링 된 후 연결 시도
            setTimeout(() => {
                attachStreamToVideo(streamRef.current);
            }, 100);
        }
    }, [currentPage, showCameraView]);

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

    // --- Simulation Logic (Scoring) ---
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

                let penalty = 0;
                let recovery = 0.05;
                if (nextState !== 0) {
                    if (nextState === 1) penalty = 1.5;
                    if (nextState === 2) penalty = 2.0;
                    if (nextState === 3) penalty = 4.0;
                    setEventCount(prev => prev + 1);
                    recovery = 0;
                }
                const newScore = Math.max(0, Math.min(100, scoreRef.current - penalty + recovery));
                scoreRef.current = newScore;
                setScore(newScore);
            }, 300);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // --- Handlers ---
    const toggleSession = () => {
        if (isActive) {
            setIsActive(false);
            const finalScore = Math.floor(score);
            const newEntry = {
                date: new Date().toLocaleString(),
                score: finalScore,
                duration: Math.floor(sessionTime),
                events: eventCount
            };
            const newHistory = [newEntry, ...history].slice(0, 10);
            setHistory(newHistory);
            localStorage.setItem('drivingHistory', JSON.stringify(newHistory));
            setShowSummary(true);
        } else {
            setScore(100);
            scoreRef.current = 100;
            setCurrentState(0);
            setEventCount(0);
            setSessionTime(0);
            sessionTimeRef.current = 0;
            setShowSummary(false);
            setIsActive(true);
        }
    };

    const getAverageScore = () => {
        if (history.length === 0) return 0;
        const sum = history.reduce((acc, curr) => acc + curr.score, 0);
        return Math.floor(sum / history.length);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const CurrentIcon = showCameraView ? STATE_CONFIG[currentState].icon : APPLE_STATE_CONFIG[currentState].icon;
    const currentConfig = showCameraView ? STATE_CONFIG : APPLE_STATE_CONFIG;

    const handlePageChange = (page) => {
        setCurrentPage(page);
        setSelectedLog(null);
    };

    // 페이지별 렌더링
    const renderPage = () => {
        if (currentPage === 'insurance') return <InsurancePage score={score} history={history} userRegion={userRegion} />;
        if (currentPage === 'log') {
            if (selectedLog) return <LogDetailPage data={selectedLog} onBack={() => setSelectedLog(null)} />;
            return <DrivingLogPage onSelectLog={(log) => setSelectedLog(log)} history={history} />;
        }
        return null;
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
                            <h1 className="text-3xl font-black text-slate-900 mb-2">어디에<br/>거주하시나요?</h1>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                거주하시는 지자체의 안전운전 챌린지에<br/>자동으로 연결해 드립니다.
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
                                    * 입력하신 주소지 관할 지자체의 예산으로 보험 할인 혜택이 제공됩니다.<br/>
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

                    {/* 페이지별 컨텐츠 */}
                    {currentPage === 'drive' && (
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
                            />
                        </>
                    )}

                            {/* 다른 페이지 렌더링 */}
                            {renderPage()}
                        </div>

                        {/* Summary Modal (Inside Container) */}
                        {showSummary && (
                            <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                                <div className="bg-white w-full rounded-t-[32px] p-8 shadow-2xl animate-slide-up">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-gray-500 text-sm font-medium">Session Ended</p>
                                            <h2 className="text-3xl font-bold text-black mt-1">
                                                {Math.floor(score)} <span className="text-lg text-gray-400 font-normal">pts</span>
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
                                                        {Math.floor(score) >= userRegion.target 
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
                                                    {Math.floor(score) > 90 ? "Excellent focus! Keep maintaining this rhythm." : "Try to reduce phone usage during stops."}
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
                            currentPage={currentPage}
                            onPageChange={handlePageChange}
                            selectedLog={selectedLog}
                            showCameraView={showCameraView}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
