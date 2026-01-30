import { supabase } from '../config/supabase';

/**
 * 쿠폰 관련 Supabase 서비스
 */

// DB 컬럼명 <-> JS 객체 변환
const mapDbToCoupon = (dbRow) => {
    if (!dbRow) return null;

    return {
        couponId: dbRow.coupon_id,
        challengeId: dbRow.challenge_id,
        userId: dbRow.user_id,
        name: dbRow.name,
        provider: dbRow.provider,
        amount: dbRow.amount,
        type: dbRow.type,
        theme: dbRow.theme,
        status: dbRow.status,
        issuedAt: dbRow.issued_at,
        expiry: dbRow.expiry,
        metadata: dbRow.metadata || {}
    };
};

/**
 * 사용자의 쿠폰 조회
 */
export const getCoupons = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('user_id', userId)
            .order('issued_at', { ascending: false });

        if (error) {
            console.error('❌ 쿠폰 조회 오류:', error);
            throw error;
        }

        return data.map(mapDbToCoupon);
    } catch (error) {
        console.error('쿠폰 조회 중 오류:', error);
        return [];
    }
};

/**
 * 쿠폰 발급
 */
export const addCoupon = async (couponData) => {
    try {
        const dbData = {
            coupon_id: couponData.couponId || `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            challenge_id: couponData.challengeId,
            user_id: couponData.userId,
            name: couponData.name,
            provider: couponData.provider,
            amount: couponData.amount,
            type: couponData.type,
            theme: couponData.theme,
            status: couponData.status || 'AVAILABLE',
            issued_at: new Date().toISOString(),
            expiry: couponData.expiry,
            metadata: couponData.metadata || {}
        };

        const { data, error } = await supabase
            .from('coupons')
            .insert(dbData)
            .select()
            .single();

        if (error) {
            console.error('❌ 쿠폰 발급 오류:', error);
            throw error;
        }

        console.log('✅ 쿠폰 발급 완료:', data.coupon_id);
        return mapDbToCoupon(data);
    } catch (error) {
        console.error('쿠폰 발급 중 오류:', error);
        throw error;
    }
};

/**
 * 쿠폰 상태 업데이트
 */
export const updateCoupon = async (couponId, updates) => {
    try {
        const dbUpdates = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.metadata) dbUpdates.metadata = updates.metadata;

        const { data, error } = await supabase
            .from('coupons')
            .update(dbUpdates)
            .eq('coupon_id', couponId)
            .select()
            .single();

        if (error) {
            console.error('❌ 쿠폰 업데이트 오류:', error);
            throw error;
        }

        console.log('✅ 쿠폰 업데이트 완료:', couponId);
        return mapDbToCoupon(data);
    } catch (error) {
        console.error('쿠폰 업데이트 중 오류:', error);
        throw error;
    }
};

/**
 * 사용 가능한 쿠폰만 조회
 */
export const getAvailableCoupons = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'AVAILABLE')
            .order('issued_at', { ascending: false });

        if (error) {
            console.error('❌ 사용 가능 쿠폰 조회 오류:', error);
            throw error;
        }

        return data.map(mapDbToCoupon);
    } catch (error) {
        console.error('사용 가능 쿠폰 조회 중 오류:', error);
        return [];
    }
};
