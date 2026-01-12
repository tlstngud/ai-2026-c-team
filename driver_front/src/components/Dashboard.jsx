import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Square, Camera, CameraOff, Smartphone, Eye, Moon,
    ShieldCheck, AlertTriangle, X, FlipHorizontal, Video, History,
    TrendingUp, Award, DollarSign, ChevronRight, ChevronLeft, Clock,
    MapPin, Coffee, Hand, CheckCircle2, User, Bell
} from 'lucide-react';

// 상태 정의 (시연용 가상 로직)
const STATE_CONFIG = {
    0: { label: 'Driving Safe', icon: ShieldCheck, color: 'text-green-500', border: 'border-white/30', bg: 'bg-black/40' },
    1: { label: 'Drowsy', icon: Moon, color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-900/40' },
    2: { label: 'Distracted', icon: Eye, color: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-900/40' },
    3: { label: 'Phone Use', icon: Smartphone, color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-900/40' },
    4: { label: 'Violence', icon: AlertTriangle, color: 'text-red-600', border: 'border-red-600/60', bg: 'bg-red-950/50' },
};

// Apple Music 스타일용 상태 정의
const APPLE_STATE_CONFIG = {
    0: { label: 'Normal Driving', icon: ShieldCheck, color: 'text-gray-900', bg: 'bg-gray-100', penalty: 0 },
    1: { label: 'Drowsy Detected', icon: Moon, color: 'text-amber-500', bg: 'bg-amber-50', penalty: 2.0 },
    2: { label: 'Distracted (Search)', icon: Eye, color: 'text-orange-500', bg: 'bg-orange-50', penalty: 3.0 },
    3: { label: 'Phone Usage', icon: Smartphone, color: 'text-red-500', bg: 'bg-red-50', penalty: 5.0 },
    4: { label: 'Violence / Assault', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', penalty: 10.0 },
};

const Dashboard = () => {
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

    // --- Camera Setup ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });

            if (videoRef.current) videoRef.current.srcObject = stream;
            if (videoRef2.current) videoRef2.current.srcObject = stream;
            streamRef.current = stream;
            setHasPermission(true);
        } catch (err) {
            console.error("Camera Error:", err);
            setHasPermission(false);
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
        if (showCameraView) startCamera();
        else stopCamera();
        return () => { if (!showCameraView) stopCamera(); };
    }, [showCameraView]);

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

    // 페이지별 렌더링
    const renderPage = () => {
        if (currentPage === 'insurance') return <InsurancePage score={score} />;
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
            <div className="w-full max-w-[430px] min-h-screen sm:h-screen sm:max-h-screen bg-white sm:rounded-[40px] shadow-2xl overflow-hidden relative border-0 sm:border-[8px] sm:border-gray-900 ring-1 ring-black/5 flex flex-col">

                {/* 실제 앱 컨텐츠 영역 */}
                <div className="flex-1 overflow-y-auto scrollbar-hide bg-white relative pb-24">

                    {/* 페이지별 컨텐츠 */}
                    {currentPage === 'drive' && (
                        showCameraView ? (
                            // --- 카메라 모드 ---
                            <div className="min-h-full bg-black text-white font-sans flex flex-col relative h-full">
                                <div className="relative flex-1 bg-gray-900 overflow-hidden">
                                    {!hasPermission && (
                                        <div className="absolute inset-0 flex items-center justify-center z-0">
                                            <p className="text-gray-500">Camera Loading...</p>
                                        </div>
                                    )}

                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                                    />

                                    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 pb-28">
                                        <div className="flex justify-between items-start">
                                            <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                    Live Cam.
                                                </span>
                                            </div>

                                            <div className="flex flex-col items-end">
                                                <span className="text-5xl font-bold tracking-tighter drop-shadow-md text-white">
                                                    {Math.floor(score)}
                                                </span>
                                                <span className="text-xs font-medium text-white/60">Score</span>
                                            </div>
                                        </div>

                                        {isActive && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 transition-all duration-300">
                                                <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl transition-colors ${currentState === 0 ? 'border-white/50' : 'border-red-500'}`}></div>
                                                <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl transition-colors ${currentState === 0 ? 'border-white/50' : 'border-red-500'}`}></div>
                                                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl transition-colors ${currentState === 0 ? 'border-white/50' : 'border-red-500'}`}></div>
                                                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl transition-colors ${currentState === 0 ? 'border-white/50' : 'border-red-500'}`}></div>

                                                {currentState === 0 && (
                                                    <div className="w-full h-[2px] bg-green-400/50 shadow-[0_0_10px_#4ade80] animate-[scan_2s_ease-in-out_infinite]"></div>
                                                )}
                                            </div>
                                        )}

                                        <div className="self-center">
                                            <div className={`
                        flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border shadow-lg transition-all duration-300
                        ${currentConfig[currentState].bg}
                        ${currentConfig[currentState].border}
                      `}>
                                                <CurrentIcon size={20} className={currentConfig[currentState].color} />
                                                <span className={`text-sm font-bold ${currentConfig[currentState].color} tracking-tight`}>
                                                    {currentConfig[currentState].label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white h-auto pb-8 pt-4 px-6 rounded-t-[32px] -mt-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative">
                                    <div className="flex flex-col items-center gap-2 mb-6">
                                        <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
                                    </div>

                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <p className="text-gray-500 text-xs font-bold uppercase">Session Time</p>
                                            <p className="text-2xl font-bold text-black font-mono">
                                                {isActive ? formatTime(sessionTime) : "Ready"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs font-bold uppercase text-right">Event Log</p>
                                            <p className="text-2xl font-bold text-black text-right">
                                                {isActive ? eventCount : "-"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mb-4">
                                        <button
                                            onClick={() => setShowCameraView(false)}
                                            className="flex-1 h-14 rounded-xl bg-gray-100 text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <CameraOff size={18} /> Back
                                        </button>
                                        <button
                                            onClick={toggleSession}
                                            className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg transition-all active:scale-95 ${isActive
                                                ? 'bg-gray-100 text-black border border-gray-200'
                                                : 'bg-black text-white shadow-black/30'
                                                }`}
                                        >
                                            {isActive ? (
                                                <>
                                                    <Square fill="currentColor" size={18} /> Stop
                                                </>
                                            ) : (
                                                <>
                                                    <Play fill="currentColor" size={18} /> Start
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <style>{`
                  @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(250px); opacity: 0; }
                  }
                `}</style>
                            </div>
                        ) : (
                            // --- Apple Music 스타일 메인 ---
                            <div className="min-h-full relative">
                                {hasPermission && (
                                    <div className="absolute inset-0 z-0 h-[50vh]">
                                        <video
                                            ref={videoRef2}
                                            autoPlay
                                            playsInline
                                            muted
                                            className={`w-full h-full object-cover ${hasPermission ? 'scale-x-[-1]' : ''}`}
                                            style={{ transform: hasPermission ? 'scaleX(-1)' : 'none' }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-white"></div>
                                    </div>
                                )}

                                <header className="px-6 pt-6 pb-3 bg-white/90 backdrop-blur-xl z-30 sticky top-0 border-b border-gray-100">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                                {isActive ? 'Session Active' : 'Ready to Drive'}
                                            </p>
                                            <h1 className="text-2xl font-bold tracking-tight text-black">My Driving</h1>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-400 font-medium">Avg Score</span>
                                            <p className="text-lg font-bold">{getAverageScore()}</p>
                                        </div>
                                    </div>
                                </header>

                                <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 mt-10">
                                    <div className="relative w-48 h-48 flex items-center justify-center mb-10 transition-transform duration-500 will-change-transform">
                                        <svg className="absolute w-full h-full transform -rotate-90">
                                            <circle cx="96" cy="96" r="90" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                                            <circle cx="96" cy="96" r="90" stroke={score > 80 ? "#10b981" : score > 50 ? "#f59e0b" : "#ef4444"} strokeWidth="10" fill="none" strokeDasharray={2 * Math.PI * 90} strokeDashoffset={2 * Math.PI * 90 * (1 - score / 100)} strokeLinecap="round" className="transition-all duration-500 ease-out" />
                                        </svg>
                                        <div className="flex flex-col items-center z-10">
                                            <span className={`text-5xl font-bold tracking-tighter ${hasPermission ? 'text-black' : 'text-black'}`}>
                                                {Math.floor(score)}
                                            </span>
                                            <span className="text-xs font-medium mt-1 text-gray-400">POINTS</span>
                                        </div>
                                    </div>

                                    <div className={`
                    flex items-center gap-3 px-6 py-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] 
                    transition-all duration-300 transform backdrop-blur-md
                    ${hasPermission ? 'bg-white/90' : APPLE_STATE_CONFIG[currentState].bg}
                    ${currentState !== 0 ? 'scale-105' : 'scale-100'}
                  `}>
                                        <CurrentIcon size={24} className={APPLE_STATE_CONFIG[currentState].color} />
                                        <div>
                                            <p className={`text-sm font-bold ${APPLE_STATE_CONFIG[currentState].color}`}>
                                                {APPLE_STATE_CONFIG[currentState].label}
                                            </p>
                                            {currentState !== 0 && (
                                                <p className="text-[10px] text-gray-500 font-medium">Penalty: -{APPLE_STATE_CONFIG[currentState].penalty} pts</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`mt-8 grid grid-cols-2 gap-8 w-full max-w-xs text-center ${hasPermission ? 'bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg' : ''}`}>
                                        <div>
                                            <p className="text-xs font-semibold uppercase text-gray-400">Duration</p>
                                            <p className="text-2xl font-semibold mt-1 font-mono text-gray-900">
                                                {Math.floor(sessionTime / 60)}:{(Math.floor(sessionTime) % 60).toString().padStart(2, '0')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase text-gray-400">Events</p>
                                            <p className={`text-2xl font-semibold mt-1 ${eventCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                                {eventCount}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center gap-3">
                                        <button onClick={() => setShowCameraView(true)} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all shadow-md text-gray-700">
                                            <Camera size={18} />
                                        </button>
                                    </div>
                                </main>

                                <div className="p-6 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-10 relative mt-4">
                                    <button onClick={toggleSession} className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-lg font-bold shadow-lg transition-all active:scale-95 ${isActive ? 'bg-gray-100 text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800 shadow-black/20'}`}>
                                        {isActive ? <><Square fill="currentColor" size={20} /> End Session</> : <><Play fill="currentColor" size={20} /> Start Driving</>}
                                    </button>
                                </div>
                            </div>
                        )
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

            </div>

            {/* Bottom Nav (Fixed to viewport) */}
            {!selectedLog && (
                <div className="fixed bottom-0 left-0 right-0 flex justify-center py-3 px-4 z-50 pointer-events-none sm:pointer-events-auto">
                    <nav className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl flex justify-around items-center h-20 px-6 py-3 w-[90%] max-w-[360px] sm:max-w-[360px]">
                        <NavButton active={currentPage === 'drive'} onClick={() => { setCurrentPage('drive'); setSelectedLog(null); }} icon={<Video size={22} />} label="드라이브" />
                        <NavButton active={currentPage === 'insurance'} onClick={() => { setCurrentPage('insurance'); setSelectedLog(null); }} icon={<ShieldCheck size={22} />} label="보험혜택" />
                        <NavButton active={currentPage === 'log'} onClick={() => { setCurrentPage('log'); setSelectedLog(null); }} icon={<History size={22} />} label="주행기록" />
                    </nav>
                </div>
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* 2. Insurance Page (보험 혜택 페이지) */
/* -------------------------------------------------------------------------- */
const InsurancePage = ({ score = 85 }) => {
    const [discountRate, setDiscountRate] = useState(0);

    useEffect(() => {
        if (score >= 110) setDiscountRate(10);
        else if (score >= 100) setDiscountRate(5);
        else setDiscountRate(0);
    }, [score]);

    return (
        <div className="min-h-full bg-[#F8FAFC] text-slate-800 p-4 sm:p-6 font-sans">
            <header className="flex justify-between items-center gap-4 mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-md">
                        <ShieldCheck className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 leading-none">Smart Mobility</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tighter">UBI System</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                    <div className="px-2 border-r border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400">적용 할인율</p>
                        <p className="text-base font-black text-blue-600">{discountRate}%</p>
                    </div>
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-slate-400" />
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 gap-4">
                <div className="relative aspect-[16/9] bg-slate-900 rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-medium">
                        <span className="text-xs">[ 실시간 모니터링 피드 ]</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                        <span className="text-[10px] font-bold text-slate-700 font-mono italic">Live</span>
                    </div>
                </div>

                <section className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-900/5 border border-blue-50 border-b-4 border-b-blue-600">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Safety Score</p>
                            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                                {score}<span className="text-lg text-slate-300 ml-1 font-normal">pts</span>
                            </h2>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-xl">
                            <TrendingUp className="text-blue-600" size={20} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">
                            다음 할인까지 <span className="text-blue-600">{100 - score > 0 ? 100 - score : 0}점</span>
                        </p>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${(score / 120) * 100}%` }}></div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <DollarSign className="absolute -right-4 -bottom-4 text-white/5" size={80} />
                    <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">Economic Benefit</h3>
                    <div className="space-y-3 relative z-10">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <span className="text-slate-400 text-xs italic font-medium">예상 절감액 (월)</span>
                            <span className="text-xl font-bold font-mono">₩{(discountRate * 1250).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl">
                            <CheckCircle2 className="text-green-400 shrink-0" size={16} />
                            <p className="text-[10px] leading-relaxed text-slate-300 font-medium font-mono">
                                갱신 시 <span className="text-white font-bold">{discountRate}% 할인</span> 자동 적용.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* 3. Driving Log Page (주행 로그 목록) */
/* -------------------------------------------------------------------------- */
const DrivingLogPage = ({ onSelectLog, history = [] }) => {
    const defaultLogs = [
        { id: 1, date: "2024.05.20", score: 95, msg: "완벽한 주행", status: "perfect", time: "08:30 - 09:45", distance: "24km" },
        { id: 2, date: "2024.05.19", score: 72, msg: "졸음 부주의", status: "warning", time: "14:20 - 15:10", distance: "12km" },
        { id: 3, date: "2024.05.18", score: 84, msg: "휴대폰 조작", status: "normal", time: "18:00 - 19:30", distance: "35km" },
    ];

    const historyLogs = history.map((item, idx) => ({
        id: `history-${idx}`,
        date: new Date(item.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.').replace(/\s/g, ''),
        score: item.score,
        msg: item.score >= 90 ? "완벽한 주행" : item.events > 0 ? "이상 행동 감지" : "정상 주행",
        status: item.score >= 90 ? "perfect" : item.score >= 70 ? "normal" : "warning",
        time: `${Math.floor(item.duration / 60)}분 주행`,
        distance: `${Math.floor(item.duration * 0.5)}km`
    }));

    const logs = [...historyLogs, ...defaultLogs].slice(0, 10);

    return (
        <div className="p-6 animate-in fade-in duration-500">
            <header className="mb-6">
                <h1 className="text-2xl font-black">주행 로그</h1>
                <p className="text-xs text-slate-400 font-medium italic uppercase tracking-tighter">Recent History</p>
            </header>
            <div className="space-y-3">
                {logs.map(log => (
                    <div key={log.id} onClick={() => onSelectLog(log)} className="cursor-pointer">
                        <LogEntry date={log.date} score={log.score} msg={log.msg} status={log.status} />
                    </div>
                ))}
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* 4. Log Detail Page */
/* -------------------------------------------------------------------------- */
const LogDetailPage = ({ data, onBack }) => (
    <div className="p-6 animate-in slide-in-from-right duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold mb-6 hover:text-slate-900 transition-colors">
            <ChevronLeft size={20} />
            <span className="text-sm">뒤로가기</span>
        </button>

        <header className="mb-8">
            <div className="flex justify-between items-start mb-2">
                <h1 className="text-2xl font-black text-slate-900">
                    {data.date} <span className="text-base font-normal text-slate-400 italic">Report</span>
                </h1>
                <div className={`px-3 py-1 rounded-full text-xs font-black ${data.status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {data.score} PTS
                </div>
            </div>
            <div className="flex flex-wrap gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><Clock size={12} /> {data.time}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {data.distance}</span>
            </div>
        </header>

        <div className="grid grid-cols-1 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">운행 평가</p>
                <p className="text-lg font-black leading-tight text-slate-800">{data.msg}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white flex flex-col justify-between">
                <p className="text-[10px] font-bold text-blue-400 mb-2 uppercase">보험료 변동</p>
                <p className="text-xl font-black">{data.score >= 90 ? "-₩1,200" : "+₩0"}</p>
            </div>
        </div>

        <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detection Details</h3>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                <DetailItem icon={<Coffee className="text-orange-500" size={18} />} title="졸음운전" count={data.status === 'warning' ? "2회" : "0회"} desc="눈 감음 지속 감지" />
                <DetailItem icon={<Smartphone className="text-blue-500" size={18} />} title="휴대폰 조작" count={data.status === 'normal' ? "1회" : "0회"} desc="전방 주시 태만" />
            </div>
        </section>
    </div>
);

/* 헬퍼 컴포넌트 */
const DetailItem = ({ icon, title, count, desc }) => (
    <div className="flex items-start gap-4">
        <div className="bg-slate-50 p-3 rounded-2xl shrink-0">{icon}</div>
        <div className="flex-grow border-b border-slate-50 pb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black text-slate-800">{title}</span>
                <span className="text-sm font-black text-slate-400">{count}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{desc}</p>
        </div>
    </div>
);

const LogEntry = ({ date, score, msg, status }) => (
    <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-colors">
        <div className="flex gap-4 items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${status === 'perfect' ? 'bg-green-100 text-green-600' : status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{score}</div>
            <div>
                <p className="text-xs font-bold text-slate-400 mb-0.5 font-mono italic">{date}</p>
                <p className="text-sm font-bold text-slate-800">{msg}</p>
            </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 shrink-0" />
    </div>
);

const NavButton = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-14 ${active ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
        <div className={`flex items-center justify-center ${active ? 'bg-indigo-50 p-2 rounded-xl' : 'p-2'}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">{label}</span>
    </button>
);

export default Dashboard;
