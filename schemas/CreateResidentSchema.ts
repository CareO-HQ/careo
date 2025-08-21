import z from "zod";

export const CreateResidentSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
  phoneNumber: z.string().optional(),
  roomNumber: z.string().optional(),
  admissionDate: z.string().min(1, { message: "Admission date is required" }),
  teamId: z.string().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1, { message: "Emergency contact name is required" }),
    phoneNumber: z.string().min(1, { message: "Emergency contact phone is required" }),
    relationship: z.string().min(1, { message: "Relationship is required" }),
    isPrimary: z.boolean().optional()
  })).min(1, { message: "At least one emergency contact is required" }),
  medicalInfo: z.object({
    allergies: z.string().optional(),
    medications: z.string().optional(),
    medicalConditions: z.string().optional()
  }).optional()
});