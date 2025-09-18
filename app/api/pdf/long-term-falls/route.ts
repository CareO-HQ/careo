import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { assessmentId } = await request.json();

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Get the assessment data from Convex
    const assessment = await convex.query(
      api.careFiles.longTermFalls.getLongTermFallsAssessment,
      {
        id: assessmentId as Id<"longTermFallsRiskAssessments">
      }
    );

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Generate HTML for the PDF
    const htmlContent = generateLongTermFallsHTML(assessment);

    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(htmlContent);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="long-term-falls-assessment-${assessment.completedBy.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error("Error generating Long Term Falls PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function generateLongTermFallsHTML(assessment: any): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatValue = (value: string) => {
    return value
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Calculate risk score
  const { totalScore, riskLevel } = calculateFallsRiskScore(assessment);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Long Term Falls Risk Assessment</title>
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
          align-items: center;
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
        }
        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .checkbox {
          width: 16px;
          height: 16px;
          border: 2px solid #333;
          display: inline-block;
          position: relative;
        }
        .checkbox.checked::after {
          content: "✓";
          position: absolute;
          top: -2px;
          left: 1px;
          font-size: 14px;
          font-weight: bold;
        }
        .score-section {
          background-color: #e9ecef;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
        }
        .score-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .score-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .score-item {
          text-align: center;
        }
        .score-value {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }
        .risk-level {
          font-size: 18px;
          font-weight: bold;
        }
        .risk-low { color: #28a745; }
        .risk-moderate { color: #ffc107; }
        .risk-high { color: #fd7e14; }
        .risk-very-high { color: #dc3545; }
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
        <h1>Long Term Falls Risk Assessment</h1>
        <p>Completion Date: ${formatDate(assessment.completionDate)}</p>
        <p>Completed By: ${assessment.completedBy}</p>
      </div>

      <div class="section">
        <div class="section-title">Demographics & Fall History</div>
        <div class="form-group">
          <div class="form-label">Age Group:</div>
          <div class="form-value">${formatValue(assessment.age)} years</div>
        </div>
        <div class="form-group">
          <div class="form-label">Gender:</div>
          <div class="form-value">${formatValue(assessment.gender)}</div>
        </div>
        <div class="form-group">
          <div class="form-label">History of Falls:</div>
          <div class="form-value">${formatValue(assessment.historyOfFalls)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Mobility & Daily Activities</div>
        <div class="form-group">
          <div class="form-label">Mobility Level:</div>
          <div class="form-value">${formatValue(assessment.mobilityLevel)}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Can Stand Unsupported:</div>
          <div class="form-value">
            <div class="checkbox-group">
              <span class="checkbox ${assessment.standUnsupported ? "checked" : ""}"></span>
              <span>${assessment.standUnsupported ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-label">Personal Care Activities:</div>
          <div class="form-value">${formatValue(assessment.personalActivities)}</div>
        </div>
        ${
          assessment.domesticActivities
            ? `
        <div class="form-group">
          <div class="form-label">Domestic Activities:</div>
          <div class="form-value">${formatValue(assessment.domesticActivities)}</div>
        </div>
        `
            : ""
        }
      </div>

      <div class="section">
        <div class="section-title">Environmental & Physical Factors</div>
        <div class="form-group">
          <div class="form-label">Footwear Assessment:</div>
          <div class="form-value">${formatValue(assessment.footwear)}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Vision Problems:</div>
          <div class="form-value">
            <div class="checkbox-group">
              <span class="checkbox ${assessment.visionProblems ? "checked" : ""}"></span>
              <span>${assessment.visionProblems ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-label">Bladder/Bowel Issues:</div>
          <div class="form-value">${formatValue(assessment.bladderBowelMovement)}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Environmental Risks:</div>
          <div class="form-value">
            <div class="checkbox-group">
              <span class="checkbox ${assessment.residentEnvironmentalRisks ? "checked" : ""}"></span>
              <span>${assessment.residentEnvironmentalRisks ? "Present" : "Not Present"}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Medical & Social Factors</div>
        <div class="form-group">
          <div class="form-label">Social Support:</div>
          <div class="form-value">${formatValue(assessment.socialRisks)}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Medical Conditions:</div>
          <div class="form-value">${formatValue(assessment.medicalCondition)}</div>
        </div>
        <div class="form-group">
          <div class="form-label">Number of Medications:</div>
          <div class="form-value">${formatValue(assessment.medicines)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Assessment Completion</div>
        <div class="form-group">
          <div class="form-label">Safety Awareness:</div>
          <div class="form-value">
            <div class="checkbox-group">
              <span class="checkbox ${assessment.safetyAwarness ? "checked" : ""}"></span>
              <span>${assessment.safetyAwarness ? "Demonstrates" : "Does Not Demonstrate"}</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-label">Mental State:</div>
          <div class="form-value">${formatValue(assessment.mentalState)}</div>
        </div>
      </div>

      <div class="score-section">
        <div class="score-title">Risk Assessment Results</div>
        <div class="score-grid">
          <div class="score-item">
            <div>Total Score</div>
            <div class="score-value">${totalScore}</div>
          </div>
          <div class="score-item">
            <div>Risk Level</div>
            <div class="risk-level risk-${riskLevel.toLowerCase().replace(" ", "-")}">${riskLevel}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}</p>
        <p>This assessment was completed by ${assessment.completedBy} on ${formatDate(assessment.completionDate)}</p>
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

// Calculate falls risk score (you'll need to implement this based on your scoring system)
function calculateFallsRiskScore(assessment: any) {
  // This is a placeholder implementation - adjust based on your actual scoring criteria
  let score = 0;

  // Age scoring
  if (assessment.age === "86+") score += 3;
  else if (assessment.age === "81-85") score += 2;
  else if (assessment.age === "65-80") score += 1;

  // Gender scoring
  if (assessment.gender === "FEMALE") score += 1;

  // Fall history scoring
  if (assessment.historyOfFalls === "RECURRENT-LAST-12") score += 4;
  else if (assessment.historyOfFalls === "FALL-LAST-12") score += 3;
  else if (assessment.historyOfFalls === "FALL-MORE-THAN-12") score += 1;

  // Mobility scoring
  if (assessment.mobilityLevel === "IMMOBILE") score += 4;
  else if (assessment.mobilityLevel === "ASSISTANCE-2-AID") score += 3;
  else if (assessment.mobilityLevel === "ASSISTANCE-1-AID") score += 2;
  else if (assessment.mobilityLevel === "INDEPENDENT-WITH-AID") score += 1;

  // Additional factors
  if (!assessment.standUnsupported) score += 2;
  if (assessment.visionProblems) score += 1;
  if (assessment.residentEnvironmentalRisks) score += 1;
  if (assessment.footwear === "UNSAFE") score += 1;
  if (assessment.bladderBowelMovement === "FREQUENCY") score += 2;
  else if (assessment.bladderBowelMovement === "IDENTIFIED-PROBLEMS")
    score += 1;
  if (assessment.socialRisks === "LIVES-ALONE") score += 2;
  else if (assessment.socialRisks === "LIMITED-SUPPORT") score += 1;
  if (assessment.medicines === "4-OR-MORE") score += 2;
  else if (assessment.medicines === "LESS-4") score += 1;
  if (!assessment.safetyAwarness) score += 2;
  if (assessment.mentalState === "CONFUSED") score += 2;

  // Determine risk level
  let riskLevel = "LOW";
  if (score >= 20) riskLevel = "VERY HIGH";
  else if (score >= 15) riskLevel = "HIGH";
  else if (score >= 10) riskLevel = "MODERATE";

  return { totalScore: score, riskLevel };
}
