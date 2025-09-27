import { AuditQuestion } from "./types";

// Sample audit questions structure - This will need to be populated with the actual 100 questions per section
export const AUDIT_QUESTIONS: AuditQuestion[] = [
  // Section A - Complete questions
  {
    questionId: "A001",
    section: "Section A",
    question: "Is resident documentation kept safe and only accessible by relevant staff?",
    sectionOrder: 1,
    questionOrder: 1
  },
  {
    questionId: "A002",
    section: "Section A",
    question: "Do all residents have a folder to hold all necessary hard copies of documentation?",
    sectionOrder: 1,
    questionOrder: 2
  },
  {
    questionId: "A003",
    section: "Section A",
    question: "Folders are tidy and presentable with clear labelling on spine or front cover?",
    sectionOrder: 1,
    questionOrder: 3
  },
  {
    questionId: "A004",
    section: "Section A",
    question: "Is resident profile fully completed?",
    sectionOrder: 1,
    questionOrder: 4
  },
  {
    questionId: "A005",
    section: "Section A",
    question: "Is additional preferences information completed with person-centred profile sheets?",
    sectionOrder: 1,
    questionOrder: 5
  },
  {
    questionId: "A006",
    section: "Section A",
    question: "Is a photo in place that is current, with date, and less than 6 months old on resident profile sheet; if dated, is there note for renewal?",
    sectionOrder: 1,
    questionOrder: 6
  },
  {
    questionId: "A007",
    section: "Section A",
    question: "There is NO Resuscitation directive in place with corresponding care plan. Evidence of discussion to have a DNACPR documented along with a review date.",
    sectionOrder: 1,
    questionOrder: 7
  },
  {
    questionId: "A008",
    section: "Section A",
    question: "DNACPR is reviewed annually (or according to GP instructions)?",
    sectionOrder: 1,
    questionOrder: 8
  },
  {
    questionId: "A009",
    section: "Section A",
    question: "There is a PEEP (Personal Emergency Evacuation Plan) completed in full and accurate?",
    sectionOrder: 1,
    questionOrder: 9
  },
  {
    questionId: "A010",
    section: "Section A",
    question: "Has the PEEP been reviewed monthly?",
    sectionOrder: 1,
    questionOrder: 10
  },

  // Section B - Progress Notes
  {
    questionId: "B001",
    section: "Section B",
    question: "Daily progress notes have a minimal of one entry during the day and once during the night and is evident that this is person centred information.",
    sectionOrder: 2,
    questionOrder: 1
  },
  {
    questionId: "B002",
    section: "Section B",
    question: "Entries are signed with full name and designation.",
    sectionOrder: 2,
    questionOrder: 2
  },

  // Section C - Admission Assessment
  {
    questionId: "C001",
    section: "Section C",
    question: "The admission assessment is fully completed, with no gaps, signed and dated.",
    sectionOrder: 3,
    questionOrder: 1
  },
  {
    questionId: "C002",
    section: "Section C",
    question: "Has the medical history and current medical condition information been fully completed?",
    sectionOrder: 3,
    questionOrder: 2
  },
  {
    questionId: "C003",
    section: "Section C",
    question: "Has the Rhys Hearn Dependency Tool been completed?",
    sectionOrder: 3,
    questionOrder: 3
  },
  {
    questionId: "C004",
    section: "Section C",
    question: "Has the Rhys Hearn dependency tool been updated monthly?",
    sectionOrder: 3,
    questionOrder: 4
  },
  {
    questionId: "C005",
    section: "Section C",
    question: "Has the Physical & Social needs assessment been completed and updated at least monthly?",
    sectionOrder: 3,
    questionOrder: 5
  },
  {
    questionId: "C006",
    section: "Section C",
    question: "Has the mental acuity assessment been completed and updated at least monthly?",
    sectionOrder: 3,
    questionOrder: 6
  },

  // Section D - Consent and Capacity
  {
    questionId: "D001",
    section: "Section D",
    question: "Consent to Care and Data Sharing is fully completed and signed.",
    sectionOrder: 4,
    questionOrder: 1
  },
  {
    questionId: "D002",
    section: "Section D",
    question: "Photography consent is fully completed and signed.",
    sectionOrder: 4,
    questionOrder: 2
  },
  {
    questionId: "D003",
    section: "Section D",
    question: "Communication care plan is in place and is evaluated at least monthly.",
    sectionOrder: 4,
    questionOrder: 3
  },
  {
    questionId: "D004",
    section: "Section D",
    question: "There is a care plan for capacity, consent and rights (if applicable) and is evaluated at least monthly.",
    sectionOrder: 4,
    questionOrder: 4
  },
  {
    questionId: "D005",
    section: "Section D",
    question: "If applicable, a Best Interest Decision Form is completed and signed.",
    sectionOrder: 4,
    questionOrder: 5
  },
  {
    questionId: "D006",
    section: "Section D",
    question: "If applicable, a DOLS assessment and supporting care plan has been completed and expiry dates documented in care plan and DOLS Register.",
    sectionOrder: 4,
    questionOrder: 6
  },
  {
    questionId: "D007",
    section: "Section D",
    question: "Is there a care plan for Maintenance of Safe Environment completed with information relevant to individual resident?",
    sectionOrder: 4,
    questionOrder: 7
  },
  // Section E - Medication Management and Health Monitoring
  {
    questionId: "E001",
    section: "Section E",
    question: "There is a care plan for the level of assistance required and resident's compliance with prescribed medications which is evaluated at least monthly?",
    sectionOrder: 5,
    questionOrder: 1
  },
  {
    questionId: "E002",
    section: "Section E",
    question: "There are specific care plans for high-risk medications such as anticoagulants, insulin, anti-epileptic drugs, and anti-psychotics.",
    sectionOrder: 5,
    questionOrder: 2
  },
  {
    questionId: "E003",
    section: "Section E",
    question: "Pain assessment is fully completed, pain management care plan in place and all documents reviewed at least monthly?",
    sectionOrder: 5,
    questionOrder: 3
  },
  {
    questionId: "E004",
    section: "Section E",
    question: "TPR and blood pressure chart is completed monthly.",
    sectionOrder: 5,
    questionOrder: 4
  },
  {
    questionId: "E005",
    section: "Section E",
    question: "There is a specific care plan for serious health conditions and it is evaluated at least monthly (e.g., heart disease, dementia, COPD, diabetes, epilepsy).",
    sectionOrder: 5,
    questionOrder: 5
  },
  {
    questionId: "E006",
    section: "Section E",
    question: "There is a care plan for PRN medications with clear instructions on when they should be given and the rationale if doses can fluctuate; it's updated anytime medication is given.",
    sectionOrder: 5,
    questionOrder: 6
  },
  // Section F - Mobility and Falls Risk
  {
    questionId: "F001",
    section: "Section F",
    question: "Resident Handling Assessment is fully completed and reviewed at least monthly.",
    sectionOrder: 6,
    questionOrder: 1
  },
  {
    questionId: "F002",
    section: "Section F",
    question: "There is a care plan in place for mobility needs which is reviewed at least monthly.",
    sectionOrder: 6,
    questionOrder: 2
  },
  {
    questionId: "F003",
    section: "Section F",
    question: "Falls risk assessment is fully completed.",
    sectionOrder: 6,
    questionOrder: 3
  },
  {
    questionId: "F004",
    section: "Section F",
    question: "Falls risk assessment is reviewed at least monthly and following any falls.",
    sectionOrder: 6,
    questionOrder: 4
  },
  {
    questionId: "F005",
    section: "Section F",
    question: "There is a care plan for risk of falls which is reviewed at least monthly and following any falls.",
    sectionOrder: 6,
    questionOrder: 5
  },
  {
    questionId: "F006",
    section: "Section F",
    question: "Bed rail assessment is in place, fully completed, and reviewed at least monthly.",
    sectionOrder: 6,
    questionOrder: 6
  },
  {
    questionId: "F007",
    section: "Section F",
    question: "If bed rails are in use, care plan is in place and reviewed at least monthly.",
    sectionOrder: 6,
    questionOrder: 7
  },
  {
    questionId: "F008",
    section: "Section F",
    question: "If any restraint used, is a restraint assessment in place?",
    sectionOrder: 6,
    questionOrder: 8
  },
  {
    questionId: "F009",
    section: "Section F",
    question: "Consent for restraint is in place and reviewed as required?",
    sectionOrder: 6,
    questionOrder: 9
  },
  {
    questionId: "F010",
    section: "Section F",
    question: "Is a care plan for restraint, fully completed and reviewed at least monthly?",
    sectionOrder: 6,
    questionOrder: 10
  },
  // Section G - Nutrition and Hydration
  {
    questionId: "G001",
    section: "Section G",
    question: "Nutrition and Dehydration assessment is fully completed and reviewed at least monthly.",
    sectionOrder: 7,
    questionOrder: 1
  },
  {
    questionId: "G002",
    section: "Section G",
    question: "Monthly weights are recorded as indicated by assessment.",
    sectionOrder: 7,
    questionOrder: 2
  },
  {
    questionId: "G003",
    section: "Section G",
    question: "There is a nutritional care plan which identifies the type of assistance required and the type of diet according to IDDSI guidelines and all nutritional needs; care plan has been evaluated at least monthly.",
    sectionOrder: 7,
    questionOrder: 3
  },
  {
    questionId: "G004",
    section: "Section G",
    question: "There is a care plan for significant weight loss, with description of actions taken and includes MDT advice if required.",
    sectionOrder: 7,
    questionOrder: 4
  },
  {
    questionId: "G005",
    section: "Section G",
    question: "There is a care plan for reduction diet, if required, and MDT advice is included.",
    sectionOrder: 7,
    questionOrder: 5
  },
  {
    questionId: "G006",
    section: "Section G",
    question: "Oral hygiene care plan is in place and states resident current condition (has own teeth / dentures / none) and specifies care required around resident personal needs.",
    sectionOrder: 7,
    questionOrder: 6
  },
  {
    questionId: "G007",
    section: "Section G",
    question: "The Choking Risk Assessment has been completed in full and reviewed at least monthly.",
    sectionOrder: 7,
    questionOrder: 7
  },
  {
    questionId: "G008",
    section: "Section G",
    question: "There is a care plan in place for all risks of choking (including low risk).",
    sectionOrder: 7,
    questionOrder: 8
  },
  {
    questionId: "G009",
    section: "Section G",
    question: "The diet notification sheet is completed and updated as required and a copy is given to the cook manager.",
    sectionOrder: 7,
    questionOrder: 9
  },
  // Section H - Wound Care and Skin Integrity
  {
    questionId: "H001",
    section: "Section H",
    question: "If repositioning is required, a care plan is in place specifying the resident's requirements and the use/frequency of any pressure-relieving aids in use.",
    sectionOrder: 8,
    questionOrder: 1
  },
  {
    questionId: "H002",
    section: "Section H",
    question: "There is a care plan for skin integrity.",
    sectionOrder: 8,
    questionOrder: 2
  },
  {
    questionId: "H003",
    section: "Section H",
    question: "Body map is fully completed.",
    sectionOrder: 8,
    questionOrder: 3
  },
  {
    questionId: "H004",
    section: "Section H",
    question: "There is a care plan for every wound, reviewed as indicated, clearly describing current treatment.",
    sectionOrder: 8,
    questionOrder: 4
  },
  {
    questionId: "H005",
    section: "Section H",
    question: "If applicable, there is a photo of wounds which are dated and renewed when there is a change.",
    sectionOrder: 8,
    questionOrder: 5
  },
  {
    questionId: "H006",
    section: "Section H",
    question: "Dressing assessment (if applicable) is fully completed and reviewed after each dressing change.",
    sectionOrder: 8,
    questionOrder: 6
  },
  {
    questionId: "H007",
    section: "Section H",
    question: "DN/GP/Podiatrist involved? Is treatment in line with advice?",
    sectionOrder: 8,
    questionOrder: 7
  },
  {
    questionId: "H008",
    section: "Section H",
    question: "Daily progress notes reflect wound dressings and the status of wounds.",
    sectionOrder: 8,
    questionOrder: 8
  },
  // Section I - Mental Health and Behavioral Care
  {
    questionId: "I001",
    section: "Section I",
    question: "Mood/depression assessment fully completed and reviewed at least monthly.",
    sectionOrder: 9,
    questionOrder: 1
  },
  {
    questionId: "I002",
    section: "Section I",
    question: "If required (e.g., score ≥6), a care plan is in place and reviewed at least monthly.",
    sectionOrder: 9,
    questionOrder: 2
  },
  {
    questionId: "I003",
    section: "Section I",
    question: "A care plan is in place which identifies all behavioural needs and is reviewed at least monthly.",
    sectionOrder: 9,
    questionOrder: 3
  },
  {
    questionId: "I004",
    section: "Section I",
    question: "There is a care plan if there are any identified cognitive needs, reviewed at least monthly (if applicable).",
    sectionOrder: 9,
    questionOrder: 4
  },
  {
    questionId: "I005",
    section: "Section I",
    question: "There is a care plan for expressing sexuality, reviewed at least monthly.",
    sectionOrder: 9,
    questionOrder: 5
  },
  {
    questionId: "I006",
    section: "Section I",
    question: "There is a care plan for sleeping needs, reviewed at least monthly.",
    sectionOrder: 9,
    questionOrder: 6
  },
  {
    questionId: "I007",
    section: "Section I",
    question: "Care plan for sleeping needs includes preferred rising and retiring times?",
    sectionOrder: 9,
    questionOrder: 7
  },
  {
    questionId: "I008",
    section: "Section I",
    question: "Care plan for sleeping needs includes any sedation medication taken?",
    sectionOrder: 9,
    questionOrder: 8
  },
  {
    questionId: "J001",
    section: "Section J",
    question: "Are safeguarding procedures being followed correctly?",
    sectionOrder: 10,
    questionOrder: 1
  },
  {
    questionId: "K001",
    section: "Section K",
    question: "Is equipment maintained and serviced regularly?",
    sectionOrder: 11,
    questionOrder: 1
  },
  {
    questionId: "L001",
    section: "Section L",
    question: "Are complaints handled according to policy?",
    sectionOrder: 12,
    questionOrder: 1
  },
  // Section M - Activities and Life Preferences
  {
    questionId: "M001",
    section: "Section M",
    question: "Is \"This is my life\" booklet completed?",
    sectionOrder: 13,
    questionOrder: 1
  },
  {
    questionId: "M002",
    section: "Section M",
    question: "Is Activities preference information completed with resident likes and dislikes?",
    sectionOrder: 13,
    questionOrder: 2
  },
  {
    questionId: "M003",
    section: "Section M",
    question: "There is a care plan for activity needs which is evaluated at least monthly.",
    sectionOrder: 13,
    questionOrder: 3
  },
  {
    questionId: "M004",
    section: "Section M",
    question: "Is the activities report completed with relevant information about the activities carried out by the resident and their response to specific activities?",
    sectionOrder: 13,
    questionOrder: 4
  },
  // Section N - Spiritual and End-of-Life Care
  {
    questionId: "N001",
    section: "Section N",
    question: "There is a care plan for spiritual needs which is evaluated at least monthly.",
    sectionOrder: 14,
    questionOrder: 1
  },
  {
    questionId: "N002",
    section: "Section N",
    question: "There is a care plan for advanced decision which is evaluated at least monthly.",
    sectionOrder: 14,
    questionOrder: 2
  },
  {
    questionId: "N003",
    section: "Section N",
    question: "There is a care plan for palliative care needs (if applicable) which is evaluated at least monthly?",
    sectionOrder: 14,
    questionOrder: 3
  },
  {
    questionId: "N004",
    section: "Section N",
    question: "There is a care plan for end of life needs which is evaluated at least monthly?",
    sectionOrder: 14,
    questionOrder: 4
  },
  // Section O - Infection Control and Breathing Care
  {
    questionId: "O001",
    section: "Section O",
    question: "There are short term care plans in place i.e., infection, which are also discontinued appropriately.",
    sectionOrder: 15,
    questionOrder: 1
  },
  {
    questionId: "O002",
    section: "Section O",
    question: "There is a care plan for infection prevention and control needs which is evaluated at least monthly.",
    sectionOrder: 15,
    questionOrder: 2
  },
  {
    questionId: "O003",
    section: "Section O",
    question: "There is a care plan if there are any identified breathing needs which is reviewed at least monthly.",
    sectionOrder: 15,
    questionOrder: 3
  },
  {
    questionId: "O004",
    section: "Section O",
    question: "There is a care plan if resident has history of any altered state of consciousness (e.g., TIA/epilepsy/hypo attacks) which is reviewed at least monthly.",
    sectionOrder: 15,
    questionOrder: 4
  },
  {
    questionId: "O005",
    section: "Section O",
    question: "There is a care plan if any other specialised intervention is necessary (e.g., sub-cut fluids/syringe driver) which is reviewed as indicated.",
    sectionOrder: 15,
    questionOrder: 5
  },
  // Section P - Communication and Documentation Records
  {
    questionId: "P001",
    section: "Section P",
    question: "There is a record that next of kin and Care Manager have been contacted in relation to any incidents or concerns that staff may have about the resident.",
    sectionOrder: 16,
    questionOrder: 1
  },
  {
    questionId: "P002",
    section: "Section P",
    question: "There is a relative communication record of all conversations held with relatives.",
    sectionOrder: 16,
    questionOrder: 2
  },
  {
    questionId: "P003",
    section: "Section P",
    question: "Documentation reflects the involvement of the resident/next of kin (e.g., signed consent forms/care plans/communication record).",
    sectionOrder: 16,
    questionOrder: 3
  },
  {
    questionId: "P004",
    section: "Section P",
    question: "There is a record of all specimens sent to lab and results received.",
    sectionOrder: 16,
    questionOrder: 4
  },
  // Section Q - Pre-Admission and Property Management
  {
    questionId: "Q001",
    section: "Section Q",
    question: "There is a Pre-Admission assessment that is fully completed, dated, and signed.",
    sectionOrder: 17,
    questionOrder: 1
  },
  {
    questionId: "Q002",
    section: "Section Q",
    question: "There is an inventory of residents' property completed at admission and updated as required.",
    sectionOrder: 17,
    questionOrder: 2
  },
  {
    questionId: "Q003",
    section: "Section Q",
    question: "Residents' property is reviewed quarterly.",
    sectionOrder: 17,
    questionOrder: 3
  },

  // Miscellaneous section
  {
    questionId: "MISC001",
    section: "Miscellaneous",
    question: "There is a copy of last care review, dated and signed when received—and any actions addressed.",
    sectionOrder: 18,
    questionOrder: 1
  },
  {
    questionId: "MISC002",
    section: "Miscellaneous",
    question: "Are all Trust/MDT documents signed and dated on receipt into the Home?",
    sectionOrder: 18,
    questionOrder: 2
  }
];

// Helper functions
export const getQuestionsBySection = (section: string): AuditQuestion[] => {
  return AUDIT_QUESTIONS.filter(q => q.section === section)
    .sort((a, b) => a.questionOrder - b.questionOrder);
};

export const getAllSections = (): string[] => {
  const sections = [...new Set(AUDIT_QUESTIONS.map(q => q.section))];
  return sections.sort((a, b) => {
    const aOrder = AUDIT_QUESTIONS.find(q => q.section === a)?.sectionOrder || 0;
    const bOrder = AUDIT_QUESTIONS.find(q => q.section === b)?.sectionOrder || 0;
    return aOrder - bOrder;
  });
};

export const getQuestionById = (questionId: string): AuditQuestion | undefined => {
  return AUDIT_QUESTIONS.find(q => q.questionId === questionId);
};