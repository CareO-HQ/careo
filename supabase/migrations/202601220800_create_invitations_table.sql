-- ============================================
-- Create Invitations Table
-- ============================================
-- This migration creates the public.invitations table which was missing in the schema

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'care_assistant',
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for quick token lookup
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);

-- Add index for email-based lookup
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- Trigger to update updated_at column
CREATE TRIGGER set_updated_at_invitation BEFORE UPDATE ON public.invitations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
