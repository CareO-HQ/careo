-- Add professional registration fields for NMC and NISCC to staff profiles
-- niscc_registration_number already exists on public.users

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS nmc_pin_number TEXT,
  ADD COLUMN IF NOT EXISTS nmc_renewal_fee_date DATE,
  ADD COLUMN IF NOT EXISTS niscc_registration_date DATE,
  ADD COLUMN IF NOT EXISTS niscc_annual_fee_date DATE;

COMMENT ON COLUMN public.users.nmc_pin_number IS 'NMC PIN number for registered nurses';
COMMENT ON COLUMN public.users.nmc_renewal_fee_date IS 'Date when NMC renewal fee is due';
COMMENT ON COLUMN public.users.niscc_registration_date IS 'Date of NISCC registration';
COMMENT ON COLUMN public.users.niscc_annual_fee_date IS 'Date when NISCC annual fee is due';
