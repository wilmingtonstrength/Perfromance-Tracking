-- ============================================================================
-- rls_policies.sql
-- Kaimetric: Comprehensive Row Level Security policies for all tables
-- Supabase project: jfyexedcjgerahuumyqu
-- RUN THIS IN THE SUPABASE SQL EDITOR
--
-- Design:
--   - All gym-scoped tables are locked down so users can only access rows
--     belonging to their gym (determined via the gym_users join table).
--   - test_presets is a shared library: readable by any authenticated user,
--     not writable by non-service-role users.
--   - mattsecrest58@gmail.com has admin read access to gyms and gym_users
--     for the admin dashboard.
--   - A reusable helper function get_user_gym_id() avoids repeating the
--     gym_users subquery in every policy.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. Helper function: returns the gym_id for the currently authenticated user
--    Returns NULL if the user has no gym_users row (e.g. mid-onboarding).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gym_id
  FROM gym_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- 1. Drop ALL existing policies so this script is idempotent
-- ============================================================================

-- gyms
DROP POLICY IF EXISTS "gyms_select_own"        ON gyms;
DROP POLICY IF EXISTS "gyms_select_admin"       ON gyms;
DROP POLICY IF EXISTS "gyms_insert_own"         ON gyms;
DROP POLICY IF EXISTS "gyms_update_own"         ON gyms;
DROP POLICY IF EXISTS "gyms_delete_own"         ON gyms;

-- gym_users
DROP POLICY IF EXISTS "gym_users_select_own"    ON gym_users;
DROP POLICY IF EXISTS "gym_users_select_admin"  ON gym_users;
DROP POLICY IF EXISTS "gym_users_insert_own"    ON gym_users;
DROP POLICY IF EXISTS "gym_users_update_own"    ON gym_users;
DROP POLICY IF EXISTS "gym_users_delete_own"    ON gym_users;
DROP POLICY IF EXISTS "gym_users_insert_self"   ON gym_users;

-- athletes
DROP POLICY IF EXISTS "athletes_select_own"     ON athletes;
DROP POLICY IF EXISTS "athletes_insert_own"     ON athletes;
DROP POLICY IF EXISTS "athletes_update_own"     ON athletes;
DROP POLICY IF EXISTS "athletes_delete_own"     ON athletes;

-- test_results
DROP POLICY IF EXISTS "test_results_select_own" ON test_results;
DROP POLICY IF EXISTS "test_results_insert_own" ON test_results;
DROP POLICY IF EXISTS "test_results_update_own" ON test_results;
DROP POLICY IF EXISTS "test_results_delete_own" ON test_results;

-- custom_tests
DROP POLICY IF EXISTS "custom_tests_select_own" ON custom_tests;
DROP POLICY IF EXISTS "custom_tests_insert_own" ON custom_tests;
DROP POLICY IF EXISTS "custom_tests_update_own" ON custom_tests;
DROP POLICY IF EXISTS "custom_tests_delete_own" ON custom_tests;

-- test_presets
DROP POLICY IF EXISTS "test_presets_select_authenticated" ON test_presets;

-- ============================================================================
-- 2. Enable RLS on every table
-- ============================================================================

ALTER TABLE gyms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_tests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_presets  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. GYMS policies
-- ============================================================================

CREATE POLICY "gyms_select_own" ON gyms
  FOR SELECT USING (id = get_user_gym_id());

CREATE POLICY "gyms_select_admin" ON gyms
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mattsecrest58@gmail.com');

CREATE POLICY "gyms_insert_own" ON gyms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "gyms_update_own" ON gyms
  FOR UPDATE USING (id = get_user_gym_id())
  WITH CHECK (id = get_user_gym_id());

CREATE POLICY "gyms_delete_own" ON gyms
  FOR DELETE USING (id = get_user_gym_id());

-- ============================================================================
-- 4. GYM_USERS policies
-- ============================================================================

CREATE POLICY "gym_users_select_own" ON gym_users
  FOR SELECT USING (gym_id = get_user_gym_id());

CREATE POLICY "gym_users_select_admin" ON gym_users
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mattsecrest58@gmail.com');

CREATE POLICY "gym_users_insert_self" ON gym_users
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "gym_users_update_own" ON gym_users
  FOR UPDATE USING (gym_id = get_user_gym_id())
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "gym_users_delete_own" ON gym_users
  FOR DELETE USING (gym_id = get_user_gym_id());

-- ============================================================================
-- 5. ATHLETES policies
-- ============================================================================

CREATE POLICY "athletes_select_own" ON athletes
  FOR SELECT USING (gym_id = get_user_gym_id());

CREATE POLICY "athletes_insert_own" ON athletes
  FOR INSERT WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "athletes_update_own" ON athletes
  FOR UPDATE USING (gym_id = get_user_gym_id())
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "athletes_delete_own" ON athletes
  FOR DELETE USING (gym_id = get_user_gym_id());

-- ============================================================================
-- 6. TEST_RESULTS policies
-- ============================================================================

CREATE POLICY "test_results_select_own" ON test_results
  FOR SELECT USING (gym_id = get_user_gym_id());

CREATE POLICY "test_results_insert_own" ON test_results
  FOR INSERT WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "test_results_update_own" ON test_results
  FOR UPDATE USING (gym_id = get_user_gym_id())
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "test_results_delete_own" ON test_results
  FOR DELETE USING (gym_id = get_user_gym_id());

-- ============================================================================
-- 7. CUSTOM_TESTS policies
-- ============================================================================

CREATE POLICY "custom_tests_select_own" ON custom_tests
  FOR SELECT USING (gym_id = get_user_gym_id());

CREATE POLICY "custom_tests_insert_own" ON custom_tests
  FOR INSERT WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "custom_tests_update_own" ON custom_tests
  FOR UPDATE USING (gym_id = get_user_gym_id())
  WITH CHECK (gym_id = get_user_gym_id());

CREATE POLICY "custom_tests_delete_own" ON custom_tests
  FOR DELETE USING (gym_id = get_user_gym_id());

-- ============================================================================
-- 8. TEST_PRESETS policies (shared library, read-only for users)
-- ============================================================================

CREATE POLICY "test_presets_select_authenticated" ON test_presets
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- No INSERT/UPDATE/DELETE policies = denied for all authenticated users.
-- Only service_role key (migrations, edge functions, dashboard) can modify.

COMMIT;
