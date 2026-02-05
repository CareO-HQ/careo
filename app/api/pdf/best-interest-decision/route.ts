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

function generateBestInterestDecisionHTML(data: any): string {
  // The data passed might be the raw record (with assessment_data field) 
  // or it might be the assessment_data itself. 
  // Let's handle both.
  const form = data.assessment_data || data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Best Interest Decision</title>
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
          border-bottom: 2px solid #6366f1;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #4338ca;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          background-color: #f8fafc;
          padding: 8px 12px;
          border-radius: 4px;
        }
        h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #4338ca;
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
        .field-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
          margin-bottom: 8px;
        }
        .badge-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .badge {
          background-color: #e0e7ff;
          color: #3730a3;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .option-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          background-color: #ffffff;
        }
        .preferred-option {
          border: 2px solid #10b981;
          background-color: #f0fdf4;
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
        <h1>Best Interest Decision Record</h1>
        <p style="color: #6b7280;">Mental Capacity Act 2005</p>
      </div>

      <div class="section">
        <h2>Resident Information</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${form.residentFullName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${formatDate(form.dateOfBirth)}</div>
          </div>
          <div>
            <div class="field-label">Resident ID / File No.</div>
            <div class="field-value">${form.residentIdNumber || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Date of Decision</div>
            <div class="field-value">${form.dateOfDecision || "Not specified"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Decision Details</h2>
        <div class="info-box">
          <div class="field-label">Types of Decision</div>
          <div class="badge-list">
            ${(form.typeOfDecision || []).map((t: string) => `<span class="badge">${t}</span>`).join('') || "None specified"}
          </div>
          ${form.otherDecisionType ? `<p><strong>Other Type:</strong> ${form.otherDecisionType}</p>` : ""}
          <div class="field-label" style="margin-top: 12px;">Decision Required</div>
          <div class="field-value">${form.detailsOfDecision || "No details provided"}</div>
        </div>
      </div>

      <div class="section">
        <h2>Capacity Assessment</h2>
        <div class="info-box">
          <p><strong>Able to understand the decision?</strong> ${form.ableToUnderstand || "No"}</p>
          ${form.ableToUnderstand === "NO" ? `
            <div class="field-label" style="margin-top: 8px;">Reasons for Lack of Capacity:</div>
            <ul style="margin: 4px 0 0 20px;">
              ${form.reasonsForLackOfCapacity?.cognitiveImpairment ? '<li>Cognitive impairment</li>' : ''}
              ${form.reasonsForLackOfCapacity?.communicationDifficulty ? '<li>Communication difficulty</li>' : ''}
              ${form.reasonsForLackOfCapacity?.fluctuatingCapacity ? '<li>Fluctuating capacity</li>' : ''}
              ${form.reasonsForLackOfCapacity?.other ? `<li>Other: ${form.reasonsForLackOfCapacity.otherDetails || ""}</li>` : ''}
            </ul>
          ` : ""}
        </div>
      </div>

      <div class="section">
        <h2>Consultation & Views</h2>
        <div class="info-box">
          <div class="field-label">Discussion held with:</div>
          <div class="badge-list">
            ${(form.discussionWith || []).map((p: string) => `<span class="badge">${p}</span>`).join('') || "None specified"}
          </div>
          <h3>Views Expressed</h3>
          ${(form.viewsExpressed || []).map((v: any) => `
            <div style="margin-bottom: 12px; padding: 8px; border-left: 2px solid #6366f1; background-color: #f8fafc;">
              <p><strong>${v.personConsulted} (${v.relationship}):</strong> ${v.viewPreference}</p>
              ${v.notes ? `<p style="font-size: 0.875rem; color: #4b5563;">Notes: ${v.notes}</p>` : ""}
            </div>
          `).join('') || "No views recorded"}
        </div>
      </div>

      <div class="section">
        <h2>Options Considered</h2>
        ${(form.optionsConsidered || []).map((o: any) => `
          <div class="option-box ${o.preferred ? 'preferred-option' : ''}">
            <p><strong>Option:</strong> ${o.option}</p>
            <p style="font-size: 0.875rem;"><strong>Benefits:</strong> ${o.benefits}</p>
            <p style="font-size: 0.875rem;"><strong>Risks:</strong> ${o.risks}</p>
            ${o.preferred ? '<p><strong style="color: #059669;">✓ PREFERRED OPTION</strong></p>' : ""}
          </div>
        `).join('')}
        <div class="info-box">
          <p><strong>Rationale for Preferred Option:</strong> ${form.reasonForPreferredOption || "N/A"}</p>
          <p><strong>Risks if not followed:</strong> ${form.risksIfNotFollowed || "N/A"}</p>
        </div>
      </div>

      <div class="section">
        <h2>Outcome & Authorization</h2>
        <div class="info-box">
          <p><strong>Final Decision Outcome:</strong> ${form.decisionOutcome || "PROCEED"}</p>
          <p><strong>Summary Rationale:</strong> ${form.summaryRationale || "N/A"}</p>
        </div>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Assessed By</div>
            <div class="field-value">${form.assessorName}</div>
            <div class="field-label">Role</div>
            <div class="field-value">${form.assessorRole}</div>
          </div>
          <div>
            <div class="field-label">Assessor Signature</div>
            <div class="field-value" style="font-style: italic; border-bottom: 1px solid #ccc; padding-top: 10px;">${form.assessorSignature}</div>
            <div class="field-label">Date</div>
            <div class="field-value">${form.assessmentDate}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Decision Maker</div>
            <div class="field-value">${form.decisionMakerName}</div>
          </div>
          <div>
            <div class="field-label">Maker Signature</div>
            <div class="field-value" style="font-style: italic; border-bottom: 1px solid #ccc; padding-top: 10px;">${form.decisionMakerSignature}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Best Interest Decision Report</p>
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
      residentFullName: assessmentData.residentFullName || assessmentData.residentName || assessmentData.assessment_data?.residentFullName || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      residentIdNumber: assessmentData.residentIdNumber || assessmentData.residentId || assessmentData.assessment_data?.residentIdNumber || assessmentData.assessment_data?.residentId,
      dateOfDecision: assessmentData.dateOfDecision || assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      // Ensure other fields used by the template are at the top level
      typeOfDecision: assessmentData.typeOfDecision || assessmentData.assessment_data?.typeOfDecision || [],
      discussionWith: assessmentData.discussionWith || assessmentData.assessment_data?.discussionWith || [],
      viewsExpressed: assessmentData.viewsExpressed || assessmentData.assessment_data?.viewsExpressed || [],
      optionsConsidered: assessmentData.optionsConsidered || assessmentData.assessment_data?.optionsConsidered || []
    };

    console.log("Best Interest Decision PDF API flattening data:", {
      residentFullName: flattenedData.residentFullName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateBestInterestDecisionHTML(flattenedData);

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

      const residentName = (flattenedData.residentFullName || "resident").replace(/\s+/g, "-");

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="best-interest-decision-${residentName}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Best Interest Decision PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
