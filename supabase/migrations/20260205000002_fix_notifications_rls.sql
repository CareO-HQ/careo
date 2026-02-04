-- Migration: Fix Notification RLS Policies
-- Date: 2026-02-05
-- Description: Ensures users can see notifications for their organization (both personal and broadcast)

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop generic/old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users within organization can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users within organization can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Managers can delete notifications" ON public.notifications;

-- Policy 1: VIEW (SELECT)
-- Users can see notifications if:
-- 1. They belong to the organization
-- 2. AND (The notification is for them specifically OR The notification is for everyone (user_id IS NULL))
CREATE POLICY "Users within organization can view notifications"
ON public.notifications FOR SELECT
USING (
  public.can_access_organization(organization_id)
  AND (
    user_id = auth.uid() 
    OR user_id IS NULL
  )
);

-- Policy 2: INSERT
-- Allow authenticated users to create notifications (e.g. creating an incident triggers a notification)
-- They must belong to the organization they are creating the notification for.
CREATE POLICY "Users within organization can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  public.can_access_organization(organization_id)
);

-- Policy 3: DELETE
-- Managers and owners can delete notifications
CREATE POLICY "Managers can delete notifications"
ON public.notifications FOR DELETE
USING (
  public.can_access_organization(organization_id)
  AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
);
