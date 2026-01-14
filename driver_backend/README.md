# 안전운전 모니터링 시스템 백엔드

Node.js + Express + SQLite 기반 백엔드 서버입니다.

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 입력하세요:
```
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
DB_PATH=./database.db
```

### 3. 서버 실행
```bash
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### 인증
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃

### 사용자
- `GET /api/users/me` - 사용자 정보 조회
- `PUT /api/users/me` - 사용자 정보 수정
- `PUT /api/users/me/password` - 비밀번호 변경
- `GET /api/users/me/statistics` - 통계 조회
- `GET /api/users/me/statistics/monthly` - 월별 통계 조회

### 주행 기록
- `POST /api/driving-logs` - 주행 기록 저장
- `GET /api/driving-logs` - 주행 기록 목록 조회
- `GET /api/driving-logs/:logId` - 주행 기록 상세 조회
- `DELETE /api/driving-logs/:logId` - 주행 기록 삭제

### 쿠폰
- `GET /api/coupons` - 쿠폰 목록 조회
- `POST /api/coupons/issue` - 쿠폰 발급
- `POST /api/coupons/:couponId/use` - 쿠폰 사용
- `GET /api/coupons/:couponId` - 쿠폰 상세 조회

### 챌린지
- `GET /api/challenges` - 챌린지 목록 조회
- `GET /api/challenges/:challengeId` - 챌린지 상세 조회
- `POST /api/challenges/:challengeId/join` - 챌린지 참여
- `GET /api/challenges/:challengeId/status` - 챌린지 참여 상태 조회

## 데이터베이스

SQLite 데이터베이스가 자동으로 생성됩니다. `database.db` 파일이 프로젝트 루트에 생성됩니다.

## 보안 주의사항

1. **JWT_SECRET**: 프로덕션 환경에서는 반드시 강력한 비밀키로 변경하세요.
2. **비밀번호**: bcrypt로 해싱되어 저장됩니다.
3. **HTTPS**: 프로덕션 환경에서는 HTTPS를 사용하세요.

## 문제 해결

### 데이터베이스 오류
- `database.db` 파일을 삭제하고 서버를 재시작하면 데이터베이스가 다시 초기화됩니다.

### 포트 충돌
- `.env` 파일에서 `PORT` 값을 변경하세요.
