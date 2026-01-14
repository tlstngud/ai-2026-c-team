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
        const averageScore = logs.length > 0
            ? Math.round(logs.reduce((sum, log) => sum + log.score, 0) / logs.length)
            : user?.score || 80;

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

        // 등급 계산
        const expectedDiscount = calculateDiscountRate(averageScore);
        const tier = expectedDiscount >= 10 ? 'Gold' : expectedDiscount >= 5 ? 'Silver' : 'Bronze';

        // 활성 개월 수 계산
        const monthsActive = Math.min(Math.ceil(totalTrips / 4), 12); // 대략적인 계산

        res.json({
            success: true,
            data: {
                totalDistance: totalDistance,
                totalDuration: totalDuration,
                totalTrips: totalTrips,
                averageScore: averageScore,
                currentScore: user?.score || 80,
                discountRate: discountRate,
                monthlySavings: monthlySavings,
                monthsActive: monthsActive,
                tier: tier,
                lastYearDiscount: calculateDiscountRate(averageScore - 5),
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
