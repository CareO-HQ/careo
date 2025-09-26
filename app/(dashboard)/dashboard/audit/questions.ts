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

  // Section B - Sample questions (normally would have 100 questions)
  {
    questionId: "B001",
    section: "Section B",
    question: "Are care plans regularly reviewed and updated?",
    sectionOrder: 2,
    questionOrder: 1
  },
  {
    questionId: "B002",
    section: "Section B",
    question: "Do care plans reflect individual needs and preferences?",
    sectionOrder: 2,
    questionOrder: 2
  },
  {
    questionId: "B003",
    section: "Section B",
    question: "Are care plans easily accessible to relevant staff?",
    sectionOrder: 2,
    questionOrder: 3
  },

  // Section C - Sample questions (normally would have 100 questions)
  {
    questionId: "C001",
    section: "Section C",
    question: "Are medication administration records (MAR) completed accurately?",
    sectionOrder: 3,
    questionOrder: 1
  },
  {
    questionId: "C002",
    section: "Section C",
    question: "Are controlled drugs stored securely according to regulations?",
    sectionOrder: 3,
    questionOrder: 2
  },

  // Sample questions for other sections (abbreviated for demo)
  {
    questionId: "D001",
    section: "Section D",
    question: "Are health and safety protocols being followed?",
    sectionOrder: 4,
    questionOrder: 1
  },
  {
    questionId: "E001",
    section: "Section E",
    question: "Is infection control maintained according to policy?",
    sectionOrder: 5,
    questionOrder: 1
  },
  {
    questionId: "F001",
    section: "Section F",
    question: "Are nutritional needs being met appropriately?",
    sectionOrder: 6,
    questionOrder: 1
  },
  {
    questionId: "G001",
    section: "Section G",
    question: "Are privacy and dignity maintained at all times?",
    sectionOrder: 7,
    questionOrder: 1
  },
  {
    questionId: "H001",
    section: "Section H",
    question: "Are staff training records up to date?",
    sectionOrder: 8,
    questionOrder: 1
  },
  {
    questionId: "I001",
    section: "Section I",
    question: "Are incident reports completed properly and in a timely manner?",
    sectionOrder: 9,
    questionOrder: 1
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
  {
    questionId: "M001",
    section: "Section M",
    question: "Are quality assurance measures in place and effective?",
    sectionOrder: 13,
    questionOrder: 1
  },
  {
    questionId: "N001",
    section: "Section N",
    question: "Are environmental standards maintained appropriately?",
    sectionOrder: 14,
    questionOrder: 1
  },
  {
    questionId: "O001",
    section: "Section O",
    question: "Are recruitment and employment practices compliant?",
    sectionOrder: 15,
    questionOrder: 1
  },
  {
    questionId: "P001",
    section: "Section P",
    question: "Are financial management practices appropriate?",
    sectionOrder: 16,
    questionOrder: 1
  },
  {
    questionId: "Q001",
    section: "Section Q",
    question: "Are governance and management structures effective?",
    sectionOrder: 17,
    questionOrder: 1
  },

  // Miscellaneous section
  {
    questionId: "M001",
    section: "Miscellaneous",
    question: "Are there any other areas of concern not covered in previous sections?",
    sectionOrder: 18,
    questionOrder: 1
  },
  {
    questionId: "M002",
    section: "Miscellaneous",
    question: "Are regulatory compliance requirements being met?",
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