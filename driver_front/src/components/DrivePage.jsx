import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Camera, CameraOff, MapPin } from 'lucide-react';
import { STATE_CONFIG, APPLE_STATE_CONFIG } from './constants';

const DrivePage = ({
    showCameraView,
    setShowCameraView,
    hasPermission,
    videoRef,
    videoRef2,
    isActive,
    score,
    sessionTime,
    currentState,
    eventCount,
    toggleSession,
    formatTime,
    currentConfig,
    CurrentIcon,
    userRegion = null,
    currentSpeed = 0,
    gpsAcceleration = 0,
    gpsEvents = { hardAccel: 0, hardBrake: 0, overspeed: 0 },
    sensorStatus = { gps: false, motion: false },
    gpsAccuracy = null,
    gpsStatus = 'GPS 검색중...',
    speedLimit = null,
    roadName = null,
    speedLimitLoading = false,
    speedLimitDebug = null
}) => {
    const videoContainerRef = useRef(null);
    const modalRef = useRef(null);
    const [modalHeight, setModalHeight] = useState(360); // 기본 높이
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

    // 모달 드래그 핸들러
    const handleTouchStart = (e) => {
        setIsDragging(true);
        isDraggingRef.current = true;
        dragStartY.current = e.touches[0].clientY;
        dragStartHeight.current = modalHeight;
        e.stopPropagation();
        e.preventDefault();
    };

    const isDraggingRef = useRef(false);

    const handleTouchMove = (e) => {
        if (!isDraggingRef.current) return;

        const currentY = e.touches[0].clientY;
        const deltaY = dragStartY.current - currentY; // 위로 드래그하면 양수
        const newHeight = Math.max(200, Math.min(500, dragStartHeight.current + deltaY));
        setModalHeight(newHeight);
        e.preventDefault();
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        isDraggingRef.current = false;
    };

    // 마우스 드래그 지원 (데스크탑)
    const handleMouseDown = (e) => {
        setIsDragging(true);
        isDraggingRef.current = true;
        dragStartY.current = e.clientY;
        dragStartHeight.current = modalHeight;
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        const deltaY = dragStartY.current - e.clientY;
        const newHeight = Math.max(200, Math.min(500, dragStartHeight.current + deltaY));
        setModalHeight(newHeight);
        e.preventDefault();
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        isDraggingRef.current = false;
    };

    useEffect(() => {
        if (isDragging) {
            const touchMoveHandler = (e) => {
                if (!isDraggingRef.current) return;
                const currentY = e.touches[0].clientY;
                const deltaY = dragStartY.current - currentY;
                const newHeight = Math.max(200, Math.min(500, dragStartHeight.current + deltaY));
                setModalHeight(newHeight);
                e.preventDefault();
                e.stopPropagation();
            };

            const mouseMoveHandler = (e) => {
                if (!isDraggingRef.current) return;
                const deltaY = dragStartY.current - e.clientY;
                const newHeight = Math.max(200, Math.min(500, dragStartHeight.current + deltaY));
                setModalHeight(newHeight);
                e.preventDefault();
            };

            const touchEndHandler = () => {
                setIsDragging(false);
                isDraggingRef.current = false;
            };

            document.addEventListener('touchmove', touchMoveHandler, { passive: false });
            document.addEventListener('touchend', touchEndHandler, { passive: false });
            document.addEventListener('touchcancel', touchEndHandler, { passive: false });
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
                document.removeEventListener('touchcancel', touchEndHandler);
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, modalHeight]);

    // 모바일에서 video 높이 동적 설정
    useEffect(() => {
        if (showCameraView && videoRef.current && videoContainerRef.current) {
            const updateVideoHeight = () => {
                const container = videoContainerRef.current;
                const video = videoRef.current;
                if (container && video) {
                    const containerHeight = container.offsetHeight || container.clientHeight;
                    if (containerHeight > 0) {
                        video.style.height = `${containerHeight}px`;
                        video.style.width = '100%';
                    }
                }
            };

            // 초기 설정
            updateVideoHeight();

            // 리사이즈 이벤트
            const resizeObserver = new ResizeObserver(updateVideoHeight);
            if (videoContainerRef.current) {
                resizeObserver.observe(videoContainerRef.current);
            }

            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [showCameraView, hasPermission, videoRef]);

    if (showCameraView) {
        return (
            <div className="bg-black text-white font-sans flex flex-col relative w-full" style={{
                height: '100dvh',
                minHeight: '100%',
                maxHeight: '100%',
                overflow: 'hidden'
            }}>
                <div
                    ref={videoContainerRef}
                    className="relative bg-black overflow-hidden flex-1"
                    style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 0,
                        flex: '1 1 0%',
                        position: 'relative',
                        maxHeight: '100%'
                    }}
                >
                    {!hasPermission && (
                        <div className="absolute inset-0 flex items-center justify-center z-50">
                            <p className="text-gray-500">Camera Loading...</p>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        webkit-playsinline="true"
                        x5-playsinline="true"
                        x5-video-player-type="h5"
                        x5-video-player-fullscreen="true"
                        style={{
                            transform: 'scaleX(-1)',
                            WebkitTransform: 'scaleX(-1)',
                            width: '100%',
                            height: '100%',
                            minWidth: '100%',
                            minHeight: '100%',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'cover',
                            backgroundColor: '#000',
                            zIndex: 0,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'block',
                            visibility: 'visible',
                            margin: 0,
                            padding: 0
                        }}
                        onLoadedMetadata={(e) => {
                            const video = e.target;
                            // 모바일에서 높이 강제 설정
                            const container = video.parentElement;
                            if (container) {
                                const updateVideoSize = () => {
                                    const containerHeight = container.offsetHeight || container.clientHeight || window.innerHeight;
                                    const containerWidth = container.offsetWidth || container.clientWidth || window.innerWidth;
                                    video.style.height = `${containerHeight}px`;
                                    video.style.width = `${containerWidth}px`;
                                    video.style.minHeight = `${containerHeight}px`;
                                    video.style.minWidth = `${containerWidth}px`;
                                };
                                updateVideoSize();
                                // 리사이즈 이벤트 리스너 추가
                                window.addEventListener('resize', updateVideoSize);
                            }
                            video.play().catch(err => console.warn("Auto-play failed:", err));
                        }}
                    />

                    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 pb-28">
                        {/* 1. Top Header Area */}
                        <div className="flex justify-between items-start">
                            {/* Left: Location Badge */}
                            <div className="flex flex-col gap-2">
                                {userRegion && (
                                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-sm">
                                        <MapPin size={12} className={userRegion.accent || "text-emerald-400"} />
                                        <span className="text-[11px] font-bold text-white/90 uppercase tracking-tight">
                                            {userRegion.name} Resident
                                        </span>
                                    </div>
                                )}
                                {/* GPS Accuracy (Tiny) */}
                                {gpsAccuracy !== null && (
                                    <div className="px-2">
                                        <span className={`text-[9px] font-medium ${gpsAccuracy < 20 ? 'text-green-400' : 'text-orange-400'}`}>
                                            GPS Signal: {Math.round(gpsAccuracy)}m
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Right: Score & Driving Stats */}
                            <div className="flex flex-col items-end gap-2">
                                {/* Score Big Display */}
                                <div className="flex flex-col items-end leading-none">
                                    <span className="text-5xl font-black tracking-tighter drop-shadow-xl text-white">
                                        {Math.floor(score)}
                                    </span>
                                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest mr-1">
                                        Safety Score
                                    </span>
                                </div>

                                {isActive && (
                                    <div className="flex flex-col items-end gap-2 mt-2">
                                        {/* Speedometer Pill */}
                                        <div className="bg-black/40 backdrop-blur-xl pl-5 pr-4 py-2 rounded-2xl border border-white/10 shadow-lg flex items-center gap-3">
                                            <div className="flex flex-col items-end leading-tight">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-bold text-white font-mono tracking-tight">
                                                        {Math.round(currentSpeed || 0)}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-white/50">km/h</span>
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="w-[1px] h-6 bg-white/10"></div>

                                            {/* Speed Limit */}
                                            <div className="flex flex-col items-start leading-tight">
                                                <span className="text-[9px] font-bold text-white/40 uppercase">Limit</span>
                                                <div className="flex items-baseline gap-0.5">
                                                    {speedLimitLoading ? (
                                                        <span className="text-sm font-bold text-white/30 animate-pulse">--</span>
                                                    ) : (
                                                        <span className={`text-lg font-bold font-mono ${currentSpeed > speedLimit ? 'text-red-400' : 'text-white/80'}`}>
                                                            {speedLimit || 60}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Road Name Badge */}
                                        {(roadName || speedLimitLoading) && (
                                            <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5">
                                                <span className="text-[10px] font-medium text-white/80 truncate max-w-[120px]">
                                                    {speedLimitLoading ? "도로 정보 스캔중..." : roadName}
                                                </span>
                                            </div>
                                        )}

                                        {/* Alerts (Hard Accel/Brake) */}
                                        {(gpsEvents.hardAccel > 0 || gpsEvents.hardBrake > 0) && (
                                            <div className="mt-1 flex flex-col gap-1 items-end">
                                                {gpsEvents.hardAccel > 0 && (
                                                    <div className="bg-red-500/90 backdrop-blur-md px-3 py-1 rounded-md border border-red-400/30 shadow-lg animate-pulse">
                                                        <span className="text-[10px] font-bold text-white">⚠️ 급가속 감지</span>
                                                    </div>
                                                )}
                                                {gpsEvents.hardBrake > 0 && (
                                                    <div className="bg-orange-500/90 backdrop-blur-md px-3 py-1 rounded-md border border-orange-400/30 shadow-lg animate-pulse">
                                                        <span className="text-[10px] font-bold text-white">⚠️ 급감속 감지</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* 2. Center Overlay: Face Bounding Box & Status */}
                        {isActive && (
                            <>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-72 transition-all duration-300">
                                    {/* Corner Brackets */}
                                    <div className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                    <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                    <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                    <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>

                                    {/* Scanning Laser Effect (Only on Normal) */}
                                    {currentState === 0 && (
                                        <div className="w-full h-[1px] bg-green-400/40 shadow-[0_0_8px_#4ade80] animate-[scan_2.5s_ease-in-out_infinite]"></div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* 3. Floating Status Pill (Center Bottom) */}
                        <div className="self-center mb-2">
                            <div className={`
                                flex items-center gap-2.5 px-5 py-2.5 rounded-full backdrop-blur-xl border shadow-xl transition-all duration-300
                                ${currentConfig[currentState].bg}
                                ${currentConfig[currentState].border}
                            `}>
                                <CurrentIcon size={18} className={currentConfig[currentState].color} />
                                <span className={`text-sm font-bold ${currentConfig[currentState].color} tracking-tight`}>
                                    {currentConfig[currentState].label}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Bottom Modal Sheet (Interactive) --- */}
                <div
                    ref={modalRef}
                    className="bg-white rounded-t-[32px] z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] relative flex-shrink-0 flex flex-col"
                    style={{
                        marginTop: '-24px',
                        height: `${modalHeight}px`,
                        minHeight: `${modalHeight}px`,
                        maxHeight: `${modalHeight}px`,
                        transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        touchAction: 'pan-y'
                    }}
                >
                    {/* Drag Handle */}
                    <div
                        className="w-full flex items-center justify-center pt-3 pb-6 cursor-grab active:cursor-grabbing touch-none"
                        onTouchStart={handleTouchStart}
                        onMouseDown={handleMouseDown}
                        onTouchMove={(e) => {
                            if (isDraggingRef.current) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }}
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            touchAction: 'none',
                            WebkitTouchCallout: 'none'
                        }}
                    >
                        <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                    </div>

                    {/* Modal Content */}
                    <div className="px-6 pb-8 flex-1 flex flex-col justify-between">

                        {/* Top Row: Session Time & Total Events */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Session Time</p>
                                <p className="text-2xl font-bold text-gray-900 font-mono tracking-tight">
                                    {isActive ? formatTime(sessionTime) : "00:00"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Events</p>
                                <p className={`text-2xl font-bold font-mono tracking-tight ${eventCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {isActive ? eventCount : "-"}
                                </p>
                            </div>
                        </div>

                        {/* Grid Stats: Accel / Brake Counts */}
                        {isActive && (
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">급가속</span>
                                    <span className={`text-xl font-bold mt-1 ${gpsEvents.hardAccel > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                        {gpsEvents.hardAccel} <span className="text-xs font-medium text-slate-400">회</span>
                                    </span>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">급감속</span>
                                    <span className={`text-xl font-bold mt-1 ${gpsEvents.hardBrake > 0 ? 'text-orange-500' : 'text-slate-800'}`}>
                                        {gpsEvents.hardBrake} <span className="text-xs font-medium text-slate-400">회</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Button */}
                        <div className="mt-auto flex gap-3">
                            {(isActive || (!isActive && sessionTime > 0)) && (
                                <button
                                    onClick={() => setShowCameraView(false)}
                                    className="flex-1 h-14 rounded-2xl bg-gray-100 text-gray-900 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-gray-200"
                                >
                                    <CameraOff size={18} /> Back
                                </button>
                            )}
                            <button
                                onClick={toggleSession}
                                className={`${isActive || (!isActive && sessionTime > 0) ? 'flex-1' : 'w-full'} h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg active:scale-95 transition-all
                                    ${isActive
                                        ? 'bg-black text-white shadow-black/20'
                                        : 'bg-black text-white shadow-black/20'
                                    }`}
                            >
                                {isActive ? (
                                    <> <Square fill="currentColor" size={18} /> End Driving </>
                                ) : (
                                    <> <Play fill="currentColor" size={18} /> Start Driving </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                {/* CSS Animations */}
                <style>{`
                    @keyframes scan {
                        0%, 100% { transform: translateY(0); opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { transform: translateY(280px); opacity: 0; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-full relative">
            {hasPermission && (
                <div className="absolute inset-0 z-0 h-[50vh]">
                    <video
                        ref={videoRef2}
                        autoPlay
                        playsInline
                        muted
                        webkit-playsinline="true"
                        className="w-full h-full object-cover"
                        style={{
                            transform: 'scaleX(-1)',
                            WebkitTransform: 'scaleX(-1)',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-white"></div>
                </div>
            )}

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

                {/* 센서 작동 상태 뱃지 (메인 뷰) */}
                {isActive && (sensorStatus.gps || sensorStatus.motion) && (
                    <div className="mt-6 w-full max-w-xs bg-green-500/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border-2 border-green-400/50">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <p className="text-xs font-bold text-white uppercase tracking-tight">센서 정상 작동 중</p>
                        </div>
                    </div>
                )}

                {/* GPS 정보 표시 */}
                {isActive && (
                    <div className={`mt-6 w-full max-w-xs ${hasPermission ? 'bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg' : 'bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg'}`}>
                        <p className="text-xs font-semibold uppercase text-gray-400 mb-3 text-center">주행 정보</p>
                        {/* 제한 속도 및 도로명 표시 */}
                        <div className="mb-3 pb-3 border-b border-gray-200">
                            <p className="text-[10px] font-semibold text-gray-400 mb-1">도로 정보</p>
                            {speedLimitLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm font-bold text-blue-500 animate-pulse">
                                        조회 중...
                                    </p>
                                </div>
                            ) : speedLimit ? (
                                <>
                                    <p className="text-sm font-bold text-blue-600">
                                        제한 속도: {speedLimit}km/h
                                    </p>
                                    {roadName && (
                                        <p className="text-[10px] text-gray-500 mt-1">{roadName}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm font-medium text-gray-400">
                                    도로 정보 없음
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs font-semibold uppercase text-gray-400">속도</p>
                                <p className="text-xl font-bold mt-1 text-gray-900">
                                    {Math.round(currentSpeed)}<span className="text-xs text-gray-500">km/h</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-gray-400">급가속</p>
                                <p className={`text-xl font-bold mt-1 ${gpsEvents.hardAccel > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {gpsEvents.hardAccel}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-gray-400">급감속</p>
                                <p className={`text-xl font-bold mt-1 ${gpsEvents.hardBrake > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
                                    {gpsEvents.hardBrake}
                                </p>
                            </div>
                        </div>
                        {/* GPS 상태 정보 */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-semibold text-gray-400">GPS 상태</p>
                                <p className={`text-[10px] font-bold ${gpsAccuracy && gpsAccuracy < 50 ? 'text-green-600' : gpsAccuracy && gpsAccuracy < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {gpsStatus}
                                </p>
                            </div>
                            {gpsAccuracy !== null && (
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-semibold text-gray-400">정확도</p>
                                    <p className={`text-[10px] font-bold ${gpsAccuracy < 50 ? 'text-green-600' : gpsAccuracy < 100 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {Math.round(gpsAccuracy)}m
                                    </p>
                                </div>
                            )}
                        </div>
                        {gpsEvents.overspeed > 0 && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                                <p className="text-xs font-semibold text-red-500 text-center">
                                    ⚠️ 과속 감지: {gpsEvents.overspeed}회
                                </p>
                            </div>
                        )}
                    </div>
                )}

            </main>

            <div className="p-6 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-10 relative mt-4">
                <button
                    onClick={() => setShowCameraView(true)}
                    className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-lg font-bold shadow-lg transition-all active:scale-95 bg-black text-white hover:bg-gray-800 shadow-black/20"
                >
                    <Camera size={20} /> Start Driving
                </button>
            </div>
        </div>
    );
};

export default DrivePage;
