import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { BODY_REGIONS } from "@/lib/config/body-regions";

export const runtime = "nodejs";

function formatDate(dateString?: string | number | Date): string {
  if (!dateString) return "Not specified";
  const date = new Date(dateString as any);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-GB");
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PDF_API_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    console.log("Body Map PDF Generation requested for:", data.residentName);

    if (!data || !data.entries) {
      return NextResponse.json(
        { error: "Body map data is required" },
        { status: 400 }
      );
    }

    // Load image as base64
    let base64Image = "";
    try {
      const imagePath = path.join(process.cwd(), "public", "images", "body_template_without_rectangular_boxes.png");
      const imageBuffer = fs.readFileSync(imagePath);
      base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;
    } catch (imgError) {
      console.error("Error loading template image:", imgError);
    }

    const htmlContent = generateBodyMapHTML(data, base64Image);

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
          top: "20px",
          bottom: "20px",
          left: "20px",
          right: "20px"
        }
      });

      await browser.close();

      const filename = `body-map-${String(data.residentName || "report").replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Body Map PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

function generateBodyMapHTML(data: any, base64Image: string): string {
  // Group entries by region for easy marker lookup
  const entriesMap = new Map();
  data.entries.forEach((entry: any) => {
    entriesMap.set(entry.region_id, entry);
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Body Map Documentation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.4;
          color: #111827;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          font-size: 11px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #005eb8;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
          color: #005eb8;
        }
        .resident-info {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 8px;
          margin-bottom: 15px;
          background: #f8fafc;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .info-item b {
          color: #475569;
          display: inline-block;
          width: 100px;
        }
        .visual-container {
          margin-bottom: 20px;
          text-align: center;
          page-break-inside: avoid;
        }
        .map-wrapper {
          position: relative;
          display: inline-block;
          width: 500px;
          aspect-ratio: 577/515;
          border: 1px solid #e2e8f0;
          background: white;
        }
        .map-image {
          width: 100%;
          height: 100%;
          display: block;
        }
        .region-marker {
          position: absolute;
          border: 1px solid rgba(0,0,0,0.1);
          box-sizing: border-box;
          z-index: 10;
        }
        .marker-active {
          background-color: rgba(168, 85, 247, 0.4);
          border-color: #9333ea;
        }
        .marker-resolved {
          background-color: rgba(34, 197, 94, 0.2);
          border-color: #22c55e;
        }
        .section-title {
          font-weight: bold;
          font-size: 14px;
          margin: 15px 0 8px 0;
          color: #1e293b;
          border-left: 4px solid #005eb8;
          padding-left: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
          color: #334155;
        }
        .severity-badge {
          display: inline-block;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .severity-high { background: #fee2e2; color: #991b1b; }
        .severity-medium { background: #ffedd5; color: #9a3412; }
        .severity-low { background: #fef9c3; color: #854d0e; }
        
          font-size: 9px;
          font-weight: bold;
        }
        .status-active { background: #f3e8ff; color: #6b21a8; }
        .status-resolved { background: #dcfce7; color: #166534; }

        .footer {
          margin-top: 25px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Body Mapping Medical Documentation</h1>
        <p style="margin-top: 4px;">Confidential Medical Record</p>
      </div>

      <div class="resident-info">
        <div class="info-item"><b>Resident:</b> ${data.residentName || "N/A"}</div>
        <div class="info-item"><b>Date of Report:</b> ${formatDate(new Date())}</div>
        <div class="info-item"><b>Incident Type:</b> ${data.incidentType || "N/A"}</div>
        <div class="info-item"><b>Incident Date:</b> ${data.incidentDate || "N/A"}</div>
      </div>

      <div class="visual-container">
        <div class="section-title" style="text-align: left;">Anatomical Distribution</div>
        <div class="map-wrapper">
          ${base64Image ? `<img src="${base64Image}" class="map-image" />` : '<div style="padding: 20px;">Image Template Not Found</div>'}
          ${BODY_REGIONS.map(region => {
    const entry = entriesMap.get(region.region_id);
    if (!entry) return "";
    const isResolved = String(entry.status).toLowerCase() === "resolved";
    return `<div class="region-marker ${isResolved ? 'marker-resolved' : 'marker-active'}" 
                     style="left: ${region.x}%; top: ${region.y}%; width: ${region.width}%; height: ${region.height}%;">
                </div>`;
  }).join("")}
        </div>
      </div>

      <div class="section-title">Clinical Observations</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Region</th>
            <th style="width: 25%;">Observation Type</th>
            <th>Notes & Measurements</th>
            <th style="width: 15%;">Recorded Date</th>
          </tr>
        </thead>
        <tbody>
          ${data.entries.map((entry: any) => `
            <tr>
              <td><b>${entry.region_name}</b></td>
              <td>${entry.condition_type}</td>
              <td>
                ${entry.notes || "<i>No notes</i>"}
                ${entry.measurements ? `<br><small><b>Size:</b> ${entry.measurements}</small>` : ""}
              </td>
              <td>${formatDate(entry.date_time)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="footer">
        <p>Generated by CareO System on ${new Date().toLocaleString("en-GB")}</p>
        <p>This document is part of the electronic health record. Confidentiality must be maintained at all times.</p>
      </div>
    </body>
    </html>
  `;
}
