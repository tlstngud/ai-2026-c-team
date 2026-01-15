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

    // 프로덕션 환경: DNS 전파 완료 전까지 IP 주소 사용 (임시)
    // TODO: DNS 전파 완료 후 도메인으로 변경
    if (import.meta.env.MODE === 'production') {
        // DNS 전파가 완료되면 아래 주석을 해제하고 IP 주소를 주석 처리
        // return 'https://api.c-team.cloud/api';
        return 'https://15.134.130.219/api'; // 임시: IP 주소 사용
    }

    // 개발 환경
    return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
