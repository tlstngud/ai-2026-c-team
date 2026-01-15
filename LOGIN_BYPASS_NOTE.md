# 로그인 기능 임시 비활성화

## 변경 일자
2026-01-15

## 변경 파일
- `driver_front/src/contexts/AuthContext.jsx`

## 변경 내용
로그인 API 호출을 건너뛰고, 로그인 버튼 클릭 시 바로 더미 사용자로 로그인되도록 수정

### 더미 사용자 정보
```javascript
{
    id: id || 'test_user',
    name: '테스트 사용자',
    score: 85,
    region: {
        name: '춘천시',
        campaign: '스마일 춘천 안전운전',
        target: 90,
        reward: '춘천사랑상품권 3만원 + 보험할인'
    }
}
```

## 복원 방법
`AuthContext.jsx` 파일의 `login` 함수에서:
1. 79~98번 줄의 임시 코드 삭제
2. 100~117번 줄의 주석(`/* ... */`) 해제

## 주의사항
- 이 설정은 개발/테스트 목적으로만 사용
- 프로덕션 배포 전 반드시 원본 로직으로 복원 필요
