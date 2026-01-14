const { dbRun, dbGet, dbAll } = require('../database');
const { v4: uuidv4 } = require('uuid');

// 쿠폰 목록 조회
const getCoupons = async (req, res) => {
    try {
        const userId = req.user.userId;
        const status = req.query.status || 'ALL';
        const type = req.query.type || 'ALL';

        let sql = 'SELECT * FROM coupons WHERE user_id = ?';
        const params = [userId];

        if (status !== 'ALL') {
            sql += ' AND status = ?';
            params.push(status);
        }
        if (type !== 'ALL') {
            sql += ' AND type = ?';
            params.push(type);
        }

        sql += ' ORDER BY issued_at DESC';

        const coupons = await dbAll(sql, params);

        res.json({
            success: true,
            data: {
                coupons: coupons.map(coupon => ({
                    couponId: coupon.coupon_id,
                    type: coupon.type,
                    name: coupon.name,
                    amount: coupon.amount,
                    provider: coupon.provider,
                    status: coupon.status,
                    expiry: coupon.expiry,
                    theme: coupon.theme,
                    issuedAt: coupon.issued_at
                })),
                total: coupons.length
            }
        });
    } catch (error) {
        console.error('쿠폰 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 쿠폰 발급
const issueCoupon = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { challengeId, region } = req.body;

        // 이미 발급된 쿠폰인지 확인
        if (challengeId) {
            const existingCoupon = await dbGet(
                'SELECT coupon_id FROM coupons WHERE user_id = ? AND challenge_id = ?',
                [userId, challengeId]
            );
            if (existingCoupon) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'ALREADY_ISSUED',
                        message: '이미 발급된 쿠폰입니다'
                    }
                });
            }
        }

        // 사용자 정보 조회
        const user = await dbGet(
            'SELECT score, region_target FROM users WHERE user_id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '사용자를 찾을 수 없습니다'
                }
            });
        }

        // 챌린지 조건 확인
        if (user.score < (user.region_target || 90)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CONDITION_NOT_MET',
                    message: '챌린지 목표 점수를 달성하지 못했습니다'
                }
            });
        }

        // 쿠폰 정보 설정
        const couponId = `coupon_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90); // 90일 후 만료

        let couponName = '안전운전 인증서';
        let couponAmount = '10,000원';
        let couponProvider = region || '전국 공통';
        let couponTheme = 'blue';

        if (region && region.includes('춘천')) {
            couponName = '춘천사랑상품권 3만원 + 보험할인';
            couponAmount = '30,000원';
            couponTheme = 'emerald';
        } else if (region && region.includes('서울')) {
            couponName = '서울시 공영주차장 50% 할인권';
            couponAmount = '50% 할인';
            couponTheme = 'indigo';
        }

        await dbRun(
            `INSERT INTO coupons (coupon_id, user_id, type, name, amount, provider, status, expiry, theme, challenge_id)
             VALUES (?, ?, 'VOUCHER', ?, ?, ?, 'AVAILABLE', ?, ?, ?)`,
            [couponId, userId, couponName, couponAmount, couponProvider, expiryDate.toISOString(), couponTheme, challengeId || null]
        );

        res.status(201).json({
            success: true,
            data: {
                couponId: couponId,
                type: 'VOUCHER',
                name: couponName,
                amount: couponAmount,
                provider: couponProvider,
                status: 'AVAILABLE',
                expiry: expiryDate.toISOString(),
                theme: couponTheme,
                issuedAt: new Date().toISOString()
            },
            message: '쿠폰이 발급되었습니다'
        });
    } catch (error) {
        console.error('쿠폰 발급 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 쿠폰 사용
const useCoupon = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { couponId } = req.params;
        const { storeId, storeName } = req.body;

        const coupon = await dbGet(
            'SELECT * FROM coupons WHERE coupon_id = ? AND user_id = ?',
            [couponId, userId]
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COUPON_NOT_FOUND',
                    message: '쿠폰을 찾을 수 없습니다'
                }
            });
        }

        if (coupon.status === 'USED') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'COUPON_ALREADY_USED',
                    message: '이미 사용된 쿠폰입니다'
                }
            });
        }

        if (new Date(coupon.expiry) < new Date()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'COUPON_EXPIRED',
                    message: '만료된 쿠폰입니다'
                }
            });
        }

        await dbRun(
            'UPDATE coupons SET status = ?, used_at = CURRENT_TIMESTAMP WHERE coupon_id = ?',
            ['USED', couponId]
        );

        res.json({
            success: true,
            data: {
                couponId: couponId,
                status: 'USED',
                usedAt: new Date().toISOString()
            },
            message: '쿠폰이 사용되었습니다'
        });
    } catch (error) {
        console.error('쿠폰 사용 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 쿠폰 상세 조회
const getCoupon = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { couponId } = req.params;

        const coupon = await dbGet(
            'SELECT * FROM coupons WHERE coupon_id = ? AND user_id = ?',
            [couponId, userId]
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COUPON_NOT_FOUND',
                    message: '쿠폰을 찾을 수 없습니다'
                }
            });
        }

        res.json({
            success: true,
            data: {
                couponId: coupon.coupon_id,
                type: coupon.type,
                name: coupon.name,
                amount: coupon.amount,
                provider: coupon.provider,
                status: coupon.status,
                expiry: coupon.expiry,
                theme: coupon.theme,
                issuedAt: coupon.issued_at,
                usedAt: coupon.used_at,
                qrCode: null // QR 코드는 필요시 구현
            }
        });
    } catch (error) {
        console.error('쿠폰 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

module.exports = { getCoupons, issueCoupon, useCoupon, getCoupon };
