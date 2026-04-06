-- ============================================
-- Update Medication Administration Status Enum
-- Description: Updates emar_admin_status to include new codes and maps existing data
-- ============================================

-- Since Postgres doesn't easily allow removing values or changing enums in a single transaction
-- when they are used in columns, we'll use this approach:

-- 1. Rename existing enum
ALTER TYPE public.emar_admin_status RENAME TO emar_admin_status_old;

-- 2. Create new enum with requested values
CREATE TYPE public.emar_admin_status AS ENUM (
  'taken', 
  'refused', 
  'hospitalised', 
  'social_leave', 
  'refused_destroyed', 
  'not_required', 
  'made_available',
  'scheduled'
);

-- 3. Update the table to use the new enum with mapping
-- First drop the default to allow the type change
ALTER TABLE public.emar_administrations ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.emar_administrations 
  ALTER COLUMN status TYPE public.emar_admin_status 
  USING (
    CASE 
      WHEN status::text = 'given' THEN 'taken'::public.emar_admin_status
      WHEN status::text = 'refused' THEN 'refused'::public.emar_admin_status
      WHEN status::text = 'omitted' THEN 'not_required'::public.emar_admin_status
      WHEN status::text = 'not_required' THEN 'not_required'::public.emar_admin_status
      WHEN status::text = 'scheduled' THEN 'scheduled'::public.emar_admin_status
      ELSE 'taken'::public.emar_admin_status -- Fallback
    END
  );

-- Re-add the default with the new type
ALTER TABLE public.emar_administrations ALTER COLUMN status SET DEFAULT 'scheduled'::public.emar_admin_status;

-- 4. Drop the old enum
DROP TYPE public.emar_admin_status_old;

-- 5. Add comment explaining the codes
COMMENT ON TYPE public.emar_admin_status IS 'Administration codes: R=Refused, T=Taken, C=Hospitalised, D=Social leave, E=Refused and destroyed, NR=Not required, M=Made available';
