import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";

export const runtime = "nodejs";

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

interface ChokingRiskFieldDefinition {
  key: string;
  label: string;
  points: number;
}

interface ChokingRiskSectionDefinition {
  title: string;
  fields: Array<ChokingRiskFieldDefinition>;
}

interface ChokingRiskPayload {
  residentName?: string;
  dateOfBirth?: string;
  assessment_date?: string | number;
  dateOfAssessment?: string;
  time?: string;
  completed_by?: string;
  completedBy?: string;
  signature?: string;
  total_score?: number;
  risk_level?: string;
  created_at?: string | number;
  _id?: string;
  id?: string;
  risk_factors?: Record<string, unknown>;
  assessment_data?: Record<string, unknown>;
}

function getStringValue(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number") return String(value);
  return "Not provided";
}

function getCheckboxValue(value: unknown): string {
  return value === true ? "Yes" : "No";
}

function escapeHTML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CHOKING_RISK_SECTIONS: Array<ChokingRiskSectionDefinition> = [
  {
    title: "1. Respiratory Risks",
    fields: [
      { key: "weakCough", label: "Weak cough and/or inability to clear throat", points: 10 },
      { key: "chestInfections", label: "History of chest infections", points: 10 },
      { key: "breathingDifficulties", label: "Breathing difficulties / chronic obstructive pulmonary disease", points: 10 },
      { key: "knownToAspirate", label: "Known to Aspirate", points: 10 },
      { key: "chokingHistory", label: "History of choking/requiring intervention", points: 10 },
      { key: "gurgledVoice", label: "Gurgled or wet voice after swallowing", points: 10 }
    ]
  },
  {
    title: "2. At Risk Groups",
    fields: [
      { key: "epilepsy", label: "Epilepsy", points: 4 },
      { key: "cerebralPalsy", label: "Cerebral Palsy", points: 4 },
      { key: "dementia", label: "Dementia/confusion", points: 4 },
      { key: "mentalHealth", label: "Mental health history", points: 4 },
      { key: "neurologicalConditions", label: "Known neurological conditions (for example cerebrovascular accident, Parkinson's disease, Huntington's disease)", points: 10 },
      { key: "learningDisabilities", label: "Learning Disabilities", points: 10 }
    ]
  },
  {
    title: "3. Physical Risks",
    fields: [
      { key: "posturalProblems", label: "Postural problems/increased rigidity/severe flexion/cannot sit upright", points: 8 },
      { key: "poorHeadControl", label: "Poor head control", points: 8 },
      { key: "tongueThrust", label: "Tongue Thrust", points: 8 },
      { key: "chewingDifficulties", label: "Difficulties chewing or prolonged chewing time", points: 8 },
      { key: "slurredSpeech", label: "Slurred speech and/or facial weakness", points: 10 },
      { key: "neckTrauma", label: "Any known injury/trauma to neck or throat", points: 10 }
    ]
  },
  {
    title: "4. Risks Associated with Eating Behaviours",
    fields: [
      { key: "eatsRapidly", label: "Eats rapidly", points: 8 },
      { key: "drinksRapidly", label: "Drinks rapidly", points: 8 },
      { key: "eatsWhileCoughing", label: "Continues to eat whilst coughing", points: 8 },
      { key: "drinksWhileCoughing", label: "Continues to drink while coughing", points: 8 },
      { key: "crammingFood", label: "Cramming food in mouth", points: 10 },
      { key: "pocketingFood", label: "Pocketing food or drink in mouth", points: 10 },
      { key: "swallowingWithoutChewing", label: "Swallowing without chewing", points: 10 },
      { key: "wouldTakeFood", label: "Would take food from others/cupboards/fruit bowls if not supervised", points: 4 }
    ]
  },
  {
    title: "5. Risks Associated with Eating",
    fields: [
      { key: "drinksIndependentlySafely", label: "Drinks independently and safely", points: -2 },
      { key: "eatsIndependentlySafely", label: "Eats independently and safely", points: -2 },
      { key: "poorDentition", label: "Poor fitting/missing dentures/poor dentition/dental pain", points: 8 },
      { key: "fatigueAtMealtimes", label: "Fatigue at mealtimes", points: 8 },
      { key: "needsFoodCutting", label: "Needs food cutting up or prepared prior to eating", points: 6 },
      { key: "texturedModifiedDiet", label: "Is on a textured modified diet", points: 10 },
      { key: "thickenedFluids", label: "Requires thickened fluids", points: 10 },
      { key: "specialistFeedingAids", label: "Requires specialist feeding aids to reduce the risk of choking", points: 5 },
      { key: "specialistDrinkingAids", label: "Requires specialist drinking aids to reduce the risk of choking", points: 5 }
    ]
  },
  {
    title: "6. Food Recognition",
    fields: [
      { key: "acceptAnyItem", label: "Will accept/put any item into mouth (including non-food items)", points: 10 },
      { key: "acceptAnyItemAndSwallow", label: "Will accept/put any item into mouth (including non-food items) and swallow", points: 10 }
    ]
  },
  {
    title: "7. Medication",
    fields: [
      { key: "medicationAffectingSwallowing", label: "Taking medication that can affect swallowing", points: 10 }
    ]
  }
];

function generateChokingRiskHTML(data: ChokingRiskPayload): string {
  const riskFactors = data.risk_factors || {};
  const completedBy = getStringValue(data.completed_by ?? data.completedBy);
  const dateOfAssessment = data.dateOfAssessment ?? (typeof data.assessment_date === "string" ? data.assessment_date : undefined);
  const totalScore = typeof data.total_score === "number" ? data.total_score : 0;
  const riskLevel = getStringValue(data.risk_level ?? "Low Risk");
  const renderedSections = CHOKING_RISK_SECTIONS.map((section) => {
    const rows = section.fields
      .map((field) => {
        const checkboxValue = getCheckboxValue(riskFactors[field.key]);
        const pointsText = field.points > 0 ? `+${field.points}` : `${field.points}`;
        return `
          <tr>
            <td>${escapeHTML(field.label)}</td>
            <td>${pointsText}</td>
            <td>${checkboxValue}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="section">
        <h2>${escapeHTML(section.title)}</h2>
        <table>
          <thead>
            <tr>
              <th>Assessment Field Name</th>
              <th>Risk Points</th>
              <th>Checkbox Value (Yes or No)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Choking Risk Assessment + Monthly Review</title>
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
          border-bottom: 2px solid #ea580c;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 1.6rem;
          font-weight: bold;
          margin-bottom: 4px;
          color: #9a3412;
        }
        .subheading {
          font-size: 0.9rem;
          color: #4b5563;
        }
        h2 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 10px;
          margin-top: 0;
          color: #111827;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 6px;
        }
        .section {
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 16px;
          margin-bottom: 16px;
        }
        .meta-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 10px;
          background: #f9fafb;
        }
        .meta-label {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #6b7280;
          margin-bottom: 2px;
        }
        .meta-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #111827;
        }
        .risk-overview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          background-color: #fffaf0;
          border: 2px solid #ea580c;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 16px;
        }
        .risk-box {
          border: 1px solid #fed7aa;
          border-radius: 6px;
          background: #fffbeb;
          padding: 10px;
          text-align: center;
        }
        .risk-label {
          font-size: 0.75rem;
          color: #7c2d12;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .risk-value {
          font-size: 1rem;
          font-weight: 800;
          color: #9a3412;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 6px 8px;
          font-size: 0.82rem;
          vertical-align: top;
        }
        th {
          background: #f3f4f6;
          text-align: left;
          font-weight: 700;
        }
        td:nth-child(2), th:nth-child(2) {
          width: 64px;
          text-align: center;
        }
        td:nth-child(3), th:nth-child(3) {
          width: 70px;
          text-align: center;
          font-weight: 700;
        }
        .monthly-review {
          margin-top: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 12px;
          background: #f8fafc;
        }
        .monthly-review h2 {
          margin-bottom: 8px;
        }
        .monthly-review p {
          font-size: 0.82rem;
          margin: 4px 0;
          color: #374151;
        }
        .risk-level {
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .footer {
          margin-top: 18px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
        }
        @media print {
          .section, .monthly-review, .meta-grid, .risk-overview { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Choking Risk Assessment + Monthly Review</h1>
        <div class="subheading">Specialized form layout for full field visibility</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Resident Name</div>
          <div class="meta-value">${escapeHTML(getStringValue(data.residentName))}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date of Birth</div>
          <div class="meta-value">${escapeHTML(getStringValue(data.dateOfBirth))}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date of Assessment</div>
          <div class="meta-value">${escapeHTML(formatDate(dateOfAssessment ?? data.assessment_date))}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Time of Assessment</div>
          <div class="meta-value">${escapeHTML(getStringValue(data.time))}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Completed By</div>
          <div class="meta-value">${escapeHTML(completedBy)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Signature</div>
          <div class="meta-value">${escapeHTML(getStringValue(data.signature))}</div>
        </div>
      </div>

      <div class="risk-overview">
        <div class="risk-box">
          <div class="risk-label">Total Risk Score</div>
          <div class="risk-value">${totalScore}</div>
        </div>
        <div class="risk-box">
          <div class="risk-label">Risk Level</div>
          <div class="risk-value risk-level">${escapeHTML(riskLevel)}</div>
        </div>
      </div>

      ${renderedSections}

      <div class="monthly-review">
        <h2>Monthly Review Guidance</h2>
        <p><strong>Low Risk: 0-24</strong> - Record in care plan with actions to minimize choking risk and review at least monthly or when condition changes.</p>
        <p><strong>Medium Risk: 25-49</strong> - Record with clear eating/drinking assistance guidance and supervision level; review at least monthly or when condition changes.</p>
        <p><strong>High Risk: 50+</strong> - Record with supervision guidance, refer to speech and language therapy for assessment, and review at least monthly or when condition changes.</p>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Choking Risk Assessment + Monthly Review - ${escapeHTML(getStringValue(data.residentName))}</p>
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

    const assessmentData = (await request.json()) as ChokingRiskPayload;

    if (!assessmentData) {
      return NextResponse.json({ error: "Assessment data is required" }, { status: 400 });
    }

    const assessmentDataNested: Record<string, unknown> =
      assessmentData.assessment_data && typeof assessmentData.assessment_data === "object"
        ? assessmentData.assessment_data
        : {};

    const getOptionalString = (value: unknown): string | undefined => {
      if (typeof value === "string" && value.trim().length > 0) return value;
      return undefined;
    };

    const getOptionalNumber = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return undefined;
    };

    // Flatten known fields into a strongly-typed payload for HTML rendering.
    const flattenedData: ChokingRiskPayload = {
      ...assessmentData,
      residentName:
        assessmentData.residentName ??
        getOptionalString(assessmentDataNested.residentName) ??
        "Resident",
      dateOfBirth:
        assessmentData.dateOfBirth ??
        getOptionalString(assessmentDataNested.dateOfBirth),
      assessment_date: assessmentData.assessment_date ?? assessmentData.created_at ?? Date.now(),
      completed_by:
        assessmentData.completed_by ??
        assessmentData.completedBy ??
        getOptionalString(assessmentDataNested.completed_by) ??
        "Not specified",
      risk_factors:
        assessmentData.risk_factors ??
        ((assessmentDataNested.risk_factors as Record<string, unknown> | undefined) ?? {}),
      total_score:
        assessmentData.total_score ??
        getOptionalNumber(assessmentDataNested.total_score) ??
        0,
      risk_level:
        assessmentData.risk_level ??
        getOptionalString(assessmentDataNested.risk_level) ??
        "No Risk"
    };

    console.log("Choking Risk PDF API flattening data:", {
      residentName: flattenedData.residentName,
      totalScore: flattenedData.total_score,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateChokingRiskHTML(flattenedData);

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
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="choking-risk-assessment-${assessmentData.residentName?.replace(/\\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Choking Risk Assessment PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
