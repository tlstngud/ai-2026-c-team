import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI, setToken, removeToken, getToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 현재 로그인한 유저
    const [loading, setLoading] = useState(true);

    // 초기 로드 시 토큰 확인 및 사용자 정보 가져오기
    useEffect(() => {
        const initAuth = async () => {
            const token = getToken();
            if (token) {
                try {
                    const response = await userAPI.getMe();
                    if (response.success) {
                        setUser({
                            id: response.data.userId,
                            name: response.data.name,
                            score: response.data.score,
                            region: response.data.region
                        });
                        // 지역 정보 저장
                        if (response.data.region) {
                            localStorage.setItem('userRegion', JSON.stringify(response.data.region));
                        }
                    }
                } catch (error) {
                    // 토큰이 유효하지 않으면 제거
                    removeToken();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // 1. 회원가입 함수
    const signUp = async (id, name, password, regionData = null) => {
        try {
            // 주소에서 지역 정보 추출
            const address = regionData?.address || '';
            let region = '전국 공통';
            let sido = '';
            let sigungu = '';

            if (address.includes('춘천')) {
                region = '춘천시';
                sido = '강원특별자치도';
                sigungu = '춘천시';
            } else if (address.includes('서울')) {
                region = '서울특별시';
                sido = '서울특별시';
                sigungu = '';
            }

            const response = await authAPI.signup({
                id,
                name,
                password,
                address,
                region,
                sido,
                sigungu
            });

            if (response.success) {
                // 토큰 저장
                setToken(response.data.token);
                // 사용자 정보 저장
                setUser({
                    id: response.data.userId,
                    name: response.data.name,
                    score: 80,
                    region: response.data.region
                });
                // 지역 정보 저장
                if (response.data.region) {
                    localStorage.setItem('userRegion', JSON.stringify(response.data.region));
                }
                return { success: true };
            } else {
                return { success: false, message: response.error?.message || '회원가입 실패' };
            }
        } catch (error) {
            return { success: false, message: error.message || '회원가입 중 오류가 발생했습니다.' };
        }
    };

    // 2. 로그인 함수
    const login = async (id, password) => {
        try {
            const response = await authAPI.login({ id, password });

            if (response.success) {
                // 토큰 저장
                setToken(response.data.token);
                // 사용자 정보 저장
                setUser({
                    id: response.data.userId,
                    name: response.data.name,
                    score: response.data.score || 80,
                    region: response.data.region
                });
                // 지역 정보 저장
                if (response.data.region) {
                    localStorage.setItem('userRegion', JSON.stringify(response.data.region));
                }
                return { success: true };
            } else {
                return { success: false, message: response.error?.message || '로그인 실패' };
            }
        } catch (error) {
            return { success: false, message: error.message || '로그인 중 오류가 발생했습니다.' };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('로그아웃 오류:', error);
        } finally {
            setUser(null);
            removeToken();
            localStorage.removeItem('userRegion');
        }
    };

    return (
        <AuthContext.Provider value={{ user, signUp, login, logout, setUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
