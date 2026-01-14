# 데이터베이스 실시간 조회 가이드

SQLite 데이터베이스를 실시간으로 볼 수 있는 여러 방법을 안내합니다.

## 방법 1: DB Browser for SQLite (가장 추천)

### 설치
- **Mac**: https://sqlitebrowser.org/dl/ 에서 다운로드
- **Windows**: 위 사이트에서 다운로드
- **Linux**: `sudo apt-get install sqlitebrowser`

### 사용 방법
1. DB Browser for SQLite 실행
2. "데이터베이스 열기" 클릭
3. `driver_backend/database.db` 파일 선택
4. "데이터 탐색" 탭에서 테이블 선택
5. 실시간으로 데이터 확인 가능!

**장점:**
- ✅ 무료
- ✅ GUI로 쉽게 사용
- ✅ 데이터 수정 가능
- ✅ SQL 쿼리 실행 가능

---

## 방법 2: VS Code 확장 프로그램

### 설치
1. VS Code 열기
2. 확장 프로그램 검색: "SQLite Viewer" 또는 "SQLite"
3. 설치:
   - **SQLite Viewer** (qwtel)
   - **SQLite** (alexcvzz)

### 사용 방법
1. VS Code에서 `database.db` 파일 열기
2. 확장 프로그램이 자동으로 인식
3. 테이블 구조 및 데이터 확인

**장점:**
- ✅ 에디터에서 바로 확인
- ✅ 코드 작성 중 바로 확인 가능

---

## 방법 3: 웹 기반 관리자 페이지 (추천!)

서버에 간단한 웹 인터페이스를 추가하여 브라우저에서 실시간으로 확인할 수 있습니다.

### 설치 및 실행
```bash
cd driver_backend
npm install express-basic-auth
```

그리고 관리자 페이지 라우트를 추가하면 됩니다.

**장점:**
- ✅ 브라우저에서 바로 확인
- ✅ 어디서든 접속 가능
- ✅ 실시간 업데이트

---

## 방법 4: 터미널에서 확인

### SQLite CLI 사용
```bash
cd driver_backend

# SQLite 실행
sqlite3 database.db

# 테이블 목록 확인
.tables

# Users 테이블 조회
SELECT * FROM users;

# Driving Logs 테이블 조회
SELECT * FROM driving_logs LIMIT 10;

# 종료
.quit
```

### 간단한 스크립트로 확인
```bash
# 모든 사용자 확인
sqlite3 database.db "SELECT user_id, name, score FROM users;"

# 최근 주행 기록 확인
sqlite3 database.db "SELECT log_id, user_id, date, score FROM driving_logs ORDER BY date DESC LIMIT 5;"
```

---

## 방법 5: API로 데이터 확인

서버가 실행 중이면 API를 통해 데이터를 확인할 수 있습니다.

```bash
# Health check
curl http://localhost:3000/api/health

# (인증이 필요한 API는 토큰 필요)
```

---

## 실시간 모니터링 스크립트

터미널에서 실시간으로 데이터베이스 변화를 확인하는 스크립트:

```bash
# watch-db.sh 파일 생성
cat > watch-db.sh << 'EOF'
#!/bin/bash
while true; do
  clear
  echo "=== Users ==="
  sqlite3 database.db "SELECT user_id, name, score FROM users;"
  echo ""
  echo "=== Recent Driving Logs ==="
  sqlite3 database.db "SELECT log_id, user_id, date, score FROM driving_logs ORDER BY date DESC LIMIT 5;"
  echo ""
  echo "=== Coupons ==="
  sqlite3 database.db "SELECT coupon_id, user_id, name, status FROM coupons LIMIT 5;"
  sleep 2
done
EOF

chmod +x watch-db.sh
./watch-db.sh
```

---

## 추천 조합

1. **개발 중**: VS Code 확장 프로그램 (빠르게 확인)
2. **데이터 관리**: DB Browser for SQLite (상세한 작업)
3. **서버 배포 후**: 웹 기반 관리자 페이지 (원격 접속)

가장 간단한 방법은 **DB Browser for SQLite**를 설치하는 것입니다!
