import React from 'react';
import { Play, Square, Camera, CameraOff } from 'lucide-react';
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
    CurrentIcon
}) => {
    if (showCameraView) {
        return (
            <div className="bg-black text-white font-sans flex flex-col relative w-full h-[100dvh] sm:h-full">
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
                        className={`w-full h-full object-cover ${hasPermission ? 'scale-x-[-1]' : ''}`}
                        style={{ transform: hasPermission ? 'scaleX(-1)' : 'none' }}
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
    );
};

export default DrivePage;
