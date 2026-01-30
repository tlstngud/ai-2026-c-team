-- =====================================================
-- Supabase Auth 완전 연동 (Production-safe, A+B)
-- - extensions
-- - updated_at trigger function
-- - users/challenges/etc tables
-- - auth.users -> public.users backfill (B)
-- - auth.users -> public.users trigger (A, idempotent)
-- =====================================================

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1) updated_at 자동 갱신 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 2) auth.users → public.users 자동 생성 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    score,
    region,
    last_seen,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      'user'
    ),
    70,
    COALESCE(NEW.raw_user_meta_data->'region', NULL),
    NULL,
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    region = EXCLUDED.region,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- =====================================================
-- 3) 테이블 재생성 (FK 순서 중요)
-- ⚠ 운영 중이면 이 블록은 제거하고 사용
-- =====================================================
DROP TABLE IF EXISTS challenge_statuses CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS driving_logs CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS user_regions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- 4) users
-- =====================================================
CREATE TABLE public.users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  score      integer DEFAULT 70,
  region     jsonb,
  last_seen  timestamptz,
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_score
  ON public.users(score);

CREATE INDEX IF NOT EXISTS idx_users_region_name
  ON public.users((region ->> 'name'));

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- 5) challenges
-- =====================================================
CREATE TABLE public.challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL UNIQUE,
  title        text NOT NULL,
  name         text,
  description  text,
  region       text,
  conditions   text[],
  rules        text[],
  start_date   timestamptz,
  end_date     timestamptz,
  target_score integer,
  participants integer NOT NULL DEFAULT 0,
  reward       text,
  status       text DEFAULT 'ACTIVE',
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_region
  ON public.challenges(region);
CREATE INDEX IF NOT EXISTS idx_challenges_start_date
  ON public.challenges(start_date);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date
  ON public.challenges(end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_status
  ON public.challenges(status);

CREATE TRIGGER trg_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- 6) user_regions
-- =====================================================
CREATE TABLE public.user_regions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  campaign    text,
  reward      text,
  target      integer,
  region_code text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_regions_name
  ON public.user_regions(name);
CREATE INDEX IF NOT EXISTS idx_user_regions_campaign
  ON public.user_regions(campaign);
CREATE INDEX IF NOT EXISTS idx_user_regions_region_code
  ON public.user_regions(region_code);

CREATE TRIGGER trg_user_regions_updated_at
BEFORE UPDATE ON public.user_regions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- 7) coupons
-- =====================================================
CREATE TABLE public.coupons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id    text NOT NULL UNIQUE,
  challenge_id text,
  user_id      uuid,
  name         text NOT NULL,
  provider     text,
  amount       text,
  type         text,
  theme        text,
  status       text,
  issued_at    timestamptz,
  expiry       timestamptz,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_coupons_user
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_coupons_challenge
    FOREIGN KEY (challenge_id)
    REFERENCES public.challenges(challenge_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_user_id
  ON public.coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_status
  ON public.coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_expiry
  ON public.coupons(expiry);

CREATE TRIGGER trg_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- 8) driving_logs
-- =====================================================
CREATE TABLE public.driving_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id                text UNIQUE,
  user_id               uuid NOT NULL,
  date                  timestamptz,
  date_display          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  distance              double precision DEFAULT 0,
  duration              double precision DEFAULT 0,
  events                integer DEFAULT 0,
  gps_events            jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_speed             double precision DEFAULT 0,
  score                 double precision,
  accel_decel_score     double precision,
  driver_behavior_score double precision,
  speed_limit_score     double precision,
  distracted_count      integer DEFAULT 0,
  drowsy_count          integer DEFAULT 0,
  phone_count           integer DEFAULT 0,
  route                 jsonb,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_driving_logs_user
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_driving_logs_user_id
  ON public.driving_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_driving_logs_created_at
  ON public.driving_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_driving_logs_log_id
  ON public.driving_logs(log_id);

CREATE TRIGGER trg_driving_logs_updated_at
BEFORE UPDATE ON public.driving_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- 9) challenge_statuses
-- =====================================================
CREATE TABLE public.challenge_statuses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL,
  user_id      uuid NOT NULL,
  status       text NOT NULL,
  joined_at    timestamptz,
  claimed_at   timestamptz,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_challenge_statuses_user_challenge
    UNIQUE (user_id, challenge_id),

  CONSTRAINT fk_challenge_statuses_user
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT fk_challenge_statuses_challenge
    FOREIGN KEY (challenge_id)
    REFERENCES public.challenges(challenge_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_challenge_statuses_user_id
  ON public.challenge_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_statuses_challenge_id
  ON public.challenge_statuses(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_statuses_status
  ON public.challenge_statuses(status);

CREATE TRIGGER trg_challenge_statuses_updated_at
BEFORE UPDATE ON public.challenge_statuses
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- 10) RLS (Row Level Security) 정책
-- =====================================================

-- users 테이블 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- driving_logs 테이블 RLS
ALTER TABLE public.driving_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own logs" ON public.driving_logs;
CREATE POLICY "Users can insert own logs"
ON public.driving_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own logs" ON public.driving_logs;
CREATE POLICY "Users can view own logs"
ON public.driving_logs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own logs" ON public.driving_logs;
CREATE POLICY "Users can update own logs"
ON public.driving_logs FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own logs" ON public.driving_logs;
CREATE POLICY "Users can delete own logs"
ON public.driving_logs FOR DELETE
USING (auth.uid() = user_id);

-- challenges 테이블 RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view challenges" ON public.challenges;
CREATE POLICY "Anyone can view challenges"
ON public.challenges FOR SELECT
USING (true);

-- challenge_statuses 테이블 RLS
ALTER TABLE public.challenge_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own challenge status" ON public.challenge_statuses;
CREATE POLICY "Users can insert own challenge status"
ON public.challenge_statuses FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own challenge status" ON public.challenge_statuses;
CREATE POLICY "Users can view own challenge status"
ON public.challenge_statuses FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own challenge status" ON public.challenge_statuses;
CREATE POLICY "Users can update own challenge status"
ON public.challenge_statuses FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own challenge status" ON public.challenge_statuses;
CREATE POLICY "Users can delete own challenge status"
ON public.challenge_statuses FOR DELETE
USING (auth.uid() = user_id);

-- coupons 테이블 RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own coupons" ON public.coupons;
CREATE POLICY "Users can view own coupons"
ON public.coupons FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own coupons" ON public.coupons;
CREATE POLICY "Users can update own coupons"
ON public.coupons FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own coupons" ON public.coupons;
CREATE POLICY "Users can insert own coupons"
ON public.coupons FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- user_regions 테이블 RLS
ALTER TABLE public.user_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user regions" ON public.user_regions;
CREATE POLICY "Anyone can view user regions"
ON public.user_regions FOR SELECT
USING (true);

-- =====================================================
-- 11) (B) 기존 auth.users → public.users 일괄 보정
-- =====================================================
INSERT INTO public.users (
  id,
  name,
  score,
  region,
  last_seen,
  metadata,
  created_at,
  updated_at
)
SELECT
  au.id,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'name', ''),
    au.email,
    'user'
  ),
  70,
  NULL,
  NULL,
  COALESCE(au.raw_user_meta_data, '{}'::jsonb),
  now(),
  now()
FROM auth.users au
LEFT JOIN public.users pu
  ON pu.id = au.id
WHERE pu.id IS NULL;

-- =====================================================
-- 12) (A) auth.users → public.users 트리거 연결 (idempotent)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created'
      AND c.relname = 'users'
      AND n.nspname = 'auth'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;

-- =====================================================
-- 13) 초기 데이터 삽입 (선택사항)
-- =====================================================

-- 샘플 챌린지 데이터
INSERT INTO public.challenges (challenge_id, title, name, description, region, target_score, reward, start_date, end_date, rules, conditions)
VALUES
  (
    'challenge_chuncheon',
    '춘천시 안전운전 챌린지',
    '스마일 춘천 안전운전',
    '춘천시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.',
    '춘천시',
    90,
    '춘천사랑상품권 3만원 + 보험할인',
    '2026-01-15T00:00:00Z',
    '2026-01-29T23:59:59Z',
    ARRAY['1년 동안 월별 과속 10회 이하 시 감면', '1년 동안 안전 점수 90점 이상 유지 시 감면', '1년 동안 월별 급감속 20회 이하 시 감면'],
    ARRAY['춘천시 거주자 또는 주 활동 운전자', '최근 1년 내 중과실 사고 이력 없음', '마케팅 활용 동의 필수']
  ),
  (
    'challenge_seoul',
    '서울특별시 안전운전 챌린지',
    '서울 마이-티 드라이버',
    '서울특별시에서 안전운전을 실천해주세요. 목표 점수 달성 시 혜택을 드립니다.',
    '서울특별시',
    92,
    '서울시 공영주차장 50% 할인권',
    '2026-01-15T00:00:00Z',
    '2026-01-29T23:59:59Z',
    ARRAY['1년 동안 월별 과속 10회 이하 시 감면', '1년 동안 안전 점수 90점 이상 유지 시 감면', '1년 동안 월별 급감속 20회 이하 시 감면'],
    ARRAY['서울특별시 거주자 또는 주 활동 운전자', '최근 1년 내 중과실 사고 이력 없음', '마케팅 활용 동의 필수']
  )
ON CONFLICT (challenge_id) DO NOTHING;

-- 샘플 지역 데이터
INSERT INTO public.user_regions (name, campaign, reward, target, region_code)
VALUES
  ('춘천시', '스마일 춘천 안전운전', '춘천사랑상품권 3만원 + 보험할인', 90, 'chuncheon'),
  ('서울특별시', '서울 마이-티 드라이버', '서울시 공영주차장 50% 할인권', 92, 'seoul'),
  ('전국 공통', '대한민국 안전운전 챌린지', '안전운전 인증서 발급', 90, 'default')
ON CONFLICT DO NOTHING;
