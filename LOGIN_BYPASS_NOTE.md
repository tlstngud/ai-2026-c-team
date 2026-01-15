# 인증 기능 임시 변경 (localStorage 기반)

## 변경 일자
2026-01-15

## 변경 파일
- `driver_front/src/contexts/AuthContext.jsx`

## 변경 내용
백엔드 API 호출 대신 localStorage를 사용하여 회원가입/로그인 처리

---

## 1. 회원가입 (signUp)

### 현재 동작
- `registeredUsers` 키로 localStorage에 회원 목록 저장
- 중복 아이디 체크
- 비밀번호 평문 저장 (테스트용)

### 저장 데이터 구조
```javascript
// localStorage key: 'registeredUsers'
[
  {
    id: "user1",
    name: "홍길동",
    password: "1234",
    address: "강원도 춘천시...",
    score: 85,
    region: {
      name: "춘천시",
      campaign: "스마일 춘천 안전운전",
      target: 90,
      reward: "춘천사랑상품권 3만원 + 보험할인"
    }
  }
]
```

### 복원 방법
`AuthContext.jsx` 26~108번 줄에서:
1. 현재 localStorage 기반 코드 삭제 (26~74번 줄)
2. 주석 처리된 원본 코드 해제 (76~107번 줄의 `/* ... */` 제거)

---

## 2. 로그인 (login)

### 현재 동작
- localStorage의 `registeredUsers`에서 회원 검색
- 아이디/비밀번호 검증
- 로그인 성공 시 `currentUser`, `userRegion` 저장

### 복원 방법
`AuthContext.jsx` 110~179번 줄에서:
1. 현재 localStorage 기반 코드 삭제 (110~139번 줄)
2. 주석 처리된 원본 코드 해제 (141~178번 줄의 `/* ... */` 제거)

---

## 빠른 복원 가이드

### 전체 복원 (API 연동으로 되돌리기)

```javascript
// ===== 회원가입 함수 =====
// 아래 코드를 찾아서:
// 1. 회원가입 함수 - localStorage 기반 (임시)
const signUp = async (id, name, password, regionData = null) => {
    // ... localStorage 기반 코드 ...
    return { success: true };

    /* 원본 회원가입 로직 (나중에 복원)
    try {
        // 백엔드 API 호출
        ...
    }
    */
};

// 이렇게 변경:
// 1. 회원가입 함수 (DB API 호출)
const signUp = async (id, name, password, regionData = null) => {
    // 주소에서 지역 정보 추출 코드는 그대로 유지
    ...

    try {
        // 백엔드 API 호출
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            ...
        });
        ...
    } catch (error) {
        ...
    }
};


// ===== 로그인 함수 =====
// 아래 코드를 찾아서:
// 2. 로그인 함수 - localStorage 기반 (임시)
const login = async (id, password) => {
    // ... localStorage 기반 코드 ...
    return { success: true };

    /* 원본 로그인 로직 (나중에 복원)
    ...
    */
};

// 이렇게 변경:
// 2. 로그인 함수 (DB API 호출)
const login = async (id, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            ...
        });
        ...
    } catch (error) {
        ...
    }
};
```

---

## 주의사항
- 이 설정은 개발/테스트/시연 목적으로만 사용
- 비밀번호가 평문으로 저장됨 (보안 취약)
- 프로덕션 배포 전 반드시 원본 API 로직으로 복원 필요
- localStorage 데이터는 브라우저별로 독립 (다른 브라우저에서 회원 공유 안됨)

---

## 테스트 방법
1. 회원가입 페이지에서 새 계정 생성
2. 로그인 페이지에서 생성한 계정으로 로그인
3. 개발자 도구 > Application > Local Storage에서 `registeredUsers` 확인 가능
