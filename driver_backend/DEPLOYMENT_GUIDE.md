# AWS 배포 가이드

## 🚀 배포 옵션 비교

### 1. AWS Lightsail (가장 추천 - 초보자용)
- ✅ 가장 간단함
- ✅ 월 $5부터 시작
- ✅ 자동 백업
- ✅ 고정 IP 제공
- ✅ 관리형 서비스

### 2. AWS EC2 (더 많은 제어)
- ✅ 유연한 설정
- ✅ 다양한 인스턴스 타입
- ⚠️ 직접 관리 필요
- ⚠️ 초보자에게는 복잡할 수 있음

### 3. AWS Elastic Beanstalk
- ✅ 자동 스케일링
- ✅ 로드 밸런싱
- ⚠️ 설정이 복잡할 수 있음

## 📋 방법 1: AWS Lightsail 배포 (추천)

### 1단계: Lightsail 인스턴스 생성

1. AWS 콘솔 접속: https://console.aws.amazon.com
2. Lightsail 서비스 선택
3. "인스턴스 생성" 클릭
4. 설정:
   - **인스턴스 이미지**: Node.js 선택
   - **플랜**: $5/월 (가장 저렴한 옵션)
   - **인스턴스 이름**: driver-backend
5. "인스턴스 생성" 클릭

### 2단계: 서버 접속 및 설정

```bash
# Lightsail 콘솔에서 "SSH" 버튼 클릭하거나
# 터미널에서 SSH 접속
ssh bitnami@your-instance-ip
```

### 3단계: 프로젝트 업로드

**방법 A: Git 사용 (추천)**
```bash
# 서버에서
cd /home/bitnami
git clone https://github.com/your-username/ai-2026-c-team.git
cd ai-2026-c-team/driver_backend
npm install
```

**방법 B: SCP로 파일 전송**
```bash
# 로컬 터미널에서
scp -r driver_backend bitnami@your-instance-ip:/home/bitnami/
```

### 4단계: PM2 설치 및 설정 (프로세스 관리)

```bash
# 서버에서
sudo npm install -g pm2

# 프로젝트 디렉토리로 이동
cd /home/bitnami/ai-2026-c-team/driver_backend

# .env 파일 생성
nano .env
```

`.env` 파일 내용:
```
PORT=3000
JWT_SECRET=your-very-secure-secret-key-change-this
JWT_EXPIRES_IN=1h
DB_PATH=/home/bitnami/ai-2026-c-team/driver_backend/database.db
```

### 5단계: PM2로 서버 실행

```bash
# PM2로 서버 시작
pm2 start server.js --name driver-backend

# 서버가 재시작되어도 자동으로 시작되도록 설정
pm2 startup
pm2 save

# 상태 확인
pm2 status
pm2 logs driver-backend
```

### 6단계: 방화벽 설정

Lightsail 콘솔에서:
1. 네트워킹 탭 선택
2. 방화벽 규칙 추가:
   - 포트: 3000
   - 프로토콜: TCP
   - 소스: Anywhere (0.0.0.0/0)

### 7단계: 고정 IP 설정

1. Lightsail 콘솔 → 네트워킹
2. "고정 IP 생성" 클릭
3. 인스턴스에 연결

이제 `http://your-static-ip:3000`으로 접속 가능!

---

## 📋 방법 2: AWS EC2 배포

### 1단계: EC2 인스턴스 생성

1. AWS 콘솔 → EC2
2. "인스턴스 시작" 클릭
3. 설정:
   - **AMI**: Ubuntu Server 22.04 LTS
   - **인스턴스 타입**: t2.micro (무료 티어)
   - **키 페어**: 새로 생성 (다운로드 필수!)
   - **보안 그룹**: 
     - SSH (포트 22)
     - HTTP (포트 80)
     - Custom TCP (포트 3000)
4. "인스턴스 시작" 클릭

### 2단계: 서버 접속

```bash
# 로컬 터미널에서
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3단계: Node.js 설치

```bash
# 서버에서
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 4단계: 프로젝트 설정

```bash
# Git 설치
sudo apt-get update
sudo apt-get install git -y

# 프로젝트 클론
cd /home/ubuntu
git clone https://github.com/your-username/ai-2026-c-team.git
cd ai-2026-c-team/driver_backend
npm install

# PM2 설치
sudo npm install -g pm2

# .env 파일 생성
nano .env
```

### 5단계: PM2로 실행

```bash
pm2 start server.js --name driver-backend
pm2 startup
pm2 save
```

### 6단계: 보안 그룹 확인

EC2 콘솔에서:
- 인스턴스 선택 → 보안 탭
- 포트 3000이 열려있는지 확인

---

## 🔧 PM2 명령어

```bash
# 서버 시작
pm2 start server.js --name driver-backend

# 서버 중지
pm2 stop driver-backend

# 서버 재시작
pm2 restart driver-backend

# 서버 삭제
pm2 delete driver-backend

# 로그 확인
pm2 logs driver-backend

# 상태 확인
pm2 status

# 모니터링
pm2 monit
```

---

## 🌐 도메인 연결 (선택사항)

### Route 53 사용

1. AWS Route 53에서 도메인 구매 또는 연결
2. A 레코드 생성:
   - 이름: api.yourdomain.com
   - 타입: A
   - 값: Lightsail/EC2 고정 IP

### Nginx 리버스 프록시 설정 (포트 80으로 접속)

```bash
# Nginx 설치
sudo apt-get install nginx -y

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/driver-backend
```

설정 내용:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

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

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/driver-backend /etc/nginx/sites-enabled/

# Nginx 재시작
sudo nginx -t
sudo systemctl restart nginx
```

이제 `http://api.yourdomain.com`으로 접속 가능!

---

## 🔒 HTTPS 설정 (SSL 인증서)

### Let's Encrypt 사용 (무료)

```bash
# Certbot 설치
sudo apt-get install certbot python3-certbot-nginx -y

# SSL 인증서 발급
sudo certbot --nginx -d api.yourdomain.com

# 자동 갱신 설정
sudo certbot renew --dry-run
```

이제 `https://api.yourdomain.com`으로 접속 가능!

---

## 💰 비용 예상

### AWS Lightsail
- **$5/월**: 512MB RAM, 1 vCPU, 20GB SSD
- **$10/월**: 1GB RAM, 1 vCPU, 40GB SSD (더 안정적)

### AWS EC2
- **무료 티어**: t2.micro (1년 무료)
- **유료**: t3.micro ~ $7/월

### 데이터 전송
- 첫 1TB 무료 (대부분의 경우 충분)

---

## 🚨 주의사항

### 1. 보안
- ✅ `.env` 파일에 강력한 JWT_SECRET 설정
- ✅ 데이터베이스 백업 정기적으로 수행
- ✅ 방화벽 설정 확인
- ✅ SSH 키 파일 안전하게 보관

### 2. 데이터베이스 백업

```bash
# 백업 스크립트 생성
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /home/bitnami/ai-2026-c-team/driver_backend/database.db \
   /home/bitnami/backups/database_$DATE.db
```

```bash
# 실행 권한 부여
chmod +x backup.sh

# Cron으로 매일 자동 백업
crontab -e
# 추가: 0 2 * * * /home/bitnami/backup.sh
```

### 3. 모니터링

```bash
# PM2 모니터링
pm2 monit

# 서버 리소스 확인
htop
df -h  # 디스크 사용량
free -h  # 메모리 사용량
```

---

## 🔄 업데이트 방법

```bash
# 서버 접속
ssh bitnami@your-instance-ip

# 프로젝트 디렉토리로 이동
cd /home/bitnami/ai-2026-c-team

# 최신 코드 가져오기
git pull origin main

# 백엔드 디렉토리로 이동
cd driver_backend

# 의존성 업데이트 (필요시)
npm install

# 서버 재시작
pm2 restart driver-backend

# 로그 확인
pm2 logs driver-backend
```

---

## 📱 프론트엔드에서 API 주소 변경

프론트엔드 코드에서:
```javascript
// .env 파일 또는 config 파일
const API_BASE_URL = 'http://your-server-ip:3000/api';
// 또는
const API_BASE_URL = 'https://api.yourdomain.com/api';
```

---

## 🆘 문제 해결

### 서버가 응답하지 않을 때
```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs driver-backend

# 서버 재시작
pm2 restart driver-backend
```

### 포트가 열려있지 않을 때
- Lightsail: 네트워킹 → 방화벽 규칙 확인
- EC2: 보안 그룹 → 인바운드 규칙 확인

### 데이터베이스 오류
```bash
# 데이터베이스 파일 확인
ls -lh database.db

# 권한 확인
chmod 644 database.db
```

---

## ✅ 체크리스트

배포 전:
- [ ] `.env` 파일에 강력한 JWT_SECRET 설정
- [ ] 데이터베이스 백업 스크립트 설정
- [ ] PM2로 서버 실행 확인
- [ ] 방화벽 포트 3000 열기
- [ ] 고정 IP 설정
- [ ] 도메인 연결 (선택사항)
- [ ] HTTPS 설정 (선택사항)

배포 후:
- [ ] API 엔드포인트 테스트
- [ ] 로그 모니터링
- [ ] 서버 리소스 모니터링
- [ ] 정기 백업 확인

이제 서버가 24/7 안정적으로 실행됩니다! 🚀
