import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { format, parseISO, getDaysInMonth } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
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

function getUserDisplayName(users: any[], identifier: string | undefined): string {
  if (!identifier) return 'Staff';

  const user = users.find((u: any) =>
    u.id === identifier ||
    u.email === identifier ||
    u.username === identifier
  );

  if (user) {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    if (user.name) return user.name;
  }

  return identifier || 'Staff';
}

function generateActivityRecordHTML(
  resident: any,
  month: number,
  year: number,
  activityByDay: Record<string, any[]>,
  users: any[]
): string {
  const fullName = `${resident.first_name} ${resident.last_name}`;
  const dob = resident.date_of_birth ? format(parseISO(resident.date_of_birth), "dd/MM/yyyy") : '--';
  const room = resident.room_number || '--';
  const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const careHome = resident.care_home_name || '--';

  // Collect all activity records and sort by date
  const allActivities: Array<{date: string; activity: any}> = [];
  Object.keys(activityByDay).forEach(dateKey => {
    const activities = activityByDay[dateKey] || [];
    activities.forEach(activity => {
      allActivities.push({ date: dateKey, activity });
    });
  });

  // Sort chronologically
  allActivities.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;

    const aTime = a.activity.created_at ? new Date(a.activity.created_at).getTime() : 0;
    const bTime = b.activity.created_at ? new Date(b.activity.created_at).getTime() : 0;
    return aTime - bTime;
  });

  // Generate table rows
  const tableRows = allActivities.map(({ date, activity }) => {
    const payload = activity.payload as { time?: string; staff?: string } | null;
    const displayTime = payload?.time || (activity.created_at ? formatTimestampToUKTime(activity.created_at) : '--');
    const staffIdentifier = payload?.staff;
    const staffName = getUserDisplayName(users, staffIdentifier);
    const notes = activity.notes || '';
    const formattedDate = format(parseISO(date), 'dd/MM/yyyy');

    return `
      <tr>
        <td class="date-cell">${formattedDate}</td>
        <td class="time-cell">${displayTime}</td>
        <td class="comments-cell">${notes || '--'}</td>
        <td class="signature-cell">${staffName}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Daily Activity Record - ${fullName} (${monthName})</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          @media print {
            body { margin: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            margin: 0;
            padding: 15px;
          }
          .logo {
            text-align: right;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .subtitle {
            text-align: center;
            font-size: 10px;
            margin-bottom: 15px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            border: 2px solid #000;
          }
          .info-table td {
            border: 1px solid #000;
            padding: 6px;
            font-size: 11px;
          }
          .info-label {
            font-weight: bold;
            width: 30%;
          }
          .records-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
          }
          .records-table th {
            border: 1px solid #000;
            padding: 8px 4px;
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
            font-size: 11px;
          }
          .records-table td {
            border: 1px solid #000;
            padding: 6px 4px;
            font-size: 10px;
            vertical-align: top;
          }
          .date-cell {
            width: 12%;
            text-align: center;
          }
          .time-cell {
            width: 10%;
            text-align: center;
          }
          .comments-cell {
            width: 58%;
          }
          .signature-cell {
            width: 20%;
            text-align: center;
          }
          .footer-note {
            margin-top: 10px;
            font-size: 9px;
            text-align: center;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="logo">CareO</div>

        <div class="title">DAILY ACTIVITY RECORD</div>
        <div class="subtitle">This form may be used daily by the Care Assistant or as required - ${monthName}</div>

        <table class="info-table">
          <tr>
            <td class="info-label">Name of Home:</td>
            <td colspan="3">${careHome}</td>
          </tr>
          <tr>
            <td class="info-label">Resident's Name:</td>
            <td>${fullName}</td>
            <td class="info-label">Date of Birth:</td>
            <td>${dob}</td>
          </tr>
          <tr>
            <td class="info-label">Room No:</td>
            <td colspan="3">${room}</td>
          </tr>
        </table>

        <table class="records-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Comments</th>
              <th>Staff Name</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="4" style="text-align: center; padding: 20px;">No activity records found for this month.</td></tr>'}
          </tbody>
        </table>

        <div class="footer-note">
          Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, 'dd/MM/yyyy HH:mm')} UK Time • CareO Management System
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resident, month, year, activityByDay, users } = body;

    if (!resident || !month || !year || !activityByDay) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const htmlContent = generateActivityRecordHTML(resident, month, year, activityByDay, users || []);

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
          top: "15mm",
          bottom: "15mm",
          left: "15mm",
          right: "15mm"
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      // Generate filename
      const sanitize = (str: string) =>
        str.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "-");
      const residentName = sanitize(`${resident.first_name}-${resident.last_name}`);
      const monthName = format(new Date(year, month - 1, 1), 'MMMM-yyyy');
      const fileName = `activity-record-${residentName}-${monthName}.pdf`;

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
    console.error("Activity Record PDF generation error:", error);

    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Failed to generate activity record PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
