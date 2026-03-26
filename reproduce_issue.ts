import { calculateFallRiskScore } from "./schemas/residents/care-file/fallRiskAssessmentSchema";

const testCases = [
    {
        name: "New label: Neurological",
        data: { medicalConditions: "Neurological" },
        expectedScore: 2
    },
    {
        name: "New label: Postural",
        data: { medicalConditions: "Postural" },
        expectedScore: 2
    },
    {
        name: "Legacy label",
        data: { medicalConditions: "Neurological/Postural/Cardiac/MuscularSkeletal/Fracture" },
        expectedScore: 2
    },
    {
        name: "Listed conditions",
        data: { medicalConditions: "Listed conditions" },
        expectedScore: 1
    },
    {
        name: "No identified",
        data: { medicalConditions: "No identified medical conditions" },
        expectedScore: 0
    }
];

testCases.forEach(test => {
    const actual = calculateFallRiskScore(test.data);
    // Note: calculateFallRiskScore sums up all fields, but here we only care about medicalConditions
    // Since only medicalConditions is provided, and other fields default to 0 (except those with defaults in the schema?)
    // Actually, calculateFallRiskScore uses FALL_RISK_OPTIONS. By default, it might add points for gender (Male = 1) etc if not provided.
    // Let's check the schema defaults.
    
    // Gender default is "Male" (1 pt)
    // Age default is "Under 65" (0 pts)
    // ...
    // So a base score might not be 0.
    
    console.log(`Test: ${test.name}`);
    console.log(`Score: ${actual}`);
});
