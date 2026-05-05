-- Add container_type column to medications table
ALTER TABLE public.medications ADD COLUMN container_type TEXT;

-- Update the check constraint for dosage_form to include possible new forms if needed
-- (Current forms: 'Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 'Ointment', 'Patch', 'Inhaler')
-- No changes needed to dosage_form check for now as 'Injection' is already there.

-- No check constraint on container_type yet to allow flexibility, 
-- but we can add one if strict enforcement is desired.
-- ALTER TABLE public.medications ADD CONSTRAINT medications_container_type_check 
-- CHECK (container_type IN ('Vial', 'Bottle', 'Insulin pen', 'Pen cartridge'));
