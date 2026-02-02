import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { format, parseISO } from "date-fns";
import { UK_TIMEZONE } from "@/lib/date-utils";

export const runtime = "nodejs";

function formatTimestampToUKTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatInTimeZone(date, UK_TIMEZONE, 'HH:mm');
  } catch {
    return '--';
  }
}

function formatTimestampToUKDateTime(timestamp: string | Date | null | undefined, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  if (!timestamp) return '--';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatInTimeZone(date, UK_TIMEZONE, formatStr);
  } catch {
    return '--';
  }
}

function generateDailyCareHTML(resident: any, dayData: any): string {
  const { date, tasks } = dayData;
  const fullName = `${resident.first_name} ${resident.last_name}`;
  const formattedDate = format(parseISO(date), "EEEE, MMMM d, yyyy");
  
  // Separate activity records from personal care tasks
  const activityRecords = tasks.filter((t: any) => t.task_type === 'daily_activity_record');
  const personalCareTasks = tasks.filter((t: any) => t.task_type !== 'daily_activity_record');

  // Activity options for labels
  const activityLabels: Record<string, string> = {
    bed_bath: "Bed Bath",
    shampoo_in_bed: "Shampoo In Bed",
    shower_shampoo: "Shower + Shampoo",
    wash_upper_body: "Wash Upper Body",
    wash_lower_body: "Wash Lower Body",
    creams_applied: "Creams Applied",
    shaved: "Shaved",
    oral_care: "Oral Care",
    fingernails_trimmed: "Fingernails Trimmed",
    fingernails_cleaned: "Fingernails Cleaned",
    hair_brushed: "Hair Brushed",
    hair_washed_hairdresser: "Hair Washed/Set by Hairdresser",
    clothing_changed: "Clothing Changed",
    bed_linens_changed: "Bed Linens Changed",
    bed_made: "Bed Made",
    eyeglasses_care: "Eyeglasses Care",
    footwear_care: "Footwear Care",
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Daily Care Report - ${fullName} (${date})</title>
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
            border-bottom: 2px solid #2563eb;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #2563eb;
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
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .summary h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .summary-item {
            font-size: 14px;
          }
          .summary-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 5px;
          }
          .summary-value {
            color: #6b7280;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #10b981;
          }
          .section-header.blue {
            border-bottom-color: #3b82f6;
          }
          .section-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            margin-left: 10px;
          }
          .section-header.green h3 {
            color: #047857;
          }
          .section-header.blue h3 {
            color: #1e40af;
          }
          .icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
          }
          .icon.green {
            background: #10b981;
          }
          .icon.blue {
            background: #3b82f6;
          }
          .activity-item {
            margin-bottom: 12px;
            padding: 12px;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            background: #eff6ff;
          }
          .activity-item.green {
            border-color: #a7f3d0;
            background: #ecfdf5;
          }
          .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .activity-title {
            color: #1e40af;
            font-size: 14px;
            font-weight: 600;
          }
          .activity-title.green {
            color: #047857;
          }
          .activity-status {
            background: #22c55e;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
          .activity-notes {
            margin-bottom: 8px;
            font-style: italic;
            color: #1e40af;
            font-size: 12px;
            padding: 5px 0;
          }
          .activity-notes.green {
            color: #047857;
          }
          .activity-time {
            font-size: 10px;
            color: #6b7280;
          }
          .empty-state {
            text-align: center;
            padding: 20px;
            background: #f0f9ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            color: #1e40af;
          }
          .empty-state.green {
            background: #f0fdf4;
            border-color: #a7f3d0;
            color: #047857;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Care Report</h1>
          <h2>${fullName}</h2>
        </div>
        
        <div class="summary">
          <h3>Care Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Date & Shift</div>
              <div class="summary-value">${formattedDate}</div>
              <div class="summary-value">Day Period (08:00 - 08:00 next day)</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Activity Summary</div>
              <div class="summary-value">Personal Care: ${personalCareTasks.length}</div>
              <div class="summary-value">Activity Records: ${activityRecords.length}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <div>Total Activities: ${tasks.length}</div>
            <div>Generated: ${formatTimestampToUKDateTime(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          </div>
        </div>
        
        ${activityRecords.length > 0 ? `
        <div class="section">
          <div class="section-header green">
            <div class="icon green">📋</div>
            <h3>Daily Activity Records</h3>
          </div>
          ${activityRecords
            .sort((a: any, b: any) => {
              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
              return bTime - aTime;
            })
            .map((activity: any, index: number) => {
              const payload = activity.payload as { time?: string; staff?: string } | null;
              const displayTime = payload?.time || (activity.created_at ? formatTimestampToUKTime(activity.created_at) : '--');
              const staffName = payload?.staff || 'Staff';
              return `
                <div class="activity-item green">
                  <div class="activity-header">
                    <div class="activity-title green">${index + 1}. Daily Activity Record</div>
                    <div class="activity-status">Complete</div>
                  </div>
                  ${activity.notes ? `<div class="activity-notes green">${activity.notes}</div>` : ''}
                  <div class="activity-time">
                    Recorded: ${activity.created_at ? formatTimestampToUKDateTime(activity.created_at, 'dd/MM/yyyy HH:mm') : '--'}
                    ${staffName ? ` • Staff: ${staffName}` : ''}
                  </div>
                </div>
              `;
            }).join('')}
        </div>
        ` : ''}

        ${personalCareTasks.length > 0 ? `
        <div class="section">
          <div class="section-header blue">
            <div class="icon blue">👤</div>
            <h3>Personal Care Activities</h3>
          </div>
          ${personalCareTasks
            .sort((a: any, b: any) => {
              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
              return bTime - aTime;
            })
            .map((activity: any, index: number) => {
              const payload = activity.payload as { time?: string; primaryStaff?: string; assistedStaff?: string } | null;
              const displayTime = payload?.time || (activity.created_at ? formatTimestampToUKTime(activity.created_at) : '--');
              const primaryStaff = payload?.primaryStaff || 'Staff';
              const assistedStaff = payload?.assistedStaff;
              const activityLabel = activityLabels[activity.task_type] || activity.task_type;
              return `
                <div class="activity-item">
                  <div class="activity-header">
                    <div class="activity-title">${index + 1}. ${activityLabel}</div>
                    <div class="activity-status">Complete</div>
                  </div>
                  ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                  <div class="activity-time">
                    Recorded: ${activity.created_at ? formatTimestampToUKDateTime(activity.created_at, 'dd/MM/yyyy HH:mm') : '--'}
                    ${primaryStaff ? ` • Primary Staff: ${primaryStaff}` : ''}
                    ${assistedStaff ? ` • Assisted by: ${assistedStaff}` : ''}
                  </div>
                </div>
              `;
            }).join('')}
        </div>
        ` : `
        <div class="section">
          <div class="section-header blue">
            <div class="icon blue">👤</div>
            <h3>Personal Care Activities</h3>
          </div>
          <div class="empty-state">
            <div style="font-size: 14px; margin-bottom: 5px;">No personal care activities recorded</div>
            <div style="font-size: 11px;">No personal care activities were logged for this day.</div>
          </div>
        </div>
        `}
        
        <div class="footer">
          <div style="font-weight: 600; margin-bottom: 5px;">Generated by Care Management System</div>
          <div>${formatTimestampToUKDateTime(new Date(), 'dd/MM/yyyy HH:mm')} (UK time) • Confidential Care Documentation</div>
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

    const htmlContent = generateDailyCareHTML(resident, dayData);

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
      // Set the HTML content
      await page.setContent(htmlContent, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "20mm",
          right: "20mm"
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      // Generate filename
      const sanitize = (str: string) =>
        str.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "-");
      const residentName = sanitize(`${resident.first_name}-${resident.last_name}`);
      const fileName = `daily-care-report-${residentName}-${dayData.date}.pdf`;

      // Return the PDF
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
    console.error("Daily Care PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
