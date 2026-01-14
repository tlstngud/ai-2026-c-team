// API 설정 파일
// Mixed Content 오류 방지: 프로덕션에서는 항상 HTTPS 사용
const getApiBaseUrl = () => {
    // 환경 변수가 설정되어 있으면 사용 (HTTPS여야 함)
    if (import.meta.env.VITE_API_BASE_URL) {
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        // 환경 변수가 HTTP로 시작하면 HTTPS로 강제 변환
        if (envUrl.startsWith('http://')) {
            return envUrl.replace('http://', 'https://').replace(':3000', '');
        }
        return envUrl;
    }
    
    // 프로덕션 환경: 항상 HTTPS 사용
    if (import.meta.env.MODE === 'production') {
        return 'https://15.134.130.219/api';
    }
    
    // 개발 환경
    return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
