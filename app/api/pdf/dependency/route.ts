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

function getDependencyLevelDescription(level: string): string {
  switch (level) {
    case "A":
      return "High dependency - Requires extensive care and supervision";
    case "B":
      return "Medium-high dependency - Requires significant care assistance";
    case "C":
      return "Medium dependency - Requires moderate care assistance";
    case "D":
      return "Low dependency - Requires minimal care assistance";
    default:
      return level;
  }
}

function getDependencyLevelColor(level: string): {
  bg: string;
  border: string;
  text: string;
} {
  switch (level) {
    case "A":
      return { bg: "#fef2f2", border: "#dc2626", text: "#991b1b" };
    case "B":
      return { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" };
    case "C":
      return { bg: "#ecfdf5", border: "#10b981", text: "#065f46" };
    case "D":
      return { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" };
    default:
      return { bg: "#f3f4f6", border: "#9ca3af", text: "#374151" };
  }
}

function generateDependencyAssessmentHTML(data: any): string {
  const colors = getDependencyLevelColor(data.dependencyLevel);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Dependency Assessment</title>
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
        .dependency-level-box {
          background-color: ${colors.bg};
          border: 2px solid ${colors.border};
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: center;
        }
        .dependency-level-text {
          font-size: 1.5rem;
          font-weight: bold;
          color: ${colors.text};
          margin-bottom: 8px;
        }
        .dependency-description {
          font-size: 1rem;
          color: ${colors.text};
          font-weight: 500;
        }
        .field-group {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .field-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
          word-wrap: break-word;
        }
        .signature-section {
          border-top: 2px solid #e5e7eb;
          padding-top: 24px;
          margin-top: 32px;
        }
        .signature-box {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 20px;
          margin: 16px 0;
          min-height: 60px;
          position: relative;
        }
        .signature-label {
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          font-size: 0.875rem;
        }
        .signature-name {
          font-family: cursive;
          font-size: 1.125rem;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .signature-date {
          font-size: 0.875rem;
          color: #64748b;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 0.75rem;
          color: #6b7280;
        }
        @media print {
          body {
            margin: 0;
            padding: 15px;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Dependency Assessment</h1>
        <p>Care Home Assessment Form</p>
      </div>

      <div class="section">
        <h2>Resident Information</h2>
        <div class="grid grid-cols-2">
          <div class="field-group">
            <div class="field-label">Resident Name</div>
            <div class="field-value">${data.residentName || "Not specified"}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Bedroom Number</div>
            <div class="field-value">${data.bedroomNumber || "Not specified"}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label">Date of Birth</div>
          <div class="field-value">${data.dateOfBirth ? formatDate(data.dateOfBirth) : "Not specified"}</div>
        </div>
      </div>

      <div class="section">
        <h2>Dependency Assessment Result</h2>
        <div class="dependency-level-box">
          <div class="dependency-level-text">Level ${data.dependencyLevel}</div>
          <div class="dependency-description">${getDependencyLevelDescription(data.dependencyLevel)}</div>
        </div>
      </div>

      <div class="section">
        <h2>Assessment Details</h2>
        <div class="field-group">
          <div class="field-label">Assessment Date</div>
          <div class="field-value">${formatDate(data.date)}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Assessment Status</div>
          <div class="field-value">${data.status || "Submitted"}</div>
        </div>
      </div>

      <div class="signature-section">
        <h2>Assessment Completion</h2>
        <div class="signature-box">
          <div class="signature-label">Completed By</div>
          <div class="signature-name">${data.completedBy}</div>
        </div>
        
        <div class="signature-box">
          <div class="signature-label">Digital Signature</div>
          <div class="signature-name">${data.completedBySignature}</div>
          <div class="signature-date">Signed on ${formatDate(data.date)}</div>
        </div>
      </div>

      <div class="footer">
        <p>This dependency assessment was generated electronically and is valid without a physical signature.</p>
        <p>Generated on ${formatDateTime(Date.now())}</p>
        ${data._id ? `<p>Assessment ID: ${data._id}</p>` : ""}
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

    console.log("Dependency Assessment PDF API request received:", {
      environment: process.env.NODE_ENV,
      hasToken: !!expectedToken,
      hasAuthHeader: !!authHeader
    });

    // Parse the request body
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment data is required" },
        { status: 400 }
      );
    }

    console.log("Dependency Assessment PDF API called with data:", {
      residentName: assessmentData.residentName,
      bedroomNumber: assessmentData.bedroomNumber,
      dependencyLevel: assessmentData.dependencyLevel,
      formId: assessmentData._id
    });

    // Generate HTML content
    const htmlContent = generateDependencyAssessmentHTML(assessmentData);

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
          "Content-Disposition": `attachment; filename="dependency-assessment-${assessmentData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Dependency Assessment PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate Dependency Assessment PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
