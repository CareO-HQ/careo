import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export const runtime = "nodejs";

function formatDate(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return format(date, "PPP");
}

function formatDateTime(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return format(date, "PPP 'at' p");
}

function generatePDF(data: any): ArrayBuffer {
  // A4 size: 210 x 297 mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  // --- Helper Functions ---
  const addPageIfNeeded = (heightNeeded: number) => {
    if (currentY + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      currentY = margin;
    }
  };

  const drawSectionHeader = (title: string) => {
    addPageIfNeeded(15);
    doc.setFillColor(37, 99, 235); // primary color (blue-600)
    doc.rect(margin, currentY, 2, 6, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39); // gray-900
    doc.text(title, margin + 4, currentY + 5);
    
    currentY += 10;
    doc.setDrawColor(229, 231, 235); // border-b color (gray-200)
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 8;
  };

  const drawFieldBox = (label: string, value: string, x: number, width: number, height: number = 20) => {
    addPageIfNeeded(height + 10);
    
    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(label, x, currentY);
    
    // Box
    const boxY = currentY + 3;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, boxY, width, height, 2, 2, "FD");
    
    // Value
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const displayValue = value || "-";
    
    // Handle text wrapping
    const textLines = doc.splitTextToSize(displayValue, width - 4);
    doc.text(textLines, x + 2, boxY + 6);
    
    return boxY + height + 8; // Return next Y position
  };

  const drawTwoColumnRow = (label1: string, val1: string, label2: string, val2: string, height: number = 10) => {
    const colWidth = (contentWidth - 10) / 2;
    const startY = currentY;
    
    drawFieldBox(label1, val1, margin, colWidth, height);
    const nextY = drawFieldBox(label2, val2, margin + colWidth + 10, colWidth, height);
    
    currentY = Math.max(startY + height + 15, nextY);
  };
  
  const drawOneColumnRow = (label: string, value: string, height: number = 20) => {
    const nextY = drawFieldBox(label, value, margin, contentWidth, height);
    currentY = nextY;
  };

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Pre-Admission Assessment", margin, currentY);
  currentY += 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // text-muted-foreground (gray-500)
  doc.text("Record pre-admission details and suitability for the resident.", margin, currentY);
  currentY += 15;

  // --- Section 1: Consent ---
  drawSectionHeader("Consent");
  addPageIfNeeded(25);
  doc.setFillColor(248, 250, 252); // bg-card
  doc.setDrawColor(226, 232, 240); // border
  doc.roundedRect(margin, currentY, contentWidth, 20, 3, 3, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("✓", margin + 5, currentY + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("The person being assessed agrees to the assessment being completed", margin + 12, currentY + 8);
  
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Consent accepted at: ${formatDateTime(data.consentAcceptedAt)}`, margin + 12, currentY + 14);
  currentY += 30;

  // --- Section 2: Administrative Details ---
  drawSectionHeader("Administrative Details");
  drawTwoColumnRow("Care Home Name", data.careHomeName, "NHS Number", data.nhsHealthCareNumber);
  drawTwoColumnRow("Assessing Worker", data.userName, "Job Role", data.jobRole);
  drawOneColumnRow("Assessment Date", formatDate(data.date), 10);

  // --- Section 3: Resident Information ---
  drawSectionHeader("Resident Information");
  drawTwoColumnRow("First Name", data.firstName, "Last Name", data.lastName);
  drawOneColumnRow("Current Address", data.address, 20);
  drawTwoColumnRow("Phone Number", data.phoneNumber, "Ethnicity", data.ethnicity);
  drawTwoColumnRow("Gender", data.gender, "Religion", data.religion);
  drawOneColumnRow("Date of Birth", formatDate(data.dateOfBirth), 10);

  // --- Section 4: Next of Kin ---
  drawSectionHeader("Next of Kin");
  drawTwoColumnRow("First Name", data.kinFirstName, "Last Name", data.kinLastName);
  drawTwoColumnRow("Relationship", data.kinRelationship, "Phone Number", data.kinPhoneNumber);

  // --- Section 5: Professional Contacts ---
  drawSectionHeader("Professional Contacts");
  drawTwoColumnRow("Care Manager Name", data.careManagerName, "Care Manager Phone", data.careManagerPhoneNumber);
  drawTwoColumnRow("District Nurse Name", data.districtNurseName, "District Nurse Phone", data.districtNursePhoneNumber);
  drawTwoColumnRow("General Practitioner Name", data.generalPractitionerName, "GP Phone", data.generalPractitionerPhoneNumber);
  drawTwoColumnRow("Provider Name", data.providerHealthcareInfoName, "Designation", data.providerHealthcareInfoDesignation);

  // --- Section 6: Medical Assessment ---
  drawSectionHeader("Medical Assessment");
  drawOneColumnRow("Known Allergies", data.allergies, 20);
  drawOneColumnRow("Medical History & Diagnoses", data.medicalHistory, 30);
  drawOneColumnRow("Medications Prescribed", data.medicationPrescribed, 25);

  // --- Section 7: Activities of Daily Living ---
  drawSectionHeader("Activities of Daily Living");
  drawTwoColumnRow("Consent Capacity Rights", data.consentCapacityRights, "Medication", data.medication, 25);
  drawTwoColumnRow("Mobility", data.mobility, "Nutrition", data.nutrition, 25);
  drawTwoColumnRow("Continence", data.continence, "Hygiene Dressing", data.hygieneDressing, 25);
  drawTwoColumnRow("Skin", data.skin, "Cognition", data.cognition, 25);
  drawTwoColumnRow("Infection", data.infection, "Breathing", data.breathing, 25);
  drawOneColumnRow("Altered State of Consciousness", data.alteredStateOfConsciousness, 25);

  // --- Section 8: Legal & End of Life ---
  drawSectionHeader("Legal & End of Life");
  drawTwoColumnRow("DNACPR", data.dnacpr ? "Yes" : "No", "Advanced Decision", data.advancedDecision ? "Yes" : "No");
  drawTwoColumnRow("Capacity", data.capacity ? "Yes" : "No", "Advanced Care Plan", data.advancedCarePlan ? "Yes" : "No");
  drawOneColumnRow("Palliative Care Comments", data.comments, 20);

  // --- Section 9: Resident Preferences ---
  drawSectionHeader("Resident Preferences");
  drawTwoColumnRow("Room Preferences", data.roomPreferences, "Admission Contact", data.admissionContact, 20);
  drawTwoColumnRow("Food Preferences", data.foodPreferences, "Preferred Name", data.preferedName, 20);
  drawOneColumnRow("Family Concerns", data.familyConcerns, 20);

  // --- Section 10: Financial & Final Details ---
  drawSectionHeader("Financial & Final Details");
  drawOneColumnRow("Does anyone attend to finances?", data.attendFinances ? "Yes" : "No", 10);
  drawOneColumnRow("Additional Considerations", data.additionalConsiderations, 20);
  
  // Outcome highlighted box
  addPageIfNeeded(35);
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(margin, currentY, contentWidth, 30, 3, 3, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("Assessment Outcome", margin + 5, currentY + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const outcomeLines = doc.splitTextToSize(data.outcome || "-", contentWidth - 10);
  doc.text(outcomeLines, margin + 5, currentY + 14);
  currentY += 35;

  drawOneColumnRow("Planned Admission Date", formatDate(data.plannedAdmissionDate), 10);

  // --- Footer on all pages ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    const footerText = `Pre-Admission Assessment Form - ${data.careHomeName} | Page ${i} of ${pageCount}`;
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    
    doc.text(`Generated on ${formatDateTime(Date.now())}`, margin, doc.internal.pageSize.getHeight() - 10);
  }

  return doc.output("arraybuffer");
}

export async function POST(request: NextRequest) {
  try {
    // Check for API token authentication (server-to-server)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Form data is required" },
        { status: 400 }
      );
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      firstName: assessmentData.firstName || assessmentData.assessment_data?.firstName || "Resident",
      lastName: assessmentData.lastName || assessmentData.assessment_data?.lastName || "",
      careHomeName: assessmentData.careHomeName || assessmentData.assessment_data?.careHomeName || "Care Home",
      date: assessmentData.date || assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      userName: assessmentData.userName || assessmentData.completedBy || assessmentData.completed_by || "Staff Member",
      jobRole: assessmentData.jobRole || assessmentData.job_role || "Staff",
    };

    console.log("Pre-Admission PDF API flattening data:", {
      firstName: flattenedData.firstName,
      lastName: flattenedData.lastName,
      formId: flattenedData._id || flattenedData.id
    });

    // Generate PDF Buffer using jsPDF
    const pdfArrayBuffer = generatePDF(flattenedData);
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pre-admission-form-${flattenedData.firstName?.replace(/\s+/g, "-") || "resident"}-${flattenedData.lastName?.replace(/\s+/g, "-") || ""}.pdf"`,
        "Content-Length": pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

