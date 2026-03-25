import { NextRequest, NextResponse } from "next/server";
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

function generateDietNotificationHTML(data: any): string {
  const dietaryPreferences = data.dietary_preferences || {};
  const foodConsistency = data.food_consistency || {};
  const fluidConsistency = data.fluid_consistency || {};
  const kitchenReview = data.kitchen_review || {};

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
          border-bottom: 2px solid #f97316;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #c2410c;
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
        .check-mark { color: #f97316; font-weight: bold; }
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
        <h1>Diet Notification</h1>
      </div>

      <div class="section">
        <h2>Resident & Administrative Info</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${data.residentName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Room Number</div>
            <div class="field-value">${data.roomNumber || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${data.completed_by || data.completedBy || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Job Role</div>
            <div class="field-value">${data.job_role || data.jobRole || "Not specified"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Risk & Preferences</h2>
        <div class="grid grid-cols-2">
          <div class="info-box">
            <h3>Choking Risk</h3>
            <div class="risk-badge risk-${data.choking_risk?.toLowerCase().replace(' ', '-') || 'low'}">
              ${data.choking_risk || "Low Risk"}
            </div>
          </div>
          <div class="info-box">
            <h3>Preferred Meal Size</h3>
            <div class="field-value">${data.preferred_meal_size || "Standard"}</div>
          </div>
        </div>
        <div class="info-box">
          <h3>Dietary Preferences</h3>
          <p><strong>Diet Type:</strong> ${dietaryPreferences.dietType || "Standard"}</p>
          <p><strong>Likes/Favourite Foods:</strong> ${dietaryPreferences.likesFavouriteFoods || "None specified"}</p>
          <p><strong>Dislikes:</strong> ${dietaryPreferences.dislikes || "None specified"}</p>
          <p><strong>Foods to Avoid:</strong> ${dietaryPreferences.foodsToBeAvoided || "None specified"}</p>
          <p><strong>Allergies/Intolerances:</strong> ${dietaryPreferences.foodAllergyOrIntolerance || "None specified"}</p>
        </div>
      </div>

      <div class="section">
        <h2>IDDSI Consistency Levels</h2>
        <div class="grid grid-cols-2">
          <div class="info-box">
            <h3>Food Consistency</h3>
            <div class="consistency-list">
              ${Object.entries(foodConsistency)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => `
                  <div class="consistency-item">
                    <span class="check-mark">✓</span>
                    <span>${key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                `).join('') || "Regular diet"}
            </div>
          </div>
          <div class="info-box">
            <h3>Fluid Consistency</h3>
            <div class="consistency-list">
              ${Object.entries(fluidConsistency)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => `
                  <div class="consistency-item">
                    <span class="check-mark">✓</span>
                    <span>${key.replace('level', 'Level ').replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                `).join('') || "Thin fluids"}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Assistance & Fluid Requirements</h2>
        <div class="info-box">
          <p><strong>Assistance Required:</strong> ${dietaryPreferences.assistanceRequired || "Independent"}</p>
          <p><strong>Fluid Requirements:</strong> ${dietaryPreferences.fluidRequirements || "Standard intake"}</p>
        </div>
      </div>

      <div class="section">
        <h2>Kitchen Review</h2>
        <div class="info-box">
          <p><strong>Reviewed by Cook/Chef:</strong> ${kitchenReview.reviewedByCookChef || "Pending review"}</p>
          ${kitchenReview.reviewerPrintName ? `<p><strong>Print Name:</strong> ${kitchenReview.reviewerPrintName}</p>` : ""}
          ${kitchenReview.reviewerJobTitle ? `<p><strong>Job Title:</strong> ${kitchenReview.reviewerJobTitle}</p>` : ""}
          ${kitchenReview.reviewerSignature ? `<p><strong>Signature:</strong> ${kitchenReview.reviewerSignature}</p>` : ""}
          ${kitchenReview.reviewerDate ? `<p><strong>Date:</strong> ${formatDate(kitchenReview.reviewerDate)}</p>` : ""}
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Diet Notification Report - ${data.residentName}</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = await request.json();

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
      job_role: assessmentData.job_role || assessmentData.jobRole || assessmentData.assessment_data?.job_role || assessmentData.assessment_data?.jobRole || "Not specified",
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

      return new NextResponse(pdfBuffer as any, {
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
