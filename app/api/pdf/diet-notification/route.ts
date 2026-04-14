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

type CheckboxMap = Record<string, boolean | undefined>;

type DietNotificationPdfData = {
  _id?: string;
  id?: string;
  residentName?: string;
  roomNumber?: string;
  bedroomNumber?: string;
  completed_by?: string;
  completedBy?: string;
  print_name?: string;
  printName?: string;
  job_role?: string;
  jobRole?: string;
  signature?: string;
  dateCompleted?: string | number;
  date_completed?: string | number;
  reviewDate?: string | number;
  review_date?: string | number;
  assessment_date?: string | number;
  created_at?: string | number;
  choking_risk?: string;
  chokingRiskAssessment?: string;
  preferred_meal_size?: string;
  preferredMealSize?: string;
  dietary_preferences?: {
    dietType?: string;
    likesFavouriteFoods?: string;
    dislikes?: string;
    foodsToBeAvoided?: string;
    foodAllergyOrIntolerance?: string;
    assistanceRequired?: string;
    fluidRequirements?: string;
  };
  food_consistency?: {
    level7Regular?: boolean;
    level7EasyChew?: boolean;
    level6SoftBiteSized?: boolean;
    level5MincedMoist?: boolean;
    level4Pureed?: boolean;
    level3Liquidised?: boolean;
  };
  fluid_consistency?: {
    level4ExtremelyThick?: boolean;
    level3ModeratelyThick?: boolean;
    level2MildlyThick?: boolean;
    level1SlightlyThick?: boolean;
    level0Thin?: boolean;
  };
  kitchen_review?: {
    reviewedByCookChef?: string;
    reviewerPrintName?: string;
    reviewerJobTitle?: string;
    reviewerSignature?: string;
    reviewerDate?: string | number;
  };
  orgLogoUrl?: string;
  careHomeName?: string;
  assessment_data?: Partial<DietNotificationPdfData>;
};

const textValue = (value?: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "Not provided";
};

const checkboxValue = (value?: boolean): string => (value ? "Yes" : "No");

function generateDietNotificationHTML(data: DietNotificationPdfData): string {
  const dietaryPreferences = data.dietary_preferences || {};
  const foodConsistency = (data.food_consistency || {}) as CheckboxMap;
  const fluidConsistency = (data.fluid_consistency || {}) as CheckboxMap;
  const kitchenReview = data.kitchen_review || {};
  const reviewerCookChefValue =
    kitchenReview.reviewedByCookChef ?? data.assessment_data?.kitchen_review?.reviewedByCookChef;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Diet Notification</title>
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
        }
        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .header-brand {
          flex: 1;
        }
        .header-logo {
          max-height: 56px;
          max-width: 170px;
          object-fit: contain;
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
          color: #c2410c;
        }
        .section {
          margin-bottom: 28px;
          page-break-inside: avoid;
        }
        .plain-list {
          margin-top: 6px;
        }
        .plain-line {
          font-size: 1rem;
          color: #111827;
          margin: 0 0 6px 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .subheading {
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #374151;
          margin: 14px 0 8px;
        }
        .risk-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .risk-low { background-color: #dcfce7; color: #166534; }
        .risk-medium { background-color: #fef3c7; color: #92400e; }
        .risk-high { background-color: #fee2e2; color: #991b1b; }
        .care-home {
          color: #374151;
          font-size: 0.9rem;
          margin: 0;
        }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
        }
        @media (max-width: 700px) {
          body { padding: 14px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-row">
          <div class="header-brand">
            <h1>Diet Notification</h1>
            <p class="care-home">Care Home: ${textValue(data.careHomeName)}</p>
          </div>
          ${data.orgLogoUrl ? `<img class="header-logo" src="${data.orgLogoUrl}" alt="Care home logo" />` : ""}
        </div>
      </div>

      <div class="section">
        <h2>Resident & Administrative Info</h2>
        <div class="plain-list">
          <p class="plain-line">${textValue(data.residentName)}</p>
          <p class="plain-line">${textValue(data.roomNumber)}</p>
          <p class="plain-line">${textValue(data.completed_by || data.completedBy)}</p>
          <p class="plain-line">${textValue(data.print_name || data.printName)}</p>
          <p class="plain-line">${textValue(data.job_role || data.jobRole)}</p>
          <p class="plain-line">${textValue(data.signature)}</p>
          <p class="plain-line">${formatDate(data.dateCompleted || data.date_completed)}</p>
          <p class="plain-line">${formatDate(data.reviewDate || data.review_date)}</p>
        </div>
      </div>

      <div class="section">
        <h2>Risk & Preferences</h2>
        <div class="plain-list">
          <p class="plain-line">${textValue(dietaryPreferences.likesFavouriteFoods)}</p>
          <p class="plain-line">${textValue(dietaryPreferences.dislikes)}</p>
          <p class="plain-line">${textValue(dietaryPreferences.foodsToBeAvoided)}</p>
          <p class="plain-line">${textValue(data.choking_risk || data.chokingRiskAssessment)}</p>
        </div>
      </div>

      <div class="section">
        <h2>Meal & Fluid Specifications</h2>
        <div class="plain-list">
          <p class="plain-line">${textValue(data.preferred_meal_size || data.preferredMealSize)}</p>
          <p class="plain-line">${textValue(dietaryPreferences.dietType)}</p>
          <p class="plain-line">${textValue(dietaryPreferences.foodAllergyOrIntolerance)}</p>
        </div>
      </div>

      <div class="section">
        <h2>Food & Fluid Consistency</h2>
        <div class="plain-list">
          <div class="subheading">FOOD CONSISTENCY</div>
          <p class="plain-line">Level 7 Regular: ${checkboxValue(foodConsistency.level7Regular)}</p>
          <p class="plain-line">Level 7 Easy Chew: ${checkboxValue(foodConsistency.level7EasyChew)}</p>
          <p class="plain-line">Level 6 Soft & Bite Sized: ${checkboxValue(foodConsistency.level6SoftBiteSized)}</p>
          <p class="plain-line">Level 5 Minced & Moist: ${checkboxValue(foodConsistency.level5MincedMoist)}</p>
          <p class="plain-line">Level 4 Pureed: ${checkboxValue(foodConsistency.level4Pureed)}</p>
          <p class="plain-line">Level 3 Liquidised: ${checkboxValue(foodConsistency.level3Liquidised)}</p>

          <div class="subheading">FLUID CONSISTENCY</div>
          <p class="plain-line">Level 4 Extremely Thick: ${checkboxValue(fluidConsistency.level4ExtremelyThick)}</p>
          <p class="plain-line">Level 3 Moderately Thick: ${checkboxValue(fluidConsistency.level3ModeratelyThick)}</p>
          <p class="plain-line">Level 2 Mildly Thick: ${checkboxValue(fluidConsistency.level2MildlyThick)}</p>
          <p class="plain-line">Level 1 Slightly Thick: ${checkboxValue(fluidConsistency.level1SlightlyThick)}</p>
          <p class="plain-line">Level 0 Thin: ${checkboxValue(fluidConsistency.level0Thin)}</p>
        </div>
      </div>

      <div class="section">
        <h2>Kitchen Review</h2>
        <div class="plain-list">
          <p class="plain-line">${textValue(reviewerCookChefValue)}</p>
          <p class="plain-line">${textValue(kitchenReview.reviewerPrintName)}</p>
          <p class="plain-line">${textValue(kitchenReview.reviewerJobTitle)}</p>
          <p class="plain-line">${textValue(kitchenReview.reviewerSignature)}</p>
          <p class="plain-line">${formatDate(kitchenReview.reviewerDate)}</p>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Diet Notification Report - ${textValue(data.residentName)}</p>
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

    const assessmentData = (await request.json()) as DietNotificationPdfData;

    if (!assessmentData) {
      return NextResponse.json({ error: "Assessment data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      roomNumber: assessmentData.roomNumber || assessmentData.bedroomNumber || assessmentData.assessment_data?.roomNumber || assessmentData.assessment_data?.bedroomNumber,
      assessment_date: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completed_by || "Not specified",
      print_name: assessmentData.print_name || assessmentData.printName || assessmentData.assessment_data?.print_name || assessmentData.assessment_data?.printName,
      job_role: assessmentData.job_role || assessmentData.jobRole || assessmentData.assessment_data?.job_role || assessmentData.assessment_data?.jobRole || "Not specified",
      signature: assessmentData.signature || assessmentData.assessment_data?.signature,
      dateCompleted:
        assessmentData.dateCompleted ||
        assessmentData.date_completed ||
        assessmentData.assessment_data?.dateCompleted ||
        assessmentData.assessment_data?.date_completed,
      reviewDate:
        assessmentData.reviewDate ||
        assessmentData.review_date ||
        assessmentData.assessment_data?.reviewDate ||
        assessmentData.assessment_data?.review_date,
      chokingRiskAssessment:
        assessmentData.chokingRiskAssessment || assessmentData.assessment_data?.chokingRiskAssessment,
      preferredMealSize: assessmentData.preferredMealSize || assessmentData.assessment_data?.preferredMealSize,
      // Ensure nested objects are available for the template
      dietary_preferences: assessmentData.dietary_preferences || assessmentData.assessment_data?.dietary_preferences || {},
      food_consistency: assessmentData.food_consistency || assessmentData.assessment_data?.food_consistency || {},
      fluid_consistency: assessmentData.fluid_consistency || assessmentData.assessment_data?.fluid_consistency || {},
      kitchen_review: assessmentData.kitchen_review || assessmentData.assessment_data?.kitchen_review || {}
    };

    console.log("Diet Notification PDF API flattening data:", {
      residentName: flattenedData.residentName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateDietNotificationHTML(flattenedData);

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
          "Content-Disposition": `attachment; filename="diet-notification-${assessmentData.residentName?.replace(/\\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Diet Notification PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
