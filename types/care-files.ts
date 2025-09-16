export type CareFileFormKey =
  | "preAdmission-form"
  | "infection-prevention"
  | "blader-bowel-form"
  | "moving-handling-form"
  | "long-term-fall-risk-form"
  | "new-form";

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
