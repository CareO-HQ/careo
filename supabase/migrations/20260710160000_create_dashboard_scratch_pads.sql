-- Personal dashboard scratch pad (one note per user per organization)
CREATE TABLE public.dashboard_scratch_pads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.dashboard_scratch_pads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scratch pad"
ON public.dashboard_scratch_pads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scratch pad"
ON public.dashboard_scratch_pads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scratch pad"
ON public.dashboard_scratch_pads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scratch pad"
ON public.dashboard_scratch_pads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_dashboard_scratch_pads
  BEFORE UPDATE ON public.dashboard_scratch_pads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
