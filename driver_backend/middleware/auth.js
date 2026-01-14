const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: '인증 토큰이 필요합니다'
            }
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: '토큰이 유효하지 않거나 만료되었습니다'
                }
            });
        }
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
