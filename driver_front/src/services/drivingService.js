import { supabase } from '../config/supabase';

/**
 * 주행 기록 관련 Supabase 서비스
 */

// DB 컬럼명 <-> JS 객체 변환 헬퍼
const mapDbToLog = (dbRow) => {
    if (!dbRow) return null;

    return {
        logId: dbRow.log_id,
        userId: dbRow.user_id,
        date: dbRow.date,
        dateDisplay: dbRow.date_display,
        createdAt: dbRow.created_at,
        distance: dbRow.distance || 0,
        duration: dbRow.duration || 0,
        events: dbRow.events || 0,
        gpsEvents: dbRow.gps_events || {},
        maxSpeed: dbRow.max_speed || 0,
        score: dbRow.score,
        accelDecelScore: dbRow.accel_decel_score,
        driverBehaviorScore: dbRow.driver_behavior_score,
        speedLimitScore: dbRow.speed_limit_score,
        distractedCount: dbRow.distracted_count || 0,
        drowsyCount: dbRow.drowsy_count || 0,
        phoneCount: dbRow.phone_count || 0,
        route: dbRow.route,
        metadata: dbRow.metadata || {}
    };
};

const mapLogToDb = (log) => {
    return {
        log_id: log.logId || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: log.userId,
        date: log.date || new Date().toISOString(),
        date_display: log.dateDisplay || new Date().toLocaleDateString('ko-KR'),
        distance: log.distance || 0,
        duration: log.duration || 0,
        events: log.events || 0,
        gps_events: log.gpsEvents || {},
        max_speed: log.maxSpeed || 0,
        score: log.score,
        accel_decel_score: log.accelDecelScore,
        driver_behavior_score: log.driverBehaviorScore,
        speed_limit_score: log.speedLimitScore,
        distracted_count: log.distractedCount || 0,
        drowsy_count: log.drowsyCount || 0,
        phone_count: log.phoneCount || 0,
        route: log.route,
        metadata: log.metadata || {}
    };
};

/**
 * 주행 기록 저장
 */
export const saveLog = async (userId, logData) => {
    try {
        const dbData = mapLogToDb({
            ...logData,
            userId
        });

        const { data, error } = await supabase
            .from('driving_logs')
            .insert(dbData)
            .select()
            .single();

        if (error) {
            console.error('❌ 주행 기록 저장 오류:', error);
            throw error;
        }

        console.log('✅ 주행 기록 저장 완료:', data.log_id);
        return mapDbToLog(data);
    } catch (error) {
        console.error('주행 기록 저장 중 오류:', error);
        throw error;
    }
};

/**
 * 사용자의 모든 주행 기록 조회
 */
export const getLogs = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('driving_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ 주행 기록 조회 오류:', error);
            throw error;
        }

        return data.map(mapDbToLog);
    } catch (error) {
        console.error('주행 기록 조회 중 오류:', error);
        return [];
    }
};

/**
 * 특정 주행 기록 조회
 */
export const getLogById = async (logId) => {
    try {
        const { data, error } = await supabase
            .from('driving_logs')
            .select('*')
            .eq('log_id', logId)
            .single();

        if (error) {
            console.error('❌ 주행 기록 상세 조회 오류:', error);
            throw error;
        }

        return mapDbToLog(data);
    } catch (error) {
        console.error('주행 기록 상세 조회 중 오류:', error);
        return null;
    }
};

/**
 * 주행 기록 삭제
 */
export const deleteLog = async (logId, userId) => {
    try {
        const { error } = await supabase
            .from('driving_logs')
            .delete()
            .eq('log_id', logId)
            .eq('user_id', userId);

        if (error) {
            console.error('❌ 주행 기록 삭제 오류:', error);
            throw error;
        }

        console.log('✅ 주행 기록 삭제 완료:', logId);
        return true;
    } catch (error) {
        console.error('주행 기록 삭제 중 오류:', error);
        return false;
    }
};

/**
 * 사용자 통계 계산
 */
export const getStatistics = async (userId) => {
    try {
        const logs = await getLogs(userId);

        const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0);
        const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const totalTrips = logs.length;
        const averageScore = logs.length > 0
            ? Math.round(logs.reduce((sum, log) => sum + (log.score || 0), 0) / logs.length)
            : 70;

        return {
            totalDistance,
            totalDuration,
            totalTrips,
            averageScore
        };
    } catch (error) {
        console.error('통계 계산 중 오류:', error);
        return {
            totalDistance: 0,
            totalDuration: 0,
            totalTrips: 0,
            averageScore: 70
        };
    }
};
