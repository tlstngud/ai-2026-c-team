# PWA 및 iOS 카메라 테스트 가이드

## 🚀 빠른 시작

### 방법 1: Vercel 배포 URL 사용 (가장 쉬움)
이미 Vercel에 배포되어 있다면:
1. Vercel 대시보드에서 배포된 URL 확인
2. iOS Safari에서 해당 URL 접속
3. 공유 버튼 → "홈 화면에 추가" 선택
4. 홈 화면 아이콘으로 실행하면 카메라 사용 가능

### 방법 2: ngrok 사용 (로컬 HTTPS 터널)

#### 1단계: 개발 서버 실행
```bash
npm run dev
```

#### 2단계: 새 터미널에서 ngrok 실행
```bash
ngrok http 5173
```

#### 3단계: iOS에서 접속
1. ngrok이 제공하는 HTTPS URL 복사 (예: `https://xxxx.ngrok.io`)
2. iOS Safari에서 해당 URL 접속
3. 공유 버튼 → "홈 화면에 추가" 선택
4. 홈 화면 아이콘으로 실행

### 방법 3: 로컬 네트워크 접속 (카메라 제한)

같은 WiFi에 연결된 경우:
1. Mac의 로컬 IP 주소 확인:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
2. 개발 서버 실행:
   ```bash
   npm run dev:tunnel
   ```
3. iOS Safari에서 `http://[Mac의 IP]:5173` 접속

⚠️ **주의**: 로컬 HTTP는 카메라 접근이 제한될 수 있습니다. iOS에서 카메라를 사용하려면 HTTPS가 필요합니다.

## 📱 iOS에서 PWA 설치하기

1. Safari에서 웹앱 접속
2. 하단 공유 버튼(□↑) 탭
3. "홈 화면에 추가" 선택
4. 이름 확인 후 "추가" 탭
5. 홈 화면에서 앱 아이콘으로 실행

## ✅ PWA 기능 확인

- ✅ Service Worker 자동 등록
- ✅ 오프라인 지원
- ✅ 홈 화면 추가 가능
- ✅ iOS 카메라 접근 지원
- ✅ Standalone 모드 (앱처럼 실행)

## 🔧 문제 해결

### 카메라가 작동하지 않는 경우:
1. HTTPS 연결 확인 (필수)
2. iOS Safari에서 권한 요청 확인
3. 설정 → Safari → 카메라 권한 확인

### PWA가 설치되지 않는 경우:
1. manifest.json 파일 확인
2. Service Worker 등록 확인 (개발자 도구 → Application → Service Workers)
3. HTTPS 연결 확인
