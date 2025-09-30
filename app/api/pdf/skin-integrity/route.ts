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

function getScoreDescription(category: string, score: number): string {
  const descriptions = {
    sensoryPerception: {
      1: "Completely Limited - Unresponsive to painful stimuli due to diminished consciousness or sedation",
      2: "Very Limited - Responds only to painful stimuli, cannot communicate discomfort",
      3: "Slightly Limited - Responds to verbal commands but cannot always communicate discomfort",
      4: "No Impairment - Responds to verbal commands, has no sensory deficit"
    },
    moisture: {
      1: "Constantly Moist - Skin is kept moist almost constantly by perspiration, urine etc.",
      2: "Very Moist - Skin is often but not always moist, linen must be changed at least once a shift",
      3: "Occasionally Moist - Skin is occasionally moist requiring an extra linen change approximately once a day",
      4: "Rarely Moist - Skin is usually dry, linen only requires changing at routine intervals"
    },
    activity: {
      1: "Bedfast - Confined to bed",
      2: "Chairfast - Ability to walk severely limited or non-existent",
      3: "Walks Occasionally - Walks occasionally during day but for very short distances",
      4: "Walks Frequently - Walks outside room at least twice a day and inside room at least once every 2 hours"
    },
    mobility: {
      1: "Completely Immobile - Does not make even slight changes in body or extremity position",
      2: "Very Limited - Makes occasional slight changes in body or extremity position",
      3: "Slightly Limited - Makes frequent though slight changes in body or extremity position",
      4: "No Limitation - Makes major and frequent changes in position without assistance"
    },
    nutrition: {
      1: "Very Poor - Never eats a complete meal, rarely eats more than 1/3 of any food offered",
      2: "Probably Inadequate - Rarely eats a complete meal and generally eats only about 1/2 of any food offered",
      3: "Adequate - Eats over half of most meals, eats a total of 4 servings of protein daily",
      4: "Excellent - Eats most of every meal, never refuses a meal"
    },
    frictionShear: {
      1: "Problem - Requires moderate to maximum assistance in moving",
      2: "Potential Problem - Moves feebly or requires minimum assistance",
      3: "No Apparent Problem - Moves in bed and in chair independently"
    }
  };

  return (
    descriptions[category as keyof typeof descriptions]?.[
      score as keyof (typeof descriptions)[keyof typeof descriptions]
    ] || ""
  );
}

function getRiskLevel(totalScore: number): {
  level: string;
  description: string;
  color: { bg: string; border: string; text: string };
} {
  if (totalScore < 12) {
    return {
      level: "High Risk",
      description: "Implement preventive measures immediately",
      color: { bg: "#fef2f2", border: "#dc2626", text: "#991b1b" }
    };
  }
  if (totalScore === 13 || totalScore === 14) {
    return {
      level: "Moderate Risk",
      description: "Implement preventive measures",
      color: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" }
    };
  }
  return {
    level: "Low Risk",
    description: "Continue routine care",
    color: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" }
  };
}

function generateSkinIntegrityAssessmentHTML(data: any): string {
  const totalScore =
    data.sensoryPerception +
    data.moisture +
    data.activity +
    data.mobility +
    data.nutrition +
    data.frictionShear;
  const riskAssessment = getRiskLevel(totalScore);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Skin Integrity Assessment - Braden Scale</title>
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
        .risk-level-box {
          background-color: ${riskAssessment.color.bg};
          border: 2px solid ${riskAssessment.color.border};
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: center;
        }
        .risk-level-text {
          font-size: 1.5rem;
          font-weight: bold;
          color: ${riskAssessment.color.text};
          margin-bottom: 8px;
        }
        .risk-description {
          font-size: 1rem;
          color: ${riskAssessment.color.text};
          font-weight: 500;
        }
        .total-score {
          font-size: 2rem;
          font-weight: bold;
          color: ${riskAssessment.color.text};
          margin-bottom: 8px;
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
        .assessment-item {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .assessment-category {
          font-weight: 600;
          font-size: 1.1rem;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .assessment-score {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 0.875rem;
        }
        .assessment-description {
          color: #475569;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        .braden-scale-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .braden-scale-table th,
        .braden-scale-table td {
          border: 1px solid #d1d5db;
          padding: 12px;
          text-align: left;
        }
        .braden-scale-table th {
          background-color: #f3f4f6;
          font-weight: 600;
          color: #374151;
        }
        .score-cell {
          text-align: center;
          font-weight: 600;
          color: #1f2937;
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
        <h1>Skin Integrity Assessment</h1>
        <p>Braden Scale for Predicting Pressure Sore Risk</p>
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
          <div class="field-label">Assessment Date</div>
          <div class="field-value">${formatDate(data.date)}</div>
        </div>
      </div>

      <div class="section">
        <h2>Risk Assessment Result</h2>
        <div class="risk-level-box">
          <div class="total-score">${totalScore}</div>
          <div class="risk-level-text">${riskAssessment.level}</div>
          <div class="risk-description">${riskAssessment.description}</div>
        </div>
      </div>

      <div class="section">
        <h2>Braden Scale Assessment Details</h2>
        
        <div class="assessment-item">
          <div class="assessment-category">Sensory Perception</div>
          <div class="assessment-score">Score: ${data.sensoryPerception}</div>
          <div class="assessment-description">${getScoreDescription("sensoryPerception", data.sensoryPerception)}</div>
        </div>

        <div class="assessment-item">
          <div class="assessment-category">Moisture</div>
          <div class="assessment-score">Score: ${data.moisture}</div>
          <div class="assessment-description">${getScoreDescription("moisture", data.moisture)}</div>
        </div>

        <div class="assessment-item">
          <div class="assessment-category">Activity</div>
          <div class="assessment-score">Score: ${data.activity}</div>
          <div class="assessment-description">${getScoreDescription("activity", data.activity)}</div>
        </div>

        <div class="assessment-item">
          <div class="assessment-category">Mobility</div>
          <div class="assessment-score">Score: ${data.mobility}</div>
          <div class="assessment-description">${getScoreDescription("mobility", data.mobility)}</div>
        </div>

        <div class="assessment-item">
          <div class="assessment-category">Nutrition</div>
          <div class="assessment-score">Score: ${data.nutrition}</div>
          <div class="assessment-description">${getScoreDescription("nutrition", data.nutrition)}</div>
        </div>

        <div class="assessment-item">
          <div class="assessment-category">Friction & Shear</div>
          <div class="assessment-score">Score: ${data.frictionShear}</div>
          <div class="assessment-description">${getScoreDescription("frictionShear", data.frictionShear)}</div>
        </div>
      </div>

      <div class="section">
        <h2>Assessment Summary</h2>
        <table class="braden-scale-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Score</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sensory Perception</td>
              <td class="score-cell">${data.sensoryPerception}</td>
              <td>${data.sensoryPerception <= 2 ? "High Risk" : data.sensoryPerception === 3 ? "Moderate Risk" : "Low Risk"}</td>
            </tr>
            <tr>
              <td>Moisture</td>
              <td class="score-cell">${data.moisture}</td>
              <td>${data.moisture <= 2 ? "High Risk" : data.moisture === 3 ? "Moderate Risk" : "Low Risk"}</td>
            </tr>
            <tr>
              <td>Activity</td>
              <td class="score-cell">${data.activity}</td>
              <td>${data.activity <= 2 ? "High Risk" : data.activity === 3 ? "Moderate Risk" : "Low Risk"}</td>
            </tr>
            <tr>
              <td>Mobility</td>
              <td class="score-cell">${data.mobility}</td>
              <td>${data.mobility <= 2 ? "High Risk" : data.mobility === 3 ? "Moderate Risk" : "Low Risk"}</td>
            </tr>
            <tr>
              <td>Nutrition</td>
              <td class="score-cell">${data.nutrition}</td>
              <td>${data.nutrition <= 2 ? "High Risk" : data.nutrition === 3 ? "Moderate Risk" : "Low Risk"}</td>
            </tr>
            <tr>
              <td>Friction & Shear</td>
              <td class="score-cell">${data.frictionShear}</td>
              <td>${data.frictionShear === 1 ? "High Risk" : data.frictionShear === 2 ? "Moderate Risk" : "Low Risk"}</td>
            </tr>
            <tr style="background-color: ${riskAssessment.color.bg}; font-weight: bold;">
              <td><strong>Total Score</strong></td>
              <td class="score-cell"><strong>${totalScore}</strong></td>
              <td><strong>${riskAssessment.level}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This skin integrity assessment was generated electronically using the Braden Scale.</p>
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

    console.log("Skin Integrity Assessment PDF API request received:", {
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

    console.log("Skin Integrity Assessment PDF API called with data:", {
      residentName: assessmentData.residentName,
      bedroomNumber: assessmentData.bedroomNumber,
      totalScore:
        assessmentData.sensoryPerception +
        assessmentData.moisture +
        assessmentData.activity +
        assessmentData.mobility +
        assessmentData.nutrition +
        assessmentData.frictionShear,
      formId: assessmentData._id
    });

    // Generate HTML content
    const htmlContent = generateSkinIntegrityAssessmentHTML(assessmentData);

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
          "Content-Disposition": `attachment; filename="skin-integrity-assessment-${assessmentData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Skin Integrity Assessment PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate Skin Integrity Assessment PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
