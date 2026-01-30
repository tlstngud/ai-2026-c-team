import { createClient } from '@supabase/supabase-js';

// Supabase 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    console.error('VITE_SUPABASE_URL:', supabaseUrl);
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '설정됨' : '없음');
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        timeout: 60000
    }
});

// 인증 헬퍼 함수들
export const authHelpers = {
    // 현재 세션 가져오기
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('세션 가져오기 오류:', error);
            return null;
        }
        return session;
    },

    // 현재 사용자 가져오기
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error('사용자 가져오기 오류:', error);
            return null;
        }
        return user;
    },

    // 로그아웃
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('로그아웃 오류:', error);
            return false;
        }
        return true;
    }
};

export default supabase;
