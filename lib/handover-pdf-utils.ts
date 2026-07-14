import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatInTimeZone } from "date-fns-tz";
import { UK_TIMEZONE } from "@/lib/date-utils";
import { Resident } from "@/types";
import { ResidentHandoverData } from "@/lib/handover-data";
import { formatHandoverEventsForPdf } from "@/lib/handover-events-display";
import { formatMetaStatValue } from "@/lib/handover-meta";
import { formatResidentNameAndRoom } from "@/lib/handover-hospital-transfer";

export interface HandoverPdfData extends ResidentHandoverData {
  handoverComment?: string;
}

export interface GenerateHandoverPDFOptions {
  teamName: string;
  date: Date;
  shift: "day" | "night";
  shiftTimes: string;
  inCharge: string;
  totalBeds: number | null;
  vacantBeds: number | null;
  hospitalAdmissions: number;
  residents: Resident[];
  handoverData: Record<string, HandoverPdfData>;
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
  totalBeds,
  vacantBeds,
  hospitalAdmissions,
  residents,
  handoverData,
  orgLogoUrl,
}: GenerateHandoverPDFOptions): Promise<void> => {
  try {
    const doc = new jsPDF({ orientation: "landscape" });
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
      doc.setFillColor(34, 197, 94);
      doc.rect(0, headerHeight - 2, pageWidth, 1, "F");
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(pageTitle.toUpperCase(), margin, 14);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(subTitle, margin, 18);

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

    const formattedDate = formatInTimeZone(date, UK_TIMEZONE, "EEEE, d MMMM yyyy");
    await drawHeader(
      `${teamName} HANDOVER SHEET`,
      `${formattedDate} • ${toTitleCase(shift)} Shift (${shiftTimes})`
    );

    let currentY = 25;

    autoTable(doc, {
      startY: currentY,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
      body: [
        [
          { content: "In Charge:", styles: { fontStyle: "bold" } },
          { content: inCharge || "—" },
          { content: "Total Beds:", styles: { fontStyle: "bold" } },
          { content: formatMetaStatValue(totalBeds) },
        ],
        [
          { content: "Any Hospital Admissions:", styles: { fontStyle: "bold" } },
          { content: String(hospitalAdmissions) },
          { content: "Vacant Beds:", styles: { fontStyle: "bold" } },
          { content: formatMetaStatValue(vacantBeds) },
        ],
      ],
    });

    currentY = (docWithAutoTable.lastAutoTable?.finalY ?? currentY) + 8;

    const tableData = residents.map((resident) => {
      const data = handoverData[resident.id];

      return [
        formatResidentNameAndRoom(
          resident.first_name,
          resident.last_name,
          resident.room_number
        ),
        formatHandoverEventsForPdf(data),
        data?.handoverComment || "—",
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Resident", "Events", "Handover Notes"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: [75, 85, 99],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 3,
        textColor: [0, 0, 0],
        overflow: "linebreak",
        valign: "top",
      },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 72 },
        2: { cellWidth: "auto" },
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, "dd/MM/yyyy HH:mm")} UK Time • CareO`,
          margin,
          pageHeight - 10
        );
        doc.text(`Page ${data.pageNumber}`, pageWidth - margin - 20, pageHeight - 10);
      },
    });

    const fileName = `Handover_${teamName.replace(/\s+/g, "_")}_${formatInTimeZone(date, UK_TIMEZONE, "yyyy-MM-dd")}_${shift}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("[Handover PDF] Error generating PDF:", error);
    throw error;
  }
};
