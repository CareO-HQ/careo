export const config = {
  limits: {
    organizations: 3,
    teams: 10,
    size: 1024 * 1024 * 5 // 5MB
  },
  times: [
    {
      name: "Morning",
      values: ["08:00", "10:00", "12:00"]
    },
    {
      name: "Afternoon",
      values: ["14:00", "18:00"]
    },
    {
      name: "Evening",
      values: ["22:00", "00:00"]
    }
  ],
  careFiles: [
    {
      type: "folder",
      key: "preAdmission",
      value: "Pre-Admission",
      description:
        "Pre-Admission Assessment Form and Infection prevention and control pre-admission risk assessment",
      carePlan: false,
      forms: [
        {
          type: "form",
          key: "preAdmission-form",
          value: "Pre-Admission Assessment Form",
          description: "Pre-Admission Assessment Form"
        },
        {
          type: "form",
          key: "infection-prevention",
          value:
            "Infection prevention and control pre-admission risk assessment",
          description:
            "Infection prevention and control pre-admission risk assessment"
        }
      ]
    },
    {
      type: "folder",
      key: "admission",
      value: "Admission",
      description: "Admission Assessment Folder",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "dnacpr",
      value: "DNACPR",
      description: "DNACPR order",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "peep",
      value: "PEEP",
      description: "PEEP Assessment",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "depenency",
      value: "Depenency",
      description: "Depenency Assessment",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "blader-bowel-form",
          value: "Blader & Bowel continence Assessment",
          description: "Blader & Bowel continence Assessment"
        }
      ]
    },
    {
      type: "folder",
      key: "progress-notes",
      value: "Progress Notes",
      description: "Progress Notes",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "my-life",
      value: "This is my life",
      description: "This is my life",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "capacity-consent",
      value: "Capacity Consent",
      description: "Capacity Consent",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "medication",
      value: "Medication",
      description: "Medication",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "mobility-fall",
      value: "Mobility & Fall",
      description: "Track mobility and fall risks",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "moving-handling-form",
          value: "Moving & Handling Risk Assessment",
          description: "Moving & Handling Risk Assessment"
        },
        {
          type: "form",
          key: "long-term-fall-risk-form",
          value: "Long Term Fall Risk Assessment",
          description: "Long Term Fall Risk Assessment"
        }
      ]
    },
    {
      type: "folder",
      key: "nutrition-hydration",
      value: "Nutrition & Hydration",
      description: "Nutrition & Hydration Assessment",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "continence",
      value: "Continence",
      description: "Continence Assessment",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "blader-bowel-form",
          value: "Blader & Bowel continence Assessment",
          description: "Blader & Bowel continence Assessment"
        }
      ]
    },
    {
      type: "folder",
      key: "hygiene",
      value: "Personal Hygiene & Dressing",
      description: "Personal Hygiene & Dressing Assessment",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "skin integrity",
      value: "Skin Integrity / Tissue Viability",
      description: "Skin Integrity / Tissue Viability Assessment",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "psychological-emotional",
      value: "Psychological & Emotional needs",
      description: "Psychological & Emotional needs Assessment",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "additional-care-plans",
      value: "Additional Care Plans",
      description: "Additional Care Plans",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "multidisciplinary",
      value: "Multidisciplinary and Relative communication notes",
      description: "Multidisciplinary and Relative communication notes",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "record-specimens",
      value: "Record of specimens",
      description: "Record of specimens",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "resident-valuables",
      value: "Resident valuables and personal property",
      description: "Resident valuables and personal property",
      carePlan: true,
      forms: []
    },
    {
      type: "folder",
      key: "confidential-records",
      value: "Confidential records",
      description: "Confidential records",
      carePlan: true,
      forms: []
    }
  ]
};
