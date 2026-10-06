import z from "zod";
import { isFutureIsoDate, isIsoDate, isValidNhsNumber } from "@/lib/validation";

const dateOfBirthField = z
  .string()
  .min(1, { message: "Date of birth is required" })
  .refine(isIsoDate, { message: "Enter a valid date of birth" })
  .refine((v) => !isFutureIsoDate(v), { message: "Date of birth cannot be in the future" });

export const CreateResidentSchema = z.object({
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  middleName: z.string().optional(),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  dateOfBirth: dateOfBirthField,
  phoneNumber: z.string().optional(),
  roomNumber: z.string().min(1, { message: "Room number is required" }),
  admissionDate: z.string().min(1, { message: "Admission date is required" }),
  teamId: z.string().min(1, { message: "Team/Unit is required" }),
  nhsHealthNumber: z
    .string()
    .min(1, { message: "NHS Health & Care Number is required" })
    .refine(isValidNhsNumber, { message: "Enter a valid 10-digit NHS / H&C number" }),
  healthConditions: z
    .array(
      z.object({
        condition: z
          .string()
          .min(1, { message: "Health condition is required" })
      })
    )
    .optional(),
  risks: z
    .array(
      z.object({
        risk: z.string().min(1, { message: "Risk is required" }),
        level: z.enum(["low", "medium", "high"], { message: "Risk level is required" })
      })
    )
    .optional(),
  allergies: z
    .array(
      z.object({
        allergy: z.string().min(1, { message: "Allergy name is required" })
      })
    )
    .optional(),
  dependencies: z.object({
    mobility: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"], { message: "Mobility level is required" }),
    eating: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"], { message: "Eating level is required" }),
    dressing: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"], { message: "Dressing level is required" }),
    toileting: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"], { message: "Toileting level is required" }),
  }),
  emergencyContacts: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, { message: "Emergency contact name is required" }),
        phoneNumber: z
          .string()
          .min(1, { message: "Emergency contact phone is required" }),
        relationship: z
          .string()
          .min(1, { message: "Relationship is required" }),
        address: z
          .string()
          .optional(),
        isPrimary: z.boolean().optional()
      })
    )
    .optional(),

  // GP Details
  gpDetails: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
  }).optional(),

  // Care Manager Details
  careManagerDetails: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
  }).optional()
}).superRefine((data, ctx) => {
  if (isIsoDate(data.dateOfBirth) && isIsoDate(data.admissionDate) && data.admissionDate < data.dateOfBirth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["admissionDate"],
      message: "Admission date cannot be before the date of birth",
    });
  }
});

export const EditResidentSchema = z.object({
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  middleName: z.string().optional(),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  dateOfBirth: dateOfBirthField,
  phoneNumber: z.string().optional(),
  roomNumber: z.string().optional(),
  admissionDate: z.string().optional(),
  teamId: z.string().optional(),
  nhsHealthNumber: z
    .string()
    .optional()
    .refine((v) => !v || isValidNhsNumber(v), { message: "Enter a valid 10-digit NHS / H&C number" }),
  healthConditions: z
    .array(
      z.object({
        condition: z
          .string()
          .min(1, { message: "Health condition is required" })
      })
    )
    .optional(),
  risks: z
    .array(
      z.object({
        risk: z.string().min(1, { message: "Risk is required" }),
        level: z.enum(["low", "medium", "high"], { message: "Risk level is required" })
      })
    )
    .optional(),
  allergies: z
    .array(
      z.object({
        allergy: z.string().min(1, { message: "Allergy name is required" })
      })
    )
    .optional(),
  dependencies: z.object({
    mobility: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"]).optional().or(z.literal("")).or(z.literal("none")),
    eating: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"]).optional().or(z.literal("")).or(z.literal("none")),
    dressing: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"]).optional().or(z.literal("")).or(z.literal("none")),
    toileting: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent", "Prompt Needed"]).optional().or(z.literal("")).or(z.literal("none")),
  }).optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, { message: "Emergency contact name is required" }),
        phoneNumber: z
          .string()
          .min(1, { message: "Emergency contact phone is required" }),
        relationship: z
          .string()
          .min(1, { message: "Relationship is required" }),
        address: z
          .string()
          .optional(),
        isPrimary: z.boolean().optional()
      })
    )
    .optional(),

  // GP Details
  gpDetails: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
  }).optional(),

  // Care Manager Details
  careManagerDetails: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
  }).optional()
});

