import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";

export const runtime = "nodejs";

type ConsentChoice = "CONSENT_TO_USE" | "REFUSE_TO_USE";
type ResidentPreference = "WOULD_PREFER_USE" | "WOULD_NOT_PREFER_USE";
type ConsentType = "ABLE_TO_CONSENT" | "UNABLE_TO_CONSENT";

interface AbleToConsentSection {
  consentChoice?: ConsentChoice;
  residentSignature?: string;
  staffMemberName?: string;
  staffMemberSignature?: string;
  staffSignatureDate?: string;
}

interface UnableToConsentSection {
  representativeName?: string;
  discussionAcknowledged?: boolean;
  residentPreference?: ResidentPreference;
  representativeSignature?: string;
  staffMemberName?: string;
  staffMemberSignature?: string;
  staffSignatureDate?: string;
}

interface BedrailConsentData {
  id?: string;
  _id?: string;
  residentName?: string;
  bedroomNumber?: string;
  dateOfBirth?: string | number;
  assessment_date?: string | number;
  date?: string | number;
  created_at?: string | number;
  completed_by?: string;
  completedBy?: string;
  capacity_assessed?: boolean;
  consentType?: ConsentType;
  ableToConsentSection?: AbleToConsentSection;
  unableToConsentSection?: UnableToConsentSection;
  assessment_data?: Partial<BedrailConsentData>;
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

function formatValue(value: string | number | undefined): string {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return "Not provided";
  }
  return `${value}`;
}

function formatYesNo(value: boolean | undefined): string {
  return value === true ? "Yes" : "No";
}

function formatConsentChoice(value: ConsentChoice | undefined): string {
  if (value === "CONSENT_TO_USE") return "Yes";
  if (value === "REFUSE_TO_USE") return "No";
  return "No";
}

function formatResidentPreference(value: ResidentPreference | undefined): string {
  if (value === "WOULD_PREFER_USE") return "Yes";
  if (value === "WOULD_NOT_PREFER_USE") return "No";
  return "No";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td class="field-label">${escapeHtml(label)}</td>
      <td class="field-value">${escapeHtml(value)}</td>
    </tr>
  `;
}

function generateBedrailConsentHTML(data: BedrailConsentData): string {
  const form: Partial<BedrailConsentData> = data.assessment_data || data;
  const ableSection: AbleToConsentSection = form.ableToConsentSection || data.ableToConsentSection || {};
  const unableSection: UnableToConsentSection = form.unableToConsentSection || data.unableToConsentSection || {};
  const residentName = form.residentName ?? data.residentName;
  const bedroomNumber = form.bedroomNumber ?? data.bedroomNumber;
  const dateOfBirth = form.dateOfBirth ?? data.dateOfBirth;
  const assessmentDate = form.assessment_date ?? data.assessment_date;
  const effectiveConsentType: ConsentType | undefined =
    form.consentType ?? data.consentType;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bedrail Consent Form</title>
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
          color: #1d4ed8;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          background-color: #eff6ff;
          padding: 8px 12px;
          border-radius: 4px;
        }
        .section {
          margin-bottom: 24px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .field-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .field-table tr:nth-child(even) {
          background: #f9fafb;
        }
        .field-table td {
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          vertical-align: top;
        }
        .field-label {
          width: 36%;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
          padding: 4px 0;
        }
        .consent-box {
          background-color: #f8fafc;
          border: 1px solid #bfdbfe;
          padding: 12px;
          border-radius: 8px;
          margin-top: 10px;
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
        <h1>Bedrail Consent / Agreement Form</h1>
      </div>

      <div class="section">
        <h2>Form Overview</h2>
        <table class="field-table">
          ${row("Resident Name", formatValue(residentName))}
          ${row("Bedroom Number", formatValue(bedroomNumber))}
          ${row("Date of Birth", formatDate(dateOfBirth))}
          ${row("Assessment Date", formatDate(assessmentDate))}
          ${row("Consent Type", formatValue(effectiveConsentType))}
        </table>
      </div>

      <div class="section">
        <h2>Able To Consent Section</h2>
        <div class="consent-box">
          <table class="field-table">
            ${row("Consent To Use Bedrails (checkbox)", formatConsentChoice(ableSection.consentChoice))}
            ${row("Resident Signature", formatValue(ableSection.residentSignature))}
            ${row("Staff Member Name", formatValue(ableSection.staffMemberName))}
            ${row("Staff Member Signature", formatValue(ableSection.staffMemberSignature))}
            ${row("Staff Signature Date", formatDate(ableSection.staffSignatureDate))}
          </table>
        </div>
      </div>

      <div class="section">
        <h2>Unable To Consent Section</h2>
        <div class="consent-box">
          <table class="field-table">
            ${row("Representative Name", formatValue(unableSection.representativeName))}
            ${row("Discussion Acknowledged (checkbox)", formatYesNo(unableSection.discussionAcknowledged))}
            ${row("Resident Would Prefer Bedrails (checkbox)", formatResidentPreference(unableSection.residentPreference))}
            ${row("Representative Signature", formatValue(unableSection.representativeSignature))}
            ${row("Staff Member Name", formatValue(unableSection.staffMemberName))}
            ${row("Staff Member Signature", formatValue(unableSection.staffMemberSignature))}
            ${row("Staff Signature Date", formatDate(unableSection.staffSignatureDate))}
          </table>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Bedrail Consent Record - Managed by CareO-HQ</p>
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

    const assessmentData = (await request.json()) as BedrailConsentData;

    if (!assessmentData) {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData: BedrailConsentData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      bedroomNumber: assessmentData.bedroomNumber || assessmentData.assessment_data?.bedroomNumber,
      assessment_date: assessmentData.assessment_date || assessmentData.date || assessmentData.created_at || Date.now(),
      completedBy: assessmentData.completedBy || assessmentData.completed_by || assessmentData.assessment_data?.completedBy || "Not specified",
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completedBy || "Not specified"
    };

    console.log("Bed Rail Consent PDF API flattening data:", {
      residentName: flattenedData.residentName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateBedrailConsentHTML(flattenedData);

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
          "Content-Disposition": `attachment; filename="bedrail-consent-${residentName}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Bedrail Consent PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
