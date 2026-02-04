-- ============================================
-- Add RLS Policies for Read Status Tables
-- ============================================
-- This migration adds RLS policies to allow users to:
-- 1. View their own read status for appointments and notifications
-- 2. Mark appointments and notifications as read (insert/upsert)
-- 3. Unmark as read if needed (delete)
-- ============================================

-- ============================================
-- APPOINTMENT_READ_STATUS POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.appointment_read_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own appointment read status" ON public.appointment_read_status;
DROP POLICY IF EXISTS "Users can insert their own appointment read status" ON public.appointment_read_status;
DROP POLICY IF EXISTS "Users can update their own appointment read status" ON public.appointment_read_status;
DROP POLICY IF EXISTS "Users can delete their own appointment read status" ON public.appointment_read_status;

-- SELECT: Users can view their own read status
CREATE POLICY "Users can view their own appointment read status"
  ON public.appointment_read_status FOR SELECT
  TO authenticated
  USING ( auth.uid() = user_id );

-- INSERT: Users can mark appointments as read for themselves
CREATE POLICY "Users can insert their own appointment read status"
  ON public.appointment_read_status FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = user_id );

-- UPDATE: Users can update their own read status (for upsert)
CREATE POLICY "Users can update their own appointment read status"
  ON public.appointment_read_status FOR UPDATE
  TO authenticated
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- DELETE: Users can delete their own read status
CREATE POLICY "Users can delete their own appointment read status"
  ON public.appointment_read_status FOR DELETE
  TO authenticated
  USING ( auth.uid() = user_id );


-- ============================================
-- NOTIFICATION_READ_STATUS POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.notification_read_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notification read status" ON public.notification_read_status;
DROP POLICY IF EXISTS "Users can insert their own notification read status" ON public.notification_read_status;
DROP POLICY IF EXISTS "Users can update their own notification read status" ON public.notification_read_status;
DROP POLICY IF EXISTS "Users can delete their own notification read status" ON public.notification_read_status;

-- SELECT: Users can view their own read status
CREATE POLICY "Users can view their own notification read status"
  ON public.notification_read_status FOR SELECT
  TO authenticated
  USING ( auth.uid() = user_id );

-- INSERT: Users can mark notifications as read for themselves
CREATE POLICY "Users can insert their own notification read status"
  ON public.notification_read_status FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = user_id );

-- UPDATE: Users can update their own read status (for upsert)
CREATE POLICY "Users can update their own notification read status"
  ON public.notification_read_status FOR UPDATE
  TO authenticated
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- DELETE: Users can delete their own read status
CREATE POLICY "Users can delete their own notification read status"
  ON public.notification_read_status FOR DELETE
  TO authenticated
  USING ( auth.uid() = user_id );
