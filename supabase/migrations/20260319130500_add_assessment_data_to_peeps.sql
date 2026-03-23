-- Migration: Add assessment_data to peeps
-- Date: 2026-03-19
-- Description: Adds a JSONB column to the peeps table to store form-specific data in a flexible way.

ALTER TABLE public.peeps ADD COLUMN IF NOT EXISTS assessment_data JSONB;
