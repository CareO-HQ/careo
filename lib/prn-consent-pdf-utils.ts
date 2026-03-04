import jsPDF from "jspdf";
import { format } from "date-fns";

function safeDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string | number);
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function text(doc: jsPDF, str: string, x: number, y: number, maxWidth?: number): number {
  const lines = maxWidth ? doc.splitTextToSize(str, maxWidth) : [str];
  doc.text(lines, x, y);
  return y + lines.length * 5;
}

interface PRNPdfOptions {
  orgLogoUrl?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generatePRNConsentPDF(
  data: Record<string, unknown>,
  residentName?: string,
  options?: PRNPdfOptions
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header background
  const headerHeight = 26;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Optional organisation logo
  if (options?.orgLogoUrl) {
    try {
      const logoImg = await loadImage(options.orgLogoUrl);
      const canvas = document.createElement("canvas");
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(logoImg, 0, 0);
        const logoDataUrl = canvas.toDataURL("image/png");
        const logoTargetHeight = 12;
        const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
        const logoWidth = logoTargetHeight * aspect;
        const logoX = pageWidth - margin - logoWidth;
        const logoY = (headerHeight - logoTargetHeight) / 2;
        doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoTargetHeight);
      }
    } catch {
      // Ignore logo loading errors – continue without logo
    }
  }

  // Green brand bar directly under the header (to match care-file PDFs)
  doc.setFillColor(34, 197, 94); // Tailwind emerald-500
  doc.rect(0, headerHeight - 2, pageWidth, 2, "F");

  // Title and subtitle
  let y = 12;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("PRN Care Consent Form", margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  const residentLabel = residentName || String(data.residentName ?? "") || "Resident";
  doc.text(String(residentLabel), margin, y);

  // Move below header
  y = headerHeight + 8;

  // Introduction box
  doc.setFillColor(239, 246, 255); // blue-50
  doc.rect(margin, y, pageWidth - margin * 2, 22, "F");
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageWidth - margin * 2, 22, "S");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 58, 138);
  const intro =
    'PRN (Pro Re Nata) means "as needed" medication. This consent form authorizes care staff to administer PRN medications according to the resident\'s care plan and medical directives.';
  y = text(doc, intro, margin + 4, y + 8, pageWidth - margin * 2 - 8) + 6;

  // Resident Information
  y += 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("RESIDENT INFORMATION", margin, y);
  doc.line(margin, y + 1, pageWidth - margin, y + 1);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Resident Name", margin, y);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.residentName ?? "—"), margin + 50, y);
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("Room Number", margin, y);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.bedroomNumber ?? "—"), margin + 50, y);
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("Date of Birth", margin, y);
  doc.setTextColor(0, 0, 0);
  doc.text(safeDate(data.dateOfBirth), margin + 50, y);
  y += 12;

  // Consent Agreement
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("CONSENT AGREEMENT", margin, y);
  doc.line(margin, y + 1, pageWidth - margin, y + 1);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text((data.understandsPRN ? "[X]" : "[ ]") as string, margin, y);
  doc.text("I understand what PRN medication means", margin + 10, y);
  y += 6;

  doc.text((data.agreesToPRN ? "[X]" : "[ ]") as string, margin, y);
  doc.text("I consent to PRN medication administration", margin + 10, y);
  y += 8;

  if (data.medicationTypes) {
    doc.setTextColor(100, 100, 100);
    doc.text("Specific Medication Types Consented:", margin, y);
    y += 5;
    doc.setTextColor(0, 0, 0);
    y = text(doc, String(data.medicationTypes), margin, y, pageWidth - margin * 2) + 4;
  }

  if (data.additionalNotes) {
    doc.setTextColor(100, 100, 100);
    doc.text("Additional Notes:", margin, y);
    y += 5;
    doc.setTextColor(0, 0, 0);
    y = text(doc, String(data.additionalNotes), margin, y, pageWidth - margin * 2) + 6;
  }

  y += 4;

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("SIGNATURES", margin, y);
  doc.line(margin, y + 1, pageWidth - margin, y + 1);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Resident Signature", margin, y);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.residentSignature ?? "—"), margin + 55, y);
  y += 8;

  if (data.representativeName) {
    doc.setTextColor(100, 100, 100);
    doc.text("Representative Name", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.representativeName), margin + 55, y);
    y += 6;

    doc.setTextColor(100, 100, 100);
    doc.text("Relationship", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.representativeRelationship ?? "—"), margin + 55, y);
    y += 6;

    doc.setTextColor(100, 100, 100);
    doc.text("Representative Signature", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.representativeSignature ?? "—"), margin + 55, y);
    y += 6;

    doc.setTextColor(100, 100, 100);
    doc.text("Date Signed", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.text(safeDate(data.representativeDate), margin + 55, y);
    y += 10;
  }

  // Staff Verification
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("STAFF VERIFICATION", margin, y);
  doc.line(margin, y + 1, pageWidth - margin, y + 1);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Staff Name", margin, y);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.nameStaff ?? "—"), margin + 45, y);
  y += 6;

  doc.setTextColor(100, 100, 100);
  doc.text("Date Completed", margin, y);
  doc.setTextColor(0, 0, 0);
  doc.text(safeDate(data.date), margin + 45, y);
  y += 12;

  // Footer text at bottom of page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated by CareO on ${format(new Date(), "dd MMM yyyy HH:mm")}`,
    margin,
    doc.internal.pageSize.getHeight() - 10
  );

  return doc;
}

/** Generate PDF and open in new window for printing. */
export async function printPRNConsentPDF(
  data: Record<string, unknown>,
  residentName?: string,
  options?: PRNPdfOptions
): Promise<void> {
  const doc = await generatePRNConsentPDF(data, residentName, options);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  try {
    // Use a hidden iframe to ensure the print dialog opens exactly once
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.src = url;

    iframe.onload = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          iframeWindow.focus();
          iframeWindow.print();
        }
      } finally {
        // Give the browser a moment to open the dialog before cleanup
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          URL.revokeObjectURL(url);
        }, 1000);
      }
    };

    document.body.appendChild(iframe);
  } catch {
    // Fallback: download if printing via iframe fails
    const fileName = `PRN-Care-Consent${
      residentName ? `-${residentName.replace(/\s+/g, "-")}` : ""
    }-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
    URL.revokeObjectURL(url);
  }
}
