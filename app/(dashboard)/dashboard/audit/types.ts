import { Id } from "@/convex/_generated/dataModel";

export interface CareoAuditItem {
  _id: Id<"careoAudits">;
  residentId: Id<"residents">;
  auditCycle?: string; // e.g., "2024-Q1", "2024-Q2"
  section: string; // Section A-Q or Miscellaneous
  question: string; // Fixed predefined question text
  questionId: string; // Unique identifier for the question (e.g., "A001", "B002")
  status?: "compliant" | "non-compliant" | "n/a";
  comments?: string;
  auditedBy: Id<"users">; // User who conducted audit
  assignee?: Id<"users">; // User assigned to resolve issues
  auditDate: number; // When audit was conducted
  dueDate?: number; // For follow-ups
  priority?: "low" | "medium" | "high";
  organizationId: string;
  teamId: string;
  createdAt: number;
  updatedAt?: number;
  createdBy: Id<"users">;
  updatedBy?: Id<"users">;
}

export interface AuditQuestion {
  questionId: string;
  section: string;
  question: string;
  sectionOrder: number; // Order within section
  questionOrder: number; // Order of question within section
}

export interface AuditFormData {
  status?: "compliant" | "non-compliant" | "n/a";
  comments?: string;
  assignee?: Id<"users">;
  priority?: "low" | "medium" | "high";
  dueDate?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  photo?: string;
}

// Sections A through Q plus Miscellaneous
export const AUDIT_SECTIONS = [
  "Section A", "Section B", "Section C", "Section D", "Section E", "Section F",
  "Section G", "Section H", "Section I", "Section J", "Section K", "Section L",
  "Section M", "Section N", "Section O", "Section P", "Section Q", "Miscellaneous"
] as const;

export type AuditSection = typeof AUDIT_SECTIONS[number];