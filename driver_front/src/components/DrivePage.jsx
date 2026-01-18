import { useEffect, useRef, useState } from 'react';
import { Play, Square, Camera, CameraOff, MapPin, Mic, MicOff, Volume2 } from 'lucide-react';
import { APPLE_STATE_CONFIG } from './constants';
import { getCurrentPosition } from '../utils/GpsService';
import { fetchUltraSrtNcst, latLonToGrid } from '../services/weatherService';
import { formatRegion, getRegionByLatLon } from '../utils/regionLookup';

const DrivePage = ({
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
    userRegion = null,
    currentSpeed = 0,
    gpsEvents = { hardAccel: 0, hardBrake: 0, overspeed: 0 },
    sensorStatus = { gps: false, motion: false },
    gpsAccuracy = null,
    gpsStatus = 'GPS 검색중...',
    speedLimit = null,
    roadName = null,
    speedLimitLoading = false,
    speedLimitDebug = null,
    modelConnectionStatus = 'idle',
    voiceEnabled = false,
    voiceStatus = 'idle',
    lastTranscript = '',
    interimTranscript = '',
    toggleVoice = () => { }
}) => {
    const videoContainerRef = useRef(null);
    const modalRef = useRef(null);
    const [modalHeight, setModalHeight] = useState(150);
    const [isDragging, setIsDragging] = useState(false);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherError, setWeatherError] = useState('');
    const [weatherInfo, setWeatherInfo] = useState(null);
    const [showWeather, setShowWeather] = useState(false);
    const weatherInFlightRef = useRef(false);
    const WEATHER_REFRESH_MS = 60000;
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);
    const isDraggingRef = useRef(false);

    // TTS 엔진 라벨 (Web Speech API 전용)
    const ttsEngineLabel = 'Web Speech';

    const parseNowcastSummary = (items) => {
        if (!Array.isArray(items) || items.length === 0) {
            return null;
        }

        const pickValue = (category) => {
            const match = items.find((item) => item.category === category);
            if (!match) return null;
            return match.obsrValue ?? match.fcstValue ?? null;
        };

        const pty = pickValue('PTY');
        const rn1 = pickValue('RN1');
        const tmp = pickValue('T1H');

        const ptyMap = {
            0: null,
            1: 'Rain',
            2: 'Rain/Snow',
            3: 'Snow',
            4: 'Shower'
        };

        const ptyValue = pty !== null ? Number(pty) : null;
        const weatherLabel = ptyValue && ptyMap[ptyValue] ? ptyMap[ptyValue] : 'Clear';
        const precipLabel = rn1 === '강수없음' ? '0' : (rn1 ?? '-');

        return {
            weather: weatherLabel,
            precipitation: precipLabel,
            temperature: tmp,
            timeKey: items[0]?.baseDate && items[0]?.baseTime ? `${items[0].baseDate}${items[0].baseTime}` : null
        };
    };

    const handleWeatherFetch = async () => {
        if (weatherInFlightRef.current) return;
        weatherInFlightRef.current = true;
        setWeatherLoading(true);
        setWeatherError('');
        setWeatherInfo(null);

        try {
            const position = await getCurrentPosition();
            const grid = latLonToGrid(position.latitude, position.longitude);
            const region = getRegionByLatLon(position.latitude, position.longitude);
            const data = await fetchUltraSrtNcst({ nx: grid.nx, ny: grid.ny });

            const items = data?.response?.body?.items?.item ?? [];
            const summary = parseNowcastSummary(items);

            setWeatherInfo({
                location: position,
                grid,
                summary,
                region
            });
        } catch (error) {
            setWeatherError(error?.message || 'Failed to load weather');
        } finally {
            setWeatherLoading(false);
            weatherInFlightRef.current = false;
        }
    };

    const handleWeatherToggle = async () => {
        if (showWeather) {
            setShowWeather(false);
            return;
        }

        setShowWeather(true);
        await handleWeatherFetch();
    };

    useEffect(() => {
        let isActive = true;
        let timerId = null;

        const refreshWeather = async () => {
            if (!isActive || !showWeather) return;
            await handleWeatherFetch();
        };

        if (showWeather) {
            refreshWeather();
            timerId = setInterval(refreshWeather, WEATHER_REFRESH_MS);
        }

        return () => {
            isActive = false;
            if (timerId) clearInterval(timerId);
        };
    }, [showWeather]);

    // 모달 드래그 핸들러
    const handleTouchStart = (e) => {
        setIsDragging(true);
        isDraggingRef.current = true;
        dragStartY.current = e.touches[0].clientY;
        dragStartHeight.current = modalHeight;
        e.stopPropagation();
        e.preventDefault();
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        isDraggingRef.current = true;
        dragStartY.current = e.clientY;
        dragStartHeight.current = modalHeight;
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
                const newHeight = Math.max(140, Math.min(500, dragStartHeight.current + deltaY));
                setModalHeight(newHeight);
                e.preventDefault();
                e.stopPropagation();
            };

            const mouseMoveHandler = (e) => {
                if (!isDraggingRef.current) return;
                const deltaY = dragStartY.current - e.clientY;
                const newHeight = Math.max(140, Math.min(500, dragStartHeight.current + deltaY));
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

    // PR #16 - video 요소는 Dashboard.jsx로 이동됨
    return (
        <>
            {showCameraView ? (
                /* ========== 카메라 뷰 (showCameraView === true) ========== */
                <div className="text-white font-sans flex flex-col w-full" style={{
                    height: '100dvh',
                    minHeight: '100%',
                    maxHeight: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div
                        ref={videoContainerRef}
                        className="overflow-hidden flex-1"
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: 0,
                            flex: '1 1 0%',
                            position: 'relative',
                            maxHeight: '100%',
                            backgroundColor: 'transparent',
                            zIndex: 2
                        }}
                    >
                        {!hasPermission && (
                            <div className="absolute inset-0 flex items-center justify-center z-50">
                                <p className="text-gray-500">Camera Loading...</p>
                            </div>
                        )}

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
                                            <div className="bg-black/40 backdrop-blur-xl pl-5 pr-4 py-2 rounded-2xl border border-white/10 shadow-lg flex items-center gap-3">
                                                <div className="flex flex-col items-end leading-tight">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-bold text-white font-mono tracking-tight">
                                                            {Math.round(currentSpeed || 0)}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-white/50">km/h</span>
                                                    </div>
                                                </div>
                                                <div className="w-[1px] h-6 bg-white/10"></div>
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

                                            {(roadName || speedLimitLoading) && (
                                                <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5">
                                                    <span className="text-[10px] font-medium text-white/80 truncate max-w-[120px]">
                                                        {speedLimitLoading ? "도로 정보 스캔중..." : roadName}
                                                    </span>
                                                </div>
                                            )}

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
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-72 transition-all duration-300">
                                    <div className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                    <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                    <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                    <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-lg transition-colors duration-300 ${currentState === 0 ? 'border-white/40' : 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                    {currentState === 0 && (
                                        <div className="w-full h-[1px] bg-green-400/40 shadow-[0_0_8px_#4ade80] animate-[scan_2.5s_ease-in-out_infinite]"></div>
                                    )}
                                </div>
                            )}

                            {/* 3. Floating Status Pill */}
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
                        {/* 4. DRIVING HUD OVERLAY (When Active) */}
                        {isActive && (
                            <div className="absolute inset-x-0 top-24 bottom-10 z-30 pointer-events-none flex flex-col justify-between p-6">
                                {/* Top Area: Stats - Left Aligned Vertical */}
                                <div className="pointer-events-auto mt-0 self-start">
                                    <div className="bg-neutral-900/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3 min-w-[100px]">
                                        {/* Time Section */}
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse"></div>
                                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Time</span>
                                            </div>
                                            <span className="text-lg font-mono font-bold text-white tracking-wider tabular-nums">
                                                {formatTime(sessionTime)}
                                            </span>
                                        </div>

                                        {/* Divider */}
                                        <div className="w-full h-px bg-white/10"></div>

                                        {/* Events Section */}
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Events</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-lg font-mono font-bold leading-none tabular-nums transition-colors duration-300 ${eventCount > 0 ? 'text-rose-500' : 'text-white'}`}>
                                                    {eventCount}
                                                </span>
                                                <span className="text-[9px] font-medium text-neutral-600">ea</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Middle: Transcript */}
                                <div className="flex-1 flex flex-col justify-end items-center pb-8 pointer-events-auto">
                                    {voiceEnabled && (lastTranscript || interimTranscript) && (
                                        <div className="mb-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl max-w-[90%] text-center border border-white/10 animate-[fadeInUp_0.3s_ease-out]">
                                            <p className="text-white/90 font-medium text-lg leading-relaxed">
                                                "{interimTranscript || lastTranscript}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom: Controls */}
                                <div className="flex items-end justify-between pointer-events-auto bg-transparent w-full">
                                    {/* Left: Voice Control */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleVoice(); }}
                                        className={`relative w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all active:scale-95 shadow-lg ${voiceEnabled
                                            ? voiceStatus === 'speaking'
                                                ? 'bg-purple-500/20 border-purple-400 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                                : 'bg-blue-500/20 border-blue-400 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                            : 'bg-black/40 border-white/10 text-white/40 hover:bg-black/50 hover:text-white/60'
                                            }`}
                                    >
                                        {voiceEnabled ? (
                                            voiceStatus === 'speaking' ?
                                                <Volume2 size={24} className="animate-pulse" /> :
                                                <Mic size={24} className={voiceStatus === 'listening' ? 'animate-pulse' : ''} />
                                        ) : (
                                            <MicOff size={24} />
                                        )}
                                    </button>

                                    {/* Center: Main STOP Button */}
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
                                        <button
                                            onClick={toggleSession}
                                            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] border-[4px] border-red-500/50 transition-all active:scale-95 hover:scale-105 group"
                                        >
                                            <Square fill="currentColor" size={32} className="text-white group-hover:scale-90 transition-transform" />
                                        </button>
                                    </div>

                                    {/* Right: AI Status */}
                                    <div className={`h-10 px-4 rounded-full flex items-center gap-2 backdrop-blur-xl border shadow-lg transition-colors duration-500 ${modelConnectionStatus === 'connected' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                                        modelConnectionStatus === 'connecting' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                                            'bg-red-500/20 border-red-500/30 text-red-400'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${modelConnectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                                            modelConnectionStatus === 'connecting' ? 'bg-yellow-400 animate-ping' :
                                                'bg-red-400'
                                            }`}></div>
                                        <span className="text-[10px] font-bold uppercase tracking-wide">
                                            {modelConnectionStatus === 'connected' ? 'AI ON' : 'AI OFF'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Bottom Modal Sheet - Only visible when NOT driving */}
                    {!isActive && (
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

                            <div className="px-6 pb-8 flex-1 flex flex-col justify-end">
                                {/* Only Show Start/Back Controls since HUD handles the rest */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCameraView(false)}
                                        className="flex-1 h-14 rounded-2xl bg-gray-100 text-gray-900 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-gray-200"
                                    >
                                        <CameraOff size={18} /> Back
                                    </button>
                                    <button
                                        onClick={toggleSession}
                                        className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg shadow-lg active:scale-95 transition-all bg-black text-white shadow-black/20"
                                    >
                                        <Play fill="currentColor" size={18} /> Start Driving
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <style>{`
                        @keyframes scan {
                            0%, 100% { transform: translateY(0); opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { transform: translateY(280px); opacity: 0; }
                        }
                    `}</style>
                </div>
            ) : (
                /* ========== 메인 뷰 (showCameraView === false) ========== */
                <div className="min-h-full relative bg-white">
                    <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 mt-10">
                        <div className="relative w-48 h-48 flex items-center justify-center mb-10 transition-transform duration-500 will-change-transform">
                            <svg className="absolute w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="90" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                                <circle cx="96" cy="96" r="90" stroke={score > 80 ? "#10b981" : score > 50 ? "#f59e0b" : "#ef4444"} strokeWidth="10" fill="none" strokeDasharray={2 * Math.PI * 90} strokeDashoffset={2 * Math.PI * 90 * (1 - score / 100)} strokeLinecap="round" className="transition-all duration-500 ease-out" />
                            </svg>
                            <div className="flex flex-col items-center z-10">
                                <span className="text-5xl font-bold tracking-tighter text-black">
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

                        {isActive && (sensorStatus.gps || sensorStatus.motion) && (
                            <div className="mt-6 w-full max-w-xs bg-green-500/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border-2 border-green-400/50">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                    <p className="text-xs font-bold text-white uppercase tracking-tight">센서 정상 작동 중</p>
                                </div>
                            </div>
                        )}

                        {isActive && (
                            <div className={`mt-6 w-full max-w-xs ${hasPermission ? 'bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg' : 'bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg'}`}>
                                <p className="text-xs font-semibold uppercase text-gray-400 mb-3 text-center">주행 정보</p>
                                <div className="mb-3 pb-3 border-b border-gray-200">
                                    <p className="text-[10px] font-semibold text-gray-400 mb-1">도로 정보</p>
                                    {speedLimitLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-sm font-bold text-blue-500 animate-pulse">조회 중...</p>
                                        </div>
                                    ) : speedLimit ? (
                                        <>
                                            <p className="text-sm font-bold text-blue-600">제한 속도: {speedLimit}km/h</p>
                                            {roadName && <p className="text-[10px] text-gray-500 mt-1">{roadName}</p>}
                                        </>
                                    ) : (
                                        <p className="text-sm font-medium text-gray-400">도로 정보 없음</p>
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

                        <div className="mt-6 w-full max-w-xs bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100">
                            <p className="text-xs font-semibold uppercase text-gray-400 mb-3 text-center">Location Weather</p>
                            <button
                                type="button"
                                onClick={handleWeatherToggle}
                                disabled={weatherLoading}
                                className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${weatherLoading ? 'bg-gray-200 text-gray-500' : 'bg-black text-white hover:bg-gray-800'
                                    }`}
                            >
                                {weatherLoading ? 'Loading...' : showWeather ? 'Hide Weather' : 'Get Current Weather'}
                            </button>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                Auto refresh every 1 min
                            </p>

                            {showWeather && weatherError && (
                                <p className="text-xs text-red-500 mt-2 text-center">{weatherError}</p>
                            )}

                            {showWeather && weatherInfo && (
                                <div className="mt-3 text-xs text-gray-600 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-400">Region</span>
                                        <span className="text-gray-700">{formatRegion(weatherInfo.region) || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-400">Weather</span>
                                        <span className="text-gray-700">{weatherInfo.summary?.weather ?? 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-400">Precip</span>
                                        <span className="text-gray-700">
                                            {weatherInfo.summary?.precipitation ? `${weatherInfo.summary.precipitation} mm` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-400">Temp</span>
                                        <span className="text-gray-700">
                                            {weatherInfo.summary?.temperature ? `${weatherInfo.summary.temperature}°C` : '-'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
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
            )}
        </>
    );
};

export default DrivePage;
