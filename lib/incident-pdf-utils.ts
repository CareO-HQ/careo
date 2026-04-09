import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// --- Label maps ---
const INCIDENT_TYPE_LABELS: Record<string, string> = {
  FallWitnessed: "Fall (witnessed)",
  FallUnwitnessed: "Fall (unwitnessed)",
  PressureUlcer: "Pressure ulcer",
  Wound: "Wound",
  Illness: "Illness",
  NearMiss: "Near miss",
  ExpectedDeath: "Expected death",
  UnexpectedDeath: "Unexpected death",
  StaffingLevels: "Staffing levels",
  Equipment: "Equipment",
  StaffAccident: "Staff accident",
  AbuseOfStaff: "Abuse of staff",
  Behavioural: "Behavioural issues",
  Safeguarding: "Safeguarding involving resident",
  Medication: "Medication incident",
  AbsentWithoutLeave: "Absent without leave",
  WeightLoss: "Weight loss",
  Choking: "Choking",
  Bruise: "Bruise",
  ResidentAltercation: "Resident-on-resident altercation",
  Infection: "Infection",
  Covid: "COVID",
  FireSafety: "Fire & safety",
  SelfHarm: "Self-harm",
  PSNI: "PSNI (police) involvement",
  Theft: "Theft",
  MissingResident: "Missing resident",
  Other: "Other",
};

const TREATMENT_LABELS: Record<string, string> = {
  FirstAid: "First aid",
  GP: "Referred to GP",
  Paramedic: "Paramedic attended",
  ED: "Taken to ED",
  HospitalAdmit: "Admitted to hospital",
  "999": "999 ambulance",
};

const NURSE_ACTION_LABELS: Record<string, string> = {
  OnCallManager: "On-call manager informed",
  DutySocialWorker: "Duty social worker informed",
  CarePlanUpdated: "Care plan updated",
  BodyMapCompleted: "Body map completed",
  TrustIncidentReport: "Trust incident report emailed to home manager",
  RiskAssessment: "Risk assessment completed",
  ObservationsCommenced: "Observations commenced",
  WoundAssessment: "Wound assessment completed",
  SafeguardingForms: "Safeguarding forms prepared for home manager",
  KeyWorkerContacted: "Key worker contacted",
};

const INCIDENT_LEVEL_LABELS: Record<string, string> = {
  death: "Death",
  permanent_harm: "Permanent Harm",
  minor_injury: "Minor Injury",
  no_harm: "No Harm",
  near_miss: "Near Miss",
};

// --- Helpers ---
function fmtDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return format(new Date(val), "dd/MM/yyyy");
  } catch {
    return val;
  }
}

function fmtDateTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return format(new Date(val), "dd/MM/yyyy HH:mm");
  } catch {
    return val;
  }
}

interface IncidentReportData {
  date?: string | null;
  time?: string | null;
  home_name?: string | null;
  unit?: string | null;
  injured_person_first_name?: string | null;
  injured_person_surname?: string | null;
  injured_person_dob?: string | null;
  resident_internal_id?: string | null;
  date_of_admission?: string | null;
  health_care_number?: string | null;
  injured_person_status?: string[] | null;
  contractor_employer?: string | null;
  incident_types?: string[] | null;
  type_other_details?: string | null;
  anticoagulant_medication?: string | null;
  fall_pathway?: string | null;
  detailed_description?: string | null;
  incident_level?: string | null;
  injury_description?: string | null;
  body_part_injured?: string | null;
  treatment_types?: string[] | null;
  treatment_details?: string | null;
  vital_signs?: string | null;
  treatment_refused?: boolean | null;
  witness1_name?: string | null;
  witness1_contact?: string | null;
  witness2_name?: string | null;
  witness2_contact?: string | null;
  nurse_actions?: string[] | null;
  further_actions_advised?: string | null;
  prevention_measures?: string | null;
  home_manager_informed_by?: string | null;
  home_manager_informed_date_time?: string | null;
  on_call_manager_name?: string | null;
  on_call_contacted_date_time?: string | null;
  nok_informed_who?: string | null;
  nok_informed_by?: string | null;
  nok_informed_date_time?: string | null;
  trust_care_manager_name?: string | null;
  trust_care_manager_email?: string | null;
  trust_key_worker_name?: string | null;
  trust_key_worker_email?: string | null;
  completed_by_full_name?: string | null;
  completed_by_job_title?: string | null;
  completed_by_signature?: string | null;
  date_completed?: string | null;
}

interface GenerateIncidentPDFOptions {
  incident: IncidentReportData;
  orgLogoUrl?: string;
}

export const generateIncidentReportPDF = async ({
  incident,
  orgLogoUrl,
}: GenerateIncidentPDFOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Image loader
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  // --- Header ---
  const headerHeight = 22;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Green accent line
  doc.setFillColor(34, 197, 94);
  doc.rect(0, headerHeight - 2, pageWidth, 1, "F");

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("INCIDENT REPORT", margin, 14);

  // Org logo
  if (orgLogoUrl) {
    try {
      const logoImg = await loadImage(orgLogoUrl);
      const canvas = document.createElement("canvas");
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(logoImg, 0, 0);
      const logoDataUrl = canvas.toDataURL("image/png");
      const logoSize = 14;
      const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
      const logoW = logoSize * aspect;
      doc.addImage(
        logoDataUrl,
        "PNG",
        pageWidth - margin - logoW,
        (headerHeight - logoSize) / 2,
        logoW,
        logoSize
      );
    } catch {
      // ignore
    }
  }

  let yPos = 28;

  const renderValue = (value: string | null | undefined): string =>
    value && value.trim() ? value : "—";

  const yesNo = (value: boolean): string => (value ? "Yes" : "No");

  const yesNoFromArray = (value: string[] | null | undefined, key: string): string =>
    yesNo((value || []).includes(key));

  const normalizeLabelValue = (value: string | null | undefined): string => {
    if (!value) return "—";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const addSectionTable = (
    title: string,
    rows: Array<[string, string]>,
    valueHeader = "Value"
  ) => {
    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [[title, valueHeader]],
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [31, 41, 55],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8, textColor: [17, 24, 39] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 75 },
        1: { cellWidth: contentWidth - 75 },
      },
      styles: { cellPadding: 2.5, overflow: "linebreak" },
      tableLineColor: [229, 231, 235],
      tableLineWidth: 0.2,
    });
    const tableDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    yPos = (tableDoc.lastAutoTable?.finalY || yPos) + 4;
  };

  const checkPageBreak = (needed: number) => {
    if (yPos + needed > 275) {
      doc.addPage();
      yPos = 20;
    }
  };

  const i = incident;
  const hasFall = (i.incident_types || []).some(
    (t) => t === "FallWitnessed" || t === "FallUnwitnessed"
  );
  const hasWitnesses = !!(i.witness1_name || i.witness2_name);
  const isHomeManagerInformed = !!(
    i.home_manager_informed_by || i.home_manager_informed_date_time
  );
  const isOnCallContacted = !!(i.on_call_manager_name || i.on_call_contacted_date_time);
  const isNokInformed = !!(
    i.nok_informed_who || i.nok_informed_by || i.nok_informed_date_time
  );
  const hasTrustRecipients = !!(
    i.trust_care_manager_name ||
    i.trust_care_manager_email ||
    i.trust_key_worker_name ||
    i.trust_key_worker_email
  );

  addSectionTable("1. Incident Details", [
    ["Date", fmtDate(i.date)],
    ["Time", renderValue(i.time)],
    ["Home Name", renderValue(i.home_name)],
    ["Unit", renderValue(i.unit)],
  ]);

  addSectionTable("2. Injured Person Details", [
    ["First Name", renderValue(i.injured_person_first_name)],
    ["Surname", renderValue(i.injured_person_surname)],
    ["Date of Birth", fmtDate(i.injured_person_dob)],
    ["Resident ID", renderValue(i.resident_internal_id)],
    ["Date of Admission", fmtDate(i.date_of_admission)],
    ["Health and Care Number", renderValue(i.health_care_number)],
  ]);

  addSectionTable("3. Status of Injured Person", [
    ["Resident in Care", yesNoFromArray(i.injured_person_status, "Resident")],
    ["Relative", yesNoFromArray(i.injured_person_status, "Relative")],
    ["Staff Member", yesNoFromArray(i.injured_person_status, "Staff")],
    ["Agency Staff", yesNoFromArray(i.injured_person_status, "AgencyStaff")],
    ["Visitor", yesNoFromArray(i.injured_person_status, "Visitor")],
    ["Contractor", yesNoFromArray(i.injured_person_status, "Contractor")],
    ["Contractor Employer", renderValue(i.contractor_employer)],
  ], "Yes/No");

  addSectionTable("4. Type of Incident", [
    ...Object.entries(INCIDENT_TYPE_LABELS).map(([key, label]) => [
      label,
      yesNoFromArray(i.incident_types, key),
    ] as [string, string]),
    ["Other Details", renderValue(i.type_other_details)],
  ], "Yes/No");

  addSectionTable("5-6. Fall-Specific Questions", [
    ["Fall Incident Selected", yesNo(hasFall)],
    ...(hasFall
      ? [
          ["On Anticoagulant Medication?", normalizeLabelValue(i.anticoagulant_medication)],
          ["Falls Pathway", normalizeLabelValue(i.fall_pathway)],
        ]
      : []),
  ], "Yes/No");

  addSectionTable("7. Detailed Description", [
    ["Description", renderValue(i.detailed_description)],
  ]);

  addSectionTable("8. Incident Level", [
    ["Incident Level", renderValue(INCIDENT_LEVEL_LABELS[i.incident_level || ""] || i.incident_level)],
  ]);

  addSectionTable("9. Details of the Injury", [
    ["Injury Description", renderValue(i.injury_description)],
    ["Body Part Injured", renderValue(i.body_part_injured)],
  ]);

  addSectionTable("10-11. Treatment", [
    ...Object.entries(TREATMENT_LABELS).map(([key, label]) => [
      `${label} (checkbox)`,
      yesNoFromArray(i.treatment_types, key),
    ] as [string, string]),
    ["Treatment Details", renderValue(i.treatment_details)],
    ["Vital Signs", renderValue(i.vital_signs)],
    ["Treatment Refused (checkbox)", yesNo(!!i.treatment_refused)],
  ]);

  addSectionTable("12. Witnesses", [
    ["Witnesses Present", yesNo(hasWitnesses)],
    ...(hasWitnesses
      ? [
          ["Witness 1 Name", renderValue(i.witness1_name)],
          ["Witness 1 Contact", renderValue(i.witness1_contact)],
          ["Witness 2 Name", renderValue(i.witness2_name)],
          ["Witness 2 Contact", renderValue(i.witness2_contact)],
        ]
      : []),
  ], "Yes/No");

  addSectionTable("13. Further Actions by Nurse", [
    ...Object.entries(NURSE_ACTION_LABELS).map(([key, label]) => [
      label,
      yesNoFromArray(i.nurse_actions, key),
    ] as [string, string]),
  ], "Yes/No");

  addSectionTable("14-15. Further Actions & Prevention", [
    ["Further Actions Advised", renderValue(i.further_actions_advised)],
    ["Prevention Measures", renderValue(i.prevention_measures)],
  ]);

  addSectionTable("16-17. Notifications", [
    ["Home Manager Informed", yesNo(isHomeManagerInformed)],
    ...(isHomeManagerInformed
      ? [
          ["Home Manager Informed By", renderValue(i.home_manager_informed_by)],
          ["Home Manager Date & Time", fmtDateTime(i.home_manager_informed_date_time)],
        ]
      : []),
    ["Out of Hours On-Call Contacted", yesNo(isOnCallContacted)],
    ...(isOnCallContacted
      ? [
          ["On-Call Manager", renderValue(i.on_call_manager_name)],
          ["On-Call Contacted Date & Time", fmtDateTime(i.on_call_contacted_date_time)],
        ]
      : []),
  ], "Yes/No");

  addSectionTable("18. Next of Kin Informed", [
    ["Next of Kin Informed", yesNo(isNokInformed)],
    ...(isNokInformed
      ? [
          ["NOK Name", renderValue(i.nok_informed_who)],
          ["Informed By", renderValue(i.nok_informed_by)],
          ["Date & Time", fmtDateTime(i.nok_informed_date_time)],
        ]
      : []),
  ], "Yes/No");

  addSectionTable("19. Trust Incident Form Recipients", [
    ["Trust Recipients Informed", yesNo(hasTrustRecipients)],
    ...(hasTrustRecipients
      ? [
          ["Care Manager", renderValue(i.trust_care_manager_name)],
          ["Care Manager Email", renderValue(i.trust_care_manager_email)],
          ["Key Worker", renderValue(i.trust_key_worker_name)],
          ["Key Worker Email", renderValue(i.trust_key_worker_email)],
        ]
      : []),
  ], "Yes/No");

  addSectionTable("20. Completed By", [
    ["Full Name", renderValue(i.completed_by_full_name)],
    ["Job Title", renderValue(i.completed_by_job_title)],
    ["Signature", renderValue(i.completed_by_signature)],
    ["Date Completed", fmtDate(i.date_completed)],
  ]);

  // --- Footer ---
  checkPageBreak(12);
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    margin,
    yPos
  );

  // --- Build filename ---
  const name = [i.injured_person_first_name, i.injured_person_surname]
    .filter(Boolean)
    .join("-")
    .replace(/\s+/g, "-") || "incident";
  const dateStr = i.date
    ? format(new Date(i.date), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  doc.save(`incident-report-${name}-${dateStr}.pdf`);
};
