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

function generateHandlingProfileHTML(data: any): string {
  const activities = data.activities || {};

  const activityList = [
    { key: 'transferBed', title: 'Transfer to/from Bed' },
    { key: 'transferChair', title: 'Transfer to/from Chair' },
    { key: 'walking', title: 'Walking' },
    { key: 'toileting', title: 'Toileting' },
    { key: 'movementInBed', title: 'Movement in Bed' },
    { key: 'bath', title: 'Bathing' },
    { key: 'outdoorMobility', title: 'Outdoor Mobility' }
  ];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Resident Handling Profile</title>
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
          border-bottom: 2px solid #8b5cf6;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #5b21b6;
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
          font-size: 1.1rem;
          font-weight: 600;
          color: #5b21b6;
          margin-top: 24px;
          margin-bottom: 12px;
          background-color: #f5f3ff;
          padding: 8px 12px;
          border-radius: 4px;
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
        .activity-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background-color: #ffffff;
        }
        .field-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
          margin-bottom: 4px;
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
        <h1>Resident Handling Profile</h1>
        <p style="color: #6b7280;">Manual Handling & Mobility Assessment</p>
      </div>

      <div class="section">
        <h2>Resident & Administrative Info</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${data.residentName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Bedroom Number</div>
            <div class="field-value">${data.bedroomNumber || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date)}</div>
          </div>
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${data.completed_by || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Job Role</div>
            <div class="field-value">${data.job_role || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Resident Weight</div>
            <div class="field-value">${data.weight || 0} kg</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Physical Status</h2>
        <div class="info-box">
          <div class="field-label">Weight Bearing Status</div>
          <div class="field-value">${data.weight_bearing || "Not specified"}</div>
        </div>
      </div>

      <div class="section">
        <h2>Mobility Activities</h2>
        ${activityList.map(act => {
    const details = activities[act.key] || {};
    return `
            <div class="activity-box">
              <h3>${act.title}</h3>
              <div class="grid grid-cols-2">
                <div>
                  <div class="field-label">Number of Staff</div>
                  <div class="field-value">${details.nStaff || 0}</div>
                </div>
                <div>
                  <div class="field-label">Equipment Used</div>
                  <div class="field-value">${details.equipment || "None"}</div>
                </div>
              </div>
              <div style="margin-top: 8px;">
                <div class="field-label">Handling Plan</div>
                <div class="field-value">${details.handlingPlan || "No details provided"}</div>
              </div>
              <div style="margin-top: 8px;">
                <div class="field-label">Review Date</div>
                <div class="field-value">${formatDate(details.dateForReview)}</div>
              </div>
            </div>
          `;
  }).join('')}
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
              ${data.completed_by}
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Resident Handling Profile Audit</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      bedroomNumber: assessmentData.bedroomNumber || assessmentData.assessment_data?.bedroomNumber,
      assessment_date: assessmentData.assessment_date || assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completed_by || "Not specified",
      job_role: assessmentData.job_role || assessmentData.jobRole || assessmentData.assessment_data?.job_role || "Not specified"
    };

    console.log("Resident Handling Profile PDF API flattening data:", {
      residentName: flattenedData.residentName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateHandlingProfileHTML(flattenedData);

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

      const residentName = (flattenedData.residentName || "resident").replace(/\s+/g, "-");

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="handling-profile-${residentName}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Handling Profile PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
