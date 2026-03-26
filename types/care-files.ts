export type CareFileFormKey =
  | "preAdmission-form"
  | "admission-form"
  | "infection-prevention"
  | "blader-bowel-form"
  | "moving-handling-form"
  | "long-term-fall-risk-form"
  | "bedrail-consent-form"
  | "bed-rails-risk-assessment-form"
  | "best-interest-decision-form"
  | "care-plan-form"
  | "photography-consent"
  | "dnacpr"
  | "peep"
  | "dependency-assessment"
  | "timl"
  | "skin-integrity-form"
  | "resident-valuables-form"
  | "resident-handling-profile-form"
  | "pain-assessment-form"
  | "nutritional-assessment-form"
  | "oral-assessment-form"
  | "diet-notification-form"
  | "choking-risk-assessment-form"
  | "cornell-depression-scale-form"
  | "braden-risk-assessment-form"
  | "v2-restraints-risk"
  | "must-calculator"
  | "v2-specimen-log"
  | "v2-body-map-hygiene"
  | "v2-body-map-skin"
  | "v2-safe-body-map"
  | "fall-risk-assessment"
  | "smoking-risk-assessment"
  | "v2-night-obs-consent"
  | "v2-capacity-consent"
  | "v2-general-risk"
  | "v2-abbey-pain"
  | "v2-personal-profile"
  | "progress-note-form";


export type CareFileFormStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "pdf-generating"
  | "pdf-ready";

export interface CareFileFormState {
  status: CareFileFormStatus;
  hasData: boolean;
  hasPdfFileId?: boolean;
  pdfUrl?: string | null;
  lastUpdated?: number;
  completedAt?: number;
  isAudited?: boolean;
  auditedAt?: number;
  auditedBy?: string;
}

export interface CareFileFormsState {
  [key: string]: CareFileFormState;
}

export interface CareFileFormData {
  _id: string;
  _creationTime: number;
  residentId: string;
  savedAsDraft?: boolean;
  pdfFileId?: string;
  createdAt: number;
  [key: string]: any;
}
