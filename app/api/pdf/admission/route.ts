import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

function formatDate(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return (
    date.toLocaleDateString("en-GB") +
    " at " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function generateAdmissionHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admission Assessment Form</title>
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
        .checkbox {
          color: #059669;
        }
        @media print {
          body { max-width: none; margin: 0; padding: 16px; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>Admission Assessment Form</h1>
        <div class="grid grid-cols-2">
          <div>
            <p><strong>Resident:</strong> ${data.firstName} ${data.lastName}</p>
            <p><strong>NHS Number:</strong> ${data.NHSNumber}</p>
            <p><strong>Date of Birth:</strong> ${formatDate(data.dateOfBirth)}</p>
          </div>
          <div>
            <p><strong>Bedroom Number:</strong> ${data.bedroomNumber}</p>
            <p><strong>Assessment Date:</strong> ${formatDate(data._creationTime)}</p>
            ${data.submittedAt ? `<p><strong>Submitted:</strong> ${formatDateTime(data.submittedAt)}</p>` : ""}
          </div>
        </div>
      </div>

      <!-- Resident Information -->
      <div class="section">
        <h2>Resident Information</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>First Name:</strong> ${data.firstName}</p>
            <p><strong>Last Name:</strong> ${data.lastName}</p>
            <p><strong>Date of Birth:</strong> ${formatDate(data.dateOfBirth)}</p>
            <p><strong>Bedroom Number:</strong> ${data.bedroomNumber}</p>
            <p><strong>NHS Number:</strong> ${data.NHSNumber}</p>
          </div>
          <div class="space-y-2">
            ${data.gender ? `<p><strong>Gender:</strong> ${data.gender}</p>` : ""}
            ${data.telephoneNumber ? `<p><strong>Phone:</strong> ${data.telephoneNumber}</p>` : ""}
            ${data.ethnicity ? `<p><strong>Ethnicity:</strong> ${data.ethnicity}</p>` : ""}
            ${data.religion ? `<p><strong>Religion:</strong> ${data.religion}</p>` : ""}
            ${data.admittedFrom ? `<p><strong>Admitted From:</strong> ${data.admittedFrom}</p>` : ""}
          </div>
        </div>
      </div>

      <!-- Next of Kin -->
      <div class="section">
        <h2>Next of Kin</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Name:</strong> ${data.kinFirstName} ${data.kinLastName}</p>
            <p><strong>Relationship:</strong> ${data.kinRelationship}</p>
            <p><strong>Phone:</strong> ${data.kinTelephoneNumber}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Email:</strong> ${data.kinEmail}</p>
            <p><strong>Address:</strong> ${data.kinAddress}</p>
          </div>
        </div>
      </div>

      <!-- Emergency Contact -->
      <div class="section">
        <h2>Emergency Contact</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Name:</strong> ${data.emergencyContactName}</p>
            <p><strong>Relationship:</strong> ${data.emergencyContactRelationship}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Primary Phone:</strong> ${data.emergencyContactTelephoneNumber}</p>
            <p><strong>Alternative Phone:</strong> ${data.emergencyContactPhoneNumber}</p>
          </div>
        </div>
      </div>

      <!-- Professional Contacts -->
      <div class="section">
        <h2>Professional Contacts</h2>
        
        ${data.careManagerName
      ? `
        <div class="subsection">
          <h3>Care Manager</h3>
          <div class="grid grid-cols-2">
            <div class="space-y-2">
              <p><strong>Name:</strong> ${data.careManagerName}</p>
              <p><strong>Job Role:</strong> ${data.careManagerJobRole || "N/A"}</p>
              <p><strong>Relationship:</strong> ${data.careManagerRelationship || "N/A"}</p>
            </div>
            <div class="space-y-2">
              <p><strong>Phone:</strong> ${data.careManagerTelephoneNumber || "N/A"}</p>
              <p><strong>Alt Phone:</strong> ${data.careManagerPhoneNumber || "N/A"}</p>
              <p><strong>Email:</strong> ${data.careManagerEmail || "N/A"}</p>
            </div>
          </div>
          ${data.careManagerAddress ? `<p><strong>Address:</strong> ${data.careManagerAddress}</p>` : ""}
        </div>
        `
      : ""
    }

        ${data.GPName
      ? `
        <div class="subsection">
          <h3>General Practitioner</h3>
          <div class="grid grid-cols-2">
            <p><strong>Name:</strong> ${data.GPName}</p>
            <p><strong>Phone:</strong> ${data.GPPhoneNumber || "N/A"}</p>
          </div>
          ${data.GPAddress ? `<p><strong>Address:</strong> ${data.GPAddress}</p>` : ""}
        </div>
        `
      : ""
    }
      </div>

      <!-- Medical Information -->
      <div class="section">
        <h2>Medical Information</h2>
        <div class="space-y-4">
          ${data.allergies
      ? `
          <div>
            <h3>Known Allergies</h3>
            <div class="info-box">${data.allergies}</div>
          </div>
          `
      : ""
    }
          ${data.medicalHistory
      ? `
          <div>
            <h3>Medical History</h3>
            <div class="info-box">${data.medicalHistory}</div>
          </div>
          `
      : ""
    }
          ${data.prescribedMedications
      ? `
          <div>
            <h3>Prescribed Medications</h3>
            <div class="info-box">${data.prescribedMedications}</div>
          </div>
          `
      : ""
    }
          ${data.consentCapacityRights
      ? `
          <div>
            <h3>Consent, Capacity & Rights</h3>
            <div class="info-box">${data.consentCapacityRights}</div>
          </div>
          `
      : ""
    }
          ${data.medication
      ? `
          <div>
            <h3>Additional Medication Information</h3>
            <div class="info-box">${data.medication}</div>
          </div>
          `
      : ""
    }
        </div>
      </div>

      <!-- Care Assessments -->
      <div class="section">
        <h2>Care Assessments</h2>
        <div class="space-y-4">
          ${data.skinIntegrityEquipment
      ? `
          <div>
            <h3>Skin Integrity Equipment</h3>
            <div class="info-box">${data.skinIntegrityEquipment}</div>
          </div>
          `
      : ""
    }
          ${data.skinIntegrityWounds
      ? `
          <div>
            <h3>Existing Wounds</h3>
            <div class="info-box">${data.skinIntegrityWounds}</div>
          </div>
          `
      : ""
    }
          
          <!-- Continence -->
          <div>
            <h3>Continence</h3>
            <p><span class="checkbox">${data.continenceIndependent ? "✓" : "✗"}</span> No impact on health/wellbeing (Care plan not required)</p>
            ${data.continence ? `<div class="info-box">${data.continence}</div>` : ""}
          </div>

          <!-- Personal Hygiene & Dressing -->
          <div>
            <h3>Personal Hygiene & Dressing</h3>
            <p><span class="checkbox">${data.hygieneIndependent ? "✓" : "✗"}</span> No impact on health/wellbeing (Care plan not required)</p>
            ${data.hygiene ? `<div class="info-box">${data.hygiene}</div>` : ""}
          </div>

          <!-- Sleep, Psychological & Emotional Needs -->
          <div>
            <h3>Sleep, Psychological & Emotional Needs</h3>
            <p><span class="checkbox">${data.sleepPsychologicalIndependent ? "✓" : "✗"}</span> No impact on health/wellbeing (Care plan not required)</p>
            ${data.bedtimeRoutine ? `<div class="subsection"><h4>Bedtime Routine</h4><div class="info-box">${data.bedtimeRoutine}</div></div>` : ""}
            ${data.psychologicalNeeds ? `<div class="subsection"><h4>Psychological Needs</h4><div class="info-box">${data.psychologicalNeeds}</div></div>` : ""}
          </div>

          <!-- Infection Control -->
          <div>
            <h3>Infection Control</h3>
            ${data.currentInfection ? `<div><h4>Current Infection</h4><div class="info-box">${data.currentInfection}</div></div>` : ""}
            <p><strong>Antibiotics Prescribed:</strong> <span class="checkbox">${data.antibioticsPrescribed ? "✓" : "✗"}</span> ${data.antibioticsPrescribed ? "Yes" : "No"}</p>
          </div>

          <!-- Breathing -->
          <div>
            <h3>Breathing</h3>
            <p><span class="checkbox">${data.breathingIndependent ? "✓" : "✗"}</span> No impact on health/wellbeing (Care plan not required)</p>
            ${data.prescribedBreathing ? `<div class="info-box">${data.prescribedBreathing}</div>` : ""}
          </div>

          <!-- Altered state of Consciousness -->
          ${data.alteredConsciousness
      ? `
          <div>
            <h3>Altered state of Consciousness</h3>
            <div class="info-box">${data.alteredConsciousness}</div>
          </div>
          `
      : ""
    }

          <!-- Communication -->
          <div>
            <h3>Communication</h3>
            <p><span class="checkbox">${data.communicationIndependent ? "✓" : "✗"}</span> No impact on health/wellbeing (Care plan not required)</p>
            ${data.communication ? `<div class="info-box">${data.communication}</div>` : ""}
          </div>

          <!-- Behaviour -->
          <div>
            <h3>Behaviour</h3>
            <p><span class="checkbox">${data.behaviourIndependent ? "✓" : "✗"}</span> No impact on health/wellbeing (Care plan not required)</p>
            ${data.behaviour ? `<div class="info-box">${data.behaviour}</div>` : ""}
          </div>

          <!-- Cognition -->
          <div>
            <h3>Cognition</h3>
            <p><span class="checkbox">${data.cognitionIndependent ? "✓" : "✗"}</span> No impact on health/wellbeing (Care plan not required)</p>
            ${data.cognition ? `<div class="info-box">${data.cognition}</div>` : ""}
          </div>
        </div>
      </div>

      <!-- Mobility Assessment -->
      <div class="section">
        <h2>Mobility Assessment</h2>
        <div class="space-y-4">
          <div>
            <h3>Mobility Independence</h3>
            <p><span class="checkbox">${data.mobilityIndependent ? "✓" : "✗"}</span> ${data.mobilityIndependent ? "Independent" : "Requires assistance"}</p>
          </div>
          ${data.assistanceRequired
      ? `
          <div>
            <h3>Assistance Required</h3>
            <div class="info-box">${data.assistanceRequired}</div>
          </div>
          `
      : ""
    }
          ${data.equipmentRequired
      ? `
          <div>
            <h3>Equipment Required</h3>
            <div class="info-box">${data.equipmentRequired}</div>
          </div>
          `
      : ""
    }
        </div>
      </div>

      <!-- Nutrition Information -->
      <div class="section">
        <h2>Nutrition Information</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Weight:</strong> ${data.weight || "N/A"}</p>
            <p><strong>Height:</strong> ${data.height || "N/A"}</p>
            <p><strong>IDDSI Food Level:</strong> ${data.iddsiFood || "N/A"}</p>
          </div>
          <div class="space-y-2">
            <p><strong>IDDSI Fluid Level:</strong> ${data.iddsiFluid || "N/A"}</p>
            <p><strong>Diet Type:</strong> ${data.dietType || "N/A"}</p>
            <p><strong>Choking Risk:</strong> <span class="checkbox">${data.chokingRisk ? "✓" : "✗"}</span> ${data.chokingRisk ? "Yes" : "No"}</p>
          </div>
        </div>
        <div class="space-y-4 subsection">
          ${data.nutritionalSupplements
      ? `
          <div>
            <h3>Nutritional Supplements</h3>
            <div class="info-box">${data.nutritionalSupplements}</div>
          </div>
          `
      : ""
    }
          ${data.nutritionalAssistanceRequired
      ? `
          <div>
            <h3>Nutritional Assistance Required</h3>
            <div class="info-box">${data.nutritionalAssistanceRequired}</div>
          </div>
          `
      : ""
    }
          ${data.additionalComments
      ? `
          <div>
            <h3>Additional Nutrition Comments</h3>
            <div class="info-box">${data.additionalComments}</div>
          </div>
          `
      : ""
    }
        </div>
      </div>

      <!-- Assessment Completion Section -->
      <div class="section pt-6 border-t mt-8">
        <h2 class="text-xl font-bold mb-4">Assessment Completion</h2>
        <div class="grid grid-cols-2 gap-6">
          <div class="space-y-2">
            <p><strong>Completed By:</strong> ${data.completedBy || "N/A"}</p>
            <p><strong>Job Role:</strong> ${data.jobRole || "N/A"}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Date of Completion:</strong> ${data.assessmentDate ? formatDateTime(data.assessmentDate) : "N/A"}</p>
            <p><strong>Signature:</strong> ${data.signature || "N/A"}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())}</p>
        <p>Admission Assessment Form - ${data.firstName} ${data.lastName}</p>
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
    const isDev = process.env.NODE_ENV === "development";

    // Only enforce authentication in production and if PDF_API_TOKEN is set
    if (!isDev && expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.log("PDF API authentication failed:", {
        expectedToken: expectedToken ? "***SET***" : "NOT_SET",
        authHeader: authHeader ? "PROVIDED" : "MISSING",
        environment: process.env.NODE_ENV
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("PDF API request received:", {
      environment: process.env.NODE_ENV,
      hasToken: !!expectedToken,
      hasAuthHeader: !!authHeader
    });

    // Parse the request body
    const admissionData = await request.json();

    if (!admissionData) {
      return NextResponse.json(
        { error: "Assessment data is required" },
        { status: 400 }
      );
    }

    console.log("PDF API called with admission data:", {
      firstName: admissionData.firstName,
      lastName: admissionData.lastName,
      assessmentId: admissionData._id
    });

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...admissionData,
      ...(admissionData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      firstName: admissionData.firstName || admissionData.assessment_data?.firstName || "Resident",
      lastName: admissionData.lastName || admissionData.assessment_data?.lastName || "",
      NHSNumber: admissionData.NHSNumber || admissionData.nhsNumber || admissionData.assessment_data?.NHSNumber || admissionData.assessment_data?.nhsNumber || "Not Available",
      dateOfBirth: admissionData.dateOfBirth || admissionData.assessment_data?.dateOfBirth,
      bedroomNumber: admissionData.bedroomNumber || admissionData.assessment_data?.bedroomNumber,
      submittedAt: admissionData.assessment_data?.submittedAt || admissionData.created_at,
      _creationTime: admissionData.created_at ? new Date(admissionData.created_at).getTime() : Date.now(),
    };

    console.log("Admission Assessment PDF API flattening data:", {
      firstName: flattenedData.firstName,
      lastName: flattenedData.lastName,
      formId: flattenedData._id || flattenedData.id
    });

    // Generate HTML content
    const htmlContent = generateAdmissionHTML(flattenedData);

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
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="admission-assessment-${flattenedData.firstName}-${flattenedData.lastName}.pdf"`,
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
