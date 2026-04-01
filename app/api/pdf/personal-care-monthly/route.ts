import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { format, parseISO, getDaysInMonth } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { UK_TIMEZONE } from "@/lib/date-utils";

export const runtime = "nodejs";

// Activity labels mapping
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
  daily_activity_record: "Daily Activity Record",
};

// Activity columns for the grid (in order matching the form)
const activityColumns = [
  "bed_bath",
  "shampoo_in_bed",
  "shower_shampoo",
  "wash_upper_body",
  "wash_lower_body",
  "creams_applied",
  "shaved",
  "oral_care",
  "fingernails_trimmed",
  "fingernails_cleaned",
  "hair_brushed",
  "hair_washed_hairdresser",
  "clothing_changed",
  "bed_linens_changed",
  "bed_made",
  "eyeglasses_care",
  "footwear_care",
];

function getUserDisplayName(users: any[], identifier: string | undefined): string {
  if (!identifier) return '';

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

  return identifier || '';
}

function generateMonthlyGridHTML(
  resident: any,
  month: number,
  year: number,
  tasksByDay: Record<string, any[]>,
  users: any[]
): string {
  const fullName = `${resident.first_name} ${resident.last_name}`;
  const dob = resident.date_of_birth ? format(parseISO(resident.date_of_birth), "dd/MM/yyyy") : '--';
  const room = resident.room_number || '--';
  const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));

  // Generate header row with days (horizontal)
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `<th class="day-header">${day}</th>`;
  }).join('');

  // Generate rows for each activity (vertical)
  const activityRows = activityColumns.map(activity => {
    const activityLabel = activityLabels[activity] || activity;

    // Generate cells for each day
    const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = tasksByDay[dateKey] || [];

      // Find if this activity was done on this day
      const activityTask = dayTasks.find((task: any) => task.task_type === activity);

      let cellValue = '';
      if (activityTask) {
        const payload = activityTask.payload as { primaryStaff?: string; staff?: string } | null;
        const staffIdentifier = payload?.primaryStaff || payload?.staff;
        const staffName = getUserDisplayName(users, staffIdentifier);
        const initials = staffName
          .split(' ')
          .map(n => n.charAt(0))
          .join('')
          .toUpperCase()
          .substring(0, 2);
        cellValue = initials || '✓';
      }

      return `<td class="day-cell">${cellValue}</td>`;
    }).join('');

    return `
      <tr>
        <td class="activity-label">${activityLabel}</td>
        ${dayCells}
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Personal Care Record - ${fullName} (${monthName})</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          @media print {
            body { margin: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 9px;
            margin: 0;
            padding: 10px;
          }
          .header {
            margin-bottom: 15px;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .header-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
          }
          .header-info {
            display: flex;
            gap: 20px;
            font-size: 10px;
          }
          .info-item {
            display: flex;
            gap: 5px;
          }
          .info-label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
          }
          th, td {
            border: 1px solid #666;
            text-align: center;
            vertical-align: middle;
            padding: 3px 2px;
          }
          .day-header {
            background-color: #f0f0f0;
            font-size: 9px;
            font-weight: bold;
            min-width: 20px;
            max-width: 20px;
            padding: 4px 2px;
          }
          .activity-label {
            font-weight: bold;
            background-color: #f9f9f9;
            text-align: left;
            padding-left: 6px;
            font-size: 8px;
            min-width: 120px;
            max-width: 120px;
          }
          .day-cell {
            min-width: 20px;
            max-width: 20px;
            font-size: 8px;
            font-weight: bold;
            height: 22px;
          }
          .footer {
            margin-top: 15px;
            font-size: 8px;
            text-align: center;
            color: #666;
          }
          .logo {
            position: absolute;
            right: 20px;
            top: 20px;
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            transform: rotate(0deg);
          }
        </style>
      </head>
      <body>
        <div class="logo">CareO</div>
        <div class="header">
          <div class="header-title">Personal Hygiene Record</div>
          <div class="header-info">
            <div class="info-item">
              <span class="info-label">Month:</span>
              <span>${monthName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Name:</span>
              <span>${fullName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Room Number:</span>
              <span>${room}</span>
            </div>
            <div class="info-item">
              <span class="info-label">DOB:</span>
              <span>${dob}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="activity-label" style="background-color: #e0e0e0;">Activity</th>
              ${dayHeaders}
            </tr>
          </thead>
          <tbody>
            ${activityRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Chart must be signed and sent to Clinical team/unit manager on the last day of the month if advised. Important! Any</p>
          <p>concerns surrounding resident's care must be brought to the attention of nurse in charge of shift immediately.</p>
          <p style="margin-top: 8px;">Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, 'dd/MM/yyyy HH:mm')} UK Time • CareO Management System</p>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resident, month, year, tasksByDay, users } = body;

    if (!resident || !month || !year || !tasksByDay) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const htmlContent = generateMonthlyGridHTML(resident, month, year, tasksByDay, users || []);

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
        landscape: true,
        printBackground: true,
        margin: {
          top: "10mm",
          bottom: "10mm",
          left: "10mm",
          right: "10mm"
        },
        displayHeaderFooter: false,
        preferCSSPageSize: false
      });

      await browser.close();

      // Generate filename
      const sanitize = (str: string) =>
        str.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "-");
      const residentName = sanitize(`${resident.first_name}-${resident.last_name}`);
      const monthName = format(new Date(year, month - 1, 1), 'MMMM-yyyy');
      const fileName = `personal-care-record-${residentName}-${monthName}.pdf`;

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
    console.error("Monthly Personal Care PDF generation error:", error);

    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Failed to generate monthly PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
