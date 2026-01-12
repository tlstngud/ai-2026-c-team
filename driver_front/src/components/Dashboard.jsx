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

/* -------------------------------------------------------------------------- */
/* Custom Hook: 알림 필터링 로직 */
/* -------------------------------------------------------------------------- */
const useAlertFilter = (rawValue) => {
    const [filteredAlert, setFilteredAlert] = useState(0);
    const timerRef = useRef(null);

    const THRESHOLDS = {
        1: 2000, // 졸음: 2초 유지 시 알림
        2: 3000, // 물건 찾기: 3초 유지 시 알림
        3: 2000, // 휴대폰 조작: 2초 유지 시 알림
        4: 0,    // 운전자 폭행: 즉시 알림
    };

    useEffect(() => {
        if (rawValue === 0) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            setFilteredAlert(0);
            return;
        }

        if (rawValue === filteredAlert) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            return;
        }

        clearTimeout(timerRef.current);

        const waitTime = THRESHOLDS[rawValue] ?? 2000;

        timerRef.current = setTimeout(() => {
            setFilteredAlert(rawValue);
        }, waitTime);

        return () => clearTimeout(timerRef.current);
    }, [rawValue, filteredAlert]);

    return filteredAlert;
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

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            if (videoRef2.current) {
                videoRef2.current.srcObject = stream;
            }
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
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (videoRef2.current) {
            videoRef2.current.srcObject = null;
        }
        setHasPermission(false);
    };

    useEffect(() => {
        if (showCameraView) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            if (!showCameraView) {
                stopCamera();
            }
        };
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
        if (currentPage === 'insurance') {
            return <InsurancePage score={score} />;
        }
        if (currentPage === 'log') {
            if (selectedLog) {
                return <LogDetailPage data={selectedLog} onBack={() => setSelectedLog(null)} />;
            }
            return <DrivingLogPage onSelectLog={(log) => setSelectedLog(log)} history={history} />;
        }
        // drive 페이지는 아래에서 렌더링
        return null;
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-200 relative overflow-hidden flex flex-col pb-24">

            {/* 페이지별 컨텐츠 */}
            {currentPage === 'drive' && (
                showCameraView ? (
                    // 카메라 모드
                    <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative">
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

                        {showSummary && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 animate-fade-in">
                                <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-slide-up">
                                    <div className="text-center mb-6">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                                            <ShieldCheck size={32} className="text-black" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-black">{Math.floor(score)} pts</h2>
                                        <p className="text-gray-500 text-sm mt-1">Driving Score</p>
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                                            <span className="text-gray-500 text-sm">Session Duration</span>
                                            <span className="font-bold">{formatTime(sessionTime)}</span>
                                        </div>
                                        <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                                            <span className="text-gray-500 text-sm">Total Events</span>
                                            <span className="font-bold">{eventCount}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowSummary(false)}
                                        className="w-full h-14 bg-black text-white rounded-xl font-bold transition-all active:scale-95"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        )}

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
                    // Apple Music 스타일 UI
                    <>
                        {hasPermission && (
                            <div className="absolute inset-0 z-0">
                                <video
                                    ref={videoRef2}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${hasPermission ? 'scale-x-[-1]' : ''}`}
                                    style={{ transform: hasPermission ? 'scaleX(-1)' : 'none' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
                            </div>
                        )}

                        <header className="px-6 pt-14 pb-4 bg-white/90 backdrop-blur-xl z-10 sticky top-0 border-b border-gray-100">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                        {isActive ? 'Session Active' : 'Ready to Drive'}
                                    </p>
                                    <h1 className="text-3xl font-bold tracking-tight text-black">My Driving</h1>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400 font-medium">Avg Score</span>
                                    <p className="text-xl font-bold">{getAverageScore()}</p>
                                </div>
                            </div>
                        </header>

                        <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                            <div className="relative w-48 h-48 flex items-center justify-center mb-10 transition-transform duration-500 will-change-transform">
                                <svg className="absolute w-full h-full transform -rotate-90">
                                    <circle
                                        cx="96" cy="96" r="90"
                                        stroke="#f3f4f6" strokeWidth="10" fill="none"
                                    />
                                    <circle
                                        cx="96" cy="96" r="90"
                                        stroke={score > 80 ? "#10b981" : score > 50 ? "#f59e0b" : "#ef4444"}
                                        strokeWidth="10" fill="none"
                                        strokeDasharray={2 * Math.PI * 90}
                                        strokeDashoffset={2 * Math.PI * 90 * (1 - score / 100)}
                                        strokeLinecap="round"
                                        className="transition-all duration-500 ease-out"
                                    />
                                </svg>

                                <div className="flex flex-col items-center z-10">
                                    <span className={`text-5xl font-bold tracking-tighter ${hasPermission ? 'text-white drop-shadow-2xl' : 'text-black'}`}>
                                        {Math.floor(score)}
                                    </span>
                                    <span className={`text-xs font-medium mt-1 ${hasPermission ? 'text-white/90 drop-shadow-lg' : 'text-gray-400'}`}>POINTS</span>
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
                                        <p className="text-[10px] text-gray-500 font-medium">
                                            Penalty: -{APPLE_STATE_CONFIG[currentState].penalty} pts
                                        </p>
                                    )}
                                    {currentState === 0 && isActive && (
                                        <p className="text-[10px] text-gray-400 font-medium">Recovering +0.01...</p>
                                    )}
                                </div>
                            </div>

                            <div className={`mt-8 grid grid-cols-2 gap-8 w-full max-w-xs text-center ${hasPermission ? 'bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg' : ''}`}>
                                <div>
                                    <p className={`text-xs font-semibold uppercase ${hasPermission ? 'text-gray-600' : 'text-gray-400'}`}>Duration</p>
                                    <p className={`text-2xl font-semibold mt-1 font-mono ${hasPermission ? 'text-black' : 'text-gray-900'}`}>
                                        {Math.floor(sessionTime / 60)}:{(Math.floor(sessionTime) % 60).toString().padStart(2, '0')}
                                    </p>
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold uppercase ${hasPermission ? 'text-gray-600' : 'text-gray-400'}`}>Events</p>
                                    <p className={`text-2xl font-semibold mt-1 ${eventCount > 0 ? 'text-red-500' : hasPermission ? 'text-black' : 'text-gray-900'}`}>
                                        {eventCount}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-3">
                                <button
                                    onClick={() => setShowCameraView(true)}
                                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all shadow-md text-gray-700"
                                >
                                    <Camera size={18} />
                                </button>
                            </div>
                        </main>

                        <div className="p-6 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-10 relative">
                            <button
                                onClick={toggleSession}
                                className={`
                  w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-lg font-bold shadow-lg transition-all active:scale-95
                  ${isActive
                                        ? 'bg-gray-100 text-black hover:bg-gray-200'
                                        : 'bg-black text-white hover:bg-gray-800 shadow-black/20'}
                `}
                            >
                                {isActive ? (
                                    <>
                                        <Square fill="currentColor" size={20} /> End Session
                                    </>
                                ) : (
                                    <>
                                        <Play fill="currentColor" size={20} /> Start Driving
                                    </>
                                )}
                            </button>
                        </div>

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
                                                    {Math.floor(score) > 90
                                                        ? "Excellent focus! Keep maintaining this rhythm."
                                                        : "Try to reduce phone usage during stops."}
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
                    </>
                )
            )}

            {/* 다른 페이지 렌더링 */}
            {renderPage()}

            {/* Bottom Nav (상세페이지일 때는 숨김) */}
            {!selectedLog && (
                <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl flex justify-around items-center h-20 px-4 py-3 z-50">
                    <NavButton
                        active={currentPage === 'drive'}
                        onClick={() => { setCurrentPage('drive'); setSelectedLog(null); }}
                        icon={<Video size={22} />}
                        label="드라이브"
                    />
                    <NavButton
                        active={currentPage === 'insurance'}
                        onClick={() => { setCurrentPage('insurance'); setSelectedLog(null); }}
                        icon={<ShieldCheck size={22} />}
                        label="보험혜택"
                    />
                    <NavButton
                        active={currentPage === 'log'}
                        onClick={() => { setCurrentPage('log'); setSelectedLog(null); }}
                        icon={<History size={22} />}
                        label="주행기록"
                    />
                </nav>
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
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-4 sm:p-6 md:p-8 font-sans">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 md:mb-10 pb-4 sm:pb-5 md:pb-6 border-b border-slate-200">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-blue-200 shadow-md sm:shadow-lg">
                        <ShieldCheck className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-none">Smart Mobility Care</h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5 sm:mt-1 uppercase tracking-tighter">
                            <span className="hidden sm:inline">Insurance Linked System</span>
                            <span className="sm:hidden">UBI System</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 bg-white p-2 sm:p-2 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 w-full sm:w-auto">
                    <div className="px-3 sm:px-4 border-r border-slate-100">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400">현재 적용 할인율</p>
                        <p className="text-base sm:text-lg font-black text-blue-600">{discountRate}% OFF</p>
                    </div>
                    <div className="flex gap-2 pr-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-slate-400" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-12 gap-4 sm:gap-6 md:gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-4 sm:space-y-5 md:space-y-6">
                    <div className="relative aspect-[16/9] bg-slate-900 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-xl sm:shadow-2xl border-4 sm:border-[8px] border-white">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-medium p-4">
                            <span className="text-xs sm:text-sm md:text-base">[ 실시간 모니터링 피드 ]</span>
                        </div>

                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 bg-white/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-sm">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-ping"></div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 font-mono italic">Safe Driving Now</span>
                        </div>
                    </div>

                    <section className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-4 sm:mb-6 md:mb-8">Benefit Milestones</h3>
                        <div className="relative flex justify-between items-center px-2 sm:px-4 overflow-x-auto">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
                            <div className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-1000" style={{ width: `${(score / 120) * 100}%` }}></div>

                            <Milestone step="80" label="Default" active={score >= 80} />
                            <Milestone step="100" label="5% 할인" active={score >= 100} />
                            <Milestone step="110" label="10% 할인" active={score >= 110} icon={<Award size={14} />} />
                            <Milestone step="120" label="MAX" active={score >= 120} />
                        </div>
                    </section>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-4 sm:space-y-5 md:space-y-6">
                    <section className="bg-white rounded-xl sm:rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-lg sm:shadow-xl shadow-blue-900/5 border border-blue-50 border-b-2 sm:border-b-4 border-b-blue-600">
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                            <div>
                                <p className="text-[10px] sm:text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 text-[11px]">Safety Score</p>
                                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">
                                    {score}<span className="text-base sm:text-lg md:text-xl text-slate-300 ml-1 font-normal">pts</span>
                                </h2>
                            </div>
                            <div className="bg-blue-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                                <TrendingUp className="text-blue-600" size={20} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs sm:text-sm font-bold text-slate-600">
                                다음 혜택까지 <span className="text-blue-600">{100 - score > 0 ? 100 - score : score >= 100 ? (110 - score > 0 ? 110 - score : 0) : 0}점</span> 남았습니다
                            </p>
                            <div className="w-full bg-slate-100 h-2 sm:h-2.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${(score / 120) * 100}%` }}></div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-slate-900 rounded-xl sm:rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 text-white shadow-xl sm:shadow-2xl overflow-hidden relative">
                        <DollarSign className="absolute -right-4 -bottom-4 text-white/5" size={80} />
                        <h3 className="text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 sm:mb-6">Economic Benefit</h3>
                        <div className="space-y-3 sm:space-y-4 relative z-10">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3 sm:pb-4">
                                <span className="text-slate-400 text-xs sm:text-sm italic font-medium">예상 절감액 (월)</span>
                                <span className="text-lg sm:text-xl font-bold font-mono">₩{(discountRate * 1250).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 bg-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                                <CheckCircle2 className="text-green-400 shrink-0" size={18} />
                                <p className="text-[10px] sm:text-[11px] leading-relaxed text-slate-300 font-medium font-mono">
                                    안전운전 유지 시 다음 달 갱신일에 <span className="text-white font-bold">{discountRate}% 할인</span>이 자동으로 적용됩니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-xl sm:rounded-2xl md:rounded-[2rem] p-4 sm:p-5 md:p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Events</h3>
                            <Bell size={12} className="text-slate-300" />
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                            <LogItem time="11:05" msg="안전운전 가점 반영 (+1점)" isPlus={true} />
                            <LogItem time="10:42" msg="졸음 의심 경고 (-15점)" isPlus={false} />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* 3. Driving Log Page (주행 로그 목록) */
/* -------------------------------------------------------------------------- */
const DrivingLogPage = ({ onSelectLog, history = [] }) => {
    // localStorage에서 가져온 히스토리와 기본 로그 합치기
    const defaultLogs = [
        { id: 1, date: "2024.05.20", score: 95, msg: "완벽한 주행이었습니다!", status: "perfect", time: "08:30 - 09:45 (75분)", distance: "24km" },
        { id: 2, date: "2024.05.19", score: 72, msg: "졸음운전 및 부주의 감지", status: "warning", time: "14:20 - 15:10 (50분)", distance: "12km" },
        { id: 3, date: "2024.05.18", score: 84, msg: "휴대폰 조작 감지", status: "normal", time: "18:00 - 19:30 (90분)", distance: "35km" },
    ];

    // 히스토리를 로그 형식으로 변환
    const historyLogs = history.map((item, idx) => ({
        id: `history-${idx}`,
        date: new Date(item.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.').replace(/\s/g, ''),
        score: item.score,
        msg: item.score >= 90 ? "완벽한 주행이었습니다!" : item.events > 0 ? "이상 행동 감지" : "정상 주행",
        status: item.score >= 90 ? "perfect" : item.score >= 70 ? "normal" : "warning",
        time: `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`,
        distance: `${Math.floor(item.duration * 0.5)}km` // 추정 거리
    }));

    const logs = [...historyLogs, ...defaultLogs].slice(0, 10);

    return (
        <div className="p-4 sm:p-6 animate-in fade-in duration-500">
            <header className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-black">주행 로그</h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium italic text-[11px] uppercase tracking-tighter">Recent Driving History</p>
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
/* 4. Log Detail Page: 로그 상세 리포트 화면 */
/* -------------------------------------------------------------------------- */
const LogDetailPage = ({ data, onBack }) => (
    <div className="p-4 sm:p-6 animate-in slide-in-from-right duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold mb-4 sm:mb-6 hover:text-slate-900 transition-colors">
            <ChevronLeft size={20} />
            <span className="text-sm sm:text-base">뒤로가기</span>
        </button>

        <header className="mb-6 sm:mb-8">
            <div className="flex justify-between items-start mb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {data.date} <span className="text-base sm:text-lg font-normal text-slate-400 italic">Report</span>
                </h1>
                <div className={`px-3 sm:px-4 py-1 rounded-full text-xs font-black ${data.status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {data.score} PTS
                </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><Clock size={12} /> {data.time}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {data.distance}</span>
            </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">운행 평가</p>
                <p className="text-base sm:text-lg font-black leading-tight text-slate-800">{data.msg}</p>
            </div>
            <div className="bg-slate-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl text-white flex flex-col justify-between">
                <p className="text-[10px] font-bold text-blue-400 mb-2 uppercase">예상 보험료 변동</p>
                <p className="text-lg sm:text-xl font-black">{data.score >= 90 ? "-₩1,200" : "+₩0"}</p>
            </div>
        </div>

        <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detection Details</h3>

            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4 sm:space-y-6">
                <DetailItem
                    icon={<Coffee className="text-orange-500" size={18} />}
                    title="졸음운전"
                    count={data.status === 'warning' ? "2회" : "0회"}
                    desc="눈 감음 지속 시간 2.5초 감지"
                />
                <DetailItem
                    icon={<Smartphone className="text-blue-500" size={18} />}
                    title="휴대폰 조작"
                    count={data.status === 'normal' ? "1회" : data.status === 'warning' ? "1회" : "0회"}
                    desc="우측 전방 주시 태만"
                />
                <DetailItem
                    icon={<Hand className="text-red-500" size={18} />}
                    title="위험 행동"
                    count="0회"
                    desc="감지된 폭행/위협 행동 없음"
                />
            </div>
        </section>

        <div className="mt-6 sm:mt-8 bg-blue-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-blue-100">
            <p className="text-blue-700 text-xs sm:text-sm font-bold mb-1">AI Analyst Comment</p>
            <p className="text-blue-600/80 text-[11px] sm:text-xs leading-relaxed">
                {data.score >= 90
                    ? "훌륭한 운전 습관을 유지하고 계시네요! 지금처럼만 운전하시면 다음 달 보험료 10% 할인이 확실시됩니다."
                    : "오후 시간대 주행 시 졸음 수치가 높게 나타났습니다. 장거리 운행 전 충분한 휴식을 권장합니다."}
            </p>
        </div>
    </div>
);

/* 헬퍼 컴포넌트 */
const DetailItem = ({ icon, title, count, desc }) => (
    <div className="flex items-start gap-3 sm:gap-4">
        <div className="bg-slate-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl shrink-0">{icon}</div>
        <div className="flex-grow border-b border-slate-50 pb-3 sm:pb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs sm:text-sm font-black text-slate-800">{title}</span>
                <span className="text-xs sm:text-sm font-black text-slate-400">{count}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">{desc}</p>
        </div>
    </div>
);

const LogEntry = ({ date, score, msg, status }) => (
    <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-[1.5rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-colors">
        <div className="flex gap-3 sm:gap-4 items-center">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xs sm:text-sm ${status === 'perfect' ? 'bg-green-100 text-green-600' :
                status === 'warning' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                }`}>
                {score}
            </div>
            <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 mb-0.5 font-mono italic">{date}</p>
                <p className="text-xs sm:text-sm font-bold text-slate-800">{msg}</p>
            </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 shrink-0" />
    </div>
);

const NavButton = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 min-w-[60px] ${active ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
        <div className={`flex items-center justify-center ${active ? 'bg-indigo-50 p-2 rounded-xl' : 'p-2'}`}>{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">{label}</span>
    </button>
);

const Milestone = ({ step, label, active, icon }) => (
    <div className="relative z-10 flex flex-col items-center shrink-0">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 sm:border-4 transition-all duration-500 ${active ? 'bg-blue-600 border-white text-white shadow-lg shadow-blue-200 scale-110' : 'bg-white border-slate-100 text-slate-300'}`}>
            {icon ? icon : <span className="text-[10px] sm:text-xs font-black">{step}</span>}
        </div>
        <p className={`text-[9px] sm:text-[10px] font-black mt-2 sm:mt-3 uppercase tracking-tighter text-center ${active ? 'text-blue-600' : 'text-slate-300'}`}>{label}</p>
    </div>
);

const LogItem = ({ time, msg, isPlus }) => (
    <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100/50">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 flex-1 pr-2">{msg}</span>
        <span className={`text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${isPlus ? 'text-blue-500' : 'text-red-500'}`}>{time}</span>
    </div>
);

export default Dashboard;
