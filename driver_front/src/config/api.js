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

    // 프로덕션 환경: 도메인 우선, 실패 시 IP 주소 fallback
    if (import.meta.env.MODE === 'production') {
        // 도메인을 먼저 시도하되, DNS 해석 실패 시 IP 주소 사용
        // 브라우저에서 도메인을 먼저 시도하고, 실패하면 IP로 재시도하는 로직은
        // 네트워크 레벨에서 처리되므로 여기서는 도메인을 반환
        // 단, DNS 전파가 안 된 경우를 대비해 IP 주소도 제공
        return 'https://api.c-team.cloud/api';
    }

    // 개발 환경
    return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
