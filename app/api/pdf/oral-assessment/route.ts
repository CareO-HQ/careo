import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";

export const runtime = "nodejs";

interface DentalInfo {
  isRegisteredWithDentist?: boolean;
  lastSeenByDentist?: string;
  dentistName?: string;
  dentalPracticeAddress?: string;
  contactTelephone?: string;
}

interface ExamFindings {
  lipsDryCracked?: boolean;
  tongueDryCracked?: boolean;
  tongueUlceration?: boolean;
  hasTopDenture?: boolean;
  hasLowerDenture?: boolean;
  hasDenturesAndNaturalTeeth?: boolean;
  hasNaturalTeeth?: boolean;
  evidencePlaqueDebris?: boolean;
  dryMouth?: boolean;
}

interface Symptoms {
  painWhenEating?: boolean;
  gumsUlceration?: boolean;
  difficultySwallowing?: boolean;
  poorFluidDietaryIntake?: boolean;
  dehydrated?: boolean;
  speechDifficultyDryMouth?: boolean;
  speechDifficultyDenturesSlipping?: boolean;
  dexterityProblems?: boolean;
  cognitiveImpairment?: boolean;
}

interface CareRecommendations {
  lipsDryCrackedCare?: string;
  tongueDryCrackedCare?: string;
  tongueUlcerationCare?: string;
  topDentureCare?: string;
  lowerDentureCare?: string;
  denturesAndNaturalTeethCare?: string;
  naturalTeethCare?: string;
  plaqueDebrisCare?: string;
  dryMouthCare?: string;
  painWhenEatingCare?: string;
  gumsUlcerationCare?: string;
  difficultySwallowingCare?: string;
  poorFluidDietaryIntakeCare?: string;
  dehydratedCare?: string;
  speechDifficultyDryMouthCare?: string;
  speechDifficultyDenturesSlippingCare?: string;
  dexterityProblemsCare?: string;
  cognitiveImpairmentCare?: string;
}

interface AssessmentDetails {
  signature?: string;
  height?: string;
  weight?: string;
}

interface OralEvaluation {
  evaluation_date?: string;
  completed_by?: string;
  lips?: boolean;
  tongue?: boolean;
  dentures?: boolean;
  teeth?: boolean;
  saliva?: boolean;
  pain?: boolean;
  gums_soft_tissue?: boolean;
  swallowing?: boolean;
  nutrition?: boolean;
  speech_difficulty?: boolean;
  dexterity_problems?: boolean;
  cognitive_function?: boolean;
}

interface OralAssessmentPdfData {
  residentName?: string;
  dateOfBirth?: string;
  assessment_date?: string | number;
  completed_by?: string;
  oral_hygiene_routine?: string;
  dental_info?: DentalInfo;
  exam_findings?: ExamFindings;
  symptoms?: Symptoms;
  care_recommendations?: CareRecommendations;
  assessment_details?: AssessmentDetails;
  evaluations?: OralEvaluation[];
  assessment_data?: Partial<OralAssessmentPdfData>;
  created_at?: string;
  completedBy?: string;
  id?: string;
  _id?: string;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textValue(value: string | undefined): string {
  if (!value || !value.trim()) return "Not specified";
  return escapeHtml(value.trim());
}

function yesNo(value: boolean | undefined): string {
  return value === true ? "Yes" : "No";
}

function renderFieldRow(label: string, value: string): string {
  return `
    <tr>
      <td class="label-cell">${escapeHtml(label)}</td>
      <td class="value-cell">${value}</td>
    </tr>
  `;
}

function generateOralAssessmentHTML(data: OralAssessmentPdfData): string {
  const dentalInfo = data.dental_info || {};
  const examFindings = data.exam_findings || {};
  const symptoms = data.symptoms || {};
  const careRecs = data.care_recommendations || {};
  const details = data.assessment_details || {};
  const evaluations = Array.isArray(data.evaluations) ? data.evaluations : [];

  const oralRows = [
    renderFieldRow("Lips: Dry / Cracked", yesNo(examFindings.lipsDryCracked)),
    renderFieldRow("Lips: Suggested Care", textValue(careRecs.lipsDryCrackedCare)),
    renderFieldRow("Tongue: Dry / Cracked", yesNo(examFindings.tongueDryCracked)),
    renderFieldRow("Tongue: Suggested Care", textValue(careRecs.tongueDryCrackedCare)),
    renderFieldRow("Tongue: Evidence of ulceration/soreness", yesNo(examFindings.tongueUlceration)),
    renderFieldRow("Tongue ulceration: Suggested Care", textValue(careRecs.tongueUlcerationCare)),
    renderFieldRow("Saliva: Dry mouth", yesNo(examFindings.dryMouth)),
    renderFieldRow("Dry mouth: Suggested Care", textValue(careRecs.dryMouthCare)),
    renderFieldRow("Dentures: Top denture", yesNo(examFindings.hasTopDenture)),
    renderFieldRow("Top denture: Suggested Care", textValue(careRecs.topDentureCare)),
    renderFieldRow("Dentures: Lower denture", yesNo(examFindings.hasLowerDenture)),
    renderFieldRow("Lower denture: Suggested Care", textValue(careRecs.lowerDentureCare)),
    renderFieldRow("Dentures and natural teeth", yesNo(examFindings.hasDenturesAndNaturalTeeth)),
    renderFieldRow("Dentures and natural teeth: Suggested Care", textValue(careRecs.denturesAndNaturalTeethCare)),
    renderFieldRow("Teeth: Natural teeth", yesNo(examFindings.hasNaturalTeeth)),
    renderFieldRow("Natural teeth: Suggested Care", textValue(careRecs.naturalTeethCare)),
    renderFieldRow("Teeth: Evidence of plaque / debris", yesNo(examFindings.evidencePlaqueDebris)),
    renderFieldRow("Plaque/debris: Suggested Care", textValue(careRecs.plaqueDebrisCare)),
    renderFieldRow("Pain when eating/drinking (teeth/dentures)", yesNo(symptoms.painWhenEating)),
    renderFieldRow("Pain when eating: Suggested Care", textValue(careRecs.painWhenEatingCare)),
    renderFieldRow("Gums / Soft tissue soreness or ulceration", yesNo(symptoms.gumsUlceration)),
    renderFieldRow("Gums/soft tissue: Suggested Care", textValue(careRecs.gumsUlcerationCare)),
    renderFieldRow("Difficulty swallowing", yesNo(symptoms.difficultySwallowing)),
    renderFieldRow("Difficulty swallowing: Suggested Care", textValue(careRecs.difficultySwallowingCare)),
    renderFieldRow("Poor fluid/dietary intake", yesNo(symptoms.poorFluidDietaryIntake)),
    renderFieldRow("Poor intake: Suggested Care", textValue(careRecs.poorFluidDietaryIntakeCare)),
    renderFieldRow("Dehydrated", yesNo(symptoms.dehydrated)),
    renderFieldRow("Dehydrated: Suggested Care", textValue(careRecs.dehydratedCare)),
    renderFieldRow("Speech difficulty due to dry mouth", yesNo(symptoms.speechDifficultyDryMouth)),
    renderFieldRow("Speech difficulty (dry mouth): Suggested Care", textValue(careRecs.speechDifficultyDryMouthCare)),
    renderFieldRow("Speech difficulty due to dentures slipping", yesNo(symptoms.speechDifficultyDenturesSlipping)),
    renderFieldRow("Speech difficulty (dentures): Suggested Care", textValue(careRecs.speechDifficultyDenturesSlippingCare)),
    renderFieldRow("Dexterity problems (toothbrush handling)", yesNo(symptoms.dexterityProblems)),
    renderFieldRow("Dexterity problems: Suggested Care", textValue(careRecs.dexterityProblemsCare)),
    renderFieldRow("Cognitive impairment / confusion", yesNo(symptoms.cognitiveImpairment)),
    renderFieldRow("Cognitive impairment: Suggested Care", textValue(careRecs.cognitiveImpairmentCare))
  ].join("");

  const evaluationRows = evaluations.length
    ? evaluations
        .map((ev) =>
          `
            <tr>
              <td>${formatDate(ev.evaluation_date)}</td>
              <td>${textValue(ev.completed_by)}</td>
              <td>${yesNo(ev.lips)}</td>
              <td>${yesNo(ev.tongue)}</td>
              <td>${yesNo(ev.dentures)}</td>
              <td>${yesNo(ev.teeth)}</td>
              <td>${yesNo(ev.saliva)}</td>
              <td>${yesNo(ev.pain)}</td>
              <td>${yesNo(ev.gums_soft_tissue)}</td>
              <td>${yesNo(ev.swallowing)}</td>
              <td>${yesNo(ev.nutrition)}</td>
              <td>${yesNo(ev.speech_difficulty)}</td>
              <td>${yesNo(ev.dexterity_problems)}</td>
              <td>${yesNo(ev.cognitive_function)}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="14">No monthly reviews recorded</td>
      </tr>
    `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Oral Assessment + Monthly Review</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.35;
          color: #111827;
          padding: 16px;
          background: white;
          font-size: 12px;
        }
        .header {
          border-bottom: 2px solid #1f2937;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        h1 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }
        .section {
          margin-bottom: 14px;
          page-break-inside: avoid;
        }
        h2 {
          font-size: 13px;
          margin: 0 0 6px 0;
          padding: 5px 8px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 6px;
          vertical-align: top;
          word-break: break-word;
        }
        .label-cell {
          width: 38%;
          font-weight: 600;
          background: #f9fafb;
        }
        .value-cell {
          width: 62%;
        }
        .footer {
          margin-top: 12px;
          font-size: 10px;
          color: #4b5563;
        }
        .evaluation-table th {
          font-size: 10px;
          background: #f9fafb;
          text-align: center;
        }
        .evaluation-table td {
          font-size: 10px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Oral Assessment + Monthly Review</h1>
        <div>Resident: ${textValue(data.residentName)}</div>
      </div>

      <div class="section">
        <h2>Resident Details</h2>
        <table>
          <tbody>
            ${renderFieldRow("Resident Name", textValue(data.residentName))}
            ${renderFieldRow("Date of Birth", textValue(data.dateOfBirth))}
            ${renderFieldRow("Assessment Date", formatDate(data.assessment_date))}
            ${renderFieldRow("Completed By", textValue(data.completed_by))}
            ${renderFieldRow("Signature", textValue(details.signature || data.completed_by))}
            ${renderFieldRow("Height", textValue(details.height))}
            ${renderFieldRow("Weight", textValue(details.weight))}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Dental Information</h2>
        <table>
          <tbody>
            ${renderFieldRow("Normal Oral Hygiene Routine", textValue(data.oral_hygiene_routine))}
            ${renderFieldRow("Registered with Dentist", yesNo(dentalInfo.isRegisteredWithDentist))}
            ${renderFieldRow("Last Seen by Dentist", textValue(dentalInfo.lastSeenByDentist))}
            ${renderFieldRow("Dentist Name", textValue(dentalInfo.dentistName))}
            ${renderFieldRow("Dental Practice Address", textValue(dentalInfo.dentalPracticeAddress))}
            ${renderFieldRow("Contact Telephone", textValue(dentalInfo.contactTelephone))}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Oral Assessment Findings + Suggested Care</h2>
        <table>
          <tbody>
            ${oralRows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Monthly Review History</h2>
        <table class="evaluation-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Completed By</th>
              <th>Lips</th>
              <th>Tongue</th>
              <th>Dentures</th>
              <th>Teeth</th>
              <th>Saliva</th>
              <th>Pain</th>
              <th>Gums/Soft Tissue</th>
              <th>Swallowing</th>
              <th>Nutrition</th>
              <th>Speech Difficulty</th>
              <th>Dexterity</th>
              <th>Cognitive</th>
            </tr>
          </thead>
          <tbody>
            ${evaluationRows}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
      </div>
    </body>
    </html>
  `;
}


function createSupabaseClientForPDF(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: any) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.delete(name);
        },
      },
    }
  );
  return { supabase, response };
}
export async function POST(request: NextRequest) {
  try {

    // --- Authentication ---
    const { supabase } = createSupabaseClientForPDF(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessmentData = (await request.json()) as OralAssessmentPdfData;

    if (!assessmentData) {
      return NextResponse.json({ error: "Assessment data is required" }, { status: 400 });
    }

    // Deep flattening: merge assessment_data and normalize old/new payload shapes.
    const baseData = (assessmentData.assessment_data || {}) as Partial<OralAssessmentPdfData> & Record<string, unknown>;
    const getOptionalString = (value: unknown): string | undefined =>
      typeof value === "string" ? value : undefined;
    const getOptionalBoolean = (value: unknown): boolean | undefined =>
      typeof value === "boolean" ? value : undefined;
    const flattenedData: OralAssessmentPdfData = {
      ...assessmentData,
      ...baseData,
      oral_hygiene_routine:
        assessmentData.oral_hygiene_routine ||
        baseData.oral_hygiene_routine ||
        (typeof baseData["normalOralHygieneRoutine"] === "string" ? baseData["normalOralHygieneRoutine"] : undefined) ||
        "Not specified",
      dental_info: assessmentData.dental_info || baseData.dental_info || {
        isRegisteredWithDentist: getOptionalBoolean(baseData.isRegisteredWithDentist),
        lastSeenByDentist: getOptionalString(baseData.lastSeenByDentist),
        dentistName: getOptionalString(baseData.dentistName),
        dentalPracticeAddress: getOptionalString(baseData.dentalPracticeAddress),
        contactTelephone: getOptionalString(baseData.contactTelephone)
      },
      exam_findings: assessmentData.exam_findings || baseData.exam_findings || {
        lipsDryCracked: getOptionalBoolean(baseData.lipsDryCracked),
        tongueDryCracked: getOptionalBoolean(baseData.tongueDryCracked),
        tongueUlceration: getOptionalBoolean(baseData.tongueUlceration),
        hasTopDenture: getOptionalBoolean(baseData.hasTopDenture),
        hasLowerDenture: getOptionalBoolean(baseData.hasLowerDenture),
        hasDenturesAndNaturalTeeth: getOptionalBoolean(baseData.hasDenturesAndNaturalTeeth),
        hasNaturalTeeth: getOptionalBoolean(baseData.hasNaturalTeeth),
        evidencePlaqueDebris: getOptionalBoolean(baseData.evidencePlaqueDebris),
        dryMouth: getOptionalBoolean(baseData.dryMouth)
      },
      symptoms: assessmentData.symptoms || baseData.symptoms || {
        painWhenEating: getOptionalBoolean(baseData.painWhenEating),
        gumsUlceration: getOptionalBoolean(baseData.gumsUlceration),
        difficultySwallowing: getOptionalBoolean(baseData.difficultySwallowing),
        poorFluidDietaryIntake: getOptionalBoolean(baseData.poorFluidDietaryIntake),
        dehydrated: getOptionalBoolean(baseData.dehydrated),
        speechDifficultyDryMouth: getOptionalBoolean(baseData.speechDifficultyDryMouth),
        speechDifficultyDenturesSlipping: getOptionalBoolean(baseData.speechDifficultyDenturesSlipping),
        dexterityProblems: getOptionalBoolean(baseData.dexterityProblems),
        cognitiveImpairment: getOptionalBoolean(baseData.cognitiveImpairment)
      },
      care_recommendations: assessmentData.care_recommendations || baseData.care_recommendations || {
        lipsDryCrackedCare: getOptionalString(baseData.lipsDryCrackedCare),
        tongueDryCrackedCare: getOptionalString(baseData.tongueDryCrackedCare),
        tongueUlcerationCare: getOptionalString(baseData.tongueUlcerationCare),
        topDentureCare: getOptionalString(baseData.topDentureCare),
        lowerDentureCare: getOptionalString(baseData.lowerDentureCare),
        denturesAndNaturalTeethCare: getOptionalString(baseData.denturesAndNaturalTeethCare),
        naturalTeethCare: getOptionalString(baseData.naturalTeethCare),
        plaqueDebrisCare: getOptionalString(baseData.plaqueDebrisCare),
        dryMouthCare: getOptionalString(baseData.dryMouthCare),
        painWhenEatingCare: getOptionalString(baseData.painWhenEatingCare),
        gumsUlcerationCare: getOptionalString(baseData.gumsUlcerationCare),
        difficultySwallowingCare: getOptionalString(baseData.difficultySwallowingCare),
        poorFluidDietaryIntakeCare: getOptionalString(baseData.poorFluidDietaryIntakeCare),
        dehydratedCare: getOptionalString(baseData.dehydratedCare),
        speechDifficultyDryMouthCare: getOptionalString(baseData.speechDifficultyDryMouthCare),
        speechDifficultyDenturesSlippingCare: getOptionalString(baseData.speechDifficultyDenturesSlippingCare),
        dexterityProblemsCare: getOptionalString(baseData.dexterityProblemsCare),
        cognitiveImpairmentCare: getOptionalString(baseData.cognitiveImpairmentCare)
      },
      assessment_details: assessmentData.assessment_details || baseData.assessment_details || {
        height: getOptionalString(baseData.height),
        weight: getOptionalString(baseData.weight),
        signature: getOptionalString(baseData.signature)
      },
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || baseData.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || baseData.dateOfBirth,
      assessment_date: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || baseData.completed_by || baseData.completedBy || "Not specified"
    };

    console.log("Oral Assessment PDF API flattening data:", {
      residentName: flattenedData.residentName,
      hasDentalInfo: !!flattenedData.dental_info,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateOralAssessmentHTML(flattenedData);

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

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="oral-assessment-${assessmentData.residentName?.replace(/\\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Oral Assessment PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
