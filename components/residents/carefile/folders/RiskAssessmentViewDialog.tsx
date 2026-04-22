"use client";

import { format } from "date-fns";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeFormat = (v: any, fmt: string): string => {
  if (!v) return "";
  try {
    const d = new Date(typeof v === "number" ? v : v);
    if (isNaN(d.getTime())) return String(v);
    return format(d, fmt);
  } catch { return String(v); }
};

/** Get a value from an object using dot-path notation (e.g. "mobility_assessment.weight") */
const getPath = (obj: any, path: string): any => {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

/** Format a raw value for display */
const formatValue = (v: any, fmt?: "date" | "bool" | string): string => {
  if (v === null || v === undefined || v === "") return "—";

  // Custom format handlers for complex/nested values
  if (typeof fmt === "string") {
    // PEEP: steps array
    if (fmt === "peep_steps") {
      if (!v) return "—";
      const stepsArray = Array.isArray(v)
        ? (v as any[])
        : (typeof v === "object"
          ? Object.values(v as any)
          : []);
      if (!stepsArray.length) return "—";
      const items = stepsArray.map((step: any, idx: number) => {
        const name = step?.name || `Step ${idx + 1}`;
        const desc = step?.description;
        return desc ? `${idx + 1}) ${name}: ${desc}` : `${idx + 1}) ${name}`;
      });
      return items.join(" | ");
    }

    // Pain assessment: entry count
    if (fmt === "pain_entries_count") {
      if (!Array.isArray(v)) return "0 entries";
      const count = v.length;
      return `${count} entr${count === 1 ? "y" : "ies"}`;
    }

    // Pain assessment: latest entry field (e.g. pain_latest.painLocation)
    if (fmt.startsWith("pain_latest.")) {
      const field = fmt.slice("pain_latest.".length);
      if (Array.isArray(v) && v.length > 0) {
        const latest = v[v.length - 1] ?? {};
        const val = latest?.[field];
        return val === null || val === undefined || val === "" ? "—" : String(val);
      }
      return "—";
    }

    // Resident valuables: simple lists
    if (fmt === "valuables_list") {
      if (!Array.isArray(v) || v.length === 0) return "—";
      const items = (v as any[])
        .map((item) => item?.value)
        .filter((x) => x && String(x).trim().length > 0);
      if (!items.length) {
        const count = v.length;
        return `${count} item${count === 1 ? "" : "s"}`;
      }
      return items.join(", ");
    }

    if (fmt === "clothing_list") {
      if (!Array.isArray(v) || v.length === 0) return "—";
      const items = (v as any[])
        .map((item) => {
          const name = item?.value;
          if (!name || !String(name).trim()) return null;
          const count = item?.count ?? 1;
          return count > 1 ? `${name} (x${count})` : name;
        })
        .filter((x) => x);
      if (!items.length) {
        const count = v.length;
        return `${count} item${count === 1 ? "" : "s"}`;
      }
      return items.join(", ");
    }

    if (fmt === "other_items_list") {
      if (!Array.isArray(v) || v.length === 0) return "—";
      const items = (v as any[])
        .map((item) => {
          const name = item?.value || item?.details;
          if (!name || !String(name).trim()) return null;
          const count = item?.count ?? 1;
          return count > 1 ? `${name} (x${count})` : String(name);
        })
        .filter((x) => x);
      if (!items.length) {
        const count = v.length;
        return `${count} item${count === 1 ? "" : "s"}`;
      }
      return items.join(", ");
    }
  }

  // Generic booleans & dates
  if (fmt === "bool" || typeof v === "boolean") return v ? "Yes" : "No";
  if (fmt === "date" || (typeof v === "number" && v > 1_000_000_000_000)) {
    return safeFormat(v, "dd MMM yyyy");
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(v)) {
    return safeFormat(v, "dd MMM yyyy");
  }

  // Arrays: render primitives inline, objects as a compact count
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    const first = v[0];
    if (
      typeof first === "string" ||
      typeof first === "number" ||
      typeof first === "boolean"
    ) {
      return (v as any[]).join(", ");
    }
    const count = v.length;
    return `${count} item${count === 1 ? "" : "s"}`;
  }

  if (typeof v === "object") {
    // Fallback: JSON representation for unexpected complex objects
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  if (fmt === "pts") {
    return `${v} pts`;
  }

  return String(v);
};

// ─── Schema Types ─────────────────────────────────────────────────────────────

type FieldDef = {
  label: string;
  path: string;                    // dot-path into the DB row
  fmt?: "date" | "bool" | string;  // optional formatter hint
};

type SectionDef = {
  title: string;
  fields: FieldDef[];
};

// ─── Per-form schemas ──────────────────────────────────────────────────────────
// Each schema mirrors the section order of the corresponding dialog form.

const FORM_SCHEMAS: Record<string, SectionDef[]> = {

  // ── Admission Assessment ──────────────────────────────────────────────────
  "admission-form": [
    {
      title: "Basic Information",
      fields: [
        { label: "First Name", path: "assessment_data.firstName" },
        { label: "Last Name", path: "assessment_data.lastName" },
        { label: "Date of Birth", path: "assessment_data.dateOfBirth", fmt: "date" },
        { label: "Bedroom", path: "assessment_data.bedroomNumber" },
        { label: "NHS Number", path: "assessment_data.NHSNumber" },
        { label: "Gender", path: "assessment_data.gender" },
        { label: "Phone", path: "assessment_data.telephoneNumber" },
        { label: "Ethnicity", path: "assessment_data.ethnicity" },
        { label: "Religion", path: "assessment_data.religion" },
        { label: "Admitted From", path: "assessment_data.admittedFrom" },
      ],
    },
    {
      title: "Next of Kin",
      fields: [
        { label: "NOK First Name", path: "assessment_data.kinFirstName" },
        { label: "NOK Last Name", path: "assessment_data.kinLastName" },
        { label: "Relationship", path: "assessment_data.kinRelationship" },
        { label: "Phone", path: "assessment_data.kinTelephoneNumber" },
        { label: "Email", path: "assessment_data.kinEmail" },
        { label: "Address", path: "assessment_data.kinAddress" },
      ],
    },
    {
      title: "Emergency Contacts",
      fields: [
        { label: "Name", path: "assessment_data.emergencyContactName" },
        { label: "Relationship", path: "assessment_data.emergencyContactRelationship" },
        { label: "Phone", path: "assessment_data.emergencyContactTelephoneNumber" },
        { label: "Alt. Phone", path: "assessment_data.emergencyContactPhoneNumber" },
      ],
    },
    {
      title: "Professional Contacts",
      fields: [
        { label: "Care Manager", path: "assessment_data.careManagerName" },
        { label: "Care Manager Role", path: "assessment_data.careManagerJobRole" },
        { label: "Care Manager Phone", path: "assessment_data.careManagerTelephoneNumber" },
        { label: "Care Manager Alt. Phone", path: "assessment_data.careManagerPhoneNumber" },
        { label: "Care Manager Email", path: "assessment_data.careManagerEmail" },
        { label: "Care Manager Addr", path: "assessment_data.careManagerAddress" },
        { label: "GP Name", path: "assessment_data.GPName" },
        { label: "GP Phone", path: "assessment_data.GPPhoneNumber" },
        { label: "GP Address", path: "assessment_data.GPAddress" },
      ],
    },
    {
      title: "Medical Information",
      fields: [
        { label: "Allergies", path: "assessment_data.allergies" },
        { label: "Medical History", path: "assessment_data.medicalHistory" },
        { label: "Prescribed Medications", path: "assessment_data.prescribedMedications" },
        { label: "Consent & Capacity", path: "assessment_data.consentCapacityRights" },
      ],
    },
    {
      title: "Care Assessments",
      fields: [
        { label: "Existing Wounds", path: "assessment_data.skinIntegrityWounds" },
        { label: "Skin Integrity Equipment", path: "assessment_data.skinIntegrityEquipment" },
        { label: "Current Infection", path: "assessment_data.currentInfection" },
        { label: "Antibiotics Prescribed", path: "assessment_data.antibioticsPrescribed", fmt: "bool" },
        { label: "Independent Mobility", path: "assessment_data.mobilityIndependent", fmt: "bool" },
        { label: "Assistance Required", path: "assessment_data.assistanceRequired" },
        { label: "Mobility Equipment", path: "assessment_data.equipmentRequired" },
        { label: "Altered Consciousness", path: "assessment_data.alteredConsciousness" },
      ],
    },
    {
      title: "Core Needs Toggles",
      fields: [
        { label: "Continence Independent", path: "assessment_data.continenceIndependent", fmt: "bool" },
        { label: "Hygiene Independent", path: "assessment_data.hygieneIndependent", fmt: "bool" },
        { label: "Breathing Independent", path: "assessment_data.breathingIndependent", fmt: "bool" },
        { label: "Sleep/Psych Independent", path: "assessment_data.sleepPsychologicalIndependent", fmt: "bool" },
        { label: "Communication Independent", path: "assessment_data.communicationIndependent", fmt: "bool" },
        { label: "Behaviour Independent", path: "assessment_data.behaviourIndependent", fmt: "bool" },
        { label: "Cognition Independent", path: "assessment_data.cognitionIndependent", fmt: "bool" },
      ],
    },
    {
      title: "Detailed Needs",
      fields: [
        { label: "Continence Needs", path: "assessment_data.continence" },
        { label: "Personal Hygiene", path: "assessment_data.hygiene" },
        { label: "Respiratory Support", path: "assessment_data.prescribedBreathing" },
        { label: "Bedtime Routine", path: "assessment_data.bedtimeRoutine" },
        { label: "Psychological Needs", path: "assessment_data.psychologicalNeeds" },
        { label: "Communication Needs", path: "assessment_data.communication" },
        { label: "Behaviour Needs", path: "assessment_data.behaviour" },
        { label: "Cognition Needs", path: "assessment_data.cognition" },
      ],
    },
    {
      title: "Nutrition, Diet & Hydration",
      fields: [
        { label: "Weight (kg)", path: "assessment_data.weight" },
        { label: "Height (cm)", path: "assessment_data.height" },
        { label: "IDDSI Food Level", path: "assessment_data.iddsiFood" },
        { label: "IDDSI Fluid Level", path: "assessment_data.iddsiFluid" },
        { label: "Diet Type / Preferences", path: "assessment_data.dietType" },
        { label: "Nutritional Supplements", path: "assessment_data.nutritionalSupplements" },
        { label: "Nutritional Assistance", path: "assessment_data.nutritionalAssistanceRequired" },
        { label: "Choking Risk", path: "assessment_data.chokingRisk", fmt: "bool" },
        { label: "Additional Comments", path: "assessment_data.additionalComments" },
      ],
    },
    {
      title: "Assessment Completion",
      fields: [
        { label: "Completed By", path: "assessment_data.completedBy" },
        { label: "Job Role", path: "assessment_data.jobRole" },
        { label: "Date of Completion", path: "assessment_data.assessmentDate", fmt: "date" },
        { label: "Signature", path: "assessment_data.signature" },
      ],
    },
  ],

  // ── Pre-Admission Assessment ───────────────────────────────────────────────
  "preAdmission-form": [
    {
      title: "Administrative Details",
      fields: [
        { label: "Care Home", path: "care_home_name" },
        { label: "NHS Number", path: "nhs_number" },
        { label: "Assessing Worker", path: "assessment_data.userName" },
        { label: "Job Role", path: "assessment_data.jobRole" },
        { label: "Assessment Date", path: "assessment_data.date", fmt: "date" },
        { label: "Consent Given", path: "consent_accepted_at", fmt: "date" },
      ],
    },
    {
      title: "Resident Information",
      fields: [
        { label: "First Name", path: "assessment_data.firstName" },
        { label: "Last Name", path: "assessment_data.lastName" },
        { label: "Date of Birth", path: "assessment_data.dateOfBirth", fmt: "date" },
        { label: "Address", path: "assessment_data.address" },
        { label: "Phone", path: "assessment_data.phoneNumber" },
        { label: "Ethnicity", path: "assessment_data.ethnicity" },
        { label: "Gender", path: "assessment_data.gender" },
        { label: "Religion", path: "assessment_data.religion" },
        { label: "Preferred Name", path: "assessment_data.preferedName" },
      ],
    },
    {
      title: "Next of Kin",
      fields: [
        { label: "First Name", path: "assessment_data.kinFirstName" },
        { label: "Last Name", path: "assessment_data.kinLastName" },
        { label: "Relationship", path: "assessment_data.kinRelationship" },
        { label: "Phone", path: "assessment_data.kinPhoneNumber" },
      ],
    },
    {
      title: "Professional Contacts",
      fields: [
        { label: "Care Manager", path: "assessment_data.careManagerName" },
        { label: "Care Manager Phone", path: "assessment_data.careManagerPhoneNumber" },
        { label: "District Nurse", path: "assessment_data.districtNurseName" },
        { label: "District Nurse Ph.", path: "assessment_data.districtNursePhoneNumber" },
        { label: "GP Name", path: "assessment_data.generalPractitionerName" },
        { label: "GP Phone", path: "assessment_data.generalPractitionerPhoneNumber" },
        { label: "Provider Name", path: "assessment_data.providerHealthcareInfoName" },
        { label: "Provider Role", path: "assessment_data.providerHealthcareInfoDesignation" },
      ],
    },
    {
      title: "Medical Assessment",
      fields: [
        { label: "Known Allergies", path: "assessment_data.allergies" },
        { label: "Medical History", path: "assessment_data.medicalHistory" },
        { label: "Medications", path: "assessment_data.medicationPrescribed" },
      ],
    },
    {
      title: "Activities of Daily Living",
      fields: [
        { label: "Consent & Capacity", path: "assessment_data.consentCapacityRights" },
        { label: "Medication", path: "assessment_data.medication" },
        { label: "Mobility", path: "assessment_data.mobility" },
        { label: "Nutrition", path: "assessment_data.nutrition" },
        { label: "Continence", path: "assessment_data.continence" },
        { label: "Hygiene & Dressing", path: "assessment_data.hygieneDressing" },
        { label: "Skin", path: "assessment_data.skin" },
        { label: "Cognition", path: "assessment_data.cognition" },
        { label: "Infection", path: "assessment_data.infection" },
        { label: "Breathing", path: "assessment_data.breathing" },
        { label: "Altered Consciousness", path: "assessment_data.alteredStateOfConsciousness" },
      ],
    },
    {
      title: "Legal & End of Life",
      fields: [
        { label: "DNACPR", path: "assessment_data.dnacpr", fmt: "bool" },
        { label: "Advanced Decision", path: "assessment_data.advancedDecision", fmt: "bool" },
        { label: "Capacity", path: "assessment_data.capacity", fmt: "bool" },
        { label: "Advanced Care Plan", path: "assessment_data.advancedCarePlan", fmt: "bool" },
        { label: "Palliative Comments", path: "assessment_data.comments" },
      ],
    },
    {
      title: "Resident Preferences",
      fields: [
        { label: "Room Preferences", path: "assessment_data.roomPreferences" },
        { label: "Admission Contact", path: "assessment_data.admissionContact" },
        { label: "Food Preferences", path: "assessment_data.foodPreferences" },
        { label: "Family Concerns", path: "assessment_data.familyConcerns" },
        { label: "Equipment", path: "assessment_data.equipment" },
      ],
    },
    {
      title: "Financial & Final Details",
      fields: [
        { label: "Attend Finances", path: "assessment_data.attendFinances", fmt: "bool" },
        { label: "Other Considerations", path: "assessment_data.additionalConsiderations" },
        { label: "Other Health Pros", path: "assessment_data.otherHealthCareProfessional" },
        { label: "Assessment Outcome", path: "assessment_data.outcome" },
        { label: "Planned Admission", path: "assessment_data.plannedAdmissionDate", fmt: "date" },
      ],
    },
  ],

  // ── Bladder & Bowel (Continence) ──────────────────────────────────────────
  "blader-bowel-form": [
    {
      title: "General Information",
      fields: [
        { label: "Resident Name", path: "residentName" },
        { label: "Bedroom", path: "bedroomNumber" },
        { label: "Info Obtained From", path: "informationObtainedFrom" },
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
        { label: "Completed By", path: "completed_by" },
        { label: "Next Review Date", path: "next_review_date", fmt: "date" },
      ],
    },
    {
      title: "Infection Risks",
      fields: [
        { label: "Hepatitis A/B", path: "symptoms.infections.hepatitisAB", fmt: "bool" },
        { label: "Blood Borne Viruses", path: "symptoms.infections.bloodBorneVirues", fmt: "bool" },
        { label: "MRSA", path: "symptoms.infections.mrsa", fmt: "bool" },
        { label: "ESBL", path: "symptoms.infections.esbl", fmt: "bool" },
        { label: "Other Infections", path: "symptoms.infections.other" },
      ],
    },
    {
      title: "Urinalysis Results",
      fields: [
        { label: "pH", path: "symptoms.urinalysis.ph", fmt: "bool" },
        { label: "Nitrates", path: "symptoms.urinalysis.nitrates", fmt: "bool" },
        { label: "Protein", path: "symptoms.urinalysis.protein", fmt: "bool" },
        { label: "Leucocytes", path: "symptoms.urinalysis.leucocytes", fmt: "bool" },
        { label: "Glucose", path: "symptoms.urinalysis.glucose", fmt: "bool" },
        { label: "Blood", path: "symptoms.urinalysis.bloodResult", fmt: "bool" },
        { label: "MSSU Sent", path: "symptoms.urinalysis.mssuDate", fmt: "date" },
      ],
    },
    {
      title: "Relevant Medications",
      fields: [
        { label: "Anti-hypertensives", path: "symptoms.medications.antiHypertensives", fmt: "bool" },
        { label: "Anti-Parkinson", path: "symptoms.medications.antiParkinsonDrugs", fmt: "bool" },
        { label: "Iron Supplement", path: "symptoms.medications.ironSupplement", fmt: "bool" },
        { label: "Laxatives", path: "symptoms.medications.laxatives", fmt: "bool" },
        { label: "Diuretics", path: "symptoms.medications.diuretics", fmt: "bool" },
        { label: "Histamine Blockers", path: "symptoms.medications.histamine", fmt: "bool" },
        { label: "Anti-depressants", path: "symptoms.medications.antiDepressants", fmt: "bool" },
        { label: "Cholinergic", path: "symptoms.medications.cholinergic", fmt: "bool" },
        { label: "Sedatives/Hypnotics", path: "symptoms.medications.sedativesHypnotic", fmt: "bool" },
        { label: "Anti-psychotics", path: "symptoms.medications.antiPsychotic", fmt: "bool" },
        { label: "Antihistamines", path: "symptoms.medications.antihistamines", fmt: "bool" },
        { label: "Narcotic Analgesics", path: "symptoms.medications.narcoticAnalgesics", fmt: "bool" },
      ],
    },
    {
      title: "Lifestyle & Physical Factors",
      fields: [
        { label: "Smoking Status", path: "lifestyle_factors.smoking" },
        { label: "Weight Check", path: "lifestyle_factors.weight" },
        { label: "Skin Condition", path: "lifestyle_factors.skinCondition" },
        { label: "Constipation History", path: "lifestyle_factors.constipationHistory", fmt: "bool" },
        { label: "Recurrent UTIs History", path: "lifestyle_factors.historyRecurrentUTIs", fmt: "bool" },
        { label: "Caffeine (ml/24h)", path: "lifestyle_factors.caffeineMls24h" },
        { label: "Alcohol (units/day)", path: "lifestyle_factors.alcoholAmount24h" },
      ],
    },
    {
      title: "Bladder Pattern & Symptoms",
      fields: [
        { label: "Urinary Incontinence", path: "bladder_pattern.incontinence" },
        { label: "Typical Volume", path: "bladder_pattern.volume" },
        { label: "Onset", path: "bladder_pattern.onset" },
        { label: "Continent", path: "bladder_pattern.bladderContinent", fmt: "bool" },
        { label: "Incontinent", path: "bladder_pattern.bladderIncontinent", fmt: "bool" },
        { label: "Incontinent Type", path: "bladder_pattern.bladderIncontinentType" },
        { label: "Coughing/Laughing leak", path: "symptoms.specific.leakCoughLaugh", fmt: "bool" },
        { label: "Standing up leak", path: "symptoms.specific.leakStandingUp", fmt: "bool" },
        { label: "Frequent voiding", path: "symptoms.specific.passesUrineFrequently", fmt: "bool" },
        { label: "Urge incontinence", path: "symptoms.specific.leaksBeforeToilet", fmt: "bool" },
        { label: "Nocturia (>2x)", path: "symptoms.specific.moreThanTwiceAtNight", fmt: "bool" },
        { label: "Referral Required", path: "bladder_pattern.bladderReferralRequired" },
        { label: "Plan Commenced", path: "bladder_pattern.bladderPlanCommenced", fmt: "bool" },
      ],
    },
    {
      title: "Bowel Pattern",
      fields: [
        { label: "Bowel Status", path: "bowel_pattern.bowelState" },
        { label: "Frequency", path: "bowel_pattern.bowelFrequency" },
        { label: "Usual Time of Day", path: "bowel_pattern.usualTimeOfDat" },
        { label: "Bristol Stool Type", path: "bowel_pattern.amountAndStoolType" },
        { label: "Continent", path: "bowel_pattern.bowelContinent", fmt: "bool" },
        { label: "Incontinent", path: "bowel_pattern.bowelIncontinent", fmt: "bool" },
        { label: "Referral Required", path: "bowel_pattern.bowelReferralRequired" },
        { label: "Plan Commenced", path: "bowel_pattern.bowelPlanCommenced", fmt: "bool" },
        { label: "Record Commenced", path: "bowel_pattern.bowelRecordCommenced", fmt: "bool" },
        { label: "Medical Officer Consulted", path: "bowel_pattern.medicalOfficerConsulted", fmt: "bool" },
      ],
    },
    {
      title: "Toileting Habits & Aids",
      fields: [
        { label: "Day Pattern", path: "bladder_pattern.dayPattern" },
        { label: "Evening Pattern", path: "bladder_pattern.eveningPattern" },
        { label: "Night Pattern", path: "bladder_pattern.nightPattern" },
        { label: "Continence Pads/Aids", path: "bladder_pattern.typesOfPads" },
      ],
    },
    {
      title: "Sign-off",
      fields: [
        { label: "Staff Name", path: "completed_by" },
      ],
    },
  ],

  // ── Moving & Handling ──────────────────────────────────────────────────────
  "moving-handling-form": [
    {
      title: "Resident Information",
      fields: [
        { label: "Resident Name", path: "residentName" },
        { label: "Weight (kg)", path: "mobility_assessment.weight" },
        { label: "Height (cm)", path: "mobility_assessment.height" },
        { label: "History of Falls", path: "risk_factors.historyOfFalls", fmt: "bool" },
      ],
    },
    {
      title: "Mobility Assessment",
      fields: [
        { label: "Independent Mobility", path: "mobility_assessment.independentMobility", fmt: "bool" },
        { label: "Weight Bearing", path: "mobility_assessment.canWeightBear" },
        { label: "Upper Right Limb", path: "mobility_assessment.limbUpperRight" },
        { label: "Upper Left Limb", path: "mobility_assessment.limbUpperLeft" },
        { label: "Lower Right Limb", path: "mobility_assessment.limbLowerRight" },
        { label: "Lower Left Limb", path: "mobility_assessment.limbLowerLeft" },
      ],
    },
    {
      title: "Risk Factors",
      fields: [
        { label: "Deafness", path: "risk_factors.deafnessState" },
        { label: "Deafness Notes", path: "risk_factors.deafnessComments" },
        { label: "Blindness", path: "risk_factors.blindnessState" },
        { label: "Blindness Notes", path: "risk_factors.blindnessComments" },
        { label: "Unpredictable Behaviour", path: "risk_factors.unpredictableBehaviourState" },
        { label: "Unpredictable Notes", path: "risk_factors.unpredictableBehaviourComments" },
        { label: "Uncooperative Behaviour", path: "risk_factors.uncooperativeBehaviourState" },
        { label: "Uncooperative Notes", path: "risk_factors.uncooperativeBehaviourComments" },
        { label: "Distressed Reaction", path: "risk_factors.distressedReactionState" },
        { label: "Distressed Notes", path: "risk_factors.distressedReactionComments" },
        { label: "Disorientated", path: "risk_factors.disorientatedState" },
        { label: "Disorientated Notes", path: "risk_factors.disorientatedComments" },
        { label: "Unconscious", path: "risk_factors.unconsciousState" },
        { label: "Spasms", path: "risk_factors.spasmsState" },
        { label: "Stiffness", path: "risk_factors.stiffnessState" },
        { label: "Catheters", path: "risk_factors.cathetersState" },
        { label: "Incontinence", path: "risk_factors.incontinenceState" },
        { label: "Localised Pain", path: "risk_factors.localisedPain" },
        { label: "Other Risks", path: "risk_factors.otherState" },
      ],
    },
    {
      title: "Requirements & Equipment",
      fields: [
        { label: "Staff Requirements", path: "risk_factors.needsRiskStaff" },
        { label: "Equipment Required", path: "equipment_needed" },
      ],
    },
    {
      title: "Completion",
      fields: [
        { label: "Completed By", path: "completed_by" },
        { label: "Date", path: "assessment_date", fmt: "date" },
      ],
    },
  ],

  // ── Infection Prevention ────────────────────────────────────────────────────
  "infection-prevention": [
    {
      title: "Resident Details",
      fields: [
        { label: "Resident Name", path: "symptoms.details.name" },
        { label: "Date of Birth", path: "symptoms.details.dateOfBirth", fmt: "date" },
        { label: "Home Address", path: "symptoms.details.homeAddress" },
        { label: "Assessment Type", path: "assessment_type" },
        { label: "Info Provided By", path: "symptoms.details.informationProvidedBy" },
        { label: "Consultant / GP", path: "symptoms.details.consultantGP" },
        { label: "Admitted From", path: "exposure_history.admittedFrom" },
        { label: "Admission Date", path: "exposure_history.dateOfAdmission", fmt: "date" },
        { label: "Reason for Admission", path: "exposure_history.reasonForAdmission" },
      ],
    },
    {
      title: "Acute Respiratory Illness",
      fields: [
        { label: "New Continuous Cough", path: "symptoms.respiratory.newContinuousCough", fmt: "bool" },
        { label: "Worsening Cough", path: "symptoms.respiratory.worseningCough", fmt: "bool" },
        { label: "High Temperature", path: "symptoms.respiratory.temperatureHigh", fmt: "bool" },
        { label: "Other Symptoms", path: "symptoms.respiratory.otherRespiratorySymptoms" },
        { label: "Tested for COVID-19", path: "symptoms.respiratory.testedForCovid19", fmt: "bool" },
        { label: "Tested for Influenza A", path: "symptoms.respiratory.testedForInfluenzaA", fmt: "bool" },
        { label: "Tested for Influenza B", path: "symptoms.respiratory.testedForInfluenzaB", fmt: "bool" },
        { label: "Resp Screen", path: "symptoms.respiratory.testedForRespiratoryScreen", fmt: "bool" },
      ],
    },
    {
      title: "Exposure & Isolation",
      fields: [
        { label: "COVID+ Patient Exposure", path: "exposure_history.exposureToPatientsCovid", fmt: "bool" },
        { label: "COVID+ Staff Exposure", path: "exposure_history.exposureToStaffCovid", fmt: "bool" },
        { label: "Isolation Required", path: "isolation_required", fmt: "bool" },
        { label: "Isolation Details", path: "exposure_history.isolationDetails" },
        { label: "Further Treatment", path: "exposure_history.furtherTreatmentRequired", fmt: "bool" },
      ],
    },
    {
      title: "Diarrhoea & Vomiting",
      fields: [
        { label: "Does have d/v where infection not confirmed?", path: "symptoms.diarrheaVomiting.currentSymptoms", fmt: "bool" },
        { label: "Contact with others with d/v (72h)?", path: "symptoms.diarrheaVomiting.contactWithOthers", fmt: "bool" },
        { label: "Family with d/v (72h)?", path: "symptoms.diarrheaVomiting.familyHistory72h", fmt: "bool" },
      ],
    },
    {
      title: "Clostridium Difficile",
      fields: [
        { label: "Active Case", path: "symptoms.clostridium.active", fmt: "bool" },
        { label: "Past History", path: "symptoms.clostridium.history", fmt: "bool" },
        { label: "Stool Count (72h)", path: "symptoms.clostridium.stoolCount72h" },
        { label: "Last Positive Specimen", path: "symptoms.clostridium.lastPositiveSpecimenDate", fmt: "date" },
        { label: "Result", path: "symptoms.clostridium.result" },
        { label: "Treatment Received", path: "symptoms.clostridium.treatmentReceived" },
        { label: "Treatment Complete", path: "symptoms.clostridium.treatmentComplete", fmt: "bool" },
        { label: "Ongoing Antibiotic", path: "symptoms.clostridium.ongoingDetails" },
        { label: "Ongoing Follow-up", path: "symptoms.clostridium.ongoingFollowUpRequired" },
      ],
    },
    {
      title: "MRSA / MSSA",
      fields: [
        { label: "Known Colonisation", path: "symptoms.mrsa.colonised", fmt: "bool" },
        { label: "Active Infection", path: "symptoms.mrsa.infected", fmt: "bool" },
        { label: "Last Positive Swab", path: "symptoms.mrsa.lastPositiveSwabDate", fmt: "date" },
        { label: "Sites Positive", path: "symptoms.mrsa.sitesPositive" },
        { label: "Treatment Received", path: "symptoms.mrsa.treatmentReceived" },
        { label: "Decolonisation Details", path: "symptoms.mrsa.mrsaMssaDetails" },
        { label: "Decolonisation Follow-up", path: "symptoms.mrsa.mrsaMssaFollowUpRequired" },
      ],
    },
    {
      title: "Multi-drug Resistant Organisms",
      fields: [
        { label: "ESBL", path: "symptoms.multiDrugResistance.esbl", fmt: "bool" },
        { label: "VRE / GRE", path: "symptoms.multiDrugResistance.vreGre", fmt: "bool" },
        { label: "CPE", path: "symptoms.multiDrugResistance.cpe", fmt: "bool" },
        { label: "Other MDR Organisms", path: "symptoms.multiDrugResistance.other" },
        { label: "Clinical Notes", path: "symptoms.multiDrugResistance.relevantInformation" },
      ],
    },
    {
      title: "Vaccinations & Completion",
      fields: [
        { label: "Aware of Infection", path: "exposure_history.awarenessOfInfection", fmt: "bool" },
        { label: "Last Flu Vaccination", path: "exposure_history.lastFluVaccinationDate", fmt: "date" },
        { label: "Completed By", path: "completed_by" },
        { label: "Digital Signature", path: "symptoms.details.signature" },
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
      ],
    },
  ],

  // ── DNACPR ────────────────────────────────────────────────────────────────
  "dnacpr": [
    {
      title: "Resident & Decision",
      fields: [
        { label: "Resident Name", path: "residentName" },
        { label: "Bedroom Number", path: "bedroomNumber" },
        { label: "Date of Birth", path: "dateOfBirth", fmt: "date" },
        { label: "Date of Decision", path: "assessment_date", fmt: "date" },
        { label: "DNACPR Active", path: "dnacpr_active", fmt: "bool" },
        { label: "Primary Reason", path: "reason" },
        { label: "Decision Comments", path: "dnacprComments" },
      ],
    },
    {
      title: "Discussion Record",
      fields: [
        { label: "Discussed with Resident", path: "discussion_history.discussedResident", fmt: "bool" },
        { label: "Resident Discussion Date", path: "discussion_history.discussedResidentDate", fmt: "date" },
        { label: "Resident Comments", path: "discussion_history.discussedResidentComments" },
        { label: "Discussed with Relatives", path: "discussion_history.discussedRelatives", fmt: "bool" },
        { label: "Relatives Date", path: "discussion_history.discussedRelativeDate", fmt: "date" },
        { label: "Relatives Comments", path: "discussion_history.discussedRelativesComments" },
        { label: "Discussed with NOK", path: "discussion_history.discussedNOKs", fmt: "bool" },
        { label: "NOK Date", path: "discussion_history.discussedNOKsDate", fmt: "date" },
        { label: "NOK Comments", path: "discussion_history.discussedNOKsComments" },
        { label: "General Comments", path: "discussion_history.comments" },
      ],
    },
    {
      title: "Sign-off",
      fields: [
        { label: "GP Signature", path: "gp_signature" },
        { label: "GP Signing Date", path: "gp_date", fmt: "date" },
        { label: "Resident / NOK Signature", path: "discussion_history.residentNokSignature" },
        { label: "Registered Nurse", path: "completed_by" },
      ],
    },
  ],


  "braden-risk-assessment-form": [
    {
      title: "Basic Information",
      fields: [
        { label: "Resident Name", path: "residentName" },
        { label: "Bedroom Number", path: "bedroomNumber" },
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
        { label: "Completed By", path: "completed_by" },
      ],
    },
    {
      title: "Braden Scale Scores",
      fields: [
        { label: "Sensory Perception", path: "assessment_details.sensoryPerception" },
        { label: "Moisture", path: "assessment_details.moisture" },
        { label: "Activity", path: "assessment_details.activity" },
        { label: "Mobility", path: "assessment_details.mobility" },
        { label: "Nutrition", path: "assessment_details.nutrition" },
        { label: "Friction & Shear", path: "assessment_details.frictionShear" },
      ],
    },
    {
      title: "Risk Summary",
      fields: [
        { label: "Total Braden Score", path: "risk_score" },
        { label: "Risk Level", path: "risk_level" },
      ],
    },
  ],

  // ── PEEP (Personal Emergency Evacuation Plan) ────────────────────────────────
  "peep": [
    {
      title: "Resident Information",
      fields: [
        { label: "Resident Name", path: "residentName" },
        { label: "Bedroom Number", path: "bedroomNumber" },
        { label: "Date of Birth", path: "residentDateOfBirth", fmt: "date" },
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
        { label: "Completed By", path: "completed_by" },
      ],
    },
    {
      title: "Assistance Needed",
      fields: [
        { label: "Understands Evacuation Procedure", path: "assistance_needed.understands", fmt: "bool" },
        { label: "Number of Staff Needed", path: "assistance_needed.staffNeeded" },
        { label: "Equipment Needed", path: "assistance_needed.equipmentNeeded" },
        { label: "Communication Needs", path: "assistance_needed.communicationNeeds" },
      ],
    },
    {
      title: "Evacuation Steps",
      fields: [
        // Render the whole steps array with a specialised formatter
        { label: "Steps", path: "evacuation_steps", fmt: "peep_steps" },
      ],
    },
    {
      title: "Fire Safety / Hazards",
      fields: [
        { label: "Oxygen In Use", path: "hazard_info.oxigenInUse", fmt: "bool" },
        { label: "Oxygen Comments", path: "hazard_info.oxigenComments" },
        { label: "Resident Smokes", path: "hazard_info.residentSmokes", fmt: "bool" },
        { label: "Smoking Comments", path: "hazard_info.residentSmokesComments" },
        { label: "Furniture Fire Retardant", path: "hazard_info.furnitureFireRetardant", fmt: "bool" },
        { label: "Furniture Comments", path: "hazard_info.furnitureFireRetardantComments" },
      ],
    },
  ],

  // ── Pain Assessment & Evaluation ─────────────────────────────────────────────
  "pain-assessment-form": [
    {
      title: "Assessment Summary",
      fields: [
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
        { label: "Number of Entries", path: "assessment_entries", fmt: "pain_entries_count" },
      ],
    },
    {
      title: "Latest Entry (Summary)",
      fields: [
        { label: "Date / Time", path: "assessment_entries", fmt: "pain_latest.dateTime" },
        { label: "Pain Location", path: "assessment_entries", fmt: "pain_latest.painLocation" },
        { label: "Description of Pain", path: "assessment_entries", fmt: "pain_latest.descriptionOfPain" },
        { label: "Behaviour", path: "assessment_entries", fmt: "pain_latest.residentBehaviour" },
        { label: "Intervention", path: "assessment_entries", fmt: "pain_latest.interventionType" },
        { label: "Pain After Intervention", path: "assessment_entries", fmt: "pain_latest.painAfterIntervention" },
      ],
    },
  ],

  // ── Resident Handling Profile ────────────────────────────────────────────────
  "resident-handling-profile-form": [
    {
      title: "Summary",
      fields: [
        { label: "Completed By", path: "completed_by" },
        { label: "Job Role", path: "job_role" },
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
        { label: "Weight (kg)", path: "weight" },
        { label: "Weight Bearing", path: "weight_bearing" },
      ],
    },
    {
      title: "Activities - Transfers & Mobility",
      fields: [
        { label: "Transfer: Bed - Staff", path: "activities.transferBed.nStaff" },
        { label: "Transfer: Bed - Equipment", path: "activities.transferBed.equipment" },
        { label: "Transfer: Chair - Staff", path: "activities.transferChair.nStaff" },
        { label: "Transfer: Chair - Equipment", path: "activities.transferChair.equipment" },
        { label: "Walking - Staff", path: "activities.walking.nStaff" },
        { label: "Walking - Equipment", path: "activities.walking.equipment" },
      ],
    },
    {
      title: "Activities - Personal Care",
      fields: [
        { label: "Toileting - Staff", path: "activities.toileting.nStaff" },
        { label: "Toileting - Equipment", path: "activities.toileting.equipment" },
        { label: "Movement In Bed - Staff", path: "activities.movementInBed.nStaff" },
        { label: "Movement In Bed - Equipment", path: "activities.movementInBed.equipment" },
        { label: "Bathing - Staff", path: "activities.bath.nStaff" },
        { label: "Bathing - Equipment", path: "activities.bath.equipment" },
        { label: "Outdoor Mobility - Staff", path: "activities.outdoorMobility.nStaff" },
        { label: "Outdoor Mobility - Equipment", path: "activities.outdoorMobility.equipment" },
      ],
    },
  ],

  // ── Bed Rails Risk Assessment ───────────────────────────────────────────────
  "bed-rails-risk-assessment-form": [
    {
      title: "Administrative Details",
      fields: [
        { label: "Resident Name", path: "residentName" },
        { label: "Bedroom Number", path: "bedroomNumber" },
        { label: "Assessment Completed By", path: "completed_by" },
        { label: "Job Role", path: "jobRole" },
        { label: "Date of Assessment", path: "assessment_date", fmt: "date" },
      ],
    },
    {
      title: "Exclusion Criteria (Rails SHOULD NOT Be Used)",
      fields: [
        { label: "Resident with capacity refuses", path: "risks_identified.residentRefuses", fmt: "bool" },
        { label: "Risk of climbing over rails", path: "risks_identified.climbingRisk", fmt: "bool" },
        { label: "Risk of head/limb entrapment", path: "risks_identified.entrapmentRisk", fmt: "bool" },
        { label: "Abnormally small body size", path: "risks_identified.abnormalBodySize", fmt: "bool" },
        { label: "Used for restraint of violent movement", path: "risks_identified.restraintPurpose", fmt: "bool" },
        { label: "Used solely to prevent leaving bed", path: "risks_identified.freedomLimitation", fmt: "bool" },
        { label: "Any Exclusion Criteria Checked", path: "anyExclusionChecked", fmt: "bool" },
      ],
    },
    {
      title: "Benefits & Authorization",
      fields: [
        { label: "Resident with capacity requests", path: "benefits_identified.residentRequests", fmt: "bool" },
        { label: "MDT meeting understands risks", path: "benefits_identified.mdtMeetingCompleted", fmt: "bool" },
        { label: "Falling risk outweighs rail risk", path: "benefits_identified.riskOutweighsBenefit", fmt: "bool" },
        { label: "All other alternatives unsuccessful", path: "benefits_identified.alternativesExplored", fmt: "bool" },
        { label: "Best interest decision (if no capacity)", path: "benefits_identified.bestInterestDecision", fmt: "bool" },
        { label: "Has the reason for using bed rails been explained to the Resident?", path: "decision.reasonExplainedToResident" },
      ],
    },
    {
      title: "Equipment & Safety Checklist",
      fields: [
        { label: "Type of Bed", path: "decision.typeOfBed" },
        { label: "Type of Mattress", path: "decision.typeOfMattress" },
        { label: "Type of Bedrails", path: "decision.typeOfBedrails" },
        { label: "Gap between lower bar and top of mattress?", path: "decision.safetyChecklist.gapBetweenRailAndMattress" },
        { label: "Does mattress compress easily at edge?", path: "decision.safetyChecklist.mattressCompressesEasily" },
        { label: "Gap greater than 60mm between rail and headboard/wall?", path: "decision.safetyChecklist.gapMoreThan60mm" },
        { label: "Is the bed rail insecure?", path: "decision.safetyChecklist.bedRailInsecure" },
        { label: "Is the bed positioned against a wall?", path: "decision.safetyChecklist.bedAgainstWall" },
        { label: "Any Safety Check Failed", path: "decision.anySafetyCheckFailed", fmt: "bool" },
      ],
    },
    {
      title: "EXTENDED HEIGHT BED RAILS",
      fields: [
        { label: "Is the extended bed rail positioned as far to the head of the bed as possible with a gap of less than 60mm?", path: "decision.extendedHeightChecks.positionedCorrectly" },
        { label: "Is the extended height bed rail securely fastened to the integrated bed rail?", path: "decision.extendedHeightChecks.securelyFastened" },
        { label: "Are the correct bumpers installed?", path: "decision.extendedHeightChecks.correctBumpersInstalled" },
        { label: "Does the mattress come below the plimsoll line on the bumper?", path: "decision.extendedHeightChecks.mattressBelowPlimsollLine" },
        { label: "Have staff been trained how to attach and remove the extended bed rail?", path: "decision.extendedHeightChecks.staffTrained" },
        { label: "Has the bed and bed rails been checked for any signs of damage or wear and tear?", path: "decision.extendedHeightChecks.checkedForDamage" },
        { label: "Obtained consent from Resident or consulted NOK?", path: "decision.consentObtained" },
        { label: "Have you completed a care plan?", path: "decision.carePlanCompleted" },
      ],
    },
  ],

  // ── Resident Valuables & Personal Property ──────────────────────────────────
  "resident-valuables-form": [
    {
      title: "Resident Information",
      fields: [
        { label: "Resident Name", path: "assessment_data.residentName" },
        { label: "Bedroom Number", path: "assessment_data.bedroomNumber" },
        { label: "Assessment Date", path: "assessment_data.date", fmt: "date" },
        { label: "Completed By", path: "assessment_data.completedBy" },
        { label: "Witnessed By", path: "assessment_data.witnessedBy" },
      ],
    },
    {
      title: "Cash Held",
      fields: [
        { label: "£50 Notes", path: "assessment_data.n50" },
        { label: "£20 Notes", path: "assessment_data.n20" },
        { label: "£10 Notes", path: "assessment_data.n10" },
        { label: "£5 Notes", path: "assessment_data.n5" },
        { label: "£2 Coins", path: "assessment_data.n2" },
        { label: "£1 Coins", path: "assessment_data.n1" },
        { label: "50p Coins", path: "assessment_data.p50" },
        { label: "20p Coins", path: "assessment_data.p20" },
        { label: "10p Coins", path: "assessment_data.p10" },
        { label: "5p Coins", path: "assessment_data.p5" },
        { label: "2p Coins", path: "assessment_data.p2" },
        { label: "1p Coins", path: "assessment_data.p1" },
        { label: "Total (£)", path: "assessment_data.total" },
      ],
    },
    {
      title: "Valuables & Clothing",
      fields: [
        { label: "Valuables", path: "assessment_data.valuables", fmt: "valuables_list" },
        { label: "Clothing Items", path: "assessment_data.clothing", fmt: "clothing_list" },
      ],
    },
    {
      title: "Other Items",
      fields: [
        { label: "Other Items Log", path: "assessment_data.other", fmt: "other_items_list" },
      ],
    },
  ],

  "dependency-assessment": [
    {
      title: "Administrative Information",
      fields: [
        { label: "Resident Name", path: "residentName" },
        { label: "Bedroom", path: "bedroomNumber" },
        { label: "Date of Birth", path: "assessment_details.dateOfBirth", fmt: "date" },
        { label: "Assessment Date", path: "assessment_details.dateOfAssessment", fmt: "date" },
        { label: "Time", path: "assessment_details.time" },
      ],
    },
    {
      title: "Assessment Categories",
      fields: [
        { label: "Mobility", path: "assessment_details.mobility", fmt: "pts" },
        { label: "Dressing", path: "assessment_details.dressing", fmt: "pts" },
        { label: "Personal Hygiene", path: "assessment_details.personalHygiene", fmt: "pts" },
        { label: "Feeding", path: "assessment_details.feeding", fmt: "pts" },
        { label: "Eyesight", path: "assessment_details.eyesight", fmt: "pts" },
        { label: "Hearing", path: "assessment_details.hearing", fmt: "pts" },
        { label: "Pressure Sore Risk", path: "assessment_details.pressureSoreRisk", fmt: "pts" },
        { label: "Continence (Urine)", path: "assessment_details.continenceUrine", fmt: "pts" },
        { label: "Continence (Faeces)", path: "assessment_details.continenceFaeces", fmt: "pts" },
        { label: "Communication", path: "assessment_details.communication", fmt: "pts" },
        { label: "Social Dependency", path: "assessment_details.socialDependency", fmt: "pts" },
        { label: "Behaviour", path: "assessment_details.behaviour", fmt: "pts" },
      ],
    },
    {
      title: "Summary",
      fields: [
        { label: "Total Score", path: "total_score", fmt: "pts" },
        { label: "Dependency Level", path: "dependency_level" },
        { label: "Completed By", path: "completed_by" },
      ],
    },
  ],

  // ── Restraints Consent ────────────────────────────────────────────────────
  "v2-restraints-risk": [
    {
      title: "General Information",
      fields: [
        { label: "Person in Care", path: "assessment_data.residentName" },
        { label: "Care Home/Unit", path: "assessment_data.careHomeUnit" },
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
      ],
    },
    {
      title: "Consent Details",
      fields: [
        { label: "Restraints Considered", path: "assessment_data.selectedRestraints" },
        { label: "Consent Status", path: "assessment_data.consentType" },
        { label: "Consent Given", path: "consent_given", fmt: "bool" },
        { label: "Completed By", path: "completed_by" },
      ],
    },
    {
      title: "Consent - Able to Consent",
      fields: [
        { label: "Risk Of", path: "assessment_data.ableToConsent.riskOf" },
        { label: "Preference", path: "assessment_data.ableToConsent.preference" },
        { label: "Signature", path: "assessment_data.ableToConsent.personSignature" },
        { label: "Staff Signature", path: "assessment_data.ableToConsent.memberSignature" },
      ],
    },
    {
      title: "Consent - Unable to Consent (NOK Discussion)",
      fields: [
        { label: "Representative", path: "representative_name" },
        { label: "Issue", path: "assessment_data.discussionWithRelative.issueOf" },
        { label: "Preference", path: "assessment_data.discussionWithRelative.preference" },
        { label: "Signature", path: "assessment_data.discussionWithRelative.personSignature" },
        { label: "Staff Signature", path: "assessment_data.discussionWithRelative.memberSignature" },
      ],
    },
  ],

  // ── Fall Risk Assessment ──────────────────────────────────────────────────
  "fall-risk-assessment": [
    {
      title: "Summary",
      fields: [
        { label: "Total Score", path: "total_score", fmt: "pts" },
        { label: "Risk Level", path: "risk_level" },
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
        { label: "Completed By", path: "completed_by" },
      ],
    },
    {
      title: "Risk Factors",
      fields: [
        { label: "Age", path: "assessment_details.age" },
        { label: "Gender", path: "assessment_details.gender" },
        { label: "History of Falls", path: "assessment_details.historyOfFalls" },
        { label: "Mobility", path: "assessment_details.mobilityLevel" },
        { label: "Balance", path: "assessment_details.balance" },
        { label: "Vision", path: "assessment_details.visionProblems" },
        { label: "Cognition/Mental State", path: "assessment_details.mentalState" },
      ],
    },
  ],

  // ── Smoking Risk Assessment ───────────────────────────────────────────────
  "smoking-risk-assessment": [
    {
      title: "Summary",
      fields: [
        { label: "Assessment Date", path: "assessment_date", fmt: "date" },
        { label: "Completed By", path: "completed_by" },
        { label: "Role", path: "completed_by_role" },
      ],
    },
    {
      title: "Hazards & Controls",
      fields: [
        { label: "Materials Controlled", path: "materials_controlled", fmt: "bool" },
        { label: "Assistance Lighting", path: "assistance_lighting", fmt: "bool" },
        { label: "Supervision Required", path: "supervision_required", fmt: "bool" },
        { label: "Extinguished Correctly", path: "extinguished_correctly", fmt: "bool" },
        { label: "Oxygen in use", path: "oxygen_in_use_in_bedroom", fmt: "bool" },
      ],
    },
    {
      title: "Review Schedule",
      fields: [
        { label: "Monthly Review", path: "risk_review_monthly", fmt: "bool" },
        { label: "Review on Condition Change", path: "risk_review_on_condition_change", fmt: "bool" },
        { label: "Review on Incident", path: "risk_review_on_incident", fmt: "bool" },
      ],
    },
  ],
  "v2-capacity-consent": [
    {
      title: "Section A — Resident Details",
      fields: [
        { label: "Resident Name", path: "assessment_data.residentName" },
        { label: "NHS Number", path: "assessment_data.nhsNumber" },
        { label: "Date of Birth", path: "assessment_data.dateOfBirth", fmt: "date" },
        { label: "Date of Admission", path: "assessment_data.dateOfAdmission", fmt: "date" },
      ],
    },
    {
      title: "Section B — Details of Decision",
      fields: [
        { label: "Admission to care home", path: "assessment_data.admissionToCareHome", fmt: "bool" },
        { label: "Consent to care planning", path: "assessment_data.consentToCarePlanning", fmt: "bool" },
        { label: "Consent to medication", path: "assessment_data.consentToMedication", fmt: "bool" },
        { label: "Consent to sharing info", path: "assessment_data.consentToSharingInfo", fmt: "bool" },
        { label: "Other Decision", path: "assessment_data.otherDecision", fmt: "bool" },
        { label: "Other Details", path: "assessment_data.otherDecisionDetails" },
      ],
    },
    {
      title: "Section C — Stage 1 (Diagnostic Test)",
      fields: [
        { label: "Has Impairment", path: "assessment_data.hasImpairment" },
        { label: "Impairment Details", path: "assessment_data.impairmentDetails" },
      ],
    },
    {
      title: "Section D — Stage 2 (Functional Test)",
      fields: [
        { label: "Understand Info", path: "assessment_data.understandInformation" },
        { label: "Understand Notes", path: "assessment_data.understandNotes" },
        { label: "Retain Info", path: "assessment_data.retainInformation" },
        { label: "Retain Notes", path: "assessment_data.retainNotes" },
        { label: "Use/Weigh Info", path: "assessment_data.useWeighInformation" },
        { label: "Use/Weigh Notes", path: "assessment_data.useWeighNotes" },
        { label: "Communicate Decision", path: "assessment_data.communicateDecision" },
        { label: "Communicate Notes", path: "assessment_data.communicateNotes" },
      ],
    },
    {
      title: "Section E — Outcome",
      fields: [
        { label: "Has Capacity", path: "assessment_data.hasCapacity" },
      ],
    },
    {
      title: "Section G — Assessor Details",
      fields: [
        { label: "Name", path: "assessment_data.assessorName" },
        { label: "Role", path: "assessment_data.assessorRole" },
        { label: "Date", path: "assessment_data.assessmentDate", fmt: "date" },
      ],
    },
    {
      title: "Section H — Legal Representative",
      fields: [
        { label: "Type", path: "assessment_data.legalRepresentativeType" },
        { label: "Name", path: "assessment_data.representativeName" },
        { label: "Relationship", path: "assessment_data.relationshipToResident" },
        { label: "Contact Details", path: "assessment_data.contactDetails" },
      ],
    },
    {
      title: "Section I — Review",
      fields: [
        { label: "Next Review Date", path: "assessment_data.nextReviewDate", fmt: "date" },
        { label: "Reason for reassessment", path: "assessment_data.reasonForReassessment" },
      ],
    },
  ],
  "v2-night-obs-consent": [
    {
      title: "Section A — Resident Information",
      fields: [
        { label: "Full Name", path: "assessment_data.residentName" },
        { label: "Date of Birth", path: "assessment_data.dateOfBirth", fmt: "date" },
        { label: "NHS Number", path: "assessment_data.nhsNumber" },
        { label: "Room Number", path: "assessment_data.roomNumber" },
        { label: "Date of Admission", path: "assessment_data.dateOfAdmission", fmt: "date" },
      ],
    },
    {
      title: "Section C — Type of Observation Required",
      fields: [
        { label: "Observations Agreed", path: "assessment_data.observationTypes" },
        { label: "Other Details", path: "assessment_data.otherObservationType" },
      ],
    },
    {
      title: "Section D — Frequency of Observations",
      fields: [
        { label: "Frequency", path: "assessment_data.frequency" },
        { label: "Other Details", path: "assessment_data.otherFrequency" },
      ],
    },
    {
      title: "Section E & F — Consent & Capacity",
      fields: [
        { label: "Resident Consented", path: "assessment_data.residentConsented", fmt: "bool" },
        { label: "Resident Signature", path: "assessment_data.residentSignature" },
        { label: "Consent Date", path: "assessment_data.consentDate", fmt: "date" },
        { label: "Has Capacity", path: "assessment_data.hasCapacity" },
      ],
    },
    {
      title: "Section G — Legal Rep / Family Involvement",
      fields: [
        { label: "Consulted", path: "assessment_data.representativeConsulted" },
        { label: "Representative Name", path: "assessment_data.representativeName" },
        { label: "Relationship", path: "assessment_data.relationshipToResident" },
        { label: "Contact Details", path: "assessment_data.contactDetails" },
      ],
    },
    {
      title: "Section H — Risks Explained",
      fields: [
        { label: "Risks Explained", path: "assessment_data.risksExplained" },
        { label: "Other Risks", path: "assessment_data.otherRisk" },
      ],
    },
    {
      title: "Section I — Staff Declaration",
      fields: [
        { label: "Staff Name", path: "assessment_data.staffName" },
        { label: "Role / Designation", path: "assessment_data.staffRole" },
        { label: "Staff Signature", path: "assessment_data.staffSignature" },
        { label: "Declaration Date", path: "assessment_data.declarationDate", fmt: "date" },
      ],
    },
  ],
  "v2-general-risk": [
    {
      title: "Section A — Resident Information",
      fields: [
        { label: "Full Name", path: "assessment_data.fullName" },
        { label: "Date of Birth", path: "assessment_data.dateOfBirth" },
        { label: "Resident / NHS Number", path: "assessment_data.residentNumber" },
        { label: "Room Number", path: "assessment_data.roomNumber" },
        { label: "Date of Assessment", path: "assessment_data.dateOfAssessment" },
      ],
    },
    {
      title: "Section B — Assessment Details",
      fields: [
        { label: "Assessment Completed By", path: "assessment_data.completedBy" },
        { label: "Role", path: "assessment_data.role" },
        { label: "Reason for Assessment", path: "assessment_data.reasonForAssessment" },
        { label: "Other Reason", path: "assessment_data.otherReason" },
      ],
    },
    {
      title: "Section C — Areas of Risk Identified",
      fields: [
        { label: "Falls and mobility", path: "assessment_data.riskAreas.falls", fmt: "bool" },
        { label: "Skin integrity", path: "assessment_data.riskAreas.skin", fmt: "bool" },
        { label: "Nutrition and hydration", path: "assessment_data.riskAreas.nutrition", fmt: "bool" },
        { label: "Medication management", path: "assessment_data.riskAreas.medication", fmt: "bool" },
        { label: "Behavioural or cognitive", path: "assessment_data.riskAreas.behavioural", fmt: "bool" },
        { label: "Infection control", path: "assessment_data.riskAreas.infection", fmt: "bool" },
        { label: "Manual handling needs", path: "assessment_data.riskAreas.manualHandling", fmt: "bool" },
        { label: "Environmental hazards", path: "assessment_data.riskAreas.environmental", fmt: "bool" },
        { label: "Wandering or absconding", path: "assessment_data.riskAreas.wandering", fmt: "bool" },
        { label: "Other", path: "assessment_data.riskAreas.other" },
        { label: "Other Risk Details", path: "assessment_data.riskAreas.otherText" },
      ],
    },
    {
      title: "Section D — Detailed Assessment",
      fields: [
        { label: "Mental health", path: "assessment_data.detailedAssessment.mentalHealth" },
        { label: "Communication", path: "assessment_data.detailedAssessment.communication" },
        { label: "Relationships", path: "assessment_data.detailedAssessment.relationships" },
        { label: "Physical health", path: "assessment_data.detailedAssessment.physicalHealth" },
        { label: "Support needs", path: "assessment_data.detailedAssessment.supportNeeds" },
      ],
    },
    {
      title: "Section E — Risk Level",
      fields: [
        { label: "Risk Level", path: "assessment_data.riskLevel" },
        { label: "Action Plan", path: "assessment_data.actionPlan" },
      ],
    },
  ],
};

// ─── Compact Schema Renderer ──────────────────────────────────────────────────

function SchemaViewer({ data, schema }: { data: any; schema: SectionDef[] }) {
  return (
    <div className="columns-1 lg:columns-2 gap-8 w-full pb-4">
      {schema.map((section) => (
        <div key={section.title} className="break-inside-avoid mb-8 space-y-1">
          {/* Section heading — matches the form dialog section title exactly */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">
            {section.title}
          </div>
          {/* Fields — compact label : value rows, always shown */}
          <div className="space-y-0.5">
            {section.fields.map((f, idx) => {
              const rawVal = getPath(data, f.path);
              const display = formatValue(rawVal, f.fmt);
              return (
                <div
                  key={`${section.title}-${f.path}-${f.label}-${idx}`}
                  className="flex items-baseline gap-2 py-0.5"
                >
                  <span className="text-[11px] text-muted-foreground min-w-[160px] shrink-0 leading-relaxed">
                    {f.label}
                  </span>
                  <span className={`text-[12px] leading-relaxed break-words whitespace-pre-wrap ${display === "—" ? "text-muted-foreground/50 italic" : "text-foreground"}`}>
                    {display}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── Generic Fallback Renderer ─────────────────────────────────────────────────
// Used for form types not yet in FORM_SCHEMAS

const SKIP_KEYS = new Set([
  "id", "_id", "resident_id", "residentId", "organization_id", "organizationId",
  "team_id", "teamId", "user_id", "userId", "created_by", "createdBy",
  "created_at", "createdAt", "updated_at", "updatedAt", "updated_by", "updatedBy",
  "previous_version_id", "previousVersionId", "previous_care_plan_id",
  "status", "archived_at", "version", "is_archived", "isArchived",
  "pdf_file_id", "pdfFileId", "pdf_generated", "saved_as_draft",
  "__v", "_rev",
]);

function isEmptyValue(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "boolean") return false;
  if (typeof v === "number") return false;
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmptyValue);
  if (typeof v === "object") {
    return Object.entries(v).filter(([k]) => !SKIP_KEYS.has(k)).every(([, val]) => isEmptyValue(val));
  }
  return false;
}

function GenericViewer({ data }: { data: any }) {
  return (
    <div className="columns-1 lg:columns-2 gap-8 w-full pb-4">
      {Object.entries(data).map(([key, value]) => {
        if (key.startsWith("_") || SKIP_KEYS.has(key) || isEmptyValue(value)) return null;
        const label = key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
        const display = formatValue(value);
        if (display === "—") return null;
        if (typeof value === "object" && value !== null) {
          return (
            <div key={key} className="break-inside-avoid mb-8">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">
                {label}
              </div>
              <div className="space-y-0.5 pl-1">
                {Object.entries(value as any).map(([k, v]) => {
                  if (SKIP_KEYS.has(k) || isEmptyValue(v)) return null;
                  const lbl = k.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
                  const disp = formatValue(v);
                  if (disp === "—") return null;
                  return (
                    <div key={k} className="flex items-baseline gap-2 py-0.5">
                      <span className="text-[11px] text-muted-foreground min-w-[160px] shrink-0">{lbl}</span>
                      <span className="text-[12px] text-foreground break-words whitespace-pre-wrap">{disp}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div key={key} className="break-inside-avoid mb-8">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">
              {label}
            </div>
            <div className="text-[12px] text-foreground break-words whitespace-pre-wrap pl-1 mt-1">{display}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export interface RiskAssessmentViewerProps {
  assessment: {
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category?: string;
  };
}

const TABLE_MAP: Record<string, string> = {
  "preAdmission-form": "pre_admission_care_files",
  "infection-prevention": "infection_prevention_assessments",
  "blader-bowel-form": "bladder_bowel_assessments",
  "moving-handling-form": "moving_handling_assessments",
  "bedrail-consent-form": "bedrail_consents",
  "bed-rails-risk-assessment-form": "bedrails_risk_assessments",
  "long-term-fall-risk-form": "long_term_falls_risk_assessments",
  "admission-form": "admission_assessments",
  "photography-consent": "photography_consents",
  "dnacpr": "dnacprs",
  "peep": "peeps",
  "dependency-assessment": "dependency_assessments",
  "timl": "timl_assessments",

  "resident-valuables-form": "resident_valuables_assessments",
  "resident-handling-profile-form": "handling_profiles",
  "pain-assessment-form": "pain_assessments",
  "nutritional-assessment-form": "nutritional_assessments",
  "oral-assessment-form": "oral_assessments",
  "diet-notification-form": "diet_notifications",
  "choking-risk-assessment-form": "choking_risk_assessments",
  "cornell-depression-scale-form": "cornell_depression_scales",
  "best-interest-decision-form": "best_interest_decisions",
  "care-plan-form": "care_plan_assessments",
  "braden-risk-assessment-form": "braden_risk_assessments",
  "v2-restraints-risk": "restraints_consents",
  "fall-risk-assessment": "fall_risk_assessments",
  "smoking-risk-assessment": "smoking_risk_assessments",
  "v2-specimen-log": "specimen_records",
  "v2-capacity-consent": "capacity_consents",
  "v2-night-obs-consent": "night_observation_consents",
  "v2-general-risk": "general_risk_assessments",
};

export function RiskAssessmentViewer({ assessment }: RiskAssessmentViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!assessment.formId) return;
      try {
        const table = TABLE_MAP[assessment.formKey];
        if (table) {
          const { data: row } = await supabase
            .from(table)
            .select("*")
            .eq("id", assessment.formId)
            .single();

          if (!row) {
            setData(null);
            return;
          }

          // Enrich with resident information for viewer (for schemas that expect residentName/bedroomNumber)
          let enriched: any = row;
          const residentId = row.resident_id || row.residentId;

          if (residentId) {
            const { data: resident } = await supabase
              .from("residents")
              .select("first_name,last_name,room_number")
              .eq("id", residentId)
              .single();

            if (resident) {
              const fullName = `${resident.first_name || ""} ${resident.last_name || ""}`.trim();
              enriched = {
                ...row,
                residentName: row.residentName || fullName,
                bedroomNumber:
                  row.bedroomNumber ||
                  row.bedroom_number ||
                  resident.room_number ||
                  "",
              };
            }
          }

          setData(enriched);
        }
      } catch { /**/ } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [assessment.formId, assessment.formKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No data available.</div>;
  }

  const schema = FORM_SCHEMAS[assessment.formKey];

  return schema
    ? <SchemaViewer data={data} schema={schema} />
    : <GenericViewer data={data} />;
}

// ─── Default Export: Dialog Wrapper ───────────────────────────────────────────
// Used by pages that import this as a popup dialog
// e.g. all-risk-assessments/page.tsx and archived-risk-assessments/page.tsx

interface RiskAssessmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: RiskAssessmentViewerProps["assessment"];
}

export default function RiskAssessmentViewDialog({
  open,
  onOpenChange,
  assessment,
}: RiskAssessmentViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{assessment.name}</DialogTitle>
        </DialogHeader>
        <RiskAssessmentViewer assessment={assessment} />
      </DialogContent>
    </Dialog>
  );
}

