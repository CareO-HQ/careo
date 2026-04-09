import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

function formatDate(dateString?: string | number | null): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(dateString?: string | number | null): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return (
    date.toLocaleDateString("en-GB") +
    " " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

interface SpecimenRecord {
  date_time_obtained?: string | null;
  specimen_type?: string | null;
  specimen_requested?: string | null;
  staff_obtaining_signature?: string | null;
  date_results_received?: string | null;
  results?: string | null;
  staff_receiving_signature?: string | null;
}

interface ResidentInfo {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string | number | null;
  room_number?: string | null;
}

interface SpecimenPDFPayload {
  records: SpecimenRecord[];
  resident: ResidentInfo;
  careHomeName?: string;
}

function toText(val: unknown, fallback = "—"): string {
  if (val === undefined || val === null || val === "") return fallback;
  return String(val);
}

function generateSpecimenRecordLogHTML(payload: SpecimenPDFPayload): string {
  const { records, resident, careHomeName } = payload;

  const residentFullName = [resident?.first_name, resident?.middle_name, resident?.last_name]
    .filter(Boolean)
    .join(" ") || "—";

  const dob = formatDate(resident?.date_of_birth);
  const roomNumber = toText(resident?.room_number);
  const homeName = toText(careHomeName);
  const generatedOn = formatDateTime(Date.now());

  const tableRows = records.length > 0
    ? records
        .map(
          (r) => `
          <tr>
            <td>${formatDateTime(r.date_time_obtained)}</td>
            <td>${toText(r.specimen_type)}</td>
            <td>${toText(r.specimen_requested)}</td>
            <td>${toText(r.staff_obtaining_signature)}</td>
            <td>${formatDateTime(r.date_results_received)}</td>
            <td>${toText(r.results)}</td>
            <td>${toText(r.staff_receiving_signature)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="7" class="empty-row">No specimen records found.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Specimen Record Log</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      padding: 28px 32px;
      line-height: 1.45;
    }

    /* ── Header ──────────────────────────────── */
    .page-header {
      border-bottom: 3px solid #16a34a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .page-header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #16a34a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .page-header p {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }

    /* ── Section headings ────────────────────── */
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #16a34a;
      letter-spacing: 0.6px;
      border-bottom: 1px solid #d1fae5;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }

    /* ── Resident info grid ──────────────────── */
    .resident-section {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .resident-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px 20px;
    }
    .field-block {}
    .field-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .field-value {
      font-size: 12px;
      font-weight: 600;
      color: #111;
    }

    /* ── Records table ───────────────────────── */
    .records-section { margin-bottom: 20px; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    thead tr {
      background: #16a34a;
      color: #fff;
    }
    thead th {
      padding: 7px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:nth-child(odd)  { background: #ffffff; }
    tbody td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      word-break: break-word;
    }
    .empty-row {
      text-align: center;
      color: #9ca3af;
      padding: 20px;
      font-style: italic;
    }

    /* ── Footer ──────────────────────────────── */
    .page-footer {
      margin-top: 32px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { padding: 0; }
      .records-section { page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Page header -->
  <div class="page-header">
    <h1>Specimen Record Log</h1>
    <p>Record of Specimens — Confidential Healthcare Document</p>
  </div>

  <!-- Resident Information -->
  <div class="resident-section">
    <div class="section-title">Resident Information</div>
    <div class="resident-grid">
      <div class="field-block">
        <div class="field-label">Full Name</div>
        <div class="field-value">${residentFullName}</div>
      </div>
      <div class="field-block">
        <div class="field-label">Date of Birth</div>
        <div class="field-value">${dob}</div>
      </div>
      <div class="field-block">
        <div class="field-label">Bedroom / Room</div>
        <div class="field-value">${roomNumber}</div>
      </div>
      <div class="field-block">
        <div class="field-label">Care Home</div>
        <div class="field-value">${homeName}</div>
      </div>
    </div>
  </div>

  <!-- Specimen Records Table -->
  <div class="records-section">
    <div class="section-title">Specimen Records (${records.length} entr${records.length === 1 ? "y" : "ies"})</div>
    <table>
      <thead>
        <tr>
          <th>Date / Time Obtained</th>
          <th>Type of Specimen</th>
          <th>Specimen Requested</th>
          <th>Obtained By</th>
          <th>Results Date / Time</th>
          <th>Results</th>
          <th>Received By</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="page-footer">
    <span>Generated: ${generatedOn}</span>
    <span>iCare Home Management — Specimen Record Log</span>
  </div>

</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as SpecimenPDFPayload;

    if (!body || !body.resident) {
      return NextResponse.json({ error: "Resident data is required" }, { status: 400 });
    }

    const records: SpecimenRecord[] = Array.isArray(body.records) ? body.records : [];

    const htmlContent = generateSpecimenRecordLogHTML({
      records,
      resident: body.resident,
      careHomeName: body.careHomeName,
    });

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, { waitUntil: "networkidle", timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });

      await browser.close();

      const lastName = body.resident?.last_name?.replace(/\s+/g, "-") ?? "resident";
      const dateStamp = new Date().toLocaleDateString("en-GB").replace(/\//g, "");

      return new NextResponse(pdfBuffer as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${lastName}_Specimen_Record_Log_${dateStamp}.pdf"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Specimen record log PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
