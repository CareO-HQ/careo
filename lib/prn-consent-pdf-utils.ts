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

export function generatePRNConsentPDF(
  data: Record<string, unknown>,
  residentName?: string
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PRN Care Consent Form", margin, y);
  y += 10;

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
  doc.text(Boolean(data.understandsPRN) ? "[X]" : "[ ]", margin, y);
  doc.text("I understand what PRN medication means", margin + 10, y);
  y += 6;

  doc.text(Boolean(data.agreesToPRN) ? "[X]" : "[ ]", margin, y);
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

  // Footer
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
export function printPRNConsentPDF(
  data: Record<string, unknown>,
  residentName?: string
): void {
  const doc = generatePRNConsentPDF(data, residentName);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) {
    let printed = false;
    win.onload = () => {
      if (printed) return;
      printed = true;
      win.print();
      URL.revokeObjectURL(url);
    };
  } else {
    // Fallback: download if popup blocked
    const fileName = `PRN-Care-Consent${residentName ? `-${residentName.replace(/\s+/g, "-")}` : ""}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
    URL.revokeObjectURL(url);
  }
}
