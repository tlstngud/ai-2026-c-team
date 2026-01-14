# 서버 동작 방식 가이드

## 🚀 서버 시작 과정

### 1단계: 서버 실행
```bash
npm start
# 또는
node server.js
```

### 2단계: 초기화 순서

```
1. 환경 변수 로드 (.env 파일)
   ↓
2. Express 앱 생성
   ↓
3. 미들웨어 설정 (CORS, JSON 파싱)
   ↓
4. 라우트 등록 (API 엔드포인트 연결)
   ↓
5. 데이터베이스 초기화 (SQLite 연결 및 테이블 생성)
   ↓
6. 서버 리스닝 시작 (포트 3000)
```

## 📡 요청 처리 흐름

### 예시: 로그인 요청

```
[프론트엔드]
POST http://localhost:3000/api/auth/login
{
  "id": "user123",
  "password": "password123"
}
   ↓
[서버 - server.js]
1. CORS 미들웨어: 다른 도메인에서의 요청 허용
   ↓
2. express.json(): JSON 데이터 파싱
   ↓
3. 라우트 매칭: /api/auth/login 찾기
   ↓
[서버 - routes/auth.js]
4. POST /login 라우트로 전달
   ↓
[서버 - controllers/authController.js]
5. login 함수 실행:
   - 요청 데이터 검증
   - 데이터베이스에서 사용자 조회
   - 비밀번호 확인 (bcrypt)
   - JWT 토큰 생성
   ↓
6. 응답 반환:
{
  "success": true,
  "data": {
    "userId": "user123",
    "name": "홍길동",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
   ↓
[프론트엔드]
토큰을 받아서 localStorage에 저장
```

## 🔐 인증이 필요한 요청 처리

### 예시: 주행 기록 저장

```
[프론트엔드]
POST http://localhost:3000/api/driving-logs
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Body: {
  "date": "2026-01-15T14:30:00Z",
  "score": 85,
  "duration": 3600
}
   ↓
[서버 - server.js]
1. CORS, JSON 파싱
   ↓
2. 라우트 매칭: /api/driving-logs
   ↓
[서버 - routes/drivingLogs.js]
3. authenticateToken 미들웨어 실행
   ↓
[서버 - middleware/auth.js]
4. JWT 토큰 검증:
   - Authorization 헤더에서 토큰 추출
   - 토큰 유효성 검사
   - 토큰에서 userId 추출
   - req.user = { userId: "user123" } 설정
   ↓
5. 인증 성공 → 다음 미들웨어로 진행
   ↓
[서버 - controllers/drivingLogController.js]
6. createDrivingLog 함수 실행:
   - req.user.userId로 사용자 확인
   - 데이터베이스에 주행 기록 저장
   - 사용자 점수 업데이트
   ↓
7. 응답 반환
```

## 🗄️ 데이터베이스 동작

### SQLite 데이터베이스

```
1. 서버 시작 시:
   - database.db 파일 생성 (없는 경우)
   - 테이블 자동 생성 (CREATE TABLE IF NOT EXISTS)
   - 기본 챌린지 데이터 삽입

2. 요청 처리 시:
   - SQL 쿼리 실행 (SELECT, INSERT, UPDATE, DELETE)
   - Promise 기반 비동기 처리
   - 결과 반환
```

### 데이터베이스 쿼리 예시

```javascript
// 사용자 조회
const user = await dbGet(
  'SELECT * FROM users WHERE user_id = ?',
  [userId]
);

// 주행 기록 저장
await dbRun(
  'INSERT INTO driving_logs (log_id, user_id, date, score) VALUES (?, ?, ?, ?)',
  [logId, userId, date, score]
);

// 주행 기록 목록 조회
const logs = await dbAll(
  'SELECT * FROM driving_logs WHERE user_id = ? ORDER BY date DESC',
  [userId]
);
```

## 📂 파일 구조와 역할

```
server.js
├── Express 앱 생성 및 설정
├── 미들웨어 등록
├── 라우트 연결
└── 서버 시작

routes/
├── auth.js          → /api/auth/* 요청 처리
├── users.js         → /api/users/* 요청 처리
├── drivingLogs.js   → /api/driving-logs/* 요청 처리
├── coupons.js       → /api/coupons/* 요청 처리
└── challenges.js    → /api/challenges/* 요청 처리

controllers/
├── 각 라우트의 실제 비즈니스 로직
├── 데이터베이스 쿼리 실행
└── 응답 데이터 생성

middleware/
└── auth.js          → JWT 토큰 검증

database.js
├── SQLite 연결
├── 테이블 생성
└── 쿼리 헬퍼 함수 (dbGet, dbRun, dbAll)
```

## 🔄 실제 동작 예시

### 시나리오 1: 회원가입

```
1. 사용자가 회원가입 폼 작성
   ↓
2. 프론트엔드: POST /api/auth/signup
   {
     "id": "newuser",
     "name": "김철수",
     "password": "password123",
     "address": "서울시 강남구",
     "region": "서울특별시"
   }
   ↓
3. 서버: authController.signup 실행
   - 중복 아이디 체크
   - 비밀번호 해싱 (bcrypt)
   - 데이터베이스에 사용자 저장
   - JWT 토큰 생성
   ↓
4. 응답: { success: true, data: { userId, token, ... } }
   ↓
5. 프론트엔드: 토큰 저장 후 로그인 상태로 전환
```

### 시나리오 2: 주행 기록 저장

```
1. 사용자가 주행 완료
   ↓
2. 프론트엔드: POST /api/driving-logs
   Headers: { Authorization: "Bearer ..." }
   Body: { date, score, duration, distance, ... }
   ↓
3. 서버: authenticateToken 미들웨어
   - 토큰 검증
   - userId 추출
   ↓
4. 서버: drivingLogController.createDrivingLog 실행
   - 주행 기록 데이터베이스에 저장
   - 사용자 점수 업데이트
   ↓
5. 응답: { success: true, data: { logId, ... } }
   ↓
6. 프론트엔드: 주행 기록 목록 업데이트
```

## 🛡️ 보안 처리

### 1. 비밀번호 해싱
```javascript
// 저장 시
const passwordHash = await bcrypt.hash(password, 10);

// 로그인 시
const isValid = await bcrypt.compare(password, user.password_hash);
```

### 2. JWT 토큰
```javascript
// 토큰 생성
const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '1h' });

// 토큰 검증
jwt.verify(token, JWT_SECRET, (err, user) => {
  if (err) return res.status(403).json({ error: 'Invalid token' });
  req.user = user;
});
```

### 3. CORS 설정
```javascript
app.use(cors()); // 모든 도메인에서의 요청 허용 (개발용)
// 프로덕션에서는 특정 도메인만 허용해야 함
```

## ⚠️ 에러 처리

### 에러 처리 흐름

```
1. 컨트롤러에서 에러 발생
   ↓
2. try-catch로 잡힘
   ↓
3. 적절한 HTTP 상태 코드와 에러 메시지 반환
   ↓
4. 프론트엔드에서 에러 처리
```

### 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

## 🧪 테스트 방법

### 1. 서버 실행 확인
```bash
curl http://localhost:3000/api/health
# 응답: {"status":"OK","message":"서버가 정상적으로 작동 중입니다"}
```

### 2. 회원가입 테스트
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "id": "testuser",
    "name": "테스트",
    "password": "test123",
    "address": "서울시",
    "region": "서울특별시"
  }'
```

### 3. 로그인 테스트
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "id": "testuser",
    "password": "test123"
  }'
```

### 4. 인증이 필요한 요청 테스트
```bash
# 먼저 로그인해서 토큰 받기
TOKEN="your_token_here"

curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 데이터 흐름도

```
┌─────────────┐
│ 프론트엔드  │
│  (React)    │
└──────┬──────┘
       │ HTTP Request
       │ (JSON)
       ↓
┌─────────────────┐
│   Express 서버   │
│  (server.js)    │
└──────┬──────────┘
       │
       ├─→ CORS 체크
       ├─→ JSON 파싱
       ├─→ 라우트 매칭
       ├─→ 인증 미들웨어 (필요시)
       └─→ 컨트롤러 실행
            │
            ↓
┌─────────────────┐
│   데이터베이스   │
│   (SQLite)      │
│  database.db    │
└─────────────────┘
            │
            ↓
       SQL 쿼리 실행
            │
            ↓
       결과 반환
            │
            ↓
┌─────────────────┐
│   컨트롤러       │
│  (응답 생성)     │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│   Express 서버   │
│  (응답 전송)     │
└──────┬──────────┘
       │ HTTP Response
       │ (JSON)
       ↓
┌─────────────┐
│ 프론트엔드  │
│  (React)    │
└─────────────┘
```

## 💡 주요 특징

1. **비동기 처리**: 모든 데이터베이스 작업은 Promise 기반 비동기 처리
2. **에러 핸들링**: 모든 컨트롤러에 try-catch로 에러 처리
3. **일관된 응답 형식**: 모든 API가 동일한 형식으로 응답
4. **자동 데이터베이스 초기화**: 서버 시작 시 테이블 자동 생성
5. **JWT 인증**: 토큰 기반 인증으로 상태 없는(stateless) 서버

## 🔧 환경 변수

`.env` 파일에 설정:
```
PORT=3000                                    # 서버 포트
JWT_SECRET=your-secret-key                  # JWT 암호화 키
JWT_EXPIRES_IN=1h                           # 토큰 만료 시간
DB_PATH=./database.db                       # 데이터베이스 파일 경로
```

이렇게 서버가 동작합니다! 🚀
