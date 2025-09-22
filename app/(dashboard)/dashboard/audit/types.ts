export type AuditStatus = 
  | "NEW"
  | "ACTION_PLAN" 
  | "IN_PROGRESS" 
  | "COMPLETED" 
  | "REVIEWED" 
  | "REASSIGN" 
  | "AUDITED";

export type Priority = "Low" | "Medium" | "High";

export type AuditType = "Care Plan" | "Risk Assessment" | "Incident Report";

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
  followUpNote?: string;
  createdDate: Date;
  updatedDate: Date;
  dueDate?: Date;
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