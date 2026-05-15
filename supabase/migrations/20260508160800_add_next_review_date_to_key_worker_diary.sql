ALTER TABLE key_worker_diary
ADD COLUMN IF NOT EXISTS next_review_date DATE;

CREATE INDEX IF NOT EXISTS idx_key_worker_diary_next_review_date
ON key_worker_diary(next_review_date);
