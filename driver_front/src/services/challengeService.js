import { supabase } from '../config/supabase';

/**
 * 챌린지 관련 Supabase 서비스
 */

// DB 컬럼명 <-> JS 객체 변환
const mapDbToChallenge = (dbRow) => {
    if (!dbRow) return null;

    return {
        challengeId: dbRow.challenge_id,
        title: dbRow.title,
        name: dbRow.name,
        description: dbRow.description,
        region: dbRow.region,
        conditions: dbRow.conditions || [],
        rules: dbRow.rules || [],
        startDate: dbRow.start_date,
        endDate: dbRow.end_date,
        targetScore: dbRow.target_score,
        participants: dbRow.participants || 0,
        reward: dbRow.reward,
        status: dbRow.status,
        metadata: dbRow.metadata || {}
    };
};

const mapDbToChallengeStatus = (dbRow) => {
    if (!dbRow) return null;

    return {
        challengeId: dbRow.challenge_id,
        userId: dbRow.user_id,
        status: dbRow.status,
        joinedAt: dbRow.joined_at,
        claimedAt: dbRow.claimed_at,
        metadata: dbRow.metadata || {}
    };
};

/**
 * 모든 챌린지 조회
 */
export const getChallenges = async () => {
    try {
        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ 챌린지 조회 오류:', error);
            throw error;
        }

        return data.map(mapDbToChallenge);
    } catch (error) {
        console.error('챌린지 조회 중 오류:', error);
        return [];
    }
};

/**
 * 특정 지역의 챌린지 조회
 */
export const getChallengesByRegion = async (region) => {
    try {
        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('region', region)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ 지역별 챌린지 조회 오류:', error);
            throw error;
        }

        return data.map(mapDbToChallenge);
    } catch (error) {
        console.error('지역별 챌린지 조회 중 오류:', error);
        return [];
    }
};

/**
 * 챌린지 참여 상태 조회
 */
export const getChallengeStatus = async (userId, challengeId) => {
    try {
        const { data, error } = await supabase
            .from('challenge_statuses')
            .select('*')
            .eq('user_id', userId)
            .eq('challenge_id', challengeId)
            .maybeSingle();

        if (error) {
            console.error('❌ 챌린지 상태 조회 오류:', error);
            throw error;
        }

        return mapDbToChallengeStatus(data);
    } catch (error) {
        console.error('챌린지 상태 조회 중 오류:', error);
        return null;
    }
};

/**
 * 사용자의 모든 챌린지 참여 상태 조회
 */
export const getUserChallengeStatuses = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('challenge_statuses')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ 사용자 챌린지 상태 조회 오류:', error);
            throw error;
        }

        return data.map(mapDbToChallengeStatus);
    } catch (error) {
        console.error('사용자 챌린지 상태 조회 중 오류:', error);
        return [];
    }
};

/**
 * 챌린지 참여
 */
export const joinChallenge = async (userId, challengeId) => {
    try {
        // 이미 참여 중인지 확인
        const existing = await getChallengeStatus(userId, challengeId);
        if (existing) {
            console.log('이미 참여 중인 챌린지입니다.');
            return existing;
        }

        const { data, error } = await supabase
            .from('challenge_statuses')
            .insert({
                user_id: userId,
                challenge_id: challengeId,
                status: 'ACTIVE',
                joined_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('❌ 챌린지 참여 오류:', error);
            throw error;
        }

        console.log('✅ 챌린지 참여 완료:', challengeId);
        return mapDbToChallengeStatus(data);
    } catch (error) {
        console.error('챌린지 참여 중 오류:', error);
        throw error;
    }
};

/**
 * 챌린지 참여 취소
 */
export const leaveChallenge = async (userId, challengeId) => {
    try {
        const { error } = await supabase
            .from('challenge_statuses')
            .delete()
            .eq('user_id', userId)
            .eq('challenge_id', challengeId);

        if (error) {
            console.error('❌ 챌린지 참여 취소 오류:', error);
            throw error;
        }

        console.log('✅ 챌린지 참여 취소 완료:', challengeId);
        return true;
    } catch (error) {
        console.error('챌린지 참여 취소 중 오류:', error);
        return false;
    }
};

/**
 * 챌린지 보상 수령
 */
export const claimChallengeReward = async (userId, challengeId) => {
    try {
        const { data, error } = await supabase
            .from('challenge_statuses')
            .update({
                status: 'REWARD_CLAIMED',
                claimed_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('challenge_id', challengeId)
            .select()
            .single();

        if (error) {
            console.error('❌ 보상 수령 오류:', error);
            throw error;
        }

        console.log('✅ 보상 수령 완료:', challengeId);
        return mapDbToChallengeStatus(data);
    } catch (error) {
        console.error('보상 수령 중 오류:', error);
        throw error;
    }
};
