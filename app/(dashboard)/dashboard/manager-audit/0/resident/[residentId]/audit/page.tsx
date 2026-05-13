"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, Plus, History, Check, AlertCircle, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { supabase } from "@/lib/supabase";
import { auditService } from "@/lib/audit-service";
import { withRoleGuard } from "@/lib/route-guards";

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text";
  isSection?: boolean;
  sourceFolderKey?: string;
  sourceLabel?: string;
}

interface Answer {
  residentId: string;
  questionId: string;
  value: string;
}

interface OrgMember {
  id: string;
  email: string;
  name?: string;
  image_url?: string;
}

interface ManagerQuestionActionPlan {
  id: string;
  description: string;
  assignedTo: string;
  assignedToEmail?: string;
  assignedToName: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  latestComment?: string;
  residentId?: string;
  residentName?: string;
  sourceItemId?: string;
}

function mapManagerQuestionActionPlan(
  row: Record<string, unknown>
): ManagerQuestionActionPlan {
  const assignedTo = String(row.assigned_to ?? "");
  const assignedToEmail =
    typeof row.assigned_to_email === "string" ? row.assigned_to_email : undefined;
  const assignedToName =
    (typeof row.assigned_to_name === "string" && row.assigned_to_name.trim()) ||
    assignedToEmail ||
    assignedTo;
  const sourceRaw = row.source_item_id;

  return {
    id: String(row.id),
    description: String(row.description ?? ""),
    assignedTo,
    assignedToEmail,
    assignedToName,
    dueDate: row.due_date ? new Date(String(row.due_date)) : undefined,
    priority: String(row.priority ?? ""),
    status: typeof row.status === "string" ? row.status : undefined,
    latestComment:
      typeof row.latest_comment === "string" && row.latest_comment.trim() !== ""
        ? row.latest_comment.trim()
        : undefined,
    residentId: typeof row.resident_id === "string" ? row.resident_id : undefined,
    residentName:
      typeof row.resident_name === "string" ? row.resident_name : undefined,
    sourceItemId:
      typeof sourceRaw === "string" && sourceRaw.trim() !== ""
        ? sourceRaw.trim()
        : undefined,
  };
}

type AttioStatus =
  | "not-reviewed"
  | "compliant"
  | "action-required"
  | "non-compliant"
  | "not-applicable";

interface AuditSection {
  id: string;
  number: string;
  name: string;
  parentId?: string;
  depth?: 0 | 1;
  sourceFolderKey?: string;
  sourceLabel?: string;
  rows: Question[];
}

const STATUS_CYCLE: AttioStatus[] = [
  "not-reviewed",
  "compliant",
  "action-required",
  "non-compliant",
  "not-applicable",
];

const defaultQuestion = (
  id: string,
  text: string,
  sourceFolderKey?: string,
  sourceLabel?: string
): Question => ({
  id,
  text,
  type: "compliance",
  sourceFolderKey,
  sourceLabel,
});

const DEFAULT_AUDIT_SECTIONS: AuditSection[] = [
  {
    id: "default-general",
    number: "1",
    name: "General",
    depth: 0,
    rows: [
      defaultQuestion("default-general-clean", "Is the home/area clean and tidy?"),
      defaultQuestion("default-general-odours", "Is the home/unit free from odours?"),
      defaultQuestion("default-general-name-badges", "Are staff wearing name badges?"),
      defaultQuestion("default-general-dress", "Are staff dressed appropriately?"),
      defaultQuestion("default-general-interactions", "Are staff interacting with residents appropriately?"),
      defaultQuestion("default-general-external", "Is the external area of the building clean and tidy?"),
    ],
  },
  {
    id: "default-admission",
    number: "2",
    name: "Admission Section",
    depth: 0,
    sourceFolderKey: "v2-admission",
    sourceLabel: "Admission",
    rows: [
      defaultQuestion("default-admission-physical-social", "Physical and Social Assessment reflective of current needs and updated at least yearly or sooner if changes occur"),
      defaultQuestion("default-admission-information", "Admission information complete (preferred name, DOB, date of admission, NOK, GP details etc.)"),
      defaultQuestion("default-admission-property-list", "Property list completed within last 3 months"),
      defaultQuestion("default-admission-photo-consent", "Consent for photos / agreements with relatives completed"),
      defaultQuestion("default-admission-care-plan-agreements", "Care plan agreements signed by resident and next of kin"),
      defaultQuestion(
        "default-admission-pre-admission",
        "Pre-admission assessments (Home & Trust) uploaded",
        "v2-pre-admission",
        "Pre-Admission"
      ),
    ],
  },
  {
    id: "default-assessments-care-plans",
    number: "3",
    name: "Assessments & Care Plans",
    depth: 0,
    rows: [],
  },
  {
    id: "default-safe-environment",
    number: "3.1",
    name: "Maintaining a Safe Environment",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-safe-environment",
    sourceLabel: "Maintaining a Safe Environment",
    rows: [
      defaultQuestion("default-safe-env-gra-current", "General Risk Assessment completed and current"),
      defaultQuestion("default-safe-env-risks-clear-accurate", "Risks identified clearly and accurately"),
      defaultQuestion("default-safe-env-smoking-selfmed", "Smoking/self-medication risks assessed where applicable"),
      defaultQuestion("default-safe-env-control-measures", "Control measures documented clearly"),
      defaultQuestion("default-safe-env-peep-current", "PEEP completed and current"),
      defaultQuestion("default-safe-env-evacuation-documented", "Evacuation needs documented clearly"),
      defaultQuestion("default-safe-env-restraint-assessment", "Restraint risk assessment completed where applicable"),
      defaultQuestion("default-safe-env-least-restrictive", "Least restrictive practice evidenced"),
      defaultQuestion("default-safe-env-restraint-consent-capacity", "Consent/capacity for restraint documented"),
    ],
  },
  {
    id: "default-dependency",
    number: "3.2",
    name: "Dependency",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-dependency",
    sourceLabel: "Dependency",
    rows: [
      defaultQuestion("default-dependency-assessment-completed", "Dependency assessment completed"),
      defaultQuestion("default-dependency-physical-support", "Physical support needs documented"),
      defaultQuestion("default-dependency-cognitive-support", "Cognitive support needs documented"),
      defaultQuestion("default-dependency-behavioural-support", "Behavioural support needs documented"),
      defaultQuestion("default-dependency-staffing-assistance", "Staffing assistance level clearly documented"),
      defaultQuestion("default-dependency-reviewed-regularly", "Dependency reviewed regularly"),
    ],
  },
  {
    id: "default-this-is-my-life",
    number: "3.3",
    name: "This Is My Life",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-my-life",
    sourceLabel: "This Is My Life",
    rows: [
      defaultQuestion("default-timl-form", "This Is My Life form completed"),
      defaultQuestion("default-personal-profile", "Personal Profile completed and person-centred"),
      defaultQuestion("default-life-history-review", "Life history information reviewed with resident / family"),
    ],
  },
  {
    id: "default-medication",
    number: "3.4",
    name: "Medication",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-medication",
    sourceLabel: "Medication",
    rows: [
      defaultQuestion("default-medication-pain-assessment-current", "Pain assessment completed and current"),
      defaultQuestion("default-medication-abbey-pain-tool", "Abbey Pain Tool used appropriately"),
      defaultQuestion("default-medication-pain-scores-accurate", "Pain scores documented accurately"),
      defaultQuestion("default-medication-pain-interventions", "Pain management interventions documented"),
      defaultQuestion("default-medication-reassessment-after-interventions", "Reassessment completed following interventions"),
      defaultQuestion("default-medication-gp-clinical-escalation", "GP/clinical escalation documented where required"),
    ],
  },
  {
    id: "default-mobility",
    number: "3.5",
    name: "Mobility",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-mobility",
    sourceLabel: "Mobility",
    rows: [
      defaultQuestion("default-mobility-moving-handling-assessment", "Moving and Handling Assessment completed"),
      defaultQuestion("default-mobility-status-documented", "Mobility status documented clearly"),
      defaultQuestion("default-mobility-transfer-techniques", "Transfer techniques documented clearly"),
      defaultQuestion("default-mobility-equipment-sling", "Equipment/sling details documented correctly"),
      defaultQuestion("default-mobility-handling-profile-current", "Resident Handling Profile current"),
      defaultQuestion("default-mobility-falls-risk-current", "Falls Risk Assessment completed and current"),
      defaultQuestion("default-mobility-falls-prevention", "Falls prevention measures documented"),
      defaultQuestion("default-mobility-post-fall-reviews", "Post-fall reviews completed where required"),
      defaultQuestion("default-mobility-bedrail-consent", "Bedrail consent completed where applicable"),
      defaultQuestion("default-mobility-bedrail-risk-assessment", "Bedrail risk assessment completed where applicable"),
      defaultQuestion("default-mobility-entrapment-risks", "Entrapment risks assessed"),
    ],
  },
  {
    id: "default-nutrition-hydration",
    number: "3.6",
    name: "Nutrition & Hydration",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-nutrition-hydration",
    sourceLabel: "Nutrition & Hydration",
    rows: [
      defaultQuestion(
        "default-nutrition-must-correct",
        "MUST assessment completed correctly",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-weight-chart",
        "Weight chart current and reviewed monthly",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-weight-escalation",
        "Significant weight changes escalated appropriately",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-assessment-done",
        "Nutrition assessment completed",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-dietary-prefs",
        "Dietary preferences documented",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-supplements",
        "Supplements documented where required",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-oral-assessment",
        "Oral assessment completed and current",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-oral-hygiene-support",
        "Oral hygiene support documented",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-choking-risk",
        "Choking risk assessment completed where applicable",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-salt-recs",
        "SALT recommendations documented clearly",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-consistencies",
        "Food/fluid consistencies documented correctly",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
      defaultQuestion(
        "default-nutrition-diet-notifications",
        "Diet notifications communicated appropriately",
        "v2-nutrition-hydration",
        "Nutrition & Hydration"
      ),
    ],
  },
  {
    id: "default-incontinence",
    number: "3.7",
    name: "Incontinence",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-incontinence",
    sourceLabel: "Incontinence",
    rows: [
      defaultQuestion(
        "default-continence-assessment-done",
        "Continence assessment completed",
        "v2-incontinence",
        "Incontinence"
      ),
      defaultQuestion(
        "default-continence-bladder",
        "Bladder needs documented",
        "v2-incontinence",
        "Incontinence"
      ),
      defaultQuestion(
        "default-continence-bowel",
        "Bowel needs documented",
        "v2-incontinence",
        "Incontinence"
      ),
      defaultQuestion(
        "default-continence-aids",
        "Continence aids documented correctly",
        "v2-incontinence",
        "Incontinence"
      ),
      defaultQuestion(
        "default-continence-catheter-stoma",
        "Catheter/stoma care documented where applicable",
        "v2-incontinence",
        "Incontinence"
      ),
      defaultQuestion(
        "default-continence-toileting",
        "Toileting routines documented",
        "v2-incontinence",
        "Incontinence"
      ),
      defaultQuestion(
        "default-continence-skin-risks",
        "Skin risks related to continence identified",
        "v2-incontinence",
        "Incontinence"
      ),
    ],
  },
  {
    id: "default-hygiene",
    number: "3.8",
    name: "Personal Hygiene & Dressing",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-hygiene",
    sourceLabel: "Personal Hygiene & Dressing",
    rows: [
      defaultQuestion(
        "default-hygiene-prefs",
        "Hygiene preferences documented",
        "v2-hygiene",
        "Personal Hygiene & Dressing"
      ),
      defaultQuestion(
        "default-hygiene-assistance-level",
        "Assistance level documented clearly",
        "v2-hygiene",
        "Personal Hygiene & Dressing"
      ),
      defaultQuestion(
        "default-hygiene-braden-done",
        "Braden Risk Assessment completed",
        "v2-hygiene",
        "Personal Hygiene & Dressing"
      ),
      defaultQuestion(
        "default-hygiene-braden-accurate",
        "Braden score accurate and current",
        "v2-hygiene",
        "Personal Hygiene & Dressing"
      ),
      defaultQuestion(
        "default-hygiene-oral-needs",
        "Oral hygiene needs documented",
        "v2-hygiene",
        "Personal Hygiene & Dressing"
      ),
      defaultQuestion(
        "default-hygiene-oral-evaluations",
        "Oral care evaluations completed regularly",
        "v2-hygiene",
        "Personal Hygiene & Dressing"
      ),
      defaultQuestion(
        "default-hygiene-dignity-appearance",
        "Dignity and personal appearance supported",
        "v2-hygiene",
        "Personal Hygiene & Dressing"
      ),
    ],
  },
  {
    id: "default-skin-integrity",
    number: "3.9",
    name: "Skin Integrity / Tissue Viability",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-skin-integrity",
    sourceLabel: "Skin Integrity",
    rows: [
      defaultQuestion(
        "default-skin-integrity-risk",
        "Skin integrity risk assessed appropriately",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
      defaultQuestion(
        "default-skin-pressure-ulcer-risks",
        "Pressure ulcer risks identified",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
      defaultQuestion(
        "default-skin-pressure-equipment-doc",
        "Pressure-relieving equipment documented",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
      defaultQuestion(
        "default-skin-repositioning",
        "Repositioning schedules documented",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
      defaultQuestion(
        "default-skin-wound-assessments",
        "Wound assessments current",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
      defaultQuestion(
        "default-skin-body-maps",
        "Body maps completed where required",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
      defaultQuestion(
        "default-skin-tissue-viability-refs",
        "Tissue viability referrals documented where applicable",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
      defaultQuestion(
        "default-skin-inspections-regular",
        "Skin inspections completed regularly",
        "v2-skin-integrity",
        "Skin Integrity"
      ),
    ],
  },
  {
    id: "default-additional-care-plans",
    number: "3.10",
    name: "Additional Care Plans",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-additional-cp",
    sourceLabel: "Additional Care Plans",
    rows: [
      defaultQuestion(
        "default-additional-smoking-risk",
        "Smoking risk assessment completed",
        "v2-additional-cp",
        "Additional Care Plans"
      ),
      defaultQuestion(
        "default-additional-smoking-supervision",
        "Smoking supervision documented",
        "v2-additional-cp",
        "Additional Care Plans"
      ),
      defaultQuestion(
        "default-additional-fire-risks",
        "Fire risks assessed appropriately",
        "v2-additional-cp",
        "Additional Care Plans"
      ),
      defaultQuestion(
        "default-additional-oxygen-smoking",
        "Oxygen/smoking risks documented where applicable",
        "v2-additional-cp",
        "Additional Care Plans"
      ),
      defaultQuestion(
        "default-additional-safe-smoking",
        "Safe smoking arrangements documented",
        "v2-additional-cp",
        "Additional Care Plans"
      ),
      defaultQuestion(
        "default-additional-smoking-materials",
        "Smoking materials stored safely",
        "v2-additional-cp",
        "Additional Care Plans"
      ),
    ],
  },
  {
    id: "default-psychological",
    number: "3.11",
    name: "Psychological & Emotional Needs",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-psychological",
    sourceLabel: "Psychological & Emotional Needs",
    rows: [
      defaultQuestion(
        "default-psych-emotional-assessed",
        "Emotional wellbeing assessed",
        "v2-psychological",
        "Psychological & Emotional Needs"
      ),
      defaultQuestion(
        "default-psych-cornell-where-appropriate",
        "Cornell Scale completed where appropriate",
        "v2-psychological",
        "Psychological & Emotional Needs"
      ),
      defaultQuestion(
        "default-psych-mood-changes",
        "Mood changes documented",
        "v2-psychological",
        "Psychological & Emotional Needs"
      ),
      defaultQuestion(
        "default-psych-behavioural",
        "Behavioural concerns documented",
        "v2-psychological",
        "Psychological & Emotional Needs"
      ),
      defaultQuestion(
        "default-psych-emotional-interventions",
        "Emotional support interventions documented",
        "v2-psychological",
        "Psychological & Emotional Needs"
      ),
      defaultQuestion(
        "default-psych-referrals-escalations",
        "Referrals/escalations documented where required",
        "v2-psychological",
        "Psychological & Emotional Needs"
      ),
      defaultQuestion(
        "default-psych-engagement",
        "Resident engagement promoted appropriately",
        "v2-psychological",
        "Psychological & Emotional Needs"
      ),
    ],
  },
  {
    id: "default-specimens",
    number: "3.12",
    name: "Record of Specimens",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-specimens",
    sourceLabel: "Record of Specimens",
    rows: [
      defaultQuestion(
        "default-specimen-records-appropriate",
        "Specimen records completed appropriately",
        "v2-specimens",
        "Record of Specimens"
      ),
      defaultQuestion(
        "default-specimen-datetime",
        "Date/time of specimen documented",
        "v2-specimens",
        "Record of Specimens"
      ),
      defaultQuestion(
        "default-specimen-reason",
        "Reason for specimen documented",
        "v2-specimens",
        "Record of Specimens"
      ),
      defaultQuestion(
        "default-specimen-results",
        "Results uploaded/referenced appropriately",
        "v2-specimens",
        "Record of Specimens"
      ),
      defaultQuestion(
        "default-specimen-abnormal-escalation",
        "Abnormal results escalated appropriately",
        "v2-specimens",
        "Record of Specimens"
      ),
    ],
  },
  {
    id: "default-safeguarding",
    number: "3.13",
    name: "Safeguarding & DoLS",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-safeguarding",
    sourceLabel: "Safeguarding & DoLS",
    rows: [
      defaultQuestion(
        "default-safeguarding-concerns-doc",
        "Safeguarding concerns documented appropriately",
        "v2-safeguarding",
        "Safeguarding & DoLS"
      ),
      defaultQuestion(
        "default-safeguarding-referrals-uploaded",
        "Referrals uploaded correctly",
        "v2-safeguarding",
        "Safeguarding & DoLS"
      ),
      defaultQuestion(
        "default-safeguarding-protection-plans",
        "Protection plans documented",
        "v2-safeguarding",
        "Safeguarding & DoLS"
      ),
      defaultQuestion(
        "default-safeguarding-dols-current",
        "DOLS documentation current and complete",
        "v2-safeguarding",
        "Safeguarding & DoLS"
      ),
      defaultQuestion(
        "default-safeguarding-restrictive-practices",
        "Restrictive practices monitored appropriately",
        "v2-safeguarding",
        "Safeguarding & DoLS"
      ),
      defaultQuestion(
        "default-safeguarding-outcomes-reviews",
        "Outcomes/reviews documented appropriately",
        "v2-safeguarding",
        "Safeguarding & DoLS"
      ),
    ],
  },
  {
    id: "default-end-of-life",
    number: "3.14",
    name: "End of Life / Death",
    parentId: "default-assessments-care-plans",
    depth: 1,
    sourceFolderKey: "v2-end-of-life",
    sourceLabel: "End of Life / Death",
    rows: [
      defaultQuestion(
        "default-eol-wishes",
        "End-of-life wishes documented",
        "v2-end-of-life",
        "End of Life / Death"
      ),
      defaultQuestion(
        "default-eol-dnar-uploaded",
        "DNAR documentation uploaded where applicable",
        "v2-end-of-life",
        "End of Life / Death"
      ),
      defaultQuestion(
        "default-eol-family-involvement",
        "Family involvement documented",
        "v2-end-of-life",
        "End of Life / Death"
      ),
      defaultQuestion(
        "default-eol-spiritual-cultural",
        "Spiritual/cultural wishes documented",
        "v2-end-of-life",
        "End of Life / Death"
      ),
      defaultQuestion(
        "default-eol-anticipatory-meds",
        "Anticipatory medications documented",
        "v2-end-of-life",
        "End of Life / Death"
      ),
      defaultQuestion(
        "default-eol-pain-symptom",
        "Pain/symptom management reviewed appropriately",
        "v2-end-of-life",
        "End of Life / Death"
      ),
      defaultQuestion(
        "default-eol-professional-involvement",
        "Professional involvement documented",
        "v2-end-of-life",
        "End of Life / Death"
      ),
    ],
  },
  {
    id: "default-additional",
    number: "4",
    name: "Additional",
    depth: 0,
    sourceFolderKey: "v2-progress-note",
    sourceLabel: "Progress Notes",
    rows: [
      defaultQuestion(
        "default-additional-relative-comms",
        "Communication with relatives documented appropriately",
        "v2-key-worker",
        "Key Worker Diary"
      ),
      defaultQuestion(
        "default-additional-key-worker-meaningful",
        "Key worker records current and meaningful",
        "v2-key-worker",
        "Key Worker Diary"
      ),
      defaultQuestion(
        "default-additional-progress-notes",
        "Progress notes contemporaneous and person-centred",
        "v2-progress-note",
        "Progress Notes"
      ),
      defaultQuestion(
        "default-additional-care-plan-reviews-monthly",
        "Care plan reviews completed monthly",
        "v2-admission",
        "Admission"
      ),
      defaultQuestion(
        "default-additional-mdt-implemented",
        "Multidisciplinary recommendations implemented",
        "v2-progress-note",
        "Progress Notes"
      ),
      defaultQuestion(
        "default-additional-hospital-discharge",
        "Hospital discharge documentation uploaded"
      ),
      defaultQuestion(
        "default-additional-confidential-secure",
        "Confidential records uploaded securely",
        "v2-confidential",
        "Confidential Records"
      ),
      defaultQuestion(
        "default-additional-care-plans-signed",
        "Care plans signed by resident/representative",
        "v2-admission",
        "Admission"
      ),
      defaultQuestion(
        "default-additional-audit-actions-timeframe",
        "Audit actions completed within timeframe",
        "v2-progress-note",
        "Progress Notes"
      ),
      defaultQuestion(
        "default-additional-rqia-overall",
        "Overall resident file compliant with RQIA standards",
        "v2-admission",
        "Admission"
      ),
    ],
  },
];

interface ResidentCareFileAuditPageProps {
  params: Promise<{ residentId: string }>;
}

function ResidentCareFileAuditPage({ params }: ResidentCareFileAuditPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const residentId = resolvedParams.residentId;
  const { profile, isLoading: isContextLoading } = useProfile();
  const { activeCareHomeId, activeOrganizationId } = useActiveTeam();
  const [isLoading, setIsLoading] = useState(true);
  const [resident, setResident] = useState<any>(null);

  // State for grid-based audit
  const [rowQuestions, setRowQuestions] = useState<Question[]>([]);
  const [columnQuestions, setColumnQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [fixedColumnData, setFixedColumnData] = useState<{
    [rowId: string]: {
      comment?: string;
      actionRequired?: string;
      actionCompleted?: string;
      /** When there is no grid status column, drives the Attio status pills */
      rowStatus?: AttioStatus;
    };
  }>({});

  // UI State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [questionDialogMode, setQuestionDialogMode] = useState<"row" | "column">("row");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"compliance" | "yesno" | "text">("compliance");
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState("");
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [actionPlans, setActionPlans] = useState<ManagerQuestionActionPlan[]>([]);
  const [actionPlanSourceItemId, setActionPlanSourceItemId] = useState<
    string | undefined
  >(undefined);
  const actionPlanSourceItemIdRef = useRef<string | undefined>(undefined);

  // Load data
  const loadData = useCallback(async () => {
    if (!activeCareHomeId) return;

    try {
      setIsLoading(true);

      // 1. Context already available via hook!
      const chId = activeCareHomeId;

      // 2. Load resident
      const { data: resData } = await supabase
        .from('residents')
        .select('*')
        .eq('id', residentId)
        .eq('care_home_id', chId)
        .single();

      if (resData) {
        const mappedResident = {
          _id: resData.id,
          firstName: resData.first_name || resData.firstName,
          lastName: resData.last_name || resData.lastName,
          roomNumber: resData.room_number || resData.roomNumber,
          imageUrl: resData.image_url || resData.imageUrl,
          organizationId: resData.organization_id
        };
        setResident(mappedResident);

        // 3. Load shared templates (Row/Col Questions) for Care File Audit (ID 0)
        // We use a special audit_type_id 'template-0' for organization/carehome wide templates
        const { data: templateData } = await supabase
          .from('manager_audit_state')
          .select('row_questions, column_questions')
          .eq('care_home_id', chId)
          .eq('audit_type_id', 'template-0')
          .single();

        if (templateData) {
          if (templateData.row_questions) setRowQuestions(templateData.row_questions as Question[]);
          if (templateData.column_questions) setColumnQuestions(templateData.column_questions as Question[]);
        }

        // 4. Load saved in-progress state for THIS resident
        const { data: stateData } = await supabase
          .from('manager_audit_state')
          .select('answers, fixed_column_data')
          .eq('care_home_id', chId)
          .eq('audit_type_id', `resident-0-${residentId}`)
          .single();

        if (stateData) {
          if (stateData.answers) setAnswers(stateData.answers as Answer[]);
          if (stateData.fixed_column_data) setFixedColumnData(stateData.fixed_column_data as any);
        }

        try {
          const plans = await auditService.getManagerActionPlans("0", chId);
          setActionPlans(
            (plans || [])
              .filter((plan: Record<string, unknown>) => {
                const planResidentId =
                  typeof plan.resident_id === "string" ? plan.resident_id : "";
                return planResidentId === residentId;
              })
              .map((plan: Record<string, unknown>) =>
                mapManagerQuestionActionPlan(plan)
              )
          );
        } catch (error) {
          console.warn("Could not load care file audit action plans:", error);
          setActionPlans([]);
        }

        if (activeOrganizationId) {
          const { data: members } = await supabase
            .from("users")
            .select("id, email, name, image_url")
            .eq("organization_id", activeOrganizationId);
          setOrgMembers((members as OrgMember[]) || []);
        }
      } else {
        setResident(null);
        toast.error("Resident not found in active care home");
      }

    } catch (err) {
      console.error("Error loading audit:", err);
      toast.error("Failed to load audit");
    } finally {
      setIsLoading(false);
    }
  }, [residentId, supabase, activeCareHomeId, activeOrganizationId]);

  useEffect(() => {
    if (activeCareHomeId && activeOrganizationId) {
      loadData();
    }
  }, [loadData, activeCareHomeId, activeOrganizationId]);

  // Helper: upsert audit state
  const upsertState = async (typeId: string, updates: Record<string, any>) => {
    if (!resident?.organizationId) return;

    // Get care home id again or store it in state
    const { data: userProfile } = await supabase
      .from('users')
      .select('active_care_home_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
      .single();

    const chId = userProfile?.active_care_home_id;
    if (!chId) return;

    await supabase.from('manager_audit_state').upsert({
      care_home_id: chId,
      organization_id: resident.organizationId,
      audit_type_id: typeId,
      ...updates
    }, { onConflict: 'care_home_id,audit_type_id' });
  };

  const handleBack = () => {
    router.push("/dashboard/manager-audit/0");
  };

  const handleViewHistory = () => {
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
  };

  // Row Question Management
  const handleAddRowQuestion = async () => {
    if (!newQuestionText.trim()) {
      toast.error("Please enter a question");
      return;
    }
    const newQuestion: Question = {
      id: `row-q${Date.now()}`,
      text: newQuestionText,
      type: "text",
    };
    const updatedRowQuestions = [...rowQuestions, newQuestion];
    setRowQuestions(updatedRowQuestions);
    await upsertState('template-0', { row_questions: updatedRowQuestions });
    toast.success("Row added");
    setNewQuestionText("");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveRowQuestion = async (questionId: string) => {
    const updatedRowQuestions = rowQuestions.filter(q => q.id !== questionId);
    setRowQuestions(updatedRowQuestions);
    await upsertState('template-0', { row_questions: updatedRowQuestions });
    toast.success("Row removed");
  };

  // Column Question Management
  const handleAddColumnQuestion = async () => {
    if (!newQuestionText.trim()) {
      toast.error("Please enter a question");
      return;
    }
    const newQuestion: Question = {
      id: `col-q${Date.now()}`,
      text: newQuestionText,
      type: newQuestionType,
    };
    const updatedColumnQuestions = [...columnQuestions, newQuestion];
    setColumnQuestions(updatedColumnQuestions);
    await upsertState('template-0', { column_questions: updatedColumnQuestions });
    toast.success("Column added");
    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveColumnQuestion = async (questionId: string) => {
    const updatedColumnQuestions = columnQuestions.filter(q => q.id !== questionId);
    setColumnQuestions(updatedColumnQuestions);
    await upsertState('template-0', { column_questions: updatedColumnQuestions });
    toast.success("Column removed");
  };

  // Section Management
  const handleAddSection = async () => {
    const sectionText = prompt("Enter section title:");
    if (!sectionText?.trim()) return;

    const newSection: Question = {
      id: `section-${Date.now()}`,
      text: sectionText,
      type: "text",
      isSection: true
    };
    const updatedRowQuestions = [...rowQuestions, newSection];
    setRowQuestions(updatedRowQuestions);
    await upsertState('template-0', { row_questions: updatedRowQuestions });
    toast.success("Section added");
  };

  const handleUpdateSectionText = async (sectionId: string, text: string) => {
    const updatedRowQuestions = rowQuestions.map(q =>
      q.id === sectionId ? { ...q, text } : q
    );
    setRowQuestions(updatedRowQuestions);
    await upsertState('template-0', { row_questions: updatedRowQuestions });
  };

  // Dialog openers
  const openAddRowDialog = () => {
    setQuestionDialogMode("row");
    setNewQuestionText("");
    setIsQuestionDialogOpen(true);
  };

  const openAddColumnDialog = () => {
    setQuestionDialogMode("column");
    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(true);
  };

  // Answer Handling
  const handleGridAnswerChange = async (rowQuestionId: string, columnQuestionId: string, value: string) => {
    const existingAnswer = answers.find(a => a.residentId === rowQuestionId && a.questionId === columnQuestionId);
    let updatedAnswers;
    if (existingAnswer) {
      updatedAnswers = answers.map(a =>
        a.residentId === rowQuestionId && a.questionId === columnQuestionId ? { ...a, value } : a
      );
    } else {
      updatedAnswers = [...answers, { residentId: rowQuestionId, questionId: columnQuestionId, value }];
    }
    setAnswers(updatedAnswers);
    await upsertState(`resident-0-${residentId}`, { answers: updatedAnswers });
  };

  const getGridAnswer = (rowQuestionId: string, columnQuestionId: string) => {
    return answers.find(a => a.residentId === rowQuestionId && a.questionId === columnQuestionId);
  };

  // Fixed Column Handling
  const handleFixedColumnChange = async (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted', value: string) => {
    const updatedData = {
      ...fixedColumnData,
      [rowId]: {
        ...fixedColumnData[rowId],
        [field]: value
      }
    };
    setFixedColumnData(updatedData);
    await upsertState(`resident-0-${residentId}`, { fixed_column_data: updatedData });
  };

  const handleFixedColumnPatch = async (
    rowId: string,
    patch: {
      comment?: string;
      actionRequired?: string;
      actionCompleted?: string;
      rowStatus?: AttioStatus;
    }
  ) => {
    const updatedData = {
      ...fixedColumnData,
      [rowId]: {
        ...fixedColumnData[rowId],
        ...patch,
      },
    };
    setFixedColumnData(updatedData);
    await upsertState(`resident-0-${residentId}`, { fixed_column_data: updatedData });
  };

  const getFixedColumnValue = (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted') => {
    return fixedColumnData[rowId]?.[field] || '';
  };

  const gridProgress = useMemo(() => {
    const dataRows = rowQuestions.filter((q) => !q.isSection);
    if (dataRows.length === 0) {
      return { pct: 0, done: 0, total: 0 };
    }
    if (columnQuestions.length === 0) {
      let done = 0;
      const total = dataRows.length;
      for (const r of dataRows) {
        const rowData = fixedColumnData[r.id];
        if (
          (rowData?.comment && rowData.comment.trim()) ||
          (rowData?.actionRequired && rowData.actionRequired.trim()) ||
          (rowData?.actionCompleted && rowData.actionCompleted.trim())
        ) {
          done++;
        }
      }
      return { pct: total ? Math.round((done / total) * 100) : 0, done, total };
    }
    let done = 0;
    const total = dataRows.length * columnQuestions.length;
    for (const r of dataRows) {
      for (const c of columnQuestions) {
        const a = answers.find(
          (x) => x.residentId === r.id && x.questionId === c.id
        );
        if (a?.value != null && String(a.value).trim() !== "") done++;
      }
    }
    return { pct: total ? Math.round((done / total) * 100) : 0, done, total };
  }, [rowQuestions, columnQuestions, answers, fixedColumnData]);

  // Completion
  const handleCompleteAudit = async () => {
    if (rowQuestions.length === 0) {
      toast.error("Please add at least one row to the audit");
      return;
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('active_care_home_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
      .single();

    const chId = userProfile?.active_care_home_id;
    if (!chId || !resident?.organizationId) {
      toast.error("Missing context");
      return;
    }

    const auditCompletionData = {
      residentId: residentId,
      residentName: resident ? `${resident.firstName} ${resident.lastName}` : "Unknown",
      completedDate: new Date().toISOString(),
      auditor: profile?.name || profile?.email || "Unknown",
      rowQuestions: rowQuestions,
      columnQuestions: columnQuestions,
      answers: answers,
      fixedColumnData: fixedColumnData,
      status: 'completed'
    };

    // Save completed audit to Supabase history
    await supabase.from('manager_audit_history').insert({
      care_home_id: chId,
      organization_id: resident.organizationId,
      audit_type_id: `resident-0-${residentId}`,
      audit_type_name: `Care File Audit: ${auditCompletionData.residentName}`,
      completed_date: auditCompletionData.completedDate,
      auditor: auditCompletionData.auditor,
      entries_count: rowQuestions.filter(q => !q.isSection).length,
      notes: "Audit completed",
      data: auditCompletionData
    });

    // Clear current audit data for THIS resident only in Supabase
    await upsertState(`resident-0-${residentId}`, {
      answers: [],
      fixed_column_data: {}
    });

    toast.success("Audit completed!");
    router.push('/dashboard/manager-audit/0');
  };

  const openActionPlanDialog = (row?: Question) => {
    const itemText = row?.text?.trim();
    const sourceItemId = row?.id?.trim() || undefined;
    setActionPlanText(itemText ? `Follow up: ${itemText}` : "");
    setActionPlanSourceItemId(sourceItemId);
    actionPlanSourceItemIdRef.current = sourceItemId;
    setAssignedTo("");
    setAssignedToEmail("");
    setPriority("");
    setDueDate(undefined);
    setIsActionPlanDialogOpen(true);
  };

  const handleAddActionPlan = async () => {
    if (
      !actionPlanText.trim() ||
      !assignedTo ||
      !assignedToEmail ||
      !priority ||
      !dueDate
    ) {
      toast.error("Please fill all action plan fields");
      return;
    }

    if (!activeOrganizationId || !activeCareHomeId) {
      toast.error("Missing organization or care home context");
      return;
    }

    try {
      const sourceItemId =
        (actionPlanSourceItemIdRef.current ?? actionPlanSourceItemId)?.trim() ||
        undefined;
      const assigneeName =
        orgMembers.find((member) => member.id === assignedTo)?.name ||
        assignedToEmail;
      const residentName = resident
        ? `${resident.firstName ?? ""} ${resident.lastName ?? ""}`.trim()
        : "Unknown";

      const createdPlan = await auditService.createManagerActionPlan({
        audit_type_id: "0",
        description: actionPlanText.trim(),
        assigned_to: assignedTo,
        assigned_to_email: assignedToEmail,
        assigned_to_name: assigneeName,
        priority,
        due_date: dueDate.toISOString(),
        organization_id: activeOrganizationId,
        careHomeId: activeCareHomeId,
        resident_id: residentId,
        resident_name: residentName,
        created_by: profile?.id ?? profile?.email ?? null,
        created_by_name: profile?.name || profile?.email || "Manager",
        creatorId: profile?.id,
        source_item_id: sourceItemId,
      });

      const nextPlan = mapManagerQuestionActionPlan({
        ...createdPlan,
        source_item_id: sourceItemId,
        assigned_to_name: assigneeName,
      } as Record<string, unknown>);
      setActionPlans((current) => [...current, nextPlan]);
      setIsActionPlanDialogOpen(false);
      setActionPlanText("");
      setActionPlanSourceItemId(undefined);
      actionPlanSourceItemIdRef.current = undefined;
      setAssignedTo("");
      setAssignedToEmail("");
      setPriority("");
      setDueDate(undefined);
      window.dispatchEvent(new Event("sidebar-counts-refresh"));
      toast.success("Action plan added");
    } catch (error) {
      console.error("Error creating action plan:", error);
      toast.error("Failed to add action plan");
    }
  };

  const handleRemoveActionPlan = async (planId: string) => {
    try {
      await auditService.deleteManagerActionPlan(planId);
      setActionPlans((current) => current.filter((plan) => plan.id !== planId));
      window.dispatchEvent(new Event("sidebar-counts-refresh"));
      toast.success("Action plan removed");
    } catch (error) {
      console.error("Error removing action plan:", error);
      toast.error("Failed to remove action plan");
    }
  };

  const getAnswerColor = (value?: string) => {
    if (!value) return "text-muted-foreground";
    if (value === "yes" || value === "compliant") return "text-emerald-600 font-medium dark:text-emerald-400";
    if (value === "action-required") return "text-amber-700 font-medium dark:text-amber-300";
    if (value === "no" || value === "non-compliant") return "text-destructive font-medium";
    if (value === "not-applicable") return "text-muted-foreground font-medium";
    return "";
  };

  const residentDisplayName = resident
    ? `${resident.firstName} ${resident.lastName}`.trim()
    : "";
  const initials = resident
    ? `${resident.firstName?.[0] ?? ""}${resident.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const auditSections = useMemo<AuditSection[]>(() => {
    const sections: AuditSection[] = DEFAULT_AUDIT_SECTIONS.map((section) => ({
      ...section,
      rows: [...section.rows],
    }));
    let current: AuditSection | null = null;

    rowQuestions.forEach((row) => {
      if (row.isSection) {
        current = {
          id: row.id,
          number: String(sections.length + 1),
          name: row.text || `Section ${sections.length + 1}`,
          depth: 0,
          rows: [],
        };
        sections.push(current);
        return;
      }

      if (!current) {
        current = sections.find((section) => section.id === "default-general") ?? null;
      }

      current?.rows.push(row);
    });

    return sections;
  }, [rowQuestions]);

  const [activeSectionId, setActiveSectionId] = useState("default");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    const firstSection = auditSections[0];
    if (!auditSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(firstSection?.id ?? "default");
      setSelectedRowId(firstSection?.rows[0]?.id ?? null);
      return;
    }

    const active = auditSections.find((section) => section.id === activeSectionId);
    const rows = active
      ? active.rows.length > 0
        ? active.rows
        : auditSections
            .filter((section) => section.parentId === active.id)
            .flatMap((section) => section.rows)
      : [];
    if (rows.length && !rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(rows[0].id);
    }
  }, [auditSections, activeSectionId, selectedRowId]);

  const activeSection =
    auditSections.find((section) => section.id === activeSectionId) ??
    auditSections[0];

  const getSectionRows = (section: AuditSection | undefined) => {
    if (!section) return [];
    if (section.rows.length > 0) return section.rows;
    return auditSections
      .filter((candidate) => candidate.parentId === section.id)
      .flatMap((candidate) => candidate.rows);
  };

  const activeRows = getSectionRows(activeSection);
  const selectedRow =
    activeRows.find((row) => row.id === selectedRowId) ?? activeRows[0];

  const getRowSource = (row: Question | undefined) => {
    if (!row) return null;
    if (row.sourceFolderKey) {
      return {
        folderKey: row.sourceFolderKey,
        label: row.sourceLabel ?? "Care file",
      };
    }

    const owningSection = auditSections.find((section) =>
      section.rows.some((sectionRow) => sectionRow.id === row.id)
    );
    const folderKey = owningSection?.sourceFolderKey;
    if (!folderKey) return null;

    return {
      folderKey,
      label: owningSection.sourceLabel ?? owningSection.name,
    };
  };

  const openRowSource = (row: Question | undefined) => {
    const source = getRowSource(row);
    if (!source) return;
    router.push(
      `/dashboard/residents/${residentId}/care-file-v2/${source.folderKey}` as Route
    );
  };

  const statusColumn = columnQuestions.find((q) => q.type !== "text");

  const normalizeStatus = (value?: string): AttioStatus => {
    if (value === "compliant" || value === "yes") return "compliant";
    if (value === "action-required") return "action-required";
    if (value === "non-compliant" || value === "no") return "non-compliant";
    if (value === "not-applicable") return "not-applicable";
    return "not-reviewed";
  };

  const getRowStatus = (rowId: string): AttioStatus => {
    if (!statusColumn) {
      const rowData = fixedColumnData[rowId];
      const stored = rowData?.rowStatus;
      if (
        stored === "compliant" ||
        stored === "action-required" ||
        stored === "non-compliant" ||
        stored === "not-applicable" ||
        stored === "not-reviewed"
      ) {
        return stored;
      }
      if (rowData?.actionRequired?.trim()) return "action-required";
      if (
        rowData?.comment?.trim() ||
        rowData?.actionCompleted?.trim()
      ) {
        return "compliant";
      }
      return "not-reviewed";
    }

    const answer = getGridAnswer(rowId, statusColumn.id);
    return normalizeStatus(answer?.value);
  };

  const setRowStatus = async (row: Question, status: AttioStatus) => {
    if (status === "action-required") {
      const actionText =
        getFixedColumnValue(row.id, "actionRequired") || "Action required";
      if (statusColumn) {
        await handleFixedColumnChange(row.id, "actionRequired", actionText);
        await handleGridAnswerChange(row.id, statusColumn.id, "non-compliant");
      } else {
        await handleFixedColumnPatch(row.id, {
          actionRequired: actionText,
          rowStatus: "action-required",
        });
      }
      return;
    }

    if (!statusColumn) {
      if (status === "not-reviewed") {
        await handleFixedColumnPatch(row.id, {
          comment: "",
          actionRequired: "",
          actionCompleted: "",
          rowStatus: "not-reviewed",
        });
        return;
      }

      if (status === "compliant") {
        await handleFixedColumnPatch(row.id, {
          comment: getFixedColumnValue(row.id, "comment") || "Reviewed",
          actionRequired: "",
          rowStatus: "compliant",
        });
        return;
      }

      if (status === "non-compliant") {
        await handleFixedColumnPatch(row.id, {
          actionRequired:
            getFixedColumnValue(row.id, "actionRequired") || "Non-compliant",
          rowStatus: "non-compliant",
        });
        return;
      }

      await handleFixedColumnPatch(row.id, {
        comment: getFixedColumnValue(row.id, "comment") || "N/A",
        actionRequired: "",
        rowStatus: "not-applicable",
      });
      return;
    }

    if (statusColumn) {
      const value =
        statusColumn.type === "yesno"
          ? status === "compliant"
            ? "yes"
            : status === "non-compliant"
              ? "no"
              : ""
          : status === "not-reviewed"
            ? ""
            : status;
      await handleGridAnswerChange(row.id, statusColumn.id, value);
    }
  };

  const cycleRowStatus = async (row: Question) => {
    const current = getRowStatus(row.id);
    const next =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    await setRowStatus(row, next);
  };

  const statusLabel = (status: AttioStatus) => {
    if (status === "compliant") return "Compliant";
    if (status === "action-required") return "Action required";
    if (status === "non-compliant") return "Non-compliant";
    if (status === "not-applicable") return "N/A";
    return "Not reviewed";
  };

  const statusPillClass = (status: AttioStatus) => {
    if (status === "compliant") {
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300";
    }
    if (status === "action-required") {
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100";
    }
    if (status === "non-compliant") {
      return "bg-destructive/15 text-destructive";
    }
    return "bg-muted text-muted-foreground";
  };

  const actionPlanStatusLabel = (status?: string) => {
    const normalized = (status || "pending").replace(/-/g, "_");
    if (normalized === "in_progress") return "In progress";
    if (normalized === "completed") return "Completed";
    if (normalized === "overdue") return "Overdue";
    return "Pending";
  };

  const actionPlanStatusClass = (status?: string) => {
    const normalized = (status || "pending").replace(/-/g, "_");
    if (normalized === "completed") {
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300";
    }
    if (normalized === "in_progress") {
      return "bg-sky-100 text-sky-900 dark:bg-sky-950/45 dark:text-sky-300";
    }
    if (normalized === "overdue") {
      return "bg-destructive/15 text-destructive";
    }
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100";
  };

  const statusGlyph = (status: AttioStatus) => {
    if (status === "not-reviewed") {
      return <span className="inline-flex size-4 rounded border border-border" />;
    }

    const glyphClass =
      "inline-flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-semibold";

    if (status === "compliant") {
      return (
        <span className={`${glyphClass} bg-emerald-600 text-white`}>
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      );
    }
    if (status === "action-required") {
      return (
        <span className={`${glyphClass} bg-amber-600 text-white`}>
          <AlertCircle className="size-2.5" strokeWidth={3} />
        </span>
      );
    }
    if (status === "non-compliant") {
      return (
        <span className={`${glyphClass} bg-destructive text-destructive-foreground`}>
          <X className="size-2.5" strokeWidth={3} />
        </span>
      );
    }

    return (
      <span className={`${glyphClass} bg-muted text-muted-foreground`}>–</span>
    );
  };

  const sectionStats = (section: AuditSection) => {
    let reviewed = 0;
    let hasFlag = false;
    const rows = getSectionRows(section);
    rows.forEach((row) => {
      const status = getRowStatus(row.id);
      if (status !== "not-reviewed") reviewed++;
      if (status === "action-required" || status === "non-compliant") {
        hasFlag = true;
      }
    });
    return { reviewed, total: rows.length, hasFlag };
  };

  const attioProgress = useMemo(() => {
    const rows = auditSections.flatMap((section) => section.rows);
    let reviewed = 0;
    let compliant = 0;
    let actionRequired = 0;
    let nonCompliant = 0;

    rows.forEach((row) => {
      const status = getRowStatus(row.id);
      if (status !== "not-reviewed") reviewed++;
      if (status === "compliant") compliant++;
      if (status === "action-required") actionRequired++;
      if (status === "non-compliant") nonCompliant++;
    });

    return {
      reviewed,
      total: rows.length,
      compliant,
      actionRequired,
      nonCompliant,
      pct: rows.length ? Math.round((reviewed / rows.length) * 100) : 0,
    };
  }, [auditSections, answers, fixedColumnData, statusColumn]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading audit...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col bg-background pb-8">
      <div className="mx-auto w-full max-w-[1400px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Top */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Breadcrumb className="min-w-0 text-muted-foreground">
              <BreadcrumbList className="flex-wrap text-xs sm:text-sm sm:gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={"/dashboard/manager-audit/0" as Route}>
                      Care file audit
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="max-w-[180px] truncate sm:max-w-[320px]">
                  <BreadcrumbPage className="font-medium text-foreground">
                    {residentDisplayName}
                    {resident?.roomNumber ? ` · Rm ${resident.roomNumber}` : ""}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleViewHistory}>
              <History className="mr-2 h-4 w-4" /> View history
            </Button>
            <Button size="sm" onClick={handleCompleteAudit}>
              Complete audit
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={resident?.imageUrl} alt="" />
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-base font-medium leading-tight text-foreground">
                Care file audit · {residentDisplayName || "Resident"}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                CareO · Care file audit
                {resident?.roomNumber ? ` · Room ${resident.roomNumber}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          <span>
            {attioProgress.total > 0
              ? `${attioProgress.reviewed} of ${attioProgress.total} items complete`
              : "Add checklist items to begin"}
          </span>
          <div className="h-1 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-500"
              style={{ width: `${attioProgress.pct}%` }}
            />
          </div>
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {attioProgress.compliant} compliant
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-amber-800 dark:text-amber-200">
              {attioProgress.actionRequired} action required
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-destructive">
              {attioProgress.nonCompliant} non-compliant
            </span>
          </span>
        </div>

        {/* Attio-style audit workspace */}
        <div className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          <aside className="border-b border-border bg-background text-[13px] lg:border-b-0 lg:border-r">
            <div className="px-2 py-3">
              <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                Sections
              </p>
              <nav className="space-y-2">
                {auditSections.map((section) => {
                  const stats = sectionStats(section);
                  const isActive = section.id === activeSectionId;
                  const ratioClass =
                    stats.total > 0 && stats.reviewed === stats.total
                      ? "text-emerald-600 dark:text-emerald-400"
                      : stats.hasFlag
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground";

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setActiveSectionId(section.id);
                        const rows = getSectionRows(section);
                        setSelectedRowId(rows[0]?.id ?? null);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 text-left transition-colors ${
                        section.depth === 1
                          ? "ml-3.5 border-l border-border/80 py-[5px] pl-3 text-xs"
                          : "py-1.5 text-[13px]"
                      } ${
                        isActive
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {section.number} · {section.name}
                      </span>
                      {section.depth === 1 && stats.hasFlag ? (
                        <span
                          className="shrink-0 text-amber-700 dark:text-amber-400"
                          aria-hidden
                        >
                          ●
                        </span>
                      ) : null}
                      <span className={`shrink-0 text-[11px] tabular-nums ${ratioClass}`}>
                        {stats.total ? `${stats.reviewed}/${stats.total}` : "—"}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="border-b border-border bg-muted/30 px-[18px] py-[18px] lg:border-b-0">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                  Section {activeSection?.number ?? "1"}
                </p>
                <h2 className="text-lg font-medium text-foreground">
                  {activeSection?.name ?? "General"}
                </h2>
              </div>
              <div className="text-xs text-muted-foreground">
                Linked folder ·{" "}
                {activeSection?.sourceFolderKey ? (
                  <button
                    type="button"
                    onClick={() => openRowSource(activeRows[0])}
                    className="font-medium text-primary hover:underline"
                  >
                    {activeSection.sourceLabel ?? activeSection.name}
                  </button>
                ) : (
                  <span className="font-medium text-primary">
                    {activeSection?.name ?? "Care file"}
                  </span>
                )}
              </div>
            </div>

            <p className="mb-[14px] mt-1 max-w-xl text-[13px] text-muted-foreground">
              Click any row to open it on the right. Click the status pill to
              cycle through Compliant → Action required → Non-compliant → N/A.
            </p>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid grid-cols-[28px_minmax(0,1fr)_130px_130px] items-center gap-2 border-b border-border bg-muted px-[14px] py-2.5 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                <span />
                <span>Item</span>
                <span>Status</span>
                <span className="text-right">Source</span>
              </div>
              {activeRows.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No checklist items in this section. Use Add row below to add one.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeRows.map((row) => {
                    const status = getRowStatus(row.id);
                    const isSelected = row.id === selectedRow?.id;
                    const source = getRowSource(row);
                    return (
                      <div
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedRowId(row.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedRowId(row.id);
                          }
                        }}
                        className={`grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_130px_130px] items-center gap-2 px-[14px] py-3 transition-colors hover:bg-muted ${
                          status === "action-required"
                            ? "bg-amber-500/5"
                            : status === "non-compliant"
                              ? "bg-destructive/5"
                              : ""
                        } ${isSelected ? "bg-muted" : ""}`}
                      >
                        {statusGlyph(status)}
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-foreground">
                            {row.text}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void cycleRowStatus(row);
                            setSelectedRowId(row.id);
                          }}
                          className={`keep-interactive w-fit rounded-full px-2 py-0.5 text-[11px] ${statusPillClass(status)}`}
                        >
                          {statusLabel(status)}
                        </button>
                        {source ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRowSource(row);
                            }}
                            className="truncate text-right text-xs font-medium text-primary hover:underline"
                            title={`Open ${source.label}`}
                          >
                            {source.label} ↗
                          </button>
                        ) : (
                          <span className="truncate text-right text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={openAddRowDialog}>
                <Plus className="mr-1 size-3.5" />
                Add custom item
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAddSection}>
                <Plus className="mr-1 size-3.5" />
                Add section
              </Button>
            </div>
          </main>

          <aside className="relative z-10 border-t border-border bg-background lg:border-l lg:border-t-0">
            <div className="p-4">
              {!selectedRow ? (
                <p className="text-xs text-muted-foreground">No item selected.</p>
              ) : (
                <>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                    Selected item
                  </p>
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {selectedRow.text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Section {activeSection?.number} · {activeSection?.name}
                  </p>

                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] text-muted-foreground">
                      Status
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["compliant", "action-required", "non-compliant", "not-applicable"] as const).map((status) => {
                        const selected = getRowStatus(selectedRow.id) === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            className={`keep-interactive rounded-full border px-2.5 py-1 text-[11px] ${
                              selected
                                ? `${statusPillClass(status)} border-transparent`
                                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void setRowStatus(selectedRow, status);
                            }}
                          >
                            {statusLabel(status)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] text-muted-foreground">
                      Action required
                    </div>
                    <Textarea
                      value={getFixedColumnValue(selectedRow.id, "actionRequired")}
                      onChange={(event) =>
                        handleFixedColumnChange(selectedRow.id, "actionRequired", event.target.value)
                      }
                      placeholder="Action required..."
                      className="min-h-[64px] resize-y text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-8 w-full justify-start text-xs"
                      onClick={() => openActionPlanDialog(selectedRow)}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Add action plan
                    </Button>
                    {actionPlans.filter(
                      (plan) =>
                        plan.sourceItemId?.trim() === selectedRow.id.trim()
                    ).length > 0 ? (
                      <ul className="mt-3 space-y-2 border-t border-border pt-3">
                        {actionPlans
                          .filter(
                            (plan) =>
                              plan.sourceItemId?.trim() === selectedRow.id.trim()
                          )
                          .map((plan) => (
                            <li
                              key={plan.id}
                              className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-foreground">
                                    {plan.description}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-muted-foreground">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${actionPlanStatusClass(plan.status)}`}
                                    >
                                      {actionPlanStatusLabel(plan.status)}
                                    </span>
                                    {plan.assignedToName}
                                    {plan.dueDate ? (
                                      <span>
                                        due {format(plan.dueDate, "dd MMM yyyy")}
                                      </span>
                                    ) : null}
                                  </div>
                                  {plan.latestComment ? (
                                    <div className="mt-1 rounded-md bg-background/70 px-2 py-1 text-muted-foreground">
                                      Comment: {plan.latestComment}
                                    </div>
                                  ) : null}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 shrink-0 text-destructive"
                                  onClick={() => handleRemoveActionPlan(plan.id)}
                                  aria-label="Remove action plan"
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    ) : null}
                  </div>

                  {getRowSource(selectedRow) ? (
                    <div className="mt-4">
                      <div className="mb-1.5 text-[11px] text-muted-foreground">
                        Linked records
                      </div>
                      <button
                        type="button"
                        onClick={() => openRowSource(selectedRow)}
                        className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-xs text-foreground hover:bg-muted"
                      >
                        <span>{getRowSource(selectedRow)?.label}</span>
                        <span className="text-muted-foreground">↗</span>
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                    Last edited in current audit draft
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>

        {/* Grid */}
        <div className="hidden overflow-auto bg-muted/15 px-2 py-4 sm:px-4">
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/40">
                  <TableHead className="sticky left-0 z-10 w-[250px] border-r border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Questions
                  </TableHead>
                  {columnQuestions.map((q) => (
                    <TableHead
                      key={q.id}
                      className="max-w-[180px] min-w-[140px] border-r border-border bg-muted/40 text-xs font-semibold text-foreground last:border-r-0"
                    >
                      <div className="flex items-center justify-between gap-1 px-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex-1 cursor-help truncate text-xs leading-tight">
                              {q.text.length > 20
                                ? `${q.text.substring(0, 20)}…`
                                : q.text}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{q.text}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveColumnQuestion(q.id)}
                          className="h-6 w-6 shrink-0 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[200px] border-r border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Action required
                  </TableHead>
                  <TableHead className="sticky right-0 z-10 w-[60px] border-l border-border bg-muted/40">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={openAddColumnDialog}
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">Add column</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowQuestions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columnQuestions.length + 3}
                      className="h-28 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <p className="text-sm">No questions yet.</p>
                        <p className="text-xs">
                          Use &ldquo;Add row&rdquo; and &ldquo;Add section&rdquo; below, and + to add columns.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {rowQuestions.map((rowQ) => {
                  if (rowQ.isSection) {
                    return (
                      <TableRow
                        key={rowQ.id}
                        className="border-y border-border bg-muted/50 transition-colors hover:bg-muted/60"
                      >
                        <TableCell
                          colSpan={columnQuestions.length + 3}
                          className="sticky left-0 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={rowQ.text}
                              onChange={(e) =>
                                handleUpdateSectionText(rowQ.id, e.target.value)
                              }
                              placeholder="Section title…"
                              className="h-10 border-none bg-transparent text-base font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRowQuestion(rowQ.id)}
                              className="h-8 w-8 shrink-0 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={rowQ.id}
                      className="border-border transition-colors hover:bg-muted/20"
                    >
                      <TableCell className="sticky left-0 z-[1] border-r border-border bg-card font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex-1 cursor-help truncate text-sm">
                                {rowQ.text.length > 30
                                  ? `${rowQ.text.substring(0, 30)}…`
                                  : rowQ.text}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{rowQ.text}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRowQuestion(rowQ.id)}
                            className="h-6 w-6 shrink-0 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      {columnQuestions.map((colQ) => {
                        const answer = getGridAnswer(rowQ.id, colQ.id);

                        return (
                          <TableCell
                            key={colQ.id}
                            className="border-r border-border px-2 py-3"
                          >
                            {colQ.type === "text" ? (
                              <Input
                                value={answer?.value || ""}
                                onChange={(e) =>
                                  handleGridAnswerChange(
                                    rowQ.id,
                                    colQ.id,
                                    e.target.value
                                  )
                                }
                                placeholder="…"
                                className="h-8 w-full border-none bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            ) : (
                              <Select
                                value={
                                  answer?.value && answer.value.trim() !== ""
                                    ? answer.value
                                    : undefined
                                }
                                onValueChange={(val) =>
                                  handleGridAnswerChange(rowQ.id, colQ.id, val)
                                }
                              >
                                <SelectTrigger
                                  className={`h-8 w-full border-none bg-transparent text-sm shadow-none focus:ring-1 ${getAnswerColor(answer?.value)}`}
                                >
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  {colQ.type === "yesno" ? (
                                    <>
                                      <SelectItem
                                        value="yes"
                                        className="font-medium text-emerald-600"
                                      >
                                        Yes
                                      </SelectItem>
                                      <SelectItem
                                        value="no"
                                        className="font-medium text-destructive"
                                      >
                                        No
                                      </SelectItem>
                                    </>
                                  ) : (
                                    <>
                                      <SelectItem
                                        value="compliant"
                                        className="font-medium text-emerald-600"
                                      >
                                        Compliant
                                      </SelectItem>
                                      <SelectItem
                                        value="action-required"
                                        className="font-medium text-amber-700 dark:text-amber-300"
                                      >
                                        Action required
                                      </SelectItem>
                                      <SelectItem
                                        value="non-compliant"
                                        className="font-medium text-destructive"
                                      >
                                        Non-compliant
                                      </SelectItem>
                                      <SelectItem
                                        value="not-applicable"
                                        className="font-medium text-muted-foreground"
                                      >
                                        N/A
                                      </SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="border-r border-border bg-muted/10 px-2 py-3">
                        <Input
                          value={getFixedColumnValue(rowQ.id, "actionRequired")}
                          onChange={(e) =>
                            handleFixedColumnChange(
                              rowQ.id,
                              "actionRequired",
                              e.target.value
                            )
                          }
                          placeholder="Action required…"
                          className="h-8 w-full border-none bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </TableCell>
                      <TableCell className="sticky right-0 z-[1] border-l border-border bg-card" />
                    </TableRow>
                  );
                })}

                <TableRow className="border-t-2 border-border hover:bg-muted/20">
                  <TableCell
                    colSpan={columnQuestions.length + 3}
                    className="bg-card p-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openAddRowDialog}
                        className="h-8 flex-1 sm:flex-none"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add row
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddSection}
                        className="h-8 flex-1 sm:flex-none"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add section
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog
        open={isActionPlanDialogOpen}
        onOpenChange={(open) => {
          setIsActionPlanDialogOpen(open);
          if (!open) {
            setActionPlanSourceItemId(undefined);
            actionPlanSourceItemIdRef.current = undefined;
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add action plan</DialogTitle>
            <DialogDescription>
              Assign a task to address the selected care-file audit item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Textarea
                value={actionPlanText}
                onChange={(event) => setActionPlanText(event.target.value)}
                placeholder="What needs to be done?"
                className="min-h-[84px] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select
                value={assignedToEmail}
                onValueChange={(value) => {
                  setAssignedToEmail(value);
                  const member = orgMembers.find((item) => item.email === value);
                  if (member) setAssignedTo(member.id);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {orgMembers.map((member) => (
                    <SelectItem key={member.email} value={member.email}>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={member.image_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                            {(member.name?.[0] || member.email[0]).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Popover
                open={dueDatePopoverOpen}
                onOpenChange={setDueDatePopoverOpen}
                modal
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      if (date) {
                        setDueDate(date);
                        setDueDatePopoverOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionPlanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddActionPlan}>Add action plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Dialog for Adding Rows/Columns */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {questionDialogMode === "row" ? "Add Row Question" : "Add Column Question"}
            </DialogTitle>
            <DialogDescription>
              {questionDialogMode === "row"
                ? "This will appear as a new row on the left side"
                : "This will appear as a new column header"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Question</Label>
              <Input
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="col-span-3"
                placeholder={questionDialogMode === "row" ? "Enter row question..." : "Enter column question..."}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (questionDialogMode === "row") {
                      handleAddRowQuestion();
                    } else {
                      handleAddColumnQuestion();
                    }
                  }
                }}
              />
            </div>
            {questionDialogMode === "column" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Type</Label>
                <Select value={newQuestionType} onValueChange={(val: any) => setNewQuestionType(val)}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliance">Compliance (C/NC/NA)</SelectItem>
                    <SelectItem value="yesno">Yes/No</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={questionDialogMode === "row" ? handleAddRowQuestion : handleAddColumnQuestion}>
              Add {questionDialogMode === "row" ? "Row" : "Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRoleGuard(ResidentCareFileAuditPage, ["manager", "admin", "owner"]);
