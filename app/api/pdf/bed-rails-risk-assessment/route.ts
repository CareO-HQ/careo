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

function generateBedRailsRiskHTML(data: any): string {
  const risks = data.risks_identified || {};
  const benefits = data.benefits_identified || {};
  const alternatives = data.alternatives_considered || {};
  const decision = data.decision || {};
  const safety = decision.safetyChecklist || {};
  const extended = decision.extendedHeightChecks || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bed Rails Risk Assessment</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.4;
          color: #111827;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        .header {
          border-bottom: 3px solid #ef4444;
          padding-bottom: 20px;
          margin-bottom: 24px;
          text-align: center;
        }
        h1 {
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 4px;
          color: #b91c1c;
        }
        h2 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 12px;
          color: #111827;
          border-left: 4px solid #ef4444;
          padding-left: 12px;
          background-color: #fef2f2;
          padding-top: 6px;
          padding-bottom: 6px;
        }
        .grid {
          display: grid;
          gap: 12px;
        }
        .grid-cols-2 {
          grid-template-columns: 1fr 1fr;
        }
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .info-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          font-size: 0.9rem;
        }
        .check-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 6px;
          font-size: 0.85rem;
        }
        .check-box {
          width: 14px;
          height: 14px;
          border: 1px solid #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .checked {
          background-color: #ef4444;
          border-color: #ef4444;
          color: white;
          font-size: 10px;
        }
        .danger-zone {
          border: 2px solid #ef4444;
          background-color: #fff1f2;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .success-zone {
          border: 2px solid #10b981;
          background-color: #f0fdf4;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.7rem;
          color: #6b7280;
          text-align: center;
        }
        .label { font-weight: 600; color: #4b5563; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Risk Assessment for Use of Bed Rails</h1>
        <p style="color: #6b7280;">Safety & Compliance Audit</p>
      </div>

      <div class="section">
        <h2>Administrative Details</h2>
        <div class="grid grid-cols-2 info-box">
          <div><span class="label">Resident:</span> ${data.residentName || "N/A"}</div>
          <div><span class="label">Bedroom:</span> ${data.bedroomNumber || "N/A"}</div>
          <div><span class="label">Assessment Date:</span> ${formatDate(data.assessment_date)}</div>
          <div><span class="label">Assessed By:</span> ${data.completed_by}</div>
        </div>
      </div>

      <div class="section">
        <h2>Trial of Alternatives</h2>
        <div class="info-box">
          <p><span class="label">Alternatives Considered:</span> ${alternatives.considered || "None recorded"}</p>
          <p><span class="label">Result/Rationale:</span> ${alternatives.reasons || "N/A"}</p>
        </div>
      </div>

      <div class="section">
        <div class="danger-zone">
          <h3 style="color: #b91c1c; margin-top: 0; font-size: 1rem;">Exclusion Criteria (Bedrails CANNOT be used if any apply)</h3>
          <div class="check-item"><div class="check-box ${risks.residentRefuses ? 'checked' : ''}">${risks.residentRefuses ? '✓' : ''}</div> Resident with capacity refuses</div>
          <div class="check-item"><div class="check-box ${risks.climbingRisk ? 'checked' : ''}">${risks.climbingRisk ? '✓' : ''}</div> Risk of climbing over (leading to higher fall)</div>
          <div class="check-item"><div class="check-box ${risks.entrapmentRisk ? 'checked' : ''}">${risks.entrapmentRisk ? '✓' : ''}</div> Risk of entrapment exceeds risk of falling</div>
          <div class="check-item"><div class="check-box ${risks.abnormalBodySize ? 'checked' : ''}">${risks.abnormalBodySize ? '✓' : ''}</div> Small size resulting in entrapment danger</div>
          <div class="check-item"><div class="check-box ${risks.restraintPurpose ? 'checked' : ''}">${risks.restraintPurpose ? '✓' : ''}</div> Primary purpose is to restrain violent movement</div>
        </div>
      </div>

      <div class="section">
        <div class="success-zone">
          <h3 style="color: #065f46; margin-top: 0; font-size: 1rem;">Authorization Rationale (Bedrails CAN be used if applicable)</h3>
          <div class="check-item"><div class="check-box ${benefits.residentRequests ? 'checked' : ''}">${benefits.residentRequests ? '✓' : ''}</div> Resident with capacity requests bedrails</div>
          <div class="check-item"><div class="check-box ${benefits.mdtMeetingCompleted ? 'checked' : ''}">${benefits.mdtMeetingCompleted ? '✓' : ''}</div> MDT collective risk understanding</div>
          <div class="check-item"><div class="check-box ${benefits.riskOutweighsBenefit ? 'checked' : ''}">${benefits.riskOutweighsBenefit ? '✓' : ''}</div> Injury risk from fall outweighs rail risk</div>
          <div class="check-item"><div class="check-box ${benefits.bestInterestDecision ? 'checked' : ''}">${benefits.bestInterestDecision ? '✓' : ''}</div> Best Interest Decision for lacking capacity</div>
        </div>
      </div>

      <div class="section">
        <h2>Equipment Configuration</h2>
        <div class="grid grid-cols-2 info-box">
          <div><span class="label">Bed Type:</span> ${decision.typeOfBed || "N/A"}</div>
          <div><span class="label">Mattress:</span> ${decision.typeOfMattress || "N/A"}</div>
          <div><span class="label">Rail Type:</span> ${decision.typeOfBedrails || "N/A"}</div>
          <div><span class="label">Consent:</span> ${decision.consentObtained || "NO"}</div>
        </div>
      </div>

      <div class="section">
        <h2>Safety Audit Checklist</h2>
        <div class="info-box">
          <p><span class="label">Gap Lower Bar/Mattress:</span> ${safety.gapBetweenRailAndMattress || "N/A"}</p>
          <p><span class="label">Mattress Compresses Easily:</span> ${safety.mattressCompressesEasily || "N/A"}</p>
          <p><span class="label">Gap > 60mm Headboard/Wall:</span> ${safety.gapMoreThan60mm || "N/A"}</p>
          <p><span class="label">Insecure Rail:</span> ${safety.bedRailInsecure || "N/A"}</p>
          <p><span class="label">Bed Against Wall:</span> ${safety.bedAgainstWall || "N/A"}</p>
        </div>
      </div>

      <div class="section">
        <h2>EXTENDED HEIGHT BED RAILS</h2>
        <div class="info-box">
          <p><span class="label">Is the extended bed rail positioned correctly with a gap of less than 60mm?</span> ${extended.positionedCorrectly || "NO"}</p>
          <p><span class="label">Is the extended height rail securely fastened?</span> ${extended.securelyFastened || "NO"}</p>
          <p><span class="label">Are correct bumpers installed?</span> ${extended.correctBumpersInstalled || "NO"}</p>
          <p><span class="label">Does the mattress come below the plimsoll line on the bumper?</span> ${extended.mattressBelowPlimsollLine || "NO"}</p>
          <p><span class="label">Have staff been trained how to attach and remove the extended bed rail?</span> ${extended.staffTrained || "NO"}</p>
          <p><span class="label">Has the bed and bed rails been checked for any signs of damage or wear and tear?</span> ${extended.checkedForDamage || "NO"}</p>
        </div>
      </div>

      <div class="section" style="margin-top: 40px;">
        <div class="grid grid-cols-2">
          <div style="border-top: 1px solid black; padding-top: 5px; margin-right: 20px;">
            <p style="font-size: 0.8rem;"><span class="label">Signature of Assessor:</span> ${data.completed_by}</p>
          </div>
          <div style="border-top: 1px solid black; padding-top: 5px;">
            <p style="font-size: 0.8rem;"><span class="label">Date:</span> ${formatDate(data.assessment_date)}</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Managed by CareO-HQ Clinical Risk Department</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      bedroomNumber: assessmentData.bedroomNumber || assessmentData.assessment_data?.bedroomNumber,
      assessment_date: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completed_by || "Not specified",
      // Ensure nested objects are available for the template
      risks_identified: assessmentData.risks_identified || assessmentData.assessment_data?.risks_identified || {},
      benefits_identified: assessmentData.benefits_identified || assessmentData.assessment_data?.benefits_identified || {},
      alternatives_considered: assessmentData.alternatives_considered || assessmentData.assessment_data?.alternatives_considered || {},
      decision: assessmentData.decision || assessmentData.assessment_data?.decision || {}
    };

    console.log("Bed Rails Risk PDF API flattening data:", {
      residentName: flattenedData.residentName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateBedRailsRiskHTML(flattenedData);

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

      const residentName = (flattenedData.residentName || "resident").replace(/\s+/g, "-");

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bed-rails-risk-assessment-${residentName}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Bed Rails Risk PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
