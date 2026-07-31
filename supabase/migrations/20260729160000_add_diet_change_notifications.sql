-- Migration: Add diet change notification database trigger
-- Date: 2026-07-29
-- Description: Automatically inserts a notification when resident diet info is changed or added in diet_lifestyle.

CREATE OR REPLACE FUNCTION public.handle_diet_lifestyle_changed_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_room_number TEXT;
  v_care_home_id UUID;
  v_team_id UUID;
  v_organization_id UUID;
BEGIN
  -- Fetch resident details from public.residents
  SELECT first_name, last_name, room_number, care_home_id, team_id, organization_id
  INTO v_first_name, v_last_name, v_room_number, v_care_home_id, v_team_id, v_organization_id
  FROM public.residents
  WHERE id = NEW.resident_id;

  IF v_organization_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      organization_id,
      care_home_id,
      team_id,
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      v_organization_id,
      v_care_home_id,
      v_team_id,
      NULL, -- broadcast notification for all staff with access
      'diet_change',
      'Diet Information Updated',
      'Diet info for ' || COALESCE(v_first_name, 'Resident') || ' ' || COALESCE(v_last_name, '') || CASE WHEN v_room_number IS NOT NULL AND v_room_number != '' THEN ' (Rm ' || v_room_number || ')' ELSE '' END || ' has been changed.',
      '/dashboard/kitchen-portal?residentId=' || NEW.resident_id::text,
      jsonb_build_object(
        'residentId', NEW.resident_id,
        'residentName', COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''),
        'roomNumber', v_room_number
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_diet_lifestyle_changed_notification ON public.diet_lifestyle;

CREATE TRIGGER trigger_diet_lifestyle_changed_notification
AFTER INSERT OR UPDATE ON public.diet_lifestyle
FOR EACH ROW
EXECUTE FUNCTION public.handle_diet_lifestyle_changed_notification();
