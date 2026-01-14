# GitHub 인증 가이드 (EC2에서 사용)

## 문제
GitHub는 더 이상 비밀번호 인증을 지원하지 않습니다. Personal Access Token을 사용해야 합니다.

## 해결 방법

### 방법 1: Personal Access Token 생성 (추천)

1. **GitHub 웹사이트 접속**
   - https://github.com → 로그인
   - 우측 상단 프로필 아이콘 클릭
   - **Settings** 클릭

2. **Personal Access Token 생성**
   - 왼쪽 메뉴에서 **Developer settings** 클릭
   - **Personal access tokens** → **Tokens (classic)** 클릭
   - **Generate new token** → **Generate new token (classic)** 클릭

3. **토큰 설정**
   - **Note**: `EC2 Deployment` (설명)
   - **Expiration**: `90 days` (또는 원하는 기간)
   - **Select scopes**: `repo` 체크 (전체 저장소 접근)
   - **Generate token** 클릭

4. **토큰 복사**
   - ⚠️ **중요**: 토큰을 바로 복사하세요! 다시 볼 수 없습니다.
   - 예: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

5. **EC2에서 사용**
   ```bash
   git clone https://github.com/Kim-jaeyeon/ai-2026-c-team.git
   # Username: Kim-jaeyeon
   # Password: (여기에 토큰 붙여넣기)
   ```

### 방법 2: URL에 토큰 포함 (더 편리)

```bash
# 토큰을 URL에 포함
git clone https://YOUR_TOKEN@github.com/Kim-jaeyeon/ai-2026-c-team.git
```

예시:
```bash
git clone https://ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@github.com/Kim-jaeyeon/ai-2026-c-team.git
```

### 방법 3: 저장소를 Public으로 변경 (가장 간단)

만약 저장소를 공개해도 된다면:
1. GitHub 저장소 → Settings
2. 맨 아래로 스크롤
3. "Change visibility" → "Make public"
4. 그러면 인증 없이 클론 가능:
   ```bash
   git clone https://github.com/Kim-jaeyeon/ai-2026-c-team.git
   ```

## 추천 방법

**가장 빠른 방법**: Personal Access Token 생성 후 URL에 포함

```bash
# 1. GitHub에서 토큰 생성 (위 방법 1 참고)
# 2. EC2 터미널에서:
git clone https://YOUR_TOKEN@github.com/Kim-jaeyeon/ai-2026-c-team.git
```

이렇게 하면 비밀번호 입력 없이 바로 클론됩니다!
