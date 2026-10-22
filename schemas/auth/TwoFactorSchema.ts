import { z } from "zod";

export const TwoFactorSchema = z.object({
  code: z
    .string()
    .min(6, { message: "Code must be 6 digits" })
    .max(6, { message: "Code must be 6 digits" })
    .regex(/^\d+$/, { message: "Code must contain only numbers" })
});

export type TwoFactorFormData = z.infer<typeof TwoFactorSchema>;

/** Backup codes look like "abcde-23456"; spaces, dashes and case are ignored. */
export const BackupCodeSchema = z.object({
  code: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .length(10, { message: "Backup codes have 10 characters" })
        .regex(/^[a-zA-Z0-9]+$/, { message: "Backup codes contain only letters and numbers" })
    )
});

export type BackupCodeFormInput = z.input<typeof BackupCodeSchema>;
