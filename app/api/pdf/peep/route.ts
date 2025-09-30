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

function generatePeepHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Personal Emergency Evacuation Plan (PEEP)</title>
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
        .info-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .understanding-box {
          background-color: ${data.understands ? "#f0fdf4" : "#fef2f2"};
          border: 2px solid ${data.understands ? "#16a34a" : "#dc2626"};
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: center;
        }
        .understanding-text {
          font-size: 1.25rem;
          font-weight: bold;
          color: ${data.understands ? "#166534" : "#991b1b"};
          margin-bottom: 8px;
        }
        .step-item {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .safety-item {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
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
        <h1>Personal Emergency Evacuation Plan (PEEP)</h1>
        <div style="margin-top: 16px;">
          <p><strong>Resident:</strong> ${data.residentName}</p>
          <p><strong>Bedroom Number:</strong> ${data.bedroomNumber}</p>
          <p><strong>Date of Birth:</strong> ${formatDate(data.residentDateOfBirth)}</p>
          <p><strong>Form Completed:</strong> ${formatDate(data.date)}</p>
        </div>
      </div>

      <!-- Assessment Summary -->
      <div class="section">
        <h2>Assessment Summary</h2>
        
        <div class="understanding-box">
          <div class="understanding-text">
            Resident ${data.understands ? "understands" : "does not understand"} evacuation plan
          </div>
          <p style="margin: 0; color: #6b7280;">
            Assessment completed on ${formatDate(data.date)}
          </p>
        </div>

        <div class="grid grid-cols-2">
          <div class="info-box">
            <h3>Staff Required</h3>
            <p style="font-size: 1.5rem; font-weight: bold; color: #059669; margin: 0;">
              ${data.staffNeeded} staff member${data.staffNeeded !== 1 ? "s" : ""}
            </p>
          </div>
          <div class="info-box">
            <h3>Assessment Status</h3>
            <p style="margin: 0; color: #6b7280;">
              <strong>Status:</strong> ${data.status || "Submitted"}
            </p>
          </div>
        </div>

        ${
          data.equipmentNeeded
            ? `
        <div class="info-box">
          <h3>Equipment Needed</h3>
          <p style="color: #6b7280; margin: 0;">${data.equipmentNeeded}</p>
        </div>
        `
            : ""
        }

        ${
          data.communicationNeeds
            ? `
        <div class="info-box">
          <h3>Communication Needs</h3>
          <p style="color: #6b7280; margin: 0;">${data.communicationNeeds}</p>
        </div>
        `
            : ""
        }
      </div>

      <!-- Evacuation Steps -->
      ${
        data.steps && data.steps.length > 0
          ? `
      <div class="section">
        <h2>Evacuation Procedure</h2>
        <p class="info-text">
          Follow these steps in order during an emergency evacuation:
        </p>
        
        ${data.steps
          .map(
            (step: any, index: number) => `
        <div class="step-item">
          <h3>Step ${index + 1}: ${step.name}</h3>
          <p style="color: #6b7280; margin: 0;">${step.description}</p>
        </div>
        `
          )
          .join("")}
      </div>
      `
          : ""
      }

      <!-- Safety Considerations -->
      <div class="section">
        <h2>Safety Considerations</h2>
        <p class="info-text">
          Important safety factors to consider during evacuation:
        </p>

        <div class="safety-item">
          <h3>
            <span class="checkbox">${data.oxigenInUse ? "⚠️" : "✓"}</span>
            Oxygen in Use
          </h3>
          <p><strong>Status:</strong> ${data.oxigenInUse ? "Yes - Oxygen equipment in use" : "No oxygen equipment"}</p>
          ${
            data.oxigenComments
              ? `
          <div style="margin-top: 8px;">
            <p><strong>Comments:</strong></p>
            <p style="color: #6b7280; margin-top: 4px;">${data.oxigenComments}</p>
          </div>
          `
              : ""
          }
        </div>

        <div class="safety-item">
          <h3>
            <span class="checkbox">${data.residentSmokes ? "⚠️" : "✓"}</span>
            Smoking Risk
          </h3>
          <p><strong>Status:</strong> ${data.residentSmokes ? "Resident smokes - Fire risk present" : "Resident does not smoke"}</p>
          ${
            data.residentSmokesComments
              ? `
          <div style="margin-top: 8px;">
            <p><strong>Comments:</strong></p>
            <p style="color: #6b7280; margin-top: 4px;">${data.residentSmokesComments}</p>
          </div>
          `
              : ""
          }
        </div>

        <div class="safety-item">
          <h3>
            <span class="checkbox">${data.furnitureFireRetardant ? "✓" : "⚠️"}</span>
            Furniture Fire Safety
          </h3>
          <p><strong>Status:</strong> ${data.furnitureFireRetardant ? "Furniture is fire retardant" : "Furniture is NOT fire retardant"}</p>
          ${
            data.furnitureFireRetardantComments
              ? `
          <div style="margin-top: 8px;">
            <p><strong>Comments:</strong></p>
            <p style="color: #6b7280; margin-top: 4px;">${data.furnitureFireRetardantComments}</p>
          </div>
          `
              : ""
          }
        </div>
      </div>

      <!-- Completion Details -->
      <div class="section">
        <h2>Form Completion</h2>
        
        <div class="signature-section">
          <h3>Completed By</h3>
          <p style="margin-bottom: 12px; color: #6b7280;">
            Staff member responsible for completing this PEEP assessment:
          </p>
          <div class="grid grid-cols-2">
            <div class="space-y-2">
              <p><strong>Name:</strong> ${data.completedBy}</p>
              <p><strong>Date:</strong> ${formatDate(data.date)}</p>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <p><strong>Digital Signature:</strong></p>
            <div class="signature-box">
              ${data.completedBySignature}
            </div>
          </div>
        </div>
      </div>

      <!-- Important Information -->
      <div class="section">
        <h2>Important Information</h2>
        <div class="warning-box">
          <h3 style="color: #dc2626; margin-bottom: 12px;">Emergency Procedure Notice</h3>
          <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
            <li>This PEEP should be readily accessible to all staff members.</li>
            <li>Review and update this plan regularly or when resident's needs change.</li>
            <li>Ensure all staff are familiar with the evacuation procedure for this resident.</li>
            <li>Emergency services should be informed of any special requirements.</li>
            <li>Practice evacuation procedures regularly with the resident when possible.</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())}</p>
        <p>Personal Emergency Evacuation Plan - ${data.residentName} (Bedroom ${data.bedroomNumber})</p>
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

    console.log("PEEP PDF API request received:", {
      environment: process.env.NODE_ENV,
      hasToken: !!expectedToken,
      hasAuthHeader: !!authHeader
    });

    // Parse the request body
    const peepData = await request.json();

    if (!peepData) {
      return NextResponse.json(
        { error: "PEEP data is required" },
        { status: 400 }
      );
    }

    console.log("PEEP PDF API called with data:", {
      residentName: peepData.residentName,
      bedroomNumber: peepData.bedroomNumber,
      understands: peepData.understands,
      staffNeeded: peepData.staffNeeded,
      formId: peepData._id
    });

    // Generate HTML content
    const htmlContent = generatePeepHTML(peepData);

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
          "Content-Disposition": `attachment; filename="peep-${peepData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("PEEP PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PEEP PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
