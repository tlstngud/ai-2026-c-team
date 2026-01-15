import React, { createContext, useContext, useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 현재 로그인한 유저
    const [loading, setLoading] = useState(true);

    // 초기 로드 시 localStorage에서 로그인 상태 복원
    useEffect(() => {
        const initAuth = () => {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const userData = JSON.parse(savedUser);
                setUser(userData);
                if (userData.region) {
                    localStorage.setItem('userRegion', JSON.stringify(userData.region));
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // 1. 회원가입 함수 (DB API 호출)
    const signUp = async (id, name, password, regionData = null) => {
        try {
            // 주소에서 지역 정보 추출
            const address = regionData?.address || '';
            let regionName = '전국 공통';
            let regionCampaign = '대한민국 안전운전 챌린지';
            let regionTarget = 90;
            let regionReward = '안전운전 인증서 발급';

            if (address.includes('춘천')) {
                regionName = '춘천시';
                regionCampaign = '스마일 춘천 안전운전';
                regionTarget = 90;
                regionReward = '춘천사랑상품권 3만원 + 보험할인';
            } else if (address.includes('서울')) {
                regionName = '서울특별시';
                regionCampaign = '서울 마이-티 드라이버';
                regionTarget = 92;
                regionReward = '서울시 공영주차장 50% 할인권';
            }

            // 백엔드 API 호출
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    name,
                    password,
                    address,
                    region_name: regionName,
                    region_campaign: regionCampaign,
                    region_target: regionTarget,
                    region_reward: regionReward
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, message: data.detail || '회원가입 실패' };
            }

            return { success: true };
        } catch (error) {
            console.error('회원가입 오류:', error);
            return { success: false, message: '서버 연결 오류. 잠시 후 다시 시도해주세요.' };
        }
    };

    // 2. 로그인 함수 (DB API 호출) - 임시 비활성화
    const login = async (id, password) => {
        // 임시: 로그인 검증 없이 바로 로그인
        const userData = {
            id: id || 'test_user',
            name: '테스트 사용자',
            score: 85,
            region: {
                name: '춘천시',
                campaign: '스마일 춘천 안전운전',
                target: 90,
                reward: '춘천사랑상품권 3만원 + 보험할인'
            }
        };

        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('userRegion', JSON.stringify(userData.region));

        return { success: true };

        /* 원본 로그인 로직 (나중에 복원)
        try {
            // 백엔드 API 호출
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, password })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, message: data.detail || '로그인 실패' };
            }

            // 로그인 성공 - 사용자 정보 저장
            const userData = {
                id: data.user.id,
                name: data.user.name,
                score: data.user.score,
                region: data.user.region
            };

            setUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));

            if (data.user.region) {
                localStorage.setItem('userRegion', JSON.stringify(data.user.region));
            }

            return { success: true };
        } catch (error) {
            console.error('로그인 오류:', error);
            return { success: false, message: '서버 연결 오류. 잠시 후 다시 시도해주세요.' };
        }
        */
    };

    const logout = async () => {
        setUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRegion');
    };

    return (
        <AuthContext.Provider value={{ user, signUp, login, logout, setUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
