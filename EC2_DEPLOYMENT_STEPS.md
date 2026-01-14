# EC2 인스턴스에 백엔드 배포 가이드

## 현재 상태
- ✅ EC2 인스턴스 생성 완료
- ✅ 인스턴스 ID: `i-0577bbe710e991e38`
- ✅ 퍼블릭 IP: `15.134.130.219`
- ✅ 상태: 실행 중

## 다음 단계

### 1단계: EC2 콘솔에서 "연결" 버튼 클릭

EC2 콘솔에서:
1. 인스턴스 선택 (`ai_bootcamp`)
2. 상단의 **"연결"** 버튼 클릭
3. "SSH 클라이언트" 탭 선택
4. SSH 명령어 복사 (예시):
   ```bash
   ssh -i "your-key.pem" ubuntu@15.134.130.219
   ```

### 2단계: 로컬 터미널에서 SSH 접속

**Mac/Linux:**
```bash
# 키 파일 권한 설정
chmod 400 your-key.pem

# SSH 접속
ssh -i "your-key.pem" ubuntu@15.134.130.219
```

**Windows (PowerShell):**
```powershell
# 키 파일이 있는 폴더로 이동
cd C:\path\to\key

# SSH 접속
ssh -i "your-key.pem" ubuntu@15.134.130.219
```

### 3단계: 서버에 Node.js 설치

SSH 접속 후:
```bash
# 시스템 업데이트
sudo apt-get update

# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 설치 확인
node --version
npm --version

# Git 설치
sudo apt-get install git -y
```

### 4단계: 프로젝트 업로드

**방법 A: Git 사용 (추천)**
```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론
git clone https://github.com/your-username/ai-2026-c-team.git
cd ai-2026-c-team/driver_backend

# 의존성 설치
npm install
```

**방법 B: SCP로 파일 전송**
```bash
# 로컬 터미널에서 (Mac/Linux)
scp -i "your-key.pem" -r driver_backend ubuntu@15.134.130.219:~/

# Windows (PowerShell)
scp -i "your-key.pem" -r driver_backend ubuntu@15.134.130.219:~/
```

### 5단계: 환경 변수 설정

```bash
# 백엔드 디렉토리로 이동
cd ~/ai-2026-c-team/driver_backend

# .env 파일 생성
nano .env
```

`.env` 파일 내용:
```
PORT=3000
JWT_SECRET=your-very-secure-secret-key-change-this-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
DB_PATH=/home/ubuntu/ai-2026-c-team/driver_backend/database.db
```

저장: `Ctrl + X`, `Y`, `Enter`

### 6단계: PM2 설치 및 서버 실행

```bash
# PM2 설치
sudo npm install -g pm2

# 서버 시작
pm2 start server.js --name driver-backend

# 서버가 재시작되어도 자동으로 시작되도록 설정
pm2 startup
# 위 명령어가 출력하는 명령어를 복사해서 실행 (예: sudo env PATH=...)
pm2 save

# 상태 확인
pm2 status
pm2 logs driver-backend
```

### 7단계: 보안 그룹 설정 (포트 3000 열기)

EC2 콘솔에서:
1. 인스턴스 선택
2. "보안" 탭 클릭
3. 보안 그룹 이름 클릭
4. "인바운드 규칙" 탭 → "규칙 편집"
5. 규칙 추가:
   - **유형**: 사용자 지정 TCP
   - **포트**: 3000
   - **소스**: 0.0.0.0/0 (모든 IP 허용)
6. "규칙 저장" 클릭

### 8단계: 서버 테스트

로컬 터미널에서:
```bash
# Health check
curl http://15.134.130.219:3000/api/health

# 또는 브라우저에서
# http://15.134.130.219:3000/api/health
```

### 9단계: 프론트엔드 환경 변수 설정

Vercel 대시보드에서:
1. 프로젝트 선택
2. Settings → Environment Variables
3. 추가:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `http://15.134.130.219:3000/api`
4. 재배포

## 완료!

이제 다음 주소로 접속 가능:
- **백엔드 API**: `http://15.134.130.219:3000/api`
- **데이터베이스 관리자**: `http://15.134.130.219:3000/admin`
- **프론트엔드**: `https://ai-2026-c-team.vercel.app/`

## 문제 해결

### SSH 접속이 안 될 때
- 키 파일 경로 확인
- 키 파일 권한 확인 (`chmod 400`)
- 보안 그룹에서 SSH(포트 22) 허용 확인

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
- EC2 보안 그룹에서 포트 3000 인바운드 규칙 확인
- 방화벽 확인: `sudo ufw status`

## 다음 단계

1. ✅ EC2 인스턴스 생성 완료
2. ⏳ SSH 접속
3. ⏳ Node.js 설치
4. ⏳ 프로젝트 업로드
5. ⏳ 서버 실행
6. ⏳ 보안 그룹 설정
7. ⏳ 프론트엔드 연동

지금 **"연결" 버튼을 클릭**해서 SSH 접속 방법을 확인하세요!
