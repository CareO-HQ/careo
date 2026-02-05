-- Migration: Add missing fields to notifications table
-- Date: February 3, 2026
-- Description: Adds link, sender_id, and sender_name fields to notifications table

-- Add missing columns to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications(organization_id);

-- Add composite index for common query pattern (user_id + type + created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created ON public.notifications(user_id, type, created_at DESC);
