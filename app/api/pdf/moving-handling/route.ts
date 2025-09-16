import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { assessmentId } = await request.json();

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Get the assessment data from Convex
    const assessment = await convex.query(
      api.careFiles.movingHandling.getMovingHandlingAssessment,
      {
        id: assessmentId as Id<"movingHandlingAssessments">
      }
    );

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Generate HTML for the PDF
    const htmlContent = generateMovingHandlingHTML(assessment);

    // Use a PDF generation library (you can use puppeteer, jsPDF, or any other)
    // For this example, I'll show the structure but you'll need to implement actual PDF generation
    const pdfBuffer = await generatePDFFromHTML(htmlContent);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="moving-handling-assessment-${assessment.residentName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error("Error generating moving handling PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function generateMovingHandlingHTML(assessment: any): string {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatRiskState = (state: string) => {
    return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Moving and Handling Assessment</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                margin: 20px;
                color: #333;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #2563eb;
                margin: 0;
                font-size: 24px;
            }
            .header p {
                margin: 5px 0;
                color: #666;
            }
            .section {
                margin-bottom: 25px;
                page-break-inside: avoid;
            }
            .section-title {
                background-color: #2563eb;
                color: white;
                padding: 8px 12px;
                margin: 0 0 15px 0;
                font-size: 14px;
                font-weight: bold;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            .info-item {
                margin-bottom: 10px;
            }
            .info-label {
                font-weight: bold;
                color: #374151;
                margin-bottom: 2px;
            }
            .info-value {
                color: #111827;
                padding: 4px 8px;
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
            }
            .risk-assessment {
                margin-bottom: 20px;
            }
            .risk-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin-bottom: 8px;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
            }
            .risk-item.always {
                background-color: #fee2e2;
                border-color: #fca5a5;
            }
            .risk-item.sometimes {
                background-color: #fef3c7;
                border-color: #fcd34d;
            }
            .risk-item.never {
                background-color: #dcfce7;
                border-color: #86efac;
            }
            .risk-label {
                font-weight: 500;
            }
            .risk-value {
                font-weight: bold;
                padding: 2px 8px;
                border-radius: 3px;
                color: white;
            }
            .risk-value.always {
                background-color: #dc2626;
            }
            .risk-value.sometimes {
                background-color: #d97706;
            }
            .risk-value.never {
                background-color: #16a34a;
            }
            .comments {
                font-style: italic;
                color: #6b7280;
                margin-left: 15px;
                margin-top: 5px;
            }
            .signature-section {
                margin-top: 30px;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
            .signature-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
            }
            .limb-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            .page-break {
                page-break-before: always;
            }
            @media print {
                body { margin: 0; }
                .page-break { page-break-before: always; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Moving and Handling Risk Assessment</h1>
            <p>Assessment Date: ${assessment.completionDate}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
            <h2 class="section-title">Resident Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Resident Name:</div>
                    <div class="info-value">${assessment.residentName}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date of Birth:</div>
                    <div class="info-value">${formatDate(assessment.dateOfBirth)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Bedroom Number:</div>
                    <div class="info-value">${assessment.bedroomNumber}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Weight:</div>
                    <div class="info-value">${assessment.weight} kg</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Height:</div>
                    <div class="info-value">${assessment.height} cm</div>
                </div>
                <div class="info-item">
                    <div class="info-label">History of Falls:</div>
                    <div class="info-value">${assessment.historyOfFalls ? "Yes" : "No"}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Mobility Assessment</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Independent Mobility:</div>
                    <div class="info-value">${assessment.independentMobility ? "Yes" : "No"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Weight Bearing Capacity:</div>
                    <div class="info-value">${assessment.canWeightBear.replace(/-/g, " ")}</div>
                </div>
            </div>
            
            <h3>Limb Mobility</h3>
            <div class="limb-grid">
                <div class="info-item">
                    <div class="info-label">Upper Right:</div>
                    <div class="info-value">${assessment.limbUpperRight}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Upper Left:</div>
                    <div class="info-value">${assessment.limbUpperLeft}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Lower Right:</div>
                    <div class="info-value">${assessment.limbLowerRight}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Lower Left:</div>
                    <div class="info-value">${assessment.limbLowerLeft}</div>
                </div>
            </div>

            ${
              assessment.equipmentUsed
                ? `
                <div class="info-item">
                    <div class="info-label">Equipment Used:</div>
                    <div class="info-value">${assessment.equipmentUsed}</div>
                </div>
            `
                : ""
            }

            ${
              assessment.needsRiskStaff
                ? `
                <div class="info-item">
                    <div class="info-label">Staff Risk Assessment:</div>
                    <div class="info-value">${assessment.needsRiskStaff}</div>
                </div>
            `
                : ""
            }
        </div>

        <div class="page-break"></div>

        <div class="section">
            <h2 class="section-title">Sensory & Behavioral Risk Factors</h2>
            <div class="risk-assessment">
                <div class="risk-item ${assessment.deafnessState.toLowerCase()}">
                    <span class="risk-label">Deafness:</span>
                    <span class="risk-value ${assessment.deafnessState.toLowerCase()}">${formatRiskState(assessment.deafnessState)}</span>
                </div>
                ${assessment.deafnessComments ? `<div class="comments">${assessment.deafnessComments}</div>` : ""}

                <div class="risk-item ${assessment.blindnessState.toLowerCase()}">
                    <span class="risk-label">Blindness/Visual Impairment:</span>
                    <span class="risk-value ${assessment.blindnessState.toLowerCase()}">${formatRiskState(assessment.blindnessState)}</span>
                </div>
                ${assessment.blindnessComments ? `<div class="comments">${assessment.blindnessComments}</div>` : ""}

                <div class="risk-item ${assessment.unpredictableBehaviourState.toLowerCase()}">
                    <span class="risk-label">Unpredictable Behavior:</span>
                    <span class="risk-value ${assessment.unpredictableBehaviourState.toLowerCase()}">${formatRiskState(assessment.unpredictableBehaviourState)}</span>
                </div>
                ${assessment.unpredictableBehaviourComments ? `<div class="comments">${assessment.unpredictableBehaviourComments}</div>` : ""}

                <div class="risk-item ${assessment.uncooperativeBehaviourState.toLowerCase()}">
                    <span class="risk-label">Uncooperative Behavior:</span>
                    <span class="risk-value ${assessment.uncooperativeBehaviourState.toLowerCase()}">${formatRiskState(assessment.uncooperativeBehaviourState)}</span>
                </div>
                ${assessment.uncooperativeBehaviourComments ? `<div class="comments">${assessment.uncooperativeBehaviourComments}</div>` : ""}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Cognitive & Emotional Risk Factors</h2>
            <div class="risk-assessment">
                <div class="risk-item ${assessment.distressedReactionState.toLowerCase()}">
                    <span class="risk-label">Distressed Reaction:</span>
                    <span class="risk-value ${assessment.distressedReactionState.toLowerCase()}">${formatRiskState(assessment.distressedReactionState)}</span>
                </div>
                ${assessment.distressedReactionComments ? `<div class="comments">${assessment.distressedReactionComments}</div>` : ""}

                <div class="risk-item ${assessment.disorientatedState.toLowerCase()}">
                    <span class="risk-label">Disorientation:</span>
                    <span class="risk-value ${assessment.disorientatedState.toLowerCase()}">${formatRiskState(assessment.disorientatedState)}</span>
                </div>
                ${assessment.disorientatedComments ? `<div class="comments">${assessment.disorientatedComments}</div>` : ""}

                <div class="risk-item ${assessment.unconsciousState.toLowerCase()}">
                    <span class="risk-label">Unconscious/Sedated:</span>
                    <span class="risk-value ${assessment.unconsciousState.toLowerCase()}">${formatRiskState(assessment.unconsciousState)}</span>
                </div>
                ${assessment.unconsciousComments ? `<div class="comments">${assessment.unconsciousComments}</div>` : ""}

                <div class="risk-item ${assessment.unbalanceState.toLowerCase()}">
                    <span class="risk-label">Unbalanced/Unstable:</span>
                    <span class="risk-value ${assessment.unbalanceState.toLowerCase()}">${formatRiskState(assessment.unbalanceState)}</span>
                </div>
                ${assessment.unbalanceComments ? `<div class="comments">${assessment.unbalanceComments}</div>` : ""}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Physical Risk Factors</h2>
            <div class="risk-assessment">
                <div class="risk-item ${assessment.spasmsState.toLowerCase()}">
                    <span class="risk-label">Spasms:</span>
                    <span class="risk-value ${assessment.spasmsState.toLowerCase()}">${formatRiskState(assessment.spasmsState)}</span>
                </div>
                ${assessment.spasmsComments ? `<div class="comments">${assessment.spasmsComments}</div>` : ""}

                <div class="risk-item ${assessment.stiffnessState.toLowerCase()}">
                    <span class="risk-label">Stiffness/Rigidity:</span>
                    <span class="risk-value ${assessment.stiffnessState.toLowerCase()}">${formatRiskState(assessment.stiffnessState)}</span>
                </div>
                ${assessment.stiffnessComments ? `<div class="comments">${assessment.stiffnessComments}</div>` : ""}

                <div class="risk-item ${assessment.cathetersState.toLowerCase()}">
                    <span class="risk-label">Catheters/Tubes:</span>
                    <span class="risk-value ${assessment.cathetersState.toLowerCase()}">${formatRiskState(assessment.cathetersState)}</span>
                </div>
                ${assessment.cathetersComments ? `<div class="comments">${assessment.cathetersComments}</div>` : ""}

                <div class="risk-item ${assessment.incontinenceState.toLowerCase()}">
                    <span class="risk-label">Incontinence:</span>
                    <span class="risk-value ${assessment.incontinenceState.toLowerCase()}">${formatRiskState(assessment.incontinenceState)}</span>
                </div>
                ${assessment.incontinenceComments ? `<div class="comments">${assessment.incontinenceComments}</div>` : ""}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Additional Risk Factors</h2>
            <div class="risk-assessment">
                <div class="risk-item ${assessment.localisedPain.toLowerCase()}">
                    <span class="risk-label">Localized Pain:</span>
                    <span class="risk-value ${assessment.localisedPain.toLowerCase()}">${formatRiskState(assessment.localisedPain)}</span>
                </div>
                ${assessment.localisedPainComments ? `<div class="comments">${assessment.localisedPainComments}</div>` : ""}

                <div class="risk-item ${assessment.otherState.toLowerCase()}">
                    <span class="risk-label">Other Risk Factors:</span>
                    <span class="risk-value ${assessment.otherState.toLowerCase()}">${formatRiskState(assessment.otherState)}</span>
                </div>
                ${assessment.otherComments ? `<div class="comments">${assessment.otherComments}</div>` : ""}
            </div>
        </div>

        <div class="signature-section">
            <h2 class="section-title">Assessment Completion</h2>
            <div class="signature-grid">
                <div class="info-item">
                    <div class="info-label">Completed By:</div>
                    <div class="info-value">${assessment.completedBy}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Job Role:</div>
                    <div class="info-value">${assessment.jobRole}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Signature:</div>
                    <div class="info-value">${assessment.signature}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date:</div>
                    <div class="info-value">${assessment.completionDate}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}

async function generatePDFFromHTML(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

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

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
