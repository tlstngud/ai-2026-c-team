// API 헬퍼 함수
import API_BASE_URL from '../config/api';

// 토큰 관리
export const getToken = () => {
    return localStorage.getItem('authToken');
};

export const setToken = (token) => {
    localStorage.setItem('authToken', token);
};

export const removeToken = () => {
    localStorage.removeItem('authToken');
};

// API 요청 헬퍼
const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);
        
        // 응답이 JSON이 아닐 수 있으므로 확인
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(text || 'API 요청 실패');
        }

        if (!response.ok) {
            throw new Error(data.error?.message || data.message || 'API 요청 실패');
        }

        return data;
    } catch (error) {
        console.error('API 요청 오류:', {
            endpoint,
            url,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

// GET 요청
export const apiGet = (endpoint) => {
    return apiRequest(endpoint, { method: 'GET' });
};

// POST 요청
export const apiPost = (endpoint, body) => {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

// PUT 요청
export const apiPut = (endpoint, body) => {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
};

// DELETE 요청
export const apiDelete = (endpoint) => {
    return apiRequest(endpoint, { method: 'DELETE' });
};

// 인증 API
export const authAPI = {
    signup: (userData) => apiPost('/auth/signup', userData),
    login: (credentials) => apiPost('/auth/login', credentials),
    logout: () => apiPost('/auth/logout'),
};

// 사용자 API
export const userAPI = {
    getMe: () => apiGet('/users/me'),
    updateMe: (userData) => apiPut('/users/me', userData),
    updatePassword: (passwordData) => apiPut('/users/me/password', passwordData),
    getStatistics: (period = 'ALL') => apiGet(`/users/me/statistics?period=${period}`),
    getMonthlyStatistics: (year, month) => apiGet(`/users/me/statistics/monthly?year=${year}&month=${month}`),
};

// 주행 기록 API
export const drivingLogAPI = {
    create: (logData) => apiPost('/driving-logs', logData),
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiGet(`/driving-logs${queryString ? `?${queryString}` : ''}`);
    },
    getById: (logId) => apiGet(`/driving-logs/${logId}`),
    delete: (logId) => apiDelete(`/driving-logs/${logId}`),
};

// 쿠폰 API
export const couponAPI = {
    getAll: (status = 'ALL', type = 'ALL') => apiGet(`/coupons?status=${status}&type=${type}`),
    issue: (couponData) => apiPost('/coupons/issue', couponData),
    use: (couponId, storeData) => apiPost(`/coupons/${couponId}/use`, storeData),
    getById: (couponId) => apiGet(`/coupons/${couponId}`),
};

// 챌린지 API
export const challengeAPI = {
    getAll: (region = null) => apiGet(region ? `/challenges?region=${region}` : '/challenges'),
    getById: (challengeId) => apiGet(`/challenges/${challengeId}`),
    join: (challengeId) => apiPost(`/challenges/${challengeId}/join`),
    getStatus: (challengeId) => apiGet(`/challenges/${challengeId}/status`),
};
