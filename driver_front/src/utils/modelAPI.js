// GPU 서버 모델 추론 API
// 카메라 프레임 캡처 -> 224x224 전처리 -> WebSocket으로 서버 전송

// GPU 서버 URL 설정 - Vite 프록시를 통해 연결
// 상대 경로 사용으로 프록시가 자동 처리
const GPU_SERVER_URL = '';  // 상대 경로 (vite proxy가 처리)

// WebSocket URL 구성
const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
};
const WS_SERVER_URL = getWsUrl();

console.log('GPU Server URL: (relative - via proxy)');
console.log('WebSocket URL:', WS_SERVER_URL);

// 세션 및 WebSocket 관리
let sessionId = null;
let websocket = null;
let isConnected = false;
let frameInterval = null;
let onResultCallback = null;

// 캔버스 (프레임 캡처용)
let captureCanvas = null;
let captureCtx = null;

/**
 * 캔버스 초기화 (224x224)
 */
const initCanvas = () => {
    if (!captureCanvas) {
        captureCanvas = document.createElement('canvas');
        captureCanvas.width = 224;
        captureCanvas.height = 224;
        captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
    }
};

/**
 * 비디오 프레임을 224x224로 캡처
 * @param {HTMLVideoElement} videoElement
 * @returns {string} base64 인코딩된 이미지
 */
const captureFrame = (videoElement) => {
    if (!videoElement || !videoElement.videoWidth) {
        return null;
    }

    initCanvas();

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

    // JPEG로 인코딩 (품질 0.8)
    return captureCanvas.toDataURL('image/jpeg', 0.8);
};

/**
 * WebSocket 연결
 * @param {Function} onResult - 추론 결과 콜백
 */
const connect = async (onResult) => {
    onResultCallback = onResult;

    // 세션 생성
    try {
        const response = await fetch(`${GPU_SERVER_URL}/session/create`, {
            method: 'POST'
        });
        const data = await response.json();
        sessionId = data.session_id;
        console.log('Session created:', sessionId);
    } catch (error) {
        console.error('Failed to create session:', error);
        // 세션 생성 실패시 UUID 직접 생성
        sessionId = crypto.randomUUID();
    }

    // WebSocket 연결
    return new Promise((resolve, reject) => {
        try {
            websocket = new WebSocket(`${WS_SERVER_URL}/ws/${sessionId}`);

            websocket.onopen = () => {
                console.log('WebSocket connected');
                isConnected = true;
                resolve(sessionId);
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.status === 'inference_complete' && onResultCallback) {
                        onResultCallback(data.result);
                    }
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };

            websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                isConnected = false;
            };

            websocket.onclose = () => {
                console.log('WebSocket disconnected');
                isConnected = false;
            };

            // 10초 타임아웃
            setTimeout(() => {
                if (!isConnected) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 10000);

        } catch (error) {
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
 * 실시간 프레임 캡처 및 전송 시작
 * @param {HTMLVideoElement} videoElement - 비디오 요소
 * @param {Function} onResult - 추론 결과 콜백
 * @param {number} fps - 초당 프레임 수 (기본 30)
 */
const startCapture = async (videoElement, onResult, fps = 30) => {
    if (frameInterval) {
        clearInterval(frameInterval);
    }

    // WebSocket 연결
    if (!isConnected) {
        try {
            await connect(onResult);
        } catch (error) {
            console.error('Failed to connect:', error);
            return false;
        }
    } else {
        onResultCallback = onResult;
    }

    // 프레임 캡처 및 전송 시작 (30fps = 33.3ms 간격)
    const interval = Math.floor(1000 / fps);
    frameInterval = setInterval(() => {
        const frame = captureFrame(videoElement);
        if (frame) {
            sendFrame(frame);
        }
    }, interval);

    console.log(`Frame capture started: ${fps} FPS`);
    return true;
};

/**
 * 프레임 캡처 중지
 */
const stopCapture = () => {
    if (frameInterval) {
        clearInterval(frameInterval);
        frameInterval = null;
    }
    console.log('Frame capture stopped');
};

/**
 * 연결 종료
 */
const disconnect = () => {
    stopCapture();

    if (websocket) {
        websocket.close();
        websocket = null;
    }

    isConnected = false;
    sessionId = null;
    console.log('Disconnected');
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
