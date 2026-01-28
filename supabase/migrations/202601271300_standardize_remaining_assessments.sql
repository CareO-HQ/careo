-- Migration: Standardize Remaining Assessment Schemas
-- Date: January 27, 2026
-- Description: Renames completion_date to assessment_date and ensures completed_by exists across all assessment tables.

-- 1. Infection Prevention Assessments
ALTER TABLE public.infection_prevention_assessments 
  RENAME COLUMN completion_date TO assessment_date;

-- 2. Moving & Handling Assessments
ALTER TABLE public.moving_handling_assessments 
  RENAME COLUMN completion_date TO assessment_date;

-- 3. Falls Risk Assessments
ALTER TABLE public.long_term_falls_risk_assessments 
  RENAME COLUMN completion_date TO assessment_date;

-- 4. PEEPs
ALTER TABLE public.peeps 
  RENAME COLUMN completion_date TO assessment_date;

-- 5. Dependency Assessments
ALTER TABLE public.dependency_assessments 
  RENAME COLUMN completion_date TO assessment_date;

-- 6. TIML Assessments
ALTER TABLE public.timl_assessments 
  RENAME COLUMN completion_date TO assessment_date;

-- 7. Skin Integrity Assessments
ALTER TABLE public.skin_integrity_assessments 
  RENAME COLUMN completion_date TO assessment_date;

-- 8. Bedrails Risk Assessments
ALTER TABLE public.bedrails_risk_assessments 
  RENAME COLUMN completion_date TO assessment_date;

-- 9. Bladder & Bowel Assessments
ALTER TABLE public.bladder_bowel_assessments 
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 10. Bedrail Consents
ALTER TABLE public.bedrail_consents 
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 11. Best Interest Decisions
ALTER TABLE public.best_interest_decisions 
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 12. DNACPRs
ALTER TABLE public.dnacprs 
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 13. Photography Consents
ALTER TABLE public.photography_consents 
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 14. Add completed_by to remaining tables
ALTER TABLE public.pain_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.nutritional_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.oral_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.choking_risk_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.infection_prevention_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.moving_handling_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.long_term_falls_risk_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.peeps ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.dependency_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.timl_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.skin_integrity_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.bedrails_risk_assessments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.cornell_depression_scales ADD COLUMN IF NOT EXISTS completed_by TEXT;




