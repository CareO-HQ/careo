import { jsPDF } from "jspdf";
import { format, isValid, parseISO } from "date-fns";
import {
  buildCareFileAuditHistoryViewModel,
  type CareFileActionPlanSnapshot,
  type CareFileAuditHistoryPayload,
} from "@/lib/manager-care-file-audit-history";

export interface DownloadCareFileAuditHistoryPdfParams {
  fileName: string;
  title: string;
  residentName: string;
  completedDateIso: string;
  auditor: string;
  payload: CareFileAuditHistoryPayload;
  actionPlansSnapshot: CareFileActionPlanSnapshot[] | undefined;
  orgLogoUrl?: string | null;
}

const PDF_BODY_PT = 10;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawCareOFormHeader(
  doc: jsPDF,
  title: string,
  orgLogoUrl: string | null | undefined
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const headerHeight = 22;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setFillColor(34, 197, 94);
  doc.rect(0, headerHeight - 2, pageWidth, 1, "F");

  doc.setFontSize(PDF_BODY_PT);
  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), margin, 14);

  if (orgLogoUrl) {
    try {
      const logoImg = await loadImage(orgLogoUrl);
      const canvas = document.createElement("canvas");
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
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
      }
    } catch {
      // continue without logo
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_PT);
}

function statusLabelForPdf(status: string): string {
  switch (status) {
    case "compliant":
      return "Compliant";
    case "action-required":
      return "Action required";
    case "non-compliant":
      return "Non-compliant";
    case "not-applicable":
      return "N/A";
    default:
      return "Not reviewed";
  }
}

function normalizePlanStatus(status?: string | null): string {
  const n = (status || "pending").replace(/-/g, "_").toLowerCase();
  if (n === "in_progress") return "In progress";
  if (n === "completed") return "Completed";
  if (n === "overdue") return "Overdue";
  return "Pending";
}

function groupHasPdfContent(group: {
  subsections: { rowsInOrder: { status: string }[] }[];
}): boolean {
  for (const sub of group.subsections) {
    if (sub.rowsInOrder.some((r) => r.status !== "not-reviewed")) {
      return true;
    }
  }
  return false;
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  drawHeader: () => Promise<void>
): Promise<number> {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottom = pageHeight - 16;
  if (y + needed <= bottom) return Promise.resolve(y);
  doc.addPage();
  return drawHeader().then(() => 30);
}

export async function downloadCareFileAuditHistoryPdf(
  params: DownloadCareFileAuditHistoryPdfParams
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageWidth - margin * 2;
  const lineH = 5;
  const gap = 2;

  const redrawHeader = () =>
    drawCareOFormHeader(doc, params.title, params.orgLogoUrl);

  await redrawHeader();
  let y = 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_PT);
  doc.setTextColor(55, 65, 81);

  const metaLines = [
    `Resident: ${params.residentName}`,
    `Completed: ${format(new Date(params.completedDateIso), "PPP p")}`,
    `Auditor: ${params.auditor}`,
  ];
  for (const line of metaLines) {
    y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
    doc.text(line, margin, y);
    y += lineH + gap;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_BODY_PT);
  y = await ensureSpace(doc, y, lineH + 4, redrawHeader);
  doc.text("Checklist items", margin, y);
  y += lineH + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_PT);

  const viewModel = buildCareFileAuditHistoryViewModel(params.payload);

  for (const group of viewModel) {
    if (!groupHasPdfContent(group)) {
      continue;
    }

    y = await ensureSpace(doc, y, lineH + 6, redrawHeader);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_BODY_PT);
    doc.setTextColor(17, 24, 39);
    const groupTitle = `${group.sectionTitle} (${group.reviewedCount}/${group.totalCount})`;
    const groupTitleLines = doc.splitTextToSize(groupTitle, contentW) as string[];
    for (const ln of groupTitleLines) {
      y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
      doc.text(ln, margin, y);
      y += lineH;
    }
    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_BODY_PT);
    doc.setTextColor(55, 65, 81);

    for (const sub of group.subsections) {
      const pdfRows = sub.rowsInOrder.filter((r) => r.status !== "not-reviewed");

      if (pdfRows.length === 0) {
        continue;
      }

      if (sub.subsectionTitle) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(PDF_BODY_PT);
        doc.setTextColor(55, 65, 81);
        const subTitle = `${sub.subsectionTitle} (${sub.reviewedCount}/${sub.totalCount})`;
        const subLines = doc.splitTextToSize(subTitle, contentW - 2) as string[];
        for (const sl of subLines) {
          y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
          doc.text(sl, margin + 2, y);
          y += lineH;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(PDF_BODY_PT);
        y += 2;
      }

      for (const row of pdfRows) {
        const statusText = statusLabelForPdf(row.status);
        const head = `• ${row.text}`;
        const headLines = doc.splitTextToSize(head, contentW - 2) as string[];
        for (const hl of headLines) {
          y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
          doc.text(hl, margin + 2, y);
          y += lineH;
        }
        y += gap;
        y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(PDF_BODY_PT);
        doc.text(`Status: ${statusText}  ·  Source: ${row.source}`, margin + 4, y);
        y += lineH;
        const comment =
          row.comment.trim() ||
          (row.actionRequired
            ? `Action required: ${row.actionRequired}`
            : "") ||
          (row.actionCompleted ? `Action completed: ${row.actionCompleted}` : "");
        const commentLabel = row.comment.trim()
          ? "Comment"
          : row.actionRequired
            ? "Details"
            : row.actionCompleted
              ? "Details"
              : "Comment";
        const cText = comment || "—";
        const cLines = doc.splitTextToSize(
          `${commentLabel}: ${cText}`,
          contentW - 4
        ) as string[];
        for (const cl of cLines) {
          y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
          doc.text(cl, margin + 4, y);
          y += lineH;
        }
        y += 4;
      }
      y += 2;
    }
    y += 4;
  }

  y = await ensureSpace(doc, y, lineH + 8, redrawHeader);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_BODY_PT);
  doc.setTextColor(17, 24, 39);
  doc.text("Action plans", margin, y);
  y += lineH + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_PT);
  doc.setTextColor(55, 65, 81);

  const plans = params.actionPlansSnapshot ?? [];
  if (plans.length === 0) {
    y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "No action plans were stored for this completion.",
      margin,
      y
    );
    y += lineH + gap;
  } else {
    const colPad = 3;
    const wDesc = contentW * 0.48;
    const wStatus = contentW * 0.2;
    const wAssign = Math.max(12, contentW - wDesc - wStatus - colPad * 2);
    const xDesc = margin;
    const xStatus = xDesc + wDesc + colPad;
    const xAssign = xStatus + wStatus + colPad;

    y = await ensureSpace(doc, y, lineH + 4, redrawHeader);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_BODY_PT);
    doc.text("Description", xDesc, y);
    doc.text("Status", xStatus, y);
    doc.text("Assigned to", xAssign, y);
    y += lineH + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_BODY_PT);

    for (const plan of plans) {
      const assignee =
        plan.assigned_to_name?.trim() ||
        plan.assigned_to_email?.trim() ||
        "—";
      let due = "—";
      if (plan.due_date != null && plan.due_date !== "") {
        const d = parseISO(String(plan.due_date));
        due = isValid(d) ? format(d, "dd MMM yyyy") : String(plan.due_date);
      }
      const st = normalizePlanStatus(plan.status);
      const comment = plan.latest_comment?.trim() || "—";
      const desc = (plan.description && plan.description.trim()) || "—";

      const descLines = doc.splitTextToSize(desc, wDesc) as string[];
      const statusLines = doc.splitTextToSize(st, wStatus) as string[];
      const assignLines = doc.splitTextToSize(assignee, wAssign) as string[];
      const rowCount = Math.max(
        descLines.length,
        statusLines.length,
        assignLines.length
      );

      for (let i = 0; i < rowCount; i++) {
        y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
        doc.text(descLines[i] ?? "", xDesc, y);
        doc.text(statusLines[i] ?? "", xStatus, y);
        doc.text(assignLines[i] ?? "", xAssign, y);
        y += lineH;
      }

      const metaLine = `Priority: ${plan.priority ?? "—"} · Due: ${due}`;
      const metaLines = doc.splitTextToSize(metaLine, contentW) as string[];
      for (const ml of metaLines) {
        y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
        doc.text(ml, xDesc, y);
        y += lineH;
      }

      const commentLines = doc.splitTextToSize(
        `Comments: ${comment}`,
        contentW
      ) as string[];
      for (const cl of commentLines) {
        y = await ensureSpace(doc, y, lineH + gap, redrawHeader);
        doc.text(cl, xDesc, y);
        y += lineH;
      }

      y += 4;
    }
  }

  doc.save(params.fileName);
}
