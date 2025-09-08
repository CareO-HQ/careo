import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const runtime = "nodejs";

// Create a Convex client for server-side usage
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB");
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

function generatePreAdmissionHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Pre-Admission Assessment Form</title>
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
        .consent-box {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 16px;
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
        @media print {
          body { max-width: none; margin: 0; padding: 16px; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>Pre-Admission Assessment Form</h1>
        <div class="grid grid-cols-2">
          <div>
            <p><strong>Care Home:</strong> ${data.careHomeName}</p>
            <p><strong>NHS Health & Care Number:</strong> ${data.nhsHealthCareNumber}</p>
          </div>
          <div>
            <p><strong>Completed by:</strong> ${data.userName}</p>
            <p><strong>Job Role:</strong> ${data.jobRole}</p>
            <p><strong>Date:</strong> ${formatDate(data.date)}</p>
          </div>
        </div>
      </div>

      <!-- Consent -->
      <div class="section">
        <h2>Consent</h2>
        <div class="consent-box">
          <p>✓ The person being assessed agreed to the assessment being completed on ${formatDateTime(data.consentAcceptedAt)}</p>
        </div>
      </div>

      <!-- Resident Information -->
      <div class="section">
        <h2>Resident Information</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>First Name:</strong> ${data.firstName}</p>
            <p><strong>Last Name:</strong> ${data.lastName}</p>
            <p><strong>Address:</strong> ${data.address}</p>
            <p><strong>Phone Number:</strong> ${data.phoneNumber}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Ethnicity:</strong> ${data.ethnicity}</p>
            <p><strong>Gender:</strong> ${data.gender}</p>
            <p><strong>Religion:</strong> ${data.religion}</p>
            <p><strong>Date of Birth:</strong> ${data.dateOfBirth}</p>
          </div>
        </div>
      </div>

      <!-- Next of Kin -->
      <div class="section">
        <h2>Next of Kin</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>First Name:</strong> ${data.kinFirstName}</p>
            <p><strong>Last Name:</strong> ${data.kinLastName}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Relationship:</strong> ${data.kinRelationship}</p>
            <p><strong>Phone Number:</strong> ${data.kinPhoneNumber}</p>
          </div>
        </div>
      </div>

      <!-- Professional Contacts -->
      <div class="section">
        <h2>Professional Contacts</h2>
        
        <div class="subsection">
          <h3>Care Manager / Social Worker</h3>
          <div class="grid grid-cols-2">
            <p><strong>Name:</strong> ${data.careManagerName}</p>
            <p><strong>Phone:</strong> ${data.careManagerPhoneNumber}</p>
          </div>
        </div>

        <div class="subsection">
          <h3>District Nurse</h3>
          <div class="grid grid-cols-2">
            <p><strong>Name:</strong> ${data.districtNurseName}</p>
            <p><strong>Phone:</strong> ${data.districtNursePhoneNumber}</p>
          </div>
        </div>

        <div class="subsection">
          <h3>General Practitioner</h3>
          <div class="grid grid-cols-2">
            <p><strong>Name:</strong> ${data.generalPractitionerName}</p>
            <p><strong>Phone:</strong> ${data.generalPractitionerPhoneNumber}</p>
          </div>
        </div>

        <div class="subsection">
          <h3>Healthcare Information Provider</h3>
          <div class="grid grid-cols-2">
            <p><strong>Name:</strong> ${data.providerHealthcareInfoName}</p>
            <p><strong>Designation:</strong> ${data.providerHealthcareInfoDesignation}</p>
          </div>
        </div>
      </div>

      <!-- Medical Information -->
      <div class="section">
        <h2>Medical Information</h2>
        <div class="space-y-4">
          <div>
            <h3>Known Allergies</h3>
            <div class="info-box">${data.allergies}</div>
          </div>
          <div>
            <h3>Medical History</h3>
            <div class="info-box">${data.medicalHistory}</div>
          </div>
          <div>
            <h3>Medication Prescribed</h3>
            <div class="info-box">${data.medicationPrescribed}</div>
          </div>
        </div>
      </div>

      <!-- Assessment Sections -->
      <div class="section">
        <h2>Assessment Sections</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-2">
            <div>
              <h3>Consent Capacity Rights</h3>
              <div class="info-box">${data.consentCapacityRights}</div>
            </div>
            <div>
              <h3>Medication</h3>
              <div class="info-box">${data.medication}</div>
            </div>
            <div>
              <h3>Mobility</h3>
              <div class="info-box">${data.mobility}</div>
            </div>
            <div>
              <h3>Nutrition</h3>
              <div class="info-box">${data.nutrition}</div>
            </div>
            <div>
              <h3>Continence</h3>
              <div class="info-box">${data.continence}</div>
            </div>
            <div>
              <h3>Personal Hygiene & Dressing</h3>
              <div class="info-box">${data.hygieneDressing}</div>
            </div>
            <div>
              <h3>Skin Integrity</h3>
              <div class="info-box">${data.skin}</div>
            </div>
            <div>
              <h3>Cognition</h3>
              <div class="info-box">${data.cognition}</div>
            </div>
            <div>
              <h3>Infection Control</h3>
              <div class="info-box">${data.infection}</div>
            </div>
            <div>
              <h3>Breathing</h3>
              <div class="info-box">${data.breathing}</div>
            </div>
          </div>
          <div>
            <h3>Altered State of Consciousness</h3>
            <div class="info-box">${data.alteredStateOfConsciousness}</div>
          </div>
        </div>
      </div>

      <!-- Palliative Care -->
      <div class="section">
        <h2>Palliative and End of Life Care</h2>
        <div class="grid grid-cols-2 subsection">
          <div>
            <p><strong>DNACPR in place:</strong> ${data.dnacpr ? "Yes" : "No"}</p>
            <p><strong>Has capacity:</strong> ${data.capacity ? "Yes" : "No"}</p>
          </div>
          <div>
            <p><strong>Advanced decision:</strong> ${data.advancedDecision ? "Yes" : "No"}</p>
            <p><strong>Advanced care plan:</strong> ${data.advancedCarePlan ? "Yes" : "No"}</p>
          </div>
        </div>
        ${
          data.comments
            ? `
          <div>
            <h3>Comments</h3>
            <div class="info-box">${data.comments}</div>
          </div>
        `
            : ""
        }
      </div>

      <!-- Preferences -->
      <div class="section">
        <h2>Preferences</h2>
        <div class="space-y-4">
          <div>
            <h3>Room Preferences</h3>
            <div class="info-box">${data.roomPreferences}</div>
          </div>
          <div>
            <h3>Admission Contact</h3>
            <div class="info-box">${data.admissionContact}</div>
          </div>
          <div>
            <h3>Food Preferences</h3>
            <div class="info-box">${data.foodPreferences}</div>
          </div>
          <div>
            <h3>Preferred Name</h3>
            <div class="info-box">${data.preferedName}</div>
          </div>
          <div>
            <h3>Family Concerns</h3>
            <div class="info-box">${data.familyConcerns}</div>
          </div>
        </div>
      </div>

      <!-- Other Information -->
      <div class="section">
        <h2>Other Information</h2>
        <div class="space-y-4">
          <div>
            <h3>Other Healthcare Professionals</h3>
            <div class="info-box">${data.otherHealthCareProfessional}</div>
          </div>
          <div>
            <h3>Equipment Required</h3>
            <div class="info-box">${data.equipment}</div>
          </div>
        </div>
      </div>

      <!-- Financial Information -->
      <div class="section">
        <h2>Financial Information</h2>
        <p><strong>Can attend to own finances:</strong> ${data.attendFinances ? "Yes" : "No"}</p>
      </div>

      <!-- Additional Considerations -->
      <div class="section">
        <h2>Additional Considerations</h2>
        <div class="info-box">${data.additionalConsiderations}</div>
      </div>

      <!-- Assessment Outcome -->
      <div class="section">
        <h2>Assessment Outcome</h2>
        <div class="grid grid-cols-2">
          <p><strong>Outcome:</strong> ${data.outcome}</p>
          ${
            data.plannedAdmissionDate
              ? `
            <p><strong>Planned Admission Date:</strong> ${formatDate(data.plannedAdmissionDate)}</p>
          `
              : ""
          }
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())}</p>
        <p>Pre-Admission Assessment Form - ${data.careHomeName}</p>
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

    const { formId } = await request.json();

    if (!formId) {
      return NextResponse.json(
        { error: "Form ID is required" },
        { status: 400 }
      );
    }

    // Add some debugging
    console.log("PDF API called with formId:", formId);

    // Fetch the form data directly from Convex
    const formData = await convexClient.query(
      api.careFiles.preadmission.getPreAdmissionForm,
      {
        id: formId as Id<"preAdmissionCareFiles">
      }
    );

    if (!formData) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Generate HTML content
    const htmlContent = generatePreAdmissionHTML(formData);

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
          "Content-Disposition": `attachment; filename="pre-admission-form-${formId}.pdf"`,
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
