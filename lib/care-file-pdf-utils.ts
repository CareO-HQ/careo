import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { generate } from "@pdfme/generator";
import { BLANK_PDF, Template } from "@pdfme/common";

interface GenerateCareFilePDFOptions {
    formName: string;
    data: any;
    resident: any;
    orgLogoUrl?: string;
    careHomeName?: string;
}

export const generateCareFilePDF = async ({
    formName,
    data,
    resident,
    orgLogoUrl,
    careHomeName
}: GenerateCareFilePDFOptions) => {
    if (formName.toUpperCase().includes("GENERAL RISK ASSESSMENT")) {
        type RiskLevelEntry = {
            area: string;
            level?: "low" | "medium" | "high";
            notes?: string;
        };

        type GeneralRiskAssessmentData = {
            fullName?: string;
            dateOfBirth?: string;
            nhsNumber?: string;
            roomNumber?: string;
            dateOfAssessment?: string;
            assessmentCompletedBy?: string;
            role?: string;
            reasonForAssessment?: string[];
            otherReason?: string;
            areasOfRisk?: string[];
            otherArea?: string;
            riskDescription?: string;
            riskLevels?: RiskLevelEntry[];
            controlMeasures?: string;
            equipmentRequired?: string[];
            otherEquipment?: string;
            residentInvolvement?: string[];
            involvementComments?: string;
            reviewFrequency?: string[];
            otherFrequency?: string;
            nextReviewDate?: string;
            assessorSignature?: string;
            signatureDate?: string;
        };

        const assessment = (data?.assessment_data ?? data ?? {}) as GeneralRiskAssessmentData;

        const displayValue = (value?: string): string => {
            if (!value) return "Not provided";
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : "Not provided";
        };

        const displayList = (values?: string[]): string => {
            if (!values || values.length === 0) return "Not selected";
            return values.join(", ");
        };

        const formatDateValue = (value?: string): string => {
            if (!value) return "Not provided";
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return displayValue(value);
            return format(parsed, "dd/MM/yyyy");
        };

        const riskEntries = (assessment.riskLevels ?? []).filter((entry) => Boolean(entry?.area));
        const riskLevelText = riskEntries.length > 0
            ? riskEntries
                .map((entry) => {
                    const areaLabel = entry.area === "OTHER_AREA"
                        ? `Other (${displayValue(assessment.otherArea)})`
                        : entry.area;
                    const levelLabel = entry.level ? entry.level.toUpperCase() : "NOT SET";
                    const notesLabel = entry.notes?.trim() ? ` | Notes: ${entry.notes.trim()}` : "";
                    return `- ${areaLabel}: ${levelLabel}${notesLabel}`;
                })
                .join("\n")
            : "Not specified";

        const sectionA = [
            `Full Name: ${displayValue(assessment.fullName)}`,
            `Date of Birth: ${formatDateValue(assessment.dateOfBirth)}`,
            `Resident / NHS Number: ${displayValue(assessment.nhsNumber)}`,
            `Room Number: ${displayValue(assessment.roomNumber)}`,
            `Date of Assessment: ${formatDateValue(assessment.dateOfAssessment)}`
        ].join("\n");

        const sectionB = [
            `Assessment Completed By: ${displayValue(assessment.assessmentCompletedBy)}`,
            `Role: ${displayValue(assessment.role)}`,
            `Reason for Assessment: ${displayList(assessment.reasonForAssessment)}`,
            `Other reason: ${displayValue(assessment.otherReason)}`
        ].join("\n");

        const sectionC = [
            `Areas of Risk: ${displayList(assessment.areasOfRisk)}`,
            `Other area: ${displayValue(assessment.otherArea)}`
        ].join("\n");

        const sectionD = `Description:\n${displayValue(assessment.riskDescription)}`;
        const sectionF = `Control Measures and Actions:\n${displayValue(assessment.controlMeasures)}`;

        const sectionG = [
            `Equipment or Support Required: ${displayList(assessment.equipmentRequired)}`,
            `Other equipment/support: ${displayValue(assessment.otherEquipment)}`
        ].join("\n");

        const sectionH = [
            `Resident/Representative Involvement: ${displayList(assessment.residentInvolvement)}`,
            `Comments: ${displayValue(assessment.involvementComments)}`
        ].join("\n");

        const sectionI = [
            `Review Frequency: ${displayList(assessment.reviewFrequency)}`,
            `Other frequency: ${displayValue(assessment.otherFrequency)}`,
            `Next Review Date: ${formatDateValue(assessment.nextReviewDate)}`
        ].join("\n");

        const sectionJ = [
            `Assessor Signature: ${displayValue(assessment.assessorSignature)}`,
            `Signature Date: ${formatDateValue(assessment.signatureDate)}`
        ].join("\n");

        const template: Template = {
            basePdf: BLANK_PDF,
            schemas: [
                [
                    { name: "title", type: "text", content: "", position: { x: 10, y: 10 }, width: 190, height: 8, fontSize: 16 },
                    { name: "sectionAHeader", type: "text", content: "", position: { x: 10, y: 22 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionA", type: "text", content: "", position: { x: 10, y: 28 }, width: 190, height: 25, fontSize: 9 },
                    { name: "sectionBHeader", type: "text", content: "", position: { x: 10, y: 56 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionB", type: "text", content: "", position: { x: 10, y: 62 }, width: 190, height: 26, fontSize: 9 },
                    { name: "sectionCHeader", type: "text", content: "", position: { x: 10, y: 91 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionC", type: "text", content: "", position: { x: 10, y: 97 }, width: 190, height: 18, fontSize: 9 },
                    { name: "sectionDHeader", type: "text", content: "", position: { x: 10, y: 118 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionD", type: "text", content: "", position: { x: 10, y: 124 }, width: 190, height: 34, fontSize: 9 },
                    { name: "sectionEHeader", type: "text", content: "", position: { x: 10, y: 161 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionE", type: "text", content: "", position: { x: 10, y: 167 }, width: 190, height: 110, fontSize: 9 }
                ],
                [
                    { name: "titlePage2", type: "text", content: "", position: { x: 10, y: 10 }, width: 190, height: 8, fontSize: 14 },
                    { name: "sectionFHeader", type: "text", content: "", position: { x: 10, y: 22 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionF", type: "text", content: "", position: { x: 10, y: 28 }, width: 190, height: 34, fontSize: 9 },
                    { name: "sectionGHeader", type: "text", content: "", position: { x: 10, y: 65 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionG", type: "text", content: "", position: { x: 10, y: 71 }, width: 190, height: 20, fontSize: 9 },
                    { name: "sectionHHeader", type: "text", content: "", position: { x: 10, y: 94 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionH", type: "text", content: "", position: { x: 10, y: 100 }, width: 190, height: 28, fontSize: 9 },
                    { name: "sectionIHeader", type: "text", content: "", position: { x: 10, y: 131 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionI", type: "text", content: "", position: { x: 10, y: 137 }, width: 190, height: 24, fontSize: 9 },
                    { name: "sectionJHeader", type: "text", content: "", position: { x: 10, y: 164 }, width: 190, height: 6, fontSize: 11 },
                    { name: "sectionJ", type: "text", content: "", position: { x: 10, y: 170 }, width: 190, height: 20, fontSize: 9 },
                    { name: "generatedOn", type: "text", content: "", position: { x: 10, y: 285 }, width: 190, height: 6, fontSize: 8 }
                ]
            ]
        };

        const inputs = [
            {
                title: "General Risk Assessment",
                sectionAHeader: "Section A - Resident Information",
                sectionA,
                sectionBHeader: "Section B - Assessment Details",
                sectionB,
                sectionCHeader: "Section C - Areas of Risk Identified",
                sectionC,
                sectionDHeader: "Section D - Description of Identified Risks",
                sectionD,
                sectionEHeader: "Section E - Risk Level",
                sectionE: riskLevelText,
                titlePage2: "General Risk Assessment (continued)",
                sectionFHeader: "Section F - Control Measures and Actions",
                sectionF,
                sectionGHeader: "Section G - Equipment or Support Required",
                sectionG,
                sectionHHeader: "Section H - Resident / Representative Involvement",
                sectionH,
                sectionIHeader: "Section I - Review and Monitoring",
                sectionI,
                sectionJHeader: "Section J - Signatures",
                sectionJ,
                generatedOn: `Generated on ${format(new Date(), "dd/MM/yyyy")}`
            }
        ];

        const pdfBytes = await generate({
            template,
            inputs
        });

        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${resident?.last_name || "Resident"}_General_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // Helper to load images
    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    // --- BHSCT Specific PDF (before generic header) ---
    if (formName === "BHSCT Incident Report") {
        const drawBHSCTHeader = async () => {
            const startY = 15;
            try {
                const bhsctLogo = await loadImage(window.location.origin + '/Bhsctlogo.jpg');
                const canvas = document.createElement('canvas');
                canvas.width = bhsctLogo.naturalWidth;
                canvas.height = bhsctLogo.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(bhsctLogo, 0, 0);
                const logoDataUrl = canvas.toDataURL('image/jpeg');
                const logoW = 65;
                const aspect = bhsctLogo.naturalHeight / bhsctLogo.naturalWidth;
                const logoH = logoW * aspect;
                doc.addImage(logoDataUrl, 'JPEG', margin, startY, logoW, logoH);
            } catch (e) {
                console.warn("BHSCT Logo load failed", e);
            }

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("INDEPENDENT SECTOR", margin + 72, startY + 10);
            doc.text("ADVERSE INCIDENT REPORT FORM", margin + 72, startY + 18);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("To be completed following any adverse incident involving a Service User of", margin, startY + 32);
            doc.setFont("helvetica", "bold");
            doc.text("Belfast Health & Social Care Trust.", margin, startY + 38);
            return startY + 50;
        };

        const drawTable = (startY: number, tableData: any[][]) => {
            autoTable(doc, {
                startY,
                theme: 'plain',
                body: tableData,
                styles: {
                    lineWidth: 0.5,
                    lineColor: [0, 0, 0],
                    textColor: [0, 0, 0],
                    fontSize: 10,
                    cellPadding: 4,
                },
                columnStyles: {
                    0: { cellWidth: 60, fontStyle: 'bold' },
                    1: { cellWidth: pageWidth - margin * 2 - 60 }
                },
            });
            return (doc as any).lastAutoTable.finalY + 10;
        };

        let currentY = await drawBHSCTHeader();
        const val = (v: any) => v === undefined || v === null ? "" : String(v);

        const dobStr = data.serviceUserDOB ? format(new Date(data.serviceUserDOB), "dd/MM/yyyy") : "";
        const isMale = data.serviceUserGender === 'Male';
        const isFemale = data.serviceUserGender === 'Female';

        const page1Data = [
            ['Provider Name', val(data.providerName)],
            ['Name of Service User', val(data.serviceUserName)],
            ['DOB', dobStr],
            ['Gender', val(data.serviceUserGender)],
            ['Care Manager', val(data.careManager)],
            ['Address (including post code) where incident occurred', val(data.incidentAddress)],
            ['Exact location where incident occurred', val(data.exactLocation)],
            ['Date of Incident', data.incidentDate ? format(new Date(data.incidentDate), "dd/MM/yyyy") : ""],
            ['Time of Incident', val(data.incidentTime)],
            ['Brief, factual description of incident\n(including details of any equipment or medication involved)', val(data.incidentDescription)],
        ];
        currentY = drawTable(currentY, page1Data);

        doc.addPage();
        const page2Data = [
            ['Nature of Injury Sustained', val(data.natureOfInjury)],
            ['Details of immediate action taken and treatment given\n(ie. First aid, GP, hospital admission etc)', val(data.immediateActionTaken)],
            ['Persons notified including designation / relationship to Service User', val(data.personsNotified)],
            ['Name and designation of any witnesses', val(data.witnesses)],
            ['Name and designation of any staff member or any other Service User(s)\ninvolved. If other Service User(s) involved please include DOB.', val(data.staffInvolved)],
            ['Name of person reporting the incident', val(data.reporterName)],
            ['Signature', val(data.reporterSignature)],
            ['Designation', val(data.reporterDesignation)],
            ['Date reported', data.dateReported ? format(new Date(data.dateReported), "dd/MM/yyyy") : ""],
        ];
        drawTable(20, page2Data);

        doc.addPage();
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("To be completed by Provider Senior Staff / Service Manager", margin, 20);
        const page3Data = [
            ['Actions taken to prevent recurrence', val(data.preventionActions)],
            ['Date Service User\'s risk assessment and care plan updated following this incident', data.riskAssessmentUpdateDate ? format(new Date(data.riskAssessmentUpdateDate), "dd/MM/yyyy") : ""],
            ['Other Comments', val(data.otherComments)],
            ['Name', val(data.reviewerName)],
            ['Signature', val(data.reviewerSignature)],
            ['Designation', val(data.reviewerDesignation)],
            ['Date', data.reviewDate ? format(new Date(data.reviewDate), "dd/MM/yyyy") : ""],
        ];
        drawTable(27, page3Data);

        doc.save(`BHSCT-Incident-Report-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- SEHSCT Specific PDF ---
    if (formName === "SEHSCT Incident Report") {
        const val = (v: any) => v === undefined || v === null ? "" : String(v);
        const bool = (v: any) => v === true ? "[x] Yes [ ] No" : v === false ? "[ ] Yes [x] No" : "[ ] Yes [ ] No";
        let sehsctPageNum = 1;
        const contentWidth = pageWidth - 2 * margin; // 182mm
        const halfWidth = contentWidth / 2; // 91mm

        const ensureSpace = async (neededHeight: number, currentY: number): Promise<number> => {
            const pageHeight = doc.internal.pageSize.getHeight();
            if (currentY + neededHeight > pageHeight - 20) {
                drawFooter(sehsctPageNum);
                doc.addPage();
                sehsctPageNum++;
                return 20;
            }
            return currentY;
        };

        const drawSEHSCTHeader = async () => {
            const startY = 15;
            try {
                const sehsctLogo = await loadImage(window.location.origin + '/SEHSCTmainlogo.jpg');
                const canvas = document.createElement('canvas');
                canvas.width = sehsctLogo.naturalWidth;
                canvas.height = sehsctLogo.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(sehsctLogo, 0, 0);
                const logoDataUrl = canvas.toDataURL('image/jpeg');
                const logoW = 50;
                const aspect = sehsctLogo.naturalHeight / sehsctLogo.naturalWidth;
                const logoH = logoW * aspect;
                doc.addImage(logoDataUrl, 'JPEG', margin, startY, logoW, logoH);
            } catch (e) {
                console.warn("SEHSCT Logo load failed", e);
            }

            doc.setTextColor(0, 0, 0);
            const titleX = pageWidth / 2 + 5; // Centered between logo (64) and box (156)
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("INCIDENT FORM", titleX, startY + 10, { align: 'center' });
            doc.setFontSize(8.5);
            doc.text("for use by all Independent Sector Providers that hold a", titleX, startY + 16, { align: 'center' });
            doc.text("Contract with the South Eastern Health & Social Care Trust", titleX, startY + 20, { align: 'center' });

            // Datix Ref Box
            doc.setDrawColor(0);
            doc.setLineWidth(0.2);
            doc.rect(pageWidth - margin - 40, startY, 40, 20);
            doc.setFontSize(7);
            doc.text("For Office Use Only", pageWidth - margin - 38, startY + 5);
            doc.text("DATIX Ref:", pageWidth - margin - 38, startY + 11);
            doc.setFontSize(9);
            doc.text(val(data.datixRef), pageWidth - margin - 38, startY + 17);

            const leftNotes = [
                "• Use this form to report ALL incidents involving a service user/resident",
                "• Complete a separate form for each service user directly involved/affected",
                "• To be completed and forwarded within 2 working days of the incident occurring"
            ];
            const rightNotes = [
                "• Forms must be typed and not handwritten",
                "• Use Encryption when forwarding to the Trust by email",
                "• Record only known facts – do not record opinions",
                "• Email to Trust Key Worker and copy to Indsector.governance@setrust.hscni.net"
            ];

            autoTable(doc, {
                startY: startY + 30,
                theme: 'plain',
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
                styles: { fontSize: 7, cellPadding: 0.5, textColor: [0, 0, 0], fontStyle: 'normal' },
                body: [
                    [leftNotes[0], rightNotes[0]],
                    [leftNotes[1], rightNotes[1]],
                    [leftNotes[2], rightNotes[2]],
                    ["", rightNotes[3]],
                ],
                columnStyles: {
                    0: { cellWidth: contentWidth / 2 - 2 },
                    1: { cellWidth: contentWidth / 2 + 2 }
                }
            });

            return (doc as any).lastAutoTable.finalY + 5;
        };

        const drawFooter = (pageNum: number) => {
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text(`Page | ${pageNum}`, pageWidth - margin - 15, pageHeight - 10);
            doc.text("Independent Sector Provider Incidents Form (Draft Version V4 May 2024)", margin, pageHeight - 10);
        };

        // Page 1
        let currentY = await drawSEHSCTHeader();
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("SECTION 1 & 2", margin, currentY);
        currentY += 5;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } },
            body: [['A – Where and when did the incident occur?']],
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            body: [
                [
                    { content: 'Date of Incident', styles: { fontStyle: 'bold', cellWidth: 41 } },
                    { content: data.incidentDate ? format(new Date(data.incidentDate), "dd/MM/yyyy") : "", styles: { cellWidth: 50 } },
                    { content: 'Time of Incident', styles: { fontStyle: 'bold', cellWidth: 41 } },
                    { content: val(data.incidentTime), styles: { cellWidth: 50 } }
                ]
            ],
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            body: [
                [
                    { content: 'Primary Location e.g. service users home (including Address & Postcode)', styles: { fontStyle: 'bold', cellWidth: halfWidth, fillColor: [240, 240, 240] } },
                    { content: 'Exact location', styles: { fontStyle: 'bold', cellWidth: halfWidth, fillColor: [240, 240, 240] } }
                ],
                [
                    { content: val(data.primaryLocation), styles: { minCellHeight: 12 } },
                    { content: val(data.exactLocation), styles: { minCellHeight: 12 } }
                ]
            ],
        });
        currentY = (doc as any).lastAutoTable.finalY + 3;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } },
            body: [['B – Outline apparent circumstances of the incident (give brief factual objective details)']],
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            body: [
                [{ content: 'Outline what happened together with any relevant circumstances (bullet points preferred).', styles: { fillColor: [220, 220, 220], fontStyle: 'bold', fontSize: 7 } }],
                [{ content: val(data.incidentDescription), styles: { minCellHeight: 25 } }]
            ],
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            body: [
                [
                    { content: 'Was the incident caused as a result of behaviours of concern related to a specific illness or diagnosis?', styles: { fontStyle: 'bold', cellWidth: 132 } },
                    { content: bool(data.causedByBehaviors), styles: { cellWidth: 50, halign: 'center' } }
                ],
                [
                    { content: 'If yes, is this documented in their Care Plan?', styles: { fontStyle: 'bold', cellWidth: 132 } },
                    { content: bool(data.documentedInCarePlan), styles: { cellWidth: 50, halign: 'center' } }
                ],
                [
                    { content: 'What was the apparent cause of injury? e.g. slip, trip, fall, phys. assault etc.', styles: { fontStyle: 'bold', cellWidth: 132 } },
                    { content: val(data.apparentCauseOfInjury), styles: { cellWidth: 50 } }
                ]
            ],
        });
        currentY = (doc as any).lastAutoTable.finalY + 3;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } },
            body: [['C – Action taken Following incident and to Prevent Recurrence']],
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            body: [
                [{ content: 'Remedial action taken:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }, { content: val(data.remedialAction), styles: { minCellHeight: 12 } }],
                [{ content: 'Prevention actions:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }, { content: val(data.preventionActions), styles: { minCellHeight: 12 } }],
                [{ content: 'Care Plan updated date:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }, { content: val(data.riskAssessmentUpdateDate ? format(new Date(data.riskAssessmentUpdateDate), "dd/MM/yyyy") : "") }]
            ],
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: contentWidth - 50 } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 3;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } },
            body: [['D – Equipment and Property involved']]
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            body: [
                [{ content: `Equipment involved? ${bool(data.equipmentInvolved)}  Details: ${val(data.equipmentDetails)}`, styles: { minCellHeight: 8 } }],
                [{ content: `Reported to NIAC? ${bool(data.reportedToNIAC)}`, styles: { fontSize: 7.5, fontStyle: 'bold' } }],
                [{ content: `Property involved? ${bool(data.propertyInvolved)}  Details: ${val(data.propertyDetails)}`, styles: { minCellHeight: 8 } }]
            ]
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;

        currentY = await ensureSpace(50, currentY);

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } },
            body: [['E – Persons notified including designation / relationship to Service User']]
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            body: [[{ content: val(data.personsNotified), styles: { minCellHeight: 15 } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;

        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }, 
            body: [['F – Individual involved in or affected by the incident?']] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
            body: [
                [{ content: 'H&C Number', styles: { fontStyle: 'bold', fillColor: [230, 230, 230], cellWidth: 50 } }, { content: val(data.hcNumber), styles: { cellWidth: contentWidth - 50 } }],
                [{ content: 'Gender', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } }, { content: `${data.gender === 'Male' ? '[x] M [ ] F' : data.gender === 'Female' ? '[ ] M [x] F' : '[ ] M [ ] F'}`, styles: { cellWidth: 60 } }, { content: 'DOB', styles: { fontStyle: 'bold', fillColor: [230, 230, 230], cellWidth: 20 } }, { content: data.dob ? format(new Date(data.dob), "dd/MM/yyyy") : "", styles: { cellWidth: contentWidth - 50 - 60 - 20 } }],
                [{ content: 'Full Name (Not initials)', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } }, { content: val(data.serviceUserFullName), styles: { fontStyle: 'bold', fontSize: 10, cellWidth: contentWidth - 50 } }],
                [{ content: 'Trust Key Worker', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } }, { content: `Name: ${val(data.trustKeyWorkerName)}   Des: ${val(data.trustKeyWorkerDesignation)}`, styles: { cellWidth: contentWidth - 50 } }]
            ],
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;

        currentY = await ensureSpace(40, currentY);

        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }, 
            body: [['G – Injury Details and Attention Received']] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        const attArr = Array.isArray(data.attentionReceived) ? data.attentionReceived : [];
        const attOpts = ['None', 'First aid', 'A&E', 'GP', 'Other'].map(o => attArr.includes(o) ? `[x] ${o}` : `[ ] ${o}`).join("  ");
        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            body: [
                [{ content: `Injury suffered? ${bool(data.injurySuffered)}`, styles: { fontStyle: 'bold', cellWidth: contentWidth } }],
                [{ content: 'Part Affect:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 } }, { content: val(data.bodyPartAffected), styles: { cellWidth: 61 } }, { content: 'Nature:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 20 } }, { content: val(data.natureOfInjury), styles: { cellWidth: contentWidth - 30 - 61 - 20 } }],
                [{ content: 'Attention:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 } }, { content: attOpts + (attArr.includes('Other') ? `: ${val(data.attentionOther)}` : ""), styles: { cellWidth: contentWidth - 30 } }]
            ],
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;

        currentY = await ensureSpace(60, currentY);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("SECTION 3", margin, currentY);
        currentY += 4;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }, 
            body: [['A – Name and designation of any staff member/s or any other Service User/s involved.']] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            body: [[{ content: 'If other Service User/s involved please include DOB.', styles: { fillColor: [220, 220, 220], fontStyle: 'bold', fontSize: 7 } }], [{ content: val(data.staffInvolved), styles: { minCellHeight: 15 } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }, 
            body: [['B – Witness Details']] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            body: [[{ content: val(data.witnessDetails), styles: { minCellHeight: 10 } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;

        drawFooter(2);

        // Former Page 3
        currentY = await ensureSpace(80, currentY);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("SECTION 4", margin, currentY); currentY += 4;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }, 
            body: [['Provider Information']] 
        });
        currentY = (doc as any).lastAutoTable.finalY + 0.5;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            body: [
                [{ content: 'Provider Name & Address', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } }, { content: `${val(data.providerName)}\n${val(data.providerAddress)}`, styles: { minCellHeight: 12, cellWidth: contentWidth - 50 } }], 
                [{ content: 'Service Name', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } }, { content: val(data.serviceName) }], 
                [{ content: 'Type of Service', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } }, { content: val(data.typeOfService) }]
            ] 
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;

        currentY = await ensureSpace(40, currentY);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("SECTION 5 & 6", margin, currentY); currentY += 4;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }, 
            body: [['F(iii) – Medication involved (Name & Dose)']] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            body: [[{ content: val(data.medicationInvolved), styles: { minCellHeight: 15 } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;

        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }, 
            body: [['Who identified the incident?']] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            body: [[{ content: `${data.whoIdentified === 'Provider' ? '[x] Provider' : '[ ] Provider'}   ${data.whoIdentified === 'Trust' ? '[x] Trust' : '[ ] Trust'}`, styles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'center', cellWidth: contentWidth } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 7, cellPadding: 2 },
            body: [
                [{ content: 'Identifier Name', styles: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 35 } }, { content: val(data.identifierName), styles: { cellWidth: 56 } }, { content: 'Trust Name', styles: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 35 } }, { content: val(data.trustStaffName), styles: { cellWidth: contentWidth - 35 - 56 - 35 } }],
                [{ content: 'Job Title', styles: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 35 } }, { content: val(data.identifierJob) }, { content: 'Job Title', styles: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 35 } }, { content: val(data.trustStaffJob) }],
                [{ content: 'Email', styles: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 35 } }, { content: val(data.identifierEmail) }, { content: 'Email', styles: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 35 } }, { content: val(data.trustStaffEmail) }]
            ]
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 7, cellPadding: 2 }, 
            body: [[{ content: 'Return email (encrypted form):', styles: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255], cellWidth: 100 } }, { content: val(data.encryptedReturnEmail), styles: { cellWidth: contentWidth - 100 } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;

        // Former Page 4
        currentY = await ensureSpace(140, currentY);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("To be completed by the Trust Key Worker", pageWidth / 2, currentY, { align: 'center' }); currentY += 6;
        doc.setFontSize(10); doc.text("SECTION 7", margin, currentY); currentY += 4;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2, halign: 'center' }, 
            body: [[{ content: 'Outcome / Comments', styles: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 7, fontStyle: 'bold', cellPadding: 2 }, 
            body: [[{ content: 'I have reviewed the investigation and action(s) taken/planned and I agree:', styles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            body: [
                ['1.', { content: `${data.outcomeAgreement === '1' ? '[x]' : '[ ]'} No further action: ${val(data.outcomeRationale)}`, styles: { minCellHeight: 12, cellWidth: 134 } }, { content: '', styles: { cellWidth: 40 } }],
                ['2.', { content: `${data.outcomeAgreement === '2' ? '[x]' : '[ ]'} Further action required by Provider: ${val(data.furtherActionProviderDetails)}`, styles: { minCellHeight: 12, cellWidth: 134 } }, { content: `By: ${val(data.furtherActionProviderBy)}`, styles: { cellWidth: 40, fontSize: 7, fontStyle: 'italic' } }],
                ['3.', { content: `${data.outcomeAgreement === '3' ? '[x]' : '[ ]'} Further action required by Trust: ${val(data.furtherActionTrustDetails)}`, styles: { minCellHeight: 12, cellWidth: 134 } }, { content: `By: ${val(data.furtherActionTrustBy)}`, styles: { cellWidth: 40, fontSize: 7, fontStyle: 'italic' } }]
            ],
            columnStyles: { 0: { cellWidth: 8 } }
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            body: [[{ content: 'Lessons Learned', styles: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }], [{ content: val(data.lessonsLearned), styles: { minCellHeight: 12 } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, { 
            startY: currentY, 
            theme: 'grid', 
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 8, cellPadding: 2 }, 
            body: [[{ content: 'Final Review and Outcome', styles: { fontStyle: 'bold', fillColor: [0, 0, 0], textColor: [255, 255, 255] } }]] 
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 7, cellPadding: 2 },
            body: [
                [{ content: `All issues dealt with? ${bool(data.allIssuesDealt)}\nClient satisfied? ${bool(data.clientSatisfied)}\nReady for closure? ${bool(data.readyForClosure)}`, styles: { cellWidth: halfWidth, minCellHeight: 20 } }, { content: `Response details:\n${val(data.finalReviewDetails)}`, styles: { cellWidth: halfWidth } }]
            ]
        });
        currentY = (doc as any).lastAutoTable.finalY;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { fontSize: 7, cellPadding: 1.5 },
            body: [
                [
                    { content: 'Key Worker', styles: { cellWidth: 35, fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
                    { content: val(data.keyWorkerNameDesignation), styles: { cellWidth: 50 } }, 
                    { content: 'Sig:', styles: { cellWidth: 15, fontStyle: 'bold' } }, 
                    { content: val(data.keyWorkerSignature), styles: { cellWidth: 47 } }, 
                    { content: 'Date:', styles: { cellWidth: 15, fontStyle: 'bold' } }, 
                    { content: val(data.dateClosedByTrust), styles: { cellWidth: 20 } }
                ],
                [
                    { content: 'Line Manager', styles: { cellWidth: 35, fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
                    { content: val(data.lineManagerNameDesignation), styles: { cellWidth: 50 } }, 
                    { content: 'Sig:', styles: { cellWidth: 15, fontStyle: 'bold' } }, 
                    { content: val(data.lineManagerSignature), styles: { cellWidth: 47 } }, 
                    { content: 'Date:', styles: { cellWidth: 15, fontStyle: 'bold' } }, 
                    { content: val(data.dateApproved), styles: { cellWidth: 20 } }
                ]
            ]
        });

        drawFooter(sehsctPageNum);

        doc.save(`SEHSCT-Incident-Report-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Best Interest Decision Form ---
    if (formName === "Best Interest Decision Form") {
        const val = (v: any) => v === undefined || v === null ? "" : String(v);
        const drawBIDHeader = async () => {
             doc.setFontSize(14);
             doc.setFont("helvetica", "bold");
             const title = "BEST INTEREST DECISION FORM FOR RESIDENTS WHO ARE UNABLE TO CONSENT TO INVESTIGATION/TREATMENT/PROCEDURE/RESTRAINT";
             const splitTitle = doc.splitTextToSize(title.toUpperCase(), pageWidth - margin * 2);
             doc.text(splitTitle, margin, 20, { align: 'left' });
             return 20 + (splitTitle.length * 7);
        };

        let currentY = await drawBIDHeader();

        // Resident Details Box
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(margin, currentY, pageWidth - margin * 2, 45);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Resident Details", margin + 5, currentY + 8);
        doc.line(margin + 5, currentY + 9, margin + 35, currentY + 9);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Resident's Name:", margin + 5, currentY + 18);
        doc.setFont("helvetica", "normal");
        doc.text(val(data.residentName), margin + 40, currentY + 18);
        doc.line(margin + 40, currentY + 19, margin + 40 + 50, currentY + 19);

        doc.setFont("helvetica", "bold");
        doc.text("Date of Birth:", margin + 5, currentY + 28);
        doc.setFont("helvetica", "normal");
        doc.text(data.dateOfBirth ? format(new Date(data.dateOfBirth), "dd/MM/yyyy") : "N/A", margin + 40, currentY + 28);
        doc.line(margin + 40, currentY + 29, margin + 40 + 50, currentY + 29);

        doc.setFont("helvetica", "bold");
        doc.text("GP:", margin + 5, currentY + 38);
        doc.setFont("helvetica", "normal");
        doc.text(val(data.gpName), margin + 40, currentY + 38);
        doc.line(margin + 40, currentY + 39, margin + 40 + 50, currentY + 39);

        doc.setFont("helvetica", "bold");
        doc.text("Staff member involved in Discussion (PRINT):", margin + 100, currentY + 18);
        doc.setFont("helvetica", "normal");
        const staffName = val(data.staffMemberInvolved);
        doc.text(staffName, margin + 100, currentY + 26);
        doc.line(margin + 100, currentY + 27, pageWidth - margin - 5, currentY + 27);

        currentY += 55;

        // Declaration Section
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const decl1 = "I/We have been involved in a discussion with the relevant health professionals over the investigation/treatment/procedure/restraint proposed of";
        const splitDecl1 = doc.splitTextToSize(decl1, pageWidth - margin * 2);
        doc.text(splitDecl1, margin, currentY);
        currentY += splitDecl1.length * 5;

        doc.setFont("helvetica", "bold");
        const splitProposed = doc.splitTextToSize(val(data.proposedTreatmentOf), pageWidth - margin * 2);
        doc.text(splitProposed, margin, currentY);
        currentY += splitProposed.length * 5 + 2;

        doc.setFont("helvetica", "normal");
        doc.text("for (Explain what treatment is)", margin, currentY);
        currentY += 5;
        doc.setFont("helvetica", "bold");
        const splitTreatment = doc.splitTextToSize(val(data.treatmentDescription), pageWidth - margin * 2);
        doc.text(splitTreatment, margin, currentY);
        currentY += splitTreatment.length * 5 + 5;

        doc.setFont("helvetica", "normal");
        const decl2 = "I/We understand that he/she is unable to give his/her consent. I/We also understand that investigation/treatment/procedure/restraint may lawfully be carried out if it is in his/her best interests to receive it.";
        const splitDecl2 = doc.splitTextToSize(decl2, pageWidth - margin * 2);
        doc.text(splitDecl2, margin, currentY);
        currentY += splitDecl2.length * 5 + 10;

        // Comments Section
        doc.setFont("helvetica", "bold");
        doc.text("Any other comments, including concerns about the decision:", margin, currentY);
        currentY += 7;
        doc.setLineWidth(0.2);
        doc.rect(margin, currentY, pageWidth - margin * 2, 40);
        doc.setFont("helvetica", "normal");
        const splitComments = doc.splitTextToSize(val(data.otherComments), pageWidth - margin * 2 - 10);
        doc.text(splitComments, margin + 5, currentY + 7);
        currentY += 50;

        // Sign-off Section
        const leftColX = margin;
        const rightColX = margin + 100;

        doc.setFont("helvetica", "bold");
        doc.text("Name:", leftColX, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(val(data.signerName), leftColX + 15, currentY);
        doc.line(leftColX + 15, currentY + 1, leftColX + 90, currentY + 1);

        doc.setFont("helvetica", "bold");
        doc.text("Relationship to Resident:", rightColX, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(val(data.signerRelationship), rightColX + 45, currentY);
        doc.line(rightColX + 45, currentY + 1, pageWidth - margin, currentY + 1);

        currentY += 12;
        doc.setFont("helvetica", "bold");
        doc.text("Address:", leftColX, currentY);
        doc.setFont("helvetica", "normal");
        const splitAddress = doc.splitTextToSize(val(data.signerAddress), pageWidth - margin - (leftColX + 18));
        doc.text(splitAddress, leftColX + 18, currentY);
        currentY += splitAddress.length * 5;

        currentY += 12;
        doc.setFont("helvetica", "bold");
        doc.text("Signature:", leftColX, currentY);
        doc.setFont("helvetica", "italic");
        doc.text(val(data.signerSignature), leftColX + 22, currentY);
        doc.line(leftColX + 22, currentY + 1, leftColX + 90, currentY + 1);

        doc.setFont("helvetica", "bold");
        doc.text("Date:", rightColX, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(val(data.signerDate), rightColX + 12, currentY);
        doc.line(rightColX + 12, currentY + 1, rightColX + 50, currentY + 1);

        doc.save(`Best-Interest-Decision-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- PDF Layout Helpers ---
    const drawHeader = async () => {
        const headerHeight = 22;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        doc.setFillColor(34, 197, 94); // #22c55e green
        doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');
        doc.setTextColor(31, 41, 55);
        // Reduce font size for long form names to prevent logo overlap
        if (formName.toUpperCase().includes("INFECTION PREVENTION")) {
            doc.setFontSize(13);
        } else {
            doc.setFontSize(16);
        }
        doc.setFont("helvetica", "bold");
        doc.text(formName.toUpperCase(), margin, 14);

        if (orgLogoUrl) {
            try {
                const logoImg = await loadImage(orgLogoUrl);
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.naturalWidth;
                canvas.height = logoImg.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(logoImg, 0, 0);
                const logoDataUrl = canvas.toDataURL('image/png');
                const logoSize = 14;
                const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
                const logoW = logoSize * aspect;
                doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, (headerHeight - logoSize) / 2, logoW, logoSize);
            } catch (e) {
                console.warn("Logo load failed", e);
            }
        }
    };

    const ensureSpace = async (heightNeeded: number, currentY: number) => {
        if (currentY + heightNeeded > 280) {
            doc.addPage();
            await drawHeader();
            return 30; // Return new yPos after header
        }
        return currentY;
    };

    let yPos = 30;
    await drawHeader();

    const assessmentDataForSpecialized = data.assessment_details || data.assessmentDetails || data.assessment_data || data;

    const addSectionTitle = async (title: string, y: number) => {
        y = await ensureSpace(12, y);
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + 8);
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), margin + 4, y + 5.5);
        doc.setTextColor(0, 0, 0);
        return y + 10;
    };

    const addField = async (label: string, value: any, x: number, y: number, width: number, skipSpaceCheck = false) => {
        if (!skipSpaceCheck) {
            y = await ensureSpace(12, y); 
        }
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(label.toUpperCase(), x, y);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);

        const displayValue = formatValue(value);
        if (!displayValue && typeof value === 'object') return y; 

        const splitValue = doc.splitTextToSize(displayValue, width);
        doc.text(splitValue, x, y + 4);
        return y + 4 + (splitValue.length * 4);
    };

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return "N/A";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        if (Array.isArray(value)) {
            if (value.length === 0) return "None";
            if (typeof value[0] !== 'object') return value.join(", ");
            return `${value.length} items`;
        }
        if (typeof value === "string") {
            const enumMap: Record<string, string> = {
                "ABLE_TO_CONSENT": "Resident is able to consent",
                "UNABLE_TO_CONSENT": "Resident is unable to consent",
                "PREFER_USE": "I prefer that restraint is used.",
                "DO_NOT_WANT_USE": "I do not want any form of restraint used.",
                "WOULD_HAVE_PREFERRED": "would have preferred",
                "WOULD_NOT_HAVE_PREFERRED": "not preferred"
            };

            const mappedValue = enumMap[value] || value;
            // Remove underscores and fix casing
            return mappedValue.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        }
        if (typeof value === "object") return "";
        return String(value);
    };

    // --- Admission Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("ADMISSION ASSESSMENT")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawAdmissionHeader = async () => {
            await drawHeader();
        };

        const ensureAdmissionSpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawAdmissionHeader();
                return 30;
            }
            return currentY;
        };

        let yPos = 30;
        await drawAdmissionHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // 1. Basic Information
        yPos = await addSectionTitle("BASIC INFORMATION", yPos);
        yPos = await ensureAdmissionSpace(40, yPos);
        const rowBasicY = yPos;
        const fName = assessmentData.firstName || data.first_name || resident?.first_name || "";
        const lName = assessmentData.lastName || data.last_name || resident?.last_name || "";
        let yBasic1 = await addField("Full Name", `${fName} ${lName}`.trim(), margin, rowBasicY, cpWidth, true);
        const dobValue = assessmentData.dateOfBirth || data.date_of_birth || resident?.date_of_birth;
        yBasic1 = await addField("Date of Birth", dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A", margin, yBasic1, cpWidth, true);
        yBasic1 = await addField("Bedroom Number", assessmentData.bedroomNumber || resident?.room_number || "N/A", margin, yBasic1, cpWidth, true);
        yBasic1 = await addField("NHS Number", assessmentData.NHSNumber || resident?.nhs_health_number || "N/A", margin, yBasic1, cpWidth, true);

        let yBasic2 = await addField("Admitted From", assessmentData.admittedFrom || "N/A", cpCol2, rowBasicY, cpWidth, true);
        yBasic2 = await addField("Gender", assessmentData.gender || "N/A", cpCol2, yBasic2, cpWidth, true);
        yBasic2 = await addField("Religion", assessmentData.religion || "N/A", cpCol2, yBasic2, cpWidth, true);
        yBasic2 = await addField("Telephone Number", assessmentData.telephoneNumber || "N/A", cpCol2, yBasic2, cpWidth, true);
        yPos = Math.max(yBasic1, yBasic2);
        yPos = await addField("Ethnicity", assessmentData.ethnicity || "N/A", margin, yPos, pageWidth - margin * 2);

        // 2. Next of Kin
        yPos = await addSectionTitle("NEXT OF KIN", yPos + 2);
        yPos = await ensureAdmissionSpace(30, yPos);
        const rowKinY = yPos;
        let yKin1 = await addField("Name", `${assessmentData.kinFirstName || ""} ${assessmentData.kinLastName || ""}`.trim(), margin, rowKinY, cpWidth, true);
        yKin1 = await addField("Relationship", assessmentData.kinRelationship || "N/A", margin, yKin1, cpWidth, true);
        yKin1 = await addField("Email", assessmentData.kinEmail || "N/A", margin, yKin1, cpWidth, true);

        let yKin2 = await addField("Telephone Number", assessmentData.kinTelephoneNumber || "N/A", cpCol2, rowKinY, cpWidth, true);
        yKin2 = await addField("Address", assessmentData.kinAddress || "N/A", cpCol2, yKin2, cpWidth, true);
        yPos = Math.max(yKin1, yKin2);

        // 3. Emergency Contacts
        yPos = await addSectionTitle("EMERGENCY CONTACTS", yPos + 2);
        yPos = await ensureAdmissionSpace(25, yPos);
        const rowEmY = yPos;
        let yEm1 = await addField("Name", assessmentData.emergencyContactName || "N/A", margin, rowEmY, cpWidth, true);
        yEm1 = await addField("Relationship", assessmentData.emergencyContactRelationship || "N/A", margin, yEm1, cpWidth, true);

        let yEm2 = await addField("Phone", assessmentData.emergencyContactTelephoneNumber || "N/A", cpCol2, rowEmY, cpWidth, true);
        yEm2 = await addField("Alt. Phone", assessmentData.emergencyContactPhoneNumber || "N/A", cpCol2, yEm2, cpWidth, true);
        yPos = Math.max(yEm1, yEm2);

        // 4. Professional Contacts
        yPos = await addSectionTitle("PROFESSIONAL CONTACTS", yPos + 2);
        yPos = await ensureAdmissionSpace(50, yPos);
        const rowProfY = yPos;
        let yProf1 = await addField("Care Manager Name", assessmentData.careManagerName || "N/A", margin, rowProfY, cpWidth, true);
        yProf1 = await addField("Care Manager Role", assessmentData.careManagerJobRole || "N/A", margin, yProf1, cpWidth, true);
        yProf1 = await addField("Care Manager Email", assessmentData.careManagerEmail || "N/A", margin, yProf1, cpWidth, true);
        yProf1 = await addField("Care Manager Addr", assessmentData.careManagerAddress || "N/A", margin, yProf1, cpWidth, true);

        let yProf2 = await addField("Care Manager Phone", assessmentData.careManagerTelephoneNumber || "N/A", cpCol2, rowProfY, cpWidth, true);
        yProf2 = await addField("Care Manager Alt. Phone", assessmentData.careManagerPhoneNumber || "N/A", cpCol2, yProf2, cpWidth, true);
        yProf2 = await addField("GP Name", assessmentData.GPName || "N/A", cpCol2, yProf2, cpWidth, true);
        yProf2 = await addField("GP Phone", assessmentData.GPPhoneNumber || "N/A", cpCol2, yProf2, cpWidth, true);
        yProf2 = await addField("GP Address", assessmentData.GPAddress || "N/A", cpCol2, yProf2, cpWidth, true);
        yPos = Math.max(yProf1, yProf2);

        // 5. Medical Information
        yPos = await addSectionTitle("MEDICAL INFORMATION", yPos + 2);
        yPos = await addField("Allergies", assessmentData.allergies || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Full Medical History", assessmentData.medicalHistory || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Prescribed Medications", assessmentData.prescribedMedications || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Consent & Capacity", assessmentData.consentCapacityRights || "N/A", margin, yPos, pageWidth - margin * 2);

        // 6. Integrated Care Assessments
        yPos = await addSectionTitle("INTEGRATED CARE ASSESSMENTS", yPos + 2);
        yPos = await addField("Skin Integrity Equipment Required", assessmentData.skinIntegrityEquipment || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Are there any wounds present?", assessmentData.skinIntegrityWounds || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addField("Sleep/Psych/Emotional Independent", assessmentData.sleepPsychologicalIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Normal Bedtime Routine", assessmentData.bedtimeRoutine || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Psychological & Emotional Needs", assessmentData.psychologicalNeeds || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addField("Current Infection", assessmentData.currentInfection || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Antibiotics Prescribed", assessmentData.antibioticsPrescribed ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        
        yPos = await addField("Breathing Independent", assessmentData.breathingIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Respiratory Support Details", assessmentData.prescribedBreathing || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await ensureAdmissionSpace(30, yPos);
        const rowMobY = yPos;
        let yMob1 = await addField("Independent Mobility", assessmentData.mobilityIndependent ? "Yes" : "No", margin, rowMobY, cpWidth, true);
        yMob1 = await addField("Assistance Required", assessmentData.assistanceRequired || "N/A", margin, yMob1, cpWidth, true);
        let yMob2 = await addField("Mobility Equipment", assessmentData.equipmentRequired || "N/A", cpCol2, rowMobY, cpWidth, true);
        yMob2 = await addField("Altered Consciousness", assessmentData.alteredConsciousness || "N/A", cpCol2, yMob2, cpWidth, true);
        yPos = Math.max(yMob1, yMob2);

        // 7. Nutrition, Diet & Hydration
        yPos = await addSectionTitle("NUTRITION, DIET & HYDRATION", yPos + 2);
        yPos = await ensureAdmissionSpace(35, yPos);
        const rowNutY = yPos;
        let yNut1 = await addField("Weight (kg)", assessmentData.weight || "N/A", margin, rowNutY, cpWidth, true);
        yNut1 = await addField("Height (cm)", assessmentData.height || "N/A", margin, yNut1, cpWidth, true);
        yNut1 = await addField("IDDSI Food Level", assessmentData.iddsiFood || "N/A", margin, yNut1, cpWidth, true);
        yNut1 = await addField("IDDSI Fluid Level", assessmentData.iddsiFluid || "N/A", margin, yNut1, cpWidth, true);

        let yNut2 = await addField("Diet Type / Preferences", assessmentData.dietType || "N/A", cpCol2, rowNutY, cpWidth, true);
        yNut2 = await addField("Nutritional Supplements", assessmentData.nutritionalSupplements || "N/A", cpCol2, yNut2, cpWidth, true);
        yNut2 = await addField("Nutritional Assistance", assessmentData.nutritionalAssistanceRequired || "N/A", cpCol2, yNut2, cpWidth, true);
        yNut2 = await addField("Choking Risk", assessmentData.chokingRisk ? "Yes" : "No", cpCol2, yNut2, cpWidth, true);
        yPos = Math.max(yNut1, yNut2);

        // 8. Continence & Personal Hygiene
        yPos = await addSectionTitle("CONTINENCE & PERSONAL HYGIENE", yPos + 2);
        yPos = await addField("Continence Independent", assessmentData.continenceIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Continence Needs", assessmentData.continence || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Hygiene Independent", assessmentData.hygieneIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Personal Hygiene & Grooming", assessmentData.hygiene || "N/A", margin, yPos, pageWidth - margin * 2);

        // 9. Cognitive & Behavioural Assessment
        yPos = await addSectionTitle("COGNITIVE & BEHAVIOURAL ASSESSMENT", yPos + 2);
        yPos = await addField("Communication Independent", assessmentData.communicationIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Communication Needs", assessmentData.communication || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Behaviour Independent", assessmentData.behaviourIndependent ? "No challenging behaviour" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Behavioural Needs", assessmentData.behaviour || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Cognition Independent", assessmentData.cognitionIndependent ? "Fully orientated" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Cognitive Needs", assessmentData.cognition || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Additional Comments", assessmentData.additionalComments || "N/A", margin, yPos, pageWidth - margin * 2);

        // 10. Assessment Completion
        yPos = await addSectionTitle("ASSESSMENT COMPLETION", yPos + 2);
        yPos = await ensureAdmissionSpace(25, yPos);
        const rowCompY = yPos;
        let yComp1 = await addField("Completed By", assessmentData.completedBy || "N/A", margin, rowCompY, cpWidth, true);
        yComp1 = await addField("Job Role", assessmentData.jobRole || "N/A", margin, yComp1, cpWidth, true);

        const aDate = assessmentData.assessmentDate || data.assessment_date;
        let yComp2 = await addField("Date of Completion", aDate ? format(new Date(aDate), "PPP") : "N/A", cpCol2, rowCompY, cpWidth, true);
        yComp2 = await addField("Signature", assessmentData.signature || "N/A", cpCol2, yComp2, cpWidth, true);
        yPos = Math.max(yComp1, yComp2) + 10;

        doc.save(`Admission-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Dependency Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("DEPENDENCY ASSESSMENT")) {
        // Resident info section
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
        const col2 = margin + (pageWidth - margin * 2) / 2;
        const colWidth = (pageWidth - margin * 2) / 2 - 5;

        yPos = await ensureSpace(25, yPos);
        const rowDepY = yPos;
        let y1 = await addField("Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, rowDepY, colWidth, true);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField("Date of Birth", formattedDob, margin, y1 + 1, colWidth, true);
        y1 = await addField("NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, y1 + 1, colWidth, true);

        let y2 = await addField("Care Home", careHomeName || "N/A", col2, rowDepY, colWidth, true);
        y2 = await addField("Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, y2 + 1, colWidth, true);
        y2 = await addField("Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2 + 1, colWidth, true);

        yPos = Math.max(y1, y2) + 6;

        // History Table (Show this first after resident info)
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle("PAST ASSESSMENTS HISTORY", yPos);

            autoTable(doc, {
                startY: yPos,
                head: [['Date', 'By', 'Mob', 'Dre', 'Hyg', 'Fed', 'Eye', 'Hea', 'Brad', 'Uri', 'Fae', 'Com', 'Soc', 'Beh', 'Tot', 'Lvl']],
                body: data.history.map((h: any) => {
                    const det = h.assessment_details || {};
                    return [
                        format(new Date(h.assessment_date), "dd/MM/yy"),
                        h.completed_by || h.completedBy || "N/A",
                        det.mobility || 0,
                        det.dressing || 0,
                        det.personalHygiene || 0,
                        det.feeding || 0,
                        det.eyesight || 0,
                        det.hearing || 0,
                        det.pressureSoreRisk || 0,
                        det.continenceUrine || 0,
                        det.continenceFaeces || 0,
                        det.communication || 0,
                        det.socialDependency || 0,
                        det.behaviour || 0,
                        h.total_score || 0,
                        h.dependency_level?.[0] || ""
                    ];
                }),
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 15 },
                    1: { halign: 'left', cellWidth: 20 },
                }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Current assessment details (Show only if data exists and is not just the empty form)
        const hasCurrentData = data.total_score !== undefined || data.assessment_details;
        if (hasCurrentData) {
            yPos = await addSectionTitle("CURRENT ASSESSMENT DETAILS", yPos);
            const assessmentDate = data.assessment_date || data.created_at || new Date();
            const completedBy = data.completed_by || data.completedBy || "N/A";

            let ay1 = await addField("Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
            ay1 = await addField("Total Score", `${data.total_score || 0} pts`, margin, ay1, colWidth);

            let ay2 = await addField("Completed By", completedBy, col2, yPos, colWidth);
            ay2 = await addField("Dependency Level", data.dependency_level || "N/A", col2, ay2, colWidth);

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

    // --- Fall Risk Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("FALL RISK ASSESSMENT")) {
        // Resident info section
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
        const col2 = margin + (pageWidth - margin * 2) / 2;
        const colWidth = (pageWidth - margin * 2) / 2 - 5;

        yPos = await ensureSpace(25, yPos);
        const rowFallY = yPos;
        let y1 = await addField("Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, rowFallY, colWidth, true);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField("Date of Birth", formattedDob, margin, y1 + 1, colWidth, true);
        y1 = await addField("NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, y1 + 1, colWidth, true);

        let y2 = await addField("Care Home", careHomeName || "N/A", col2, rowFallY, colWidth, true);
        y2 = await addField("Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, y2 + 1, colWidth, true);
        y2 = await addField("Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2 + 1, colWidth, true);

        yPos = Math.max(y1, y2) + 6;

        // History Table
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle("PAST ASSESSMENTS HISTORY", yPos);

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

            autoTable(doc, {
                startY: yPos,
                head: [['Date', 'Age', 'Sex', 'Fall', 'Mob', 'Bal', 'ADLP', 'ADLD', 'Foot', 'Vis', 'B&B', 'Env', 'Soc', 'MedC', 'Meds', 'Safe', 'Ment', 'Tot', 'Risk', 'By']],
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
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 6, cellPadding: 1 },
                columnStyles: {
                    0: { cellWidth: 12 },
                    17: { halign: 'center', fontStyle: 'bold', cellWidth: 8 },
                    18: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
                    19: { cellWidth: 15 }
                }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Current assessment details
        const hasCurrentData = data.total_score !== undefined || data.assessment_details;
        if (hasCurrentData) {
            yPos = await addSectionTitle("CURRENT ASSESSMENT DETAILS", yPos);
            const assessmentDate = data.assessment_date || data.created_at || new Date();
            const completedBy = data.completed_by || data.completedBy || "N/A";

            let ay1 = await addField("Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
            ay1 = await addField("Total Score", `${data.total_score || 0} pts`, margin, ay1, colWidth);

            let ay2 = await addField("Completed By", completedBy, col2, yPos, colWidth);
            ay2 = await addField("Risk Level", data.risk_level || "N/A", col2, ay2, colWidth);

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

            const getSectionScore = (field: string, label: string) => {
                const options = FALL_RISK_OPTIONS[field];
                if (!options) return 0;
                const option = options.find((o: any) => o.label === label);
                return option ? option.value : 0;
            };

            const details = data.assessment_details || {};
            const breakdownData = Object.entries(details)
                .map(([k, v]) => {
                    const label = k.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\b\w/g, l => l.toUpperCase()).trim();
                    const score = getSectionScore(k, String(v));
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
    if (formName.toUpperCase().includes("CHOKING RISK ASSESSMENT")) {
        const col2 = margin + (pageWidth - margin * 2) / 2;
        const colWidth = (pageWidth - margin * 2) / 2 - 5;

        // 1. Resident Information (always first)
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);

        yPos = await ensureSpace(25, yPos);
        const rowChokeY = yPos;
        let y1 = await addField("Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, rowChokeY, colWidth, true);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField("Date of Birth", formattedDob, margin, y1 + 1, colWidth, true);
        y1 = await addField("NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, y1 + 1, colWidth, true);

        let y2 = await addField("Care Home", careHomeName || "N/A", col2, rowChokeY, colWidth, true);
        y2 = await addField("Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, y2 + 1, colWidth, true);
        y2 = await addField("Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2 + 1, colWidth, true);

        yPos = Math.max(y1, y2) + 6;

        // Helper to calculate section score from risk_factors JSONB
        const calcSectionScore = (factors: any, keys: { [k: string]: number }) => {
            return Object.entries(keys).reduce((acc, [key, pts]) => {
                return factors?.[key] ? acc + pts : acc;
            }, 0);
        };

        // 2. Past Assessments History table
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle("PAST ASSESSMENTS HISTORY", yPos);

            autoTable(doc, {
                startY: yPos,
                head: [['Date', 'Completed By', 'Resp', 'At Risk', 'Phys', 'Behavr', 'Eating', 'Recogn', 'Med', 'Total', 'Level']],
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
                        h.risk_level?.replace(" Risk", "") || "N/A"
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
            yPos = await addSectionTitle("CURRENT ASSESSMENT DETAILS", yPos);
            const assessmentDate = data.assessment_date || data.created_at || new Date();
            const completedBy = data.completed_by || data.completedBy || "N/A";

            let ay1 = await addField("Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
            ay1 = await addField("Total Score", `${data.total_score || 0} pts`, margin, ay1, colWidth);
            ay1 = await addField("Completed By", completedBy, margin, ay1, colWidth);

            const ay2 = await addField("Risk Level", data.risk_level || "N/A", col2, yPos, colWidth);

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

    // --- Oral Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("ORAL ASSESSMENT")) {
        const col2 = margin + (pageWidth - margin * 2) / 2;
        const colWidth = (pageWidth - margin * 2) / 2 - 5;

        // 1. Resident Information
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);

        yPos = await ensureSpace(25, yPos);
        const rowOralY = yPos;
        let y1 = await addField("Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, rowOralY, colWidth, true);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField("Date of Birth", formattedDob, margin, y1 + 1, colWidth, true);
        y1 = await addField("NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, y1 + 1, colWidth, true);

        let y2 = await addField("Care Home", careHomeName || "N/A", col2, rowOralY, colWidth, true);
        y2 = await addField("Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, y2 + 1, colWidth, true);
        y2 = await addField("Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2 + 1, colWidth, true);

        yPos = Math.max(y1, y2) + 6;

        // 2. Current Assessment Details
        yPos = await addSectionTitle("ASSESSMENT DETAILS", yPos);
        const assessmentDate = data.assessment_date || data.created_at || new Date();
        const completedBy = data.completed_by || data.completedBy || "N/A";

        let ay1 = await addField("Assessment Date", format(new Date(assessmentDate), "dd/MM/yyyy"), margin, yPos, colWidth);
        ay1 = await addField("Completed By", completedBy, margin, ay1, colWidth);
        ay1 = await addField("Normal Hygiene Routine", data.oral_hygiene_routine || "N/A", margin, ay1, pageWidth - margin * 2);

        yPos = ay1 + 5;

        // Dental Info
        const d = data.dental_info || {};
        yPos = await addSectionTitle("DENTAL INFORMATION", yPos);
        let dy1 = await addField("Registered with Dentist", d.isRegisteredWithDentist ? "Yes" : "No", margin, yPos, colWidth);
        if (d.isRegisteredWithDentist) {
            dy1 = await addField("Last Seen", d.lastSeenByDentist || "N/A", margin, dy1, colWidth);
            dy1 = await addField("Dentist Name", d.dentistName || "N/A", margin, dy1, colWidth);
            dy1 = await addField("Contact", d.contactTelephone || "N/A", margin, dy1, colWidth);
            await addField("Practice Address", d.dentalPracticeAddress || "N/A", col2, yPos, colWidth);
        }
        yPos = dy1 + 10;

        // Examination Findings & Symptoms
        const ef = data.exam_findings || {};
        const s = data.symptoms || {};
        yPos = await addSectionTitle("EXAMINATION FINDINGS & SYMPTOMS", yPos);

        const examRows = [
            ["Lips: Dry/Cracked", ef.lipsDryCracked ? "Yes" : "No"],
            ["Tongue: Dry/Cracked", ef.tongueDryCracked ? "Yes" : "No"],
            ["Tongue: Ulceration/Soreness", ef.tongueUlceration ? "Yes" : "No"],
            ["Saliva: Dry Mouth", ef.dryMouth ? "Yes" : "No"],
            ["Dentures: Top", ef.hasTopDenture ? "Yes" : "No"],
            ["Dentures: Lower", ef.hasLowerDenture ? "Yes" : "No"],
            ["Dentures & Natural Teeth", ef.hasDenturesAndNaturalTeeth ? "Yes" : "No"],
            ["Teeth: Natural", ef.hasNaturalTeeth ? "Yes" : "No"],
            ["Teeth: Plaque/Debris", ef.evidencePlaqueDebris ? "Yes" : "No"],
            ["Pain: When eating/drinking", s.painWhenEating ? "Yes" : "No"],
            ["Gums: Soreness/Ulceration", s.gumsUlceration ? "Yes" : "No"],
            ["Swallowing: Difficulty", s.difficultySwallowing ? "Yes" : "No"],
            ["Nutrition: Poor intake", s.poorFluidDietaryIntake ? "Yes" : "No"],
            ["Dehydrated", s.dehydrated ? "Yes" : "No"],
            ["Speech: Dry mouth", s.speechDifficultyDryMouth ? "Yes" : "No"],
            ["Speech: Dentures slipping", s.speechDifficultyDenturesSlipping ? "Yes" : "No"],
            ["Dexterity: Toothbrushing difficulty", s.dexterityProblems ? "Yes" : "No"],
            ["Cognitive: Memory loss/confusion", s.cognitiveImpairment ? "Yes" : "No"],
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Field / Symptom', 'Status']],
            body: examRows,
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 30, halign: 'center' }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // 3. Evaluations Table (Latest 5) - Moved to End
        if (data.evaluations && Array.isArray(data.evaluations) && data.evaluations.length > 0) {
            yPos = await addSectionTitle("ORAL EVALUATIONS HISTORY (LATEST 5)", yPos);

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

    // --- Specimen Record Log ---

    if (formName.toUpperCase().includes("SPECIMEN RECORD LOG") || formName.includes("v2-specimen-log")) {
        const records = Array.isArray(data) ? data : (data.records || []);

        // Resident Details Section
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
        const col2 = margin + (pageWidth - margin * 2) / 2;
        const colWidth = (pageWidth - margin * 2) / 2 - 5;

        let y1 = await addField("Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, yPos, colWidth);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        y1 = await addField("Date of Birth", formattedDob, margin, y1, colWidth);

        let y2 = await addField("Care Home", careHomeName || "N/A", col2, yPos, colWidth);
        y2 = await addField("Date Generated", format(new Date(), "dd/MM/yyyy"), col2, y2, colWidth);

        yPos = Math.max(y1, y2) + 10;

        // Records Table
        yPos = await addSectionTitle("HISTORICAL SPECIMEN RECORDS", yPos);

        autoTable(doc, {
            startY: yPos,
            head: [['Date/Time Obtained', 'Type', 'Requested', 'Obtained By', 'Results Date', 'Results', 'Received By']],
            body: records.map((r: any) => [
                format(new Date(r.date_time_obtained || r.dateTimeObtained), "dd/MM/yyyy HH:mm"),
                r.specimen_type || r.specimenType,
                r.specimen_requested || r.specimenRequested,
                r.staff_obtaining_signature || r.staffObtainingSignature,
                (r.date_results_received || r.dateResultsReceived) ? format(new Date(r.date_results_received || r.dateResultsReceived), "dd/MM/yyyy HH:mm") : "-",
                r.results || "-",
                r.staff_receiving_signature || r.staffReceivingSignature || "-"
            ]),
            margin: { left: margin, right: margin },
            styles: { fontSize: 8 },
            headStyles: { fillColor: [34, 197, 94] }
        });

        doc.save(`${resident?.last_name}_Specimen_Log_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Resident Info Section ---
    yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
    const col2 = margin + (pageWidth - margin * 2) / 2;
    const colWidth = (pageWidth - margin * 2) / 2 - 5;

    let y1 = await addField("Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, yPos, colWidth);
    const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
    const formattedDob = dobValue ? new Date(dobValue).toLocaleDateString('en-GB') : "N/A";
    y1 = await addField("Date of Birth", formattedDob, margin, y1, colWidth);

    let y2 = await addField("Care Home", careHomeName || "N/A", col2, yPos, colWidth);
    y2 = await addField("Date Generated", new Date().toLocaleDateString('en-GB'), col2, y2, colWidth);

    yPos = Math.max(y1, y2) + 5;

    // --- Form Data Rendering ---
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

    yPos = await addSectionTitle("FORM DETAILS", yPos);
    const renderData = async (obj: any, startY: number, startX: number, depth: number = 0): Promise<number> => {
        // Specialized layout for Smoking Risk Assessment
        if (formName.toUpperCase().includes("SMOKING RISK ASSESSMENT")) {
            const smokingQuestions = [
                {
                    hazard: "IGNITION SOURCES",
                    label: "Are the Resident's smoking materials controlled by the Home? If 'Yes', detail where they are secured and who is designated as the Responsible Person.",
                    yesNo: obj.materials_controlled,
                    details: obj.materials_controlled_details
                },
                {
                    hazard: "IGNITION SOURCES",
                    label: "Does the Resident require assistance to light smoking materials or use vaporiser? If 'Yes', detail what assistance is required and by whom?",
                    yesNo: obj.assistance_lighting,
                    details: obj.assistance_lighting_details
                },
                {
                    hazard: "IGNITION SOURCES",
                    label: "Is the Resident given only one cigarette or vaporiser at any given time? If 'Yes', detail how this controlled and by whom?",
                    yesNo: obj.one_cigarette_at_time,
                    details: obj.one_cigarette_at_time_details
                },
                {
                    hazard: "IGNITION SOURCES",
                    label: "Does the Resident require supervision whilst in a smoking room/area? If 'Yes' detail who by and what level of supervision is required.",
                    yesNo: obj.supervision_required,
                    details: obj.supervision_required_details
                },
                {
                    hazard: "IGNITION SOURCES",
                    label: "Do Staff ensure that cigarettes/vaporisers have been appropriately extinguished when assisting the Resident out of the smoking room/area? If 'No' measures are to be put in place to ensure that cigarettes/vaporisers have been appropriately extinguished.",
                    yesNo: obj.extinguished_correctly,
                    details: obj.extinguished_correctly_details
                },
                {
                    hazard: "IGNITION SOURCES",
                    label: "Detail the control measures that are in place to ensure that Residents do not smoke or use vaporisers in their bedrooms?",
                    yesNo: obj.bedroom_control_measures_bool,
                    details: obj.bedroom_control_measures
                },
                {
                    hazard: "OXYGEN SOURCES",
                    label: "Are controls in place to ensure that the resident does NOT smoke/vape in bed or whilst seated on an air flow cushion? If 'Yes' detail what controls have been put in place.",
                    yesNo: obj.oxygen_in_use_in_bedroom,
                    details: obj.oxygen_in_use_in_bedroom_details
                },
                {
                    hazard: "FUEL SOURCES",
                    label: "Has a Fire Resistant Fire Apron been provided? (Suppliers Countywide). This product is seen as a control measure to prevent ignition sources coming in contact with: 1. Fumes emanating from a build-up of emollient cream on the residents' clothes, 2. Non-fire retardant clothing i.e. sleepwear. If \"Yes\" detail where the apron is stored when not in use.",
                    yesNo: obj.fuel_combustible_materials_near_oxygen,
                    details: obj.fuel_combustible_materials_near_oxygen_details
                },
                {
                    hazard: "FUEL SOURCES",
                    label: "Has a water based emollient cream been considered an alternative to paraffin/petroleum based cream? (Consult with GP/Boots). If 'Yes' detail what alternative has been provided.",
                    yesNo: obj.fuel_soft_furnishings_near_smoking,
                    details: obj.fuel_soft_furnishings_near_smoking_details
                },
                {
                    hazard: "FUEL SOURCES",
                    label: "Are staff made aware of the location of fire extinguishers and fire blankets and the actions to take in the event of a Resident’s clothing igniting? If 'Yes' detail date and time of training.",
                    yesNo: obj.fuel_waste_bins_and_rubbish_managed,
                    details: obj.fuel_waste_bins_and_rubbish_managed_details
                },
                {
                    hazard: "SMOKING ROOM / AREA",
                    label: "Are staff directed to restrict flammable material being taken into the smoking room/area by the Resident? (Newspapers, books, etc.).",
                    yesNo: obj.smoking_room_has_safe_ashtrays,
                    details: obj.smoking_room_has_safe_ashtrays_details
                },
                {
                    hazard: "SMOKING ROOM / AREA",
                    label: "Do domestic staff / housekeepers ensure that the smoking room/area is cleaned, daily, and there is no build-up of newspapers or other materials in bins?",
                    yesNo: obj.smoking_room_no_smoking_in_bed,
                    details: obj.smoking_room_no_smoking_in_bed_details
                },
                {
                    hazard: "SMOKING ROOM / AREA",
                    label: "Are ashtrays constructed of non-combustible material and emptied on a regular basis?",
                    yesNo: obj.smoking_room_supervision_provided,
                    details: obj.smoking_room_supervision_provided_details
                },
                {
                    hazard: "SMOKING ROOM / AREA",
                    label: "Are staff aware that enclosed seating (Lounge Chairs) are not suitable for use in smoking rooms/areas as they could retain smouldering un-extinguished cigarettes?",
                    yesNo: obj.smoking_room_door_closed_to_corridors,
                    details: obj.smoking_room_door_closed_to_corridors_details
                },
                {
                    hazard: "SMOKING ROOM / AREA",
                    label: "Are only chairs with open sides and back provided in the smoking room/area? If \"No\" the chairs should be changed to open side and back type seating as a matter of urgency.",
                    yesNo: obj.smoking_room_fire_doors_and_exits_clear,
                    details: obj.smoking_room_fire_doors_and_exits_clear_details
                }
            ];

            autoTable(doc, {
                startY: startY,
                head: [['HAZARD/PROBLEM', 'INFORMATION TO CONSIDER', 'YES/NO', 'DETAILS / ACTION']],
                body: smokingQuestions.map(q => [
                    q.hazard,
                    q.label,
                    q.yesNo === true ? 'Yes' : q.yesNo === false ? 'No' : 'N/A',
                    q.details || ''
                ]),
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 9 },
                styles: { fontSize: 8, cellPadding: 3, valign: 'top' },
                columnStyles: {
                    0: { cellWidth: 25, fontStyle: 'bold' },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 15, halign: 'center' },
                    3: { cellWidth: 'auto' }
                }
            });

            let finalY = (doc as any).lastAutoTable.finalY + 10;
            const colWidth = (pageWidth - margin * 2) / 2 - 5;
            const col2 = margin + (pageWidth - margin * 2) / 2;

            if (obj.completed_by || obj.completedBy) {
                const completedBy = obj.completed_by || obj.completedBy;
                const assessmentDate = obj.assessment_date || obj.assessmentDate;
                const completedByRole = obj.completed_by_role || obj.completedByRole;

                finalY = await addSectionTitle("SIGN-OFF", finalY);
                const sigY1 = await addField("Signature Of Person Completing Form And Updating Room File", completedBy, margin, finalY, colWidth);
                const sigY2 = await addField("Print Staff Name", completedBy, col2, finalY, colWidth);
                const sigY3 = await addField("Date", assessmentDate ? new Date(assessmentDate).toLocaleDateString('en-GB') : "N/A", margin, Math.max(sigY1, sigY2) + 2, colWidth);
                await addField("Role", completedByRole || "", col2, Math.max(sigY1, sigY2) + 2, colWidth);
                finalY = Math.max(sigY1, sigY2, sigY3) + 8;
            }

            finalY = await addSectionTitle("RISK ASSESSMENT REVIEW", finalY);
            const reviewY1 = await addField("Reviewed Monthly", obj.risk_review_monthly, margin, finalY, colWidth);
            const reviewY2 = await addField("Reviewed On Significant Change In Resident's Condition", obj.risk_review_on_condition_change, col2, finalY, colWidth);
            const reviewY3 = await addField("Reviewed After Smoking Related Incident", obj.risk_review_on_incident, margin, Math.max(reviewY1, reviewY2) + 2, colWidth);
            finalY = Math.max(reviewY1, reviewY2, reviewY3) + 6;

            finalY = await addSectionTitle("RELATIVES / VISITORS AWARENESS", finalY);
            const fullWidthRel = pageWidth - margin * 2;
            const relQuestion = "Have relatives/visitors been made aware of the content of this risk assessment and of the risk to the resident while smoking?";
            finalY = await addField(relQuestion, obj.relatives_aware, margin, finalY, fullWidthRel) + 4;

            const meetingDate = obj.relatives_awareness_date ? new Date(obj.relatives_awareness_date).toLocaleDateString("en-GB") : "";
            const meetingTime = obj.relatives_awareness_time || "";
            const meetingCombined = meetingDate || meetingTime ? `${meetingDate} ${meetingTime}`.trim() : "";
            finalY = await addField("If yes, record the date and time of the meeting", meetingCombined, margin, finalY, fullWidthRel) + 6;

            return finalY;
        }

        let localY = startY;
        let localX = startX;
        let maxY = startY;
        const cWidth = (pageWidth - margin * 2) / 2 - 5;
        const c2 = margin + (pageWidth - margin * 2) / 2;

        const consentType = data.consentType || data.assessment_data?.consentType;
        const isRestraintsForm = formName.toUpperCase().includes("CONSENT AND RISK ASSESSMENT FOR RESTRAINTS");

        const entries = Object.entries(obj).filter(([k, v]) => {
            if (SKIP_KEYS.has(k) || isEmptyValue(v)) return false;

            // Conditional rendering for Restraints form
            if (consentType === "ABLE_TO_CONSENT" && k === "discussionWithRelative") return false;
            if (consentType === "UNABLE_TO_CONSENT" && k === "ableToConsent") return false;
            if (isRestraintsForm && (k === "ableToConsent" || k === "discussionWithRelative")) return false;

            return true;
        });

        for (const [key, value] of entries) {
            if (localX === margin) {
                localY = await ensureSpace(12, localY);
                maxY = localY;
            }

            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    const filteredItems = value.filter(item => !isEmptyValue(item));
                    if (filteredItems.length === 0) continue;
                    if (localX !== margin) { localY = maxY + 4; localX = margin; }

                    if (typeof filteredItems[0] !== 'object') {
                        localY = await addField(formatFieldKey(key), filteredItems, margin, localY, pageWidth - margin * 2);
                    } else {
                        localY = await addSectionTitle(formatFieldKey(key), localY);
                        for (const item of filteredItems) {
                            localY = await renderData(item, localY, margin, depth + 1);
                        }
                    }
                    maxY = Math.max(maxY, localY);
                } else {
                    if (localX !== margin) { localY = maxY + 4; localX = margin; }
                    localY = await addSectionTitle(formatFieldKey(key), localY);
                    localY = await renderData(value, localY, margin, depth + 1);
                    maxY = Math.max(maxY, localY);
                }
            } else {
                const fieldY = await addField(formatFieldKey(key), value, localX, localY, cWidth, true);
                maxY = Math.max(maxY, fieldY);

                if (localX === margin) {
                    localX = c2;
                } else {
                    localX = margin;
                    localY = maxY + 3; // Spacing for new row
                    maxY = localY;
                }
            }
        }
        return maxY;
    };


    // --- Infection Prevention Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("INFECTION PREVENTION")) {
        const assessmentData = assessmentDataForSpecialized;
        const details = assessmentData.symptoms?.details || {};
        const exposure = assessmentData.exposure_history || {};
        const colWidth = (pageWidth - margin * 2) / 2 - 5;
        const col2 = margin + colWidth + 10;

        // 1. Resident Details
        yPos = await addSectionTitle("RESIDENT DETAILS", yPos);
        const row1Y = yPos;
        const y1 = await addField("RESIDENT NAME", assessmentData.name || details.name || "N/A", margin, row1Y, colWidth, true);
        const y2 = await addField("CONSULTANT / GP NAME", details.consultantGP || resident?.gp_name || resident?.gpName || "N/A", col2, row1Y, colWidth, true);
        yPos = Math.max(y1, y2) + 2;

        const row2Y = yPos;
        const y3 = await addField("DATE OF BIRTH", assessmentData.dateOfBirth || details.dateOfBirth ? format(new Date(assessmentData.dateOfBirth || details.dateOfBirth), "dd/MM/yyyy") : "N/A", margin, row2Y, colWidth, true);
        const y4 = await addField("ASSESSMENT TYPE", assessmentData.assessment_type || assessmentData.assessmentType || "N/A", col2, row2Y, colWidth, true);
        yPos = Math.max(y3, y4) + 2;

        const row3Y = yPos;
        const y5 = await addField("HOME ADDRESS", details.homeAddress || "N/A", margin, row3Y, colWidth, true);
        const y6 = await addField("INFO PROVIDED BY", details.informationProvidedBy || "N/A", col2, row3Y, colWidth, true);
        yPos = Math.max(y5, y6) + 2;

        const row4Y = yPos;
        const y7 = await addField("ADMITTED FROM", exposure.admittedFrom || "N/A", margin, row4Y, colWidth, true);
        const y8 = await addField("ADMISSION DATE", exposure.dateOfAdmission ? format(new Date(exposure.dateOfAdmission), "dd/MM/yyyy") : "N/A", col2, row4Y, colWidth, true);
        yPos = Math.max(y7, y8) + 2;

        yPos = await addField("REASON FOR ADMISSION", exposure.reasonForAdmission || "N/A", margin, yPos, pageWidth - margin * 2);

        // 2. Acute Respiratory Illness (ARI)
        yPos = await addSectionTitle("ACUTE RESPIRATORY ILLNESS (ARI)", yPos + 2);
        const respiratory = assessmentData.symptoms?.respiratory || {};
        const ariFields = [
            { label: "New Continuous Cough", val: respiratory.newContinuousCough },
            { label: "Worsening Cough", val: respiratory.worseningCough },
            { label: "High Temperature", val: respiratory.temperatureHigh },
            { label: "Tested for Covid-19", val: respiratory.testedForCovid19 },
            { label: "Tested for Influenza A", val: respiratory.testedForInfluenzaA },
            { label: "Tested for Influenza B", val: respiratory.testedForInfluenzaB },
            { label: "Tested for Respiratory Screen", val: respiratory.testedForRespiratoryScreen }
        ];

        for (let i = 0; i < ariFields.length; i += 2) {
            const startY = yPos;
            const h1 = await addField(ariFields[i].label, ariFields[i].val ? "Yes" : "No", margin, startY, colWidth, true);
            let h2 = startY;
            if (ariFields[i + 1]) {
                h2 = await addField(ariFields[i + 1].label, ariFields[i + 1].val ? "Yes" : "No", col2, startY, colWidth, true);
            }
            yPos = Math.max(h1, h2) + 1;
        }

        const resRowY = yPos;
        const resY1 = await addField("Influenza B Result", respiratory.influenzaB ? "Positive" : "Negative", margin, resRowY, colWidth, true);
        const resY2 = await addField("Respiratory Screen Result", respiratory.respiratoryScreen ? "Positive" : "Negative", col2, resRowY, colWidth, true);
        yPos = Math.max(resY1, resY2) + 2;
        yPos = await addField("Other Symptoms", respiratory.otherRespiratorySymptoms || "None", margin, yPos, pageWidth - margin * 2);

        // 3. Exposure History
        yPos = await addSectionTitle("EXPOSURE HISTORY", yPos + 2);
        const expRow1Y = yPos;
        const expY1 = await addField("Exposed to COVID+ Patients", exposure.exposureToPatientsCovid ? "Yes" : "No", margin, expRow1Y, colWidth, true);
        const expY2 = await addField("Exposed to COVID+ Staff", exposure.exposureToStaffCovid ? "Yes" : "No", col2, expRow1Y, colWidth, true);
        yPos = Math.max(expY1, expY2) + 2;

        const expRow2Y = yPos;
        const expY3 = await addField("Isolation Required", assessmentData.isolationRequired ? "Yes" : "No", margin, expRow2Y, colWidth, true);
        const expY4 = await addField("Further Treatment Required", exposure.furtherTreatmentRequired ? "Yes" : "No", col2, expRow2Y, colWidth, true);
        yPos = Math.max(expY3, expY4) + 2;
        yPos = await addField("Isolation Details", exposure.isolationDetails || "N/A", margin, yPos, pageWidth - margin * 2);

        // 4. Diarrhoea & Vomiting
        yPos = await addSectionTitle("DIARRHOEA & VOMITING (D/V)", yPos + 2);
        const dv = assessmentData.symptoms?.diarrheaVomiting || {};
        yPos = await addField("D/V Symptoms (Infection Not Confirmed)", dv.currentSymptoms ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Contact with D/V (72h)", dv.contactWithOthers ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Family with D/V (72h)", dv.familyHistory72h ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);

        // 5. Clostridium Difficile
        yPos = await addSectionTitle("CLOSTRIDIUM DIFFICILE", yPos + 2);
        const clostridium = assessmentData.symptoms?.clostridium || {};
        const cRow1Y = yPos;
        const cY1 = await addField("Active C. Diff", clostridium.active ? "Yes" : "No", margin, cRow1Y, colWidth, true);
        const cY2 = await addField("History of C. Diff", clostridium.history ? "Yes" : "No", col2, cRow1Y, colWidth, true);
        yPos = Math.max(cY1, cY2) + 2;

        const cRow2Y = yPos;
        const cY3 = await addField("Stool Count (72h)", clostridium.stoolCount72h || "N/A", margin, cRow2Y, colWidth, true);
        const cY4 = await addField("Last Positive Specimen", clostridium.lastPositiveSpecimenDate ? format(new Date(clostridium.lastPositiveSpecimenDate), "dd/MM/yyyy") : "N/A", col2, cRow2Y, colWidth, true);
        yPos = Math.max(cY3, cY4) + 2;

        const cRow3Y = yPos;
        const cY5 = await addField("Specimen Result", clostridium.result || "N/A", margin, cRow3Y, colWidth, true);
        const cY6 = await addField("Treatment Complete", clostridium.treatmentComplete ? "Yes" : "No", col2, cRow3Y, colWidth, true);
        yPos = Math.max(cY5, cY6) + 2;
        yPos = await addField("Treatment Received", clostridium.treatmentReceived || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addField("Ongoing Antibiotic Details", clostridium.ongoingDetails || "N/A", margin, yPos + 2, pageWidth - margin * 2);
        const cRow4Y = yPos;
        const cY7 = await addField("Date Commenced", clostridium.ongoingDateCommenced ? format(new Date(clostridium.ongoingDateCommenced), "dd/MM/yyyy") : "N/A", margin, cRow4Y, colWidth, true);
        const cY8 = await addField("Length of Course", clostridium.ongoingLengthOfCourse || "N/A", col2, cRow4Y, colWidth, true);
        yPos = Math.max(cY7, cY8) + 2;
        yPos = await addField("Follow-up Required", clostridium.ongoingFollowUpRequired || "N/A", margin, yPos, pageWidth - margin * 2);

        // 6. MRSA / MSSA Status
        yPos = await addSectionTitle("MRSA / MSSA STATUS", yPos + 2);
        const mrsa = assessmentData.symptoms?.mrsa || {};
        const mRow1Y = yPos;
        const mY1 = await addField("Colonised", mrsa.colonised ? "Yes" : "No", margin, mRow1Y, colWidth, true);
        const mY2 = await addField("Infected", mrsa.infected ? "Yes" : "No", col2, mRow1Y, colWidth, true);
        yPos = Math.max(mY1, mY2) + 2;

        const mRow2Y = yPos;
        const mY3 = await addField("Sites Positive", mrsa.sitesPositive || "N/A", margin, mRow2Y, colWidth, true);
        const mY4 = await addField("Last Positive Swab", mrsa.lastPositiveSwabDate ? format(new Date(mrsa.lastPositiveSwabDate), "dd/MM/yyyy") : "N/A", col2, mRow2Y, colWidth, true);
        yPos = Math.max(mY3, mY4) + 2;

        const mRow3Y = yPos;
        const mY5 = await addField("Treatment Received", mrsa.treatmentReceived || "N/A", margin, mRow3Y, colWidth, true);
        const mY6 = await addField("Treatment Complete", mrsa.treatmentComplete ? "Yes" : "No", col2, mRow3Y, colWidth, true);
        yPos = Math.max(mY5, mY6) + 2;

        yPos = await addField("Decolonisation Details", mrsa.mrsaMssaDetails || "N/A", margin, yPos + 2, pageWidth - margin * 2);
        const mRow4Y = yPos;
        const mY7 = await addField("Date Commenced", mrsa.mrsaMssaDateCommenced ? format(new Date(mrsa.mrsaMssaDateCommenced), "dd/MM/yyyy") : "N/A", margin, mRow4Y, colWidth, true);
        const mY8 = await addField("Duration", mrsa.mrsaMssaLengthOfCourse || "N/A", col2, mRow4Y, colWidth, true);
        yPos = Math.max(mY7, mY8) + 2;
        yPos = await addField("Follow-up Required", mrsa.mrsaMssaFollowUpRequired || "N/A", margin, yPos, pageWidth - margin * 2);

        // 7. Multi-drug Resistant Organisms (MDRO)
        yPos = await addSectionTitle("MULTI-DRUG RESISTANT ORGANISMS (MDRO)", yPos + 2);
        const mdro = assessmentData.symptoms?.multiDrugResistance || {};
        const mdroRow1Y = yPos;
        const mdroY1 = await addField("ESBL", mdro.esbl ? "Yes" : "No", margin, mdroRow1Y, colWidth / 2, true);
        const mdroY2 = await addField("VRE / GRE", mdro.vreGre ? "Yes" : "No", margin + colWidth / 2 + 5, mdroRow1Y, colWidth / 2, true);
        const mdroY3 = await addField("CPE", mdro.cpe ? "Yes" : "No", col2, mdroRow1Y, colWidth / 2, true);
        yPos = Math.max(mdroY1, mdroY2, mdroY3) + 2;
        yPos = await addField("Other MDR Organisms", mdro.other || "None", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Relevant Information", mdro.relevantInformation || "N/A", margin, yPos + 1, pageWidth - margin * 2);

        // 8. Vaccinations & Awareness
        yPos = await addSectionTitle("VACCINATIONS & AWARENESS", yPos + 2);
        const vRow1Y = yPos;
        const vY1 = await addField("Awareness of Status", exposure.awarenessOfInfection ? "Yes" : "No", margin, vRow1Y, colWidth, true);
        const vY2 = await addField("Last Flu Vaccination", exposure.lastFluVaccinationDate ? format(new Date(exposure.lastFluVaccinationDate), "dd/MM/yyyy") : "N/A", col2, vRow1Y, colWidth, true);
        yPos = Math.max(vY1, vY2) + 8;

        // Completion Info
        yPos = await ensureSpace(20, yPos);
        const compRowY = yPos;
        const c1 = await addField("COMPLETED BY", assessmentData.completed_by || "N/A", margin, compRowY, colWidth, true);
        const c2 = await addField("JOB ROLE", details.jobRole || assessmentData.jobRole || "N/A", col2, compRowY, colWidth, true);
        yPos = Math.max(c1, c2) + 2;
        const compDate = assessmentData.assessment_date || assessmentData.completionDate || assessmentData.assessmentDate;
        yPos = await addField("COMPLETION DATE", compDate ? format(new Date(compDate), "dd/MM/yyyy") : (assessmentData.created_at ? format(new Date(assessmentData.created_at), "dd/MM/yyyy") : "N/A"), margin, yPos, colWidth);

        doc.save(`Infection-Prevention-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }




    // --- Pre-Admission Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("PRE-ADMISSION ASSESSMENT FORM") || (formName.toUpperCase().includes("PRE-ADMISSION") && !formName.toUpperCase().includes("INFECTION PREVENTION"))) {
        const assessmentData = assessmentDataForSpecialized;
        
        // 1. Consent
        yPos = await addSectionTitle("CONSENT", yPos);
        const consentAcceptedAt = assessmentData.consentAcceptedAt || data.consent_accepted_at;
        const consentText = consentAcceptedAt 
            ? `The person being assessed agreed to the assessment being completed on ${format(new Date(consentAcceptedAt), "PPP 'at' p")}`
            : "Consent not recorded.";
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const consentLines = doc.splitTextToSize(consentText, pageWidth - margin * 2);
        doc.text(consentLines, margin, yPos);
        yPos += (consentLines.length * 5) + 10;

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // 2. Administrative Details
        yPos = await addSectionTitle("ADMINISTRATIVE DETAILS", yPos);
        yPos = await ensureSpace(20, yPos);
        const rowAdminY = yPos;
        let yAdmin1 = await addField("Care Home Name", assessmentData.careHomeName || data.care_home_name || careHomeName, margin, rowAdminY, cpWidth, true);
        yAdmin1 = await addField("Assessing Worker", assessmentData.userName || data.user_name || "N/A", margin, yAdmin1 + 1, cpWidth, true);
        
        let yAdmin2 = await addField("NHS Number", assessmentData.nhsHealthCareNumber || data.nhs_number || "N/A", cpCol2, rowAdminY, cpWidth, true);
        yAdmin2 = await addField("Job Role", assessmentData.jobRole || data.job_role || "N/A", cpCol2, yAdmin2 + 1, cpWidth, true);
        
        const assessmentDate = assessmentData.date || data.date;
        yPos = Math.max(yAdmin1, yAdmin2);
        const yAdmin3 = await addField("Assessment Date", assessmentDate ? format(new Date(assessmentDate), "PPP") : "N/A", margin, yPos + 1, cpWidth, true);
        const yAdmin4 = await addField("Signature", assessmentData.signature || "N/A", cpCol2, yPos + 1, cpWidth, true);
        yPos = Math.max(yAdmin3, yAdmin4) + 3;

        // 3. Resident Information
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
        yPos = await ensureSpace(30, yPos);
        const rowResY = yPos;
        const fName = assessmentData.firstName || data.first_name || resident?.first_name || "";
        const lName = assessmentData.lastName || data.last_name || resident?.last_name || "";
        let yRes1 = await addField("Full Name", `${fName} ${lName}`.trim(), margin, rowResY, cpWidth, true);
        yRes1 = await addField("Phone Number", assessmentData.phoneNumber || data.phone_number || "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField("Gender", assessmentData.gender || "N/A", margin, yRes1 + 1, cpWidth, true);
        
        const dob = assessmentData.dateOfBirth || data.date_of_birth || resident?.date_of_birth;
        let yRes2 = await addField("Date of Birth", dob ? format(new Date(dob), "dd/MM/yyyy") : "N/A", cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField("Ethnicity", assessmentData.ethnicity || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yRes2 = await addField("Religion", assessmentData.religion || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        
        yPos = Math.max(yRes1, yRes2);
        yPos = await addField("Current Address", assessmentData.address || "N/A", margin, yPos + 1, pageWidth - margin * 2) + 3;

        // 4. Next of Kin
        yPos = await addSectionTitle("NEXT OF KIN", yPos);
        yPos = await ensureSpace(15, yPos);
        const rowKinY = yPos;
        let yKin1 = await addField("Name", `${assessmentData.kinFirstName || ""} ${assessmentData.kinLastName || ""}`.trim(), margin, rowKinY, cpWidth, true);
        yKin1 = await addField("Relationship", assessmentData.kinRelationship || "N/A", margin, yKin1 + 1, cpWidth, true);
        
        const yKin2 = await addField("Phone Number", assessmentData.kinPhoneNumber || "N/A", cpCol2, rowKinY, cpWidth, true);
        yPos = Math.max(yKin1, yKin2) + 3;

        // 5. Professional Contacts
        yPos = await addSectionTitle("PROFESSIONAL CONTACTS", yPos);
        
        const contacts = [
            { nLabel: "Care Manager", nVal: assessmentData.careManagerName, pLabel: "Care Manager Phone", pVal: assessmentData.careManagerPhoneNumber },
            { nLabel: "District Nurse", nVal: assessmentData.districtNurseName, pLabel: "District Nurse Phone", pVal: assessmentData.districtNursePhoneNumber },
            { nLabel: "General Practitioner", nVal: assessmentData.generalPractitionerName, pLabel: "GP Phone", pVal: assessmentData.generalPractitionerPhoneNumber },
            { nLabel: "Provider Name", nVal: assessmentData.providerHealthcareInfoName, pLabel: "Designation", pVal: assessmentData.providerHealthcareInfoDesignation }
        ];

        for (const c of contacts) {
            yPos = await ensureSpace(15, yPos);
            const rowYValue = yPos;
            const h1 = await addField(c.nLabel, c.nVal || "N/A", margin, rowYValue, colWidth, true);
            const h2 = await addField(c.pLabel, c.pVal || "N/A", col2, rowYValue, colWidth, true);
            yPos = Math.max(h1, h2) + 1;
        }
        yPos += 4;

        // 6. Medical Assessment
        yPos = await addSectionTitle("MEDICAL ASSESSMENT", yPos);
        yPos = await addField("Known Allergies", assessmentData.allergies || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Medical History & Diagnoses", assessmentData.medicalHistory || "N/A", margin, yPos + 1, pageWidth - margin * 2);
        yPos = await addField("Medications Prescribed", assessmentData.medicationPrescribed || "N/A", margin, yPos + 1, pageWidth - margin * 2) + 3;

        // 7. Activities of Daily Living
        yPos = await addSectionTitle("ACTIVITIES OF DAILY LIVING", yPos);
        const adlFields = [
            { label: "Consent Capacity Rights", key: "consentCapacityRights" },
            { label: "Medication", key: "medication" },
            { label: "Mobility", key: "mobility" },
            { label: "Nutrition", key: "nutrition" },
            { label: "Continence", key: "continence" },
            { label: "Hygiene Dressing", key: "hygieneDressing" },
            { label: "Skin", key: "skin" },
            { label: "Cognition", key: "cognition" },
            { label: "Infection", key: "infection" },
            { label: "Breathing", key: "breathing" },
            { label: "Altered State of Consciousness", key: "alteredStateOfConsciousness" }
        ];

        for (let i = 0; i < adlFields.length; i += 2) {
            yPos = await ensureSpace(15, yPos);
            const f1 = adlFields[i];
            const f2 = adlFields[i + 1];
            
            const startYValue = yPos;
            const h1 = await addField(f1.label, assessmentData[f1.key] || "N/A", margin, startYValue, colWidth, true);
            let h2 = startYValue;
            if (f2) {
                h2 = await addField(f2.label, assessmentData[f2.key] || "N/A", col2, startYValue, colWidth, true);
            }
            yPos = Math.max(h1, h2) + 1;
        }
        yPos += 3;

        // 8. Legal & End of Life
        yPos = await addSectionTitle("LEGAL & END OF LIFE", yPos);
        yPos = await ensureSpace(15, yPos);
        const rowLegalY = yPos;
        let yLegal1 = await addField("DNACPR", assessmentData.dnacpr ? "Yes" : "No", margin, rowLegalY, colWidth, true);
        const yLegal1Val = yLegal1;
        yLegal1 = await addField("Capacity", assessmentData.capacity ? "Yes" : "No", margin, yLegal1Val + 1, colWidth, true);
        
        let yLegal2 = await addField("Advanced Decision", assessmentData.advancedDecision ? "Yes" : "No", col2, rowLegalY, colWidth, true);
        yLegal2 = await addField("Advanced Care Plan", assessmentData.advancedCarePlan ? "Yes" : "No", col2, yLegal2 + 1, colWidth, true);
        
        yPos = Math.max(yLegal1, yLegal2);
        yPos = await addField("Palliative Care Comments", assessmentData.comments || "N/A", margin, yPos + 1, pageWidth - margin * 2) + 3;

        // 9. Resident Preferences
        yPos = await addSectionTitle("RESIDENT PREFERENCES", yPos);
        const prefFields = [
            { label: "Room Preferences", key: "roomPreferences" },
            { label: "Admission Contact", key: "admissionContact" },
            { label: "Food Preferences", key: "foodPreferences" },
            { label: "Preferred Name", key: "preferedName" },
            { label: "Family Concerns", key: "familyConcerns" }
        ];

        for (let i = 0; i < prefFields.length; i += 2) {
            yPos = await ensureSpace(15, yPos);
            const f1 = prefFields[i];
            const f2 = prefFields[i + 1];
            
            const startYValue = yPos;
            const h1 = await addField(f1.label, assessmentData[f1.key] || "N/A", margin, startYValue, colWidth, true);
            let h2 = startYValue;
            if (f2) {
                h2 = await addField(f2.label, assessmentData[f2.key] || "N/A", col2, startYValue, colWidth, true);
            }
            yPos = Math.max(h1, h2) + 1;
        }
        yPos += 3;

        // 10. Other Relevant Information
        yPos = await addSectionTitle("OTHER RELEVANT INFORMATION", yPos);
        yPos = await addField("Other health professionals involved in Persons care", assessmentData.otherHealthCareProfessional || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Equipment required", assessmentData.equipment || "N/A", margin, yPos + 1, pageWidth - margin * 2) + 3;

        // 11. Financial & Final Details
        yPos = await addSectionTitle("FINANCIAL & FINAL DETAILS", yPos);
        yPos = await addField("Does anyone attend to finances?", assessmentData.attendFinances ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        
        if (assessmentData.attendFinances === true) {
            yPos = await ensureSpace(20, yPos);
            const rowFinY = yPos;
            const yFin1 = await addField("Name", assessmentData.financesName || "N/A", margin, rowFinY, cpWidth, true);
            const yFin2 = await addField("Contact Number", assessmentData.financesContactNumber || "N/A", cpCol2, rowFinY, cpWidth, true);
            yPos = Math.max(yFin1, yFin2);
            yPos = await addField("Address", assessmentData.financesAddress || "N/A", margin, yPos + 1, pageWidth - margin * 2) + 1;
        }

        yPos = await addField("Additional Considerations", assessmentData.additionalConsiderations || "N/A", margin, yPos + 3, pageWidth - margin * 2);
        
        yPos = await addSectionTitle("ASSESSMENT OUTCOME", yPos + 3);
        yPos = await addField("Outcome Details", assessmentData.outcome || "N/A", margin, yPos, pageWidth - margin * 2);
        const pDate = assessmentData.plannedAdmissionDate || data.planned_admission_date;
        yPos = await addField("Planned Admission Date", pDate ? format(new Date(pDate), "PPP") : "N/A", margin, yPos + 1, colWidth);

        doc.save(`Pre-Admission-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    yPos = await renderData(data, yPos, margin);

    // Specialized narrative layout for Consent and Risk Assessment for Restraints
    if (formName.toUpperCase().includes("CONSENT AND RISK ASSESSMENT FOR RESTRAINTS")) {
        const fullWidth = pageWidth - margin * 2;
        const assessmentData = data.assessment_data || data;
        const consentType = assessmentData.consentType;

        const restraintsPreferenceText = (pref?: string | null): string => {
            if (!pref) return "";
            const map: Record<string, string> = {
                PREFER_USE: "I prefer that restraint is used.",
                DO_NOT_WANT_USE: "I do not want any form of restraint used.",
                WOULD_HAVE_PREFERRED: "would have preferred",
                WOULD_NOT_HAVE_PREFERRED: "not preferred"
            };
            return map[pref] || "";
        };

        yPos = await addSectionTitle("Consent Statement", yPos + 5);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);

        if (consentType === "ABLE_TO_CONSENT" && assessmentData.ableToConsent) {
            const able = assessmentData.ableToConsent;
            const nameText = able.name || "";
            const riskText = able.riskOf || "";
            const preferenceSentence = restraintsPreferenceText(able.preference);

            const mainSentenceParts = [
                "I",
                nameText,
                "understand that I may be at risk of",
                riskText
            ].filter(Boolean);

            const mainSentence = `${mainSentenceParts.join(" ")}.`;
            const combinedText = preferenceSentence
                ? `${mainSentence} ${preferenceSentence}`
                : mainSentence;

            const lines = doc.splitTextToSize(combinedText, fullWidth);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5 + 4;

            const cpWidth = (pageWidth - margin * 2) / 2 - 5;
            yPos = await ensureSpace(25, yPos);
            const rowSigY1 = yPos;
            const sigY1 = await addField("Signature Of Person", able.personSignature, margin, rowSigY1, cpWidth, true);
            const sigY2 = await addField("Date", able.personSignatureDate, col2, rowSigY1, cpWidth, true);
            
            const rowSigY2 = Math.max(sigY1, sigY2) + 2;
            const sigY3 = await addField("Signature Of Member", able.memberSignature, margin, rowSigY2, cpWidth, true);
            const sigY4 = await addField("Date", able.memberSignatureDate, col2, rowSigY2, cpWidth, true);
            yPos = Math.max(sigY3, sigY4) + 4;
        } else if (consentType === "UNABLE_TO_CONSENT" && assessmentData.discussionWithRelative) {
            const rel = assessmentData.discussionWithRelative;
            const relName = rel.relativeName || "";
            const issueText = rel.issueOf || "";
            const residentName = rel.residentName || "";
            const preferencePhrase = restraintsPreferenceText(rel.preference);
            const restraintUsed = rel.restraintUsed || "";

            const mainSentenceParts = [
                "I",
                relName,
                "(nearest relative) have discussed the issue of",
                issueText,
                "with the professionals concerned and feel that",
                residentName,
                preferencePhrase,
                "to have",
                restraintUsed,
                "used."
            ].filter(Boolean);

            const mainSentence = mainSentenceParts.join(" ");
            const lines = doc.splitTextToSize(mainSentence, fullWidth);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5 + 4;

            const cpWidth = (pageWidth - margin * 2) / 2 - 5;
            yPos = await ensureSpace(25, yPos);
            const rowSigY1 = yPos;
            const sigY1 = await addField("Signature Of Person", rel.personSignature, margin, rowSigY1, cpWidth, true);
            const sigY2 = await addField("Date", rel.personSignatureDate, col2, rowSigY1, cpWidth, true);
            
            const rowSigY2 = Math.max(sigY1, sigY2) + 2;
            const sigY3 = await addField("Signature Of Member", rel.memberSignature, margin, rowSigY2, cpWidth, true);
            const sigY4 = await addField("Date", rel.memberSignatureDate, col2, rowSigY2, cpWidth, true);
            yPos = Math.max(sigY3, sigY4) + 4;
        }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated by CareO System on ${new Date().toLocaleString('en-GB')}`, margin, doc.internal.pageSize.height - 10);

    doc.save(`${formName.replace(/\s+/g, '-')}-${resident?.last_name}-${new Date().getTime()}.pdf`);
};
