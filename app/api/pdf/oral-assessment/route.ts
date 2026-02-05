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

function generateOralAssessmentHTML(data: any): string {
  const dentalInfo = data.dental_info || {};
  const examFindings = data.exam_findings || {};
  const symptoms = data.symptoms || {};
  const careRecs = data.care_recommendations || {};
  const details = data.assessment_details || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Oral Assessment</title>
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
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #1e40af;
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
          color: #1e40af;
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
        .finding-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .finding-item:last-child {
          border-bottom: none;
        }
        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-positive { background-color: #fee2e2; color: #991b1b; }
        .status-negative { background-color: #dcfce7; color: #166534; }
        .care-note {
          margin-top: 4px;
          padding-left: 12px;
          border-left: 2px solid #3b82f6;
          font-style: italic;
          color: #4b5563;
          font-size: 0.9rem;
        }
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
        <h1>Oral Assessment</h1>
      </div>

      <div class="section">
        <h2>Resident Details</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${data.residentName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${data.dateOfBirth || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date)}</div>
          </div>
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${data.completed_by || "Not specified"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Dental Information</h2>
        <div class="info-box">
          <div class="finding-item">
            <span class="field-label">Oral Hygiene Routine</span>
            <span class="field-value">${data.oral_hygiene_routine || "None specified"}</span>
          </div>
          <div class="finding-item">
            <span class="field-label">Registered with Dentist?</span>
            <span class="status-badge ${dentalInfo.isRegisteredWithDentist ? 'status-negative' : 'status-positive'}">
              ${dentalInfo.isRegisteredWithDentist ? "Yes" : "No"}
            </span>
          </div>
          ${dentalInfo.dentistName ? `
          <div class="finding-item">
            <span class="field-label">Dentist Name</span>
            <span class="field-value">${dentalInfo.dentistName}</span>
          </div>
          ` : ""}
          ${dentalInfo.contactTelephone ? `
          <div class="finding-item">
            <span class="field-label">Contact Telephone</span>
            <span class="field-value">${dentalInfo.contactTelephone}</span>
          </div>
          ` : ""}
        </div>
      </div>

      <div class="section">
        <h2>Clinical Findings & Care</h2>
        <div class="grid grid-cols-2">
          <div class="info-box">
            <h3>Examination Findings</h3>
            <div class="finding-item">
              <span class="field-label">Lips Dry/Cracked</span>
              <span class="status-badge ${examFindings.lipsDryCracked ? 'status-positive' : 'status-negative'}">${examFindings.lipsDryCracked ? 'Yes' : 'No'}</span>
            </div>
            ${careRecs.lipsDryCrackedCare ? `<div class="care-note">Care: ${careRecs.lipsDryCrackedCare}</div>` : ""}
            
            <div class="finding-item">
              <span class="field-label">Tongue Dry/Cracked</span>
              <span class="status-badge ${examFindings.tongueDryCracked ? 'status-positive' : 'status-negative'}">${examFindings.tongueDryCracked ? 'Yes' : 'No'}</span>
            </div>
            ${careRecs.tongueDryCrackedCare ? `<div class="care-note">Care: ${careRecs.tongueDryCrackedCare}</div>` : ""}

            <div class="finding-item">
              <span class="field-label">Tongue Ulceration</span>
              <span class="status-badge ${examFindings.tongueUlceration ? 'status-positive' : 'status-negative'}">${examFindings.tongueUlceration ? 'Yes' : 'No'}</span>
            </div>
            ${careRecs.tongueUlcerationCare ? `<div class="care-note">Care: ${careRecs.tongueUlcerationCare}</div>` : ""}

            <div class="finding-item">
              <span class="field-label">Has Top Denture</span>
              <span class="status-badge ${examFindings.hasTopDenture ? 'status-positive' : 'status-negative'}">${examFindings.hasTopDenture ? 'Yes' : 'No'}</span>
            </div>
            ${careRecs.topDentureCare ? `<div class="care-note">Care: ${careRecs.topDentureCare}</div>` : ""}
          </div>

          <div class="info-box">
            <h3>Symptoms</h3>
            <div class="finding-item">
              <span class="field-label">Pain When Eating</span>
              <span class="status-badge ${symptoms.painWhenEating ? 'status-positive' : 'status-negative'}">${symptoms.painWhenEating ? 'Yes' : 'No'}</span>
            </div>
            ${careRecs.painWhenEatingCare ? `<div class="care-note">Care: ${careRecs.painWhenEatingCare}</div>` : ""}

            <div class="finding-item">
              <span class="field-label">Difficulty Swallowing</span>
              <span class="status-badge ${symptoms.difficultySwallowing ? 'status-positive' : 'status-negative'}">${symptoms.difficultySwallowing ? 'Yes' : 'No'}</span>
            </div>
            ${careRecs.difficultySwallowingCare ? `<div class="care-note">Care: ${careRecs.difficultySwallowingCare}</div>` : ""}

            <div class="finding-item">
              <span class="field-label">Dehydrated</span>
              <span class="status-badge ${symptoms.dehydrated ? 'status-positive' : 'status-negative'}">${symptoms.dehydrated ? 'Yes' : 'No'}</span>
            </div>
            ${careRecs.dehydratedCare ? `<div class="care-note">Care: ${careRecs.dehydratedCare}</div>` : ""}
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Assessment Completion</h2>
        <div class="info-box grid grid-cols-2">
          <div>
            <div class="field-label">Signature</div>
            <div class="field-value">${details.signature || data.completed_by}</div>
          </div>
          <div>
            <div class="field-label">Height / Weight</div>
            <div class="field-value">${details.height || "-"} cm / ${details.weight || "-"} kg</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Oral Assessment Report - ${data.residentName}</p>
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

    // Deep flattening: merge assessment_data and its sub-objects into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      dental_info: assessmentData.dental_info || assessmentData.assessment_data?.dental_info || {},
      exam_findings: assessmentData.exam_findings || assessmentData.assessment_data?.exam_findings || {},
      symptoms: assessmentData.symptoms || assessmentData.assessment_data?.symptoms || {},
      care_recommendations: assessmentData.care_recommendations || assessmentData.assessment_data?.care_recommendations || {},
      assessment_details: assessmentData.assessment_details || assessmentData.assessment_data?.assessment_details || {},
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      assessment_date: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completed_by || "Not specified"
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

      return new NextResponse(pdfBuffer as any, {
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
