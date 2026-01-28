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

function generateChokingRiskHTML(data: any): string {
  const riskFactors = data.risk_factors || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Choking Risk Assessment</title>
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
          border-bottom: 2px solid #ea580c;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #9a3412;
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
          color: #9a3412;
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
        .risk-overview {
          text-align: center;
          background-color: #fffaf0;
          border: 2px solid #ea580c;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .score-display {
          font-size: 3rem;
          font-weight: 800;
          color: #9a3412;
          line-height: 1;
        }
        .risk-level {
          font-size: 1.5rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 8px;
        }
        .risk-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .risk-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          padding: 6px 12px;
          background: #fdf2f2;
          border-radius: 4px;
          border: 1px solid #fee2e2;
        }
        .check-mark { color: #dc2626; font-weight: bold; }
        .protective-item {
          background-color: #f0fdf4;
          border-color: #dcfce7;
        }
        .protective-item .check-mark { color: #16a34a; }
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
        <h1>Choking Risk Assessment</h1>
      </div>

      <div class="risk-overview">
        <div class="score-display">${data.total_score || 0}</div>
        <div class="field-label">Total Risk Score</div>
        <div class="risk-level">${data.risk_level || "No Risk"}</div>
      </div>

      <div class="section">
        <h2>Resident & Assessment Info</h2>
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
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date)}</div>
          </div>
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${data.completed_by || "Not specified"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Identified Risk Factors</h2>
        <div class="risk-list">
          ${Object.entries(riskFactors)
      .filter(([key, value]) => value === true && !key.toLowerCase().includes('independent'))
      .map(([key, _]) => `
              <div class="risk-item">
                <span class="check-mark">⚠</span>
                <span>${key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, (str) => str.toUpperCase())}</span>
              </div>
            `).join('') || '<div style="grid-column: span 2; text-align: center; color: #6b7280;">No active risk factors identified</div>'}
        </div>
      </div>

      <div class="section">
        <h2>Protective Factors</h2>
        <div class="risk-list">
          <div class="risk-item protective-item">
            <span class="check-mark">${riskFactors.drinksIndependently ? '✓' : '✗'}</span>
            <span>Drinks Independently</span>
          </div>
          <div class="risk-item protective-item">
            <span class="check-mark">${riskFactors.eatsIndependently ? '✓' : '✗'}</span>
            <span>Eats Independently</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Assessment Completion</h2>
        <div class="info-box grid grid-cols-2">
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${data.completed_by}</div>
          </div>
          <div>
            <div class="field-label">Signature</div>
            <div class="field-value" style="font-style: italic; border-bottom: 1px solid #ccc; padding-top: 10px;">
              ${data.signature || data.completed_by}
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Choking Risk Assessment Report - ${data.residentName}</p>
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
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      assessment_date: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completed_by || "Not specified",
      // Ensure risk specific fields are at top level
      risk_factors: assessmentData.risk_factors || assessmentData.assessment_data?.risk_factors || {},
      total_score: assessmentData.total_score || assessmentData.assessment_data?.total_score || 0,
      risk_level: assessmentData.risk_level || assessmentData.assessment_data?.risk_level || "No Risk"
    };

    console.log("Choking Risk PDF API flattening data:", {
      residentName: flattenedData.residentName,
      totalScore: flattenedData.total_score,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateChokingRiskHTML(flattenedData);

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
          "Content-Disposition": `attachment; filename="choking-risk-assessment-${assessmentData.residentName?.replace(/\\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Choking Risk Assessment PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
