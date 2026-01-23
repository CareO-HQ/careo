-- RLS Policies for todos table

-- 1. Enable RLS (already enabled in consolidated schema, but good to ensure)
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view todos in their organization" ON public.todos;
DROP POLICY IF EXISTS "Users can create todos in their organization" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos or todos in their organization" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

-- 3. Create policies

-- View: Users can see todos in their organization
CREATE POLICY "Users can view todos in their organization"
ON public.todos FOR SELECT
TO authenticated
USING (
  public.can_access_organization(organization_id)
);

-- Create: Users can create todos in their organization
CREATE POLICY "Users can create todos in their organization"
ON public.todos FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_organization(organization_id)
  AND auth.uid() = created_by
);

-- Update: Users can update todos in their organization
CREATE POLICY "Users can update todos in their organization"
ON public.todos FOR UPDATE
TO authenticated
USING (
  public.can_access_organization(organization_id)
)
WITH CHECK (
  public.can_access_organization(organization_id)
);

-- Delete: Users can delete todos in their organization
CREATE POLICY "Users can delete todos in their organization"
ON public.todos FOR DELETE
TO authenticated
USING (
  public.can_access_organization(organization_id)
);
