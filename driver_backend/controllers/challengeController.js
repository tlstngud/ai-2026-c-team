const { dbRun, dbGet, dbAll } = require('../database');
const { v4: uuidv4 } = require('uuid');

// 챌린지 목록 조회
const getChallenges = async (req, res) => {
    try {
        const region = req.query.region;
        let sql = 'SELECT * FROM challenges';
        const params = [];

        if (region) {
            sql += ' WHERE region = ?';
            params.push(region);
        }

        sql += ' ORDER BY created_at DESC';

        const challenges = await dbAll(sql, params);

        res.json({
            success: true,
            data: {
                challenges: challenges.map(challenge => ({
                    challengeId: challenge.challenge_id,
                    region: challenge.region,
                    name: challenge.name,
                    title: challenge.title,
                    targetScore: challenge.target_score,
                    reward: challenge.reward,
                    participants: 0, // TODO: 실제 참여자 수 계산
                    period: {
                        start: challenge.start_date,
                        end: challenge.end_date
                    },
                    description: challenge.description,
                    rules: challenge.rules ? JSON.parse(challenge.rules) : [],
                    conditions: challenge.conditions ? JSON.parse(challenge.conditions) : []
                }))
            }
        });
    } catch (error) {
        console.error('챌린지 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 챌린지 상세 조회
const getChallenge = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { challengeId } = req.params;

        const challenge = await dbGet('SELECT * FROM challenges WHERE challenge_id = ?', [challengeId]);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CHALLENGE_NOT_FOUND',
                    message: '챌린지를 찾을 수 없습니다'
                }
            });
        }

        // 참여 상태 조회
        const participant = await dbGet(
            'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?',
            [challengeId, userId]
        );

        // 사용자 정보 조회
        const user = await dbGet('SELECT score FROM users WHERE user_id = ?', [userId]);

        const myStatus = participant ? {
            isJoined: true,
            currentScore: participant.current_score || user?.score || 0,
            progress: ((participant.current_score || user?.score || 0) / challenge.target_score * 100).toFixed(1),
            distance: participant.distance || 0,
            isCompleted: (participant.current_score || user?.score || 0) >= challenge.target_score
        } : {
            isJoined: false,
            currentScore: user?.score || 0,
            progress: 0,
            distance: 0,
            isCompleted: false
        };

        res.json({
            success: true,
            data: {
                challengeId: challenge.challenge_id,
                region: challenge.region,
                name: challenge.name,
                title: challenge.title,
                targetScore: challenge.target_score,
                reward: challenge.reward,
                participants: 0, // TODO: 실제 참여자 수 계산
                period: {
                    start: challenge.start_date,
                    end: challenge.end_date
                },
                description: challenge.description,
                rules: challenge.rules ? JSON.parse(challenge.rules) : [],
                conditions: challenge.conditions ? JSON.parse(challenge.conditions) : [],
                myStatus: myStatus
            }
        });
    } catch (error) {
        console.error('챌린지 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 챌린지 참여
const joinChallenge = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { challengeId } = req.params;

        const challenge = await dbGet('SELECT * FROM challenges WHERE challenge_id = ?', [challengeId]);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CHALLENGE_NOT_FOUND',
                    message: '챌린지를 찾을 수 없습니다'
                }
            });
        }

        // 이미 참여했는지 확인
        const existing = await dbGet(
            'SELECT participant_id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?',
            [challengeId, userId]
        );

        if (existing) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'ALREADY_JOINED',
                    message: '이미 참여한 챌린지입니다'
                }
            });
        }

        const participantId = `participant_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const user = await dbGet('SELECT score FROM users WHERE user_id = ?', [userId]);

        await dbRun(
            `INSERT INTO challenge_participants (participant_id, challenge_id, user_id, current_score)
             VALUES (?, ?, ?, ?)`,
            [participantId, challengeId, userId, user?.score || 80]
        );

        res.status(201).json({
            success: true,
            data: {
                challengeId: challengeId,
                joinedAt: new Date().toISOString()
            },
            message: '챌린지에 참여했습니다'
        });
    } catch (error) {
        console.error('챌린지 참여 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 챌린지 참여 상태 조회
const getChallengeStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { challengeId } = req.params;

        const challenge = await dbGet('SELECT * FROM challenges WHERE challenge_id = ?', [challengeId]);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CHALLENGE_NOT_FOUND',
                    message: '챌린지를 찾을 수 없습니다'
                }
            });
        }

        const participant = await dbGet(
            'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?',
            [challengeId, userId]
        );

        if (!participant) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_JOINED',
                    message: '참여하지 않은 챌린지입니다'
                }
            });
        }

        // 주행 기록에서 거리 계산
        const logs = await dbAll(
            'SELECT distance FROM driving_logs WHERE user_id = ? AND date >= ? AND date <= ?',
            [userId, challenge.start_date, challenge.end_date]
        );
        const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0);

        res.json({
            success: true,
            data: {
                challengeId: challengeId,
                isJoined: true,
                currentScore: participant.current_score || 0,
                targetScore: challenge.target_score,
                progress: ((participant.current_score || 0) / challenge.target_score * 100).toFixed(1),
                distance: totalDistance,
                requiredDistance: 100,
                events: {
                    hardAccel: 0, // TODO: 실제 이벤트 수 계산
                    hardBrake: 0,
                    overspeed: 0
                },
                startedAt: participant.joined_at,
                lastUpdatedAt: participant.last_updated_at
            }
        });
    } catch (error) {
        console.error('챌린지 상태 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

module.exports = { getChallenges, getChallenge, joinChallenge, getChallengeStatus };
