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

function generateBedrailConsentHTML(data: any): string {
  // Data could be raw record from DB or form data
  const form = data.assessment_data || data;
  const isAble = form.consentType === "ABLE_TO_CONSENT" || data.capacity_assessed === true;
  const ableSection = form.ableToConsentSection || {};
  const unableSection = form.unableToConsentSection || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bedrail Consent Form</title>
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
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #1d4ed8;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          background-color: #eff6ff;
          padding: 8px 12px;
          border-radius: 4px;
        }
        .section {
          margin-bottom: 32px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
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
          padding: 4px 0;
        }
        .consent-box {
          background-color: #f8fafc;
          border: 2px solid #3b82f6;
          padding: 20px;
          border-radius: 8px;
          margin-top: 16px;
        }
        .signature-line {
          margin-top: 24px;
          border-top: 1px solid #94a3b8;
          padding-top: 8px;
          font-style: italic;
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
        <h1>Bedrail Consent / Agreement Form</h1>
      </div>

      <div class="section">
        <h2>Resident Information</h2>
        <div class="info-grid">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${form.residentName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Bedroom Number</div>
            <div class="field-value">${form.bedroomNumber || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${formatDate(form.dateOfBirth)}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date || Date.now())}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Capacity & Consent Status</h2>
        <p><strong>Capacity Assessed:</strong> ${isAble ? "Resident is able to consent" : "Resident is unable to consent"}</p>
        
        ${isAble ? `
          <div class="consent-box">
            <h3>Resident Agreement</h3>
            <p>
              ${ableSection.consentChoice === "CONSENT_TO_USE"
        ? "<strong>CONSENT GIVEN:</strong> I understand that I may be at risk of falling out of bed and would therefore like bed rails/bumpers to be used on my bed."
        : "<strong>REFUSAL:</strong> I understand that I may be at risk of falling out of bed, but I do NOT want bed rails or bumpers to be used on my bed."
      }
            </p>
            <div class="signature-line">
              Resident Signature: ${ableSection.residentSignature || "Signed Electronically"}
            </div>
            <div class="grid grid-cols-2" style="margin-top: 16px;">
              <div>
                <div class="field-label">Staff Name</div>
                <div class="field-value">${ableSection.staffMemberName || data.completed_by}</div>
              </div>
              <div>
                <div class="field-label">Date signed</div>
                <div class="field-value">${ableSection.staffSignatureDate || formatDate(Date.now())}</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="consent-box">
            <h3>Representative Agreement</h3>
            <p><strong>Representative Name:</strong> ${unableSection.representativeName || data.representative_name}</p>
            <p style="font-style: italic; margin: 12px 0;">
              "I have discussed the issue of using bed rails/bumpers with the professionals concerned and based on my knowledge of the resident's previously expressed wishes and beliefs:"
            </p>
            <p>
              ${unableSection.residentPreference === "WOULD_PREFER_USE"
      ? "The resident <strong>WOULD HAVE PREFERRED</strong> to use bed rails/bumpers"
      : "The resident <strong>WOULD NOT HAVE PREFERRED</strong> to use bed rails/bumpers"
    }
            </p>
            <div class="signature-line">
              Representative Signature: ${unableSection.representativeSignature || "Signed Electronically"}
            </div>
            <div class="grid grid-cols-2" style="margin-top: 16px;">
              <div>
                <div class="field-label">Staff Name</div>
                <div class="field-value">${unableSection.staffMemberName || data.completed_by}</div>
              </div>
              <div>
                <div class="field-label">Date signed</div>
                <div class="field-value">${unableSection.staffSignatureDate || formatDate(Date.now())}</div>
              </div>
            </div>
          </div>
        `}
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Bedrail Consent Record - Managed by CareO-HQ</p>
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
      date: assessmentData.date || assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completedBy: assessmentData.completedBy || assessmentData.completed_by || assessmentData.assessment_data?.completedBy || "Not specified"
    };

    console.log("Bed Rail Consent PDF API flattening data:", {
      residentName: flattenedData.residentName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateBedrailConsentHTML(flattenedData);

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
          "Content-Disposition": `attachment; filename="bedrail-consent-${residentName}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Bedrail Consent PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
