import { z } from "zod";

export const restraintTypes = [
    "Wheelchair lap belt",
    "Specialised chair with no lap belt",
    "Specialised chair with lap belt",
    "Alarm mat",
    "Crash mat",
    "Bed rails",
    "Door alarms",
    "Chemical restraint"
] as const;

export const restraintsConsentSchema = z.object({
    // Header
    residentName: z.string().min(1, "Resident name is required"),
    careHomeUnit: z.string().min(1, "Care Home/Unit is required"),
    dateOfBirth: z.number().optional(),

    // Restraints
    selectedRestraints: z.array(z.string()).min(1, "At least one restraint must be selected"),

    // Consent Type
    consentType: z.enum(["ABLE_TO_CONSENT", "UNABLE_TO_CONSENT"]),

    // Section: Persons who are able to Consent
    ableToConsent: z.object({
        name: z.string().optional(),
        riskOf: z.string().optional(),
        preference: z.enum(["PREFER_USE", "DO_NOT_WANT_USE"]).optional(),
        personSignature: z.string().optional(),
        personSignatureDate: z.string().optional(),
        memberSignature: z.string().optional(),
        memberSignatureDate: z.string().optional()
    }).optional(),

    // Section: Discussion with Relative (NOK)
    discussionWithRelative: z.object({
        relativeName: z.string().optional(),
        issueOf: z.string().optional(),
        residentName: z.string().optional(),
        preference: z.enum(["WOULD_HAVE_PREFERRED", "WOULD_NOT_HAVE_PREFERRED"]).optional(),
        restraintUsed: z.string().optional(),
        personSignature: z.string().optional(),
        personSignatureDate: z.string().optional(),
        memberSignature: z.string().optional(),
        memberSignatureDate: z.string().optional()
    }).optional(),

    // System fields
    assessmentDate: z.string().optional(),
    completedBy: z.string().optional(),
    status: z.enum(["draft", "submitted"]).default("draft")
}).superRefine((data, ctx) => {
    if (data.consentType === "ABLE_TO_CONSENT") {
        if (!data.ableToConsent?.name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Name is required for consent",
                path: ["ableToConsent", "name"]
            });
        }
        if (!data.ableToConsent?.personSignature) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Signature is required",
                path: ["ableToConsent", "personSignature"]
            });
        }
    } else if (data.consentType === "UNABLE_TO_CONSENT") {
        if (!data.discussionWithRelative?.relativeName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Relative name is required",
                path: ["discussionWithRelative", "relativeName"]
            });
        }
        if (!data.discussionWithRelative?.personSignature) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Signature is required",
                path: ["discussionWithRelative", "personSignature"]
            });
        }
    }
});

export type RestraintsConsentFormData = z.infer<typeof restraintsConsentSchema>;
