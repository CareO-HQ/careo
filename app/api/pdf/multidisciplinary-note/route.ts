import { NextRequest, NextResponse } from "next/server";
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

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>MDT Visit Report - ${fullName} (${date})</title>
        <style>
          @page { 
            size: A4; 
            margin: 20mm; 
          }
          @media print { 
            body { margin: 0; } 
          }
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            color: #000;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #4f46e5;
            font-weight: bold;
          }
          .header h2 {
            margin: 10px 0 0 0;
            font-size: 18px;
            color: #374151;
            font-weight: 600;
          }
          .summary {
            margin-bottom: 30px;
            padding: 15px;
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            border-radius: 8px;
          }
          .summary h3 {
            margin: 0 0 10px 0;
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
          }
          .summary-item {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .summary-label {
            font-weight: 600;
            color: #374151;
          }
          .section {
            margin-bottom: 30px;
          }
          .note-item {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #ffffff;
          }
          .note-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 5px;
          }
          .note-title {
            color: #4f46e5;
            font-size: 16px;
            font-weight: 600;
          }
          .note-meta {
            font-size: 12px;
            color: #6b7280;
          }
          .note-content {
            margin-top: 10px;
          }
          .note-section {
            margin-bottom: 15px;
          }
          .note-label {
            font-weight: 600;
            font-size: 13px;
            color: #374151;
            margin-bottom: 3px;
          }
          .note-value {
            font-size: 14px;
            color: #111827;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            background: #e0e7ff;
            color: #4338ca;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Multidisciplinary Team Visit Report</h1>
          <h2>${fullName}</h2>
        </div>
        
        <div class="summary">
          <h3>Daily Summary</h3>
          <div class="summary-item">
            <span class="summary-label">Date:</span> ${formattedDate}
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Visits:</span> ${notes.length}
          </div>
        </div>
        
        <div class="section">
          ${notes.map((note: any, index: number) => `
            <div class="note-item">
              <div class="note-header">
                <div class="note-title">Visit ${index + 1}: ${note.team_member_name}</div>
                <div class="badge">MDT Note</div>
              </div>
              <div class="note-meta">
                Time: ${note.note_time} | Recorded by: ${note.signature}
              </div>
              
              <div class="note-content">
                <div class="note-section">
                  <div class="note-label">Reason for Visit:</div>
                  <div class="note-value">${note.reason_for_visit}</div>
                </div>
                
                <div class="note-section">
                  <div class="note-label">Outcome & Recommendations:</div>
                  <div class="note-value">${note.outcome}</div>
                </div>
                
                <div class="note-section">
                  <div class="note-label">Relative Informed:</div>
                  <div class="note-value">${note.relative_informed ? `Yes - ${note.relative_informed_details || 'No details provided'}` : 'No'}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
          <div style="font-weight: 600; margin-bottom: 5px;">Generated by CareO Management System</div>
          <div>${formatInTimeZone(new Date(), UK_TIMEZONE, 'dd/MM/yyyy HH:mm')} (UK time) • Confidential MDT Documentation</div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
    try {
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
