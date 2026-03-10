-- Add wound_folder_id to care_plan_assessments to link care plans to specific wounds
ALTER TABLE public.care_plan_assessments 
ADD COLUMN wound_folder_id UUID REFERENCES public.wound_folders(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_care_plan_assessments_wound_folder_id ON public.care_plan_assessments(wound_folder_id);

-- Update RLS policies to ensure access via wound_folder_id if needed
-- The existing policy "Users within organization can view care plan assessments" 
-- uses public.can_access_organization(organization_id) which should still be valid.
