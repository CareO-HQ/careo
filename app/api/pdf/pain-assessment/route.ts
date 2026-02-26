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

function generatePainAssessmentHTML(data: any): string {
  const entries = data.assessment_entries || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Pain Assessment</title>
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
          border-bottom: 2px solid #ef4444;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #991b1b;
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
          color: #991b1b;
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
          page-break-inside: avoid;
        }
        .info-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .entry-box {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          background-color: #ffffff;
        }
        .entry-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 8px;
          margin-bottom: 12px;
          background-color: #fef2f2;
          margin: -16px -16px 12px -16px;
          padding: 12px 16px;
          border-radius: 8px 8px 0 0;
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
        .intervention-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #e5e7eb;
        }
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
        <h1>Pain Assessment Log</h1>
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
            <div class="field-label">Room Number</div>
            <div class="field-value">${data.roomNumber || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Assessment Entries</h2>
        ${entries.length > 0 ? entries.map((entry: any, index: number) => `
          <div class="entry-box">
            <div class="entry-header">
              <span class="field-label">${index + 1}</span>
              <span class="field-value">${entry.dateTime || "Not specified"}</span>
            </div>
            
            <div class="grid grid-cols-2" style="margin-bottom: 12px;">
              <div>
                <div class="field-label">Pain Location</div>
                <div class="field-value">${entry.painLocation || "Not specified"}</div>
              </div>
              <div>
                <div class="field-label">Resident Behaviour</div>
                <div class="field-value">${entry.residentBehaviour || "Not specified"}</div>
              </div>
            </div>

            <div style="margin-bottom: 12px;">
              <div class="field-label">Description of Pain</div>
              <div class="field-value">${entry.descriptionOfPain || "No description provided"}</div>
            </div>

            <div class="intervention-section">
              <h3>Intervention & Outcome</h3>
              <div class="grid grid-cols-2" style="margin-bottom: 12px;">
                <div>
                  <div class="field-label">Intervention Type</div>
                  <div class="field-value">${entry.interventionType || "None"}</div>
                </div>
                <div>
                  <div class="field-label">Intervention Time</div>
                  <div class="field-value">${entry.interventionTime || "N/A"}</div>
                </div>
              </div>
              <div style="margin-bottom: 12px;">
                <div class="field-label">Status After Intervention</div>
                <div class="field-value">${entry.painAfterIntervention || "N/A"}</div>
              </div>
            </div>

            ${entry.comments ? `
            <div style="margin-top: 12px;">
              <div class="field-label">Comments</div>
              <div class="field-value" style="font-size: 0.9rem;">${entry.comments}</div>
            </div>
            ` : ""}

            <div style="margin-top: 12px; text-align: right;">
              <span class="field-label">Signature: </span>
              <span class="field-value" style="font-style: italic;">${entry.signature || "Not signed"}</span>
            </div>
          </div>
        `).join('') : '<p style="text-align: center; color: #6b7280;">No assessment entries recorded.</p>'}
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Pain Assessment Report - ${data.residentName}</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json({ error: "Assessment data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and entries are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      roomNumber: assessmentData.roomNumber || assessmentData.bedroomNumber || assessmentData.assessment_data?.roomNumber || assessmentData.assessment_data?.bedroomNumber,
      assessment_date: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      assessment_entries: assessmentData.assessment_entries || assessmentData.assessment_data?.assessment_entries || []
    };

    console.log("Pain Assessment PDF API flattening data:", {
      residentName: flattenedData.residentName,
      entriesCount: flattenedData.assessment_entries.length,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generatePainAssessmentHTML(flattenedData);

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
          "Content-Disposition": `attachment; filename="pain-assessment-${assessmentData.residentName?.replace(/\\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Pain Assessment PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
