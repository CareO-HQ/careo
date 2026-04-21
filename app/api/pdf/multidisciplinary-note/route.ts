import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";
import { formatInTimeZone } from "date-fns-tz";
import { format, parseISO } from "date-fns";
import { UK_TIMEZONE } from "@/lib/date-utils";

export const runtime = "nodejs";

function formatTimestampToUKTime(time: string | null | undefined): string {
  if (!time) return '--';
  return time; // Note time is already stored as HH:mm in many places for MDT
}

function generateMDTDailyHTML(resident: any, dayData: any): string {
  const { date, notes } = dayData;
  const fullName = `${resident.first_name} ${resident.last_name}`;
  const formattedDate = format(parseISO(date), "EEEE, MMMM d, yyyy");
  const dob = resident.dob ? format(parseISO(resident.dob), "dd/MM/yyyy") : '--';
  const room = resident.room || '--';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>MDT Visit Report - ${fullName} (${date})</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          @media print { 
            body { margin: 0; } 
            .note-item { page-break-inside: avoid; }
          }
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            line-height: 1.5; 
            color: #1f2937;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .brand-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: #f9fafb;
            border-bottom: 2px solid #4f46e5;
          }
          .brand-logo {
            font-size: 24px;
            font-weight: 800;
            color: #4f46e5;
            letter-spacing: -0.025em;
          }
          .report-type {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #6b7280;
          }
          .resident-info {
            padding: 20px;
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }
          .info-block {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 500;
            color: #111827;
          }
          .content {
            padding: 20px;
          }
          .daily-summary-bar {
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            border-radius: 8px;
            padding: 12px 20px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .summary-text {
            font-size: 14px;
            color: #4338ca;
            font-weight: 600;
          }
          .note-item {
            margin-bottom: 24px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .note-header {
            background: #f9fafb;
            padding: 12px 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .note-title {
            font-size: 15px;
            font-weight: 700;
            color: #111827;
          }
          .note-meta {
            font-size: 12px;
            color: #6b7280;
          }
          .note-body {
            padding: 20px;
          }
          .note-section {
            margin-bottom: 16px;
          }
          .note-section:last-child {
            margin-bottom: 0;
          }
          .section-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #4f46e5;
            margin-bottom: 6px;
          }
          .section-content {
            font-size: 14px;
            color: #374151;
            white-space: pre-wrap;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 600;
            background: #e0e7ff;
            color: #4338ca;
          }
          .footer {
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          .signature-box {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #e5e7eb;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="brand-header">
          <div class="brand-logo">CareO</div>
          <div class="report-type">MDT Visit Report</div>
        </div>

        <div class="resident-info">
          <div class="info-block">
            <span class="info-label">Resident Name</span>
            <span class="info-value">${fullName}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Date of Birth</span>
            <span class="info-value">${dob}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Room Number</span>
            <span class="info-value">${room}</span>
          </div>
          <div class="info-block">
            <span class="info-label">NHS Number</span>
            <span class="info-value">${resident.nhs || '--'}</span>
          </div>
        </div>
        
        <div class="content">
          <div class="daily-summary-bar">
            <span class="summary-text">${formattedDate}</span>
            <span class="badge">${notes.length} Total Visits</span>
          </div>
          
          <div class="section">
            ${notes.map((note: any, index: number) => `
              <div class="note-item">
                <div class="note-header">
                  <div class="note-title">${note.team_member_name}</div>
                  <div class="note-meta">${note.note_time}</div>
                </div>
                
                <div class="note-body">
                  <div class="note-section">
                    <div class="section-label">Reason for Visit</div>
                    <div class="section-content">${note.reason_for_visit}</div>
                  </div>
                  
                  <div class="note-section">
                    <div class="section-label">Outcome & Recommendations</div>
                    <div class="section-content">${note.outcome}</div>
                  </div>
                  
                  <div class="note-section">
                    <div class="section-label">Relative Informed</div>
                    <div class="section-content">${note.relative_informed ? `Yes - ${note.relative_informed_details || 'No details provided'}` : 'No'}</div>
                  </div>

                  <div class="signature-box">
                    <span>Recorded by: ${note.signature}</span>
                    <span>Confidential Patient Record</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="footer">
          <div style="font-weight: 600; margin-bottom: 4px;">CareO Management System</div>
          <div>Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, 'dd/MM/yyyy HH:mm')} UK Time</div>
          <div style="margin-top: 8px;">Confidential • For professional use only</div>
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

    const body = await request.json();
    const { resident, dayData } = body;

    if (!resident || !dayData) {
      return NextResponse.json(
        { error: "Resident and day data are required" },
        { status: 400 }
      );
    }

    const htmlContent = generateMDTDailyHTML(resident, dayData);

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
          top: "20mm",
          bottom: "20mm",
          left: "20mm",
          right: "20mm"
        }
      });

      await browser.close();

      const sanitize = (str: string) =>
        str.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "-");
      const residentName = sanitize(`${resident.first_name}-${resident.last_name}`);
      const fileName = `mdt-report-${residentName}-${dayData.date}.pdf`;

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("MDT PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
