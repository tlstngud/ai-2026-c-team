import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, authHelpers } from '../config/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // 현재 로그인한 유저 (public.users 데이터)
    const [authUser, setAuthUser] = useState(null); // Supabase auth.users
    const [loading, setLoading] = useState(true);

    // 초기 로드 시 Supabase 세션 확인
    useEffect(() => {
        const initAuth = async () => {
            try {
                // 현재 세션 확인
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('세션 확인 오류:', error);
                    setLoading(false);
                    return;
                }

                if (session?.user) {
                    setAuthUser(session.user);
                    // public.users에서 프로필 정보 가져오기
                    await loadUserProfile(session.user.id);
                }
            } catch (error) {
                console.error('인증 초기화 오류:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // 인증 상태 변경 리스너
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth 상태 변경:', event, session?.user?.id);

            // SIGNED_IN 이벤트는 백그라운드 복귀 시 계속 발생 → 무시
            if (event === 'SIGNED_IN') {
                console.log('⏭️ Skipping SIGNED_IN event (prevents infinite loop)');
                return;
            }

            if (session?.user) {
                setAuthUser(session.user);
                await loadUserProfile(session.user.id);
            } else {
                setAuthUser(null);
                setUser(null);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // public.users에서 사용자 프로필 로드
    const loadUserProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('프로필 로드 오류:', error);
                return;
            }

            if (data) {
                const userData = {
                    id: data.id,
                    name: data.name,
                    score: data.score || 70,
                    region: data.region,
                    lastSeen: data.last_seen,
                    metadata: data.metadata
                };
                setUser(userData);
                console.log('✅ 사용자 프로필 로드 완료:', userData);
            }
        } catch (error) {
            console.error('프로필 로드 중 오류:', error);
        }
    };

    // 회원가입 함수 - Supabase Auth 사용
    const signUp = async (id, name, password, regionData = null) => {
        try {
            // 아이디를 이메일 형식으로 변환 (Supabase는 이메일 필수)
            const email = `${id}@driver.local`;

            // 지역 정보 구성
            const region = regionData ? {
                name: regionData.name || '전국 공통',
                campaign: regionData.campaign || '대한민국 안전운전 챌린지',
                target: regionData.target || 90,
                reward: regionData.reward || '안전운전 인증서 발급',
                address: regionData.address
            } : null;

            // Supabase Auth 회원가입
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        user_id: id, // 원래 아이디 저장
                        region
                    }
                }
            });

            if (authError) {
                console.error('회원가입 오류:', authError);

                // 중복 이메일 처리
                if (authError.message.includes('already registered')) {
                    return { success: false, message: '이미 존재하는 아이디입니다.' };
                }

                return { success: false, message: authError.message };
            }

            if (!authData.user) {
                return { success: false, message: '회원가입 중 오류가 발생했습니다.' };
            }

            console.log('✅ Supabase Auth 회원가입 완료:', authData.user.id);

            // public.users는 트리거가 자동으로 생성함
            // handle_new_user() 트리거가 auth.users INSERT 시 public.users에 row 생성

            return { success: true };

        } catch (error) {
            console.error('회원가입 중 오류:', error);
            return { success: false, message: '회원가입 중 오류가 발생했습니다.' };
        }
    };

    // 로그인 함수 - Supabase Auth 사용
    const login = async (id, password) => {
        try {
            // 아이디를 이메일 형식으로 변환
            const email = `${id}@driver.local`;

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                console.error('로그인 오류:', authError);

                if (authError.message.includes('Invalid login credentials')) {
                    return { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' };
                }

                return { success: false, message: authError.message };
            }

            if (!authData.user) {
                return { success: false, message: '로그인 중 오류가 발생했습니다.' };
            }

            console.log('✅ Supabase Auth 로그인 완료:', authData.user.id);

            // public.users에서 프로필 로드 (useEffect의 onAuthStateChange가 처리)
            // 여기서는 명시적으로 한 번 더 호출
            await loadUserProfile(authData.user.id);

            return { success: true };

        } catch (error) {
            console.error('로그인 중 오류:', error);
            return { success: false, message: '로그인 중 오류가 발생했습니다.' };
        }
    };

    // 로그아웃 함수
    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('로그아웃 오류:', error);
                return;
            }

            // 상태 초기화
            setUser(null);
            setAuthUser(null);

            // localStorage 정리
            localStorage.removeItem('userRegion');
            localStorage.removeItem('voiceEnabled');

            console.log('✅ 로그아웃 완료');

            // 로그인 페이지로 리다이렉트
            window.location.href = '/login';

        } catch (error) {
            console.error('로그아웃 중 오류:', error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            authUser,
            signUp,
            login,
            logout,
            setUser,
            loading,
            loadUserProfile
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
