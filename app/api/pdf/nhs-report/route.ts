import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

interface NHSReportData {
  incident: {
    _id: string;
    date: string;
    time: string;
    incidentTypes?: string[];
    incidentLevel?: string;
    description?: string;
    immediateAction?: string;
    witnesses?: string;
    location?: string;
    [key: string]: unknown;
  };
  trustReport: {
    trustName: string;
    reportType: string;
    additionalNotes?: string;
    createdByName: string;
    _creationTime: number;
    [key: string]: unknown;
  };
  resident?: {
    firstName?: string;
    lastName?: string;
    nhsHealthNumber?: string;
    dateOfBirth?: string;
    [key: string]: unknown;
  };
  isBHSCT?: boolean;
}

function generateBHSCTReportHTML(data: NHSReportData): string {
  const { incident, trustReport, resident } = data;

  // BHSCT Official Logo (simplified SVG version based on official branding)
  const bhsctLogo = `<svg width="280" height="80" viewBox="0 0 280 80" xmlns="http://www.w3.org/2000/svg">
    <!-- HSC Box with teal background -->
    <rect x="0" y="10" width="80" height="60" fill="#00A3A1" rx="4"/>
    <text x="40" y="35" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">HSC</text>
    <g transform="translate(15, 48)">
      <circle cx="8" cy="0" r="2" fill="white" opacity="0.8"/>
      <circle cx="14" cy="0" r="2" fill="white" opacity="0.8"/>
      <circle cx="20" cy="0" r="2" fill="white" opacity="0.8"/>
      <path d="M 5 0 Q 8 3 11 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>
      <path d="M 11 0 Q 14 3 17 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>
      <path d="M 17 0 Q 20 3 23 0" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>
    </g>
    <!-- Trust Name Text -->
    <text x="90" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#2C3E50">Belfast Health and</text>
    <text x="90" y="55" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#2C3E50">Social Care Trust</text>
  </svg>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>BHSCT Incident Report - ${incident.date}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; line-height: 1.6; }
          .header { display: flex; align-items: center; justify-content: space-between; padding: 25px 20px; background: white; border-bottom: 4px solid #00A3A1; margin: -40px -40px 30px -40px; }
          .logo-section { display: flex; align-items: center; }
          .trust-badge { background: #00A3A1; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: white; page-break-inside: avoid; }
          h1 { color: #2C3E50; font-size: 26px; margin: 0; }
          h2 { color: #00A3A1; font-size: 18px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #00A3A1; }
          .field { margin-bottom: 12px; display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
          .label { font-weight: 600; color: #2C3E50; min-width: 200px; }
          .value { color: #555; flex: 1; }
          .critical-banner { background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%); color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3); }
          .moderate-banner { background: linear-gradient(135deg, #f57c00 0%, #ef6c00 100%); color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 2px 8px rgba(245, 124, 0, 0.3); }
          .low-banner { background: linear-gradient(135deg, #388e3c 0%, #2e7d32 100%); color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; display: flex; align-items: center; box-shadow: 0 2px 8px rgba(56, 142, 60, 0.3); }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; font-size: 12px; color: #777; }
          .report-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
          @media print {
            body { padding: 20px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            ${bhsctLogo}
          </div>
          <div class="trust-badge">OFFICIAL REPORT</div>
        </div>

        <h1 style="margin-bottom: 10px;">Patient Safety Incident Report</h1>
        <p style="color: #666; margin-bottom: 25px;">Belfast Health and Social Care Trust</p>

        ${
          incident.incidentLevel === "death" || incident.incidentLevel === "permanent_harm"
            ? '<div class="critical-banner">⚠️ CRITICAL INCIDENT - Immediate escalation required</div>'
            : incident.incidentLevel === "minor_injury"
              ? '<div class="moderate-banner">⚠️ MODERATE INCIDENT - Review required</div>'
              : '<div class="low-banner">✓ LOW RISK INCIDENT</div>'
        }

        <div class="report-info">
          <div class="field" style="border: none;">
            <span class="label">Report Generated:</span>
            <span class="value">${new Date(trustReport._creationTime).toLocaleString("en-GB")}</span>
          </div>
          <div class="field" style="border: none; margin-bottom: 0;">
            <span class="label">Generated By:</span>
            <span class="value">${trustReport.createdByName}</span>
          </div>
        </div>

        <div class="section">
          <h2>Patient Information</h2>
          <div class="field">
            <span class="label">Patient Name:</span>
            <span class="value">${resident?.firstName || "N/A"} ${resident?.lastName || ""}</span>
          </div>
          <div class="field">
            <span class="label">NHS Health Number:</span>
            <span class="value">${resident?.nhsHealthNumber || "Not Available"}</span>
          </div>
          <div class="field">
            <span class="label">Date of Birth:</span>
            <span class="value">${resident?.dateOfBirth || "Not Available"}</span>
          </div>
        </div>

        <div class="section">
          <h2>Incident Details</h2>
          <div class="field">
            <span class="label">Incident Reference:</span>
            <span class="value">${incident._id.slice(-8).toUpperCase()}</span>
          </div>
          <div class="field">
            <span class="label">Date of Incident:</span>
            <span class="value">${incident.date}</span>
          </div>
          <div class="field">
            <span class="label">Time of Incident:</span>
            <span class="value">${incident.time}</span>
          </div>
          <div class="field">
            <span class="label">Location:</span>
            <span class="value">${incident.location || "Not specified"}</span>
          </div>
          <div class="field">
            <span class="label">Incident Type(s):</span>
            <span class="value">${incident.incidentTypes?.join(", ") || "Not specified"}</span>
          </div>
          <div class="field">
            <span class="label">Severity Level:</span>
            <span class="value">${incident.incidentLevel || "Not specified"}</span>
          </div>
        </div>

        <div class="section">
          <h2>Incident Description</h2>
          <p style="color: #555; line-height: 1.8;">${incident.description || "No description provided"}</p>
        </div>

        ${
          incident.immediateAction
            ? `
        <div class="section">
          <h2>Immediate Action Taken</h2>
          <p style="color: #555; line-height: 1.8;">${incident.immediateAction}</p>
        </div>
        `
            : ""
        }

        ${
          incident.witnesses
            ? `
        <div class="section">
          <h2>Witnesses</h2>
          <p style="color: #555; line-height: 1.8;">${incident.witnesses}</p>
        </div>
        `
            : ""
        }

        ${
          trustReport.additionalNotes
            ? `
        <div class="section">
          <h2>Additional Trust Notes</h2>
          <p style="color: #555; line-height: 1.8;">${trustReport.additionalNotes}</p>
        </div>
        `
            : ""
        }

        <div class="footer">
          <p><strong>Belfast Health and Social Care Trust</strong></p>
          <p>This is an official incident report generated on ${new Date().toLocaleDateString("en-GB")}</p>
          <p>Report Reference: BHSCT-${incident._id.slice(-8).toUpperCase()}</p>
          <p style="margin-top: 10px; font-size: 11px;">This document contains confidential patient information and must be handled in accordance with data protection regulations.</p>
        </div>
      </body>
    </html>
  `;
}

function generateNHSReportHTML(data: NHSReportData): string {
  const { incident, trustReport, resident } = data;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>NHS Incident Report - ${incident.date}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #005eb8; border-bottom: 3px solid #005eb8; padding-bottom: 10px; }
          h2 { color: #003087; margin-top: 25px; background: #e8f4fd; padding: 8px; }
          .header { background: #005eb8; color: white; padding: 20px; margin: -20px -20px 20px -20px; }
          .section { margin-bottom: 25px; padding: 15px; border: 1px solid #d4e4f1; }
          .field { margin-bottom: 12px; }
          .label { font-weight: bold; color: #003087; display: inline-block; width: 180px; }
          .value { margin-left: 10px; }
          .nhs-logo { font-size: 24px; font-weight: bold; }
          .critical { background: #fee; padding: 10px; border-left: 4px solid #d5281b; }
          .trust-header { background: #e8f4fd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #005eb8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="nhs-logo">NHS</div>
          <h1 style="color: white; border: none;">Patient Safety Incident Report</h1>
        </div>

        <div class="trust-header">
          <h2 style="margin: 0; background: none; color: #003087;">Trust Information</h2>
          <div class="field" style="margin-top: 10px;">
            <span class="label">NHS Trust:</span>
            <span class="value" style="font-weight: bold; font-size: 16px;">${trustReport.trustName}</span>
          </div>
          <div class="field">
            <span class="label">Report Type:</span>
            <span class="value">${trustReport.reportType.toUpperCase()}</span>
          </div>
          <div class="field">
            <span class="label">Report Generated:</span>
            <span class="value">${new Date(trustReport._creationTime).toLocaleString("en-GB")}</span>
          </div>
          <div class="field">
            <span class="label">Generated By:</span>
            <span class="value">${trustReport.createdByName}</span>
          </div>
        </div>

        ${
          incident.incidentLevel === "death" || incident.incidentLevel === "permanent_harm"
            ? '<div class="critical">⚠️ CRITICAL INCIDENT - This incident requires immediate escalation and review</div>'
            : ""
        }

        <div class="section">
          <h2>Patient Information</h2>
          <div class="field">
            <span class="label">NHS Number:</span>
            <span class="value">${resident?.nhsHealthNumber || "Not Available"}</span>
          </div>
          <div class="field">
            <span class="label">Patient Name:</span>
            <span class="value">${resident?.firstName || "N/A"} ${resident?.lastName || ""}</span>
          </div>
          <div class="field">
            <span class="label">Date of Birth:</span>
            <span class="value">${resident?.dateOfBirth || "Not Available"}</span>
          </div>
        </div>

        <div class="section">
          <h2>Incident Information</h2>
          <div class="field">
            <span class="label">Incident Reference:</span>
            <span class="value">${incident._id.slice(-8).toUpperCase()}</span>
          </div>
          <div class="field">
            <span class="label">Date:</span>
            <span class="value">${incident.date}</span>
          </div>
          <div class="field">
            <span class="label">Time:</span>
            <span class="value">${incident.time}</span>
          </div>
          <div class="field">
            <span class="label">Location:</span>
            <span class="value">${incident.location || "Not specified"}</span>
          </div>
          <div class="field">
            <span class="label">Incident Type(s):</span>
            <span class="value">${incident.incidentTypes?.join(", ") || "Not specified"}</span>
          </div>
          <div class="field">
            <span class="label">Severity Level:</span>
            <span class="value">${incident.incidentLevel || "Not specified"}</span>
          </div>
        </div>

        <div class="section">
          <h2>Description of Incident</h2>
          <p>${incident.description || "No description provided"}</p>
        </div>

        ${
          incident.immediateAction
            ? `
        <div class="section">
          <h2>Immediate Action Taken</h2>
          <p>${incident.immediateAction}</p>
        </div>
        `
            : ""
        }

        ${
          incident.witnesses
            ? `
        <div class="section">
          <h2>Witnesses</h2>
          <p>${incident.witnesses}</p>
        </div>
        `
            : ""
        }

        ${
          trustReport.additionalNotes
            ? `
        <div class="section">
          <h2>Additional Trust Notes</h2>
          <p>${trustReport.additionalNotes}</p>
        </div>
        `
            : ""
        }

        <div class="section" style="background: #f5f5f5; border: none;">
          <p style="font-size: 12px; color: #666;">
            <strong>NHS Patient Safety Incident Report</strong><br>
            Generated: ${new Date().toLocaleString("en-GB")}<br>
            Reference: NHS-${incident._id.slice(-8).toUpperCase()}<br>
            This report has been generated in compliance with NHS incident reporting standards.
          </p>
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
      console.log("PDF API authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const reportData: NHSReportData = await request.json();

    if (!reportData || !reportData.incident || !reportData.trustReport) {
      return NextResponse.json(
        { error: "Incident and trust report data are required" },
        { status: 400 }
      );
    }

    console.log("NHS Report PDF API called:", {
      incidentId: reportData.incident._id,
      trustName: reportData.trustReport.trustName,
      isBHSCT: reportData.isBHSCT
    });

    // Generate HTML content based on trust type
    const htmlContent = reportData.isBHSCT
      ? generateBHSCTReportHTML(reportData)
      : generateNHSReportHTML(reportData);

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

      // Determine filename
      const trustType = reportData.isBHSCT ? "bhsct" : "nhs";
      const fileName = `${trustType}-report-${reportData.incident.date}-${reportData.incident._id.slice(-6)}.pdf`;

      // Return the PDF as a response
      return new NextResponse(pdfBuffer as Buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("NHS Report PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
