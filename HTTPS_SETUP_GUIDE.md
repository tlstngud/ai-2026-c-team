# HTTPS 설정 가이드

## 문제 상황
Vercel (HTTPS)에서 EC2 서버 (HTTP)로 API 요청 시 Mixed Content 오류 발생

## 해결 방법

### 방법 1: EC2에 HTTPS 설정 (권장)

#### 1-1. 도메인 설정 (선택사항)
- Route 53 또는 다른 DNS 서비스 사용
- EC2 IP에 도메인 연결

#### 1-2. Let's Encrypt로 무료 SSL 인증서 발급
```bash
# EC2에 접속 후
sudo apt update
sudo apt install certbot

# Nginx 설치 (또는 기존 웹서버 사용)
sudo apt install nginx

# Certbot으로 인증서 발급
sudo certbot certonly --standalone -d your-domain.com
```

#### 1-3. Nginx 리버스 프록시 설정
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 방법 2: 임시 해결책 - 프로토콜 자동 감지

프론트엔드에서 현재 페이지의 프로토콜을 감지하여 API 요청 시 동일한 프로토콜 사용:

```javascript
// 프로덕션에서는 HTTPS, 개발에서는 HTTP
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     (window.location.protocol === 'https:'
                       ? 'https://15.134.130.219:3000/api'
                       : 'http://localhost:3000/api');
```

**주의:** 이 방법은 EC2 서버가 HTTPS를 지원해야 합니다.

### 방법 3: AWS Application Load Balancer 사용

1. AWS ALB 생성
2. SSL 인증서 설정 (ACM 사용)
3. EC2 인스턴스를 타겟으로 등록
4. ALB의 HTTPS 엔드포인트 사용

### 방법 4: Cloudflare 사용 (가장 빠름)

1. Cloudflare 계정 생성
2. 도메인 추가 (또는 서브도메인)
3. DNS 설정: A 레코드로 EC2 IP 연결
4. SSL/TLS 설정: Full (strict) 모드
5. 프록시 활성화

## 빠른 임시 해결책

현재 상황에서 가장 빠른 해결책은 **프론트엔드에서 프로토콜을 자동 감지**하는 것입니다.

하지만 EC2 서버가 HTTPS를 지원하지 않으면 작동하지 않으므로, 다음 중 하나를 선택해야 합니다:

1. **EC2에 간단한 HTTPS 프록시 설정** (Nginx + Let's Encrypt)
2. **Cloudflare 사용** (가장 빠르고 간단)
3. **AWS ALB 사용** (AWS 네이티브 솔루션)

## 권장 순서

1. **즉시**: Cloudflare 사용 (약 10분)
2. **장기**: EC2에 직접 HTTPS 설정 (더 많은 제어)

## Cloudflare 설정 예시

1. Cloudflare 계정 생성
2. 도메인 추가 (예: `api.yourdomain.com`)
3. DNS → A 레코드 추가:
   - Name: `api`
   - IPv4: `15.134.130.219`
   - Proxy: 활성화 (주황색 구름)
4. SSL/TLS → Overview → Full (strict)
5. 프론트엔드 API URL 변경:
   ```
   https://api.yourdomain.com/api
   ```
