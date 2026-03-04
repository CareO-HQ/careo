import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Resident } from "@/types";

export interface MedicationIntakeForPDF {
  id?: string;
  scheduled_time: string;
  status?: string;
  state?: string;
  quantity?: number;
  comment?: string;
  notes?: string;
  medication?: {
    name?: string;
    strength?: string | number;
    strength_unit?: string;
    dosage_form?: string;
    route?: string;
    schedule_type?: string;
  };
  administered_by?: { name?: string };
  witness?: { name?: string };
}

export interface GroupedIntakeForPDF {
  date: string;
  dateObj: Date;
  intakes: MedicationIntakeForPDF[];
  totalCount: number;
  administeredCount: number;
  missedCount: number;
  refusedCount: number;
  skippedCount: number;
  givenCount: number;
}

function organizeIntakesByCategory(
  intakes: MedicationIntakeForPDF[],
  selectedDate: Date
): {
  scheduled: { time: string; intakes: MedicationIntakeForPDF[] }[];
  prn: MedicationIntakeForPDF[];
  topical: MedicationIntakeForPDF[];
} {
  const scheduled: Record<string, MedicationIntakeForPDF[]> = {};
  const prn: MedicationIntakeForPDF[] = [];
  const topical: MedicationIntakeForPDF[] = [];

  const now = new Date();
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(now, "yyyy-MM-dd");
  const isToday = selectedDateStr === todayStr;
  const isPastDate = selectedDate < new Date(todayStr);
  const currentTime = format(now, "HH:mm");

  for (const intake of intakes) {
    const medication = intake.medication;

    if (!medication) {
      const time = intake.scheduled_time
        ? format(new Date(intake.scheduled_time), "HH:mm")
        : "Unknown";
      if (!scheduled[time]) scheduled[time] = [];
      scheduled[time].push(intake);
      continue;
    }

    if (medication.schedule_type === "PRN (As Needed)") {
      prn.push(intake);
    } else if (medication.route === "Topical") {
      topical.push(intake);
    } else {
      const time = intake.scheduled_time
        ? format(new Date(intake.scheduled_time), "HH:mm")
        : "Unknown";
      if (!scheduled[time]) scheduled[time] = [];
      scheduled[time].push(intake);
    }
  }

  if (isPastDate) {
    // keep all as-is
  } else if (isToday) {
    const filtered: Record<string, MedicationIntakeForPDF[]> = {};
    for (const [time, timeIntakes] of Object.entries(scheduled)) {
      const isRoundCompleted = timeIntakes.every((i) => {
        const status = i.status || i.state || "scheduled";
        return status !== "scheduled";
      });
      if (time <= currentTime || isRoundCompleted) {
        filtered[time] = timeIntakes;
      }
    }
    Object.keys(scheduled).forEach((k) => delete scheduled[k]);
    Object.assign(scheduled, filtered);
  }

  const scheduledArray = Object.entries(scheduled)
    .map(([time, intakes]) => ({ time, intakes }))
    .sort((a, b) => a.time.localeCompare(b.time));

  return { scheduled: scheduledArray, prn, topical };
}

function buildTableBody(intakes: MedicationIntakeForPDF[]): string[][] {
  return intakes.map((intake) => {
    const status = intake.status || intake.state || "scheduled";
    const time = intake.scheduled_time
      ? format(new Date(intake.scheduled_time), "HH:mm")
      : "-";
    const name = intake.medication?.name || "N/A";
    const detail =
      [intake.medication?.strength, intake.medication?.strength_unit]
        .filter(Boolean)
        .join(" ") +
      " - " +
      (intake.medication?.dosage_form || "N/A");
    const route = intake.medication?.route || "N/A";
    const qty = String(intake.quantity ?? 1);
    const admin = intake.administered_by?.name || "-";
    const witness = intake.witness?.name ? `Witness: ${intake.witness.name}` : "";
    const notes = intake.comment || intake.notes || "-";
    return [
      time,
      `${name}\n${detail}\nRoute: ${route}`,
      qty,
      status,
      admin + (witness ? `\n${witness}` : ""),
      notes,
    ];
  });
}

const tableHead = [
  "Time",
  "Medication",
  "Qty",
  "Status",
  "Administered By",
  "Notes",
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateMedicationHistoryDayPDF(
  resident: Resident,
  groupedIntake: GroupedIntakeForPDF,
  options?: { orgLogoUrl?: string }
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const headerHeight = 22;

  let yPos = 22;

  const checkPageBreak = (needed: number) => {
    if (yPos + needed > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // --- Header: white background + green line ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setFillColor(34, 197, 94);
  doc.rect(0, headerHeight - 2, pageWidth, 2, "F");

  // Logo top right (before title so title doesn't overlap)
  const orgLogoUrl = options?.orgLogoUrl;
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
      // ignore logo load errors
    }
  }

  // Title and resident name
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Medication History Report", margin, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`${resident.first_name} ${resident.last_name}`, margin, 18);
  doc.setTextColor(17, 24, 39);
  yPos = 28;

  const formattedDate = new Date(groupedIntake.date).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const { scheduled, prn, topical } = organizeIntakesByCategory(
    groupedIntake.intakes,
    groupedIntake.dateObj
  );
  const allScheduled = scheduled.flatMap((g) => g.intakes);

  // Info boxes: light gray fill, dark text, light gray border
  checkPageBreak(28);
  const boxW = contentWidth / 4 - 4;
  const boxPadding = 4;
  const maxTextWidth = boxW - boxPadding * 2;
  const labels = ["Report Date", "Total", "Administered", "Missed / Refused"];
  const values = [
    formattedDate,
    String(groupedIntake.totalCount),
    String(groupedIntake.administeredCount),
    String(groupedIntake.missedCount + groupedIntake.refusedCount),
  ];
  for (let i = 0; i < 4; i++) {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.rect(x, yPos, boxW, 22, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(labels[i], x + boxPadding, yPos + 6);
    doc.setFontSize(i === 0 ? 8 : 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    const valueStr = values[i];
    if (i === 0) {
      // Wrap long report date so it stays inside the first box
      const lines = doc.splitTextToSize(valueStr, maxTextWidth);
      const lineHeight = 4.5;
      const startY = yPos + 14;
      lines.slice(0, 2).forEach((line: string, idx: number) => {
        doc.text(line, x + boxPadding, startY + idx * lineHeight);
      });
    } else {
      doc.text(valueStr, x + boxPadding, yPos + 16);
    }
  }
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "normal");
  yPos += 28;

  // Table options: explicit light header, white body, dark text, left alignment
  const tableOptions = {
    margin: { left: margin, right: margin },
    theme: "grid" as const,
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [31, 41, 55],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [17, 24, 39],
      fontSize: 7,
      halign: "left",
    },
    styles: { cellPadding: 3 },
    columnStyles: {
      0: { halign: "left" },  // Time
      1: { halign: "left" },  // Medication
      2: { halign: "center" }, // Qty
      3: { halign: "left" },  // Status
      4: { halign: "left" },  // Administered By
      5: { halign: "left" },  // Notes
    },
  };

  if (allScheduled.length > 0) {
    checkPageBreak(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Scheduled Medications", margin, yPos);
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [tableHead],
      body: buildTableBody(allScheduled),
      ...tableOptions,
    });
    yPos = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ? (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      : yPos + 10;
  }

  if (prn.length > 0) {
    checkPageBreak(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PRN (As Needed) Medications", margin, yPos);
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [tableHead],
      body: buildTableBody(prn),
      ...tableOptions,
    });
    yPos = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ? (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      : yPos + 10;
  }

  if (topical.length > 0) {
    checkPageBreak(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Topical Medications", margin, yPos);
    yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [tableHead],
      body: buildTableBody(topical),
      ...tableOptions,
    });
  }

  const fileName = `medication-history-${resident.first_name}-${resident.last_name}-${groupedIntake.date}.pdf`;
  doc.save(fileName);
}
