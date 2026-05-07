import { z } from "zod";

export const bradenRiskAssessmentSchema = z.object({
    residentName: z.string().min(1, "Resident name is required"),
    bedroomNumber: z.string().min(1, "Bedroom number is required"),
    assessmentDate: z.number().min(1, "Assessment date is required"),
    nextReviewDate: z.string().optional(),
    completedBy: z.string().optional(),

    sensoryPerception: z.enum(["1", "2", "3", "4"]),
    moisture: z.enum(["1", "2", "3", "4"]),
    activity: z.enum(["1", "2", "3", "4"]),
    mobility: z.enum(["1", "2", "3", "4"]),
    nutrition: z.enum(["1", "2", "3", "4"]),
    frictionShear: z.enum(["1", "2", "3"]),
});

export const calculateBradenScore = (values: Partial<z.infer<typeof bradenRiskAssessmentSchema>>) => {
    const scores = [
        parseInt(values.sensoryPerception || "0"),
        parseInt(values.moisture || "0"),
        parseInt(values.activity || "0"),
        parseInt(values.mobility || "0"),
        parseInt(values.nutrition || "0"),
        parseInt(values.frictionShear || "0"),
    ];
    return scores.reduce((acc, score) => acc + score, 0);
};

export const getBradenRiskLevel = (score: number, residentAge?: number) => {
    if (score === 0) return "N/A";

    if (score < 13) return "High Risk";
    if (score <= 14) return "Moderate Risk";

    if (residentAge !== undefined && residentAge >= 75) {
        if (score <= 18) return "Low Risk";
    } else {
        if (score <= 16) return "Low Risk";
    }

    return "No Risk";
};

export const getBradenRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
        case "Very High Risk":
        case "High Risk":
            return "text-destructive font-bold";
        case "Moderate Risk":
            return "text-amber-600 font-bold";
        case "Mild Risk":
            return "text-blue-600 font-bold";
        case "No Risk":
            return "text-green-600 font-bold";
        default:
            return "text-muted-foreground";
    }
};

export const bradenCategories = [
    {
        key: "sensoryPerception",
        label: "Sensory Perception",
        description: "Ability to respond meaningfully to pressure-related discomfort.",
        options: [
            {
                score: 1,
                label: "Completely Limited",
                fullText: "Unresponsive to painful stimuli (does not moan, flinch, or grasp) due to diminished level of consciousness or sedation; OR limited ability to feel pain over most of body.",
            },
            {
                score: 2,
                label: "Very Limited",
                fullText: "Responds only to painful stimuli. Cannot communicate discomfort except by moaning or restlessness; OR has a sensory impairment which limits the ability to feel pain or discomfort over 1/2 of body.",
            },
            {
                score: 3,
                label: "Slightly Limited",
                fullText: "Responds to verbal commands, but cannot always communicate discomfort or the need to be turned; OR has some sensory impairment which limits ability to feel pain or discomfort in 1 or 2 extremities.",
            },
            {
                score: 4,
                label: "No Impairment",
                fullText: "Responds to verbal commands. Has no sensory deficit which would limit ability to feel or voice pain or discomfort.",
            },
        ],
    },
    {
        key: "moisture",
        label: "Moisture",
        description: "Degree to which skin is exposed to moisture.",
        options: [
            {
                score: 1,
                label: "Constantly Moist",
                fullText: "Skin is kept moist almost constantly by perspiration, urine, etc. Dampness is detected every time patient is moved or turned.",
            },
            {
                score: 2,
                label: "Very Moist",
                fullText: "Skin is often, but not always moist. Linen must be changed at least once a shift.",
            },
            {
                score: 3,
                label: "Occasionally Moist",
                fullText: "Skin is occasionally moist, requiring an extra linen change approximately once a day.",
            },
            {
                score: 4,
                label: "Rarely Moist",
                fullText: "Skin is usually dry; linen only requires changing at routine intervals.",
            },
        ],
    },
    {
        key: "activity",
        label: "Activity",
        description: "Degree of physical activity.",
        options: [
            {
                score: 1,
                label: "Bedfast",
                fullText: "Confined to bed.",
            },
            {
                score: 2,
                label: "Chairfast",
                fullText: "Ability to walk severely limited or non-existent. Cannot bear own weight and/or must be assisted into chair or wheelchair.",
            },
            {
                score: 3,
                label: "Walks Occasionally",
                fullText: "Walks occasionally during day, but for very short distances, with or without assistance. Spends majority of each shift in bed or chair.",
            },
            {
                score: 4,
                label: "Walks Frequently",
                fullText: "Walks outside room at least twice a day and inside room at least once every two hours during waking hours.",
            },
        ],
    },
    {
        key: "mobility",
        label: "Mobility",
        description: "Ability to change and control body position.",
        options: [
            {
                score: 1,
                label: "Completely Immobile",
                fullText: "Does not make even slight changes in body or extremity position without assistance.",
            },
            {
                score: 2,
                label: "Very Limited",
                fullText: "Makes occasional slight changes in body or extremity position but unable to make frequent or significant changes independently.",
            },
            {
                score: 3,
                label: "Slightly Limited",
                fullText: "Makes frequent though slight changes in body or extremity position independently.",
            },
            {
                score: 4,
                label: "No Limitation",
                fullText: "Makes major and frequent changes in position without assistance.",
            },
        ],
    },
    {
        key: "nutrition",
        label: "Nutrition",
        description: "Usual food intake pattern.",
        options: [
            {
                score: 1,
                label: "Very Poor",
                fullText: "Never eats a complete meal. Rarely eats more than 1/3 of any food offered. Eats 2 servings or less of protein per day. Takes fluids poorly. Does not take a liquid dietary supplement OR is NPO and/or maintained on clear liquids or IV's for more than 5 days.",
            },
            {
                score: 2,
                label: "Probably Inadequate",
                fullText: "Rarely eats a complete meal and generally eats only about 1/2 of any food offered. Protein intake includes only 3 servings of meat or dairy products per day. Occasionally will take a dietary supplement OR receives less than optimum amount of liquid diet or tube feeding.",
            },
            {
                score: 3,
                label: "Adequate",
                fullText: "Eats over half of most meals. Eats a total of 4 servings of protein per day. Occasionally will refuse a meal, but will usually take a supplement when offered OR is on a tube feeding or TPN regimen which probably meets most of nutritional needs.",
            },
            {
                score: 4,
                label: "Excellent",
                fullText: "Eats most of every meal. Never refuses a meal. Usually eats a total of 4 or more servings of meat and dairy products. Occasionally eats between meals. Does not require supplementation.",
            },
        ],
    },
    {
        key: "frictionShear",
        label: "Friction and Shear",
        description: "Friction and Shear",
        options: [
            {
                score: 1,
                label: "Problem",
                fullText: "Requires moderate to maximum assistance in moving. Complete lifting without sliding against sheets is impossible. Frequently slides down in bed or chair, requiring frequent repositioning with maximum assistance. Spasticity, contractures or agitation leads to almost constant friction.",
            },
            {
                score: 2,
                label: "Potential Problem",
                fullText: "Moves feebly or requires minimum assistance. During a move skin probably slides to some extent against sheets, chair, restraints or other devices. Maintains relatively good position in chair or bed most of the time but occasionally slides down.",
            },
            {
                score: 3,
                label: "No Apparent Problem",
                fullText: "Moves in bed and in chair independently and has sufficient muscle strength to lift up completely during move. Maintains good position in bed or chair.",
            },
        ],
    },
];
