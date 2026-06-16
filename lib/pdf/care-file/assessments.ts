import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { BODY_REGIONS } from "@/lib/config/body-regions";
import {
    drawHeader,
    addSectionTitle,
    addField,
    ensureSpace,
    toSafeFilePart,
    loadImage,
    formatValue,
    GenerateCareFilePDFOptions,
    PDFContext
} from "./helpers";

export const generateAssessmentsPDF = async (options: GenerateCareFilePDFOptions) => {
    const { formName, data, resident, orgLogoUrl, careHomeName } = options;
    const upperFormName = formName.toUpperCase();

    const isDependencyAssessment = upperFormName.includes("DEPENDENCY ASSESSMENT");
    const isFallRiskAssessment = upperFormName.includes("FALL RISK ASSESSMENT");
    const isSpecimenLog = upperFormName.includes("SPECIMEN RECORD LOG") || formName.includes("v2-specimen-log");
    const isKeyWorkerDiaryPdf = upperFormName.includes("KEY WORKER DIARY");
    const isProgressNotesPdf = formName === "Progress Notes";

    const doc = new jsPDF({
        orientation:
            isDependencyAssessment ||
            isFallRiskAssessment ||
            isSpecimenLog ||
            isKeyWorkerDiaryPdf ||
            isProgressNotesPdf
                ? "landscape"
                : "portrait",
    });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    const loadOrgLogoForPdf = async (url: string) => {
        const { loadOrgLogoForPdf: loadLogo } = await import("./helpers");
        return loadLogo(url);
    };

    const resolvedOrgLogo = orgLogoUrl ? await loadOrgLogoForPdf(orgLogoUrl) : null;

    const ctx: PDFContext = {
        doc,
        formName,
        data,
        resident,
        orgLogoUrl,
        careHomeName,
        pageWidth,
        margin,
        resolvedOrgLogo
    };

    let yPos = 30;
    await drawHeader(ctx);

    const cpWidth = (pageWidth - margin * 2) / 2 - 5;
    const cpCol2 = margin + (pageWidth - margin * 2) / 2;
    const col2 = cpCol2; // alias for compatibility
    const colWidth = cpWidth; // alias for compatibility
    const fullWidth = pageWidth - margin * 2;
    const assessmentDataForSpecialized = data.assessment_details || data.assessmentDetails || data.assessment_data || data;

    // --- Dependency Assessment Specialized Layout ---
    if (isDependencyAssessment) {
        const hasCurrentData = data.total_score !== undefined || data.assessment_details;
        if (hasCurrentData) {
            yPos = await addSectionTitle(ctx, "CURRENT ASSESSMENT DETAILS", yPos);
            const assessmentDate = data.assessment_date || data.created_at || new Date();
            const completedBy = data.completed_by || data.completedBy || "N/A";

            let ay1 = await addField(ctx, "Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
            ay1 = await addField(ctx, "Total Score", `${data.total_score || 0} pts`, margin, ay1, colWidth);

            let ay2 = await addField(ctx, "Completed By", completedBy, col2, yPos, colWidth);
            ay2 = await addField(ctx, "Dependency Level", data.dependency_level || "N/A", col2, ay2, colWidth);

            yPos = Math.max(ay1, ay2) + 10;

            const details = data.assessment_details || {};
            const breakdownData = [
                ['Mobility', `${details.mobility || 0} pts`, 'Dressing', `${details.dressing || 0} pts`],
                ['Personal Hygiene', `${details.personalHygiene || 0} pts`, 'Feeding', `${details.feeding || 0} pts`],
                ['Eyesight', `${details.eyesight || 0} pts`, 'Hearing', `${details.hearing || 0} pts`],
                ['Pressure Sore Risk', `${details.pressureSoreRisk || 0} pts`, 'Communication', `${details.communication || 0} pts`],
                ['Continence (Urine)', `${details.continenceUrine || 0} pts`, 'Continence (Faeces)', `${details.continenceFaeces || 0} pts`],
                ['Social Dependency', `${details.socialDependency || 0} pts`, 'Behaviour', `${details.behaviour || 0} pts`],
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Category', 'Score', 'Category', 'Score']],
                body: breakdownData,
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 9 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        doc.save(`${resident?.last_name || "Resident"}_Dependency_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- General Risk Assessment Specialized Layout ---
    if (upperFormName.includes("GENERAL RISK ASSESSMENT")) {
        const assessment = (data?.assessment_data ?? data ?? {});

        const drawGeneralRiskHeader = async () => {
            await drawHeader(ctx);
        };

        const ensureGeneralRiskSpace = async (heightNeeded: number, currentY: number) => {
            return ensureSpace(ctx, heightNeeded, currentY);
        };

        const renderYesNoList = async (label: string, selectedOptions: string[] | undefined, allOptions: readonly string[], y: number) => {
            y = await addSectionTitle(ctx, label, y);
            for (const option of allOptions) {
                const isSelected = selectedOptions?.includes(option);
                y = await addField(ctx, option, isSelected ? "Yes" : "No", margin, y, pageWidth - margin * 2);
            }
            return y;
        };

        let yPos = 30;
        await drawGeneralRiskHeader();

        // Section A - Resident Information
        yPos = await addSectionTitle(ctx, "SECTION A - RESIDENT INFORMATION", yPos);
        yPos = await ensureGeneralRiskSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField(ctx, "Full Name", assessment.fullName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessment.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField(ctx, "Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField(ctx, "Resident / NHS Number", assessment.nhsNumber || (resident ? resident.nhs_health_number : "N/A"), margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField(ctx, "Room Number", assessment.roomNumber || (resident ? resident.room_number : "N/A"), cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField(ctx, "Date of Assessment", assessment.dateOfAssessment ? format(new Date(assessment.dateOfAssessment), "dd/MM/yyyy") : "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // Section B - Assessment Details
        yPos = await addSectionTitle(ctx, "SECTION B - ASSESSMENT DETAILS", yPos + 2);
        yPos = await ensureGeneralRiskSpace(20, yPos);
        const rowAssY = yPos;
        const yAss1 = await addField(ctx, "Assessment Completed By", assessment.assessmentCompletedBy || "N/A", margin, rowAssY, cpWidth, true);
        const yAss2 = await addField(ctx, "Role", assessment.role || "N/A", cpCol2, rowAssY, cpWidth, true);
        yPos = Math.max(yAss1, yAss2);

        const reasonOptions = ["New admission", "Change in condition", "Routine review", "Incident or accident"] as const;
        yPos = await renderYesNoList("Reason for Assessment", assessment.reasonForAssessment, reasonOptions, yPos + 2);
        if (assessment.otherReason) {
            yPos = await addField(ctx, "Other Reason", assessment.otherReason, margin, yPos, pageWidth - margin * 2);
        }

        // Section C - Areas of Risk Identified
        const areasOptions = [
            "Falls and mobility", "Skin integrity / pressure ulcers", "Nutrition and hydration",
            "Medication management", "Behavioural or cognitive risks", "Infection control",
            "Manual handling needs", "Environmental hazards", "Wandering or absconding",
            "Choking or swallowing difficulties"
        ] as const;
        yPos = await renderYesNoList("SECTION C - AREAS OF RISK IDENTIFIED", assessment.areasOfRisk, areasOptions, yPos + 2);
        if (assessment.otherArea) {
            yPos = await addField(ctx, "Other Area", assessment.otherArea, margin, yPos, pageWidth - margin * 2);
        }

        // Section D - Description of Identified Risks
        yPos = await addSectionTitle(ctx, "SECTION D - DESCRIPTION OF IDENTIFIED RISKS", yPos + 2);
        yPos = await addField(ctx, "Risk Description", assessment.riskDescription || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section E - Risk Level
        yPos = await addSectionTitle(ctx, "SECTION E - RISK LEVEL", yPos + 2);
        const riskLevels = (assessment.riskLevels || []) as any[];
        if (riskLevels.length > 0) {
            const tableBody = riskLevels.map(rl => [
                rl.area === "OTHER_AREA" ? `Other (${assessment.otherArea || ""})` : rl.area,
                rl.level ? rl.level.toUpperCase() : "N/A",
                rl.notes || "N/A"
            ]);
            autoTable(doc, {
                startY: yPos,
                head: [['Area', 'Level', 'Notes']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                margin: { left: margin, right: margin }
            });
            yPos = (doc as any).lastAutoTable.finalY + 5;
        } else {
            yPos = await addField(ctx, "Risk Levels", "No specific risk levels provided", margin, yPos, pageWidth - margin * 2);
        }

        // Section F - Control Measures and Actions
        yPos = await addSectionTitle(ctx, "SECTION F - CONTROL MEASURES AND ACTIONS", yPos + 2);
        yPos = await addField(ctx, "Control Measures", assessment.controlMeasures || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section G - Equipment or Support Required
        const equipOptions = [
            "Walking aid", "Pressure-relieving mattress or cushion", "Bed rails",
            "Sensor mats or alarms", "Specialist diet or thickened fluids", "Increased supervision"
        ] as const;
        yPos = await renderYesNoList("SECTION G - EQUIPMENT OR SUPPORT REQUIRED", assessment.equipmentRequired, equipOptions, yPos + 2);
        if (assessment.otherEquipment) {
            yPos = await addField(ctx, "Other Equipment", assessment.otherEquipment, margin, yPos, pageWidth - margin * 2);
        }

        // Section H - Resident / Representative Involvement
        const involvementOptions = [
            "Resident involved in assessment", "Family or representative involved", "Resident unable to participate"
        ] as const;
        yPos = await renderYesNoList("SECTION H - RESIDENT / REPRESENTATIVE INVOLVEMENT", assessment.residentInvolvement, involvementOptions, yPos + 2);
        if (assessment.involvementComments) {
            yPos = await addField(ctx, "Comments", assessment.involvementComments, margin, yPos, pageWidth - margin * 2);
        }

        // Section I - Review and Monitoring
        const freqOptions = ["Weekly", "Monthly", "Quarterly", "After any incident"] as const;
        yPos = await renderYesNoList("SECTION I - REVIEW AND MONITORING", assessment.reviewFrequency, freqOptions, yPos + 2);
        if (assessment.otherFrequency) {
            yPos = await addField(ctx, "Other Frequency", assessment.otherFrequency, margin, yPos, pageWidth - margin * 2);
        }
        yPos = await addField(ctx, "Next Review Date", assessment.nextReviewDate ? format(new Date(assessment.nextReviewDate), "dd/MM/yyyy") : "N/A", margin, yPos, pageWidth - margin * 2);

        // Section J - Signatures
        yPos = await addSectionTitle(ctx, "SECTION J - SIGNATURES", yPos + 2);
        yPos = await ensureGeneralRiskSpace(30, yPos);
        const rowSigY = yPos;
        const ySig1 = await addField(ctx, "Assessor Signature", assessment.assessorSignature || "N/A", margin, rowSigY, cpWidth, true);
        const ySig2 = await addField(ctx, "Date", assessment.signatureDate ? format(new Date(assessment.signatureDate), "dd/MM/yyyy") : "N/A", cpCol2, rowSigY, cpWidth, true);
        yPos = Math.max(ySig1, ySig2);

        doc.save(`${resident?.last_name || "Resident"}_General_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Abbey Pain Tool Specialized Layout ---
    if (upperFormName.includes("ABBEY PAIN TOOL")) {
        const getScoreLabel = (score: unknown): string => {
            const numeric = typeof score === "number" ? score : Number(score ?? 0);
            if (numeric === 0) return "Absent (0)";
            if (numeric === 1) return "Mild (1)";
            if (numeric === 2) return "Moderate (2)";
            if (numeric === 3) return "Severe (3)";
            return `N/A (${String(score ?? "N/A")})`;
        };

        const formatDateValue = (value: unknown): string => {
            if (!value) return "N/A";
            const dateValue = new Date(value as string | number | Date);
            if (Number.isNaN(dateValue.getTime())) return "N/A";
            return format(dateValue, "dd/MM/yyyy");
        };

        // 1. Resident Information
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        yPos = await ensureSpace(ctx, 25, yPos);
        const rowResidentY = yPos;
        let yLeft = await addField(
            ctx,
            "Full Name",
            [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "),
            margin,
            rowResidentY,
            colWidth,
            true
        );
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        yLeft = await addField(ctx, "Date of Birth", dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A", margin, yLeft + 1, colWidth, true);
        yLeft = await addField(ctx, "NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, yLeft + 1, colWidth, true);

        let yRight = await addField(ctx, "Care Home", careHomeName || "N/A", col2, rowResidentY, colWidth, true);
        yRight = await addField(ctx, "Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, yRight + 1, colWidth, true);
        yRight = await addField(ctx, "Date Generated", format(new Date(), "dd/MM/yyyy"), col2, yRight + 1, colWidth, true);
        yPos = Math.max(yLeft, yRight) + 6;

        // 2. Past assessment history table, when provided
        if (Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle(ctx, "PAST ASSESSMENTS HISTORY", yPos);
            const historyRows = data.history.map((entry: Record<string, unknown>) => {
                const entryAssessment = (entry.assessment_data ?? entry) as Record<string, unknown>;
                const entryDate = entryAssessment.assessmentDate ?? entry.assessment_date ?? entry.created_at;
                return [
                    formatDateValue(entryDate),
                    String(entryAssessment.completedByName ?? entry.completed_by ?? entry.completedBy ?? "N/A"),
                    String(entryAssessment.completedByDesignation ?? "N/A"),
                    String(entryAssessment.completedBySignature ?? "N/A"),
                    getScoreLabel(entryAssessment.vocalization),
                    getScoreLabel(entryAssessment.facialExpression),
                    getScoreLabel(entryAssessment.bodyLanguage),
                    getScoreLabel(entryAssessment.physiologicalChanges),
                    getScoreLabel(entryAssessment.physicalChanges),
                    String(entryAssessment.typeOfPain ?? "N/A"),
                    String(entryAssessment.totalScore ?? 0),
                    String(entryAssessment.painClassification ?? "N/A")
                ];
            });

            autoTable(doc, {
                startY: yPos,
                head: [[
                    "Assessment Date",
                    "Completed By",
                    "Completed By Designation",
                    "Completed By Signature",
                    "Vocalization Score",
                    "Facial Expression Score",
                    "Body Language Score",
                    "Physiological Changes Score",
                    "Physical Changes Score",
                    "Type of Pain",
                    "Total Score",
                    "Pain Classification"
                ]],
                body: historyRows,
                theme: "grid",
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak" },
                margin: { left: margin, right: margin }
            });
        }

        doc.save(`${resident?.last_name || "Resident"}_Abbey_Pain_Tool_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Fall Risk Assessment Specialized Layout ---
    if (isFallRiskAssessment) {
        // Resident info section
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        yPos = await ensureSpace(ctx, 25, yPos);
        const rowFallY = yPos;
        let y1 = await addField(ctx, "Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, rowFallY, colWidth, true);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField(ctx, "Date of Birth", formattedDob, margin, y1 + 1, colWidth, true);
        y1 = await addField(ctx, "NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, y1 + 1, colWidth, true);

        let y2 = await addField(ctx, "Care Home", careHomeName || "N/A", col2, rowFallY, colWidth, true);
        y2 = await addField(ctx, "Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, y2 + 1, colWidth, true);
        y2 = await addField(ctx, "Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2 + 1, colWidth, true);

        yPos = Math.max(y1, y2) + 6;

        const FALL_RISK_OPTIONS: any = {
            age: [{ label: "86+", value: 3 }, { label: "81-85", value: 2 }, { label: "65-80", value: 1 }, { label: "Under 65", value: 0 }],
            gender: [{ label: "Female", value: 3 }, { label: "Male", value: 1 }],
            historyOfFalls: [{ label: "Recurrent falls in last 12 months", value: 3 }, { label: "Fall in last 12 months", value: 2 }, { label: "Fall more than 12 months ago", value: 1 }, { label: "Never Fallen", value: 0 }],
            mobilityLevel: [{ label: "Assistance of 1 +/- aid", value: 3 }, { label: "Assistance of 2 +/- aid", value: 2 }, { label: "Independent with walking aid", value: 1 }, { label: "Independent and safe unaided", value: 0 }, { label: "Immobile/Hoist", value: 0 }],
            balance: [{ label: "No", value: 3 }, { label: "Yes", value: 0 }],
            adlPersonal: [{ label: "Requires assistance", value: 2 }, { label: "Independent with equipment", value: 1 }, { label: "Independent & Safe", value: 0 }],
            adlDomestic: [{ label: "Requires assistance", value: 2 }, { label: "Independent with equipment", value: 1 }, { label: "Independent & Safe", value: 0 }],
            footwear: [{ label: "Unsafe", value: 3 }, { label: "Safe", value: 0 }],
            visionProblems: [{ label: "Yes", value: 3 }, { label: "No", value: 0 }],
            bladderBowel: [{ label: "Frequency", value: 3 }, { label: "Identified problems", value: 2 }, { label: "No identified problems", value: 0 }],
            environmentalRisks: [{ label: "Yes", value: 3 }, { label: "No", value: 0 }],
            socialRisks: [{ label: "Lives Alone", value: 3 }, { label: "Residential limited support", value: 2 }, { label: "24-hour care", value: 1 }],
            medicalConditions: [{ label: "Neurological/Postural/Cardiac/MuscularSkeletal/Fracture", value: 2 }, { label: "Listed conditions", value: 1 }, { label: "No identified medical conditions", value: 0 }],
            medicines: [{ label: "4 or more medicines", value: 3 }, { label: "Less than 4 medicines", value: 1 }, { label: "No medicines", value: 0 }],
            safetyAwareness: [{ label: "No", value: 3 }, { label: "Yes", value: 0 }],
            mentalState: [{ label: "Confused", value: 3 }, { label: "Orientated", value: 0 }]
        };

        const getPointValue = (field: string, label: string) => {
            const options = FALL_RISK_OPTIONS[field];
            if (!options) return 0;
            const option = options.find((o: any) => o.label === label);
            return option ? option.value : 0;
        };

        // History Table
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle(ctx, "PAST ASSESSMENTS HISTORY", yPos);

            autoTable(doc, {
                startY: yPos,
                head: [[
                    'Date of Assessment',
                    'Age',
                    'Gender',
                    'History of Falls',
                    'Present Level of Mobility',
                    'Balance (Can Resident Stand Unsupported)',
                    'Activities of Daily Living (Personal)',
                    'Activities of Daily Living (Domestic)',
                    'Footwear',
                    'Vision Problems',
                    'Bladder & Bowel Movement',
                    'Resident Environmental Risks',
                    'Social Risks',
                    'Medical Conditions',
                    'Medicines',
                    'Safety Awareness',
                    'Mental State',
                    'Total Score',
                    'Risk Level',
                    'Completed By'
                ]],
                body: data.history.map((h: any) => {
                    const det = h.assessment_details || {};
                    return [
                        format(new Date(h.assessment_date), "dd/MM"),
                        getPointValue('age', det.age),
                        getPointValue('gender', det.gender),
                        getPointValue('historyOfFalls', det.historyOfFalls),
                        getPointValue('mobilityLevel', det.mobilityLevel),
                        getPointValue('balance', det.balance),
                        getPointValue('adlPersonal', det.adlPersonal),
                        getPointValue('adlDomestic', det.adlDomestic),
                        getPointValue('footwear', det.footwear),
                        getPointValue('visionProblems', det.visionProblems),
                        getPointValue('bladderBowel', det.bladderBowel),
                        getPointValue('environmentalRisks', det.environmentalRisks),
                        getPointValue('socialRisks', det.socialRisks),
                        getPointValue('medicalConditions', det.medicalConditions),
                        getPointValue('medicines', det.medicines),
                        getPointValue('safetyAwareness', det.safetyAwareness),
                        getPointValue('mentalState', det.mentalState),
                        h.total_score || 0,
                        h.risk_level?.replace(" Risk", "") || "N/A",
                        h.completed_by || h.completedBy || "N/A"
                    ];
                }),
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94], fontSize: 7, valign: 'middle' },
                styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 18 },
                    17: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
                    18: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
                    19: { cellWidth: 20 }
                }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Current assessment details
        const hasCurrentData = data.total_score !== undefined || data.assessment_details;
        if (hasCurrentData) {
            yPos = await addSectionTitle(ctx, "CURRENT ASSESSMENT DETAILS", yPos);
            const assessmentDate = data.assessment_date || data.created_at || new Date();
            const completedBy = data.completed_by || data.completedBy || "N/A";

            let ay1 = await addField(ctx, "Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
            ay1 = await addField(ctx, "Total Score", `${data.total_score || 0} pts`, margin, ay1, colWidth);

            let ay2 = await addField(ctx, "Completed By", completedBy, col2, yPos, colWidth);
            ay2 = await addField(ctx, "Risk Level", data.risk_level || "N/A", col2, ay2, colWidth);

            const details = data.assessment_details || {};
            const breakdownData = Object.entries(details)
                .map(([k, v]) => {
                    const label = k.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\b\w/g, l => l.toUpperCase()).trim();
                    const score = getPointValue(k, String(v));
                    return [label, `${v} (${score} pts)`];
                });

            const tableRows: any[][] = [];
            for (let i = 0; i < breakdownData.length; i += 2) {
                const row = [
                    breakdownData[i][0], breakdownData[i][1],
                    breakdownData[i + 1] ? breakdownData[i + 1][0] : "",
                    breakdownData[i + 1] ? breakdownData[i + 1][1] : ""
                ];
                tableRows.push(row);
            }

            autoTable(doc, {
                startY: yPos,
                head: [['Category', 'Details', 'Category', 'Details']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 8 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        doc.save(`${resident?.last_name || "Resident"}_Fall_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Choking Risk Assessment Specialized Layout ---
    if (upperFormName.includes("CHOKING RISK ASSESSMENT")) {
        // 1. Resident Information (always first)
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        yPos = await ensureSpace(ctx, 25, yPos);
        const rowChokeY = yPos;
        let y1 = await addField(ctx, "Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, rowChokeY, colWidth, true);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField(ctx, "Date of Birth", formattedDob, margin, y1 + 1, colWidth, true);
        y1 = await addField(ctx, "NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, y1 + 1, colWidth, true);

        let y2 = await addField(ctx, "Care Home", careHomeName || "N/A", col2, rowChokeY, colWidth, true);
        y2 = await addField(ctx, "Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, y2 + 1, colWidth, true);
        y2 = await addField(ctx, "Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2 + 1, colWidth, true);

        yPos = Math.max(y1, y2) + 6;

        // Helper to calculate section score from risk_factors JSONB
        const calcSectionScore = (factors: any, keys: { [k: string]: number }) => {
            return Object.entries(keys).reduce((acc, [key, pts]) => {
                return factors?.[key] ? acc + pts : acc;
            }, 0);
        };

        // 2. Past Assessments History table
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle(ctx, "PAST ASSESSMENTS HISTORY", yPos);

            autoTable(doc, {
                startY: yPos,
                head: [[
                    'Assessment Date',
                    'Completed By',
                    'Respiratory Risks Score',
                    'At Risk Groups Score',
                    'Physical Risks Score',
                    'Eating Behaviours Risks Score',
                    'Risks Associated with Eating Score',
                    'Food Recognition Score',
                    'Medication Affecting Swallowing Score',
                    'Total Risk Score',
                    'Risk Level'
                ]],
                body: data.history.map((h: any) => {
                    const f = h.risk_factors || {};
                    const resp = calcSectionScore(f, { weakCough: 10, chestInfections: 10, breathingDifficulties: 10, knownToAspirate: 10, chokingHistory: 10, gurgledVoice: 10 });
                    const atRisk = calcSectionScore(f, { epilepsy: 4, cerebralPalsy: 4, dementia: 4, mentalHealth: 4, neurologicalConditions: 10, learningDisabilities: 10 });
                    const phys = calcSectionScore(f, { posturalProblems: 8, poorHeadControl: 8, tongueThrust: 8, chewingDifficulties: 8, slurredSpeech: 10, neckTrauma: 10 });
                    const behav = calcSectionScore(f, { eatsRapidly: 8, drinksRapidly: 8, eatsWhileCoughing: 8, drinksWhileCoughing: 8, crammingFood: 10, pocketingFood: 10, swallowingWithoutChewing: 10, wouldTakeFood: 4 });
                    const eating = calcSectionScore(f, { drinksIndependentlySafely: -2, eatsIndependentlySafely: -2, poorDentition: 8, fatigueAtMealtimes: 8, needsFoodCutting: 6, texturedModifiedDiet: 10, thickenedFluids: 10, specialistFeedingAids: 5, specialistDrinkingAids: 5 });
                    const recogn = calcSectionScore(f, { acceptAnyItem: 10, acceptAnyItemAndSwallow: 10 });
                    const med = calcSectionScore(f, { medicationAffectingSwallowing: 10 });
                    return [
                        format(new Date(h.assessment_date), "dd/MM/yyyy"),
                        h.completed_by || h.completedBy || "N/A",
                        resp, atRisk, phys, behav, eating, recogn, med,
                        h.total_score || 0,
                        h.risk_level || "N/A"
                    ];
                }),
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 7, cellPadding: 1.5 },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 18 },
                    1: { halign: 'left', cellWidth: 28 },
                    9: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
                    10: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
                }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // 3. Current assessment details
        const hasCurrentData = data.total_score !== undefined || data.risk_factors;
        if (hasCurrentData) {
            yPos = await addSectionTitle(ctx, "CURRENT ASSESSMENT DETAILS", yPos);
            const assessmentDate = data.assessment_date || data.created_at || new Date();
            const completedBy = data.completed_by || data.completedBy || "N/A";

            let ay1 = await addField(ctx, "Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
            ay1 = await addField(ctx, "Total Score", `${data.total_score || 0} pts`, margin, ay1, colWidth);
            ay1 = await addField(ctx, "Completed By", completedBy, margin, ay1, colWidth);

            const ay2 = await addField(ctx, "Risk Level", data.risk_level || "N/A", col2, yPos, colWidth);

            yPos = Math.max(ay1, ay2) + 10;

            const factors = data.risk_factors || {};
            const sectionBreakdownData = [
                ['Respiratory Risks', `${calcSectionScore(factors, { weakCough: 10, chestInfections: 10, breathingDifficulties: 10, knownToAspirate: 10, chokingHistory: 10, gurgledVoice: 10 })} pts`, 'At Risk Groups', `${calcSectionScore(factors, { epilepsy: 4, cerebralPalsy: 4, dementia: 4, mentalHealth: 4, neurologicalConditions: 10, learningDisabilities: 10 })} pts`],
                ['Physical Risks', `${calcSectionScore(factors, { posturalProblems: 8, poorHeadControl: 8, tongueThrust: 8, chewingDifficulties: 8, slurredSpeech: 10, neckTrauma: 10 })} pts`, 'Eating Behaviours', `${calcSectionScore(factors, { eatsRapidly: 8, drinksRapidly: 8, eatsWhileCoughing: 8, drinksWhileCoughing: 8, crammingFood: 10, pocketingFood: 10, swallowingWithoutChewing: 10, wouldTakeFood: 4 })} pts`],
                ['Eating Risks', `${calcSectionScore(factors, { drinksIndependentlySafely: -2, eatsIndependentlySafely: -2, poorDentition: 8, fatigueAtMealtimes: 8, needsFoodCutting: 6, texturedModifiedDiet: 10, thickenedFluids: 10, specialistFeedingAids: 5, specialistDrinkingAids: 5 })} pts`, 'Food Recognition', `${calcSectionScore(factors, { acceptAnyItem: 10, acceptAnyItemAndSwallow: 10 })} pts`],
                ['Medication', `${calcSectionScore(factors, { medicationAffectingSwallowing: 10 })} pts`, '', ''],
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Section', 'Score', 'Section', 'Score']],
                body: sectionBreakdownData,
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 9 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        doc.save(`${resident?.last_name || "Resident"}_Choking_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Diet Notification Specialized Layout (jsPDF) ---
    if (upperFormName.includes("DIET NOTIFICATION")) {
        const assessmentData = data.assessment_data || data;
        const dietaryPreferences = assessmentData.dietary_preferences || {};
        const foodConsistency = assessmentData.food_consistency || {};
        const fluidConsistency = assessmentData.fluid_consistency || {};
        const kitchenReview = assessmentData.kitchen_review || {};

        const toDate = (value: unknown) => {
            if (!value) return "N/A";
            const date = new Date(value as string | number | Date);
            if (Number.isNaN(date.getTime())) return "N/A";
            return format(date, "dd/MM/yyyy");
        };
        const yesNo = (value: unknown) => (value === true ? "Yes" : "No");

        yPos = await addSectionTitle(ctx, "ADMINISTRATIVE INFORMATION", yPos);
        yPos = await addField(ctx, "Resident Name", assessmentData.residentName || [resident?.first_name, resident?.last_name].filter(Boolean).join(" ") || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Room Number", assessmentData.roomNumber || assessmentData.bedroomNumber || resident?.room_number || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Completed By", assessmentData.completed_by || assessmentData.completedBy || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Print Name", assessmentData.print_name || assessmentData.printName || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Job Role", assessmentData.job_role || assessmentData.jobRole || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Signature", assessmentData.signature || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle(ctx, "DIETARY PREFERENCES & RISKS", yPos + 2);
        yPos = await addField(ctx, "Likes / Favourite Foods", dietaryPreferences.likesFavouriteFoods || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Dislikes", dietaryPreferences.dislikes || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Foods To Be Avoided", dietaryPreferences.foodsToBeAvoided || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Choking Risk", assessmentData.choking_risk || assessmentData.chokingRiskAssessment || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle(ctx, "MEAL & FLUID SPECIFICATIONS", yPos + 2);
        yPos = await addField(ctx, "Preferred Meal Size", assessmentData.preferred_meal_size || assessmentData.preferredMealSize || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Diet Type", dietaryPreferences.dietType || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Food Allergy Or Intolerance", dietaryPreferences.foodAllergyOrIntolerance || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle(ctx, "FOOD & FLUID CONSISTENCY", yPos + 2);
        yPos = await addField(ctx, "FOOD CONSISTENCY", "", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 7 Regular", yesNo(foodConsistency.level7Regular), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 7 Easy Chew", yesNo(foodConsistency.level7EasyChew), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 6 Soft & Bite Sized", yesNo(foodConsistency.level6SoftBiteSized), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 5 Minced & Moist", yesNo(foodConsistency.level5MincedMoist), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 4 Pureed", yesNo(foodConsistency.level4Pureed), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 3 Liquidised", yesNo(foodConsistency.level3Liquidised), margin, yPos, pageWidth - margin * 2);

        yPos = await addField(ctx, "FLUID CONSISTENCY", "", margin, yPos + 1, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 4 Extremely Thick", yesNo(fluidConsistency.level4ExtremelyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 3 Moderately Thick", yesNo(fluidConsistency.level3ModeratelyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 2 Mildly Thick", yesNo(fluidConsistency.level2MildlyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 1 Slightly Thick", yesNo(fluidConsistency.level1SlightlyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Level 0 Thin", yesNo(fluidConsistency.level0Thin), margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle(ctx, "KITCHEN REVIEW", yPos + 2);
        yPos = await addField(ctx, "Reviewer Print Name", kitchenReview.reviewerPrintName || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Reviewer Job Title", kitchenReview.reviewerJobTitle || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Reviewer Signature", kitchenReview.reviewerSignature || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Reviewer Date", toDate(kitchenReview.reviewerDate), margin, yPos, pageWidth - margin * 2);

        doc.save(`Diet-Notification-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Oral Assessment Specialized Layout ---
    if (upperFormName.includes("ORAL ASSESSMENT")) {
        // 1. Resident Information
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        yPos = await ensureSpace(ctx, 25, yPos);
        const rowOralY = yPos;
        let y1 = await addField(ctx, "Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, rowOralY, colWidth, true);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField(ctx, "Date of Birth", formattedDob, margin, y1 + 1, colWidth, true);
        y1 = await addField(ctx, "NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, y1 + 1, colWidth, true);

        let y2 = await addField(ctx, "Care Home", careHomeName || "N/A", col2, rowOralY, colWidth, true);
        y2 = await addField(ctx, "Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, y2 + 1, colWidth, true);
        y2 = await addField(ctx, "Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2 + 1, colWidth, true);

        yPos = Math.max(y1, y2) + 6;

        // 2. Current Assessment Details
        yPos = await addSectionTitle(ctx, "ASSESSMENT DETAILS", yPos);
        const assessmentDate = data.assessment_date || data.created_at || new Date();
        const completedBy = data.completed_by || data.completedBy || "N/A";

        let ay1 = await addField(ctx, "Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
        ay1 = await addField(ctx, "Completed By", completedBy, margin, ay1, colWidth);
        ay1 = await addField(ctx, "Normal Hygiene Routine", data.oral_hygiene_routine || "N/A", margin, ay1, pageWidth - margin * 2);

        yPos = ay1 + 5;

        // Dental Info
        const d = data.dental_info || {};
        yPos = await addSectionTitle(ctx, "DENTAL INFORMATION", yPos);
        let dy1 = await addField(ctx, "Registered with Dentist", d.isRegisteredWithDentist ? "Yes" : "No", margin, yPos, colWidth);
        if (d.isRegisteredWithDentist) {
            dy1 = await addField(ctx, "Last Seen", d.lastSeenByDentist || "N/A", margin, dy1, colWidth);
            dy1 = await addField(ctx, "Dentist Name", d.dentistName || "N/A", margin, dy1, colWidth);
            dy1 = await addField(ctx, "Contact", d.contactTelephone || "N/A", margin, dy1, colWidth);
            await addField(ctx, "Practice Address", d.dentalPracticeAddress || "N/A", col2, yPos, colWidth);
        }
        yPos = dy1 + 10;

        // Examination Findings & Symptoms
        const ef = data.exam_findings || {};
        const s = data.symptoms || {};
        yPos = await addSectionTitle(ctx, "EXAMINATION FINDINGS & SYMPTOMS", yPos);

        const cr = data.care_recommendations || {};
        const careText = (value: unknown) => {
            if (typeof value !== "string") return "N/A";
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : "N/A";
        };

        const examRows = [
            ["Lips: Dry/Cracked", ef.lipsDryCracked ? "Yes" : "No", careText(cr.lipsDryCrackedCare)],
            ["Tongue: Dry/Cracked", ef.tongueDryCracked ? "Yes" : "No", careText(cr.tongueDryCrackedCare)],
            ["Tongue: Ulceration/Soreness", ef.tongueUlceration ? "Yes" : "No", careText(cr.tongueUlcerationCare)],
            ["Saliva: Dry Mouth", ef.dryMouth ? "Yes" : "No", careText(cr.dryMouthCare)],
            ["Dentures: Top", ef.hasTopDenture ? "Yes" : "No", careText(cr.topDentureCare)],
            ["Dentures: Lower", ef.hasLowerDenture ? "Yes" : "No", careText(cr.lowerDentureCare)],
            ["Dentures & Natural Teeth", ef.hasDenturesAndNaturalTeeth ? "Yes" : "No", careText(cr.denturesAndNaturalTeethCare)],
            ["Teeth: Natural", ef.hasNaturalTeeth ? "Yes" : "No", careText(cr.naturalTeethCare)],
            ["Teeth: Plaque/Debris", ef.evidencePlaqueDebris ? "Yes" : "No", careText(cr.plaqueDebrisCare)],
            ["Pain: When eating/drinking", s.painWhenEating ? "Yes" : "No", careText(cr.painWhenEatingCare)],
            ["Gums: Soreness/Ulceration", s.gumsUlceration ? "Yes" : "No", careText(cr.gumsUlcerationCare)],
            ["Swallowing: Difficulty", s.difficultySwallowing ? "Yes" : "No", careText(cr.difficultySwallowingCare)],
            ["Nutrition: Poor intake", s.poorFluidDietaryIntake ? "Yes" : "No", careText(cr.poorFluidDietaryIntakeCare)],
            ["Dehydrated", s.dehydrated ? "Yes" : "No", careText(cr.dehydratedCare)],
            ["Speech: Dry mouth", s.speechDifficultyDryMouth ? "Yes" : "No", careText(cr.speechDifficultyDryMouthCare)],
            ["Speech: Dentures slipping", s.speechDifficultyDenturesSlipping ? "Yes" : "No", careText(cr.speechDifficultyDenturesSlippingCare)],
            ["Dexterity: Toothbrushing difficulty", s.dexterityProblems ? "Yes" : "No", careText(cr.dexterityProblemsCare)],
            ["Cognitive: Memory loss/confusion", s.cognitiveImpairment ? "Yes" : "No", careText(cr.cognitiveImpairmentCare)],
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Field / Symptom', 'Status', 'Suggested Care']],
            body: examRows,
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 72 },
                1: { cellWidth: 22, halign: 'center' },
                2: { cellWidth: 'auto' }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // 3. Evaluations Table (Latest 5) - Moved to End
        if (data.evaluations && Array.isArray(data.evaluations) && data.evaluations.length > 0) {
            yPos = await addSectionTitle(ctx, "ORAL EVALUATIONS HISTORY (LATEST 5)", yPos);

            autoTable(doc, {
                startY: yPos,
                head: [['Date', 'Completed By', 'Lip', 'Ton', 'Dnt', 'Tth', 'Sal', 'Pan', 'Gum', 'Swl', 'Nut', 'Spc', 'Dex', 'Cog']],
                body: data.evaluations.map((ev: any) => [
                    ev.evaluation_date ? format(new Date(ev.evaluation_date), "dd/MM") : "—",
                    ev.completed_by || "—",
                    ev.lips ? "Y" : "N",
                    ev.tongue ? "Y" : "N",
                    ev.dentures ? "Y" : "N",
                    ev.teeth ? "Y" : "N",
                    ev.saliva ? "Y" : "N",
                    ev.pain ? "Y" : "N",
                    ev.gums_soft_tissue ? "Y" : "N",
                    ev.swallowing ? "Y" : "N",
                    ev.nutrition ? "Y" : "N",
                    ev.speech_difficulty ? "Y" : "N",
                    ev.dexterity_problems ? "Y" : "N",
                    ev.cognitive_function ? "Y" : "N",
                ]),
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 7, cellPadding: 1 },
                columnStyles: {
                    0: { cellWidth: 12 },
                    1: { cellWidth: 20 },
                }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        doc.save(`${resident?.last_name || "Resident"}_Oral_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Braden Risk Assessment Specialized Layout ---
    if (upperFormName.includes("BRADEN RISK ASSESSMENT")) {
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        yPos = await ensureSpace(ctx, 25, yPos);
        const rowBradenY = yPos;
        let yB1 = await addField(ctx, "Full Name",
            data.residentName || [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" ") || "N/A",
            margin, rowBradenY, colWidth, true);
        yB1 = await addField(ctx, "Bedroom Number",
            data.bedroomNumber || data.bedroom_number || resident?.room_number || "N/A",
            margin, yB1 + 1, colWidth, true);

        let yB2 = await addField(ctx, "Care Home", careHomeName || "N/A",
            col2, rowBradenY, colWidth, true);
        yB2 = await addField(ctx, "Date Generated", format(new Date(), "dd/MM/yyyy"),
            col2, yB2 + 1, colWidth, true);

        yPos = Math.max(yB1, yB2) + 6;

        const bradenCategories = [
            { key: "sensoryPerception", label: "Sensory Perception", options: [
                { score: 1, label: "Completely Limited" }, { score: 2, label: "Very Limited" },
                { score: 3, label: "Slightly Limited" }, { score: 4, label: "No Impairment" },
            ]},
            { key: "moisture", label: "Moisture", options: [
                { score: 1, label: "Constantly Moist" }, { score: 2, label: "Very Moist" },
                { score: 3, label: "Occasionally Moist" }, { score: 4, label: "Rarely Moist" },
            ]},
            { key: "activity", label: "Activity", options: [
                { score: 1, label: "Bedfast" }, { score: 2, label: "Chairfast" },
                { score: 3, label: "Walks Occasionally" }, { score: 4, label: "Walks Frequently" },
            ]},
            { key: "mobility", label: "Mobility", options: [
                { score: 1, label: "Completely Immobile" }, { score: 2, label: "Very Limited" },
                { score: 3, label: "Slightly Limited" }, { score: 4, label: "No Limitation" },
            ]},
            { key: "nutrition", label: "Nutrition", options: [
                { score: 1, label: "Very Poor" }, { score: 2, label: "Probably Inadequate" },
                { score: 3, label: "Adequate" }, { score: 4, label: "Excellent" },
            ]},
            { key: "frictionShear", label: "Friction and Shear", options: [
                { score: 1, label: "Problem" }, { score: 2, label: "Potential Problem" },
                { score: 3, label: "No Apparent Problem" },
            ]},
        ];

        const getBradenOptionLabel = (categoryKey: string, scoreValue: string | number | undefined): string => {
            if (scoreValue === undefined || scoreValue === null || scoreValue === "") return "N/A";
            const cat = bradenCategories.find(c => c.key === categoryKey);
            if (!cat) return String(scoreValue);
            const numScore = typeof scoreValue === "string" ? parseInt(scoreValue) : scoreValue;
            const opt = cat.options.find(o => o.score === numScore);
            return opt ? `${opt.label} (${numScore})` : String(scoreValue);
        };

        const getBradenRiskLevel = (score: number): string => {
            if (score === 0) return "N/A";
            if (score < 13) return "High Risk";
            if (score <= 14) return "Moderate Risk";
            if (score <= 18) return "Low Risk";
            return "No Risk";
        };

        // Past Assessments History Table
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle(ctx, "PAST ASSESSMENTS HISTORY", yPos);

            autoTable(doc, {
                startY: yPos,
                head: [[
                    "Date of Assessment",
                    "Sensory Perception",
                    "Moisture",
                    "Activity",
                    "Mobility",
                    "Nutrition",
                    "Friction and Shear",
                    "Total Score",
                    "Risk Level",
                    "Completed By"
                ]],
                body: data.history.map((h: Record<string, unknown>) => {
                    const det = (h.assessment_details || {}) as Record<string, unknown>;
                    const scores = [
                        parseInt(String(det.sensoryPerception || "0")),
                        parseInt(String(det.moisture || "0")),
                        parseInt(String(det.activity || "0")),
                        parseInt(String(det.mobility || "0")),
                        parseInt(String(det.nutrition || "0")),
                        parseInt(String(det.frictionShear || "0")),
                    ];
                    const histTotal = scores.reduce((a, b) => a + b, 0);
                    return [
                        h.assessment_date ? format(new Date(h.assessment_date as string | number), "dd/MM/yyyy") : "N/A",
                        getBradenOptionLabel("sensoryPerception", det.sensoryPerception as string),
                        getBradenOptionLabel("moisture", det.moisture as string),
                        getBradenOptionLabel("activity", det.activity as string),
                        getBradenOptionLabel("mobility", det.mobility as string),
                        getBradenOptionLabel("nutrition", det.nutrition as string),
                        getBradenOptionLabel("frictionShear", det.frictionShear as string),
                        String(h.risk_score ?? histTotal),
                        (h.risk_level as string) || getBradenRiskLevel(histTotal),
                        (h.completed_by as string) || "N/A"
                    ];
                }),
                theme: "grid",
                headStyles: { fillColor: [34, 197, 94], fontSize: 7, fontStyle: "bold", valign: "middle" },
                styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
                columnStyles: {
                    0: { cellWidth: 20 },
                    7: { halign: "center", fontStyle: "bold", cellWidth: 14 },
                    8: { halign: "center", fontStyle: "bold", cellWidth: 18 },
                    9: { cellWidth: 22 }
                },
                margin: { left: margin, right: margin },
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        doc.save(`${resident?.last_name || "Resident"}_Braden_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Cornell Scale for Depression in Dementia Specialized Layout ---
    if (upperFormName.includes("CORNELL") && upperFormName.includes("DEPRESSION")) {
        const scaleItems = assessmentDataForSpecialized.scale_items || assessmentDataForSpecialized || {};
        const residentName = assessmentDataForSpecialized.residentName
            || [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" ")
            || "N/A";
        const dateOfBirth = resident?.date_of_birth || resident?.dateOfBirth || assessmentDataForSpecialized.dateOfBirth || "";
        const assessmentDate = assessmentDataForSpecialized.assessment_date || assessmentDataForSpecialized.dateOfAssessment || "";
        const assessedBy = assessmentDataForSpecialized.completed_by || assessmentDataForSpecialized.assessedBy || "N/A";
        const signature = scaleItems.signature || assessmentDataForSpecialized.signature || "N/A";
        const totalScore = assessmentDataForSpecialized.total_score ?? 0;
        const severityLevel = assessmentDataForSpecialized.severity_level || "No Depression";

        const formatDateSafe = (val: string | number | undefined): string => {
            if (!val) return "N/A";
            try {
                return format(new Date(val), "dd/MM/yyyy");
            } catch {
                return String(val);
            }
        };

        const ratingLabel = (val: string | undefined): string => {
            if (val === undefined || val === null || val === "") return "Not Rated";
            switch (val) {
                case "a": return "a - Unable to evaluate";
                case "0": return "0 - Absent";
                case "1": return "1 - Mild/Intermittent";
                case "2": return "2 - Severe";
                default: return String(val);
            }
        };

        const ratingNumeric = (val: string | undefined): string => {
            if (val === undefined || val === null || val === "") return "-";
            return val;
        };

        // Resident Information
        yPos = await addSectionTitle(ctx, "Resident Information", yPos);
        yPos = await ensureSpace(ctx, 25, yPos);
        const riY = yPos;
        let riLeft = await addField(ctx, "Resident Name", residentName, margin, riY, colWidth, true);
        riLeft = await addField(ctx, "Date of Birth", formatDateSafe(dateOfBirth), margin, riLeft + 1, colWidth, true);

        let riRight = await addField(ctx, "Care Home", careHomeName || "N/A", col2, riY, colWidth, true);
        riRight = await addField(ctx, "Date of Assessment", formatDateSafe(assessmentDate), col2, riRight + 1, colWidth, true);
        yPos = Math.max(riLeft, riRight) + 4;
        yPos = await addField(ctx, "Assessed By", assessedBy, margin, yPos, fullWidth);

        // Score Summary
        yPos = await addSectionTitle(ctx, "Score Summary", yPos + 2);
        yPos = await ensureSpace(ctx, 20, yPos);
        const scoreY = yPos;
        const scoreLeft = await addField(ctx, "Total Score", String(totalScore), margin, scoreY, colWidth, true);
        const scoreRight = await addField(ctx, "Severity Level", severityLevel, col2, scoreY, colWidth, true);
        yPos = Math.max(scoreLeft, scoreRight) + 2;
        yPos = await addField(ctx, "Interpretation Guide", "0-7 = No Depression  |  8-12 = Mild Depression  |  13+ = Major Depression", margin, yPos, fullWidth);

        const cornellSections = [
            {
                title: "A. Mood-Related Signs",
                items: [
                    { key: "anxiety", label: "Anxiety" },
                    { key: "sadness", label: "Sadness" },
                    { key: "lackOfReactivity", label: "Lack of Reactivity to Pleasant Events" },
                    { key: "irritability", label: "Irritability" },
                ],
            },
            {
                title: "B. Behavioral Disturbance",
                items: [
                    { key: "agitation", label: "Agitation" },
                    { key: "retardation", label: "Retardation (slowing of movement, speech, reaction)" },
                    { key: "multiplePhysicalComplaints", label: "Multiple Physical Complaints" },
                    { key: "lossOfInterest", label: "Loss of Interest" },
                ],
            },
            {
                title: "C. Physical Signs",
                items: [
                    { key: "appetiteLoss", label: "Appetite Loss" },
                    { key: "weightLoss", label: "Weight Loss" },
                    { key: "lackOfEnergy", label: "Lack of Energy" },
                ],
            },
            {
                title: "D. Cyclic Functions",
                items: [
                    { key: "diurnalVariation", label: "Diurnal variation of mood; symptoms worse in the morning" },
                    { key: "difficultyFallingAsleep", label: "Difficulty falling asleep; later than usual for this individual" },
                    { key: "multipleAwakenings", label: "Multiple awakenings during sleep" },
                    { key: "earlyMorningAwakening", label: "Early morning awakening; earlier than usual for this individual" },
                ],
            },
            {
                title: "E. Ideational Disturbance",
                items: [
                    { key: "suicidalIdeation", label: "Suicidal Ideation" },
                    { key: "lowSelfEsteem", label: "Low Self-Esteem" },
                    { key: "pessimism", label: "Pessimism" },
                    { key: "moodCongruentDelusions", label: "Mood-Congruent Delusions" },
                ],
            },
        ];

        // Rating legend
        yPos = await ensureSpace(ctx, 10, yPos + 4);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(107, 114, 128);
        doc.text("Rating Key:  a = Unable to evaluate  |  0 = Absent  |  1 = Mild/Intermittent  |  2 = Severe", margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        for (const section of cornellSections) {
            yPos = await ensureSpace(ctx, 20 + section.items.length * 9, yPos);
            yPos = await addSectionTitle(ctx, section.title, yPos);

            autoTable(doc, {
                startY: yPos,
                head: [["Assessment Item", "Rating", "Description"]],
                body: section.items.map(item => [
                    item.label,
                    ratingNumeric(scaleItems[item.key]),
                    ratingLabel(scaleItems[item.key]),
                ]),
                theme: "grid",
                headStyles: {
                    fillColor: [34, 197, 94],
                    fontSize: 8,
                    fontStyle: "bold",
                    valign: "middle",
                    textColor: [255, 255, 255],
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2.5,
                    overflow: "linebreak",
                    textColor: [17, 24, 39],
                },
                columnStyles: {
                    0: { cellWidth: fullWidth * 0.45 },
                    1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
                    2: { cellWidth: fullWidth * 0.55 - 18 },
                },
                margin: { left: margin, right: margin },
            });
            yPos = (doc as any).lastAutoTable.finalY + 6;
        }

        // Completion section
        yPos = await addSectionTitle(ctx, "Completion", yPos + 2);
        yPos = await ensureSpace(ctx, 25, yPos);
        const compY = yPos;
        const compLeft = await addField(ctx, "Assessed By", assessedBy, margin, compY, colWidth, true);
        const compRight = await addField(ctx, "Signature", signature, col2, compY, colWidth, true);
        yPos = Math.max(compLeft, compRight) + 4;
        yPos = await addField(ctx, "Assessment Date", formatDateSafe(assessmentDate), margin, yPos, fullWidth);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(`Generated by CareO System on ${new Date().toLocaleString('en-GB')}`, margin, doc.internal.pageSize.height - 10);

        doc.save(`Cornell_Depression_Scale_${resident?.last_name || "Resident"}_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Smoking Risk Assessment Specialized Layout ---
    if (upperFormName.includes("SMOKING RISK ASSESSMENT")) {
        const smokingBoolToYesNo = (val: unknown): string => {
            if (val === true) return 'Yes';
            if (val === false) return 'No';
            return 'No';
        };
        const smokingSafeStr = (val: unknown): string => {
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return val;
            return String(val);
        };
        const smokingGet = (snake: string, camel: string): unknown =>
            assessmentDataForSpecialized[snake] ?? assessmentDataForSpecialized[camel];

        type SmokingQuestionRow = [string, string, string];

        const smokingTableHead: [string, string, string][] = [['INFORMATION TO CONSIDER', 'YES / NO', 'DETAILS / ACTION']];
        const smokingTableConfig = {
            theme: 'grid' as const,
            headStyles: {
                fillColor: [34, 197, 94] as [number, number, number],
                textColor: [255, 255, 255] as [number, number, number],
                fontSize: 8,
                fontStyle: 'bold' as const
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 3,
                valign: 'top' as const,
                overflow: 'linebreak' as const
            },
            columnStyles: {
                0: { cellWidth: 85 },
                1: { cellWidth: 18, halign: 'center' as const, fontStyle: 'bold' as const },
                2: { cellWidth: 'auto' as const }
            }
        };

        const renderSmokingSubheading = (text: string, y: number) => {
            doc.setFontSize(7);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(107, 114, 128);
            const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
            doc.text(lines, margin, y + 2);
            return y + 2 + (lines.length * 3) + 2;
        };

        // Set yPos back to start
        let currentY = 30;

        // -- SECTION 1: IGNITION SOURCES --
        currentY = await addSectionTitle(ctx, "IGNITION SOURCES", currentY);
        currentY = renderSmokingSubheading(
            "e.g. lighters, matches, cigarettes, vaporisers and chargers.",
            currentY
        );

        const ignitionRows: SmokingQuestionRow[] = [
            [
                "Are the Resident's smoking materials controlled by the Home? If 'Yes', detail where they are secured and who is designated as the Responsible Person.",
                smokingBoolToYesNo(smokingGet('materials_controlled', 'materialsControlled')),
                smokingSafeStr(smokingGet('materials_controlled_details', 'materialsControlledDetails'))
            ],
            [
                "Does the Resident require assistance to light smoking materials or use vaporiser? If 'Yes', detail what assistance is required and by whom?",
                smokingBoolToYesNo(smokingGet('assistance_lighting', 'assistanceLighting')),
                smokingSafeStr(smokingGet('assistance_lighting_details', 'assistanceLightingDetails'))
            ],
            [
                "Is the Resident given only one cigarette or vaporiser at any given time? If 'Yes', detail how this controlled and by whom?",
                smokingBoolToYesNo(smokingGet('one_cigarette_at_time', 'oneCigaretteAtTime')),
                smokingSafeStr(smokingGet('one_cigarette_at_time_details', 'oneCigaretteAtTimeDetails'))
            ],
            [
                "Does the Resident require supervision whilst in a smoking room/area? If 'Yes' detail who by and what level of supervision is required.",
                smokingBoolToYesNo(smokingGet('supervision_required', 'supervisionRequired')),
                smokingSafeStr(smokingGet('supervision_details', 'supervisionDetails'))
            ]
        ];

        autoTable(doc, {
            startY: currentY,
            head: smokingTableHead,
            body: ignitionRows,
            ...smokingTableConfig
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // -- SECTION 2: THE SMOKING ENVIRONMENT --
        currentY = await addSectionTitle(ctx, "THE SMOKING ENVIRONMENT", currentY);
        currentY = renderSmokingSubheading(
            "Only designated rooms / areas can be used for smoking.",
            currentY
        );

        const envRows: SmokingQuestionRow[] = [
            [
                "Are smoking rooms/areas checked regularly to ensure fire hazards are minimised?",
                smokingBoolToYesNo(smokingGet('environment_checked', 'environmentChecked')),
                smokingSafeStr(smokingGet('environment_checked_details', 'environmentCheckedDetails'))
            ],
            [
                "Are deep / safety ashtrays available in designated smoking areas?",
                smokingBoolToYesNo(smokingGet('safety_ashtrays', 'safetyAshtrays')),
                smokingSafeStr(smokingGet('safety_ashtrays_details', 'safetyAshtraysDetails'))
            ]
        ];

        autoTable(doc, {
            startY: currentY,
            head: smokingTableHead,
            body: envRows,
            ...smokingTableConfig
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // -- SECTION 3: RESIDENT ABILITY & DEMENTIA --
        currentY = await addSectionTitle(ctx, "RESIDENT ABILITY & DEMENTIA", currentY);
        currentY = renderSmokingSubheading(
            "Assess memory, coordination, and behavior.",
            currentY
        );

        const abilityRows: SmokingQuestionRow[] = [
            [
                "Does the resident have cognitive impairment affecting safety?",
                smokingBoolToYesNo(smokingGet('cognitive_impairment', 'cognitiveImpairment')),
                smokingSafeStr(smokingGet('cognitive_impairment_details', 'cognitiveImpairmentDetails'))
            ],
            [
                "Does the resident try to smoke in non-designated areas?",
                smokingBoolToYesNo(smokingGet('smoke_non_designated', 'smokeNonDesignated')),
                smokingSafeStr(smokingGet('smoke_non_designated_details', 'smokeNonDesignatedDetails'))
            ]
        ];

        autoTable(doc, {
            startY: currentY,
            head: smokingTableHead,
            body: abilityRows,
            ...smokingTableConfig
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // -- SECTION 4: CLOTHING & CONTROLS --
        currentY = await addSectionTitle(ctx, "CLOTHING & CONTROLS", currentY);
        const clothingRows: SmokingQuestionRow[] = [
            [
                "Is the resident provided with a flame-retardant smoking apron?",
                smokingBoolToYesNo(smokingGet('smoking_apron', 'smokingApron')),
                smokingSafeStr(smokingGet('smoking_apron_details', 'smokingApronDetails'))
            ]
        ];

        autoTable(doc, {
            startY: currentY,
            head: smokingTableHead,
            body: clothingRows,
            ...smokingTableConfig
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // -- SECTION 5: SIGNATURES --
        currentY = await addSectionTitle(ctx, "COMPLETED BY", currentY);
        const signY = await addField(ctx, "Assessor Name", smokingSafeStr(smokingGet('assessor_name', 'assessorName')), margin, currentY, cpWidth, true);
        const signDate = smokingGet('assessment_date', 'assessmentDate');
        const signDateFmt = signDate ? format(new Date(signDate as string | number), "dd/MM/yyyy") : 'N/A';
        await addField(ctx, "Date", signDateFmt, col2, currentY, cpWidth, true);
        currentY = signY + 10;

        // -- SECTION 6: RISK REVIEW FREQUENCY --
        currentY = await addSectionTitle(ctx, "RISK REVIEW FREQUENCY", currentY);
        currentY = await ensureSpace(ctx, 7, currentY);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        doc.text("This risk assessment will be reviewed:", margin, currentY + 2);
        currentY += 7;

        autoTable(doc, {
            startY: currentY,
            head: [['REVIEW CRITERIA', 'YES / NO']],
            body: [
                ['Monthly', smokingBoolToYesNo(smokingGet('risk_review_monthly', 'riskReviewMonthly'))],
                ["Upon any significant change in the resident's condition", smokingBoolToYesNo(smokingGet('risk_review_on_condition_change', 'riskReviewOnConditionChange'))],
                ['In the event of a smoking related incident', smokingBoolToYesNo(smokingGet('risk_review_on_incident', 'riskReviewOnIncident'))]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: [34, 197, 94] as [number, number, number],
                textColor: [255, 255, 255] as [number, number, number],
                fontSize: 8,
                fontStyle: 'bold' as const
            },
            styles: { fontSize: 8, cellPadding: 3, valign: 'top' as const },
            columnStyles: {
                0: { cellWidth: 'auto' as const },
                1: { cellWidth: 25, halign: 'center' as const, fontStyle: 'bold' as const }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // -- SECTION 7: RELATIVES / VISITORS AWARENESS --
        currentY = await addSectionTitle(ctx, "RELATIVES / VISITORS AWARENESS", currentY);
        const smokingFullWidth = pageWidth - margin * 2;

        currentY = await addField(
            ctx,
            "Have relatives/visitors been made aware of the content of this risk assessment and of the risk to the resident while smoking?",
            smokingBoolToYesNo(smokingGet('relatives_aware', 'relativesAware')),
            margin, currentY, smokingFullWidth
        );
        currentY += 2;

        const relDateRaw = smokingGet('relatives_awareness_date', 'relativesAwarenessDate');
        const relDateFormatted = relDateRaw
            ? new Date(relDateRaw as string | number).toLocaleDateString('en-GB')
            : 'N/A';
        const relTime = smokingSafeStr(smokingGet('relatives_awareness_time', 'relativesAwarenessTime')) || 'N/A';

        const relY1 = await addField(ctx, "Date of Meeting", relDateFormatted, margin, currentY, cpWidth);
        const relY2 = await addField(ctx, "Time of Meeting", relTime, col2, currentY, cpWidth);
        currentY = Math.max(relY1, relY2) + 6;

        doc.save(`${resident?.last_name || "Resident"}_Smoking_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Resident Handling Profile Specialized Layout ---
    if (upperFormName.includes("RESIDENT HANDLING PROFILE")) {
        const dataObj = data.assessment_data || data || {};

        const formatResidentHandlingDate = (value: unknown): string => {
            if (value === null || value === undefined || value === "") return "N/A";
            const parsed = new Date(value as string | number | Date);
            return Number.isNaN(parsed.getTime()) ? "N/A" : format(parsed, "dd/MM/yyyy");
        };

        // 1. Resident Information
        const infoY1 = await addField(ctx, "Bedroom Number", dataObj.bedroomNumber || dataObj.bedroom_number || resident?.room_number || "N/A", margin, yPos, cpWidth, true);
        const infoY2 = await addField(ctx, "Weight (kg)", dataObj.weight !== undefined ? String(dataObj.weight) : "N/A", col2, yPos, cpWidth, true);
        yPos = Math.max(infoY1, infoY2) + 1;

        const infoY3 = await addField(ctx, "Weight Bearing", dataObj.weightBearing || dataObj.weight_bearing || "N/A", margin, yPos, cpWidth);
        yPos = infoY3 + 6;

        // 2. Activities in specific order
        const activities = dataObj.activities || {};
        const activityOrder = [
            { key: "transferBed", label: "Transfer to or from Bed" },
            { key: "transferChair", label: "Transfer to or from Chair" },
            { key: "walking", label: "Walking" },
            { key: "toileting", label: "Toileting" },
            { key: "movementInBed", label: "Movement in Bed" },
            { key: "bath", label: "Bathing" },
            { key: "outdoorMobility", label: "Outdoor Mobility" }
        ];

        for (const item of activityOrder) {
            const act = activities[item.key];
            if (act) {
                yPos = await addSectionTitle(ctx, item.label.toUpperCase(), yPos);
                
                const actY1 = await addField(ctx, "Number of staff required", act.nStaff !== undefined ? String(act.nStaff) : "0", margin, yPos, cpWidth, true);
                const actY2 = await addField(ctx, "Equipment", act.equipment || "N/A", col2, yPos, cpWidth, true);
                yPos = Math.max(actY1, actY2) + 1;

                yPos = await addField(ctx, "Handling Plan", act.handlingPlan || "N/A", margin, yPos, pageWidth - margin * 2);
                yPos = await addField(ctx, "Date for Review", formatResidentHandlingDate(act.dateForReview), margin, yPos, cpWidth);
                yPos += 4;
            }
        }

        // 3. Completed By
        yPos = await addSectionTitle(ctx, "COMPLETED BY", yPos);
        const compY1 = await addField(ctx, "Name", dataObj.completedBy || dataObj.completed_by || "N/A", margin, yPos, cpWidth, true);
        const compY2 = await addField(ctx, "Job Role", dataObj.jobRole || dataObj.job_role || "N/A", col2, yPos, cpWidth, true);
        yPos = Math.max(compY1, compY2) + 1;

        const assessmentDate = dataObj.date || dataObj.assessment_date || dataObj.created_at;
        yPos = await addField(ctx, "Date", formatResidentHandlingDate(assessmentDate), margin, yPos, cpWidth);

        doc.save(`${resident?.last_name || "Resident"}_Resident_Handling_Profile_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Bedrail Risk Assessment Layout ---
    const isBedRailsRiskAssessmentForm =
        upperFormName.includes("BEDRAIL RISK ASSESSMENT") ||
        upperFormName.includes("BED RAIL RISK ASSESSMENT") ||
        upperFormName.includes("RISK ASSESSMENT FOR USE OF BED RAILS");

    if (isBedRailsRiskAssessmentForm) {
        const valueFromPath = (source: Record<string, unknown>, path: string): unknown => {
            return path.split(".").reduce<unknown>((acc, part) => {
                if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
                    return (acc as Record<string, unknown>)[part];
                }
                return undefined;
            }, source);
        };

        const pickPath = (source: Record<string, unknown>, paths: string[]): unknown => {
            for (const path of paths) {
                const val = valueFromPath(source, path);
                if (val !== undefined && val !== null) return val;
            }
            return undefined;
        };

        const details = (data.assessment_details || data.assessmentDetails || data.assessment_data || data) as Record<string, unknown>;
        const bedrailFullWidth = pageWidth - margin * 2;
        const displayVal = (value: unknown): string => {
            if (value === null || value === undefined) return "Not provided";
            if (typeof value === "string") return value.trim() ? value : "Not provided";
            return String(value);
        };
        const yesNoVal = (value: unknown): string => (value === true ? "Yes" : "No");

        yPos = await addSectionTitle(ctx, "Section 1 — Key Considerations", yPos);
        
        const considerations = [
            { label: "1. Is the resident using bed rails?", key: ["usingBedrails", "using_bedrails"] },
            { label: "2. Has a risk assessment been completed?", key: ["riskAssessmentCompleted", "risk_assessment_completed"] },
            { label: "3. Have alternative solutions been tried?", key: ["alternativesTried", "alternatives_tried"] },
            { label: "4. Is the bed height adjustable?", key: ["bedHeightAdjustable", "bed_height_adjustable"] },
            { label: "5. Are bumpers in use?", key: ["bumpersInUse", "bumpers_in_use"] },
            { label: "6. Is there a risk of entrapment?", key: ["riskOfEntrapment", "risk_of_entrapment"] }
        ];

        for (const item of considerations) {
            yPos = await addField(ctx, item.label, yesNoVal(pickPath(details, item.key)), margin, yPos, bedrailFullWidth);
        }

        yPos = await addSectionTitle(ctx, "Section 2 — Signatures & Dates", yPos + 2);
        yPos = await ensureSpace(ctx, 35, yPos);
        const sigRowY = yPos;
        let ySig1 = await addField(ctx, "Assessor Name", displayVal(pickPath(details, ["assessorName", "assessor_name"])), margin, sigRowY, cpWidth, true);
        ySig1 = await addField(ctx, "Assessor Signature", displayVal(pickPath(details, ["assessorSignature", "assessor_signature"])), margin, ySig1, cpWidth, true);

        const aDate = pickPath(details, ["assessmentDate", "assessment_date", "date"]);
        const ySig2 = await addField(ctx, "Assessment Date", aDate ? format(new Date(aDate as string | number), "dd/MM/yyyy") : "N/A", col2, sigRowY, cpWidth, true);
        yPos = Math.max(ySig1, ySig2);

        doc.save(`${resident?.last_name || "Resident"}_Bedrail_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Infection Prevention specialized Layout ---
    if (upperFormName.includes("INFECTION PREVENTION CONTROL") || upperFormName.includes("INFECTION PREVENTION")) {
        const assessmentData = data.assessment_data || data;
        const details = assessmentData.assessment_details || assessmentData.assessmentDetails || {};
        const exposure = assessmentData.exposure_risk || {};

        // 1. Admission Details
        yPos = await addSectionTitle(ctx, "ADMISSION DETAILS", yPos);
        yPos = await ensureSpace(ctx, 45, yPos);
        const rowAdmY = yPos;
        let yAdm1 = await addField(ctx, "Admitted From", details.admittedFrom || "N/A", margin, rowAdmY, colWidth, true);
        yAdm1 = await addField(ctx, "Is MRSA Screening History Available?", details.mrsaScreeningHistory ? "Yes" : "No", margin, yAdm1 + 1, colWidth, true);
        yAdm1 = await addField(ctx, "Any Alerts?", details.anyAlerts ? "Yes" : "No", margin, yAdm1 + 1, colWidth, true);

        let yAdm2 = await addField(ctx, "Type of Admission", details.admissionType || "N/A", col2, rowAdmY, colWidth, true);
        yAdm2 = await addField(ctx, "Date of Screening", details.screeningDate ? format(new Date(details.screeningDate), "dd/MM/yyyy") : "N/A", col2, yAdm2 + 1, colWidth, true);
        yAdm2 = await addField(ctx, "Screening Details", details.screeningDetails || "N/A", col2, yAdm2 + 1, colWidth, true);
        yPos = Math.max(yAdm1, yAdm2);

        // 2. Exposure & Exposure History
        yPos = await addSectionTitle(ctx, "EXPOSURE & EXPOSURE HISTORY", yPos + 2);
        yPos = await ensureSpace(ctx, 40, yPos);
        const rowExpY = yPos;
        let yExp1 = await addField(ctx, "Exposed to Infection?", exposure.exposedToInfection ? "Yes" : "No", margin, rowExpY, colWidth, true);
        yExp1 = await addField(ctx, "Exposed Details", exposure.exposedDetails || "N/A", margin, yExp1 + 1, colWidth, true);

        let yExp2 = await addField(ctx, "Traveled Abroad (12m)?", exposure.travelledAbroad ? "Yes" : "No", col2, rowExpY, colWidth, true);
        yExp2 = await addField(ctx, "Travel Details", exposure.travelDetails || "N/A", col2, yExp2 + 1, colWidth, true);
        yPos = Math.max(yExp1, yExp2);

        // 3. Clinical Symptoms
        yPos = await addSectionTitle(ctx, "CLINICAL SYMPTOMS", yPos + 2);
        const symptoms = assessmentData.symptoms || {};
        yPos = await addField(ctx, "Unexplained Pyrexia (37.5°C+)", symptoms.pyrexia ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Cough / Spitting blood", symptoms.coughSpittingBlood ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Indwelling Devices (Urinary Catheter, Line etc.)", symptoms.indwellingDevices ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Skin Breakdown (Rashes, Wounds etc.)", symptoms.skinBreakdown ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);

        // 4. Diarrhoea & Vomiting
        yPos = await addSectionTitle(ctx, "DIARRHOEA & VOMITING (D/V)", yPos + 2);
        const dv = assessmentData.symptoms?.diarrheaVomiting || {};
        yPos = await addField(ctx, "D/V Symptoms (Infection Not Confirmed)", dv.currentSymptoms ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Contact with D/V (72h)", dv.contactWithOthers ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Family with D/V (72h)", dv.familyHistory72h ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);

        // 5. Clostridium Difficile
        yPos = await addSectionTitle(ctx, "CLOSTRIDIUM DIFFICILE", yPos + 2);
        const clostridium = assessmentData.symptoms?.clostridium || {};
        const cRow1Y = yPos;
        const cY1 = await addField(ctx, "Active C. Diff", clostridium.active ? "Yes" : "No", margin, cRow1Y, colWidth, true);
        const cY2 = await addField(ctx, "History of C. Diff", clostridium.history ? "Yes" : "No", col2, cRow1Y, colWidth, true);
        yPos = Math.max(cY1, cY2) + 2;

        const cRow2Y = yPos;
        const cY3 = await addField(ctx, "Stool Count (72h)", clostridium.stoolCount72h || "N/A", margin, cRow2Y, colWidth, true);
        const cY4 = await addField(ctx, "Last Positive Specimen", clostridium.lastPositiveSpecimenDate ? format(new Date(clostridium.lastPositiveSpecimenDate), "dd/MM/yyyy") : "N/A", col2, cRow2Y, colWidth, true);
        yPos = Math.max(cY3, cY4) + 2;

        const cRow3Y = yPos;
        const cY5 = await addField(ctx, "Specimen Result", clostridium.result || "N/A", margin, cRow3Y, colWidth, true);
        const cY6 = await addField(ctx, "Treatment Complete", clostridium.treatmentComplete ? "Yes" : "No", col2, cRow3Y, colWidth, true);
        yPos = Math.max(cY5, cY6) + 2;
        yPos = await addField(ctx, "Treatment Received", clostridium.treatmentReceived || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addField(ctx, "Ongoing Antibiotic Details", clostridium.ongoingDetails || "N/A", margin, yPos + 2, pageWidth - margin * 2);
        const cRow4Y = yPos;
        const cY7 = await addField(ctx, "Date Commenced", clostridium.ongoingDateCommenced ? format(new Date(clostridium.ongoingDateCommenced), "dd/MM/yyyy") : "N/A", margin, cRow4Y, colWidth, true);
        const cY8 = await addField(ctx, "Length of Course", clostridium.ongoingLengthOfCourse || "N/A", col2, cRow4Y, colWidth, true);
        yPos = Math.max(cY7, cY8) + 2;
        yPos = await addField(ctx, "Follow-up Required", clostridium.ongoingFollowUpRequired || "N/A", margin, yPos, pageWidth - margin * 2);

        // 6. MRSA / MSSA Status
        yPos = await addSectionTitle(ctx, "MRSA / MSSA STATUS", yPos + 2);
        const mrsa = assessmentData.symptoms?.mrsa || {};
        const mRow1Y = yPos;
        const mY1 = await addField(ctx, "Colonised", mrsa.colonised ? "Yes" : "No", margin, mRow1Y, colWidth, true);
        const mY2 = await addField(ctx, "Infected", mrsa.infected ? "Yes" : "No", col2, mRow1Y, colWidth, true);
        yPos = Math.max(mY1, mY2) + 2;

        const mRow2Y = yPos;
        const mY3 = await addField(ctx, "Sites Positive", mrsa.sitesPositive || "N/A", margin, mRow2Y, colWidth, true);
        const mY4 = await addField(ctx, "Last Positive Swab", mrsa.lastPositiveSwabDate ? format(new Date(mrsa.lastPositiveSwabDate), "dd/MM/yyyy") : "N/A", col2, mRow2Y, colWidth, true);
        yPos = Math.max(mY3, mY4) + 2;

        const mRow3Y = yPos;
        const mY5 = await addField(ctx, "Treatment Received", mrsa.treatmentReceived || "N/A", margin, mRow3Y, colWidth, true);
        const mY6 = await addField(ctx, "Treatment Complete", mrsa.treatmentComplete ? "Yes" : "No", col2, mRow3Y, colWidth, true);
        yPos = Math.max(mY5, mY6) + 2;

        yPos = await addField(ctx, "Decolonisation Details", mrsa.mrsaMssaDetails || "N/A", margin, yPos + 2, pageWidth - margin * 2);
        const mRow4Y = yPos;
        const mY7 = await addField(ctx, "Date Commenced", mrsa.mrsaMssaDateCommenced ? format(new Date(mrsa.mrsaMssaDateCommenced), "dd/MM/yyyy") : "N/A", margin, mRow4Y, colWidth, true);
        const mY8 = await addField(ctx, "Duration", mrsa.mrsaMssaLengthOfCourse || "N/A", col2, mRow4Y, colWidth, true);
        yPos = Math.max(mY7, mY8) + 2;
        yPos = await addField(ctx, "Follow-up Required", mrsa.mrsaMssaFollowUpRequired || "N/A", margin, yPos, pageWidth - margin * 2);

        // 7. Multi-drug Resistant Organisms (MDRO)
        yPos = await addSectionTitle(ctx, "MULTI-DRUG RESISTANT ORGANISMS (MDRO)", yPos + 2);
        const mdro = assessmentData.symptoms?.multiDrugResistance || {};
        const mdroRow1Y = yPos;
        const mdroY1 = await addField(ctx, "ESBL", mdro.esbl ? "Yes" : "No", margin, mdroRow1Y, colWidth / 2, true);
        const mdroY2 = await addField(ctx, "VRE / GRE", mdro.vreGre ? "Yes" : "No", margin + colWidth / 2 + 5, mdroRow1Y, colWidth / 2, true);
        const mdroY3 = await addField(ctx, "CPE", mdro.cpe ? "Yes" : "No", col2, mdroRow1Y, colWidth / 2, true);
        yPos = Math.max(mdroY1, mdroY2, mdroY3) + 2;
        yPos = await addField(ctx, "Other MDR Organisms", mdro.other || "None", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Relevant Information", mdro.relevantInformation || "N/A", margin, yPos + 1, pageWidth - margin * 2);

        // 8. Vaccinations & Awareness
        yPos = await addSectionTitle(ctx, "VACCINATIONS & AWARENESS", yPos + 2);
        const vRow1Y = yPos;
        const vY1 = await addField(ctx, "Awareness of Status", exposure.awarenessOfInfection ? "Yes" : "No", margin, vRow1Y, colWidth, true);
        const vY2 = await addField(ctx, "Last Flu Vaccination", exposure.lastFluVaccinationDate ? format(new Date(exposure.lastFluVaccinationDate), "dd/MM/yyyy") : "N/A", col2, vRow1Y, colWidth, true);
        yPos = Math.max(vY1, vY2) + 8;

        // Completion Info
        yPos = await ensureSpace(ctx, 20, yPos);
        const compRowY = yPos;
        const c1 = await addField(ctx, "COMPLETED BY", assessmentData.completed_by || "N/A", margin, compRowY, colWidth, true);
        const c2 = await addField(ctx, "JOB ROLE", details.jobRole || assessmentData.jobRole || "N/A", col2, compRowY, colWidth, true);
        yPos = Math.max(c1, c2) + 2;
        const compDate = assessmentData.assessment_date || assessmentData.completionDate || assessmentData.assessmentDate;
        yPos = await addField(ctx, "COMPLETION DATE", compDate ? format(new Date(compDate), "dd/MM/yyyy") : (assessmentData.created_at ? format(new Date(assessmentData.created_at), "dd/MM/yyyy") : "N/A"), margin, yPos, colWidth);

        doc.save(`Infection-Prevention-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Bladder and Bowel Continence Assessment Layout ---
    if (
        upperFormName.includes("BLADDER AND BOWEL CONTINENCE ASSESSMENT") ||
        upperFormName.includes("BLADER & BOWEL CONTINENCE ASSESSMENT") ||
        upperFormName.includes("BLADDER & BOWEL ASSESSMENT")
    ) {
        try {
            const src = assessmentDataForSpecialized as Record<string, unknown>;
            const w = pageWidth - margin * 2;

            const valueFromPath = (source: Record<string, unknown>, path: string): unknown => {
                return path.split(".").reduce<unknown>((acc, part) => {
                    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
                        return (acc as Record<string, unknown>)[part];
                    }
                    return undefined;
                }, source);
            };

            const pick = (paths: string[]): unknown => {
                for (const p of paths) {
                    const v = valueFromPath(src, p);
                    if (v !== undefined && v !== null && v !== "") return v;
                }
                return undefined;
            };
            const txt = (paths: string[], fallback = "Not specified"): string => {
                const v = pick(paths);
                if (v === undefined || v === null || v === "") return fallback;
                return String(v);
            };
            const yn = (paths: string[]): string => {
                const v = pick(paths);
                if (typeof v === "boolean") return v ? "Yes" : "No";
                const n = String(v ?? "").trim().toLowerCase();
                if (["yes", "y", "true", "1", "checked"].includes(n)) return "Yes";
                return "No";
            };
            const en = (paths: string[]): string => {
                const v = pick(paths);
                if (v === undefined || v === null || v === "") return "Not specified";
                return String(v).replace(/_/g, " ").replace(/-/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
            };
            const dt = (paths: string[]): string => {
                const v = pick(paths);
                if (!v) return "Not specified";
                const d = new Date(v as string | number);
                if (Number.isNaN(d.getTime())) return "Not specified";
                return format(d, "MMMM d, yyyy");
            };

            // Section 1: General Information
            yPos = await addSectionTitle(ctx, "GENERAL INFORMATION", yPos);
            yPos = await addField(ctx, "Resident Name", txt(["residentName", "assessment_data.residentName", "lifestyle_factors.resident_name"]), margin, yPos, w);
            yPos = await addField(ctx, "Bedroom Number", txt(["bedroomNumber", "bedroom_number", "assessment_data.bedroomNumber", "lifestyle_factors.bedroom_number"]), margin, yPos, w);
            yPos = await addField(ctx, "Information obtained from", txt(["informationObtainedFrom", "information_obtained_from", "lifestyle_factors.information_obtained_from"]), margin, yPos, w);
            yPos = await addField(ctx, "Assessment Date", dt(["assessmentDate", "assessment_date", "created_at"]), margin, yPos, w);

            // Section 2: Infections
            yPos = await addSectionTitle(ctx, "INFECTIONS", yPos + 4);
            yPos = await addField(ctx, "Hepatitis A/B", yn(["hepatitisAB", "symptoms.infections.hepatitisAB"]), margin, yPos, w);
            yPos = await addField(ctx, "Blood Borne Virus", yn(["bloodBorneVirus", "symptoms.infections.bloodBorneVirus"]), margin, yPos, w);
            yPos = await addField(ctx, "MRSA", yn(["mrsa", "symptoms.infections.mrsa"]), margin, yPos, w);
            yPos = await addField(ctx, "ESBL", yn(["esbl", "symptoms.infections.esbl"]), margin, yPos, w);
            yPos = await addField(ctx, "Other Infections", txt(["otherInfection", "symptoms.infections.other"]), margin, yPos, w);

            // Section 3: Urinalysis Result on Admission
            yPos = await addSectionTitle(ctx, "URINALYSIS RESULT ON ADMISSION", yPos + 4);
            yPos = await addField(ctx, "pH", en(["ph", "symptoms.urinalysis.ph"]), margin, yPos, w);
            yPos = await addField(ctx, "Nitrates", en(["nitrates", "symptoms.urinalysis.nitrates"]), margin, yPos, w);
            yPos = await addField(ctx, "Protein", en(["protein", "symptoms.urinalysis.protein"]), margin, yPos, w);
            yPos = await addField(ctx, "Leucocytes", en(["leucocytes", "symptoms.urinalysis.leucocytes"]), margin, yPos, w);
            yPos = await addField(ctx, "Glucose", en(["glucose", "symptoms.urinalysis.glucose"]), margin, yPos, w);
            yPos = await addField(ctx, "Blood", en(["bloodResult", "symptoms.urinalysis.bloodResult"]), margin, yPos, w);
            yPos = await addField(ctx, "Result Details", txt(["urinalysisResult", "symptoms.urinalysis.result"]), margin, yPos, w);
            yPos = await addField(ctx, "MSSU (if indicated) Date", dt(["mssuDate", "symptoms.urinalysis.mssuDate"]), margin, yPos, w);

            // Section 4: Prescribed Medication
            yPos = await addSectionTitle(ctx, "PRESCRIBED MEDICATION", yPos + 4);
            yPos = await addField(ctx, "Anti-hypertensives", yn(["antiHypertensives", "symptoms.medications.antiHypertensives"]), margin, yPos, w);
            yPos = await addField(ctx, "Anti-Parkinson drugs", yn(["antiParkinsonDrugs", "symptoms.medications.antiParkinsonDrugs"]), margin, yPos, w);
            yPos = await addField(ctx, "Iron supplements", yn(["ironSupplement", "symptoms.medications.ironSupplement"]), margin, yPos, w);
            yPos = await addField(ctx, "Laxatives", yn(["laxatives", "symptoms.medications.laxatives"]), margin, yPos, w);
            yPos = await addField(ctx, "Diuretic", yn(["diuretics", "symptoms.medications.diuretics"]), margin, yPos, w);
            yPos = await addField(ctx, "Histamine", yn(["histamine", "symptoms.medications.histamine"]), margin, yPos, w);
            yPos = await addField(ctx, "Antidepressants", yn(["antiDepressants", "symptoms.medications.antiDepDepressants", "symptoms.medications.antiDepressants"]), margin, yPos, w);
            yPos = await addField(ctx, "Cholinergic", yn(["cholinergic", "symptoms.medications.cholinergic"]), margin, yPos, w);
            yPos = await addField(ctx, "Sedative/Hypnotic", yn(["sedativesHypnotic", "symptoms.medications.sedativesHypnotic"]), margin, yPos, w);
            yPos = await addField(ctx, "Anti-psychotic", yn(["antiPsychotic", "symptoms.medications.antiPsychotic"]), margin, yPos, w);
            yPos = await addField(ctx, "Antihistamines", yn(["antihistamines", "symptoms.medications.antihistamines"]), margin, yPos, w);
            yPos = await addField(ctx, "Narcotic analgesic", yn(["narcoticAnalgesics", "symptoms.medications.narcoticAnalgesics"]), margin, yPos, w);

            // Section 5: Contributing Risk Factors
            yPos = await addSectionTitle(ctx, "CONTRIBUTING RISK FACTORS", yPos + 4);
            yPos = await addField(ctx, "Caffeine — Amount in 24 hours (mls)", txt(["caffeineMls24h", "lifestyle_factors.caffeineMls24h"], "0"), margin, yPos, w);
            yPos = await addField(ctx, "Caffeine — Frequency", txt(["caffeineFrequency", "lifestyle_factors.caffeineFrequency"]), margin, yPos, w);
            yPos = await addField(ctx, "Caffeine — Time of Day", txt(["caffeineTimeOfDay", "lifestyle_factors.caffeineTimeOfDay"]), margin, yPos, w);
            yPos = await addField(ctx, "Exercise — Type", txt(["exerciseType", "lifestyle_factors.exerciseType"]), margin, yPos, w);
            yPos = await addField(ctx, "Exercise — Frequency", txt(["exerciseFrequency", "lifestyle_factors.exerciseFrequency"]), margin, yPos, w);
            yPos = await addField(ctx, "Exercise — Time of Day", txt(["exerciseTimeOfDay", "lifestyle_factors.exerciseTimeOfDay"]), margin, yPos, w);
            yPos = await addField(ctx, "Smoking", en(["smoking", "lifestyle_factors.smoking"]), margin, yPos, w);
            yPos = await addField(ctx, "Skin Condition", en(["skinCondition", "lifestyle_factors.skinCondition"]), margin, yPos, w);
            yPos = await addField(ctx, "Alcohol — Amount in 24 hours", txt(["alcoholAmount24h", "lifestyle_factors.alcoholAmount24h"], "0"), margin, yPos, w);
            yPos = await addField(ctx, "Alcohol — Frequency", txt(["alcoholFrequency", "lifestyle_factors.alcoholFrequency"]), margin, yPos, w);
            yPos = await addField(ctx, "Alcohol — Time of Day", txt(["alcoholTimeOfDay", "lifestyle_factors.alcoholTimeOfDay"]), margin, yPos, w);
            yPos = await addField(ctx, "Weight", en(["weight", "lifestyle_factors.weight"]), margin, yPos, w);
            yPos = await addField(ctx, "Mental State", en(["mentalState", "lifestyle_factors.mentalState"]), margin, yPos, w);
            yPos = await addField(ctx, "Mobility", en(["mobilityIssues", "lifestyle_factors.mobilityIssues"]), margin, yPos, w);
            yPos = await addField(ctx, "History of constipation?", yn(["constipationHistory", "lifestyle_factors.constipationHistory"]), margin, yPos, w);
            yPos = await addField(ctx, "History of recurrent UTIs?", yn(["historyRecurrentUTIs", "lifestyle_factors.historyRecurrentUTIs"]), margin, yPos, w);

            // Section 6: Urinary Continence History
            yPos = await addSectionTitle(ctx, "URINARY CONTINENCE HISTORY", yPos + 4);
            yPos = await addField(ctx, "Frequency of Urinary Incontinence", en(["incontinenceFrequency", "bladder_pattern.frequency"]), margin, yPos, w);
            yPos = await addField(ctx, "Typical Volume", en(["incontinenceVolume", "bladder_pattern.volume"]), margin, yPos, w);
            yPos = await addField(ctx, "Onset of symptoms", en(["onset", "bladder_pattern.onset"]), margin, yPos, w);
            yPos = await addField(ctx, "Duration", en(["duration", "bladder_pattern.duration"]), margin, yPos, w);
            yPos = await addField(ctx, "Symptoms in the past 6 months", en(["symptomsPast6Months", "bladder_pattern.symptomsPast6Months"]), margin, yPos, w);
            yPos = await addField(ctx, "Physician consulted regarding incontinence?", yn(["physicianConsulted", "bladder_pattern.physicianConsulted"]), margin, yPos, w);

            // Urinary Symptoms (Leakage Triggers)
            yPos = await addSectionTitle(ctx, "URINARY SYMPTOMS (LEAKAGE TRIGGERS)", yPos + 4);
            const symptomFields: Array<{ label: string; paths: string[] }> = [
                { label: "Do you leak when you cough or laugh?", paths: ["leakCoughLaugh", "symptoms.specific.leakCoughLaugh"] },
                { label: "Do you leak when you get up from a chair?", paths: ["leakStandingUp", "symptoms.specific.leakStandingUp"] },
                { label: "Do you leak when you go upstairs/downhill?", paths: ["leakUpstairsDownhill", "symptoms.specific.leakUpstairsDownhill"] },
                { label: "Passes urine frequently?", paths: ["passesUrineFrequently", "symptoms.specific.passesUrineFrequently"] },
                { label: "Desire to pass urine very strong?", paths: ["desirePassUrineStrong", "symptoms.specific.desirePassUrine"] },
                { label: "Leaks urine before reaching the toilet?", paths: ["leaksBeforeToilet", "symptoms.specific.leaksBeforeToilet"] },
                { label: "Gets up more than twice during the night?", paths: ["getsUpMoreThanTwiceNight", "symptoms.specific.moreThanTwiceAtNight"] },
                { label: "Anxiety contributes to frequency?", paths: ["anxietyContributesFrequency", "symptoms.specific.anxiety"] },
                { label: "Difficulty in beginning to pass urine?", paths: ["difficultyBeginningUrine", "symptoms.specific.difficultyStarting"] },
                { label: "Hesitancy/Straining?", paths: ["hesitancyStraining", "symptoms.specific.hesitancy"] },
                { label: "Dribbles after passing urine?", paths: ["dribblesAfterUrine", "symptoms.specific.dribbles"] },
                { label: "Still feels bladder is full after passing urine?", paths: ["feelsBladderFullAfterUrine", "symptoms.specific.feelsFull"] },
                { label: "Has recurrent urinary tract infections?", paths: ["recurrentUTIs", "symptoms.specific.recurrentTractInfections"] },
                { label: "Limited mobility?", paths: ["limitedMobility", "symptoms.functional.limitedMobility"] },
                { label: "Unable to get to the toilet on time?", paths: ["unableToiletOnTime", "symptoms.functional.unableOnTime"] },
                { label: "Cannot hold urinal or sit on toilet?", paths: ["cannotHoldUrinalOrSit", "symptoms.functional.notHoldUrinalOrSeat"] },
                { label: "Cannot reach/use call bell?", paths: ["cannotReachCallBell", "symptoms.functional.notuseCallBell"] },
                { label: "Poor vision?", paths: ["poorVision", "symptoms.functional.poorVision"] },
                { label: "Needs to be assisted to transfer?", paths: ["needsAssistedTransfer", "symptoms.functional.assistedTransfer"] },
                { label: "Pain?", paths: ["pain", "symptoms.specific.pain"] },
            ];
            for (const sf of symptomFields) {
                yPos = await addField(ctx, sf.label, yn(sf.paths), margin, yPos, w);
            }

            // Section 7: Bowel Pattern
            yPos = await addSectionTitle(ctx, "BOWEL PATTERN", yPos + 4);
            yPos = await addField(ctx, "Bowel Pattern", en(["bowelPattern", "bowel_pattern.pattern"]), margin, yPos, w);
            yPos = await addField(ctx, "Frequency", txt(["bowelFrequency", "bowel_pattern.frequency"]), margin, yPos, w);
            yPos = await addField(ctx, "Usual Time of Day", txt(["bowelUsualTimeOfDay", "bowel_pattern.timeOfDay"]), margin, yPos, w);
            yPos = await addField(ctx, "Bristol Stool Type & Amount", txt(["bowelAmountStoolType", "bowel_pattern.stoolTypeAmount"]), margin, yPos, w);
            yPos = await addField(ctx, "Liquid Feeds?", yn(["bowelLiquidFeeds", "bowel_pattern.liquidFeeds"]), margin, yPos, w);
            yPos = await addField(ctx, "Other Factors (e.g. Diet/Fluid)", txt(["bowelOtherFactors", "bowel_pattern.otherFactors"]), margin, yPos, w);
            yPos = await addField(ctx, "Other Remedies (e.g. prune juice)", txt(["bowelOtherRemedies", "bowel_pattern.otherRemedies"]), margin, yPos, w);
            yPos = await addField(ctx, "Medical Officer Consulted?", yn(["medicalOfficerConsulted", "bowel_pattern.medicalOfficerConsulted"]), margin, yPos, w);
            yPos = await addField(ctx, "Medical Officer Name/Date", txt(["medicalOfficerName", "bowel_pattern.medicalOfficerName"]), margin, yPos, w);

            // Section 8: Toileting Habits & Aids
            yPos = await addSectionTitle(ctx, "TOILETING HABITS & AIDS", yPos + 4);
            yPos = await addField(ctx, "Day Pattern", en(["dayPattern", "bladder_pattern.toiletingHabits.day", "bladder_pattern.dayPattern"]), margin, yPos, w);
            yPos = await addField(ctx, "Evening Pattern", en(["eveningPattern", "bladder_pattern.toiletingHabits.evening", "bladder_pattern.eveningPattern"]), margin, yPos, w);
            yPos = await addField(ctx, "Night Pattern", en(["nightPattern", "bladder_pattern.toiletingHabits.night", "bladder_pattern.nightPattern"]), margin, yPos, w);
            yPos = await addField(ctx, "Continence Pads/Aids In Use", txt(["typesOfPads", "bladder_pattern.padsAids", "bladder_pattern.typesOfPads"]), margin, yPos, w);

            // Section 9: Quality of Life
            yPos = await addSectionTitle(ctx, "QUALITY OF LIFE", yPos + 4);
            yPos = await addField(ctx, "On a scale of 0-10, how much does your urinary incontinence affect your quality of life?", txt(["qualityOfLife", "bladder_pattern.qualityOfLife", "quality_of_life"]), margin, yPos, w);

            // Section 10: Summary & Planning
            yPos = await addSectionTitle(ctx, "SUMMARY & PLANNING", yPos + 4);
            yPos = await addSectionTitle(ctx, "Bladder Decisions", yPos + 2);
            yPos = await addField(ctx, "Continent?", yn(["bladderContinent", "bladder_pattern.bladderContinent"]), margin, yPos, w);
            yPos = await addField(ctx, "Incontinent?", yn(["bladderIncontinent", "bladder_pattern.bladderIncontinent"]), margin, yPos, w);
            yPos = await addField(ctx, "If Incontinent, Type", en(["bladderIncontinentType", "bladder_pattern.bladderIncontinentType"]), margin, yPos, w);
            yPos = await addField(ctx, "Care Plan Commenced?", yn(["bladderCarePlanCommenced", "bladder_pattern.bladderPlanCommenced"]), margin, yPos, w);
            yPos = await addField(ctx, "Referral Required?", en(["bladderReferralRequired", "bladder_pattern.bladderReferralRequired"]), margin, yPos, w);
            yPos = await addField(ctx, "Treatment Plan Followed", en(["bladderTreatmentPlanFollowed", "bladder_pattern.bladderPlanFollowed"]), margin, yPos, w);
            
            yPos = await addSectionTitle(ctx, "Bowel Decisions", yPos + 2);
            yPos = await addField(ctx, "Continent?", yn(["bowelContinent", "bowel_pattern.bowelContinent"]), margin, yPos, w);
            yPos = await addField(ctx, "Incontinent?", yn(["bowelIncontinent", "bowel_pattern.bowelIncontinent"]), margin, yPos, w);
            yPos = await addField(ctx, "Care Plan Commenced?", yn(["bowelCarePlanCommenced", "bowel_pattern.bowelPlanCommenced"]), margin, yPos, w);
            yPos = await addField(ctx, "Bowel Record Commenced?", yn(["bowelRecordCommenced", "bowel_pattern.bowelRecordCommenced"]), margin, yPos, w);
            yPos = await addField(ctx, "Referral Required?", en(["bowelReferralRequired", "bowel_pattern.bowelReferralRequired"]), margin, yPos, w);

            // Section 11: Sign-off & Review
            yPos = await addSectionTitle(ctx, "SIGN-OFF & REVIEW", yPos + 4);
            yPos = await addField(ctx, "Staff Name", txt(["sigantureCompletingAssessment", "signature_completing_assessment", "completedBy", "completed_by", "lifestyle_factors.completed_by"]), margin, yPos, w);
            yPos = await addField(ctx, "Resident/Representative Signature", txt(["sigantureResident", "signature_resident", "lifestyle_factors.signature_resident"]), margin, yPos, w);
            yPos = await addField(ctx, "Date of Next Review", dt(["dateNextReview", "next_review_date"]), margin, yPos, w);

            doc.save(`Bladder-Bowel-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
            return;
        } catch (error) {
            console.error("Bladder/Bowel specialized PDF generation failed, falling back to generic layout:", error);
        }
    }

    // --- Night Observation Consent Layout ---
    if (upperFormName.includes("NIGHT OBSERVATION CONSENT")) {
        const assessmentData = data.assessment_data || data;

        // Section A: Resident Information
        yPos = await addSectionTitle(ctx, "Section A — Resident Information", yPos);
        const row1Y = yPos;
        const ya1 = await addField(ctx, "Full Name", assessmentData.residentName || "N/A", margin, row1Y, colWidth, true);
        const ya2 = await addField(ctx, "Date of Birth", assessmentData.dateOfBirth ? format(new Date(assessmentData.dateOfBirth), "dd/MM/yyyy") : "N/A", col2, row1Y, colWidth, true);
        yPos = Math.max(ya1, ya2) + 2;

        const row2Y = yPos;
        const ya3 = await addField(ctx, "Resident / NHS Number", assessmentData.nhsNumber || "N/A", margin, row2Y, colWidth, true);
        const ya4 = await addField(ctx, "Room Number", assessmentData.roomNumber || "N/A", col2, row2Y, colWidth, true);
        yPos = Math.max(ya3, ya4) + 2;

        yPos = await addField(ctx, "Date of Admission", assessmentData.dateOfAdmission ? format(new Date(assessmentData.dateOfAdmission), "dd/MM/yyyy") : "N/A", margin, yPos, colWidth);

        // Section B: Purpose
        yPos = await addSectionTitle(ctx, "Section B — Purpose of Night Observations", yPos + 4);
        const purposeText = "Night observations are carried out to ensure the safety, wellbeing, and health of residents during night hours. Observations may include visual checks, monitoring breathing, repositioning, continence care, or responding to medical needs.";
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(75, 85, 99);
        const purposeLines = doc.splitTextToSize(purposeText, pageWidth - margin * 2);
        doc.text(purposeLines, margin, yPos);
        yPos += (purposeLines.length * 5) + 6;

        // Section C: Type of Observation
        yPos = await addSectionTitle(ctx, "Section C — Type of Observation Required", yPos);
        const allObsTypes = [
            "General welfare checks at regular intervals",
            "Increased observation due to medical condition",
            "Falls risk monitoring",
            "Pressure area care / repositioning",
            "Behavioral monitoring",
            "Other (please specify below)"
        ];

        const obsTableData = allObsTypes.map(type => [
            type,
            assessmentData.observationTypes?.includes(type) ? "YES" : "NO"
        ]);

        autoTable(doc, {
            startY: yPos,
            body: obsTableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: pageWidth - margin * 2 - 25 },
                1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 2;

        if (assessmentData.otherObservationType) {
            yPos = await addField(ctx, "Other Observation Details", assessmentData.otherObservationType, margin, yPos, pageWidth - margin * 2);
        }

        // Section D: Frequency
        yPos = await addSectionTitle(ctx, "Section D — Frequency of Observations", yPos + 4);
        const allFrequencies = [
            "Every 15 minutes",
            "Every 30 minutes",
            "Hourly",
            "Two-hourly",
            "As required based on condition",
            "Other (please specify below)"
        ];

        const freqTableData = allFrequencies.map(freq => [
            freq,
            assessmentData.frequency?.includes(freq) ? "YES" : "NO"
        ]);

        autoTable(doc, {
            startY: yPos,
            body: freqTableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: pageWidth - margin * 2 - 25 },
                1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 2;

        if (assessmentData.otherFrequency) {
            yPos = await addField(ctx, "Other Frequency Details", assessmentData.otherFrequency, margin, yPos, pageWidth - margin * 2);
        }

        // Section E & F: Consent & Capacity
        yPos = await addSectionTitle(ctx, "Section E & F — Consent & Capacity", yPos + 4);
        const rowCEF = yPos;
        const ye1 = await addField(ctx, "Resident Consented", assessmentData.residentConsented ? "Yes" : "No", margin, rowCEF, colWidth, true);
        const ye2 = await addField(ctx, "Has Capacity", assessmentData.hasCapacity || "N/A", col2, rowCEF, colWidth, true);
        yPos = Math.max(ye1, ye2) + 2;

        const rowSigRC = yPos;
        const ye3 = await addField(ctx, "Resident Signature", assessmentData.residentSignature || "N/A", margin, rowSigRC, colWidth, true);
        const ye4 = await addField(ctx, "Consent Date", assessmentData.consentDate ? format(new Date(assessmentData.consentDate), "dd/MM/yyyy") : "N/A", col2, rowSigRC, colWidth, true);
        yPos = Math.max(ye3, ye4) + 4;

        // Section G: Legal Rep
        if (assessmentData.representativeConsulted && assessmentData.representativeConsulted !== "Not Applicable") {
            yPos = await addSectionTitle(ctx, "Section G — Legal Representative / Family Involvement", yPos);
            const rowRG = yPos;
            const yg1 = await addField(ctx, "Consulted", assessmentData.representativeConsulted, margin, rowRG, colWidth, true);
            const yg2 = await addField(ctx, "Representative Name", assessmentData.representativeName || "N/A", col2, rowRG, colWidth, true);
            yPos = Math.max(yg1, yg2) + 2;

            const rowRG2 = yPos;
            const yg3 = await addField(ctx, "Relationship", assessmentData.relationshipToResident || "N/A", margin, rowRG2, colWidth, true);
            const yg4 = await addField(ctx, "Contact / Notes", assessmentData.contactDetails || "N/A", col2, rowRG2, colWidth, true);
            yPos = Math.max(yg3, yg4) + 4;
        }

        // Section H: Risks
        yPos = await addSectionTitle(ctx, "Section H — Risks Explained", yPos);
        const allRisks = [
            "Risk of falls",
            "Risk of medical deterioration",
            "Risk of pressure sores",
            "Risk of wandering or confusion",
            "Other (please specify below)"
        ];

        const riskTableData = allRisks.map(risk => [
            risk,
            assessmentData.risksExplained?.includes(risk) ? "YES" : "NO"
        ]);

        autoTable(doc, {
            startY: yPos,
            body: riskTableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: pageWidth - margin * 2 - 25 },
                1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 2;

        if (assessmentData.otherRisk) {
            yPos = await addField(ctx, "Other Risk Details", assessmentData.otherRisk, margin, yPos, pageWidth - margin * 2);
        }

        // Section I: Staff Declaration
        yPos = await addSectionTitle(ctx, "Section I — Staff Declaration", yPos + 4);
        const rowSI = yPos;
        const yi1 = await addField(ctx, "Staff Name", assessmentData.staffName || "N/A", margin, rowSI, colWidth, true);
        const yi2 = await addField(ctx, "Role / Designation", assessmentData.staffRole || "N/A", col2, rowSI, colWidth, true);
        yPos = Math.max(yi1, yi2) + 2;

        const rowSI2 = yPos;
        const yi3 = await addField(ctx, "Staff Signature", assessmentData.staffSignature || "N/A", margin, rowSI2, colWidth, true);
        const yi4 = await addField(ctx, "Declaration Date", assessmentData.declarationDate ? format(new Date(assessmentData.declarationDate), "dd/MM/yyyy") : "N/A", col2, rowSI2, colWidth, true);
        yPos = Math.max(yi3, yi4) + 4;

        doc.save(`Night-Observation-Consent-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- General Pain Assessment Layout ---
    if (upperFormName.includes("PAIN ASSESSMENT")) {
        const source = assessmentDataForSpecialized as Record<string, unknown>;
        const nestedAssessmentEntries =
            source.assessment_entries &&
            typeof source.assessment_entries === "object" &&
            !Array.isArray(source.assessment_entries)
                ? (source.assessment_entries as Record<string, unknown>)
                : null;
        const painData = (nestedAssessmentEntries ?? source) as Record<string, unknown>;
        const bodyMapRaw = painData.bodyMapMarkers ?? painData.body_map_markers;
        const bodyMapMarkers: Record<string, unknown>[] = Array.isArray(bodyMapRaw) ? (bodyMapRaw as Record<string, unknown>[]) : [];
        const fullWidth = pageWidth - margin * 2;
        const sectionLabelWidth = 52;
        const sectionValueWidth = fullWidth - sectionLabelWidth;

        const toText = (value: unknown): string => {
            if (typeof value === "boolean") return value ? "Yes" : "No";
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "string") return value.trim() ? value : "N/A";
            if (typeof value === "number") return String(value);
            if (value instanceof Date) return format(value, "dd/MM/yyyy");
            return formatValue(value);
        };

        const getFormField = (key: string): unknown => {
            if (painData[key] !== undefined && painData[key] !== null) return painData[key];
            if (source[key] !== undefined && source[key] !== null) return source[key];
            if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
            return undefined;
        };

        const formatDateOnly = (value: unknown): string => {
            if (value === null || value === undefined || value === "") return "N/A";
            const dateObj = value instanceof Date ? value : new Date(value as string | number);
            if (Number.isNaN(dateObj.getTime())) return toText(value);
            return format(dateObj, "dd/MM/yyyy");
        };

        // Header table matching form view
        const tableTopY = yPos;
        const hHeight = 7;
        const valHeight = 10;
        const colW = fullWidth / 3;
        const residentName = toText(
            getFormField("residentName") ?? [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" ")
        );
        const roomNumber = toText((getFormField("roomNumber") ?? getFormField("bedroomNumber") ?? resident?.room_number) || "N/A");
        const dob = formatDateOnly(getFormField("dateOfBirth") ?? resident?.date_of_birth);

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        for (let i = 0; i < 3; i += 1) {
            doc.rect(margin + i * colW, tableTopY, colW, hHeight, "FD");
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text("RESIDENTS NAME", margin + 2, tableTopY + 4.5);
        doc.text("BEDROOM NUMBER", margin + colW + 2, tableTopY + 4.5);
        doc.text("DATE OF BIRTH", margin + colW * 2 + 2, tableTopY + 4.5);

        for (let i = 0; i < 3; i += 1) {
            doc.rect(margin + i * colW, tableTopY + hHeight, colW, valHeight, "S");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.text(doc.splitTextToSize(residentName, colW - 4), margin + 2, tableTopY + hHeight + 4.5);
        doc.text(doc.splitTextToSize(roomNumber, colW - 4), margin + colW + 2, tableTopY + hHeight + 4.5);
        doc.text(doc.splitTextToSize(dob, colW - 4), margin + colW * 2 + 2, tableTopY + hHeight + 4.5);
        yPos = tableTopY + hHeight + valHeight + 8;

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39);
        doc.text("PAIN ASSESSMENT RECORD", pageWidth / 2, yPos, { align: "center" });
        yPos += 6;

        // Body map rendering with highlighted regions
        const mapWidth = 150;
        const mapHeight = (mapWidth * 515) / 577;
        const mapX = (pageWidth - mapWidth) / 2;
        const mapY = yPos;
        doc.setDrawColor(203, 213, 225);
        doc.rect(mapX, mapY, mapWidth, mapHeight);
        try {
            const img = await loadImage("/images/body_template_without_rectangular_boxes.png");
            doc.addImage(img, "PNG", mapX, mapY, mapWidth, mapHeight);
        } catch (e) {
            console.warn("Pain Assessment body map image failed to load", e);
        }

        for (const marker of bodyMapMarkers) {
            const regionId = String(marker.region_id ?? "");
            const region = BODY_REGIONS.find((r) => r.region_id === regionId);
            if (!region) continue;
            const rectX = mapX + (region.x * mapWidth) / 100;
            const rectY = mapY + (region.y * mapHeight) / 100;
            const rectW = (region.width * mapWidth) / 100;
            const rectH = (region.height * mapHeight) / 100;
            doc.setFillColor(216, 180, 254);
            doc.setDrawColor(147, 51, 234);
            doc.setGState(new (doc as any).GState({ opacity: 0.28 }));
            doc.rect(rectX, rectY, rectW, rectH, "FD");
            doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
            const label = marker.label ? String(marker.label) : "";
            if (label) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7);
                doc.setTextColor(88, 28, 135);
                doc.text(label, rectX + 1, rectY + 3.5);
            }
        }
        yPos = mapY + mapHeight + 8;

        const drawPainRow = (label: string, value: string, rowY: number, minHeight = 20): number => {
            const valueLines = doc.splitTextToSize(value, sectionValueWidth - 4);
            const rowHeight = Math.max(minHeight, valueLines.length * 4 + 6);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.rect(margin, rowY, sectionLabelWidth, rowHeight, "FD");
            doc.rect(margin + sectionLabelWidth, rowY, sectionValueWidth, rowHeight, "S");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(17, 24, 39);
            doc.text(doc.splitTextToSize(label, sectionLabelWidth - 4), margin + 2, rowY + 5);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.text(valueLines, margin + sectionLabelWidth + 2, rowY + 5);
            return rowY + rowHeight;
        };

        const descriptionOfPain = toText(getFormField("descriptionOfPain") ?? getFormField("description_of_pain"));
        const relievePain = toText(getFormField("relievePain") ?? getFormField("relieve_pain"));
        const worsePain = toText(getFormField("worsePain") ?? getFormField("worse_pain"));
        yPos = drawPainRow("Residents description of their pain", descriptionOfPain, yPos);
        yPos = drawPainRow("What will relieve the pain?", relievePain, yPos);
        yPos = drawPainRow("What will make the pain worse?", worsePain, yPos);
        yPos += 5;

        // Signature/footer area
        yPos = await ensureSpace(ctx, 38, yPos);
        const footerTopY = yPos;
        const boxGap = 8;
        const boxWidth = (fullWidth - boxGap) / 2;
        const boxHeight = 28;
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin, footerTopY, boxWidth, boxHeight);
        doc.rect(margin + boxWidth + boxGap, footerTopY, boxWidth, boxHeight);

        const completedBy = toText(getFormField("completedBy") ?? getFormField("completed_by"));
        const role = toText(getFormField("role") ?? getFormField("jobRole") ?? getFormField("job_role"));
        const signature = toText(getFormField("signature"));
        const assessedDate = formatDateOnly(getFormField("assessmentDate") ?? getFormField("assessment_date"));
        const time = toText(getFormField("time") ?? getFormField("assessmentTime") ?? getFormField("assessment_time"));

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(75, 85, 99);
        doc.text("NAME OF PERSON COMPLETING ASSESSMENT", margin + 2, footerTopY + 4.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(17, 24, 39);
        doc.text(doc.splitTextToSize(completedBy, boxWidth - 4), margin + 2, footerTopY + 9);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(75, 85, 99);
        doc.text("SIGNATURE", margin + 2, footerTopY + 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(17, 24, 39);
        doc.text(doc.splitTextToSize(signature, boxWidth - 4), margin + 2, footerTopY + 20.5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(75, 85, 99);
        doc.text("JOB ROLE", margin + boxWidth + boxGap + 2, footerTopY + 4.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(17, 24, 39);
        doc.text(doc.splitTextToSize(role, boxWidth - 4), margin + boxWidth + boxGap + 2, footerTopY + 9);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(75, 85, 99);
        doc.text("DATE", margin + boxWidth + boxGap + 2, footerTopY + 16);
        doc.text("TIME", margin + boxWidth + boxGap + boxWidth / 2, footerTopY + 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(17, 24, 39);
        doc.text(assessedDate, margin + boxWidth + boxGap + 2, footerTopY + 20.5);
        doc.text(time, margin + boxWidth + boxGap + boxWidth / 2, footerTopY + 20.5);

        yPos = footerTopY + boxHeight + 4;

        doc.save(`Pain-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- MUST Assessment Specialized Layout ---
    if (upperFormName.includes("MUST ASSESSMENT") || upperFormName.includes("MUST")) {
        const records = (Array.isArray(data) ? data : [data]) as unknown[];

        const getValue = (...values: unknown[]): unknown => {
            for (const value of values) {
                if (value !== null && value !== undefined) {
                    return value;
                }
            }
            return undefined;
        };

        const display = (value: unknown): string => {
            if (value === null || value === undefined) return "Not provided";
            if (typeof value === "string") return value.trim() ? value : "Not provided";
            return String(value);
        };

        const displayDate = (value: unknown): string => {
            if (value === null || value === undefined || value === "") return "Not provided";
            const parsed = new Date(value as string | number | Date);
            return Number.isNaN(parsed.getTime()) ? display(value) : format(parsed, "dd/MM/yyyy");
        };

        const yesNo = (value: unknown): "Yes" | "No" => {
            if (value === true || value === 1) return "Yes";
            if (typeof value === "string") {
                const normalized = value.trim().toLowerCase();
                if (normalized === "yes" || normalized === "true" || normalized === "1") return "Yes";
            }
            return "No";
        };

        const asNumber = (value: unknown): number | null => {
            if (typeof value === "number" && Number.isFinite(value)) return value;
            if (typeof value === "string" && value.trim()) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
            }
            return null;
        };

        const mustTableHeadStyles = {
            fillColor: [34, 197, 94] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: "bold" as const,
            fontSize: 9
        };
        const mustTableStyles = {
            fontSize: 9,
            cellPadding: 3,
            valign: "top" as const,
            overflow: "linebreak" as const
        };

        const firstRecord = (records[0] ?? {}) as Record<string, unknown>;
        const firstNested = (firstRecord.assessment_data ?? {}) as Record<string, unknown>;
        const firstDetails = (firstRecord.assessment_details ?? firstNested.assessment_details ?? {}) as Record<string, unknown>;

        const residentName = getValue(
            firstRecord.resident_name,
            firstRecord.residentName,
            firstNested.resident_name,
            firstNested.residentName,
            firstDetails.resident_name,
            firstDetails.residentName,
            `${resident?.first_name || ""} ${resident?.last_name || ""}`.trim()
        );
        const bedroomNumber = getValue(
            firstRecord.bedroom_number,
            firstRecord.bedroomNumber,
            firstNested.bedroom_number,
            firstNested.bedroomNumber,
            firstDetails.bedroom_number,
            firstDetails.bedroomNumber,
            resident?.room_number
        );
        const dateOfBirth = getValue(
            firstRecord.date_of_birth,
            firstRecord.dateOfBirth,
            firstNested.date_of_birth,
            firstNested.dateOfBirth,
            firstDetails.date_of_birth,
            firstDetails.dateOfBirth,
            resident?.date_of_birth
        );

        yPos = await addSectionTitle(ctx, "Resident Information", yPos);
        yPos = await ensureSpace(ctx, 22, yPos);
        autoTable(doc, {
            startY: yPos,
            theme: "grid",
            head: [["Field", "Value"]],
            body: [
                ["Resident Name", display(residentName)],
                ["Bedroom Number", display(bedroomNumber)],
                ["Date of Birth", displayDate(dateOfBirth)]
            ],
            headStyles: mustTableHeadStyles,
            styles: mustTableStyles,
            columnStyles: {
                0: { cellWidth: 65, fontStyle: "bold" as const },
                1: { cellWidth: fullWidth - 65 }
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 6;

        yPos = await addSectionTitle(ctx, "MUST Steps", yPos);
        yPos = await ensureSpace(ctx, 22, yPos);
        autoTable(doc, {
            startY: yPos,
            theme: "grid",
            head: [["Step", "What it measures"]],
            body: [
                ["Step 1", "Body Mass Index (BMI) score"],
                ["Step 2", "Unplanned weight loss in the last 3–6 months"],
                ["Step 3", "Acute disease effect (if acutely ill and there has been or is likely to be no nutritional intake for > 5 days)"]
            ],
            headStyles: mustTableHeadStyles,
            styles: mustTableStyles,
            columnStyles: {
                0: { cellWidth: 20, fontStyle: "bold" as const },
                1: { cellWidth: fullWidth - 20 }
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 6;

        yPos = await addSectionTitle(ctx, "MUST Assessment History", yPos);
        yPos = await ensureSpace(ctx, 28, yPos);
        autoTable(doc, {
            startY: yPos,
            theme: "grid",
            head: [[
                "Date",
                "Weight (kg)",
                "Height (cm)",
                "BMI",
                "Step 1",
                "Step 2",
                "Step 3",
                "Total",
                "Risk Level",
                "Signature",
                "Job Role"
            ]],
            body: records.map((record) => {
                const source = (record ?? {}) as Record<string, unknown>;
                const nested = (source.assessment_data ?? {}) as Record<string, unknown>;
                const details = (source.assessment_details ?? nested.assessment_details ?? {}) as Record<string, unknown>;

                const assessmentDate = getValue(source.assessment_date, source.assessmentDate, nested.assessment_date, nested.assessmentDate, details.assessment_date, details.assessmentDate);
                const weight = getValue(source.weight_kg, source.weightKg, nested.weight_kg, nested.weightKg, details.weight_kg, details.weightKg);
                const height = getValue(source.height_cm, source.heightCm, nested.height_cm, nested.heightCm, details.height_cm, details.heightCm);
                const bmi = getValue(source.bmi_value, source.bmi, nested.bmi_value, nested.bmi, details.bmi_value, details.bmi);

                const step1ScoreRaw = getValue(source.step1_score, source.step1Score, nested.step1_score, nested.step1Score, details.step1_score, details.step1Score);
                const step2ScoreRaw = getValue(source.step2_score, source.step2Score, nested.step2_score, nested.step2Score, details.step2_score, details.step2Score);
                const step3ScoreRaw = getValue(source.step3_score, source.step3Score, nested.step3_score, nested.step3Score, details.step3_score, details.step3Score);
                const totalScoreRaw = getValue(source.total_must_score, source.totalMustScore, nested.total_must_score, nested.totalMustScore, details.total_must_score, details.totalMustScore);

                const signature = getValue(source.signature, nested.signature, details.signature);
                const jobRole = getValue(source.job_role, source.jobRole, nested.job_role, nested.jobRole, details.job_role, details.jobRole);

                const totalScore = asNumber(totalScoreRaw);
                const riskLevel =
                    totalScore === null
                        ? "Not provided"
                        : totalScore === 0
                            ? "Low Risk"
                            : totalScore === 1
                                ? "Medium Risk"
                                : "High Risk";

                return [
                    displayDate(assessmentDate),
                    display(weight),
                    display(height),
                    display(bmi),
                    display(step1ScoreRaw),
                    display(step2ScoreRaw),
                    display(step3ScoreRaw),
                    display(totalScoreRaw),
                    riskLevel,
                    display(signature),
                    display(jobRole)
                ];
            }),
            headStyles: mustTableHeadStyles,
            styles: { ...mustTableStyles, fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 17, halign: "center" as const },
                2: { cellWidth: 17, halign: "center" as const },
                3: { cellWidth: 12, halign: "center" as const },
                4: { cellWidth: 10, halign: "center" as const },
                5: { cellWidth: 10, halign: "center" as const },
                6: { cellWidth: 10, halign: "center" as const },
                7: { cellWidth: 10, halign: "center" as const },
                8: { cellWidth: 18 },
                9: { cellWidth: 20 },
                10: { cellWidth: 16 }
            }
        });

        doc.save(`MUST-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Nutrition Assessment + Monthly Review Specialized Layout ---
    const isNutritionAssessmentForm =
        upperFormName.includes("NUTRITIONAL ASSESSMENT") ||
        upperFormName.includes("NUTRITION ASSESSMENT") ||
        upperFormName.includes("NUTRITION");

    if (isNutritionAssessmentForm) {
        const source = data as Record<string, unknown>;
        const nested = (source.assessment_data ?? {}) as Record<string, unknown>;
        const details = (source.assessment_details ?? nested.assessment_details ?? {}) as Record<string, unknown>;
        const foodConsistency = (source.food_consistency ?? nested.food_consistency ?? source.foodConsistency ?? {}) as Record<string, unknown>;
        const fluidConsistency = (source.fluid_consistency ?? nested.fluid_consistency ?? source.fluidConsistency ?? {}) as Record<string, unknown>;
        const monthly = (details.monthlyEvaluations ?? source.monthlyEvaluations ?? []) as unknown[];

        const display = (value: unknown): string => {
            if (value === null || value === undefined) return "Not provided";
            if (typeof value === "string") return value.trim() ? value : "Not provided";
            return String(value);
        };
        const displayDate = (value: unknown): string => {
            if (!value) return "Not provided";
            const date = new Date(value as string | number | Date);
            return Number.isNaN(date.getTime()) ? display(value) : format(date, "dd/MM/yyyy");
        };
        const yesNo = (value: unknown): "Yes" | "No" => {
            if (value === true) return "Yes";
            if (typeof value === "string") {
                const normalized = value.trim().toLowerCase();
                if (normalized === "yes" || normalized === "true" || normalized === "1") return "Yes";
            }
            return "No";
        };
        const labelFromKey = (value: string): string =>
            value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()).trim();

        yPos = await addSectionTitle(ctx, "Resident Information", yPos);
        yPos = await addField(ctx, "Resident Name", source.residentName ?? nested.residentName ?? `${resident?.first_name || ""} ${resident?.last_name || ""}`.trim(), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Date of Birth", source.dateOfBirth ?? nested.dateOfBirth ?? resident?.date_of_birth, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Bedroom Number", source.bedroomNumber ?? nested.bedroomNumber ?? resident?.room_number, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Assessment Date", displayDate(source.assessment_date ?? nested.assessment_date ?? source.assessmentDate ?? nested.assessmentDate), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Height", details.height ?? source.height ?? nested.height, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Weight", details.weight ?? source.weight ?? nested.weight, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Current MUST Score", source.must_score ?? source.mustScore ?? nested.must_score ?? nested.mustScore, margin, yPos, fullWidth);

        yPos = await addSectionTitle(ctx, "Clinical Involvement", yPos + 2);
        yPos = await addField(ctx, "SALT Involvement", yesNo(details.hasSaltInvolvement ?? source.hasSaltInvolvement ?? nested.hasSaltInvolvement), margin, yPos, fullWidth);
        yPos = await addField(ctx, "SALT Therapist Name", details.saltTherapistName ?? source.saltTherapistName ?? nested.saltTherapistName, margin, yPos, fullWidth);
        yPos = await addField(ctx, "SALT Contact Details", details.saltContactDetails ?? source.saltContactDetails ?? nested.saltContactDetails, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Dietitian Involvement", yesNo(details.hasDietitianInvolvement ?? source.hasDietitianInvolvement ?? nested.hasDietitianInvolvement), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Dietitian Name", details.dietitianName ?? source.dietitianName ?? nested.dietitianName, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Dietitian Contact Details", details.dietitianContactDetails ?? source.dietitianContactDetails ?? nested.dietitianContactDetails, margin, yPos, fullWidth);

        yPos = await addSectionTitle(ctx, "Dietary Requirements", yPos + 2);
        yPos = await addField(ctx, "Food Fortification Required", details.foodFortificationRequired ?? source.foodFortificationRequired ?? nested.foodFortificationRequired, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Supplements Prescribed", details.supplementsPrescribed ?? source.supplementsPrescribed ?? nested.supplementsPrescribed, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Assistance Required", details.assistanceRequired ?? source.assistanceRequired ?? nested.assistanceRequired, margin, yPos, fullWidth);

        yPos = await addSectionTitle(ctx, "IDDSI Food Consistency", yPos + 2);
        for (const key of ["level7EasyChew", "level6SoftBiteSized", "level5MincedMoist", "level4Pureed", "level3Liquidised"]) {
            yPos = await addField(ctx, labelFromKey(key), yesNo(foodConsistency[key]), margin, yPos, fullWidth);
        }

        yPos = await addSectionTitle(ctx, "IDDSI Fluid Consistency", yPos + 2);
        for (const key of ["level4ExtremelyThick", "level3ModeratelyThick", "level2MildlyThick", "level1SlightlyThick", "level0Thin"]) {
            yPos = await addField(ctx, labelFromKey(key), yesNo(fluidConsistency[key]), margin, yPos, fullWidth);
        }

        yPos = await addSectionTitle(ctx, "Assessment Completion", yPos + 2);
        yPos = await addField(ctx, "Completed By", source.completed_by ?? source.completedBy ?? nested.completed_by ?? nested.completedBy, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Job Role", details.jobRole ?? source.jobRole ?? nested.jobRole, margin, yPos, fullWidth);
        yPos = await addField(ctx, "Signature", details.signature ?? source.signature ?? nested.signature, margin, yPos, fullWidth);

        const monthlyQuestions = [
            "mustScoreChange",
            "saltReferralRequired",
            "saltInputReceived",
            "specialisedDietChange",
            "foodConsistencyChange",
            "fluidConsistencyChange",
            "foodFortificationRequired",
            "supplementsPrescribed",
            "assistanceRequired"
        ];

        if (monthly.length > 0) {
            yPos = await addSectionTitle(ctx, "Monthly Review", yPos + 2);
            for (let i = 0; i < monthly.length; i += 1) {
                const review = (monthly[i] ?? {}) as Record<string, unknown>;
                yPos = await addSectionTitle(ctx, `Review ${i + 1}`, yPos + 1);
                yPos = await addField(ctx, "Review Date", displayDate(review.date), margin, yPos, fullWidth);
                yPos = await addField(ctx, "Completed By", display(review.completedBy), margin, yPos, fullWidth);
                for (const key of monthlyQuestions) {
                    yPos = await addField(ctx, labelFromKey(key), yesNo(review[key]), margin, yPos, fullWidth);
                    yPos = await addField(ctx, `${labelFromKey(key)} Notes`, display(review[`${key}Notes`]), margin, yPos, fullWidth);
                }
            }
        }

        doc.save(`Nutrition-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // Default Fallback: If no custom handler matched
    yPos = await addSectionTitle(ctx, "FORM DETAILS", yPos);
    // Render basic information in key-value pairs
    for (const [key, value] of Object.entries(data)) {
        if (!SKIP_KEYS.has(key) && !isEmptyValue(value)) {
            yPos = await addField(ctx, formatFieldKey(key), value, margin, yPos, fullWidth);
        }
    }

    doc.save(`${toSafeFilePart(formName)}-${toSafeFilePart(resident?.last_name || "Resident")}-${new Date().getTime()}.pdf`);
};

const SKIP_KEYS = new Set([
    "id", "_id", "resident_id", "organization_id", "team_id", "created_by",
    "created_at", "updated_at", "updated_by", "pdf_file_id", "pdf_generated",
    "status", "is_archived", "_creationTime", "goals", "care_plan_type"
]);

const isEmptyValue = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    if (typeof value === "number") return false;
    if (typeof value === "boolean") return false;
    if (Array.isArray(value)) {
        if (value.length === 0) return true;
        return value.every(v => isEmptyValue(v));
    }
    if (typeof value === "object") {
        const entries = Object.entries(value).filter(([k]) => !SKIP_KEYS.has(k));
        if (entries.length === 0) return true;
        return entries.every(([_, v]) => isEmptyValue(v));
    }
    return false;
};

const formatFieldKey = (key: string): string => {
    return key
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
};
