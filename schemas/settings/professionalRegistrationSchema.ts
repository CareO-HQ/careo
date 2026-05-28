import { z } from "zod";

export const professionalRegistrationSchema = z.object({
  nmc_pin_number: z.string().optional(),
  nmc_renewal_fee_date: z.string().optional(),
  niscc_registration_number: z.string().optional(),
  niscc_registration_date: z.string().optional(),
  niscc_annual_fee_date: z.string().optional(),
});
