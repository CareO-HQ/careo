import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
    const assessment = await convex.query(
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

    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(htmlContent);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="care-plan-assessment-${assessment.residentName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf"`
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

function generateCarePlanHTML(assessment: any): string {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

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
          font-family: Arial, sans-serif;
          line-height: 1.4;
          margin: 20px;
          color: #333;
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

// PDF generation function using Puppeteer
async function generatePDFFromHTML(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      right: "15mm",
      bottom: "20mm",
      left: "15mm"
    }
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
}

