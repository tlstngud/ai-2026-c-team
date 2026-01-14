// API 설정 파일
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     (import.meta.env.MODE === 'production' 
                       ? 'https://your-backend-server.com/api'  // 프로덕션 백엔드 주소
                       : 'http://localhost:3000/api');          // 개발 환경

export default API_BASE_URL;
