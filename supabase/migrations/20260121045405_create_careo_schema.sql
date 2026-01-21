-- ============================================
-- SUPPLEMENTARY SCHEMA: Care File Tables
-- ============================================
-- This file contains SQL for all care file assessment tables
-- Referenced in SUPABASE_MIGRATION_BLUEPRINT.md Section 2.2

-- ============================================
-- PRE-ADMISSION CARE FILES
-- ============================================

CREATE TABLE public.pre_admission_care_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  saved_as_draft BOOLEAN NOT NULL DEFAULT false,
  
  -- Header information
  consent_accepted_at TIMESTAMPTZ NOT NULL,
  care_home_name TEXT NOT NULL,
  nhs_health_care_number TEXT NOT NULL,
  user_name TEXT NOT NULL,
  job_role TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  
  -- Resident information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  ethnicity TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  religion TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  
  -- Next of kin
  kin_first_name TEXT NOT NULL,
  kin_last_name TEXT NOT NULL,
  kin_relationship TEXT NOT NULL,
  kin_phone_number TEXT NOT NULL,
  
  -- Professional contacts
  care_manager_name TEXT NOT NULL,
  care_manager_phone_number TEXT NOT NULL,
  district_nurse_name TEXT NOT NULL,
  district_nurse_phone_number TEXT NOT NULL,
  general_practitioner_name TEXT NOT NULL,
  general_practitioner_phone_number TEXT NOT NULL,
  provider_healthcare_info_name TEXT NOT NULL,
  provider_healthcare_info_designation TEXT NOT NULL,
  
  -- Medical information
  allergies TEXT,
  medical_history TEXT,
  medication_prescribed TEXT,
  
  -- Assessment fields (all TEXT for flexibility)
  consent_capacity_rights TEXT,
  medication TEXT,
  mobility TEXT,
  nutrition TEXT,
  continence TEXT,
  hygiene_dressing TEXT,
  skin TEXT,
  cognition TEXT,
  infection TEXT,
  breathing TEXT,
  altered_state_of_consciousness TEXT,
  
  -- Palliative and End of life care
  dnacpr BOOLEAN NOT NULL,
  advanced_decision BOOLEAN NOT NULL,
  capacity BOOLEAN NOT NULL,
  advanced_care_plan BOOLEAN NOT NULL,
  comments TEXT,
  
  -- Preferences
  room_preferences TEXT,
  admission_contact TEXT,
  food_preferences TEXT,
  preferred_name TEXT,
  family_concerns TEXT,
  
  -- Other information
  other_health_care_professional TEXT,
  equipment TEXT,
  
  -- Financial
  attend_finances BOOLEAN NOT NULL,
  
  -- Additional considerations
  additional_considerations TEXT,
  
  -- Outcome
  outcome TEXT,
  planned_admission_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  pdf_file_id UUID -- References storage.objects
);

CREATE INDEX idx_pre_admission_resident ON public.pre_admission_care_files(resident_id);
CREATE INDEX idx_pre_admission_org ON public.pre_admission_care_files(organization_id);
CREATE INDEX idx_pre_admission_team ON public.pre_admission_care_files(team_id);

-- ============================================
-- ADMISSION ASSESSMENTS
-- ============================================

CREATE TABLE public.admission_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Resident information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TIMESTAMPTZ NOT NULL,
  bedroom_number TEXT NOT NULL,
  admitted_from TEXT,
  religion TEXT,
  telephone_number TEXT,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE')),
  nhs_number TEXT NOT NULL,
  ethnicity TEXT,
  
  -- Next of kin
  kin_first_name TEXT NOT NULL,
  kin_last_name TEXT NOT NULL,
  kin_relationship TEXT NOT NULL,
  kin_telephone_number TEXT NOT NULL,
  kin_address TEXT NOT NULL,
  kin_email TEXT NOT NULL,
  
  -- Emergency contacts
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_telephone_number TEXT NOT NULL,
  emergency_contact_relationship TEXT NOT NULL,
  emergency_contact_phone_number TEXT NOT NULL,
  
  -- Care manager
  care_manager_name TEXT,
  care_manager_telephone_number TEXT,
  care_manager_relationship TEXT,
  care_manager_phone_number TEXT,
  care_manager_address TEXT,
  care_manager_job_role TEXT,
  
  -- GP
  gp_name TEXT,
  gp_address TEXT,
  gp_phone_number TEXT,
  
  -- Medical
  allergies TEXT,
  medical_history TEXT,
  prescribed_medications TEXT,
  consent_capacity_rights TEXT,
  medication TEXT,
  
  -- Skin integrity
  skin_integrity_equipment TEXT,
  skin_integrity_wounds TEXT,
  
  -- Sleep
  bedtime_routine TEXT,
  
  -- Infection control
  current_infection TEXT,
  antibiotics_prescribed BOOLEAN NOT NULL,
  
  -- Breathing
  prescribed_breathing TEXT,
  
  -- Mobility
  mobility_independent BOOLEAN NOT NULL,
  assistance_required TEXT,
  equipment_required TEXT,
  
  -- Nutrition
  weight TEXT NOT NULL,
  height TEXT NOT NULL,
  iddsi_food TEXT NOT NULL,
  iddsi_fluid TEXT NOT NULL,
  diet_type TEXT NOT NULL,
  nutritional_supplements TEXT,
  nutritional_assistance_required TEXT,
  choking_risk BOOLEAN NOT NULL,
  additional_comments TEXT,
  
  -- Continence
  continence TEXT,
  
  -- Hygiene
  hygiene TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_assessments_resident ON public.admission_assessments(resident_id);
CREATE INDEX idx_admission_assessments_org ON public.admission_assessments(organization_id);
CREATE INDEX idx_admission_assessments_team ON public.admission_assessments(team_id);

-- ============================================
-- INFECTION PREVENTION ASSESSMENTS
-- ============================================

CREATE TABLE public.infection_prevention_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Person's details
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  home_address TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('Pre-admission', 'Admission')),
  information_provided_by TEXT,
  admitted_from TEXT,
  consultant_gp TEXT,
  reason_for_admission TEXT,
  date_of_admission DATE,
  
  -- Acute Respiratory Illness (ARI)
  new_continuous_cough BOOLEAN NOT NULL,
  worsening_cough BOOLEAN NOT NULL,
  temperature_high BOOLEAN NOT NULL,
  other_respiratory_symptoms TEXT,
  tested_for_covid19 BOOLEAN NOT NULL,
  tested_for_influenza_a BOOLEAN NOT NULL,
  tested_for_influenza_b BOOLEAN NOT NULL,
  tested_for_respiratory_screen BOOLEAN NOT NULL,
  influenza_b BOOLEAN NOT NULL,
  respiratory_screen BOOLEAN NOT NULL,
  exposure_to_patients_covid BOOLEAN NOT NULL,
  exposure_to_staff_covid BOOLEAN NOT NULL,
  isolation_required BOOLEAN NOT NULL,
  isolation_details TEXT,
  further_treatment_required BOOLEAN NOT NULL,
  
  -- Infective Diarrhoea / Vomiting
  diarrhea_vomiting_current_symptoms BOOLEAN NOT NULL,
  diarrhea_vomiting_contact_with_others BOOLEAN NOT NULL,
  diarrhea_vomiting_family_history_72h BOOLEAN NOT NULL,
  
  -- Clostridium Difficile
  clostridium_active BOOLEAN NOT NULL,
  clostridium_history BOOLEAN NOT NULL,
  clostridium_stool_count_72h TEXT,
  clostridium_last_positive_specimen_date DATE,
  clostridium_result TEXT,
  clostridium_treatment_received TEXT,
  clostridium_treatment_complete BOOLEAN,
  ongoing_details TEXT,
  ongoing_date_commenced DATE,
  ongoing_length_of_course TEXT,
  ongoing_follow_up_required TEXT,
  
  -- MRSA / MSSA
  mrsa_mssa_colonised BOOLEAN NOT NULL,
  mrsa_mssa_infected BOOLEAN NOT NULL,
  mrsa_mssa_last_positive_swab_date DATE,
  mrsa_mssa_sites_positive TEXT,
  mrsa_mssa_treatment_received TEXT,
  mrsa_mssa_treatment_complete TEXT,
  mrsa_mssa_details TEXT,
  mrsa_mssa_date_commenced DATE,
  mrsa_mssa_length_of_course TEXT,
  mrsa_mssa_follow_up_required TEXT,
  
  -- Multi-drug resistant organisms
  esbl BOOLEAN NOT NULL,
  vre_gre BOOLEAN NOT NULL,
  cpe BOOLEAN NOT NULL,
  other_multi_drug_resistance TEXT,
  relevant_information_multi_drug_resistance TEXT,
  
  -- Other Information
  awareness_of_infection BOOLEAN NOT NULL,
  last_flu_vaccination_date DATE,
  
  -- Assessment Completion
  completed_by TEXT NOT NULL,
  job_role TEXT NOT NULL,
  signature TEXT NOT NULL,
  completion_date DATE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  saved_as_draft BOOLEAN DEFAULT false,
  pdf_file_id UUID
);

CREATE INDEX idx_infection_prevention_resident ON public.infection_prevention_assessments(resident_id);
CREATE INDEX idx_infection_prevention_team ON public.infection_prevention_assessments(team_id);
CREATE INDEX idx_infection_prevention_org ON public.infection_prevention_assessments(organization_id);
CREATE INDEX idx_infection_prevention_type ON public.infection_prevention_assessments(assessment_type);
CREATE INDEX idx_infection_prevention_completion_date ON public.infection_prevention_assessments(completion_date);

-- ============================================
-- BLADDER BOWEL ASSESSMENTS
-- ============================================

CREATE TABLE public.bladder_bowel_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Section 1 - Resident info
  resident_name TEXT NOT NULL,
  date_of_birth TIMESTAMPTZ NOT NULL,
  bedroom_number TEXT NOT NULL,
  information_obtained_from TEXT NOT NULL,
  
  -- Section 2 - Infections (all optional booleans)
  hepatitis_ab BOOLEAN,
  blood_borne_viruses BOOLEAN,
  mrsa BOOLEAN,
  esbl BOOLEAN,
  other TEXT,
  
  -- Section 3 - Urinalysis on Admission
  ph BOOLEAN,
  nitrates BOOLEAN,
  protein BOOLEAN,
  leucocytes BOOLEAN,
  glucose BOOLEAN,
  blood_result BOOLEAN,
  mssu_date TIMESTAMPTZ,
  
  -- Section 4 - Prescribed medication (all optional booleans)
  anti_hypertensives BOOLEAN,
  anti_parkinson_drugs BOOLEAN,
  iron_supplement BOOLEAN,
  laxatives BOOLEAN,
  diuretics BOOLEAN,
  histamine BOOLEAN,
  anti_depressants BOOLEAN,
  cholinergic BOOLEAN,
  sedatives_hypnotic BOOLEAN,
  anti_psychotic BOOLEAN,
  antihistamines BOOLEAN,
  narcotic_analgesics BOOLEAN,
  
  -- Section 5 - Lifestyle
  caffeine_mls_24h INTEGER,
  caffeine_frequency TEXT,
  caffeine_time_of_day TEXT,
  exercise_type TEXT,
  exercise_frequency TEXT,
  exercise_time_of_day TEXT,
  alcohol_amount_24h INTEGER,
  alcohol_frequency TEXT,
  alcohol_time_of_day TEXT,
  smoking TEXT NOT NULL CHECK (smoking IN ('SMOKER', 'NON-SMOKER', 'EX-SMOKER')),
  weight TEXT NOT NULL CHECK (weight IN ('NORMAL', 'OBESE', 'UNDERWEIGHT')),
  skin_condition TEXT NOT NULL CHECK (skin_condition IN ('HEALTHY', 'RED', 'EXCORIATED', 'BROKEN')),
  constipation_history BOOLEAN,
  mental_state TEXT NOT NULL CHECK (mental_state IN ('ALERT', 'CONFUSED', 'LEARNING-DISABLED', 'COGNITIVELY-IMPAIRED')),
  mobility_issues TEXT NOT NULL CHECK (mobility_issues IN ('INDEPENDENT', 'ASSISTANCE', 'HOISTED')),
  history_recurrent_utis BOOLEAN,
  
  -- Section 6 - Urinary continence
  incontinence TEXT NOT NULL CHECK (incontinence IN ('NONE', 'ONE', '1-2DAY', '3DAY', 'NIGHT', 'DAYANDNIGHT')),
  volume TEXT NOT NULL CHECK (volume IN ('ENTIRE-BLADDER', 'SMALL-VOL', 'UNABLE-DETERMINE')),
  onset TEXT NOT NULL CHECK (onset IN ('SUDDEN', 'GRADUAL')),
  duration TEXT NOT NULL CHECK (duration IN ('LESS-6M', '6M-1Y', 'MORE-1Y')),
  symptoms_last_six TEXT NOT NULL CHECK (symptoms_last_six IN ('STABLE', 'WORSENING', 'IMPROVING', 'FLUCTUATING')),
  physician_consulted BOOLEAN,
  
  -- Section 7 - Bowel pattern
  bowel_state TEXT NOT NULL CHECK (bowel_state IN ('NORMAL', 'CONSTIPATION', 'DIARRHOEA', 'STOMA', 'FAECAL-INCONTINENCE', 'IRRITABLE-BOWEL')),
  bowel_frequency TEXT NOT NULL,
  usual_time_of_day TEXT NOT NULL,
  amount_and_stool_type TEXT NOT NULL,
  liquid_feeds TEXT NOT NULL,
  other_factors TEXT NOT NULL,
  other_remedies TEXT NOT NULL,
  medical_officer_consulted BOOLEAN,
  
  -- Section 8 - Current toileting pattern
  day_pattern TEXT NOT NULL CHECK (day_pattern IN ('TOILET', 'COMMODE', 'BED-PAN', 'URINAL')),
  evening_pattern TEXT NOT NULL CHECK (evening_pattern IN ('TOILET', 'COMMODE', 'BED-PAN', 'URINAL')),
  night_pattern TEXT NOT NULL CHECK (night_pattern IN ('TOILET', 'COMMODE', 'BED-PAN', 'URINAL')),
  types_of_pads TEXT NOT NULL,
  
  -- Section 9 - Symptoms (all optional booleans)
  leak_cough_laugh BOOLEAN,
  leak_standing_up BOOLEAN,
  leak_upstairs_downhill BOOLEAN,
  passes_urine_frequently BOOLEAN,
  desire_pass_urine BOOLEAN,
  leaks_before_toilet BOOLEAN,
  more_than_twice_at_night BOOLEAN,
  anxiety BOOLEAN,
  difficulty_starting BOOLEAN,
  hesitancy BOOLEAN,
  dribbles BOOLEAN,
  feels_full BOOLEAN,
  recurrent_tract_infections BOOLEAN,
  limited_mobility BOOLEAN,
  unable_on_time BOOLEAN,
  not_hold_urinal_or_seat BOOLEAN,
  not_use_call_bell BOOLEAN,
  poor_vision BOOLEAN,
  assisted_transfer BOOLEAN,
  pain BOOLEAN,
  
  -- Section 10
  bladder_continent BOOLEAN,
  bladder_incontinent BOOLEAN,
  bladder_incontinent_type TEXT CHECK (bladder_incontinent_type IN ('STRESS', 'URGE', 'MIXED', 'FUNCTIONAL')),
  bladder_plan_commenced BOOLEAN,
  bladder_referral_required TEXT CHECK (bladder_referral_required IN ('DIETICIAN', 'GP', 'OT', 'PHYSIOTHERAPIST', 'CONTINENCE-NURSE', 'NONE')),
  bladder_plan_followed TEXT CHECK (bladder_plan_followed IN ('STRESS', 'URGE', 'MIXED', 'RETENTION-OVERFLOW')),
  bowel_continent BOOLEAN,
  bowel_incontinent BOOLEAN,
  bowel_plan_commenced BOOLEAN,
  bowel_record_commenced BOOLEAN,
  bowel_referral_required TEXT CHECK (bowel_referral_required IN ('DIETICIAN', 'GP', 'OT', 'PHYSIOTHERAPIST', 'NONE')),
  
  -- Section 11
  signature_completing_assessment TEXT NOT NULL,
  signature_resident TEXT,
  date_next_review TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  saved_as_draft BOOLEAN DEFAULT false,
  pdf_file_id UUID
);

CREATE INDEX idx_bladder_bowel_resident ON public.bladder_bowel_assessments(resident_id);

-- ============================================
-- MOVING & HANDLING ASSESSMENTS
-- ============================================

CREATE TABLE public.moving_handling_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Section 1: Resident information
  resident_name TEXT NOT NULL,
  date_of_birth TIMESTAMPTZ NOT NULL,
  bedroom_number TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  history_of_falls BOOLEAN NOT NULL,
  
  -- Section 2: Mobility Assessment
  independent_mobility BOOLEAN NOT NULL,
  can_weight_bear TEXT NOT NULL CHECK (can_weight_bear IN ('FULLY', 'PARTIALLY', 'WITH-AID', 'NO-WEIGHTBEARING')),
  limb_upper_right TEXT NOT NULL CHECK (limb_upper_right IN ('FULLY', 'PARTIALLY', 'NONE')),
  limb_upper_left TEXT NOT NULL CHECK (limb_upper_left IN ('FULLY', 'PARTIALLY', 'NONE')),
  limb_lower_right TEXT NOT NULL CHECK (limb_lower_right IN ('FULLY', 'PARTIALLY', 'NONE')),
  limb_lower_left TEXT NOT NULL CHECK (limb_lower_left IN ('FULLY', 'PARTIALLY', 'NONE')),
  equipment_used TEXT,
  needs_risk_staff TEXT,
  
  -- Section 3-6: Risk Factors (all use ALWAYS/SOMETIMES/NEVER pattern)
  deafness_state TEXT NOT NULL CHECK (deafness_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  deafness_comments TEXT,
  blindness_state TEXT NOT NULL CHECK (blindness_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  blindness_comments TEXT,
  unpredictable_behaviour_state TEXT NOT NULL CHECK (unpredictable_behaviour_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  unpredictable_behaviour_comments TEXT,
  uncooperative_behaviour_state TEXT NOT NULL CHECK (uncooperative_behaviour_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  uncooperative_behaviour_comments TEXT,
  distressed_reaction_state TEXT NOT NULL CHECK (distressed_reaction_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  distressed_reaction_comments TEXT,
  disorientated_state TEXT NOT NULL CHECK (disorientated_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  disorientated_comments TEXT,
  unconscious_state TEXT NOT NULL CHECK (unconscious_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  unconscious_comments TEXT,
  unbalance_state TEXT NOT NULL CHECK (unbalance_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  unbalance_comments TEXT,
  spasms_state TEXT NOT NULL CHECK (spasms_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  spasms_comments TEXT,
  stiffness_state TEXT NOT NULL CHECK (stiffness_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  stiffness_comments TEXT,
  catheters_state TEXT NOT NULL CHECK (catheters_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  catheters_comments TEXT,
  incontinence_state TEXT NOT NULL CHECK (incontinence_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  incontinence_comments TEXT,
  localised_pain TEXT NOT NULL CHECK (localised_pain IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  localised_pain_comments TEXT,
  other_state TEXT NOT NULL CHECK (other_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  other_comments TEXT,
  
  -- Section 7: Assessment Completion
  completed_by TEXT NOT NULL,
  job_role TEXT NOT NULL,
  signature TEXT NOT NULL,
  completion_date DATE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  saved_as_draft BOOLEAN DEFAULT false,
  pdf_file_id UUID
);

CREATE INDEX idx_moving_handling_resident ON public.moving_handling_assessments(resident_id);

-- ============================================
-- RLS POLICIES FOR CARE FILE TABLES
-- ============================================

-- Enable RLS
ALTER TABLE public.pre_admission_care_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infection_prevention_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bladder_bowel_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moving_handling_assessments ENABLE ROW LEVEL SECURITY;

-- Pre-admission care files policies
CREATE POLICY "Users can read pre-admission files"
  ON public.pre_admission_care_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = pre_admission_care_files.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create pre-admission files"
  ON public.pre_admission_care_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = pre_admission_care_files.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- Admission assessments policies
CREATE POLICY "Users can read admission assessments"
  ON public.admission_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = admission_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create admission assessments"
  ON public.admission_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = admission_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- Similar policies for other care file tables...
-- (Apply same pattern to infection_prevention_assessments, bladder_bowel_assessments, etc.)

