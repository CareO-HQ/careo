-- Migration to fix rota foreign keys to point to public.users instead of auth.users
-- This allows PostgREST to resolve joins between these tables and the public.users profile table.

-- 1. Fix rota_shifts
ALTER TABLE public.rota_shifts
  DROP CONSTRAINT IF EXISTS rota_shifts_user_id_fkey;

ALTER TABLE public.rota_shifts
  ADD CONSTRAINT rota_shifts_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- 2. Fix leave_requests
ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey,
  DROP CONSTRAINT IF EXISTS leave_requests_approved_by_fkey;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_approved_by_fkey
  FOREIGN KEY (approved_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- 3. Fix shift_swaps
ALTER TABLE public.shift_swaps
  DROP CONSTRAINT IF EXISTS shift_swaps_requesting_user_id_fkey,
  DROP CONSTRAINT IF EXISTS shift_swaps_target_user_id_fkey,
  DROP CONSTRAINT IF EXISTS shift_swaps_approved_by_fkey;

ALTER TABLE public.shift_swaps
  ADD CONSTRAINT shift_swaps_requesting_user_id_fkey
  FOREIGN KEY (requesting_user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.shift_swaps
  ADD CONSTRAINT shift_swaps_target_user_id_fkey
  FOREIGN KEY (target_user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.shift_swaps
  ADD CONSTRAINT shift_swaps_approved_by_fkey
  FOREIGN KEY (approved_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- 4. Fix rotas
ALTER TABLE public.rotas
  DROP CONSTRAINT IF EXISTS rotas_created_by_fkey,
  DROP CONSTRAINT IF EXISTS rotas_published_by_fkey;

ALTER TABLE public.rotas
  ADD CONSTRAINT rotas_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.rotas
  ADD CONSTRAINT rotas_published_by_fkey
  FOREIGN KEY (published_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- 5. Fix shift_templates
ALTER TABLE public.shift_templates
  DROP CONSTRAINT IF EXISTS shift_templates_created_by_fkey;

ALTER TABLE public.shift_templates
  ADD CONSTRAINT shift_templates_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.users(id)
  ON DELETE SET NULL;
