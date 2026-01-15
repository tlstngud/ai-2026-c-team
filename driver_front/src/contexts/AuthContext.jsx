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

    // 1. 회원가입 함수 - localStorage 기반 (임시)
    const signUp = async (id, name, password, regionData = null) => {
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

        // localStorage에서 기존 회원 목록 가져오기
        const usersJson = localStorage.getItem('registeredUsers');
        const users = usersJson ? JSON.parse(usersJson) : [];

        // 중복 아이디 체크
        if (users.find(u => u.id === id)) {
            return { success: false, message: '이미 존재하는 아이디입니다.' };
        }

        // 새 회원 정보 저장
        const newUser = {
            id,
            name,
            password,
            address,
            score: 85,
            region: {
                name: regionName,
                campaign: regionCampaign,
                target: regionTarget,
                reward: regionReward
            }
        };

        users.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(users));

        return { success: true };

        /* 원본 회원가입 로직 (나중에 복원)
        try {
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
        */
    };

    // 2. 로그인 함수 - localStorage 기반 (임시)
    const login = async (id, password) => {
        // localStorage에서 회원 목록 가져오기
        const usersJson = localStorage.getItem('registeredUsers');
        const users = usersJson ? JSON.parse(usersJson) : [];

        // 회원 찾기
        const foundUser = users.find(u => u.id === id);

        if (!foundUser) {
            return { success: false, message: '존재하지 않는 아이디입니다.' };
        }

        if (foundUser.password !== password) {
            return { success: false, message: '비밀번호가 일치하지 않습니다.' };
        }

        // 로그인 성공
        const userData = {
            id: foundUser.id,
            name: foundUser.name,
            score: foundUser.score || 85,
            region: foundUser.region
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
