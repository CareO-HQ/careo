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
  const dob = resident.date_of_birth ? format(parseISO(resident.date_of_birth), "dd/MM/yyyy") : '--';
  const room = resident.room_number || '--';

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
            .activity-item { page-break-inside: avoid; }
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
            border-bottom: 2px solid #2563eb;
          }
          .brand-logo {
            font-size: 24px;
            font-weight: 800;
            color: #2563eb;
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
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 12px 20px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .summary-text {
            font-size: 14px;
            color: #1e40af;
            font-weight: 600;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin: 24px 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-title::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 16px;
            background: #2563eb;
            border-radius: 2px;
          }
          .activity-item {
            margin-bottom: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 16px;
            background: #fff;
          }
          .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .activity-name {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
          }
          .activity-time {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
          }
          .activity-notes {
            font-size: 13px;
            color: #4b5563;
            font-style: italic;
            margin-top: 8px;
            padding-left: 12px;
            border-left: 2px solid #e5e7eb;
          }
          .staff-meta {
            margin-top: 12px;
            font-size: 11px;
            color: #9ca3af;
            display: flex;
            gap: 12px;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 600;
            background: #dbeafe;
            color: #1e40af;
          }
          .footer {
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          .empty-state {
            padding: 24px;
            text-align: center;
            background: #f9fafb;
            border: 1px dashed #e5e7eb;
            border-radius: 10px;
            color: #6b7280;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="brand-header">
          <div class="brand-logo">CareO</div>
          <div class="report-type">Daily Care Report</div>
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
            <span class="info-value">${resident.nhs_health_number || '--'}</span>
          </div>
        </div>
        
        <div class="content">
          <div class="daily-summary-bar">
            <span class="summary-text">${formattedDate}</span>
            <span class="badge">Day Period: 08:00 - 08:00</span>
          </div>

          <div class="section">
            <h3 class="section-title">Daily Activity Records</h3>
            ${activityRecords.length > 0 ? activityRecords
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((activity: any) => {
        const payload = activity.payload as { time?: string; staff?: string } | null;
        const displayTime = payload?.time || (activity.created_at ? formatTimestampToUKTime(activity.created_at) : '--');
        return `
                  <div class="activity-item">
                    <div class="activity-header">
                      <div class="activity-name">Daily Activity Record</div>
                      <div class="activity-time">${displayTime}</div>
                    </div>
                    ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                    <div class="staff-meta">
                      <span>Staff: ${payload?.staff || 'Staff'}</span>
                      <span>•</span>
                      <span>Recorded: ${formatTimestampToUKDateTime(activity.created_at)}</span>
                    </div>
                  </div>
                `;
      }).join('') : '<div class="empty-state">No activity records logged for this day.</div>'}
          </div>

          <div class="section">
            <h3 class="section-title">Personal Care Activities</h3>
            ${personalCareTasks.length > 0 ? personalCareTasks
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((activity: any) => {
        const payload = activity.payload as { time?: string; primaryStaff?: string; assistedStaff?: string } | null;
        const displayTime = payload?.time || (activity.created_at ? formatTimestampToUKTime(activity.created_at) : '--');
        const activityLabel = activityLabels[activity.task_type] || activity.task_type;
        return `
                  <div class="activity-item">
                    <div class="activity-header">
                      <div class="activity-name">${activityLabel}</div>
                      <div class="activity-time">${displayTime}</div>
                    </div>
                    ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                    <div class="staff-meta">
                      <span>Staff: ${payload?.primaryStaff || 'Staff'} ${payload?.assistedStaff ? `(Assisted by: ${payload.assistedStaff})` : ''}</span>
                      <span>•</span>
                      <span>Recorded: ${formatTimestampToUKDateTime(activity.created_at)}</span>
                    </div>
                  </div>
                `;
      }).join('') : '<div class="empty-state">No personal care activities logged for this day.</div>'}
          </div>
        </div>
        
        <div class="footer">
          <div style="font-weight: 600; margin-bottom: 4px;">CareO Management System</div>
          <div>Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, 'dd/MM/yyyy HH:mm')} UK Time</div>
          <div style="margin-top: 8px;">Confidential Care Documentation • For professional use only</div>
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

    // Provide more specific error details in logs to help identify the failure
    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
