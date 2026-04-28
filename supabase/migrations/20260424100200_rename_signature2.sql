-- Rename signature_2 to signature2 to match the code
ALTER TABLE blood_monitoring_records 
RENAME COLUMN signature_2 TO signature2;
