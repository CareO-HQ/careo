import jsPDF from "jspdf";
import { format } from "date-fns";

type WoundPhotographEvaluationRecord = {
  id: string;
  photograph_date: string;
  photograph_url: string;
  site_of_wound: string;
  length_cm?: number | null;
  width_cm?: number | null;
  depth_cm?: number | null;
  rgn_signature: string;
  comment?: string | null;
  created_at: string;
  next_photo_date?: string | null;
};

type GenerateWoundPhotographEvaluationPDFOptions = {
  residentName?: string;
  woundNumber?: number;
  orgLogoUrl?: string;
  evaluations: WoundPhotographEvaluationRecord[];
};

type ParsedSite = {
  woundLocation: string;
  leftRight: string;
  actualPosition: string;
  state: string;
  innerOuter: string;
};

const asText = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "N/A";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "N/A";
};

const asDate = (value?: string | null): string => {
  if (!value) return "N/A";
  return format(new Date(value), "dd/MM/yyyy");
};

const asDateTime = (value?: string | null): string => {
  if (!value) return "N/A";
  return format(new Date(value), "dd/MM/yyyy HH:mm");
};

const toYesNo = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "No";
};

const formatMeasurement = (
  lengthCm?: number | null,
  widthCm?: number | null,
  depthCm?: number | null
): string => {
  const parts: string[] = [];
  if (typeof lengthCm === "number") parts.push(`L: ${lengthCm} cm`);
  if (typeof widthCm === "number") parts.push(`W: ${widthCm} cm`);
  if (typeof depthCm === "number") parts.push(`D: ${depthCm} cm`);
  return parts.length > 0 ? parts.join(" | ") : "N/A";
};

const parseSiteOfWound = (siteOfWound?: string | null): ParsedSite => {
  const fallback: ParsedSite = {
    woundLocation: "N/A",
    leftRight: "N/A",
    actualPosition: "N/A",
    state: "N/A",
    innerOuter: "N/A",
  };

  if (!siteOfWound) return fallback;
  const raw = siteOfWound.trim();
  if (!raw) return fallback;

  if (!raw.includes("(") || !raw.includes(")")) {
    return { ...fallback, woundLocation: asText(raw) };
  }

  const woundLocation = raw.split("(")[0]?.trim();
  const inBrackets = raw.split("(")[1]?.split(")")[0]?.trim();
  const parts = (inBrackets || "").split("|").map((part) => part.trim());

  return {
    woundLocation: asText(woundLocation),
    leftRight: asText(parts[0]),
    actualPosition: asText(parts[1]),
    state: asText(parts[2]),
    innerOuter: asText(parts[3]),
  };
};

const getImageFormatFromDataUrl = (dataUrl: string): "PNG" | "JPEG" | "WEBP" => {
  if (dataUrl.includes("image/png")) return "PNG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "JPEG";
  return "PNG";
};

const loadImageForPdf = async (
  url?: string
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const dimensionsFromDataUrl = (dataUrl: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      img.onerror = () => reject(new Error("Could not read image dimensions"));
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

const drawFooter = (doc: jsPDF, margin: number, green: [number, number, number], pageNumber: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...green);
  doc.setLineWidth(1);
  doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, pageHeight - 4);
  doc.text(`Page ${pageNumber}`, pageWidth - margin - 12, pageHeight - 4);
};

export const generateWoundPhotographEvaluationPDF = async ({
  residentName,
  woundNumber,
  orgLogoUrl,
  evaluations,
}: GenerateWoundPhotographEvaluationPDFOptions): Promise<void> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const green: [number, number, number] = [34, 197, 94];

  const resolvedOrgLogo = typeof window !== "undefined" ? await loadImageForPdf(orgLogoUrl) : null;
  const rows = evaluations.length > 0 ? evaluations : [];

  if (rows.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("WOUND PHOTOGRAPH EVALUATION", margin, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Resident: ${asText(residentName)}`, margin, 30);
    doc.text(`Wound Number: ${asText(woundNumber)}`, margin, 36);
    doc.text("No photograph evaluations recorded.", margin, 48);
    drawFooter(doc, margin, green, 1);
    doc.save(`wound-photograph-evaluation-${format(new Date(), "dd-MM-yyyy")}.pdf`);
    return;
  }

  for (let index = 0; index < rows.length; index += 1) {
    if (index > 0) doc.addPage();
    const evaluation = rows[index];
    const parsedSite = parseSiteOfWound(evaluation.site_of_wound);

    doc.setFillColor(255, 255, 255);
    doc.rect(margin, margin, pageWidth - margin * 2, 22, "F");
    doc.setFillColor(...green);
    doc.rect(margin, margin + 20, pageWidth - margin * 2, 1.2, "F");

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("WOUND PHOTOGRAPH EVALUATION", margin + 2, margin + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Specialized photograph review layout", margin + 2, margin + 14);

    if (resolvedOrgLogo) {
      try {
        const formatType = getImageFormatFromDataUrl(resolvedOrgLogo.dataUrl);
        const logoHeight = 12;
        const aspect = resolvedOrgLogo.width / resolvedOrgLogo.height;
        const logoWidth = logoHeight * aspect;
        doc.addImage(
          resolvedOrgLogo.dataUrl,
          formatType,
          pageWidth - margin - logoWidth - 1,
          margin + 3,
          logoWidth,
          logoHeight
        );
      } catch {
        // Keep generation resilient if logo rendering fails.
      }
    }

    const y = margin + 30;
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 4, pageWidth - margin, y - 4);

    const labelsAndValues: Array<{ label: string; value: string }> = [
      { label: "Photograph Date", value: asDate(evaluation.photograph_date) },
      { label: "Next Photo Date", value: asDate(evaluation.next_photo_date) },
      { label: "Date", value: asDate(evaluation.photograph_date) },
      { label: "Left/Right", value: parsedSite.leftRight },
      { label: "Actual Position", value: parsedSite.actualPosition },
      { label: "State", value: parsedSite.state },
      { label: "Inner/Outer", value: parsedSite.innerOuter },
      { label: "Wound Location *", value: parsedSite.woundLocation },
      {
        label: "Actual Measurement",
        value: formatMeasurement(evaluation.length_cm, evaluation.width_cm, evaluation.depth_cm),
      },
      { label: "RGN Signature *", value: asText(evaluation.rgn_signature) },
      { label: "Comments", value: asText(evaluation.comment) },
    ];

    const leftX = margin + 2;
    const rightX = pageWidth / 2 + 2;
    const rowHeight = 8;
    const rowsPerColumn = Math.ceil(labelsAndValues.length / 2);

    for (let i = 0; i < labelsAndValues.length; i += 1) {
      const isLeftColumn = i < rowsPerColumn;
      const rowIndex = isLeftColumn ? i : i - rowsPerColumn;
      const x = isLeftColumn ? leftX : rightX;
      const rowY = y + rowIndex * rowHeight;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(`${labelsAndValues[i].label}:`, x, rowY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39);
      const wrapped = doc.splitTextToSize(labelsAndValues[i].value, 78);
      doc.text(wrapped, x + 34, rowY);
    }

    const photoTopY = y + rowsPerColumn * rowHeight + 6;
    const photoAreaHeight = 70;
    const photoAreaWidth = pageWidth - margin * 2 - 4;

    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, photoTopY, photoAreaWidth, photoAreaHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text("Photograph", margin + 4, photoTopY + 5);

    const resolvedPhoto = typeof window !== "undefined" ? await loadImageForPdf(evaluation.photograph_url) : null;
    if (resolvedPhoto) {
      try {
        const formatType = getImageFormatFromDataUrl(resolvedPhoto.dataUrl);
        const availableWidth = photoAreaWidth - 6;
        const availableHeight = photoAreaHeight - 10;
        const imageAspect = resolvedPhoto.width / resolvedPhoto.height;
        let drawWidth = availableWidth;
        let drawHeight = drawWidth / imageAspect;
        if (drawHeight > availableHeight) {
          drawHeight = availableHeight;
          drawWidth = drawHeight * imageAspect;
        }
        const imgX = margin + 2 + (photoAreaWidth - drawWidth) / 2;
        const imgY = photoTopY + 8 + (availableHeight - drawHeight) / 2;
        doc.addImage(resolvedPhoto.dataUrl, formatType, imgX, imgY, drawWidth, drawHeight);
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Image could not be rendered in PDF.", margin + 4, photoTopY + 14);
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("No photograph available.", margin + 4, photoTopY + 14);
    }

    drawFooter(doc, margin, green, index + 1);
  }

  const generatedDate = format(new Date(), "dd-MM-yyyy");
  const fileSafeName = asText(residentName)
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  doc.save(`wound-photograph-evaluation-${fileSafeName || "resident"}-${generatedDate}.pdf`);
};
