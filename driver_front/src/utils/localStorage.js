// localStorage 기반 데이터 저장소 (해커톤 시연용)
// 모든 데이터를 브라우저 localStorage에 저장

export const storage = {
    // 사용자 정보
    getUser: () => {
        try {
            const user = localStorage.getItem('user');
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error('Error loading user:', e);
            return null;
        }
    },
    
    setUser: (user) => {
        try {
            localStorage.setItem('user', JSON.stringify(user));
            return true;
        } catch (e) {
            console.error('Error saving user:', e);
            return false;
        }
    },
    
    removeUser: () => {
        localStorage.removeItem('user');
    },
    
    // 주행 기록
    getLogs: (userId = null) => {
        try {
            const logs = JSON.parse(localStorage.getItem('drivingLogs') || '[]');
            if (userId) {
                return logs.filter(log => log.userId === userId);
            }
            return logs;
        } catch (e) {
            console.error('Error loading logs:', e);
            return [];
        }
    },
    
    addLog: (log) => {
        try {
            const logs = storage.getLogs();
            const newLog = {
                ...log,
                logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date().toISOString()
            };
            logs.unshift(newLog); // 최신이 앞에
            
            // localStorage 저장 시도
            const jsonString = JSON.stringify(logs);
            localStorage.setItem('drivingLogs', jsonString);
            
            console.log('✅ localStorage: 로그 저장 완료', {
                logId: newLog.logId,
                userId: newLog.userId,
                score: newLog.score,
                duration: newLog.duration,
                totalLogs: logs.length
            });
            
            // 저장 확인
            const verify = localStorage.getItem('drivingLogs');
            if (!verify) {
                console.error('❌ localStorage: 저장 후 확인 실패 - 데이터가 없습니다.');
                return null;
            }
            
            return newLog;
        } catch (e) {
            console.error('❌ localStorage: 로그 저장 중 오류', e);
            // localStorage 용량 초과 체크
            if (e.name === 'QuotaExceededError') {
                console.error('❌ localStorage: 저장 공간이 부족합니다. 오래된 로그를 삭제해주세요.');
            }
            return null;
        }
    },
    
    getLogById: (logId) => {
        const logs = storage.getLogs();
        return logs.find(log => log.logId === logId) || null;
    },
    
    deleteLog: (logId) => {
        try {
            const logs = storage.getLogs();
            const filtered = logs.filter(log => log.logId !== logId);
            localStorage.setItem('drivingLogs', JSON.stringify(filtered));
            return true;
        } catch (e) {
            console.error('Error deleting log:', e);
            return false;
        }
    },
    
    // 쿠폰
    getCoupons: (userId = null) => {
        try {
            const coupons = JSON.parse(localStorage.getItem('coupons') || '[]');
            if (userId) {
                return coupons.filter(coupon => coupon.userId === userId);
            }
            return coupons;
        } catch (e) {
            console.error('Error loading coupons:', e);
            return [];
        }
    },
    
    addCoupon: (coupon) => {
        try {
            const coupons = storage.getCoupons();
            const newCoupon = {
                ...coupon,
                couponId: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: coupon.status || 'AVAILABLE',
                issuedAt: new Date().toISOString()
            };
            coupons.push(newCoupon);
            localStorage.setItem('coupons', JSON.stringify(coupons));
            return newCoupon;
        } catch (e) {
            console.error('Error saving coupon:', e);
            return null;
        }
    },
    
    updateCoupon: (couponId, updates) => {
        try {
            const coupons = storage.getCoupons();
            const index = coupons.findIndex(c => c.couponId === couponId);
            if (index !== -1) {
                coupons[index] = { ...coupons[index], ...updates };
                localStorage.setItem('coupons', JSON.stringify(coupons));
                return coupons[index];
            }
            return null;
        } catch (e) {
            console.error('Error updating coupon:', e);
            return null;
        }
    },
    
    // 챌린지 (기본 데이터)
    getChallenges: () => {
        try {
            const challenges = localStorage.getItem('challenges');
            if (challenges) {
                return JSON.parse(challenges);
            }
            // 기본 챌린지 데이터
            const defaultChallenges = [
                {
                    challengeId: 'challenge_chuncheon',
                    region: '춘천시',
                    name: '스마일 춘천 안전운전',
                    title: '춘천시 안전운전 챌린지',
                    targetScore: 90,
                    reward: '춘천사랑상품권 3만원 + 보험할인',
                    startDate: '2026-01-15T00:00:00Z',
                    endDate: '2026-01-29T23:59:59Z',
                    description: '춘천시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.',
                    rules: [
                        '1년 동안 월별 과속 10회 이하 시 감면',
                        '1년 동안 안전 점수 90점 이상 유지 시 감면',
                        '1년 동안 월별 과속 20회 이하 시 감면'
                    ],
                    conditions: ['춘천시 거주자 또는 주 활동 운전자', '최근 1년 내 중과실 사고 이력 없음', '마케팅 활용 동의 필수'],
                    participants: 0
                },
                {
                    challengeId: 'challenge_seoul',
                    region: '서울특별시',
                    name: '서울 마이-티 드라이버',
                    title: '서울특별시 안전운전 챌린지',
                    targetScore: 92,
                    reward: '서울시 공영주차장 50% 할인권',
                    startDate: '2026-01-15T00:00:00Z',
                    endDate: '2026-01-29T23:59:59Z',
                    description: '서울특별시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.',
                    rules: [
                        '1년 동안 월별 과속 10회 이하 시 감면',
                        '1년 동안 안전 점수 90점 이상 유지 시 감면',
                        '1년 동안 월별 과속 20회 이하 시 감면'
                    ],
                    conditions: ['서울특별시 거주자 또는 주 활동 운전자', '최근 1년 내 중과실 사고 이력 없음', '마케팅 활용 동의 필수'],
                    participants: 0
                }
            ];
            localStorage.setItem('challenges', JSON.stringify(defaultChallenges));
            return defaultChallenges;
        } catch (e) {
            console.error('Error loading challenges:', e);
            return [];
        }
    },
    
    // 챌린지 참여 상태
    getChallengeStatus: (userId, challengeId) => {
        try {
            const statuses = JSON.parse(localStorage.getItem('challengeStatuses') || '[]');
            return statuses.find(s => s.userId === userId && s.challengeId === challengeId) || null;
        } catch (e) {
            return null;
        }
    },
    
    joinChallenge: (userId, challengeId) => {
        try {
            const statuses = JSON.parse(localStorage.getItem('challengeStatuses') || '[]');
            const existing = statuses.find(s => s.userId === userId && s.challengeId === challengeId);
            if (existing) {
                return existing; // 이미 참여함
            }
            const newStatus = {
                userId,
                challengeId,
                joinedAt: new Date().toISOString(),
                status: 'ACTIVE'
            };
            statuses.push(newStatus);
            localStorage.setItem('challengeStatuses', JSON.stringify(statuses));
            return newStatus;
        } catch (e) {
            console.error('Error joining challenge:', e);
            return null;
        }
    },

    leaveChallenge: (userId, challengeId) => {
        try {
            const statuses = JSON.parse(localStorage.getItem('challengeStatuses') || '[]');
            const filtered = statuses.filter(s => !(s.userId === userId && s.challengeId === challengeId));
            localStorage.setItem('challengeStatuses', JSON.stringify(filtered));
            return true;
        } catch (e) {
            console.error('Error leaving challenge:', e);
            return false;
        }
    },

    claimChallengeReward: (userId, challengeId) => {
        try {
            const statuses = JSON.parse(localStorage.getItem('challengeStatuses') || '[]');
            const index = statuses.findIndex(s => s.userId === userId && s.challengeId === challengeId);
            if (index !== -1) {
                statuses[index].status = 'REWARD_CLAIMED';
                statuses[index].claimedAt = new Date().toISOString();
                localStorage.setItem('challengeStatuses', JSON.stringify(statuses));
                return statuses[index];
            }
            return null;
        } catch (e) {
            console.error('Error claiming reward:', e);
            return null;
        }
    },
    
    // 통계 계산
    getStatistics: (userId) => {
        const logs = storage.getLogs(userId);
        const user = storage.getUser();
        
        const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0);
        const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const totalTrips = logs.length;
        const averageScore = logs.length > 0
            ? Math.round(logs.reduce((sum, log) => sum + (log.score || 0), 0) / logs.length)
            : user?.score || 80;
        
        return {
            totalDistance,
            totalDuration,
            totalTrips,
            averageScore,
            currentScore: user?.score || 80
        };
    },
    
    // 모든 데이터 초기화 (로그아웃 시)
    clearAll: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('drivingLogs');
        localStorage.removeItem('coupons');
        localStorage.removeItem('challengeStatuses');
        localStorage.removeItem('userRegion');
    }
};
