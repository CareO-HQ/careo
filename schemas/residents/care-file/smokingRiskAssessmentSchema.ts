import { z } from "zod";

export const smokingRiskAssessmentSchema = z.object({
    // Resident information
    residentName: z.string().optional(),
    residentDateOfBirth: z.number().optional(),

    // Assessment Questions - 1. Controlled Materials
    materialsControlled: z.boolean().optional(),
    materialsControlledDetails: z.string().optional(),

    // 2. Assistance Lighting
    assistanceLighting: z.boolean().optional(),
    assistanceLightingDetails: z.string().optional(),

    // 3. One cigarette at a time
    oneCigaretteAtTime: z.boolean().optional(),
    oneCigaretteAtTimeDetails: z.string().optional(),

    // 4. Supervision
    supervisionRequired: z.boolean().optional(),
    supervisionRequiredDetails: z.string().optional(),

    // 5. Extinguishing safely
    extinguishedCorrectly: z.boolean().optional(),
    extinguishedCorrectlyDetails: z.string().optional(),

    // 6. Bedroom control measures
    bedroomControlMeasures: z.string().optional(),
    bedroomControlMeasuresBool: z.boolean().optional(), // Adding boolean to match table layout

    // Oxygen sources risk controls
    oxygenInUseInBedroom: z.boolean().optional(),
    oxygenInUseInBedroomDetails: z.string().optional(),
    oxygenCylinderStorageSafe: z.boolean().optional(),
    oxygenCylinderStorageSafeDetails: z.string().optional(),
    oxygenNoSmokingSignage: z.boolean().optional(),
    oxygenNoSmokingSignageDetails: z.string().optional(),

    // Fuel sources risk controls
    fuelCombustibleMaterialsNearOxygen: z.boolean().optional(),
    fuelCombustibleMaterialsNearOxygenDetails: z.string().optional(),
    fuelSoftFurnishingsNearSmoking: z.boolean().optional(),
    fuelSoftFurnishingsNearSmokingDetails: z.string().optional(),
    fuelWasteBinsAndRubbishManaged: z.boolean().optional(),
    fuelWasteBinsAndRubbishManagedDetails: z.string().optional(),

    // Smoking room / area environment controls
    smokingRoomHasSafeAshtrays: z.boolean().optional(),
    smokingRoomHasSafeAshtraysDetails: z.string().optional(),
    smokingRoomNoSmokingInBed: z.boolean().optional(),
    smokingRoomNoSmokingInBedDetails: z.string().optional(),
    smokingRoomSupervisionProvided: z.boolean().optional(),
    smokingRoomSupervisionProvidedDetails: z.string().optional(),
    smokingRoomDoorClosedToCorridors: z.boolean().optional(),
    smokingRoomDoorClosedToCorridorsDetails: z.string().optional(),
    smokingRoomFireDoorsAndExitsClear: z.boolean().optional(),
    smokingRoomFireDoorsAndExitsClearDetails: z.string().optional(),
    smokingRoomHousekeepingGood: z.boolean().optional(),
    smokingRoomHousekeepingGoodDetails: z.string().optional(),

    // Risk assessment review
    riskReviewMonthly: z.boolean().optional(),
    riskReviewOnConditionChange: z.boolean().optional(),
    riskReviewOnIncident: z.boolean().optional(),

    // Relatives / visitors awareness
    relativesAware: z.boolean().optional(),
    relativesAwarenessDate: z.number().optional(),
    relativesAwarenessTime: z.string().optional(),

    // Completion details
    completedBy: z.string().optional(),
    completedBySignature: z.string().optional(),
    completedByRole: z.string().optional(),
    assessmentDate: z.number().optional(),

    // Optional metadata fields for drafts
    status: z.enum(["draft", "active", "submitted", "reviewed"]).optional()
});

export type SmokingRiskAssessmentFormData = z.infer<typeof smokingRiskAssessmentSchema>;
