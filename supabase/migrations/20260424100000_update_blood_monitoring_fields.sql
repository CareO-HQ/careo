-- Update blood monitoring records table with new fields
ALTER TABLE blood_monitoring_records
ADD COLUMN IF NOT EXISTS ketones TEXT,
ADD COLUMN IF NOT EXISTS meal_status TEXT,
ADD COLUMN IF NOT EXISTS insulin_administered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS signature_2 TEXT;

-- Make site_used optional
ALTER TABLE blood_monitoring_records
ALTER COLUMN site_used DROP NOT NULL;
