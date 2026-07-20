-- Migration: 20260716160000_add_is_login_allowed_to_users.sql
-- Add 'is_login_allowed' column to public.users table to control whether external MDT users are allowed to log in.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_login_allowed BOOLEAN DEFAULT true;
