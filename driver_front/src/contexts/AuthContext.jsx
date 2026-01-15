import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/localStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 현재 로그인한 유저
    const [loading, setLoading] = useState(true);

    // 초기 로드 시 localStorage에서 사용자 정보 가져오기
    useEffect(() => {
        const initAuth = () => {
            const savedUser = storage.getUser();
            if (savedUser) {
                setUser({
                    id: savedUser.id,
                    name: savedUser.name,
                    score: savedUser.score || 80,
                    region: savedUser.region
                });
                // 지역 정보 저장
                if (savedUser.region) {
                    localStorage.setItem('userRegion', JSON.stringify(savedUser.region));
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // 1. 회원가입 함수 (localStorage 기반)
    const signUp = async (id, name, password, regionData = null) => {
        try {
            // 기존 사용자 확인
            const existingUser = storage.getUser();
            if (existingUser && existingUser.id === id) {
                return { success: false, message: '이미 존재하는 아이디입니다' };
            }

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

            const region = {
                name: regionName,
                campaign: regionCampaign,
                target: regionTarget,
                reward: regionReward,
                address: address
            };

            // 사용자 정보 생성 및 저장
            const newUser = {
                id,
                name,
                password, // 시연용이므로 해싱하지 않음 (실제로는 해싱 필요)
                address,
                regionName: regionName,
                score: 80,
                discountRate: 0,
                region: region,
                createdAt: new Date().toISOString()
            };

            storage.setUser(newUser);
            localStorage.setItem('userRegion', JSON.stringify(region));

            // 사용자 상태 업데이트
            setUser({
                id: newUser.id,
                name: newUser.name,
                score: newUser.score,
                region: newUser.region
            });

            return { success: true };
        } catch (error) {
            return { success: false, message: error.message || '회원가입 중 오류가 발생했습니다.' };
        }
    };

    // 2. 로그인 함수 (localStorage 기반)
    const login = async (id, password) => {
        try {
            const savedUser = storage.getUser();
            
            if (!savedUser) {
                return { success: false, message: '아이디 또는 비밀번호가 틀렸습니다' };
            }

            if (savedUser.id !== id) {
                return { success: false, message: '아이디 또는 비밀번호가 틀렸습니다' };
            }

            // 시연용이므로 비밀번호 검증 간단하게 (실제로는 해싱된 비밀번호 비교 필요)
            if (savedUser.password !== password) {
                return { success: false, message: '아이디 또는 비밀번호가 틀렸습니다' };
            }

            // 사용자 정보 설정
            setUser({
                id: savedUser.id,
                name: savedUser.name,
                score: savedUser.score || 80,
                region: savedUser.region
            });

            // 지역 정보 저장
            if (savedUser.region) {
                localStorage.setItem('userRegion', JSON.stringify(savedUser.region));
            }

            return { success: true };
        } catch (error) {
            return { success: false, message: error.message || '로그인 중 오류가 발생했습니다.' };
        }
    };

    const logout = async () => {
        // localStorage 기반이므로 API 호출 불필요
        setUser(null);
        // 사용자 정보는 유지 (다시 로그인할 수 있도록)
        // 주행 기록, 쿠폰 등은 유지
        localStorage.removeItem('userRegion');
    };

    return (
        <AuthContext.Provider value={{ user, signUp, login, logout, setUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
