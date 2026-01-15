// localStorage 기반 로그 서비스 (해커톤 시연용)
import { storage } from './localStorage';

// 특정 유저의 로그 가져오기
export const getLogsByUserId = async (userId) => {
    if (!userId) return [];
    try {
        const logs = storage.getLogs(userId);
        // 기존 형식으로 변환
        return logs.map(log => ({
            date: log.date,
            dateDisplay: log.dateDisplay || (log.date ? new Date(log.date).toLocaleString() : ''),
            score: log.score,
            duration: log.duration,
            distance: log.distance || 0,
            events: log.events || 0,
            maxSpeed: log.maxSpeed || log.max_speed || 0,
            gpsEvents: log.gpsEvents || {
                hardAccel: log.hardAccel || log.hard_accel || 0,
                hardBrake: log.hardBrake || log.hard_brake || 0,
                overspeed: log.overspeed || 0
            }
        }));
    } catch (e) {
        console.error("Error loading logs", e);
        return [];
    }
};

// 특정 유저의 로그 추가하기
export const addLogByUserId = async (userId, newLog) => {
    if (!userId) {
        console.error('❌ addLogByUserId: userId가 없습니다.');
        return [];
    }
    try {
        // 날짜 안전하게 파싱
        let dateISO;
        if (newLog.date) {
            // 이미 ISO 형식이거나 Date 객체인 경우
            if (newLog.date instanceof Date) {
                dateISO = newLog.date.toISOString();
            } else if (typeof newLog.date === 'string') {
                // ISO 형식인지 확인 (YYYY-MM-DD 또는 ISO 8601 형식)
                const dateObj = new Date(newLog.date);
                if (!isNaN(dateObj.getTime())) {
                    dateISO = dateObj.toISOString();
                } else {
                    console.warn('⚠️ 날짜 파싱 실패, 현재 시간 사용:', newLog.date);
                    dateISO = new Date().toISOString();
                }
            } else {
                dateISO = new Date().toISOString();
            }
        } else {
            dateISO = new Date().toISOString();
        }

        const logData = {
            userId: userId,
            date: dateISO,
            dateDisplay: newLog.dateDisplay || new Date(dateISO).toLocaleString(), // 표시용 날짜
            score: newLog.score || 80,
            duration: newLog.duration || 0,
            distance: newLog.distance || 0,
            events: newLog.events || 0,
            gpsEvents: newLog.gpsEvents || {
                hardAccel: 0,
                hardBrake: 0,
                overspeed: 0
            },
            maxSpeed: newLog.maxSpeed || 0,
            driverBehaviorScore: newLog.driverBehaviorScore || null,
            speedLimitScore: newLog.speedLimitScore || null,
            accelDecelScore: newLog.accelDecelScore || null,
            route: newLog.route || null
        };

        console.log('💾 LogService: 저장할 로그 데이터:', logData);
        const savedLog = storage.addLog(logData);
        
        if (savedLog) {
            console.log('✅ LogService: 로그 저장 성공:', savedLog.logId);
            // 새로 추가된 로그를 포함한 전체 목록 가져오기
            const allLogs = await getLogsByUserId(userId);
            console.log('📋 LogService: 전체 로그 개수:', allLogs.length);
            return allLogs;
        } else {
            console.error('❌ LogService: storage.addLog가 null을 반환했습니다.');
            return [];
        }
    } catch (e) {
        console.error("❌ LogService: 로그 저장 중 오류 발생", e);
        return [];
    }
};
