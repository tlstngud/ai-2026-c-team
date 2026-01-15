// API 설정 파일 (해커톤 시연용)
// 주의: 이제 백엔드 API는 사용하지 않습니다. localStorage와 GPU 서버만 사용합니다.
// 이 파일은 하위 호환성을 위해 유지되지만, 실제로는 사용되지 않습니다.

// GPU 서버 URL은 modelAPI.js에서 관리됩니다.
// localStorage는 utils/localStorage.js에서 관리됩니다.

const getApiBaseUrl = () => {
    // 더 이상 백엔드 API를 사용하지 않으므로 빈 문자열 반환
    // 필요시 GPU 서버 URL을 반환할 수 있음
    return '';
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
