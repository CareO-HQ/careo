-- Rename columns in blood_monitoring_records to match updated schema
ALTER TABLE blood_monitoring_records 
RENAME COLUMN bm_level TO blood_sugar;

ALTER TABLE blood_monitoring_records 
RENAME COLUMN signature TO signature1;
