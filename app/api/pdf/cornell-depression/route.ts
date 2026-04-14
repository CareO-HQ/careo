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

function generateCornellDepressionHTML(data: any): string {
  const items = data.scale_items || {};

  const sections = [
    {
      title: "A. Mood-Related Signs",
      items: [
        { label: "Anxiety", value: items.anxiety },
        { label: "Sadness", value: items.sadness },
        { label: "Lack of Reactivity to Pleasant Events", value: items.lackOfReactivity },
        { label: "Irritability", value: items.irritability }
      ]
    },
    {
      title: "B. Behavioral Disturbance",
      items: [
        { label: "Agitation", value: items.agitation },
        { label: "Retardation", value: items.retardation },
        { label: "Multiple Physical Complaints", value: items.multiplePhysicalComplaints },
        { label: "Loss of Interest", value: items.lossOfInterest }
      ]
    },
    {
      title: "C. Physical Signs",
      items: [
        { label: "Appetite Loss", value: items.appetiteLoss },
        { label: "Weight Loss", value: items.weightLoss },
        { label: "Lack of Energy", value: items.lackOfEnergy }
      ]
    },
    {
      title: "D. Cyclic Functions",
      items: [
        { label: "Diurnal variation of mood; symptoms worse in the morning", value: items.diurnalVariation },
        { label: "Difficulty falling asleep; later than usual for this individual", value: items.difficultyFallingAsleep },
        { label: "Multiple awakenings during sleep", value: items.multipleAwakenings },
        { label: "Early morning awakening; earlier than usual for this individual", value: items.earlyMorningAwakening }
      ]
    },
    {
      title: "E. Ideational Disturbance",
      items: [
        { label: "Suicidal Ideation", value: items.suicidalIdeation },
        { label: "Low Self-Esteem", value: items.lowSelfEsteem },
        { label: "Pessimism", value: items.pessimism },
        { label: "Mood-Congruent Delusions", value: items.moodCongruentDelusions }
      ]
    }
  ];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cornell Depression Scale</title>
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
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 24px;
          margin-bottom: 32px;
          text-align: center;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #1e40af;
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
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1e40af;
          background-color: #eff6ff;
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
        .score-box {
          text-align: center;
          background-color: #f0f9ff;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .score-value {
          font-size: 3rem;
          font-weight: 800;
          color: #1e40af;
        }
        .severity-badge {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 8px;
          display: inline-block;
          padding: 4px 16px;
          border-radius: 20px;
        }
        .severity-none { background-color: #dcfce7; color: #166534; }
        .severity-mild { background-color: #fef3c7; color: #92400e; }
        .severity-major { background-color: #fee2e2; color: #991b1b; }
        
        .rating-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .rating-table th, .rating-table td {
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #f3f4f6;
        }
        .rating-value {
          font-weight: 700;
          color: #1e40af;
          width: 40px;
          text-align: center;
          text-transform: uppercase;
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
        <h1>Cornell Scale for Depression in Dementia</h1>
        <p style="color: #6b7280;">Rating: a = Unable to evaluate, 0 = Absent, 1 = Mild/Intermittent, 2 = Severe</p>
      </div>

      <div class="score-box">
        <div class="score-value">${data.total_score || 0}</div>
        <div style="font-weight: 600; color: #374151;">Total Score</div>
        <div class="severity-badge ${(data.total_score || 0) >= 13 ? 'severity-major' :
      (data.total_score || 0) >= 8 ? 'severity-mild' : 'severity-none'
    }">
          ${data.severity_level || "No Depression"}
        </div>
      </div>

      <div class="section">
        <h2>Resident & Assessment Info</h2>
        <div class="grid grid-cols-2 info-box">
          <div>
            <div class="field-label">Resident Name</div>
            <div class="field-value">${data.residentName || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${data.dateOfBirth || "Not specified"}</div>
          </div>
          <div>
            <div class="field-label">Assessment Date</div>
            <div class="field-value">${formatDate(data.assessment_date)}</div>
          </div>
          <div>
            <div class="field-label">Assessed By</div>
            <div class="field-value">${data.completed_by || data.assessedBy || "Not specified"}</div>
          </div>
        </div>
      </div>

      ${sections.map(section => `
        <div class="section">
          <h3>${section.title}</h3>
          <table class="rating-table">
            <thead>
              <tr>
                <th>Assessment Item</th>
                <th class="rating-value">Rating</th>
              </tr>
            </thead>
            <tbody>
              ${section.items.map(item => `
                <tr>
                  <td>${item.label}</td>
                  <td class="rating-value">${item.value || "0"}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      <div class="section">
        <h2>Assessment Completion</h2>
        <div class="info-box grid grid-cols-2">
          <div>
            <div class="field-label">Assessed By</div>
            <div class="field-value">${data.completed_by || data.assessedBy}</div>
          </div>
          <div>
            <div class="field-label">Signature</div>
            <div class="field-value" style="font-style: italic; border-bottom: 1px solid #ccc; padding-top: 10px;">
              ${data.signature || data.completed_by || data.assessedBy}
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${formatDateTime(Date.now())}</p>
        <p>Cornell Depression Scale Report - ${data.residentName}</p>
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
      return NextResponse.json({ error: "Assessment data is required" }, { status: 400 });
    }

    // Flatten the data: merge assessment_data into the top level
    const flattenedData = {
      ...assessmentData,
      ...(assessmentData.assessment_data || {}),
      // Ensure resident details and common fields are at the top level
      residentName: assessmentData.residentName || assessmentData.assessment_data?.residentName || "Resident",
      dateOfBirth: assessmentData.dateOfBirth || assessmentData.assessment_data?.dateOfBirth,
      assessment_date: assessmentData.assessment_date || assessmentData.created_at || Date.now(),
      completed_by: assessmentData.completed_by || assessmentData.completedBy || assessmentData.assessment_data?.completed_by || "Not specified",
      // Ensure scale specific fields are at top level
      scale_items: assessmentData.scale_items || assessmentData.assessment_data?.scale_items || {},
      total_score: assessmentData.total_score || assessmentData.assessment_data?.total_score || 0,
      severity_level: assessmentData.severity_level || assessmentData.assessment_data?.severity_level || "No Depression"
    };

    console.log("Cornell Depression Scale PDF API flattening data:", {
      residentName: flattenedData.residentName,
      totalScore: flattenedData.total_score,
      formId: flattenedData._id || flattenedData.id
    });

    const htmlContent = generateCornellDepressionHTML(flattenedData);

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

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="cornell-depression-scale-${assessmentData.residentName?.replace(/\\s+/g, "-") || "resident"}.pdf"`,
          "Content-Length": pdfBuffer.length.toString()
        }
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Cornell Depression Scale PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
