import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatInTimeZone } from "date-fns-tz";
import { UK_TIMEZONE } from "@/lib/date-utils";

type EntryType = "bowel" | "urine";

interface RecordedByUser {
  name?: string | null;
  email?: string | null;
}

export interface ContinencePdfEntry {
  date: string;
  time?: string | null;
  entry_type: EntryType;
  stool_type?: string | null;
  bowel_size?: string | null;
  urine_amount?: string | null;
  urine_color?: string | null;
  continence_aid?: string | null;
  notes?: string | null;
  recorded_by_user?: RecordedByUser | null;
}

interface ResidentLike {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  room_number?: string | null;
  care_home_name?: string | null;
}

export interface GenerateContinencePDFOptions {
  resident: ResidentLike;
  entries: ContinencePdfEntry[];
  title: string;
  periodLabel: string;
  orgLogoUrl?: string;
  careHomeName?: string;
}

const stoolTypeMap: Record<string, string> = {
  type_1: "Type 1 - Separate hard lumps",
  type_2: "Type 2 - Lumpy and sausage like",
  type_3: "Type 3 - Sausage shape with cracks",
  type_4: "Type 4 - Smooth, soft sausage/snake",
  type_5: "Type 5 - Soft blobs with clear-cut edges",
  type_6: "Type 6 - Mushy consistency with ragged edges",
  type_7: "Type 7 - Liquid with no solid pieces",
};

const toTitleCase = (value: string): string =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => (part.length > 0 ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");

export const generateContinencePDF = async ({
  resident,
  entries,
  title,
  periodLabel,
  orgLogoUrl,
  careHomeName,
}: GenerateContinencePDFOptions): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
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
      doc.addImage(logoDataUrl, "PNG", pageWidth - margin - logoW, (headerHeight - 2 - logoSize) / 2, logoW, logoSize);
    } catch (error) {
      console.warn("Failed to load organization logo", error);
    }
  };

  await drawHeader(title, periodLabel);

  const fullName = [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join(" ");
  const careHome = careHomeName || resident.care_home_name || "--";
  const dob = resident.date_of_birth
    ? formatInTimeZone(new Date(resident.date_of_birth), UK_TIMEZONE, "dd/MM/yyyy")
    : "--";
  const room = resident.room_number || "--";

  autoTable(doc, {
    startY: 25,
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
    body: [
      [{ content: "Name of Home:", styles: { fontStyle: "bold" } }, { content: careHome, colSpan: 3 }],
      [
        { content: "Resident's Name:", styles: { fontStyle: "bold" } },
        { content: fullName || "--" },
        { content: "Date of Birth:", styles: { fontStyle: "bold" } },
        { content: dob },
      ],
      [{ content: "Room No:", styles: { fontStyle: "bold" } }, { content: room, colSpan: 3 }],
    ],
  });

  const sortedEntries = [...entries].sort((a, b) => {
    const aDate = `${a.date || ""} ${a.time || ""}`;
    const bDate = `${b.date || ""} ${b.time || ""}`;
    return aDate.localeCompare(bDate);
  });

  const tableBody =
    sortedEntries.length > 0
      ? sortedEntries.map((entry) => {
          const entryTypeLabel = entry.entry_type === "bowel" ? "Bowel" : "Urine";
          const details =
            entry.entry_type === "bowel"
              ? [
                  entry.stool_type ? stoolTypeMap[entry.stool_type] || toTitleCase(entry.stool_type) : null,
                  entry.bowel_size ? `Size: ${String(entry.bowel_size).toUpperCase()}` : null,
                ]
                  .filter(Boolean)
                  .join(" | ") || "--"
              : [
                  entry.urine_amount ? `Amount: ${entry.urine_amount}` : null,
                  entry.urine_color ? `Color: ${toTitleCase(entry.urine_color)}` : null,
                  entry.continence_aid ? `Aid: ${toTitleCase(entry.continence_aid)}` : null,
                ]
                  .filter(Boolean)
                  .join(" | ") || "--";
          const staff = entry.recorded_by_user?.name || entry.recorded_by_user?.email || "Staff";
          const dateText = entry.date
            ? formatInTimeZone(new Date(`${entry.date}T00:00:00`), UK_TIMEZONE, "dd/MM/yyyy")
            : "--";
          return [dateText, entry.time || "--", entryTypeLabel, details, entry.notes || "--", staff];
        })
      : [["--", "--", "--", "No continence entries found for this period.", "--", "--"]];

  autoTable(doc, {
    startY: (docWithAutoTable.lastAutoTable?.finalY ?? 25) + 5,
    head: [["Date", "Time", "Type", "Details", "Comments", "Staff Name"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 16 },
      2: { cellWidth: 15 },
      3: { cellWidth: 55 },
      4: { cellWidth: 45 },
      5: { cellWidth: 30 },
    },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, "dd/MM/yyyy HH:mm")} UK Time • CareO Management System`, margin, pageHeight - 10);
      doc.text(`Page ${data.pageNumber}`, pageWidth - margin - 20, pageHeight - 10);
    },
  });

  const safeName = [resident.first_name, resident.middle_name, resident.last_name]
    .filter(Boolean)
    .join("-")
    .replace(/\s+/g, "-");
  const safeTitle = title.toLowerCase().replace(/\s+/g, "-");
  const timestamp = formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy-MM-dd");
  doc.save(`${safeTitle}-${safeName || "resident"}-${timestamp}.pdf`);
};
