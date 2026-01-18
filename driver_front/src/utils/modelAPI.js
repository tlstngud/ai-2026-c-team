// GPU 서버 모델 추론 API
// 카메라 프레임 캡처 -> 224x224 전처리 -> WebSocket으로 서버 전송

// GPU 서버 URL 설정 - Vite 프록시를 통해 연결
const GPU_SERVER_URL = '';  // 상대 경로 (Vite 프록시 사용)

// WebSocket URL 구성 - 같은 서버로 연결 (Vite 프록시)
const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
};
const WS_SERVER_URL = getWsUrl();

console.log('[modelAPI] API/WebSocket: Vite 프록시 사용');
console.log('[modelAPI] WebSocket URL:', WS_SERVER_URL);

// 세션 및 WebSocket 관리
let sessionId = null;
let websocket = null;
let isConnected = false;
let frameInterval = null;
let onResultCallback = null;
let onErrorCallback = null;  // 에러 콜백 추가
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;  // 재연결 시도 횟수 증가

// Heartbeat 및 재연결 관리
let heartbeatInterval = null;
let lastPongTime = Date.now();
const HEARTBEAT_INTERVAL = 5000;   // 5초마다 ping
const PONG_TIMEOUT = 15000;        // 15초 내 pong 없으면 재연결
let currentVideoElement = null;    // 재연결 시 사용
let currentFps = 60;
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];  // 점진적 재연결 딜레이
let isReconnecting = false;

// 캔버스 (프레임 캡처용)
let captureCanvas = null;
let captureCtx = null;
let supportsWebP = null;  // WebP 지원 여부 캐시

/**
 * 캔버스 초기화 (224x224) - GPU 가속 옵션 사용
 * @param {boolean} forceReset - 강제 초기화 여부
 */
const initCanvas = (forceReset = false) => {
    // 강제 초기화 또는 캔버스가 없을 때
    if (!captureCanvas || forceReset) {
        // 기존 캔버스 정리
        if (captureCtx) {
            captureCtx.clearRect(0, 0, 224, 224);
        }

        captureCanvas = document.createElement('canvas');
        captureCanvas.width = 224;
        captureCanvas.height = 224;
        // desynchronized: GPU 가속, alpha: false: 불필요한 알파 채널 제거
        captureCtx = captureCanvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: true
        });

        // WebP 지원 여부 확인
        if (supportsWebP === null) {
            supportsWebP = captureCanvas.toDataURL('image/webp').startsWith('data:image/webp');
        }
        console.log(`[modelAPI] Canvas ${forceReset ? '재' : ''}초기화 완료 (WebP: ${supportsWebP ? '지원' : '미지원'})`);
    }
};

/**
 * 비디오가 캡처 가능한 상태인지 확인
 * @param {HTMLVideoElement} videoElement
 * @returns {boolean}
 */
const isVideoReady = (videoElement) => {
    if (!videoElement) {
        console.warn('[modelAPI] 비디오 요소가 없습니다');
        return false;
    }

    // srcObject (스트림) 존재 확인
    if (!videoElement.srcObject) {
        console.warn('[modelAPI] 비디오에 스트림이 없습니다 (srcObject null)');
        return false;
    }

    // 스트림이 활성 상태인지 확인
    const stream = videoElement.srcObject;
    if (stream.getTracks && stream.getTracks().length === 0) {
        console.warn('[modelAPI] 비디오 스트림에 트랙이 없습니다');
        return false;
    }

    // 비디오 크기 확인 (메타데이터 로드 완료)
    if (!videoElement.videoWidth || !videoElement.videoHeight) {
        console.warn('[modelAPI] 비디오 크기가 0입니다 (메타데이터 미로드)');
        return false;
    }

    // readyState 확인 (HAVE_CURRENT_DATA 이상)
    if (videoElement.readyState < 2) {
        console.warn('[modelAPI] 비디오 준비 안됨 (readyState:', videoElement.readyState, ')');
        return false;
    }

    // 카메라 스트림의 경우 paused 상태여도 프레임 캡처 가능
    // 따라서 paused 체크는 제거 (getUserMedia는 paused=true일 수 있음)

    return true;
};

/**
 * 비디오 프레임을 224x224로 캡처
 * @param {HTMLVideoElement} videoElement
 * @returns {string} base64 인코딩된 이미지
 */
// 디버그: 프레임 변화 감지용
let lastFrameHash = '';
let sameFrameCount = 0;
let frameDebugCounter = 0;

const captureFrame = (videoElement) => {
    if (!isVideoReady(videoElement)) {
        return null;
    }

    initCanvas();

    try {
        // 비디오에서 224x224로 리사이즈하며 캡처
        // 중앙 크롭 방식 (가로세로 비율 유지)
        const vw = videoElement.videoWidth;
        const vh = videoElement.videoHeight;
        const size = Math.min(vw, vh);
        const sx = (vw - size) / 2;
        const sy = (vh - size) / 2;

        captureCtx.drawImage(
            videoElement,
            sx, sy, size, size,  // 소스 (중앙 크롭)
            0, 0, 224, 224       // 대상 (224x224)
        );

        // WebP 우선 사용 (JPEG보다 ~30% 작음), 미지원 시 JPEG fallback
        const dataUrl = supportsWebP
            ? captureCanvas.toDataURL('image/webp', 0.5)
            : captureCanvas.toDataURL('image/jpeg', 0.5);

        // 디버그: 프레임 변화 체크 (개선된 해시 - 여러 위치 샘플링)
        frameDebugCounter++;

        // 이미지 데이터에서 여러 위치의 샘플을 조합하여 해시 생성
        const len = dataUrl.length;
        const combinedHash = [
            dataUrl.slice(Math.floor(len * 0.25), Math.floor(len * 0.25) + 50),  // 25% 위치
            dataUrl.slice(Math.floor(len * 0.5), Math.floor(len * 0.5) + 50),    // 50% 위치
            dataUrl.slice(-50)                                                     // 끝 50자
        ].join('|');

        if (combinedHash === lastFrameHash) {
            sameFrameCount++;
            // 10회마다 로그 (100회 → 10회로 변경하여 빠른 감지)
            if (sameFrameCount % 10 === 0) {
                const stream = videoElement.srcObject;
                const track = stream?.getVideoTracks?.()[0];
                console.warn(`[modelAPI] ⚠️ ${sameFrameCount}회 동일 프레임! track: ${track?.readyState}/${track?.enabled}, video: paused=${videoElement.paused}, width=${videoElement.videoWidth}`);

                // 300회 이상 동일 프레임이면 비디오 스트림 문제로 판단
                if (sameFrameCount >= 300) {
                    console.error('[modelAPI] ❌ 프레임 고정 감지 - 비디오 스트림 문제 가능성');
                }
            }
        } else {
            if (sameFrameCount > 5) {
                console.log(`[modelAPI] ✅ 프레임 변화 감지 (${sameFrameCount}회 동일 후)`);
            }
            sameFrameCount = 0;
            lastFrameHash = combinedHash;
        }

        return dataUrl;
    } catch (error) {
        console.error('[modelAPI] 프레임 캡처 오류:', error);
        return null;
    }
};

/**
 * WebSocket 연결
 * @param {Function} onResult - 추론 결과 콜백
 * @param {Function} onError - 에러 콜백 (선택)
 */
const connect = async (onResult, onError = null) => {
    onResultCallback = onResult;
    onErrorCallback = onError;

    // 세션 생성
    try {
        console.log('[modelAPI] 세션 생성 시도...');
        const response = await fetch(`${GPU_SERVER_URL}/session/create`, {
            method: 'POST'
        });
        const data = await response.json();
        sessionId = data.session_id;
        console.log('[modelAPI] 세션 생성 성공:', sessionId);
    } catch (error) {
        console.warn('[modelAPI] 세션 생성 실패 (백엔드 미연결?):', error.message);
        // 세션 생성 실패시 UUID 직접 생성
        sessionId = crypto.randomUUID();
        console.log('[modelAPI] 임시 세션 ID 생성:', sessionId);
    }

    // WebSocket 연결
    return new Promise((resolve, reject) => {
        try {
            const wsUrl = `${WS_SERVER_URL}/ws/${sessionId}`;
            console.log('[modelAPI] WebSocket 연결 시도:', wsUrl);
            websocket = new WebSocket(wsUrl);

            websocket.onopen = () => {
                console.log('[modelAPI] ✅ WebSocket 연결 성공');
                isConnected = true;
                reconnectAttempts = 0;
                lastPongTime = Date.now();
                isReconnecting = false;

                // Heartbeat 시작
                startHeartbeat();

                resolve(sessionId);
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // server_ping 메시지 처리 - pong 응답 전송
                    if (data.type === 'server_ping') {
                        if (websocket && websocket.readyState === WebSocket.OPEN) {
                            websocket.send(JSON.stringify({
                                type: 'pong',
                                timestamp: data.timestamp
                            }));
                        }
                        return;
                    }

                    // 서버의 pong 응답 처리 (클라이언트 ping에 대한)
                    if (data.type === 'pong') {
                        lastPongTime = Date.now();
                        return;
                    }

                    // 추론 결과 처리
                    if (data.status === 'inference_complete' && onResultCallback) {
                        // 결과에 동적 설정 및 프레임 신뢰성 정보 포함
                        const enrichedResult = {
                            ...data.result,
                            alert_threshold: data.alert_threshold || 20,
                            interval_ms: data.interval_ms || 50,
                            // 프레임 신뢰성 정보 (백엔드에서 전달)
                            frame_reliability: data.frame_reliability || 'good',
                            same_frame_count: data.same_frame_count || 0
                        };

                        // 프레임 신뢰성 경고 로그
                        if (enrichedResult.frame_reliability === 'frozen') {
                            console.error(`[modelAPI] 🔴 프레임 FROZEN! (${enrichedResult.same_frame_count}회 동일) - 카메라 확인 필요`);
                        } else if (enrichedResult.frame_reliability === 'stale') {
                            console.warn(`[modelAPI] 🟡 프레임 STALE (${enrichedResult.same_frame_count}회 동일)`);
                        }

                        onResultCallback(enrichedResult);
                    } else if (data.status === 'error') {
                        console.error('[modelAPI] 서버 추론 오류:', data.message);
                        if (onErrorCallback) onErrorCallback(new Error(data.message));
                    }
                    // buffering, queued 상태는 정상 동작이므로 무시
                } catch (e) {
                    console.error('[modelAPI] 메시지 파싱 오류:', e);
                }
            };

            websocket.onerror = (error) => {
                console.error('[modelAPI] ❌ WebSocket 에러:', error);
                isConnected = false;
                if (onErrorCallback) onErrorCallback(error);
            };

            websocket.onclose = (event) => {
                console.log('[modelAPI] WebSocket 연결 종료 (code:', event.code, ', reason:', event.reason || 'none', ')');
                isConnected = false;
                stopHeartbeat();

                // 비정상 종료 시 자동 재연결
                if (event.code !== 1000 && event.code !== 1001) {
                    console.warn('[modelAPI] ⚠️ 비정상 종료 - 재연결 시도');
                    handleReconnect();
                }
            };

            // 5초 타임아웃 (더 빠른 피드백)
            setTimeout(() => {
                if (!isConnected) {
                    const error = new Error('WebSocket 연결 타임아웃 (5초)');
                    console.error('[modelAPI]', error.message);
                    if (onErrorCallback) onErrorCallback(error);
                    reject(error);
                }
            }, 5000);

        } catch (error) {
            console.error('[modelAPI] WebSocket 연결 예외:', error);
            if (onErrorCallback) onErrorCallback(error);
            reject(error);
        }
    });
};

/**
 * 프레임 전송 (WebSocket)
 * @param {string} base64Image
 */
const sendFrame = (base64Image) => {
    if (!isConnected || !websocket || websocket.readyState !== WebSocket.OPEN) {
        return false;
    }

    websocket.send(JSON.stringify({
        type: 'frame',
        image: base64Image
    }));

    return true;
};

/**
 * 비디오가 준비될 때까지 대기
 * @param {HTMLVideoElement} videoElement
 * @param {number} timeout - 타임아웃 (ms)
 * @returns {Promise<boolean>}
 */
const waitForVideoReady = (videoElement, timeout = 10000) => {  // 10초로 증가 (모바일 대응)
    return new Promise((resolve) => {
        // 현재 비디오 상태 로깅
        console.log('[modelAPI] 비디오 대기 시작, 현재 상태:', {
            element: !!videoElement,
            srcObject: !!videoElement?.srcObject,
            videoWidth: videoElement?.videoWidth,
            videoHeight: videoElement?.videoHeight,
            readyState: videoElement?.readyState,
            paused: videoElement?.paused
        });

        if (isVideoReady(videoElement)) {
            console.log('[modelAPI] ✅ 비디오 즉시 준비됨');
            resolve(true);
            return;
        }

        const startTime = Date.now();
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            checkCount++;
            if (isVideoReady(videoElement)) {
                clearInterval(checkInterval);
                console.log('[modelAPI] ✅ 비디오 준비 완료 (', checkCount * 100, 'ms 후)');
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                // 타임아웃 시 상세 상태 로깅
                console.warn('[modelAPI] ⚠️ 비디오 준비 타임아웃. 최종 상태:', {
                    srcObject: !!videoElement?.srcObject,
                    tracks: videoElement?.srcObject?.getTracks?.()?.length,
                    videoWidth: videoElement?.videoWidth,
                    videoHeight: videoElement?.videoHeight,
                    readyState: videoElement?.readyState,
                    paused: videoElement?.paused,
                    networkState: videoElement?.networkState
                });
                resolve(false);
            }
        }, 100);
    });
};

/**
 * 실시간 프레임 캡처 및 전송 시작
 * @param {HTMLVideoElement} videoElement - 비디오 요소
 * @param {Function} onResult - 추론 결과 콜백
 * @param {number} fps - 초당 프레임 수 (기본 60 - 백엔드 30프레임 버퍼와 맞춤)
 * @param {Function} onError - 에러 콜백 (선택)
 */
const startCapture = async (videoElement, onResult, fps = 60, onError = null) => {
    // 기존 캡처 완전 정리 (새 세션 시작 전)
    console.log('[modelAPI] startCapture() - 기존 상태 정리 중...');
    stopCapture();

    // 잠시 대기 (WebSocket 종료 완료 대기)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 캔버스 강제 재초기화 (이전 세션 데이터 제거)
    initCanvas(true);

    // 프레임 변화 감지 변수 초기화
    lastFrameHash = '';
    sameFrameCount = 0;
    frameDebugCounter = 0;

    // 재연결 시 사용하기 위해 현재 상태 저장
    currentVideoElement = videoElement;
    currentFps = fps;

    console.log('[modelAPI] 프레임 캡처 시작 요청...');

    // 비디오 준비 대기
    const videoReady = await waitForVideoReady(videoElement, 5000);
    if (!videoReady) {
        const error = new Error('비디오가 준비되지 않았습니다');
        console.error('[modelAPI]', error.message);
        if (onError) onError(error);
        return false;
    }

    console.log('[modelAPI] 비디오 상태:', {
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        readyState: videoElement.readyState,
        paused: videoElement.paused
    });

    // WebSocket 연결
    if (!isConnected) {
        try {
            await connect(onResult, onError);
        } catch (error) {
            console.error('[modelAPI] WebSocket 연결 실패:', error.message);
            // 연결 실패해도 프레임 캡처는 시작 (로컬 테스트용)
            console.log('[modelAPI] ⚠️ 서버 연결 없이 프레임 캡처만 시작합니다');
            onResultCallback = onResult;
        }
    } else {
        onResultCallback = onResult;
    }

    // 프레임 캡처 및 전송 시작
    const interval = Math.floor(1000 / fps);
    let frameCount = 0;
    let successCount = 0;

    frameInterval = setInterval(() => {
        const frame = captureFrame(videoElement);
        frameCount++;

        if (frame) {
            const sent = sendFrame(frame);
            if (sent) successCount++;

            // 100프레임마다 상태 로그
            if (frameCount % 100 === 0) {
                console.log(`[modelAPI] 프레임 전송 상태: ${successCount}/${frameCount} (연결: ${isConnected ? '정상' : '끊김'})`);
            }
        }
    }, interval);

    console.log(`[modelAPI] ✅ 프레임 캡처 시작: ${fps} FPS, 연결 상태: ${isConnected ? '연결됨' : '미연결'}`);
    return true;
};

/**
 * 프레임 캡처 중지 및 완전 정리
 */
const stopCapture = () => {
    console.log('[modelAPI] stopCapture() 호출 - 모든 리소스 정리 시작');

    // 1. 프레임 캡처 인터벌 정리
    if (frameInterval) {
        clearInterval(frameInterval);
        frameInterval = null;
        console.log('[modelAPI] frameInterval 정리 완료');
    }

    // 2. Heartbeat 정리
    stopHeartbeat();

    // 3. WebSocket 연결 종료 (정상 종료 코드 1000 사용)
    if (websocket) {
        try {
            if (websocket.readyState === WebSocket.OPEN ||
                websocket.readyState === WebSocket.CONNECTING) {
                websocket.close(1000, 'User stopped capture');
                console.log('[modelAPI] WebSocket 정상 종료 요청');
            }
        } catch (e) {
            console.warn('[modelAPI] WebSocket 종료 중 오류:', e);
        }
        websocket = null;
    }

    // 4. 연결 상태 플래그 초기화
    isConnected = false;
    isReconnecting = false;
    reconnectAttempts = 0;

    // 5. 세션 및 비디오 참조 정리
    sessionId = null;
    currentVideoElement = null;

    // 6. 프레임 변화 감지용 변수 초기화
    lastFrameHash = '';
    sameFrameCount = 0;
    frameDebugCounter = 0;

    // 7. 캔버스 상태 초기화 (메모리 해제)
    if (captureCtx) {
        captureCtx.clearRect(0, 0, 224, 224);
    }

    console.log('[modelAPI] stopCapture() 완료 - 모든 리소스 정리됨');
};

/**
 * Heartbeat ping 시작 - 연결 유지용
 */
const startHeartbeat = () => {
    stopHeartbeat();

    heartbeatInterval = setInterval(() => {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) {
            stopHeartbeat();
            return;
        }

        // pong 타임아웃 체크
        if (Date.now() - lastPongTime > PONG_TIMEOUT) {
            console.warn('[modelAPI] ⚠️ Pong 타임아웃 - 재연결 시도');
            handleReconnect();
            return;
        }

        // ping 전송
        try {
            websocket.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('[modelAPI] Ping 전송 실패:', e);
        }
    }, HEARTBEAT_INTERVAL);

    console.log('[modelAPI] Heartbeat 시작 (5초 간격)');
};

/**
 * Heartbeat 중지
 */
const stopHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
};

/**
 * 재연결 처리
 */
const handleReconnect = async () => {
    // 이미 재연결 중이면 무시
    if (isReconnecting) {
        return;
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[modelAPI] ❌ 최대 재연결 시도 횟수 초과');
        isReconnecting = false;
        if (onErrorCallback) {
            onErrorCallback(new Error('WebSocket 재연결 실패 (최대 시도 횟수 초과)'));
        }
        return;
    }

    isReconnecting = true;
    stopHeartbeat();
    stopCapture();

    if (websocket) {
        try {
            websocket.close();
        } catch (e) {
            // 이미 닫힌 경우 무시
        }
        websocket = null;
    }
    isConnected = false;

    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempts, RECONNECT_DELAYS.length - 1)];
    reconnectAttempts++;

    console.log(`[modelAPI] 🔄 ${delay}ms 후 재연결 시도 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(async () => {
        try {
            await connect(onResultCallback, onErrorCallback);
            console.log('[modelAPI] ✅ 재연결 성공');

            // 프레임 캡처 재시작
            if (currentVideoElement) {
                console.log('[modelAPI] 프레임 캡처 재시작...');
                await startCapture(currentVideoElement, onResultCallback, currentFps, onErrorCallback);
            }
        } catch (error) {
            console.error('[modelAPI] 재연결 실패:', error.message);
            isReconnecting = false;
            handleReconnect();
        }
    }, delay);
};

/**
 * 연결 종료
 */
const disconnect = () => {
    stopCapture();
    stopHeartbeat();

    if (websocket) {
        websocket.close();
        websocket = null;
    }

    isConnected = false;
    isReconnecting = false;
    reconnectAttempts = 0;
    sessionId = null;
    currentVideoElement = null;
    console.log('[modelAPI] Disconnected');
};

/**
 * 서버 상태 확인
 */
const health = async () => {
    try {
        const response = await fetch(`${GPU_SERVER_URL}/health`);
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * 연결 상태 확인
 */
const getStatus = () => ({
    isConnected,
    sessionId,
    websocketState: websocket ? websocket.readyState : null
});

export const modelAPI = {
    connect,
    disconnect,
    startCapture,
    stopCapture,
    captureFrame,
    sendFrame,
    health,
    getStatus,
    isVideoReady,
    waitForVideoReady,

    // 레거시 호환 (HTTP 방식)
    infer: async (data) => {
        try {
            const response = await fetch(`${GPU_SERVER_URL}/infer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId || crypto.randomUUID(),
                    image: data.image
                })
            });

            if (!response.ok) {
                throw new Error(`GPU 서버 오류: ${response.status}`);
            }

            return { success: true, data: await response.json() };
        } catch (error) {
            console.error('GPU 서버 통신 오류:', error);
            return { success: false, error: error.message };
        }
    }
};
