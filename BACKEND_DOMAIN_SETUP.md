# 백엔드 도메인 설정 가이드 (api.c-team.cloud)

이 가이드는 `api.c-team.cloud`를 EC2 서버(`15.134.130.219`)에 연결하는 단계별 가이드입니다.

---

## 📋 1단계: DNS 설정 (도메인 관리자에서)

### 도메인 관리자 찾기
- Vercel에서 도메인을 구매했다면: Vercel 대시보드 → Domains → `c-team.cloud` → DNS Records
- 다른 DNS 서비스를 사용한다면: 해당 서비스의 DNS 관리 페이지로 이동

### A 레코드 추가
1. DNS 레코드 추가 버튼 클릭
2. 다음 정보 입력:
   - **타입**: `A`
   - **이름**: `api` (또는 `api.c-team.cloud`)
   - **값/값**: `15.134.130.219` (EC2 IP 주소)
   - **TTL**: `300` (또는 기본값)
3. 저장

### 확인
DNS 전파는 몇 분에서 최대 48시간까지 걸릴 수 있습니다. 확인 방법:

```bash
# 터미널에서 확인
nslookup api.c-team.cloud
# 또는
dig api.c-team.cloud
```

IP 주소가 `15.134.130.219`로 나오면 성공입니다.

**⚠️ 중요**: DNS 전파가 완료될 때까지 기다려야 합니다. 보통 5-30분 정도 걸립니다.

---

## 📋 2단계: EC2 Security Group 설정

### AWS 콘솔에서 설정
1. AWS 콘솔 접속: https://console.aws.amazon.com
2. EC2 서비스 선택
3. 왼쪽 메뉴에서 **Security Groups** 클릭
4. EC2 인스턴스에 연결된 보안 그룹 선택

### 인바운드 규칙 추가
**규칙 1: HTTP (포트 80)**
- **Type**: HTTP
- **Port**: 80
- **Source**: 0.0.0.0/0
- **Description**: Let's Encrypt 인증용

**규칙 2: HTTPS (포트 443)**
- **Type**: HTTPS
- **Port**: 443
- **Source**: 0.0.0.0/0
- **Description**: HTTPS API 접근용

5. **Save rules** 클릭

---

## 📋 3단계: EC2에 접속 및 Nginx 설치

### EC2 접속
```bash
# SSH로 접속 (키 파일 경로는 본인의 것으로 변경)
ssh -i your-key.pem ec2-user@15.134.130.219
```

### Nginx 설치 (Amazon Linux 2023)
```bash
# 시스템 업데이트
sudo dnf update -y

# Nginx 설치
sudo dnf install nginx -y

# Nginx 시작
sudo systemctl start nginx

# 부팅 시 자동 시작 설정
sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx
```

✅ `active (running)` 상태가 보이면 성공입니다.

---

## 📋 4단계: Node.js 서버 상태 확인

백엔드 서버가 포트 3000에서 실행 중인지 확인:

```bash
# PM2로 실행 중인지 확인
pm2 status

# 또는 포트 확인
sudo netstat -tlnp | grep 3000
```

✅ 서버가 실행 중이어야 합니다. 실행 중이 아니라면:
```bash
cd /path/to/driver_backend
pm2 start server.js --name driver-backend
```

---

## 📋 5단계: Nginx 리버스 프록시 설정 (HTTP)

### 설정 파일 생성
Amazon Linux 2023은 `/etc/nginx/conf.d/` 디렉토리를 사용합니다:

```bash
sudo nano /etc/nginx/conf.d/driver-backend.conf
```

### 다음 내용 입력:
```nginx
server {
    listen 80;
    server_name api.c-team.cloud;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 저장
- `Ctrl + X` → `Y` → `Enter`

### 설정 테스트
```bash
# Nginx 설정 문법 확인
sudo nginx -t
```

✅ `syntax is ok` 메시지가 나오면 성공입니다.

### Nginx 재시작
```bash
sudo systemctl restart nginx
```

### HTTP 테스트
```bash
# 로컬에서 테스트
curl http://api.c-team.cloud/api/health
```

✅ 응답이 나오면 성공입니다. (DNS 전파가 완료되지 않았다면 IP로 테스트: `curl http://15.134.130.219/api/health`)

---

## 📋 6단계: Let's Encrypt SSL 인증서 발급

### Certbot 설치
```bash
sudo dnf install certbot python3-certbot-nginx -y
```

### SSL 인증서 자동 발급 및 설정
```bash
sudo certbot --nginx -d api.c-team.cloud
```

### Certbot 질문에 답변:
1. **Email 주소 입력**: 인증서 만료 알림을 받을 이메일
2. **Terms of Service 동의**: `Y` 입력
3. **이메일 공유 여부**: 원하는 대로 선택 (보통 `N`)
4. **HTTP를 HTTPS로 리다이렉트**: `2` 선택 (권장)

### 자동 갱신 설정 확인
```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신 타이머 상태 확인
sudo systemctl status certbot.timer
```

✅ 인증서가 자동으로 발급되고 Nginx 설정이 업데이트됩니다.

---

## 📋 7단계: 테스트 및 확인

### HTTPS 테스트
```bash
# 터미널에서 테스트
curl https://api.c-team.cloud/api/health
```

✅ JSON 응답이 나오면 성공입니다!

### 브라우저에서 테스트
1. 브라우저에서 `https://api.c-team.cloud/api/health` 접속
2. 자물쇠 아이콘(🔒)이 보이면 SSL 인증서가 정상 작동 중입니다.

### Nginx 설정 확인
Certbot이 자동으로 설정을 업데이트했는지 확인:

```bash
sudo cat /etc/nginx/conf.d/driver-backend.conf
```

✅ HTTP(포트 80)에서 HTTPS(포트 443)로 리다이렉트 설정이 자동으로 추가되어 있어야 합니다.

---

## 📋 8단계: 프론트엔드 API 주소 업데이트

### Vercel 환경 변수 설정
1. Vercel 대시보드 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 다음 변수 추가/수정:
   ```
   VITE_API_BASE_URL = https://api.c-team.cloud/api
   ```
4. **Environment**: Production, Preview, Development 모두 선택
5. **Save** 클릭

### Vercel 재배포
환경 변수를 변경했으므로 재배포가 필요합니다:

1. Vercel 대시보드 → **Deployments**
2. 최신 배포의 **⋯** 메뉴 → **Redeploy**

또는 Git에 커밋 후 자동 배포를 기다립니다.

---

## ✅ 완료 확인 체크리스트

- [ ] DNS에 `api.c-team.cloud` A 레코드 추가 완료
- [ ] DNS 전파 확인 (`nslookup api.c-team.cloud`)
- [ ] EC2 Security Group에 포트 80, 443 열림
- [ ] Nginx 설치 및 실행 중
- [ ] Node.js 서버가 포트 3000에서 실행 중
- [ ] HTTP로 접근 가능 (`http://api.c-team.cloud/api/health`)
- [ ] Let's Encrypt SSL 인증서 발급 완료
- [ ] HTTPS로 접근 가능 (`https://api.c-team.cloud/api/health`)
- [ ] 브라우저에서 자물쇠 아이콘 확인
- [ ] Vercel 환경 변수 업데이트 완료
- [ ] 프론트엔드 재배포 완료

---

## 🚨 문제 해결

### DNS가 전파되지 않을 때
- 30분~1시간 정도 기다려보세요
- 다른 DNS 서버로 확인: `dig @8.8.8.8 api.c-team.cloud`

### Certbot 인증서 발급 실패
- DNS 전파가 완료되었는지 확인
- 포트 80이 열려있는지 확인
- 방화벽이 포트 80을 막고 있지 않은지 확인

### Nginx가 시작되지 않을 때
```bash
# 오류 로그 확인
sudo tail -f /var/log/nginx/error.log

# 설정 파일 문법 확인
sudo nginx -t
```

### 포트가 이미 사용 중일 때
```bash
# 포트 사용 확인
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

---

## 📝 다음 단계

모든 설정이 완료되면:
1. 프론트엔드에서 API 호출 테스트
2. 브라우저 개발자 도구에서 Mixed Content 오류 확인
3. 프로덕션 환경에서 전체 기능 테스트
