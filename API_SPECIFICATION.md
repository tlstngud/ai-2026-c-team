# 안전운전 모니터링 시스템 API 명세서

## 📋 목차
1. [기본 정보](#기본-정보)
2. [인증 API](#인증-api)
3. [사용자 API](#사용자-api)
4. [주행 기록 API](#주행-기록-api)
5. [쿠폰 API](#쿠폰-api)
6. [챌린지 API](#챌린지-api)
7. [통계 API](#통계-api)
8. [에러 코드](#에러-코드)

---

## 기본 정보

### Base URL
```
http://localhost:3000/api
또는
https://your-domain.com/api
```

### 인증 방식
- JWT (JSON Web Token) 기반 인증
- 요청 헤더에 토큰 포함: `Authorization: Bearer {token}`

### 공통 응답 형식

#### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지"
}
```

#### 실패 응답
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

---

## 인증 API

### 1. 회원가입

**엔드포인트:** `POST /auth/signup`

**요청 본문:**
```json
{
  "id": "user123",
  "name": "홍길동",
  "password": "password123",
  "address": "강원도 춘천시 도화길 38",
  "region": "춘천시",
  "sido": "강원특별자치도",
  "sigungu": "춘천시"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "name": "홍길동",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "region": {
      "name": "춘천시",
      "campaign": "스마일 춘천 안전운전",
      "target": 90,
      "reward": "춘천사랑상품권 3만원 + 보험할인"
    }
  },
  "message": "회원가입이 완료되었습니다"
}
```

**응답 (실패 - 중복 아이디):**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ID",
    "message": "이미 존재하는 아이디입니다"
  }
}
```

**필드 설명:**
- `id`: 사용자 아이디 (영문, 숫자 조합, 4-20자)
- `name`: 사용자 이름
- `password`: 비밀번호 (최소 8자)
- `address`: 전체 주소
- `region`: 지역명 (예: "춘천시", "서울특별시")
- `sido`: 시/도 (예: "강원특별자치도")
- `sigungu`: 시/군/구 (예: "춘천시")

---

### 2. 로그인

**엔드포인트:** `POST /auth/login`

**요청 본문:**
```json
{
  "id": "user123",
  "password": "password123"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "name": "홍길동",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "score": 85,
    "region": {
      "name": "춘천시",
      "campaign": "스마일 춘천 안전운전",
      "target": 90,
      "reward": "춘천사랑상품권 3만원 + 보험할인"
    }
  },
  "message": "로그인 성공"
}
```

**응답 (실패):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "아이디 또는 비밀번호가 틀렸습니다"
  }
}
```

---

### 3. 로그아웃

**엔드포인트:** `POST /auth/logout`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "message": "로그아웃되었습니다"
}
```

---

### 4. 토큰 갱신

**엔드포인트:** `POST /auth/refresh`

**요청 본문:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "token": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

---

## 사용자 API

### 1. 사용자 정보 조회

**엔드포인트:** `GET /users/me`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "name": "홍길동",
    "email": "user@example.com",
    "phone": "010-1234-5678",
    "score": 85,
    "discountRate": 5,
    "region": {
      "name": "춘천시",
      "campaign": "스마일 춘천 안전운전",
      "target": 90,
      "reward": "춘천사랑상품권 3만원 + 보험할인",
      "address": "강원도 춘천시 도화길 38"
    },
    "violations": {
      "drowsy": 0,
      "phone": 0,
      "assault": 0
    },
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

### 2. 사용자 정보 수정

**엔드포인트:** `PUT /users/me`

**인증:** 필요 (Bearer Token)

**요청 본문:**
```json
{
  "name": "홍길동",
  "email": "newemail@example.com",
  "phone": "010-9876-5432"
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "name": "홍길동",
    "email": "newemail@example.com",
    "phone": "010-9876-5432"
  },
  "message": "사용자 정보가 수정되었습니다"
}
```

---

### 3. 비밀번호 변경

**엔드포인트:** `PUT /users/me/password`

**인증:** 필요 (Bearer Token)

**요청 본문:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**응답:**
```json
{
  "success": true,
  "message": "비밀번호가 변경되었습니다"
}
```

---

## 주행 기록 API

### 1. 주행 기록 저장

**엔드포인트:** `POST /driving-logs`

**인증:** 필요 (Bearer Token)

**요청 본문:**
```json
{
  "date": "2026-01-15T14:30:00Z",
  "score": 85,
  "duration": 3600,
  "distance": 45.5,
  "events": 3,
  "gpsEvents": {
    "hardAccel": 1,
    "hardBrake": 2,
    "overspeed": 0
  },
  "maxSpeed": 80,
  "driverBehaviorScore": 88,
  "speedLimitScore": 90,
  "accelDecelScore": 77,
  "route": [
    {
      "latitude": 37.8688,
      "longitude": 127.7379,
      "timestamp": "2026-01-15T14:30:00Z",
      "speed": 60
    }
  ]
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "logId": "log_1234567890",
    "userId": "user123",
    "date": "2026-01-15T14:30:00Z",
    "score": 85,
    "duration": 3600,
    "distance": 45.5,
    "createdAt": "2026-01-15T15:00:00Z"
  },
  "message": "주행 기록이 저장되었습니다"
}
```

**필드 설명:**
- `date`: 주행 시작 시간 (ISO 8601 형식)
- `score`: 최종 안전운전 점수 (0-120)
- `duration`: 주행 시간 (초)
- `distance`: 주행 거리 (km)
- `events`: 운전자 행동 이벤트 수 (졸음, 전화 등)
- `gpsEvents`: GPS 기반 이벤트
  - `hardAccel`: 급가속 횟수
  - `hardBrake`: 급감속 횟수
  - `overspeed`: 과속 횟수
- `maxSpeed`: 최대 속도 (km/h)
- `driverBehaviorScore`: 운전자 행동 점수 (0-100)
- `speedLimitScore`: 제한속도 준수 점수 (0-100)
- `accelDecelScore`: 급가속/감속 점수 (0-100)
- `route`: 주행 경로 (선택사항, 배열)

---

### 2. 주행 기록 목록 조회

**엔드포인트:** `GET /driving-logs`

**인증:** 필요 (Bearer Token)

**쿼리 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10, 최대: 50)
- `startDate`: 시작 날짜 (ISO 8601 형식, 선택사항)
- `endDate`: 종료 날짜 (ISO 8601 형식, 선택사항)

**예시:** `GET /driving-logs?page=1&limit=10&startDate=2026-01-01T00:00:00Z`

**응답:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "logId": "log_1234567890",
        "date": "2026-01-15T14:30:00Z",
        "score": 85,
        "duration": 3600,
        "distance": 45.5,
        "events": 3,
        "maxSpeed": 80
      },
      {
        "logId": "log_1234567891",
        "date": "2026-01-14T10:00:00Z",
        "score": 92,
        "duration": 2400,
        "distance": 30.2,
        "events": 1,
        "maxSpeed": 70
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

### 3. 주행 기록 상세 조회

**엔드포인트:** `GET /driving-logs/:logId`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "data": {
    "logId": "log_1234567890",
    "userId": "user123",
    "date": "2026-01-15T14:30:00Z",
    "score": 85,
    "duration": 3600,
    "distance": 45.5,
    "events": 3,
    "gpsEvents": {
      "hardAccel": 1,
      "hardBrake": 2,
      "overspeed": 0
    },
    "maxSpeed": 80,
    "driverBehaviorScore": 88,
    "speedLimitScore": 90,
    "accelDecelScore": 77,
    "route": [
      {
        "latitude": 37.8688,
        "longitude": 127.7379,
        "timestamp": "2026-01-15T14:30:00Z",
        "speed": 60,
        "speedLimit": 80,
        "roadName": "올림픽대로"
      }
    ],
    "createdAt": "2026-01-15T15:00:00Z"
  }
}
```

---

### 4. 주행 기록 삭제

**엔드포인트:** `DELETE /driving-logs/:logId`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "message": "주행 기록이 삭제되었습니다"
}
```

---

## 쿠폰 API

### 1. 쿠폰 목록 조회

**엔드포인트:** `GET /coupons`

**인증:** 필요 (Bearer Token)

**쿼리 파라미터:**
- `status`: 쿠폰 상태 필터 (ALL, AVAILABLE, USED, EXPIRED, 기본값: ALL)
- `type`: 쿠폰 타입 필터 (VOUCHER, PARKING, OIL, 기본값: ALL)

**예시:** `GET /coupons?status=AVAILABLE&type=VOUCHER`

**응답:**
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "couponId": "coupon_1234567890",
        "type": "VOUCHER",
        "name": "춘천사랑 상품권",
        "amount": "10,000원",
        "provider": "춘천시청",
        "status": "AVAILABLE",
        "expiry": "2026-12-31T23:59:59Z",
        "theme": "emerald",
        "issuedAt": "2026-01-15T10:00:00Z"
      },
      {
        "couponId": "coupon_1234567891",
        "type": "PARKING",
        "name": "공영주차장 50% 할인권",
        "amount": "50% 할인",
        "provider": "시설관리공단",
        "status": "AVAILABLE",
        "expiry": "2026-06-30T23:59:59Z",
        "theme": "indigo",
        "issuedAt": "2026-01-10T10:00:00Z"
      }
    ],
    "total": 2
  }
}
```

**쿠폰 상태:**
- `AVAILABLE`: 사용 가능
- `USED`: 사용 완료
- `EXPIRED`: 만료됨

**쿠폰 타입:**
- `VOUCHER`: 상품권
- `PARKING`: 주차 할인권
- `OIL`: 주유 할인권

---

### 2. 쿠폰 발급

**엔드포인트:** `POST /coupons/issue`

**인증:** 필요 (Bearer Token)

**요청 본문:**
```json
{
  "challengeId": "challenge_123",
  "region": "춘천시"
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "couponId": "coupon_1234567890",
    "type": "VOUCHER",
    "name": "춘천사랑상품권 3만원 + 보험할인",
    "amount": "30,000원",
    "provider": "춘천시",
    "status": "AVAILABLE",
    "expiry": "2026-04-15T23:59:59Z",
    "theme": "emerald",
    "issuedAt": "2026-01-15T10:00:00Z"
  },
  "message": "쿠폰이 발급되었습니다"
}
```

**응답 (실패 - 이미 발급됨):**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_ISSUED",
    "message": "이미 발급된 쿠폰입니다"
  }
}
```

**응답 (실패 - 조건 미달성):**
```json
{
  "success": false,
  "error": {
    "code": "CONDITION_NOT_MET",
    "message": "챌린지 목표 점수를 달성하지 못했습니다"
  }
}
```

---

### 3. 쿠폰 사용

**엔드포인트:** `POST /coupons/:couponId/use`

**인증:** 필요 (Bearer Token)

**요청 본문:**
```json
{
  "storeId": "store_123",
  "storeName": "춘천시청"
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "couponId": "coupon_1234567890",
    "status": "USED",
    "usedAt": "2026-01-15T15:00:00Z"
  },
  "message": "쿠폰이 사용되었습니다"
}
```

---

### 4. 쿠폰 상세 조회

**엔드포인트:** `GET /coupons/:couponId`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "data": {
    "couponId": "coupon_1234567890",
    "type": "VOUCHER",
    "name": "춘천사랑 상품권",
    "amount": "10,000원",
    "provider": "춘천시청",
    "status": "AVAILABLE",
    "expiry": "2026-12-31T23:59:59Z",
    "theme": "emerald",
    "issuedAt": "2026-01-15T10:00:00Z",
    "usedAt": null,
    "qrCode": "data:image/png;base64,..."
  }
}
```

---

## 챌린지 API

### 1. 챌린지 목록 조회

**엔드포인트:** `GET /challenges`

**인증:** 필요 (Bearer Token)

**쿼리 파라미터:**
- `region`: 지역 필터 (선택사항)

**예시:** `GET /challenges?region=춘천시`

**응답:**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "challengeId": "challenge_123",
        "region": "춘천시",
        "name": "스마일 춘천 안전운전",
        "title": "춘천시 안전운전 챌린지",
        "targetScore": 90,
        "reward": "춘천사랑상품권 3만원 + 보험할인",
        "participants": 1243,
        "period": {
          "start": "2026-01-15T00:00:00Z",
          "end": "2026-01-29T23:59:59Z"
        },
        "description": "춘천시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.",
        "rules": [
          "지정된 기간 동안 100km 이상 주행",
          "안전운전 점수 90점 이상 유지",
          "급가속/급감속 최소화"
        ],
        "conditions": [
          "춘천시 거주자 또는 주 활동 운전자",
          "최근 1년 내 중과실 사고 이력 없음",
          "마케팅 활용 동의 필수"
        ]
      }
    ]
  }
}
```

---

### 2. 챌린지 상세 조회

**엔드포인트:** `GET /challenges/:challengeId`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_123",
    "region": "춘천시",
    "name": "스마일 춘천 안전운전",
    "title": "춘천시 안전운전 챌린지",
    "targetScore": 90,
    "reward": "춘천사랑상품권 3만원 + 보험할인",
    "participants": 1243,
    "period": {
      "start": "2026-01-15T00:00:00Z",
      "end": "2026-01-29T23:59:59Z"
    },
    "description": "춘천시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.",
    "rules": [
      "지정된 기간 동안 100km 이상 주행",
      "안전운전 점수 90점 이상 유지",
      "급가속/급감속 최소화"
    ],
    "conditions": [
      "춘천시 거주자 또는 주 활동 운전자",
      "최근 1년 내 중과실 사고 이력 없음",
      "마케팅 활용 동의 필수"
    ],
    "myStatus": {
      "isJoined": true,
      "currentScore": 85,
      "progress": 94.4,
      "distance": 120.5,
      "isCompleted": false
    }
  }
}
```

---

### 3. 챌린지 참여

**엔드포인트:** `POST /challenges/:challengeId/join`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_123",
    "joinedAt": "2026-01-15T10:00:00Z"
  },
  "message": "챌린지에 참여했습니다"
}
```

---

### 4. 챌린지 참여 상태 조회

**엔드포인트:** `GET /challenges/:challengeId/status`

**인증:** 필요 (Bearer Token)

**응답:**
```json
{
  "success": true,
  "data": {
    "challengeId": "challenge_123",
    "isJoined": true,
    "currentScore": 85,
    "targetScore": 90,
    "progress": 94.4,
    "distance": 120.5,
    "requiredDistance": 100,
    "events": {
      "hardAccel": 5,
      "hardBrake": 3,
      "overspeed": 2
    },
    "startedAt": "2026-01-15T10:00:00Z",
    "lastUpdatedAt": "2026-01-15T14:30:00Z"
  }
}
```

---

## 통계 API

### 1. 사용자 통계 조회

**엔드포인트:** `GET /users/me/statistics`

**인증:** 필요 (Bearer Token)

**쿼리 파라미터:**
- `period`: 기간 (WEEK, MONTH, YEAR, ALL, 기본값: ALL)

**예시:** `GET /users/me/statistics?period=MONTH`

**응답:**
```json
{
  "success": true,
  "data": {
    "totalDistance": 1250.5,
    "totalDuration": 86400,
    "totalTrips": 45,
    "averageScore": 87.5,
    "currentScore": 85,
    "discountRate": 5,
    "monthlySavings": 6250,
    "monthsActive": 6,
    "tier": "Silver",
    "lastYearDiscount": 0,
    "expectedDiscount": 5,
    "violations": {
      "drowsy": 2,
      "phone": 5,
      "assault": 0,
      "hardAccel": 15,
      "hardBrake": 12,
      "overspeed": 8
    },
    "scoreHistory": [
      {
        "date": "2026-01-15",
        "score": 85
      },
      {
        "date": "2026-01-14",
        "score": 92
      }
    ]
  }
}
```

---

### 2. 월별 통계 조회

**엔드포인트:** `GET /users/me/statistics/monthly`

**인증:** 필요 (Bearer Token)

**쿼리 파라미터:**
- `year`: 연도 (기본값: 현재 연도)
- `month`: 월 (기본값: 현재 월)

**예시:** `GET /users/me/statistics/monthly?year=2026&month=1`

**응답:**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 1,
    "driveTime": 8.5,
    "avgScore": 87.5,
    "isAchieved": false,
    "distance": 250.5,
    "trips": 12
  }
}
```

---

## 에러 코드

### 인증 관련
- `UNAUTHORIZED`: 인증 토큰이 없거나 유효하지 않음
- `TOKEN_EXPIRED`: 토큰이 만료됨
- `INVALID_CREDENTIALS`: 아이디 또는 비밀번호가 틀림
- `DUPLICATE_ID`: 중복된 아이디

### 사용자 관련
- `USER_NOT_FOUND`: 사용자를 찾을 수 없음
- `INVALID_PASSWORD`: 비밀번호가 틀림

### 주행 기록 관련
- `LOG_NOT_FOUND`: 주행 기록을 찾을 수 없음
- `INVALID_LOG_DATA`: 주행 기록 데이터가 유효하지 않음

### 쿠폰 관련
- `COUPON_NOT_FOUND`: 쿠폰을 찾을 수 없음
- `COUPON_ALREADY_USED`: 이미 사용된 쿠폰
- `COUPON_EXPIRED`: 만료된 쿠폰
- `ALREADY_ISSUED`: 이미 발급된 쿠폰
- `CONDITION_NOT_MET`: 챌린지 조건 미달성

### 챌린지 관련
- `CHALLENGE_NOT_FOUND`: 챌린지를 찾을 수 없음
- `CHALLENGE_NOT_AVAILABLE`: 참여 가능한 챌린지가 아님
- `ALREADY_JOINED`: 이미 참여한 챌린지

### 서버 관련
- `INTERNAL_SERVER_ERROR`: 서버 내부 오류
- `BAD_REQUEST`: 잘못된 요청
- `NOT_FOUND`: 리소스를 찾을 수 없음

---

## 데이터베이스 스키마 (참고용)

### Users 테이블
```sql
CREATE TABLE users (
  user_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  score INT DEFAULT 80,
  discount_rate INT DEFAULT 0,
  region_name VARCHAR(100),
  region_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Driving Logs 테이블
```sql
CREATE TABLE driving_logs (
  log_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  date TIMESTAMP NOT NULL,
  score INT NOT NULL,
  duration INT NOT NULL,
  distance DECIMAL(10, 2),
  events INT DEFAULT 0,
  hard_accel INT DEFAULT 0,
  hard_brake INT DEFAULT 0,
  overspeed INT DEFAULT 0,
  max_speed INT,
  driver_behavior_score INT,
  speed_limit_score INT,
  accel_decel_score INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### Coupons 테이블
```sql
CREATE TABLE coupons (
  coupon_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(50) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'AVAILABLE',
  expiry TIMESTAMP NOT NULL,
  theme VARCHAR(20),
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### Challenges 테이블
```sql
CREATE TABLE challenges (
  challenge_id VARCHAR(50) PRIMARY KEY,
  region VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  target_score INT NOT NULL,
  reward TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Challenge Participants 테이블
```sql
CREATE TABLE challenge_participants (
  participant_id VARCHAR(50) PRIMARY KEY,
  challenge_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  current_score INT,
  distance DECIMAL(10, 2),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  UNIQUE(challenge_id, user_id)
);
```

---

## 구현 가이드

### 1. 백엔드 프레임워크 선택
- **Node.js + Express**: JavaScript 기반, 빠른 개발
- **Python + FastAPI**: 타입 안정성, 자동 문서화
- **Java + Spring Boot**: 엔터프라이즈급, 안정성

### 2. 데이터베이스 선택
- **PostgreSQL**: 관계형 데이터베이스 (권장)
- **MySQL**: 널리 사용되는 관계형 데이터베이스
- **MongoDB**: NoSQL (유연한 스키마)

### 3. 인증 구현
- JWT 토큰 사용
- 비밀번호는 bcrypt로 해싱
- 토큰 만료 시간: Access Token 1시간, Refresh Token 7일

### 4. 보안 고려사항
- HTTPS 사용 필수
- SQL Injection 방지 (ORM 사용)
- XSS 방지 (입력값 검증)
- CORS 설정
- Rate Limiting (API 호출 제한)

### 5. 테스트
- 각 API 엔드포인트에 대한 단위 테스트
- 통합 테스트
- Postman 또는 Insomnia로 API 테스트

---

## 추가 참고사항

1. **페이징**: 목록 조회 API는 모두 페이징을 지원해야 합니다.
2. **정렬**: 주행 기록 목록은 최신순으로 정렬되어야 합니다.
3. **날짜 형식**: 모든 날짜는 ISO 8601 형식을 사용합니다.
4. **에러 처리**: 모든 에러는 일관된 형식으로 반환해야 합니다.
5. **로깅**: 모든 API 요청과 응답을 로깅해야 합니다.

이 명세서를 기반으로 백엔드를 구현하시면 됩니다. 추가 질문이 있으시면 언제든지 물어보세요!
