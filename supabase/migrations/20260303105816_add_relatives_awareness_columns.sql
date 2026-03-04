ALTER TABLE public.smoking_risk_assessments
    ADD COLUMN IF NOT EXISTS relatives_awareness_date DATE,
    ADD COLUMN IF NOT EXISTS relatives_awareness_time TEXT;