import { z } from "zod";

export const specimenRecordSchema = z.object({
    // Resident information (auto-filled)
    residentName: z.string().optional(),
    residentDateOfBirth: z.number().optional(),
    bedroomNumber: z.string().optional(),

    // Log Entry Fields
    dateTimeObtained: z.number({
        required_error: "Date and time obtained is required"
    }),
    specimenType: z.string().min(1, "Type of specimen is required"),
    specimenRequested: z.string().min(1, "Specimen requested is required"),
    staffObtainingSignature: z.string().min(1, "Signature of staff obtaining specimen is required"),

    // Optional/Results fields
    dateResultsReceived: z.number().optional().nullable(),
    results: z.string().optional().nullable(),
    staffReceivingSignature: z.string().optional().nullable(),

    // Metadata
    status: z.enum(["draft", "active"]).default("active")
});

export type SpecimenRecordFormData = z.infer<typeof specimenRecordSchema>;
