const { dbGet, dbAll } = require('../database');

// 사용자 통계 조회
const getStatistics = async (req, res) => {
    try {
        const userId = req.user.userId;
        const period = req.query.period || 'ALL';

        // 기간 설정
        let dateFilter = '';
        if (period === 'WEEK') {
            dateFilter = "AND date >= datetime('now', '-7 days')";
        } else if (period === 'MONTH') {
            dateFilter = "AND date >= datetime('now', '-30 days')";
        } else if (period === 'YEAR') {
            dateFilter = "AND date >= datetime('now', '-365 days')";
        }

        // 사용자 정보
        const user = await dbGet('SELECT * FROM users WHERE user_id = ?', [userId]);

        // 주행 기록 통계
        const logs = await dbAll(
            `SELECT * FROM driving_logs WHERE user_id = ? ${dateFilter} ORDER BY date DESC`,
            [userId]
        );

        const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0);
        const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const totalTrips = logs.length;
        
        // 가중 이동 평균 점수 계산 (최근 주행일수록 가중치 높게)
        const calculateWeightedScore = (logs) => {
            if (logs.length === 0) return null;
            
            let totalWeightedScore = 0;
            let totalWeight = 0;
            
            // 최근 10개 기록에 더 높은 가중치 (60% 반영)
            const recentLogs = logs.slice(0, 10);
            const olderLogs = logs.slice(10);
            
            // 최근 기록: 가중치 0.6
            recentLogs.forEach((log, index) => {
                const weight = Math.log((log.distance || 1) + 1) * 0.6; // 거리 가중치
                totalWeightedScore += (log.score || 0) * weight;
                totalWeight += weight;
            });
            
            // 과거 기록: 가중치 0.4
            olderLogs.forEach((log) => {
                const weight = Math.log((log.distance || 1) + 1) * 0.4;
                totalWeightedScore += (log.score || 0) * weight;
                totalWeight += weight;
            });
            
            return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : null;
        };
        
        const weightedScore = calculateWeightedScore(logs);
        const averageScore = weightedScore !== null ? weightedScore : (logs.length > 0
            ? Math.round(logs.reduce((sum, log) => sum + log.score, 0) / logs.length)
            : null);

        // 할인율 계산
        const calculateDiscountRate = (score) => {
            if (score >= 110) return 10;
            else if (score >= 100) return 5;
            else return 0;
        };

        const discountRate = calculateDiscountRate(user?.score || 80);
        const monthlySavings = discountRate * 1250;

        // 위반 통계
        const violations = {
            drowsy: user?.violations_drowsy || 0,
            phone: user?.violations_phone || 0,
            assault: user?.violations_assault || 0,
            hardAccel: logs.reduce((sum, log) => sum + (log.hard_accel || 0), 0),
            hardBrake: logs.reduce((sum, log) => sum + (log.hard_brake || 0), 0),
            overspeed: logs.reduce((sum, log) => sum + (log.overspeed || 0), 0)
        };

        // 점수 히스토리 (최근 10개)
        const scoreHistory = logs.slice(0, 10).map(log => ({
            date: log.date.split('T')[0],
            score: log.score
        }));

        // 등급 계산 (거리 + 점수 복합 평가)
        const calculateTier = (distance, score) => {
            if (distance < 50) {
                return { name: 'Starter', level: 0, nextGoal: 50 - distance, color: 'gray' };
            }
            if (distance < 300 || (score !== null && score < 70)) {
                return { name: 'Bronze', level: 1, nextGoal: 300 - distance, color: 'orange' };
            }
            if (distance < 1000 || (score !== null && score < 85)) {
                return { name: 'Silver', level: 2, nextGoal: 1000 - distance, color: 'slate' };
            }
            if (distance < 3000 || (score !== null && score < 95)) {
                return { name: 'Gold', level: 3, nextGoal: 3000 - distance, color: 'yellow' };
            }
            return { name: 'Master', level: 4, nextGoal: 0, color: 'purple' };
        };
        
        const tierInfo = calculateTier(totalDistance, averageScore);
        const expectedDiscount = averageScore !== null ? calculateDiscountRate(averageScore) : 0;

        // 활성 개월 수 계산
        const monthsActive = Math.min(Math.ceil(totalTrips / 4), 12); // 대략적인 계산

        // 콜드 스타트 체크: 주행 거리가 30km 미만이면 점수 미노출
        const MIN_DISTANCE_FOR_SCORE = 30;
        const isAnalyzing = totalDistance < MIN_DISTANCE_FOR_SCORE;
        
        res.json({
            success: true,
            data: {
                totalDistance: totalDistance,
                totalDuration: totalDuration,
                totalTrips: totalTrips,
                averageScore: averageScore, // null일 수 있음 (데이터 없음)
                weightedScore: weightedScore, // 가중 평균 점수
                currentScore: user?.score || null,
                discountRate: discountRate,
                monthlySavings: monthlySavings,
                monthsActive: monthsActive,
                tier: tierInfo.name,
                tierInfo: tierInfo, // 등급 상세 정보
                isAnalyzing: isAnalyzing, // 분석 중 여부
                minDistanceForScore: MIN_DISTANCE_FOR_SCORE,
                lastYearDiscount: averageScore !== null ? calculateDiscountRate(averageScore - 5) : 0,
                expectedDiscount: expectedDiscount,
                violations: violations,
                scoreHistory: scoreHistory
            }
        });
    } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 월별 통계 조회
const getMonthlyStatistics = async (req, res) => {
    try {
        const userId = req.user.userId;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;

        const logs = await dbAll(
            `SELECT * FROM driving_logs 
             WHERE user_id = ? AND date >= ? AND date <= ?
             ORDER BY date DESC`,
            [userId, startDate, endDate]
        );

        const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0);
        const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const avgScore = logs.length > 0
            ? Math.round(logs.reduce((sum, log) => sum + log.score, 0) / logs.length)
            : 0;

        // 목표 달성 여부 (예: 10시간 이상 주행)
        const isAchieved = totalDuration >= 36000; // 10시간 = 36000초

        res.json({
            success: true,
            data: {
                year: year,
                month: month,
                driveTime: Math.round(totalDuration / 3600 * 10) / 10, // 시간 단위
                avgScore: avgScore,
                isAchieved: isAchieved,
                distance: totalDistance,
                trips: logs.length
            }
        });
    } catch (error) {
        console.error('월별 통계 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

module.exports = { getStatistics, getMonthlyStatistics };
