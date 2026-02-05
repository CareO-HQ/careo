-- Function to auto-resolve medication alerts when intake state changes
CREATE OR REPLACE FUNCTION public.handle_medication_intake_resolve_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- If state changed from 'scheduled' (or whatever initial state) to something else
  IF (OLD.state = 'scheduled' AND NEW.state != 'scheduled') THEN
    UPDATE public.alerts
    SET 
      is_resolved = true,
      resolved_at = NOW(),
      auto_resolved = true,
      resolution_note = 'Auto-resolved as medication state changed to ' || NEW.state
    WHERE 
      resident_id = NEW.resident_id
      AND alert_type = 'medication'
      AND is_resolved = false
      AND (metadata->>'intake_id')::UUID = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS tr_medication_intake_resolve_alerts ON public.medication_intakes;
CREATE TRIGGER tr_medication_intake_resolve_alerts
AFTER UPDATE ON public.medication_intakes
FOR EACH ROW
EXECUTE FUNCTION public.handle_medication_intake_resolve_alerts();
