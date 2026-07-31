-- Migration: 20260731120000_allow_nurse_view_external_login_logs.sql
-- Nurses manage external (MDT/RQIA) access from the staff page, so they need to read the
-- corresponding login/visit session history.
-- Rollback: recreate both policies with the role list ('owner', 'manager', 'saas_admin').

DROP POLICY IF EXISTS "Enable select access for managers, owners, saas admins and self" ON public.rqia_login_logs;
CREATE POLICY "Enable select access for managers, owners, saas admins and self"
ON public.rqia_login_logs
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.current_user_role() IN ('owner', 'manager', 'saas_admin', 'nurse')
);

DROP POLICY IF EXISTS "Enable select access for managers, owners, saas admins and self" ON public.mdt_login_logs;
CREATE POLICY "Enable select access for managers, owners, saas admins and self"
ON public.mdt_login_logs
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.current_user_role() IN ('owner', 'manager', 'saas_admin', 'nurse')
);
