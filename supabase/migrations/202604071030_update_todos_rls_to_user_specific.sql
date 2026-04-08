-- Update RLS Policies for todos table to be user-specific

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view todos in their organization" ON public.todos;
DROP POLICY IF EXISTS "Users can create todos in their organization" ON public.todos;
DROP POLICY IF EXISTS "Users can update todos in their organization" ON public.todos;
DROP POLICY IF EXISTS "Users can delete todos in their organization" ON public.todos;

-- 2. Create new user-specific policies

-- View: Users can only see their own todos
CREATE POLICY "Users can view their own todos"
ON public.todos FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
);

-- Create: Users can create todos (must be the creator)
CREATE POLICY "Users can create their own todos"
ON public.todos FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- Update: Users can only update their own todos
CREATE POLICY "Users can update their own todos"
ON public.todos FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = created_by
);

-- Delete: Users can only delete their own todos
CREATE POLICY "Users can delete their own todos"
ON public.todos FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
);
