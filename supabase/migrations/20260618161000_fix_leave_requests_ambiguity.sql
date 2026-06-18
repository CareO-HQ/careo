-- Migration to point approved_by, created_by, and published_by columns back to auth.users(id)
-- to resolve join ambiguities in PostgREST queries (e.g. users(...) without hints).

-- 1. Fix leave_requests approved_by
ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_approved_by_fkey;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_approved_by_fkey
  FOREIGN KEY (approved_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 2. Fix shift_swaps approved_by
ALTER TABLE public.shift_swaps
  DROP CONSTRAINT IF EXISTS shift_swaps_approved_by_fkey;

ALTER TABLE public.shift_swaps
  ADD CONSTRAINT shift_swaps_approved_by_fkey
  FOREIGN KEY (approved_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 3. Fix rotas
ALTER TABLE public.rotas
  DROP CONSTRAINT IF EXISTS rotas_created_by_fkey,
  DROP CONSTRAINT IF EXISTS rotas_published_by_fkey;

ALTER TABLE public.rotas
  ADD CONSTRAINT rotas_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 4. Fix rotas published_by
ALTER TABLE public.rotas
  ADD CONSTRAINT rotas_published_by_fkey
  FOREIGN KEY (published_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- 5. Fix shift_templates
ALTER TABLE public.shift_templates
  DROP CONSTRAINT IF EXISTS shift_templates_created_by_fkey;

ALTER TABLE public.shift_templates
  ADD CONSTRAINT shift_templates_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
