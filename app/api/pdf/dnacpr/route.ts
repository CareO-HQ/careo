import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

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

function getReasonText(reason: string): string {
  switch (reason) {
    case "TERMINAL-PROGRESSIVE":
      return "Terminal Progressive Illness";
    case "UNSUCCESSFUL-CPR":
      return "CPR Likely to be Unsuccessful";
    case "OTHER":
      return "Other Reason";
    default:
      return reason;
  }
}

function generateDnacprHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>DNACPR Form</title>
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
          text-align: center;
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
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        h3 {
          font-weight: 500;
          margin-bottom: 8px;
          color: #111827;
          font-size: 1.1rem;
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
        .decision-box {
          background-color: ${data.dnacpr ? "#fef3c7" : "#f3f4f6"};
          border: 2px solid ${data.dnacpr ? "#f59e0b" : "#9ca3af"};
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: center;
        }
        .decision-text {
          font-size: 1.5rem;
          font-weight: bold;
          color: ${data.dnacpr ? "#92400e" : "#374151"};
          margin-bottom: 8px;
        }
        .reason-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .discussion-item {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .checkbox {
          font-size: 1.2rem;
          color: #059669;
          font-weight: bold;
          margin-right: 8px;
        }
        .signature-section {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          background-color: #fafafa;
        }
        .signature-box {
          border-bottom: 1px solid #6b7280;
          min-height: 40px;
          padding: 8px 0;
          margin-bottom: 8px;
          font-style: italic;
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
        .space-y-2 > * + * {
          margin-top: 8px;
        }
        .space-y-4 > * + * {
          margin-top: 16px;
        }
        .info-text {
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 16px;
        }
        .warning-box {
          background-color: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        @media print {
          body { max-width: none; margin: 0; padding: 16px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>Do Not Attempt Cardiopulmonary Resuscitation (DNACPR)</h1>
        <div style="margin-top: 16px;">
          <p><strong>Resident:</strong> ${data.residentName}</p>
          <p><strong>Bedroom Number:</strong> ${data.bedroomNumber}</p>
          <p><strong>Date of Birth:</strong> ${formatDate(data.dateOfBirth)}</p>
          <p><strong>Form Completed:</strong> ${formatDate(data.date)}</p>
        </div>
      </div>

      <!-- DNACPR Decision -->
      <div class="section">
        <h2>DNACPR Decision</h2>
        <div class="decision-box">
          <div class="decision-text">
            ${data.dnacpr ? "DNACPR - Do Not Attempt CPR" : "CPR Should Be Attempted"}
          </div>
          <p style="margin: 0; color: #6b7280;">
            Decision made on ${formatDate(data.date)}
          </p>
        </div>

        ${
          data.dnacpr
            ? `
        <div class="reason-box">
          <h3>Reason for DNACPR Decision</h3>
          <p><strong>${getReasonText(data.reason)}</strong></p>
          ${
            data.dnacprComments
              ? `
          <div style="margin-top: 12px;">
            <p><strong>Additional Comments:</strong></p>
            <p style="color: #6b7280; margin-top: 4px;">${data.dnacprComments}</p>
          </div>
          `
              : ""
          }
        </div>
        `
            : ""
        }
      </div>

      <!-- Discussions -->
      <div class="section">
        <h2>Discussions Held</h2>
        <p class="info-text">
          Record of discussions held regarding the DNACPR decision with relevant parties:
        </p>

        <div class="discussion-item">
          <h3>
            <span class="checkbox">${data.discussedResident ? "✓" : "✗"}</span>
            Discussion with Resident
          </h3>
          ${
            data.discussedResident
              ? `
            ${data.discussedResidentDate ? `<p><strong>Date of Discussion:</strong> ${formatDate(data.discussedResidentDate)}</p>` : ""}
            ${
              data.discussedResidentComments
                ? `
            <div style="margin-top: 8px;">
              <p><strong>Comments:</strong></p>
              <p style="color: #6b7280; margin-top: 4px;">${data.discussedResidentComments}</p>
            </div>
            `
                : ""
            }
          `
              : `
            <p style="color: #6b7280; margin-top: 4px;">No discussion held with resident</p>
          `
          }
        </div>

        <div class="discussion-item">
          <h3>
            <span class="checkbox">${data.discussedRelatives ? "✓" : "✗"}</span>
            Discussion with Relatives
          </h3>
          ${
            data.discussedRelatives
              ? `
            ${data.discussedRelativeDate ? `<p><strong>Date of Discussion:</strong> ${formatDate(data.discussedRelativeDate)}</p>` : ""}
            ${
              data.discussedRelativesComments
                ? `
            <div style="margin-top: 8px;">
              <p><strong>Comments:</strong></p>
              <p style="color: #6b7280; margin-top: 4px;">${data.discussedRelativesComments}</p>
            </div>
            `
                : ""
            }
          `
              : `
            <p style="color: #6b7280; margin-top: 4px;">No discussion held with relatives</p>
          `
          }
        </div>

        <div class="discussion-item">
          <h3>
            <span class="checkbox">${data.discussedNOKs ? "✓" : "✗"}</span>
            Discussion with Next of Kin
          </h3>
          ${
            data.discussedNOKs
              ? `
            ${data.discussedNOKsDate ? `<p><strong>Date of Discussion:</strong> ${formatDate(data.discussedNOKsDate)}</p>` : ""}
            ${
              data.discussedNOKsComments
                ? `
            <div style="margin-top: 8px;">
              <p><strong>Comments:</strong></p>
              <p style="color: #6b7280; margin-top: 4px;">${data.discussedNOKsComments}</p>
            </div>
            `
                : ""
            }
          `
              : `
            <p style="color: #6b7280; margin-top: 4px;">No discussion held with next of kin</p>
          `
          }
        </div>

        ${
          data.comments
            ? `
        <div class="discussion-item">
          <h3>Additional Comments</h3>
          <p style="color: #6b7280;">${data.comments}</p>
        </div>
        `
            : ""
        }
      </div>

      <!-- Signatures -->
      <div class="section">
        <h2>Signatures and Authorization</h2>
        
        <div class="signature-section">
          <h3>GP Signature</h3>
          <p style="margin-bottom: 12px; color: #6b7280;">
            General Practitioner authorization and signature:
          </p>
          <div class="grid grid-cols-2">
            <div class="space-y-2">
              <p><strong>Date:</strong> ${formatDate(data.gpDate)}</p>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <p><strong>GP Signature:</strong></p>
            <div class="signature-box">
              ${data.gpSignature}
            </div>
          </div>
        </div>

        <div class="signature-section">
          <h3>Resident/Next of Kin Signature</h3>
          <p style="margin-bottom: 12px; color: #6b7280;">
            Acknowledgment signature from resident or next of kin:
          </p>
          <div class="signature-box">
            ${data.residentNokSignature}
          </div>
        </div>

        <div class="signature-section">
          <h3>Registered Nurse Signature</h3>
          <p style="margin-bottom: 12px; color: #6b7280;">
            Registered nurse verification and signature:
          </p>
          <div class="signature-box">
            ${data.registeredNurseSignature}
          </div>
        </div>
      </div>

      <!-- Important Information -->
      <div class="section">
        <h2>Important Information</h2>
        <div class="warning-box">
          <h3 style="color: #dc2626; margin-bottom: 12px;">Critical Notice</h3>
          <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
            <li>This DNACPR decision applies only to cardiopulmonary resuscitation.</li>
            <li>All other appropriate medical treatment and care should continue.</li>
            <li>This decision can be reviewed and changed at any time.</li>
            <li>Staff should ensure this form is easily accessible in the resident's care records.</li>
            <li>Emergency services should be informed of this decision when relevant.</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())}</p>
        <p>DNACPR Form - ${data.residentName} (Bedroom ${data.bedroomNumber})</p>
        ${data._id ? `<p>Form ID: ${data._id}</p>` : ""}
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

    console.log("DNACPR PDF API request received:", {
      environment: process.env.NODE_ENV,
      hasToken: !!expectedToken,
      hasAuthHeader: !!authHeader
    });

    // Parse the request body
    const dnacprData = await request.json();

    if (!dnacprData) {
      return NextResponse.json(
        { error: "DNACPR data is required" },
        { status: 400 }
      );
    }

    console.log("DNACPR PDF API called with data:", {
      residentName: dnacprData.residentName,
      bedroomNumber: dnacprData.bedroomNumber,
      dnacprDecision: dnacprData.dnacpr,
      formId: dnacprData._id
    });

    // Generate HTML content
    const htmlContent = generateDnacprHTML(dnacprData);

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
          "Content-Disposition": `attachment; filename="dnacpr-${dnacprData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("DNACPR PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate DNACPR PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
