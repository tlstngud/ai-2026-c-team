# Vercel 배포 및 백엔드 연동 가이드

## 현재 상황

- ✅ 프론트엔드: Vercel에 배포됨 (https://ai-2026-c-team.vercel.app/)
- ❌ 백엔드: 아직 배포되지 않음 (로컬에서만 실행 중)
- ❌ 프론트엔드: 백엔드 API를 호출하지 않음 (localStorage만 사용)

## 바로 사용하려면?

**아니요, 바로 사용할 수 없습니다.** 다음 작업이 필요합니다:

### 1. 백엔드 서버 배포 (필수)

백엔드를 AWS Lightsail 또는 EC2에 배포해야 합니다.

**빠른 배포 방법:**
```bash
# AWS Lightsail 사용 (가장 간단)
# 1. AWS 콘솔에서 Lightsail 인스턴스 생성
# 2. Node.js 인스턴스 선택 ($5/월)
# 3. SSH 접속 후 프로젝트 배포
# 4. PM2로 서버 실행
```

**백엔드 서버 주소 예시:**
- `http://your-server-ip:3000/api`
- 또는 도메인 연결: `https://api.yourdomain.com/api`

### 2. 프론트엔드 API 연동 (필수)

현재 프론트엔드는 localStorage만 사용하고 있습니다. 백엔드 API를 호출하도록 수정해야 합니다.

**수정이 필요한 파일:**
- `src/contexts/AuthContext.jsx` - 로그인/회원가입 API 호출
- `src/utils/LogService.js` - 주행 기록 API 호출
- `src/components/Dashboard.jsx` - 쿠폰, 챌린지 API 호출

### 3. 환경 변수 설정

Vercel에서 환경 변수 설정:

1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 추가:
   - `VITE_API_BASE_URL` = `https://your-backend-server.com/api`

### 4. 프론트엔드 재배포

환경 변수 설정 후 재배포:
```bash
git push origin main
# Vercel이 자동으로 재배포
```

## 현재 상태로 사용 가능한 기능

현재 프론트엔드는 **localStorage 기반**으로 동작하므로:

✅ **로컬에서만 작동**
- 브라우저의 localStorage에 데이터 저장
- 다른 기기에서 접속하면 데이터가 없음
- 브라우저를 지우면 데이터 삭제

❌ **Vercel 배포 사이트에서는:**
- 각 사용자가 독립적인 localStorage 사용
- 서버에 데이터 저장 안 됨
- 실제 서비스로는 부적합

## 권장 작업 순서

### 옵션 1: 빠른 데모용 (localStorage 유지)
- 현재 상태 그대로 사용
- 각 사용자가 독립적으로 사용
- 실제 서비스에는 부적합

### 옵션 2: 완전한 서비스 (백엔드 연동) ⭐ 추천

1. **백엔드 배포** (AWS Lightsail)
   - `DEPLOYMENT_GUIDE.md` 참고
   - 서버 주소: `http://your-ip:3000`

2. **프론트엔드 API 연동**
   - AuthContext를 API 호출로 변경
   - LogService를 API 호출로 변경
   - 모든 데이터를 백엔드에서 가져오도록 수정

3. **환경 변수 설정**
   - Vercel에 `VITE_API_BASE_URL` 추가
   - 백엔드 서버 주소 입력

4. **재배포**
   - Git push로 자동 배포

## 백엔드 배포 후 확인

```bash
# 백엔드 서버 확인
curl http://your-server-ip:3000/api/health

# 프론트엔드에서 테스트
# 브라우저 콘솔에서:
fetch('http://your-server-ip:3000/api/health')
  .then(r => r.json())
  .then(console.log)
```

## CORS 설정 확인

백엔드 서버의 CORS 설정이 Vercel 도메인을 허용해야 합니다:

```javascript
// driver_backend/server.js
app.use(cors({
  origin: [
    'https://ai-2026-c-team.vercel.app',
    'http://localhost:5173'  // 개발 환경
  ]
}));
```

## 요약

**현재 상태:** ❌ 바로 사용 불가
- 프론트엔드는 배포됨
- 백엔드는 배포 필요
- API 연동 코드 필요

**사용 가능하게 하려면:**
1. 백엔드 서버 배포 (AWS Lightsail)
2. 프론트엔드 API 연동 코드 작성
3. Vercel 환경 변수 설정
4. 재배포

**예상 소요 시간:** 2-3시간

백엔드 배포부터 진행할까요, 아니면 프론트엔드 API 연동 코드를 먼저 작성할까요?
