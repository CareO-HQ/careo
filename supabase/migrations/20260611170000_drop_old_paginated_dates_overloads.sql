-- Migration: Drop old 6-parameter versions of paginated date helper functions to resolve PostgREST ambiguity
-- Migration ID: 20260611170000_drop_old_paginated_dates_overloads.sql

DROP FUNCTION IF EXISTS public.get_paginated_night_check_dates(UUID, INT, INT, INT, INT, TEXT);
DROP FUNCTION IF EXISTS public.get_paginated_continence_dates(UUID, INT, INT, INT, INT, TEXT);
DROP FUNCTION IF EXISTS public.get_paginated_daily_care_dates(UUID, INT, INT, INT, INT, TEXT);
