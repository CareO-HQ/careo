import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatInTimeZone } from "date-fns-tz";
import { UK_TIMEZONE } from "@/lib/date-utils";
import { Resident } from "@/types";

interface HandoverData {
  residentId: string;
  foodIntakeCount: number;
  foodIntakePercentage: number;
  totalFluid: number;
  incidentCount: number;
  fallCount: number;
  woundCount: number;
  hospitalTransferCount: number;
  appointmentCount: number;
  appointments: any[];
  dietInfo?: {
    textureGrade?: string;
    fluidConsistency?: string;
    diabeticStatus?: string;
  };
  handoverComment?: string;
}

export interface GenerateHandoverPDFOptions {
  teamName: string;
  date: Date;
  shift: "day" | "night";
  shiftTimes: string;
  inCharge: string;
  hospital: string;
  vacant: string;
  residents: Resident[];
  handoverData: Record<string, HandoverData>;
  orgLogoUrl?: string;
  careHomeName?: string;
}

const toTitleCase = (value: string): string =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => (part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");

export const generateHandoverPDF = async ({
  teamName,
  date,
  shift,
  shiftTimes,
  inCharge,
  hospital,
  vacant,
  residents,
  handoverData,
  orgLogoUrl,
  careHomeName,
}: GenerateHandoverPDFOptions): Promise<void> => {
  try {
    console.log("[Handover PDF] Starting PDF generation...");
    console.log("[Handover PDF] Team:", teamName);
    console.log("[Handover PDF] Date:", date);
    console.log("[Handover PDF] Residents:", residents.length);
    console.log("[Handover PDF] Handover data keys:", Object.keys(handoverData).length);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const docWithAutoTable = doc as jsPDF & {
      lastAutoTable?: { finalY?: number };
    };

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const drawHeader = async (pageTitle: string, subTitle: string): Promise<void> => {
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Green bottom border
    doc.setFillColor(34, 197, 94); // #22c55e green
    doc.rect(0, headerHeight - 2, pageWidth, 1, "F");

    // Title
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(pageTitle.toUpperCase(), margin, 14);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subTitle, margin, 18);

    // Organization Logo (top-right)
    if (!orgLogoUrl) return;
    try {
      const logoImg = await loadImage(orgLogoUrl);
      const canvas = document.createElement("canvas");
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(logoImg, 0, 0);
      const logoDataUrl = canvas.toDataURL("image/png");
      const logoSize = 14;
      const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
      const logoW = logoSize * aspect;
      doc.addImage(
        logoDataUrl,
        "PNG",
        pageWidth - margin - logoW,
        (headerHeight - 2 - logoSize) / 2,
        logoW,
        logoSize
      );
    } catch (error) {
      console.warn("Failed to load organization logo", error);
    }
  };

  // Draw header
  const formattedDate = formatInTimeZone(date, UK_TIMEZONE, "EEEE, d MMMM yyyy");
  await drawHeader(
    `${teamName} HANDOVER SHEET`,
    `${formattedDate} • ${toTitleCase(shift)} Shift (${shiftTimes})`
  );

  let currentY = 25;

  // Handover Details Section
  autoTable(doc, {
    startY: currentY,
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
    body: [
      [
        { content: "In Charge:", styles: { fontStyle: "bold" } },
        { content: inCharge || "--" },
        { content: "Hospital:", styles: { fontStyle: "bold" } },
        { content: hospital || "--" },
      ],
      [
        { content: "Vacant Rooms:", styles: { fontStyle: "bold" } },
        { content: vacant || "--", colSpan: 3 },
      ],
    ],
  });

  currentY = (docWithAutoTable.lastAutoTable?.finalY ?? currentY) + 8;

  // Calculate summary stats
  const totalIncidents = Object.values(handoverData).reduce(
    (sum, h) => sum + h.incidentCount,
    0
  );
  const totalFalls = Object.values(handoverData).reduce(
    (sum, h) => sum + h.fallCount,
    0
  );
  const totalHospitalTransports = Object.values(handoverData).reduce(
    (sum, h) => sum + h.hospitalTransferCount,
    0
  );

  // Summary Stats
  autoTable(doc, {
    startY: currentY,
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], halign: "center" },
    columnStyles: {
      0: { cellWidth: (pageWidth - 2 * margin) / 4 },
      1: { cellWidth: (pageWidth - 2 * margin) / 4 },
      2: { cellWidth: (pageWidth - 2 * margin) / 4 },
      3: { cellWidth: (pageWidth - 2 * margin) / 4 },
    },
    body: [
      [
        {
          content: "TOTAL RESIDENTS",
          styles: {
            fontStyle: "bold",
            fontSize: 8,
            textColor: [107, 114, 128],
          },
        },
        {
          content: "INCIDENTS",
          styles: {
            fontStyle: "bold",
            fontSize: 8,
            textColor: [107, 114, 128],
          },
        },
        {
          content: "FALLS",
          styles: {
            fontStyle: "bold",
            fontSize: 8,
            textColor: [107, 114, 128],
          },
        },
        {
          content: "HOSPITAL",
          styles: {
            fontStyle: "bold",
            fontSize: 8,
            textColor: [107, 114, 128],
          },
        },
      ],
      [
        {
          content: residents.length.toString(),
          styles: {
            fontStyle: "bold",
            fontSize: 16,
            textColor: [59, 130, 246],
          },
        },
        {
          content: totalIncidents.toString(),
          styles: {
            fontStyle: "bold",
            fontSize: 16,
            textColor: totalIncidents > 0 ? [239, 68, 68] : [156, 163, 175],
          },
        },
        {
          content: totalFalls.toString(),
          styles: {
            fontStyle: "bold",
            fontSize: 16,
            textColor: totalFalls > 0 ? [249, 115, 22] : [156, 163, 175],
          },
        },
        {
          content: totalHospitalTransports.toString(),
          styles: {
            fontStyle: "bold",
            fontSize: 16,
            textColor: totalHospitalTransports > 0 ? [59, 130, 246] : [156, 163, 175],
          },
        },
      ],
    ],
  });

  currentY = (docWithAutoTable.lastAutoTable?.finalY ?? currentY) + 8;

  // Section header
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text("RESIDENT HANDOVER DETAILS", margin, currentY);
  currentY += 5;

  // Resident handover data table
  const tableData = residents.map((resident) => {
    const data = handoverData[resident.id];
    const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(" ");

    // Build care details
    const careDetails: string[] = [];
    if (data?.dietInfo?.textureGrade) {
      careDetails.push(`Level ${data.dietInfo.textureGrade} diet`);
    }
    if (data?.dietInfo?.fluidConsistency) {
      careDetails.push(`Level ${data.dietInfo.fluidConsistency} fluids`);
    }
    if (data?.dietInfo?.diabeticStatus) {
      careDetails.push(`Diabetic ${data.dietInfo.diabeticStatus}`);
    }

    // Build clinical data
    const clinicalData: string[] = [];
    if (data) {
      const foodColor =
        data.foodIntakePercentage >= 75
          ? [34, 197, 94] // green
          : data.foodIntakePercentage >= 50
          ? [245, 158, 11] // amber
          : [239, 68, 68]; // red

      const fluidColor =
        data.totalFluid >= 1500
          ? [34, 197, 94] // green
          : data.totalFluid >= 1000
          ? [245, 158, 11] // amber
          : [239, 68, 68]; // red

      clinicalData.push(`Food: ${data.foodIntakePercentage}%`);
      clinicalData.push(`Fluid: ${data.totalFluid}ml`);
    }

    // Build indicators
    const indicators: string[] = [];
    if (data?.incidentCount && data.incidentCount > 0) {
      indicators.push(`Incident${data.incidentCount > 1 ? `s (${data.incidentCount})` : ""}`);
    }
    if (data?.fallCount && data.fallCount > 0) {
      indicators.push(`Fall${data.fallCount > 1 ? `s (${data.fallCount})` : ""}`);
    }
    if (data?.woundCount && data.woundCount > 0) {
      indicators.push(`Wound Status (${data.woundCount} active)`);
    }
    if (data?.hospitalTransferCount && data.hospitalTransferCount > 0) {
      indicators.push(
        `Hospital${data.hospitalTransferCount > 1 ? ` (${data.hospitalTransferCount})` : ""}`
      );
    }
    if (data?.appointmentCount && data.appointmentCount > 0) {
      indicators.push(
        `Appointment${data.appointmentCount > 1 ? `s (${data.appointmentCount})` : ""}`
      );
    }

    // Build appointments
    const appointmentDetails: string[] = [];
    if (data?.appointments && data.appointments.length > 0) {
      data.appointments.forEach((apt) => {
        try {
          const time = formatInTimeZone(new Date(apt.start_time), UK_TIMEZONE, "HH:mm");
          const location = apt.location ? ` (${apt.location})` : "";
          appointmentDetails.push(`${time} - ${apt.title}${location}`);
        } catch (e) {
          console.warn("[Handover PDF] Error formatting appointment time:", e);
          appointmentDetails.push(`${apt.title}${apt.location ? ` (${apt.location})` : ""}`);
        }
      });
    }

    return [
      resident.room_number || "—",
      fullName || "Unknown",
      careDetails.join("\n") || "—",
      clinicalData.join("\n") || "—",
      indicators.join("\n") || "—",
      appointmentDetails.join("\n") || "—",
      data?.handoverComment || "—",
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Room", "Resident", "Care Details", "Clinical", "Indicators", "Appointments", "Comments"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [0, 0, 0],
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" }, // Room
      1: { cellWidth: 25 }, // Resident
      2: { cellWidth: 28 }, // Care Details
      3: { cellWidth: 20 }, // Clinical
      4: { cellWidth: 28 }, // Indicators
      5: { cellWidth: 30 }, // Appointments
      6: { cellWidth: 38 }, // Comments
    },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, "dd/MM/yyyy HH:mm")} UK Time • CareO Management System`,
        margin,
        pageHeight - 10
      );
      doc.text(`Page ${data.pageNumber}`, pageWidth - margin - 20, pageHeight - 10);
    },
  });

    // Save PDF
    console.log("[Handover PDF] Generating filename...");
    const fileName = `Handover_${teamName.replace(/\s+/g, "_")}_${formatInTimeZone(date, UK_TIMEZONE, "yyyy-MM-dd")}_${shift}.pdf`;
    console.log("[Handover PDF] Filename:", fileName);
    console.log("[Handover PDF] Saving PDF...");
    doc.save(fileName);
    console.log("[Handover PDF] PDF saved successfully!");
  } catch (error) {
    console.error("[Handover PDF] Error generating PDF:", error);
    if (error instanceof Error) {
      console.error("[Handover PDF] Error message:", error.message);
      console.error("[Handover PDF] Error stack:", error.stack);
    }
    throw error;
  }
};
