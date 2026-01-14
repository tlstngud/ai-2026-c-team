# 프론트엔드-백엔드 연동 가이드

## ✅ 완료된 작업

1. **API 헬퍼 함수 생성** (`driver_front/src/utils/api.js`)
   - 토큰 관리 (getToken, setToken, removeToken)
   - API 요청 래퍼 함수 (apiGet, apiPost, apiPut, apiDelete)
   - 각 API 그룹별 헬퍼 함수 (authAPI, userAPI, drivingLogAPI, couponAPI, challengeAPI)

2. **인증 시스템 연동** (`driver_front/src/contexts/AuthContext.jsx`)
   - 회원가입: API 호출로 변경
   - 로그인: API 호출로 변경, JWT 토큰 저장
   - 로그아웃: API 호출로 변경, 토큰 제거
   - 초기 로드 시 토큰 확인 및 사용자 정보 가져오기

3. **주행 기록 연동** (`driver_front/src/utils/LogService.js`)
   - 주행 기록 저장: API 호출로 변경
   - 주행 기록 조회: API 호출로 변경

4. **쿠폰 시스템 연동** (`driver_front/src/components/Dashboard.jsx`)
   - 쿠폰 목록: API에서 불러오기
   - 쿠폰 발급: API 호출로 변경

5. **챌린지 시스템 연동** (`driver_front/src/components/InsurancePage.jsx`)
   - 챌린지 정보: API에서 불러오기
   - 챌린지 상세: API 데이터 사용

## 🔧 환경 변수 설정

프론트엔드에서 백엔드 API 주소를 설정해야 합니다.

### 1. Vercel 환경 변수 설정

1. Vercel 대시보드 접속
2. 프로젝트 선택 → Settings → Environment Variables
3. 다음 변수 추가:
   ```
   VITE_API_BASE_URL = http://15.134.130.219:3000/api
   ```
4. Environment 선택: Production, Preview, Development 모두 선택
5. Save 클릭

### 2. 로컬 개발 환경 설정

프로젝트 루트에 `.env.local` 파일 생성 (이미 생성됨):

```env
VITE_API_BASE_URL=http://15.134.130.219:3000/api
```

또는 로컬 백엔드 서버를 사용하려면:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**참고:** `.env.local` 파일은 git에 커밋되지 않습니다.

## 📋 API 엔드포인트 목록

### 인증 API
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃

### 사용자 API
- `GET /api/users/me` - 내 정보 조회
- `PUT /api/users/me` - 내 정보 수정
- `PUT /api/users/me/password` - 비밀번호 변경
- `GET /api/users/me/statistics` - 통계 조회

### 주행 기록 API
- `POST /api/driving-logs` - 주행 기록 저장
- `GET /api/driving-logs` - 주행 기록 목록 조회
- `GET /api/driving-logs/:id` - 주행 기록 상세 조회
- `DELETE /api/driving-logs/:id` - 주행 기록 삭제

### 쿠폰 API
- `GET /api/coupons` - 쿠폰 목록 조회
- `POST /api/coupons/issue` - 쿠폰 발급
- `POST /api/coupons/:id/use` - 쿠폰 사용
- `GET /api/coupons/:id` - 쿠폰 상세 조회

### 챌린지 API
- `GET /api/challenges` - 챌린지 목록 조회
- `GET /api/challenges/:id` - 챌린지 상세 조회
- `POST /api/challenges/:id/join` - 챌린지 참여
- `GET /api/challenges/:id/status` - 챌린지 참여 상태 조회

## 🚀 테스트 방법

1. **회원가입 테스트**
   - 회원가입 페이지에서 새 계정 생성
   - 백엔드에서 사용자 생성 확인

2. **로그인 테스트**
   - 생성한 계정으로 로그인
   - JWT 토큰이 localStorage에 저장되는지 확인

3. **주행 기록 테스트**
   - 주행 시작 → 종료
   - 주행 기록이 API를 통해 저장되는지 확인

4. **쿠폰 테스트**
   - 챌린지 완료 후 쿠폰 발급
   - 쿠폰함에서 쿠폰 확인

5. **챌린지 테스트**
   - 우리동네 페이지에서 챌린지 정보 확인
   - 챌린지 상세 페이지 확인

## ⚠️ 주의사항

1. **CORS 설정**
   - 백엔드에서 프론트엔드 도메인을 허용해야 합니다.
   - `driver_backend/server.js`의 CORS 설정 확인

2. **HTTPS 설정**
   - 프로덕션에서는 HTTPS를 사용해야 합니다.
   - EC2에서 HTTPS 설정 (Let's Encrypt 등)

3. **토큰 만료 처리**
   - 현재는 토큰 만료 시 자동 갱신이 없습니다.
   - 필요 시 refresh token 로직 추가

4. **에러 처리**
   - 네트워크 오류 시 사용자에게 알림 표시
   - API 오류 메시지 표시

## 🔍 디버깅

### 브라우저 개발자 도구
- Network 탭에서 API 요청 확인
- Console 탭에서 오류 메시지 확인
- Application 탭에서 localStorage의 토큰 확인

### 백엔드 로그 확인
```bash
# EC2에서 PM2 로그 확인
pm2 logs driver-backend
```

## 📝 다음 단계

1. EC2 공개 IP 주소 확인 및 환경 변수 설정
2. CORS 설정 확인
3. HTTPS 설정 (선택사항)
4. 에러 처리 개선
5. 로딩 상태 표시 개선
