import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const runtime = "nodejs";

// Create a Convex client for server-side usage
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB");
}

// Helper function to generate PDF filename
function generatePDFFilename(assessment: any): string {
  const sanitize = (str: string) =>
    str.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "-");

  const carePlanName = sanitize(assessment.nameOfCarePlan || "care-plan");
  const residentName = sanitize(assessment.residentName || "resident");
  const date = new Date().toISOString().split("T")[0];

  return `${carePlanName}-${residentName}-${date}.pdf`;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Get the assessment data from Convex
    const assessment = await convexClient.query(
      api.careFiles.carePlan.getCarePlanAssessment,
      {
        assessmentId: assessmentId as Id<"carePlanAssessments">
      }
    );

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Generate HTML for the PDF
    const htmlContent = generateCarePlanHTML(assessment);

    // Generate PDF from HTML using Playwright
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
    } catch (error) {
      await browser.close();
      throw error;
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${generatePDFFilename(assessment)}"`
      }
    });
  } catch (error) {
    console.error("Error generating Care Plan PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for API token authentication (server-to-server)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await request.json();

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Add some debugging
    console.log("Care Plan PDF API called with assessmentId:", assessmentId);

    // Fetch the assessment data directly from Convex
    const assessmentData = await convexClient.query(
      api.careFiles.carePlan.getCarePlanAssessment,
      {
        assessmentId: assessmentId as Id<"carePlanAssessments">
      }
    );

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Generate HTML content
    const htmlContent = generateCarePlanHTML(assessmentData);

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
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${generatePDFFilename(assessmentData)}"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Care Plan PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

function generateCarePlanHTML(assessment: any): string {
  const formatTime = (timeString?: string) => {
    return timeString || "Not specified";
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Care Plan Assessment</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
          color: #111827;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          font-size: 14px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .section-title {
          background-color: #f5f5f5;
          padding: 8px;
          border-left: 4px solid #007bff;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .form-group {
          margin-bottom: 12px;
          display: flex;
          align-items: flex-start;
        }
        .form-label {
          font-weight: bold;
          min-width: 200px;
          margin-right: 15px;
        }
        .form-value {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid #ddd;
          background-color: #f9f9f9;
          word-wrap: break-word;
        }
        .textarea-value {
          min-height: 60px;
          white-space: pre-wrap;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .table th,
        .table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .signature-section {
          margin-top: 30px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Care Plan Assessment</h1>
        <p>Care Plan Number: ${assessment.carePlanNumber}</p>
        <p>Date Written: ${formatDate(assessment.dateWritten)}</p>
      </div>

      <div class="section">
        <div class="section-title">Basic Information</div>
        <div class="form-group">
          <div class="form-label">Name of Care Plan:</div>
          <div class="form-value">${assessment.nameOfCarePlan}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Resident Name:</div>
          <div class="form-value">${assessment.residentName}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Date of Birth:</div>
          <div class="form-value">${formatDate(assessment.dob)}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Bedroom Number:</div>
          <div class="form-value">${assessment.bedroomNumber}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Written By:</div>
          <div class="form-value">${assessment.writtenBy}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Care Plan Details</div>
        <div class="form-group">
          <div class="form-label">Identified Needs:</div>
          <div class="form-value textarea-value">${assessment.identifiedNeeds}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Aims:</div>
          <div class="form-value textarea-value">${assessment.aims}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Planned Care</div>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Details</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            ${assessment.plannedCareDate
              .map(
                (entry: any) => `
              <tr>
                <td>${formatDate(entry.date)}</td>
                <td>${formatTime(entry.time)}</td>
                <td>${entry.details}</td>
                <td>${entry.signature}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="section signature-section">
        <div class="section-title">Review of Patient or Representative</div>
        ${
          assessment.discussedWith
            ? `
        <div class="form-group">
          <div class="form-label">Discussed With:</div>
          <div class="form-value">${assessment.discussedWith}</div>
        </div>
        `
            : ""
        }
        ${
          assessment.signature
            ? `
        <div class="form-group">
          <div class="form-label">Patient/Representative Signature:</div>
          <div class="form-value">${assessment.signature}</div>
        </div>
        `
            : ""
        }
        <div class="form-group">
          <div class="form-label">Review Date:</div>
          <div class="form-value">${formatDate(assessment.date)}</div>
        </div>
        ${
          assessment.staffSignature
            ? `
        <div class="form-group">
          <div class="form-label">Staff Signature:</div>
          <div class="form-value">${assessment.staffSignature}</div>
        </div>
        `
            : ""
        }
      </div>

      <div class="footer">
        <p>Generated on: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}</p>
        <p>This care plan was written by ${assessment.writtenBy} on ${formatDate(assessment.dateWritten)}</p>
      </div>
    </body>
    </html>
  `;
}
