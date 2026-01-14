# EC2 HTTPS 설정 가이드 (Amazon Linux 2023)

## ⚠️ 중요: Amazon Linux 2023은 `dnf`를 사용합니다!

`apt`가 아니라 `dnf` 명령어를 사용해야 합니다.

## 빠른 설정 (Self-Signed 인증서)

### 1단계: Nginx 설치

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

### 2단계: Nginx 리버스 프록시 설정

```bash
sudo nano /etc/nginx/nginx.conf
```

기존 `server` 블록을 찾아서 다음으로 교체하거나, `http` 블록 안에 추가:

```nginx
server {
    listen 80;
    server_name 15.134.130.219;

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

또는 별도 파일로 생성:

```bash
sudo nano /etc/nginx/conf.d/driver-backend.conf
```

위 내용 입력 후 저장.

### 3단계: 설정 테스트 및 재시작

```bash
# 설정 문법 확인
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx
```

### 4단계: Self-Signed SSL 인증서 생성

```bash
# SSL 디렉토리 생성
sudo mkdir -p /etc/nginx/ssl

# 인증서 생성
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx-selfsigned.key \
  -out /etc/nginx/ssl/nginx-selfsigned.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=DriverApp/CN=15.134.130.219"
```

### 5단계: HTTPS 설정 추가

```bash
sudo nano /etc/nginx/conf.d/driver-backend.conf
```

전체 내용을 다음으로 교체:

```nginx
# HTTP를 HTTPS로 리다이렉트
server {
    listen 80;
    server_name 15.134.130.219;
    return 301 https://$server_name$request_uri;
}

# HTTPS 서버
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

저장: `Ctrl + X` → `Y` → `Enter`

### 6단계: 설정 적용

```bash
# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx
```

### 7단계: Security Group 설정

AWS 콘솔에서:
1. EC2 → Instances → Security Groups
2. 인바운드 규칙 편집
3. 규칙 추가:
   - Type: HTTPS
   - Port: 443
   - Source: 0.0.0.0/0
4. 저장

### 8단계: 테스트

```bash
# HTTP 테스트 (리다이렉트 확인)
curl -I http://15.134.130.219/api/health

# HTTPS 테스트 (self-signed이므로 -k 옵션 사용)
curl -k https://15.134.130.219/api/health
```

성공하면 `{"status":"OK","message":"서버가 정상적으로 작동 중입니다"}` 응답이 나옵니다.

## Let's Encrypt 사용 (도메인 필요)

도메인이 있다면:

```bash
# Certbot 설치
sudo dnf install certbot python3-certbot-nginx -y

# SSL 인증서 자동 발급 및 설정
sudo certbot --nginx -d api.yourdomain.com
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
```

### SELinux 문제 (Amazon Linux 2023)

```bash
# HTTP 프록시 허용
sudo setsebool -P httpd_can_network_connect 1
```

## 완료 후

1. ✅ Vercel 환경 변수 업데이트: `VITE_API_BASE_URL=https://15.134.130.219/api`
2. ✅ 프론트엔드 재배포
3. ✅ 브라우저에서 테스트

**참고:** Self-signed 인증서는 브라우저에서 경고가 표시됩니다. 프로덕션에서는 Let's Encrypt 사용을 권장합니다.
