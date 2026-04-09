import jsPDF from "jspdf";
import { format } from "date-fns";

type InitialWoundAssessmentRecord = {
  id?: string;
  assessment_completed_by?: string | null;
  assessment_date?: string | null;
  date_wound_occurred?: string | null;
  wound_location?: string | null;
  type_of_wound?: string | null;
  maximum_length?: number | null;
  maximum_width?: number | null;
  maximum_depth?: number | null;
  necrotic_percentage?: number | null;
  sloughy_percentage?: number | null;
  granulation_percentage?: number | null;
  epithelialisation_percentage?: number | null;
  evidence_of_infection?: boolean | null;
  exudate_type?: string | null;
  exudate_colour?: string | null;
  exudate_volume?: string | null;
  any_malodour_noted?: boolean | null;
  wound_margin_colour?: string | null;
  any_oedema?: boolean | null;
  any_heat?: boolean | null;
  surrounding_erythema?: boolean | null;
  max_distance_from_margin?: number | null;
  condition_of_surrounding_skin?: string | null;
  any_pain_from_wound?: boolean | null;
  pain_severity?: number | null;
  pain_frequency?: string | null;
  wound_photographed?: boolean | null;
  body_map_completed?: boolean | null;
  wound_swab_sent?: boolean | null;
  braden_reevaluated?: boolean | null;
  braden_score?: number | null;
  must_score?: number | null;
};

type GenerateInitialWoundAssessmentPDFOptions = {
  residentName: string;
  residentDOB?: string;
  orgLogoUrl?: string;
  woundNumber?: number;
  assessment: InitialWoundAssessmentRecord;
};

const asText = (value?: string | null): string => {
  if (!value) return "N/A";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "N/A";
};

const asDate = (value?: string | null, dateFormat = "dd/MM/yyyy"): string => {
  if (!value) return "N/A";
  return format(new Date(value), dateFormat);
};

const asNumber = (value?: number | null, suffix?: string): string => {
  if (value === null || value === undefined) return "N/A";
  return suffix ? `${value} ${suffix}` : `${value}`;
};

const asPercent = (value?: number | null): string => {
  if (value === null || value === undefined) return "0%";
  return `${value}%`;
};

const asYesNo = (value?: boolean | null): "Yes" | "No" => {
  return value === true ? "Yes" : "No";
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

export const generateInitialWoundAssessmentPDF = async ({
  residentName,
  residentDOB,
  orgLogoUrl,
  woundNumber,
  assessment,
}: GenerateInitialWoundAssessmentPDFOptions): Promise<void> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const baseLabelWidth = 72;
  const baseValueWidth = contentWidth - baseLabelWidth;
  const startY = 30;
  let y = startY;
  const resolvedOrgLogo = typeof window !== "undefined" ? await loadOrgLogoForPdf(orgLogoUrl) : null;

  // Single-page mode is intentionally hard-enabled for this PDF only.
  const estimateRowHeight = (value: string): number => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(value || "N/A", baseValueWidth - 3);
    return Math.max(6, wrapped.length * 4 + 2);
  };

  const sections: Array<{ title: string; rows: Array<{ label: string; value: string }> }> = [
    {
      title: "Assessment Information",
      rows: [
        { label: "Assessment completed by", value: asText(assessment.assessment_completed_by) },
        { label: "Assessment date", value: asDate(assessment.assessment_date) },
      ],
    },
    {
      title: "Wound",
      rows: [
        { label: "Date wound occurred/noted", value: asDate(assessment.date_wound_occurred) },
        { label: "Wound location", value: asText(assessment.wound_location) },
        { label: "Type of wound", value: asText(assessment.type_of_wound) },
      ],
    },
    {
      title: "Wound Size (cm)",
      rows: [
        { label: "Maximum length", value: asNumber(assessment.maximum_length, "cm") },
        { label: "Maximum width", value: asNumber(assessment.maximum_width, "cm") },
        { label: "Maximum depth", value: asNumber(assessment.maximum_depth, "cm") },
      ],
    },
    {
      title: "Wound Bed (%)",
      rows: [
        { label: "Necrotic", value: asPercent(assessment.necrotic_percentage) },
        { label: "Sloughy", value: asPercent(assessment.sloughy_percentage) },
        { label: "Granulation", value: asPercent(assessment.granulation_percentage) },
        { label: "Epithelialisation", value: asPercent(assessment.epithelialisation_percentage) },
        { label: "Evidence of infection", value: asYesNo(assessment.evidence_of_infection) },
      ],
    },
    {
      title: "Exudate",
      rows: [
        { label: "Type", value: asText(assessment.exudate_type) },
        { label: "Colour", value: asText(assessment.exudate_colour) },
        { label: "Volume", value: asText(assessment.exudate_volume) },
        { label: "Any malodour noted", value: asYesNo(assessment.any_malodour_noted) },
      ],
    },
    {
      title: "Wound Margin",
      rows: [
        { label: "Colour", value: asText(assessment.wound_margin_colour) },
        { label: "Any oedema", value: asYesNo(assessment.any_oedema) },
        { label: "Any heat", value: asYesNo(assessment.any_heat) },
        { label: "Surrounding erythema", value: asYesNo(assessment.surrounding_erythema) },
        {
          label: "Maximum distance from margin",
          value: asNumber(assessment.max_distance_from_margin, "cm"),
        },
        {
          label: "Condition of surrounding skin",
          value: asText(assessment.condition_of_surrounding_skin),
        },
      ],
    },
    {
      title: "Pain",
      rows: [
        { label: "Any pain from wound", value: asYesNo(assessment.any_pain_from_wound) },
        { label: "Pain severity (1-10)", value: asNumber(assessment.pain_severity) },
        { label: "Pain frequency", value: asText(assessment.pain_frequency) },
      ],
    },
    {
      title: "Documentation Checklist",
      rows: [
        { label: "Wound photographed", value: asYesNo(assessment.wound_photographed) },
        { label: "Body map completed", value: asYesNo(assessment.body_map_completed) },
        { label: "Wound swab sent", value: asYesNo(assessment.wound_swab_sent) },
        { label: "Braden re-evaluated", value: asYesNo(assessment.braden_reevaluated) },
        { label: "Braden score", value: asNumber(assessment.braden_score) },
        { label: "MUST score", value: asNumber(assessment.must_score) },
      ],
    },
  ];

  const baseTitleHeight = 7;
  const baseMetaBlockHeight = 11;
  const baseSectionGap = 0;

  let estimatedContentHeight = baseMetaBlockHeight;
  for (const section of sections) {
    estimatedContentHeight += baseTitleHeight + baseSectionGap;
    for (const row of section.rows) {
      estimatedContentHeight += estimateRowHeight(row.value);
    }
  }

  const availableHeight = pageHeight - margin - startY;
  const scale = Math.max(0.58, Math.min(1, availableHeight / estimatedContentHeight));
  const scaledLabelWidth = baseLabelWidth * scale;
  const scaledValueWidth = contentWidth - scaledLabelWidth;

  const drawHeader = (): void => {
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, "F");
    doc.setFillColor(34, 197, 94);
    doc.rect(0, headerHeight - 2, pageWidth, 1, "F");

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(10, 16 * scale));
    doc.text("INITIAL WOUND ASSESSMENT", margin, 14);

    if (resolvedOrgLogo) {
      try {
        const fmt = getImageFormatFromDataUrl(resolvedOrgLogo.dataUrl);
        const logoHeight = Math.max(8, 14 * scale);
        const aspect = resolvedOrgLogo.width / resolvedOrgLogo.height;
        const logoWidth = logoHeight * aspect;
        doc.addImage(
          resolvedOrgLogo.dataUrl,
          fmt,
          pageWidth - margin - logoWidth,
          (headerHeight - logoHeight) / 2,
          logoWidth,
          logoHeight
        );
      } catch {
        // Keep PDF generation resilient if logo rendering fails.
      }
    }
  };

  const sectionTitle = (title: string): void => {
    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(241, 245, 249);
    const titleHeight = Math.max(4.6, baseTitleHeight * scale);
    doc.rect(margin, y, contentWidth, titleHeight, "D");
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, titleHeight, "F");
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, y, Math.max(1, 1.5 * scale), titleHeight, "F");
    doc.setDrawColor(34, 197, 94);
    doc.rect(margin, y, contentWidth, titleHeight, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(6.5, 10 * scale));
    doc.text(title.toUpperCase(), margin + Math.max(2, 4 * scale), y + titleHeight * 0.68);
    y += titleHeight;
  };

  const fieldRow = (label: string, value: string): void => {
    const safeValue = value || "N/A";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(Math.max(6, 9 * scale));
    const wrapped = doc.splitTextToSize(safeValue, scaledValueWidth - 2);
    const rowHeight = Math.max(4.2, Math.max(6, wrapped.length * 4 + 2) * scale);

    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, scaledLabelWidth, rowHeight, "FD");
    doc.rect(margin + scaledLabelWidth, y, scaledValueWidth, rowHeight, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(5.8, 8.2 * scale));
    doc.text(label, margin + Math.max(1, 2 * scale), y + Math.max(2.8, 4.5 * scale));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(Math.max(6, 9 * scale));
    doc.text(wrapped, margin + scaledLabelWidth + Math.max(1, 2 * scale), y + Math.max(2.8, 4.5 * scale));
    y += rowHeight;
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(Math.max(6.5, 10 * scale));
  doc.text(`Resident: ${residentName || "N/A"}`, margin, y);
  if (typeof woundNumber === "number") {
    doc.text(`Wound #${woundNumber}`, pageWidth - margin, y, { align: "right" });
  }
  y += Math.max(3.2, 5 * scale);
  doc.text(`Date of Birth: ${residentDOB ? asDate(residentDOB) : "N/A"}`, margin, y);
  y += Math.max(3.6, 6 * scale);

  for (const section of sections) {
    sectionTitle(section.title);
    for (const row of section.rows) {
      fieldRow(row.label, row.value);
    }
  }

  const generatedDate = format(new Date(), "dd-MM-yyyy");
  const fileSafeName = residentName
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  doc.save(`initial-wound-assessment-${fileSafeName || "resident"}-${generatedDate}.pdf`);
};

