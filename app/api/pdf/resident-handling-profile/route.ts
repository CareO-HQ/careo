import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";

interface ActivityDetails {
  nStaff?: number | string;
  equipment?: string;
  handlingPlan?: string;
  dateForReview?: string | number;
}

interface HandlingProfileData {
  residentName?: string;
  bedroomNumber?: string;
  weight?: number | string;
  weight_bearing?: string;
  completed_by?: string;
  job_role?: string;
  assessment_date?: string | number;
  activities?: Record<string, ActivityDetails>;
  [key: string]: unknown;
}

const EMPTY_VALUE = "Not provided";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valueOrFallback(value: unknown, fallback = EMPTY_VALUE): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  return String(value);
}

function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDate(value?: string | number): string {
  if (value === undefined || value === null || value === "") return EMPTY_VALUE;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{13}$/.test(trimmed) || /^\d{10}$/.test(trimmed)) {
      const timestamp = Number(trimmed);
      const dateFromTimestamp = new Date(trimmed.length === 10 ? timestamp * 1000 : timestamp);
      if (!Number.isNaN(dateFromTimestamp.getTime())) {
        return dateFromTimestamp.toLocaleDateString("en-GB");
      }
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const normalizedTimestamp = value < 1e12 ? value * 1000 : value;
    const dateFromNumber = new Date(normalizedTimestamp);
    if (!Number.isNaN(dateFromNumber.getTime())) {
      return dateFromNumber.toLocaleDateString("en-GB");
    }
  }

  if (typeof value === "string" && isDateOnlyString(value)) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return EMPTY_VALUE;
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(value?: string | number): string {
  if (value === undefined || value === null || value === "") return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;

  return `${date.toLocaleDateString("en-GB")} at ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function unknownToDisplayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return EMPTY_VALUE;
  if (typeof value === "string") return value.trim() === "" ? EMPTY_VALUE : value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : EMPTY_VALUE;
  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY_VALUE;
    return value.map((item) => unknownToDisplayValue(item)).join(", ");
  }
  return EMPTY_VALUE;
}

function isDateLikeKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.includes("date");
}

function humanizeKey(key: string): string {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey.endsWith("nstaff")) return "Number of staff required";

  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function flattenFields(
  source: Record<string, unknown>,
  parent = ""
): Array<{ key: string; value: unknown }> {
  const flattened: Array<{ key: string; value: unknown }> = [];

  for (const [key, value] of Object.entries(source)) {
    const fullKey = parent ? `${parent}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = flattenFields(value as Record<string, unknown>, fullKey);
      flattened.push(...nested);
      continue;
    }
    flattened.push({ key: fullKey, value });
  }

  return flattened;
}

function generateHandlingProfileHTML(data: HandlingProfileData): string {
  const activities = data.activities ?? {};

  const activityList = [
    { key: 'transferBed', title: 'Transfer to/from Bed' },
    { key: 'transferChair', title: 'Transfer to/from Chair' },
    { key: 'walking', title: 'Walking' },
    { key: 'toileting', title: 'Toileting' },
    { key: 'movementInBed', title: 'Movement in Bed' },
    { key: 'bath', title: 'Bathing' },
    { key: 'outdoorMobility', title: 'Outdoor Mobility' }
  ];

  const residentFieldRows = [
    { label: "Resident Name", value: valueOrFallback(data.residentName, "Resident") },
    { label: "Bedroom Number", value: valueOrFallback(data.bedroomNumber, EMPTY_VALUE) },
    {
      label: "Resident Weight",
      value: data.weight === null || data.weight === undefined || data.weight === ""
        ? EMPTY_VALUE
        : `${String(data.weight)} kg`
    },
    { label: "Weight Bearing Status", value: valueOrFallback(data.weight_bearing) }
  ];

  const renderedKeys = new Set<string>([
    "residentName",
    "bedroomNumber",
    "weight",
    "weight_bearing",
    "completed_by",
    "job_role",
    "assessment_date",
    "activities"
  ]);

  const allFlattenedFields = flattenFields(data);
  const extraFields = allFlattenedFields.filter((item) => {
    const rootKey = item.key.split(".")[0] ?? item.key;
    return !renderedKeys.has(rootKey);
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Resident Handling Profile</title>
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
          border-bottom: 2px solid #8b5cf6;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #5b21b6;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #5b21b6;
          margin-top: 24px;
          margin-bottom: 12px;
          background-color: #f5f3ff;
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
        .activity-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background-color: #ffffff;
        }
        .field-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        .field-value {
          color: #111827;
          font-size: 1rem;
          margin-bottom: 4px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .table-section {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          font-size: 0.9rem;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f9fafb;
          color: #374151;
          font-weight: 600;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
          font-size: 0.85rem;
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
        <h1>Resident Handling Profile</h1>
        <p style="color: #6b7280;">Manual Handling & Mobility Assessment</p>
      </div>

      <div class="section">
        <h2>Resident Information</h2>
        <div class="grid grid-cols-2 info-box">
          ${residentFieldRows
      .map(
        (row) => `
            <div>
              <div class="field-label">${escapeHtml(row.label)}</div>
              <div class="field-value">${escapeHtml(row.value)}</div>
            </div>
          `
      )
      .join("")}
        </div>
      </div>

      <div class="section">
        <h2>Mobility Activities</h2>
        ${activityList.map(act => {
    const details = activities[act.key] || {};
    return `
            <div class="activity-box">
              <h3>${act.title}</h3>
              <div class="grid grid-cols-2">
                <div>
                  <div class="field-label">Number of staff required</div>
                  <div class="field-value">${escapeHtml(unknownToDisplayValue(details.nStaff ?? 0))}</div>
                </div>
                <div>
                  <div class="field-label">Equipment Used</div>
                  <div class="field-value">${escapeHtml(valueOrFallback(details.equipment, EMPTY_VALUE))}</div>
                </div>
              </div>
              <div style="margin-top: 8px;">
                <div class="field-label">Handling Plan</div>
                <div class="field-value">${escapeHtml(valueOrFallback(details.handlingPlan, EMPTY_VALUE))}</div>
              </div>
              <div style="margin-top: 8px;">
                <div class="field-label">Review Date</div>
                <div class="field-value">${escapeHtml(formatDate(details.dateForReview))}</div>
              </div>
            </div>
          `;
  }).join('')}
      </div>

      <div class="section">
        <h2>Assessment Completion</h2>
        <div class="info-box grid grid-cols-2">
          <div>
            <div class="field-label">Completed By</div>
            <div class="field-value">${escapeHtml(valueOrFallback(data.completed_by))}</div>
          </div>
          <div>
            <div class="field-label">Job Role</div>
            <div class="field-value">${escapeHtml(valueOrFallback(data.job_role))}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${escapeHtml(formatDate(data.assessment_date))}</div>
          </div>
          <div>
            <div class="field-label">Signature</div>
            <div class="field-value" style="font-style: italic; border-bottom: 1px solid #ccc; padding-top: 10px;">
              ${escapeHtml(valueOrFallback(data.completed_by))}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>All Submitted Fields</h2>
        <div class="table-section">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${allFlattenedFields
      .map((field) => {
        const isDateField = isDateLikeKey(field.key);
        const isBooleanLike = typeof field.value === "boolean";
        const displayValue = isBooleanLike
          ? ((field.value as boolean) ? "Yes" : "No")
          : isDateField
            ? formatDate(field.value as string | number | undefined)
            : unknownToDisplayValue(field.value);
        return `
                  <tr>
                    <td class="mono">${escapeHtml(humanizeKey(field.key))}</td>
                    <td>${escapeHtml(displayValue)}</td>
                  </tr>
                `;
      })
      .join("")}
            </tbody>
          </table>
        </div>
        ${extraFields.length > 0
      ? `<p style="margin-top: 8px; color: #6b7280; font-size: 0.85rem;">Includes additional fields beyond the structured layout to ensure complete visibility.</p>`
      : ""}
      </div>

      <div class="footer">
        <p>Generated on ${escapeHtml(formatDateTime(Date.now()))}</p>
        <p>Resident Handling Profile Audit</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const assessmentData = (await request.json()) as Record<string, unknown> | null;

    if (!assessmentData) {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData: HandlingProfileData = {
      ...assessmentData,
      ...((assessmentData.assessment_data as Record<string, unknown>) || {}),
      // Ensure resident details and common fields are at the top level
      residentName: valueOrFallback(
        assessmentData.residentName ??
        (assessmentData.assessment_data as Record<string, unknown> | undefined)?.residentName,
        "Resident"
      ),
      bedroomNumber: valueOrFallback(
        assessmentData.bedroomNumber ??
        (assessmentData.assessment_data as Record<string, unknown> | undefined)?.bedroomNumber
      ),
      assessment_date:
        (assessmentData.assessment_date as string | number | undefined) ??
        (assessmentData.created_at as string | number | undefined) ??
        Date.now(),
      completed_by: valueOrFallback(
        assessmentData.completed_by ??
        assessmentData.completedBy ??
        (assessmentData.assessment_data as Record<string, unknown> | undefined)?.completed_by
      ),
      job_role: valueOrFallback(
        assessmentData.job_role ??
        assessmentData.jobRole ??
        (assessmentData.assessment_data as Record<string, unknown> | undefined)?.job_role
      )
    };

    console.log("Resident Handling Profile PDF API flattening data:", {
      residentName: flattenedData.residentName,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateHandlingProfileHTML(flattenedData);

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
          "Content-Disposition": `attachment; filename="handling-profile-${residentName}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Handling Profile PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
