# Vercel 환경 변수 설정 가이드

## EC2 백엔드 서버 주소
```
http://15.134.130.219:3000/api
```

## Vercel 환경 변수 설정 방법

### 1단계: Vercel 대시보드 접속
1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 (`ai-2026-c-team` 또는 해당 프로젝트)

### 2단계: 환경 변수 추가
1. **Settings** 탭 클릭
2. 왼쪽 메뉴에서 **Environment Variables** 클릭
3. **Add New** 버튼 클릭

### 3단계: 변수 입력
- **Name**: `VITE_API_BASE_URL`
- **Value**: `http://15.134.130.219:3000/api`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development
  (모두 체크)

### 4단계: 저장
1. **Save** 버튼 클릭
2. 변경사항 적용을 위해 **Redeploy** 필요

## 배포 후 확인

환경 변수 설정 후 다음을 확인하세요:

1. **새 배포 트리거**
   - Vercel 대시보드에서 **Deployments** 탭
   - 최신 배포 옆 **⋯** 메뉴 → **Redeploy**

2. **환경 변수 확인**
   - 배포 로그에서 환경 변수가 제대로 로드되었는지 확인
   - 브라우저 개발자 도구 → Network 탭에서 API 요청 확인

3. **API 연결 테스트**
   - 앱에서 회원가입/로그인 시도
   - Network 탭에서 `15.134.130.219:3000`으로 요청이 가는지 확인

## 문제 해결

### CORS 오류 발생 시
백엔드 서버의 CORS 설정을 확인하세요:
- `driver_backend/server.js`에서 `app.use(cors())` 확인
- 필요 시 특정 도메인만 허용하도록 수정

### 연결 실패 시
1. EC2 인스턴스가 실행 중인지 확인
2. Security Group에서 포트 3000이 열려있는지 확인
3. EC2에서 서버가 정상 실행 중인지 확인:
   ```bash
   pm2 status
   pm2 logs driver-backend
   ```

## 로컬 개발 환경

로컬에서 개발할 때는 `.env.local` 파일을 사용합니다:

```env
VITE_API_BASE_URL=http://15.134.130.219:3000/api
```

또는 로컬 백엔드를 실행 중이라면:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**참고:** `.env.local` 파일은 git에 커밋되지 않으므로 각 개발자가 직접 생성해야 합니다.
