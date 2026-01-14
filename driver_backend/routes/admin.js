const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../database');
const basicAuth = require('express-basic-auth');

// 간단한 인증 (개발용 - 프로덕션에서는 더 강력한 인증 필요)
const adminAuth = basicAuth({
    users: { 'admin': 'admin123' }, // 사용자명: admin, 비밀번호: admin123
    challenge: true,
    realm: 'Database Admin'
});

// 데이터베이스 조회 페이지
router.get('/', adminAuth, async (req, res) => {
    try {
        // 모든 테이블 데이터 조회
        const users = await dbAll('SELECT * FROM users LIMIT 100');
        const logs = await dbAll('SELECT * FROM driving_logs ORDER BY date DESC LIMIT 50');
        const coupons = await dbAll('SELECT * FROM coupons ORDER BY issued_at DESC LIMIT 50');
        const challenges = await dbAll('SELECT * FROM challenges');
        const participants = await dbAll('SELECT * FROM challenge_participants LIMIT 50');

        // 통계
        const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
        const logCount = await dbGet('SELECT COUNT(*) as count FROM driving_logs');
        const couponCount = await dbGet('SELECT COUNT(*) as count FROM coupons');

        res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>데이터베이스 관리자</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .stat-card .number {
            font-size: 32px;
            font-weight: bold;
            color: #4CAF50;
        }
        .section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .section h2 {
            color: #333;
            margin-bottom: 15px;
            font-size: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #555;
            position: sticky;
            top: 0;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .refresh-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .refresh-btn:hover {
            background: #45a049;
        }
        .timestamp {
            color: #999;
            font-size: 11px;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-available { background: #d4edda; color: #155724; }
        .status-used { background: #f8d7da; color: #721c24; }
        .status-expired { background: #fff3cd; color: #856404; }
    </style>
    <script>
        function refreshPage() {
            location.reload();
        }
        // 30초마다 자동 새로고침
        setInterval(refreshPage, 30000);
    </script>
</head>
<body>
    <div class="container">
        <h1>🗄️ 데이터베이스 관리자</h1>
        
        <button class="refresh-btn" onclick="refreshPage()">🔄 새로고침 (30초 자동)</button>
        
        <div class="stats">
            <div class="stat-card">
                <h3>사용자 수</h3>
                <div class="number">${userCount.count}</div>
            </div>
            <div class="stat-card">
                <h3>주행 기록 수</h3>
                <div class="number">${logCount.count}</div>
            </div>
            <div class="stat-card">
                <h3>쿠폰 수</h3>
                <div class="number">${couponCount.count}</div>
            </div>
        </div>

        <div class="section">
            <h2>👥 사용자 (최대 100개)</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>이름</th>
                        <th>점수</th>
                        <th>할인율</th>
                        <th>지역</th>
                        <th>가입일</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.user_id}</td>
                            <td>${user.name || '-'}</td>
                            <td>${user.score || 0}</td>
                            <td>${user.discount_rate || 0}%</td>
                            <td>${user.region_name || '-'}</td>
                            <td class="timestamp">${user.created_at || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🚗 주행 기록 (최근 50개)</h2>
            <table>
                <thead>
                    <tr>
                        <th>로그 ID</th>
                        <th>사용자 ID</th>
                        <th>날짜</th>
                        <th>점수</th>
                        <th>시간(초)</th>
                        <th>거리(km)</th>
                        <th>이벤트</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr>
                            <td>${log.log_id.substring(0, 20)}...</td>
                            <td>${log.user_id}</td>
                            <td class="timestamp">${log.date || '-'}</td>
                            <td>${log.score || 0}</td>
                            <td>${log.duration || 0}</td>
                            <td>${log.distance ? log.distance.toFixed(2) : '-'}</td>
                            <td>${log.events || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🎫 쿠폰 (최근 50개)</h2>
            <table>
                <thead>
                    <tr>
                        <th>쿠폰 ID</th>
                        <th>사용자 ID</th>
                        <th>이름</th>
                        <th>금액</th>
                        <th>상태</th>
                        <th>만료일</th>
                        <th>발급일</th>
                    </tr>
                </thead>
                <tbody>
                    ${coupons.map(coupon => {
                        const statusClass = coupon.status === 'AVAILABLE' ? 'status-available' : 
                                          coupon.status === 'USED' ? 'status-used' : 'status-expired';
                        const statusText = coupon.status === 'AVAILABLE' ? '사용가능' : 
                                         coupon.status === 'USED' ? '사용완료' : '만료';
                        return `
                        <tr>
                            <td>${coupon.coupon_id.substring(0, 20)}...</td>
                            <td>${coupon.user_id}</td>
                            <td>${coupon.name || '-'}</td>
                            <td>${coupon.amount || '-'}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td class="timestamp">${coupon.expiry || '-'}</td>
                            <td class="timestamp">${coupon.issued_at || '-'}</td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🏆 챌린지</h2>
            <table>
                <thead>
                    <tr>
                        <th>챌린지 ID</th>
                        <th>지역</th>
                        <th>이름</th>
                        <th>목표 점수</th>
                        <th>시작일</th>
                        <th>종료일</th>
                    </tr>
                </thead>
                <tbody>
                    ${challenges.map(challenge => `
                        <tr>
                            <td>${challenge.challenge_id}</td>
                            <td>${challenge.region || '-'}</td>
                            <td>${challenge.name || '-'}</td>
                            <td>${challenge.target_score || 0}</td>
                            <td class="timestamp">${challenge.start_date || '-'}</td>
                            <td class="timestamp">${challenge.end_date || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>👥 챌린지 참여자 (최대 50개)</h2>
            <table>
                <thead>
                    <tr>
                        <th>참여자 ID</th>
                        <th>챌린지 ID</th>
                        <th>사용자 ID</th>
                        <th>현재 점수</th>
                        <th>거리</th>
                        <th>참여일</th>
                    </tr>
                </thead>
                <tbody>
                    ${participants.map(p => `
                        <tr>
                            <td>${p.participant_id.substring(0, 20)}...</td>
                            <td>${p.challenge_id}</td>
                            <td>${p.user_id}</td>
                            <td>${p.current_score || 0}</td>
                            <td>${p.distance ? p.distance.toFixed(2) : 0} km</td>
                            <td class="timestamp">${p.joined_at || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            마지막 업데이트: ${new Date().toLocaleString('ko-KR')}
        </div>
    </div>
</body>
</html>
        `);
    } catch (error) {
        console.error('관리자 페이지 오류:', error);
        res.status(500).send('데이터베이스 조회 중 오류가 발생했습니다.');
    }
});

module.exports = router;
