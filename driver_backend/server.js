const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
// CORS 설정: 프로덕션에서는 특정 도메인만 허용
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://www.c-team.cloud', 'https://c-team.cloud', 'https://api.c-team.cloud']
        : true, // 개발 환경에서는 모든 도메인 허용
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const drivingLogRoutes = require('./routes/drivingLogs');
const couponRoutes = require('./routes/coupons');
const challengeRoutes = require('./routes/challenges');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/driving-logs', drivingLogRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/admin', adminRoutes); // 데이터베이스 관리자 페이지

// 헬스 체크
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: '서버가 정상적으로 작동 중입니다' });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: '요청한 리소스를 찾을 수 없습니다'
        }
    });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('서버 오류:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: '서버 오류가 발생했습니다'
        }
    });
});

// 서버 시작
const startServer = async () => {
    try {
        // 데이터베이스 초기화
        await initDatabase();

        // 서버 시작
        app.listen(PORT, () => {
            console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
            console.log(`API 엔드포인트: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('서버 시작 실패:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
