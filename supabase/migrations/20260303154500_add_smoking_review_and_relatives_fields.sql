-- Add review and relatives awareness fields to smoking_risk_assessments
ALTER TABLE public.smoking_risk_assessments
    ADD COLUMN IF NOT EXISTS risk_review_monthly BOOLEAN,
    ADD COLUMN IF NOT EXISTS risk_review_on_condition_change BOOLEAN,
    ADD COLUMN IF NOT EXISTS risk_review_on_incident BOOLEAN,
    ADD COLUMN IF NOT EXISTS relatives_aware BOOLEAN,
    ADD COLUMN IF NOT EXISTS relatives_awareness_date DATE,
    ADD COLUMN IF NOT EXISTS relatives_awareness_time TEXT,
    ADD COLUMN IF NOT EXISTS completed_by_role TEXT;

