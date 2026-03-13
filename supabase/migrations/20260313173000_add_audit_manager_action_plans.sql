-- Create audit_manager_action_plans table
CREATE TABLE IF NOT EXISTS audit_manager_action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type_id TEXT NOT NULL, -- e.g., '1', '2', or 'custom-...'
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    assigned_to TEXT NOT NULL, -- user_id
    assigned_to_email TEXT,
    resident_id TEXT, -- optional, if linked to a resident
    resident_name TEXT,
    care_home_id TEXT,
    organization_id TEXT NOT NULL,
    created_by TEXT, -- user_id
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_manager_action_plans_care_home_id ON audit_manager_action_plans(care_home_id);
CREATE INDEX IF NOT EXISTS idx_audit_manager_action_plans_organization_id ON audit_manager_action_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_manager_action_plans_assigned_to ON audit_manager_action_plans(assigned_to);

-- Enable RLS
ALTER TABLE audit_manager_action_plans ENABLE ROW LEVEL SECURITY;

-- Creation policy (authenticated users)
CREATE POLICY "authenticated_upsert_manager_ap" ON audit_manager_action_plans
    FOR ALL USING (auth.role() = 'authenticated');
