import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";

export const runtime = "nodejs";


function formatDate(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(dateString?: string | number): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return (
    date.toLocaleDateString("en-GB") +
    " at " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function generateInfectionPreventionHTML(data: any): string {
  const symptoms = data.symptoms || {};
  const exposure = data.exposure_history || {};
  const details = symptoms.details || {};
  const respiratory = symptoms.respiratory || {};
  const dv = symptoms.diarrheaVomiting || {};
  const clostridium = symptoms.clostridium || {};
  const mrsa = symptoms.mrsa || {};
  const mdro = symptoms.multiDrugResistance || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Infection Prevention Assessment</title>
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
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 24px;
          margin-bottom: 32px;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0;
          color: #111827;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
          border-left: 4px solid #3b82f6;
          padding-left: 8px;
        }
        h3 {
          font-weight: 500;
          margin-bottom: 4px;
          color: #111827;
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
        }
        .info-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 12px;
          color: #374151;
        }
        .yes-no {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 0.875rem;
        }
        .yes {
          background-color: #d1fae5;
          color: #065f46;
        }
        .no {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
        }
        strong {
          font-weight: 600;
        }
        .subsection {
          margin-bottom: 16px;
        }
        .space-y-2 > * + * {
          margin-top: 8px;
        }
        .space-y-4 > * + * {
          margin-top: 16px;
        }
        @media print {
          body { max-width: none; margin: 0; padding: 16px; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <h1>Infection Prevention Assessment</h1>
        </div>
        <div class="grid grid-cols-2">
          <div>
            <p><strong>Resident Name:</strong> ${data.name || details.name || "Not specified"}</p>
            <p><strong>Date of Birth:</strong> ${formatDate(data.dateOfBirth || details.dateOfBirth)}</p>
            <p><strong>Assessment Type:</strong> ${data.assessmentType || "Not specified"}</p>
          </div>
          <div>
            <p><strong>Completed by:</strong> ${data.completedBy || "Not specified"}</p>
            <p><strong>Job Role:</strong> ${data.jobRole || "Not specified"}</p>
            <p><strong>Date:</strong> ${formatDate(data.completionDate)}</p>
          </div>
        </div>
      </div>

      <!-- Resident Details -->
      <div class="section">
        <h2>Resident Details</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Home Address:</strong> ${details.homeAddress || "Not specified"}</p>
            <p><strong>Information Provided By:</strong> ${details.informationProvidedBy || "Not specified"}</p>
            <p><strong>Consultant / GP Name:</strong> ${details.consultantGP || "Not specified"}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Location Admitted From:</strong> ${exposure.admittedFrom || "Not specified"}</p>
            <p><strong>Admission Date:</strong> ${formatDate(exposure.dateOfAdmission)}</p>
            <p><strong>Reason for Admission:</strong> ${exposure.reasonForAdmission || "Not specified"}</p>
          </div>
        </div>
      </div>

      <!-- Acute Respiratory Illness (ARI) -->
      <div class="section">
        <h2>Acute Respiratory Illness (ARI)</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>New Continuous Cough:</strong> <span class="yes-no ${respiratory.newContinuousCough ? "yes" : "no"}">${respiratory.newContinuousCough ? "Yes" : "No"}</span></p>
            <p><strong>Worsening Cough:</strong> <span class="yes-no ${respiratory.worseningCough ? "yes" : "no"}">${respiratory.worseningCough ? "Yes" : "No"}</span></p>
            <p><strong>High Temperature:</strong> <span class="yes-no ${respiratory.temperatureHigh ? "yes" : "no"}">${respiratory.temperatureHigh ? "Yes" : "No"}</span></p>
            <p><strong>Tested for Covid-19:</strong> <span class="yes-no ${respiratory.testedForCovid19 ? "yes" : "no"}">${respiratory.testedForCovid19 ? "Yes" : "No"}</span></p>
          </div>
          <div class="space-y-2">
            <p><strong>Tested for Influenza A:</strong> <span class="yes-no ${respiratory.testedForInfluenzaA ? "yes" : "no"}">${respiratory.testedForInfluenzaA ? "Yes" : "No"}</span></p>
            <p><strong>Tested for Influenza B:</strong> <span class="yes-no ${respiratory.testedForInfluenzaB ? "yes" : "no"}">${respiratory.testedForInfluenzaB ? "Yes" : "No"}</span></p>
            <p><strong>Tested for Respiratory Screen:</strong> <span class="yes-no ${respiratory.testedForRespiratoryScreen ? "yes" : "no"}">${respiratory.testedForRespiratoryScreen ? "Yes" : "No"}</span></p>
          </div>
        </div>
        <div class="subsection" style="margin-top: 12px;">
          <h3>Additional Info</h3>
          <div class="grid grid-cols-2">
            <p><strong>Influenza B Result:</strong> <span class="yes-no ${respiratory.influenzaB ? "yes" : "no"}">${respiratory.influenzaB ? "Positive" : "Negative"}</span></p>
            <p><strong>Respiratory Screen Result:</strong> <span class="yes-no ${respiratory.respiratoryScreen ? "yes" : "no"}">${respiratory.respiratoryScreen ? "Positive" : "Negative"}</span></p>
          </div>
          <p style="margin-top: 8px;"><strong>Other Symptoms:</strong> ${respiratory.otherRespiratorySymptoms || "None reported"}</p>
        </div>
      </div>

      <!-- Exposure History -->
      <div class="section">
        <h2>Exposure History</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Exposed to COVID+ Patients:</strong> <span class="yes-no ${exposure.exposureToPatientsCovid ? "yes" : "no"}">${exposure.exposureToPatientsCovid ? "Yes" : "No"}</span></p>
            <p><strong>Exposed to COVID+ Staff:</strong> <span class="yes-no ${exposure.exposureToStaffCovid ? "yes" : "no"}">${exposure.exposureToStaffCovid ? "Yes" : "No"}</span></p>
            <p><strong>Isolation Required:</strong> <span class="yes-no ${data.isolationRequired ? "yes" : "no"}">${data.isolationRequired ? "Yes" : "No"}</span></p>
          </div>
          <div class="space-y-2">
            <p><strong>Further Treatment Required:</strong> <span class="yes-no ${exposure.furtherTreatmentRequired ? "yes" : "no"}">${exposure.furtherTreatmentRequired ? "Yes" : "No"}</span></p>
            <p><strong>Isolation Details:</strong> ${exposure.isolationDetails || "No isolation details provided"}</p>
          </div>
        </div>
      </div>

      <!-- Diarrhoea & Vomiting -->
      <div class="section">
        <h2>Diarrhoea & Vomiting</h2>
        <div class="space-y-2">
          <p><strong>Does have d/v where infection not confirmed?</strong> <span class="yes-no ${dv.currentSymptoms ? "yes" : "no"}">${dv.currentSymptoms ? "Yes" : "No"}</span></p>
          <p><strong>Contact with others with d/v (72h)?</strong> <span class="yes-no ${dv.contactWithOthers ? "yes" : "no"}">${dv.contactWithOthers ? "Yes" : "No"}</span></p>
          <p><strong>Family with d/v (72h)?</strong> <span class="yes-no ${dv.familyHistory72h ? "yes" : "no"}">${dv.familyHistory72h ? "Yes" : "No"}</span></p>
        </div>
      </div>

      <!-- Clostridium Difficile -->
      <div class="section">
        <h2>Clostridium Difficile</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Active C. Diff:</strong> <span class="yes-no ${clostridium.active ? "yes" : "no"}">${clostridium.active ? "Yes" : "No"}</span></p>
            <p><strong>History of C. Diff:</strong> <span class="yes-no ${clostridium.history ? "yes" : "no"}">${clostridium.history ? "Yes" : "No"}</span></p>
            <p><strong>Stool Count (72h):</strong> ${clostridium.stoolCount72h || "Not specified"}</p>
            <p><strong>Last Positive Date:</strong> ${formatDate(clostridium.lastPositiveSpecimenDate)}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Specimen Result:</strong> ${clostridium.result || "Not specified"}</p>
            <p><strong>Treatment Complete:</strong> <span class="yes-no ${clostridium.treatmentComplete ? "yes" : "no"}">${clostridium.treatmentComplete ? "Yes" : "No"}</span></p>
            <p><strong>Treatment Received:</strong> ${clostridium.treatmentReceived || "Not specified"}</p>
          </div>
        </div>
        <div class="subsection" style="margin-top: 12px;">
          <h3>Ongoing Regimen</h3>
          <div class="info-box">
            <p><strong>Active Antibiotic Details:</strong> ${clostridium.ongoingDetails || "No ongoing details"}</p>
            <div class="grid grid-cols-2" style="margin-top: 8px;">
              <p><strong>Course Start Date:</strong> ${formatDate(clostridium.ongoingDateCommenced)}</p>
              <p><strong>Projected Length:</strong> ${clostridium.ongoingLengthOfCourse || "Not specified"}</p>
            </div>
            <p style="margin-top: 8px;"><strong>Follow-up Required:</strong> ${clostridium.ongoingFollowUpRequired || "Not specified"}</p>
          </div>
        </div>
      </div>

      <!-- MRSA / MSSA Status -->
      <div class="section">
        <h2>MRSA / MSSA Status</h2>
        <div class="grid grid-cols-2">
          <div class="space-y-2">
            <p><strong>Colonised:</strong> <span class="yes-no ${mrsa.colonised ? "yes" : "no"}">${mrsa.colonised ? "Yes" : "No"}</span></p>
            <p><strong>Infected:</strong> <span class="yes-no ${mrsa.infected ? "yes" : "no"}">${mrsa.infected ? "Yes" : "No"}</span></p>
            <p><strong>Last Positive Swab:</strong> ${formatDate(mrsa.lastPositiveSwabDate)}</p>
          </div>
          <div class="space-y-2">
            <p><strong>Sites Positive:</strong> ${mrsa.sitesPositive || "Not specified"}</p>
            <p><strong>Treatment Received:</strong> ${mrsa.treatmentReceived || "Not specified"}</p>
            <p><strong>Treatment Complete:</strong> <span class="yes-no ${mrsa.treatmentComplete ? "yes" : "no"}">${mrsa.treatmentComplete ? "Yes" : "No"}</span></p>
          </div>
        </div>
        <div class="subsection" style="margin-top: 12px;">
          <h3>Ongoing Decolonisation</h3>
          <div class="info-box">
            <p><strong>Active Decolonisation Details:</strong> ${mrsa.mrsaMssaDetails || "No decolonisation details"}</p>
            <div class="grid grid-cols-2" style="margin-top: 8px;">
              <p><strong>Regimen Start Date:</strong> ${formatDate(mrsa.mrsaMssaDateCommenced)}</p>
              <p><strong>Projected Duration:</strong> ${mrsa.mrsaMssaLengthOfCourse || "Not specified"}</p>
            </div>
            <p style="margin-top: 8px;"><strong>Follow-up Required:</strong> ${mrsa.mrsaMssaFollowUpRequired || "Not specified"}</p>
          </div>
        </div>
      </div>

      <!-- Multi-drug Resistant Organisms -->
      <div class="section">
        <h2>Multi-drug Resistant Organisms (MDRO)</h2>
        <div class="grid grid-cols-3">
          <p><strong>ESBL:</strong> <span class="yes-no ${mdro.esbl ? "yes" : "no"}">${mdro.esbl ? "Yes" : "No"}</span></p>
          <p><strong>VRE / GRE:</strong> <span class="yes-no ${mdro.vreGre ? "yes" : "no"}">${mdro.vreGre ? "Yes" : "No"}</span></p>
          <p><strong>CPE:</strong> <span class="yes-no ${mdro.cpe ? "yes" : "no"}">${mdro.cpe ? "Yes" : "No"}</span></p>
        </div>
        <p style="margin-top: 8px;"><strong>Other MDR Organisms:</strong> ${mdro.other || "None reported"}</p>
        <div class="subsection" style="margin-top: 12px;">
          <h3>Additional Clinical Notes</h3>
          <div class="info-box">${mdro.relevantInformation || "No additional notes provided"}</div>
        </div>
      </div>

      <!-- Vaccinations & Awareness -->
      <div class="section">
        <h2>Vaccinations & Awareness</h2>
        <div class="grid grid-cols-2">
          <p><strong>Personal awareness of infection status?</strong> <span class="yes-no ${exposure.awarenessOfInfection ? "yes" : "no"}">${exposure.awarenessOfInfection ? "Yes" : "No"}</span></p>
          <p><strong>Date of last Flu Vaccination:</strong> ${formatDate(exposure.lastFluVaccinationDate)}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Document generated on ${formatDateTime(Date.now())} | Signature: ${data.signature || "Digitally Signed"}</p>
        <p>Infection Prevention Assessment - ${data.name || details.name}</p>
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

    // Check for API token authentication (server-to-server)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Assessment data is required" },
        { status: 400 }
      );
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure specific fields are at the top level for the template
      name: assessmentData.name || assessmentData.residentName || assessmentData.assessment_data?.name || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      completionDate: assessmentData.completionDate || assessmentData.completion_date || assessmentData.assessment_date || assessmentData.created_at || Date.now()
    };

    // Add some debugging
    console.log("Infection Prevention PDF API flattening data:", {
      name: flattenedData.name,
      formId: flattenedData._id || flattenedData.id
    });

    // Generate HTML content
    const htmlContent = generateInfectionPreventionHTML(flattenedData);

    // Launch Playwright browser
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
      // Set the HTML content directly
      await page.setContent(htmlContent, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          bottom: "20px",
          left: "20px",
          right: "20px"
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      // Return the PDF as a response
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="infection-prevention-assessment-${assessmentData.name?.replace(/\s+/g, "-") || "record"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
