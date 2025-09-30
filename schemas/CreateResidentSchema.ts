import z from "zod";

export const CreateResidentSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
  phoneNumber: z.string().optional(),
  roomNumber: z.string().min(1, { message: "Room number is required" }),
  admissionDate: z.string().min(1, { message: "Admission date is required" }),
  teamId: z.string().min(1, { message: "Team/Unit is required" }),
  nhsHealthNumber: z
    .string()
    .min(1, { message: "NHS Health & Care Number is required" }),
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
  dependencies: z.object({
    mobility: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent"], { message: "Mobility level is required" }),
    eating: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent"], { message: "Eating level is required" }),
    dressing: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent"], { message: "Dressing level is required" }),
    toileting: z.enum(["Independent", "Supervision Needed", "Assistance Needed", "Fully Dependent"], { message: "Toileting level is required" }),
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
    .min(1, { message: "At least one emergency contact is required" }),

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
