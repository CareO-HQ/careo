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
        "This forms should be completed before the resident is admitted to the care home.",
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
      carePlan: false,
      forms: [
        {
          type: "form",
          key: "admission-form",
          value: "Admission Assessment Form",
          description: "Admission Assessment Form"
        },
        {
          type: "form",
          key: "photography-consent",
          value: "Photography Consent Form",
          description: "Photography Consent Form"
        }
      ]
    },
    {
      type: "folder",
      key: "dnacpr",
      value: "DNACPR",
      description: "DNACPR order",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "dnacpr",
          value: "DNACPR Form",
          description: "DNACPR Form"
        }
      ]
    },
    {
      type: "folder",
      key: "peep",
      value: "PEEP",
      description: "PEEP Assessment",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "peep",
          value: "PEEP Form",
          description: "PEEP Form"
        }
      ]
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
          key: "dependency-assessment",
          value: "Dependency Assessment",
          description: "Dependency Assessment"
        }
      ]
    },
    {
      type: "folder",
      key: "my-life",
      value: "This is my life",
      description: "This is my life",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "timl",
          value: "This Is My Life Form",
          description: "This Is My Life Form"
        }
      ]
    },
    {
      type: "folder",
      key: "capacity-consent",
      value: "Capacity & Consent",
      description: "Capacity & Consent Assessment",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "best-interest-decision-form",
          value: "Best Interest Decision",
          description: "Best Interest Decision Form"
        }
      ]
    },
    {
      type: "folder",
      key: "medication",
      value: "Medication",
      description: "Medication",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "pain-assessment-form",
          value: "Pain Assessment and Evaluation",
          description: "Pain Assessment and Evaluation"
        }
      ]
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
        },
        {
          type: "form",
          key: "resident-handling-profile-form",
          value: "Resident Handling Profile",
          description: "Resident Handling Profile"
        },
        {
          type: "form",
          key: "bedrail-consent-form",
          value: "Bedrails Consent / Agreement",
          description: "Bedrails Consent / Agreement"
        },
        {
          type: "form",
          key: "bed-rails-risk-assessment-form",
          value: "Risk Assessment for Use of Bed Rails",
          description: "Risk Assessment for Use of Bed Rails"
        }
      ]
    },
    {
      type: "folder",
      key: "nutrition-hydration",
      value: "Nutrition & Hydration",
      description: "Nutrition & Hydration Assessment",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "nutritional-assessment-form",
          value: "Nutritional Assessment",
          description: "Nutritional Assessment"
        },
        {
          type: "form",
          key: "oral-assessment-form",
          value: "Oral Assessment",
          description: "Oral Assessment"
        },
        {
          type: "form",
          key: "diet-notification-form",
          value: "Diet Notification",
          description: "Resident Diet Notification"
        },
        {
          type: "form",
          key: "choking-risk-assessment-form",
          value: "Choking Risk Assessment",
          description: "Choking Risk Assessment"
        },
        {
          type: "link",
          key: "must-calculator",
          value: "MUST Calculator",
          description: "Malnutrition Universal Screening Tool Calculator",
          url: "https://www.bapen.org.uk/must-and-self-screening/must-calculator/"
        }
      ]
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
      forms: [
        {
          type: "form",
          key: "skin-integrity-form",
          value: "Skin Integrity / Tissue Viability Assessment",
          description: "Skin Integrity / Tissue Viability Assessment"
        }
      ]
    },
    {
      type: "folder",
      key: "psychological-emotional",
      value: "Psychological & Emotional needs",
      description: "Psychological & Emotional needs Assessment",
      carePlan: true,
      forms: [
        {
          type: "form",
          key: "cornell-depression-scale-form",
          value: "Cornell Scale for Depression in Dementia",
          description: "Cornell Scale for Depression in Dementia"
        }
      ]
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
      forms: [
        {
          type: "form",
          key: "resident-valuables-form",
          value: "Resident valuables and personal property",
          description: "Resident valuables and personal property"
        }
      ]
    },
    {
      type: "folder",
      key: "confidential-records",
      value: "Confidential records",
      description: "Confidential records",
      carePlan: true,
      forms: []
    }
  ],
  careFilesV2: [
    {
      type: "folder",
      key: "v2-pre-admission",
      value: "Pre-Admission",
      description: "Forms to be completed before admission.",
      forms: [
        { type: "form", key: "preAdmission-form", value: "Pre-Admission Assessment Form" },
        { type: "form", key: "infection-prevention", value: "Infection Prevention Control Pre-Admission Assessment" },
        { type: "note", key: "no-cp-required", value: "No Care Plan required at this stage" }
      ]
    },
    {
      type: "folder",
      key: "v2-admission",
      value: "Admission",
      description: "Forms for the admission process.",
      forms: [
        { type: "form", key: "admission-form", value: "Admission Assessment" },
        { type: "form", key: "v2-capacity-consent", value: "Capacity and Consent", isComingSoon: true },
        { type: "form", key: "photography-consent", value: "Photographic Consent Form" },
        { type: "form", key: "best-interest-decision-form", value: "Best Interest Decision Form (within Capacity & Consent)" },
        { type: "form", key: "v2-night-obs-consent", value: "Night Observation Consent", isComingSoon: true },
        { type: "note", key: "v2-no-cp-required-adm", value: "No Care Plan required at this stage" }
      ]
    },
    {
      type: "folder",
      key: "v2-safe-environment",
      value: "Maintaining a Safe Environment",
      description: "Risk assessments and safety plans.",
      carePlan: true,
      forms: [
        { type: "form", key: "v2-general-risk", value: "General Risk Assessment", isComingSoon: true },
        { type: "form", key: "peep", value: "PEEP (Personal Emergency Evacuation Plan) + Evaluation" },
        { type: "form", key: "v2-restraints-risk", value: "Consent and Risk Assessment for Restraints", isComingSoon: true },
        { type: "form", key: "v2-safe-env-cp", value: "Care Plan + Evaluation (including Dementia/Brain Injury)", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-dependency",
      value: "Dependency",
      description: "Dependency assessments and plans.",
      forms: [
        { type: "form", key: "dependency-assessment", value: "Dependency Assessment" },
        { type: "form", key: "v2-dependency-cp", value: "Care Plan + Evaluation", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-my-life",
      value: "This Is My Life",
      description: "Social and life story information.",
      forms: [
        { type: "form", key: "v2-social-assessment", value: "Social Assessment", isComingSoon: true },
        { type: "form", key: "v2-life-story", value: "Life Story Workbook", isComingSoon: true },
        { type: "form", key: "v2-my-life-cp", value: "Care Plan + Evaluation", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-medication",
      value: "Medication",
      description: "Medication assessments and plans.",
      carePlan: true,
      forms: [
        { type: "form", key: "v2-abbey-pain", value: "Abbey Pain Tool", isComingSoon: true },
        { type: "form", key: "pain-assessment-form", value: "Pain Assessment" },
        { type: "form", key: "v2-prn-med-cp", value: "PRN Medication Care Plan + Evaluation", isComingSoon: true },
        { type: "form", key: "v2-creams-cp", value: "Topical Creams Care Plan + Evaluation", isComingSoon: true },
        { type: "form", key: "v2-gen-med-cp", value: "General Medication Care Plan + Evaluation", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-mobility",
      value: "Mobility",
      description: "Mobility and falls risk management.",
      carePlan: true,
      forms: [
        { type: "form", key: "moving-handling-form", value: "Moving and Handling Assessment" },
        { type: "form", key: "resident-handling-profile-form", value: "Resident Handling Profile" },
        { type: "form", key: "long-term-fall-risk-form", value: "Falls Risk Assessment" },
        { type: "form", key: "bedrail-consent-form", value: "Bedrail Consent / Agreement" },
        { type: "form", key: "bed-rails-risk-assessment-form", value: "Bedrail Risk Assessment" },
        { type: "form", key: "v2-mobility-cp", value: "Care Plan for Assistance", isComingSoon: true },
        { type: "upload", key: "v2-mobility-upload", value: "Upload Physiotherapy, OT, Falls Team, etc.", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-nutrition-hydration",
      value: "Nutrition and Hydration",
      description: "Nutrition, hydration, and choking risk management.",
      carePlan: true,
      forms: [
        { type: "form", key: "v2-must-assessment", value: "MUST Assessment", isComingSoon: true },
        { type: "link", key: "must-calculator", value: "MUST Calculator", url: "https://www.bapen.org.uk/must-and-self-screening/must-calculator/" },
        { type: "form", key: "v2-weight-chart", value: "Weight Chart", isComingSoon: true },
        { type: "form", key: "nutritional-assessment-form", value: "Nutrition Assessment + Monthly Review" },
        { type: "form", key: "oral-assessment-form", value: "Oral Assessment + Monthly Review" },
        { type: "form", key: "choking-risk-assessment-form", value: "Choking Risk Assessment + Monthly Review" },
        { type: "form", key: "diet-notification-form", value: "Diet Notification" },
        { type: "form", key: "v2-nutr-cp-malnutrition", value: "Care Plan: Risk of Malnutrition", isComingSoon: true },
        { type: "form", key: "v2-nutr-cp-supplements", value: "Care Plan: Supplements", isComingSoon: true },
        { type: "form", key: "v2-nutr-cp-thickener", value: "Care Plan: Thickener", isComingSoon: true },
        { type: "form", key: "v2-nutr-cp-choking", value: "Care Plan: Risk of Choking", isComingSoon: true },
        { type: "form", key: "v2-nutr-cp-weightloss", value: "Care Plan: Weight Loss", isComingSoon: true },
        { type: "form", key: "v2-nutr-cp-diabetic", value: "Care Plan: Diabetic Diet", isComingSoon: true },
        { type: "form", key: "v2-nutr-cp-fluidrest", value: "Care Plan: Fluid Restriction", isComingSoon: true },
        { type: "upload", key: "v2-nutrition-upload", value: "Upload: GP input, SALT, Dietitian", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-incontinence",
      value: "Incontinence",
      description: "Continence assessments and plans.",
      carePlan: true,
      forms: [
        { type: "form", key: "blader-bowel-form", value: "Bladder and Bowel Continence Assessment" },
        { type: "form", key: "v2-continence-cp", value: "Care Plan + Evaluation", isComingSoon: true },
        { type: "upload", key: "v2-continence-upload", value: "Upload Incontinence Team reports", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-hygiene",
      value: "Personal Hygiene and Dressing",
      description: "Hygiene and skin integrity assessments.",
      carePlan: true,
      forms: [
        { type: "form", key: "v2-body-map-hygiene", value: "Body Map (monthly reassessment)", isComingSoon: true },
        { type: "form", key: "v2-braden-score", value: "Braden Risk Assessment (score required)", isComingSoon: true },
        { type: "form", key: "oral-assessment-form", value: "Oral Assessment + Evaluation Sheet" },
        { type: "form", key: "v2-skin-dermatology", value: "Skin Integrity / Dermatology Assessment", isComingSoon: true },
        { type: "form", key: "v2-hygiene-cp", value: "Care Plan for Level of Assistance", isComingSoon: true },
        { type: "form", key: "v2-pressure-ulcer-cp", value: "Pressure Ulcer Care Plan (if Braden <= 18)", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-skin-integrity",
      value: "Skin Integrity",
      description: "Wound care and skin integrity.",
      carePlan: true,
      forms: [
        { type: "form", key: "v2-braden-skin", value: "Braden Risk Assessment", isComingSoon: true },
        { type: "form", key: "v2-body-map-skin", value: "Body Map", isComingSoon: true },
        { type: "form", key: "v2-wound-assessment", value: "Wound Assessment", isComingSoon: true },
        { type: "form", key: "skin-integrity-form", value: "Care Plan + Evaluation" }
      ]
    },
    {
      type: "folder",
      key: "v2-additional-cp",
      value: "Additional Care Plans",
      description: "Specific medical and psychosocial care plans.",
      forms: [
        { type: "form", key: "v2-cp-asc", value: "Altered State of Consciousness Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-behaviour", value: "Behaviour Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-breathing", value: "Breathing Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-hypertension", value: "Hypertension Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-diabetes", value: "Diabetes Management Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-anaemia", value: "Anaemia Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-cognition", value: "Cognition Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-communication", value: "Communication Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-pain-assessment", value: "Pain Assessment Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-pain-management", value: "Pain Management Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-sleep", value: "Sleep Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-eol", value: "End of Life Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-dnacpr", value: "DNACPR Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-infection", value: "Infection Control / Environmental Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-sexuality-expr", value: "Expressing Sexuality Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-sexual-needs", value: "Sexual Needs Care Plan", isComingSoon: true },
        { type: "form", key: "v2-cp-spiritual", value: "Spiritual Needs Care Plan", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-psychological",
      value: "Psychological & Emotional Needs",
      description: "Mental health and emotional well-being.",
      carePlan: true,
      forms: [
        { type: "form", key: "cornell-depression-scale-form", value: "Cornell Scale for Depression in Dementia" },
        { type: "form", key: "v2-psych-cp", value: "Care Plan", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-valuables",
      value: "Residents’ Valuables and Personal Property",
      description: "Tracking personal items and protection.",
      forms: [
        { type: "form", key: "resident-valuables-form", value: "Resident Valuables and Personal Property Record" },
        { type: "form", key: "v2-valuables-cp", value: "Care Plan (if special protection required)", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-specimens",
      value: "Record of Specimens",
      description: "Log for medical specimens.",
      forms: [
        { type: "form", key: "v2-specimen-log", value: "Specimen Record Log", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-confidential",
      value: "Confidential Records",
      description: "Storage for sensitive legal and funeral documents.",
      forms: [
        { type: "upload", key: "v2-confidential-upload", value: "Upload confidential documents", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-safeguarding",
      value: "Safeguarding & DoLS",
      description: "Safeguarding and Liberty Protection Safeguards.",
      forms: [
        { type: "form", key: "v2-safe-risk", value: "Safeguarding Risk Assessment", isComingSoon: true },
        { type: "form", key: "v2-safe-body-map", value: "Safeguarding Body Map", isComingSoon: true },
        { type: "form", key: "v2-dols-app", value: "DoLS Application Form", isComingSoon: true }
      ]
    },
    {
      type: "folder",
      key: "v2-key-worker",
      value: "Key Worker Diary",
      description: "Monthly reports and worker observations.",
      forms: [
        { type: "form", key: "v2-assist-report", value: "Monthly Care Assistant Report", isComingSoon: true }
      ]
    }
  ]
};
