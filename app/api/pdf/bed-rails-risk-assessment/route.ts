import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";

export const runtime = "nodejs";

type YesNo = "YES" | "NO";

type BedRailsRiskAssessmentPayload = {
  _id?: string;
  id?: string;
  residentName?: string;
  bedroomNumber?: string;
  dateOfBirth?: string | number;
  assessment_date?: string | number;
  assessmentDate?: string | number;
  completed_by?: string;
  completedBy?: string;
  job_role?: string;
  jobRole?: string;
  signatureOfAssessor?: string;
  signatureDate?: string | number;
  alternativeEquipmentConsidered?: string;
  reasonsAlternativesNotSuccessful?: string;
  anyExclusionChecked?: boolean;
  anySafetyCheckFailed?: boolean;
  hasExtendedHeightRails?: boolean;
  risks_identified?: {
    residentRefuses?: boolean;
    climbingRisk?: boolean;
    entrapmentRisk?: boolean;
    abnormalBodySize?: boolean;
    restraintPurpose?: boolean;
    freedomLimitation?: boolean;
  };
  benefits_identified?: {
    residentRequests?: boolean;
    mdtMeetingCompleted?: boolean;
    riskOutweighsBenefit?: boolean;
    alternativesExplored?: boolean;
    bestInterestDecision?: boolean;
  };
  alternatives_considered?: {
    considered?: string;
    reasons?: string;
  };
  decision?: {
    reasonExplainedToResident?: YesNo;
    typeOfBed?: string;
    typeOfMattress?: string;
    typeOfBedrails?: string;
    safetyChecklist?: {
      gapBetweenRailAndMattress?: YesNo;
      mattressCompressesEasily?: YesNo;
      gapMoreThan60mm?: YesNo;
      bedRailInsecure?: YesNo;
      bedAgainstWall?: YesNo;
    };
    anySafetyCheckFailed?: boolean;
    hasExtendedHeightRails?: boolean;
    extendedHeightChecks?: {
      positionedCorrectly?: YesNo;
      securelyFastened?: YesNo;
      correctBumpersInstalled?: YesNo;
      mattressBelowPlimsollLine?: YesNo;
      staffTrained?: YesNo;
      checkedForDamage?: YesNo;
    };
    consentObtained?: YesNo;
    carePlanCompleted?: YesNo;
  };
  assessment_data?: Partial<BedRailsRiskAssessmentPayload>;
};

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

function stringValue(value?: string): string {
  if (!value || !value.trim()) return "Not provided";
  return value;
}

function yesNoFromBoolean(value?: boolean): "Yes" | "No" {
  return value === true ? "Yes" : "No";
}

function yesNoFromChoice(value?: YesNo): "Yes" | "No" {
  return value === "YES" ? "Yes" : "No";
}

function generateBedRailsRiskHTML(data: BedRailsRiskAssessmentPayload): string {
  const risks = data.risks_identified || {};
  const benefits = data.benefits_identified || {};
  const alternatives = data.alternatives_considered || {};
  const decision = data.decision || {};
  const safety = decision.safetyChecklist || {};
  const extended = decision.extendedHeightChecks || {};
  const hasExtendedHeightRails = decision.hasExtendedHeightRails ?? data.hasExtendedHeightRails;
  const anySafetyCheckFailed = decision.anySafetyCheckFailed ?? data.anySafetyCheckFailed;
  const assessmentDate = data.assessment_date || data.assessmentDate;

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
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          font-size: 0.85rem;
        }
        th {
          background: #f8fafc;
          width: 48%;
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
          <div><span class="label">Resident Name:</span> ${stringValue(data.residentName)}</div>
          <div><span class="label">Bedroom Number:</span> ${stringValue(data.bedroomNumber)}</div>
          <div><span class="label">Date of Birth:</span> ${formatDate(data.dateOfBirth)}</div>
          <div><span class="label">Date of Assessment:</span> ${formatDate(assessmentDate)}</div>
          <div><span class="label">Assessment Completed By:</span> ${stringValue(data.completed_by || data.completedBy)}</div>
          <div><span class="label">Job Role:</span> ${stringValue(data.job_role || data.jobRole)}</div>
        </div>
      </div>

      <div class="section">
        <h2>Trial of Alternatives</h2>
        <div class="info-box">
          <p><span class="label">Alternative Equipment Considered/Trialled:</span> ${stringValue(
            alternatives.considered || data.alternativeEquipmentConsidered
          )}</p>
          <p><span class="label">Reasons Why Alternatives Have Not Been Successful:</span> ${stringValue(
            alternatives.reasons || data.reasonsAlternativesNotSuccessful
          )}</p>
        </div>
      </div>

      <div class="section">
        <div class="danger-zone">
          <h3 style="color: #b91c1c; margin-top: 0; font-size: 1rem;">Exclusion Criteria (Bedrails CANNOT be used if any apply)</h3>
          <table>
            <tr><th>Resident with capacity refuses</th><td>${yesNoFromBoolean(risks.residentRefuses)}</td></tr>
            <tr><th>Risk of climbing over rails</th><td>${yesNoFromBoolean(risks.climbingRisk)}</td></tr>
            <tr><th>Risk of head/limb entrapment</th><td>${yesNoFromBoolean(risks.entrapmentRisk)}</td></tr>
            <tr><th>Abnormally small body size</th><td>${yesNoFromBoolean(risks.abnormalBodySize)}</td></tr>
            <tr><th>Used for restraint of violent movement</th><td>${yesNoFromBoolean(risks.restraintPurpose)}</td></tr>
            <tr><th>Used solely to prevent leaving bed</th><td>${yesNoFromBoolean(risks.freedomLimitation)}</td></tr>
            <tr><th>Any Exclusion Criteria Checked</th><td>${yesNoFromBoolean(data.anyExclusionChecked)}</td></tr>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="success-zone">
          <h3 style="color: #065f46; margin-top: 0; font-size: 1rem;">Authorization Rationale (Bedrails CAN be used if applicable)</h3>
          <table>
            <tr><th>Resident with capacity requests</th><td>${yesNoFromBoolean(benefits.residentRequests)}</td></tr>
            <tr><th>MDT meeting understands risks</th><td>${yesNoFromBoolean(benefits.mdtMeetingCompleted)}</td></tr>
            <tr><th>Falling risk outweighs rail risk</th><td>${yesNoFromBoolean(benefits.riskOutweighsBenefit)}</td></tr>
            <tr><th>All other alternatives unsuccessful</th><td>${yesNoFromBoolean(benefits.alternativesExplored)}</td></tr>
            <tr><th>Best interest decision (if no capacity)</th><td>${yesNoFromBoolean(benefits.bestInterestDecision)}</td></tr>
            <tr><th>Has the reason for using bed rails been explained to the Resident?</th><td>${yesNoFromChoice(decision.reasonExplainedToResident)}</td></tr>
          </table>
        </div>
      </div>

      <div class="section">
        <h2>Equipment Configuration</h2>
        <div class="grid grid-cols-2 info-box">
          <div><span class="label">Type of Bed:</span> ${stringValue(decision.typeOfBed)}</div>
          <div><span class="label">Type of Mattress:</span> ${stringValue(decision.typeOfMattress)}</div>
          <div><span class="label">Type of Bedrails:</span> ${stringValue(decision.typeOfBedrails)}</div>
          <div><span class="label">Has Extended Height Bed Rails:</span> ${yesNoFromBoolean(hasExtendedHeightRails)}</div>
          <div><span class="label">Obtained consent from Resident or consulted NOK?</span> ${yesNoFromChoice(decision.consentObtained)}</div>
          <div><span class="label">Have you completed a care plan?</span> ${yesNoFromChoice(decision.carePlanCompleted)}</div>
        </div>
      </div>

      <div class="section">
        <h2>Safety Audit Checklist</h2>
        <table class="info-box">
          <tr><th>Gap between lower bar and top of mattress?</th><td>${yesNoFromChoice(safety.gapBetweenRailAndMattress)}</td></tr>
          <tr><th>Does mattress compress easily at edge?</th><td>${yesNoFromChoice(safety.mattressCompressesEasily)}</td></tr>
          <tr><th>Gap greater than 60mm between rail and headboard/wall?</th><td>${yesNoFromChoice(safety.gapMoreThan60mm)}</td></tr>
          <tr><th>Is the bed rail insecure?</th><td>${yesNoFromChoice(safety.bedRailInsecure)}</td></tr>
          <tr><th>Is the bed positioned against a wall?</th><td>${yesNoFromChoice(safety.bedAgainstWall)}</td></tr>
          <tr><th>Any Safety Check Failed</th><td>${yesNoFromBoolean(anySafetyCheckFailed)}</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>EXTENDED HEIGHT BED RAILS</h2>
        <table class="info-box">
          <tr><th>Is the extended bed rail positioned as far to the head of the bed as possible with a gap of less than 60mm?</th><td>${yesNoFromChoice(extended.positionedCorrectly)}</td></tr>
          <tr><th>Is the extended height bed rail securely fastened to the integrated bed rail?</th><td>${yesNoFromChoice(extended.securelyFastened)}</td></tr>
          <tr><th>Are the correct bumpers installed?</th><td>${yesNoFromChoice(extended.correctBumpersInstalled)}</td></tr>
          <tr><th>Does the mattress come below the plimsoll line on the bumper?</th><td>${yesNoFromChoice(extended.mattressBelowPlimsollLine)}</td></tr>
          <tr><th>Have staff been trained how to attach and remove the extended bed rail?</th><td>${yesNoFromChoice(extended.staffTrained)}</td></tr>
          <tr><th>Has the bed and bed rails been checked for any signs of damage or wear and tear?</th><td>${yesNoFromChoice(extended.checkedForDamage)}</td></tr>
        </table>
      </div>

      <div class="section" style="margin-top: 40px;">
        <div class="grid grid-cols-2">
          <div style="border-top: 1px solid black; padding-top: 5px; margin-right: 20px;">
            <p style="font-size: 0.8rem;"><span class="label">Digital Signature (Assessor):</span> ${stringValue(
              data.signatureOfAssessor || data.completed_by || data.completedBy
            )}</p>
          </div>
          <div style="border-top: 1px solid black; padding-top: 5px;">
            <p style="font-size: 0.8rem;"><span class="label">Signature Date:</span> ${formatDate(
              data.signatureDate || assessmentDate
            )}</p>
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

    const assessmentData = (await request.json()) as BedRailsRiskAssessmentPayload;

    if (!assessmentData) {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData: BedRailsRiskAssessmentPayload = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      bedroomNumber: assessmentData.bedroomNumber || assessmentData.assessment_data?.bedroomNumber,
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      assessment_date:
        assessmentData.assessment_date ||
        assessmentData.assessmentDate ||
        assessmentData.assessment_data?.assessmentDate ||
        Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completed_by || "Not specified",
      job_role: assessmentData.job_role || assessmentData.jobRole || assessmentData.assessment_data?.jobRole,
      signatureOfAssessor:
        assessmentData.signatureOfAssessor ||
        assessmentData.assessment_data?.signatureOfAssessor ||
        assessmentData.completed_by ||
        assessmentData.completedBy,
      signatureDate:
        assessmentData.signatureDate ||
        assessmentData.assessment_data?.signatureDate ||
        assessmentData.assessment_date ||
        assessmentData.assessmentDate,
      alternativeEquipmentConsidered:
        assessmentData.alternativeEquipmentConsidered ||
        assessmentData.assessment_data?.alternativeEquipmentConsidered,
      reasonsAlternativesNotSuccessful:
        assessmentData.reasonsAlternativesNotSuccessful ||
        assessmentData.assessment_data?.reasonsAlternativesNotSuccessful,
      anyExclusionChecked:
        assessmentData.anyExclusionChecked ?? assessmentData.assessment_data?.anyExclusionChecked,
      anySafetyCheckFailed:
        assessmentData.anySafetyCheckFailed ?? assessmentData.assessment_data?.anySafetyCheckFailed,
      hasExtendedHeightRails:
        assessmentData.hasExtendedHeightRails ?? assessmentData.assessment_data?.hasExtendedHeightRails,
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

      return new NextResponse(pdfBuffer, {
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
