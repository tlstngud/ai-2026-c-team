// GPU 서버 모델 추론 API
// 해커톤 시연용: GPU 서버와 통신하여 모델 추론 결과를 받아옴

// GPU 서버 URL 설정 (환경 변수 또는 기본값)
const GPU_SERVER_URL = import.meta.env.VITE_GPU_SERVER_URL || 'http://localhost:8000';

export const modelAPI = {
    /**
     * 이미지/센서 데이터를 GPU 서버로 전송하여 모델 추론
     * @param {Object} data - 추론에 필요한 데이터
     * @param {string|Blob} data.image - 이미지 데이터 (base64 또는 Blob)
     * @param {Object} data.sensors - 센서 데이터 (가속도, 자이로 등)
     * @param {Object} data.metadata - 메타데이터 (타임스탬프 등)
     * @returns {Promise<Object>} 추론 결과
     */
    infer: async (data) => {
        try {
            const response = await fetch(`${GPU_SERVER_URL}/infer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: data.image,
                    sensors: data.sensors || {},
                    metadata: data.metadata || {}
                })
            });
            
            if (!response.ok) {
                throw new Error(`GPU 서버 오류: ${response.status}`);
            }
            
            const result = await response.json();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('GPU 서버 통신 오류:', error);
            return {
                success: false,
                error: error.message || '모델 추론 중 오류가 발생했습니다.'
            };
        }
    },
    
    /**
     * 배치 추론 (여러 이미지/데이터를 한 번에 처리)
     * @param {Array<Object>} batchData - 추론할 데이터 배열
     * @returns {Promise<Object>} 배치 추론 결과
     */
    batchInfer: async (batchData) => {
        try {
            const response = await fetch(`${GPU_SERVER_URL}/batch-infer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ batch: batchData })
            });
            
            if (!response.ok) {
                throw new Error(`GPU 서버 오류: ${response.status}`);
            }
            
            const result = await response.json();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('GPU 서버 배치 추론 오류:', error);
            return {
                success: false,
                error: error.message || '배치 추론 중 오류가 발생했습니다.'
            };
        }
    },
    
    /**
     * GPU 서버 상태 확인
     * @returns {Promise<Object>} 서버 상태
     */
    health: async () => {
        try {
            const response = await fetch(`${GPU_SERVER_URL}/health`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`GPU 서버 오류: ${response.status}`);
            }
            
            const result = await response.json();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('GPU 서버 상태 확인 오류:', error);
            return {
                success: false,
                error: error.message || 'GPU 서버에 연결할 수 없습니다.'
            };
        }
    }
};
