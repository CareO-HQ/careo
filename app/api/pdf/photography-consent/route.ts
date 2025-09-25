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

function generatePhotographyConsentHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Photography Consent Form</title>
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
        .consent-item {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .consent-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 8px;
        }
        .checkbox {
          font-size: 1.2rem;
          color: #059669;
          font-weight: bold;
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
        @media print {
          body { max-width: none; margin: 0; padding: 16px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>Photography and Image Use Consent Form</h1>
        <div style="margin-top: 16px;">
          <p><strong>Resident:</strong> ${data.residentName}</p>
          <p><strong>Bedroom Number:</strong> ${data.bedroomNumber}</p>
          <p><strong>Date of Birth:</strong> ${formatDate(data.dateOfBirth)}</p>
          <p><strong>Form Completed:</strong> ${formatDate(data.date)}</p>
        </div>
      </div>

      <!-- Introduction -->
      <div class="section">
        <div class="info-text">
          This form is used to obtain consent for photography and image use relating to the resident's care and activities. 
          Please read each section carefully and indicate your consent preferences below.
        </div>
      </div>

      <!-- Consent Permissions -->
      <div class="section">
        <h2>Consent Permissions</h2>
        <p class="info-text">
          Please indicate which types of photography and image use you consent to:
        </p>
        
        <div class="consent-item">
          <div class="consent-checkbox">
            <span class="checkbox">${data.healthcareRecords ? "✓" : "✗"}</span>
            <div>
              <strong>Healthcare Records</strong>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 0.9rem;">
                Photography for medical documentation, wound care monitoring, and healthcare record purposes.
              </p>
            </div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 0.9rem;">
            <strong>Consent:</strong> ${data.healthcareRecords ? "YES - I consent to healthcare photography" : "NO - I do not consent to healthcare photography"}
          </p>
        </div>

        <div class="consent-item">
          <div class="consent-checkbox">
            <span class="checkbox">${data.socialActivitiesInternal ? "✓" : "✗"}</span>
            <div>
              <strong>Internal Social Activities</strong>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 0.9rem;">
                Photography during internal activities, celebrations, and events for internal facility use only.
              </p>
            </div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 0.9rem;">
            <strong>Consent:</strong> ${data.socialActivitiesInternal ? "YES - I consent to internal activity photography" : "NO - I do not consent to internal activity photography"}
          </p>
        </div>

        <div class="consent-item">
          <div class="consent-checkbox">
            <span class="checkbox">${data.socialActivitiesExternal ? "✓" : "✗"}</span>
            <div>
              <strong>External Social Activities & Marketing</strong>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 0.9rem;">
                Photography for marketing materials, website, social media, newsletters, and promotional activities.
              </p>
            </div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 0.9rem;">
            <strong>Consent:</strong> ${data.socialActivitiesExternal ? "YES - I consent to external/marketing photography" : "NO - I do not consent to external/marketing photography"}
          </p>
        </div>
      </div>

      <!-- Signatures -->
      <div class="section">
        <h2>Signatures and Consent</h2>
        
        ${
          data.residentSignature
            ? `
        <div class="signature-section">
          <h3>Resident Signature</h3>
          <p style="margin-bottom: 12px; color: #6b7280;">
            The resident has provided their own consent and signature:
          </p>
          <div class="signature-box">
            ${data.residentSignature}
          </div>
          <p style="font-size: 0.9rem; color: #6b7280;">
            Signed by resident on ${formatDate(data.date)}
          </p>
        </div>
        `
            : ""
        }

        ${
          data.representativeName || data.representativeSignature
            ? `
        <div class="signature-section">
          <h3>Representative Consent</h3>
          <p style="margin-bottom: 12px; color: #6b7280;">
            Consent provided by authorized representative:
          </p>
          <div class="grid grid-cols-2">
            <div class="space-y-2">
              <p><strong>Representative Name:</strong> ${data.representativeName || "N/A"}</p>
              <p><strong>Relationship:</strong> ${data.representativeRelationship || "N/A"}</p>
            </div>
            <div class="space-y-2">
              ${data.representativeDate ? `<p><strong>Date Signed:</strong> ${formatDate(data.representativeDate)}</p>` : ""}
            </div>
          </div>
          <div style="margin-top: 16px;">
            <p><strong>Representative Signature:</strong></p>
            <div class="signature-box">
              ${data.representativeSignature || ""}
            </div>
          </div>
        </div>
        `
            : ""
        }
      </div>

      <!-- Staff Verification -->
      <div class="section">
        <h2>Staff Verification</h2>
        <div class="signature-section">
          <p style="margin-bottom: 16px; color: #6b7280;">
            This consent form has been completed and verified by a member of staff:
          </p>
          <div class="grid grid-cols-2">
            <div class="space-y-2">
              <p><strong>Staff Name:</strong> ${data.nameStaff}</p>
              <p><strong>Date Completed:</strong> ${formatDate(data.date)}</p>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <p><strong>Staff Signature:</strong></p>
            <div class="signature-box">
              ${data.staffSignature}
            </div>
          </div>
        </div>
      </div>

      <!-- Important Information -->
      <div class="section">
        <h2>Important Information</h2>
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px;">
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            <li>This consent can be withdrawn at any time by contacting the care facility.</li>
            <li>Any existing photographs will be handled according to your updated preferences.</li>
            <li>Medical photography for healthcare records may be necessary regardless of consent for other types.</li>
            <li>This consent applies only to photography taken by facility staff and authorized personnel.</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())}</p>
        <p>Photography Consent Form - ${data.residentName} (Bedroom ${data.bedroomNumber})</p>
        ${data._id ? `<p>Consent ID: ${data._id}</p>` : ""}
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

    console.log("Photography Consent PDF API request received:", {
      environment: process.env.NODE_ENV,
      hasToken: !!expectedToken,
      hasAuthHeader: !!authHeader
    });

    // Parse the request body
    const consentData = await request.json();

    if (!consentData) {
      return NextResponse.json(
        { error: "Photography consent data is required" },
        { status: 400 }
      );
    }

    console.log("Photography Consent PDF API called with data:", {
      residentName: consentData.residentName,
      bedroomNumber: consentData.bedroomNumber,
      consentId: consentData._id
    });

    // Generate HTML content
    const htmlContent = generatePhotographyConsentHTML(consentData);

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
          "Content-Disposition": `attachment; filename="photography-consent-${consentData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Photography consent PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate photography consent PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
