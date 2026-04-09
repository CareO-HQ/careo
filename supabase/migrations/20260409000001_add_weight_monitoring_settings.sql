-- Add weight monitoring settings to residents table
ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS weight_check_frequency TEXT DEFAULT 'monthly' CHECK (weight_check_frequency IN ('weekly', 'monthly', 'as-needed'));

-- Add comment for documentation
COMMENT ON COLUMN public.residents.weight_check_frequency IS 'How often weight should be checked for this resident: weekly, monthly, or as-needed';
