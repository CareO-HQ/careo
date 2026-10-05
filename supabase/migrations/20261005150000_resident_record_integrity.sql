-- Migration: 20261005150000_resident_record_integrity.sql
-- Database-side guards for resident-profile bugs found by tests/e2e/resident-*.spec.ts.

-- =====================================================================
-- 1. Progress notes are always authored by the signed-in user
-- =====================================================================
-- /api/progress-notes used to store authorId/authorName from the request body, so a
-- note could be attributed to another staff member. The API now ignores those fields;
-- this trigger enforces the same rule for any client writing to the table directly.
-- Service-role writes (auth.uid() IS NULL, e.g. imports and tests) are left untouched.

CREATE OR REPLACE FUNCTION public.enforce_progress_note_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.author_id := v_uid;
    SELECT COALESCE(NULLIF(u.name, ''), u.email, NEW.author_name)
      INTO NEW.author_name
      FROM public.users u
     WHERE u.id = v_uid;
  ELSE
    -- Editing a note never changes who wrote it.
    NEW.author_id := OLD.author_id;
    NEW.author_name := OLD.author_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_progress_note_author ON public.progress_notes;
CREATE TRIGGER enforce_progress_note_author
  BEFORE INSERT OR UPDATE ON public.progress_notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_progress_note_author();

-- =====================================================================
-- 2. Weight records must be a plausible weight
-- =====================================================================
-- The weight form accepted -5 kg and 900 kg. NOT VALID keeps any historic rows
-- readable while rejecting new out-of-range values.

ALTER TABLE public.weight_records
  DROP CONSTRAINT IF EXISTS weight_records_weight_kg_range;
ALTER TABLE public.weight_records
  ADD CONSTRAINT weight_records_weight_kg_range
  CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 300)) NOT VALID;

-- =====================================================================
-- 3. Care file v1 "Depenency" folder renamed to "Dependency"
-- =====================================================================
-- Uploaded files are linked to a care-file folder by its display name.

UPDATE public.files
   SET folder_name = 'Dependency'
 WHERE folder_name = 'Depenency';
