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
    if (!userId) return [];
    try {
        const logData = {
            userId: userId,
            date: newLog.date ? new Date(newLog.date).toISOString() : new Date().toISOString(),
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

        const savedLog = storage.addLog(logData);
        
        if (savedLog) {
            // 새로 추가된 로그를 포함한 전체 목록 가져오기
            const allLogs = await getLogsByUserId(userId);
            return allLogs;
        }
        return [];
    } catch (e) {
        console.error("Error saving log", e);
        return [];
    }
};
