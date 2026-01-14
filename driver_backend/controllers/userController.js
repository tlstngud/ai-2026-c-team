const { dbGet, dbRun } = require('../database');

// 사용자 정보 조회
const getMe = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await dbGet(
            `SELECT user_id, name, email, phone, score, discount_rate, region_name, region_address,
                    region_campaign, region_target, region_reward, violations_drowsy, violations_phone,
                    violations_assault, created_at
             FROM users WHERE user_id = ?`,
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

        res.json({
            success: true,
            data: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                score: user.score,
                discountRate: user.discount_rate,
                region: {
                    name: user.region_name || '전국 공통',
                    campaign: user.region_campaign || '대한민국 안전운전 챌린지',
                    target: user.region_target || 90,
                    reward: user.region_reward || '안전운전 인증서 발급',
                    address: user.region_address
                },
                violations: {
                    drowsy: user.violations_drowsy || 0,
                    phone: user.violations_phone || 0,
                    assault: user.violations_assault || 0
                },
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 사용자 정보 수정
const updateMe = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, email, phone } = req.body;

        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (phone) {
            updateFields.push('phone = ?');
            updateValues.push(phone);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: '수정할 정보를 입력해주세요'
                }
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(userId);

        await dbRun(
            `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
            updateValues
        );

        const updatedUser = await dbGet(
            'SELECT user_id, name, email, phone FROM users WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            data: updatedUser,
            message: '사용자 정보가 수정되었습니다'
        });
    } catch (error) {
        console.error('사용자 정보 수정 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 비밀번호 변경
const updatePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: '현재 비밀번호와 새 비밀번호를 입력해주세요'
                }
            });
        }

        const user = await dbGet('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '사용자를 찾을 수 없습니다'
                }
            });
        }

        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_PASSWORD',
                    message: '현재 비밀번호가 틀렸습니다'
                }
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await dbRun(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [newPasswordHash, userId]
        );

        res.json({
            success: true,
            message: '비밀번호가 변경되었습니다'
        });
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

module.exports = { getMe, updateMe, updatePassword };
