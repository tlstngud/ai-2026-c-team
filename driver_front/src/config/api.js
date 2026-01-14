// API 설정 파일
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     (import.meta.env.MODE === 'production' 
                       ? 'http://15.134.130.219:3000/api'  // EC2 백엔드 주소
                       : 'http://localhost:3000/api');          // 개발 환경

export default API_BASE_URL;
