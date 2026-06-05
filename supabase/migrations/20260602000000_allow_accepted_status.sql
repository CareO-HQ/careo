-- Migration: Update agency_requests_status_check constraint to allow 'accepted' status
-- Date: June 4, 2026

ALTER TABLE public.agency_requests DROP CONSTRAINT IF EXISTS agency_requests_status_check;

ALTER TABLE public.agency_requests ADD CONSTRAINT agency_requests_status_check CHECK (status IN ('pending', 'accepted', 'approved', 'declined', 'active', 'offboarded'));
