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

function generateResidentValuablesHTML(data: any): string {
  const form = data.assessment_data || data;
  const valuables = form.valuables || [];
  const clothing = form.clothing || [];
  const otherItems = form.other || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Resident Valuables & Property</title>
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
          border-bottom: 2px solid #10b981;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
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
          background-color: #f0fdf4;
          padding: 8px 12px;
          border-radius: 4px;
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
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th, td {
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #f3f4f6;
          word-wrap: break-word;
        }
        th {
          background-color: #f8fafc;
          font-weight: 600;
          font-size: 0.875rem;
          color: #475569;
        }
        .money-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }
        .money-item {
          padding: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          text-align: center;
        }
        .total-banner {
          background-color: #065f46;
          color: white;
          padding: 16px;
          border-radius: 6px;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 20px;
        }
        .field-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          margin-bottom: 2px;
        }
        .field-value {
          font-weight: 500;
          color: #1e293b;
          word-wrap: break-word;
          white-space: pre-wrap;
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
        <h1>Resident Valuables & Property</h1>
      </div>

      <div class="section">
        <h2>Administrative Details</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${form.residentName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Bedroom Number</div>
            <div class="field-value">${form.bedroomNumber || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Date</div>
            <div class="field-value">${formatDate(form.date)}</div>
          </div>
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${form.completedBy || "Not specified"}${form.completedByRole ? ` (${form.completedByRole})` : ""}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Money & Cash</h2>
        <div class="money-grid">
          <div class="money-item"><strong>£50:</strong> ${form.n50 || 0}</div>
          <div class="money-item"><strong>£20:</strong> ${form.n20 || 0}</div>
          <div class="money-item"><strong>£10:</strong> ${form.n10 || 0}</div>
          <div class="money-item"><strong>£5:</strong> ${form.n5 || 0}</div>
          <div class="money-item"><strong>£2:</strong> ${form.n2 || 0}</div>
          <div class="money-item"><strong>£1:</strong> ${form.n1 || 0}</div>
          <div class="money-item"><strong>50p:</strong> ${form.p50 || 0}</div>
          <div class="money-item"><strong>20p:</strong> ${form.p20 || 0}</div>
          <div class="money-item"><strong>10p:</strong> ${form.p10 || 0}</div>
          <div class="money-item"><strong>5p:</strong> ${form.p5 || 0}</div>
          <div class="money-item"><strong>2p:</strong> ${form.p2 || 0}</div>
          <div class="money-item"><strong>1p:</strong> ${form.p1 || 0}</div>
        </div>
        <div class="total-banner">
          Total Cash: £${(form.total || 0).toFixed(2)}
        </div>
      </div>

      <div class="section">
        <h2>Valuables & Jewellery</h2>
        <table>
          <thead>
            <tr><th>Item Description</th></tr>
          </thead>
          <tbody>
            ${valuables.map((v: any) => `<tr><td>${v.value}</td></tr>`).join('') || '<tr><td style="color: #94a3b8; font-style: italic;">No items recorded</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Clothing Audit</h2>
        <table>
          <thead>
            <tr><th>Item Description</th><th style="width: 80px; text-align: center;">Count</th></tr>
          </thead>
          <tbody>
            ${clothing.map((v: any) => `<tr><td>${v.value}</td><td style="text-align: center;">${v.count ?? 1}</td></tr>`).join('') || '<tr><td colspan="2" style="color: #94a3b8; font-style: italic;">No items recorded</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Other Property / Items Received</h2>
        <table>
          <thead>
            <tr><th>Item Description</th><th style="width: 80px; text-align: center;">Count</th></tr>
          </thead>
          <tbody>
            ${otherItems.map((o: any) => `<tr><td>${o.value || o.details || ''}</td><td style="text-align: center;">${o.count ?? 1}</td></tr>`).join('') || '<tr><td colspan="2" style="color: #94a3b8; font-style: italic; text-align: center;">No other items recorded</td></tr>'}
          </tbody>
        </table>
      </div>

      ${form.comments ? `
      <div class="section">
        <h2>Additional Comments</h2>
        <div class="info-box field-value">
          ${form.comments}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>Signatures & Witnesses</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${form.completedBy}${form.completedByRole ? ` (${form.completedByRole})` : ""}</div>
            <div class="field-label" style="margin-top: 12px;">Witnessed By</div>
            <div class="field-value">${form.witnessedBy || "Not registered"}${form.witnessedByRole ? ` (${form.witnessedByRole})` : ""}</div>
          </div>
          <div>
            <div class="field-label">Resident/Family Signature</div>
            <div class="field-value" style="height: 40px; border-bottom: 1px solid #ccc; margin-top: 4px;"></div>
            <div class="field-label" style="margin-top: 12px;">Date signed</div>
            <div class="field-value">${formatDate(form.date)}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Resident Valuables & Property Audit</p>
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
      date: assessmentData.date || assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completedBy: assessmentData.completedBy || assessmentData.completed_by || assessmentData.assessment_data?.completedBy || assessmentData.assessment_data?.completed_by || "Not specified"
    };

    console.log("Resident Valuables PDF API flattening data:", {
      residentName: flattenedData.residentName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateResidentValuablesHTML(flattenedData);

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
          "Content-Disposition": `attachment; filename="resident-valuables-${residentName}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Resident Valuables PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
