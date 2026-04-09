import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

type CheckboxLike = boolean | "yes" | "no" | "" | undefined | null;

interface MonthlyEvaluationData {
  id?: string;
  date?: number | string;
  mustScoreChange?: CheckboxLike;
  mustScoreChangeNotes?: string;
  saltReferralRequired?: CheckboxLike;
  saltReferralRequiredNotes?: string;
  saltInputReceived?: CheckboxLike;
  saltInputReceivedNotes?: string;
  specialisedDietChange?: CheckboxLike;
  specialisedDietChangeNotes?: string;
  foodConsistencyChange?: CheckboxLike;
  foodConsistencyChangeNotes?: string;
  fluidConsistencyChange?: CheckboxLike;
  fluidConsistencyChangeNotes?: string;
  foodFortificationRequired?: CheckboxLike;
  foodFortificationRequiredNotes?: string;
  supplementsPrescribed?: CheckboxLike;
  supplementsPrescribedNotes?: string;
  assistanceRequired?: CheckboxLike;
  assistanceRequiredNotes?: string;
  completedBy?: string;
}

interface NutritionalAssessmentDetails {
  residentName?: string;
  dateOfBirth?: string;
  bedroomNumber?: string;
  height?: string;
  weight?: string;
  hasSaltInvolvement?: boolean;
  saltTherapistName?: string;
  saltContactDetails?: string;
  hasDietitianInvolvement?: boolean;
  dietitianName?: string;
  dietitianContactDetails?: string;
  foodFortificationRequired?: string;
  supplementsPrescribed?: string;
  assistanceRequired?: string;
  jobRole?: string;
  signature?: string;
  monthlyEvaluations?: MonthlyEvaluationData[];
}

interface NutritionalAssessmentPdfData {
  residentName?: string;
  dateOfBirth?: string;
  bedroomNumber?: string;
  assessment_date?: string | number;
  must_score?: string;
  mustScore?: string;
  completed_by?: string;
  completedBy?: string;
  food_consistency?: Record<string, boolean | undefined>;
  fluid_consistency?: Record<string, boolean | undefined>;
  assessment_details?: NutritionalAssessmentDetails;
  assessment_data?: NutritionalAssessmentPdfData;
  [key: string]: unknown;
}

function formatDate(dateString?: string | number): string {
  if (!dateString) return "Not provided";
  return new Date(dateString).toLocaleDateString("en-GB");
}

function formatDateTime(dateString?: string | number): string {
  if (!dateString) return "Not provided";
  return (
    new Date(dateString).toLocaleDateString("en-GB") +
    " at " +
    new Date(dateString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function displayValue(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "Not provided";
  return String(value);
}

function checkboxToYesNo(value: CheckboxLike): "Yes" | "No" {
  if (value === true || value === "yes") return "Yes";
  return "No";
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .replace("Iddsi", "IDDSI")
    .trim();
}

function generateNutritionalAssessmentHTML(data: NutritionalAssessmentPdfData): string {
  const details = data.assessment_details || {};
  const foodConsistency = data.food_consistency || {};
  const fluidConsistency = data.fluid_consistency || {};
  const monthlyEvaluations = details.monthlyEvaluations || [];
  const foodConsistencyKeys = [
    "level7EasyChew",
    "level6SoftBiteSized",
    "level5MincedMoist",
    "level4Pureed",
    "level3Liquidised"
  ];
  const fluidConsistencyKeys = [
    "level4ExtremelyThick",
    "level3ModeratelyThick",
    "level2MildlyThick",
    "level1SlightlyThick",
    "level0Thin"
  ];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nutritional Assessment</title>
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
          border-bottom: 2px solid #059669;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #065f46;
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
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #065f46;
        }
        .grid {
          display: grid;
          gap: 16px;
        }
        .grid-cols-2 {
          grid-template-columns: 1fr 1fr;
        }
        .grid-cols-3 {
          grid-template-columns: 1fr 1fr 1fr;
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
        .field-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          background-color: #dcfce7;
          color: #166534;
        }
        .must-score {
          font-size: 1.5rem;
          font-weight: bold;
          color: #065f46;
          text-align: center;
          background: #f0fdf4;
          border: 2px solid #059669;
          border-radius: 8px;
          padding: 10px;
          margin: 10px 0;
        }
        .consistency-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .consistency-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }
        .check-mark { color: #059669; font-weight: bold; }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Nutritional Assessment</h1>
      </div>

      <div class="section">
        <h2>Resident Details</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${displayValue(data.residentName)}</div>
          </div>
          <div>
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${displayValue(data.dateOfBirth)}</div>
          </div>
          <div>
            <div class="field-label">Bedroom Number</div>
            <div class="field-value">${displayValue(data.bedroomNumber)}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date)}</div>
          </div>
        </div>
        <div class="grid grid-cols-3 info-box">
          <div>
            <div class="field-label">Height</div>
            <div class="field-value">${displayValue(details.height as string | undefined)}</div>
          </div>
          <div>
            <div class="field-label">Weight</div>
            <div class="field-value">${displayValue(details.weight as string | undefined)}</div>
          </div>
          <div>
            <div class="field-label">IDDSI Categories</div>
            <div class="field-value">${Object.values(foodConsistency).filter(Boolean).length + Object.values(fluidConsistency).filter(Boolean).length} Selected</div>
          </div>
        </div>
        
        <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 1.1rem; color: #111827;">Clinical Involvement</h3>
        <div class="grid grid-cols-2">
          <div class="info-box" style="margin-bottom: 0;">
            <h3 style="margin-top: 0;">SALT Involvement</h3>
            <p style="margin: 4px 0;"><strong>Involvement:</strong> ${checkboxToYesNo(details.hasSaltInvolvement)}</p>
            <p style="margin: 4px 0;"><strong>Therapist:</strong> ${displayValue(details.saltTherapistName)}</p>
            <p style="margin: 4px 0;"><strong>Contact:</strong> ${displayValue(details.saltContactDetails)}</p>
          </div>
          <div class="info-box" style="margin-bottom: 0;">
            <h3 style="margin-top: 0;">Dietitian Involvement</h3>
            <p style="margin: 4px 0;"><strong>Involvement:</strong> ${checkboxToYesNo(details.hasDietitianInvolvement)}</p>
            <p style="margin: 4px 0;"><strong>Dietitian:</strong> ${displayValue(details.dietitianName)}</p>
            <p style="margin: 4px 0;"><strong>Contact:</strong> ${displayValue(details.dietitianContactDetails)}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Nutritional Risk (MUST)</h2>
        <div class="must-score">
          MUST Score: ${displayValue(data.must_score || data.mustScore)}
        </div>
      </div>

      <div class="section">
        <h2>IDDSI Consistency Levels</h2>
        <div class="grid grid-cols-2">
          <div class="info-box">
            <h3>Food Consistency</h3>
            <div class="consistency-list">
              ${foodConsistencyKeys.map((key) => `
                  <div class="consistency-item">
                    <span><strong>${key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}:</strong> ${checkboxToYesNo(foodConsistency[key])}</span>
                  </div>
                `).join("")}
            </div>
          </div>
          <div class="info-box">
            <h3>Fluid Consistency</h3>
            <div class="consistency-list">
              ${fluidConsistencyKeys.map((key) => `
                  <div class="consistency-item">
                    <span><strong>${key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}:</strong> ${checkboxToYesNo(fluidConsistency[key])}</span>
                  </div>
                `).join("")}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Dietary Requirements & Assistance</h2>
        <div class="info-box">
          <h3>Assistance Required</h3>
          <p>${displayValue(details.assistanceRequired)}</p>
        </div>
        <div class="info-box">
          <h3>Food Fortification</h3>
          <p>${displayValue(details.foodFortificationRequired)}</p>
        </div>
        <div class="info-box">
          <h3>Supplements Prescribed</h3>
          <p>${displayValue(details.supplementsPrescribed)}</p>
        </div>
      </div>

      <div class="section">
        <h2>Assessment Completion</h2>
        <div class="info-box grid grid-cols-2">
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${displayValue(data.completed_by || data.completedBy)}</div>
            <div class="field-label" style="margin-top: 8px;">Job Role</div>
            <div class="field-value">${displayValue(details.jobRole)}</div>
          </div>
          <div>
            <div class="field-label">Signature</div>
            <div class="field-value" style="font-style: italic; border-bottom: 1px solid #ccc; padding-top: 10px;">
              ${displayValue(details.signature || (data.completed_by as string | undefined))}
            </div>
          </div>
        </div>
      </div>

      ${monthlyEvaluations.length > 0
      ? monthlyEvaluations
        .map((evaluation, index) => `
              <div class="section">
                <h2>Monthly Review - Review ${index + 1}</h2>
              <div class="info-box">
                <div class="grid grid-cols-2">
                  <div>
                    <div class="field-label">Review Date</div>
                    <div class="field-value">${formatDate(evaluation.date)}</div>
                  </div>
                  <div>
                    <div class="field-label">Completed By</div>
                    <div class="field-value">${displayValue(evaluation.completedBy)}</div>
                  </div>
                </div>
                <div style="margin-top: 12px;">
                  ${[
          "mustScoreChange",
          "saltReferralRequired",
          "saltInputReceived",
          "specialisedDietChange",
          "foodConsistencyChange",
          "fluidConsistencyChange",
          "foodFortificationRequired",
          "supplementsPrescribed",
          "assistanceRequired"
        ]
          .map((key) => `
                      <div style="border-top: 1px solid #e5e7eb; padding: 8px 0;">
                        <div><strong>${formatFieldName(key)}:</strong> ${checkboxToYesNo(evaluation[key as keyof MonthlyEvaluationData] as CheckboxLike)}</div>
                        <div><strong>Notes:</strong> ${displayValue(evaluation[`${key}Notes` as keyof MonthlyEvaluationData] as string | undefined)}</div>
                      </div>
                    `)
          .join("")}
                </div>
              </div>
              </div>
            `)
        .join("")
      : ""}

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Nutritional Assessment Report - ${displayValue(data.residentName)}</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = (await request.json()) as NutritionalAssessmentPdfData;

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment data is required" },
        { status: 400 }
      );
    }

    const nestedAssessmentData =
      assessmentData.assessment_data && typeof assessmentData.assessment_data === "object"
        ? (assessmentData.assessment_data as Record<string, unknown>)
        : {};

    const getOptionalString = (value: unknown): string | undefined => {
      if (typeof value === "string" && value.trim().length > 0) return value;
      return undefined;
    };

    const getOptionalDateLike = (value: unknown): string | number | undefined => {
      if (typeof value === "string" || typeof value === "number") return value;
      return undefined;
    };

    const normalizeConsistency = (
      value: unknown
    ): Record<string, boolean | undefined> => {
      if (!value || typeof value !== "object") return {};
      const source = value as Record<string, unknown>;
      const normalized: Record<string, boolean | undefined> = {};
      for (const [key, entry] of Object.entries(source)) {
        if (typeof entry === "boolean") normalized[key] = entry;
      }
      return normalized;
    };

    const nestedDetails =
      nestedAssessmentData.assessment_details &&
        typeof nestedAssessmentData.assessment_details === "object"
        ? (nestedAssessmentData.assessment_details as NutritionalAssessmentDetails)
        : undefined;

    const flattenedData: NutritionalAssessmentPdfData = {
      ...assessmentData,
      food_consistency: normalizeConsistency(
        assessmentData.food_consistency ?? nestedAssessmentData.food_consistency
      ),
      fluid_consistency: normalizeConsistency(
        assessmentData.fluid_consistency ?? nestedAssessmentData.fluid_consistency
      ),
      assessment_details: assessmentData.assessment_details ?? nestedDetails ?? {},
      residentName:
        assessmentData.residentName ??
        getOptionalString(nestedAssessmentData.residentName) ??
        assessmentData.assessment_details?.residentName ??
        nestedDetails?.residentName ??
        "Resident",
      dateOfBirth:
        assessmentData.dateOfBirth ??
        getOptionalString(nestedAssessmentData.dateOfBirth) ??
        assessmentData.assessment_details?.dateOfBirth ??
        nestedDetails?.dateOfBirth,
      bedroomNumber:
        assessmentData.bedroomNumber ??
        getOptionalString(nestedAssessmentData.bedroomNumber) ??
        assessmentData.assessment_details?.bedroomNumber ??
        nestedDetails?.bedroomNumber,
      assessment_date:
        assessmentData.assessment_date ??
        getOptionalDateLike(assessmentData.completion_date) ??
        getOptionalDateLike(assessmentData.created_at)
    };

    const htmlContent = generateNutritionalAssessmentHTML(flattenedData);

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
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      return new NextResponse(pdfBuffer as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="nutritional-assessment-${flattenedData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Nutritional Assessment PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
