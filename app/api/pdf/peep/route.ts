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

function generatePeepHTML(data: any): string {
  // Extract data with defaults
  const facilityName = data.facilityName || "";
  const residentName = data.residentName || "Resident";
  const dob = formatDate(data.residentDateOfBirth);
  const roomNo = data.bedroomNumber || "";
  const unit = data.unit || "";
  
  const informedBy = data.informedBy || {};
  const awarenessSteps = [
    { label: "Existing alarm system", checked: !!informedBy.alarmSystem },
    { label: "Visual Alarm System", checked: !!informedBy.visualAlarm },
    { label: "Pager Device", checked: !!informedBy.pagerDevice },
    { label: "Other", checked: !!informedBy.other, details: informedBy.otherDetails }
  ];

  const designatedAssistance = data.designatedAssistance || "";
  const equipmentRequired = data.equipmentRequired || "";
  const steps = data.steps || [];
  
  const hazards = data.hazards || {};
  const hazardList = [
    { label: "Are there any oxygen cylinders?", value: hazards.oxygenCylinders },
    { label: "Are all furnishings fire retardant?", value: hazards.furnishingsFireRetardant },
    { label: "Does the person smoke? (Refer to smoking Risk assessment)", value: hazards.doesPersonSmoke }
  ];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Personal Emergency Evacuation Plan (PEEP)</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.5;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
          font-size: 11pt;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #eee;
          padding-bottom: 20px;
        }
        h1 {
          font-size: 20pt;
          margin-bottom: 5px;
          color: #000;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .label {
          font-weight: bold;
          color: #666;
          font-size: 9pt;
          text-transform: uppercase;
          display: block;
        }
        .value {
          font-size: 11pt;
          color: #000;
          border-bottom: 1px solid #eee;
          display: block;
          padding: 4px 0;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          border-bottom: 1px solid #000;
          margin-bottom: 15px;
          padding-bottom: 5px;
          text-transform: uppercase;
        }
        .checkbox-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .check-box {
          width: 16px;
          height: 16px;
          border: 1px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 10pt;
        }
        .text-block {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          min-height: 60px;
          white-space: pre-wrap;
        }
        .step {
          margin-bottom: 15px;
          padding-left: 40px;
          position: relative;
        }
        .step-number {
          position: absolute;
          left: 0;
          top: 0;
          width: 30px;
          height: 30px;
          background: #333;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .step-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .step-desc {
          color: #666;
          font-size: 10pt;
        }
        .hazard-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }
        .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 40px;
        }
        .sig-box {
          border-top: 1px solid #000;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Personal Emergency Evacuation Plan (PEEP)</h1>
        <p>Confidential Personal Information</p>
      </div>

      <div class="info-grid">
        <div class="info-item"><span class="label">Facility Name</span><span class="value">${facilityName}</span></div>
        <div class="info-item"><span class="label">Resident Name</span><span class="value">${residentName}</span></div>
        <div class="info-item"><span class="label">Date of Birth</span><span class="value">${dob}</span></div>
        <div class="info-item"><span class="label">Room / Unit</span><span class="value">${roomNo} ${unit ? `(${unit})` : ""}</span></div>
      </div>

      <div class="section">
        <div class="section-title">Awareness of Procedure</div>
        <div class="checkbox-group">
          ${awarenessSteps.map(step => `
            <div class="checkbox-item">
              <div class="check-box">${step.checked ? "X" : ""}</div>
              <span>${step.label}${step.details ? `: ${step.details}` : ""}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Designated Assistance</div>
        <div class="text-block">${designatedAssistance || "None specified"}</div>
      </div>

      <div class="section">
        <div class="section-title">Equipment Required</div>
        <div class="text-block">${equipmentRequired || "None specified"}</div>
      </div>

      <div class="section">
        <div class="section-title">Evacuation Procedure</div>
        ${steps.length > 0 ? steps.map((step: any, i: number) => `
          <div class="step">
            <div class="step-number">${i + 1}</div>
            <div class="step-name">${step.name}</div>
            <div class="step-desc">${step.description}</div>
          </div>
        `).join("") : "<p>No specific steps defined.</p>"}
      </div>

      <div class="section">
        <div class="section-title">Fire Hazards</div>
        ${hazardList.map(hazard => `
          <div class="hazard-row">
            <span>${hazard.label}</span>
            <span style="font-weight: bold;">${hazard.value === true ? "YES" : hazard.value === false ? "NO" : "N/A"}</span>
          </div>
        `).join("")}
      </div>

      <div class="signature-grid">
        <div class="sig-box">
          <span class="label">Manager Signature</span>
          <div style="height: 40px; font-family: cursive; font-size: 14pt;">${data.managerSignature || ""}</div>
          <span class="label">Date: ${formatDate(data.managerSignatureDate)}</span>
        </div>
        <div class="sig-box">
          <span class="label">Resident / Relative Signature</span>
          <div style="height: 40px; font-family: cursive; font-size: 14pt;">${data.personInCareSignature || ""}</div>
          <span class="label">Date: ${formatDate(data.personInCareSignatureDate)}</span>
        </div>
      </div>

      <div style="margin-top: 40px; font-size: 8pt; color: #999; text-align: center;">
        Generated on ${formatDate(Date.now())}
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
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev && expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const assessmentData = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: "PEEP data is required" },
        { status: 400 }
      );
    }

    // Flatten the data
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      bedroomNumber: assessmentData.bedroomNumber || assessmentData.assessment_data?.bedroomNumber,
      residentDateOfBirth: assessmentData.residentDateOfBirth || assessmentData.dateOfBirth || assessmentData.assessment_data?.residentDateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      steps: assessmentData.steps || assessmentData.assessment_data?.steps || []
    };

    // Generate HTML content
    const htmlContent = generatePeepHTML(flattenedData);

    // Launch Playwright browser
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

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="peep-${flattenedData.residentName?.replace(/\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("PEEP PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PEEP PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
