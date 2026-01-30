import { supabase } from '../config/supabase';

/**
 * 사용자 프로필 관련 Supabase 서비스
 */

/**
 * 사용자 프로필 조회
 */
export const getUserProfile = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ 사용자 프로필 조회 오류:', error);
            throw error;
        }

        return {
            id: data.id,
            name: data.name,
            score: data.score || 70,
            region: data.region,
            lastSeen: data.last_seen,
            metadata: data.metadata || {}
        };
    } catch (error) {
        console.error('사용자 프로필 조회 중 오류:', error);
        return null;
    }
};

/**
 * 사용자 점수 업데이트
 */
export const updateUserScore = async (userId, newScore) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                score: newScore,
                last_seen: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('❌ 사용자 점수 업데이트 오류:', error);
            throw error;
        }

        console.log('✅ 사용자 점수 업데이트 완료:', newScore);
        return data;
    } catch (error) {
        console.error('사용자 점수 업데이트 중 오류:', error);
        throw error;
    }
};

/**
 * 사용자 지역 정보 업데이트
 */
export const updateUserRegion = async (userId, regionData) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                region: regionData,
                last_seen: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('❌ 사용자 지역 업데이트 오류:', error);
            throw error;
        }

        console.log('✅ 사용자 지역 업데이트 완료:', regionData);
        return data;
    } catch (error) {
        console.error('사용자 지역 업데이트 중 오류:', error);
        throw error;
    }
};

/**
 * 사용자 프로필 업데이트 (이름, 메타데이터 등)
 */
export const updateUserProfile = async (userId, updates) => {
    try {
        const dbUpdates = {
            last_seen: new Date().toISOString()
        };

        if (updates.name) dbUpdates.name = updates.name;
        if (updates.region) dbUpdates.region = updates.region;
        if (updates.metadata) dbUpdates.metadata = updates.metadata;

        const { data, error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('❌ 사용자 프로필 업데이트 오류:', error);
            throw error;
        }

        console.log('✅ 사용자 프로필 업데이트 완료');
        return data;
    } catch (error) {
        console.error('사용자 프로필 업데이트 중 오류:', error);
        throw error;
    }
};

/**
 * 지역 정보 목록 조회
 */
export const getUserRegions = async () => {
    try {
        const { data, error } = await supabase
            .from('user_regions')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('❌ 지역 정보 조회 오류:', error);
            throw error;
        }

        return data.map(region => ({
            name: region.name,
            campaign: region.campaign,
            reward: region.reward,
            target: region.target,
            regionCode: region.region_code,
            metadata: region.metadata || {}
        }));
    } catch (error) {
        console.error('지역 정보 조회 중 오류:', error);
        return [];
    }
};
