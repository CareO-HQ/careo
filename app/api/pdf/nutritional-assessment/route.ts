import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

function formatDate(dateString?: string | number): string {
  if (!dateString) return "Not provided";
  return new Date(dateString).toLocaleDateString("en-GB");
}

function formatDateTime(dateString?: string | number): string {
  if (!dateString) return "Not provided";
  return (
    new Date(dateString).toLocaleDateString("en-GB") +
    " at " +
    new Date(dateString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function generateNutritionalAssessmentHTML(data: any): string {
  const details = data.assessment_details || {};
  const foodConsistency = data.food_consistency || {};
  const fluidConsistency = data.fluid_consistency || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nutritional Assessment</title>
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
          border-bottom: 2px solid #059669;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #065f46;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #065f46;
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
          page-break-inside: avoid;
        }
        .info-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .field-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          background-color: #dcfce7;
          color: #166534;
        }
        .must-score {
          font-size: 1.5rem;
          font-weight: bold;
          color: #065f46;
          text-align: center;
          background: #f0fdf4;
          border: 2px solid #059669;
          border-radius: 8px;
          padding: 10px;
          margin: 10px 0;
        }
        .consistency-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .consistency-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }
        .check-mark { color: #059669; font-weight: bold; }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Nutritional Assessment</h1>
      </div>

      <div class="section">
        <h2>Resident Details</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${data.residentName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${data.dateOfBirth || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Bedroom Number</div>
            <div class="field-value">${data.bedroomNumber || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date)}</div>
          </div>
        </div>
        <div class="grid grid-cols-3 info-box">
          <div>
            <div class="field-label">Height</div>
            <div class="field-value">${details.height || data.height || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Weight</div>
            <div class="field-value">${details.weight || data.weight || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">IDDSI Categories</div>
            <div class="field-value">${Object.values(foodConsistency).filter(Boolean).length + Object.values(fluidConsistency).filter(Boolean).length} Selected</div>
          </div>
        </div>
        
        <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 1.1rem; color: #111827;">Clinical Involvement</h3>
        <div class="grid grid-cols-2">
          <div class="info-box" style="margin-bottom: 0;">
            <h3 style="margin-top: 0;">SALT Involvement</h3>
            <p style="margin: 4px 0;"><strong>Status:</strong> ${details.hasSaltInvolvement ? 'Active' : 'None'}</p>
            ${details.saltTherapistName ? `<p style="margin: 4px 0;"><strong>Therapist:</strong> ${details.saltTherapistName}</p>` : ""}
            ${details.saltContactDetails ? `<p style="margin: 4px 0;"><strong>Contact:</strong> ${details.saltContactDetails}</p>` : ""}
          </div>
          <div class="info-box" style="margin-bottom: 0;">
            <h3 style="margin-top: 0;">Dietitian Involvement</h3>
            <p style="margin: 4px 0;"><strong>Status:</strong> ${details.hasDietitianInvolvement ? 'Active' : 'None'}</p>
            ${details.dietitianName ? `<p style="margin: 4px 0;"><strong>Dietitian:</strong> ${details.dietitianName}</p>` : ""}
            ${details.dietitianContactDetails ? `<p style="margin: 4px 0;"><strong>Contact:</strong> ${details.dietitianContactDetails}</p>` : ""}
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Nutritional Risk (MUST)</h2>
        <div class="must-score">
          MUST Score: ${data.must_score || data.mustScore || "Not specified"}
        </div>
      </div>

      <div class="section">
        <h2>IDDSI Consistency Levels</h2>
        <div class="grid grid-cols-2">
          <div class="info-box">
            <h3>Food Consistency</h3>
            <div class="consistency-list">
              ${Object.entries(foodConsistency)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => `
                  <div class="consistency-item">
                    <span class="check-mark">✓</span>
                    <span>${key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                `).join('') || "No requirements specified"}
            </div>
          </div>
          <div class="info-box">
            <h3>Fluid Consistency</h3>
            <div class="consistency-list">
              ${Object.entries(fluidConsistency)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => `
                  <div class="consistency-item">
                    <span class="check-mark">✓</span>
                    <span>${key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                `).join('') || "No requirements specified"}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Dietary Requirements & Assistance</h2>
        <div class="info-box">
          <h3>Assistance Required</h3>
          <p>${details.assistanceRequired || data.assistanceRequired || "No specific assistance detailed"}</p>
        </div>
        ${details.foodFortificationRequired ? `
        <div class="info-box">
          <h3>Food Fortification</h3>
          <p>${details.foodFortificationRequired}</p>
        </div>
        ` : ""}
        ${details.supplementsPrescribed ? `
        <div class="info-box">
          <h3>Supplements Prescribed</h3>
          <p>${details.supplementsPrescribed}</p>
        </div>
        ` : ""}
      </div>

      <div class="section">
        <h2>Assessment Completion</h2>
        <div class="info-box grid grid-cols-2">
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${data.completed_by || data.completedBy}</div>
            <div class="field-label" style="margin-top: 8px;">Job Role</div>
            <div class="field-value">${details.jobRole || data.jobRole || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Signature</div>
            <div class="field-value" style="font-style: italic; border-bottom: 1px solid #ccc; padding-top: 10px;">
              ${details.signature || data.signature || data.completed_by}
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Nutritional Assessment Report - ${data.residentName}</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment data is required" },
        { status: 400 }
      );
    }

    // Flatten the data: merge assessment_data and assessment_details into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      ...(assessmentData.assessment_details || {}),
      food_consistency: assessmentData.food_consistency || assessmentData.assessment_data?.food_consistency || {},
      fluid_consistency: assessmentData.fluid_consistency || assessmentData.assessment_data?.fluid_consistency || {},
      assessment_details: assessmentData.assessment_details || assessmentData.assessment_data?.assessment_details || {},
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || assessmentData.assessment_details?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth || assessmentData.assessment_details?.dateOfBirth,
      bedroomNumber: assessmentData.bedroomNumber || assessmentData.assessment_data?.bedroomNumber || assessmentData.assessment_details?.bedroomNumber,
      assessment_date: assessmentData.assessment_date || assessmentData.completion_date || assessmentData.created_at
    };

    const htmlContent = generateNutritionalAssessmentHTML(flattenedData);

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="nutritional-assessment-${flattenedData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Nutritional Assessment PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
