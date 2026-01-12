import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { STATE_CONFIG, APPLE_STATE_CONFIG } from './constants';
import Header from './Header';
import BottomNav from './BottomNav';
import DrivePage from './DrivePage';
import InsurancePage from './InsurancePage';
import DrivingLogPage from './DrivingLogPage';
import LogDetailPage from './LogDetailPage';

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
            // 모바일 호환성을 위해 제약 완화
            const constraints = {
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true");
                videoRef.current.setAttribute("webkit-playsinline", "true");

                // 모바일에서 video 요소가 확실히 보이도록 처리
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => {
                        console.warn("Video 1 play failed:", e);
                    });
                };

                // 모바일에서 비디오가 보이도록 명시적 재생
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log("Video 1 playing successfully");
                            // 모바일에서 video 요소 강제 표시
                            if (videoRef.current) {
                                videoRef.current.style.display = 'block';
                                videoRef.current.style.visibility = 'visible';
                            }
                        })
                        .catch(e => {
                            console.warn("Video 1 play failed:", e);
                        });
                }
            }
            if (videoRef2.current) {
                videoRef2.current.srcObject = stream;
                videoRef2.current.setAttribute("playsinline", "true");
                videoRef2.current.setAttribute("webkit-playsinline", "true");
                const playPromise2 = videoRef2.current.play();
                if (playPromise2 !== undefined) {
                    playPromise2
                        .then(() => {
                            console.log("Video 2 playing successfully");
                        })
                        .catch(e => {
                            console.warn("Video 2 play failed:", e);
                        });
                }
            }
            streamRef.current = stream;
            setHasPermission(true);
        } catch (err) {
            console.error("Camera Error:", err);
            setHasPermission(false);
            // 에러 상세 정보 로깅
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

    const handlePageChange = (page) => {
        setCurrentPage(page);
        setSelectedLog(null);
    };

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
            <BottomNav
                currentPage={currentPage}
                onPageChange={handlePageChange}
                selectedLog={selectedLog}
            />
        </div>
    );
};

export default Dashboard;
