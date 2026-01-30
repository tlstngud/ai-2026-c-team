# 🚗 Driver Monitoring System - Supabase 연동 가이드

## 📋 개요

이 프로젝트는 Supabase를 사용하여 사용자 인증 및 데이터 저장을 처리합니다.
localStorage 대신 Supabase PostgreSQL 데이터베이스를 사용합니다.

## 🔧 Supabase 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. 리전 선택 (한국의 경우 Northeast Asia (Seoul) 권장)

### 2. 데이터베이스 스키마 생성

1. Supabase 대시보드에서 **SQL Editor** 메뉴로 이동
2. 제공된 `database_schema.sql` 파일의 내용을 복사하여 붙여넣기
3. "Run" 버튼 클릭하여 실행

이 스크립트는 다음을 생성합니다:
- ✅ `public.users` 테이블 (사용자 프로필)
- ✅ `public.challenges` 테이블 (챌린지 정보)
- ✅ `public.user_regions` 테이블 (지역 정보)
- ✅ `public.coupons` 테이블 (쿠폰 정보)
- ✅ `public.driving_logs` 테이블 (주행 기록)
- ✅ `public.challenge_statuses` 테이블 (챌린지 참여 상태)
- ✅ 자동 트리거: `auth.users` 가입 시 `public.users` 자동 생성

### 3. 환경 변수 설정

1. `.env.example` 파일을 복사하여 `.env` 파일 생성:
   ```bash
   cp .env.example .env
   ```

2. Supabase 대시보드에서 API 키 가져오기:
   - **Settings** > **API** 메뉴로 이동
   - **Project URL** 복사
   - **Project API keys** > **anon public** 키 복사

3. `.env` 파일에 값 입력:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

### 4. Row Level Security (RLS) 정책 확인

데이터베이스 스키마 스크립트에 RLS 정책이 포함되어 있습니다.
각 테이블에 대해 다음 정책이 적용됩니다:

- **users**: 본인 데이터만 읽기/수정 가능
- **driving_logs**: 본인 로그만 생성/읽기 가능
- **coupons**: 본인 쿠폰만 읽기 가능
- **challenges**: 모든 사용자 읽기 가능
- **challenge_statuses**: 본인 참여 상태만 관리 가능

## 🚀 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 회원가입 테스트

1. 회원가입 페이지로 이동
2. 아이디, 이름, 비밀번호, 주소 입력
3. 가입 완료 후 Supabase 대시보드에서 확인:
   - **Authentication** > **Users**: `auth.users` 테이블에 사용자 추가됨
   - **Table Editor** > **users**: `public.users` 테이블에 프로필 자동 생성됨

## 📊 데이터베이스 구조

### auth.users (Supabase Auth)
- 이메일/비밀번호 인증 처리
- 회원가입 시 자동으로 생성

### public.users (프로필)
- `auth.users`와 1:1 관계 (FK: id → auth.users.id)
- 트리거를 통해 자동 생성
- 사용자 이름, 점수, 지역 정보 저장

### public.driving_logs (주행 기록)
- 사용자별 주행 데이터 저장
- GPS 이벤트, 점수, 거리, 시간 등

### public.challenges (챌린지)
- 지역별 안전운전 챌린지 정보

### public.challenge_statuses (챌린지 참여)
- 사용자의 챌린지 참여 상태 추적

### public.coupons (쿠폰)
- 챌린지 보상 쿠폰 관리

## 🔐 인증 흐름

1. **회원가입**:
   - 사용자가 아이디, 비밀번호 입력
   - `{id}@driver.local` 형식으로 이메일 변환
   - `supabase.auth.signUp()` 호출
   - 트리거가 `public.users`에 프로필 자동 생성

2. **로그인**:
   - 사용자가 아이디, 비밀번호 입력
   - `{id}@driver.local` 형식으로 이메일 변환
   - `supabase.auth.signInWithPassword()` 호출
   - `public.users`에서 프로필 정보 로드

3. **세션 관리**:
   - Supabase가 자동으로 세션 관리 (localStorage 사용)
   - `onAuthStateChange` 리스너로 상태 변경 감지

## 🛠️ 주요 파일

- `src/config/supabase.js`: Supabase 클라이언트 설정
- `src/contexts/AuthContext.jsx`: 인증 컨텍스트 (Supabase Auth 통합)
- `src/components/SignUpPage.jsx`: 회원가입 페이지
- `src/components/LoginPage.jsx`: 로그인 페이지

## 📝 참고사항

- **이메일 확인**: 기본적으로 Supabase는 이메일 확인을 요구합니다. 개발 중에는 Supabase 대시보드에서 **Authentication** > **Email Templates** > **Confirm signup** 설정을 비활성화할 수 있습니다.
- **비밀번호 정책**: 최소 6자 이상 (Supabase 기본값)
- **세션 만료**: 기본 1시간 (설정 변경 가능)

## 🐛 문제 해결

### "Invalid API key" 오류
- `.env` 파일의 `VITE_SUPABASE_ANON_KEY` 확인
- Supabase 대시보드에서 올바른 키를 복사했는지 확인

### "User already registered" 오류
- 이미 가입된 아이디입니다
- 다른 아이디로 시도하거나 로그인하세요

### 프로필이 생성되지 않음
- SQL Editor에서 트리거가 정상적으로 생성되었는지 확인
- `handle_new_user()` 함수와 `on_auth_user_created` 트리거 확인

## 📚 추가 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
