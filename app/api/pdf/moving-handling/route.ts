import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { chromium } from "playwright";

type RiskState = "ALWAYS" | "SOMETIMES" | "NEVER";
type LimbMobility = "FULLY" | "PARTIALLY" | "NONE";
type WeightBearingCapacity = "FULLY" | "PARTIALLY" | "WITH-AID" | "NO-WEIGHTBEARING";

interface MovingHandlingAssessment {
    residentId?: string;
    teamId?: string;
    organizationId?: string;
    userId?: string;
    residentName?: string;
    dateOfBirth?: string | number;
    bedroomNumber?: string;
    weight?: number | string;
    height?: number | string;
    historyOfFalls?: boolean | string | number;
    independentMobility?: boolean | string | number;
    canWeightBear?: WeightBearingCapacity | string;
    limbUpperRight?: LimbMobility | string;
    limbUpperLeft?: LimbMobility | string;
    limbLowerRight?: LimbMobility | string;
    limbLowerLeft?: LimbMobility | string;
    equipmentUsed?: string;
    needsRiskStaff?: string;
    deafnessState?: RiskState | string;
    deafnessComments?: string;
    blindnessState?: RiskState | string;
    blindnessComments?: string;
    unpredictableBehaviourState?: RiskState | string;
    unpredictableBehaviourComments?: string;
    uncooperativeBehaviourState?: RiskState | string;
    uncooperativeBehaviourComments?: string;
    distressedReactionState?: RiskState | string;
    distressedReactionComments?: string;
    disorientatedState?: RiskState | string;
    disorientatedComments?: string;
    unconsciousState?: RiskState | string;
    unconsciousComments?: string;
    unbalanceState?: RiskState | string;
    unbalanceComments?: string;
    spasmsState?: RiskState | string;
    spasmsComments?: string;
    stiffnessState?: RiskState | string;
    stiffnessComments?: string;
    cathetersState?: RiskState | string;
    cathetersComments?: string;
    incontinenceState?: RiskState | string;
    incontinenceComments?: string;
    localisedPain?: RiskState | string;
    localisedPainComments?: string;
    otherState?: RiskState | string;
    otherComments?: string;
    completedBy?: string;
    jobRole?: string;
    signature?: string;
    assessmentDate?: string;
    completionDate?: string;
}

interface RawAssessmentInput {
    assessment_data?: Record<string, unknown>;
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

function valueOrEmpty(value: unknown): string {
    if (value === null || value === undefined) return EMPTY_VALUE;
    if (typeof value === "string") return value.trim() === "" ? EMPTY_VALUE : value.trim();
    return String(value);
}

function formatDate(value?: string | number): string {
    if (value === undefined || value === null || value === "") return EMPTY_VALUE;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
    return date.toLocaleDateString("en-GB");
}

function toYesNo(value: unknown): "Yes" | "No" {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value === 1 ? "Yes" : "No";
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return normalized === "true" || normalized === "yes" || normalized === "1" ? "Yes" : "No";
    }
    return "No";
}

function toSentenceCase(value: string): string {
    if (!value || value === EMPTY_VALUE) return value;
    const trimmed = value.trim();
    if (trimmed.length === 0) return value;
    const lowered = trimmed.toLowerCase();
    return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

function normalizeEnum(value: unknown): string {
    if (value === null || value === undefined || value === "") return EMPTY_VALUE;
    const str = String(value).replace(/-/g, " ").replace(/_/g, " ");
    return toSentenceCase(str);
}

function toStringOrNumber(value: unknown, fallback: string | number = ""): string | number {
    if (typeof value === "string" || typeof value === "number") return value;
    return fallback;
}

function toBooleanStringNumber(value: unknown): string | number | boolean | undefined {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    return undefined;
}

function createRow(label: string, value: string): string {
    return `
        <tr>
            <td class="label">${escapeHtml(label)}</td>
            <td class="value">${escapeHtml(value)}</td>
        </tr>
    `;
}

function createSection(title: string, rows: string[]): string {
    return `
        <section class="section">
            <h2>${escapeHtml(title)}</h2>
            <table>
                <tbody>
                    ${rows.join("")}
                </tbody>
            </table>
        </section>
    `;
}

function createSectionWithSubsections(
    title: string,
    subsections: Array<{ title: string; rows: string[] }>
): string {
    return `
        <section class="section">
            <h2>${escapeHtml(title)}</h2>
            ${subsections
            .map(
                (subsection) => `
                    <div class="subsection">
                        <h3>${escapeHtml(subsection.title)}</h3>
                        <table>
                            <tbody>
                                ${subsection.rows.join("")}
                            </tbody>
                        </table>
                    </div>
                `
            )
            .join("")}
        </section>
    `;
}

function parseAssessmentPayload(input: RawAssessmentInput): MovingHandlingAssessment {
    const merged = {
        ...input,
        ...(input.assessment_data ?? {})
    } as Record<string, unknown>;

    return {
        residentId: valueOrEmpty(merged.residentId),
        teamId: valueOrEmpty(merged.teamId),
        organizationId: valueOrEmpty(merged.organizationId),
        userId: valueOrEmpty(merged.userId),
        residentName: valueOrEmpty(merged.residentName),
        dateOfBirth: toStringOrNumber(merged.dateOfBirth ?? merged.date_of_birth, ""),
        bedroomNumber: valueOrEmpty(merged.bedroomNumber),
        weight: toStringOrNumber(merged.weight, ""),
        height: toStringOrNumber(merged.height, ""),
        historyOfFalls: toBooleanStringNumber(merged.historyOfFalls),
        independentMobility: toBooleanStringNumber(merged.independentMobility),
        canWeightBear: valueOrEmpty(merged.canWeightBear),
        limbUpperRight: valueOrEmpty(merged.limbUpperRight),
        limbUpperLeft: valueOrEmpty(merged.limbUpperLeft),
        limbLowerRight: valueOrEmpty(merged.limbLowerRight),
        limbLowerLeft: valueOrEmpty(merged.limbLowerLeft),
        equipmentUsed: valueOrEmpty(merged.equipmentUsed ?? merged.equipment_needed),
        needsRiskStaff: valueOrEmpty(merged.needsRiskStaff),
        deafnessState: valueOrEmpty(merged.deafnessState),
        deafnessComments: valueOrEmpty(merged.deafnessComments),
        blindnessState: valueOrEmpty(merged.blindnessState),
        blindnessComments: valueOrEmpty(merged.blindnessComments),
        unpredictableBehaviourState: valueOrEmpty(merged.unpredictableBehaviourState),
        unpredictableBehaviourComments: valueOrEmpty(merged.unpredictableBehaviourComments),
        uncooperativeBehaviourState: valueOrEmpty(merged.uncooperativeBehaviourState),
        uncooperativeBehaviourComments: valueOrEmpty(merged.uncooperativeBehaviourComments),
        distressedReactionState: valueOrEmpty(merged.distressedReactionState),
        distressedReactionComments: valueOrEmpty(merged.distressedReactionComments),
        disorientatedState: valueOrEmpty(merged.disorientatedState),
        disorientatedComments: valueOrEmpty(merged.disorientatedComments),
        unconsciousState: valueOrEmpty(merged.unconsciousState),
        unconsciousComments: valueOrEmpty(merged.unconsciousComments),
        unbalanceState: valueOrEmpty(merged.unbalanceState),
        unbalanceComments: valueOrEmpty(merged.unbalanceComments),
        spasmsState: valueOrEmpty(merged.spasmsState),
        spasmsComments: valueOrEmpty(merged.spasmsComments),
        stiffnessState: valueOrEmpty(merged.stiffnessState),
        stiffnessComments: valueOrEmpty(merged.stiffnessComments),
        cathetersState: valueOrEmpty(merged.cathetersState),
        cathetersComments: valueOrEmpty(merged.cathetersComments),
        incontinenceState: valueOrEmpty(merged.incontinenceState),
        incontinenceComments: valueOrEmpty(merged.incontinenceComments),
        localisedPain: valueOrEmpty(merged.localisedPain),
        localisedPainComments: valueOrEmpty(merged.localisedPainComments),
        otherState: valueOrEmpty(merged.otherState),
        otherComments: valueOrEmpty(merged.otherComments),
        completedBy: valueOrEmpty(merged.completedBy ?? merged.completed_by),
        jobRole: valueOrEmpty(merged.jobRole),
        signature: valueOrEmpty(merged.signature),
        assessmentDate: valueOrEmpty(merged.assessmentDate ?? merged.assessment_date),
        completionDate: valueOrEmpty(
            merged.completionDate ?? merged.completion_date ?? merged.assessmentDate ?? merged.assessment_date
        )
    };
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

        const assessmentData = (await request.json()) as RawAssessmentInput;

        if (!assessmentData) {
            return NextResponse.json(
                { error: "Assessment data is required" },
                { status: 400 }
            );
        }

        const assessment = parseAssessmentPayload(assessmentData);

        const htmlContent = generateMovingHandlingHTML(assessment);

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
                },
                displayHeaderFooter: false,
                preferCSSPageSize: true
            });

            await browser.close();

            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="moving-handling-assessment-${assessment.residentName?.replace(/\s+/g, "-") || "record"}-${new Date().toISOString().split("T")[0]}.pdf"`
                }
            });
        } catch (error) {
            await browser.close();
            throw error;
        }
    } catch (error) {
        console.error("Error generating moving handling PDF:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

function generateMovingHandlingHTML(assessment: MovingHandlingAssessment): string {
    const sections = [
        createSection("Section 1: Resident Information", [
            createRow("Resident Name", toSentenceCase(valueOrEmpty(assessment.residentName))),
            createRow("Date of Birth", formatDate(assessment.dateOfBirth)),
            createRow("Bedroom Number", valueOrEmpty(assessment.bedroomNumber)),
            createRow("Weight (kg)", valueOrEmpty(assessment.weight)),
            createRow("Height (cm)", valueOrEmpty(assessment.height)),
            createRow("History of Falls", toYesNo(assessment.historyOfFalls))
        ]),
        createSection("Section 2: Mobility Assessment", [
            createRow("Independent Mobility", toYesNo(assessment.independentMobility)),
            createRow("Weight Bearing Capacity", normalizeEnum(assessment.canWeightBear)),
            createRow("Limb Mobility - Upper Right", normalizeEnum(assessment.limbUpperRight)),
            createRow("Limb Mobility - Upper Left", normalizeEnum(assessment.limbUpperLeft)),
            createRow("Limb Mobility - Lower Right", normalizeEnum(assessment.limbLowerRight)),
            createRow("Limb Mobility - Lower Left", normalizeEnum(assessment.limbLowerLeft)),
            createRow("Equipment Needed", toSentenceCase(valueOrEmpty(assessment.equipmentUsed))),
            createRow("Details of Support/Staff Required", toSentenceCase(valueOrEmpty(assessment.needsRiskStaff)))
        ]),
        createSectionWithSubsections("Section 3: Risk Factors", [
            {
                title: "Sensory & Behavioral",
                rows: [
                    createRow("Deafness State", normalizeEnum(assessment.deafnessState)),
                    createRow("Deafness Comments", toSentenceCase(valueOrEmpty(assessment.deafnessComments))),
                    createRow("Blindness State", normalizeEnum(assessment.blindnessState)),
                    createRow("Blindness Comments", toSentenceCase(valueOrEmpty(assessment.blindnessComments))),
                    createRow("Unpredictable Behaviour State", normalizeEnum(assessment.unpredictableBehaviourState)),
                    createRow("Unpredictable Behaviour Comments", toSentenceCase(valueOrEmpty(assessment.unpredictableBehaviourComments))),
                    createRow("Uncooperative Behaviour State", normalizeEnum(assessment.uncooperativeBehaviourState)),
                    createRow("Uncooperative Behaviour Comments", toSentenceCase(valueOrEmpty(assessment.uncooperativeBehaviourComments)))
                ]
            },
            {
                title: "Cognitive & Emotional",
                rows: [
                    createRow("Distressed Reaction State", normalizeEnum(assessment.distressedReactionState)),
                    createRow("Distressed Reaction Comments", toSentenceCase(valueOrEmpty(assessment.distressedReactionComments))),
                    createRow("Disorientated State", normalizeEnum(assessment.disorientatedState)),
                    createRow("Disorientated Comments", toSentenceCase(valueOrEmpty(assessment.disorientatedComments))),
                    createRow("Unconscious State", normalizeEnum(assessment.unconsciousState)),
                    createRow("Unconscious Comments", toSentenceCase(valueOrEmpty(assessment.unconsciousComments))),
                    createRow("Unbalance State", normalizeEnum(assessment.unbalanceState)),
                    createRow("Unbalance Comments", toSentenceCase(valueOrEmpty(assessment.unbalanceComments)))
                ]
            },
            {
                title: "Physical & Other",
                rows: [
                    createRow("Spasms State", normalizeEnum(assessment.spasmsState)),
                    createRow("Spasms Comments", toSentenceCase(valueOrEmpty(assessment.spasmsComments))),
                    createRow("Stiffness State", normalizeEnum(assessment.stiffnessState)),
                    createRow("Stiffness Comments", toSentenceCase(valueOrEmpty(assessment.stiffnessComments))),
                    createRow("Catheters State", normalizeEnum(assessment.cathetersState)),
                    createRow("Catheters Comments", toSentenceCase(valueOrEmpty(assessment.cathetersComments))),
                    createRow("Incontinence State", normalizeEnum(assessment.incontinenceState)),
                    createRow("Incontinence Comments", toSentenceCase(valueOrEmpty(assessment.incontinenceComments))),
                    createRow("Localised Pain State", normalizeEnum(assessment.localisedPain)),
                    createRow("Localised Pain Comments", toSentenceCase(valueOrEmpty(assessment.localisedPainComments))),
                    createRow("Other Risk Factors State", normalizeEnum(assessment.otherState)),
                    createRow("Other Risk Factors Comments", toSentenceCase(valueOrEmpty(assessment.otherComments)))
                ]
            }
        ]),
        createSection("Section 7: Assessment Completion", [
            createRow("Completed By", toSentenceCase(valueOrEmpty(assessment.completedBy))),
            createRow("Job Role", toSentenceCase(valueOrEmpty(assessment.jobRole))),
            createRow("Signature", toSentenceCase(valueOrEmpty(assessment.signature))),
            createRow("Assessment Date", valueOrEmpty(assessment.assessmentDate)),
            createRow("Completion Date", valueOrEmpty(assessment.completionDate))
        ]),
        createSection("Metadata", [
            createRow("Resident ID", valueOrEmpty(assessment.residentId)),
            createRow("Team ID", valueOrEmpty(assessment.teamId)),
            createRow("Organization ID", valueOrEmpty(assessment.organizationId)),
            createRow("User ID", valueOrEmpty(assessment.userId))
        ])
    ];

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Moving and Handling Assessment</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                line-height: 1.4;
                margin: 16px;
                color: #111827;
            }
            .page-header {
                border: 1px solid #1d4ed8;
                background: #eff6ff;
                padding: 10px 12px;
                margin-bottom: 16px;
            }
            .page-header h1 {
                margin: 0 0 4px 0;
                color: #1d4ed8;
                font-size: 18px;
            }
            .page-header p {
                margin: 0;
                color: #374151;
                font-size: 11px;
            }
            .section {
                margin-bottom: 12px;
            }
            .section h2 {
                margin: 0;
                padding: 6px 8px;
                background: #1d4ed8;
                color: #ffffff;
                font-size: 12px;
                font-weight: bold;
            }
            .subsection {
                margin-top: 8px;
            }
            .subsection h3 {
                margin: 0;
                padding: 5px 8px;
                background: #dbeafe;
                color: #1e3a8a;
                font-size: 11px;
                font-weight: 700;
                border: 1px solid #bfdbfe;
                border-bottom: 0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                border: 1px solid #d1d5db;
            }
            td {
                border: 1px solid #d1d5db;
                padding: 6px 8px;
                vertical-align: top;
                word-break: break-word;
            }
            td.label {
                width: 36%;
                font-weight: 600;
                background: #f9fafb;
            }
            td.value {
                width: 64%;
            }
            @media print {
                body { margin: 0; }
                .section { break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="page-header">
            <h1>Moving and Handling Assessment</h1>
            <p>Assessment Date: ${escapeHtml(valueOrEmpty(assessment.completionDate))}</p>
            <p>Generated On: ${escapeHtml(new Date().toLocaleDateString("en-GB"))}</p>
        </div>
        ${sections.join("")}
    </body>
    </html>
  `;
}
