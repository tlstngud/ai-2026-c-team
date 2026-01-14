const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('../database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// 회원가입
const signup = async (req, res) => {
    try {
        const { id, name, password, address, region, sido, sigungu } = req.body;

        // 필수 필드 검증
        if (!id || !name || !password || !address) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: '모든 필드를 입력해주세요'
                }
            });
        }

        // 중복 아이디 체크
        const existingUser = await dbGet('SELECT user_id FROM users WHERE user_id = ?', [id]);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_ID',
                    message: '이미 존재하는 아이디입니다'
                }
            });
        }

        // 비밀번호 해싱
        const passwordHash = await bcrypt.hash(password, 10);

        // 지자체 정보 설정
        let regionName = region || '전국 공통';
        let regionCampaign = '대한민국 안전운전 챌린지';
        let regionTarget = 90;
        let regionReward = '안전운전 인증서 발급';

        if (regionName.includes('춘천')) {
            regionCampaign = '스마일 춘천 안전운전';
            regionTarget = 90;
            regionReward = '춘천사랑상품권 3만원 + 보험할인';
        } else if (regionName.includes('서울')) {
            regionCampaign = '서울 마이-티 드라이버';
            regionTarget = 92;
            regionReward = '서울시 공영주차장 50% 할인권';
        }

        // 사용자 생성
        await dbRun(
            `INSERT INTO users (user_id, name, password_hash, region_name, region_address, region_campaign, region_target, region_reward, score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 80)`,
            [id, name, passwordHash, regionName, address, regionCampaign, regionTarget, regionReward]
        );

        // JWT 토큰 생성
        const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.status(201).json({
            success: true,
            data: {
                userId: id,
                name: name,
                token: token,
                region: {
                    name: regionName,
                    campaign: regionCampaign,
                    target: regionTarget,
                    reward: regionReward
                }
            },
            message: '회원가입이 완료되었습니다'
        });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 로그인
const login = async (req, res) => {
    try {
        const { id, password } = req.body;

        if (!id || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: '아이디와 비밀번호를 입력해주세요'
                }
            });
        }

        // 사용자 조회
        const user = await dbGet(
            `SELECT user_id, name, password_hash, score, region_name, region_campaign, region_target, region_reward
             FROM users WHERE user_id = ?`,
            [id]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: '아이디 또는 비밀번호가 틀렸습니다'
                }
            });
        }

        // 비밀번호 검증
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: '아이디 또는 비밀번호가 틀렸습니다'
                }
            });
        }

        // JWT 토큰 생성
        const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.json({
            success: true,
            data: {
                userId: user.user_id,
                name: user.name,
                token: token,
                score: user.score,
                region: {
                    name: user.region_name || '전국 공통',
                    campaign: user.region_campaign || '대한민국 안전운전 챌린지',
                    target: user.region_target || 90,
                    reward: user.region_reward || '안전운전 인증서 발급'
                }
            },
            message: '로그인 성공'
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '서버 오류가 발생했습니다'
            }
        });
    }
};

// 로그아웃
const logout = (req, res) => {
    // JWT는 stateless이므로 서버에서 별도 처리 불필요
    // 클라이언트에서 토큰 삭제
    res.json({
        success: true,
        message: '로그아웃되었습니다'
    });
};

module.exports = { signup, login, logout };
