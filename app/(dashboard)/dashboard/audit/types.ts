export type AuditStatus =
  | "PENDING_AUDIT"
  | "ISSUE_ASSIGNED"
  | "REASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_VERIFICATION"
  | "AUDITED";

export type Priority = "Low" | "Medium" | "High";

export type AuditType = "Care Plan" | "Risk Assessment" | "Incident Report";

export interface ReportContent {
  summary: string;
  findings: string[];
  recommendations: string[];
  riskLevel?: "Low" | "Medium" | "High";
  nextReviewDate?: string;
  assessor: string;
  completedDate: string;
}

export interface AuditItem {
  id: string;
  residentId: string;
  residentName: string;
  residentPhoto: string;
  type: AuditType;
  title: string;
  status: AuditStatus;
  priority: Priority;
  assignedTo?: string;
  createdBy: string;
  followUpNote?: string;
  createdDate: Date;
  updatedDate: Date;
  dueDate?: Date;
  reportContent?: ReportContent;
  files: {
    id: string;
    name: string;
    url: string;
  }[];
}

export interface ActionPlanFormData {
  followUpNote: string;
  assignTo: string;
  priority: Priority;
  dueDate: Date | undefined;
  status: AuditStatus;
}