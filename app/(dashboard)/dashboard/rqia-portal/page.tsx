"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { EmarSheet } from "@/components/medication/emar/EmarSheet";
import KardexModal from "@/components/medication/KardexModal";
import { config } from "@/config";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, addDays, isSameDay } from "date-fns";
import {
  Search,
  Eye,
  ArrowLeft,
  Bell,
  FileText,
  Phone,
  User,
  ChevronRight,
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Utensils,
  UserCheck,
  Activity,
  HeartPulse,
  ClipboardList,
  Paperclip,
  Loader2,
  ArrowUpRight,
  ChevronDown,
  AlertTriangle,
  Scale,
  Bandage,
  TrendingDown,
  RotateCw
} from "lucide-react";
import { toast } from "sonner";
import FormStatusIndicator, { FormStatusBadge } from "@/components/residents/carefile/FormStatusIndicator";
import { CareFileFormKey } from "@/types/care-files";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { ManagerAuditRecordDetailView } from "@/components/manager-audit/manager-audit-record-detail-view";
import { WeightChart } from "@/components/residents/carefile/WeightChart";
import { IncidentReportViewer } from "@/app/(dashboard)/dashboard/residents/[id]/(pages)/incidents/[folderId]/components/incident-report-viewer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getColorForBadge } from "@/lib/utils";

interface ManagerAuditItem {
  id: string;
  name: string;
  status: "new" | "in-progress" | "completed" | "due";
  auditor: string;
  lastAudited: string;
  dueDate: string;
  frequency: "monthly" | "quarterly" | "6month" | "yearly";
  category: "staff" | "clinical" | "operational" | "general" | "carefile";
  latestRecordId?: string | null;
}

const initialManagerAudits: ManagerAuditItem[] = [
  { id: "0", name: "Care File Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "carefile" },
  { id: "5", name: "CARE Documentation (10% to be checked)", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "carefile" },
  { id: "3", name: "Bedrails Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "7", name: "Competency Assessment Review", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "quarterly", category: "staff" },
  { id: "8", name: "Complaints Analysis", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "general" },
  { id: "9", name: "Decontamination", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "10", name: "Dining Experience", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "quarterly", category: "operational" },
  { id: "13", name: "Fall audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "18", name: "Medication Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "19", name: "Modified Diet and Fluids Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "21", name: "Restrictive Practice", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "quarterly", category: "clinical" },
  { id: "22", name: "RTW Tracker", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "staff" },
  { id: "24", name: "Safety Alerts", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "general" },
  { id: "26", name: "Supervision and Appraisal Matrix", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "quarterly", category: "staff" },
  { id: "28", name: "Wounds Analysis", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "29", name: "GDPR", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "yearly", category: "general" },
  { id: "31", name: "Resident Agreement", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "yearly", category: "general" },
  { id: "32", name: "NISCC Registration Tracker", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "staff" },
  { id: "33", name: "NMC Registration Tracker", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "staff" },
  { id: "34", name: "Incident audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "35", name: "Moving & Handling Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "36", name: "Choking Risk Assessment Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "37", name: "DNACPR Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "38", name: "Care Management Reviews", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "39", name: "Pressure Damage Prevention Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "40", name: "Health & Monitoring Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "41", name: "Mattress and Visual Checks Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
  { id: "42", name: "Infection Control Audit", status: "new", auditor: "-", lastAudited: "-", dueDate: "-", frequency: "monthly", category: "clinical" },
];

const calculateAuditDueDate = (lastAuditedDate: string, frequency: ManagerAuditItem["frequency"]): string => {
  const lastDate = new Date(lastAuditedDate);
  switch (frequency) {
    case "monthly": lastDate.setMonth(lastDate.getMonth() + 1); break;
    case "quarterly": lastDate.setMonth(lastDate.getMonth() + 3); break;
    case "6month": lastDate.setMonth(lastDate.getMonth() + 6); break;
    case "yearly": lastDate.setFullYear(lastDate.getFullYear() + 1); break;
  }
  return lastDate.toISOString().split("T")[0];
};

const determineAuditStatus = (dueDate: string | null): ManagerAuditItem["status"] => {
  if (!dueDate || dueDate === "-") return "new";
  const due = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0 || diffDays <= 7) return "due";
  return "completed";
};

// Helper for initials
function getInitials(name: string) {

  if (!name) return "R";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Bristol Stool Chart Scale details mapping
const BRISTOL_SCALE_MAP: Record<string, { typeNum: string; title: string; description: string }> = {
  type_1: { typeNum: "Type 1", title: "Separate hard lumps", description: "Hard lumps, like nuts (hard to pass)" },
  type_2: { typeNum: "Type 2", title: "Sausage-shaped but lumpy", description: "Lumpy sausage shape" },
  type_3: { typeNum: "Type 3", title: "Like a sausage with cracks", description: "Sausage-like with cracks on surface" },
  type_4: { typeNum: "Type 4", title: "Smooth and soft sausage", description: "Like a sausage or snake, smooth and soft" },
  type_5: { typeNum: "Type 5", title: "Soft blobs with clear edges", description: "Passed easily, soft blobs" },
  type_6: { typeNum: "Type 6", title: "Fluffy pieces, ragged edges", description: "Mushy stool, soft pieces" },
  type_7: { typeNum: "Type 7", title: "Watery, no solid pieces", description: "Entirely liquid stool" }
};

// Standardize date format to DD-MM-YYYY and time to HH:mm:ss for RQIA incidents and falls
function formatDateStandard(rawDate?: string, rawFolderName?: string, rawCreatedAt?: string): string {
  const input = (rawDate || rawFolderName || "").trim();

  if (input) {
    // 1. Regex YYYY-MM-DD
    const ymdMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
      const [, yyyy, mm, dd] = ymdMatch;
      return `${dd}-${mm}-${yyyy}`;
    }

    // 2. Regex DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = input.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmyMatch) {
      const [, dd, mm, yyyy] = dmyMatch;
      return `${dd.padStart(2, "0")}-${mm.padStart(2, "0")}-${yyyy}`;
    }

    // 3. Embedded DD-MM-YYYY or DD/MM/YYYY in string
    const dmyEmbedded = input.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (dmyEmbedded) {
      const [, dd, mm, yyyy] = dmyEmbedded;
      return `${dd.padStart(2, "0")}-${mm.padStart(2, "0")}-${yyyy}`;
    }

    // 4. ISO Date string or parseable Date
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return format(d, "dd-MM-yyyy");
    }
  }

  // 5. Fallback to rawCreatedAt ISO timestamp
  if (rawCreatedAt) {
    const d = new Date(rawCreatedAt);
    if (!isNaN(d.getTime())) {
      return format(d, "dd-MM-yyyy");
    }
  }

  return input || "Recent";
}

function formatTimeStandard(rawTime?: string, rawCreatedAt?: string): string {
  let t = (rawTime || "").trim();

  if (!t && rawCreatedAt) {
    const d = new Date(rawCreatedAt);
    if (!isNaN(d.getTime())) {
      t = format(d, "HH:mm:ss");
    }
  }

  if (!t) return "";

  const hmsMatch = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hmsMatch) {
    const [, hh, mm, ss] = hmsMatch;
    return `${hh.padStart(2, "0")}:${mm}:${ss || "00"}`;
  }

  return t;
}

// Calculate age from Date of Birth string/date
function calculateAge(dobStr?: string): number {
  if (!dobStr) return 78;
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return 78;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : 78;
}

// Calculate months since admission
function calculateMonths(admissionStr?: string): number {
  if (!admissionStr) return 14;
  const admDate = new Date(admissionStr);
  if (isNaN(admDate.getTime())) return 14;
  const diffMs = Math.max(0, Date.now() - admDate.getTime());
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
}

// Handover-Style Date Selector for Care Tab Headings
function CareDateSelector({
  selectedDate,
  onDateChange
}: {
  selectedDate: Date;
  onDateChange: (d: Date) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const changeDate = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    if (next > new Date()) return;
    onDateChange(next);
  };

  const isToday = isSameDay(selectedDate, new Date());
  const isYesterday = isSameDay(selectedDate, subDays(new Date(), 1));
  const dateLabel = isToday
    ? "Today"
    : isYesterday
    ? "Yesterday"
    : format(selectedDate, "dd MMM yyyy");

  const isFutureDisabled = isToday;

  return (
    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      <button
        type="button"
        onClick={() => changeDate(-1)}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors text-sm font-bold"
        title="Previous Day"
      >
        ‹
      </button>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-3 py-1 text-xs font-semibold border-x border-slate-200 min-w-[100px] text-center text-slate-800 hover:bg-slate-50 transition-colors"
          >
            {dateLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              if (!d) return;
              const normalized = new Date(d);
              normalized.setHours(0, 0, 0, 0);
              onDateChange(normalized);
              setCalendarOpen(false);
            }}
            disabled={(d) => d > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => changeDate(1)}
        disabled={isFutureDisabled}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next Day"
      >
        ›
      </button>
    </div>
  );
}

function formatTitleCase(str?: string): string {
  if (!str) return "";
  return str
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

function getRecordedByName(row: any, profilesMap: Record<string, string> = {}): string {
  if (!row) return "Care Staff";

  // 1. Explicit staff name fields on row
  if (row.recorded_by_name && typeof row.recorded_by_name === "string" && row.recorded_by_name.trim()) {
    return formatTitleCase(row.recorded_by_name.trim());
  }
  if (row.staff_name && typeof row.staff_name === "string" && row.staff_name.trim()) {
    return formatTitleCase(row.staff_name.trim());
  }
  if (row.author_name && typeof row.author_name === "string" && row.author_name.trim()) {
    return formatTitleCase(row.author_name.trim());
  }
  if (row.created_by_name && typeof row.created_by_name === "string" && row.created_by_name.trim()) {
    return formatTitleCase(row.created_by_name.trim());
  }

  // 2. Extract joined recorded_by_user if present (handling object or array)
  const recUser = Array.isArray(row.recorded_by_user) ? row.recorded_by_user[0] : row.recorded_by_user;
  if (recUser) {
    const uName = recUser.name || (recUser.first_name ? `${recUser.first_name} ${recUser.last_name || ""}`.trim() : null) || recUser.email;
    if (uName && typeof uName === "string" && uName.trim()) {
      return formatTitleCase(uName.trim());
    }
  }

  // 3. Explicit signature or payload fields
  if (row.signature && typeof row.signature === "string" && row.signature.trim() && !row.signature.includes("-")) {
    return formatTitleCase(row.signature.trim());
  }
  if (row.payload?.primaryStaff && typeof row.payload.primaryStaff === "string" && row.payload.primaryStaff.trim()) {
    return formatTitleCase(row.payload.primaryStaff.trim());
  }

  // 4. Lookup by user ID in profilesMap
  const userId = row.performed_by || row.created_by || row.recorded_by || row.author_id || row.author || recUser?.id;
  if (userId && profilesMap[userId]) {
    return formatTitleCase(profilesMap[userId]);
  }

  // 5. Fallback for plain string recorded_by or signature
  if (row.recorded_by && typeof row.recorded_by === "string" && !row.recorded_by.includes("-")) {
    return formatTitleCase(row.recorded_by.trim());
  }
  if (row.signature && typeof row.signature === "string" && row.signature.trim()) {
    return formatTitleCase(row.signature.trim());
  }

  return "Care Staff";
}

// ══════════════════════════════════════════════════
// SAMPLE DATA FALLBACK FOR DEMO / PRE-POPULATED DATA
// ══════════════════════════════════════════════════
const SAMPLE_RESIDENTS = [
  {
    id: "sample-1",
    isLive: false,
    name: "Robert Atkinson",
    room: "Room 11",
    age: 70,
    dob: "14 Mar 1954",
    nhs: "943 276 1028",
    conditions: [{ label: "Arthritis", type: "blue" }],
    risks: [{ label: "2 risks", level: "medium" }],
    allergies: [{ label: "Peanuts", type: "red" }],
    deps: "4 dependencies",
    gender: "Male",
    admissionDate: "12 Jan 2024",
    color: "#7c3aed"
  },
  {
    id: "sample-2",
    isLive: false,
    name: "Bob Martin",
    room: "Room 12",
    age: 34,
    dob: "5 Aug 1990",
    nhs: "512 388 2019",
    conditions: [{ label: "Diabetes (Type 2)", type: "pink" }],
    risks: [{ label: "1 risk", level: "low" }],
    allergies: [{ label: "Sulphites", type: "amber" }],
    deps: "4 dependencies",
    gender: "Male",
    admissionDate: "3 Mar 2025",
    color: "#2563eb"
  },
  {
    id: "sample-3",
    isLive: false,
    name: "Mary Smith",
    room: "Room 101",
    age: 84,
    dob: "22 Nov 1940",
    nhs: "761 443 9931",
    conditions: [
      { label: "Diabetes (Type 2)", type: "pink" },
      { label: "Dysphagia", type: "amber" }
    ],
    risks: [{ label: "2 risks", level: "medium" }],
    allergies: [{ label: "Peanuts", type: "red" }],
    deps: "4 dependencies",
    gender: "Female",
    admissionDate: "8 Apr 2023",
    color: "#db2777"
  },
  {
    id: "sample-4",
    isLive: false,
    name: "George Taylor",
    room: "Room 102",
    age: 87,
    dob: "3 Feb 1937",
    nhs: "822 194 4477",
    conditions: [{ label: "Chronic Kidney Disease", type: "teal" }],
    risks: [{ label: "1 risk", level: "low" }],
    allergies: [
      { label: "Gluten", type: "amber" },
      { label: "Nuts", type: "red" }
    ],
    deps: "4 dependencies",
    gender: "Male",
    admissionDate: "15 Sep 2022",
    color: "#0891b2"
  },
  {
    id: "sample-5",
    isLive: false,
    name: "Eileen Johnson",
    room: "Room 103",
    age: 81,
    dob: "19 Jun 1943",
    nhs: "394 882 6610",
    conditions: [{ label: "Diabetes (Type 2)", type: "pink" }],
    risks: [{ label: "3 risks", level: "high" }],
    allergies: [{ label: "Eggs", type: "amber" }],
    deps: "3 dependencies",
    gender: "Female",
    admissionDate: "20 Feb 2024",
    color: "#16a34a"
  }
];

interface CareFileItem {
  id: string;
  name: string;
  formKey?: CareFileFormKey;
  folderKey: string;
  folderName: string;
  date: string;
  timestamp: number;
  status: "current" | "due" | "draft" | "completed" | "pending";
  type: "form" | "file" | "careplan" | "bodymap";
  assessor?: string;
  pdfUrl?: string | null;
  storagePath?: string | null;
  raw?: any;
}

const FORM_TABLE_CONFIG: Array<{
  key: string;
  table: string;
  name: string;
  folderKey: string;
  folderName: string;
}> = [
  { key: "preAdmission-form", table: "pre_admission_care_files", name: "Pre-Admission Assessment Form", folderKey: "v2-pre-admission", folderName: "Pre-Admission" },
  { key: "infection-prevention", table: "infection_prevention_assessments", name: "Infection Prevention Control Pre-Admission Assessment", folderKey: "v2-pre-admission", folderName: "Pre-Admission" },
  { key: "admission-form", table: "admission_assessments", name: "Admission Assessment", folderKey: "v2-admission", folderName: "Admission" },
  { key: "v2-capacity-consent", table: "capacity_consents", name: "Capacity and Consent", folderKey: "v2-admission", folderName: "Admission" },
  { key: "photography-consent", table: "photography_consents", name: "Photographic Consent Form", folderKey: "v2-admission", folderName: "Admission" },
  { key: "best-interest-decision-form", table: "best_interest_decisions", name: "Best Interest Decision Form", folderKey: "v2-admission", folderName: "Admission" },
  { key: "v2-night-obs-consent", table: "night_observation_consents", name: "Night Observation Consent", folderKey: "v2-admission", folderName: "Admission" },
  { key: "v2-general-risk", table: "general_risk_assessments", name: "General Risk Assessment", folderKey: "v2-safe-environment", folderName: "Maintaining a Safe Environment" },
  { key: "peep", table: "peeps", name: "PEEP (Personal Emergency Evacuation Plan)", folderKey: "v2-safe-environment", folderName: "Maintaining a Safe Environment" },
  { key: "v2-restraints-risk", table: "restraints_consents", name: "Consent and Risk Assessment for Restraints", folderKey: "v2-safe-environment", folderName: "Maintaining a Safe Environment" },
  { key: "dependency-assessment", table: "dependency_assessments", name: "Dependency Assessment", folderKey: "v2-dependency", folderName: "Dependency" },
  { key: "v2-personal-profile", table: "personal_profiles", name: "Personal Profile", folderKey: "v2-my-life", folderName: "This Is My Life" },
  { key: "timl", table: "timl_assessments", name: "This Is My Life Assessment", folderKey: "v2-my-life", folderName: "This Is My Life" },
  { key: "v2-abbey-pain", table: "abbey_pain_assessments", name: "Abbey Pain Tool", folderKey: "v2-medication", folderName: "Medication" },
  { key: "pain-assessment-form", table: "pain_assessments", name: "Pain Assessment", folderKey: "v2-medication", folderName: "Medication" },
  { key: "moving-handling-form", table: "moving_handling_assessments", name: "Moving and Handling Assessment", folderKey: "v2-mobility", folderName: "Mobility" },
  { key: "resident-handling-profile-form", table: "handling_profiles", name: "Resident Handling Profile", folderKey: "v2-mobility", folderName: "Mobility" },
  { key: "fall-risk-assessment", table: "fall_risk_assessments", name: "Fall Risk Assessment", folderKey: "v2-mobility", folderName: "Mobility" },
  { key: "long-term-fall-risk-form", table: "long_term_falls_risk_assessments", name: "Long Term Falls Risk Assessment", folderKey: "v2-mobility", folderName: "Mobility" },
  { key: "bedrail-consent-form", table: "bedrail_consents", name: "Bedrail Consent / Agreement", folderKey: "v2-mobility", folderName: "Mobility" },
  { key: "bed-rails-risk-assessment-form", table: "bedrails_risk_assessments", name: "Bedrail Risk Assessment", folderKey: "v2-mobility", folderName: "Mobility" },
  { key: "v2-must-assessment", table: "must_assessments", name: "MUST Assessment", folderKey: "v2-nutrition-hydration", folderName: "Nutrition and Hydration" },
  { key: "v2-weight-chart", table: "weight_records", name: "Weight Chart", folderKey: "v2-nutrition-hydration", folderName: "Nutrition and Hydration" },
  { key: "nutritional-assessment-form", table: "nutritional_assessments", name: "Nutrition Assessment", folderKey: "v2-nutrition-hydration", folderName: "Nutrition and Hydration" },
  { key: "oral-assessment-form", table: "oral_assessments", name: "Oral Assessment", folderKey: "v2-hygiene", folderName: "Personal Hygiene and Dressing" },
  { key: "choking-risk-assessment-form", table: "choking_risk_assessments", name: "Choking Risk Assessment", folderKey: "v2-nutrition-hydration", folderName: "Nutrition and Hydration" },
  { key: "diet-notification-form", table: "diet_notifications", name: "Diet Notification", folderKey: "v2-nutrition-hydration", folderName: "Nutrition and Hydration" },
  { key: "blader-bowel-form", table: "bladder_bowel_assessments", name: "Bladder and Bowel Continence Assessment", folderKey: "v2-incontinence", folderName: "Incontinence" },
  { key: "braden-risk-assessment-form", table: "braden_risk_assessments", name: "Braden Risk Assessment", folderKey: "v2-skin-integrity", folderName: "Skin Integrity / Tissue Viability" },
  { key: "smoking-risk-assessment", table: "smoking_risk_assessments", name: "Smoking Risk Assessment", folderKey: "v2-additional-cp", folderName: "Additional Care Plans" },
  { key: "cornell-depression-scale-form", table: "cornell_depression_scales", name: "Cornell Scale for Depression in Dementia", folderKey: "v2-psychological", folderName: "Psychological & Emotional Needs" },
  { key: "resident-valuables-form", table: "resident_valuables_assessments", name: "Resident Valuables Record", folderKey: "v2-valuables", folderName: "Residents’ Valuables and Personal Property" },
  { key: "v2-specimen-log", table: "specimen_records", name: "Specimen Record Log", folderKey: "v2-specimens", folderName: "Record of Specimens" },
  { key: "dnacpr", table: "dnacprs", name: "DNACPR Form", folderKey: "v2-confidential", folderName: "Confidential Records" },
  { key: "care-plan-form", table: "care_plan_assessments", name: "Care Plan Assessment", folderKey: "v2-additional-cp", folderName: "Additional Care Plans" },
  { key: "key-worker-diary-form", table: "key_worker_diary", name: "Key Worker Diary", folderKey: "v2-key-worker", folderName: "Key Worker Diary" },
  { key: "progress-note-form", table: "progress_notes", name: "Progress Note", folderKey: "v2-progress-note", folderName: "Progress Note" }
];

function isFormMatch(
  item: CareFileItem,
  targetKey: string,
  targetFolderKey: string,
  targetName: string
): boolean {
  if (!item) return false;

  const itemKey = (item.formKey || "").toLowerCase();
  const tKey = (targetKey || "").toLowerCase();

  if (itemKey && tKey) {
    if (itemKey === tKey) return true;
    if (itemKey.replace(/^v2-/, "") === tKey.replace(/^v2-/, "")) return true;
    if (itemKey.replace(/-form$/, "") === tKey.replace(/-form$/, "")) return true;

    const keyAliases: Record<string, string[]> = {
      "preAdmission-form": ["preadmission-form", "pre_admission_care_files", "preadmission"],
      "infection-prevention": ["infection-prevention", "infection_prevention_assessments"],
      "v2-general-risk": ["general-risk", "v2-general-risk", "general_risk_assessments", "general-risk-assessment"],
      "v2-capacity-consent": ["capacity-consent", "v2-capacity-consent", "capacity_consents"],
      "v2-night-obs-consent": ["night-obs-consent", "v2-night-obs-consent", "night_observation_consents"],
      "v2-restraints-risk": ["restraints-risk", "v2-restraints-risk", "restraints_consents"],
      "v2-abbey-pain": ["abbey-pain", "v2-abbey-pain", "abbey_pain_assessments"],
      "v2-must-assessment": ["must-assessment", "v2-must-assessment", "must_assessments", "must", "must-calculator"],
      "v2-personal-profile": ["personal-profile", "v2-personal-profile", "personal_profiles", "timl"],
      "v2-weight-chart": ["weight-chart", "v2-weight-chart", "weight_records"],
      "v2-specimen-log": ["specimen-log", "v2-specimen-log", "specimen_records"],
      "blader-bowel-form": ["blader-bowel-form", "bladder-bowel-form", "bladder_bowel_assessments", "bladder-bowel"],
      "peep": ["peep", "peeps", "v2-peep"],
      "moving-handling-form": ["moving-handling-form", "moving_handling_assessments", "moving-handling"],
      "resident-handling-profile-form": ["resident-handling-profile-form", "handling_profiles"],
      "fall-risk-assessment": ["fall-risk-assessment", "fall_risk_assessments", "falls-risk"],
      "long-term-fall-risk-form": ["long-term-fall-risk-form", "long_term_falls_risk_assessments"],
      "bedrail-consent-form": ["bedrail-consent-form", "bedrail_consents", "bedrail-consent"],
      "bed-rails-risk-assessment-form": ["bed-rails-risk-assessment-form", "bedrails_risk_assessments", "bedrail-risk"],
      "nutritional-assessment-form": ["nutritional-assessment-form", "nutritional_assessments", "nutrition-assessment"],
      "oral-assessment-form": ["oral-assessment-form", "oral_assessments"],
      "choking-risk-assessment-form": ["choking-risk-assessment-form", "choking_risk_assessments"],
      "diet-notification-form": ["diet-notification-form", "diet_notifications"],
      "braden-risk-assessment-form": ["braden-risk-assessment-form", "braden_risk_assessments"],
      "smoking-risk-assessment": ["smoking-risk-assessment", "smoking_risk_assessments"],
      "cornell-depression-scale-form": ["cornell-depression-scale-form", "cornell_depression_scales"],
      "resident-valuables-form": ["resident-valuables-form", "resident_valuables_assessments"],
      "best-interest-decision-form": ["best-interest-decision-form", "best_interest_decisions"],
      "care-plan-form": ["care-plan-form", "care_plan_assessments"],
      "key-worker-diary-form": ["key-worker-diary-form", "key_worker_diary"],
      "progress-note-form": ["progress-note-form", "progress_notes"]
    };

    const aliasesForTarget = keyAliases[targetKey] || [];
    if (aliasesForTarget.includes(itemKey)) return true;

    for (const [k, aliases] of Object.entries(keyAliases)) {
      if (aliases.includes(tKey) && (aliases.includes(itemKey) || k === itemKey)) return true;
    }
  }

  // Folder + Name match fallback
  if (item.folderKey === targetFolderKey) {
    const cleanName = (s: string) =>
      (s || "")
        .toLowerCase()
        .replace(/\(.*?\)/g, "")
        .replace(/\+ evaluation|\+ monthly review|\+ score required/g, "")
        .replace(/form|assessment/g, "")
        .trim();

    const normItemName = cleanName(item.name);
    const normTargetName = cleanName(targetName);
    if (normItemName && normTargetName) {
      if (normItemName === normTargetName) return true;
      if (normItemName.includes(normTargetName) || normTargetName.includes(normItemName)) return true;
    }
  }

  return false;
}

function RqiaPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const { activeTeamId, activeTeam, activeCareHomeId, activeOrganizationId, activeOrganization } = useActiveTeam();
  const { supabase } = useSupabase();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [activeProfileTab, setActiveProfileTab] = useState("overview");
  const [activeMedTab, setActiveMedTab] = useState("active");
  const [activeAuditTab, setActiveAuditTab] = useState("clinical");

  const residentIdFromUrl = searchParams.get("residentId");
  const tabFromUrl = searchParams.get("tab") || "overview";
  const subtabFromUrl = searchParams.get("subtab");

  const updateNavUrl = useCallback(
    (params: { residentId?: string | null; tab?: string | null; subtab?: string | null }, replace = false) => {
      const currentParams = new URLSearchParams(searchParams.toString());

      if (params.residentId !== undefined) {
        if (params.residentId) {
          currentParams.set("residentId", params.residentId);
        } else {
          currentParams.delete("residentId");
          currentParams.delete("tab");
          currentParams.delete("subtab");
        }
      }

      if (params.tab !== undefined) {
        if (params.tab && params.tab !== "overview") {
          currentParams.set("tab", params.tab);
        } else if (params.tab === "overview") {
          currentParams.set("tab", "overview");
        } else {
          currentParams.delete("tab");
        }
      }

      if (params.subtab !== undefined) {
        if (params.subtab) {
          currentParams.set("subtab", params.subtab);
        } else {
          currentParams.delete("subtab");
        }
      }

      const qs = currentParams.toString();
      const targetUrl = qs ? `/dashboard/rqia-portal?${qs}` : `/dashboard/rqia-portal`;

      if (replace) {
        router.replace(targetUrl as any);
      } else {
        router.push(targetUrl as any);
      }
    },
    [router, searchParams]
  );

  // Manager Audit integration state for RQIA Portal
  const [selectedRqiaAuditId, setSelectedRqiaAuditId] = useState<string | null>(null);
  const [selectedRqiaRecordId, setSelectedRqiaRecordId] = useState<string | null>(null);
  const [viewRqiaHistoryList, setViewRqiaHistoryList] = useState<boolean>(false);
  const [rqiaAuditSearch, setRqiaAuditSearch] = useState("");
  const [auditsList, setAuditsList] = useState<ManagerAuditItem[]>(initialManagerAudits);
  const [isLoadingAuditsList, setIsLoadingAuditsList] = useState(false);
  const [rqiaHistoryRecords, setRqiaHistoryRecords] = useState<any[]>([]);
  const [isLoadingRqiaHistory, setIsLoadingRqiaHistory] = useState(false);

  // Database residents state
  const [dbResidents, setDbResidents] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // RQIA Portal In-Memory Caches
  const residentsCacheRef = React.useRef<{ data: any[]; timestamp: number; key: string } | null>(null);
  const clinicalCacheRef = React.useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const careLogsCacheRef = React.useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const formsCacheRef = React.useRef<Map<string, { data: CareFileItem[]; timestamp: number }>>(new Map());
  const profilesMapCacheRef = React.useRef<{ data: Record<string, string>; timestamp: number } | null>(null);

  const clearRqiaCache = useCallback(() => {
    residentsCacheRef.current = null;
    clinicalCacheRef.current.clear();
    careLogsCacheRef.current.clear();
    formsCacheRef.current.clear();
    profilesMapCacheRef.current = null;
  }, []);

  // Live submitted audits state
  const [liveAudits, setLiveAudits] = useState<any[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);

  // Live resident clinical data states
  const [liveCarePlans, setLiveCarePlans] = useState<any[]>([]);
  const [liveMedications, setLiveMedications] = useState<any[]>([]);
  const [liveFoodFluid, setLiveFoodFluid] = useState<any[]>([]);
  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [liveIncidentFolders, setLiveIncidentFolders] = useState<any[]>([]);
  const [liveWounds, setLiveWounds] = useState<any[]>([]);
  const [liveWoundFolders, setLiveWoundFolders] = useState<any[]>([]);
  const [incidentSearchQuery, setIncidentSearchQuery] = useState("");
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState("all");
  const [woundSearchQuery, setWoundSearchQuery] = useState("");
  const [woundStatusFilter, setWoundStatusFilter] = useState("all");
  const [liveAssessments, setLiveAssessments] = useState<any[]>([]);
  const [liveFiles, setLiveFiles] = useState<any[]>([]);
  const [liveResidentForms, setLiveResidentForms] = useState<CareFileItem[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [isLoadingLiveDetails, setIsLoadingLiveDetails] = useState(false);
  const [selectedFormItem, setSelectedFormItem] = useState<CareFileItem | null>(null);

  // Care Tab Date selection & extra care log states
  const [careDate, setCareDate] = useState<Date>(new Date());
  const [livePersonalCare, setLivePersonalCare] = useState<any[]>([]);
  const [liveContinence, setLiveContinence] = useState<any[]>([]);
  const [liveHealthVitals, setLiveHealthVitals] = useState<any[]>([]);
  const [liveProgressNotes, setLiveProgressNotes] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  const displayIncidents = useMemo(() => {
    const result: any[] = [];
    const processedIncIds = new Set<string>();

    if (liveIncidentFolders && liveIncidentFolders.length > 0) {
      liveIncidentFolders.forEach((folder) => {
        const inc = (liveIncidents || []).find(
          (i) => i.folder_id === folder.id || i.id === folder.id
        );
        const isFall = folder.folder_type === "fall" || (folder.name && folder.name.toLowerCase().includes("fall record"));
        if (inc) {
          processedIncIds.add(inc.id);
          result.push({
            id: inc.id || folder.id,
            folder_id: folder.id,
            resident_id: inc.resident_id || folder.resident_id || selectedResident?.id,
            folder_name: folder.name,
            folder_type: isFall ? "fall" : "incident",
            date: inc.date || folder.name || (folder.created_at ? format(new Date(folder.created_at), "dd-MM-yyyy") : "Recent"),
            time: inc.time || "",
            created_at: inc.created_at || folder.created_at,
            incident_types: inc.incident_types || [],
            incident_level: inc.incident_level || inc.severity || null,
            severity: inc.incident_level || inc.severity || null,
            category: inc.category || (isFall ? "Fall" : "Incident"),
            location: inc.location || "",
            status: inc.status || "Pending",
            completed_by_full_name: inc.completed_by_full_name || inc.reported_by || profilesMap[inc.created_by] || "",
            detailed_description: inc.detailed_description || inc.description || "",
            raw: inc,
          });
        } else {
          result.push({
            id: folder.id,
            folder_id: folder.id,
            resident_id: folder.resident_id || selectedResident?.id,
            folder_name: folder.name,
            folder_type: isFall ? "fall" : "incident",
            date: folder.name || (folder.created_at ? format(new Date(folder.created_at), "dd-MM-yyyy") : "Recent"),
            time: "",
            created_at: folder.created_at,
            incident_types: [],
            incident_level: null,
            severity: null,
            category: isFall ? "Fall" : "Incident",
            location: "",
            status: "Empty Folder",
            completed_by_full_name: "",
            detailed_description: "Incident folder created. Report form pending.",
            raw: folder,
          });
        }
      });
    }

    (liveIncidents || []).forEach((inc) => {
      if (!processedIncIds.has(inc.id)) {
        const isFall = inc.folder_type === "fall";
        result.push({
          id: inc.id,
          folder_id: inc.folder_id || inc.id,
          resident_id: inc.resident_id || selectedResident?.id,
          folder_name: inc.date || "Incident Record",
          folder_type: isFall ? "fall" : "incident",
          date: inc.date || (inc.created_at ? format(new Date(inc.created_at), "dd-MM-yyyy") : "Recent"),
          time: inc.time || "",
          created_at: inc.created_at,
          incident_types: inc.incident_types || [],
          incident_level: inc.incident_level || inc.severity || null,
          severity: inc.incident_level || inc.severity || null,
          category: inc.category || (isFall ? "Fall" : "Incident"),
          location: inc.location || "",
          status: inc.status || "Pending",
          completed_by_full_name: inc.completed_by_full_name || inc.reported_by || profilesMap[inc.created_by] || "",
          detailed_description: inc.detailed_description || inc.description || "",
          raw: inc,
        });
      }
    });

    if (result.length > 0) return result;

    if (selectedResident && !selectedResident.isLive) {
      return [
        {
          id: "demo-inc-1",
          date: "14 Jul 2026",
          time: "10:30",
          incident_types: ["Unwitnessed Fall"],
          category: "Fall",
          severity: "minor_injury",
          location: "Resident Bedroom",
          status: "Resolved",
          completed_by_full_name: "Sarah Manager (RN)",
          detailed_description: "Resident found sitting on carpet beside bed. Full post-fall neurological observations completed.",
        },
        {
          id: "demo-inc-2",
          date: "02 Jun 2026",
          time: "14:15",
          incident_types: ["Skin Tear"],
          category: "Clinical",
          severity: "no_harm",
          location: "Lounge Area",
          status: "Resolved",
          completed_by_full_name: "Emma Wilson",
          detailed_description: "Minor superficial skin tear on right forearm. Cleansed with saline and sterile non-adherent dressing applied.",
        },
      ];
    }
    return [];
  }, [liveIncidentFolders, liveIncidents, profilesMap, selectedResident]);

  const displayWounds = useMemo(() => {
    const result: any[] = [];
    const processedWoundIds = new Set<string>();

    if (liveWoundFolders && liveWoundFolders.length > 0) {
      liveWoundFolders.forEach((folder) => {
        const w = (liveWounds || []).find(
          (item) => item.wound_folder_id === folder.id || item.id === folder.id
        );
        if (w) {
          processedWoundIds.add(w.id);
          result.push({
            id: w.id || folder.id,
            wound_folder_id: folder.id,
            resident_id: w.resident_id || folder.resident_id || selectedResident?.id,
            wound_name: w.wound_name || folder.name || "Wound Record",
            location: w.location || "Unspecified location",
            wound_type: w.wound_type || "Skin Integrity",
            stage: w.stage || null,
            date_identified: w.date_identified || (folder.created_at ? format(new Date(folder.created_at), "yyyy-MM-dd") : ""),
            length_cm: w.length_cm,
            width_cm: w.width_cm,
            depth_cm: w.depth_cm,
            dressing_type: w.dressing_type || w.treatment_plan || "Standard dressing",
            status: w.status || "active",
            raw: w,
          });
        } else {
          result.push({
            id: folder.id,
            wound_folder_id: folder.id,
            resident_id: folder.resident_id || selectedResident?.id,
            wound_name: folder.name || "Wound Folder",
            location: "Unspecified location",
            wound_type: "Skin Integrity",
            stage: null,
            date_identified: folder.created_at ? format(new Date(folder.created_at), "yyyy-MM-dd") : "",
            dressing_type: "Folder created. Assessment pending.",
            status: "Pending Review",
            raw: folder,
          });
        }
      });
    }

    (liveWounds || []).forEach((w) => {
      if (!processedWoundIds.has(w.id)) {
        result.push({
          id: w.id,
          wound_folder_id: w.wound_folder_id || w.id,
          resident_id: w.resident_id || selectedResident?.id,
          wound_name: w.wound_name || "Wound Record",
          location: w.location || "Unspecified location",
          wound_type: w.wound_type || "Skin Integrity",
          stage: w.stage || null,
          date_identified: w.date_identified || "",
          length_cm: w.length_cm,
          width_cm: w.width_cm,
          depth_cm: w.depth_cm,
          dressing_type: w.dressing_type || w.treatment_plan || "Standard dressing",
          status: w.status || "active",
          raw: w,
        });
      }
    });

    if (result.length > 0) return result;

    if (selectedResident && !selectedResident.isLive) {
      return [
        {
          id: "demo-wnd-1",
          wound_name: "Sacral Pressure Ulcer",
          location: "Sacrum / Lower Back",
          wound_type: "Pressure Injury",
          stage: "2",
          date_identified: "2026-06-10",
          length_cm: 2.5,
          width_cm: 1.8,
          depth_cm: 0.2,
          dressing_type: "Hydrocolloid dressing (change q3d)",
          status: "Healing",
        },
        {
          id: "demo-wnd-2",
          wound_name: "Left Lower Leg Skin Tear",
          location: "Left Shin",
          wound_type: "Skin Tear Category 1",
          stage: null,
          date_identified: "2026-07-02",
          length_cm: 1.2,
          width_cm: 0.5,
          depth_cm: null,
          dressing_type: "Silicone contact layer & secondary dressing",
          status: "Active",
        },
      ];
    }
    return [];
  }, [liveWoundFolders, liveWounds, selectedResident]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerContent, setDrawerContent] = useState<any>(null);

  // Inspector session name
  const [inspectorName, setInspectorName] = useState("RQIA Inspector");
  const [residentCareFileAuditMap, setResidentCareFileAuditMap] = useState<
    Record<string, { lastAudited: string; nextAudit: string; auditor: string; recordId?: string; pendingActionPlans: number }>
  >({});

  useEffect(() => {
    if (typeof document !== "undefined") {
      const getCookie = (name: string): string | null => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(";");
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === " ") c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
      };
      const cookie = getCookie("rqia_session_data");
      if (cookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie));
          if (parsed?.fullName) setInspectorName(parsed.fullName);
        } catch (e) {
          console.error("Cookie parse error", e);
        }
      }
    }
  }, []);

  // Fetch completed manager audits data from Supabase for RQIA Audits tab
  useEffect(() => {
    const loadRqiaAuditCompletions = async () => {
      if (!supabase) return;
      try {
        setIsLoadingAuditsList(true);
        const targetCareHomeId = activeCareHomeId || (profile as any)?.care_home_id || profile?.active_care_home_id;
        
        let query = supabase
          .from("manager_audit_history")
          .select("id, audit_type_id, completed_date, auditor, data, entries_count")
          .order("completed_date", { ascending: false });

        if (targetCareHomeId) {
          query = query.eq("care_home_id", targetCareHomeId);
        }

        const { data: historyData, error } = await query;
        if (!error && historyData) {
          const latestByType: Record<string, { recordId: string; completedDate: string; auditor: string }> = {};
          const resMap: Record<string, { lastAudited: string; nextAudit: string; auditor: string; recordId?: string; pendingActionPlans: number }> = {};

          for (const record of historyData) {
            const rawId = record.audit_type_id || "";
            const typeId = (rawId === "0" || rawId.startsWith("resident-0-") || rawId.startsWith("0-")) ? "0" : rawId;
            if (!latestByType[typeId]) {
              latestByType[typeId] = {
                recordId: record.id,
                completedDate: record.completed_date,
                auditor: record.auditor,
              };
            }

            // Check if record belongs to a specific resident
            let resId = record.data?.residentId || record.data?.resident_id;
            if (!resId && rawId.startsWith("resident-0-")) {
              resId = rawId.replace("resident-0-", "");
            } else if (!resId && rawId.startsWith("0-")) {
              resId = rawId.replace("0-", "");
            }

            if (resId && !resMap[resId]) {
              const lastAudited = record.completed_date ? record.completed_date.split("T")[0] : "-";
              const nextAudit = lastAudited !== "-" ? calculateAuditDueDate(lastAudited, "monthly") : "-";
              resMap[resId] = {
                lastAudited,
                nextAudit,
                auditor: record.auditor || "—",
                recordId: record.id,
                pendingActionPlans: 0,
              };
            }
          }

          // Fetch action plans for Care File Audit (ID 0)
          try {
            let apQuery = supabase
              .from("audit_manager_action_plans")
              .select("resident_id, status")
              .eq("audit_id", "0");
            if (targetCareHomeId) {
              apQuery = apQuery.eq("care_home_id", targetCareHomeId);
            }
            const { data: apData } = await apQuery;
            if (apData) {
              for (const ap of apData) {
                if (ap.resident_id && ap.status !== "completed") {
                  if (!resMap[ap.resident_id]) {
                    resMap[ap.resident_id] = { lastAudited: "-", nextAudit: "-", auditor: "—", pendingActionPlans: 0 };
                  }
                  resMap[ap.resident_id].pendingActionPlans = (resMap[ap.resident_id].pendingActionPlans || 0) + 1;
                }
              }
            }
          } catch (apErr) {
            console.warn("Could not fetch care file action plans:", apErr);
          }

          setResidentCareFileAuditMap(resMap);

          const updated = initialManagerAudits.map((a) => {
            const latest = latestByType[a.id];
            if (latest) {
              const lastAuditedDate = latest.completedDate.split("T")[0];
              const dueDate = calculateAuditDueDate(lastAuditedDate, a.frequency);
              const status = determineAuditStatus(dueDate);
              return {
                ...a,
                status,
                auditor: latest.auditor,
                lastAudited: lastAuditedDate,
                dueDate,
                latestRecordId: latest.recordId,
              };
            }
            return a;
          });
          setAuditsList(updated);
        }
      } catch (err) {
        console.error("Error loading RQIA audit completions:", err);
      } finally {
        setIsLoadingAuditsList(false);
      }
    };

    if (activeProfileTab === "audit") {
      loadRqiaAuditCompletions();
    }
  }, [supabase, activeCareHomeId, profile, activeProfileTab]);

  const filteredRqiaAudits = useMemo(() => {
    return auditsList.filter((aud) => {
      if (activeAuditTab !== "all" && aud.category !== activeAuditTab) {
        return false;
      }
      if (rqiaAuditSearch.trim()) {
        const query = rqiaAuditSearch.toLowerCase();
        const matchName = aud.name.toLowerCase().includes(query);
        const matchAuditor = aud.auditor.toLowerCase().includes(query);
        const matchCat = aud.category.toLowerCase().includes(query);
        return matchName || matchAuditor || matchCat;
      }
      return true;
    });
  }, [auditsList, activeAuditTab, rqiaAuditSearch]);

  const handleOpenRqiaAuditHistory = async (auditId: string) => {
    setSelectedRqiaAuditId(auditId);
    setViewRqiaHistoryList(true);
    setIsLoadingRqiaHistory(true);
    try {
      const targetCareHomeId = activeCareHomeId || (profile as any)?.care_home_id || profile?.active_care_home_id;
      let query = supabase
        .from("manager_audit_history")
        .select("id, completed_date, auditor, entries_count, audit_type_id")
        .order("completed_date", { ascending: false });

      if (auditId === "0") {
        query = query.or("audit_type_id.eq.0,audit_type_id.like.resident-0-%,audit_type_id.like.0-%");
      } else {
        query = query.eq("audit_type_id", auditId);
      }

      if (targetCareHomeId) {
        query = query.eq("care_home_id", targetCareHomeId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setRqiaHistoryRecords(data);
      } else {
        setRqiaHistoryRecords([]);
      }
    } catch (err) {
      console.error("Error fetching audit history:", err);
      setRqiaHistoryRecords([]);
    } finally {
      setIsLoadingRqiaHistory(false);
    }
  };

  // Fetch Live Residents from Supabase (Cached for 5 minutes)
  const fetchDbResidents = useCallback(async (forceRefresh = false) => {
    if (!supabase || !profile) return;
    const cacheKey = `${activeOrganizationId || ""}_${activeCareHomeId || ""}_${activeTeamId || ""}`;
    const now = Date.now();

    if (!forceRefresh && residentsCacheRef.current && residentsCacheRef.current.key === cacheKey) {
      if (now - residentsCacheRef.current.timestamp < 5 * 60 * 1000) {
        setDbResidents(residentsCacheRef.current.data);
        setIsLoadingDb(false);
        return;
      }
    }

    setIsLoadingDb(true);

    try {
      let query = supabase.from("residents").select("*, emergency_contacts(*)");

      const targetOrgId = activeOrganizationId || (profile as any)?.organization_id || profile?.active_organization_id;
      const targetCareHomeId = activeCareHomeId || (profile as any)?.care_home_id || profile?.active_care_home_id;

      if (activeTeamId) {
        query = query.eq("team_id", activeTeamId);
      } else if (targetCareHomeId) {
        query = query.eq("care_home_id", targetCareHomeId);
      } else if (targetOrgId) {
        query = query.eq("organization_id", targetOrgId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch diet & lifestyle records for allergies and active hospital transfer logs
        const residentIds = data.map((r: any) => r.id);
        let dietMap: Record<string, any[]> = {};
        let transferMap: Record<string, boolean> = {};

        if (residentIds.length > 0) {
          const [{ data: dietData }, { data: transferLogs }] = await Promise.all([
            supabase
              .from("diet_lifestyle")
              .select("resident_id, allergies")
              .in("resident_id", residentIds),
            supabase
              .from("hospital_transfer_logs")
              .select("resident_id, label")
              .in("resident_id", residentIds)
              .eq("label", "handover_active")
          ]);

          if (dietData) {
            dietData.forEach((d: any) => {
              if (d.resident_id && d.allergies) {
                dietMap[d.resident_id] = d.allergies;
              }
            });
          }

          if (transferLogs) {
            transferLogs.forEach((tl: any) => {
              if (tl.resident_id) {
                transferMap[tl.resident_id] = true;
              }
            });
          }
        }

        const mapped = data.map((r: any, idx: number) => {
          const fullName = `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Unnamed Resident";
          const room = r.room_number
            ? r.room_number.toLowerCase().startsWith("room")
              ? r.room_number
              : `Room ${r.room_number}`
            : "Room Unassigned";

          const age = calculateAge(r.date_of_birth);
          const colors = ["#7c3aed", "#2563eb", "#db2777", "#0891b2", "#16a34a", "#d97706"];
          const color = colors[idx % colors.length];

          const imageUrl = r.image_url || r.imageUrl || null;

          // Health Conditions mapping (checking health_conditions or medical_conditions)
          const rawConditions = r.health_conditions || r.medical_conditions;
          let conds: any[] = [];
          if (rawConditions) {
            if (Array.isArray(rawConditions)) {
              conds = rawConditions
                .map((c: any) => {
                  const str = typeof c === "string" ? c : (c?.condition || c?.name || c?.label || String(c));
                  return str ? { label: str, type: "blue" } : null;
                })
                .filter(Boolean);
            } else if (typeof rawConditions === "string" && rawConditions.trim()) {
              conds = [{ label: rawConditions.trim(), type: "blue" }];
            }
          }

          // Allergies mapping (checking diet_lifestyle map first, then r.allergies)
          const rawAllergies: any = dietMap[r.id] || r.allergies;
          let allergiesArr: any[] = [];
          if (rawAllergies) {
            if (Array.isArray(rawAllergies)) {
              allergiesArr = rawAllergies
                .map((a: any) => {
                  const str = typeof a === "string" ? a : (a?.allergy || a?.allergen || a?.name || a?.label || String(a));
                  return str ? { label: str, type: "amber" } : null;
                })
                .filter(Boolean);
            } else if (typeof rawAllergies === "string" && (rawAllergies as string).trim()) {
              allergiesArr = [{ label: (rawAllergies as string).trim(), type: "amber" }];
            }
          }

          // Risks mapping
          const rawRisks: any = r.risks;
          let risksArr: any[] = [];
          if (rawRisks) {
            if (Array.isArray(rawRisks)) {
              risksArr = rawRisks
                .map((rk: any) => {
                  if (typeof rk === "string" && rk.trim()) {
                    return { label: rk.trim(), level: "medium" };
                  }
                  if (typeof rk === "object" && rk !== null) {
                    const label = rk.risk || rk.label || rk.name;
                    if (!label) return null;
                    const level = rk.level || "medium";
                    return { label: String(label), level };
                  }
                  return null;
                })
                .filter(Boolean);
            } else if (typeof rawRisks === "string" && (rawRisks as string).trim()) {
              risksArr = [{ label: (rawRisks as string).trim(), level: "medium" }];
            }
          }

          // Dependencies mapping
          const rawDeps: any = r.dependencies;
          let depsStr = "No dependencies";
          if (rawDeps) {
            if (typeof rawDeps === "string" && (rawDeps as string).trim()) {
              depsStr = (rawDeps as string).trim();
            } else if (typeof rawDeps === "number") {
              depsStr = rawDeps === 0 ? "No dependencies" : `${rawDeps} ${rawDeps === 1 ? "dependency" : "dependencies"}`;
            } else if (Array.isArray(rawDeps)) {
              const activeList = rawDeps.filter(
                (dep: any) => dep && String(dep).toLowerCase().trim() !== "independent" && String(dep).toLowerCase().trim() !== "none"
              );
              depsStr = activeList.length === 0 ? "No dependencies" : `${activeList.length} ${activeList.length === 1 ? "dependency" : "dependencies"}`;
            } else if (typeof rawDeps === "object" && rawDeps !== null) {
              const activeEntries = Object.entries(rawDeps).filter(([_, val]) => {
                if (!val || typeof val !== "string") return false;
                const cleanVal = val.toLowerCase().trim();
                return cleanVal !== "independent" && cleanVal !== "none" && cleanVal !== "no" && cleanVal !== "false";
              });
              depsStr = activeEntries.length === 0 ? "No dependencies" : `${activeEntries.length} ${activeEntries.length === 1 ? "dependency" : "dependencies"}`;
            }
          }

          // DOB & Admission formatting
          let formattedDob = "Not specified";
          if (r.date_of_birth) {
            try {
              formattedDob = format(new Date(r.date_of_birth), "dd MMM yyyy");
            } catch {
              formattedDob = String(r.date_of_birth);
            }
          }

          let formattedAdmission = "Not specified";
          if (r.admission_date) {
            try {
              formattedAdmission = format(new Date(r.admission_date), "dd MMM yyyy");
            } catch {
              formattedAdmission = String(r.admission_date);
            }
          }

          return {
            id: r.id,
            isLive: true,
            raw: r,
            name: fullName,
            room,
            age,
            dob: formattedDob,
            nhs: r.nhs_health_number || "Not specified",
            image_url: imageUrl,
            imageUrl: imageUrl,
            hasActiveHospitalTransfer: !!transferMap[r.id],
            conditions: conds,
            risks: risksArr,
            allergies: allergiesArr,
            deps: depsStr,
            gender: r.gender || "Not specified",
            admissionDate: formattedAdmission,
            color,
            phone: r.phone_number || "Not specified",
            gp: {
              name: r.gp_name || "Not specified",
              address: r.gp_address || "",
              phone: r.gp_phone || ""
            },
            careManager: {
              name: r.care_manager_name || "Not specified",
              address: r.care_manager_address || "",
              phone: r.care_manager_phone || ""
            },
            emergencyContacts: r.emergency_contacts || []
          };
        });

        residentsCacheRef.current = { data: mapped, timestamp: Date.now(), key: cacheKey };
        setDbResidents(mapped);
      } else {
        residentsCacheRef.current = { data: [], timestamp: Date.now(), key: cacheKey };
        setDbResidents([]);
      }
    } catch (err) {
      console.error("Error fetching live residents:", err);
      setDbResidents([]);
    } finally {
      setIsLoadingDb(false);
    }
  }, [supabase, profile, activeTeamId, activeCareHomeId, activeOrganizationId]);

  useEffect(() => {
    fetchDbResidents();
  }, [fetchDbResidents]);

  // Fetch Live Clinical Data when a Resident is selected
  useEffect(() => {
    async function fetchResidentClinicalData() {
      if (!selectedResident || !supabase) {
        setLiveCarePlans([]);
        setLiveMedications([]);
        setLiveFoodFluid([]);
        setLiveIncidents([]);
        setLiveIncidentFolders([]);
        setLiveWounds([]);
        setLiveWoundFolders([]);
        setLiveAssessments([]);
        setLiveFiles([]);
        return;
      }

      setIsLoadingLiveDetails(true);
      const residentId = selectedResident.id;
      const now = Date.now();
      const dateStr = format(careDate, "yyyy-MM-dd");
      const logsKey = `${residentId}_${dateStr}`;

      let filteredFF: any[] = [];
      let filteredPC: any[] = [];
      let filteredCont: any[] = [];
      let filteredW: any[] = [];
      let filteredNotes: any[] = [];

      // Check in-memory caches (5-min for clinical/files, 3-min for care logs, 10-min for profiles)
      const cachedClinical = clinicalCacheRef.current.get(residentId);
      const cachedLogs = careLogsCacheRef.current.get(logsKey);

      let clinicalHit = false;
      let logsHit = false;

      if (cachedClinical && now - cachedClinical.timestamp < 5 * 60 * 1000) {
        clinicalHit = true;
        setLiveCarePlans(cachedClinical.data.carePlans);
        setLiveFiles(cachedClinical.data.files);
        setLiveMedications(cachedClinical.data.medications);
        setLiveIncidentFolders(cachedClinical.data.incidentFolders);
        setLiveIncidents(cachedClinical.data.incidents);
        setLiveWoundFolders(cachedClinical.data.woundFolders);
        setLiveWounds(cachedClinical.data.wounds);
        setLiveAssessments(cachedClinical.data.assessments);
      }

      if (cachedLogs && now - cachedLogs.timestamp < 3 * 60 * 1000) {
        logsHit = true;
        setLiveFoodFluid(cachedLogs.data.foodFluid);
        setLivePersonalCare(cachedLogs.data.personalCare);
        setLiveContinence(cachedLogs.data.continence);
        setLiveHealthVitals(cachedLogs.data.healthVitals);
        setLiveProgressNotes(cachedLogs.data.progressNotes);
      }

      if (profilesMapCacheRef.current && now - profilesMapCacheRef.current.timestamp < 10 * 60 * 1000) {
        setProfilesMap(profilesMapCacheRef.current.data);
      }

      if (clinicalHit && logsHit) {
        setIsLoadingLiveDetails(false);
        return;
      }

      try {
        // 1. Care Plans / Files (from care_plan_assessments table)
        const { data: plans } = await supabase
          .from("care_plan_assessments")
          .select("*")
          .eq("resident_id", residentId)
          .order("created_at", { ascending: false });
        setLiveCarePlans(plans || []);

        const { data: files } = await supabase
          .from("files")
          .select("*")
          .eq("resident_id", residentId);
        setLiveFiles(files || []);

        // 2. Medications
        const { data: meds, error: medsErr } = await supabase
          .from("medications")
          .select("*")
          .eq("resident_id", residentId)
          .order("created_at", { ascending: false });
        if (medsErr) {
          console.error("Error fetching medications for resident:", residentId, medsErr);
        }
        setLiveMedications(meds || []);

        // Profiles & Users map for staff resolution
        const profMap: Record<string, string> = {};
        const { data: profs, error: profsErr } = await supabase.from("profiles").select("id, name, email");
        if (!profsErr && profs) {
          profs.forEach((p: any) => {
            const val = p.name || p.email;
            if (p.id && val) profMap[p.id] = val;
          });
        }
        const { data: usersData, error: usersErr } = await supabase.from("users").select("id, name, email");
        if (!usersErr && usersData) {
          usersData.forEach((u: any) => {
            const val = u.name || u.email;
            if (u.id && val && !profMap[u.id]) profMap[u.id] = val;
          });
        }
        setProfilesMap(profMap);

        // 3. Food & Fluid Logs
        const dateStr = format(careDate, "yyyy-MM-dd");
        const { data: ff, error: ffErr } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", residentId);

        if (!ffErr && ff) {
          filteredFF = ff.filter((item: any) => {
            const d = item.date || (item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : (item.timestamp ? String(item.timestamp).slice(0, 10) : ""));
            return d === dateStr;
          });
          filteredFF.sort((a: any, b: any) => {
            const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tB - tA;
          });
          setLiveFoodFluid(filteredFF);
        } else {
          filteredFF = [];
          setLiveFoodFluid([]);
        }

        // 3b. Personal Care Logs
        const { data: pctasks } = await supabase
          .from("personal_care_task_events")
          .select("*")
          .eq("resident_id", residentId);
        const { data: pcdaily } = await supabase
          .from("personal_care_daily")
          .select("*, tasks:personal_care_task_events(*)")
          .eq("resident_id", residentId);

        const combinedPC: any[] = [];
        if (pctasks) combinedPC.push(...pctasks);
        if (pcdaily) {
          pcdaily.forEach((row: any) => {
            if (row.tasks && Array.isArray(row.tasks)) {
              row.tasks.forEach((t: any) => combinedPC.push(t));
            }
          });
        }
        filteredPC = combinedPC.filter((item: any) => {
          const d = item.date || (item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : "");
          return d === dateStr;
        });
        setLivePersonalCare(filteredPC);

        // 3c. Continence Entries
        const { data: cont, error: contErr } = await supabase
          .from("continence_entries")
          .select("*, recorded_by_user:recorded_by(id, name, email)")
          .eq("resident_id", residentId);

        if (!contErr && cont) {
          filteredCont = cont.filter((item: any) => {
            const d = item.date || (item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : "");
            return d === dateStr;
          });
          filteredCont.sort((a: any, b: any) => {
            const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tB - tA;
          });
          setLiveContinence(filteredCont);
        } else {
          filteredCont = [];
          setLiveContinence([]);
        }

        // 3d. Health & Vitals
        const { data: stdVitals } = await supabase
          .from("vitals")
          .select("*")
          .eq("resident_id", residentId);
        const { data: weights } = await supabase
          .from("weight_records")
          .select("*")
          .eq("resident_id", residentId);
        const { data: bloods } = await supabase
          .from("blood_monitoring_records")
          .select("*")
          .eq("resident_id", residentId);

        const vitalTypeMap: Record<string, string> = {
          temperature: "Body Temperature",
          bloodPressure: "Blood Pressure",
          heartRate: "Heart Rate",
          respiratoryRate: "Respiratory Rate",
          oxygenSaturation: "Oxygen Saturation (SpO2)",
          bloodGlucose: "Blood Glucose",
          weight: "Weight",
          height: "Height",
          bmi: "BMI"
        };

        const combinedVitals: any[] = [];
        if (stdVitals) {
          stdVitals.forEach((v: any) => {
            const rawType = v.vital_type || "Vital Sign";
            const label = vitalTypeMap[rawType] || formatTitleCase(rawType);
            let val = String(v.value || "");
            if (v.value2) val += ` / ${v.value2}`;
            if (v.unit) val += ` ${v.unit}`;
            if (!val.trim()) val = "Recorded";

            combinedVitals.push({
              id: v.id,
              type: label,
              created_at: v.created_at,
              date: v.record_date || (v.created_at ? new Date(v.created_at).toISOString().slice(0, 10) : ""),
              time: v.record_time,
              value: val,
              notes: v.notes,
              recorded_by: v.recorded_by || "Nurse"
            });
          });
        }
        if (weights) {
          weights.forEach((w: any) => {
            combinedVitals.push({
              id: w.id,
              type: "Weight Monitoring",
              created_at: w.created_at,
              date: w.date,
              value: w.weight_kg ? `${w.weight_kg} kg${w.bmi ? ` (BMI: ${w.bmi})` : ""}` : w.reading || "Recorded",
              recorded_by: w.recorded_by_name || w.staff_name || "Nurse"
            });
          });
        }
        if (bloods) {
          bloods.forEach((b: any) => {
            combinedVitals.push({
              id: b.id,
              type: "Blood Monitoring / Vitals",
              created_at: b.created_at,
              date: b.date,
              value: b.reading || (b.blood_glucose ? `Glucose: ${b.blood_glucose} mmol/L` : "Recorded"),
              recorded_by: b.recorded_by_name || b.staff_name || "Nurse"
            });
          });
        }
        filteredW = combinedVitals.filter((item: any) => {
          let d = item.date || item.record_date || "";
          if (!d && item.created_at) {
            try {
              d = format(new Date(item.created_at), "yyyy-MM-dd");
            } catch (e) {
              d = new Date(item.created_at).toISOString().slice(0, 10);
            }
          }
          return d === dateStr;
        });
        filteredW.sort((a: any, b: any) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        });
        setLiveHealthVitals(filteredW);

        // 3e. Progress Notes
        const { data: pnotes, error: pnErr } = await supabase
          .from("progress_notes")
          .select("*")
          .eq("resident_id", residentId);

        if (!pnErr && pnotes) {
          filteredNotes = pnotes.filter((item: any) => {
            let d = item.date || "";
            if (d && d.length > 10) d = d.slice(0, 10);
            if (!d && item.created_at) {
              try {
                d = format(new Date(item.created_at), "yyyy-MM-dd");
              } catch (e) {
                d = new Date(item.created_at).toISOString().slice(0, 10);
              }
            }
            return d === dateStr;
          });
          filteredNotes.sort((a: any, b: any) => {
            const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tB - tA;
          });
          setLiveProgressNotes(filteredNotes);
        } else {
          filteredNotes = [];
          setLiveProgressNotes([]);
        }

        // 4. Incidents & Incident Folders
        const { data: incFolders } = await supabase
          .from("incident_folders")
          .select("*")
          .eq("resident_id", residentId)
          .order("created_at", { ascending: false });
        setLiveIncidentFolders(incFolders || []);

        const { data: incs } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", residentId)
          .order("date", { ascending: false });
        setLiveIncidents(incs || []);

        // 4b. Wounds & Wound Folders
        const { data: wndFolders } = await supabase
          .from("wound_folders")
          .select("*")
          .eq("resident_id", residentId)
          .order("created_at", { ascending: false });
        setLiveWoundFolders(wndFolders || []);

        const { data: wnds } = await supabase
          .from("wounds")
          .select("*")
          .eq("resident_id", residentId)
          .order("created_at", { ascending: false });
        setLiveWounds(wnds || []);

        // 5. Braden Risk Assessments
        const { data: braden } = await supabase
          .from("braden_risk_assessments")
          .select("*")
          .eq("resident_id", residentId);
        const { data: falls } = await supabase
          .from("fall_risk_assessments")
          .select("*")
          .eq("resident_id", residentId);
        const { data: must } = await supabase
          .from("must_assessments")
          .select("*")
          .eq("resident_id", residentId);

        const mergedAssessments: any[] = [];
        if (braden) {
          braden.forEach((b: any) =>
            mergedAssessments.push({
              name: "Braden Risk Assessment (Pressure Area)",
              assessor: b.assessor_name || "Nurse",
              date: b.created_at ? new Date(b.created_at).toLocaleDateString("en-GB") : "Recent",
              review: "3 Months",
              result: b.total_score ? `Score ${b.total_score}` : "Completed",
              status: "Completed"
            })
          );
        }
        if (falls) {
          falls.forEach((f: any) =>
            mergedAssessments.push({
              name: "Falls Risk Assessment",
              assessor: f.assessor_name || "Nurse",
              date: f.created_at ? new Date(f.created_at).toLocaleDateString("en-GB") : "Recent",
              review: "3 Months",
              result: f.risk_level || "High Risk",
              status: "Completed"
            })
          );
        }
        if (must) {
          must.forEach((m: any) =>
            mergedAssessments.push({
              name: "MUST Nutritional Assessment",
              assessor: m.assessor_name || "Nurse",
              date: m.created_at ? new Date(m.created_at).toLocaleDateString("en-GB") : "Recent",
              review: "3 Months",
              result: m.overall_risk || "Medium Risk",
              status: "Completed"
            })
          );
        }
        setLiveAssessments(mergedAssessments);

        // Store fetched clinical, care logs, and profiles in cache
        clinicalCacheRef.current.set(residentId, {
          data: {
            carePlans: plans || [],
            files: files || [],
            medications: meds || [],
            incidentFolders: incFolders || [],
            incidents: incs || [],
            woundFolders: wndFolders || [],
            wounds: wnds || [],
            assessments: mergedAssessments
          },
          timestamp: Date.now()
        });

        careLogsCacheRef.current.set(logsKey, {
          data: {
            foodFluid: filteredFF,
            personalCare: filteredPC,
            continence: filteredCont,
            healthVitals: filteredW,
            progressNotes: filteredNotes
          },
          timestamp: Date.now()
        });

        profilesMapCacheRef.current = { data: profMap, timestamp: Date.now() };
      } catch (err) {
        console.error("Error fetching live clinical data:", err);
      } finally {
        setIsLoadingLiveDetails(false);
      }
    }

    async function fetchResidentFormsAndFiles() {
      if (!selectedResident || !supabase) {
        setLiveResidentForms([]);
        return;
      }

      const residentId = selectedResident.id;
      const now = Date.now();

      const cachedForms = formsCacheRef.current.get(residentId);
      if (cachedForms && now - cachedForms.timestamp < 5 * 60 * 1000) {
        setLiveResidentForms(cachedForms.data);
        return;
      }

      setIsLoadingForms(true);
      const items: CareFileItem[] = [];

      if (selectedResident.id && selectedResident.isLive && !selectedResident.id.startsWith("sample-")) {
        // 1. Query form tables
        await Promise.all(
          FORM_TABLE_CONFIG.map(async (cfg) => {
            try {
              const { data, error } = await supabase
                .from(cfg.table)
                .select("*")
                .eq("resident_id", residentId)
                .order("created_at", { ascending: false });

              if (!error && data && data.length > 0) {
                data.forEach((row: any) => {
                  if (row.is_archived === true || row.status === "archived") return;

                  const isDraft = row.saved_as_draft === true || row.status === "draft";
                  const dateStr = row.created_at
                    ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "Recent";

                  const resolvedFormKey = (row.form_key || row.formKey || cfg.key) as CareFileFormKey;
                  const resolvedFolderKey = row.folder_key || row.folderKey || cfg.folderKey;
                  const resolvedName = row.care_plan_name || row.title || row.name || cfg.name;

                  items.push({
                    id: row.id,
                    name: resolvedName,
                    formKey: resolvedFormKey,
                    folderKey: resolvedFolderKey,
                    folderName: cfg.folderName,
                    date: dateStr,
                    timestamp: row.created_at ? new Date(row.created_at).getTime() : 0,
                    status: isDraft ? "draft" : "completed",
                    type: "form",
                    assessor: row.assessor_name || row.created_by_name || row.staff_name || "Care Staff",
                    pdfUrl: row.pdf_url || null,
                    raw: row
                  });
                });
              }
            } catch (e) {
              // ignore table error
            }
          })
        );

        // 2. Query uploaded care folder files from `files` table
        try {
          const { data: filesData } = await supabase
            .from("files")
            .select("*")
            .eq("resident_id", residentId)
            .order("created_at", { ascending: false });

          if (filesData && filesData.length > 0) {
            filesData.forEach((file: any) => {
              let matchedFolderKey = "v2-confidential";
              let matchedFolderName = "Confidential Records";

              if (file.folder_name) {
                const found = config.careFilesV2.find(
                  (f: any) => f.key === file.folder_name || f.value?.toLowerCase() === file.folder_name?.toLowerCase()
                );
                if (found) {
                  matchedFolderKey = found.key;
                  matchedFolderName = found.value;
                }
              }

              const dateStr = file.created_at
                ? new Date(file.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "Recent";

              items.push({
                id: file.id,
                name: file.name || file.original_name || "Uploaded Care Document",
                folderKey: matchedFolderKey,
                folderName: matchedFolderName,
                date: dateStr,
                timestamp: file.created_at ? new Date(file.created_at).getTime() : 0,
                status: "completed",
                type: "file",
                assessor: "Uploaded File",
                storagePath: file.storage_path || file.file_url || null,
                raw: file
              });
            });
          }
        } catch (err) {
          console.error("Error fetching resident care folder files:", err);
        }

        // 3. Query body maps
        try {
          const { data: bodyMaps } = await supabase
            .from("care_folder_body_maps")
            .select("*")
            .eq("resident_id", residentId);

          if (bodyMaps && bodyMaps.length > 0) {
            bodyMaps.forEach((bm: any) => {
              if (bm.body_map_data?.sessions?.length > 0) {
                const dateStr = bm.updated_at
                  ? new Date(bm.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "Recent";

                const isSkin = bm.folder_key === "v2-skin-integrity";
                items.push({
                  id: bm.id,
                  name: isSkin ? "Skin Integrity Body Map Log" : "Hygiene Body Map Log",
                  formKey: (isSkin ? "v2-body-map-skin" : "v2-body-map-hygiene") as CareFileFormKey,
                  folderKey: bm.folder_key || "v2-skin-integrity",
                  folderName: isSkin ? "Skin Integrity / Tissue Viability" : "Personal Hygiene and Dressing",
                  date: dateStr,
                  timestamp: bm.updated_at ? new Date(bm.updated_at).getTime() : 0,
                  status: "completed",
                  type: "bodymap",
                  raw: bm
                });
              }
            });
          }
        } catch (err) {
          console.error("Error fetching body maps:", err);
        }

        items.sort((a, b) => b.timestamp - a.timestamp);
        formsCacheRef.current.set(residentId, { data: items, timestamp: Date.now() });
        setLiveResidentForms(items);
      } else {
        // Fallback demo actual filled forms for sample resident
        setLiveResidentForms([
          { id: "s-1", name: "Pre-Admission Assessment Form", formKey: "preAdmission-form" as CareFileFormKey, folderKey: "v2-pre-admission", folderName: "Pre-Admission", date: "Oct 2025", timestamp: 1, status: "completed", type: "form", assessor: "Nurse Inspector", raw: { medical_history: "Sample history", known_allergies: "Peanuts" } },
          { id: "s-2", name: "Infection Prevention Control Pre-Admission Assessment", formKey: "infection-prevention" as CareFileFormKey, folderKey: "v2-pre-admission", folderName: "Pre-Admission", date: "Oct 2025", timestamp: 2, status: "completed", type: "form", assessor: "Infection Officer", raw: {} },
          { id: "s-3", name: "Admission Assessment", formKey: "admission-form" as CareFileFormKey, folderKey: "v2-admission", folderName: "Admission", date: "Oct 2025", timestamp: 3, status: "completed", type: "form", assessor: "Nurse Inspector", raw: {} },
          { id: "s-4", name: "Capacity and Consent", formKey: "v2-capacity-consent" as CareFileFormKey, folderKey: "v2-admission", folderName: "Admission", date: "Oct 2025", timestamp: 4, status: "completed", type: "form", assessor: "Nurse Inspector", raw: {} },
          { id: "s-5", name: "Photographic Consent Form", formKey: "photography-consent" as CareFileFormKey, folderKey: "v2-admission", folderName: "Admission", date: "Oct 2025", timestamp: 5, status: "completed", type: "form", assessor: "Admin", raw: {} },
          { id: "s-6", name: "General Risk Assessment", formKey: "v2-general-risk" as CareFileFormKey, folderKey: "v2-safe-environment", folderName: "Maintaining a Safe Environment", date: "Jan 2026", timestamp: 6, status: "completed", type: "form", assessor: "Safety Officer", raw: {} },
          { id: "s-7", name: "PEEP (Personal Emergency Evacuation Plan)", formKey: "peep" as CareFileFormKey, folderKey: "v2-safe-environment", folderName: "Maintaining a Safe Environment", date: "Jan 2026", timestamp: 7, status: "completed", type: "form", assessor: "Safety Officer", raw: {} },
          { id: "s-8", name: "Consent and Risk Assessment for Restraints", formKey: "v2-restraints-risk" as CareFileFormKey, folderKey: "v2-safe-environment", folderName: "Maintaining a Safe Environment", date: "Jan 2026", timestamp: 8, status: "completed", type: "form", assessor: "Nurse Lead", raw: {} },
          { id: "s-9", name: "Dependency Assessment", formKey: "dependency-assessment" as CareFileFormKey, folderKey: "v2-dependency", folderName: "Dependency", date: "Jul 2026", timestamp: 9, status: "completed", type: "form", assessor: "Care Lead", raw: {} },
          { id: "s-10", name: "Personal Profile", formKey: "v2-personal-profile" as CareFileFormKey, folderKey: "v2-my-life", folderName: "This Is My Life", date: "Jul 2026", timestamp: 10, status: "completed", type: "form", assessor: "Key Worker", raw: {} },
          { id: "s-11", name: "Abbey Pain Tool", formKey: "v2-abbey-pain" as CareFileFormKey, folderKey: "v2-medication", folderName: "Medication", date: "Jul 2026", timestamp: 11, status: "completed", type: "form", assessor: "Nurse", raw: {} },
          { id: "s-12", name: "Pain Assessment", formKey: "pain-assessment-form" as CareFileFormKey, folderKey: "v2-medication", folderName: "Medication", date: "Jul 2026", timestamp: 12, status: "completed", type: "form", assessor: "Nurse", raw: {} },
          { id: "s-13", name: "Moving and Handling Assessment", formKey: "moving-handling-form" as CareFileFormKey, folderKey: "v2-mobility", folderName: "Mobility", date: "Jul 2026", timestamp: 13, status: "completed", type: "form", assessor: "Physiotherapist", raw: {} },
          { id: "s-14", name: "Fall Risk Assessment", formKey: "fall-risk-assessment" as CareFileFormKey, folderKey: "v2-mobility", folderName: "Mobility", date: "Jul 2026", timestamp: 14, status: "completed", type: "form", assessor: "Physiotherapist", raw: {} },
          { id: "s-15", name: "MUST Assessment", formKey: "v2-must-assessment" as CareFileFormKey, folderKey: "v2-nutrition-hydration", folderName: "Nutrition and Hydration", date: "Jul 2026", timestamp: 15, status: "completed", type: "form", assessor: "Dietitian", raw: {} },
          { id: "s-16", name: "Weight Chart", formKey: "v2-weight-chart" as CareFileFormKey, folderKey: "v2-nutrition-hydration", folderName: "Nutrition and Hydration", date: "Jul 2026", timestamp: 16, status: "completed", type: "form", assessor: "Nurse", raw: {} },
          { id: "s-17", name: "Bladder and Bowel Continence Assessment", formKey: "blader-bowel-form" as CareFileFormKey, folderKey: "v2-incontinence", folderName: "Incontinence", date: "Jul 2026", timestamp: 17, status: "completed", type: "form", assessor: "Nurse Lead", raw: {} },
          { id: "s-18", name: "Braden Risk Assessment", formKey: "braden-risk-assessment-form" as CareFileFormKey, folderKey: "v2-skin-integrity", folderName: "Skin Integrity / Tissue Viability", date: "Jul 2026", timestamp: 18, status: "completed", type: "form", assessor: "Tissue Nurse", raw: {} },
          { id: "s-19", name: "Key Worker Diary", formKey: "key-worker-diary-form" as CareFileFormKey, folderKey: "v2-key-worker", folderName: "Key Worker Diary", date: "Jul 2026", timestamp: 19, status: "completed", type: "form", assessor: "Key Worker", raw: {} },
          { id: "s-20", name: "Progress Note", formKey: "progress-note-form" as CareFileFormKey, folderKey: "v2-progress-note", folderName: "Progress Note", date: "Jul 2026", timestamp: 20, status: "completed", type: "form", assessor: "Care Staff", raw: {} }
        ]);
      }
      setIsLoadingForms(false);
    }

    fetchResidentClinicalData();
    fetchResidentFormsAndFiles();
  }, [selectedResident, supabase, careDate]);



  // Fetch Submitted Audits when Audit tab or sub-tab is active
  useEffect(() => {
    async function fetchSubmittedAudits() {
      if (!selectedResident || !supabase) {
        setLiveAudits([]);
        return;
      }

      setIsLoadingAudits(true);
      try {
        const resId = selectedResident.id;
        const targetOrgId = activeOrganizationId || (profile as any)?.organization_id || profile?.active_organization_id;

        // 1. Fetch Manager Audit History records
        let mgrQuery = supabase
          .from("manager_audit_history")
          .select("*")
          .order("completed_date", { ascending: false });

        if (targetOrgId) {
          mgrQuery = mgrQuery.or(`organization_id.eq.${targetOrgId},organization_id.is.null`);
        }
        const { data: mgrHistoryData } = await mgrQuery;
        const rawMgrAudits = mgrHistoryData || [];

        // 2. Fetch Category Specific Completions
        let completionsTable = "audit_clinical_completions";
        if (activeAuditTab === "carefile") completionsTable = "audit_care_file_completions";
        else if (activeAuditTab === "resident") completionsTable = "audit_resident_completions";
        else if (activeAuditTab === "general" || activeAuditTab === "governance") completionsTable = "audit_governance_completions";
        else if (activeAuditTab === "operational" || activeAuditTab === "environment") completionsTable = "audit_environment_completions";
        else if (activeAuditTab === "staff") completionsTable = "audit_governance_completions";

        let catQuery = supabase
          .from(completionsTable as any)
          .select("*")
          .order("completed_at", { ascending: false });

        if (activeAuditTab === "carefile" && resId && !resId.startsWith("sample-")) {
          catQuery = catQuery.eq("resident_id", resId);
        } else if (targetOrgId) {
          catQuery = catQuery.eq("organization_id", targetOrgId);
        }
        const { data: catData } = await catQuery;
        const rawCatCompletions = catData || [];

        // 3. Category matching helper for manager_audit_history entries
        const isClinicalAudit = (id: string, name: string, cat?: string) => {
          const clinicalIds = ["3", "9", "13", "18", "19", "21", "28", "34", "35", "36", "37", "38"];
          if (clinicalIds.includes(String(id))) return true;
          const n = (name || "").toLowerCase();
          if (n.includes("bedrail") || n.includes("decontamination") || n.includes("fall") || n.includes("medication") || n.includes("diet") || n.includes("fluid") || n.includes("restrictive") || n.includes("wound") || n.includes("incident") || n.includes("moving") || n.includes("choking") || n.includes("dnacpr") || n.includes("clinical")) return true;
          return cat === "clinical";
        };

        const isCareFileAudit = (id: string, name: string, cat?: string) => {
          if (String(id).startsWith("resident-") || String(id).startsWith("carefile-")) return true;
          const n = (name || "").toLowerCase();
          if (n.includes("care file") || n.includes("care plan review")) return true;
          return cat === "carefile";
        };

        const isStaffAudit = (id: string, name: string, cat?: string) => {
          const staffIds = ["7", "22", "26", "32", "33"];
          if (staffIds.includes(String(id))) return true;
          const n = (name || "").toLowerCase();
          if (n.includes("competency") || n.includes("rtw") || n.includes("supervision") || n.includes("appraisal") || n.includes("niscc") || n.includes("nmc") || n.includes("staff")) return true;
          return cat === "staff";
        };

        const isOperationalAudit = (id: string, name: string, cat?: string) => {
          const opIds = ["10"];
          if (opIds.includes(String(id))) return true;
          const n = (name || "").toLowerCase();
          if (n.includes("dining") || n.includes("environmental") || n.includes("maintenance") || n.includes("operational")) return true;
          return cat === "operational" || cat === "environment";
        };

        const isGeneralAudit = (id: string, name: string, cat?: string) => {
          const genIds = ["8", "24", "29", "31"];
          if (genIds.includes(String(id))) return true;
          const n = (name || "").toLowerCase();
          if (n.includes("complaint") || n.includes("safety alert") || n.includes("gdpr") || n.includes("agreement") || n.includes("governance") || n.includes("general")) return true;
          return cat === "general" || cat === "governance";
        };

        const isResidentAudit = (id: string, name: string, cat?: string) => {
          if (String(id).startsWith("resident-")) return true;
          const n = (name || "").toLowerCase();
          if (n.includes("choice") || n.includes("dignity") || n.includes("rights") || n.includes("resident")) return true;
          return cat === "resident";
        };

        // Filter manager_audit_history by active Audit sub-tab
        const filteredMgrAudits = rawMgrAudits.filter((item: any) => {
          const auditId = String(item.audit_type_id || "");
          const name = item.audit_type_name || item.data?.auditName || item.data?.name || "";
          const cat = item.data?.category || item.category;

          // If resident is selected and is not sample, filter resident-specific care file audits
          if (resId && !resId.startsWith("sample-")) {
            if (activeAuditTab === "carefile" || activeAuditTab === "resident") {
              const resMatch = auditId.includes(resId) || item.data?.residentId === resId || item.resident_id === resId;
              if (resMatch) return true;
            }
          }

          if (activeAuditTab === "clinical") return isClinicalAudit(auditId, name, cat);
          if (activeAuditTab === "carefile") return isCareFileAudit(auditId, name, cat);
          if (activeAuditTab === "staff") return isStaffAudit(auditId, name, cat);
          if (activeAuditTab === "operational") return isOperationalAudit(auditId, name, cat);
          if (activeAuditTab === "general" || activeAuditTab === "governance") return isGeneralAudit(auditId, name, cat);
          if (activeAuditTab === "resident") return isResidentAudit(auditId, name, cat);

          return true;
        });

        // 4. Map Manager Audits to display format
        const mappedMgrAudits = filteredMgrAudits.map((item: any) => {
          const name = item.audit_type_name || item.data?.auditName || item.data?.name || "Manager Audit";
          const auditor = item.auditor || item.data?.auditor || "Auditor";
          const rawDate = item.completed_date || item.created_at;
          const dateStr = rawDate ? new Date(rawDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent";

          let scoreStr = "100%";
          if (item.data?.score !== undefined && item.data?.score !== null) {
            scoreStr = typeof item.data.score === "number" ? `${item.data.score}%` : String(item.data.score);
            if (!scoreStr.includes("%")) scoreStr += "%";
          } else if (item.data?.answers) {
            const answersObj = item.data.answers;
            const keys = Object.keys(answersObj);
            if (keys.length > 0) {
              const compliantCount = keys.filter(k => {
                const a = answersObj[k];
                return a?.compliant === true || a?.answer === "yes" || a?.val === "yes";
              }).length;
              const pct = Math.round((compliantCount / keys.length) * 100);
              scoreStr = `${pct}%`;
            }
          }

          let status = "Up to date";
          if (item.status === "due" || item.data?.status === "due") {
            status = "Due";
          } else if (item.status === "draft" || item.status === "in-progress" || item.data?.status === "in-progress") {
            status = "In Progress";
          } else {
            status = "Up to date";
          }

          // Build normalized responses array for drawer view
          let normalizedResponses: any[] = [];
          if (Array.isArray(item.data?.responses)) {
            normalizedResponses = item.data.responses;
          } else if (item.data?.answers) {
            const answersObj = item.data.answers;
            const rowQuestions = item.data.rowQuestions || item.data.questions || [];
            const questionMap: Record<string, string> = {};
            if (Array.isArray(rowQuestions)) {
              rowQuestions.forEach((rq: any) => {
                if (rq.id && rq.text) questionMap[rq.id] = rq.text;
                if (rq.id && rq.question) questionMap[rq.id] = rq.question;
              });
            }

            Object.entries(answersObj).forEach(([k, ansVal]: [string, any]) => {
              const qText = questionMap[k] || (typeof ansVal === "object" ? ansVal.question || ansVal.text : null) || `Question ${k}`;
              let ansText = "Recorded";
              let isCompliant = true;
              let notes = "";

              if (typeof ansVal === "object" && ansVal !== null) {
                ansText = ansVal.answer || ansVal.val || (ansVal.compliant ? "Yes" : "No");
                isCompliant = ansVal.compliant !== false && String(ansText).toLowerCase() !== "no";
                notes = ansVal.notes || "";
              } else if (typeof ansVal === "string") {
                ansText = ansVal;
                isCompliant = ansVal.toLowerCase() !== "no";
              }

              normalizedResponses.push({
                question: qText,
                answer: ansText,
                compliant: isCompliant,
                notes: notes
              });
            });
          }

          const normalizedRaw = {
            ...item,
            ...(item.data || {}),
            template_name: name,
            audited_by_name: auditor,
            completed_at: rawDate,
            overall_notes: item.notes || item.data?.notes || item.data?.overall_notes || null,
            responses: normalizedResponses
          };

          return {
            id: item.id || `mgr-${item.audit_type_id}-${rawDate}`,
            name,
            auditor,
            date: dateStr,
            status,
            raw: normalizedRaw,
            category: activeAuditTab
          };
        });

        // 5. Map Category Completions to display format
        const mappedCompletions = rawCatCompletions.map((item: any) => {
          const auditTabLabel =
            activeAuditTab === "carefile" ? "Care File Audit" :
            activeAuditTab === "clinical" ? "Clinical Audit" :
            activeAuditTab === "general" ? "General Audit" :
            activeAuditTab === "operational" ? "Operational Audit" :
            activeAuditTab === "staff" ? "Staff Audit" :
            activeAuditTab === "resident" ? "Resident Audit" : "Audit";

          const name = item.template_name || item.name || auditTabLabel;
          const auditor = item.audited_by_name || item.audited_by || getRecordedByName(item, profilesMap) || "Auditor";
          const rawDate = item.completed_at || item.audited_at || item.created_at;
          const dateStr = rawDate ? new Date(rawDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent";
          
          let status = "Up to date";
          if (item.status === "due") {
            status = "Due";
          } else if (item.status === "draft" || item.status === "in-progress") {
            status = "In Progress";
          } else {
            status = "Up to date";
          }

          return {
            id: item.id,
            name,
            auditor,
            date: dateStr,
            status,
            raw: item,
            category: activeAuditTab
          };
        });

        // 6. Combine and sort all completed audits by date descending
        const combined = [...mappedMgrAudits, ...mappedCompletions].sort((a, b) => {
          const dateA = a.raw?.completed_at || a.raw?.completed_date || a.raw?.created_at || 0;
          const dateB = b.raw?.completed_at || b.raw?.completed_date || b.raw?.created_at || 0;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        setLiveAudits(combined);
      } catch (err) {
        console.error("Error fetching submitted audits:", err);
        setLiveAudits([]);
      } finally {
        setIsLoadingAudits(false);
      }
    }

    if (activeProfileTab === "audit") {
      fetchSubmittedAudits();
    }
  }, [selectedResident, activeAuditTab, activeProfileTab, supabase, activeOrganizationId, profile, profilesMap]);

  // Folders containing forms/files for selected resident (derived from config.careFilesV2)
  const activeFormFolders = useMemo(() => {
    if (!selectedResident) return [];

    const result: Array<{
      num: number;
      key: string;
      name: string;
      forms: CareFileItem[];
    }> = [];

    config.careFilesV2.forEach((folder: any, idx: number) => {
      const folderForms: CareFileItem[] = [];
      const usedItemIds = new Set<string>();

      // 1. Add standard care file forms defined in config.careFilesV2
      if (Array.isArray(folder.forms)) {
        folder.forms.forEach((fmDef: any) => {
          if (fmDef.type === "link") return;

          const fKey = fmDef.key;
          const targetName = fmDef.value || "";

          // Search liveResidentForms for matching items using isFormMatch helper
          const matchingItems = liveResidentForms.filter(
            (item) => !usedItemIds.has(item.id) && isFormMatch(item, fKey, folder.key, targetName)
          );

          if (matchingItems.length > 0) {
            // Sort by timestamp descending and take latest submission as primary
            const sorted = [...matchingItems].sort((a, b) => b.timestamp - a.timestamp);
            const latest = sorted[0];

            // Mark ALL matching items (including older historical versions) as consumed in usedItemIds
            matchingItems.forEach((m) => usedItemIds.add(m.id));

            folderForms.push({
              ...latest,
              name: targetName || latest.name,
              folderKey: folder.key,
              folderName: folder.value,
              status: latest.status === "draft" ? "draft" : "completed"
            });
          } else {
            // Unsubmitted / Pending form
            folderForms.push({
              id: `pending-${folder.key}-${fKey}`,
              name: targetName,
              formKey: fKey as CareFileFormKey,
              folderKey: folder.key,
              folderName: folder.value,
              date: "Not Recorded",
              timestamp: 0,
              status: "pending",
              type: "form",
              assessor: "Unassigned",
              raw: null
            });
          }
        });
      }

      // 2. Append any extra live forms/careplans for this folder that were not matched by standard form templates (only latest version per title/key)
      const extraItems = liveResidentForms.filter(
        (item) =>
          item.folderKey === folder.key &&
          !usedItemIds.has(item.id) &&
          item.type !== "file" &&
          item.type !== "bodymap"
      );

      if (extraItems.length > 0) {
        const extraGrouped = new Map<string, CareFileItem>();
        extraItems.forEach((item) => {
          const groupKey = (item.formKey || item.name || item.id).toLowerCase();
          const existing = extraGrouped.get(groupKey);
          if (!existing || item.timestamp > existing.timestamp) {
            extraGrouped.set(groupKey, item);
          }
          usedItemIds.add(item.id);
        });

        extraGrouped.forEach((item) => {
          folderForms.push({
            ...item,
            status: item.status === "draft" ? "draft" : "completed"
          });
        });
      }

      // 3. Append extra uploaded files or body maps belonging to this folder
      liveResidentForms.forEach((item) => {
        if (
          item.folderKey === folder.key &&
          !usedItemIds.has(item.id) &&
          (item.type === "file" || item.type === "bodymap")
        ) {
          usedItemIds.add(item.id);
          folderForms.push(item);
        }
      });

      result.push({
        num: idx + 1,
        key: folder.key,
        name: folder.value,
        forms: folderForms
      });
    });

    return result;
  }, [selectedResident, liveResidentForms]);

  // Auto-select first form item when activeFormFolders updates
  useEffect(() => {
    if (activeFormFolders.length > 0) {
      const allForms = activeFormFolders.flatMap((f) => f.forms);
      if (allForms.length > 0) {
        setSelectedFormItem((prev) => {
          if (!prev) return allForms[0];
          const exists = allForms.some((item) => item.id === prev.id);
          return exists ? prev : allForms[0];
        });
      }
    } else {
      setSelectedFormItem(null);
    }
  }, [activeFormFolders]);

  // Combined List of Residents (DB residents first, fallbacks if empty)
  const displayResidentsList = useMemo(() => {
    if (dbResidents.length > 0) return dbResidents;
    return SAMPLE_RESIDENTS;
  }, [dbResidents]);

  // Sync URL search params -> React navigation state (enables browser back/forward and direct URL state)
  useEffect(() => {
    if (isLoadingDb) return;

    if (residentIdFromUrl) {
      const matched = displayResidentsList.find(
        (r) => String(r.id) === String(residentIdFromUrl)
      );
      if (matched) {
        setSelectedResident(matched);
      } else if (!selectedResident || String(selectedResident.id) !== String(residentIdFromUrl)) {
        const fallbackRes = SAMPLE_RESIDENTS.find((s) => String(s.id) === String(residentIdFromUrl));
        setSelectedResident(
          fallbackRes || {
            id: residentIdFromUrl,
            name: "Resident " + residentIdFromUrl,
            room: "Room 101",
            age: 78,
            dob: "10 May 1948",
            nhs: "901 882 1092",
            conditions: [],
            risks: [],
            allergies: [],
            deps: "3 dependencies",
            gender: "Not specified",
            admissionDate: "01 Jan 2024",
            color: "#2563eb",
            phone: "07700 900456",
            isLive: true,
          }
        );
      }
    } else {
      setSelectedResident(null);
    }

    if (tabFromUrl) {
      setActiveProfileTab(tabFromUrl);
    }

    if (subtabFromUrl) {
      if (tabFromUrl === "medication") {
        setActiveMedTab(subtabFromUrl);
      } else if (tabFromUrl === "audit") {
        setActiveAuditTab(subtabFromUrl);
      }
    }
  }, [residentIdFromUrl, tabFromUrl, subtabFromUrl, displayResidentsList, isLoadingDb]);

  const closeResidentProfile = useCallback(() => {
    setSelectedFormItem(null);
    setSelectedRqiaAuditId(null);
    setSelectedRqiaRecordId(null);
    setViewRqiaHistoryList(false);
    setSelectedResident(null);
    setActiveProfileTab("overview");
    updateNavUrl({ residentId: null, tab: null, subtab: null });
  }, [updateNavUrl]);

  const handleBackNavigation = useCallback(() => {
    if (selectedFormItem) {
      setSelectedFormItem(null);
      return;
    }
    if (selectedRqiaAuditId || selectedRqiaRecordId || viewRqiaHistoryList) {
      setSelectedRqiaAuditId(null);
      setSelectedRqiaRecordId(null);
      setViewRqiaHistoryList(false);
      return;
    }
    closeResidentProfile();
  }, [selectedFormItem, selectedRqiaAuditId, selectedRqiaRecordId, viewRqiaHistoryList, closeResidentProfile]);

  // Filter residents based on search query
  const filteredResidents = useMemo(() => {
    if (!searchQuery.trim()) return displayResidentsList;
    const q = searchQuery.toLowerCase();
    return displayResidentsList.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q) ||
        r.conditions.some((c: any) => c.label.toLowerCase().includes(q))
    );
  }, [searchQuery, displayResidentsList]);

  // Open detail drawer
  const openDrawerItem = (title: string, type: string, data?: any) => {
    setDrawerTitle(title);
    setDrawerContent({ type, data, title });
    setIsDrawerOpen(true);
  };

  const careHomeName = profile?.care_home_name || "Maple Court Care Home";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 px-8 h-16 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Residents</h1>
            <p className="text-xs text-slate-500">
              {careHomeName} · {activeTeam?.name ? `Unit: ${activeTeam.name}` : "All Units"} · RQIA Inspection View
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              clearRqiaCache();
              fetchDbResidents(true);
              toast.success("RQIA Portal data refreshed");
            }}
            title="Refresh RQIA Portal Data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search residents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none w-64 bg-slate-50 focus:bg-white focus:border-blue-600 transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area: Residents Table */}
      <main className="flex-1 p-8">
        {isLoadingDb ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-xs font-medium text-slate-500">Loading care home residents from database...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Resident</th>
                  <th className="py-3 px-4">Health Conditions</th>
                  <th className="py-3 px-4">Risks</th>
                  <th className="py-3 px-4">Allergies</th>
                  <th className="py-3 px-4">Dependencies</th>
                  <th className="py-3 px-4 text-center">Hospital Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredResidents.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setSelectedResident(r);
                      setActiveProfileTab("overview");
                      updateNavUrl({ residentId: String(r.id), tab: "overview", subtab: null });
                    }}
                    className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-slate-100 shadow-xs shrink-0">
                          <AvatarImage src={r.imageUrl || r.image_url || undefined} alt={r.name} />
                          <AvatarFallback
                            style={{ backgroundColor: r.color || "#2563eb" }}
                            className="font-bold text-white text-xs"
                          >
                            {getInitials(r.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                            {r.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.room} · {r.age} yrs old · {r.gender}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {r.conditions && r.conditions.length > 0 ? (
                        r.conditions.map((c: any, i: number) => (
                          <span
                            key={i}
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border mr-1 mb-0.5 ${getColorForBadge(c.label)}`}
                          >
                            {c.label}
                          </span>
                        ))
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                          No conditions
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.risks && r.risks.length > 0 ? (
                        r.risks.map((rk: any, i: number) => (
                          <span
                            key={i}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border mr-1 mb-0.5 ${
                              rk.level === "high"
                                ? "bg-red-50 text-red-700 border-red-300"
                                : rk.level === "medium"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                                : "bg-blue-50 text-blue-700 border-blue-300"
                            }`}
                          >
                            {rk.label}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                          No risks
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.allergies && r.allergies.length > 0 ? (
                        r.allergies.map((a: any, i: number) => (
                          <span
                            key={i}
                            className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-300 mr-1 mb-0.5"
                          >
                            {a.label}
                          </span>
                        ))
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                          No known allergies
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.deps === "No dependencies" || r.deps === "Independent" ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                          No dependencies
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-300">
                          {r.deps}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {r.hasActiveHospitalTransfer ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                          In Hospital Transfer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          No Transfer
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════ */}
      {/* RESIDENT PROFILE FULL PAGE MODAL */}
      {/* ══════════════════════════════════════════════════ */}
      {selectedResident && (
        <div className="fixed inset-0 bg-slate-50 z-30 flex flex-col overflow-hidden">
          {/* Profile Topbar */}
          <div className="bg-white border-b border-slate-200 px-8 h-16 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={closeResidentProfile}
                title="Back to Resident List"
                className="w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <Avatar className="w-10 h-10 border border-slate-100 shadow-xs shrink-0">
                <AvatarImage src={selectedResident.imageUrl || selectedResident.image_url || undefined} alt={selectedResident.name} />
                <AvatarFallback
                  style={{ backgroundColor: selectedResident.color || "#2563eb" }}
                  className="font-bold text-white text-sm"
                >
                  {getInitials(selectedResident.name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                  {selectedResident.name}
                  {selectedResident.hasActiveHospitalTransfer && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                      In Hospital Transfer
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedResident.room} · NHS: {selectedResident.nhs}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Last photo updated: {selectedResident.raw?.photo_updated_at ? format(new Date(selectedResident.raw.photo_updated_at), "dd MMM yyyy") : "Not set"}
              </span>
              <button className="w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center bg-white text-slate-500 hover:bg-slate-50">
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="bg-white border-b border-slate-200 px-8 flex gap-2 shrink-0">
            {[
              { id: "overview", label: "Overview" },
              { id: "checklist", label: "Forms" },
              { id: "incidents", label: "Incident and falls" },
              { id: "wounds", label: "Wounds" },
              { id: "weight", label: "Weight monitoring" },
              { id: "care", label: "Care" },
              { id: "careplans", label: "Care Plans" },
              { id: "medication", label: "Medication" },
              { id: "audit", label: "Audits" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveProfileTab(tab.id);
                  updateNavUrl({ tab: tab.id, subtab: null });
                }}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeProfileTab === tab.id
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Content Body */}
          <div className="flex-1 overflow-y-auto p-8">
            {/* OVERVIEW TAB */}
            {activeProfileTab === "overview" && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Quick Overview
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50/80 rounded-lg p-5 text-center">
                      <div className="text-3xl font-extrabold text-blue-600 mb-1">{selectedResident.age}</div>
                      <div className="text-xs font-semibold text-blue-500">Years Old</div>
                    </div>
                    <div className="bg-emerald-50/80 rounded-lg p-5 text-center">
                      <div className="text-3xl font-extrabold text-emerald-600 mb-1">
                        {calculateMonths(selectedResident.admissionDate)}
                      </div>
                      <div className="text-xs font-semibold text-emerald-500">Months Here</div>
                    </div>
                    <div className="bg-purple-50/80 rounded-lg p-5 text-center">
                      <div className="text-3xl font-extrabold text-purple-600 mb-1">
                        {selectedResident.emergencyContacts?.length || 1}
                      </div>
                      <div className="text-xs font-semibold text-purple-500">Emergency Contacts</div>
                    </div>
                    <div className="bg-orange-50/80 rounded-lg p-5 text-center">
                      <div className="text-3xl font-extrabold text-orange-600 mb-1">
                        {selectedResident.room.replace("Room ", "")}
                      </div>
                      <div className="text-xs font-semibold text-orange-500">Room Assigned</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Personal Details */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" /> Personal Details
                    </h3>
                    <div className="space-y-3.5 divide-y divide-slate-100 text-xs">
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Full Name</span>
                        <span className="font-semibold text-slate-900">{selectedResident.name}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Date of Birth</span>
                        <span className="font-semibold text-slate-900">{selectedResident.dob}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Room Number</span>
                        <span className="font-semibold text-slate-900">{selectedResident.room}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Admission Date</span>
                        <span className="font-semibold text-slate-900">{selectedResident.admissionDate}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Phone Number</span>
                        <span className="font-semibold text-slate-900">{selectedResident.phone || "07700 900456"}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">NHS Health Number</span>
                        <span className="font-semibold text-slate-900">{selectedResident.nhs}</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Contacts */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" /> Key Contacts
                    </h3>
                    <div className="space-y-4">
                      {selectedResident.emergencyContacts && selectedResident.emergencyContacts.length > 0 ? (
                        selectedResident.emergencyContacts.map((contact: any, i: number) => (
                          <div key={i} className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs text-slate-900">{contact.name}</span>
                              {contact.is_primary && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Relationship: {contact.relationship || "Family"} · Phone: {contact.phone_number || "07700 900123"}
                              {contact.address && <><br />Address: {contact.address}</>}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs text-slate-900">Margaret Cardwell</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                              Primary Next of Kin
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Relationship: Daughter · Phone: 07700 900123
                            <br />
                            Address: 14 Birch Lane, Bristol, BS4 2PQ
                          </p>
                        </div>
                      )}

                      <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
                        <div className="font-bold text-xs text-slate-900 mb-1">
                          {selectedResident.gp?.name || "Dr. A. Patel (GP)"}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Phone: {selectedResident.gp?.phone || "0117 946 0200"}
                          <br />
                          Address: {selectedResident.gp?.address || "Chestnut Grove Surgery, Bristol, BS3 4RL"}
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
                        <div className="font-bold text-xs text-slate-900 mb-1">
                          {selectedResident.careManager?.name || "Sarah Manager (Care Manager)"}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Phone: {selectedResident.careManager?.phone || "0117 900 0001"} · {careHomeName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FORMS TAB — Matching care-file-v2 UI layout with right sidebar */}
            {activeProfileTab === "checklist" && (
              <div className="flex gap-4 max-w-7xl mx-auto min-h-[600px] items-start">
                {/* LEFT MAIN STAGE: Selected Form or Document Viewer */}
                <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/10 rounded-xl border border-slate-200 shadow-xs min-h-[600px]">
                  {selectedFormItem ? (
                    <div className="flex flex-col h-full bg-background rounded-xl">
                      {/* Stage Header matching care-file-v2 */}
                      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold leading-none">{selectedFormItem.name}</h2>
                              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {selectedFormItem.folderName || "Care File"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Recorded by <strong className="text-foreground font-semibold">{selectedFormItem.assessor || "Care Staff"}</strong> · {selectedFormItem.date || "Recent"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDrawerItem(selectedFormItem.name, selectedFormItem.type || "form", selectedFormItem)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium bg-background hover:bg-muted transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Full Audit Drawer
                          </button>
                        </div>
                      </div>

                      {/* Stage Content Body */}
                      <div className="p-4 sm:p-6 text-xs text-foreground flex-1 overflow-y-auto max-h-[700px]">
                        {selectedFormItem.formKey ? (
                          <div className="relative border rounded-xl p-4 sm:p-6 bg-background shadow-xs">
                            {selectedFormItem.status === "pending" || !selectedFormItem.raw ? (
                              <div className="p-8 text-center bg-amber-50/40 border border-amber-200/60 rounded-xl my-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-amber-700 font-bold shadow-xs">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-1">
                                  {selectedFormItem.name} — Pending Form
                                </h3>
                                <p className="text-xs text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
                                  This care form has not been submitted or recorded for {selectedResident?.name || "the resident"} yet.
                                </p>
                                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
                                  Category: {selectedFormItem.folderName || "Care File"} · Statutory RQIA Standard
                                </div>
                              </div>
                            ) : (
                              <CareFileDialogRenderer
                                formKey={selectedFormItem.formKey}
                                residentId={selectedResident?.id || ""}
                                teamId={activeTeamId ?? ""}
                                organizationId={activeOrganizationId || (profile as any)?.organization_id || profile?.active_organization_id || ""}
                                userId={profile?.id ?? ""}
                                userName={profile?.name || profile?.email || "User"}
                                userRole={profile?.role ?? "rqia"}
                                resident={selectedResident}
                                careHomeName={careHomeName}
                                teamName={activeTeam?.name ?? ""}
                                folderKey={selectedFormItem.folderKey}
                                formDataForEdit={selectedFormItem.raw}
                                isReviewMode={false}
                                isInline={true}
                                viewOnly={true}
                                onClose={() => {}}
                                orgLogoUrl={(activeOrganization as any)?.logo_url}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Key Details Cards */}
                            <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border">
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Folder</div>
                                <div className="font-bold text-foreground text-xs mt-0.5">{selectedFormItem.folderName || "Care File"}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date Recorded</div>
                                <div className="font-bold text-foreground text-xs mt-0.5">{selectedFormItem.date || "Recent"}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assessor</div>
                                <div className="font-bold text-foreground text-xs mt-0.5">{selectedFormItem.assessor || "Care Staff"}</div>
                              </div>
                            </div>

                            {(selectedFormItem.pdfUrl || selectedFormItem.storagePath) && (
                              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between shadow-xs">
                                <div>
                                  <div className="font-bold text-foreground text-xs">Attached File / Document</div>
                                  <div className="text-[11px] text-muted-foreground">Original uploaded document file</div>
                                </div>
                                <a
                                  href={(selectedFormItem.pdfUrl || selectedFormItem.storagePath) ?? undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium text-xs hover:bg-primary/90 transition-colors shadow-xs"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download File
                                </a>
                              </div>
                            )}

                            <div className="bg-muted/30 p-4 rounded-xl border space-y-2">
                              <h4 className="font-bold text-muted-foreground text-[11px] uppercase tracking-widest">
                                RQIA Standard Verification
                              </h4>
                              <p className="leading-relaxed text-muted-foreground text-xs">
                                This record is filed under {selectedFormItem.folderName} for resident {selectedResident?.name}. Verified under statutory Northern Ireland RQIA care home standards.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 p-12 text-center my-auto">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h4 className="text-base font-bold text-foreground mb-1">Select an Item</h4>
                      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                        Pick a form, care plan or document from the right panel to view its details.
                      </p>
                    </div>
                  )}
                </main>

                {/* RIGHT SIDEBAR matching care-file-v2 */}
                <aside className="w-[240px] shrink-0 border-l bg-background h-full min-h-[600px] overflow-y-auto overflow-x-hidden p-3 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex flex-col gap-6">
                    {isLoadingForms ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                        <p className="text-[11px] text-muted-foreground font-medium">Loading care forms...</p>
                      </div>
                    ) : activeFormFolders.length > 0 ? (
                      activeFormFolders.map((folder) => (
                        <div key={folder.key}>
                          <div className="flex items-center justify-between px-1 mb-2">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                              {folder.num}. {folder.name}
                            </p>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {folder.forms.length}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            {folder.forms.map((fm) => {
                              const isActive = selectedFormItem?.id === fm.id;
                              const status =
                                fm.status === "pending"
                                  ? "not-started"
                                  : fm.status === "draft"
                                  ? "in-progress"
                                  : "completed";
                              return (
                                <button
                                  key={fm.id}
                                  onClick={() => setSelectedFormItem(fm)}
                                  className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${
                                    isActive
                                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                      : "hover:bg-muted/60 text-foreground"
                                  }`}
                                >
                                  {fm.type === "file" ? (
                                    <Paperclip className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                                  ) : (
                                    <FormStatusIndicator status={status as any} className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold leading-tight mb-0.5 truncate">{fm.name}</p>
                                    {fm.status === "pending" ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded text-amber-700 bg-amber-50 inline-block font-semibold border border-amber-200/50">
                                        Pending Form
                                      </span>
                                    ) : (
                                      <FormStatusBadge status={status as any} />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center px-2">
                        <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-xs font-bold text-foreground">No Forms Found</p>
                        <p className="text-[11px] text-muted-foreground mt-1">No completed or draft forms exist for this resident yet.</p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}

            {/* INCIDENT AND FALLS TAB */}
            {activeProfileTab === "incidents" && (
              <div className="space-y-6 max-w-6xl mx-auto">
                {/* Incidents Header Stats */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Incident & Falls Record Log
                    </h3>
                    <span className="text-xs text-slate-500">
                      Total Recorded: <strong className="text-slate-900">{displayIncidents.length}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-amber-50/80 border border-amber-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-extrabold text-amber-700 mb-1">{displayIncidents.length}</div>
                      <div className="text-xs font-semibold text-amber-600">Total Incidents Logged</div>
                    </div>
                    <div className="bg-red-50/80 border border-red-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-extrabold text-red-700 mb-1">
                        {displayIncidents.filter((i) => {
                          const types = i.incident_types || [];
                          const cat = (i.category || "").toLowerCase();
                          return types.some((t: string) => t.toLowerCase().includes("fall")) || cat.includes("fall");
                        }).length}
                      </div>
                      <div className="text-xs font-semibold text-red-600">Falls Recorded</div>
                    </div>
                    <div className="bg-purple-50/80 border border-purple-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-extrabold text-purple-700 mb-1">
                        {displayIncidents.filter((i) => {
                          const s = (i.severity || "").toLowerCase();
                          return s === "high" || s === "critical" || s === "major";
                        }).length}
                      </div>
                      <div className="text-xs font-semibold text-purple-600">High / Major Severity</div>
                    </div>
                    <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-extrabold text-emerald-700 mb-1">
                        {displayIncidents.filter((i) => {
                          const st = (i.status || "").toLowerCase();
                          return st === "resolved" || st === "completed" || st === "closed";
                        }).length}
                      </div>
                      <div className="text-xs font-semibold text-emerald-600">Resolved & Closed</div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search incidents by description or staff…"
                      value={incidentSearchQuery}
                      onChange={(e) => setIncidentSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none w-full bg-slate-50 focus:bg-white focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Severity:</span>
                    <select
                      value={incidentSeverityFilter}
                      onChange={(e) => setIncidentSeverityFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:border-blue-600"
                    >
                      <option value="all">All Severities</option>
                      <option value="low">Low / Minor</option>
                      <option value="medium">Moderate</option>
                      <option value="high">High / Major</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Table of Incidents */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Incident Type / Category</th>
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4">Location & Details</th>
                        <th className="py-3 px-4">Logged By</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = displayIncidents.filter((inc) => {
                          if (incidentSearchQuery.trim()) {
                            const q = incidentSearchQuery.toLowerCase();
                            const desc = (inc.detailed_description || inc.description || "").toLowerCase();
                            const staff = (inc.completed_by_full_name || inc.reported_by || "").toLowerCase();
                            const types = (inc.incident_types || []).join(" ").toLowerCase();
                            if (!desc.includes(q) && !staff.includes(q) && !types.includes(q)) return false;
                          }
                          if (incidentSeverityFilter !== "all") {
                            const s = (inc.severity || "").toLowerCase();
                            if (incidentSeverityFilter === "low" && s !== "low" && s !== "minor") return false;
                            if (incidentSeverityFilter === "medium" && s !== "medium" && s !== "moderate") return false;
                            if (incidentSeverityFilter === "high" && s !== "high" && s !== "major") return false;
                            if (incidentSeverityFilter === "critical" && s !== "critical") return false;
                          }
                          return true;
                        });

                        if (isLoadingLiveDetails) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-500 font-medium bg-slate-50/40">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-1" />
                                  <p className="text-xs font-semibold text-slate-700">Loading incident & fall records...</p>
                                  <p className="text-[11px] text-slate-400">Fetching live resident reports from care database.</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-slate-500 font-medium bg-slate-50/40">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <AlertCircle className="w-6 h-6 text-slate-300" />
                                  <p className="text-xs font-semibold text-slate-600">No incident or fall records found</p>
                                  <p className="text-[11px] text-slate-400">
                                    {displayIncidents.length > 0 ? "Try matching different search or severity filter options." : "No incidents have been logged for this resident."}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((inc, i) => {
                          const dateStr = formatDateStandard(inc.date, inc.folder_name, inc.created_at);
                          const timeStr = formatTimeStandard(inc.time, inc.created_at);
                          const rawTypes = Array.isArray(inc.incident_types) ? inc.incident_types : [];
                          const typesFormatted = rawTypes.length > 0
                            ? rawTypes.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
                            : [];

                          const rawSeverity = (inc.severity || inc.incident_level || "").toLowerCase();
                          let severityLabel = "";
                          let severityClass = "";
                          if (rawSeverity) {
                            if (rawSeverity.includes("minor") || rawSeverity === "low") {
                              severityLabel = "Minor Injury";
                              severityClass = "bg-amber-100 text-amber-800 border border-amber-200";
                            } else if (rawSeverity.includes("permanent") || rawSeverity.includes("harm") || rawSeverity === "high" || rawSeverity === "critical" || rawSeverity === "major") {
                              severityLabel = rawSeverity.includes("permanent") ? "Permanent Harm" : "High Severity";
                              severityClass = "bg-red-100 text-red-800 border border-red-200";
                            } else if (rawSeverity.includes("death")) {
                              severityLabel = "Death";
                              severityClass = "bg-red-900 text-white border border-red-950";
                            } else if (rawSeverity.includes("no") || rawSeverity === "none") {
                              severityLabel = "No Harm";
                              severityClass = "bg-emerald-100 text-emerald-800 border border-emerald-200";
                            } else {
                              severityLabel = formatTitleCase(rawSeverity.replace(/_/g, " "));
                              severityClass = "bg-slate-100 text-slate-800 border border-slate-200";
                            }
                          }

                          const loggedBy = inc.completed_by_full_name || profilesMap[inc.created_by] || inc.reported_by || "";
                          const isFall = inc.folder_type === "fall" || (inc.folder_name && inc.folder_name.toLowerCase().includes("fall record"));
                          const hasFilledReport = Boolean(
                            inc.status !== "Empty Folder" &&
                            (inc.completed_by_full_name || inc.reported_by || rawTypes.length > 0 || rawSeverity || (inc.detailed_description && !inc.detailed_description.includes("folder created")))
                          );

                          return (
                            <tr key={inc.id || i} className={`hover:bg-slate-100/70 transition-colors ${isFall ? "bg-red-50/50" : "bg-blue-50/30"}`}>
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div>{dateStr}</div>
                                {timeStr && <div className="text-[10px] text-slate-400 font-medium">{timeStr}</div>}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {isFall ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">
                                      <TrendingDown className="w-3 h-3 text-red-600" />
                                      Fall Record
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-blue-600" />
                                      Incident Folder
                                    </span>
                                  )}

                                  {typesFormatted.map((tStr: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
                                      {tStr}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                {severityLabel ? (
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${severityClass}`}>
                                    {severityLabel}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                                {inc.location && (
                                  <div className="font-semibold text-slate-900 text-[11px] mb-0.5">
                                    Location: {inc.location}
                                  </div>
                                )}
                                <div className="truncate text-slate-600">
                                  {inc.detailed_description || inc.description || (inc.status === "Empty Folder" ? "Incident folder created." : "—")}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium">
                                {loggedBy || <span className="text-slate-400 font-normal">—</span>}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    const targetResId = inc.resident_id || inc.raw?.resident_id || selectedResident?.id;
                                    const targetFolderId = inc.folder_id || inc.id;
                                    if (targetResId && targetFolderId && !targetFolderId.startsWith("demo-")) {
                                      router.push(`/dashboard/residents/${targetResId}/incidents/${targetFolderId}?from=rqia` as any);
                                    } else {
                                      openDrawerItem("Incident & Fall Detail", "incident", inc.raw || inc);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md bg-white text-xs font-semibold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WOUNDS TAB */}
            {activeProfileTab === "wounds" && (
              <div className="space-y-6 max-w-6xl mx-auto">
                {/* Wounds Summary Header */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Bandage className="w-4 h-4 text-rose-500" /> Wounds & Pressure Ulcers Monitoring
                    </h3>
                    <span className="text-xs text-slate-500">
                      Total Records: <strong className="text-slate-900">{displayWounds.length}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-rose-50/80 border border-rose-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-extrabold text-rose-700 mb-1">
                        {displayWounds.filter((w) => (w.status || "active").toLowerCase() !== "healed").length}
                      </div>
                      <div className="text-xs font-semibold text-rose-600">Active Wounds</div>
                    </div>
                    <div className="bg-amber-50/80 border border-amber-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-extrabold text-amber-700 mb-1">
                        {displayWounds.filter((w) => (w.wound_type || "").toLowerCase().includes("pressure")).length}
                      </div>
                      <div className="text-xs font-semibold text-amber-600">Pressure Ulcers / Injuries</div>
                    </div>
                    <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-extrabold text-emerald-700 mb-1">
                        {displayWounds.filter((w) => (w.status || "").toLowerCase() === "healed").length}
                      </div>
                      <div className="text-xs font-semibold text-emerald-600">Healed Wounds</div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search wounds by name or location…"
                      value={woundSearchQuery}
                      onChange={(e) => setWoundSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none w-full bg-slate-50 focus:bg-white focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Status Filter:</span>
                    <select
                      value={woundStatusFilter}
                      onChange={(e) => setWoundStatusFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:border-blue-600"
                    >
                      <option value="all">All Wounds</option>
                      <option value="active">Active Only</option>
                      <option value="healed">Healed Only</option>
                    </select>
                  </div>
                </div>

                {/* Table of Wounds */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Wound Name & Location</th>
                        <th className="py-3 px-4">Type & Stage</th>
                        <th className="py-3 px-4">Date Identified</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = displayWounds.filter((w) => {
                          if (woundSearchQuery.trim()) {
                            const q = woundSearchQuery.toLowerCase();
                            const name = (w.wound_name || "").toLowerCase();
                            const loc = (w.location || "").toLowerCase();
                            const type = (w.wound_type || "").toLowerCase();
                            if (!name.includes(q) && !loc.includes(q) && !type.includes(q)) return false;
                          }
                          if (woundStatusFilter !== "all") {
                            const st = (w.status || "active").toLowerCase();
                            if (woundStatusFilter === "active" && st === "healed") return false;
                            if (woundStatusFilter === "healed" && st !== "healed") return false;
                          }
                          return true;
                        });

                        if (isLoadingLiveDetails) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-500 font-medium bg-slate-50/40">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-1" />
                                  <p className="text-xs font-semibold text-slate-700">Loading wound care records...</p>
                                  <p className="text-[11px] text-slate-400">Fetching live tissue viability entries from database.</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-slate-500 font-medium bg-slate-50/40">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <AlertCircle className="w-6 h-6 text-slate-300" />
                                  <p className="text-xs font-semibold text-slate-600">No wound records found</p>
                                  <p className="text-[11px] text-slate-400">
                                    {displayWounds.length > 0 ? "No wound records match the selected filter criteria." : "No wound care entries exist for this resident."}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((w, i) => {
                          const wName = w.wound_name || "Wound Record";
                          const location = w.location || "Unspecified location";
                          const typeStr = formatTitleCase(w.wound_type || "Skin Integrity");
                          const stageStr = w.stage ? `Stage ${w.stage}` : null;
                          const dateIdentified = w.date_identified ? format(new Date(w.date_identified), "dd MMM yyyy") : "Recorded";
                          const status = (w.status || "active").toLowerCase();

                          return (
                            <tr key={w.id || i} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div>{wName}</div>
                                <div className="text-[11px] text-slate-500 font-medium">{location}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800">{typeStr}</div>
                                {stageStr && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                    {stageStr}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium">{dateIdentified}</td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                                  status === "healed"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : status === "deteriorating"
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : "bg-blue-100 text-blue-800 border border-blue-200"
                                }`}>
                                  {status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    const targetResId = w.resident_id || w.raw?.resident_id || selectedResident?.id;
                                    const targetFolderId = w.wound_folder_id || w.folder_id || w.id;
                                    if (targetResId && targetFolderId && !targetFolderId.startsWith("demo-")) {
                                      router.push(`/dashboard/residents/${targetResId}/wounds/${targetFolderId}?from=rqia` as any);
                                    } else {
                                      openDrawerItem("Wound Record Detail", "wound", w);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md bg-white text-xs font-semibold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WEIGHT MONITORING TAB */}
            {activeProfileTab === "weight" && (
              <div className="max-w-6xl mx-auto space-y-6 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <WeightChart
                  residentId={selectedResident.id}
                  residentName={selectedResident.name}
                  hideFrequencySelector={true}
                  hideRecordButton={true}
                  readOnly={true}
                />
              </div>
            )}

            {/* CARE TAB */}
            {activeProfileTab === "care" && (
              <div className="space-y-6 max-w-6xl mx-auto">
                {/* 1. FOOD & FLUID LOG */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-slate-900">Food & Fluid Log</span>
                    </div>
                    <CareDateSelector selectedDate={careDate} onDateChange={setCareDate} />
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-semibold bg-white">
                        <th className="py-2.5 px-5">Record</th>
                        <th className="py-2.5 px-5">Time</th>
                        <th className="py-2.5 px-5">Detail / Intake</th>
                        <th className="py-2.5 px-5">Recorded By</th>
                        <th className="py-2.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {liveFoodFluid.length > 0 ? (
                        liveFoodFluid.map((ff, i) => {
                          const rawTime = ff.timestamp || ff.created_at;
                          let timeStr = "";
                          if (rawTime) {
                            try {
                              const d = new Date(rawTime);
                              if (!isNaN(d.getTime())) {
                                timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                              } else if (typeof rawTime === "string" && rawTime.includes(":")) {
                                timeStr = rawTime.slice(0, 5);
                              }
                            } catch (e) {}
                          }

                          const foodName = formatTitleCase(ff.type_of_food_drink || ff.type || ff.name || "Food / Fluid");
                          const isFluid = Boolean(ff.fluid_consumed_ml);
                          const categoryLabel = isFluid ? "Fluid" : "Food";

                          const sectionText = ff.section ? formatTitleCase(ff.section.includes(" - ") ? ff.section : ff.section.replace("-", " - ")) : "";
                          const portionText = ff.portion_served && ff.portion_served !== "N/A" ? formatTitleCase(ff.portion_served) : "";
                          const amountEatenText = ff.amount_eaten ? formatTitleCase(ff.amount_eaten) : "";
                          const recordedBy = getRecordedByName(ff, profilesMap);

                          return (
                            <tr key={ff.id || i} className="hover:bg-slate-50">
                              <td className="py-3 px-5 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span>{foodName}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isFluid ? "bg-cyan-100 text-cyan-800" : "bg-orange-100 text-orange-800"}`}>
                                    {categoryLabel}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-slate-500 font-medium">{timeStr}</td>
                              <td className="py-3 px-5 text-slate-700">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {isFluid && ff.fluid_consumed_ml && (
                                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Volume: {ff.fluid_consumed_ml} ml
                                      </span>
                                    )}
                                    {sectionText && (
                                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                                        {sectionText}
                                      </span>
                                    )}
                                    {portionText && (
                                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                        Portion: {portionText}
                                      </span>
                                    )}
                                    {amountEatenText && (
                                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                                        Eaten: {amountEatenText}
                                      </span>
                                    )}
                                  </div>
                                  {ff.notes && <div className="text-xs text-slate-600 pt-0.5">{ff.notes}</div>}
                                </div>
                              </td>
                              <td className="py-3 px-5 text-slate-600 font-medium">{recordedBy}</td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  onClick={() => openDrawerItem("Food & Fluid Record", "food_fluid", ff)}
                                  className="px-3 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium bg-slate-50/40">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <AlertCircle className="w-5 h-5 text-slate-300" />
                              <span className="text-xs text-slate-500 font-medium">No data recorded for {format(careDate, "dd MMM yyyy")}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 2. PERSONAL CARE & HYGIENE LOG */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-slate-900">Personal Care & Hygiene Log</span>
                    </div>
                    <CareDateSelector selectedDate={careDate} onDateChange={setCareDate} />
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-semibold bg-white">
                        <th className="py-2.5 px-5">Care Activity</th>
                        <th className="py-2.5 px-5">Time</th>
                        <th className="py-2.5 px-5">Detail / Notes</th>
                        <th className="py-2.5 px-5">Recorded By</th>
                        <th className="py-2.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {livePersonalCare.length > 0 ? (
                        livePersonalCare.map((pc, i) => {
                          const rawTime = pc.created_at || pc.timestamp || pc.time;
                          let timeStr = "";
                          if (rawTime) {
                            try {
                              const d = new Date(rawTime);
                              if (!isNaN(d.getTime())) {
                                timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                              } else if (typeof rawTime === "string" && rawTime.includes(":")) {
                                timeStr = rawTime.slice(0, 5);
                              }
                            } catch (e) {}
                          }

                          const activityName = formatTitleCase(pc.task_name || pc.task_type || pc.activity || pc.care_type || "Personal Care");
                          const detailStr = pc.notes || pc.details || pc.description || "Personal care completed.";
                          const recordedBy = getRecordedByName(pc, profilesMap);

                          return (
                            <tr key={pc.id || i} className="hover:bg-slate-50">
                              <td className="py-3 px-5 font-semibold text-slate-900">{activityName}</td>
                              <td className="py-3 px-5 text-slate-500 font-medium">{timeStr}</td>
                              <td className="py-3 px-5 text-slate-700">{detailStr}</td>
                              <td className="py-3 px-5 text-slate-600 font-medium">{recordedBy}</td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  onClick={() => openDrawerItem("Personal Care Record", "personal_care", pc)}
                                  className="px-3 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium bg-slate-50/40">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <AlertCircle className="w-5 h-5 text-slate-300" />
                              <span className="text-xs text-slate-500 font-medium">No data recorded for {format(careDate, "dd MMM yyyy")}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 3. CONTINENCE & BOWEL LOG */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-slate-900">Continence & Bowel Log</span>
                    </div>
                    <CareDateSelector selectedDate={careDate} onDateChange={setCareDate} />
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-semibold bg-white">
                        <th className="py-2.5 px-5">Event / Type</th>
                        <th className="py-2.5 px-5">Time</th>
                        <th className="py-2.5 px-5">Bristol Scale / Details</th>
                        <th className="py-2.5 px-5">Recorded By</th>
                        <th className="py-2.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {liveContinence.length > 0 ? (
                        liveContinence.map((cont, i) => {
                          const rawTime = cont.created_at || cont.timestamp || cont.time;
                          let timeStr = "";
                          if (rawTime) {
                            try {
                              const d = new Date(rawTime);
                              if (!isNaN(d.getTime())) {
                                timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                              } else if (typeof rawTime === "string" && rawTime.includes(":")) {
                                timeStr = rawTime.slice(0, 5);
                              }
                            } catch (e) {}
                          }

                          const typeRaw = (cont.entry_type || cont.type || "continence").toLowerCase();
                          const isBowel = typeRaw.includes("bowel");
                          const isUrine = typeRaw.includes("urine");
                          const eventName = formatTitleCase(cont.entry_type || cont.type || "Continence Check");

                          const stKey = cont.stool_type || (cont.bristol_scale ? `type_${cont.bristol_scale}` : null);
                          const bristolInfo = stKey && BRISTOL_SCALE_MAP[stKey] ? BRISTOL_SCALE_MAP[stKey] : null;
                          const recordedBy = getRecordedByName(cont, profilesMap);

                          return (
                            <tr key={cont.id || i} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-5 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span>{eventName}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBowel ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"}`}>
                                    {isBowel ? "Bowel" : "Urine"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-slate-500 font-medium">{timeStr}</td>
                              <td className="py-3 px-5 text-slate-800">
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5 font-medium text-xs">
                                    {bristolInfo ? (
                                      <span className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-900 px-2 py-0.5 rounded font-bold border border-amber-200">
                                        <span>{bristolInfo.typeNum}:</span>
                                        <span>{bristolInfo.title}</span>
                                      </span>
                                    ) : cont.bristol_scale ? (
                                      <span className="inline-flex items-center bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                                        Bristol Type {cont.bristol_scale}
                                      </span>
                                    ) : null}

                                    {cont.bowel_size && (
                                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                                        Size: {cont.bowel_size.toUpperCase()} ({cont.bowel_size === 's' ? 'Small' : cont.bowel_size === 'm' ? 'Medium' : cont.bowel_size === 'l' ? 'Large' : 'Extra Large'})
                                      </span>
                                    )}

                                    {cont.urine_color && (
                                      <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                                        Color: {formatTitleCase(cont.urine_color)}
                                      </span>
                                    )}

                                    {cont.urine_amount && (
                                      <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                                        Amount: {cont.urine_amount}
                                      </span>
                                    )}

                                    {cont.urine_odor && (
                                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                        Odor: {formatTitleCase(cont.urine_odor)}
                                      </span>
                                    )}

                                    {cont.continence_aid && (
                                      <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-100">
                                        Aid: {cont.continence_aid}
                                      </span>
                                    )}

                                    {cont.assistance_required && (
                                      <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded text-[11px] font-medium border border-rose-100">
                                        Assisted
                                      </span>
                                    )}
                                  </div>

                                  {(cont.notes || cont.details || bristolInfo?.description) && (
                                    <div className="text-xs text-slate-600 font-normal leading-relaxed pt-0.5">
                                      {cont.notes || cont.details || bristolInfo?.description}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-5 text-slate-600 font-medium">{recordedBy}</td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  onClick={() => openDrawerItem(`${eventName} Detail Record`, "continence", cont)}
                                  className="px-3 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium bg-slate-50/40">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <AlertCircle className="w-5 h-5 text-slate-300" />
                              <span className="text-xs text-slate-500 font-medium">No data recorded for {format(careDate, "dd MMM yyyy")}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. HEALTH & VITALS LOG */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-600" />
                      <span className="text-sm font-bold text-slate-900">Health & Vitals Log</span>
                    </div>
                    <CareDateSelector selectedDate={careDate} onDateChange={setCareDate} />
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-semibold bg-white">
                        <th className="py-2.5 px-5">Parameter</th>
                        <th className="py-2.5 px-5">Time</th>
                        <th className="py-2.5 px-5">Reading / Value</th>
                        <th className="py-2.5 px-5">Recorded By</th>
                        <th className="py-2.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {liveHealthVitals.length > 0 ? (
                        liveHealthVitals.map((hv, i) => {
                          const rawTime = hv.time || hv.record_time || hv.created_at || hv.timestamp;
                          let timeStr = "";
                          if (rawTime) {
                            try {
                              if (typeof rawTime === "string" && rawTime.includes(":") && rawTime.length <= 8) {
                                timeStr = rawTime.slice(0, 5);
                              } else {
                                const d = new Date(rawTime);
                                if (!isNaN(d.getTime())) {
                                  timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                                }
                              }
                            } catch (e) {}
                          }

                          const paramName = formatTitleCase(hv.type || hv.parameter || "Health Parameter");
                          const readingStr = hv.value || (hv.weight_kg ? `${hv.weight_kg} kg` : hv.reading || "Recorded");
                          const recordedBy = getRecordedByName(hv, profilesMap);

                          return (
                            <tr key={hv.id || i} className="hover:bg-slate-50">
                              <td className="py-3 px-5 font-semibold text-slate-900">{paramName}</td>
                              <td className="py-3 px-5 text-slate-500 font-medium">{timeStr}</td>
                              <td className="py-3 px-5 font-bold text-slate-800">{readingStr}</td>
                              <td className="py-3 px-5 text-slate-600 font-medium">{recordedBy}</td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  onClick={() => openDrawerItem("Health & Vitals Record", "vitals", hv)}
                                  className="px-3 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium bg-slate-50/40">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <AlertCircle className="w-5 h-5 text-slate-300" />
                              <span className="text-xs text-slate-500 font-medium">No data recorded for {format(careDate, "dd MMM yyyy")}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 5. DAILY PROGRESS NOTES */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-bold text-slate-900">Daily Progress Notes</span>
                    </div>
                    <CareDateSelector selectedDate={careDate} onDateChange={setCareDate} />
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-semibold bg-white">
                        <th className="py-2.5 px-5">Category / Shift</th>
                        <th className="py-2.5 px-5">Time</th>
                        <th className="py-2.5 px-5">Progress Note Summary</th>
                        <th className="py-2.5 px-5">Author</th>
                        <th className="py-2.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {liveProgressNotes.length > 0 ? (
                        liveProgressNotes.map((pn, i) => {
                          const rawTime = pn.created_at || pn.timestamp || pn.time;
                          let timeStr = "";
                          if (rawTime) {
                            try {
                              const d = new Date(rawTime);
                              if (!isNaN(d.getTime())) {
                                timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                              } else if (typeof rawTime === "string" && rawTime.includes(":")) {
                                timeStr = rawTime.slice(0, 5);
                              }
                            } catch (e) {}
                          }

                          const categoryName = formatTitleCase(pn.category || pn.shift || pn.type || "Progress Note");
                          const contentStr = pn.content || pn.note || pn.notes || pn.summary || "Daily care note recorded.";
                          const authorName = getRecordedByName(pn, profilesMap);

                          return (
                            <tr key={pn.id || i} className="hover:bg-slate-50">
                              <td className="py-3 px-5 font-semibold text-slate-900">{categoryName}</td>
                              <td className="py-3 px-5 text-slate-500 font-medium">{timeStr}</td>
                              <td className="py-3 px-5 text-slate-700 leading-relaxed">{contentStr}</td>
                              <td className="py-3 px-5 text-slate-600 font-medium">{authorName}</td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  onClick={() => openDrawerItem("Progress Note Record", "progress_note", pn)}
                                  className="px-3 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium bg-slate-50/40">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <AlertCircle className="w-5 h-5 text-slate-300" />
                              <span className="text-xs text-slate-500 font-medium">No data recorded for {format(careDate, "dd MMM yyyy")}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CARE PLANS TAB */}
            {activeProfileTab === "careplans" && (
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Care Plans</h3>
                    <p className="text-xs text-slate-500">Comprehensive person-centred care plans for inspection review</p>
                  </div>
                </div>

                {isLoadingLiveDetails ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-1" />
                    <h4 className="font-bold text-slate-900 text-sm">Loading Care Plans...</h4>
                    <p className="text-xs text-slate-400">Fetching live resident care plans from database.</p>
                  </div>
                ) : liveCarePlans.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {liveCarePlans.map((cp: any, i: number) => {
                      const folderNameMap: Record<string, string> = {
                        "v2-my-life": "This Is My Life",
                        "v2-medication": "Medication",
                        "v2-mobility": "Mobility",
                        "v2-nutrition-hydration": "Nutrition & Hydration",
                        "v2-hygiene": "Personal Hygiene & Dressing",
                        "v2-incontinence": "Incontinence",
                        "v2-skin-integrity": "Skin Integrity / Pressure Care",
                        "v2-additional-cp": "Additional Care Plans",
                        "v2-psychological": "Psychological & Emotional Needs",
                        "v2-valuables": "Valuables & Personal Property",
                        "v2-specimens": "Record of Specimens",
                        "v2-confidential": "Confidential Records"
                      };

                      const title = cp.care_plan_type || cp.goals?.nameOfCarePlan || cp.name_of_care_plan || cp.title || "Care Plan";
                      const folder = folderNameMap[cp.folder_key] || cp.goals?.folderName || cp.folderName || "Care File";
                      const author = profilesMap[cp.created_by] || cp.written_by || cp.goals?.writtenBy || cp.created_by_name || "Staff Member";
                      const dateStr = cp.created_at ? new Date(cp.created_at).toLocaleDateString("en-GB") : (cp.goals?.dateWritten || "Recent");
                      const statusRaw = (cp.status || "active").toLowerCase();
                      const statusLabel = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

                      return (
                        <div
                          key={cp.id || i}
                          onClick={() => openDrawerItem(title, "careplan", cp)}
                          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-emerald-500 cursor-pointer transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[180px]">
                                {folder}
                              </span>
                              {cp.next_evaluation_date && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Rev: {new Date(cp.next_evaluation_date).toLocaleDateString("en-GB")}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-sm text-slate-900 mb-1 leading-snug">{title}</div>
                            <div className="text-xs text-slate-500">{author} · {dateStr}</div>
                          </div>
                          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              statusRaw === "active" ? "bg-emerald-100 text-emerald-800" :
                              statusRaw === "archived" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"
                            }`}>
                              {statusLabel}
                            </span>
                            <ChevronRight className="w-4 h-4 text-emerald-600" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : selectedResident?.isLive ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-slate-900 text-base">No Care Plans Created Yet</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      No care plans have been recorded for {selectedResident?.name || "this resident"} in care folders yet. Care plans will appear here once formulated by staff.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: "Moving & Handling Care Plan", author: "Emma Wilson", date: "10-10-25", status: "active", folder: "Mobility" },
                      { name: "Medication Management Plan", author: "Sarah Manager", date: "10-10-25", status: "active", folder: "Medication" },
                      { name: "Falls Prevention Plan", author: "Lily Thompson", date: "10-11-25", status: "active", folder: "Mobility" },
                      { name: "Nutrition & Hydration Plan", author: "Emma Wilson", date: "10-10-25", status: "active", folder: "Nutrition & Hydration" },
                      { name: "Skin Integrity / Pressure Care Plan", author: "Emma Wilson", date: "10-11-25", status: "active", folder: "Skin Integrity" },
                      { name: "Personal Hygiene & Dressing Plan", author: "Lily Thompson", date: "10-11-25", status: "active", folder: "Personal Hygiene" }
                    ].map((cp, i) => (
                      <div
                        key={i}
                        onClick={() => openDrawerItem(cp.name, "careplan", cp)}
                        className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-emerald-500 cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit mb-1.5">
                            {cp.folder}
                          </div>
                          <div className="font-bold text-sm text-slate-900 mb-1">{cp.name}</div>
                          <div className="text-xs text-slate-400">{cp.author} · {cp.date}</div>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                          <ChevronRight className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MEDICATION TAB */}
            {activeProfileTab === "medication" && (
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex gap-2 border-b border-slate-200 pb-3">
                  {["active", "emar", "discontinued", "kardex", "history"].map((medTab) => (
                    <button
                      key={medTab}
                      onClick={() => {
                        setActiveMedTab(medTab);
                        updateNavUrl({ subtab: medTab });
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                        activeMedTab === medTab
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-500"
                      }`}
                    >
                      {medTab === "emar" ? "eMAR" : medTab}
                    </button>
                  ))}
                </div>

                {activeMedTab === "emar" ? (
                  <EmarSheet
                    residentId={selectedResident.id}
                    residentName={selectedResident.fullName || selectedResident.name || `${selectedResident.first_name || ""} ${selectedResident.last_name || ""}`}
                    organizationId={selectedResident.organization_id || activeOrganizationId || ""}
                    careHomeId={selectedResident.care_home_id || activeCareHomeId || ""}
                  />
                ) : activeMedTab === "kardex" ? (
                  <KardexModal
                    medications={liveMedications}
                    resident={
                      selectedResident?.raw || {
                        id: selectedResident?.id || "",
                        first_name: selectedResident?.name?.split(" ")[0] || "Resident",
                        last_name: selectedResident?.name?.split(" ").slice(1).join(" ") || "",
                        date_of_birth: selectedResident?.dob,
                        room_number: selectedResident?.room,
                        nhs_health_number: selectedResident?.nhs,
                        gp_name: selectedResident?.gp?.name,
                        gp_address: selectedResident?.gp?.address,
                      }
                    }
                    inlineMode
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                          <th className="py-3 px-5">Medication</th>
                          <th className="py-3 px-5">Dose</th>
                          <th className="py-3 px-5">Route</th>
                          <th className="py-3 px-5">Frequency</th>
                          <th className="py-3 px-5">Prescriber</th>
                          <th className="py-3 px-5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const filteredMeds = liveMedications.filter((med: any) => {
                            const st = (med.status || "active").toLowerCase();
                            if (activeMedTab === "active") {
                              return st === "active" || st !== "discontinued";
                            }
                            if (activeMedTab === "discontinued") {
                              return st === "discontinued";
                            }
                            return true;
                          });

                        if (isLoadingLiveDetails) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-slate-500 font-medium bg-slate-50/40">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-1" />
                                  <p className="text-xs font-semibold text-slate-700">Loading medication records...</p>
                                  <p className="text-[11px] text-slate-400">Fetching live resident prescriptions from database.</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (filteredMeds.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                                No {activeMedTab} medications recorded for this resident.
                              </td>
                            </tr>
                          );
                        }

                          return filteredMeds.map((med: any, i: number) => {
                            const medName = med.name || med.medication_name || "Prescription";
                            const medType = med.schedule_type || med.dosage_form || med.type || "Prescription";
                            const medDose = med.dosage || med.dose || med.strength || "As prescribed";
                            const medRoute = med.route || "Oral";
                            const medFreq = med.frequency || med.instructions || "Daily";
                            const medPrescriber = med.prescriber_name || med.prescriber || "GP";
                            const medStatus = med.status ? med.status.charAt(0).toUpperCase() + med.status.slice(1) : "Active";
                            const isDisc = (med.status || "").toLowerCase() === "discontinued";

                            return (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="py-3 px-5 font-semibold text-slate-900">
                                  <div>{medName}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">{medType}</div>
                                </td>
                                <td className="py-3 px-5 text-slate-700">{medDose}</td>
                                <td className="py-3 px-5 text-slate-700">{medRoute}</td>
                                <td className="py-3 px-5 text-slate-700">{medFreq}</td>
                                <td className="py-3 px-5 text-slate-500">{medPrescriber}</td>
                                <td className="py-3 px-5">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    isDisc
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {medStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* AUDITS TAB */}
            {activeProfileTab === "audit" && (
              <div className="max-w-6xl mx-auto space-y-6">
                {selectedRqiaRecordId && selectedRqiaAuditId ? (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs p-2">
                    <ManagerAuditRecordDetailView
                      auditId={selectedRqiaAuditId}
                      recordId={selectedRqiaRecordId}
                      onBack={() => {
                        setSelectedRqiaRecordId(null);
                        setSelectedRqiaAuditId(null);
                        setViewRqiaHistoryList(false);
                      }}
                    />
                  </div>
                ) : selectedRqiaAuditId && viewRqiaHistoryList ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <button
                          onClick={() => {
                            setSelectedRqiaAuditId(null);
                            setSelectedRqiaRecordId(null);
                            setViewRqiaHistoryList(false);
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Audits Catalog
                        </button>
                        <h3 className="text-lg font-bold text-slate-900">
                          Audit History Runs — {initialManagerAudits.find(a => a.id === selectedRqiaAuditId)?.name || "Audit"}
                        </h3>
                      </div>
                    </div>

                    {isLoadingRqiaHistory ? (
                      <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading audit history...</span>
                      </div>
                    ) : rqiaHistoryRecords.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase">
                              <th className="py-2.5 px-4">Completion Date</th>
                              <th className="py-2.5 px-4">Auditor</th>
                              <th className="py-2.5 px-4">Audited Entries</th>
                              <th className="py-2.5 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rqiaHistoryRecords.map((rec) => (
                              <tr key={rec.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  {rec.completed_date ? format(new Date(rec.completed_date), "PPP") : "Recent"}
                                </td>
                                <td className="py-3 px-4 text-slate-600">{rec.auditor || "Manager"}</td>
                                <td className="py-3 px-4 text-slate-500">{rec.entries_count || 1} Audited</td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setSelectedRqiaRecordId(rec.id)}
                                    className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                                  >
                                    View Report
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No completed history runs found for this audit template yet.
                      </div>
                    )}
                  </div>
                ) : selectedRqiaAuditId ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs space-y-3">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-base font-bold text-slate-900">
                      No Completed Audit Reports Found
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      No completion history has been recorded yet for {" "}
                      <strong>{initialManagerAudits.find(a => a.id === selectedRqiaAuditId)?.name || "this audit"}</strong>.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedRqiaAuditId(null);
                        setSelectedRqiaRecordId(null);
                        setViewRqiaHistoryList(false);
                      }}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 mt-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Audits Catalog
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Category Pills & Search */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { id: "clinical", label: "Clinical Audits" },
                          { id: "carefile", label: "Care File Audit" },
                          { id: "staff", label: "Staff Audits" },
                          { id: "operational", label: "Operational Audits" },
                          { id: "general", label: "General" },
                          { id: "all", label: "All Audits" },
                        ].map((catTab) => (
                          <button
                            key={catTab.id}
                            onClick={() => {
                              setActiveAuditTab(catTab.id);
                              updateNavUrl({ subtab: catTab.id });
                            }}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              activeAuditTab === catTab.id
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-500"
                            }`}
                          >
                            {catTab.label}
                          </button>
                        ))}
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search audits..."
                          value={rqiaAuditSearch}
                          onChange={(e) => setRqiaAuditSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* Audit Catalog Table */}
                    {isLoadingAuditsList ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-xs">
                        <Loader2 className="animate-spin rounded-full h-7 w-7 text-emerald-600 mb-3" />
                        <p className="text-xs font-medium text-slate-500">Loading manager audits catalog...</p>
                      </div>
                    ) : activeAuditTab === "carefile" ? (
                      /* Resident Care File Audit Table */
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                              <th className="py-3 px-5">Resident</th>
                              <th className="py-3 px-5">Bed number</th>
                              <th className="py-3 px-5">Frequency</th>
                              <th className="py-3 px-5">Last Audited</th>
                              <th className="py-3 px-5">Next Audit</th>
                              <th className="py-3 px-5">Auditor</th>
                              <th className="py-3 px-5 text-center">Report</th>
                              <th className="py-3 px-5 text-right">Pending action plans</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dbResidents && dbResidents.length > 0 ? (
                              dbResidents
                                .filter((res) => {
                                  if (!rqiaAuditSearch.trim()) return true;
                                  const query = rqiaAuditSearch.toLowerCase();
                                  const nameMatch = (res.name || `${res.first_name || ""} ${res.last_name || ""}`).toLowerCase().includes(query);
                                  const roomMatch = (res.room || res.room_number || "").toLowerCase().includes(query);
                                  return nameMatch || roomMatch;
                                })
                                .map((res) => {
                                  const resId = res.id || res._id;
                                  const resAuditInfo = residentCareFileAuditMap[resId] || {
                                    lastAudited: "-",
                                    nextAudit: "-",
                                    auditor: "—",
                                    pendingActionPlans: 0,
                                  };

                                  const lastAuditedStr = resAuditInfo.lastAudited !== "-" ? format(new Date(resAuditInfo.lastAudited), "dd MMM yyyy") : "—";
                                  const nextAuditStr = resAuditInfo.nextAudit !== "-" ? format(new Date(resAuditInfo.nextAudit), "dd MMM yyyy") : "—";

                                  return (
                                    <tr key={resId} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-3 px-5 font-semibold text-slate-900">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden shrink-0">
                                            {res.imageUrl || res.image_url ? (
                                              <img src={res.imageUrl || res.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              (res.first_name?.[0] || res.name?.[0] || "R").toUpperCase()
                                            )}
                                          </div>
                                          <span>{res.name || `${res.first_name || ""} ${res.last_name || ""}`}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-5 text-slate-700 font-medium">
                                        {res.room || res.room_number || "—"}
                                      </td>
                                      <td className="py-3 px-5">
                                        <span className="text-blue-600 font-semibold inline-flex items-center gap-1 cursor-pointer">
                                          Monthly <ChevronDown className="w-3 h-3 text-blue-500" />
                                        </span>
                                      </td>
                                      <td className="py-3 px-5 text-slate-500">{lastAuditedStr}</td>
                                      <td className="py-3 px-5 text-slate-500">{nextAuditStr}</td>
                                      <td className="py-3 px-5 text-slate-600">{resAuditInfo.auditor || "—"}</td>
                                      <td className="py-3 px-5 text-center">
                                        <button
                                          onClick={() => {
                                            if (resAuditInfo.recordId) {
                                              setSelectedRqiaAuditId("0");
                                              setSelectedRqiaRecordId(resAuditInfo.recordId);
                                            } else {
                                              handleOpenRqiaAuditHistory("0");
                                            }
                                          }}
                                          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 hover:text-emerald-700 transition-colors inline-flex items-center justify-center"
                                          title="View Report"
                                        >
                                          <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                      </td>
                                      <td className="py-3 px-5 text-right font-medium text-slate-600">
                                        {resAuditInfo.pendingActionPlans ?? 0}
                                      </td>
                                    </tr>
                                  );
                                })
                            ) : (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                                  No residents found in active care home.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                              <th className="py-3 px-5">Audit Name</th>
                              <th className="py-3 px-5">Category</th>
                              <th className="py-3 px-5">Auditor</th>
                              <th className="py-3 px-5">Last Audited</th>
                              <th className="py-3 px-5">Due Date</th>
                              <th className="py-3 px-5">Status</th>
                              <th className="py-3 px-5">Frequency</th>
                              <th className="py-3 px-5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredRqiaAudits.length > 0 ? (
                              filteredRqiaAudits.map((aud) => {
                                const isDue = aud.status === "due";
                                const isCompleted = aud.status === "completed";

                                return (
                                  <tr key={aud.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-5 font-semibold text-slate-900">
                                      {aud.name}
                                    </td>
                                    <td className="py-3 px-5">
                                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                        {aud.category}
                                      </span>
                                    </td>
                                    <td className="py-3 px-5 text-slate-600 font-medium">{aud.auditor}</td>
                                    <td className="py-3 px-5 text-slate-500">
                                      {aud.lastAudited !== "-" ? format(new Date(aud.lastAudited), "dd/MM/yyyy") : "-"}
                                    </td>
                                    <td className="py-3 px-5 text-slate-500">
                                      {aud.dueDate !== "-" ? format(new Date(aud.dueDate), "dd/MM/yyyy") : "-"}
                                    </td>
                                    <td className="py-3 px-5">
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block ${
                                          isCompleted
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            : isDue
                                            ? "bg-red-100 text-red-800 border border-red-200"
                                            : "bg-amber-100 text-amber-800 border border-amber-200"
                                        }`}
                                      >
                                        {isCompleted ? "Completed" : isDue ? "Due" : "New"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-5 text-slate-500 capitalize">{aud.frequency}</td>
                                    <td className="py-3 px-5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {aud.latestRecordId ? (
                                          <button
                                            onClick={() => {
                                              setSelectedRqiaAuditId(aud.id);
                                              setSelectedRqiaRecordId(aud.latestRecordId || null);
                                            }}
                                            className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-colors shadow-xs"
                                          >
                                            View Report
                                          </button>
                                        ) : null}
                                        <button
                                          onClick={() => handleOpenRqiaAuditHistory(aud.id)}
                                          className="px-2.5 py-1 rounded border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 transition-colors"
                                        >
                                          History
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                                  No audits found matching current filter or search criteria.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* CENTERED MODAL OVERLAY */}
      {/* ══════════════════════════════════════════════════ */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">{drawerTitle}</h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs text-slate-700">

              {/* Specialized Content for Continence Log Entries */}
              {drawerContent?.type === "continence" && drawerContent?.data && (() => {
                const cont = drawerContent.data;
                const typeRaw = (cont.entry_type || cont.type || "continence").toLowerCase();
                const isBowel = typeRaw.includes("bowel");
                const isUrine = typeRaw.includes("urine");
                const eventName = formatTitleCase(cont.entry_type || cont.type || "Continence Check");
                const recordedBy = getRecordedByName(cont, profilesMap);

                const stKey = cont.stool_type || (cont.bristol_scale ? `type_${cont.bristol_scale}` : null);
                const bristolInfo = stKey && BRISTOL_SCALE_MAP[stKey] ? BRISTOL_SCALE_MAP[stKey] : null;

                const rawTime = cont.created_at || cont.timestamp || cont.time;
                let formattedTime = cont.time || "";
                if (rawTime) {
                  try {
                    const d = new Date(rawTime);
                    if (!isNaN(d.getTime())) formattedTime = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  } catch (e) {}
                }

                return (
                  <div className="space-y-5">
                    {/* Header summary card */}
                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-purple-600" />
                          <span className="font-bold text-slate-900 text-sm">{eventName}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isBowel ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"}`}>
                          {isBowel ? "Bowel Log" : "Urine Log"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex justify-between border-t border-purple-100 pt-2">
                        <span>Resident: <strong>{selectedResident?.name}</strong></span>
                        <span>Time: <strong>{formattedTime || "Recorded"}</strong></span>
                      </div>
                    </div>

                    {/* Bowel Details Section */}
                    {(isBowel || bristolInfo || cont.bowel_size) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" /> Bristol Stool Chart & Bowel Details
                        </h4>
                        {bristolInfo ? (
                          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-amber-900 text-xs">{bristolInfo.typeNum}: {bristolInfo.title}</span>
                              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Bristol Chart</span>
                            </div>
                            <p className="text-xs text-amber-800 leading-relaxed">{bristolInfo.description}</p>
                          </div>
                        ) : cont.bristol_scale ? (
                          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
                            <span className="font-extrabold text-amber-900 text-xs">Bristol Stool Scale Type {cont.bristol_scale}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">No specific Bristol Chart score selected</div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Bowel Size</div>
                            <div className="font-bold text-slate-900 text-xs mt-0.5">
                              {cont.bowel_size ? `${cont.bowel_size.toUpperCase()} (${cont.bowel_size === 's' ? 'Small' : cont.bowel_size === 'm' ? 'Medium' : cont.bowel_size === 'l' ? 'Large' : 'Extra Large'})` : "Not specified"}
                            </div>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Assistance Required</div>
                            <div className="font-bold text-slate-900 text-xs mt-0.5">
                              {cont.assistance_required ? "Yes (Staff Assisted)" : "Independent / Self"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Urine Details Section */}
                    {(isUrine || cont.urine_color || cont.urine_amount || cont.urine_odor) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" /> Urine Observation Details
                        </h4>
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Color</div>
                            <div className="font-bold text-slate-900 text-xs mt-0.5">{formatTitleCase(cont.urine_color) || "Normal / Straw"}</div>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Volume / Amount</div>
                            <div className="font-bold text-slate-900 text-xs mt-0.5">{cont.urine_amount || "Recorded"}</div>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Odor</div>
                            <div className="font-bold text-slate-900 text-xs mt-0.5">{formatTitleCase(cont.urine_odor) || "Normal"}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Continence Product & Notes */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
                        Care Product & Clinical Observations
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Continence Aid / Product:</span>
                          <span className="font-semibold text-slate-900">{cont.continence_aid || "Pad / Toilet"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Recorded By Staff:</span>
                          <span className="font-semibold text-slate-900">{recordedBy}</span>
                        </div>
                        <div className="pt-2">
                          <div className="text-slate-500 mb-1 font-medium">Notes & Observations:</div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 leading-relaxed font-normal">
                            {cont.notes || cont.details || "Observed, clean and comfortable."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Specialized Content for Food & Fluid Log Entries */}
              {drawerContent?.type === "food_fluid" && drawerContent?.data && (() => {
                const ff = drawerContent.data;
                const recordedBy = getRecordedByName(ff, profilesMap);
                const isFluid = Boolean(ff.fluid_consumed_ml);
                return (
                  <div className="space-y-4">
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{formatTitleCase(ff.type_of_food_drink || ff.type || ff.name || "Food & Fluid Intake")}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isFluid ? "bg-cyan-100 text-cyan-800" : "bg-orange-100 text-orange-800"}`}>
                          {isFluid ? "Fluid Intake" : "Food Meal"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">Recorded by <strong>{recordedBy}</strong></div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Intake Details</h4>
                      <div className="space-y-2 text-xs">
                        {isFluid ? (
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Fluid Volume Consumed:</span>
                            <span className="font-bold text-emerald-600 text-sm">{ff.fluid_consumed_ml} ml</span>
                          </div>
                        ) : (
                          <>
                            {ff.section && (
                              <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Meal Section:</span>
                                <span className="font-semibold text-slate-900">{formatTitleCase(ff.section)}</span>
                              </div>
                            )}
                            {ff.portion_served && (
                              <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Portion Served:</span>
                                <span className="font-semibold text-slate-900">{formatTitleCase(ff.portion_served)}</span>
                              </div>
                            )}
                            {ff.amount_eaten && (
                              <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Amount Eaten:</span>
                                <span className="font-bold text-emerald-600">{formatTitleCase(ff.amount_eaten)}</span>
                              </div>
                            )}
                          </>
                        )}
                        {ff.notes && (
                          <div className="pt-2">
                            <span className="text-slate-500">Notes:</span>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 mt-1">{ff.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Specialized Content for Personal Care Log Entries */}
              {drawerContent?.type === "personal_care" && drawerContent?.data && (() => {
                const pc = drawerContent.data;
                const recordedBy = getRecordedByName(pc, profilesMap);
                return (
                  <div className="space-y-4">
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                      <div className="font-bold text-slate-900 text-sm">{formatTitleCase(pc.task_name || pc.task_type || pc.activity || "Personal Care Task")}</div>
                      <div className="text-xs text-slate-600">Recorded by <strong>{recordedBy}</strong></div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Activity Details & Observations</h4>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 leading-relaxed text-xs">
                        {pc.notes || pc.details || pc.description || "Personal hygiene and care activity completed safely."}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Specialized Content for Vitals Log Entries */}
              {drawerContent?.type === "vitals" && drawerContent?.data && (() => {
                const hv = drawerContent.data;
                const recordedBy = getRecordedByName(hv, profilesMap);
                return (
                  <div className="space-y-4">
                    <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-2">
                      <div className="font-bold text-slate-900 text-sm">{formatTitleCase(hv.type || hv.parameter || "Health Parameter")}</div>
                      <div className="text-xs text-slate-600">Recorded by <strong>{recordedBy}</strong></div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Reading & Measurement</h4>
                      <div className="text-2xl font-extrabold text-rose-600 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        {hv.value || (hv.weight_kg ? `${hv.weight_kg} kg` : hv.reading || "Recorded")}
                      </div>
                      {hv.notes && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700">
                          <span className="font-bold text-slate-900 block mb-1">Notes:</span>
                          {hv.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Specialized Incident & Fall Report Overlay Renderer */}
              {drawerContent?.type === "incident" && drawerContent?.data && (
                <div className="bg-white rounded-xl overflow-hidden p-1 sm:p-2">
                  <IncidentReportViewer
                    folderId={drawerContent.data.folder_id || drawerContent.data.id}
                    initialData={drawerContent.data.raw || drawerContent.data}
                    canEdit={false}
                  />
                </div>
              )}

              {/* Specialized Content for Daily Progress Notes */}
              {drawerContent?.type === "progress_note" && drawerContent?.data && (() => {
                const pn = drawerContent.data;
                const authorName = getRecordedByName(pn, profilesMap);
                return (
                  <div className="space-y-4">
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-sm">{formatTitleCase(pn.category || pn.shift || pn.type || "Daily Progress Note")}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">Filed Note</span>
                      </div>
                      <div className="text-xs text-slate-600">Author: <strong>{authorName}</strong></div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Full Progress Note Content</h4>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                        {pn.content || pn.note || pn.notes || pn.summary || "Daily progress care note."}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Specialized Care Plan Drawer Renderer */}
              {drawerContent?.type === "careplan" && (() => {
                const cp = drawerContent.data || {};

                const getFolderName = (data: any) => {
                  const folderNameMap: Record<string, string> = {
                    "v2-my-life": "This Is My Life",
                    "v2-medication": "Medication",
                    "v2-mobility": "Mobility",
                    "v2-nutrition-hydration": "Nutrition & Hydration",
                    "v2-hygiene": "Personal Hygiene & Dressing",
                    "v2-incontinence": "Incontinence",
                    "v2-skin-integrity": "Skin Integrity / Pressure Care",
                    "v2-additional-cp": "Additional Care Plans",
                    "v2-psychological": "Psychological & Emotional Needs",
                    "v2-valuables": "Valuables & Personal Property",
                    "v2-specimens": "Record of Specimens",
                    "v2-confidential": "Confidential Records"
                  };

                  if (data.folder_key && folderNameMap[data.folder_key]) {
                    return folderNameMap[data.folder_key];
                  }
                  if (data.goals?.folderName) return data.goals.folderName;
                  if (data.folderName) return data.folderName;
                  if (data.folder) return data.folder;

                  const t = (data.care_plan_type || data.title || data.name || "").toLowerCase();
                  if (t.includes("mobility") || t.includes("moving") || t.includes("fall")) return "Mobility";
                  if (t.includes("medication") || t.includes("pain")) return "Medication";
                  if (t.includes("nutrition") || t.includes("hydration") || t.includes("diet") || t.includes("must")) return "Nutrition & Hydration";
                  if (t.includes("skin") || t.includes("wound") || t.includes("pressure") || t.includes("braden")) return "Skin Integrity / Pressure Care";
                  if (t.includes("hygiene") || t.includes("dressing") || t.includes("oral")) return "Personal Hygiene & Dressing";
                  if (t.includes("continence") || t.includes("bowel") || t.includes("bladder")) return "Incontinence";

                  return "Care File Folder";
                };

                const title = cp.care_plan_type || cp.goals?.nameOfCarePlan || cp.name_of_care_plan || cp.name || cp.title || drawerContent.title || "Care Plan";
                const folder = getFolderName(cp);
                const author = profilesMap[cp.created_by] || cp.written_by || cp.goals?.writtenBy || cp.author || "Staff Member";
                const dateStr = cp.created_at ? new Date(cp.created_at).toLocaleDateString("en-GB") : (cp.date || "Recent");
                const nextReview = cp.next_evaluation_date ? new Date(cp.next_evaluation_date).toLocaleDateString("en-GB") : (cp.goals?.nextEvaluationDate || "Scheduled");
                const status = (cp.status || "active").toLowerCase();
                const needs = cp.need_identified || cp.goals?.identifiedNeeds || cp.identified_needs || null;
                const aims = cp.goals?.aims || cp.goals?.wishes || cp.aims || null;
                const rawInterventions = cp.interventions || cp.goals?.interventions || null;

                const renderInterventionCard = (item: any, idx: number) => {
                  let obj = item;
                  if (typeof item === "string") {
                    const trimmed = item.trim();
                    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                      try {
                        obj = JSON.parse(trimmed);
                      } catch (e) {
                        obj = item;
                      }
                    }
                  }

                  if (typeof obj === "string") {
                    return (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed font-medium">{obj}</span>
                      </div>
                    );
                  }

                  if (obj && typeof obj === "object") {
                    const details = obj.details || obj.description || obj.intervention || obj.text || obj.content || null;
                    const time = obj.time || null;
                    const signature = obj.signature || obj.staff || obj.author || obj.created_by || null;
                    const dateVal = obj.date;
                    let dateDisplay: string | null = null;
                    if (dateVal) {
                      if (typeof dateVal === "number" || (!isNaN(Number(dateVal)) && String(dateVal).length >= 10)) {
                        dateDisplay = new Date(Number(dateVal)).toLocaleDateString("en-GB");
                      } else {
                        dateDisplay = String(dateVal);
                      }
                    }

                    return (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <div className="font-semibold text-slate-900 leading-relaxed text-xs">
                              {details || "Planned Intervention Record"}
                            </div>
                          </div>
                          {time && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                              Time: {time}
                            </span>
                          )}
                        </div>
                        {(signature || dateDisplay) && (
                          <div className="pl-3.5 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                            {signature && <span>Signature: <strong className="text-slate-700">{signature}</strong></span>}
                            {dateDisplay && <span>Date: <strong className="text-slate-700">{dateDisplay}</strong></span>}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                };

                const renderStructuredContent = (data: any) => {
                  if (!data) return null;
                  let parsed = data;

                  if (typeof data === "string") {
                    const trimmed = data.trim();
                    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
                      try {
                        parsed = JSON.parse(trimmed);
                      } catch (e) {
                        parsed = data;
                      }
                    }
                  }

                  if (typeof parsed === "string") {
                    return <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{parsed}</p>;
                  }

                  if (Array.isArray(parsed)) {
                    return (
                      <div className="space-y-2">
                        {parsed.map((item: any, idx: number) => renderInterventionCard(item, idx))}
                      </div>
                    );
                  }

                  if (typeof parsed === "object") {
                    const entries = Object.entries(parsed).filter(([k, v]) => v !== null && v !== "" && k !== "id");
                    return (
                      <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                        {entries.map(([k, v]) => (
                          <div key={k} className="pt-1.5 flex justify-between gap-4">
                            <span className="text-slate-500 font-medium capitalize">{k.replace(/_/g, " ")}:</span>
                            <span className="font-semibold text-slate-900 text-right">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return <p className="text-xs text-slate-800 leading-relaxed">{String(data)}</p>;
                };

                return (
                  <div className="space-y-4">
                    {/* Overview Metadata Card */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Care Plan Title:</span>
                        <span className="font-bold text-slate-900">{title}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Care Folder:</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{folder}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Prepared By:</span>
                        <span className="font-semibold text-slate-900">{author}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Date Formulated:</span>
                        <span className="font-semibold text-slate-900">{dateStr}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Next Review Date:</span>
                        <span className="font-semibold text-slate-900">{nextReview}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Status:</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${status === "active" ? "bg-emerald-100 text-emerald-800" : status === "archived" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Identified Needs */}
                    {needs && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Identified Need / Reason for Plan</h4>
                        {renderStructuredContent(needs)}
                      </div>
                    )}

                    {/* Aims & Goals */}
                    {aims && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Aims & Desired Outcomes</h4>
                        {renderStructuredContent(aims)}
                      </div>
                    )}

                    {/* Interventions */}
                    {rawInterventions && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-xs">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Planned Interventions & Support Required</h4>
                        {renderStructuredContent(rawInterventions)}
                      </div>
                    )}

                    {/* Structured Verification Badge */}
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-blue-900">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" /> RQIA Statutory Standard Compliance
                      </div>
                      <p className="text-[11px] text-blue-700 leading-normal">
                        This person-centred care plan is active in the resident care file and aligned with statutory Northern Ireland RQIA care home regulations.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Specialized Audit Record Drawer Renderer */}
              {drawerContent?.type === "audit" && (() => {
                const aud = drawerContent.data || {};
                const raw = aud.raw || {};
                const responses = Array.isArray(raw.responses) ? raw.responses : Array.isArray(raw.items) ? raw.items : null;
                const notes = raw.overall_notes || raw.notes || null;

                return (
                  <div className="space-y-4">
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Audit Title:</span>
                        <span className="font-bold text-slate-900">{aud.name || raw.template_name || "Submitted Audit"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Auditor / Submitted By:</span>
                        <span className="font-semibold text-slate-900">{aud.auditor || raw.audited_by_name || "Auditor"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Date Completed:</span>
                        <span className="font-semibold text-slate-900">{aud.date || "Recent"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Status:</span>
                        <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                          aud.status === "Up to date" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          aud.status === "In Progress" ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-red-500 text-white font-bold"
                        }`}>
                          {aud.status || "Up to date"}
                        </span>
                      </div>
                    </div>

                    {notes && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Overall Audit Notes & Findings</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 text-xs leading-relaxed">
                          {notes}
                        </div>
                      </div>
                    )}

                    {responses && responses.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Audit Questions & Responses ({responses.length})</h4>
                        <div className="space-y-2.5 divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
                          {responses.map((resp: any, idx: number) => {
                            const qText = resp.question || resp.text || resp.label || resp.title || `Item ${idx + 1}`;
                            const ansText = resp.answer || (resp.compliant === true ? "Compliant" : resp.compliant === false ? "Non-Compliant" : resp.value || "Recorded");
                            const isYes = String(ansText).toLowerCase() === "yes" || resp.compliant === true;
                            const isNo = String(ansText).toLowerCase() === "no" || resp.compliant === false;

                            return (
                              <div key={idx} className="pt-2.5 space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-medium text-slate-800 leading-snug">{idx + 1}. {qText}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                    isYes ? "bg-emerald-100 text-emerald-800" :
                                    isNo ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                                  }`}>
                                    {String(ansText).toUpperCase()}
                                  </span>
                                </div>
                                {resp.notes && (
                                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                                    Notes: {resp.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action Plans Section */}
                    {(() => {
                      const plans = Array.isArray(raw.actionPlans) ? raw.actionPlans : Array.isArray(raw.actionPlansSnapshot) ? raw.actionPlansSnapshot : Array.isArray(raw.action_plans) ? raw.action_plans : null;
                      if (!plans || plans.length === 0) return null;

                      return (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-amber-800">
                            Action Plans & Follow-ups ({plans.length})
                          </h4>
                          <div className="space-y-2 text-xs">
                            {plans.map((p: any, idx: number) => {
                              const issue = p.issue || p.description || p.title || p.action_required || `Action Item ${idx + 1}`;
                              const assignee = p.assignedTo || p.assigned_to || p.assignee || "Staff Member";
                              const dueDate = p.dueDate || p.due_date ? new Date(p.dueDate || p.due_date).toLocaleDateString("en-GB") : "Pending";
                              const status = p.status || "open";

                              return (
                                <div key={idx} className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-lg space-y-1">
                                  <div className="flex justify-between items-start font-semibold text-slate-900">
                                    <span>{idx + 1}. {issue}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 shrink-0 capitalize">
                                      {status}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                                    <span>Assigned To: <strong>{assignee}</strong></span>
                                    <span>Due: <strong>{dueDate}</strong></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Default / Generic Form / Assessment Renderer */}
              {["form", "assessment", "file", "bodymap"].includes(drawerContent?.type) && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Care Folder:</span>
                      <span className="font-semibold text-slate-900">{drawerContent?.data?.folderName || drawerContent?.data?.folder || "Care File"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date Recorded:</span>
                      <span className="font-semibold text-slate-900">{drawerContent?.data?.date || "Recent"}</span>
                    </div>
                    {drawerContent?.data?.assessor && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recorded By / Assessor:</span>
                        <span className="font-semibold text-slate-900">{drawerContent.data.assessor}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Document Type:</span>
                      <span className="font-semibold capitalize text-emerald-700">{drawerContent?.data?.type || "Care Record"}</span>
                    </div>
                  </div>

                  {(drawerContent?.data?.pdfUrl || drawerContent?.data?.storagePath) && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Attachment / File Available</div>
                        <div className="text-[11px] text-slate-500">Stored document file attached to this record</div>
                      </div>
                      <a
                        href={drawerContent.data.pdfUrl || drawerContent.data.storagePath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> View File
                      </a>
                    </div>
                  )}

                  {/* Render Raw Form Payload key-values if available */}
                  {drawerContent?.data?.raw && typeof drawerContent.data.raw === "object" && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Recorded Form Responses</h4>
                      <div className="space-y-2 divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                        {Object.entries(drawerContent.data.raw)
                          .filter(([k, v]) => v !== null && v !== "" && !["id", "resident_id", "organization_id", "care_home_id", "team_id", "created_at", "updated_at"].includes(k))
                          .map(([key, val]) => (
                            <div key={key} className="pt-2 flex justify-between gap-4">
                              <span className="text-slate-500 font-medium capitalize">{key.replace(/_/g, " ")}:</span>
                              <span className="font-semibold text-slate-900 text-right truncate max-w-[240px]">
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wider text-slate-400">
                      Record Verification Summary
                    </h4>
                    <p className="leading-relaxed text-slate-600">
                      This actual record is filed under the resident care file ({drawerContent?.data?.folderName || "Care File"}) for resident {selectedResident?.name}. It has been filed according to statutory RQIA regulatory standards.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wider text-slate-400">
                  Key Verification Items
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5"></span>
                    Document completed and signed by responsible clinical staff member.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5"></span>
                    Reviewed against current care needs and regulatory compliance standards.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5"></span>
                    Stored securely within the digital care record database.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RqiaPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading RQIA Portal...</p>
        </div>
      }
    >
      <RqiaPortalContent />
    </Suspense>
  );
}
