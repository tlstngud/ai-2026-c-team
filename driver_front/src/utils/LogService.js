// API 기반 로그 서비스
import { drivingLogAPI } from './api';

// 특정 유저의 로그 가져오기
export const getLogsByUserId = async (userId) => {
    if (!userId) return [];
    try {
        const response = await drivingLogAPI.getAll();
        if (response.success) {
            // API 응답 형식을 기존 형식으로 변환
            return response.data.logs.map(log => ({
                date: log.date,
                score: log.score,
                duration: log.duration,
                distance: log.distance,
                events: log.events,
                maxSpeed: log.max_speed,
                gpsEvents: {
                    hardAccel: 0,
                    hardBrake: 0,
                    overspeed: 0
                }
            }));
        }
        return [];
    } catch (e) {
        console.error("Error loading logs", e);
        return [];
    }
};

// 특정 유저의 로그 추가하기
export const addLogByUserId = async (userId, newLog) => {
    if (!userId) return [];
    try {
        // API 형식으로 변환
        const logData = {
            date: new Date(newLog.date).toISOString(),
            score: newLog.score,
            duration: newLog.duration,
            distance: newLog.distance || null,
            events: newLog.events || 0,
            gpsEvents: newLog.gpsEvents || {
                hardAccel: 0,
                hardBrake: 0,
                overspeed: 0
            },
            maxSpeed: newLog.maxSpeed || null,
            driverBehaviorScore: null,
            speedLimitScore: null,
            accelDecelScore: null
        };

        const response = await drivingLogAPI.create(logData);
        
        if (response.success) {
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
