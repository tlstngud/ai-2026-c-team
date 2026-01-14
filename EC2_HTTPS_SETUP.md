# EC2 HTTPS 설정 가이드

## 사전 준비사항

### 옵션 1: 도메인 사용 (권장)
- 도메인이 있으면 Let's Encrypt로 무료 SSL 인증서 발급 가능
- 예: `api.yourdomain.com`

### 옵션 2: IP 주소만 사용
- Self-signed 인증서 사용 (브라우저 경고 발생)
- 테스트용으로만 사용 권장

## 단계별 설정

### 1단계: EC2에 접속

EC2 Instance Connect 또는 SSH로 접속

### 2단계: Nginx 설치

**Amazon Linux 2023은 `dnf`를 사용합니다!**

```bash
# 시스템 업데이트
sudo dnf update -y

# Nginx 설치
sudo dnf install nginx -y

# Nginx 시작
sudo systemctl start nginx
sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx
```

### 3단계: Node.js 서버 포트 확인

현재 서버가 포트 3000에서 실행 중인지 확인:

```bash
pm2 status
# 또는
netstat -tlnp | grep 3000
```

### 4단계: Nginx 리버스 프록시 설정

#### 4-1. 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/driver-backend
```

#### 4-2. 다음 내용 입력 (HTTP용 - 먼저 설정)

```nginx
server {
    listen 80;
    server_name 15.134.130.219;  # 또는 도메인 사용 시: api.yourdomain.com

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

#### 4-3. 심볼릭 링크 생성

```bash
sudo ln -s /etc/nginx/sites-available/driver-backend /etc/nginx/sites-enabled/
```

#### 4-4. 기본 설정 제거 (선택사항)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

#### 4-5. 설정 테스트

```bash
sudo nginx -t
```

#### 4-6. Nginx 재시작

```bash
sudo systemctl restart nginx
```

### 5단계: SSL 인증서 설정

#### 옵션 A: Let's Encrypt 사용 (도메인 필요) ⭐ 권장

```bash
# Certbot 설치 (Amazon Linux 2023)
sudo dnf install certbot python3-certbot-nginx -y

# SSL 인증서 발급 (도메인 사용 시)
sudo certbot --nginx -d api.yourdomain.com

# 또는 IP 주소만 사용하는 경우는 Let's Encrypt 불가
# 옵션 B로 진행
```

Certbot이 자동으로:
- SSL 인증서 발급
- Nginx 설정 자동 업데이트
- 자동 갱신 설정

#### 옵션 B: Self-Signed 인증서 (IP 주소만 사용)

```bash
# OpenSSL로 인증서 생성
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx-selfsigned.key \
  -out /etc/nginx/ssl/nginx-selfsigned.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=DriverApp/CN=15.134.130.219"
```

Nginx 설정 파일 수정:

```bash
sudo nano /etc/nginx/sites-available/driver-backend
```

다음과 같이 수정:

```nginx
server {
    listen 80;
    server_name 15.134.130.219;
    return 301 https://$server_name$request_uri;  # HTTP를 HTTPS로 리다이렉트
}

server {
    listen 443 ssl;
    server_name 15.134.130.219;

    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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

설정 테스트 및 재시작:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 6단계: Security Group 설정

AWS 콘솔에서 EC2 Security Group 수정:

1. **인바운드 규칙 추가:**
   - Type: HTTPS
   - Port: 443
   - Source: 0.0.0.0/0

2. **HTTP 포트 (80)도 열어두기** (Let's Encrypt 인증용)

### 7단계: 테스트

```bash
# HTTP 테스트
curl http://15.134.130.219/api/health

# HTTPS 테스트
curl -k https://15.134.130.219/api/health
# -k 옵션: self-signed 인증서 검증 건너뛰기
```

### 8단계: 프론트엔드 설정 업데이트

Vercel 환경 변수 수정:

```
VITE_API_BASE_URL=https://15.134.130.219/api
```

또는 도메인을 사용하는 경우:

```
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

## 문제 해결

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

# 필요 시 다른 서비스 중지
```

### Self-Signed 인증서 브라우저 경고

- Chrome: "고급" → "안전하지 않음으로 이동" 클릭
- 개발/테스트용으로만 사용
- 프로덕션에서는 Let's Encrypt 사용 권장

## 자동 갱신 설정 (Let's Encrypt)

Let's Encrypt 인증서는 90일마다 갱신 필요:

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신은 systemd timer로 자동 설정됨
sudo systemctl status certbot.timer
```

## 완료 확인

1. ✅ Nginx가 포트 80, 443에서 실행 중
2. ✅ HTTPS로 API 접근 가능
3. ✅ 프론트엔드에서 Mixed Content 오류 없음
4. ✅ 브라우저에서 `https://15.134.130.219/api/health` 접근 가능

## 다음 단계

1. 프론트엔드 환경 변수 업데이트
2. Vercel 재배포
3. 테스트
