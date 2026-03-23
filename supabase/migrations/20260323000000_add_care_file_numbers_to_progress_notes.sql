-- Add care_file_numbers column to progress_notes table
-- This allows tracking which care file numbers are associated with each progress note

ALTER TABLE public.progress_notes
  ADD COLUMN IF NOT EXISTS care_file_numbers INTEGER[] DEFAULT '{}';

-- Create index for better query performance on care file numbers
CREATE INDEX IF NOT EXISTS idx_progress_notes_care_file_numbers ON public.progress_notes USING GIN(care_file_numbers);

-- Add comment to explain the column
COMMENT ON COLUMN public.progress_notes.care_file_numbers IS 'Array of care file numbers (1-20) associated with this progress note';
