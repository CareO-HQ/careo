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

const PERSON_STATUS_LABELS: Record<string, string> = {
  Resident: "Resident in Care",
  Relative: "Relative",
  Staff: "Staff Member",
  AgencyStaff: "Agency Staff",
  Visitor: "Visitor",
  Contractor: "Contractor",
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

function capitalize(s: string): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Main Export ---
interface GenerateIncidentPDFOptions {
  incident: any;
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
  const col2 = margin + contentWidth / 2;
  const colWidth = contentWidth / 2 - 5;

  // --- Helpers ---
  const checkPageBreak = (needed: number) => {
    if (yPos + needed > 275) {
      doc.addPage();
      yPos = 20;
    }
  };

  const addSectionTitle = (title: string) => {
    checkPageBreak(14);
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin, yPos + 8);
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin + 4, yPos + 5.5);
    doc.setTextColor(0, 0, 0);
    yPos += 12;
  };

  const addField = (
    label: string,
    value: string | undefined | null,
    x: number,
    y: number,
    width: number
  ): number => {
    if (!value || value === "—") return y;
    checkPageBreak(14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    const lines = doc.splitTextToSize(value, width);
    doc.text(lines, x, y + 4);
    return y + 4 + lines.length * 4;
  };

  const addBadgeRow = (
    label: string,
    items: string[]
  ) => {
    if (!items || items.length === 0) return;
    checkPageBreak(12);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), margin, yPos);
    yPos += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    const text = items.join(", ");
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 4 + 2;
  };

  const addTextBlock = (label: string, value: string | null | undefined) => {
    if (!value) return;
    checkPageBreak(20);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), margin, yPos);
    yPos += 4;

    doc.setFillColor(249, 250, 251);
    const lines = doc.splitTextToSize(value, contentWidth - 6);
    const blockH = lines.length * 4 + 6;
    checkPageBreak(blockH + 2);
    doc.rect(margin, yPos - 2, contentWidth, blockH, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(17, 24, 39);
    doc.text(lines, margin + 3, yPos + 2);
    yPos += blockH + 2;
  };

  const i = incident;
  const hasFall = i.incident_types?.some(
    (t: string) => t === "FallWitnessed" || t === "FallUnwitnessed"
  );

  // --- Section 1: Incident Details ---
  addSectionTitle("Incident Details");
  let y1 = addField("Date", fmtDate(i.date), margin, yPos, colWidth);
  let y2 = addField("Time", i.time, col2, yPos, colWidth);
  yPos = Math.max(y1, y2) + 2;
  y1 = addField("Home Name", i.home_name, margin, yPos, colWidth);
  y2 = addField("Unit", i.unit, col2, yPos, colWidth);
  yPos = Math.max(y1, y2) + 4;

  // --- Section 2: Injured Person ---
  addSectionTitle("Injured Person Details");
  y1 = addField("First Name", i.injured_person_first_name, margin, yPos, colWidth);
  y2 = addField("Surname", i.injured_person_surname, col2, yPos, colWidth);
  yPos = Math.max(y1, y2) + 2;
  y1 = addField("Date of Birth", fmtDate(i.injured_person_dob), margin, yPos, colWidth);
  y2 = addField("Resident ID", i.resident_internal_id, col2, yPos, colWidth);
  yPos = Math.max(y1, y2) + 2;
  y1 = addField("Date of Admission", fmtDate(i.date_of_admission), margin, yPos, colWidth);
  y2 = addField("Health Care Number", i.health_care_number, col2, yPos, colWidth);
  yPos = Math.max(y1, y2) + 4;

  // --- Section 3: Status ---
  addSectionTitle("Status of Injured Person");
  addBadgeRow(
    "Status",
    (i.injured_person_status || []).map(
      (s: string) => PERSON_STATUS_LABELS[s] || s
    )
  );
  if (i.contractor_employer) {
    yPos = addField("Contractor/Employer", i.contractor_employer, margin, yPos, contentWidth) + 2;
  }
  yPos += 2;

  // --- Section 4: Type of Incident ---
  addSectionTitle("Type of Incident");
  addBadgeRow(
    "Types",
    (i.incident_types || []).map(
      (t: string) => INCIDENT_TYPE_LABELS[t] || t
    )
  );
  if (i.type_other_details) {
    yPos = addField("Other Details", i.type_other_details, margin, yPos, contentWidth) + 2;
  }
  yPos += 2;

  // --- Section 5-6: Fall Questions ---
  if (hasFall) {
    addSectionTitle("Fall-Specific Questions");
    y1 = addField(
      "On Anticoagulant Medication?",
      capitalize(i.anticoagulant_medication),
      margin,
      yPos,
      colWidth
    );
    y2 = addField("Falls Pathway", capitalize(i.fall_pathway), col2, yPos, colWidth);
    yPos = Math.max(y1, y2) + 4;
  }

  // --- Section 7: Description ---
  addSectionTitle("Detailed Description");
  addTextBlock("Description", i.detailed_description);
  yPos += 2;

  // --- Section 8: Incident Level ---
  addSectionTitle("Incident Level");
  const levelLabel = INCIDENT_LEVEL_LABELS[i.incident_level] || i.incident_level;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(levelLabel, margin, yPos);
  yPos += 8;

  // --- Section 9: Injury Details ---
  if (i.injury_description || i.body_part_injured) {
    addSectionTitle("Details of Injury");
    y1 = addField("Injury Description", i.injury_description, margin, yPos, colWidth);
    y2 = addField("Body Part Injured", i.body_part_injured, col2, yPos, colWidth);
    yPos = Math.max(y1, y2) + 4;
  }

  // --- Section 10-11: Treatment ---
  if (
    (i.treatment_types && i.treatment_types.length > 0) ||
    i.treatment_details ||
    i.vital_signs
  ) {
    addSectionTitle("Treatment");
    addBadgeRow(
      "Treatment Required",
      (i.treatment_types || []).map(
        (t: string) => TREATMENT_LABELS[t] || t
      )
    );
    if (i.treatment_details) {
      yPos = addField("Treatment Details", i.treatment_details, margin, yPos, contentWidth) + 2;
    }
    if (i.vital_signs) {
      yPos = addField("Vital Signs", i.vital_signs, margin, yPos, contentWidth) + 2;
    }
    if (i.treatment_refused) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("TREATMENT REFUSED", margin, yPos);
      yPos += 6;
    }
    yPos += 2;
  }

  // --- Section 12: Witnesses ---
  if (i.witness1_name || i.witness2_name) {
    addSectionTitle("Witnesses");
    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [["Witness", "Name", "Contact"]],
      body: [
        ...(i.witness1_name
          ? [["Witness 1", i.witness1_name || "—", i.witness1_contact || "—"]]
          : []),
        ...(i.witness2_name
          ? [["Witness 2", i.witness2_name || "—", i.witness2_contact || "—"]]
          : []),
      ],
      theme: "grid",
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [31, 41, 55],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 2 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // --- Section 13: Nurse Actions ---
  if (i.nurse_actions && i.nurse_actions.length > 0) {
    addSectionTitle("Further Actions by Nurse");
    addBadgeRow(
      "Actions Taken",
      i.nurse_actions.map((a: string) => NURSE_ACTION_LABELS[a] || a)
    );
    yPos += 2;
  }

  // --- Section 14-15: Further Actions & Prevention ---
  if (i.further_actions_advised || i.prevention_measures) {
    addSectionTitle("Further Actions & Prevention");
    if (i.further_actions_advised) {
      addTextBlock("Further Actions Advised", i.further_actions_advised);
    }
    if (i.prevention_measures) {
      addTextBlock("Prevention Measures", i.prevention_measures);
    }
    yPos += 2;
  }

  // --- Section 16-17: Notifications ---
  if (i.home_manager_informed_by || i.on_call_manager_name) {
    addSectionTitle("Notifications");
    y1 = addField("Home Manager Informed By", i.home_manager_informed_by, margin, yPos, colWidth);
    y2 = addField(
      "Date & Time",
      fmtDateTime(i.home_manager_informed_date_time),
      col2,
      yPos,
      colWidth
    );
    yPos = Math.max(y1, y2) + 2;
    y1 = addField("On-Call Manager", i.on_call_manager_name, margin, yPos, colWidth);
    y2 = addField(
      "Date & Time",
      fmtDateTime(i.on_call_contacted_date_time),
      col2,
      yPos,
      colWidth
    );
    yPos = Math.max(y1, y2) + 4;
  }

  // --- Section 18: NOK ---
  if (i.nok_informed_who || i.nok_informed_by) {
    addSectionTitle("Next of Kin Informed");
    y1 = addField("NOK Name", i.nok_informed_who, margin, yPos, colWidth);
    y2 = addField("Informed By", i.nok_informed_by, col2, yPos, colWidth);
    yPos = Math.max(y1, y2) + 2;
    yPos = addField("Date & Time", fmtDateTime(i.nok_informed_date_time), margin, yPos, colWidth) + 4;
  }

  // --- Section 19: Trust Recipients ---
  if (i.trust_care_manager_name || i.trust_key_worker_name) {
    addSectionTitle("Trust Incident Form Recipients");
    y1 = addField("Care Manager", i.trust_care_manager_name, margin, yPos, colWidth);
    y2 = addField("Email", i.trust_care_manager_email, col2, yPos, colWidth);
    yPos = Math.max(y1, y2) + 2;
    y1 = addField("Key Worker", i.trust_key_worker_name, margin, yPos, colWidth);
    y2 = addField("Email", i.trust_key_worker_email, col2, yPos, colWidth);
    yPos = Math.max(y1, y2) + 4;
  }

  // --- Section 20: Completion ---
  addSectionTitle("Completed By");
  y1 = addField("Full Name", i.completed_by_full_name, margin, yPos, colWidth);
  y2 = addField("Job Title", i.completed_by_job_title, col2, yPos, colWidth);
  yPos = Math.max(y1, y2) + 2;
  y1 = addField("Signature", i.completed_by_signature, margin, yPos, colWidth);
  y2 = addField("Date Completed", fmtDate(i.date_completed), col2, yPos, colWidth);
  yPos = Math.max(y1, y2) + 6;

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
