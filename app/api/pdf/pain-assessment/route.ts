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
  const isV2 = data.version === "v2";
  const entries = data.assessment_entries || [];
  const bodyMapMarkers = data.body_map_markers || [];

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
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .header-table td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          font-size: 0.875rem;
        }
        .header-label {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 0.75rem;
          color: #374151;
          background-color: #f9fafb;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: bold;
          text-align: center;
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .section {
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        .section-header {
          background-color: #f9fafb;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 0.875rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .section-content {
          padding: 12px;
          font-size: 0.95rem;
          min-height: 50px;
        }
        .v2-field {
          display: grid;
          grid-template-columns: 200px 1fr;
          border-bottom: 1px solid #e5e7eb;
        }
        .v2-field:last-child {
          border-bottom: none;
        }
        .v2-label {
          background-color: #f9fafb;
          padding: 12px;
          font-weight: bold;
          font-size: 0.875rem;
          border-right: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
        }
        .v2-value {
          padding: 12px;
          font-size: 0.95rem;
          white-space: pre-wrap;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
        }
        .footer-box {
          border: 1px solid #e5e7eb;
          padding: 12px;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .footer-field {
          margin-bottom: 8px;
        }
        .footer-label {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 0.7rem;
          display: block;
          margin-bottom: 2px;
        }
        .signature {
          font-family: 'cursive', serif;
          font-size: 1.1rem;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <h1>Pain Assessment Record</h1>

      <table class="header-table">
        <tr>
          <td class="header-label">Residents name</td>
          <td class="header-label">Bedroom number</td>
          <td class="header-label">Date of birth</td>
        </tr>
        <tr>
          <td>${data.residentName || "N/A"}</td>
          <td>${data.roomNumber || "N/A"}</td>
          <td>${data.dateOfBirth || "N/A"}</td>
        </tr>
      </table>

      ${isV2 ? `
        <div class="section">
          <div class="section-header">BODY MAP INDICATIONS</div>
          <div class="section-content">
            ${bodyMapMarkers.length > 0 ? `
              <ul style="margin: 0; padding-left: 20px;">
                ${bodyMapMarkers.map((m: any) => `<li><strong>(${m.label})</strong> ${m.region_name}${m.notes ? `: ${m.notes}` : ""}</li>`).join('')}
              </ul>
            ` : "No markers indicated on body map."}
          </div>
        </div>

        <div class="section">
          <div class="v2-field">
            <div class="v2-label">Residents description of their pain</div>
            <div class="v2-value">${data.description_of_pain || "N/A"}</div>
          </div>
          <div class="v2-field">
            <div class="v2-label">What will relieve the pain?</div>
            <div class="v2-value">${data.relieve_pain || "N/A"}</div>
          </div>
          <div class="v2-field">
            <div class="v2-label">What will make the pain worse?</div>
            <div class="v2-value">${data.worse_pain || "N/A"}</div>
          </div>
        </div>

        <div class="footer-grid">
          <div class="footer-box">
            <div class="footer-field">
              <span class="footer-label">Name of person completing assessment</span>
              <span>${data.completed_by || "N/A"}</span>
            </div>
            <div class="footer-field">
              <span class="footer-label">Signature</span>
              <div class="signature">${data.signature || "Electronic Signature"}</div>
            </div>
          </div>
          <div class="footer-box">
            <div class="footer-field">
              <span class="footer-label">Job role</span>
              <span>${data.role || "N/A"}</span>
            </div>
            <div style="display: flex; gap: 20px;">
              <div class="footer-field">
                <span class="footer-label">Date</span>
                <span>${formatDate(data.assessment_date)}</span>
              </div>
              <div class="footer-field">
                <span class="footer-label">Time</span>
                <span>${data.time || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      ` : `
        <div class="section">
          <div class="section-header">Assessment Entries (Legacy)</div>
          ${entries.length > 0 ? entries.map((entry: any, index: number) => `
            <div style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <div><strong>Entry #${index + 1}</strong> - ${entry.dateTime || "N/A"}</div>
              <div><strong>Location:</strong> ${entry.painLocation || "N/A"}</div>
              <div><strong>Description:</strong> ${entry.descriptionOfPain || "N/A"}</div>
            </div>
          `).join('') : '<p style="padding: 12px;">No assessment entries recorded.</p>'}
        </div>
      `}

      <div style="margin-top: 32px; font-size: 0.75rem; color: #6b7280; text-align: center;">
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

    // Flatten the data: merge assessment_data or assessment_entries into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      ...(assessmentData.assessment_entries && !Array.isArray(assessmentData.assessment_entries) ? assessmentData.assessment_entries : {}),
      // Ensure resident details and entries are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_entries?.residentName || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_entries?.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      roomNumber: assessmentData.roomNumber || assessmentData.bedroomNumber || assessmentData.assessment_entries?.roomNumber || assessmentData.assessment_data?.roomNumber || assessmentData.assessment_data?.bedroomNumber,
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
