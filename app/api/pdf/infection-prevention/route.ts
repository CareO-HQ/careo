import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const runtime = "nodejs";

// Create a Convex client for server-side usage
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function formatDate(dateString?: string): string {
  if (!dateString) return "Not provided";
  return new Date(dateString).toLocaleDateString("en-GB");
}

function formatDateTime(timestamp: number): string {
  return (
    new Date(timestamp).toLocaleDateString("en-GB") +
    " at " +
    new Date(timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function generateInfectionPreventionHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Infection Prevention Assessment</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
          color: #111827;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 24px;
          margin-bottom: 32px;
        }
        h1 {
          font-size: 1.875rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #111827;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
        }
        h3 {
          font-weight: 500;
          margin-bottom: 4px;
          color: #111827;
        }
        .grid {
          display: grid;
          gap: 16px;
        }
        .grid-cols-2 {
          grid-template-columns: 1fr 1fr;
        }
        .grid-cols-3 {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .section {
          margin-bottom: 32px;
        }
        .info-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 12px;
          color: #374151;
        }
        .yes-no {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
          color: white;
        }
        .yes {
          background-color: #10b981;
        }
        .no {
          background-color: #ef4444;
        }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
        }
        strong {
          font-weight: 600;
        }
        .subsection {
          margin-bottom: 16px;
        }
        .space-y-2 > * + * {
          margin-top: 8px;
        }
        .space-y-4 > * + * {
          margin-top: 16px;
        }
        @media print {
          body { max-width: none; margin: 0; padding: 16px; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>Infection Prevention Assessment</h1>
        <div class="grid grid-cols-2">
          <div>
            <p><strong>Resident Name:</strong> ${data.name}</p>
            <p><strong>Date of Birth:</strong> ${data.dateOfBirth}</p>
            <p><strong>Assessment Type:</strong> ${data.assessmentType}</p>
          </div>
          <div>
            <p><strong>Completed by:</strong> ${data.completedBy}</p>
            <p><strong>Job Role:</strong> ${data.jobRole}</p>
            <p><strong>Date:</strong> ${formatDate(data.completionDate)}</p>
          </div>
        </div>
      </div>

      <!-- Person's Details -->
      <div class="section">
        <h2>Person's Details</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Home Address:</strong> ${data.homeAddress}</p>
            <p><strong>Information Provided By:</strong> ${data.informationProvidedBy || "Not specified"}</p>
            <p><strong>Admitted From:</strong> ${data.admittedFrom || "Not specified"}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Consultant GP:</strong> ${data.consultantGP || "Not specified"}</p>
            <p><strong>Reason for Admission:</strong> ${data.reasonForAdmission || "Not specified"}</p>
            <p><strong>Date of Admission:</strong> ${formatDate(data.dateOfAdmission)}</p>
          </div>
        </div>
      </div>

      <!-- Acute Respiratory Illness (ARI) -->
      <div class="section">
        <h2>Acute Respiratory Illness (ARI)</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>New Continuous Cough:</strong> <span class="yes-no ${data.newContinuousCough ? "yes" : "no"}">${data.newContinuousCough ? "Yes" : "No"}</span></p>
            <p><strong>Worsening Cough:</strong> <span class="yes-no ${data.worseningCough ? "yes" : "no"}">${data.worseningCough ? "Yes" : "No"}</span></p>
            <p><strong>High Temperature:</strong> <span class="yes-no ${data.temperatureHigh ? "yes" : "no"}">${data.temperatureHigh ? "Yes" : "No"}</span></p>
            <p><strong>Tested for Covid-19:</strong> <span class="yes-no ${data.testedForCovid19 ? "yes" : "no"}">${data.testedForCovid19 ? "Yes" : "No"}</span></p>
          </div>
          <div class="space-y-2">
            <p><strong>Tested for Influenza A:</strong> <span class="yes-no ${data.testedForInfluenzaA ? "yes" : "no"}">${data.testedForInfluenzaA ? "Yes" : "No"}</span></p>
            <p><strong>Tested for Influenza B:</strong> <span class="yes-no ${data.testedForInfluenzaB ? "yes" : "no"}">${data.testedForInfluenzaB ? "Yes" : "No"}</span></p>
            <p><strong>Tested for Respiratory Screen:</strong> <span class="yes-no ${data.testedForRespiratoryScreen ? "yes" : "no"}">${data.testedForRespiratoryScreen ? "Yes" : "No"}</span></p>
            <p><strong>Influenza B Result:</strong> <span class="yes-no ${data.influenzaB ? "yes" : "no"}">${data.influenzaB ? "Positive" : "Negative"}</span></p>
          </div>
        </div>
        ${
          data.otherRespiratorySymptoms
            ? `
          <div class="subsection">
            <h3>Other Respiratory Symptoms</h3>
            <div class="info-box">${data.otherRespiratorySymptoms}</div>
          </div>
        `
            : ""
        }
      </div>

      <!-- Exposure -->
      <div class="section">
        <h2>Exposure</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Exposure to Patients with Covid-19:</strong> <span class="yes-no ${data.exposureToPatientsCovid ? "yes" : "no"}">${data.exposureToPatientsCovid ? "Yes" : "No"}</span></p>
            <p><strong>Exposure to Staff with Covid-19:</strong> <span class="yes-no ${data.exposureToStaffCovid ? "yes" : "no"}">${data.exposureToStaffCovid ? "Yes" : "No"}</span></p>
          </div>
          <div class="space-y-2">
            <p><strong>Isolation Required:</strong> <span class="yes-no ${data.isolationRequired ? "yes" : "no"}">${data.isolationRequired ? "Yes" : "No"}</span></p>
            <p><strong>Further Treatment Required:</strong> <span class="yes-no ${data.furtherTreatmentRequired ? "yes" : "no"}">${data.furtherTreatmentRequired ? "Yes" : "No"}</span></p>
          </div>
        </div>
        ${
          data.isolationDetails
            ? `
          <div class="subsection">
            <h3>Isolation Details</h3>
            <div class="info-box">${data.isolationDetails}</div>
          </div>
        `
            : ""
        }
      </div>

      <!-- Diarrhea and Vomiting -->
      <div class="section">
        <h2>Diarrhea and Vomiting</h2>
        <div class="grid grid-cols-3">
          <p><strong>Current Symptoms:</strong> <span class="yes-no ${data.diarrheaVomitingCurrentSymptoms ? "yes" : "no"}">${data.diarrheaVomitingCurrentSymptoms ? "Yes" : "No"}</span></p>
          <p><strong>Contact with Others:</strong> <span class="yes-no ${data.diarrheaVomitingContactWithOthers ? "yes" : "no"}">${data.diarrheaVomitingContactWithOthers ? "Yes" : "No"}</span></p>
          <p><strong>Family History (72h):</strong> <span class="yes-no ${data.diarrheaVomitingFamilyHistory72h ? "yes" : "no"}">${data.diarrheaVomitingFamilyHistory72h ? "Yes" : "No"}</span></p>
        </div>
      </div>

      <!-- Clostridium Difficile -->
      <div class="section">
        <h2>Clostridium Difficile</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Active C. Diff:</strong> <span class="yes-no ${data.clostridiumActive ? "yes" : "no"}">${data.clostridiumActive ? "Yes" : "No"}</span></p>
            <p><strong>History of C. Diff:</strong> <span class="yes-no ${data.clostridiumHistory ? "yes" : "no"}">${data.clostridiumHistory ? "Yes" : "No"}</span></p>
            <p><strong>Stool Count (72h):</strong> ${data.clostridiumStoolCount72h || "Not specified"}</p>
            <p><strong>Last Positive Date:</strong> ${formatDate(data.clostridiumLastPositiveSpecimenDate)}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Result:</strong> ${data.clostridiumResult || "Not specified"}</p>
            <p><strong>Treatment Complete:</strong> <span class="yes-no ${data.clostridiumTreatmentComplete ? "yes" : "no"}">${data.clostridiumTreatmentComplete ? "Yes" : "No"}</span></p>
          </div>
        </div>
        ${
          data.clostridiumTreatmentReceived
            ? `
          <div class="subsection">
            <h3>Treatment Received</h3>
            <div class="info-box">${data.clostridiumTreatmentReceived}</div>
          </div>
        `
            : ""
        }
        ${
          data.ongoingDetails
            ? `
          <div class="subsection">
            <h3>Ongoing Details</h3>
            <div class="info-box">${data.ongoingDetails}</div>
            <div class="grid grid-cols-3" style="margin-top: 8px;">
              <p><strong>Date Commenced:</strong> ${data.ongoingDateCommenced || "Not specified"}</p>
              <p><strong>Length of Course:</strong> ${data.ongoingLengthOfCourse || "Not specified"}</p>
              <p><strong>Follow-up Required:</strong> ${data.ongoingFollowUpRequired ? data.ongoingFollowUpRequired.charAt(0).toUpperCase() + data.ongoingFollowUpRequired.slice(1) : "Not specified"}</p>
            </div>
          </div>
        `
            : ""
        }
      </div>

      <!-- MRSA / MSSA -->
      <div class="section">
        <h2>MRSA / MSSA</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Colonised:</strong> <span class="yes-no ${data.mrsaMssaColonised ? "yes" : "no"}">${data.mrsaMssaColonised ? "Yes" : "No"}</span></p>
            <p><strong>Infected:</strong> <span class="yes-no ${data.mrsaMssaInfected ? "yes" : "no"}">${data.mrsaMssaInfected ? "Yes" : "No"}</span></p>
            <p><strong>Last Positive Swab:</strong> ${formatDate(data.mrsaMssaLastPositiveSwabDate)}</p>
            <p><strong>Sites Positive:</strong> ${data.mrsaMssaSitesPositive || "Not specified"}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Date Commenced:</strong> ${formatDate(data.mrsaMssaDateCommenced)}</p>
            <p><strong>Length of Course:</strong> ${data.mrsaMssaLengthOfCourse || "Not specified"}</p>
            <p><strong>Follow-up Required:</strong> ${data.mrsaMssaFollowUpRequired || "Not specified"}</p>
          </div>
        </div>
        ${
          data.mrsaMssaTreatmentReceived
            ? `
          <div class="subsection">
            <h3>Treatment Received</h3>
            <div class="info-box">${data.mrsaMssaTreatmentReceived}</div>
          </div>
        `
            : ""
        }
        ${
          data.mrsaMssaTreatmentComplete
            ? `
          <div class="subsection">
            <h3>Treatment Completed</h3>
            <div class="info-box">${data.mrsaMssaTreatmentComplete}</div>
          </div>
        `
            : ""
        }
        ${
          data.mrsaMssaDetails
            ? `
          <div class="subsection">
            <h3>Additional Details</h3>
            <div class="info-box">${data.mrsaMssaDetails}</div>
          </div>
        `
            : ""
        }
      </div>

      <!-- Multi-drug Resistant Organisms -->
      <div class="section">
        <h2>Multi-drug Resistant Organisms</h2>
        <div class="grid grid-cols-3">
          <p><strong>ESBLs:</strong> <span class="yes-no ${data.esbl ? "yes" : "no"}">${data.esbl ? "Yes" : "No"}</span></p>
          <p><strong>VRE/GRE:</strong> <span class="yes-no ${data.vreGre ? "yes" : "no"}">${data.vreGre ? "Yes" : "No"}</span></p>
          <p><strong>CPE:</strong> <span class="yes-no ${data.cpe ? "yes" : "no"}">${data.cpe ? "Yes" : "No"}</span></p>
        </div>
        ${
          data.otherMultiDrugResistance
            ? `
          <div class="subsection">
            <h3>Other Multi-drug Resistance</h3>
            <div class="info-box">${data.otherMultiDrugResistance}</div>
          </div>
        `
            : ""
        }
        ${
          data.relevantInformationMultiDrugResistance
            ? `
          <div class="subsection">
            <h3>Relevant Information</h3>
            <div class="info-box">${data.relevantInformationMultiDrugResistance}</div>
          </div>
        `
            : ""
        }
      </div>

      <!-- Other Information -->
      <div class="section">
        <h2>Other Information</h2>
        <div class="grid grid-cols-2">
          <p><strong>Awareness of Infection:</strong> <span class="yes-no ${data.awarenessOfInfection ? "yes" : "no"}">${data.awarenessOfInfection ? "Yes" : "No"}</span></p>
          <p><strong>Last Flu Vaccination:</strong> ${formatDate(data.lastFluVaccinationDate)}</p>
        </div>
      </div>

      <!-- Assessment Completion -->
      <div class="section">
        <h2>Assessment Completion</h2>
        <div class="grid grid-cols-2">
          <div>
            <p><strong>Completed by:</strong> ${data.completedBy}</p>
            <p><strong>Job Role:</strong> ${data.jobRole}</p>
          </div>
          <div>
            <p><strong>Signature:</strong> ${data.signature}</p>
            <p><strong>Completion Date:</strong> ${formatDate(data.completionDate)}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())}</p>
        <p>Infection Prevention Assessment - ${data.name}</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API token authentication (server-to-server)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await request.json();

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Add some debugging
    console.log("PDF API called with assessmentId:", assessmentId);

    // Fetch the assessment data directly from Convex
    const assessmentData = await convexClient.query(
      api.careFiles.infectionPrevention.getInfectionPreventionAssessment,
      {
        id: assessmentId as Id<"infectionPreventionAssessments">
      }
    );

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Generate HTML content
    const htmlContent = generateInfectionPreventionHTML(assessmentData);

    // Launch Playwright browser
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
      // Set the HTML content directly
      await page.setContent(htmlContent, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          bottom: "20px",
          left: "20px",
          right: "20px"
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      // Return the PDF as a response
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="infection-prevention-assessment-${assessmentId}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
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
