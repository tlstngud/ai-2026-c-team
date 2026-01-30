# Supabase Migration - Deprecated Files

이 폴더의 파일들은 Supabase DB 마이그레이션으로 인해 더 이상 사용되지 않습니다.

## Deprecated Files

### ❌ `localStorage.js`
- **대체**: Supabase `users`, `driving_logs`, `coupons` 테이블
- **사유**: 모든 사용자 데이터와 주행 기록이 Supabase DB로 이전되었습니다
- **삭제 가능 여부**: ✅ 안전하게 삭제 가능

### ❌ `LogService.js`
- **대체**: `src/services/drivingService.js`
- **사유**: Supabase 기반 주행 기록 서비스로 완전히 대체되었습니다
- **삭제 가능 여부**: ✅ 안전하게 삭제 가능

## Migration Status

✅ **완료된 마이그레이션:**
- 사용자 프로필 → `public.users` 테이블
- 주행 기록 → `public.driving_logs` 테이블
- 챌린지 → `public.challenges` 테이블
- 챌린지 상태 → `public.challenge_statuses` 테이블
- 쿠폰 → `public.coupons` 테이블

## New Service Layer

모든 데이터 작업은 이제 다음 서비스를 통해 이루어집니다:

- `src/services/drivingService.js` - 주행 기록 관리
- `src/services/userService.js` - 사용자 프로필 관리
- `src/services/challengeService.js` - 챌린지 관리
- `src/services/couponService.js` - 쿠폰 관리

## 참고

파일을 삭제하기 전에 프로젝트가 정상 작동하는지 확인하세요.
