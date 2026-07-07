"use client";
import React from "react";
import type { Route } from "next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { CareFileFormKey } from "@/types/care-files";
import { Resident } from "@/types";
import { canEditOverview } from "@/lib/permissions";
import { FEATURES } from "@/lib/config/features";
import { config } from "@/config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateResidentDialog from "@/components/residents/CreateResidentDialog";
import {
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  Clock,
  User,
  FileText,
  Users,
  Edit3,
  Bell,
  X,
  Search,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Printer,
  FolderIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatTimestampToUKDateTime } from "@/lib/date-utils";
import { subDays } from "date-fns";
import { toast } from "sonner";

function formatDOB(dob: any): string {
  if (!dob) return "N/A";
  
  // If it's a timestamp (string or number)
  const timestamp = Number(dob);
  if (!isNaN(timestamp) && timestamp > 0) {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  
  // If it's a date string (like "1986-04-06")
  const date = new Date(dob);
  if (!isNaN(date.getTime())) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  
  return String(dob);
}
import {
  computeFoodFluidComplianceInWindow,
  FOOD_FLUID_ALERT_WINDOW_MS,
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
} from "@/lib/food-fluid-log-classification";
import { URINE_NOT_RECORDED_6H_ALERT_TYPE } from "@/lib/continence-alerts";
import { PRN_PROTOCOL_PENDING_12H_ALERT_TYPE } from "@/lib/medication-alerts";
import {
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
  carePlanEvaluationAlertCareFileHref,
  carePlanEvaluationAlertFolderLabel,
  extractRawCareFileFolderKeyFromGoals,
} from "@/lib/care-plan-evaluation-alerts";
import { FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE } from "@/lib/form-review-alerts";
import { formReviewAlertCareFileHref } from "@/lib/form-review-alert-navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from "recharts";

const NON_DISMISSIBLE_ALERT_TYPES = new Set<string>([
  "resident_photo_refresh_required",
  "bowel_not_recorded_3_days",
  "weight_check_due_tomorrow",
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
  URINE_NOT_RECORDED_6H_ALERT_TYPE,
  PRN_PROTOCOL_PENDING_12H_ALERT_TYPE,
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
  FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE,
]);
const NURSE_ONLY_ALERT_TYPES = new Set<string>([
  "resident_photo_refresh_required",
  "bowel_not_recorded_3_days",
  PRN_PROTOCOL_PENDING_12H_ALERT_TYPE,
  CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE,
  CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE,
  FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE,
]);
const NURSE_AND_CARE_ASSISTANT_ALERT_TYPES = new Set<string>([
  "weight_check_due_tomorrow",
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
  URINE_NOT_RECORDED_6H_ALERT_TYPE,
]);

const TIME_CONFIG = {
  immediate: { label: "On the Day of Admission (Immediate)", color: "#16a34a" },
  "6hours": { label: "Within 6 Hours of Admission", color: "#2563eb" },
  "24hours": { label: "Within 24 Hours of Admission", color: "#f59e0b" },
  "48hours": { label: "Within 48 Hours of Admission", color: "#ef4444" },
  "5days": { label: "Within 5 Days of Admission", color: "#7c3aed" },
  ongoing: { label: "Ongoing", color: "#0d9488" }
};

const AUDIT_TIMELINE_DAYS = 30;

// --- DEFAULT DATA FOR SEEDING ---
const DEFAULT_TASKS = [
  { timeframe: 'immediate', title: 'Pre-Admission Assessment completed and filed', form: 'Pre-Admission Assessment Form', status: 'pending' },
  { timeframe: 'immediate', title: 'ID & Documents Verified', status: 'pending' },
  { timeframe: 'immediate', title: 'Prepare resident folder (index, dividers, preadmission info)', status: 'pending' },
  { timeframe: 'immediate', title: 'Inform next of kin if resident arrives unaccompanied', status: 'pending' },
  { timeframe: 'immediate', title: 'Resident welcomed – drinks/meals offered, tour arranged, introduced to staff & residents', status: 'pending' },
  { timeframe: 'immediate', title: 'Ensure NOK is involved if present', status: 'pending' },
  { timeframe: 'immediate', title: 'Infection Prevention Control Pre-Admission Assessment', form: 'Infection Prevention Control Pre-Admission Assessment', status: 'pending' },
  { timeframe: 'immediate', title: 'Confirm adequate medication supply for current cycle', status: 'pending' },
  { timeframe: 'immediate', title: 'Complete Kardex and MAR sheet', status: 'pending' },
  { timeframe: 'immediate', title: 'Room & Environment Check', status: 'pending' },
  { timeframe: 'immediate', title: 'Emergency Contact confirmed and recorded', status: 'pending' },

  { timeframe: '6hours', title: 'Baseline observations recorded (Nursing Units)', form: 'Admission Assessment', status: 'pending' },
  { timeframe: '6hours', title: 'Weight recorded and MUST Score calculated', form: 'MUST Assessment', status: 'pending' },
  { timeframe: '6hours', title: 'Complete Body Map (skin condition on admission)', status: 'pending' },
  { timeframe: '6hours', title: 'Medication Reconciliation', status: 'pending' },

  { timeframe: '24hours', title: 'PEEP updated and fire list updated', form: 'PEEP (Personal Emergency Evacuation Plan) + Evaluation', status: 'pending' },
  { timeframe: '24hours', title: 'General Risk Assessment completed', form: 'General Risk Assessment', status: 'pending' },
  { timeframe: '24hours', title: 'Fall Risk Assessment completed', form: 'Fall Risk Assessment', status: 'pending' },
  { timeframe: '24hours', title: 'Moving and Handling Assessment completed', form: 'Moving and Handling Assessment', status: 'pending' },
  { timeframe: '24hours', title: 'Dependency Assessment completed', form: 'Dependency Assessment', status: 'pending' },
  { timeframe: '24hours', title: 'Braden Risk Assessment (pressure area)', form: 'Braden Risk Assessment', status: 'pending' },
  { timeframe: '24hours', title: 'Bedrail Risk Assessment (if applicable)', form: 'Bedrail Risk Assessment', status: 'pending' },
  { timeframe: '24hours', title: 'Cornell Scale for Depression in Dementia completed', form: 'Cornell Scale for Depression in Dementia', status: 'pending' },
  { timeframe: '24hours', title: 'Bladder and Bowel Continence Assessment', form: 'Bladder and Bowel Continence Assessment', status: 'pending' },
  { timeframe: '24hours', title: 'Choking Risk Assessment completed', form: 'Choking Risk Assessment + Monthly Review', status: 'pending' },
  { timeframe: '24hours', title: 'Wound care: dressings checked, photographs of wounds taken', status: 'pending' },
  { timeframe: '24hours', title: 'Complete property list (valuables, jewellery, cash)', form: 'Resident Valuables and Personal Property Record', status: 'pending' },
  { timeframe: '24hours', title: 'Resident registered with local GP surgery', status: 'pending' },
  { timeframe: '24hours', title: 'Pharmacy informed of new admission', status: 'pending' },
  { timeframe: '24hours', title: 'GP Notified of admission', status: 'pending' },
  { timeframe: '24hours', title: 'Relative / POA Contacted', status: 'pending' },

  { timeframe: '48hours', title: 'Full Nutritional Assessment', form: 'Nutrition Assessment + Monthly Review', status: 'pending' },
  { timeframe: '48hours', title: 'Oral Health Assessment', form: 'Oral Assessment + Monthly Review', status: 'pending' },
  { timeframe: '48hours', title: 'Pain Assessment completed', form: 'Pain Assessment', status: 'pending' },
  { timeframe: '48hours', title: 'Personal Profile "This Is My Life" completed', form: 'Personal Profile', status: 'pending' },
  { timeframe: '48hours', title: 'Smoking Risk Assessment (if applicable)', form: 'Smoking Risk Assessment', status: 'pending' },
  { timeframe: '48hours', title: 'Fire Risk Assessment', status: 'pending' },
  { timeframe: '48hours', title: 'Pressure Area Care Plan initiated', status: 'pending' },

  { timeframe: '5days', title: 'All care plans implemented (most important from day 1)', status: 'pending' },
  { timeframe: '5days', title: 'Photographic Consent obtained', form: 'Photographic Consent Form', status: 'pending' },
  { timeframe: '5days', title: 'Capacity and Consent assessment completed', form: 'Capacity and Consent', status: 'pending' },
  { timeframe: '5days', title: 'Night Observation Consent obtained', form: 'Night Observation Consent', status: 'pending' },
  { timeframe: '5days', title: 'Best Interest Decision (if applicable)', form: 'Best Interest Decision Form', status: 'pending' },
  { timeframe: '5days', title: 'Consent and Risk Assessment for Restraints (if applicable)', form: 'Consent and Risk Assessment for Restraints', status: 'pending' },
  { timeframe: '5days', title: 'Data sharing consent obtained', status: 'pending' },
  { timeframe: '5days', title: 'Rehabilitation Plan (if applicable)', status: 'pending' },
  { timeframe: '5days', title: 'Care Review Meeting scheduled/held', status: 'pending' },
  { timeframe: '5days', title: 'Activities Assessment completed', status: 'pending' },

  { timeframe: 'ongoing', title: 'Monitor & Review Care Plan', status: 'ongoing' },
  { timeframe: 'ongoing', title: 'Regular Risk Reviews', status: 'ongoing' },
  { timeframe: 'ongoing', title: 'Key Worker Diary updated', form: 'Key Worker Diary', status: 'ongoing' },
  { timeframe: 'ongoing', title: 'Progress Notes recorded', form: 'Progress Notes', status: 'ongoing' }
];

const DEFAULT_AUDITS: any[] = [];

const DEFAULT_CARE_PLANS = [
  {
    title: 'Moving & Handling Care Plan',
    need_identified: 'Hazel has reduced mobility due to arthritis in both knees and mild right-sided weakness following a TIA in 2023. She requires assistance with transfers and is at risk of falls. She uses a wheeled Zimmer frame for short distances. She has expressed a wish to remain as independent as possible.',
    aims: 'To support Hazel to move safely and comfortably, maximising her independence while minimising risk of injury to herself and care staff. To ensure all manual handling is carried out in accordance with the Moving and Handling Assessment and Resident Handling Profile.',
    wishes: 'Hazel prefers to be asked before any assistance is given. She likes to do as much as she can herself and should be given adequate time. She is embarrassed by falls and should be reassured privately if an incident occurs. She prefers female carers for personal care.',
    author: 'Emma Wilson',
    dateWritten: '2025-10-10T16:00:00Z',
    carePlanNumber: 'CP-MH-01',
    badges: [{ label: 'Mobility', bg: '#dbeafe', color: '#1d4ed8' }, { label: 'High Priority', bg: '#fee2e2', color: '#dc2626' }],
    nextReviewDate: '2025-11-10',
    status: 'active',
    interventions: [
      { details: "Transfers (bed to chair): Use of Sara Stedy transfer aid; 1 carer assist", date: "2025-10-10T00:00:00Z", time: "Morning, Afternoon, Evening", signature: "Emma Wilson" },
      { details: "Repositioning in bed: Manual turn with slide sheet; 2 carers", date: "2025-10-10T00:00:00Z", time: "Every 2 hours at night", signature: "Emma Wilson" },
      { details: "Short-distance walking: Zimmer frame; 1 carer standby for safety", date: "2025-10-10T00:00:00Z", time: "As required / encouraged", signature: "Emma Wilson" },
      { details: "Shower / bathroom transfers: Shower chair and grab rail; 1 carer", date: "2025-10-10T00:00:00Z", time: "Daily - morning preference", signature: "Emma Wilson" }
    ]
  },
  {
    title: 'Medication Management Plan',
    need_identified: 'Hazel is prescribed multiple medications including anticoagulants (Warfarin), antihypertensives, pain relief (Paracetamol PRN), and a statin. She has a history of dysphagia and requires medications to be given with thickened fluid. She sometimes refuses medications in the evening.',
    aims: 'To ensure Hazel receives her prescribed medications safely, at the correct times, in the correct doses, and that any side effects or adverse reactions are identified and reported promptly.',
    wishes: 'All tablets to be given with thickened (Stage 2 - nectar) fluid due to swallowing difficulties. If Hazel refuses evening medications, document refusal on MAR chart and inform nurse on duty. Do not crush medications without pharmacist advice. All medication changes must be recorded on the MAR sheet and reported to the responsible nurse.',
    author: 'Sarah Manager',
    dateWritten: '2025-10-10T16:30:00Z',
    carePlanNumber: 'CP-MM-02',
    badges: [{ label: 'Medication', bg: '#fef3c7', color: '#d97706' }, { label: 'High Priority', bg: '#fee2e2', color: '#dc2626' }],
    nextReviewDate: '2026-01-10',
    status: 'active',
    interventions: [
      { details: "Warfarin: As per INR - oral. Monitor for bruising; INR check monthly", date: "2025-10-10T00:00:00Z", time: "18:00", signature: "Sarah Manager" },
      { details: "Amlodipine 5mg: Oral. Monitor BP weekly; report dizziness", date: "2025-10-10T00:00:00Z", time: "08:00", signature: "Sarah Manager" },
      { details: "Paracetamol 500mg PRN: Oral. Offer for pain; record on PRN sheet (max 4g/day)", date: "2025-10-10T00:00:00Z", time: "PRN", signature: "Sarah Manager" }
    ]
  },
  {
    title: 'Falls Prevention Plan',
    need_identified: 'Fall Risk Assessment (Morse Scale) score: 65 - HIGH RISK. Key risk factors: reduced mobility and balance, anticoagulant therapy (increases injury risk), history of 2 falls in the past 6 months (pre-admission), impaired vision, nighttime urgency for toileting, postural hypotension.',
    aims: 'To reduce Hazel\'s risk of falling and prevent injury, whilst promoting her independence and dignity. To ensure the environment is safe and that Hazel is provided with the appropriate equipment and supervision.',
    wishes: 'Zimmer frame and call bell within reach. Night light and commode placed near bed. Non-slip footwear worn at all times.',
    author: 'Lily Thompson',
    dateWritten: '2025-10-11T10:00:00Z',
    carePlanNumber: 'CP-FP-03',
    badges: [{ label: 'Safety', bg: '#fee2e2', color: '#dc2626' }, { label: 'Mobility', bg: '#dbeafe', color: '#1d4ed8' }],
    nextReviewDate: '2025-11-11',
    status: 'active',
    interventions: [
      { details: "Zimmer frame within reach at all times; Sara Stedy transfer aid used", date: "2025-10-11T00:00:00Z", time: "All shifts", signature: "Lily Thompson" },
      { details: "Commode at bedside, call bell close by, night light on", date: "2025-10-11T00:00:00Z", time: "Night shifts", signature: "Lily Thompson" }
    ]
  },
  {
    title: 'Nutrition & Hydration Plan',
    need_identified: 'MUST Score on admission: 2 (HIGH RISK). Weight: 52.4 kg. BMI: 19.1. Dysphagia (mild). Hazel has lost 4 kg over the past 3 months and has a reduced appetite. Prefers soft foods and dislikes dairy.',
    aims: 'To ensure Hazel receives adequate nutrition and hydration to maintain her weight, skin integrity, and overall health, in accordance with her dietary requirements and personal preferences.',
    wishes: 'Seated upright at 90 degrees before mealtimes. Prompting and encouragement given. Minimum 30 minutes allowed per meal. Monitor for coughing/gurgling.',
    author: 'Emma Wilson',
    dateWritten: '2025-10-10T17:15:00Z',
    carePlanNumber: 'CP-NH-04',
    badges: [{ label: 'Nutrition', bg: '#fef3c7', color: '#d97706' }, { label: 'Dysphagia', bg: '#fee2e2', color: '#dc2626' }],
    nextReviewDate: '2025-11-10',
    status: 'active',
    interventions: [
      { details: "Food Texture: IDDSI Level 5 - Minced & Moist", date: "2025-10-10T00:00:00Z", time: "Mealtimes", signature: "Emma Wilson" },
      { details: "Fluid Target: 1500ml/day; IDDSI Level 2 - Mildly Thick (Nectar)", date: "2025-10-10T00:00:00Z", time: "Regular prompts", signature: "Emma Wilson" }
    ]
  },
  {
    title: 'Skin Integrity / Pressure Care Plan',
    need_identified: 'Braden Scale score: 14 – MODERATE RISK. Sacral redness (Grade 1 damage, 2cm x 1.5cm area of non-blanching erythema) noted on admission. Impaired mobility and sensory perception.',
    aims: 'To maintain Hazel\'s skin integrity and prevent the development of pressure ulcers, moisture lesions, or other skin breakdown, through regular repositioning, appropriate equipment, and effective skin care.',
    wishes: 'Reposition every 2 hours in bed using slide sheets with 30-degree tilt. Ensure Nimbus 3 pressure mattress pump is working. Daily skin inspections.',
    author: 'Emma Wilson',
    dateWritten: '2025-10-11T16:00:00Z',
    carePlanNumber: 'CP-SC-05',
    badges: [{ label: 'Skin Care', bg: '#fce7f3', color: '#9d174d' }, { label: 'Braden: 14', bg: '#fee2e2', color: '#dc2626' }],
    nextReviewDate: '2025-11-10',
    status: 'active',
    interventions: [
      { details: "Repositioning: Every 2 hours (night). 30-degree tilt; use slide sheets; document", date: "2025-10-11T00:00:00Z", time: "Night shift", signature: "Emma Wilson" },
      { details: "Apply Zerobase moisturiser twice daily to dry skin areas after personal care", date: "2025-10-11T00:00:00Z", time: "Morning & Evening", signature: "Emma Wilson" }
    ]
  },
  {
    title: 'Personal Hygiene & Dressing Plan',
    need_identified: 'Hazel requires full assistance with bathing and hair washing, and prompting/partial assistance with dressing due to reduced grip strength in her right hand. She values her appearance.',
    aims: 'To support Hazel to maintain her personal hygiene and appearance in a way that preserves her dignity, respects her preferences, and promotes her sense of wellbeing and self-esteem.',
    wishes: 'Prefers shower over bath with warm water. Choice of 2 outfits from wardrobe (no buttons/logos). Blow dry and set hair. Soak dentures overnight.',
    author: 'Lily Thompson',
    dateWritten: '2025-10-11T17:00:00Z',
    carePlanNumber: 'CP-PH-06',
    badges: [{ label: 'Personal Care', bg: '#e0f2fe', color: '#0284c7' }],
    nextReviewDate: '2025-11-10',
    status: 'active',
    interventions: [
      { details: "Bathing & Hair Washing: Full assist in shower chair; warm water; female carer preferred", date: "2025-10-11T00:00:00Z", time: "Wednesdays & Saturdays", signature: "Lily Thompson" }
    ]
  },
  {
    title: 'Continence Care Plan',
    need_identified: 'Hazel has stress incontinence and occasional urgency incontinence (bladder). She is continent of bowel. Accidents occur mostly at night or when unable to reach commode quickly.',
    aims: 'To promote and maintain Hazel\'s continence as far as possible, manage incontinence with appropriate products, and preserve her dignity and comfort at all times.',
    wishes: 'Discreet language. Bedside commode at night. Cleanse with Cavilon barrier cream. Offer toilet every 2-3 hours.',
    author: 'Emma Wilson',
    dateWritten: '2025-10-11T18:00:00Z',
    carePlanNumber: 'CP-CC-07',
    badges: [{ label: 'Continence', bg: '#f3e8ff', color: '#7c3aed' }],
    nextReviewDate: '2025-11-10',
    status: 'active',
    interventions: [
      { details: "Prompted toileting: Offer toilet every 2-3 hours during the day", date: "2025-10-11T00:00:00Z", time: "Day shifts", signature: "Emma Wilson" },
      { details: "Nighttime: Commode at bedside; call bell within reach; Tena Maxi pad", date: "2025-10-11T00:00:00Z", time: "Night shift", signature: "Emma Wilson" }
    ]
  },
  {
    title: 'Communication & Cognitive Support Plan',
    need_identified: 'Hazel has mild short-term memory loss. She occasionally becomes confused about time and date. Family is concerned. She has a close relationship with daughter Margaret.',
    aims: 'To support Hazel to communicate effectively, maintain social engagement, and receive care that responds appropriately to her cognitive needs. To reduce anxiety and promote safety.',
    wishes: 'Face-to-face, clear speech. Write key info on whiteboard in room. Display familiar objects from home. Life history conversations.',
    author: 'Sarah Manager',
    dateWritten: '2025-10-11T19:00:00Z',
    carePlanNumber: 'CP-CS-08',
    badges: [{ label: 'Dementia', bg: '#fef9c3', color: '#a16207' }, { label: 'Communication', bg: '#e0f2fe', color: '#0284c7' }],
    nextReviewDate: '2025-11-10',
    status: 'active',
    interventions: [
      { details: "Write daily information on whiteboard (date, day, weather, events)", date: "2025-10-11T00:00:00Z", time: "Daily", signature: "Sarah Manager" }
    ]
  },
  {
    title: 'Pain Management Plan',
    need_identified: 'Hazel has osteoarthritis in both knees and lower back pain. Abbey Pain Scale score on admission: 6 (mild-moderate). Worst in morning and after prolonged sitting.',
    aims: 'To effectively assess, manage, and minimise Hazel\'s pain, enabling her to maintain comfort, function, and quality of life.',
    wishes: 'Supportive pillows. Warm wheat bag to knees/lower back. Encourage gentle range-of-motion. Monitor for non-verbal indicators of pain.',
    author: 'Lily Thompson',
    dateWritten: '2025-10-11T20:00:00Z',
    carePlanNumber: 'CP-PM-09',
    badges: [{ label: 'Pain', bg: '#fee2e2', color: '#dc2626' }, { label: 'Arthritis', bg: '#fce7f3', color: '#9d174d' }],
    nextReviewDate: '2025-11-10',
    status: 'active',
    interventions: [
      { details: "Regular Paracetamol 500mg-1g oral up to 4x daily", date: "2025-10-11T00:00:00Z", time: "08:00, 12:00, 18:00, 22:00", signature: "Lily Thompson" }
    ]
  },
  {
    title: 'End of Life / Comfort Care Plan',
    need_identified: 'Advance wishes in the event of cognitive/physical deterioration. DNACPR in place signed by Dr. Patel. Family wants to remain at Chestnut Lodge.',
    aims: 'To record Hazel\'s advance wishes and care preferences to guide compassionate, person-centred comfort care at the end of life.',
    wishes: 'Wishes to remain at home rather than hospitalised. Church of England chaplaincy visit. Classical music and lavender scent.',
    author: 'Sarah Manager',
    dateWritten: '2025-10-12T09:00:00Z',
    carePlanNumber: 'CP-EL-10',
    badges: [{ label: 'EoL', bg: '#f3e8ff', color: '#7c3aed' }, { label: 'Advance Wishes', bg: '#e0f2fe', color: '#0284c7' }],
    nextReviewDate: '2026-01-12',
    status: 'planned',
    interventions: [
      { details: "Comfort and dignity: quiet, unhurried, respectful care; lavender scent in room", date: "2025-10-12T00:00:00Z", time: "As required", signature: "Sarah Manager" }
    ]
  }
];

function getFormFolderKey(formName: string): string | null {
  const careFiles = config.careFilesV2;
  for (const folder of careFiles) {
    if (folder.forms?.some(f => f.value === formName)) {
      return folder.key;
    }
  }
  return null;
}

function getFormKeyByValue(formName: string): CareFileFormKey | null {
  const careFiles = config.careFilesV2;
  for (const folder of careFiles) {
    const form = folder.forms?.find(f => f.value === formName);
    if (form) return form.key as CareFileFormKey;
  }
  return null;
}

type OverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default function OverviewPage({ params }: OverviewPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = React.useState(false);
  const [resident, setResident] = React.useState<Resident | null | undefined>(undefined);
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [residentLastBowelRecordedAt, setResidentLastBowelRecordedAt] = React.useState<string | undefined>();
  const [residentLastUrineRecordedAt, setResidentLastUrineRecordedAt] = React.useState<string | undefined>();
  const [residentLastWeightCheckedAt, setResidentLastWeightCheckedAt] = React.useState<string | undefined>();
  const [foodFluidSixHourCompliant, setFoodFluidSixHourCompliant] = React.useState(false);
  const [completedPrnProtocolMedicationIds, setCompletedPrnProtocolMedicationIds] = React.useState<Set<string>>(new Set());
  const [carePlanEvalLatestCreatedAt, setCarePlanEvalLatestCreatedAt] = React.useState<Record<string, string>>({});
  const { profile } = useProfile();
  const { supabase } = useSupabase();
  const { formsState } = useCareFileForms({ residentId: id });
  const userRole = profile?.role;

  const carePlanFolders = React.useMemo(() => {
    const folders = FEATURES.SHOW_CARE_FILE_V2 ? config.careFilesV2 : config.careFiles;
    return folders.filter((f) => f.type === "folder" && f.carePlan);
  }, []);

  // --- TABS & FRONTEND STATES ---
  const [activeTab, setActiveTab] = React.useState<"overview" | "checklist" | "careplans" | "audit">("overview");
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [carePlans, setCarePlans] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [loadingCarePlans, setLoadingCarePlans] = React.useState(true);
  const [loadingAuditLogs, setLoadingAuditLogs] = React.useState(true);

  // Filter and Search for Checklist
  const [taskSearch, setTaskSearch] = React.useState("");
  const [taskFilter, setTaskFilter] = React.useState<"all" | "pending" | "in-progress" | "completed" | "ongoing">("all");
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});

  const toggleSection = (secId: string) => {
    setCollapsedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Complete Dialog
  const [selectedTaskToComplete, setSelectedTaskToComplete] = React.useState<any | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = React.useState(false);
  const [completeStaff, setCompleteStaff] = React.useState("");
  const [completeDateTime, setCompleteDateTime] = React.useState("");
  const [completeNotes, setCompleteNotes] = React.useState("");

  // Add Task Dialog
  const [isAddTaskOpen, setIsAddTaskOpen] = React.useState(false);
  const [newTaskName, setNewTaskName] = React.useState("");
  const [newTaskTimeframe, setNewTaskTimeframe] = React.useState("immediate");
  const [newTaskForm, setNewTaskForm] = React.useState("");

  // Care Plan Viewer Dialog
  const [selectedCarePlan, setSelectedCarePlan] = React.useState<any | null>(null);
  const [isCarePlanViewerOpen, setIsCarePlanViewerOpen] = React.useState(false);

  // Care folder picker (create care plan)
  const [isCareFolderPickerOpen, setIsCareFolderPickerOpen] = React.useState(false);

  // Drag and Drop State
  const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = React.useState<string | null>(null);

  // --- SEEDING FUNCTIONS ---
  const seedDefaultTasks = async (residentId: string, orgId: string) => {
    const tasksToInsert = DEFAULT_TASKS.map((t, idx) => ({
      resident_id: residentId,
      organization_id: orgId,
      title: t.title,
      timeframe: t.timeframe,
      status: t.status,
      form: t.form || null,
      completed_by: null,
      completed_at: null,
      notes: null,
      position: idx
    }));
    const { error } = await supabase.from("resident_admission_tasks").insert(tasksToInsert);
    if (error) console.error("Error seeding tasks:", error);
  };

  const seedDefaultAuditLogs = async (residentId: string, orgId: string) => {
    const auditsToInsert = DEFAULT_AUDITS.map(a => ({
      resident_id: residentId,
      organization_id: orgId,
      icon: a.icon,
      color: a.color,
      action: a.action,
      created_by_name: a.created_by_name,
      created_at: a.created_at
    }));
    const { error } = await supabase.from("resident_admission_audit_logs").insert(auditsToInsert);
    if (error) console.error("Error seeding audit logs:", error);
  };

  const seedDefaultCarePlans = async (residentId: string, orgId: string, userId: string) => {
    const plansToInsert = DEFAULT_CARE_PLANS.map(cp => ({
      resident_id: residentId,
      organization_id: orgId,
      care_plan_type: cp.title,
      need_identified: cp.need_identified,
      goals: {
        aims: cp.aims,
        wishes: cp.wishes,
        nameOfCarePlan: cp.title,
        writtenBy: cp.author,
        dateWritten: cp.dateWritten,
        residentName: fullName,
        dob: resident?.date_of_birth,
        bedroomNumber: resident?.room_number || "N/A",
        carePlanNumber: cp.carePlanNumber,
        badges: cp.badges || []
      },
      interventions: cp.interventions,
      status: cp.status || "active",
      created_by: userId,
      next_evaluation_date: cp.nextReviewDate || null
    }));
    const { error } = await supabase.from("care_plan_assessments").insert(plansToInsert);
    if (error) console.error("Error seeding care plans:", error);
  };

  // --- QUERY FUNCTIONS ---
  const fetchTasksAndAudit = React.useCallback(async () => {
    if (!supabase || !resident) return;
    try {
      setLoadingTasks(true);
      setLoadingAuditLogs(true);

      const auditSince = subDays(new Date(), AUDIT_TIMELINE_DAYS).toISOString();

      const { data: tasksData, error: tasksError } = await supabase
        .from("resident_admission_tasks")
        .select("*")
        .eq("resident_id", id)
        .order("position", { ascending: true });

      if (tasksError) throw tasksError;

      if (!tasksData || tasksData.length === 0) {
        try {
          await seedDefaultTasks(id, resident.organization_id!);
          await seedDefaultAuditLogs(id, resident.organization_id!);

          const { data: refetchedTasks } = await supabase
            .from("resident_admission_tasks")
            .select("*")
            .eq("resident_id", id)
            .order("position", { ascending: true });

          const { data: refetchedAudits } = await supabase
            .from("resident_admission_audit_logs")
            .select("*")
            .eq("resident_id", id)
            .gte("created_at", auditSince)
            .order("created_at", { ascending: false });

          setTasks(refetchedTasks || []);
          setAuditLogs(refetchedAudits || []);
        } catch (seedErr) {
          console.error("Seeding checklist failed:", seedErr);
          setTasks([]);
          setAuditLogs([]);
        }
      } else {
        setTasks(tasksData || []);

        const { data: auditData, error: auditError } = await supabase
          .from("resident_admission_audit_logs")
          .select("*")
          .eq("resident_id", id)
          .gte("created_at", auditSince)
          .order("created_at", { ascending: false });

        if (auditError) throw auditError;
        setAuditLogs(auditData || []);
      }

    } catch (err) {
      console.error("Error loading checklist/audit:", err);
    } finally {
      setLoadingTasks(false);
      setLoadingAuditLogs(false);
    }
  }, [id, supabase, resident]);

  const fetchCarePlansData = React.useCallback(async () => {
    if (!supabase || !resident || !profile?.id) return;
    try {
      setLoadingCarePlans(true);
      
      const { data: cpData, error: cpError } = await supabase
        .from("care_plan_assessments")
        .select("*")
        .eq("resident_id", id);
      
      if (cpError) throw cpError;

      setCarePlans(cpData || []);

    } catch (err) {
      console.error("Error loading care plans:", err);
    } finally {
      setLoadingCarePlans(false);
    }
  }, [id, supabase, resident, profile?.id]);

  const fetchResidentData = React.useCallback(async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("residents")
      .select("*, emergency_contacts(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching resident overview:", error);
      setResident(null);
    } else {
      setResident(data as Resident);
    }

    const { data: latestBowelEntry } = await supabase
      .from("continence_entries")
      .select("created_at")
      .eq("resident_id", id)
      .eq("entry_type", "bowel")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setResidentLastBowelRecordedAt(latestBowelEntry?.created_at);

    const { data: latestWeightRecord } = await supabase
      .from("weight_records")
      .select("measurement_date")
      .eq("resident_id", id)
      .order("measurement_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    setResidentLastWeightCheckedAt(latestWeightRecord?.measurement_date);

    const { data: latestUrineEntry } = await supabase
      .from("continence_entries")
      .select("created_at")
      .eq("resident_id", id)
      .eq("entry_type", "urine")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setResidentLastUrineRecordedAt(latestUrineEntry?.created_at);

    const windowStartIso = new Date(Date.now() - FOOD_FLUID_ALERT_WINDOW_MS).toISOString();
    const { data: foodFluidRows } = await supabase
      .from("food_fluid_logs")
      .select("timestamp, type_of_food_drink, amount_eaten, fluid_consumed_ml")
      .eq("resident_id", id)
      .gte("timestamp", windowStartIso)
      .eq("is_archived", false);

    const { foodOk, fluidOk } = computeFoodFluidComplianceInWindow(foodFluidRows ?? []);
    const foodFluidCompliant = foodOk && fluidOk;
    setFoodFluidSixHourCompliant(foodFluidCompliant);

    const { data: prnProtocolRows } = await supabase
      .from("prn_protocols")
      .select("medication_id")
      .eq("resident_id", id)
      .neq("status", "archived");

    const completedMedicationIds = new Set(
      (prnProtocolRows ?? [])
        .map((row) => row.medication_id)
        .filter((medicationId): medicationId is string => typeof medicationId === "string" && medicationId.length > 0)
    );
    setCompletedPrnProtocolMedicationIds(completedMedicationIds);

    const { data: cpEvalRows } = await supabase
      .from("care_plan_evaluations")
      .select("care_plan_id, created_at")
      .eq("resident_id", id);

    const carePlanEvalLatest: Record<string, string> = {};
    for (const row of cpEvalRows ?? []) {
      const cid = typeof row.care_plan_id === "string" ? row.care_plan_id : "";
      const cat = typeof row.created_at === "string" ? row.created_at : "";
      if (!cid || !cat) continue;
      if (!carePlanEvalLatest[cid] || cat > carePlanEvalLatest[cid]) {
        carePlanEvalLatest[cid] = cat;
      }
    }
    setCarePlanEvalLatestCreatedAt(carePlanEvalLatest);

    if (userRole && profile?.id) {
      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("resident_id", id)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      if (alertsError) {
        setAlerts([]);
        return;
      }

      const carePlanAlertIds = (alertsData ?? [])
        .filter(
          (alert) =>
            alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
            alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE
        )
        .map((alert) => alert.metadata?.care_plan_id)
        .filter((idValue): idValue is string => typeof idValue === "string" && idValue.length > 0);

      let alertsWithResolvedMetadata = alertsData ?? [];
      if (carePlanAlertIds.length > 0) {
        const { data: carePlanRows } = await supabase
          .from("care_plan_assessments")
          .select("id, care_plan_type, folder_key, goals, wound_folder_id")
          .in("id", [...new Set(carePlanAlertIds)]);

        const carePlanById = new Map(
          (carePlanRows ?? []).map((row) => [row.id, row])
        );

        alertsWithResolvedMetadata = (alertsData ?? []).map((alert) => {
          const carePlanId = alert.metadata?.care_plan_id;
          if (
            !carePlanId ||
            (alert.type !== CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE &&
              alert.type !== CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE)
          ) {
            return alert;
          }

          const assessment = carePlanById.get(carePlanId);
          if (!assessment) {
            return alert;
          }

          const metadataBase =
            alert.metadata && typeof alert.metadata === "object"
              ? alert.metadata
              : {};

          return {
            ...alert,
            metadata: {
              ...metadataBase,
              care_plan_id: carePlanId,
              care_plan_type: assessment.care_plan_type,
              wound_folder_id: assessment.wound_folder_id,
              care_file_folder_key:
                assessment.folder_key ??
                extractRawCareFileFolderKeyFromGoals(assessment.goals),
            },
          };
        });
      }

      const { data: dismissalsData } = await supabase
        .from("alert_dismissals")
        .select("alert_id")
        .eq("user_id", profile.id);

      const dismissedAlertIds = new Set(
        (dismissalsData || []).map((d: any) => d.alert_id)
      );

      const filteredAlerts = (alertsWithResolvedMetadata || []).filter((alert: any) => {
        if (alert.type === "medication" && alert.metadata?.alert_subtype === "low_stock") {
          return false;
        }

        if (!shouldShowAlertForRole(alert, userRole)) {
          return false;
        }
        if (
          !canDismissAlert(
            alert,
            data?.photo_updated_at,
            latestBowelEntry?.created_at,
            latestWeightRecord?.measurement_date,
            foodFluidCompliant,
            latestUrineEntry?.created_at,
            completedMedicationIds,
            carePlanEvalLatest
          )
        ) {
          return true;
        }
        return !dismissedAlertIds.has(alert.id);
      });
      
      setAlerts(filteredAlerts);
    }
  }, [id, supabase, userRole, profile?.id]);

  React.useEffect(() => {
    fetchResidentData();
  }, [fetchResidentData]);

  React.useEffect(() => {
    if (resident) {
      fetchTasksAndAudit();
      fetchCarePlansData();
    }
  }, [resident, fetchTasksAndAudit, fetchCarePlansData]);

  const age = React.useMemo(() => {
    if (!resident) return 0;
    const dob = resident.date_of_birth;
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  }, [resident]);

  const lengthOfStayDisplay = React.useMemo(() => {
    const admissionDate = resident?.admission_date;
    if (!admissionDate) return "";
    const today = new Date();
    const admission = new Date(admissionDate);
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? "s" : ""} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? "s" : ""}` : ""}`;
    }
  }, [resident?.admission_date]);

  const alertCount = React.useMemo(() => {
    if (!alerts) return { total: 0, critical: 0, warning: 0, info: 0 };
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === "critical").length,
      warning: alerts.filter(a => a.severity === "warning").length,
      info: alerts.filter(a => a.severity === "info").length,
    };
  }, [alerts]);

  const handleDismissAlert = async (alertId: string) => {
    if (!supabase || !profile?.id) return;
    const alert = alerts.find((item) => item.id === alertId);
    if (
      alert &&
      !canDismissAlert(
        alert,
        resident?.photo_updated_at,
        residentLastBowelRecordedAt,
        residentLastWeightCheckedAt,
        foodFluidSixHourCompliant,
        residentLastUrineRecordedAt,
        completedPrnProtocolMedicationIds,
        carePlanEvalLatestCreatedAt
      )
    ) {
      toast.info(getNonDismissibleAlertMessage(alert.type));
      return;
    }
    
    try {
      const { error } = await supabase
        .from("alert_dismissals")
        .insert({
          alert_id: alertId,
          user_id: profile.id
        });

      if (error) throw error;
      toast.success("Alert dismissed");
      fetchResidentData();
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      toast.error("Failed to dismiss alert");
    }
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverSectionId(null);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (dragOverSectionId !== sectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    const taskId = draggingTaskId || e.dataTransfer.getData("text/plain");
    if (!taskId || !resident) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.timeframe === targetSectionId) {
      setDragOverSectionId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("resident_admission_tasks")
        .update({ timeframe: targetSectionId })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task moved successfully");

      const staffName = profile?.name || "Staff";
      const timeframeLabel = TIME_CONFIG[targetSectionId as keyof typeof TIME_CONFIG]?.label || targetSectionId;
      const sourceTimeframeLabel = TIME_CONFIG[task.timeframe as keyof typeof TIME_CONFIG]?.label || task.timeframe;

      await supabase.from("resident_admission_audit_logs").insert({
        resident_id: id,
        organization_id: resident.organization_id,
        icon: "↕️",
        color: "#e0f2fe",
        action: `<b>${staffName}</b> moved task <i>${task.title}</i> from <b>${sourceTimeframeLabel}</b> → <b>${timeframeLabel}</b>`,
        created_by_name: staffName
      });

      fetchTasksAndAudit();
    } catch (err) {
      console.error("Error updating timeframe:", err);
      toast.error("Failed to move task");
    } finally {
      setDragOverSectionId(null);
      setDraggingTaskId(null);
    }
  };

  // --- CHECKLIST ACTIONS ---
  const toggleCheck = async (task: any) => {
    if (task.status === "completed") {
      try {
        const { error } = await supabase
          .from("resident_admission_tasks")
          .update({
            status: "pending",
            completed_by: null,
            completed_at: null,
            notes: null
          })
          .eq("id", task.id);

        if (error) throw error;
        toast.success("Task unmarked as completed");

        const staffName = profile?.name || "Staff";
        await supabase.from("resident_admission_audit_logs").insert({
          resident_id: id,
          organization_id: resident?.organization_id,
          icon: "🔄",
          color: "#fef3c7",
          action: `<b>${staffName}</b> unmarked task <i>${task.title}</i> as complete`,
          created_by_name: staffName
        });

        fetchTasksAndAudit();
      } catch (err) {
        console.error("Error resetting task status:", err);
      }
    } else {
      setSelectedTaskToComplete(task);
      setCompleteStaff(profile?.name || "Staff");
      const now = new Date();
      setCompleteDateTime(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      setIsCompleteDialogOpen(true);
    }
  };

  const confirmComplete = async () => {
    if (!selectedTaskToComplete || !resident) return;

    try {
      const formattedDate = new Date(completeDateTime).toISOString();
      const updatedStatus = "completed";

      const { error } = await supabase
        .from("resident_admission_tasks")
        .update({
          status: updatedStatus,
          completed_by: completeStaff,
          completed_at: formattedDate,
          notes: completeNotes || null
        })
        .eq("id", selectedTaskToComplete.id);

      if (error) throw error;
      toast.success("Task marked as completed");

      const notesText = completeNotes ? `: ${completeNotes}` : "";
      await supabase.from("resident_admission_audit_logs").insert({
        resident_id: id,
        organization_id: resident.organization_id,
        icon: "✅",
        color: "#dcfce7",
        action: `<b>${completeStaff}</b> completed task <i>${selectedTaskToComplete.title}</i>${notesText}`,
        created_by_name: completeStaff
      });

      setSelectedTaskToComplete(null);
      setIsCompleteDialogOpen(false);
      setCompleteNotes("");
      fetchTasksAndAudit();
    } catch (err) {
      console.error("Error completing task:", err);
      toast.error("Failed to mark task as completed");
    }
  };

  const confirmAddTask = async () => {
    if (!newTaskName.trim() || !resident) {
      toast.error("Task name is required");
      return;
    }

    try {
      const maxPosition = tasks
        .filter(t => t.timeframe === newTaskTimeframe)
        .reduce((max, t) => Math.max(max, t.position), 0);

      const staffName = profile?.name || "Staff";

      const { error } = await supabase
        .from("resident_admission_tasks")
        .insert({
          resident_id: id,
          organization_id: resident.organization_id,
          title: newTaskName.trim(),
          timeframe: newTaskTimeframe,
          status: "pending",
          form: newTaskForm || null,
          position: maxPosition + 1
        });

      if (error) throw error;
      toast.success("New checklist task added");

      const timeframeLabel = TIME_CONFIG[newTaskTimeframe as keyof typeof TIME_CONFIG]?.label || newTaskTimeframe;

      await supabase.from("resident_admission_audit_logs").insert({
        resident_id: id,
        organization_id: resident.organization_id,
        icon: "➕",
        color: "#f0fdf4",
        action: `<b>${staffName}</b> added new task <i>${newTaskName.trim()}</i> to timeframe <b>${timeframeLabel}</b>`,
        created_by_name: staffName
      });

      setIsAddTaskOpen(false);
      setNewTaskName("");
      setNewTaskForm("");
      fetchTasksAndAudit();
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("Failed to add task");
    }
  };

  const deleteTask = async (taskId: string, title: string) => {
    if (!resident) return;
    try {
      const { error } = await supabase
        .from("resident_admission_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task deleted successfully");

      const staffName = profile?.name || "Staff";

      await supabase.from("resident_admission_audit_logs").insert({
        resident_id: id,
        organization_id: resident.organization_id,
        icon: "🗑️",
        color: "#fef2f2",
        action: `<b>${staffName}</b> deleted task <i>${title}</i>`,
        created_by_name: staffName
      });

      fetchTasksAndAudit();
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task");
    }
  };

  // --- CARE PLANS ACTIONS ---
  const handleCareFolderSelect = (folderKey: string) => {
    setIsCareFolderPickerOpen(false);
    const base = FEATURES.SHOW_CARE_FILE_V2
      ? `/dashboard/residents/${id}/care-file-v2`
      : `/dashboard/residents/${id}/care-file`;
    router.push(`${base}/${folderKey}` as Route);
  };

  // --- VIEW RENDERS ---
  const renderTabNavigation = () => {
    return (
      <div className="flex border-b border-gray-200 mb-6 shrink-0">
        {(["overview", "checklist", "careplans", "audit"] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              "px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px]",
              activeTab === tab
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" && "Overview"}
            {tab === "checklist" && "Checklist"}
            {tab === "careplans" && "Care Plans"}
            {tab === "audit" && "Audit Log"}
          </button>
        ))}
      </div>
    );
  };

  const getFilteredTasks = () => {
    return tasks.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(taskSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (taskFilter === "all") return true;
      return t.status === taskFilter;
    });
  };

  const getTaskCounts = () => {
    const counts = { completed: 0, inProgress: 0, pending: 0, ongoing: 0, total: 0 };
    tasks.forEach(t => {
      if (t.status === "completed") counts.completed++;
      else if (t.status === "in-progress") counts.inProgress++;
      else if (t.status === "pending") counts.pending++;
      else if (t.status === "ongoing") counts.ongoing++;
    });
    counts.total = counts.completed + counts.inProgress + counts.pending;
    return counts;
  };

  const renderChecklistTab = () => {
    if (loadingTasks) {
      return (
        <div className="flex items-center justify-center py-12 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    const filtered = getFilteredTasks();
    const counts = getTaskCounts();

    const chartData = [
      { name: 'Completed', value: counts.completed, color: '#16a34a' },
      { name: 'In Progress', value: counts.inProgress, color: '#d97706' },
      { name: 'Pending', value: counts.pending, color: '#9ca3af' },
      { name: 'Ongoing', value: counts.ongoing, color: '#0284c7' }
    ].filter(d => d.value > 0);

    return (
      <div className="flex flex-col lg:flex-row gap-6 w-full items-start overflow-hidden">
        {/* Left Checklist list */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "in-progress", "completed", "ongoing"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={taskFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTaskFilter(filter)}
                  className="capitalize rounded-full px-4 h-8 text-xs font-semibold"
                >
                  {filter === "in-progress" ? "In Progress" : filter}
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-xs h-9">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="pl-9 pr-3 w-full h-full border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 border rounded-lg p-3">
            <GripVertical className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Drag the ⠿ handle on any task to move it to a different timeframe section</span>
          </div>

          {/* Timeframe Sections */}
          <div className="space-y-4">
            {(Object.keys(TIME_CONFIG) as Array<keyof typeof TIME_CONFIG>).map((secId) => {
              const sec = TIME_CONFIG[secId];
              const secTasks = filtered.filter((t) => t.timeframe === secId);
              const isCollapsed = !!collapsedSections[secId];

              if (secTasks.length === 0 && taskFilter !== "all") return null;

              const totalCount = secTasks.filter(t => t.status !== 'ongoing').length;
              const completedCount = secTasks.filter(t => t.status === 'completed').length;
              const ongoingCount = secTasks.filter(t => t.status === 'ongoing').length;

              const progressLabel = ongoingCount > 0 
                ? `${ongoingCount} ongoing` 
                : `${completedCount} / ${totalCount} completed`;

              return (
                <div
                  key={secId}
                  className={cn(
                    "border rounded-xl bg-white overflow-hidden shadow-sm transition-all",
                    dragOverSectionId === secId && "ring-2 ring-primary ring-offset-1 bg-slate-50/50"
                  )}
                  onDragOver={(e) => handleDragOver(e, secId)}
                  onDrop={(e) => handleDrop(e, secId)}
                >
                  {/* Section Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 border-b select-none"
                    onClick={() => toggleSection(secId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
                      <span className="font-bold text-sm text-gray-800">{sec.label}</span>
                      <span className="text-xs text-muted-foreground bg-slate-100 rounded-full px-2.5 py-0.5 font-medium">
                        {progressLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs font-bold border-primary text-primary hover:bg-primary/5"
                        onClick={() => {
                          setNewTaskTimeframe(secId);
                          setIsAddTaskOpen(true);
                        }}
                      >
                        + Add Item
                      </Button>
                      <button
                        className="text-slate-400 hover:text-slate-600 transition-transform duration-200"
                        onClick={() => toggleSection(secId)}
                      >
                        {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Section Content */}
                  {!isCollapsed && (
                    <div className="divide-y">
                      {secTasks.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          No tasks in this section
                        </div>
                      ) : (
                        secTasks.map((task) => {
                          const isDone = task.status === "completed";
                          const isOngoing = task.status === "ongoing";
                          const folderKey = task.form ? getFormFolderKey(task.form) : null;
                          const formKey = task.form ? getFormKeyByValue(task.form) : null;
                          const isFormCompleted = formKey ? formsState[formKey]?.status === "completed" : false;

                          return (
                            <div
                              key={task.id}
                              draggable={!isOngoing}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                "flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors",
                                isDone && "opacity-75 bg-slate-50/20",
                                draggingTaskId === task.id && "opacity-30 bg-slate-100 border-dashed border-2"
                              )}
                            >
                              {/* Drag Handle */}
                              {!isOngoing ? (
                                <div className="cursor-grab hover:text-slate-800 text-slate-300 mt-1" title="Drag to move timeframe">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              ) : (
                                <div className="w-4 shrink-0" />
                              )}

                              {/* Checkbox */}
                              <div
                                className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all",
                                  isDone
                                    ? "bg-green-600 border-green-600 text-white"
                                    : "border-slate-300 hover:border-slate-400 bg-white"
                                )}
                                onClick={() => toggleCheck(task)}
                              >
                                {isDone && <span className="text-[10px] font-bold">✓</span>}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "text-sm font-medium text-slate-800 break-words",
                                    isDone && "line-through text-slate-400"
                                  )}
                                >
                                  {task.title}
                                </p>
                                {task.form && (
                                  <button
                                    onClick={() => {
                                      if (folderKey) {
                                        router.push(`/dashboard/residents/${id}/care-file-v2/${folderKey}`);
                                      } else {
                                        router.push(`/dashboard/residents/${id}/care-file-v2`);
                                      }
                                    }}
                                    className={cn(
                                      "text-xs font-semibold hover:underline flex items-center gap-1 mt-1 transition-colors",
                                      isFormCompleted
                                        ? "text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400"
                                        : "text-primary"
                                    )}
                                  >
                                    <FileText className={cn("h-3 w-3", isFormCompleted ? "text-green-600 dark:text-green-500" : "text-primary")} />
                                    <span>{task.form}</span>
                                  </button>
                                )}
                                {task.notes && (
                                  <p className="text-xs text-muted-foreground bg-slate-50 rounded border p-2 mt-2 italic break-words">
                                    Notes: {task.notes}
                                  </p>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0 hidden sm:block">
                                <Badge
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 border rounded-full capitalize",
                                    task.status === "completed" && "bg-green-50 text-green-700 border-green-200 shadow-none",
                                    task.status === "in-progress" && "bg-amber-50 text-amber-700 border-amber-200 shadow-none",
                                    task.status === "ongoing" && "bg-sky-50 text-sky-700 border-sky-200 shadow-none",
                                    task.status === "pending" && "bg-slate-50 text-slate-500 border-slate-200 shadow-none"
                                  )}
                                >
                                  {task.status === "in-progress" ? "In Progress" : task.status}
                                </Badge>
                              </div>

                              {/* Completed By/At */}
                              <div className="shrink-0 text-right text-xs text-slate-500 hidden md:block w-36">
                                {isDone ? (
                                  <>
                                    <p className="font-semibold text-slate-800 break-words">{task.completed_by}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {formatTimestampToUKDateTime(task.completed_at, 'dd/MM/yy HH:mm')}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </div>

                              {/* Delete button */}
                              <button
                                onClick={() => deleteTask(task.id, task.title)}
                                className="text-slate-300 hover:text-red-600 transition-colors mt-0.5 shrink-0"
                                title="Delete task"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right checklist stats panel */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          {/* Completion summary */}
          <Card className="shadow-none border rounded-xl overflow-hidden bg-white">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold text-gray-800">Checklist Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center">
              {chartData.length > 0 ? (
                <div className="relative w-full h-[140px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: counts.completed, color: '#16a34a' },
                          { name: 'In Progress', value: counts.inProgress, color: '#d97706' },
                          { name: 'Pending', value: counts.pending, color: '#9ca3af' },
                          { name: 'Ongoing', value: counts.ongoing, color: '#0284c7' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={56}
                        paddingAngle={1}
                        dataKey="value"
                      >
                        {[
                          { name: 'Completed', value: counts.completed, color: '#16a34a' },
                          { name: 'In Progress', value: counts.inProgress, color: '#d97706' },
                          { name: 'Pending', value: counts.pending, color: '#9ca3af' },
                          { name: 'Ongoing', value: counts.ongoing, color: '#0284c7' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} tasks`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-bold text-slate-800">{counts.completed} / {counts.total}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Completed</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No data to show
                </div>
              )}

              {/* Legends list */}
              <div className="w-full space-y-2.5 mt-4 border-t pt-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                    <span className="font-medium text-slate-600">Completed</span>
                  </div>
                  <span className="font-bold text-slate-800">{counts.completed}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
                    <span className="font-medium text-slate-600">In Progress</span>
                  </div>
                  <span className="font-bold text-slate-800">{counts.inProgress}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#9ca3af]" />
                    <span className="font-medium text-slate-600">Pending</span>
                  </div>
                  <span className="font-bold text-slate-800">{counts.pending}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                    <span className="font-medium text-slate-600">Ongoing</span>
                  </div>
                  <span className="font-bold text-slate-800">{counts.ongoing}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Care plans summary */}
          <Card className="shadow-none border rounded-xl overflow-hidden bg-white">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold text-gray-800">Care Plans Created</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {loadingCarePlans ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              ) : carePlans.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No care plans on file</p>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {carePlans.slice(0, 4).map((cp) => {
                    const goalsObj = cp.goals || {};
                    return (
                      <div
                        key={cp.id}
                        className="text-xs border-b pb-2.5 last:border-b-0 last:pb-0 cursor-pointer hover:opacity-85"
                        onClick={() => {
                          setSelectedCarePlan(cp);
                          setIsCarePlanViewerOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800 truncate flex-1 mr-2">{cp.care_plan_type}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{goalsObj.dateWritten ? new Date(goalsObj.dateWritten).toLocaleDateString('en-GB') : ''}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">{goalsObj.writtenBy || "System"}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full h-8 text-xs font-bold border-primary text-primary hover:bg-primary/5 mt-2"
                onClick={() => setActiveTab("careplans")}
              >
                View All Care Plans →
              </Button>
            </CardContent>
          </Card>

          {/* Legend Details */}
          <Card className="shadow-none border rounded-xl overflow-hidden bg-white">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-bold text-gray-800">Timeframe Legend</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {(Object.keys(TIME_CONFIG) as Array<keyof typeof TIME_CONFIG>).map((secId) => {
                const sec = TIME_CONFIG[secId];
                return (
                  <div key={secId} className="flex items-center gap-3 text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                    <span className="text-slate-600 font-medium">{sec.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderCarePlansTab = () => {
    if (loadingCarePlans) {
      return (
        <div className="flex items-center justify-center py-12 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Care Plans — {fullName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Click any care plan card to view the complete document and guidelines</p>
          </div>
          <Button
            onClick={() => setIsCareFolderPickerOpen(true)}
            className="font-semibold text-xs h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Care Plan
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carePlans.map((cp) => {
            const goalsObj = cp.goals || {};
            const cpStatus = cp.status || "active";
            const badgesArr = goalsObj.badges || [];
            
            return (
              <Card
                key={cp.id}
                className="cursor-pointer hover:border-primary hover:ring-2 hover:ring-primary/10 transition-all shadow-none border rounded-xl flex flex-col justify-between h-40 bg-white"
                onClick={() => {
                  setSelectedCarePlan(cp);
                  setIsCarePlanViewerOpen(true);
                }}
              >
                <CardContent className="p-5 flex flex-col h-full justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 truncate mb-1">{cp.care_plan_type}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Written by: <span className="font-semibold">{goalsObj.writtenBy || "System"}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {goalsObj.dateWritten ? new Date(goalsObj.dateWritten).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded shadow-none",
                          cpStatus === "active"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}
                      >
                        {cpStatus}
                      </Badge>
                      {badgesArr.slice(0, 1).map((b: any, i: number) => (
                        <Badge
                          key={i}
                          className="text-[9px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 shadow-none capitalize"
                        >
                          {b.label}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-primary text-sm font-semibold">View →</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* New Card link */}
          <div
            onClick={() => setIsCareFolderPickerOpen(true)}
            className="border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer rounded-xl flex flex-col items-center justify-center h-40 text-center p-5 select-none"
          >
            <Plus className="h-8 w-8 text-slate-300" />
            <p className="text-xs font-bold text-slate-500 mt-2">Create New Care Plan</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Choose a care file folder to create a plan</p>
          </div>
        </div>
      </div>
    );
  };

  const getGroupedAuditLogs = () => {
    const groups: Record<string, any[]> = {};
    auditLogs.forEach(log => {
      const date = new Date(log.created_at);
      const dateString = date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(log);
    });
    return groups;
  };

  const renderAuditLogTab = () => {
    if (loadingAuditLogs) {
      return (
        <div className="flex items-center justify-center py-12 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    const grouped = getGroupedAuditLogs();
    const groupedKeys = Object.keys(grouped);

    if (groupedKeys.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400 text-sm">
          No audit entries in the last 30 days
        </div>
      );
    }

    return (
      <div className="w-full space-y-6 max-w-4xl mx-auto">
        <div className="border rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 pb-2 border-b">
            <h3 className="font-bold text-sm text-slate-800">Audit Timeline</h3>
            <p className="text-xs text-slate-400 mt-1">Last 30 days</p>
          </div>
          
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
            {groupedKeys.map((day) => {
              const dayLogs = grouped[day];
              return (
                <div key={day} className="space-y-4 relative">
                  {/* Date Divider dot on vertical line */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                  
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {day}
                  </h4>
                  
                  <div className="space-y-4">
                    {dayLogs.map((log) => {
                      const timeString = new Date(log.created_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      const initials = log.created_by_name
                        ? log.created_by_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                        : "ST";

                      return (
                        <div key={log.id} className="flex gap-4 items-start text-sm">
                          {/* Event Icon/Avatar */}
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-sm font-semibold select-none shadow-sm"
                            style={{
                              backgroundColor: log.color || "#ede9fe",
                              color: log.color === "#dcfce7" ? "#16a34a" : log.color === "#fef3c7" ? "#d97706" : log.color === "#fef2f2" ? "#dc2626" : "#7c3aed"
                            }}
                          >
                            {log.icon || "📋"}
                          </div>

                          {/* Event body */}
                          <div className="flex-1 min-w-0 bg-slate-50/50 border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Avatar className="w-5 h-5 border shrink-0">
                                  <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-slate-800">{log.created_by_name || "Staff"}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold">{timeString}</span>
                            </div>
                            <p 
                              className="text-xs text-slate-600 mt-1 leading-relaxed break-words"
                              dangerouslySetInnerHTML={{ __html: log.action }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(" ");
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();
  const lastPhotoUpdatedOn = resident.photo_updated_at
    ? formatTimestampToUKDateTime(resident.photo_updated_at, "dd/MM/yyyy")
    : "Not set";
  const showLastUpdateCard = Boolean(resident.photo_updated_at);

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6 shrink-0">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-16 h-16">
          <AvatarImage src={resident.image_url} alt={fullName} className="border" />
          <AvatarFallback className="text-base bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black text-xl truncate">{fullName}</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">/ Overview</span>
          </div>
          <p className="text-muted-foreground text-sm truncate">
            View basic information and admission checklists
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Last photo updated: {lastPhotoUpdatedOn}
          </p>
        </div>
        <div className="flex flex-row gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="relative bg-gray-50 hover:bg-gray-100 h-9 w-9"
            onClick={() => setShowAlertsDialog(true)}
          >
            <Bell className="h-5 w-5" />
            {alertCount && alertCount.total > 0 && (
              <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-xs flex items-center justify-center font-semibold shadow-md ${alertCount.critical > 0 ? "bg-red-600" : "bg-orange-500"
              }`}>
                {alertCount.total}
              </span>
            )}
          </Button>
          {canEditOverview(userRole) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-9 px-3"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs list */}
      {renderTabNavigation()}

      {/* Tab contents */}
      <div className="flex-1 overflow-y-auto min-h-0 w-full pr-1 pb-10">
        {activeTab === "overview" && (
          <div className="space-y-6 w-full">
            {/* Quick Stats Summary */}
            <Card className="shadow-none border rounded-xl bg-white">
              <CardHeader className="p-5 border-b">
                <CardTitle className="flex items-center space-x-2 text-sm font-bold text-slate-800">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Quick Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className={`grid grid-cols-1 ${showLastUpdateCard ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4`}>
                  <div className="text-center p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{age}</div>
                    <p className="text-xs text-blue-700 font-semibold mt-1">Years Old</p>
                  </div>
                  <div className="text-center p-4 bg-green-50/50 rounded-xl border border-green-100">
                    <div className="text-2xl font-bold text-green-600">
                      {lengthOfStayDisplay.split(" ")[0]}
                    </div>
                    <p className="text-xs text-green-700 font-semibold mt-1">
                      {lengthOfStayDisplay.includes("day") ? "Days" :
                        lengthOfStayDisplay.includes("month") ? "Months" : "Years"} Here
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div className="text-2xl font-bold text-purple-600 text-center">
                      {resident.emergency_contacts?.length || 0}
                    </div>
                    <p className="text-xs text-purple-700 font-semibold mt-1">Emergency Contacts</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                    <div className="text-2xl font-bold text-orange-600">
                      {resident.room_number ? 1 : 0}
                    </div>
                    <p className="text-xs text-orange-700 font-semibold mt-1">Room Assigned</p>
                  </div>
                  {showLastUpdateCard && (
                    <div className="text-center p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                      <div className="text-sm font-bold text-slate-700 leading-tight">
                        {lastPhotoUpdatedOn}
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-1">Photo updated on</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Personal Details & Key Contacts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Personal Details Card */}
              <Card className="shadow-none border rounded-xl bg-white">
                <CardHeader className="p-5 border-b">
                  <CardTitle className="flex items-center space-x-2 text-sm font-bold text-slate-800">
                    <User className="w-5 h-5 text-blue-600" />
                    <span>Personal Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5">
                  <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50/80 border rounded-xl">
                    <User className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Full Name</p>
                      <p className="font-semibold text-sm text-slate-800 break-words">{fullName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50/80 border rounded-xl">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Date of Birth</p>
                      <p className="font-semibold text-sm text-slate-800">{formatDOB(resident.date_of_birth)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50/80 border rounded-xl">
                    <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Room Number</p>
                      <p className="font-semibold text-sm text-slate-800 truncate">{resident.room_number || "Not assigned"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50/80 border rounded-xl">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Admission Date</p>
                      <p className="font-semibold text-sm text-slate-800">{resident.admission_date}</p>
                    </div>
                  </div>

                  {resident.phone_number && (
                    <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50/80 border rounded-xl">
                      <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Phone Number</p>
                        <p className="font-semibold text-sm text-slate-800">{resident.phone_number}</p>
                      </div>
                    </div>
                  )}

                  {resident.nhs_health_number && (
                    <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50/80 border rounded-xl">
                      <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">NHS Health Number</p>
                        <p className="font-semibold font-mono text-sm text-slate-800">{resident.nhs_health_number}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Key Contacts Card */}
              <Card className="shadow-none border rounded-xl bg-white">
                <CardHeader className="p-5 border-b">
                  <CardTitle className="flex items-center space-x-2 text-sm font-bold text-slate-800">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span>Key Contacts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  {/* Next of Kin */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                      <Users className="w-4 h-4 text-red-500 mr-2" />
                      Next of Kin
                    </h4>
                    {resident.emergency_contacts && resident.emergency_contacts.length > 0 ? (
                      <div className="space-y-3">
                        {resident.emergency_contacts.map((contact: any, index: number) => (
                          <div key={index} className="p-3.5 border rounded-xl bg-slate-50/20">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-sm text-slate-800">{contact.name}</h5>
                              {contact.is_primary && (
                                <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] shadow-none">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
                              <p><span className="font-semibold text-slate-400">Relationship:</span> {contact.relationship}</p>
                              <p><span className="font-semibold text-slate-400">Phone:</span> {contact.phone_number}</p>
                              {contact.address && <p><span className="font-semibold text-slate-400">Address:</span> {contact.address}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50/50 rounded-xl border">
                        <Users className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">No emergency contacts on file</p>
                      </div>
                    )}
                  </div>

                  {/* GP Details */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                      <FileText className="w-4 h-4 text-blue-500 mr-2" />
                      GP Details
                    </h4>
                    {resident.gp_name || resident.gp_phone || resident.gp_address ? (
                      <div className="p-3.5 border rounded-xl bg-slate-50/20 text-xs text-slate-600 leading-relaxed">
                        <h5 className="font-bold text-sm text-slate-800 mb-2">
                          {resident.gp_name || "General Practitioner"}
                        </h5>
                        {resident.gp_phone && <p><span className="font-semibold text-slate-400">Phone:</span> {resident.gp_phone}</p>}
                        {resident.gp_address && <p><span className="font-semibold text-slate-400">Address:</span> {resident.gp_address}</p>}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50/50 rounded-xl border">
                        <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">No GP details on file</p>
                      </div>
                    )}
                  </div>

                  {/* Care Manager */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                      <User className="w-4 h-4 text-green-500 mr-2" />
                      Care Manager
                    </h4>
                    {resident.care_manager_name || resident.care_manager_phone || resident.care_manager_address ? (
                      <div className="p-3.5 border rounded-xl bg-slate-50/20 text-xs text-slate-600 leading-relaxed">
                        <h5 className="font-bold text-sm text-slate-800 mb-2">
                          {resident.care_manager_name || "Care Manager"}
                        </h5>
                        {resident.care_manager_phone && <p><span className="font-semibold text-slate-400">Phone:</span> {resident.care_manager_phone}</p>}
                        {resident.care_manager_address && <p><span className="font-semibold text-slate-400">Address:</span> {resident.care_manager_address}</p>}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50/50 rounded-xl border">
                        <User className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">No care manager details on file</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "checklist" && renderChecklistTab()}
        {activeTab === "careplans" && renderCarePlansTab()}
        {activeTab === "audit" && renderAuditLogTab()}
      </div>

      {/* --- DIALOGS --- */}

      {/* 1. Alerts Dialog */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alerts for {fullName}</DialogTitle>
            <DialogDescription>
              {alerts && alerts.length > 0
                ? `${alerts.length} active alert${alerts.length !== 1 ? "s" : ""} requiring attention`
                : "No active alerts"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => {
                const isFoodFluidNavAlert =
                  alert.type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE &&
                  (userRole === "nurse" || userRole === "care_assistant");
                const isUrineNavAlert =
                  alert.type === URINE_NOT_RECORDED_6H_ALERT_TYPE &&
                  (userRole === "nurse" || userRole === "care_assistant");
                const isPrnProtocolNavAlert =
                  alert.type === PRN_PROTOCOL_PENDING_12H_ALERT_TYPE && userRole === "nurse";
                const carePlanEvalCareFileHref =
                  FEATURES.SHOW_CARE_FILE_V2 && userRole === "nurse"
                    ? carePlanEvaluationAlertCareFileHref(id, alert.metadata)
                    : null;
                const isCarePlanEvalNavAlert =
                  (alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE ||
                    alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE) &&
                  carePlanEvalCareFileHref !== null;
                const isMedicationNavAlert =
                  alert.type === "medication" && userRole === "nurse";
                const formReviewCareFileHref =
                  FEATURES.SHOW_CARE_FILE_V2 && userRole === "nurse"
                    ? formReviewAlertCareFileHref(id, alert.metadata)
                    : null;
                const isFormReviewNavAlert =
                  alert.type === FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE &&
                  formReviewCareFileHref !== null;
                const carePlanEvalFolderLabel = isCarePlanEvalNavAlert
                  ? carePlanEvaluationAlertFolderLabel(alert.metadata)
                  : null;
                const isNavigationAlert =
                  isFoodFluidNavAlert ||
                  isUrineNavAlert ||
                  isPrnProtocolNavAlert ||
                  isCarePlanEvalNavAlert ||
                  isMedicationNavAlert ||
                  isFormReviewNavAlert;
                
                return (
                  <div
                    key={alert.id}
                    role={isNavigationAlert ? "button" : undefined}
                    tabIndex={isNavigationAlert ? 0 : undefined}
                    className={cn(
                      "p-4 rounded-lg border-2",
                      alert.severity === "critical"
                        ? "border-red-300 bg-red-50"
                        : alert.severity === "warning"
                          ? "border-orange-300 bg-orange-50"
                          : "border-blue-300 bg-blue-50",
                      isNavigationAlert && "cursor-pointer outline-none hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    onClick={() => {
                      setShowAlertsDialog(false);
                      if (isFoodFluidNavAlert) router.push(`/dashboard/residents/${id}/food-fluid`);
                      if (isUrineNavAlert) router.push(`/dashboard/residents/${id}/continence`);
                      if (isPrnProtocolNavAlert) router.push(`/dashboard/residents/${id}/medication/docs`);
                      if (isCarePlanEvalNavAlert && carePlanEvalCareFileHref) router.push(carePlanEvalCareFileHref as Route);
                      if (isMedicationNavAlert) router.push(`/dashboard/residents/${id}/medication?tab=active` as Route);
                      if (isFormReviewNavAlert && formReviewCareFileHref) router.push(formReviewCareFileHref as Route);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={cn(
                              alert.severity === "critical"
                                ? "bg-red-100 text-red-800 border-red-400"
                                : alert.severity === "warning"
                                  ? "bg-orange-100 text-orange-800 border-orange-400"
                                  : "bg-blue-100 text-blue-800 border-blue-400"
                            )}
                          >
                            {alert.severity === "critical" ? "Critical" : alert.severity === "warning" ? "Warning" : "Info"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestampToUKDateTime(alert.created_at, 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        {carePlanEvalFolderLabel && (
                          <p className="text-xs text-muted-foreground mt-1">Folder: {carePlanEvalFolderLabel}</p>
                        )}
                      </div>
                      {canDismissAlert(
                        alert,
                        resident?.photo_updated_at,
                        residentLastBowelRecordedAt,
                        residentLastWeightCheckedAt,
                        foodFluidSixHourCompliant,
                        residentLastUrineRecordedAt,
                        completedPrnProtocolMedicationIds,
                        carePlanEvalLatestCreatedAt
                      ) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissAlert(alert.id);
                          }}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active alerts</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Complete Checklist Task Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Mark Task as Complete</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Provide completion details for task: <b>{selectedTaskToComplete?.title}</b>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Completed By</label>
              <select
                value={completeStaff}
                onChange={(e) => setCompleteStaff(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="Sarah Manager">Sarah Manager</option>
                <option value="Emma Wilson">Emma Wilson</option>
                <option value="Lily Thompson">Lily Thompson</option>
                <option value="James Clark">James Clark</option>
                <option value="Other">Other Staff</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Date & Time</label>
              <input
                type="datetime-local"
                value={completeDateTime}
                onChange={(e) => setCompleteDateTime(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Notes (optional)</label>
              <textarea
                placeholder="Any completion details or observations..."
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                rows={3}
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmComplete}>
              Mark Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Add checklist task dialog */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add Admission Checklist Item</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Add a new task to the timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Inform local pharmacy of arrival"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Admission Timeframe</label>
              <select
                value={newTaskTimeframe}
                onChange={(e) => setNewTaskTimeframe(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(Object.keys(TIME_CONFIG) as Array<keyof typeof TIME_CONFIG>).map((secId) => (
                  <option key={secId} value={secId}>
                    {TIME_CONFIG[secId].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Linked Care Form (optional)</label>
              <select
                value={newTaskForm}
                onChange={(e) => setNewTaskForm(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— None —</option>
                {config.careFilesV2
                  .flatMap((c) => c.forms || [])
                  .map((f: any) => (
                    <option key={f.key} value={f.value}>
                      {f.value}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddTaskOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmAddTask}>
              Add Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Care Plan Viewer Modal */}
      <Dialog open={isCarePlanViewerOpen} onOpenChange={setIsCarePlanViewerOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[85vh] overflow-y-auto bg-white p-6">
          {selectedCarePlan && (() => {
            const goalsObj = selectedCarePlan.goals || {};
            const interventionsArr = selectedCarePlan.interventions || [];
            
            return (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b pb-4 flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedCarePlan.care_plan_type}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Care Plan #{goalsObj.carePlanNumber || "N/A"} • Written by: <span className="font-semibold text-slate-600">{goalsObj.writtenBy}</span> • Date: <span className="font-semibold text-slate-600">{goalsObj.dateWritten ? new Date(goalsObj.dateWritten).toLocaleDateString('en-GB') : ''}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border p-4 rounded-xl">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Resident Name</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{goalsObj.residentName || fullName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Date of Birth</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDOB(goalsObj.dob || resident?.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bedroom Number</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{goalsObj.bedroomNumber || resident?.room_number || "N/A"}</p>
                  </div>
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-1.5">Aims / Goals</h4>
                  <p className="text-xs leading-relaxed text-slate-600 bg-slate-50/30 p-3 border rounded-xl whitespace-pre-wrap">{goalsObj.aims || "N/A"}</p>
                </div>

                {/* Identified Needs */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-1.5">Identified Needs</h4>
                  <p className="text-xs leading-relaxed text-slate-600 bg-slate-50/30 p-3 border rounded-xl whitespace-pre-wrap">{selectedCarePlan.need_identified || "N/A"}</p>
                </div>

                {/* Interventions table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-1.5">Care Interventions</h4>
                  {interventionsArr.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse bg-white">
                        <thead className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="p-3">Intervention Details</th>
                            <th className="p-3 w-32">When / Frequency</th>
                            <th className="p-3 w-32 text-right">Signature</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-600">
                          {interventionsArr.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/30">
                              <td className="p-3 leading-relaxed break-words font-medium text-slate-800">{row.details}</td>
                              <td className="p-3 text-slate-500">{row.time || "As needed"}</td>
                              <td className="p-3 text-right font-medium text-slate-700">{row.signature || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground bg-slate-50/30 border border-dashed rounded-xl">
                      No interventions documented for this care plan.
                    </div>
                  )}
                </div>

                {/* Wishes & Preferences */}
                {goalsObj.wishes && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-1.5">Resident Wishes & Preferences</h4>
                    <p className="text-xs leading-relaxed text-slate-600 bg-slate-50/30 p-3 border rounded-xl whitespace-pre-wrap">{goalsObj.wishes}</p>
                  </div>
                )}

                {/* Out of hours / Palliative Care information */}
                {selectedCarePlan.care_plan_type.toLowerCase().includes("end of life") && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider border-b pb-1.5">Out of Hours & Key Palliative Contacts</h4>
                    <div className="text-xs leading-relaxed text-slate-600 bg-red-50/30 p-3 border border-red-100 rounded-xl space-y-1.5">
                      <p><span className="font-semibold text-slate-400">Next of Kin:</span> Margaret Cardwell (Daughter) — 07700 900123</p>
                      <p><span className="font-semibold text-slate-400">GP Contact:</span> Dr. A. Patel — Chestnut Grove Surgery (0117 946 0200)</p>
                      <p><span className="font-semibold text-slate-400">Out of Hours Services:</span> NHS 111 Palliative Care Services Support Line</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t pt-4 shrink-0">
                  <Button size="sm" onClick={() => setIsCarePlanViewerOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 5. Care Folder Picker Dialog */}
      <Dialog open={isCareFolderPickerOpen} onOpenChange={setIsCareFolderPickerOpen}>
        <DialogContent className="max-w-lg bg-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Care Folder</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Care plans are created within a care file folder. Choose the folder that matches the area of care.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-4 overflow-y-auto flex-1 min-h-0">
            {carePlanFolders.map((folder) => (
              <Card
                key={folder.key}
                className="cursor-pointer hover:bg-muted/50 p-3 border transition-colors"
                onClick={() => handleCareFolderSelect(folder.key)}
              >
                <div className="flex items-start gap-2.5">
                  <FolderIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{folder.value}</p>
                    {folder.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{folder.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsCareFolderPickerOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Edit Resident Dialog */}
      <CreateResidentDialog
        isResidentDialogOpen={isEditDialogOpen}
        setIsResidentDialogOpen={setIsEditDialogOpen}
        editMode={true}
        residentData={resident}
      />
    </div>
  );
}

function getNonDismissibleAlertMessage(type?: string) {
  if (type === "resident_photo_refresh_required") return "This alert cannot be dismissed until the profile photo is updated";
  if (type === "bowel_not_recorded_3_days") return "This alert cannot be dismissed until a bowel record is entered";
  if (type === "weight_check_due_tomorrow") return "This alert cannot be dismissed until a new weight check is recorded";
  if (type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE) return "This alert cannot be dismissed until food and fluid are recorded in the last 6 hours";
  if (type === URINE_NOT_RECORDED_6H_ALERT_TYPE) return "This alert cannot be dismissed until urine is recorded";
  if (type === PRN_PROTOCOL_PENDING_12H_ALERT_TYPE) return "This alert cannot be dismissed until the PRN protocol form is completed";
  if (type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE || type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE) return "This alert cannot be dismissed until the care plan evaluation is completed";
  if (type === FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE) return "This alert cannot be dismissed until the form review is completed";
  if (type === "medication") return "This alert cannot be dismissed until the medication is restocked";
  return "This alert cannot be dismissed yet";
}

function canDismissAlert(
  alert: {
    type?: string;
    created_at?: string;
    metadata?: {
      medication_id?: string;
      care_plan_id?: string;
      care_file_folder_key?: string | null;
      alert_subtype?: string;
    } | null;
  },
  residentPhotoUpdatedAt?: string,
  residentLastBowelRecordedAt?: string,
  residentLastWeightCheckedAt?: string,
  foodFluidSixHourCompliant?: boolean,
  residentLastUrineRecordedAt?: string,
  completedPrnProtocolMedicationIds?: Set<string>,
  carePlanEvalLatestCreatedAt?: Record<string, string>
) {
  if (alert.type === "medication" && alert.metadata?.alert_subtype === "low_stock") return false;
  if (!NON_DISMISSIBLE_ALERT_TYPES.has(alert.type || "")) return true;

  if (alert.type === CARE_PLAN_EVALUATION_DUE_SOON_ALERT_TYPE || alert.type === CARE_PLAN_EVALUATION_OVERDUE_ALERT_TYPE) {
    const carePlanId = alert.metadata?.care_plan_id;
    if (!carePlanId || !alert.created_at) return false;
    const latest = carePlanEvalLatestCreatedAt?.[carePlanId];
    if (!latest) return false;
    return new Date(latest).getTime() > new Date(alert.created_at).getTime();
  }

  if (alert.type === FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE) return foodFluidSixHourCompliant === true;
  if (alert.type === URINE_NOT_RECORDED_6H_ALERT_TYPE) {
    if (!alert.created_at || !residentLastUrineRecordedAt) return false;
    return new Date(residentLastUrineRecordedAt).getTime() > new Date(alert.created_at).getTime();
  }
  if (alert.type === PRN_PROTOCOL_PENDING_12H_ALERT_TYPE) {
    const medicationId = alert.metadata?.medication_id;
    if (!medicationId || !completedPrnProtocolMedicationIds) return false;
    return completedPrnProtocolMedicationIds.has(medicationId);
  }

  if (!alert.created_at) return false;

  if (alert.type === "resident_photo_refresh_required") {
    if (!residentPhotoUpdatedAt) return false;
    return new Date(residentPhotoUpdatedAt).getTime() > new Date(alert.created_at).getTime();
  }
  if (alert.type === "bowel_not_recorded_3_days") {
    if (!residentLastBowelRecordedAt) return false;
    return new Date(residentLastBowelRecordedAt).getTime() > new Date(alert.created_at).getTime();
  }
  if (alert.type === "weight_check_due_tomorrow") {
    if (!residentLastWeightCheckedAt) return false;
    return new Date(`${residentLastWeightCheckedAt}T23:59:59.999Z`).getTime() > new Date(alert.created_at).getTime();
  }
  return false;
}

function shouldShowAlertForRole(alert: { type?: string }, role?: string) {
  if (alert.type === "medication") return role === "nurse";
  if (NURSE_AND_CARE_ASSISTANT_ALERT_TYPES.has(alert.type || "")) return role === "nurse" || role === "care_assistant";
  if (!NURSE_ONLY_ALERT_TYPES.has(alert.type || "")) return true;
  return role === "nurse";
}