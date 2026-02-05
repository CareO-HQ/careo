-- ============================================
-- 1. Restore Schema Usages
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO postgres;

-- ============================================
-- 2. Restore Table Privileges
-- ============================================
-- Grant ALL on all current tables in public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- 3. Set Default Privileges for Future Objects
-- ============================================
-- This ensures that any tables created in the future (by new migrations)
-- will automatically have the correct permissions.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- ============================================
-- 4. Specific fix for Auth -> Public sync
-- ============================================
-- Ensure the handle_new_user function can actually insert into users
-- if it was previously failing due to permission errors.
GRANT ALL ON TABLE public.users TO postgres, service_role;
