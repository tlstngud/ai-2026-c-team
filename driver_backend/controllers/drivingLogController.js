const { dbRun, dbGet, dbAll } = require('../database');
const { v4: uuidv4 } = require('uuid');

// 주행 기록 저장
const createDrivingLog = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            date,
            score,
            duration,
            distance,
            events,
            gpsEvents,
            maxSpeed,
            driverBehaviorScore,
            speedLimitScore,
            accelDecelScore,
            route
        } = req.body;

        if (!date || score === undefined || !duration) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: '필수 필드가 누락되었습니다'
                }
            });
        }

        const logId = `log_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const routeJson = route ? JSON.stringify(route) : null;

        await dbRun(
            `INSERT INTO driving_logs 
             (log_id, user_id, date, score, duration, distance, events, hard_accel, hard_brake, overspeed,
              max_speed, driver_behavior_score, speed_limit_score, accel_decel_score, route)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                logId,
                userId,
                date,
                score,
                duration,
                distance || null,
                events || 0,
                gpsEvents?.hardAccel || 0,
                gpsEvents?.hardBrake || 0,
                gpsEvents?.overspeed || 0,
                maxSpeed || null,
                driverBehaviorScore || null,
                speedLimitScore || null,
                accelDecelScore || null,
                routeJson
            ]
        );

        // 사용자 점수 업데이트
        await dbRun(
            'UPDATE users SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [score, userId]
        );

        res.status(201).json({
            success: true,
            data: {
                logId: logId,
                userId: userId,
                date: date,
                score: score,
                duration: duration,
                distance: distance || null,
                createdAt: new Date().toISOString()
            },
            message: '주행 기록이 저장되었습니다'
        });
    } catch (error) {
        console.error('주행 기록 저장 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 주행 기록 목록 조회
const getDrivingLogs = async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const offset = (page - 1) * limit;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        let sql = `SELECT log_id, date, score, duration, distance, events, max_speed
                   FROM driving_logs WHERE user_id = ?`;
        const params = [userId];

        if (startDate) {
            sql += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const logs = await dbAll(sql, params);

        // 전체 개수 조회
        let countSql = 'SELECT COUNT(*) as total FROM driving_logs WHERE user_id = ?';
        const countParams = [userId];
        if (startDate) {
            countSql += ' AND date >= ?';
            countParams.push(startDate);
        }
        if (endDate) {
            countSql += ' AND date <= ?';
            countParams.push(endDate);
        }
        const countResult = await dbGet(countSql, countParams);
        const total = countResult.total;

        res.json({
            success: true,
            data: {
                logs: logs,
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('주행 기록 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 주행 기록 상세 조회
const getDrivingLog = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { logId } = req.params;

        const log = await dbGet(
            `SELECT * FROM driving_logs WHERE log_id = ? AND user_id = ?`,
            [logId, userId]
        );

        if (!log) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'LOG_NOT_FOUND',
                    message: '주행 기록을 찾을 수 없습니다'
                }
            });
        }

        const route = log.route ? JSON.parse(log.route) : null;

        res.json({
            success: true,
            data: {
                logId: log.log_id,
                userId: log.user_id,
                date: log.date,
                score: log.score,
                duration: log.duration,
                distance: log.distance,
                events: log.events,
                gpsEvents: {
                    hardAccel: log.hard_accel,
                    hardBrake: log.hard_brake,
                    overspeed: log.overspeed
                },
                maxSpeed: log.max_speed,
                driverBehaviorScore: log.driver_behavior_score,
                speedLimitScore: log.speed_limit_score,
                accelDecelScore: log.accel_decel_score,
                route: route,
                createdAt: log.created_at
            }
        });
    } catch (error) {
        console.error('주행 기록 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 주행 기록 삭제
const deleteDrivingLog = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { logId } = req.params;

        const result = await dbRun(
            'DELETE FROM driving_logs WHERE log_id = ? AND user_id = ?',
            [logId, userId]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'LOG_NOT_FOUND',
                    message: '주행 기록을 찾을 수 없습니다'
                }
            });
        }

        res.json({
            success: true,
            message: '주행 기록이 삭제되었습니다'
        });
    } catch (error) {
        console.error('주행 기록 삭제 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

module.exports = { createDrivingLog, getDrivingLogs, getDrivingLog, deleteDrivingLog };
