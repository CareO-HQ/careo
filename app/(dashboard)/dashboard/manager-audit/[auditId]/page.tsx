"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import * as React from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, X, CalendarIcon, Trash2, ArrowUpRight, Building, Search, AlertCircle, History } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parse, isValid } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { withRoleGuard } from "@/lib/route-guards";
import { auditService } from "@/lib/audit-service";
import {
  findInsertIndexForNewSection,
  getParentSectionNumber,
  getSectionBlockEndExclusive,
} from "@/lib/audit-section-number";
import {
  ManagerAuditShell,
  ManagerAuditSummary,
} from "@/components/manager-audit/manager-audit-shell";
import {
  ManagerAuditWorkspace,
  type ManagerAuditActionPlanRow,
} from "@/components/manager-audit/manager-audit-workspace";
import { FallRegisterTable } from "@/components/manager-audit/fall-register-table";
import { IncidentAuditTable } from "@/components/manager-audit/incident-audit-table";
import { WoundsAnalysisTable } from "@/components/manager-audit/wounds-analysis-table";
import { RegistrationTrackerTable } from "@/components/manager-audit/registration-tracker-table";
import {
  DEFAULT_FALLS_COLUMN_QUESTIONS,
  formatAuditMonthLabel,
  syncFallRegisterState,
  type FallRegisterRow,
} from "@/lib/falls-register-utils";
import {
  DEFAULT_NISCC_TRACKER_QUESTIONS,
  DEFAULT_NMC_TRACKER_QUESTIONS,
  getRegistrationTrackerType,
  isRegistrationTrackerAudit,
  syncRegistrationTrackerState,
  type RegistrationTrackerRow,
} from "@/lib/registration-tracker-utils";
import {
  isIncidentAudit,
  syncIncidentAuditState,
  type IncidentAuditRow,
} from "@/lib/incident-audit-utils";
import {
  DEFAULT_WOUNDS_QUESTIONS,
  filterWoundsColumnQuestions,
  isWoundsAnalysisAudit,
  syncWoundsAnalysisState,
  type WoundsAnalysisRow,
} from "@/lib/wounds-analysis-utils";

const auditNames: Record<string, string> = {
  "0": "Care File Audit",
  "1": "Accidents and Incidents Analysis",
  "3": "Bedrails Audit",
  "5": "CARE Documentation (10% to be checked)",
  "7": "Competency Assessment Review",
  "8": "Complaints Analysis",
  "9": "Decontamination",
  "10": "Dining Experience",
  "11": "DOLS",
  "13": "Fall audit",
  "14": "Hand Hygiene Audit",
  "15": "Hoist and Sling Register",
  "16": "IPC Short Audit",
  "18": "Medication Audit",
  "19": "Modified Diet and Fluids Audit",
  "21": "Restrictive Practice",
  "22": "RTW Tracker",
  "23": "Safeguarding Database",
  "24": "Safety Alerts",
  "25": "Smoking Compliance",
  "26": "Supervision and Appraisal Matrix",
  "27": "Weights Analysis",
  "28": "Wounds Analysis",
  "29": "GDPR",
  "31": "Resident Agreement",
  "32": "NISCC Registration Tracker",
  "33": "NMC Registration Tracker",
  "34": "Incident audit",
  "35": "Moving & Handling Audit",
  "36": "Choking Risk Assessment Audit",
  "37": "DNACPR Audit",
  "38": "Care Management Reviews",
  "39": "Pressure Damage Prevention Audit",
  "40": "Health & Monitoring Audit",
  "41": "Mattress and Visual Checks Audit",
  "42": "Infection Control Audit",
};

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text" | "date" | "risk";
  isSection?: boolean; // For grid audit sections
  sectionNumber?: string;
}

function parentSectionRowExists(
  parentNum: string,
  rows: { isSection?: boolean; sectionNumber?: string }[]
): boolean {
  return rows.some(
    (r) => r.isSection && (r.sectionNumber ?? "").trim() === parentNum
  );
}

interface Answer {
  residentId: string;
  questionId: string;
  value: string;
  notes?: string;
  date?: string;
}

interface Comment {
  residentId: string;
  questionId: string;
  text: string;
}

interface ActionPlan {
  id: string;
  auditId: string;
  text: string;
  assignedTo: string; // This will be the UUID
  assignedToName: string; // This will be the name for display
  assignedToEmail: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  latestComment?: string;
  residentId?: string;
  residentName?: string;
}

const DEFAULT_DECONTAMINATION_QUESTIONS: Question[] = [
  {
    id: "decon-sec-1",
    text: "Environment and Staff",
    type: "text",
    isSection: true,
    sectionNumber: "1",
  },
  {
    id: "decon-q-1",
    text: "Is the home/area clean and tidy?",
    type: "compliance",
  },
  {
    id: "decon-q-2",
    text: "Is the home/unit free from odours?",
    type: "compliance",
  },
  {
    id: "decon-q-3",
    text: "Are staff wearing name badges?",
    type: "compliance",
  },
  {
    id: "decon-q-4",
    text: "Are staff dressed appropriately?",
    type: "compliance",
  },
  {
    id: "decon-q-5",
    text: "Are staff interacting with residents appropriately?",
    type: "compliance",
  },
  {
    id: "decon-q-6",
    text: "Is the external of the building clean and tidy?",
    type: "compliance",
  },
  {
    id: "decon-sec-2",
    text: "Cleaning and Disinfecting Agents",
    type: "text",
    isSection: true,
    sectionNumber: "2",
  },
  {
    id: "decon-q-7",
    text: "Detergent wipes or general purpose neutral detergent and warm water, disposable cloth and paper towels, are available for the cleaning of equipment",
    type: "compliance",
  },
  {
    id: "decon-q-8",
    text: "An appropriate disinfectant is available, e.g. chlorine releasing tablets, or equivalent products, for the disinfection of equipment.",
    type: "compliance",
  },
  {
    id: "decon-q-9",
    text: "Alternatively, a '2 in 1' product, which contains both a detergent and a disinfectant, e.g. Chlor-Clean or Actichlor Plus tablets, Clinell Universal Wipes, are available",
    type: "compliance",
  },
  {
    id: "decon-q-10",
    text: "A fresh solution of disinfectant is made up every 24 hours and marked with the date and time of preparation",
    type: "compliance",
  },
  {
    id: "decon-sec-3",
    text: "Decontamination Process and PPE",
    type: "text",
    isSection: true,
    sectionNumber: "3",
  },
  {
    id: "decon-q-11",
    text: "Equipment is decontaminated in a designated area or away from clean items of equipment",
    type: "compliance",
  },
  {
    id: "decon-q-12",
    text: "Hands are washed with liquid soap, warm running water and decontaminating equipment dried thoroughly with paper towels, before and after",
    type: "compliance",
  },
  {
    id: "decon-q-13",
    text: "Appropriate PPE is worn when decontaminating equipment, e.g. apron, gloves, and facial protection if there is a risk of splashing.",
    type: "compliance",
  },
  {
    id: "decon-q-14",
    text: "Staff are aware that when cleaning equipment, they should work using a 'S' shaped pattern from clean to dirty, top to bottom, starting at the point furthest away, overlapping slightly, but taking care not to go over the same area twice",
    type: "compliance",
  },
  {
    id: "decon-sec-4",
    text: "Equipment Cleanliness and Condition",
    type: "text",
    isSection: true,
    sectionNumber: "4",
  },
  {
    id: "decon-q-15",
    text: "There is documented evidence that equipment stored or not currently used by a resident has been decontaminated, e.g. 'I am clean' indicator tape or label, or cleaning records",
    type: "compliance",
  },
  {
    id: "decon-q-16",
    text: "Equipment that has been decontaminated is clean, free from dust, dirt and body fluid stains, and is within one month of the date written when last decontaminated. Staff should check 5 items of equipment. All items should be clean and free from dust, dirt or body fluid stains. Details of the equipment checked should be documented. All items must be clean to score a 'Yes'",
    type: "compliance",
  },
  {
    id: "decon-q-17",
    text: "Equipment is in a good condition, e.g. no rust, label residue or damage which would prevent effective cleaning",
    type: "compliance",
  },
  {
    id: "decon-sec-5",
    text: "Single Use Items",
    type: "text",
    isSection: true,
    sectionNumber: "5",
  },
  {
    id: "decon-q-18",
    text: "Staff can describe the symbol used to indicate 'single use' items",
    type: "compliance",
  },
  {
    id: "decon-q-19",
    text: "Staff are aware that 'single use' items should not be reused",
    type: "compliance",
  },
  {
    id: "decon-q-20",
    text: "Staff are aware that 'single patient use' items (e.g. nebulisers, oxygen masks) can be reused on the same resident but not on any other resident",
    type: "compliance",
  },
];

const DEFAULT_DECONTAMINATION_COLUMNS: Question[] = [
  { id: "decon-col-1", text: "Item 1", type: "compliance" },
  { id: "decon-col-2", text: "Item 2", type: "compliance" },
  { id: "decon-col-3", text: "Item 3", type: "compliance" },
  { id: "decon-col-4", text: "Item 4", type: "compliance" },
  { id: "decon-col-5", text: "Item 5", type: "compliance" },
];

const DEFAULT_INFECTION_CONTROL_QUESTIONS: Question[] = [
  {
    id: "inf-sec-0",
    text: "Management, Policies & Info",
    type: "text",
    isSection: true,
    sectionNumber: "1",
  },
  {
    id: "inf-q-126",
    text: "Does the Manager have a copy of the Northern Ireland Regional Infection Prevention and Control Manual or know how to access it (PHA website)",
    type: "yesno",
  },
  {
    id: "inf-q-127",
    text: "Is there information available on infection prevention and control for residents and their families",
    type: "yesno",
  },
  {
    id: "inf-sec-1",
    text: "Hand Washing & Personal Hygiene",
    type: "text",
    isSection: true,
    sectionNumber: "2",
  },
  {
    id: "inf-q-1",
    text: "Is liquid soap available at hand washing sinks . Check 10 for homes with 40 beds or below, check 20 if above 40 beds, 30 above 80 beds",
    type: "yesno",
  },
  {
    id: "inf-q-2",
    text: "Are the soap dispenser nozzles visibly clean check 10 for homes with 40 beds or below, check 20 if above 40 beds, 30 above 80 beds",
    type: "yesno",
  },
  {
    id: "inf-q-3",
    text: "Are paper towels available at hand washing sinks -Check 10 for homes with 40 beds or below, check 20 if above 40 beds, 30 above 80 beds",
    type: "yesno",
  },
  {
    id: "inf-q-4",
    text: "Are hand washing facilities clean and intact (check sinks, taps, splash backs) Check 10 for homes with 40 beds or below, check 20 if above 40 beds, 30 above 80 beds",
    type: "yesno",
  },
  {
    id: "inf-q-5",
    text: "Is hand hygiene part of the induction for all staff",
    type: "yesno",
  },
  {
    id: "inf-q-6",
    text: "Have staff received training in hand hygiene procedures (ask 5 staff)",
    type: "yesno",
  },
  {
    id: "inf-q-7",
    text: "Check - are Residents are offered to wash their hands using the hand basin or bowl and given a paper towel after using the toilet/commode",
    type: "yesno",
  },
  {
    id: "inf-q-8",
    text: "Check that staff nails are short, clean and free from nail varnish - check a minimum of 5 on duty",
    type: "yesno",
  },
  {
    id: "inf-q-9",
    text: "Check if staff are NOT wearing stoned rings or wrist jewellery during clinical procedures",
    type: "yesno",
  },
  {
    id: "inf-q-10",
    text: "Is hand hygiene encouraged and is alcohol hand rub available for staff and visitors if required",
    type: "yesno",
  },
  {
    id: "inf-sec-2",
    text: "Clinical Areas & Alcohol Hand Gel",
    type: "text",
    isSection: true,
    sectionNumber: "3",
  },
  {
    id: "inf-q-11",
    text: "Are posters/notices on display to promote hand hygiene",
    type: "yesno",
  },
  {
    id: "inf-q-12",
    text: "Is there a hand wash basin in each treatment/clinical area",
    type: "yesno",
  },
  {
    id: "inf-q-13",
    text: "Are hand wash basins dedicated for that use only and free from used equipment and inappropriate items",
    type: "yesno",
  },
  {
    id: "inf-q-14",
    text: "Is there easy access to the hand wash basin (not obstructed for use)",
    type: "yesno",
  },
  {
    id: "inf-q-15",
    text: "Is there NO soap bar at hand washing basins in treatment/clinical areas",
    type: "yesno",
  },
  {
    id: "inf-q-16",
    text: "Is alcohol hand gel available for staff and visitor use at the entrance/exit to the care home (or other location) and are the correct alcohol hand gel posters displayed alongside the alcohol hand gel unit",
    type: "yesno",
  },
  {
    id: "inf-q-17",
    text: "Is alcohol hand gel available within the home for staff use with the correct alcohol hand gel use poster displayed",
    type: "yesno",
  },
  {
    id: "inf-q-18",
    text: "Is alcohol hand gel used appropriately",
    type: "yesno",
  },
  {
    id: "inf-sec-3",
    text: "Care Practices & Glove Policies",
    type: "text",
    isSection: true,
    sectionNumber: "4",
  },
  {
    id: "inf-q-19",
    text: "Are clinical staff encouraged to use hand moisturisers",
    type: "yesno",
  },
  {
    id: "inf-q-20",
    text: "Do care staff wash their hands after removal of gloves - check a minimum of 5 staff on duty",
    type: "yesno",
  },
  {
    id: "inf-q-21",
    text: "Check that reusable cotton towels are NOT used by staff to dry hands",
    type: "yesno",
  },
  {
    id: "inf-q-22",
    text: "Check that reusable nailbrushes are NOT used for staff",
    type: "yesno",
  },
  {
    id: "inf-q-23",
    text: "Check that foot-operated bins for waste towels are next to hand wash sinks and are operational",
    type: "yesno",
  },
  {
    id: "inf-q-24",
    text: "Do care staff wash their hands prior to assisting a Resident to eat a meal- check a minimum of 5 staff",
    type: "yesno",
  },
  {
    id: "inf-q-25",
    text: "Do care staff wash their hands after handling contaminated items - example soiled - wet linen",
    type: "yesno",
  },
  {
    id: "inf-q-26",
    text: "Are vinyl gloves available for staff - check each unit/ floor/ and also that latex gloves are not is use",
    type: "yesno",
  },
  {
    id: "inf-q-27",
    text: "Check that the Registered Nurses on duty are aware of glove selection policy",
    type: "yesno",
  },
  {
    id: "inf-sec-4",
    text: "Gloves & Aprons",
    type: "text",
    isSection: true,
    sectionNumber: "5",
  },
  {
    id: "inf-q-28",
    text: "Are sterile and non sterile gloves (powder free) available",
    type: "yesno",
  },
  {
    id: "inf-q-29",
    text: "Is there an appropriate range of glove sizes available",
    type: "yesno",
  },
  {
    id: "inf-q-30",
    text: "Are gloves readily available and stored appropriately (e.g. within the area of use)",
    type: "yesno",
  },
  {
    id: "inf-q-31",
    text: "Observe and see if gloves are used as single use items - check a minimum of 5 staff",
    type: "yesno",
  },
  {
    id: "inf-q-32",
    text: "Are disposable plastic aprons worn when there is a risk that uniform may become exposed to body fluids or become wet. Example when giving a Resident a bath - check a minimum of 5 staff",
    type: "yesno",
  },
  {
    id: "inf-q-33",
    text: "When serving meals and/or assisting residents with meals, do care staff wearblue disposable aprons",
    type: "yesno",
  },
  {
    id: "inf-q-34",
    text: "Are disposal plastic aprons readily available and stored appropriately (in relevant areas)",
    type: "yesno",
  },
  {
    id: "inf-q-35",
    text: "Are disposal plastic aprons worn as single use items for each clinical procedure, e.g. wound dressings, barrier nursing",
    type: "yesno",
  },
  {
    id: "inf-sec-5",
    text: "Sharps Management",
    type: "text",
    isSection: true,
    sectionNumber: "6",
  },
  {
    id: "inf-q-36",
    text: "Have sharps bins NOT been filled above the fill line",
    type: "yesno",
  },
  {
    id: "inf-q-37",
    text: "Are bins free from protruding sharps",
    type: "yesno",
  },
  {
    id: "inf-q-38",
    text: "Do all sharps bins in use have a date commenced and signature recorded on the bin",
    type: "yesno",
  },
  {
    id: "inf-q-39",
    text: "Are all Sharp Bins labelled as 'sharps bins'",
    type: "yesno",
  },
  {
    id: "inf-q-40",
    text: "Are all Sharp Bins stored safely (e.g. away from the public, visitors, children)",
    type: "yesno",
  },
  {
    id: "inf-q-41",
    text: "Are all Sharp Bins stored off the floor",
    type: "yesno",
  },
  {
    id: "inf-q-42",
    text: "When the sharps bin is full, is the bin aperture locked",
    type: "yesno",
  },
  {
    id: "inf-q-43",
    text: "Are full and locked sharps bins stored under lock and key - away from public areas",
    type: "yesno",
  },
  {
    id: "inf-q-44",
    text: "Does inappropriate re-sheathing of needles NOT occur (check with 5 staff)",
    type: "yesno",
  },
  {
    id: "inf-q-45",
    text: "Are needles and syringes disposed off into a sharps bin as 1 unit (check with 5 staff)",
    type: "yesno",
  },
  {
    id: "inf-q-46",
    text: "Are staff aware of the action to be taken following a sharps injury. (check with 5 staff)",
    type: "yesno",
  },
  {
    id: "inf-q-47",
    text: "Is there a poster/display notice available for the management of a sharps injury",
    type: "yesno",
  },
  {
    id: "inf-sec-6",
    text: "Clinical / Treatment Room",
    type: "text",
    isSection: true,
    sectionNumber: "7",
  },
  {
    id: "inf-q-48",
    text: "Is there an identified area for the storage of clean and sterile equipment (e.g. dressings)",
    type: "yesno",
  },
  {
    id: "inf-q-49",
    text: "Is the clinical room clean are there no inappropriate equipment items present",
    type: "yesno",
  },
  {
    id: "inf-q-50",
    text: "Are hand hygiene facilities available",
    type: "yesno",
  },
  {
    id: "inf-q-51",
    text: "Are floors including edges and corners free from dust and spillages",
    type: "yesno",
  },
  {
    id: "inf-q-52",
    text: "Are shelves (including window ledge), bench tops and cupboards clean inside and out, and free from dust and spillage",
    type: "yesno",
  },
  {
    id: "inf-q-53",
    text: "Are medicine trolleys / dressing trolleys clean inside and out, and free from dust and spillage. Also check that wheels are clean and rotational.",
    type: "yesno",
  },
  {
    id: "inf-q-54",
    text: "Is the clinical fridge clean inside and out, and free from dust and spillage and does it only contain appropriate items.",
    type: "yesno",
  },
  {
    id: "inf-q-55",
    text: "Are all items/clinical supplies stored above floor level",
    type: "yesno",
  },
  {
    id: "inf-q-56",
    text: "If window blinds are in situ, are they free from stains and dust",
    type: "yesno",
  },
  {
    id: "inf-q-57",
    text: "Is there a foot operated clinical waste bin in the treatment room",
    type: "yesno",
  },
  {
    id: "inf-q-58",
    text: "Is all equipment (e.g. suction machine, nebuliser) visibly clean, with no body substances, dust, dirt or debris",
    type: "yesno",
  },
  {
    id: "inf-sec-7",
    text: "Domestic Services Room (DSR) & Cleaning",
    type: "text",
    isSection: true,
    sectionNumber: "8",
  },
  {
    id: "inf-q-59",
    text: "Is the Domestic Services Room locked at all times",
    type: "yesno",
  },
  {
    id: "inf-q-60",
    text: "Is the storage area clean, tidy and free from dust and spillage",
    type: "yesno",
  },
  {
    id: "inf-q-61",
    text: "Non relevant equipment is NOT stored within the DSR",
    type: "yesno",
  },
  {
    id: "inf-q-62",
    text: "Is the equipment used by the Domestic Staff, clean, well maintained and stored in a locked area",
    type: "yesno",
  },
  {
    id: "inf-q-63",
    text: "Are machines used for floor cleaning, clean and dry. e.g. mop buckets",
    type: "yesno",
  },
  {
    id: "inf-q-64",
    text: "Are products used for cleaning used at the correct dilution and comply with policy.",
    type: "yesno",
  },
  {
    id: "inf-q-65",
    text: "Is personal protective clothing available and appropriately used. (aprons and gloves)",
    type: "yesno",
  },
  {
    id: "inf-q-66",
    text: "Is there a copy of the COSHH Data Assessment file within the Domestic Services Area",
    type: "yesno",
  },
  {
    id: "inf-q-67",
    text: "Is the domestic trolley clean and are the wheels rotating freely and are no inappropriate items on the trolley",
    type: "yesno",
  },
  {
    id: "inf-q-68",
    text: "Check with 3 domestic staff: Are they aware of colour coded system and are they using it appropriately.",
    type: "yesno",
  },
  {
    id: "inf-q-69",
    text: "Are domestic staff aware of the importance of hand washing and is there evidence that this takes place",
    type: "yesno",
  },
  {
    id: "inf-q-128",
    text: "Are there clear cleaning schedules in place and are they being completed appropriately. During enhanced/outbreak are they completed minimum twice daily",
    type: "yesno",
  },
  {
    id: "inf-sec-8",
    text: "Waste Management & Disposal",
    type: "text",
    isSection: true,
    sectionNumber: "9",
  },
  {
    id: "inf-q-70",
    text: "Is there evidence that staff are segregating waste correctly",
    type: "yesno",
  },
  {
    id: "inf-q-71",
    text: "Is the waste storage area clean and tidy (external)",
    type: "yesno",
  },
  {
    id: "inf-q-72",
    text: "Is there NO storage of waste in corridors or other inappropriate areas",
    type: "yesno",
  },
  {
    id: "inf-q-73",
    text: "Are all plastic waste sacks fully enclosed within waste bins",
    type: "yesno",
  },
  {
    id: "inf-q-74",
    text: "Are all waste bins foot operated, with lids and in good working order",
    type: "yesno",
  },
  {
    id: "inf-q-75",
    text: "Are all waste bins clean inside and out - including outside bin stores",
    type: "yesno",
  },
  {
    id: "inf-q-76",
    text: "Are waste bags removed from clinical areas daily",
    type: "yesno",
  },
  {
    id: "inf-q-77",
    text: "Are waste bags no more than 2/3rd's full",
    type: "yesno",
  },
  {
    id: "inf-q-78",
    text: "Is the outside bin storage area clean and tidy with no overfill of waste containers",
    type: "yesno",
  },
  {
    id: "inf-sec-9",
    text: "Sluice Room",
    type: "text",
    isSection: true,
    sectionNumber: "10",
  },
  {
    id: "inf-q-79",
    text: "Is the sluice room clean and are there no inappropriate equipment items present",
    type: "yesno",
  },
  {
    id: "inf-q-80",
    text: "Are floors including edges and corners clean and free from dust and spillages",
    type: "yesno",
  },
  {
    id: "inf-q-81",
    text: "Are macerators and/or bed pan, urinal washers available",
    type: "yesno",
  },
  {
    id: "inf-q-82",
    text: "Are macerators and/or bed pan urinal washers clean and in working order",
    type: "yesno",
  },
  {
    id: "inf-q-83",
    text: "Are bedpans/slipper pans/urinals visibly clean and stored correctly. (e.g. inverted on racks)",
    type: "yesno",
  },
  {
    id: "inf-q-84",
    text: "Are catheter stands clean and ready for use",
    type: "yesno",
  },
  {
    id: "inf-q-85",
    text: "Are shelves and cupboards clean inside and out - and free of dust, litter and stains",
    type: "yesno",
  },
  {
    id: "inf-q-86",
    text: "Are separate hand washing facilities available within the sluice, including liquid soap and paper towels",
    type: "yesno",
  },
  {
    id: "inf-q-87",
    text: "Is personal protective clothing available and appropriately used. (aprons and gloves)",
    type: "yesno",
  },
  {
    id: "inf-q-88",
    text: "Is there a foot operated clinical waste bin",
    type: "yesno",
  },
  {
    id: "inf-sec-10",
    text: "Bedrooms & En-suites",
    type: "text",
    isSection: true,
    sectionNumber: "11",
  },
  {
    id: "inf-q-89",
    text: "Are bed frames and headboards clean and free from debris",
    type: "yesno",
  },
  {
    id: "inf-q-90",
    text: "Is the bedroom furniture clean and free from debris. Bed table - check underneath. Chairs and stools check crevices and under seat cushion for debris.",
    type: "yesno",
  },
  {
    id: "inf-q-91",
    text: "Is the residents personal equipment clean and free from debris, e.g. zimmer frame, commode, medical equipment, wheelchairs",
    type: "yesno",
  },
  {
    id: "inf-q-92",
    text: "Are carpets free from dust, debris and spillage",
    type: "yesno",
  },
  {
    id: "inf-q-93",
    text: "Are window coverings/window ledges free from stains, dust and debris",
    type: "yesno",
  },
  {
    id: "inf-q-94",
    text: "Are extractor fans clean and free from dust",
    type: "yesno",
  },
  {
    id: "inf-q-95",
    text: "Is the en-suite clean and tidy",
    type: "yesno",
  },
  {
    id: "inf-q-96",
    text: "Are call cords and switches clean and free from debris",
    type: "yesno",
  },
  {
    id: "inf-q-97",
    text: "Does the bedding look clean and free from debris, stains and spillage",
    type: "yesno",
  },
  {
    id: "inf-q-98",
    text: "Is there NO evidence of inappropriate food storage within the bedroom",
    type: "yesno",
  },
  {
    id: "inf-q-99",
    text: "Is there NO evidence of communal use of personal items. e.g. soap, single use cream",
    type: "yesno",
  },
  {
    id: "inf-sec-11",
    text: "Bathrooms & Showers",
    type: "text",
    isSection: true,
    sectionNumber: "12",
  },
  {
    id: "inf-q-100",
    text: "Is there NO evidence of bathrooms being used for the storage of general use equipment",
    type: "yesno",
  },
  {
    id: "inf-q-101",
    text: "Are all baths, sinks and accessories clean and free from debris",
    type: "yesno",
  },
  {
    id: "inf-q-102",
    text: "Are floors including edges and corners free from dust, debris and spillages",
    type: "yesno",
  },
  {
    id: "inf-q-103",
    text: "If in use, are shower curtains/doors clean and free from mould",
    type: "yesno",
  },
  {
    id: "inf-q-104",
    text: "Are baths cleaned after single use",
    type: "yesno",
  },
  {
    id: "inf-q-105",
    text: "Are bath hoists/chairs clean and free from debris (check underneath)",
    type: "yesno",
  },
  {
    id: "inf-q-106",
    text: "Are the toilets, hand wash sinks, handrails, raised toilet seats and surrounding area clean and free from debris and spillage",
    type: "yesno",
  },
  {
    id: "inf-q-107",
    text: "Are hand washing facilities available, including liquid soap and paper towels",
    type: "yesno",
  },
  {
    id: "inf-q-108",
    text: "Is there a facility for sanitary waste disposal (e.g. continence products)",
    type: "yesno",
  },
  {
    id: "inf-q-109",
    text: "If fitted, are extractor fans clean and free from dust and operational",
    type: "yesno",
  },
  {
    id: "inf-q-110",
    text: "For bathrooms and showers not in use, are procedures in place for weekly running of water systems (legionella control)",
    type: "yesno",
  },
  {
    id: "inf-q-111",
    text: "Is there NO evidence of cotton towel storage in the bathroom area",
    type: "yesno",
  },
  {
    id: "inf-q-112",
    text: "When the bathing/showering procedure is being undertaken, is there a linen disposal bag available",
    type: "yesno",
  },
  {
    id: "inf-sec-12",
    text: "Communal Areas (Dayrooms & Lounges)",
    type: "text",
    isSection: true,
    sectionNumber: "13",
  },
  {
    id: "inf-q-113",
    text: "Is the furniture clean and free from debris and spillage",
    type: "yesno",
  },
  {
    id: "inf-q-114",
    text: "Are floors, including edges and corners free from dirt, debris and spillage",
    type: "yesno",
  },
  {
    id: "inf-q-115",
    text: "Are window coverings/window ledges free from stains, dust and debris",
    type: "yesno",
  },
  {
    id: "inf-sec-13",
    text: "Laundry & Linen",
    type: "text",
    isSection: true,
    sectionNumber: "14",
  },
  {
    id: "inf-q-116",
    text: "Are clothes protectors, if used only used once then go for washing",
    type: "yesno",
  },
  {
    id: "inf-q-117",
    text: "Is clean linen stored in a clean designated area separate from used linen. e.g. not in the sluice or bathroom",
    type: "yesno",
  },
  {
    id: "inf-q-118",
    text: "Is clean linen free from dust and stains",
    type: "yesno",
  },
  {
    id: "inf-q-119",
    text: "Is the clean linen store free from inappropriate items",
    type: "yesno",
  },
  {
    id: "inf-q-120",
    text: "Are gloves and aprons worn when handling contaminated linen",
    type: "yesno",
  },
  {
    id: "inf-q-121",
    text: "Are hand washing facilities available in the laundry room, including liquid soap and paper towels",
    type: "yesno",
  },
  {
    id: "inf-q-122",
    text: "Is there a foot operated bin in the laundry area for disposal of paper towels",
    type: "yesno",
  },
  {
    id: "inf-q-123",
    text: "Is linen separated in colour coded bags",
    type: "yesno",
  },
  {
    id: "inf-q-124",
    text: "Is all linen placed in appropriate bags and not carried manually by staff or left on floors",
    type: "yesno",
  },
  {
    id: "inf-q-125",
    text: "Are all staff aware of the procedure for dealing with soiled linen and clothing (including wash temperatures if app)",
    type: "yesno",
  },
];

const DEFAULT_FALLS_QUESTIONS: Question[] = DEFAULT_FALLS_COLUMN_QUESTIONS.map(
  (question) => ({
    ...question,
    type: "text" as const,
  })
);

const FALL_REGISTER_AUDIT_ID = "13";

function upsertAnswerInList(
  prev: Answer[],
  residentId: string,
  questionId: string,
  value: string
): Answer[] {
  const existing = prev.find(
    (a) => a.residentId === residentId && a.questionId === questionId
  );
  if (existing) {
    return prev.map((a) =>
      a.residentId === residentId && a.questionId === questionId
        ? { ...a, value }
        : a
    );
  }
  return [...prev, { residentId, questionId, value }];
}

const DEFAULT_MOVING_HANDLING_QUESTIONS: Question[] = [
  { id: "ra_date", text: "Date of MH Risk Assessment", type: "date" },
  { id: "transfers_noted", text: "Are all transfers noted on the RA?", type: "yesno" },
  { id: "assistance_level", text: "Assistance Level?", type: "compliance" },
  { id: "equipment_required", text: "Equipment Required?", type: "compliance" },
  { id: "hoist_type", text: "Hoist Type, if required?", type: "compliance" },
  { id: "emergency_transfer", text: "Emergency Transfer equipment required?", type: "compliance" },
  { id: "cp_assistance_ok", text: "Does care plan state correct assistance level?", type: "yesno" },
  { id: "cp_equipment_ok", text: "Does care plan state correct equipment?", type: "yesno" },
  { id: "handover_ok", text: "Is handover sheet correct and up to date?", type: "yesno" },
  { id: "peep_ok", text: "Is correct Equipment & assistance noted on the PEEP?", type: "yesno" },
  { id: "peep_summary_ok", text: "Is correct Equipment & assistance noted on the PEEP summary sheet?", type: "yesno" },
  { id: "actions_required", text: "Actions Required?", type: "text" },
];

const DEFAULT_CHOKING_QUESTIONS: Question[] = [
  { id: "choke-q-1", text: "Date Choking Risk Assessment Completed", type: "date" },
  { id: "choke-q-2", text: "Choking Risk (Low / Medium / High)", type: "risk" },
  { id: "choke-q-3", text: "Date of SALT Referral (if applicable)", type: "date" },
  { id: "choke-q-4", text: "Date of SALT Assessment (if applicable)", type: "date" },
  { id: "choke-q-5", text: "Diet advice given by SALT (texture and fluid requirements)", type: "text" },
  { id: "choke-q-6", text: "Diet Notification in place and correct?", type: "yesno" },
  { id: "choke-q-7", text: "Care Plan in place and up to date?", type: "yesno" },
  { id: "choke-q-8", text: "Have there been any incidents of choking?", type: "yesno" },
  { id: "choke-q-9", text: "All relevant info evident on Safety Pause list?", type: "yesno" },
  { id: "choke-q-10", text: "Handover Sheet states correct IDDSI Advice?", type: "yesno" },
  { id: "choke-q-11", text: "REDS file updated with correct info?", type: "yesno" },
  { id: "choke-q-12", text: "Any actions required?", type: "text" },
];

const DEFAULT_DNACPR_QUESTIONS: Question[] = [
  { id: "dnacpr-q-1", text: "Is there a valid DNACPR form in place?", type: "yesno" },
  { id: "dnacpr-q-2", text: "Is the original red-bordered form in the front of the resident's care file?", type: "yesno" },
  { id: "dnacpr-q-3", text: "Has the form been signed and dated by the GP or consultant?", type: "yesno" },
  { id: "dnacpr-q-4", text: "Is the review date on the form current?", type: "yesno" },
  { id: "dnacpr-q-5", text: "Has the decision been discussed with the resident or their representative?", type: "yesno" },
  { id: "dnacpr-q-6", text: "Is the DNACPR status clearly documented in the care plan?", type: "yesno" },
  { id: "dnacpr-q-7", text: "Is the DNACPR status recorded on the handover sheet?", type: "yesno" },
  { id: "dnacpr-q-8", text: "Are all staff aware of the resident's DNACPR status?", type: "yesno" },
  { id: "dnacpr-q-9", text: "Actions Required?", type: "text" },
];

const DEFAULT_CARE_MGMT_REVIEW_QUESTIONS: Question[] = [
  { id: "cmr-q-1", text: "Trust", type: "text" },
  { id: "cmr-q-2", text: "Care Manager", type: "text" },
  { id: "cmr-q-3", text: "Date of Last Review", type: "date" },
  { id: "cmr-q-4", text: "Date of Review 2026", type: "date" },
  { id: "cmr-q-5", text: "Action to be Taken if Not Held", type: "text" },
  { id: "cmr-q-6", text: "Date Action Taken", type: "date" },
];

const DEFAULT_BEDRAIL_AUDIT_QUESTIONS: Question[] = [
  { id: "br-q-1", text: "Date of last Bedrail Risk Assessment?", type: "date" },
  { id: "br-q-2", text: "Reason for bedrail?", type: "text" },
  { id: "br-q-3", text: "Care plan in place and renewed monthly? (Add last review date)", type: "yesno" },
  { id: "br-q-4", text: "Has Consent or Best Interest been signed? (Date Signed)", type: "yesno" },
  { id: "br-q-5", text: "Is an airflow mattress being used?", type: "yesno" },
  { id: "br-q-6", text: "If airflow mattress - have extended height bedrails & covers been installed?", type: "yesno" },
  { id: "br-q-7", text: "Is the height from the mattress to the top rail greater than 220mm?", type: "yesno" },
  { id: "br-q-8", text: "Is the gap between the rails less than 120mm?", type: "yesno" },
  { id: "br-q-9", text: "Are bumpers in place and in good condition?", type: "yesno" },
  { id: "br-q-10", text: "Are hourly Bedrail checks being fully completed?", type: "yesno" },
  { id: "br-q-11", text: "Any other issues identified?", type: "text" },
];

const DEFAULT_MODIFIED_DIET_FLUIDS_QUESTIONS: Question[] = [
  {
    id: "mdf-salt-date",
    text: "Date of last SALT Assessment",
    type: "date",
  },
  {
    id: "mdf-salt-report",
    text: "Is the SALT report available in the Care Plan file?",
    type: "yesno",
  },
  {
    id: "mdf-recommendations-consistent",
    text: "Are recommendations of the SALT Report recorded and consistent on the written handover and Meal Distribution list?",
    type: "yesno",
  },
  {
    id: "mdf-care-plan-reflects",
    text: "Does the 'Eating and Drinking / Nutrition' care plan reflect the SALT recommendations, additional considerations and level of supervision required?",
    type: "yesno",
  },
  {
    id: "mdf-kitchen-notification",
    text: "Does the kitchen have the current resident SALT recommendations / modified diet recorded on Diet Notification sheets?",
    type: "yesno",
  },
  {
    id: "mdf-mars-kardex",
    text: "Is the MARS and KARDEX consistent with the SALT recommendations for prescribed modified fluids?",
    type: "yesno",
  },
  {
    id: "mdf-comments",
    text: "Comments",
    type: "text",
  },
];

const DEFAULT_PRESSURE_DAMAGE_QUESTIONS: Question[] = [
  { id: "pdp-q-1", text: "Braden Score", type: "text" },
  { id: "pdp-q-2", text: "Risk Level", type: "risk" },
  { id: "pdp-q-3", text: "Date of Braden Assessment", type: "date" },
  { id: "pdp-q-4", text: "Can the resident reposition themselves independently?", type: "yesno" },
  { id: "pdp-q-5", text: "Is a Pressure damage prevention care plan in place?", type: "yesno" },
  { id: "pdp-q-6", text: "Is a Repo Care plan in place? (Braden of 18 or less)", type: "yesno" },
  { id: "pdp-q-7", text: "Is correct Braden and risk level noted in the care plan?", type: "yesno" },
  { id: "pdp-q-8", text: "What is the frequency of repo stated in care plan?", type: "text" },
  { id: "pdp-q-9", text: "Does Care plan state that a pressure mattress is required?", type: "yesno" },
  { id: "pdp-q-10", text: "Does Care plan state that a pressure cushion is required?", type: "yesno" },
  { id: "pdp-q-11", text: "Is the correct equipment actually in place?", type: "yesno" },
  { id: "pdp-q-12", text: "Does Repo chart match the frequency stated on care plan?", type: "yesno" },
  { id: "pdp-q-13", text: "Does handover sheet state correct repo frequency?", type: "yesno" },
  { id: "pdp-q-14", text: "Actions to be taken?", type: "text" },
];

const DEFAULT_HEALTH_MONITORING_QUESTIONS: Question[] = [
  {
    id: "health-sec-1",
    text: "Section 1: General Environment & Staff",
    type: "text",
    isSection: true,
    sectionNumber: "1",
  },
  {
    id: "health-q-1",
    text: "Is the home/area clean and tidy?",
    type: "yesno",
  },
  {
    id: "health-q-2",
    text: "Is the home/unit free from odours?",
    type: "yesno",
  },
  {
    id: "health-q-3",
    text: "Are staff wearing name badges?",
    type: "yesno",
  },
  {
    id: "health-q-4",
    text: "Are staff dressed appropriately?",
    type: "yesno",
  },
  {
    id: "health-q-5",
    text: "Are staff interacting with residents appropriately?",
    type: "yesno",
  },
  {
    id: "health-q-6",
    text: "Is the external of the building clean and tidy?",
    type: "yesno",
  },
  {
    id: "health-sec-2",
    text: "Section 2: Admission Section",
    type: "text",
    isSection: true,
    sectionNumber: "2",
  },
  {
    id: "health-q-7",
    text: "Physical and Social Assessment - Reflective of current needs and updated at least yearly but sooner if changes occur, for example to mobility/consistency of diet etc...",
    type: "yesno",
  },
  {
    id: "health-q-8",
    text: "Admission Information - Resident details such as preferred name, date of birth, date of admission, next of kin details, GP details etc. All recorded and accurate",
    type: "yesno",
  },
  {
    id: "health-q-9",
    text: "Property List from within last 3 months",
    type: "yesno",
  },
  {
    id: "health-q-10",
    text: "Consent for photos, agreements when relatives want contacted, etc",
    type: "yesno",
  },
  {
    id: "health-sec-3",
    text: "Section 3: Assessments and Care Plans",
    type: "text",
    isSection: true,
    sectionNumber: "3",
  },
  {
    id: "health-q-11",
    text: "Care plan agreements with resident and next of kin.",
    type: "yesno",
  },
  {
    id: "health-q-12",
    text: "1. Maintaining A Safe Environment (Form)",
    type: "yesno",
  },
  {
    id: "health-q-13",
    text: "General Risk Assessment",
    type: "yesno",
  },
  {
    id: "health-q-14",
    text: "(PEEPS) Appropriately completed for smoking, distressed behaviour, absconding, self medication, inappropriate with females etc (Form)",
    type: "yesno",
  },
  {
    id: "health-q-15",
    text: "Consents and risk assessments for any restraints",
    type: "yesno",
  },
  {
    id: "health-q-16",
    text: "Medication",
    type: "yesno",
  },
  {
    id: "health-q-17",
    text: "Care plans in relation to how dementia/brain injury or other cognitive difficulties for that individual impacts on this individual's safety and other's safety is it clear about what the behaviour is? – saying things like \"agitated\" does not describe the behaviour – are they restlessness/pacing? are they shouting out? Are they shouting or swearing at others? Are they throwing things? Are they hitting out/scratching/spitting/pulling hair/pulling or nipping at staff skin or limbs? Or indeed someone can withdraw, go quiet when \"agitated\".",
    type: "yesno",
  },
  {
    id: "health-q-18",
    text: "Does the care plan should describe clearly how the behaviour is managed effectively – NB management strategy is not PRN medication such as diazepam – that should be a last resort.",
    type: "yesno",
  },
  {
    id: "health-comments",
    text: "Comments",
    type: "text",
  },
];

const DEFAULT_MATTRESS_VISUAL_CHECKS_QUESTIONS: Question[] = [
  {
    id: "repo-q-1",
    text: "Reposition regime",
    type: "text",
  },
  {
    id: "repo-q-2",
    text: "Mattress Type",
    type: "text",
  },
  {
    id: "repo-q-3",
    text: "Setting",
    type: "text",
  },
  {
    id: "repo-q-4",
    text: "Care Plan contains details of current mattress in place and setting required",
    type: "yesno",
  },
  {
    id: "repo-q-5",
    text: "Supplementary Booklets contain correct information",
    type: "yesno",
  },
  {
    id: "repo-q-6",
    text: "Mattress check 8am",
    type: "yesno",
  },
  {
    id: "repo-q-7",
    text: "Mattress check 8pm",
    type: "yesno",
  },
  {
    id: "repo-q-8",
    text: "Resident Visual Check 8am",
    type: "yesno",
  },
  {
    id: "repo-q-9",
    text: "Resident Visual Check 8pm",
    type: "yesno",
  },
];

const DEFAULT_MEDICATION_QUESTIONS: Question[] = [
  {
    id: "med-sec-1",
    text: "Section 1 & General Environment",
    type: "text",
    isSection: true,
    sectionNumber: "1",
  },
  {
    id: "med-q-1",
    text: "Is the home/area clean and tidy?",
    type: "compliance",
  },
  {
    id: "med-q-2",
    text: "Is the home/unit free from odours?",
    type: "compliance",
  },
  {
    id: "med-q-3",
    text: "Are staff wearing name badges?",
    type: "compliance",
  },
  {
    id: "med-q-4",
    text: "Are staff dressed appropriately?",
    type: "compliance",
  },
  {
    id: "med-q-5",
    text: "Are staff interacting with residents appropriately?",
    type: "compliance",
  },
  {
    id: "med-q-6",
    text: "Is the external of the building clean and tidy?",
    type: "compliance",
  },
  {
    id: "med-sec-2",
    text: "Section 2: Medicines Management & Monitoring",
    type: "text",
    isSection: true,
    sectionNumber: "2",
  },
  {
    id: "med-q-7",
    text: "Is there an up-to-date Medicines Management Policy and a copy of the Royal Pharmaceutical Guidelines?",
    type: "compliance",
  },
  {
    id: "med-q-8",
    text: "Does the pharmacy routinely identify allergies on the MAR chart?",
    type: "compliance",
  },
  {
    id: "med-q-9",
    text: "Are duplicate name alerts in place (as applicable)?",
    type: "compliance",
  },
  {
    id: "med-q-10",
    text: "Are all residents' medicines reviewed?",
    type: "compliance",
  },
  {
    id: "med-q-11",
    text: "Do staff monitor the effects of medicines?",
    type: "compliance",
  },
  {
    id: "med-q-12",
    text: "Does the Care Home have a procedure for reporting an adverse drug reaction?",
    type: "compliance",
  },
  {
    id: "med-q-13",
    text: "Are there up to date medicines information resources available?",
    type: "compliance",
  },
  {
    id: "med-q-14",
    text: "Is there a process in the care home for managing drugs requiring monitoring & a care plan in place? e.g., Methotrexate/clozapine, Warfarin/Lithium/Digoxin?",
    type: "compliance",
  },
  {
    id: "med-sec-3",
    text: "Section 3: Safe Care and Treatment & Transfers",
    type: "text",
    isSection: true,
    sectionNumber: "3",
  },
  {
    id: "med-q-15",
    text: "Are residents who self-medicate supported to enable them to manage some or all of their medicines (e.g., inhaler techniques, packaging, formulation)?",
    type: "compliance",
  },
  {
    id: "med-q-16",
    text: "Is there a process for confirming medication on admission within the previous three months to ensure that medicines are administered in accordance with the current prescription?",
    type: "compliance",
  },
  {
    id: "med-q-17",
    text: "When residents return to home following hospitalisation is the medication verified to ensure any changes to prescribed medication are reflected in PMR and MAR (if applicable)?",
    type: "compliance",
  },
  {
    id: "med-sec-4",
    text: "Section 4: Ordering, Receipt, and Disposal",
    type: "text",
    isSection: true,
    sectionNumber: "4",
  },
  {
    id: "med-q-18",
    text: "Are dosage instructions for warfarin received in writing from GP practice?",
    type: "compliance",
  },
  {
    id: "med-q-19",
    text: "Are transcriptions verified and signed by two staff?",
    type: "compliance",
  },
  {
    id: "med-q-20",
    text: "Are records of prescribing and administration clearly recorded?",
    type: "compliance",
  },
  {
    id: "med-q-21",
    text: "Is the pulse always recorded prior to the administration of Digoxin?",
    type: "compliance",
  },
  {
    id: "med-q-22",
    text: "Are there daily stock balances kept for high-risk drugs such as warfarin or clozapine?",
    type: "compliance",
  },
  {
    id: "med-q-23",
    text: "Is there a record of emergency equipment checked weekly and is there a record calibration?",
    type: "compliance",
  },
  {
    id: "med-q-24",
    text: "If electronic blood glucose monitoring meters are in use, and diabetic blood sugar tests clearly recorded?",
    type: "compliance",
  },
  {
    id: "med-q-25",
    text: "Is the date of the next blood testing clearly recorded?",
    type: "compliance",
  },
  {
    id: "med-q-26",
    text: "Are all medicines ordered by staff within the care home?",
    type: "compliance",
  },
  {
    id: "med-q-27",
    text: "Where possible, are all repeat prescriptions seen and checked by the home staff prior to going to the dispensing pharmacy?",
    type: "compliance",
  },
  {
    id: "med-q-28",
    text: "In the case of acute prescriptions (where it is often not practically possible for the care home to see the prescription in advance of dispensing) is a photocopy of the prescription attached to the supply of acute medication?",
    type: "compliance",
  },
  {
    id: "med-q-29",
    text: "Is there appropriate documentation of receipt of all medicines received?",
    type: "compliance",
  },
  {
    id: "med-q-30",
    text: "Are stock rotation procedures followed?",
    type: "compliance",
  },
  {
    id: "med-q-31",
    text: "Are all dressings within expiry date and have all dressings no longer prescribed been returned to pharmacy?",
    type: "compliance",
  },
  {
    id: "med-q-32",
    text: "Is there a procedure for the removal and disposal of unwanted and/or expired medicines?",
    type: "compliance",
  },
  {
    id: "med-q-33",
    text: "Residential care homes: Are medicines, including controlled drugs, returned to the community pharmacy and appropriate details recorded e.g. date, resident name, medicine, quantity, reason for disposal?",
    type: "compliance",
  },
  {
    id: "med-q-34",
    text: "Nursing homes: Is there a procedure for the safe and effective disposal of hazardous medication?",
    type: "compliance",
  },
  {
    id: "med-q-35",
    text: "Are medicines returned to the disposal company and all appropriate details recorded e.g., date, service username, medicine, quantity, reason for disposal?",
    type: "compliance",
  },
  {
    id: "med-q-36",
    text: "Are copies of the 'returns' records retained at the home to complete the audit trail?",
    type: "compliance",
  },
  {
    id: "med-sec-5",
    text: "Section 5: Storage & Risk Management",
    type: "text",
    isSection: true,
    sectionNumber: "5",
  },
  {
    id: "med-q-37",
    text: "Are medicines stored securely to prevent unauthorised access?",
    type: "compliance",
  },
  {
    id: "med-q-38",
    text: "Are all medicines stored in the appropriate place e.g., refrigerator, at room temperature?",
    type: "compliance",
  },
  {
    id: "med-q-39",
    text: "If a trolley is used, is the trolley secured to a wall in an appropriate room, or stored in a locked room when not in use?",
    type: "compliance",
  },
  {
    id: "med-q-40",
    text: "Are external/internal medicines stored separately, to prevent picking error?",
    type: "compliance",
  },
  {
    id: "med-q-41",
    text: "Is all oxygen equipment operational, are face masks covered and are hazard signs available and used during administration and in areas of storage?",
    type: "compliance",
  },
  {
    id: "med-q-42",
    text: "Are medicines stored in an organised and systematic fashion?",
    type: "compliance",
  },
  {
    id: "med-q-43",
    text: "Is there adequate space?",
    type: "compliance",
  },
  {
    id: "med-q-44",
    text: "Is the medicine storage room/cupboard/trolley/fridge locked?",
    type: "compliance",
  },
  {
    id: "med-sec-6",
    text: "Section 6 & 7: Managing Risk, CD Management, and Incident Reporting",
    type: "text",
    isSection: true,
    sectionNumber: "6",
  },
  {
    id: "med-q-45",
    text: "Are there appropriate reporting procedures including near misses?",
    type: "compliance",
  },
  {
    id: "med-q-46",
    text: "How are incidents identified, recorded and reported to RQIA?",
    type: "compliance",
  },
  {
    id: "med-q-47",
    text: "Is learning from incidents shared with staff?",
    type: "compliance",
  },
  {
    id: "med-q-48",
    text: "Is the care home registered to receive medicines alerts from the MHRA/RQIA?",
    type: "compliance",
  },
  {
    id: "med-q-49",
    text: "Is there a process in place to cascade the above alerts and guidance to relevant Care Home staff?",
    type: "compliance",
  },
  {
    id: "med-q-50",
    text: "Are controlled drugs stored in a separate, locked cupboard, which complies with regulations?",
    type: "compliance",
  },
  {
    id: "med-q-51",
    text: "Are CD errors reported to RQIA and/or local accountable officer?",
    type: "compliance",
  },
  {
    id: "med-q-52",
    text: "Is the CD record book a separate bound book with a separate page for each controlled drug, formulation, strength, resident?",
    type: "compliance",
  },
  {
    id: "med-q-53",
    text: "Are all entries fully completed?",
    type: "compliance",
  },
  {
    id: "med-q-54",
    text: "Is a balance check of all controlled drugs completed at each handover of staff?",
    type: "compliance",
  },
  {
    id: "med-sec-8",
    text: "Section 8: Records, Administration, Allergies, and Time-Sensitive Medication",
    type: "text",
    isSection: true,
    sectionNumber: "8",
  },
  {
    id: "med-q-55",
    text: "Does the home have a process for managing allergies and intolerances to medication to ensure that the same data is held by prescriber and care home?",
    type: "compliance",
  },
  {
    id: "med-q-56",
    text: "Is there a procedure to manage medicines brought into the home with the resident e.g., hospital discharge medication, compliance aids, non-prescribed medicines",
    type: "compliance",
  },
  {
    id: "med-q-57",
    text: "Confirm there have been no missed doses due to ordering and supply?",
    type: "compliance",
  },
  {
    id: "med-q-58",
    text: "Have staff been proactive to ensure that medicines do not run out of stock?",
    type: "compliance",
  },
  {
    id: "med-q-59",
    text: "Does the personal medication record (PMR) match the medication administration record (MAR) and prescribed medicines?",
    type: "compliance",
  },
  {
    id: "med-q-60",
    text: "Are all entries on the PMR clear and comprehensive with appropriate administration timings?",
    type: "compliance",
  },
  {
    id: "med-q-61",
    text: "Are medication administration records (MARs) accurately and clearly maintained?",
    type: "compliance",
  },
  {
    id: "med-q-62",
    text: "Has a running balance been completed and is it correct on MARs? (Oral, transdermal, creams)",
    type: "compliance",
  },
  {
    id: "med-q-63",
    text: "Are outcomes of relevant GP visits suitably recorded?",
    type: "compliance",
  },
  {
    id: "med-q-64",
    text: "Does the care home manage antibiotics and other acute prescriptions appropriately for the residents?",
    type: "compliance",
  },
  {
    id: "med-q-65",
    text: "Are the timings of administration appropriate?",
    type: "compliance",
  },
  {
    id: "med-q-66",
    text: "Are specific dosing instructions adhered to e.g., dosing intervals, taking medication before or after food?",
    type: "compliance",
  },
  {
    id: "med-q-67",
    text: "Are acute prescriptions received without delay?",
    type: "compliance",
  },
  {
    id: "med-q-68",
    text: "Are mid-cycle changes recorded correctly on the PMR?",
    type: "compliance",
  },
  {
    id: "med-q-69",
    text: "Are transcriptions verified by two members of staff?",
    type: "compliance",
  },
  {
    id: "med-q-70",
    text: "Are reasons for non-administration recorded and followed up with GP?",
    type: "compliance",
  },
  {
    id: "med-q-71",
    text: "Are directions for PRN medicines clear and comprehensive? Do they include maximum daily dose and minimum frequency?",
    type: "compliance",
  }
];

const DEFAULT_RESTRICTIVE_PRACTICE_QUESTIONS: Question[] = [
  {
    id: "rp-sec-1",
    text: "Restrictive Practices Checklist",
    type: "text",
    isSection: true,
    sectionNumber: "1",
  },
  {
    id: "rp-q-1",
    text: "Secure Unit: Is the resident in a secure unit?",
    type: "yesno",
  },
  {
    id: "rp-q-2",
    text: "Mattress, chair, floor mat: Is an airflow or specialized mattress/chair/mat in use?",
    type: "yesno",
  },
  {
    id: "rp-q-3",
    text: "Limited access to area within environment: Is there limited access to specific areas (e.g., kitchen)?",
    type: "yesno",
  },
  {
    id: "rp-q-4",
    text: "Motion Alarm: Is a motion alarm or sensor pad in use (e.g., mattress, chair, floor)?",
    type: "yesno",
  },
  {
    id: "rp-q-5",
    text: "Bed rails / bumpers: Are bed rails or bumpers implemented?",
    type: "yesno",
  },
  {
    id: "rp-q-6",
    text: "Specialist seating: Is specialized seating being utilized?",
    type: "yesno",
  },
  {
    id: "rp-q-7",
    text: "PRN medication: Is any PRN (pro re nata / as needed) chemical restraint or medication prescribed?",
    type: "yesno",
  },
  {
    id: "rp-q-8",
    text: "Covert medication: Is medication being administered covertly?",
    type: "yesno",
  },
  {
    id: "rp-q-9",
    text: "Observation Level: What is the observation status (e.g., General, Direct)?",
    type: "text",
  },
  {
    id: "rp-q-10",
    text: "One to one support: Is the resident receiving 1:1 dedicated support?",
    type: "yesno",
  },
  {
    id: "rp-q-11",
    text: "Risk Assessment in place?",
    type: "yesno",
  },
  {
    id: "rp-q-12",
    text: "Care Plan in place?",
    type: "yesno",
  },
  {
    id: "rp-q-13",
    text: "NOK consent / Best Interest decision: Is there Next of Kin consent or a documented Best Interest decision in place?",
    type: "yesno",
  },
];

const DEFAULT_DINING_QUESTIONS: Question[] = [
  {
    id: "dining-sec-1",
    text: "Section 1: Dining Environment & Atmosphere",
    type: "text",
    isSection: true,
    sectionNumber: "1",
  },
  {
    id: "dining-q-1",
    text: "The dining room is clean, tidy, and appropriately arranged to enable safe movement and promote a positive social experience.",
    type: "compliance",
  },
  {
    id: "dining-q-2",
    text: "All tables are appropriately set with table cloths, clean and appropriate cutlery, glassware and napkins. Condiments are available and offered.",
    type: "compliance",
  },
  {
    id: "dining-q-3",
    text: "Is soft music playing during the dining experience to help maintain a relaxed environment.",
    type: "compliance",
  },
  {
    id: "dining-q-4",
    text: "Are there contrasting colours for plates, tablecloths etc available to help aid with visibility for those who require it?",
    type: "compliance",
  },
  {
    id: "dining-q-5",
    text: "Dining areas have a calm atmosphere and are free from any unnecessary disruptions.",
    type: "compliance",
  },
  {
    id: "dining-q-6",
    text: "Catering equipment is conveniently but safely positioned (e.g., Bain Marie).",
    type: "compliance",
  },
  {
    id: "dining-sec-2",
    text: "Section 2: Menus & Meal Options",
    type: "text",
    isSection: true,
    sectionNumber: "2",
  },
  {
    id: "dining-q-7",
    text: "Daily menus are available which offer a choice of main meals, including vegetarian options (if required) and textured/modified foods and a selection of alternative lighter options. Picture menus for dementia units.",
    type: "compliance",
  },
  {
    id: "dining-q-8",
    text: "Modified texture meals appropriately labelled by the kitchen.",
    type: "compliance",
  },
  {
    id: "dining-q-9",
    text: "The food served matches the menu.",
    type: "compliance",
  },
  {
    id: "dining-q-10",
    text: "Plate presentation or photographs are used to assist with resident choice where needed.",
    type: "compliance",
  },
  {
    id: "dining-q-11",
    text: "There is a choice of hot and cold drinks to accompany meals.",
    type: "compliance",
  },
  {
    id: "dining-q-12",
    text: "If residents do not like their selected meal choice suitable alternatives are offered.",
    type: "compliance",
  },
  {
    id: "dining-sec-3",
    text: "Section 3: Staff Presence, Safety & Awareness",
    type: "text",
    isSection: true,
    sectionNumber: "3",
  },
  {
    id: "dining-q-13",
    text: "Safety Pause completed prior to commence meal service.",
    type: "compliance",
  },
  {
    id: "dining-q-14",
    text: "A nurse is present in the dining room during service.",
    type: "compliance",
  },
  {
    id: "dining-q-15",
    text: "REDS folder is available in the dining area, staff aware of its location and avail of information held on folder to complete safety pause.",
    type: "compliance",
  },
  {
    id: "dining-q-16",
    text: "Colleagues are aware of current resident dietary status (Question 2 staff and comment).",
    type: "compliance",
  },
  {
    id: "dining-q-17",
    text: "Colleagues are well-organised and deployed appropriately, are wearing PPE and have an awareness of hand hygiene techniques.",
    type: "compliance",
  },
  {
    id: "dining-sec-4",
    text: "Section 4: Meal Service & Resident Support",
    type: "text",
    isSection: true,
    sectionNumber: "4",
  },
  {
    id: "dining-q-18",
    text: "Residents are invited or assisted to the dining room at the appropriate time for meal service (i.e., not kept waiting for prolonged periods).",
    type: "compliance",
  },
  {
    id: "dining-q-19",
    text: "Each course is served separately. (No dessert placed on table until main meal has been served).",
    type: "compliance",
  },
  {
    id: "dining-q-20",
    text: "Through observation, residents requiring assistance are provided with appropriate support and required equipment, including dignity aprons.",
    type: "compliance",
  },
  {
    id: "dining-q-21",
    text: "Colleagues are observed to ensure that they are aware of how to encourage residents to enjoy their meal, encourage independence and maintain dignity.",
    type: "compliance",
  },
  {
    id: "dining-q-22",
    text: "Modified diets are the correct consistency for residents' needs and look appetising.",
    type: "compliance",
  },
  {
    id: "dining-q-23",
    text: "Food service is appropriately timed to allow residents to consume each course safely and comfortably.",
    type: "compliance",
  },
  {
    id: "dining-q-24",
    text: "Residents are offered appropriate hygiene support before and after meals such as wet wipes or similar.",
    type: "compliance",
  },
  {
    id: "dining-q-25",
    text: "Where residents receive meals in their bedrooms or in other communal areas the trays are clean, well-maintained, covered, appropriately presented, and contain all essential items, including condiments.",
    type: "compliance",
  },
];

const DEFAULT_DINING_COLUMNS: Question[] = [
  { id: "dining-col-1", text: "Dining Area 1", type: "compliance" },
  { id: "dining-col-2", text: "Dining Area 2", type: "compliance" },
  { id: "dining-col-3", text: "Dining Area 3", type: "compliance" },
];

const DEFAULT_ACCIDENT_LOG_QUESTIONS: Question[] = [
  {
    id: "acc-q-2",
    text: "Date & Time",
    type: "text",
  },
  {
    id: "acc-q-3",
    text: "Location",
    type: "text",
  },
  {
    id: "acc-q-4",
    text: "Injury",
    type: "text",
  },
  {
    id: "acc-q-5",
    text: "NOK Informed",
    type: "yesno",
  },
  {
    id: "acc-q-6",
    text: "Trust Key-worker Informed",
    type: "yesno",
  },
  {
    id: "acc-q-7",
    text: "RQIA informed",
    type: "yesno",
  },
  {
    id: "acc-q-8",
    text: "Falls R/A updated",
    type: "yesno",
  },
  {
    id: "acc-q-9",
    text: "C/P updated",
    type: "yesno",
  },
  {
    id: "acc-q-10",
    text: "24 hr PFO/CNS obs completed",
    type: "yesno",
  },
  {
    id: "acc-q-11",
    text: "Comments",
    type: "text",
  },
];

interface AuditDetailPageProps {
  params: Promise<{ auditId: string }>;
}

// Helper set of audit IDs that are home-based (grid layout)
const HOME_BASED_AUDIT_IDS = new Set([
  "24", // Safety Alerts
  "29", // GDPR
]);

/** Subjectless home audits using ManagerAuditWorkspace (not grid). */
const SUBJECTLESS_HOME_AUDIT_IDS = new Set(["9", "10", "42"]);

const AUDIT_LEVEL_SUBJECT_ID = "audit-level";

function migrateFallsAuditState(
  stateData: Record<string, unknown>,
  storedQuestions: Question[],
  storedAnswers: Answer[]
): { questions: Question[]; answers: Answer[]; shouldPersist: boolean } {
  const rowQuestions = stateData.row_questions as Question[] | undefined;
  const hasLegacyGrid = Array.isArray(rowQuestions) && rowQuestions.length > 0;

  const questions = DEFAULT_FALLS_QUESTIONS;
  const answers = storedAnswers.filter(
    (answer) =>
      answer.residentId.startsWith("fall-") &&
      answer.questionId !== "falls-q-5"
  );
  let shouldPersist = false;

  const needsQuestionReset =
    storedQuestions.length !== DEFAULT_FALLS_QUESTIONS.length ||
    storedQuestions.some((q) => q.isSection || q.id === "falls-q-5");

  if (needsQuestionReset) {
    shouldPersist = true;
  }

  const legacySubjectlessAnswers = storedAnswers.filter(
    (answer) => answer.residentId === AUDIT_LEVEL_SUBJECT_ID
  );
  if (legacySubjectlessAnswers.length > 0) {
    shouldPersist = true;
  }

  const gridAnswers = storedAnswers.filter(
    (a) =>
      a.questionId === "falls-col-1" && a.residentId.startsWith("falls-q-")
  );
  if (gridAnswers.length > 0) {
    shouldPersist = true;
  }

  if (hasLegacyGrid) {
    shouldPersist = true;
  }

  return { questions, answers, shouldPersist };
}

function formatCareFileAuditScheduleDate(value: string): string {
  if (!value || value === "-") return "—";
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return value;
  return format(parsed, "d MMM yyyy");
}

function aggregatePendingCareFileActionPlansByResident(
  rows: { resident_id?: string | null; status?: string | null }[] | null
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows || []) {
    const rid =
      typeof row.resident_id === "string" && row.resident_id.trim() !== ""
        ? row.resident_id
        : "";
    if (!rid) continue;
    const normalized = String(row.status ?? "pending")
      .replace(/-/g, "_")
      .toLowerCase();
    if (normalized === "completed") continue;
    counts[rid] = (counts[rid] ?? 0) + 1;
  }
  return counts;
}

function AuditDetailPage({ params }: AuditDetailPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const auditId = resolvedParams.auditId;

  // Check if this is a custom audit
  const isCustomAudit = auditId.startsWith('custom-');
  // templateType for custom audits is loaded from Supabase in loadData
  const [templateType, setTemplateType] = React.useState<string | null>(null);
  const [savedCategory, setSavedCategory] = React.useState<string | null>(null);
  const [savedStaffType, setSavedStaffType] = React.useState<string | null>(null);
  // Care home id (populated in loadData)
  const [careHomeId, setCareHomeId] = React.useState<string | null>(null);

  // Determine audit name (for custom, name is loaded from Supabase state)
  const [editableAuditName, setEditableAuditName] = React.useState(
    auditNames[auditId] || 'Loading...'
  );
  const auditName = editableAuditName;

  const isStaffBased = savedCategory === 'staff' || templateType === 'staff-based' || ["7", "22", "26", "32", "33"].includes(auditId);
  const isTeamBased = auditId === "18" || auditId === "3";

  const { profile, isLoading: isContextLoading } = useProfile();
  const { activeTeamId, activeOrganizationId, activeCareHomeId } = useActiveTeam();
  const [isLoading, setIsLoading] = useState(true);

  // Use the care home ID from the hook directly
  React.useEffect(() => {
    if (activeCareHomeId) {
      setCareHomeId(activeCareHomeId);
    }
  }, [activeCareHomeId]);

  const [allResidents, setAllResidents] = useState<any[]>([]); // All available residents
  const [selectedResidents, setSelectedResidents] = useState<any[]>([]); // Residents in the audit
  const [residentAuditData, setResidentAuditData] = useState<{ [residentId: string]: { frequency: string; lastAudited: string; nextAudit: string; auditor: string } }>({});
  
  // Custom states for Moving & Handling Audit (ID 35)
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [highlightedResidentId, setHighlightedResidentId] = useState<string | null>(null);

  // State for custom audit name editing
  const [isEditingName, setIsEditingName] = useState(false);

  const handleSaveAuditName = async () => {
    if (isCustomAudit && editableAuditName.trim() && careHomeId && activeOrganizationId) {
      // Update in Supabase
      await supabase.from('manager_audit_state').upsert({
        care_home_id: careHomeId,
        organization_id: activeOrganizationId,
        audit_type_id: auditId,
        custom_name: editableAuditName.trim(),
      }, { onConflict: 'care_home_id,audit_type_id' });
      // Also update the custom audit name
      await supabase.from('manager_custom_audits')
        .update({ name: editableAuditName.trim() })
        .eq('id', auditId)
        .eq('care_home_id', careHomeId);
      setIsEditingName(false);
      toast.success("Audit name updated");
    }
  };

  // State for form
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  // Dialog state for incomplete audit warning
  const [incompleteWarningOpen, setIncompleteWarningOpen] = useState(false);
  const [incompleteItems, setIncompleteItems] = useState<{ id: string; label: string }[]>([]);

  // State for grid-based audit (ID: 1)
  const [rowQuestions, setRowQuestions] = useState<Question[]>([]);
  const [columnQuestions, setColumnQuestions] = useState<Question[]>([]);
  const [fixedColumnData, setFixedColumnData] = useState<{
    [rowId: string]: {
      comment?: string;
      actionRequired?: string;
      actionCompleted?: string;
    };
  }>({});

  // State for action plan creation
  const [selectedResidentForActionPlan, setSelectedResidentForActionPlan] = useState<any>(null);

  // UI State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [questionDialogMode, setQuestionDialogMode] = useState<"row" | "column" | "standard">("standard");
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [sectionText, setSectionText] = useState("");
  const [sectionNumberText, setSectionNumberText] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"compliance" | "yesno" | "text" | "date" | "risk">("compliance");
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState("");
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<string | null>(null);
  const [isAddResidentDialogOpen, setIsAddResidentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingActionPlanCountByResident, setPendingActionPlanCountByResident] =
    useState<Record<string, number>>({});
  const [fallRegisterRows, setFallRegisterRows] = useState<FallRegisterRow[]>([]);
  const [fallRegisterAuditMonth, setFallRegisterAuditMonth] = useState("");
  const [isSyncingFallRegister, setIsSyncingFallRegister] = useState(false);
  const [registrationTrackerRows, setRegistrationTrackerRows] = useState<
    RegistrationTrackerRow[]
  >([]);
  const [isRefreshingRegistrationTracker, setIsRefreshingRegistrationTracker] =
    useState(false);
  const [incidentAuditRows, setIncidentAuditRows] = useState<IncidentAuditRow[]>(
    []
  );
  const [incidentAuditMonth, setIncidentAuditMonth] = useState("");
  const [isSyncingIncidentAudit, setIsSyncingIncidentAudit] = useState(false);
  const [woundsAnalysisRows, setWoundsAnalysisRows] = useState<WoundsAnalysisRow[]>(
    []
  );
  const [woundsAnalysisMonth, setWoundsAnalysisMonth] = useState("");
  const [isSyncingWoundsAnalysis, setIsSyncingWoundsAnalysis] = useState(false);

  // Load data
  const applyFallRegisterSync = useCallback(
    async (
      chId: string,
      orgId: string,
      baseAnswers: Answer[],
      overwriteEmptyOnly = true
    ) => {
      const synced = await syncFallRegisterState(
        chId,
        orgId,
        baseAnswers,
        overwriteEmptyOnly
      );
      setFallRegisterRows(synced.rows);
      setFallRegisterAuditMonth(synced.auditMonth);
      setAnswers(synced.answers);
      return synced;
    },
    []
  );

  const applyRegistrationTrackerSync = useCallback(
    async (
      chId: string,
      orgId: string,
      trackerAuditId: "32" | "33",
      baseAnswers: Answer[],
      overwriteEmptyOnly = true
    ) => {
      const synced = await syncRegistrationTrackerState(
        chId,
        orgId,
        trackerAuditId,
        baseAnswers,
        overwriteEmptyOnly
      );
      setRegistrationTrackerRows(synced.rows);
      setAnswers(synced.answers);
      return synced;
    },
    []
  );

  const applyIncidentAuditSync = useCallback(
    async (
      chId: string,
      orgId: string,
      baseAnswers: Answer[],
      overwriteEmptyOnly = true
    ) => {
      const synced = await syncIncidentAuditState(
        chId,
        orgId,
        baseAnswers,
        overwriteEmptyOnly
      );
      setIncidentAuditRows(synced.rows);
      setIncidentAuditMonth(synced.auditMonth);
      setAnswers(synced.answers);
      return synced;
    },
    []
  );

  const applyWoundsAnalysisSync = useCallback(
    async (
      chId: string,
      orgId: string,
      baseAnswers: Answer[],
      overwriteEmptyOnly = true
    ) => {
      const synced = await syncWoundsAnalysisState(
        chId,
        orgId,
        baseAnswers,
        overwriteEmptyOnly
      );
      setWoundsAnalysisRows(synced.rows);
      setWoundsAnalysisMonth(synced.auditMonth);
      setAnswers(synced.answers);
      return synced;
    },
    []
  );

  const loadData = useCallback(async () => {
    if (!activeCareHomeId || !activeOrganizationId) return;

    try {
      setIsLoading(true);

      // 1. Context already available via hook!
      setCareHomeId(activeCareHomeId);

      // 1.1 Fetch state from Supabase
      const { data: stateData, error: stateError } = await supabase
        .from('manager_audit_state')
        .select('*')
        .eq('care_home_id', activeCareHomeId)
        .eq('audit_type_id', auditId)
        .single();

      if (stateError && stateError.code !== 'PGRST116') {
        throw stateError;
      }

      // 1.2 Fetch custom meta if applicable
      let customMeta: any = null;
      if (auditId.startsWith('custom-')) {
        const { data: meta } = await supabase
          .from('manager_custom_audits')
          .select('*')
          .eq('id', auditId)
          .single();
        customMeta = meta;
      }

      const savedCategoryVal = stateData?.category || customMeta?.category || "";
      const templateTypeVal = stateData?.template_type || customMeta?.template_type || "";
      const isStaffBased = 
        savedCategoryVal === 'staff' || 
        templateTypeVal === 'staff-based' || 
        ["7", "22", "26", "32", "33"].includes(auditId);

      // 2. Load residents scoped to the active care home (or teams if Medication Audit or users if Staff based)
      let allResidentsData: any[] = [];
      if (auditId === "18" || auditId === "3") {
        let query = supabase.from('teams').select('id, name');
        if (activeCareHomeId) {
          query = query.eq('care_home_id', activeCareHomeId);
        } else {
          query = query.eq('organization_id', activeOrganizationId);
        }
        const { data: teamData } = await query;
        if (teamData) {
          const mapped = teamData.map((t: any) => ({
            _id: t.id,
            firstName: t.name,
            lastName: "",
            roomNumber: "",
            imageUrl: ""
          }));
          setAllResidents(mapped);
          allResidentsData = mapped;
        }
      } else if (isStaffBased) {
        let staffQuery = supabase
          .from('users')
          .select('*')
          .eq('active_organization_id', activeOrganizationId)
          .eq('active_care_home_id', activeCareHomeId)
          .eq('is_onboarding_complete', true);

        if (auditId === "33") {
          staffQuery = staffQuery.eq('role', 'nurse');
        }

        const { data: userData } = await staffQuery;
        if (userData) {
          const filteredUsers =
            auditId === "32"
              ? userData.filter(
                  (u: { role?: string | null; is_saas_admin?: boolean | null }) =>
                    u.role?.toLowerCase().trim() !== "owner" &&
                    u.is_saas_admin !== true
                )
              : userData;
          const mapped = filteredUsers.map((u: any) => {
            const nameParts = (u.name || "").trim().split(/\s+/);
            const first = nameParts[0] || u.email || "Staff";
            const last = nameParts.slice(1).join(" ");
            return {
              _id: u.id,
              firstName: first,
              lastName: last,
              roomNumber: u.role ? (() => {
                const r = u.role.toLowerCase().trim();
                if (r === "care-staff" || r === "carer") return "CA/SCA";
                if (r === "nurse") return "Nurse";
                if (r === "manager") return "Manager";
                if (r === "admin") return "Admin";
                return u.role.split(/[-_]+/).map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
              })() : "",
              imageUrl: u.image_url || ""
            };
          });
          setAllResidents(mapped);
          allResidentsData = mapped;
        }
      } else {
        const { data: resData } = await supabase
          .from('residents')
          .select('*')
          .eq('organization_id', activeOrganizationId)
          .eq('care_home_id', activeCareHomeId);
        if (resData) {
          const mapped = resData.map((r: any) => ({
            _id: r.id,
            firstName: r.first_name || r.firstName,
            lastName: r.last_name || r.lastName,
            roomNumber: r.room_number || r.roomNumber,
            imageUrl: r.image_url || r.imageUrl,
            teamId: r.team_id || r.teamId
          }));
          setAllResidents(mapped);
          allResidentsData = mapped;
        }

        if (auditId === "35" || auditId === "34" || auditId === "37" || auditId === "36" || auditId === "38" || auditId === "39" || auditId === "28") {
          const { data: teamData } = await supabase
            .from('teams')
            .select('id, name')
            .eq('care_home_id', activeCareHomeId);
          if (teamData) {
            setTeams(teamData);
            if (teamData.length > 0) {
              setSelectedUnitId(prev => prev || teamData[0].id);
            }
          }
        }
      }

      if (auditId !== "0") {
        setPendingActionPlanCountByResident({});
      } else {
        try {
          const dbPlans = await auditService.getManagerActionPlans(
            "0",
            activeCareHomeId
          );
          setPendingActionPlanCountByResident(
            aggregatePendingCareFileActionPlansByResident(
              (dbPlans || []) as {
                resident_id?: string | null;
                status?: string | null;
              }[]
            )
          );
        } catch (e) {
          console.warn("Could not load care file action plan counts:", e);
          setPendingActionPlanCountByResident({});
        }
      }

      // 3. Load org members for action plan assignments
      const { data: members } = await supabase
        .from('users')
        .select('id, email, name, image_url, role')
        .eq('active_organization_id', activeOrganizationId);
      setOrgMembers(members || []);

      // 4. Restore saved state from Supabase
      if (stateData) {
        // Restore state from Supabase
        if (stateData.questions && (stateData.questions as Question[]).length > 0) {
          let loadedQuestions = stateData.questions as Question[];
          if (auditId === "32") {
            const cleaned = loadedQuestions.filter(q => q.id !== "niscc-q1" && q.text !== "Job Role CA/SCA");
            if (cleaned.length !== loadedQuestions.length) {
              loadedQuestions = cleaned;
              await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
                questions: cleaned,
              });
            }
          }
          if (auditId === "34") {
            const cleaned = loadedQuestions.filter(q => q.id !== "acc-q-1");
            const migrated = cleaned.map((q) =>
              q.id === "acc-q-4" && q.text !== "Injury"
                ? { ...q, text: "Injury" }
                : q
            );
            const changed =
              cleaned.length !== loadedQuestions.length ||
              migrated.some((q, i) => q.text !== cleaned[i]?.text);
            if (changed) {
              loadedQuestions = migrated;
              await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
                questions: migrated,
              });
            } else {
              loadedQuestions = cleaned;
            }
          }
          if (auditId === "36") {
            // Migration: upgrade choke-q-2 from "text" to "risk" type
            const migrated = loadedQuestions.map(q =>
              q.id === "choke-q-2" && q.type !== "risk" ? { ...q, type: "risk" as const } : q
            );
            const changed = migrated.some((q, i) => q.type !== loadedQuestions[i].type);
            if (changed) {
              loadedQuestions = migrated;
              await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
                questions: migrated,
              });
            }
          }
          if (auditId === "28") {
            const migrated = loadedQuestions.map((q) =>
              q.id === "wound-curr-antiseptics" && q.type !== "yesno"
                ? { ...q, type: "yesno" as const }
                : q
            );
            const changed = migrated.some((q, i) => q.type !== loadedQuestions[i].type);
            if (changed) {
              loadedQuestions = migrated;
              await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
                questions: migrated,
              });
            }
          }
          if (auditId === "42") {
            const needsMigration = loadedQuestions.length !== DEFAULT_INFECTION_CONTROL_QUESTIONS.length ||
              loadedQuestions.some((q) => {
                const dq = DEFAULT_INFECTION_CONTROL_QUESTIONS.find((d) => d.id === q.id);
                return !dq || dq.text !== q.text || dq.type !== q.type;
              });
            if (needsMigration) {
              loadedQuestions = DEFAULT_INFECTION_CONTROL_QUESTIONS;
              await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
                questions: DEFAULT_INFECTION_CONTROL_QUESTIONS,
              });
            }
          }
          setQuestions(loadedQuestions);
        } else if (auditId === "18") {
          setQuestions(DEFAULT_MEDICATION_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_MEDICATION_QUESTIONS,
          });
        } else if (auditId === "34") {
          setQuestions(DEFAULT_ACCIDENT_LOG_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_ACCIDENT_LOG_QUESTIONS,
          });
        } else if (auditId === "21") {
          setQuestions(DEFAULT_RESTRICTIVE_PRACTICE_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_RESTRICTIVE_PRACTICE_QUESTIONS,
          });
        } else if (auditId === "32") {
          setQuestions(DEFAULT_NISCC_TRACKER_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_NISCC_TRACKER_QUESTIONS,
          });
        } else if (auditId === "33") {
          setQuestions(DEFAULT_NMC_TRACKER_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_NMC_TRACKER_QUESTIONS,
          });
        } else if (auditId === "9") {
          setQuestions(DEFAULT_DECONTAMINATION_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_DECONTAMINATION_QUESTIONS,
          });
        } else if (auditId === "42") {
          setQuestions(DEFAULT_INFECTION_CONTROL_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_INFECTION_CONTROL_QUESTIONS,
          });
        } else if (auditId === "10") {
          setQuestions(DEFAULT_DINING_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_DINING_QUESTIONS,
          });
        } else if (auditId === FALL_REGISTER_AUDIT_ID) {
          setQuestions(DEFAULT_FALLS_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_FALLS_QUESTIONS,
            template_type: "general",
          });
        } else if (auditId === "35") {
          setQuestions(DEFAULT_MOVING_HANDLING_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_MOVING_HANDLING_QUESTIONS,
          });
        } else if (auditId === "36") {
          setQuestions(DEFAULT_CHOKING_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_CHOKING_QUESTIONS,
          });
        } else if (auditId === "37") {
          setQuestions(DEFAULT_DNACPR_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_DNACPR_QUESTIONS,
          });
        } else if (auditId === "38") {
          setQuestions(DEFAULT_CARE_MGMT_REVIEW_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_CARE_MGMT_REVIEW_QUESTIONS,
          });
        } else if (auditId === "3") {
          setQuestions(DEFAULT_BEDRAIL_AUDIT_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_BEDRAIL_AUDIT_QUESTIONS,
          });
        } else if (auditId === "39") {
          setQuestions(DEFAULT_PRESSURE_DAMAGE_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_PRESSURE_DAMAGE_QUESTIONS,
          });
        } else if (auditId === "28") {
          setQuestions(DEFAULT_WOUNDS_QUESTIONS as Question[]);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_WOUNDS_QUESTIONS as Question[],
          });
        } else if (auditId === "19") {
          setQuestions(DEFAULT_MODIFIED_DIET_FLUIDS_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_MODIFIED_DIET_FLUIDS_QUESTIONS,
          });
        } else if (auditId === "40") {
          setQuestions(DEFAULT_HEALTH_MONITORING_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_HEALTH_MONITORING_QUESTIONS,
          });
        } else if (auditId === "41") {
          setQuestions(DEFAULT_MATTRESS_VISUAL_CHECKS_QUESTIONS);
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            questions: DEFAULT_MATTRESS_VISUAL_CHECKS_QUESTIONS,
          });
        }
        if (stateData.answers) setAnswers(stateData.answers as Answer[]);
        if (stateData.comments) setComments(stateData.comments as Comment[]);
        const loadedRowQuestions = stateData.row_questions as Question[];
        const loadedColQuestions = stateData.column_questions as Question[];

        let fallRegisterBaseAnswers: Answer[] = (stateData.answers as Answer[]) || [];

        if (auditId === FALL_REGISTER_AUDIT_ID) {
          const storedQuestions = (stateData.questions as Question[]) || [];
          const storedAnswers = (stateData.answers as Answer[]) || [];
          const migrated = migrateFallsAuditState(
            stateData as Record<string, unknown>,
            storedQuestions,
            storedAnswers
          );
          setQuestions(migrated.questions);
          setAnswers(migrated.answers);
          fallRegisterBaseAnswers = migrated.answers;
          if (migrated.shouldPersist) {
            await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
              questions: migrated.questions,
              answers: migrated.answers,
              template_type: "general",
              row_questions: [],
              column_questions: [],
              fixed_column_data: {},
              selected_residents: [],
            });
          }
        }

        setRowQuestions(loadedRowQuestions || []);
        setColumnQuestions(loadedColQuestions || []);
        if (stateData.fixed_column_data) setFixedColumnData(stateData.fixed_column_data as any);
        if (stateData.resident_audit_data) setResidentAuditData(stateData.resident_audit_data as any);
        if (stateData.custom_name) setEditableAuditName(stateData.custom_name);
        if (auditId === "3" || auditId === "18" || auditId === "21" || auditId === "32" || auditId === "33" || auditId === "34" || auditId === "35" || auditId === "37" || auditId === "36" || auditId === "38" || auditId === "39" || auditId === "28" || auditId === "19" || auditId === "40" || auditId === "41") {
          setTemplateType("general");
          if (stateData.template_type !== "general") {
            await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
              template_type: "general",
            });
          }
        } else if (auditId === FALL_REGISTER_AUDIT_ID) {
          setTemplateType("general");
          if (stateData.template_type !== "general") {
            await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
              template_type: "general",
            });
          }
        } else if (SUBJECTLESS_HOME_AUDIT_IDS.has(auditId)) {
          setTemplateType("home-based");
          if (stateData.template_type !== "home-based") {
            await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
              template_type: "home-based",
            });
          }
        } else if (stateData.template_type) {
          setTemplateType(stateData.template_type as any);
        }
        if (stateData.category) setSavedCategory(stateData.category as any);
        if (stateData.staff_type) setSavedStaffType(stateData.staff_type as any);

        if (stateData.action_plans) {
          let plans = (stateData.action_plans as ActionPlan[]).map((plan) => ({
            ...plan,
            dueDate: plan.dueDate ? new Date(plan.dueDate as unknown as string) : undefined,
          }));
          // Action plan status is updated on audit_manager_action_plans (e.g. from /dashboard/action-plans).
          // manager_audit_state.action_plans JSON can be stale — merge status from DB.
          if (activeCareHomeId) {
            try {
              const dbPlans = await auditService.getManagerActionPlans(auditId, activeCareHomeId);
              const dbById = new Map((dbPlans || []).map((p: { id: string }) => [p.id, p]));
              plans = plans.map((plan) => {
                const row = dbById.get(plan.id) as
                  | { status?: string; latest_comment?: string | null }
                  | undefined;
                if (!row) return plan;
                let status = row.status ?? plan.status;
                if (status === "in-progress") status = "in_progress";
                return {
                  ...plan,
                  status,
                  latestComment: row.latest_comment ?? plan.latestComment,
                };
              });
            } catch (e) {
              console.warn("Could not merge manager action plan status from DB:", e);
            }
          }
          setActionPlans(plans);
        }

        let savedResidents = (stateData.selected_residents as any[]) || [];
        
        // Data migration for audit 34: if it previously saved teams instead of residents, wipe it so it reloads all residents
        if (auditId === "34" && savedResidents.length > 0 && !savedResidents[0].teamId && savedResidents[0].lastName === "") {
          savedResidents = [];
        }

        // Data migration for audit 3: if it previously saved residents, wipe it so it reloads all teams
        if (auditId === "3" && savedResidents.length > 0 && (savedResidents[0].lastName !== "" || savedResidents[0].roomNumber !== "")) {
          savedResidents = [];
        }

        // Data migration for staff-based audits (e.g. audit 7): if they previously saved residents instead of staff, wipe them so it reloads staff members
        if (isStaffBased && savedResidents.length > 0) {
          const savedIds = savedResidents.map((r: any) => r._id);
          const { data: matchingResidents } = await supabase
            .from('residents')
            .select('id')
            .in('id', savedIds);
          if (matchingResidents && matchingResidents.length > 0) {
            savedResidents = [];
          }
        }

        if (savedResidents.length > 0) {
          setSelectedResidents(savedResidents);
        } else {
          // If state exists but selected residents is empty, handle defaults
          const isGridBasedAudit = (HOME_BASED_AUDIT_IDS.has(auditId) || stateData.template_type === 'home-based') && !SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && auditId !== FALL_REGISTER_AUDIT_ID && auditId !== "18" && auditId !== "3" && auditId !== "34" && auditId !== "39" && auditId !== "28" && auditId !== "19" && auditId !== "40" && auditId !== "41";
          if (!isGridBasedAudit && !SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && templateType !== 'staff-based' && allResidentsData.length > 0) {
            setSelectedResidents(allResidentsData);
            await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, { selected_residents: allResidentsData });
          }
        }

        if (auditId === FALL_REGISTER_AUDIT_ID) {
          const synced = await applyFallRegisterSync(
            activeCareHomeId,
            activeOrganizationId,
            fallRegisterBaseAnswers,
            true
          );
          if (synced.hasChanges) {
            await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
              answers: synced.answers,
            });
          }
        }

        if (isIncidentAudit(auditId)) {
          const synced = await applyIncidentAuditSync(
            activeCareHomeId,
            activeOrganizationId,
            (stateData.answers as Answer[]) || [],
            true
          );
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            answers: synced.answers,
            selected_residents: [],
          });
        }

        if (isWoundsAnalysisAudit(auditId)) {
          const synced = await applyWoundsAnalysisSync(
            activeCareHomeId,
            activeOrganizationId,
            (stateData.answers as Answer[]) || [],
            true
          );
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            answers: synced.answers,
            selected_residents: [],
          });
        }

        if (isRegistrationTrackerAudit(auditId)) {
          const trackerBaseAnswers = (stateData.answers as Answer[]) || [];
          const synced = await applyRegistrationTrackerSync(
            activeCareHomeId,
            activeOrganizationId,
            auditId,
            trackerBaseAnswers,
            true
          );
          const trackerResidents = allResidentsData.filter((resident) =>
            synced.rows.some((row) => row.staffId === resident._id)
          );
          setSelectedResidents(trackerResidents);
          const stateUpdates: Record<string, unknown> = {
            selected_residents: trackerResidents,
          };
          if (synced.hasChanges) {
            stateUpdates.answers = synced.answers;
          }
          await upsertAuditState(
            activeCareHomeId,
            activeOrganizationId,
            auditId,
            stateUpdates
          );
        }
      } else {
        // 5. Initial setup if no state exists in Supabase
        const isGridBasedAudit = HOME_BASED_AUDIT_IDS.has(auditId);
        if (isGridBasedAudit) {
          setSelectedResidents([]);
          if (auditId === "10") {
            setRowQuestions(DEFAULT_DINING_QUESTIONS);
            setColumnQuestions(DEFAULT_DINING_COLUMNS);
          }
        } else if (auditId.startsWith('custom-')) {
          if (customMeta) {
            setEditableAuditName(customMeta.name);
            setSavedCategory(customMeta.category);
            setTemplateType(customMeta.template_type);
            const isCustomHomeBased = customMeta.template_type === 'home-based';
            setSelectedResidents(isCustomHomeBased ? [] : allResidentsData);
          }
        } else {
          setSelectedResidents(SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) ? [] : allResidentsData);
        }

        // Initialize state in Supabase
        await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
          selected_residents: SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) ? [] : (!isGridBasedAudit ? allResidentsData : []),
          template_type: auditId === "0" ? "general" : (SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) ? "home-based" : (isGridBasedAudit ? "home-based" : "general")),
          ...(auditId === "9" ? {
            questions: DEFAULT_DECONTAMINATION_QUESTIONS,
          } : {}),
          ...(auditId === "42" ? {
            questions: DEFAULT_INFECTION_CONTROL_QUESTIONS,
          } : {}),
          ...(auditId === "10" ? {
            questions: DEFAULT_DINING_QUESTIONS,
          } : {}),
          ...(auditId === FALL_REGISTER_AUDIT_ID ? {
            questions: DEFAULT_FALLS_QUESTIONS,
            template_type: "general",
          } : {}),
          ...(auditId === "18" ? {
            questions: DEFAULT_MEDICATION_QUESTIONS,
          } : {}),
          ...(auditId === "34" ? {
            questions: DEFAULT_ACCIDENT_LOG_QUESTIONS,
          } : {}),
          ...(auditId === "21" ? {
            questions: DEFAULT_RESTRICTIVE_PRACTICE_QUESTIONS,
          } : {}),
          ...(auditId === "32" ? {
            questions: DEFAULT_NISCC_TRACKER_QUESTIONS,
          } : {}),
          ...(auditId === "33" ? {
            questions: DEFAULT_NMC_TRACKER_QUESTIONS,
          } : {}),
          ...(auditId === "35" ? {
            questions: DEFAULT_MOVING_HANDLING_QUESTIONS,
          } : {}),
          ...(auditId === "38" ? {
            questions: DEFAULT_CARE_MGMT_REVIEW_QUESTIONS,
          } : {}),
          ...(auditId === "3" ? {
            questions: DEFAULT_BEDRAIL_AUDIT_QUESTIONS,
          } : {}),
          ...(auditId === "39" ? {
            questions: DEFAULT_PRESSURE_DAMAGE_QUESTIONS,
          } : {}),
          ...(auditId === "19" ? {
            questions: DEFAULT_MODIFIED_DIET_FLUIDS_QUESTIONS,
          } : {}),
          ...(auditId === "40" ? {
            questions: DEFAULT_HEALTH_MONITORING_QUESTIONS,
          } : {}),
          ...(auditId === "41" ? {
            questions: DEFAULT_MATTRESS_VISUAL_CHECKS_QUESTIONS,
          } : {})
        });
        if (auditId === "18") {
          setQuestions(DEFAULT_MEDICATION_QUESTIONS);
        } else if (auditId === "34") {
          setQuestions(DEFAULT_ACCIDENT_LOG_QUESTIONS);
        } else if (auditId === "21") {
          setQuestions(DEFAULT_RESTRICTIVE_PRACTICE_QUESTIONS);
        } else if (auditId === "32") {
          setQuestions(DEFAULT_NISCC_TRACKER_QUESTIONS);
        } else if (auditId === "33") {
          setQuestions(DEFAULT_NMC_TRACKER_QUESTIONS);
        } else if (auditId === "35") {
          setQuestions(DEFAULT_MOVING_HANDLING_QUESTIONS);
        } else if (auditId === "38") {
          setQuestions(DEFAULT_CARE_MGMT_REVIEW_QUESTIONS);
        } else if (auditId === "3") {
          setQuestions(DEFAULT_BEDRAIL_AUDIT_QUESTIONS);
        } else if (auditId === "39") {
          setQuestions(DEFAULT_PRESSURE_DAMAGE_QUESTIONS);
        } else if (auditId === "19") {
          setQuestions(DEFAULT_MODIFIED_DIET_FLUIDS_QUESTIONS);
        } else if (auditId === "40") {
          setQuestions(DEFAULT_HEALTH_MONITORING_QUESTIONS);
        } else if (auditId === "41") {
          setQuestions(DEFAULT_MATTRESS_VISUAL_CHECKS_QUESTIONS);
        } else if (auditId === "9") {
          setQuestions(DEFAULT_DECONTAMINATION_QUESTIONS);
        } else if (auditId === "42") {
          setQuestions(DEFAULT_INFECTION_CONTROL_QUESTIONS);
        } else if (auditId === "10") {
          setQuestions(DEFAULT_DINING_QUESTIONS);
        } else if (auditId === FALL_REGISTER_AUDIT_ID) {
          setQuestions(DEFAULT_FALLS_QUESTIONS);
        }
      }

      if (auditId === FALL_REGISTER_AUDIT_ID && activeCareHomeId && activeOrganizationId) {
        const synced = await applyFallRegisterSync(
          activeCareHomeId,
          activeOrganizationId,
          [],
          false
        );
        if (synced.hasChanges) {
          await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
            answers: synced.answers,
          });
        }
      }

      if (isIncidentAudit(auditId) && activeCareHomeId && activeOrganizationId) {
        const synced = await applyIncidentAuditSync(
          activeCareHomeId,
          activeOrganizationId,
          [],
          false
        );
        await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
          answers: synced.answers,
          selected_residents: [],
        });
      }

      if (isWoundsAnalysisAudit(auditId) && activeCareHomeId && activeOrganizationId) {
        const synced = await applyWoundsAnalysisSync(
          activeCareHomeId,
          activeOrganizationId,
          [],
          false
        );
        await upsertAuditState(activeCareHomeId, activeOrganizationId, auditId, {
          answers: synced.answers,
          selected_residents: [],
        });
      }

      if (
        isRegistrationTrackerAudit(auditId) &&
        !stateData &&
        activeCareHomeId &&
        activeOrganizationId
      ) {
        const synced = await applyRegistrationTrackerSync(
          activeCareHomeId,
          activeOrganizationId,
          auditId,
          [],
          false
        );
        const trackerResidents = allResidentsData.filter((resident) =>
          synced.rows.some((row) => row.staffId === resident._id)
        );
        setSelectedResidents(trackerResidents);
        const stateUpdates: Record<string, unknown> = {
          selected_residents: trackerResidents,
        };
        if (synced.hasChanges) {
          stateUpdates.answers = synced.answers;
        }
        await upsertAuditState(
          activeCareHomeId,
          activeOrganizationId,
          auditId,
          stateUpdates
        );
      }

    } catch (err) {
      console.error("Error loading audit:", err);
      toast.error("Failed to load audit");
      if (auditId === "0") {
        setPendingActionPlanCountByResident({});
      }
    } finally {
      setIsLoading(false);
    }
  }, [auditId, activeOrganizationId, activeCareHomeId, isCustomAudit, applyFallRegisterSync, applyIncidentAuditSync, applyWoundsAnalysisSync, applyRegistrationTrackerSync]);

  // Helper: upsert audit state to Supabase
  const upsertAuditState = async (chId: string, orgId: string, typeId: string, updates: Record<string, any>) => {
    await supabase.from('manager_audit_state').upsert(
      { care_home_id: chId, organization_id: orgId, audit_type_id: typeId, ...updates },
      { onConflict: 'care_home_id,audit_type_id' }
    );
  };

  useEffect(() => {
    if (activeOrganizationId && activeCareHomeId) {
      loadData();
    }
  }, [loadData, activeOrganizationId, activeCareHomeId]);

  // Add resident to audit
  const handleAddResident = async (residentId: string) => {
    // Check if resident already added
    if (selectedResidents.some((r) => r._id === residentId)) {
      toast.error("This resident has already been added to the audit");
      return;
    }

    const resident = allResidents.find((r) => r._id === residentId);
    if (resident) {
      const updatedResidents = [...selectedResidents, resident];
      setSelectedResidents(updatedResidents);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { selected_residents: updatedResidents });
      }
      toast.success(`${resident.firstName} ${resident.lastName} added to audit`);
      setIsAddResidentDialogOpen(false);
      setSearchQuery("");
    }
  };

  // Remove resident from audit
  const handleRemoveResident = async (residentId: string) => {
    const resident = selectedResidents.find((r) => r._id === residentId);
    const updatedResidents = selectedResidents.filter((r) => r._id !== residentId);
    setSelectedResidents(updatedResidents);

    // Also remove their answers and comments
    const updatedAnswers = answers.filter((a) => a.residentId !== residentId);
    const updatedComments = comments.filter((c) => c.residentId !== residentId);
    const updatedActionPlans = actionPlans.filter((p) => p.residentId !== residentId);

    setAnswers(updatedAnswers);
    setComments(updatedComments);
    setActionPlans(updatedActionPlans);

    if (careHomeId && activeOrganizationId) {
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
        selected_residents: updatedResidents,
        answers: updatedAnswers,
        comments: updatedComments,
        action_plans: updatedActionPlans
      });
    }

    toast.success(`${resident?.firstName} ${resident?.lastName} removed from audit`);
  };

  const handleOpenActionPlanDialog = (resident: any) => {
    setSelectedResidentForActionPlan(resident);
    setActionPlanText("");
    setAssignedTo("");
    setAssignedToEmail("");
    setDueDate(undefined);
    setPriority("");
    setIsActionPlanDialogOpen(true);
  };

  const handleAddActionPlan = async () => {
    if (!actionPlanText || !assignedTo || !assignedToEmail || !priority || !dueDate) {
      toast.error("Please fill all action plan fields");
      return;
    }

    const newPlan: ActionPlan = {
      id: `plan-${Date.now()}`,
      auditId: auditId,
      text: actionPlanText,
      assignedTo: assignedTo, // This is the UUID
      assignedToName: orgMembers.find(m => m.id === assignedTo)?.name || assignedToEmail,
      assignedToEmail: assignedToEmail,
      dueDate: dueDate,
      priority: priority,
      status: 'pending',
      residentId: selectedResidentForActionPlan?._id,
      residentName: selectedResidentForActionPlan ? `${selectedResidentForActionPlan.firstName} ${selectedResidentForActionPlan.lastName}` : undefined
    };

    if (careHomeId && activeOrganizationId) {
      try {
        const createdPlan = await auditService.createManagerActionPlan({
          audit_type_id: auditId,
          description: actionPlanText,
          priority: priority,
          due_date: dueDate.toISOString(),
          assigned_to: assignedTo,
          assigned_to_email: assignedToEmail,
          resident_id: selectedResidentForActionPlan?._id,
          resident_name: newPlan.residentName,
          careHomeId: careHomeId,
          organization_id: activeOrganizationId,
          creatorId: profile?.id,
          created_by: profile?.id,
          created_by_name: profile?.name || profile?.email || "Manager"
        });

        if (createdPlan) {
          const updatedActionPlans = [...actionPlans, { ...newPlan, id: createdPlan.id }];
          setActionPlans(updatedActionPlans);
          await upsertAuditState(careHomeId, activeOrganizationId, auditId, { action_plans: updatedActionPlans });
          toast.success("Action plan added and synchronized");
        }
      } catch (err) {
        console.error("Error creating action plan:", err);
        toast.error("Failed to synchronize action plan");
        // Fallback: still add to local state
        const updatedActionPlans = [...actionPlans, newPlan];
        setActionPlans(updatedActionPlans);
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { action_plans: updatedActionPlans });
      }
    } else {
      const updatedActionPlans = [...actionPlans, newPlan];
      setActionPlans(updatedActionPlans);
      toast.success("Action plan added to audit (local only)");
    }

    setIsActionPlanDialogOpen(false);
    setSelectedResidentForActionPlan(null);
  };

  const handleRemoveActionPlan = (planId: string) => {
    setActionPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteActionPlan = async () => {
    if (!actionPlanToDelete) return;

    if (careHomeId && activeOrganizationId && !actionPlanToDelete.startsWith('plan-')) {
      try {
        await auditService.deleteManagerActionPlan(actionPlanToDelete);
      } catch (err) {
        console.error("Error deleting action plan:", err);
      }
    }

    const updatedActionPlans = actionPlans.filter(p => p.id !== actionPlanToDelete);
    setActionPlans(updatedActionPlans);

    if (careHomeId && activeOrganizationId) {
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, { action_plans: updatedActionPlans });
    }

    setDeleteDialogOpen(false);
    setActionPlanToDelete(null);
    toast.success("Action plan removed");
  };

  // Question Management
  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;

    const newQuestion: Question = {
      id: `q${Date.now()}`,
      text: newQuestionText,
      type: newQuestionType,
    };

    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    if (careHomeId && activeOrganizationId) {
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, { questions: updatedQuestions });
    }
    toast.success("Question added");

    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = async (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    const updatedAnswers = answers.filter(a => a.questionId !== questionId);
    setQuestions(updatedQuestions);
    setAnswers(updatedAnswers);
    if (careHomeId && activeOrganizationId) {
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, { questions: updatedQuestions, answers: updatedAnswers });
    }
    toast.success("Question removed");
  };

  // Answer Handling
  const handleAnswerChange = async (
    residentId: string,
    questionId: string,
    value: string
  ) => {
    setAnswers((prev) => {
      const updatedAnswers = upsertAnswerInList(
        prev,
        residentId,
        questionId,
        value
      );

      if (careHomeId && activeOrganizationId) {
        void upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          answers: updatedAnswers,
        });
      }
      return updatedAnswers;
    });
  };

  const getAnswer = (residentId: string, questionId: string) => {
    return answers.find(
      (answer) =>
        answer.residentId === residentId && answer.questionId === questionId
    );
  };

  const handleSyncIncidentAudit = async () => {
    if (!careHomeId || !activeOrganizationId || !isIncidentAudit(auditId)) {
      return;
    }

    try {
      setIsSyncingIncidentAudit(true);
      const synced = await applyIncidentAuditSync(
        careHomeId,
        activeOrganizationId,
        answers,
        true
      );
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
        answers: synced.answers,
        selected_residents: [],
      });
      if (synced.hasChanges) {
        toast.success(
          `Incident audit synced — ${synced.rows.length} incident-folder report${synced.rows.length !== 1 ? "s" : ""} this month`
        );
      } else {
        toast.message(
          synced.rows.length > 0
            ? "Incident audit is already up to date"
            : "No completed incident-folder reports found for this month"
        );
      }
    } catch (error) {
      console.error("Error syncing incident audit:", error);
      toast.error("Failed to sync incident audit from incidents");
    } finally {
      setIsSyncingIncidentAudit(false);
    }
  };

  const handleSyncWoundsAnalysis = async () => {
    if (!careHomeId || !activeOrganizationId || !isWoundsAnalysisAudit(auditId)) {
      return;
    }

    try {
      setIsSyncingWoundsAnalysis(true);
      const synced = await applyWoundsAnalysisSync(
        careHomeId,
        activeOrganizationId,
        answers,
        true
      );
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
        answers: synced.answers,
        selected_residents: [],
      });
      if (synced.hasChanges) {
        toast.success(
          `Wounds analysis synced — ${synced.rows.length} wound folder${synced.rows.length !== 1 ? "s" : ""} created this month`
        );
      } else {
        toast.message(
          synced.rows.length > 0
            ? "Wounds analysis is already up to date"
            : "No wound folders created this month found"
        );
      }
    } catch (error) {
      console.error("Error syncing wounds analysis:", error);
      toast.error("Failed to sync wounds analysis from wound records");
    } finally {
      setIsSyncingWoundsAnalysis(false);
    }
  };

  const handleSyncFallRegister = async () => {
    if (!careHomeId || !activeOrganizationId) return;

    try {
      setIsSyncingFallRegister(true);
      const synced = await applyFallRegisterSync(
        careHomeId,
        activeOrganizationId,
        answers,
        true
      );
      if (synced.hasChanges) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          answers: synced.answers,
        });
        toast.success("Fall register synced from incident reports");
      } else {
        toast.message("Fall register is already up to date");
      }
    } catch (error) {
      console.error("Error syncing fall register:", error);
      toast.error("Failed to sync fall register from incidents");
    } finally {
      setIsSyncingFallRegister(false);
    }
  };

  const handleRefreshRegistrationTracker = async () => {
    if (
      !careHomeId ||
      !activeOrganizationId ||
      !isRegistrationTrackerAudit(auditId)
    ) {
      return;
    }

    try {
      setIsRefreshingRegistrationTracker(true);
      const synced = await applyRegistrationTrackerSync(
        careHomeId,
        activeOrganizationId,
        auditId,
        answers,
        true
      );
      if (synced.hasChanges) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          answers: synced.answers,
        });
        toast.success("Registration tracker refreshed from staff profiles");
      } else {
        toast.message("Registration tracker is already up to date");
      }
    } catch (error) {
      console.error("Error refreshing registration tracker:", error);
      toast.error("Failed to refresh from staff profiles");
    } finally {
      setIsRefreshingRegistrationTracker(false);
    }
  };

  const handleCommentChange = async (residentId: string, questionId: string, text: string) => {
    const existing = comments.find(c => c.residentId === residentId && c.questionId === questionId);
    let updatedComments;
    if (existing) {
      updatedComments = comments.map(c => c.residentId === residentId && c.questionId === questionId ? { ...c, text } : c);
    } else {
      updatedComments = [...comments, { residentId, questionId, text }];
    }
    setComments(updatedComments);
    if (careHomeId && activeOrganizationId) {
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, { comments: updatedComments });
    }
  };

  const getComment = (residentId: string, questionId: string) => comments.find(c => c.residentId === residentId && c.questionId === questionId)?.text || "";

  const getIncompleteItems = () => {
    const incomplete: { id: string; label: string }[] = [];

    const isFallRegisterAudit = auditId === FALL_REGISTER_AUDIT_ID;
    const isRegistrationTrackerAuditActive = isRegistrationTrackerAudit(auditId);
    const isIncidentAuditActive = isIncidentAudit(auditId);
    const isWoundsAnalysisAuditActive = isWoundsAnalysisAudit(auditId);
    const isGridAudit = (HOME_BASED_AUDIT_IDS.has(auditId) || templateType === 'home-based') && !SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && auditId !== FALL_REGISTER_AUDIT_ID && auditId !== "18" && auditId !== "3" && auditId !== "34" && auditId !== "39" && auditId !== "28" && auditId !== "19" && auditId !== "40" && auditId !== "41";

    if (isGridAudit) {
      const dataRows = rowQuestions.filter((q) => !q.isSection);
      dataRows.forEach((row) => {
        columnQuestions.forEach((col) => {
          const a = answers.find(
            (x) => x.residentId === row.id && x.questionId === col.id
          );
          if (!a || a.value === undefined || a.value === null || String(a.value).trim() === "") {
            incomplete.push({
              id: `${row.id}-${col.id}`,
              label: `${row.text} - ${col.text}`,
            });
          }
        });
      });
    } else if (isFallRegisterAudit) {
      fallRegisterRows.forEach((row) => {
        DEFAULT_FALLS_COLUMN_QUESTIONS.forEach((q) => {
          const a = answers.find(
            (x) => x.residentId === row.rowId && x.questionId === q.id
          );
          if (!a || a.value === undefined || a.value === null || String(a.value).trim() === "") {
            incomplete.push({
              id: `${row.rowId}-${q.id}`,
              label: `${row.residentName} (${row.fallDate}) - ${q.text}`,
            });
          }
        });
      });
    } else if (isRegistrationTrackerAuditActive) {
      registrationTrackerRows.forEach((row) => {
        const activeQuestions = questions.filter((q) => !q.isSection);
        activeQuestions.forEach((q) => {
          const a = answers.find(
            (x) => x.residentId === row.staffId && x.questionId === q.id
          );
          if (!a || a.value === undefined || a.value === null || String(a.value).trim() === "") {
            incomplete.push({
              id: `${row.staffId}-${q.id}`,
              label: `${row.staffName} - ${q.text}`,
            });
          }
        });
      });
    } else if (isIncidentAuditActive) {
      incidentAuditRows.forEach((row) => {
        const activeQuestions = questions.filter((q) => !q.isSection);
        activeQuestions.forEach((q) => {
          const a = answers.find(
            (x) => x.residentId === row.rowId && x.questionId === q.id
          );
          if (!a || a.value === undefined || a.value === null || String(a.value).trim() === "") {
            incomplete.push({
              id: `${row.rowId}-${q.id}`,
              label: `${row.residentName} (${row.incidentDate}) - ${q.text}`,
            });
          }
        });
      });
    } else if (isWoundsAnalysisAuditActive) {
      woundsAnalysisRows.forEach((row) => {
        const activeQuestions = questions.filter((q) => !q.isSection);
        activeQuestions.forEach((q) => {
          const isHealed = row.isHealedReview;
          const isLastQ = q.id.startsWith("wound-last-");
          const isCurrQ = q.id.startsWith("wound-curr-");
          
          if ((isHealed && isLastQ) || (!isHealed && isCurrQ)) {
            const a = answers.find(
              (x) => x.residentId === row.rowId && x.questionId === q.id
            );
            if (!a || a.value === undefined || a.value === null || String(a.value).trim() === "") {
              incomplete.push({
                id: `${row.rowId}-${q.id}`,
                label: `${row.residentName} (Wound: ${row.woundType || "Unknown"}) - ${q.text}`,
              });
            }
          }
        });
      });
    } else if (SUBJECTLESS_HOME_AUDIT_IDS.has(auditId)) {
      const activeQuestions = questions.filter((q) => !q.isSection);
      activeQuestions.forEach((q) => {
        const a = answers.find(
          (x) => x.residentId === AUDIT_LEVEL_SUBJECT_ID && x.questionId === q.id
        );
        if (!a || a.value === undefined || a.value === null || String(a.value).trim() === "") {
          incomplete.push({
            id: `${AUDIT_LEVEL_SUBJECT_ID}-${q.id}`,
            label: q.text,
          });
        }
      });
    } else {
      const activeQuestions = questions.filter((q) => !q.isSection);
      selectedResidents.forEach((res) => {
        activeQuestions.forEach((q) => {
          const a = answers.find(
            (x) => x.residentId === res._id && x.questionId === q.id
          );
          if (!a || a.value === undefined || a.value === null || String(a.value).trim() === "") {
            const displayName = `${res.firstName} ${res.lastName}`.trim();
            incomplete.push({
              id: `${res._id}-${q.id}`,
              label: `${displayName} - ${q.text}`,
            });
          }
        });
      });
    }

    return incomplete;
  };

  const renderAlertDialog = () => (
    <AlertDialog
      open={incompleteWarningOpen}
      onOpenChange={setIncompleteWarningOpen}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Some checklist items are not filled</AlertDialogTitle>
          <AlertDialogDescription>
            The following items still need to be answered. You can go back and complete them, or continue anyway.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-[min(50vh,240px)] list-disc space-y-1 overflow-y-auto pl-5 text-sm text-foreground">
          {incompleteItems.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>
            Go Back
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={() => {
              setIncompleteWarningOpen(false);
              void performCompleteAudit();
            }}
          >
            Yes, complete audit
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Completion
  const handleCompleteAudit = async () => {
    const isFallRegisterAudit = auditId === FALL_REGISTER_AUDIT_ID;
    const isRegistrationTrackerAuditActive = isRegistrationTrackerAudit(auditId);
    const isIncidentAuditActive = isIncidentAudit(auditId);
    const isWoundsAnalysisAuditActive = isWoundsAnalysisAudit(auditId);
    // Determine if this is a grid-based audit
    const isGridAudit = (HOME_BASED_AUDIT_IDS.has(auditId) || templateType === 'home-based') && !SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && auditId !== FALL_REGISTER_AUDIT_ID && auditId !== "18" && auditId !== "3" && auditId !== "34" && auditId !== "39" && auditId !== "28" && auditId !== "19" && auditId !== "40" && auditId !== "41";

    // Validation for grid-based audits
    if (isGridAudit) {
      if (rowQuestions.length === 0) {
        toast.error("Please add at least one row to the audit", {
          description: "Click 'Add Row' to add questions to the audit"
        });
        return;
      }
    } else if (
      !isFallRegisterAudit &&
      !isRegistrationTrackerAuditActive &&
      !isIncidentAuditActive &&
      !isWoundsAnalysisAuditActive
    ) {
      // Validation for standard audits
      if (!SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && selectedResidents.length === 0) {
        toast.error(`Please add at least one ${isTeamBased ? 'team' : isStaffBased ? 'staff member' : 'resident'} to the audit`, {
          description: `Click "Add ${isTeamBased ? 'Team' : isStaffBased ? 'Staff' : 'Resident'}" to select records for this audit`
        });
        return;
      }
    }

    const incomplete = getIncompleteItems();
    if (incomplete.length > 0) {
      setIncompleteItems(incomplete);
      setIncompleteWarningOpen(true);
      return;
    }

    await performCompleteAudit();
  };

  const performCompleteAudit = async () => {
    const isFallRegisterAudit = auditId === FALL_REGISTER_AUDIT_ID;
    const isRegistrationTrackerAuditActive = isRegistrationTrackerAudit(auditId);
    const isIncidentAuditActive = isIncidentAudit(auditId);
    const isWoundsAnalysisAuditActive = isWoundsAnalysisAudit(auditId);
    const isGridAudit = (HOME_BASED_AUDIT_IDS.has(auditId) || templateType === 'home-based') && !SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && auditId !== FALL_REGISTER_AUDIT_ID && auditId !== "18" && auditId !== "3" && auditId !== "34" && auditId !== "39" && auditId !== "28" && auditId !== "19" && auditId !== "40" && auditId !== "41";

    try {
      if (!careHomeId || !activeOrganizationId) {
        throw new Error("Missing care home or organization context");
      }

      // Prepare audit completion data
      const auditCompletionData = {
        auditId: auditId,
        auditName: auditName,
        completedDate: new Date().toISOString(),
        auditor: profile?.name || profile?.email || "Unknown",
        residents: isIncidentAuditActive || isWoundsAnalysisAuditActive
          ? []
          : selectedResidents.map(resident => ({
              id: resident._id,
              firstName: resident.firstName,
              lastName: resident.lastName,
              roomNumber: resident.roomNumber,
              teamId: resident.teamId,
              answers: questions.map(q => {
                const answer = getAnswer(resident._id, q.id);
                return {
                  questionId: q.id,
                  questionText: q.text,
                  questionType: q.type,
                  value: answer?.value || null,
                  comment: getComment(resident._id, q.id)
                };
              }),
              comment: ""
            })),
        questions: questions,
        homeBasedData: (isGridAudit || SUBJECTLESS_HOME_AUDIT_IDS.has(auditId)) ? {
          subjectId: AUDIT_LEVEL_SUBJECT_ID,
          questions: isGridAudit ? rowQuestions : questions,
          answers,
          comments,
        } : undefined,
        fallRegisterData: isFallRegisterAudit ? {
          auditMonth: fallRegisterAuditMonth,
          totalFalls: fallRegisterRows.length,
          rows: fallRegisterRows,
          columnQuestions: DEFAULT_FALLS_QUESTIONS,
          answers,
        } : undefined,
        registrationTrackerData: isRegistrationTrackerAuditActive ? {
          trackerType: getRegistrationTrackerType(auditId),
          rows: registrationTrackerRows,
          columnQuestions: questions,
          answers,
          totalStaff: registrationTrackerRows.length,
        } : undefined,
        incidentAuditData: isIncidentAuditActive
          ? {
              auditMonth: incidentAuditMonth,
              rows: incidentAuditRows,
              columnQuestions: questions.filter((q) => !q.isSection),
              answers,
              totalIncidents: incidentAuditRows.length,
            }
          : undefined,
        woundsAnalysisData: isWoundsAnalysisAuditActive
          ? {
              auditMonth: woundsAnalysisMonth,
              rows: woundsAnalysisRows,
              columnQuestions: filterWoundsColumnQuestions(questions),
              answers,
              totalWounds: woundsAnalysisRows.length,
            }
          : undefined,
        // Include grid data if applicable
        gridData: isGridAudit ? {
          rowQuestions,
          columnQuestions,
          fixedColumnData,
          answers: answers // For grid audits, answers are stored differently
        } : undefined,
        actionPlans: actionPlans.map(plan => ({
          ...plan,
          dueDate: plan.dueDate
            ? (plan.dueDate instanceof Date ? plan.dueDate.toISOString() : plan.dueDate)
            : undefined
        })),
        status: 'completed'
      };

      // Save completed audit to Supabase history
      await supabase.from('manager_audit_history').insert({
        care_home_id: careHomeId,
        organization_id: activeOrganizationId,
        audit_type_id: auditId,
        audit_type_name: auditName,
        completed_date: auditCompletionData.completedDate,
        auditor: auditCompletionData.auditor,
        entries_count: isFallRegisterAudit
          ? fallRegisterRows.length
          : isRegistrationTrackerAuditActive
            ? registrationTrackerRows.length
            : isIncidentAuditActive
              ? incidentAuditRows.length
              : isWoundsAnalysisAuditActive
                ? woundsAnalysisRows.length
          : (isGridAudit || SUBJECTLESS_HOME_AUDIT_IDS.has(auditId))
            ? (isGridAudit ? rowQuestions : questions).filter((q) => !q.isSection).length
            : selectedResidents.length,
        notes: `${actionPlans.length} action plan(s) created`,
        data: auditCompletionData
      });

      // If this is a custom audit, ensure its status is updated in the main listing
      if (isCustomAudit) {
        const category = (savedCategory as 'staff' | 'clinical' | 'operational' | 'general') || (
          templateType === 'staff-based' ? 'staff' :
            templateType === 'home-based' ? 'operational' :
              'general'
        );

        await supabase.from('manager_custom_audits').upsert({
          id: auditId,
          care_home_id: careHomeId,
          organization_id: activeOrganizationId,
          name: editableAuditName,
          status: 'completed',
          auditor: auditCompletionData.auditor,
          last_audited: auditCompletionData.completedDate.split('T')[0],
          frequency: 'monthly',
          category: category,
          template_type: templateType || 'general'
        });
      }

      // RESET FOR NEXT AUDIT CYCLE in Supabase:
      // ✓ KEEP: Questions & template metadata
      // ✗ CLEAR: Residents, Answers, Comments, Action Plans, Grid state
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
        selected_residents: [],
        answers: [],
        comments: [],
        action_plans: [],
        row_questions: isGridAudit ? rowQuestions : [], // Keep row questions (templates)
        column_questions: isGridAudit ? columnQuestions : [], // Keep col questions
        fixed_column_data: {},
        resident_audit_data: {}
      });

      toast.success(`Audit completed! ${actionPlans.length} action plan(s) attached.`);
      router.push('/dashboard/manager-audit');
    } catch (error) {
      console.error('Error completing audit:', error);
      toast.error('Failed to complete audit', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const handleBack = () => {
    router.push("/dashboard/manager-audit");
  };

  // Update resident audit data for Care File Audit
  const updateResidentAuditData = async (residentId: string, field: string, value: string) => {
    const updatedData = {
      ...residentAuditData,
      [residentId]: {
        ...(residentAuditData[residentId] || { frequency: "monthly", lastAudited: "-", nextAudit: "-", auditor: "-" }),
        [field]: value
      }
    };
    setResidentAuditData(updatedData);
    if (careHomeId && activeOrganizationId) {
      await upsertAuditState(careHomeId, activeOrganizationId, auditId, { resident_audit_data: updatedData });
    }
  };

  // Navigate to resident care file audit
  const handleViewResidentCareFileAudit = (residentId: string) => {
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/audit`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading audit...</p>
      </div>
    );
  }

  // Care File Audit (ID: 0) - Special Layout
  if (auditId === "0") {
    return (
      <ManagerAuditShell
        breadcrumbs={[
          { label: "Audits", href: "/dashboard/manager-audit" as Route },
          { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
          { label: auditName },
        ]}
        onBack={handleBack}
        topActions={
          <Badge variant="outline">{allResidents.length} Residents</Badge>
        }
        summary={
          <ManagerAuditSummary
            title={auditName}
            subtitle={`Choose a ${allResidents.length === 1 ? "resident" : "resident"} to open their care file audit checklist.`}
            chips={[
              {
                label: "Total residents",
                value: allResidents.length.toString(),
              },
              {
                label: "Frequency presets",
                value: "Monthly · Quarterly · 6 Month · Yearly",
              },
            ]}
          />
        }
        flushBody
      >
        {/* Residents Table for Care File Audit */}
        <div className="overflow-x-auto bg-muted/20 px-2 py-4 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Resident</TableHead>
                <TableHead className="w-[100px]">Bed number</TableHead>
                <TableHead className="w-[150px]">Frequency</TableHead>
                <TableHead className="w-[150px]">Last Audited</TableHead>
                <TableHead className="w-[150px]">Next Audit</TableHead>
                <TableHead className="w-[200px]">Auditor</TableHead>
                <TableHead className="text-center w-[80px]">Report</TableHead>
                <TableHead className="text-right w-[140px] min-w-[120px]">
                  Pending action plans
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allResidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No residents found.
                  </TableCell>
                </TableRow>
              ) : (
                allResidents.map((resident) => {
                  const auditData = residentAuditData[resident._id] || {
                    frequency: "monthly",
                    lastAudited: "-",
                    nextAudit: "-",
                    auditor: "-"
                  };
                  return (
                    <TableRow
                      key={resident._id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewResidentCareFileAudit(resident._id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={resident.imageUrl} />
                            <AvatarFallback>{resident.firstName[0]}</AvatarFallback>
                          </Avatar>
                          <span>{resident.firstName} {resident.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{resident.roomNumber || "-"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={auditData.frequency}
                          onValueChange={(val) => updateResidentAuditData(resident._id, "frequency", val)}
                        >
                          <SelectTrigger className={`w-[120px] border-none shadow-none font-medium ${auditData.frequency === "monthly" ? "text-blue-600" :
                            auditData.frequency === "quarterly" ? "text-green-600" :
                              auditData.frequency === "6month" ? "text-orange-600" :
                                "text-purple-600"
                            }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly" className="text-blue-600 font-medium">Monthly</SelectItem>
                            <SelectItem value="quarterly" className="text-green-600 font-medium">Quarterly</SelectItem>
                            <SelectItem value="6month" className="text-orange-600 font-medium">6 Month</SelectItem>
                            <SelectItem value="yearly" className="text-purple-600 font-medium">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatCareFileAuditScheduleDate(auditData.lastAudited)}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatCareFileAuditScheduleDate(auditData.nextAudit)}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {auditData.auditor && auditData.auditor !== "-"
                          ? auditData.auditor
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewResidentCareFileAudit(resident._id)}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell
                        className="text-right tabular-nums text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pendingActionPlanCountByResident[resident._id] ?? 0}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ManagerAuditShell>
    );
  }

  if (auditId === FALL_REGISTER_AUDIT_ID) {
    const fallRegisterMonthLabel = fallRegisterAuditMonth
      ? formatAuditMonthLabel(fallRegisterAuditMonth)
      : formatAuditMonthLabel(new Date().toISOString().slice(0, 7));

    return (
      <>
        <ManagerAuditShell
          breadcrumbs={[
            { label: "Audits", href: "/dashboard/manager-audit" as Route },
            { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
            { label: auditName },
          ]}
          onBack={handleBack}
          topActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
              >
                <History className="mr-2 h-4 w-4" /> History
              </Button>
              <Button size="sm" onClick={handleCompleteAudit}>
                Complete Audit
              </Button>
            </div>
          }
          summary={
            <ManagerAuditSummary
              title={auditName}
              subtitle="Review fall folders created this month. Values are prefilled from incident reports."
              chips={[
                { label: "Auditor", value: profile?.name || profile?.email || "—" },
                { label: "Period", value: fallRegisterMonthLabel },
                { label: "Total falls", value: fallRegisterRows.length },
                { label: "Action plans", value: actionPlans.length },
              ]}
            />
          }
          flushBody
        >
          <FallRegisterTable
            auditMonth={fallRegisterAuditMonth || new Date().toISOString().slice(0, 7)}
            rows={fallRegisterRows}
            answers={answers}
            isSyncing={isSyncingFallRegister}
            onAnswerChange={handleAnswerChange}
            onSyncFromIncidents={handleSyncFallRegister}
          />
        </ManagerAuditShell>
        {renderAlertDialog()}
      </>
    );
  }

  if (isIncidentAudit(auditId)) {
    const incidentMonthLabel = incidentAuditMonth
      ? formatAuditMonthLabel(incidentAuditMonth)
      : formatAuditMonthLabel(new Date().toISOString().slice(0, 7));
    const uniqueResidentCount = new Set(
      incidentAuditRows.map((row) => row.residentId)
    ).size;

    return (
      <>
        <ManagerAuditShell
          breadcrumbs={[
            { label: "Audits", href: "/dashboard/manager-audit" as Route },
            { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
            { label: auditName },
          ]}
          onBack={handleBack}
          topActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
              >
                <History className="mr-2 h-4 w-4" /> History
              </Button>
              <Button size="sm" onClick={handleCompleteAudit}>
                Complete Audit
              </Button>
            </div>
          }
          summary={
            <ManagerAuditSummary
              title={auditName}
              subtitle="One row per incident-folder report this month. Fall folders are not included."
              chips={[
                { label: "Auditor", value: profile?.name || profile?.email || "—" },
                { label: "Period", value: incidentMonthLabel },
                { label: "Incidents", value: incidentAuditRows.length },
                { label: "Residents", value: uniqueResidentCount },
                { label: "Action plans", value: actionPlans.length },
              ]}
            />
          }
          flushBody
        >
          <IncidentAuditTable
            rows={incidentAuditRows}
            questions={questions}
            answers={answers}
            auditMonthLabel={incidentMonthLabel}
            teams={teams}
            selectedUnitId={selectedUnitId}
            onUnitChange={setSelectedUnitId}
            isSyncing={isSyncingIncidentAudit}
            onAnswerChange={handleAnswerChange}
            onSyncFromIncidents={handleSyncIncidentAudit}
          />
        </ManagerAuditShell>
        {renderAlertDialog()}
      </>
    );
  }

  if (isWoundsAnalysisAudit(auditId)) {
    const woundsMonthLabel = woundsAnalysisMonth
      ? formatAuditMonthLabel(woundsAnalysisMonth)
      : formatAuditMonthLabel(new Date().toISOString().slice(0, 7));
    const uniqueResidentCount = new Set(
      woundsAnalysisRows.map((row) => row.residentId)
    ).size;

    return (
      <>
        <ManagerAuditShell
          breadcrumbs={[
            { label: "Audits", href: "/dashboard/manager-audit" as Route },
            { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
            { label: auditName },
          ]}
          onBack={handleBack}
          topActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
              >
                <History className="mr-2 h-4 w-4" /> History
              </Button>
              <Button size="sm" onClick={handleCompleteAudit}>
                Complete Audit
              </Button>
            </div>
          }
          summary={
            <ManagerAuditSummary
              title={auditName}
              subtitle="One row per wound folder created this month. Values are prefilled from wound records where available."
              chips={[
                { label: "Auditor", value: profile?.name || profile?.email || "—" },
                { label: "Period", value: woundsMonthLabel },
                { label: "Wounds", value: woundsAnalysisRows.length },
                { label: "Residents", value: uniqueResidentCount },
                { label: "Action plans", value: actionPlans.length },
              ]}
            />
          }
          flushBody
        >
          <WoundsAnalysisTable
            rows={woundsAnalysisRows}
            questions={questions}
            answers={answers}
            auditMonthLabel={woundsMonthLabel}
            teams={teams}
            selectedUnitId={selectedUnitId}
            onUnitChange={setSelectedUnitId}
            isSyncing={isSyncingWoundsAnalysis}
            onAnswerChange={handleAnswerChange}
            onSyncFromWounds={handleSyncWoundsAnalysis}
          />
        </ManagerAuditShell>
        {renderAlertDialog()}
      </>
    );
  }

  if (isRegistrationTrackerAudit(auditId)) {
    const trackerType = getRegistrationTrackerType(auditId);
    const trackerSubtitle =
      trackerType === "nmc"
        ? "Track NMC registration details for nurses. Profile fields are prefilled where available."
        : "Track NISCC registration details for staff. Profile fields are prefilled where available.";
    const staffCountLabel = trackerType === "nmc" ? "Nurses" : "Staff";

    return (
      <>
        <ManagerAuditShell
          breadcrumbs={[
            { label: "Audits", href: "/dashboard/manager-audit" as Route },
            { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
            { label: auditName },
          ]}
          onBack={handleBack}
          topActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
              >
                <History className="mr-2 h-4 w-4" /> History
              </Button>
              <Button size="sm" onClick={handleCompleteAudit}>
                Complete Audit
              </Button>
            </div>
          }
          summary={
            <ManagerAuditSummary
              title={auditName}
              subtitle={trackerSubtitle}
              chips={[
                { label: "Auditor", value: profile?.name || profile?.email || "—" },
                { label: staffCountLabel, value: registrationTrackerRows.length },
                { label: "Questions", value: questions.length },
                { label: "Action plans", value: actionPlans.length },
              ]}
            />
          }
          flushBody
        >
          <RegistrationTrackerTable
            trackerType={trackerType}
            rows={registrationTrackerRows}
            questions={questions}
            answers={answers}
            isRefreshing={isRefreshingRegistrationTracker}
            onAnswerChange={handleAnswerChange}
            onRefreshFromProfiles={handleRefreshRegistrationTracker}
          />
        </ManagerAuditShell>
        {renderAlertDialog()}
      </>
    );
  }

  // Grid-based Audits (ID: 1, 2, 9, or home-based custom audits)
  const isGridAudit = (HOME_BASED_AUDIT_IDS.has(auditId) || templateType === 'home-based') && !SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && auditId !== FALL_REGISTER_AUDIT_ID && auditId !== "18" && auditId !== "3" && auditId !== "34" && auditId !== "39" && auditId !== "28" && auditId !== "19" && auditId !== "40" && auditId !== "41";
  const isPlainTemplate = auditId === "1" || templateType === 'plain-template'; // Plain template has no fixed columns

  if (false && isGridAudit) {
    const handleAddHomeQuestion = async () => {
      if (!newQuestionText.trim()) {
        toast.error("Please enter a question");
        return;
      }

      const newQuestion: Question = {
        id: `row-q${Date.now()}`,
        text: newQuestionText.trim(),
        type: newQuestionType,
      };
      const updatedRowQuestions = [...rowQuestions, newQuestion];
      setRowQuestions(updatedRowQuestions);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { row_questions: updatedRowQuestions });
      }
      toast.success("Question added");
      setNewQuestionText("");
      setNewQuestionType("compliance");
      setIsQuestionDialogOpen(false);
    };

    const handleAddHomeSection = async () => {
      const num = sectionNumberText.trim();
      const title = sectionText.trim();
      if (!num) {
        toast.error("Please enter a section number");
        return;
      }
      if (!/^\d+(\.\d+)*$/.test(num)) {
        toast.error("Use digits and dots only (e.g. 4 or 3.2)");
        return;
      }
      if (!title) {
        toast.error("Please enter a section title");
        return;
      }

      const parentNum = getParentSectionNumber(num);
      if (parentNum && !parentSectionRowExists(parentNum, rowQuestions)) {
        toast.error(
          `The parent folder (section ${parentNum}) does not exist. Add section ${parentNum} first.`
        );
        return;
      }

      const newSection: Question = {
        id: `section-${Date.now()}`,
        text: title,
        type: "text",
        isSection: true,
        sectionNumber: num,
      };
      const insertAt = findInsertIndexForNewSection(rowQuestions, num);
      if (insertAt < 0) {
        toast.error(
          parentNum
            ? `The parent folder (section ${parentNum}) does not exist. Add section ${parentNum} first.`
            : "Could not determine where to place this section."
        );
        return;
      }
      const updatedRowQuestions = [
        ...rowQuestions.slice(0, insertAt),
        newSection,
        ...rowQuestions.slice(insertAt),
      ];
      setRowQuestions(updatedRowQuestions);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          row_questions: updatedRowQuestions,
        });
      }
      setSectionText("");
      setSectionNumberText("");
      setIsSectionDialogOpen(false);
      toast.success("Section added");
    };

    const handleRemoveHomeQuestion = async (questionId: string) => {
      const idx = rowQuestions.findIndex((q) => q.id === questionId);
      if (idx === -1) return;
      const removeIds: string[] = [];
      const target = rowQuestions[idx];
      if (target.isSection) {
        const end = getSectionBlockEndExclusive(rowQuestions, idx);
        for (let i = idx; i < end; i++) {
          removeIds.push(rowQuestions[i].id);
        }
      } else {
        removeIds.push(questionId);
      }
      const removed = new Set(removeIds);
      const updatedRowQuestions = rowQuestions.filter((q) => !removed.has(q.id));
      const updatedAnswers = answers.filter((a) => !removed.has(a.residentId));
      setRowQuestions(updatedRowQuestions);
      setAnswers(updatedAnswers);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          row_questions: updatedRowQuestions,
          answers: updatedAnswers,
        });
      }
      toast.success(target.isSection ? "Section removed" : "Question removed");
    };

    const homeWorkspaceActionPlans: ManagerAuditActionPlanRow[] = actionPlans.map((p) => ({
      id: p.id,
      text: p.text,
      assignedToName: p.assignedToName,
      assignedTo: p.assignedTo,
      dueDate: p.dueDate,
      priority: p.priority,
      status: p.status,
      residentId: p.residentId,
      residentName: p.residentName,
    }));

    const homeBadges = (
      <>
        <Badge variant="outline">Home-based</Badge>
        {isCustomAudit && savedCategory ? (
          <Badge variant="secondary" className="capitalize">
            {savedCategory === 'staff' ? 'Staff Audits' :
              savedCategory === 'clinical' ? 'Clinical Audits' :
                savedCategory === 'operational' ? 'Operational Audits' :
                  'General'}
          </Badge>
        ) : null}
      </>
    );

    return (
      <>
        <ManagerAuditShell
        breadcrumbs={[
          { label: "Audits", href: "/dashboard/manager-audit" as Route },
          { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
          { label: auditName },
        ]}
        onBack={handleBack}
        topActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
            >
              <History className="mr-2 h-4 w-4" /> History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuestionDialogMode("standard");
                setNewQuestionText("");
                setNewQuestionType("compliance");
                setIsQuestionDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteAudit}
              disabled={rowQuestions.filter((q) => !q.isSection).length === 0}
            >
              Complete Audit
            </Button>
          </>
        }
        summary={
          isCustomAudit && isEditingName ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editableAuditName}
                onChange={(e) => setEditableAuditName(e.target.value)}
                className="h-10 text-lg font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAuditName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleSaveAuditName}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
            </div>
          ) : (
            <ManagerAuditSummary
              title={auditName}
              subtitle={
                <span
                  className={isCustomAudit ? "cursor-pointer hover:text-primary" : undefined}
                  onClick={() => isCustomAudit && setIsEditingName(true)}
                >
                  {isCustomAudit
                    ? "Click the title to rename this custom audit."
                    : "Tap the status pill on each question to record the audit response."}
                </span>
              }
              badges={homeBadges}
              chips={[
                { label: "Auditor", value: profile?.name || profile?.email || "—" },
                { label: "Questions", value: rowQuestions.filter((q) => !q.isSection).length },
                { label: "Sections", value: rowQuestions.filter((q) => q.isSection).length },
                { label: "Action plans", value: actionPlans.length },
              ]}
            />
          )
        }
        flushBody
      >
        <ManagerAuditWorkspace
          templateName={auditName}
          questions={rowQuestions}
          selectedResidents={[]}
          answers={answers}
          comments={comments}
          actionPlans={homeWorkspaceActionPlans}
          subjectless
          subjectlessSubjectId={AUDIT_LEVEL_SUBJECT_ID}
          onAnswerChange={handleAnswerChange}
          onCommentChange={handleCommentChange}
          onOpenAddQuestion={() => {
            setQuestionDialogMode("standard");
            setNewQuestionText("");
            setNewQuestionType("compliance");
            setIsQuestionDialogOpen(true);
          }}
          onOpenAddSection={() => {
            setSectionText("");
            setSectionNumberText("");
            setIsSectionDialogOpen(true);
          }}
          onOpenAddResident={() => undefined}
          onRemoveQuestion={handleRemoveHomeQuestion}
          onRemoveResident={() => undefined}
          onOpenActionPlan={() => handleOpenActionPlanDialog(undefined)}
          onRemoveActionPlan={handleRemoveActionPlan}
        />

        <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Question</DialogTitle>
              <DialogDescription>
                This question will appear in the audit checklist.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Question</Label>
                <Input
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="col-span-3"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddHomeQuestion();
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Type</Label>
                <Select
                  value={newQuestionType}
                  onValueChange={(val: Question["type"]) => setNewQuestionType(val)}
                >
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliance">Compliance (C/NC/NA)</SelectItem>
                    <SelectItem value="yesno">Yes/No</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddHomeQuestion}>Add Question</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
              <DialogDescription>
                Sections are ordered by number. A dotted number such as 5.1 nests under
                section 5; add section 5 first if it does not exist, or you will see an
                error that the parent folder does not exist.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Number</Label>
                <Input
                  value={sectionNumberText}
                  onChange={(e) => setSectionNumberText(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g. 4 or 3.2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleAddHomeSection();
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Title</Label>
                <Input
                  value={sectionText}
                  onChange={(e) => setSectionText(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Safety Checks, Environment, etc."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleAddHomeSection();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => void handleAddHomeSection()}>Add Section</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isActionPlanDialogOpen} onOpenChange={setIsActionPlanDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-base">Add Action Plan</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Action</Label>
                <Input value={actionPlanText} onChange={(e) => setActionPlanText(e.target.value)} placeholder="What needs to be done?" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Assign To</Label>
                <Select value={assignedToEmail} onValueChange={(val) => {
                  setAssignedToEmail(val);
                  const member = orgMembers.find(m => m.email === val);
                  if (member) setAssignedTo(member.id);
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {orgMembers.map(member => (
                      <SelectItem key={member.email} value={member.email}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.image_url || ""} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {(member.name?.[0] || member.email[0]).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.name || member.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Due Date</Label>
                  <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen} modal={true}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        <span className="text-sm">{dueDate ? format(dueDate!, "dd/MM/yy") : "Pick date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={(date) => { if (date) { setDueDate(date); setDueDatePopoverOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsActionPlanDialogOpen(false)} className="h-9">Cancel</Button>
              <Button onClick={handleAddActionPlan} className="h-9">Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Action Plan</DialogTitle>
              <DialogDescription>Are you sure you want to remove this action plan from the audit? This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteActionPlan}>Remove</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ManagerAuditShell>
      {renderAlertDialog()}
    </>
    );
  }

  // Fallback for grid-based (non-home) audits
  if (isGridAudit) {
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
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { row_questions: updatedRowQuestions });
      }
      toast.success("Row added");
      setNewQuestionText("");
      setIsQuestionDialogOpen(false);
    };

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
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { column_questions: updatedColumnQuestions });
      }
      toast.success("Column added");
      setNewQuestionText("");
      setNewQuestionType("compliance");
      setIsQuestionDialogOpen(false);
    };

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

    const openAddSectionDialog = () => {
      setSectionText("");
      setSectionNumberText("");
      setIsSectionDialogOpen(true);
    };

    const handleAddSection = async () => {
      const num = sectionNumberText.trim();
      const title = sectionText.trim();
      if (!num) {
        toast.error("Please enter a section number");
        return;
      }
      if (!/^\d+(\.\d+)*$/.test(num)) {
        toast.error("Use digits and dots only (e.g. 4 or 3.2)");
        return;
      }
      if (!title) {
        toast.error("Please enter a section title");
        return;
      }

      const parentNum = getParentSectionNumber(num);
      if (parentNum && !parentSectionRowExists(parentNum, rowQuestions)) {
        toast.error(
          `The parent folder (section ${parentNum}) does not exist. Add section ${parentNum} first.`
        );
        return;
      }

      const newSection: Question = {
        id: `section-${Date.now()}`,
        text: title,
        type: "text",
        isSection: true,
        sectionNumber: num,
      };
      const insertAt = findInsertIndexForNewSection(rowQuestions, num);
      if (insertAt < 0) {
        toast.error(
          parentNum
            ? `The parent folder (section ${parentNum}) does not exist. Add section ${parentNum} first.`
            : "Could not determine where to place this section."
        );
        return;
      }
      const updatedRowQuestions = [
        ...rowQuestions.slice(0, insertAt),
        newSection,
        ...rowQuestions.slice(insertAt),
      ];
      setRowQuestions(updatedRowQuestions);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          row_questions: updatedRowQuestions,
        });
      }

      setSectionText("");
      setSectionNumberText("");
      setIsSectionDialogOpen(false);
      toast.success("Section added");
    };

    const handleUpdateSectionText = async (sectionId: string, text: string) => {
      const updatedRowQuestions = rowQuestions.map(q =>
        q.id === sectionId ? { ...q, text } : q
      );
      setRowQuestions(updatedRowQuestions);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { row_questions: updatedRowQuestions });
      }
    };

    const handleUpdateSectionNumber = async (sectionId: string, nextRaw: string) => {
      const nextNum = nextRaw.trim();
      if (!nextNum || !/^\d+(\.\d+)*$/.test(nextNum)) {
        toast.error("Invalid section number");
        return;
      }
      const idx = rowQuestions.findIndex((q) => q.id === sectionId);
      if (idx === -1 || !rowQuestions[idx].isSection) return;
      const cur = rowQuestions[idx].sectionNumber?.trim();
      if (cur === nextNum) return;
      const end = getSectionBlockEndExclusive(rowQuestions, idx);
      const block = rowQuestions.slice(idx, end);
      const without = [...rowQuestions.slice(0, idx), ...rowQuestions.slice(end)];
      const updatedHeader: Question = { ...block[0], sectionNumber: nextNum };
      const blockNext = [updatedHeader, ...block.slice(1)];
      const nextParent = getParentSectionNumber(nextNum);
      if (nextParent && !parentSectionRowExists(nextParent, without)) {
        toast.error(
          `The parent folder (section ${nextParent}) does not exist. Add section ${nextParent} first.`
        );
        return;
      }
      const insertAt = findInsertIndexForNewSection(without, nextNum);
      if (insertAt < 0) {
        toast.error(
          nextParent
            ? `The parent folder (section ${nextParent}) does not exist. Add section ${nextParent} first.`
            : "Could not determine where to place this section."
        );
        return;
      }
      const merged = [
        ...without.slice(0, insertAt),
        ...blockNext,
        ...without.slice(insertAt),
      ];
      setRowQuestions(merged);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          row_questions: merged,
        });
      }
      toast.success("Section order updated");
    };

    const handleRemoveRowQuestion = async (questionId: string) => {
      const idx = rowQuestions.findIndex((q) => q.id === questionId);
      if (idx === -1) return;
      const removeIds: string[] = [];
      const target = rowQuestions[idx];
      if (target.isSection) {
        const end = getSectionBlockEndExclusive(rowQuestions, idx);
        for (let i = idx; i < end; i++) {
          removeIds.push(rowQuestions[i].id);
        }
      } else {
        removeIds.push(questionId);
      }
      const removed = new Set(removeIds);
      const updatedRowQuestions = rowQuestions.filter((q) => !removed.has(q.id));
      const updatedAnswers = answers.filter((a) => !removed.has(a.residentId));
      setRowQuestions(updatedRowQuestions);
      setAnswers(updatedAnswers);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, {
          row_questions: updatedRowQuestions,
          answers: updatedAnswers,
        });
      }
      toast.success(target.isSection ? "Section removed" : "Row question removed");
    };

    const handleRemoveColumnQuestion = async (questionId: string) => {
      const updatedColumnQuestions = columnQuestions.filter(q => q.id !== questionId);
      const updatedAnswers = answers.filter(a => a.questionId !== questionId);
      setColumnQuestions(updatedColumnQuestions);
      setAnswers(updatedAnswers);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { column_questions: updatedColumnQuestions, answers: updatedAnswers });
      }
      toast.success("Column question removed");
    };

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
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { answers: updatedAnswers });
      }
    };

    const getGridAnswer = (rowQuestionId: string, columnQuestionId: string) => {
      return answers.find(a => a.residentId === rowQuestionId && a.questionId === columnQuestionId);
    };

    const handleFixedColumnChange = async (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted', value: string) => {
      const updatedData = {
        ...fixedColumnData,
        [rowId]: {
          ...fixedColumnData[rowId],
          [field]: value
        }
      };
      setFixedColumnData(updatedData);
      if (careHomeId && activeOrganizationId) {
        await upsertAuditState(careHomeId, activeOrganizationId, auditId, { fixed_column_data: updatedData });
      }
    };

    const getFixedColumnValue = (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted') => {
      return fixedColumnData[rowId]?.[field] || '';
    };

    // Calculate colSpan for plain template vs grid audits
    const getColSpan = () => {
      if (isPlainTemplate) {
        return columnQuestions.length + 2; // Row header + columns + add button
      }
      return columnQuestions.length + 5; // Row header + columns + 3 fixed columns + add button
    };

    const gridBadges = (
      <>
        {isCustomAudit && savedCategory ? (
          <Badge variant="secondary" className="capitalize">
            {savedCategory === 'staff' ? 'Staff Audits' :
              savedCategory === 'clinical' ? 'Clinical Audits' :
                savedCategory === 'operational' ? 'Operational Audits' :
                  'General'}
          </Badge>
        ) : null}
        {savedStaffType && savedCategory === 'staff' ? (
          <Badge variant="outline" className="capitalize">
            {savedStaffType === 'nurses' ? 'Nurses Only' :
              savedStaffType === 'care-staff' ? 'Care Staff Only' :
                'All Staff'}
          </Badge>
        ) : null}
      </>
    );

    return (
      <>
        <ManagerAuditShell
        breadcrumbs={[
          { label: "Audits", href: "/dashboard/manager-audit" as Route },
          { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
          { label: auditName },
        ]}
        onBack={handleBack}
        topActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
            >
              <History className="mr-2 h-4 w-4" /> History
            </Button>
            <Button size="sm" onClick={handleCompleteAudit}>Complete Audit</Button>
          </div>
        }
        summary={
          isCustomAudit && isEditingName ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editableAuditName}
                onChange={(e) => setEditableAuditName(e.target.value)}
                className="h-10 text-lg font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAuditName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleSaveAuditName}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
            </div>
          ) : (
            <ManagerAuditSummary
              title={auditName}
              subtitle={
                <span
                  className={isCustomAudit ? "cursor-pointer hover:text-primary" : undefined}
                  onClick={() => isCustomAudit && setIsEditingName(true)}
                >
                  {isCustomAudit
                    ? "Click the title to rename this custom audit."
                    : "Grid-based audit — rows and columns are stored in Supabase as you edit."}
                </span>
              }
              badges={gridBadges}
              chips={[
                {
                  label: "Rows",
                  value: rowQuestions.filter((q) => !q.isSection).length,
                },
                { label: "Columns", value: columnQuestions.length },
                {
                  label: "Sections",
                  value: rowQuestions.filter((q) => q.isSection).length,
                },
              ]}
            />
          )
        }
        flushBody
      >
        {/* Grid Table */}
        <div className="rounded-md border flex-1 overflow-auto bg-white mx-4 my-4 sm:mx-5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[250px] font-semibold sticky left-0 bg-muted/50 z-10">Questions</TableHead>
                {columnQuestions.map(q => (
                  <TableHead key={q.id} className="min-w-[140px] max-w-[180px] font-semibold">
                    <div className="flex items-center justify-between px-2 gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs leading-tight truncate flex-1 cursor-help">
                            {q.text.length > 20 ? `${q.text.substring(0, 20)}...` : q.text}
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
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                    </div>
                  </TableHead>
                ))}
                {!isPlainTemplate && (
                  <>
                    <TableHead className="min-w-[200px] font-semibold bg-blue-50">Comment</TableHead>
                    <TableHead className="min-w-[200px] font-semibold bg-green-50">Action Required</TableHead>
                    <TableHead className="min-w-[200px] font-semibold bg-orange-50">Action Completed</TableHead>
                  </>
                )}
                <TableHead className="w-[60px] bg-muted/50 sticky right-0 z-10">
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
                      <p className="text-sm">Add Column</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>

              {rowQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={getColSpan()} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-sm">No questions added yet.</p>
                      <p className="text-xs">Click the buttons below to add rows and columns</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {rowQuestions.map((rowQ) => {
                // Section Row - spans full width
                if (rowQ.isSection) {
                  return (
                    <TableRow key={rowQ.id} className="bg-slate-100 hover:bg-slate-200 transition-colors border-y-2 border-slate-300">
                      <TableCell colSpan={getColSpan()} className="sticky left-0 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            aria-label="Section number"
                            className="h-9 w-[4.5rem] shrink-0 text-center text-sm font-semibold"
                            defaultValue={rowQ.sectionNumber ?? ""}
                            key={`${rowQ.id}-${rowQ.sectionNumber ?? ""}`}
                            onBlur={(e) =>
                              void handleUpdateSectionNumber(rowQ.id, e.target.value)
                            }
                            placeholder="No."
                          />
                          <Input
                            value={rowQ.text}
                            onChange={(e) => handleUpdateSectionText(rowQ.id, e.target.value)}
                            placeholder="Section title..."
                            className="h-10 min-w-0 flex-1 border-none font-bold text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                          />
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRowQuestion(rowQ.id)}
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Regular Question Row
                const getAnswerColor = (value?: string) => {
                  if (!value) return "text-muted-foreground";
                  if (value === "yes" || value === "compliant") return "text-green-600 font-medium";
                  if (value === "action-required") return "text-amber-700 font-medium";
                  if (value === "no" || value === "non-compliant") return "text-red-600 font-medium";
                  if (value === "not-applicable") return "text-gray-500 font-medium";
                  return "";
                };

                return (
                  <TableRow key={rowQ.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium sticky left-0 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm flex-1 whitespace-normal">
                              {rowQ.text}
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
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                      </div>
                    </TableCell>
                    {columnQuestions.map(colQ => {
                      const answer = getGridAnswer(rowQ.id, colQ.id);

                      return (
                        <TableCell key={colQ.id} className="px-2 py-3">
                          {colQ.type === 'text' ? (
                            <Input
                              value={answer?.value || ""}
                              onChange={(e) => handleGridAnswerChange(rowQ.id, colQ.id, e.target.value)}
                              placeholder="..."
                              className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                            />
                          ) : colQ.type === 'date' ? (
                            <Input
                              type="date"
                              value={answer?.value || ""}
                              onChange={(e) => handleGridAnswerChange(rowQ.id, colQ.id, e.target.value)}
                              className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                            />
                          ) : (
                            <Select
                              value={
                                answer?.value && answer.value.trim() !== ""
                                  ? answer.value
                                  : undefined
                              }
                              onValueChange={(val) => handleGridAnswerChange(rowQ.id, colQ.id, val)}
                            >
                              <SelectTrigger className={`w-full border-none shadow-none text-sm h-8 ${getAnswerColor(answer?.value)}`}>
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {colQ.type === 'yesno' ? (
                                  <>
                                    <SelectItem value="yes" className="text-green-600 font-medium">✓ Yes</SelectItem>
                                    <SelectItem value="no" className="text-red-600 font-medium">✗ No</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="compliant" className="text-green-600 font-medium">✓ Compliant</SelectItem>
                                    <SelectItem value="action-required" className="text-amber-700 font-medium">⚠ Action required</SelectItem>
                                    <SelectItem value="non-compliant" className="text-red-600 font-medium">✗ Non-Compliant</SelectItem>
                                    <SelectItem value="not-applicable" className="text-gray-500 font-medium">— N/A</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      );
                    })}
                    {!isPlainTemplate && (
                      <>
                        <TableCell className="px-2 py-3 bg-blue-50/30">
                          <Input
                            value={getFixedColumnValue(rowQ.id, 'comment')}
                            onChange={(e) => handleFixedColumnChange(rowQ.id, 'comment', e.target.value)}
                            placeholder="Add comment..."
                            className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-3 bg-green-50/30">
                          <Input
                            value={getFixedColumnValue(rowQ.id, 'actionRequired')}
                            onChange={(e) => handleFixedColumnChange(rowQ.id, 'actionRequired', e.target.value)}
                            placeholder="Action required..."
                            className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-3 bg-orange-50/30">
                          <Input
                            value={getFixedColumnValue(rowQ.id, 'actionCompleted')}
                            onChange={(e) => handleFixedColumnChange(rowQ.id, 'actionCompleted', e.target.value)}
                            placeholder="Action completed..."
                            className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                          />
                        </TableCell>
                      </>
                    )}
                    <TableCell className="sticky right-0 bg-white"></TableCell>
                  </TableRow>
                );
              })}

              {/* Add Row and Section Buttons - Always visible */}
              <TableRow className="hover:bg-muted/20 transition-colors border-t-2">
                <TableCell colSpan={getColSpan()} className="sticky left-0 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openAddRowDialog}
                      className="flex-1 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openAddSectionDialog}
                      className="flex-1 h-8 text-muted-foreground hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="sticky right-0 bg-white"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

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
                    if (e.key === "Enter") {
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
                      <SelectItem value="date">Date</SelectItem>
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

        {/* Section Dialog */}
        <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
              <DialogDescription>
                Sections are ordered by number. A dotted number such as 5.1 nests under
                section 5; add section 5 first if it does not exist, or you will see an
                error that the parent folder does not exist.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Number</Label>
                <Input
                  value={sectionNumberText}
                  onChange={(e) => setSectionNumberText(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g. 4 or 3.2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleAddSection();
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Title</Label>
                <Input
                  value={sectionText}
                  onChange={(e) => setSectionText(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Safety Checks, Environment, etc."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleAddSection();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => void handleAddSection()}>
                Add Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </ManagerAuditShell>
        {renderAlertDialog()}
      </>
    );
  }




  // Standard Audit Layout (for all other audits)

  const workspaceActionPlans: ManagerAuditActionPlanRow[] = actionPlans.map((p) => ({
    id: p.id,
    text: p.text,
    assignedToName: p.assignedToName,
    assignedTo: p.assignedTo,
    dueDate: p.dueDate,
    priority: p.priority,
    status: p.status,
    residentId: p.residentId,
    residentName: p.residentName,
  }));

  const standardBadges = (
    <>
      <Badge variant="outline">
        {selectedResidents.length} {isTeamBased ? 'Teams' : isStaffBased ? 'Staff' : 'Residents'}
      </Badge>
      {isCustomAudit && savedCategory ? (
        <Badge variant="secondary" className="capitalize">
          {savedCategory === 'staff' ? 'Staff Audits' :
            savedCategory === 'clinical' ? 'Clinical Audits' :
              savedCategory === 'operational' ? 'Operational Audits' :
                'General'}
        </Badge>
      ) : null}
      {savedStaffType && savedCategory === 'staff' ? (
        <Badge variant="outline" className="capitalize">
          {savedStaffType === 'nurses' ? 'Nurses Only' :
            savedStaffType === 'care-staff' ? 'Care Staff Only' :
              'All Staff'}
        </Badge>
      ) : null}
    </>
  );

  return (
    <>
      <ManagerAuditShell
      breadcrumbs={[
        { label: "Audits", href: "/dashboard/manager-audit" as Route },
        { label: "Manager Audit", href: "/dashboard/manager-audit" as Route },
        { label: auditName },
      ]}
      onBack={handleBack}
      topActions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/manager-audit/${auditId}/history`)}
          >
            <History className="mr-2 h-4 w-4" /> History
          </Button>
          {!SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddResidentDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isTeamBased ? 'Add Team' : isStaffBased ? 'Add Staff' : 'Add Resident'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setQuestionDialogMode("standard"); setIsQuestionDialogOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
          <Button
            size="sm"
            onClick={handleCompleteAudit}
            disabled={!SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && selectedResidents.length === 0}
          >
            Complete Audit
          </Button>
        </>
      }
      summary={
        isCustomAudit && isEditingName ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={editableAuditName}
              onChange={(e) => setEditableAuditName(e.target.value)}
              className="h-10 text-lg font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveAuditName();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              autoFocus
            />
            <Button size="sm" onClick={handleSaveAuditName}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
          </div>
        ) : (
          <ManagerAuditSummary
            title={auditName}
            subtitle={
              <span
                className={isCustomAudit ? "cursor-pointer hover:text-primary" : undefined}
                onClick={() => isCustomAudit && setIsEditingName(true)}
              >
                {isCustomAudit
                  ? "Click the title to rename this custom audit."
                  : SUBJECTLESS_HOME_AUDIT_IDS.has(auditId)
                    ? "Tap the status pill on each question to record a response."
                    : `Pick a ${isTeamBased ? "team" : isStaffBased ? "staff member" : "resident"} on the left and tap the status pill on each question to record a response.`}
              </span>
            }
            badges={
              <>
                {!SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && (
                  <Badge variant="outline">
                    {selectedResidents.length} {isTeamBased ? 'Teams' : isStaffBased ? 'Staff' : 'Residents'}
                  </Badge>
                )}
                {isCustomAudit && savedCategory ? (
                  <Badge variant="secondary" className="capitalize">
                    {savedCategory === 'staff' ? 'Staff Audits' :
                      savedCategory === 'clinical' ? 'Clinical Audits' :
                        savedCategory === 'operational' ? 'Operational Audits' :
                          'General'}
                  </Badge>
                ) : null}
                {savedStaffType && savedCategory === 'staff' ? (
                  <Badge variant="outline" className="capitalize">
                    {savedStaffType === 'nurses' ? 'Nurses Only' :
                      savedStaffType === 'care-staff' ? 'Care Staff Only' :
                        'All Staff'}
                  </Badge>
                ) : null}
              </>
            }
            chips={[
              { label: "Auditor", value: profile?.name || profile?.email || "—" },
              { label: "Questions", value: questions.filter((q) => !q.isSection).length },
              { label: "Action plans", value: actionPlans.length },
            ]}
          />
        )
      }
      flushBody
    >
      {/* Info message when no residents */}
      {!SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && selectedResidents.length === 0 && allResidents.length > 0 && (
        <div className="mx-4 mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:mx-5">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">No {isTeamBased ? 'teams' : isStaffBased ? 'staff' : 'residents'} added to this audit</h3>
              <p className="mt-1 text-sm text-blue-700">
                Click &quot;Add {isTeamBased ? 'Team' : isStaffBased ? 'Staff' : 'Resident'}&quot; to select records for this audit. You have {allResidents.length} {isTeamBased ? 'team' : 'resident'}{allResidents.length !== 1 ? 's' : ''} available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info message when no residents exist in organization */}
      {!SUBJECTLESS_HOME_AUDIT_IDS.has(auditId) && allResidents.length === 0 && (
        <div className="mx-4 mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 sm:mx-5">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">No {isTeamBased ? 'teams' : isStaffBased ? 'staff' : 'residents'} in your organization</h3>
              <p className="mt-1 text-sm text-yellow-700">
                You need to add {isTeamBased ? 'teams' : isStaffBased ? 'staff members' : 'residents'} to your organization before you can complete this audit.
              </p>
            </div>
          </div>
        </div>
      )}

      <ManagerAuditWorkspace
        templateName={auditName}
        questions={questions}
        selectedResidents={selectedResidents}
        answers={answers}
        comments={comments}
        actionPlans={workspaceActionPlans}
        isStaffBased={isStaffBased}
        isTeamBased={isTeamBased}
        teams={["35", "34", "37", "36", "39"].includes(auditId) ? teams : undefined}
        selectedUnitId={["35", "34", "37", "36", "39"].includes(auditId) ? selectedUnitId : undefined}
        onUnitChange={setSelectedUnitId}
        subjectless={SUBJECTLESS_HOME_AUDIT_IDS.has(auditId)}
        subjectlessSubjectId={AUDIT_LEVEL_SUBJECT_ID}
        onAnswerChange={handleAnswerChange}
        onCommentChange={handleCommentChange}
        onOpenAddQuestion={() => {
          setQuestionDialogMode("standard");
          setIsQuestionDialogOpen(true);
        }}
        onOpenAddResident={() => setIsAddResidentDialogOpen(true)}
        onRemoveQuestion={handleRemoveQuestion}
        onRemoveResident={handleRemoveResident}
        onOpenActionPlan={(resident) => handleOpenActionPlanDialog(resident)}
        onRemoveActionPlan={handleRemoveActionPlan}
      />

      <Dialog open={isAddResidentDialogOpen} onOpenChange={setIsAddResidentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isTeamBased ? 'Add Team to Audit' : isStaffBased ? 'Add Staff to Audit' : 'Add Resident to Audit'}
            </DialogTitle>
            <DialogDescription>
              {isTeamBased
                ? 'Select a team from the list below to add to this audit'
                : isStaffBased
                  ? 'Select a staff member from the list below to add to this audit'
                  : 'Select a resident from the list below to add to this audit'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder={isTeamBased ? "Filter by team name..." : isStaffBased ? "Filter by name..." : "Filter by name or room number..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {(() => {
                const addedResidentIds = new Set(selectedResidents.map((r) => r._id));
                const filteredAvailableResidents = allResidents
                  .filter((r) => !addedResidentIds.has(r._id))
                  .filter((r) =>
                    searchQuery
                      ? `${r.firstName} ${r.lastName} ${r.roomNumber || ""}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                      : true
                  );

                return (
                  <>
                    {!searchQuery && filteredAvailableResidents.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Showing {filteredAvailableResidents.length} available {isTeamBased ? 'team' : isStaffBased ? 'staff' : 'resident'}{!isStaffBased && filteredAvailableResidents.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {searchQuery && filteredAvailableResidents.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Found {filteredAvailableResidents.length} {isTeamBased ? 'team' : isStaffBased ? 'staff' : 'resident'}{!isStaffBased && filteredAvailableResidents.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {filteredAvailableResidents.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          {searchQuery
                            ? `No ${isTeamBased ? 'teams' : isStaffBased ? 'staff' : 'residents'} found matching your search`
                            : `All ${isTeamBased ? 'teams' : isStaffBased ? 'staff' : 'residents'} have been added`}
                        </p>
                      ) : (
                        filteredAvailableResidents.map((resident) => (
                          <div
                            key={resident._id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                            onClick={() => handleAddResident(resident._id)}
                          >
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={resident.imageUrl} />
                                <AvatarFallback>{resident.firstName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {resident.firstName} {resident.lastName}
                                </p>
                                {!isTeamBased && resident.roomNumber && (
                                  <p className="text-sm text-muted-foreground">
                                    Room {resident.roomNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Question</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Question</Label>
              <Input value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <Select value={newQuestionType} onValueChange={(val: any) => setNewQuestionType(val)}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance">Compliance (C/NC/NA)</SelectItem>
                  <SelectItem value="yesno">Yes/No</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddQuestion}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionPlanDialogOpen} onOpenChange={setIsActionPlanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Action Plan {selectedResidentForActionPlan && `for ${selectedResidentForActionPlan.firstName}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Action</Label>
              <Input value={actionPlanText} onChange={(e) => setActionPlanText(e.target.value)} placeholder="What needs to be done?" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Assign To</Label>
              <Select value={assignedToEmail} onValueChange={(val) => {
                setAssignedToEmail(val);
                const member = orgMembers.find(m => m.email === val);
                if (member) setAssignedTo(member.id); // Store UUID instead of name/email
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {orgMembers.map(member => (
                    <SelectItem key={member.email} value={member.email}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.image_url || ""} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {(member.name?.[0] || member.email[0]).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Due Date</Label>
                <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      <span className="text-sm">{dueDate ? format(dueDate, "dd/MM/yy") : "Pick date"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(date) => { if (date) { setDueDate(date); setDueDatePopoverOpen(false); } }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsActionPlanDialogOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={handleAddActionPlan} className="h-9">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Action Plan</DialogTitle>
            <DialogDescription>Are you sure you want to remove this action plan from the audit? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteActionPlan}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Plans Summary */}
      {actionPlans.length > 0 && (
        <div className="mx-4 mb-6 mt-2 space-y-4 sm:mx-5">
          <h3 className="text-base font-semibold">Audit Action Plans</h3>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Action Required</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium text-primary">{plan.residentName || 'General'}</TableCell>
                    <TableCell>{plan.text}</TableCell>
                    <TableCell>{plan.assignedToName || plan.assignedTo}</TableCell>
                    <TableCell>{plan.dueDate ? format(plan.dueDate, "dd/MM/yyyy") : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={plan.priority === 'High' ? 'destructive' : 'outline'}>
                        {plan.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        plan.status === 'completed' ? 'bg-green-500 hover:bg-green-600' :
                          plan.status === 'in_progress' ? 'bg-blue-500 hover:bg-blue-600' :
                            'bg-yellow-500 hover:bg-yellow-600'
                      }>
                        {(plan.status || 'pending').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveActionPlan(plan.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

    </ManagerAuditShell>
    {renderAlertDialog()}
  </>
  );
}

export default withRoleGuard(AuditDetailPage, ["manager", "admin", "owner"]);
