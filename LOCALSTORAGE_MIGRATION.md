# localStorage 기반 구조로 마이그레이션 (해커톤 시연용)

## 📋 변경 사항

해커톤 시연용으로 백엔드 서버를 제거하고 프론트엔드에서 localStorage를 사용하도록 변경했습니다.

## 🏗️ 새로운 구조

```
프론트엔드 (Vercel)
├─ localStorage: 모든 데이터 저장
│  ├─ 사용자 정보
│  ├─ 주행 기록
│  ├─ 쿠폰
│  └─ 챌린지
└─ GPU 서버: 모델 추론만

백엔드 서버: 제거됨
```

## 📁 변경된 파일

### 새로 생성된 파일
- `driver_front/src/utils/localStorage.js` - localStorage 기반 데이터 저장소
- `driver_front/src/utils/modelAPI.js` - GPU 서버 통신용 API

### 수정된 파일
- `driver_front/src/contexts/AuthContext.jsx` - localStorage 기반 인증
- `driver_front/src/utils/LogService.js` - localStorage 기반 주행 기록
- `driver_front/src/components/Dashboard.jsx` - API 호출 제거, localStorage 사용
- `driver_front/src/components/InsurancePage.jsx` - localStorage 기반 챌린지
- `driver_front/src/config/api.js` - 더 이상 사용하지 않음 (하위 호환성 유지)

## 🔧 사용 방법

### 1. 프론트엔드 실행

```bash
cd driver_front
npm install
npm run dev
```

### 2. GPU 서버 설정

GPU 서버 URL을 환경 변수로 설정 (선택사항):

```bash
# .env 파일
VITE_GPU_SERVER_URL=http://localhost:8000
```

또는 `driver_front/src/utils/modelAPI.js`에서 직접 수정:

```javascript
const GPU_SERVER_URL = 'http://your-gpu-server:port';
```

### 3. 데이터 초기화

브라우저 개발자 도구에서:

```javascript
// 모든 데이터 초기화
localStorage.clear();
```

## 📊 데이터 구조

### 사용자 정보
```javascript
{
  id: "user123",
  name: "홍길동",
  password: "password123", // 시연용 (실제로는 해싱 필요)
  address: "강원도 춘천시...",
  region: "춘천시",
  score: 85,
  discountRate: 5,
  region: {
    name: "춘천시",
    campaign: "스마일 춘천 안전운전",
    target: 90,
    reward: "춘천사랑상품권 3만원 + 보험할인",
    address: "강원도 춘천시..."
  },
  createdAt: "2026-01-15T10:00:00Z"
}
```

### 주행 기록
```javascript
{
  logId: "log_1234567890_abc123",
  userId: "user123",
  date: "2026-01-15T10:00:00Z",
  score: 85,
  duration: 3600,
  distance: 12.5,
  events: 0,
  gpsEvents: {
    hardAccel: 0,
    hardBrake: 0,
    overspeed: 0
  },
  maxSpeed: 60,
  createdAt: "2026-01-15T10:00:00Z"
}
```

## 🚀 GPU 서버 통신

### 모델 추론 예시

```javascript
import { modelAPI } from '../utils/modelAPI';

// 이미지/센서 데이터를 GPU 서버로 전송
const result = await modelAPI.infer({
  image: imageData, // base64 또는 Blob
  sensors: {
    acceleration: accelData,
    gyro: gyroData
  },
  metadata: {
    timestamp: new Date().toISOString()
  }
});

if (result.success) {
  // 추론 결과 사용
  const prediction = result.data;
}
```

## ⚠️ 주의사항

1. **데이터 영구 저장 불가**: localStorage는 브라우저에만 저장되므로 새 기기에서는 초기화됩니다.
2. **시연용**: 실제 프로덕션 환경에서는 백엔드 서버와 데이터베이스가 필요합니다.
3. **보안**: 비밀번호가 평문으로 저장됩니다 (시연용이므로 허용).

## 🔄 백엔드로 복원하는 방법

나중에 백엔드 서버를 다시 사용하려면:

1. `driver_front/src/contexts/AuthContext.jsx`를 원래대로 복원
2. `driver_front/src/utils/LogService.js`를 원래대로 복원
3. `driver_front/src/config/api.js`를 원래대로 복원
4. `driver_front/src/components/Dashboard.jsx`에서 API 호출 복원

## 📝 TODO

- [ ] GPU 서버 URL 환경 변수 설정
- [ ] 모델 추론 통합 테스트
- [ ] 시연 시나리오 테스트
