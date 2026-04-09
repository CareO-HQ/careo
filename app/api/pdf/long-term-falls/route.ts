import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

type AssessmentDetails = {
  age?: string;
  gender?: string;
  historyOfFalls?: string;
  mobilityLevel?: string;
  balance?: string;
  adlPersonal?: string;
  adlDomestic?: string;
  footwear?: string;
  visionProblems?: string;
  bladderBowel?: string;
  environmentalRisks?: string;
  socialRisks?: string;
  medicalConditions?: string;
  medicines?: string;
  safetyAwareness?: string;
  mentalState?: string;
};

type FallAssessmentPayload = {
  residentName?: string;
  dateOfBirth?: string | number;
  dateOfAssessment?: string | number;
  completionDate?: string | number;
  assessment_date?: string | number;
  time?: string;
  completedBy?: string;
  completed_by?: string;
  signature?: string;
  total_score?: number;
  risk_level?: string;
  assessment_details?: AssessmentDetails;
};

function formatDate(dateValue?: string | number): string {
  if (!dateValue) return "Not specified";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-GB");
}

function valueOrFallback(value?: string): string {
  if (!value || !value.trim()) return "Not provided";
  return value;
}

function yesNoValue(value?: string): "Yes" | "No" {
  return value?.toLowerCase() === "yes" ? "Yes" : "No";
}

function getScore(label: string | undefined, options: ReadonlyArray<{ label: string; value: number }>): number {
  if (!label) return 0;
  const option = options.find((entry) => entry.label === label);
  return option ? option.value : 0;
}

function calculateFallsRiskScore(details: AssessmentDetails): number {
  const medicalConditionValue =
    details.medicalConditions === "Neurological/Postural/Cardiac/MuscularSkeletal/Fracture"
      ? 2
      : getScore(details.medicalConditions, [
          { label: "Neurological", value: 2 },
          { label: "Postural", value: 2 },
          { label: "Cardiac", value: 2 },
          { label: "MuscularSkeletal", value: 2 },
          { label: "Fracture", value: 2 },
          { label: "Listed conditions", value: 1 },
          { label: "No identified medical conditions", value: 0 }
        ]);

  return (
    getScore(details.age, [
      { label: "86+", value: 3 },
      { label: "81-85", value: 2 },
      { label: "65-80", value: 1 },
      { label: "Under 65", value: 0 }
    ]) +
    getScore(details.gender, [
      { label: "Female", value: 3 },
      { label: "Male", value: 1 }
    ]) +
    getScore(details.historyOfFalls, [
      { label: "Recurrent falls in last 12 months", value: 3 },
      { label: "Fall in last 12 months", value: 2 },
      { label: "Fall more than 12 months ago", value: 1 },
      { label: "Never Fallen", value: 0 }
    ]) +
    getScore(details.mobilityLevel, [
      { label: "Assistance of 1 +/- aid", value: 3 },
      { label: "Assistance of 2 +/- aid", value: 2 },
      { label: "Independent with walking aid", value: 1 },
      { label: "Independent and safe unaided", value: 0 },
      { label: "Immobile/Hoist", value: 0 }
    ]) +
    getScore(details.balance, [
      { label: "No", value: 3 },
      { label: "Yes", value: 0 }
    ]) +
    getScore(details.adlPersonal, [
      { label: "Requires assistance", value: 2 },
      { label: "Independent with equipment", value: 1 },
      { label: "Independent & Safe", value: 0 }
    ]) +
    getScore(details.adlDomestic, [
      { label: "Requires assistance", value: 2 },
      { label: "Independent with equipment", value: 1 },
      { label: "Independent & Safe", value: 0 }
    ]) +
    getScore(details.footwear, [
      { label: "Unsafe", value: 3 },
      { label: "Safe", value: 0 }
    ]) +
    getScore(details.visionProblems, [
      { label: "Yes", value: 3 },
      { label: "No", value: 0 }
    ]) +
    getScore(details.bladderBowel, [
      { label: "Frequency", value: 3 },
      { label: "Identified problems", value: 2 },
      { label: "No identified problems", value: 0 }
    ]) +
    getScore(details.environmentalRisks, [
      { label: "Yes", value: 3 },
      { label: "No", value: 0 }
    ]) +
    getScore(details.socialRisks, [
      { label: "Lives Alone", value: 3 },
      { label: "Residential limited support", value: 2 },
      { label: "24-hour care", value: 1 }
    ]) +
    medicalConditionValue +
    getScore(details.medicines, [
      { label: "4 or more medicines", value: 3 },
      { label: "Less than 4 medicines", value: 1 },
      { label: "No medicines", value: 0 }
    ]) +
    getScore(details.safetyAwareness, [
      { label: "No", value: 3 },
      { label: "Yes", value: 0 }
    ]) +
    getScore(details.mentalState, [
      { label: "Confused", value: 3 },
      { label: "Orientated", value: 0 }
    ])
  );
}

function getRiskLevel(score: number): "Low Risk" | "Medium Risk" | "High Risk" {
  if (score <= 17) return "Low Risk";
  if (score <= 23) return "Medium Risk";
  return "High Risk";
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = (await request.json()) as FallAssessmentPayload;

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment data is required" },
        { status: 400 }
      );
    }

    const details: AssessmentDetails = assessmentData.assessment_details || {};
    const calculatedScore = calculateFallsRiskScore(details);
    const totalScore = typeof assessmentData.total_score === "number" ? assessmentData.total_score : calculatedScore;
    const riskLevel = assessmentData.risk_level || getRiskLevel(totalScore);

    const htmlContent = generateLongTermFallsHTML(assessmentData, details, totalScore, riskLevel);

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
        landscape: true,
        printBackground: true,
        margin: {
          top: "12px",
          bottom: "12px",
          left: "12px",
          right: "12px"
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="long-term-falls-assessment-${assessmentData.residentName?.replace(/\s+/g, "-") || "record"}.pdf"`
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Error generating Long Term Falls PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function generateLongTermFallsHTML(
  assessment: FallAssessmentPayload,
  details: AssessmentDetails,
  totalScore: number,
  riskLevel: string
): string {
  const assessmentDate = assessment.dateOfAssessment || assessment.assessment_date || assessment.completionDate;
  const completedBy = assessment.completedBy || assessment.completed_by;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Long Term Falls Risk Assessment</title>
      <style>
        @page { size: A4 landscape; margin: 12px; }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.3;
          margin: 0;
          color: #333;
          font-size: 12px;
        }
        .header {
          border-bottom: 2px solid #333333;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
        }
        .meta-grid {
          margin-top: 8px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
        }
        .meta-item {
          border: 1px solid #dcdcdc;
          padding: 6px;
          background: #fafafa;
        }
        .meta-label {
          font-size: 10px;
          color: #666666;
          margin-bottom: 2px;
        }
        .meta-value {
          font-weight: bold;
        }
        .section-title {
          margin: 10px 0 6px;
          font-size: 13px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #d7d7d7;
          padding: 5px 6px;
          vertical-align: top;
        }
        th {
          background: #f2f2f2;
          text-align: left;
          font-weight: bold;
        }
        .value-cell {
          font-weight: bold;
        }
        .mini {
          font-size: 10px;
          color: #666666;
          display: block;
          margin-top: 2px;
        }
        .score-row th,
        .score-row td {
          text-align: center;
          white-space: normal;
          word-break: break-word;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: bold;
          border: 1px solid transparent;
        }
        .risk-low { background: #e6f7ec; color: #1f7a40; border-color: #b7e5c7; }
        .risk-medium { background: #fff8e1; color: #9a6700; border-color: #f7d57a; }
        .risk-high { background: #ffecec; color: #ad1f2c; border-color: #f3b8bf; }
        .spacer { height: 8px; }
        .footer-note {
          margin-top: 8px;
          font-size: 10px;
          color: #666666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Fall Risk Assessment</h1>
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Resident Name</div>
            <div class="meta-value">${valueOrFallback(assessment.residentName)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Date of Birth</div>
            <div class="meta-value">${formatDate(assessment.dateOfBirth)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Date of Assessment</div>
            <div class="meta-value">${formatDate(assessmentDate)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Time</div>
            <div class="meta-value">${valueOrFallback(assessment.time)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Completed By</div>
            <div class="meta-value">${valueOrFallback(completedBy)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Signature</div>
            <div class="meta-value">${valueOrFallback(assessment.signature)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Total Score</div>
            <div class="meta-value">${totalScore}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Risk Level</div>
            <div class="meta-value">
              <span class="badge ${
                riskLevel === "Low Risk" ? "risk-low" : riskLevel === "Medium Risk" ? "risk-medium" : "risk-high"
              }">${riskLevel}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-title">Assessment Details</div>
      <table>
        <thead>
          <tr>
            <th style="width: 26%;">Field</th>
            <th style="width: 47%;">Selected Value</th>
            <th style="width: 27%;">Score</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Age</td><td class="value-cell">${valueOrFallback(details.age)}</td><td>${getScore(details.age, [{ label: "86+", value: 3 }, { label: "81-85", value: 2 }, { label: "65-80", value: 1 }, { label: "Under 65", value: 0 }])}</td></tr>
          <tr><td>Gender</td><td class="value-cell">${valueOrFallback(details.gender)}</td><td>${getScore(details.gender, [{ label: "Female", value: 3 }, { label: "Male", value: 1 }])}</td></tr>
          <tr><td>History of Falls</td><td class="value-cell">${valueOrFallback(details.historyOfFalls)}</td><td>${getScore(details.historyOfFalls, [{ label: "Recurrent falls in last 12 months", value: 3 }, { label: "Fall in last 12 months", value: 2 }, { label: "Fall more than 12 months ago", value: 1 }, { label: "Never Fallen", value: 0 }])}</td></tr>
          <tr><td>Present Level of Mobility</td><td class="value-cell">${valueOrFallback(details.mobilityLevel)}</td><td>${getScore(details.mobilityLevel, [{ label: "Assistance of 1 +/- aid", value: 3 }, { label: "Assistance of 2 +/- aid", value: 2 }, { label: "Independent with walking aid", value: 1 }, { label: "Independent and safe unaided", value: 0 }, { label: "Immobile/Hoist", value: 0 }])}</td></tr>
          <tr><td>Balance (checkbox)</td><td class="value-cell">${yesNoValue(details.balance)}</td><td>${getScore(details.balance, [{ label: "No", value: 3 }, { label: "Yes", value: 0 }])}</td></tr>
          <tr><td>ADL Personal</td><td class="value-cell">${valueOrFallback(details.adlPersonal)}</td><td>${getScore(details.adlPersonal, [{ label: "Requires assistance", value: 2 }, { label: "Independent with equipment", value: 1 }, { label: "Independent & Safe", value: 0 }])}</td></tr>
          <tr><td>ADL Domestic</td><td class="value-cell">${valueOrFallback(details.adlDomestic)}</td><td>${getScore(details.adlDomestic, [{ label: "Requires assistance", value: 2 }, { label: "Independent with equipment", value: 1 }, { label: "Independent & Safe", value: 0 }])}</td></tr>
          <tr><td>Footwear</td><td class="value-cell">${valueOrFallback(details.footwear)}</td><td>${getScore(details.footwear, [{ label: "Unsafe", value: 3 }, { label: "Safe", value: 0 }])}</td></tr>
          <tr><td>Vision Problems (checkbox)</td><td class="value-cell">${yesNoValue(details.visionProblems)}</td><td>${getScore(details.visionProblems, [{ label: "Yes", value: 3 }, { label: "No", value: 0 }])}</td></tr>
          <tr><td>Bladder & Bowel Movement</td><td class="value-cell">${valueOrFallback(details.bladderBowel)}</td><td>${getScore(details.bladderBowel, [{ label: "Frequency", value: 3 }, { label: "Identified problems", value: 2 }, { label: "No identified problems", value: 0 }])}</td></tr>
          <tr><td>Environmental Risks (checkbox)</td><td class="value-cell">${yesNoValue(details.environmentalRisks)}</td><td>${getScore(details.environmentalRisks, [{ label: "Yes", value: 3 }, { label: "No", value: 0 }])}</td></tr>
          <tr><td>Social Risks</td><td class="value-cell">${valueOrFallback(details.socialRisks)}</td><td>${getScore(details.socialRisks, [{ label: "Lives Alone", value: 3 }, { label: "Residential limited support", value: 2 }, { label: "24-hour care", value: 1 }])}</td></tr>
          <tr><td>Medical Conditions</td><td class="value-cell">${valueOrFallback(details.medicalConditions)}</td><td>${
            details.medicalConditions === "Neurological/Postural/Cardiac/MuscularSkeletal/Fracture"
              ? 2
              : getScore(details.medicalConditions, [
                  { label: "Neurological", value: 2 },
                  { label: "Postural", value: 2 },
                  { label: "Cardiac", value: 2 },
                  { label: "MuscularSkeletal", value: 2 },
                  { label: "Fracture", value: 2 },
                  { label: "Listed conditions", value: 1 },
                  { label: "No identified medical conditions", value: 0 }
                ])
          }</td></tr>
          <tr><td>Medicines</td><td class="value-cell">${valueOrFallback(details.medicines)}</td><td>${getScore(details.medicines, [{ label: "4 or more medicines", value: 3 }, { label: "Less than 4 medicines", value: 1 }, { label: "No medicines", value: 0 }])}</td></tr>
          <tr><td>Safety Awareness (checkbox)</td><td class="value-cell">${yesNoValue(details.safetyAwareness)}</td><td>${getScore(details.safetyAwareness, [{ label: "No", value: 3 }, { label: "Yes", value: 0 }])}</td></tr>
          <tr><td>Mental State</td><td class="value-cell">${valueOrFallback(details.mentalState)}</td><td>${getScore(details.mentalState, [{ label: "Confused", value: 3 }, { label: "Orientated", value: 0 }])}</td></tr>
        </tbody>
      </table>

      <div class="spacer"></div>
      <div class="section-title">Scoring Snapshot</div>
      <table>
        <thead>
          <tr class="score-row">
            <th>Date of Assessment</th>
            <th>Age</th>
            <th>Gender</th>
            <th>History of Falls</th>
            <th>Present Level of Mobility</th>
            <th>Balance (Can Resident Stand Unsupported)</th>
            <th>Activities of Daily Living (Personal)</th>
            <th>Activities of Daily Living (Domestic)</th>
            <th>Footwear</th>
            <th>Vision Problems</th>
            <th>Bladder & Bowel Movement</th>
            <th>Resident Environmental Risks</th>
            <th>Social Risks</th>
            <th>Medical Conditions</th>
            <th>Medicines</th>
            <th>Safety Awareness</th>
            <th>Mental State</th>
            <th>Total Score</th>
            <th>Risk Level</th>
          </tr>
        </thead>
        <tbody>
          <tr class="score-row">
            <td>${formatDate(assessmentDate)}</td>
            <td>${getScore(details.age, [{ label: "86+", value: 3 }, { label: "81-85", value: 2 }, { label: "65-80", value: 1 }, { label: "Under 65", value: 0 }])}</td>
            <td>${getScore(details.gender, [{ label: "Female", value: 3 }, { label: "Male", value: 1 }])}</td>
            <td>${getScore(details.historyOfFalls, [{ label: "Recurrent falls in last 12 months", value: 3 }, { label: "Fall in last 12 months", value: 2 }, { label: "Fall more than 12 months ago", value: 1 }, { label: "Never Fallen", value: 0 }])}</td>
            <td>${getScore(details.mobilityLevel, [{ label: "Assistance of 1 +/- aid", value: 3 }, { label: "Assistance of 2 +/- aid", value: 2 }, { label: "Independent with walking aid", value: 1 }, { label: "Independent and safe unaided", value: 0 }, { label: "Immobile/Hoist", value: 0 }])}</td>
            <td>${getScore(details.balance, [{ label: "No", value: 3 }, { label: "Yes", value: 0 }])}</td>
            <td>${getScore(details.adlPersonal, [{ label: "Requires assistance", value: 2 }, { label: "Independent with equipment", value: 1 }, { label: "Independent & Safe", value: 0 }])}</td>
            <td>${getScore(details.adlDomestic, [{ label: "Requires assistance", value: 2 }, { label: "Independent with equipment", value: 1 }, { label: "Independent & Safe", value: 0 }])}</td>
            <td>${getScore(details.footwear, [{ label: "Unsafe", value: 3 }, { label: "Safe", value: 0 }])}</td>
            <td>${getScore(details.visionProblems, [{ label: "Yes", value: 3 }, { label: "No", value: 0 }])}</td>
            <td>${getScore(details.bladderBowel, [{ label: "Frequency", value: 3 }, { label: "Identified problems", value: 2 }, { label: "No identified problems", value: 0 }])}</td>
            <td>${getScore(details.environmentalRisks, [{ label: "Yes", value: 3 }, { label: "No", value: 0 }])}</td>
            <td>${getScore(details.socialRisks, [{ label: "Lives Alone", value: 3 }, { label: "Residential limited support", value: 2 }, { label: "24-hour care", value: 1 }])}</td>
            <td>${
              details.medicalConditions === "Neurological/Postural/Cardiac/MuscularSkeletal/Fracture"
                ? 2
                : getScore(details.medicalConditions, [
                    { label: "Neurological", value: 2 },
                    { label: "Postural", value: 2 },
                    { label: "Cardiac", value: 2 },
                    { label: "MuscularSkeletal", value: 2 },
                    { label: "Fracture", value: 2 },
                    { label: "Listed conditions", value: 1 },
                    { label: "No identified medical conditions", value: 0 }
                  ])
            }</td>
            <td>${getScore(details.medicines, [{ label: "4 or more medicines", value: 3 }, { label: "Less than 4 medicines", value: 1 }, { label: "No medicines", value: 0 }])}</td>
            <td>${getScore(details.safetyAwareness, [{ label: "No", value: 3 }, { label: "Yes", value: 0 }])}</td>
            <td>${getScore(details.mentalState, [{ label: "Confused", value: 3 }, { label: "Orientated", value: 0 }])}</td>
            <td><strong>${totalScore}</strong></td>
            <td><span class="badge ${
              riskLevel === "Low Risk" ? "risk-low" : riskLevel === "Medium Risk" ? "risk-medium" : "risk-high"
            }">${riskLevel}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="footer-note">
        Generated on: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB")}
      </div>
    </body>
    </html>
  `;
}
