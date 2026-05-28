import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { supabase } from "@/lib/supabase";
import { UK_TIMEZONE } from "@/lib/date-utils";
import { formatRoleName } from "@/lib/utils";
import {
  DEFAULT_FALLS_COLUMN_QUESTIONS,
  formatAuditMonthLabel,
} from "@/lib/falls-register-utils";
import {
  formatIncidentDate,
  formatYesNoDisplay,
  resolveIncidentAuditTableData,
} from "@/lib/incident-audit-utils";
import {
  formatWoundsAnalysisDate,
  resolveWoundsAnalysisTableData,
} from "@/lib/wounds-analysis-utils";
import {
  formatRegistrationDate,
  resolveRegistrationTrackerData,
} from "@/lib/registration-tracker-utils";

export interface GenerateManagerAuditPDFOptions {
  recordId: string;
  recordData?: any; // optional, if pre-loaded
}

// Helper to normalize status values
function normalizeAnswerValue(raw: string | undefined | null): string {
  if (!raw) return "not-reviewed";
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "not-reviewed") return "not-reviewed";
  if (v === "yes" || v === "compliant" || v === "checked") return "compliant";
  if (v === "action-required") return "action-required";
  if (v === "no" || v === "non-compliant") return "non-compliant";
  if (v === "n/a" || v === "not-applicable" || v === "not applicable")
    return "not-applicable";
  return "not-reviewed";
}

// Convert normalized status to label
function rowStatusLabel(status: string | undefined | null): string {
  const normalized = normalizeAnswerValue(status);
  switch (normalized) {
    case "compliant": return "Compliant";
    case "action-required": return "Action Required";
    case "non-compliant": return "Non-Compliant";
    case "not-applicable": return "N/A";
    default: return "Not reviewed";
  }
}

// Get text color for status value
const getStatusColor = (status: string | undefined | null, qType?: string): [number, number, number] => {
  if (qType === "text" || qType === "date") {
    return [31, 41, 55]; // Dark Gray/Black for text/date answers
  }
  if (qType === "risk") {
    const s = (status || "").trim().toLowerCase();
    if (s === "low") return [16, 124, 65]; // Green
    if (s === "medium") return [217, 119, 6]; // Amber
    if (s === "high") return [220, 38, 38]; // Red
    return [31, 41, 55];
  }
  const norm = normalizeAnswerValue(status);
  if (norm === "compliant") return [16, 124, 65]; // Green
  if (norm === "non-compliant") return [220, 38, 38]; // Red
  if (norm === "action-required") return [217, 119, 6]; // Amber
  return [107, 114, 128]; // Muted Gray
};

// Get user-friendly display label based on question type
function getDisplayStatus(val: string | undefined | null, qType?: string): string {
  if (!val) return "Not reviewed";
  const valLower = val.trim().toLowerCase();
  if (valLower === "" || valLower === "not-reviewed") return "Not reviewed";
  
  if (qType === "yesno") {
    if (valLower === "yes" || valLower === "compliant" || valLower === "checked") return "Yes";
    if (valLower === "no" || valLower === "non-compliant") return "No";
  }
  
  if (qType === "text" || qType === "date" || qType === "risk") {
    if (qType === "risk") {
      return val.charAt(0).toUpperCase() + val.slice(1);
    }
    if (val.trim().startsWith("[") && val.trim().endsWith("]")) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        }
      } catch {
        // Fallback
      }
    }
    return val;
  }
  
  return rowStatusLabel(val);
}

export const generateManagerAuditPDF = async ({
  recordId,
  recordData
}: GenerateManagerAuditPDFOptions) => {
  let record = recordData;

  // 1. Fetch record if not provided
  if (!record) {
    const { data, error } = await supabase
      .from("manager_audit_history")
      .select("*")
      .eq("id", recordId)
      .single();

    if (error) {
      console.error("Error fetching audit record:", error);
      throw new Error("Failed to load audit record data");
    }
    record = data;
  }

  if (!record) {
    throw new Error("Audit record data is empty");
  }

  const auditId = record.audit_type_id;
  const auditName = record.audit_type_name;
  const completedDate = record.completed_date;
  const auditorName = record.auditor;
  const auditData = record.data;

  // 2. Fetch context information (Care Home Name, Org Logo, Auditor Role, Teams)
  let careHomeName = "Care Home";
  let orgLogoUrl = "";
  let auditorRole = "";
  let teams: { id: string; name: string }[] = [];

  try {
    // Fetch Care Home Name
    if (record.care_home_id) {
      const { data: chData } = await supabase
        .from("care_homes")
        .select("name")
        .eq("id", record.care_home_id)
        .single();
      if (chData?.name) {
        careHomeName = chData.name;
      }
    }

    // Fetch Org Logo
    if (record.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", record.organization_id)
        .single();
      if (orgData?.logo_url) {
        orgLogoUrl = orgData.logo_url;
      }
    }

    // Fetch Auditor's role from public.users (matching by auditor name or email)
    if (auditorName) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .or(`name.eq."${auditorName}",email.eq."${auditorName}"`)
        .maybeSingle();
      if (userData?.role) {
        auditorRole = formatRoleName(userData.role);
      }
    }

    // Fetch Teams/Units
    if (record.care_home_id) {
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("care_home_id", record.care_home_id);
      if (teamData) {
        teams = teamData;
      }
    }
  } catch (err) {
    console.error("Error fetching PDF context details:", err);
  }

  // Layout Classification (matching manager-audit workspace UI logic)
  const isTeamBased = ["3", "18"].includes(auditId);
  const isStaffBased = ["7", "22", "26", "32", "33"].includes(auditId) || auditData?.category === "staff";
  const isGridBased = !!auditData?.gridData || ["1", "14", "16", "23", "24", "29"].includes(auditId);
  const isFallRegisterTable =
    auditId === "13" && !!auditData?.fallRegisterData;
  const registrationTrackerData = resolveRegistrationTrackerData(auditId, auditData);
  const isRegistrationTrackerTable = !!registrationTrackerData;
  const incidentAuditData = resolveIncidentAuditTableData(auditId, auditData);
  const isIncidentAuditTable = !!incidentAuditData;
  const woundsAnalysisData = resolveWoundsAnalysisTableData(auditId, auditData);
  const isWoundsAnalysisTable = !!woundsAnalysisData;
  const isQuestionsOnly =
    !isFallRegisterTable &&
    !isRegistrationTrackerTable &&
    !isIncidentAuditTable &&
    !isWoundsAnalysisTable &&
    !isGridBased &&
    (!!auditData?.homeBasedData || ["9", "10", "42"].includes(auditId));

  // Initialize jsPDF (landscape for wide tabular wounds audit)
  const doc = isWoundsAnalysisTable
    ? new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    : new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  // Helper to load images in browser
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Footer helper
  const addFooter = (data: any) => {
    const pageSize = doc.internal.pageSize;
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    const ukTime = formatInTimeZone(new Date(), UK_TIMEZONE, "dd/MM/yyyy HH:mm");
    doc.text(
      `Generated on ${ukTime} UK Time • CareO Management System`,
      margin,
      pageHeight - 10
    );
    doc.text(
      `Page ${data.pageNumber}`,
      pageWidth - margin - 15,
      pageHeight - 10
    );
  };

  // Main Header draw helper
  const drawMainHeader = async (title: string, sub: string) => {
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    doc.setFillColor(34, 197, 94); // #22c55e green
    doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(sub, margin, 18);

    if (orgLogoUrl) {
      try {
        const img = await loadImage(orgLogoUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const logoSize = 14;
        const aspect = img.naturalWidth / img.naturalHeight;
        const logoW = logoSize * aspect;
        doc.addImage(dataUrl, 'PNG', pageWidth - margin - logoW, (headerHeight - 2 - logoSize) / 2, logoW, logoSize);
      } catch (e) {
        console.warn("Logo load failed", e);
      }
    }
  };

  const formattedDate = format(new Date(completedDate), "PPPP");
  const headerSubtitle = `Home: ${careHomeName} • Auditor: ${auditorName}${auditorRole ? ` (${auditorRole})` : ""} • ${formattedDate}`;

  // 1. Draw Page 1 header & info card
  await drawMainHeader(auditName, headerSubtitle);

  autoTable(doc, {
    startY: 25,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
    body: [
      [
        { content: 'Audit Name:', styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } },
        { content: auditName },
        { content: 'Date Completed:', styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } },
        { content: formattedDate }
      ],
      [
        { content: 'Audited By:', styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } },
        { content: auditorName },
        { content: 'Auditor Role:', styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } },
        { content: auditorRole || '—' }
      ],
      [
        { content: 'Care Home:', styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } },
        { content: careHomeName, colSpan: 3 }
      ]
    ]
  });

  // Render based on audit template layout
  if (isFallRegisterTable) {
    const fallData = auditData.fallRegisterData;
    const rows = fallData.rows || [];
    const answersList = fallData.answers || [];
    const columns = fallData.columnQuestions || DEFAULT_FALLS_COLUMN_QUESTIONS;
    const monthLabel = formatAuditMonthLabel(fallData.auditMonth || "");
    const totalFalls = fallData.totalFalls ?? rows.length;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
      body: [
        [
          { content: "Period:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: monthLabel },
          { content: "Total falls:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: String(totalFalls) },
        ],
      ],
    });

    const headers = ["Resident", ...columns.map((column: { text: string }) => column.text)];
    const tableBody = rows.map((row: {
      rowId: string;
      residentName: string;
      fallDate: string;
    }) => {
      const cells = [
        `${row.residentName}\n${row.fallDate}`,
        ...columns.map((column: { id: string }) => {
          const answer = answersList.find(
            (item: { residentId: string; questionId: string; value?: string }) =>
              item.residentId === row.rowId && item.questionId === column.id
          );
          const value = answer?.value || "—";
          if (column.id === "falls-q-4" && value !== "—") {
            return value.replace(/;\s*/g, "\n");
          }
          return value;
        }),
      ];
      return cells;
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [headers],
      body: tableBody.length > 0 ? tableBody : [["No falls recorded", ...columns.map(() => "—")]],
      theme: "grid",
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2, textColor: [31, 41, 55], overflow: "linebreak" },
      didDrawPage: addFooter,
    });
  } else if (isRegistrationTrackerTable && registrationTrackerData) {
    const trackerData = registrationTrackerData;
    const rows = trackerData.rows || [];
    const answersList = trackerData.answers || [];
    const trackerType = trackerData.trackerType;
    const columns = trackerData.columnQuestions;
    const totalStaff = trackerData.totalStaff ?? rows.length;
    const staffLabel = trackerType === "nmc" ? "Nurses" : "Staff";

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
      body: [
        [
          { content: "Tracker:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: trackerType === "nmc" ? "NMC Registration" : "NISCC Registration" },
          { content: `Total ${staffLabel}:`, styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: String(totalStaff) },
        ],
      ],
    });

    const headers = ["Staff", ...columns.map((column: { text: string }) => column.text)];
    const tableBody = rows.map((row: {
      staffId: string;
      staffName: string;
      roleLabel?: string;
    }) => {
      const staffCell =
        trackerType === "niscc" && row.roleLabel
          ? `${row.staffName}\n${row.roleLabel}`
          : row.staffName;

      const cells = [
        staffCell,
        ...columns.map((column: { id: string; type?: string }) => {
          const answer = answersList.find(
            (item: { residentId: string; questionId: string; value?: string }) =>
              item.residentId === row.staffId && item.questionId === column.id
          );
          const value = answer?.value || "—";
          if (column.type === "date" && value !== "—") {
            return formatRegistrationDate(value);
          }
          return value;
        }),
      ];
      return cells;
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [headers],
      body:
        tableBody.length > 0
          ? tableBody
          : [[`No ${staffLabel.toLowerCase()} recorded`, ...columns.map(() => "—")]],
      theme: "grid",
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2, textColor: [31, 41, 55], overflow: "linebreak" },
      didDrawPage: addFooter,
    });
  } else if (isIncidentAuditTable && incidentAuditData) {
    const { rows, columnQuestions, answers: answersList, auditMonth } =
      incidentAuditData;
    const monthLabel = formatAuditMonthLabel(auditMonth || "");
    const uniqueResidents = new Set(rows.map((row) => row.residentId)).size;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
      body: [
        [
          { content: "Period:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: monthLabel },
          { content: "Incidents:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: String(rows.length) },
        ],
        [
          { content: "Residents:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: String(uniqueResidents), colSpan: 3 },
        ],
      ],
    });

    const headers = [
      "Resident / incident",
      ...columnQuestions.map((column) => column.text),
    ];
    const tableBody = rows.map((row) => {
      const incidentLabel =
        row.incidentCountForResident > 1
          ? `\nIncident ${row.incidentIndex} of ${row.incidentCountForResident}`
          : "";
      const roomSuffix = row.roomNumber ? `\nRm ${row.roomNumber}` : "";
      const typeLabel = row.incidentTypeLabel
        ? `\n${row.incidentTypeLabel}`
        : "";
      return [
        `${row.residentName}${typeLabel}\n${formatIncidentDate(row.incidentDate)}${incidentLabel}${roomSuffix}`,
        ...columnQuestions.map((column) => {
          const answer = answersList.find(
            (item) =>
              item.residentId === row.rowId && item.questionId === column.id
          );
          const value = answer?.value || "";
          if (column.type === "yesno") {
            return formatYesNoDisplay(value);
          }
          return value || "—";
        }),
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [headers],
      body:
        tableBody.length > 0
          ? tableBody
          : [["No incidents recorded", ...columnQuestions.map(() => "—")]],
      theme: "grid",
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2, textColor: [31, 41, 55], overflow: "linebreak" },
      didDrawPage: addFooter,
    });
  } else if (isWoundsAnalysisTable && woundsAnalysisData) {
    const { rows, columnQuestions, answers: answersList, auditMonth } =
      woundsAnalysisData;
    const monthLabel = formatAuditMonthLabel(auditMonth || "");
    const uniqueResidents = new Set(rows.map((row) => row.residentId)).size;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
      body: [
        [
          { content: "Period:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: monthLabel },
          { content: "Wounds:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: String(rows.length) },
        ],
        [
          { content: "Residents:", styles: { fontStyle: "bold", fillColor: [243, 244, 246] } },
          { content: String(uniqueResidents), colSpan: 3 },
        ],
      ],
    });

    const headers = [
      "Resident / wound",
      ...columnQuestions.map((column) => column.text),
    ];
    const tableBody = rows.map((row) => {
      const woundLabel =
        row.woundCountForResident > 1
          ? `\nWound ${row.woundIndex} of ${row.woundCountForResident}`
          : "";
      const roomSuffix = row.roomNumber ? `\nRm ${row.roomNumber}` : "";
      const typeLabel =
        row.woundType || row.location
          ? `\n${[row.woundType, row.location].filter(Boolean).join(" — ")}`
          : "";
      const healedLabel = row.isHealedReview ? "\nHealed this month" : "";
      return [
        `${row.residentName}${typeLabel}${healedLabel}${woundLabel}${roomSuffix}`,
        ...columnQuestions.map((column) => {
          const answer = answersList.find(
            (item) =>
              item.residentId === row.rowId && item.questionId === column.id
          );
          const value = answer?.value || "";
          if (column.type === "yesno") {
            return formatYesNoDisplay(value);
          }
          if (column.type === "date") {
            return formatWoundsAnalysisDate(value) || "—";
          }
          return value || "—";
        }),
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [headers],
      body:
        tableBody.length > 0
          ? tableBody
          : [["No wounds recorded", ...columnQuestions.map(() => "—")]],
      theme: "grid",
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2, textColor: [31, 41, 55], overflow: "linebreak" },
      didDrawPage: addFooter,
    });
  } else if (isQuestionsOnly) {
    // --- Questions Only Layout ---
    const groups: { title: string; questions: any[] }[] = [];
    let currentGroup = { title: "Questions", questions: [] as any[] };

    const qList = auditData?.homeBasedData?.questions || [];
    for (const q of qList) {
      if (q.isSection) {
        if (currentGroup.questions.length > 0 || currentGroup.title !== "Questions") {
          groups.push(currentGroup);
        }
        currentGroup = { title: q.text, questions: [] };
      } else {
        currentGroup.questions.push(q);
      }
    }
    if (currentGroup.questions.length > 0 || groups.length === 0) {
      groups.push(currentGroup);
    }

    const tableBody: any[] = [];
    const subjectId = auditData?.homeBasedData?.subjectId || "audit-level";

    for (const group of groups) {
      tableBody.push([
        {
          content: group.title,
          colSpan: 3,
          styles: { fontStyle: 'bold', fillColor: [229, 231, 235], textColor: [17, 24, 39] }
        }
      ]);

      for (const q of group.questions) {
        const answer = (auditData?.homeBasedData?.answers || []).find(
          (item: any) => item.residentId === subjectId && item.questionId === q.id
        );
        const comment = (auditData?.homeBasedData?.comments || []).find(
          (item: any) => item.residentId === subjectId && item.questionId === q.id
        ) || (auditData?.homeBasedData?.comments || []).find(
          (item: any) => item.residentId === subjectId && !item.questionId
        );
        
        const statusVal = answer?.value || "";
        const commentVal = comment?.text || "";

        tableBody.push([
          q.text,
          commentVal || "—",
          { content: getDisplayStatus(statusVal, q.type), styles: { fontStyle: 'bold', textColor: getStatusColor(statusVal, q.type) } }
        ]);
      }
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Question', 'Comment', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 65 },
        2: { cellWidth: 25 }
      },
      didDrawPage: addFooter
    });

  } else if (isGridBased) {
    // --- Grid-Based Layout ---
    const gridData = auditData?.gridData || {};
    const rowQs = gridData.rowQuestions || [];
    const colQs = gridData.columnQuestions || [];
    const fixedColData = gridData.fixedColumnData || {};
    const answersList = gridData.answers || [];
    const isPlainTemplate = auditId === "1" || gridData.template_type === 'plain-template';

    const headers = ['Questions'];
    for (const c of colQs) {
      headers.push(c.text);
    }
    if (!isPlainTemplate) {
      headers.push('Comment', 'Action Required', 'Action Completed');
    }

    const tableBody: any[] = [];
    for (const rowQ of rowQs) {
      if (rowQ.isSection) {
        tableBody.push([
          {
            content: rowQ.text,
            colSpan: headers.length,
            styles: { fontStyle: 'bold', fillColor: [229, 231, 235], textColor: [17, 24, 39] }
          }
        ]);
      } else {
        const rowCells: any[] = [rowQ.text];
        for (const colQ of colQs) {
          const ans = answersList.find((a: any) => a.residentId === rowQ.id && a.questionId === colQ.id);
          const val = ans?.value;
          rowCells.push({
            content: getDisplayStatus(val, colQ.type),
            styles: { fontStyle: 'bold', textColor: getStatusColor(val, colQ.type), halign: 'center' }
          });
        }
        if (!isPlainTemplate) {
          const fixed = fixedColData[rowQ.id] || {};
          rowCells.push(fixed.comment || "—");
          rowCells.push(fixed.actionRequired || "—");
          rowCells.push(fixed.actionCompleted || "—");
        }
        tableBody.push(rowCells);
      }
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [headers],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2, textColor: [31, 41, 55] },
      didDrawPage: addFooter
    });

  } else {
    // --- Sidebar-Based Layouts (Residents, Residents + Unit, Teams, Staff) ---
    const subjects = auditData?.residents || [];

    // Calculate overall stats
    let totalCompliant = 0;
    let totalNonCompliant = 0;
    let totalActionRequired = 0;
    let totalNotApplicable = 0;
    let totalNotReviewed = 0;

    for (const s of subjects) {
      for (const ans of (s.answers || [])) {
        const norm = normalizeAnswerValue(ans.value);
        if (norm === "compliant") totalCompliant++;
        else if (norm === "non-compliant") totalNonCompliant++;
        else if (norm === "action-required") totalActionRequired++;
        else if (norm === "not-applicable") totalNotApplicable++;
        else totalNotReviewed++;
      }
    }

    const grandTotal = totalCompliant + totalNonCompliant + totalActionRequired;
    const compliancePercentage = grandTotal > 0 ? Math.round((totalCompliant / grandTotal) * 100) : 0;

    // Draw Page 1 Summary Metrics card
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 4 },
      body: [
        [
          {
            content: `SUMMARY METRICS`,
            styles: { fontStyle: 'bold', fontSize: 11, textColor: [17, 24, 39], fillColor: [243, 244, 246] }
          }
        ],
        [
          `Total Audited: ${subjects.length} ${isTeamBased ? 'Teams' : isStaffBased ? 'Staff Members' : 'Residents'}\n` +
          `Compliance Score: ${compliancePercentage}%\n` +
          `Compliant Items: ${totalCompliant}  •  Non-Compliant: ${totalNonCompliant}  •  Action Required: ${totalActionRequired}\n` +
          `N/A: ${totalNotApplicable}  •  Not Reviewed: ${totalNotReviewed}`
        ]
      ]
    });

    // Draw Page 1 Audited Subjects Summary Table
    const subjectHeaders = [
      isTeamBased ? 'Team Name' : isStaffBased ? 'Staff Member' : 'Resident',
      isStaffBased ? 'Role' : 'Room',
      'Unit / Team',
      'Compliant',
      'Non-Compliant',
      'Action Required',
      'N/A'
    ];

    const subjectRows: any[] = [];
    for (const s of subjects) {
      let comp = 0, nonComp = 0, actReq = 0, na = 0;
      for (const ans of (s.answers || [])) {
        const norm = normalizeAnswerValue(ans.value);
        if (norm === "compliant") comp++;
        else if (norm === "non-compliant") nonComp++;
        else if (norm === "action-required") actReq++;
        else if (norm === "not-applicable") na++;
      }

      const name = `${s.firstName || ""} ${s.lastName || ""}`.trim();
      const roomOrRole = s.roomNumber || '—';
      const teamObj = teams.find(t => t.id === s.teamId);
      const unitOrTeam = teamObj ? teamObj.name : '—';

      subjectRows.push([
        name,
        roomOrRole,
        unitOrTeam,
        comp.toString(),
        nonComp.toString(),
        actReq.toString(),
        na.toString()
      ]);
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [subjectHeaders],
      body: subjectRows,
      theme: 'grid',
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [31, 41, 55] },
      didDrawPage: addFooter
    });

    // Prepare sidebar groups for detailed checklists
    const sidebarGroups: { title: string; questions: any[] }[] = [];
    let currentSg = { title: "Questions", questions: [] as any[] };

    const sidebarQList = auditData?.questions || [];
    for (const q of sidebarQList) {
      if (q.isSection) {
        if (currentSg.questions.length > 0 || currentSg.title !== "Questions") {
          sidebarGroups.push(currentSg);
        }
        currentSg = { title: q.text, questions: [] };
      } else {
        currentSg.questions.push(q);
      }
    }
    if (currentSg.questions.length > 0 || sidebarGroups.length === 0) {
      sidebarGroups.push(currentSg);
    }

    // Print a separate page for each subject's checklist
    for (const s of subjects) {
      doc.addPage();
      await drawMainHeader(auditName, headerSubtitle);

      const name = `${s.firstName || ""} ${s.lastName || ""}`.trim();
      const roomOrRole = s.roomNumber ? (isStaffBased ? `Role: ${s.roomNumber}` : `Room: ${s.roomNumber}`) : "";
      const teamObj = teams.find(t => t.id === s.teamId);
      const unitText = teamObj ? `Unit/Team: ${teamObj.name}` : "";
      const subjectTitle = `${isTeamBased ? 'TEAM' : isStaffBased ? 'STAFF MEMBER' : 'RESIDENT'}: ${name.toUpperCase()} ${roomOrRole ? `(${roomOrRole})` : ""} ${unitText ? `· ${unitText}` : ""}`;

      autoTable(doc, {
        startY: 25,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 3 },
        body: [
          [
            {
              content: subjectTitle,
              styles: { fontStyle: 'bold', textColor: [17, 24, 39], fillColor: [243, 244, 246] }
            }
          ]
        ]
      });

      const checklistRows: any[] = [];
      for (const group of sidebarGroups) {
        checklistRows.push([
          {
            content: group.title,
            colSpan: 3,
            styles: { fontStyle: 'bold', fillColor: [229, 231, 235], textColor: [17, 24, 39] }
          }
        ]);

        for (const q of group.questions) {
          const answer = (s.answers || []).find((a: any) => a.questionId === q.id);
          const statusVal = answer?.value || "";
          const commentVal = answer?.comment || "";

          checklistRows.push([
            q.text,
            commentVal || "—",
            { content: getDisplayStatus(statusVal, q.type), styles: { fontStyle: 'bold', textColor: getStatusColor(statusVal, q.type) } }
          ]);
        }
      }

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 4,
        head: [['Question', 'Comment', 'Status']],
        body: checklistRows,
        theme: 'grid',
        headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, textColor: [31, 41, 55] },
        columnStyles: {
          0: { cellWidth: 95 },
          1: { cellWidth: 65 },
          2: { cellWidth: 25 }
        },
        didDrawPage: addFooter
      });
    }
  }

  // --- Append Action Plans ---
  const actionPlans = auditData?.actionPlans || auditData?.action_plans || [];
  if (actionPlans.length > 0) {
    doc.addPage();
    await drawMainHeader(auditName, headerSubtitle);

    autoTable(doc, {
      startY: 25,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 3 },
      body: [
        [
          {
            content: "ACTION PLANS",
            styles: { fontStyle: 'bold', textColor: [17, 24, 39], fillColor: [243, 244, 246] }
          }
        ]
      ]
    });

    const actionPlanRows = actionPlans.map((plan: any) => {
      const assignee = plan.assignedToName?.trim() || plan.assignedToEmail?.trim() || plan.assignedTo?.trim() || "—";
      const subject = plan.residentName || "General";
      const dueDateText = plan.dueDate ? format(new Date(plan.dueDate), "dd/MM/yyyy") : "—";
      
      const statusRaw = plan.status || "pending";
      const statusLabel = statusRaw.replace(/-/g, " ").toUpperCase();

      return [
        subject,
        plan.text || "—",
        statusLabel,
        dueDateText,
        assignee
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      head: [['Subject / Area', 'Action Plan', 'Status', 'Due Date', 'Assigned To']],
      body: actionPlanRows,
      theme: 'grid',
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 70 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 }
      },
      didDrawPage: addFooter
    });
  }

  // --- Save PDF File ---
  const cleanAuditName = auditName.replace(/[^a-zA-Z0-9]/g, "-");
  const cleanHomeName = careHomeName.replace(/[^a-zA-Z0-9]/g, "-");
  const dateStr = format(new Date(completedDate), "yyyy-MM-dd");
  const fileName = `Manager-Audit-${cleanHomeName}-${cleanAuditName}-${dateStr}.pdf`;
  doc.save(fileName);
};
