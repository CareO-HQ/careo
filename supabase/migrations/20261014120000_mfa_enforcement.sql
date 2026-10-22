-- =====================================================================
-- Authenticator-app (TOTP) MFA enforcement
--
-- Every role except external staff (mdt, rqia) and agency staff must complete TOTP, which
-- raises the session's `aal` claim to 'aal2'. The app enforces this in middleware and the
-- server helpers (lib/mfa.ts); this migration enforces it for direct database calls:
--   1. public.mfa_satisfied() / public.assert_mfa_satisfied()
--   2. Backup-code and MFA audit tables
--   3. A RESTRICTIVE zz_mfa_required policy on every RLS table in public and on storage.objects
--   4. Guard wrappers for the SECURITY DEFINER RPCs the app calls (they bypass RLS)
--
-- New tables or RPCs added later need the same treatment; tests/db/mfa-enforcement.test.ts
-- fails when an RLS table lacks zz_mfa_required or a guarded RPC loses its wrapper.
-- The exempt role list is mirrored in lib/mfa.ts (MFA_EXEMPT_ROLES).
-- =====================================================================

-- =====================================================================
-- 1. Helpers
-- =====================================================================

CREATE OR REPLACE FUNCTION public.mfa_satisfied()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      OR public.current_user_role() = ANY (ARRAY['mdt', 'rqia', 'agency_nurse', 'agency_care_assistant']);
$$;

REVOKE ALL ON FUNCTION public.mfa_satisfied() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mfa_satisfied() TO anon, authenticated, service_role;

-- Raises for a signed-in user who has not completed MFA. Service role, cron and other
-- non-'authenticated' callers pass through.
CREATE OR REPLACE FUNCTION public.assert_mfa_satisfied()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.mfa_satisfied() THEN
    RAISE EXCEPTION 'mfa_required'
      USING ERRCODE = '42501', HINT = 'Complete authenticator-app verification first.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_mfa_satisfied() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_mfa_satisfied() TO anon, authenticated, service_role;

-- Signs a user out everywhere after a manager resets their MFA. (Deleting a verified factor
-- already does this in GoTrue; this also covers users who never finished enrolling.)
-- Refresh tokens are removed with their sessions; issued access tokens expire on their own.
-- Server actions only (service role).
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid) TO service_role;

-- =====================================================================
-- 2. Tables
-- =====================================================================

-- One-time recovery codes. Only HMAC hashes are stored. RLS is enabled with no permissive
-- policy, so clients can never read them; server actions use the service role.
CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS mfa_backup_codes_user_id_idx ON public.mfa_backup_codes (user_id);
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- Audit trail for MFA changes; also the attempt counter that throttles backup-code guessing.
CREATE TABLE IF NOT EXISTS public.mfa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  organization_id uuid,
  care_home_id uuid,
  event_type text NOT NULL CHECK (event_type IN (
    'manager_reset', 'backup_code_used', 'backup_code_failed', 'backup_codes_regenerated', 'device_replaced'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mfa_events_user_type_created_idx
  ON public.mfa_events (user_id, event_type, created_at DESC);
ALTER TABLE public.mfa_events ENABLE ROW LEVEL SECURITY;

-- Owners and managers read events for staff in their scope; users read their own.
-- Rows are written only by server actions (service role).
DROP POLICY IF EXISTS mfa_events_read ON public.mfa_events;
CREATE POLICY mfa_events_read ON public.mfa_events FOR SELECT TO authenticated
  USING (
    public.is_saas_admin()
    OR user_id = auth.uid()
    OR (
      public.current_user_role() IN ('owner', 'manager')
      AND CASE
        WHEN care_home_id IS NOT NULL THEN public.can_access_care_home(care_home_id)
        WHEN organization_id IS NOT NULL THEN public.can_access_organization(organization_id)
        ELSE false
      END
    )
  );

-- =====================================================================
-- 3. RESTRICTIVE MFA policy on every RLS table
-- =====================================================================

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
      AND c.relname <> 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS zz_mfa_required ON public.%I', t.name);
    EXECUTE format(
      'CREATE POLICY zz_mfa_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied())',
      t.name
    );
  END LOOP;
END;
$$;

-- users: the login form reads the signed-in user's own row (role, is_login_allowed) before
-- the TOTP step, so SELECT of one's own row is allowed at aal1. Writes need MFA.
DROP POLICY IF EXISTS zz_mfa_required ON public.users;
DROP POLICY IF EXISTS zz_mfa_required_read ON public.users;
DROP POLICY IF EXISTS zz_mfa_required_insert ON public.users;
DROP POLICY IF EXISTS zz_mfa_required_update ON public.users;
DROP POLICY IF EXISTS zz_mfa_required_delete ON public.users;

CREATE POLICY zz_mfa_required_read ON public.users AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.mfa_satisfied() OR id = auth.uid());
CREATE POLICY zz_mfa_required_insert ON public.users AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.mfa_satisfied());
CREATE POLICY zz_mfa_required_update ON public.users AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied());
CREATE POLICY zz_mfa_required_delete ON public.users AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.mfa_satisfied());

-- Files (care documents, photos) in private buckets.
DROP POLICY IF EXISTS zz_mfa_required ON storage.objects;
CREATE POLICY zz_mfa_required ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied());

-- =====================================================================
-- 4. Guard wrappers for SECURITY DEFINER RPCs called by the app
--
-- Each function is renamed to _mfa_impl_<name> (no longer callable by clients) and replaced
-- by a wrapper with the same signature that calls assert_mfa_satisfied() first.
-- Invitation and agency-activation RPCs are left unguarded: they run before a new user has
-- enrolled and only act on the caller's own invitation.
-- A later CREATE OR REPLACE of one of these names replaces the wrapper and drops the guard;
-- the db test catches that.
-- =====================================================================

DO $$
DECLARE
  f record;
  impl text;
  call_args text;
  body text;
  grantee text;
  grantees text[];
  guarded constant text[] := ARRAY[
    'get_or_create_emar_sheet',
    'get_paginated_food_fluid_dates',
    'get_paginated_night_check_dates',
    'get_paginated_daily_care_dates',
    'get_paginated_continence_dates',
    'set_resident_weight_check_frequency',
    'remove_organization_member',
    'receive_medication_stock',
    'adjust_medication_stock',
    'perform_daily_maintenance'
  ];
BEGIN
  FOR f IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_arguments(p.oid) AS args,
      pg_get_function_identity_arguments(p.oid) AS id_args,
      pg_get_function_result(p.oid) AS result,
      p.pronargs,
      p.proretset
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (guarded)
  LOOP
    impl := '_mfa_impl_' || f.proname;

    -- The wrapper keeps exactly the client grants the original had.
    SELECT coalesce(array_agg(r), ARRAY[]::text[]) INTO grantees
    FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r
    WHERE has_function_privilege(r, f.oid, 'EXECUTE');

    EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I', f.proname, f.id_args, impl);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', impl, f.id_args);

    SELECT coalesce(string_agg('$' || i, ', ' ORDER BY i), '')
    INTO call_args
    FROM generate_series(1, f.pronargs) AS i;

    body := CASE
      WHEN f.proretset THEN format('SELECT public.assert_mfa_satisfied(); SELECT * FROM public.%I(%s);', impl, call_args)
      ELSE format('SELECT public.assert_mfa_satisfied(); SELECT public.%I(%s);', impl, call_args)
    END;

    EXECUTE format(
      'CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '''' AS %L',
      f.proname, f.args, f.result, body
    );
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', f.proname, f.id_args);
    FOREACH grantee IN ARRAY grantees LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO %I', f.proname, f.id_args, grantee);
    END LOOP;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
