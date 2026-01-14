import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Camera, CameraOff, MapPin, Bug, X } from 'lucide-react';
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
    const [showDebugPanel, setShowDebugPanel] = useState(false);

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
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-2">
                                {userRegion && (
                                    <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                        <span className="text-xs font-bold text-white/90 uppercase tracking-tight flex items-center gap-2">
                                            <MapPin size={12} />
                                            {userRegion.name} Resident
                                        </span>
                                    </div>
                                )}
                                <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                    <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        Live Cam.
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-5xl font-bold tracking-tighter drop-shadow-md text-white">
                                        {Math.floor(score)}
                                    </span>
                                    <span className="text-xs font-medium text-white/60">Score</span>
                                </div>
                                {isActive && (
                                    <div className="flex flex-col items-end gap-2">
                                        {/* 현재 속도 / 제한 속도 비교 */}
                                        <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-white">
                                                    {Math.round(currentSpeed || 0)}
                                                </span>
                                                <span className="text-xs font-medium text-white/70">km/h</span>
                                                {speedLimit && !speedLimitLoading && (
                                                    <>
                                                        <span className="text-xs font-medium text-white/50">/</span>
                                                        <span className={`text-lg font-bold ${currentSpeed > speedLimit ? 'text-red-400' : 'text-blue-400'}`}>
                                                            {speedLimit}
                                                        </span>
                                                        <span className="text-xs font-medium text-white/50">km/h</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {/* 도로 정보 카드 */}
                                        {(speedLimitLoading || roadName) && (
                                            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                                                <div className="flex flex-col items-end">
                                                    {speedLimitLoading ? (
                                                        <span className="text-[10px] text-white/70 font-medium animate-pulse">
                                                            도로 정보 조회 중...
                                                        </span>
                                                    ) : roadName ? (
                                                        <>
                                                            <span className="text-[9px] font-semibold text-white/60 uppercase tracking-wide mb-1">
                                                                도로
                                                            </span>
                                                            <span className="text-sm font-bold text-white">
                                                                {roadName}
                                                            </span>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )}
                                        {/* GPS 정확도 (작은 텍스트) */}
                                        {gpsAccuracy !== null && (
                                            <span className="text-[9px] text-white/50 font-medium">
                                                GPS: {Math.round(gpsAccuracy)}m
                                            </span>
                                        )}
                                        {/* 급가속/급감속 알림 */}
                                        {gpsAcceleration > 2 && (
                                            <div className="bg-red-500/90 backdrop-blur-md px-3 py-2 rounded-lg border-2 border-red-400/50 shadow-lg animate-pulse">
                                                <span className="text-xs font-bold text-white">⚠️ 급가속!</span>
                                            </div>
                                        )}
                                        {gpsAcceleration < -3 && (
                                            <div className="bg-orange-500/90 backdrop-blur-md px-3 py-2 rounded-lg border-2 border-orange-400/50 shadow-lg animate-pulse">
                                                <span className="text-xs font-bold text-white">⚠️ 급감속!</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 하단 중앙: 제한 속도 및 도로 정보 (큰 카드) */}
                        {isActive && (
                            <div className="self-center mb-20">
                                <div className="bg-black/50 backdrop-blur-xl px-6 py-4 rounded-2xl border-2 border-white/20 shadow-2xl">
                                    <div className="flex flex-col items-center gap-2">
                                        {speedLimitLoading ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-sm font-semibold text-white/80 animate-pulse">
                                                        도로 정보 조회 중...
                                                    </span>
                                                </div>
                                            </>
                                        ) : speedLimit || roadName ? (
                                            <>
                                                {speedLimit && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                                            제한 속도
                                                        </span>
                                                        <span className="text-3xl font-bold text-blue-400">
                                                            {speedLimit}
                                                            <span className="text-lg font-medium text-white/70 ml-1">km/h</span>
                                                        </span>
                                                    </div>
                                                )}
                                                {roadName && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={14} className="text-white/60" />
                                                        <span className="text-sm font-bold text-white">
                                                            {roadName}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* 디버깅 정보 (모바일용) */}
                                                {speedLimitDebug && (
                                                    <div className="mt-2 pt-2 border-t border-white/10 w-full max-w-xs">
                                                        <div className="flex flex-col items-center gap-1 text-[8px] text-white/50">
                                                            <span>업데이트: {speedLimitDebug.timestamp}</span>
                                                            <span>속도: {speedLimitDebug.speedLimit ?? 'null'} | 도로: {speedLimitDebug.roadName ?? 'null'}</span>
                                                            {speedLimitDebug.error && (
                                                                <span className="text-red-300">
                                                                    오류: {speedLimitDebug.error}
                                                                    {speedLimitDebug.errorCode && ` (코드: ${speedLimitDebug.errorCode})`}
                                                                </span>
                                                            )}
                                                            {speedLimitDebug.matchedPointKeys && (
                                                                <span className="text-white/40">필드: {speedLimitDebug.matchedPointKeys.join(', ')}</span>
                                                            )}
                                                            {speedLimitDebug.matchedPointRaw && (
                                                                <details className="text-left w-full">
                                                                    <summary className="cursor-pointer text-white/60">matchedPoint 원본</summary>
                                                                    <pre className="text-[7px] text-white/40 mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                                                                        {speedLimitDebug.matchedPointRaw}
                                                                    </pre>
                                                                </details>
                                                            )}
                                                            {speedLimitDebug.rawResponse && (
                                                                <details className="text-left w-full">
                                                                    <summary className="cursor-pointer text-white/60">API 응답 전체</summary>
                                                                    <pre className="text-[7px] text-white/40 mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                                                                        {speedLimitDebug.rawResponse}
                                                                    </pre>
                                                                </details>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-sm font-medium text-white/50">
                                                    도로 정보 없음
                                                </span>
                                                {/* 디버깅 정보 (모바일용) */}
                                                {speedLimitDebug && (
                                                    <div className="mt-1 pt-2 border-t border-white/10 w-full max-w-xs">
                                                        <div className="flex flex-col items-center gap-1 text-[8px] text-white/50">
                                                            <span>{speedLimitDebug.timestamp}</span>
                                                            <span>속도: {speedLimitDebug.speedLimit ?? 'null'} | 도로: {speedLimitDebug.roadName ?? 'null'}</span>
                                                            {speedLimitDebug.error && (
                                                                <span className="text-red-300">
                                                                    오류: {speedLimitDebug.error}
                                                                    {speedLimitDebug.errorCode && ` (코드: ${speedLimitDebug.errorCode})`}
                                                                </span>
                                                            )}
                                                            {speedLimitDebug.matchedPointKeys && (
                                                                <span className="text-white/40">필드: {speedLimitDebug.matchedPointKeys.join(', ')}</span>
                                                            )}
                                                            {speedLimitDebug.matchedPointRaw && (
                                                                <details className="text-left w-full">
                                                                    <summary className="cursor-pointer text-white/60">matchedPoint 원본</summary>
                                                                    <pre className="text-[7px] text-white/40 mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                                                                        {speedLimitDebug.matchedPointRaw}
                                                                    </pre>
                                                                </details>
                                                            )}
                                                            {speedLimitDebug.rawResponse && (
                                                                <details className="text-left w-full">
                                                                    <summary className="cursor-pointer text-white/60">API 응답 전체</summary>
                                                                    <pre className="text-[7px] text-white/40 mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                                                                        {speedLimitDebug.rawResponse}
                                                                    </pre>
                                                                </details>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

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

                {/* 디버깅 패널 플로팅 버튼 */}
                {isActive && (
                    <button
                        onClick={() => setShowDebugPanel(true)}
                        className="fixed bottom-24 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all active:scale-95"
                        style={{ zIndex: 1000 }}
                    >
                        <Bug size={20} />
                    </button>
                )}

                {/* 디버깅 패널 전체 화면 모달 */}
                {showDebugPanel && (
                    <div 
                        className="fixed inset-0 bg-black/95 z-[9999] overflow-y-auto"
                        style={{ zIndex: 9999 }}
                    >
                        <div className="p-4 pb-20">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">🔍 API 디버깅 정보</h2>
                                <button
                                    onClick={() => setShowDebugPanel(false)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <X size={24} className="text-white" />
                                </button>
                            </div>

                            {speedLimitDebug ? (
                                <div className="space-y-4">
                                    {/* 기본 정보 */}
                                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-white/90 mb-2">기본 정보</h3>
                                        <div className="space-y-1 text-xs text-white/70">
                                            <div>업데이트 시간: {speedLimitDebug.timestamp}</div>
                                            <div>제한 속도: {speedLimitDebug.speedLimit ?? 'null'}</div>
                                            <div>도로명: {speedLimitDebug.roadName ?? 'null'}</div>
                                            <div>데이터 존재: {speedLimitDebug.hasData ? '예' : '아니오'}</div>
                                        </div>
                                    </div>

                                    {/* 에러 정보 */}
                                    {speedLimitDebug.error && (
                                        <div className="bg-red-500/20 backdrop-blur-md rounded-lg p-4 border border-red-500/50">
                                            <h3 className="text-sm font-semibold text-red-300 mb-2">❌ 에러 정보</h3>
                                            <div className="space-y-1 text-xs text-red-200">
                                                <div>에러 메시지: {speedLimitDebug.error}</div>
                                                {speedLimitDebug.errorCode && (
                                                    <div>에러 코드: {speedLimitDebug.errorCode}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* matchedPoint 필드 정보 */}
                                    {speedLimitDebug.matchedPointKeys && (
                                        <div className="bg-blue-500/20 backdrop-blur-md rounded-lg p-4 border border-blue-500/50">
                                            <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 matchedPoint 필드</h3>
                                            <div className="text-xs text-blue-200 break-all">
                                                {speedLimitDebug.matchedPointKeys.join(', ')}
                                            </div>
                                        </div>
                                    )}

                                    {/* matchedPoint 원본 데이터 */}
                                    {speedLimitDebug.matchedPointRaw && (
                                        <div className="bg-green-500/20 backdrop-blur-md rounded-lg p-4 border border-green-500/50">
                                            <h3 className="text-sm font-semibold text-green-300 mb-2">📄 matchedPoint 원본 데이터</h3>
                                            <pre className="text-[10px] text-green-200 mt-2 p-3 bg-black/30 rounded overflow-x-auto whitespace-pre-wrap break-all">
                                                {speedLimitDebug.matchedPointRaw}
                                            </pre>
                                        </div>
                                    )}

                                    {/* API 응답 전체 */}
                                    {speedLimitDebug.rawResponse && (
                                        <div className="bg-yellow-500/20 backdrop-blur-md rounded-lg p-4 border border-yellow-500/50">
                                            <h3 className="text-sm font-semibold text-yellow-300 mb-2">📦 API 응답 전체</h3>
                                            <pre className="text-[10px] text-yellow-200 mt-2 p-3 bg-black/30 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
                                                {speedLimitDebug.rawResponse}
                                            </pre>
                                        </div>
                                    )}

                                    {/* 응답 구조 정보 */}
                                    {speedLimitDebug.responseKeys && (
                                        <div className="bg-purple-500/20 backdrop-blur-md rounded-lg p-4 border border-purple-500/50">
                                            <h3 className="text-sm font-semibold text-purple-300 mb-2">🔑 응답 최상위 키</h3>
                                            <div className="text-xs text-purple-200 break-all">
                                                {speedLimitDebug.responseKeys.join(', ')}
                                            </div>
                                        </div>
                                    )}

                                    {/* API 요청 정보 */}
                                    {speedLimitDebug.requestInfo && (
                                        <div className="bg-indigo-500/20 backdrop-blur-md rounded-lg p-4 border border-indigo-500/50">
                                            <h3 className="text-sm font-semibold text-indigo-300 mb-2">📤 API 요청 정보</h3>
                                            <div className="space-y-1 text-xs text-indigo-200">
                                                <div>URL: <span className="break-all">{speedLimitDebug.requestInfo.url}</span></div>
                                                <div>Method: {speedLimitDebug.requestInfo.method}</div>
                                                <div>위도: {speedLimitDebug.requestInfo.latitude?.toFixed(6)}</div>
                                                <div>경도: {speedLimitDebug.requestInfo.longitude?.toFixed(6)}</div>
                                                <div>좌표: {speedLimitDebug.requestInfo.coords}</div>
                                                <div>요청 시간: {speedLimitDebug.requestInfo.timestamp}</div>
                                                <details className="mt-2">
                                                    <summary className="cursor-pointer text-indigo-300">헤더 정보</summary>
                                                    <pre className="text-[9px] text-indigo-200 mt-2 p-2 bg-black/30 rounded overflow-x-auto whitespace-pre-wrap break-all">
                                                        {JSON.stringify(speedLimitDebug.requestInfo.headers, null, 2)}
                                                    </pre>
                                                </details>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                                    <p className="text-white/70 text-sm">디버깅 정보가 아직 없습니다. GPS 모니터링이 시작되면 정보가 표시됩니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div
                    ref={modalRef}
                    className="bg-white pb-14 pt-11 px-6 rounded-t-[32px] z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative flex-shrink-0"
                    style={{
                        marginTop: '-20px',
                        height: `${modalHeight}px`,
                        minHeight: `${modalHeight}px`,
                        maxHeight: `${modalHeight}px`,
                        transition: isDragging ? 'none' : 'height 0.2s ease-out',
                        touchAction: 'pan-y',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    <div
                        className="flex flex-col items-center gap-2 mb-10 cursor-grab active:cursor-grabbing touch-none"
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
                        <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
                    </div>

                    <div className="space-y-4 mb-10">
                        <div className="flex items-center justify-between">
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
                        {isActive && (
                            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase">속도</p>
                                    <p className="text-lg font-bold text-black">
                                        {currentSpeed > 0 ? Math.round(currentSpeed) : '--'}<span className="text-xs text-gray-400">km/h</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase">급가속</p>
                                    <p className={`text-lg font-bold ${gpsEvents.hardAccel > 0 ? 'text-red-500' : 'text-black'}`}>
                                        {gpsEvents.hardAccel}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase">급감속</p>
                                    <p className={`text-lg font-bold ${gpsEvents.hardBrake > 0 ? 'text-orange-500' : 'text-black'}`}>
                                        {gpsEvents.hardBrake}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`flex gap-3 mb-6 ${isActive ? 'justify-center' : ''}`}>
                        {!isActive && (
                            <button
                                onClick={() => setShowCameraView(false)}
                                className="flex-1 h-14 rounded-xl bg-gray-100 text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <CameraOff size={18} /> Back
                            </button>
                        )}
                        <button
                            onClick={toggleSession}
                            className={`${isActive ? 'w-full' : 'flex-1'} h-14 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg transition-all active:scale-95 ${isActive
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
