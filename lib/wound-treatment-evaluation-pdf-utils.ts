import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

type WoundTreatmentEvaluationRecord = {
  id: string;
  evaluation_date: string;
  wound_number: string;
  cleansing_method: string | null;
  dressing_choice: string | null;
  frequency: string | null;
  rationale_for_change: string | null;
  wound_evaluation: string | null;
  signature: string;
  created_at: string;
};

type GenerateWoundTreatmentEvaluationPDFOptions = {
  residentName?: string;
  residentDOB?: string;
  roomNumber?: string;
  woundNumber?: number;
  orgLogoUrl?: string;
  evaluations: WoundTreatmentEvaluationRecord[];
};

const asDate = (value?: string | null): string => {
  if (!value) return "N/A";
  return format(new Date(value), "dd/MM/yyyy");
};

const asText = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "N/A";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "N/A";
};

const asOptionalPlainText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return "";
  return value.trim();
};

const getImageFormatFromDataUrl = (dataUrl: string): "PNG" | "JPEG" | "WEBP" => {
  if (dataUrl.includes("image/png")) return "PNG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "JPEG";
  return "PNG";
};

const loadOrgLogoForPdf = async (
  url?: string
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const dimensionsFromDataUrl = (dataUrl: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      img.onerror = () => reject(new Error("Could not read logo dimensions"));
      img.src = dataUrl;
    });

  const toDataUrlFromBlob = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });

  try {
    let dataUrl = "";
    if (trimmed.startsWith("data:image/")) {
      dataUrl = trimmed;
    } else {
      const response = await fetch(trimmed, { mode: "cors", credentials: "omit" });
      if (!response.ok) return null;
      const blob = await response.blob();
      dataUrl = await toDataUrlFromBlob(blob);
    }

    const dimensions = await dimensionsFromDataUrl(dataUrl);
    return { dataUrl, width: dimensions.width, height: dimensions.height };
  } catch {
    return null;
  }
};

export const generateWoundTreatmentEvaluationPDF = async ({
  residentName,
  residentDOB,
  roomNumber,
  woundNumber,
  orgLogoUrl,
  evaluations,
}: GenerateWoundTreatmentEvaluationPDFOptions): Promise<void> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const green: [number, number, number] = [34, 197, 94];
  const resolvedOrgLogo = typeof window !== "undefined" ? await loadOrgLogoForPdf(orgLogoUrl) : null;

  const headerHeight = 22;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, margin, pageWidth - margin * 2, headerHeight, "F");
  doc.setFillColor(...green);
  doc.rect(margin, margin + headerHeight - 2, pageWidth - margin * 2, 1.2, "F");

  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("WOUND TREATMENT AND EVALUATION OF CARE", margin + 2, margin + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "(To be completed when treatment or dressing type/regime is changed. Please record clearly.)",
    margin + 2,
    margin + 14
  );

  if (resolvedOrgLogo) {
    try {
      const fmt = getImageFormatFromDataUrl(resolvedOrgLogo.dataUrl);
      const logoHeight = 12;
      const aspect = resolvedOrgLogo.width / resolvedOrgLogo.height;
      const logoWidth = logoHeight * aspect;
      doc.addImage(
        resolvedOrgLogo.dataUrl,
        fmt,
        pageWidth - margin - logoWidth - 2,
        margin + 3,
        logoWidth,
        logoHeight
      );
    } catch {
      // Keep PDF generation resilient if logo rendering fails.
    }
  }

  const infoStartY = margin + headerHeight + 6;
  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Resident's name:", margin + 2, infoStartY);
  doc.setFont("helvetica", "normal");
  doc.text(asText(residentName), margin + 30, infoStartY);

  doc.setFont("helvetica", "bold");
  doc.text("D.O.B:", margin + 95, infoStartY);
  doc.setFont("helvetica", "normal");
  doc.text(asDate(residentDOB), margin + 108, infoStartY);

  doc.setFont("helvetica", "bold");
  doc.text("Rm. No.:", margin + 140, infoStartY);
  doc.setFont("helvetica", "normal");
  doc.text(asText(roomNumber), margin + 156, infoStartY);

  doc.setFont("helvetica", "bold");
  doc.text("Wound Number:", margin + 185, infoStartY);
  doc.setFont("helvetica", "normal");
  doc.text(asText(woundNumber), margin + 214, infoStartY);

  const rows = (evaluations.length > 0 ? evaluations : [null]).map((evaluation) => {
    if (!evaluation) {
      return ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A"];
    }

    const cleansing = asOptionalPlainText(evaluation.cleansing_method);
    const dressing = asOptionalPlainText(evaluation.dressing_choice);
    const combinedTreatment = [cleansing, dressing].filter((part) => part.length > 0).join("\n");

    return [
      asDate(evaluation.evaluation_date),
      asText(evaluation.wound_number),
      combinedTreatment,
      asText(evaluation.frequency),
      asText(evaluation.rationale_for_change),
      asText(evaluation.wound_evaluation),
      asText(evaluation.signature),
    ];
  });

  autoTable(doc, {
    startY: infoStartY + 6,
    theme: "grid",
    margin: { left: margin + 1, right: margin + 1, bottom: 16 },
    head: [
      [
        "Date",
        "Wound Number",
        "Cleansing Method, Dressing Choice",
        "Frequency",
        "Rationale for changing dressing type",
        "Wound evaluation (healing, dry etc.)",
        "Signature",
      ],
    ],
    body: rows,
    headStyles: {
      fillColor: [240, 253, 244],
      textColor: [22, 101, 52],
      fontStyle: "bold",
      lineColor: green,
      lineWidth: 0.2,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: green,
      lineWidth: 0.15,
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 22 },
      2: { cellWidth: 54 },
      3: { cellWidth: 24 },
      4: { cellWidth: 54 },
      5: { cellWidth: 54 },
      6: { cellWidth: 24 },
    },
    didDrawPage: (data) => {
      const currentPageHeight = doc.internal.pageSize.getHeight();
      const currentPageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin + 1, currentPageHeight - 8);
      doc.text(`Page ${data.pageNumber}`, currentPageWidth - margin - 10, currentPageHeight - 8);
    },
  });

  const generatedDate = format(new Date(), "dd-MM-yyyy");
  const fileSafeName = asText(residentName)
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  doc.save(`wound-treatment-evaluation-${fileSafeName || "resident"}-${generatedDate}.pdf`);
};
