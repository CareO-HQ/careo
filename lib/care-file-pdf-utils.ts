import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { generate } from "@pdfme/generator";
import { BLANK_PDF, Template } from "@pdfme/common";
import { BODY_REGIONS } from "@/lib/config/body-regions";

interface GenerateCareFilePDFOptions {
    formName: string;
    data: any;
    resident: any;
    orgLogoUrl?: string;
    careHomeName?: string;
}

const toSafeFilePart = (value: string | undefined): string => {
    if (!value) return "document";
    const sanitized = value
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return sanitized || "document";
};

export const generateCareFilePDF = async ({
    formName,
    data,
    resident,
    orgLogoUrl,
    careHomeName
}: GenerateCareFilePDFOptions) => {


    const upperFormName = formName.toUpperCase();
    const isDependencyAssessment = upperFormName.includes("DEPENDENCY ASSESSMENT");
    const isFallRiskAssessment = upperFormName.includes("FALL RISK ASSESSMENT");
    const doc = new jsPDF({ orientation: isDependencyAssessment || isFallRiskAssessment ? "landscape" : "portrait" });
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


    // --- PDF Layout Helpers ---
    const drawHeader = async (titleOverride?: string) => {
        const headerHeight = 22;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        doc.setFillColor(34, 197, 94); // #22c55e green
        doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');
        doc.setTextColor(31, 41, 55);
        
        const displayTitle = titleOverride || formName;
        // Reduce font size for long form names to prevent logo overlap
        if (displayTitle.toUpperCase().includes("INFECTION PREVENTION")) {
            doc.setFontSize(13);
        } else {
            doc.setFontSize(16);
        }
        doc.setFont("helvetica", "bold");
        doc.text(displayTitle.toUpperCase(), margin, 14);

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

    // --- Capacity and Consent Specialized Layout ---
    if (formName.toUpperCase().includes("CAPACITY AND CONSENT")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawCapacityHeader = async () => {
            await drawHeader();
        };

        const ensureCapacitySpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawCapacityHeader();
                return 30;
            }
            return currentY;
        };

        let yPos = 30;
        await drawCapacityHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // Section A - Resident Details
        yPos = await addSectionTitle("SECTION A - RESIDENT DETAILS", yPos);
        yPos = await ensureCapacitySpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField("Resident Name", assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField("Date of Birth", dobVal ? (typeof dobVal === 'number' ? format(new Date(dobVal), "dd/MM/yyyy") : format(new Date(dobVal), "dd/MM/yyyy")) : "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField("NHS Number", assessmentData.nhsNumber || (resident ? resident.nhs_health_number : "N/A"), cpCol2, rowResY, cpWidth, true);
        const admDate = assessmentData.dateOfAdmission || (resident ? resident.admission_date : "");
        yRes2 = await addField("Date of Admission", admDate ? format(new Date(admDate), "dd/MM/yyyy") : "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // Section B - Details of Decision
        yPos = await addSectionTitle("SECTION B - DETAILS OF DECISION", yPos + 2);
        if (assessmentData.decisionToBeMade && assessmentData.decisionToBeMade !== "N/A") {
            yPos = await addField("Decision to be made", assessmentData.decisionToBeMade, margin, yPos, pageWidth - margin * 2);
        }
        
        const decisionTypes = [
            { label: "Admission to Care Home", value: assessmentData.admissionToCareHome },
            { label: "Consent to Care Planning & Treatment", value: assessmentData.consentToCarePlanning },
            { label: "Consent to Medication", value: assessmentData.consentToMedication },
            { label: "Consent to Sharing Information", value: assessmentData.consentToSharingInfo },
            { label: "Other Decision", value: assessmentData.otherDecision }
        ];

        const decisionsText = decisionTypes
            .filter(d => d.value)
            .map(d => `[x] ${d.label}`)
            .join("   ");
        
        if (decisionsText) {
            yPos = await addField("Decision requiring assessment", decisionsText, margin, yPos, pageWidth - margin * 2);
        }
        if (assessmentData.otherDecision && assessmentData.otherDecisionDetails) {
            yPos = await addField("Other Decision Details", assessmentData.otherDecisionDetails, margin, yPos, pageWidth - margin * 2);
        }

        // Section C - Stage 1 (Diagnostic Test)
        yPos = await addSectionTitle("SECTION C - STAGE 1: THE DIAGNOSTIC TEST", yPos + 2);
        yPos = await addField("Does the person have an impairment or disturbance in the functioning of the mind or brain?", assessmentData.hasImpairment || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Details of impairment", assessmentData.impairmentDetails || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section D - Stage 2 (Functional Test)
        yPos = await addSectionTitle("SECTION D - STAGE 2: THE FUNCTIONAL TEST", yPos + 2);
        
        const functionalAssesments = [
            { label: "1. Can the person understand the information relevant to the decision?", value: assessmentData.understandInformation, notes: assessmentData.understandNotes },
            { label: "2. Can the person retain that information?", value: assessmentData.retainInformation, notes: assessmentData.retainNotes },
            { label: "3. Can the person use or weigh that information as part of the process of making the decision?", value: assessmentData.useWeighInformation, notes: assessmentData.useWeighNotes },
            { label: "4. Can the person communicate their decision?", value: assessmentData.communicateDecision, notes: assessmentData.communicateNotes }
        ];

        for (const fa of functionalAssesments) {
            yPos = await addField(fa.label, fa.value || "N/A", margin, yPos, pageWidth - margin * 2);
            if (fa.notes) {
                yPos = await addField("Notes / Evidence", fa.notes, margin, yPos, pageWidth - margin * 2);
            }
            yPos += 2;
        }

        // Section E - Outcome of Capacity Assessment
        yPos = await addSectionTitle("SECTION E - OUTCOME OF CAPACITY ASSESSMENT", yPos + 2);
        const capacityOutcome = assessmentData.hasCapacity === "Yes" 
            ? "Based on the assessment above, the person DOES have the capacity to make this decision."
            : "Based on the assessment above, the person DOES NOT have the capacity to make this decision.";
        yPos = await addField("Capacity Outcome", capacityOutcome, margin, yPos, pageWidth - margin * 2);

        // Section F - Resident Consent (if capacity is present)
        if (assessmentData.hasCapacity === "Yes") {
            yPos = await addSectionTitle("SECTION F - RESIDENT CONSENT", yPos + 2);
            yPos = await ensureCapacitySpace(25, yPos);
            const rowResConsentY = yPos;
            let yResConsent1 = await addField("Resident Signature", assessmentData.residentSignature || "N/A", margin, rowResConsentY, cpWidth, true);
            let yResConsent2 = await addField("Date", assessmentData.residentConsentDate ? format(new Date(assessmentData.residentConsentDate), "dd/MM/yyyy") : "N/A", cpCol2, rowResConsentY, cpWidth, true);
            yPos = Math.max(yResConsent1, yResConsent2);
        }

        // Section G - Assessor Details
        yPos = await addSectionTitle("SECTION G - ASSESSOR DETAILS", yPos + 2);
        yPos = await ensureCapacitySpace(40, yPos);
        const rowAssessorY = yPos;
        let yAssessor1 = await addField("Assessor Name", assessmentData.assessorName || "N/A", margin, rowAssessorY, cpWidth, true);
        yAssessor1 = await addField("Assessor Role", assessmentData.assessorRole || "N/A", margin, yAssessor1 + 1, cpWidth, true);

        let yAssessor2 = await addField("Assessor Signature", assessmentData.assessorSignature || "N/A", cpCol2, rowAssessorY, cpWidth, true);
        yAssessor2 = await addField("Date of Assessment", assessmentData.assessmentDate ? format(new Date(assessmentData.assessmentDate), "dd/MM/yyyy") : "N/A", cpCol2, yAssessor2 + 1, cpWidth, true);
        yPos = Math.max(yAssessor1, yAssessor2);

        // Section H - Legal Representative (if applicable)
        if (assessmentData.legalRepresentativeType || assessmentData.representativeName) {
            yPos = await addSectionTitle("SECTION H - LEGAL REPRESENTATIVE", yPos + 2);
            yPos = await ensureCapacitySpace(40, yPos);
            const rowRepY = yPos;
            let yRep1 = await addField("Type of Representative", assessmentData.legalRepresentativeType || "N/A", margin, rowRepY, cpWidth, true);
            yRep1 = await addField("Representative Name", assessmentData.representativeName || "N/A", margin, yRep1 + 1, cpWidth, true);

            let yRep2 = await addField("Relationship to Resident", assessmentData.relationshipToResident || "N/A", cpCol2, rowRepY, cpWidth, true);
            yRep2 = await addField("Contact Details", assessmentData.contactDetails || "N/A", cpCol2, yRep2 + 1, cpWidth, true);
            yPos = Math.max(yRep1, yRep2);
        }

        // Section I - Review and Reassessment
        yPos = await addSectionTitle("SECTION I - REVIEW AND REASSESSMENT", yPos + 2);
        yPos = await ensureCapacitySpace(25, yPos);
        const rowReviewY = yPos;
        let yReview1 = await addField("Next Review Date", assessmentData.nextReviewDate ? format(new Date(assessmentData.nextReviewDate), "dd/MM/yyyy") : "N/A", margin, rowReviewY, cpWidth, true);
        let yReview2 = await addField("Reason for Reassessment", assessmentData.reasonForReassessment || "N/A", cpCol2, rowReviewY, cpWidth, true);
        yPos = Math.max(yReview1, yReview2);

        doc.save(`Capacity-and-Consent-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    if (formName.toUpperCase().includes("PRE-ADMISSION ASSESSMENT FORM")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawPreAdmissionHeader = async () => {
            await drawHeader();
        };

        const ensurePreAdmissionSpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawPreAdmissionHeader();
                return 30;
            }
            return currentY;
        };

        let yPos = 30;
        await drawPreAdmissionHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // 1. Administrative Details
        yPos = await addSectionTitle("ADMINISTRATIVE DETAILS", yPos);
        yPos = await ensurePreAdmissionSpace(40, yPos);
        const rowAdminY = yPos;
        let yAdmin1 = await addField("Care Home Name", assessmentData.careHomeName || data.care_home_name || careHomeName || "N/A", margin, rowAdminY, cpWidth, true);
        yAdmin1 = await addField("Assessing Worker", assessmentData.userName || "N/A", margin, yAdmin1 + 1, cpWidth, true);

        let yAdmin2 = await addField("NHS Number", assessmentData.nhsHealthCareNumber || data.nhs_number || "N/A", cpCol2, rowAdminY, cpWidth, true);
        yAdmin2 = await addField("Job Role", assessmentData.jobRole || "N/A", cpCol2, yAdmin2 + 1, cpWidth, true);

        yPos = Math.max(yAdmin1, yAdmin2);
        const aDate = assessmentData.date || data.date;
        yPos = await addField("Assessment Date", aDate ? format(new Date(aDate), "dd/MM/yyyy") : "N/A", margin, yPos + 1, cpWidth);
        yPos = await addField("Signature", assessmentData.signature || "N/A", margin, yPos + 1, cpWidth);

        // 2. Resident Information
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos + 2);
        yPos = await ensurePreAdmissionSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField("Full Name", `${assessmentData.firstName || ""} ${assessmentData.lastName || ""}`.trim() || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField("Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField("Gender", assessmentData.gender || "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField("Religion", assessmentData.religion || "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField("Current Address", assessmentData.address || "N/A", cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField("Phone Number", assessmentData.phoneNumber || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yRes2 = await addField("Ethnicity", assessmentData.ethnicity || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // 3. Next of Kin
        yPos = await addSectionTitle("NEXT OF KIN", yPos + 2);
        yPos = await ensurePreAdmissionSpace(25, yPos);
        const rowKinY = yPos;
        let yKin1 = await addField("Name", `${assessmentData.kinFirstName || ""} ${assessmentData.kinLastName || ""}`.trim() || "N/A", margin, rowKinY, cpWidth, true);
        yKin1 = await addField("Relationship", assessmentData.kinRelationship || "N/A", margin, yKin1 + 1, cpWidth, true);

        let yKin2 = await addField("Phone Number", assessmentData.kinPhoneNumber || "N/A", cpCol2, rowKinY, cpWidth, true);
        yPos = Math.max(yKin1, yKin2);

        // 4. Professional Contacts
        yPos = await addSectionTitle("PROFESSIONAL CONTACTS", yPos + 2);
        yPos = await ensurePreAdmissionSpace(40, yPos);
        const rowProfY = yPos;
        let yProf1 = await addField("Care Manager", `${assessmentData.careManagerName || "N/A"} (${assessmentData.careManagerPhoneNumber || "N/A"})`, margin, rowProfY, cpWidth, true);
        yProf1 = await addField("General Practitioner", `${assessmentData.generalPractitionerName || "N/A"} (${assessmentData.generalPractitionerPhoneNumber || "N/A"})`, margin, yProf1 + 1, cpWidth, true);

        let yProf2 = await addField("District Nurse", `${assessmentData.districtNurseName || "N/A"} (${assessmentData.districtNursePhoneNumber || "N/A"})`, cpCol2, rowProfY, cpWidth, true);
        yProf2 = await addField("Provider Healthcare Info", `${assessmentData.providerHealthcareInfoName || "N/A"} - ${assessmentData.providerHealthcareInfoDesignation || "N/A"}`, cpCol2, yProf2 + 1, cpWidth, true);
        yPos = Math.max(yProf1, yProf2);

        // 5. Medical Assessment
        yPos = await addSectionTitle("MEDICAL ASSESSMENT", yPos + 2);
        yPos = await addField("Known Allergies", assessmentData.allergies || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Medical History & Diagnoses", assessmentData.medicalHistory || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Medications Prescribed", assessmentData.medicationPrescribed || "N/A", margin, yPos, pageWidth - margin * 2);

        // 6. Activities of Daily Living
        yPos = await addSectionTitle("ACTIVITIES OF DAILY LIVING", yPos + 2);
        const adlFields = [
            { label: "Consent, Capacity & Rights", value: assessmentData.consentCapacityRights },
            { label: "Medication", value: assessmentData.medication },
            { label: "Mobility", value: assessmentData.mobility },
            { label: "Nutrition", value: assessmentData.nutrition },
            { label: "Continence", value: assessmentData.continence },
            { label: "Hygiene & Dressing", value: assessmentData.hygieneDressing },
            { label: "Skin Integrity", value: assessmentData.skin },
            { label: "Cognition", value: assessmentData.cognition },
            { label: "Infection Control", value: assessmentData.infection },
            { label: "Breathing", value: assessmentData.breathing },
            { label: "Altered State of Consciousness", value: assessmentData.alteredStateOfConsciousness }
        ];

        for (const adl of adlFields) {
            yPos = await addField(adl.label, adl.value || "N/A", margin, yPos, pageWidth - margin * 2);
        }

        // 7. Legal & End of Life
        yPos = await addSectionTitle("LEGAL & END OF LIFE", yPos + 2);
        yPos = await ensurePreAdmissionSpace(25, yPos);
        const rowLegalY = yPos;
        let yLegal1 = await addField("DNACPR", assessmentData.dnacpr, margin, rowLegalY, cpWidth, true);
        yLegal1 = await addField("Capacity Assessment", assessmentData.capacity, margin, yLegal1 + 1, cpWidth, true);

        let yLegal2 = await addField("Advanced Decision", assessmentData.advancedDecision, cpCol2, rowLegalY, cpWidth, true);
        yLegal2 = await addField("Advanced Care Plan", assessmentData.advancedCarePlan, cpCol2, yLegal2 + 1, cpWidth, true);
        yPos = Math.max(yLegal1, yLegal2);
        yPos = await addField("Palliative Care Comments", assessmentData.comments || "N/A", margin, yPos, pageWidth - margin * 2);

        // 8. Resident Preferences
        yPos = await addSectionTitle("RESIDENT PREFERENCES", yPos + 2);
        yPos = await addField("Preferred Name", assessmentData.preferedName || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Room Preferences", assessmentData.roomPreferences || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Food Preferences", assessmentData.foodPreferences || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Admission Contact", assessmentData.admissionContact || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Family Concerns", assessmentData.familyConcerns || "N/A", margin, yPos, pageWidth - margin * 2);

        // 9. Other Information
        yPos = await addSectionTitle("OTHER RELEVANT INFORMATION", yPos + 2);
        yPos = await addField("Other Healthcare Professionals Involved", assessmentData.otherHealthCareProfessional || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Equipment Required", assessmentData.equipment || "N/A", margin, yPos, pageWidth - margin * 2);

        // 10. Financial & Additional
        yPos = await addSectionTitle("FINANCIAL & FINAL DETAILS", yPos + 2);
        yPos = await addField("Does anyone attend to finances?", assessmentData.attendFinances, margin, yPos, pageWidth - margin * 2);
        if (assessmentData.attendFinances) {
             yPos = await addField("Finance Contact Name", assessmentData.financesName || "N/A", margin, yPos, pageWidth - margin * 2);
             yPos = await addField("Finance Contact Number", assessmentData.financesContactNumber || "N/A", margin, yPos, pageWidth - margin * 2);
             yPos = await addField("Finance Contact Address", assessmentData.financesAddress || "N/A", margin, yPos, pageWidth - margin * 2);
        }
        yPos = await addField("Additional Considerations", assessmentData.additionalConsiderations || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("ASSESSMENT OUTCOME", assessmentData.outcome || "N/A", margin, yPos, pageWidth - margin * 2);
        const pDate = assessmentData.plannedAdmissionDate;
        yPos = await addField("PLANNED ADMISSION DATE", pDate ? format(new Date(pDate), "dd/MM/yyyy") : "N/A", margin, yPos, pageWidth - margin * 2);

        doc.save(`Pre-Admission-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Infection Prevention Control Pre-Admission Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("INFECTION PREVENTION CONTROL")) {
        const assessmentData = assessmentDataForSpecialized;
        const symptoms = assessmentData.symptoms || {};
        const exposure = assessmentData.exposure_history || {};
        const details = symptoms.details || {};
        const respiratory = symptoms.respiratory || {};
        const dv = symptoms.diarrheaVomiting || {};
        const clostridium = symptoms.clostridium || {};
        const mrsa = symptoms.mrsa || {};
        const mdro = symptoms.multiDrugResistance || {};

        const drawIPCHeader = async () => {
            await drawHeader();
        };

        const ensureIPCSpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawIPCHeader();
                return 30;
            }
            return currentY;
        };

        let yPos = 30;
        await drawIPCHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // 1. Resident Details
        yPos = await addSectionTitle("RESIDENT DETAILS", yPos);
        yPos = await ensureIPCSpace(40, yPos);
        const rowResY = yPos;
        const resName = assessmentData.name || details.name || `${resident?.first_name} ${resident?.last_name}`;
        let yRes1 = await addField("Resident Name", resName, margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || details.dateOfBirth || resident?.date_of_birth;
        yRes1 = await addField("Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField("Information Provided By", details.informationProvidedBy || "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField("Assessment Type", assessmentData.assessment_type || "Pre-admission", cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField("Home Address", details.homeAddress || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yRes2 = await addField("Consultant / GP Name", details.consultantGP || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // Admission Details
        yPos = await ensureIPCSpace(20, yPos + 2);
        const rowAdmY = yPos;
        let yAdm1 = await addField("Location Admitted From", exposure.admittedFrom || "N/A", margin, rowAdmY, cpWidth, true);
        yAdm1 = await addField("Reason for Admission", exposure.reasonForAdmission || "N/A", margin, yAdm1 + 1, cpWidth, true);
        let yAdm2 = await addField("Admission Date", exposure.dateOfAdmission ? format(new Date(exposure.dateOfAdmission), "dd/MM/yyyy") : "N/A", cpCol2, rowAdmY, cpWidth, true);
        yPos = Math.max(yAdm1, yAdm2);

        // 2. Acute Respiratory Illness (ARI)
        yPos = await addSectionTitle("ACUTE RESPIRATORY ILLNESS (ARI)", yPos + 4);
        
        const getYesNo = (val: any) => val ? "YES" : "NO";

        autoTable(doc, {
            startY: yPos,
            head: [['Symptoms', 'Result', 'Testing', 'Result']],
            body: [
                ["New Continuous Cough", getYesNo(respiratory.newContinuousCough), "Tested for COVID-19", getYesNo(respiratory.testedForCovid19)],
                ["Worsening Cough", getYesNo(respiratory.worseningCough), "Tested for Influenza A", getYesNo(respiratory.testedForInfluenzaA)],
                ["High Temperature (>37.8°C)", getYesNo(respiratory.temperatureHigh), "Tested for Influenza B", getYesNo(respiratory.testedForInfluenzaB)],
                ["", "", "Tested for Resp Screen", getYesNo(respiratory.testedForRespiratoryScreen)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 9 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 4;
        
        yPos = await addField("Other Respiratory Symptoms", respiratory.otherRespiratorySymptoms || "None", margin, yPos, pageWidth - margin * 2);
        
        yPos = await ensureIPCSpace(20, yPos);
        const rowAriResY = yPos;
        let yAri1 = await addField("Influenza B Result", respiratory.influenzaB ? "Positive" : "Negative", margin, rowAriResY, cpWidth, true);
        let yAri2 = await addField("Respiratory Screen Result", respiratory.respiratoryScreen ? "Positive" : "Negative", cpCol2, rowAriResY, cpWidth, true);
        yPos = Math.max(yAri1, yAri2) + 2;

        // 3. Exposure & Isolation History
        yPos = await addSectionTitle("EXPOSURE & ISOLATION HISTORY", yPos + 4);
        yPos = await ensureIPCSpace(35, yPos);
        const rowExpY = yPos;
        let yExp1 = await addField("Exposed to COVID+ Patients?", getYesNo(exposure.exposureToPatientsCovid), margin, rowExpY, cpWidth, true);
        yExp1 = await addField("Exposed to COVID+ Staff?", getYesNo(exposure.exposureToStaffCovid), margin, yExp1 + 1, cpWidth, true);
        
        let yExp2 = await addField("Current Isolation Required?", getYesNo(assessmentData.isolation_required), cpCol2, rowExpY, cpWidth, true);
        yExp2 = await addField("Further Treatment Required?", getYesNo(exposure.furtherTreatmentRequired), cpCol2, yExp2 + 1, cpWidth, true);
        yPos = Math.max(yExp1, yExp2);
        yPos = await addField("Isolation Details & Recommendations", exposure.isolationDetails || "None", margin, yPos + 1, pageWidth - margin * 2);

        // 4. Diarrhoea & Vomiting
        yPos = await addSectionTitle("DIARRHOEA & VOMITING", yPos + 4);
        yPos = await addField("Current Symptoms (Infection Not Confirmed)", getYesNo(dv.currentSymptoms), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Contact with d/v within last 72 hours", getYesNo(dv.contactWithOthers), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Family history of d/v in past 72 hours", getYesNo(dv.familyHistory72h), margin, yPos, pageWidth - margin * 2);

        // 5. Clostridium Difficile
        yPos = await addSectionTitle("CLOSTRIDIUM DIFFICILE", yPos + 4);
        yPos = await ensureIPCSpace(50, yPos);
        const rowCdiffY = yPos;
        let yCdiff1 = await addField("Active C.Diff Case?", getYesNo(clostridium.active), margin, rowCdiffY, cpWidth, true);
        yCdiff1 = await addField("Past History of C.Diff?", getYesNo(clostridium.history), margin, yCdiff1 + 1, cpWidth, true);
        yCdiff1 = await addField("Stool Count (Last 72h)", clostridium.stoolCount72h || "N/A", margin, yCdiff1 + 1, cpWidth, true);
        
        let yCdiff2 = await addField("Last Positive Specimen Date", clostridium.lastPositiveSpecimenDate ? format(new Date(clostridium.lastPositiveSpecimenDate), "dd/MM/yyyy") : "N/A", cpCol2, rowCdiffY, cpWidth, true);
        yCdiff2 = await addField("Specimen Result", clostridium.result || "N/A", cpCol2, yCdiff2 + 1, cpWidth, true);
        yCdiff2 = await addField("Treatment Received", clostridium.treatmentReceived || "N/A", cpCol2, yCdiff2 + 1, cpWidth, true);
        yCdiff2 = await addField("Treatment Complete?", getYesNo(clostridium.treatmentComplete), cpCol2, yCdiff2 + 1, cpWidth, true);
        yPos = Math.max(yCdiff1, yCdiff2);
        
        // Ongoing C.Diff Regimen
        yPos = await addSectionTitle("ONGOING C.DIFF REGIMEN", yPos + 4);
        yPos = await addField("Active Antibiotic Details", clostridium.ongoingDetails || "None", margin, yPos, pageWidth - margin * 2);
        yPos = await ensureIPCSpace(20, yPos);
        const rowCdiffRegY = yPos;
        let yCdiffReg1 = await addField("Course Start Date", clostridium.ongoingDateCommenced ? format(new Date(clostridium.ongoingDateCommenced), "dd/MM/yyyy") : "N/A", margin, rowCdiffRegY, cpWidth, true);
        let yCdiffReg2 = await addField("Projected Length", clostridium.ongoingLengthOfCourse || "N/A", cpCol2, rowCdiffRegY, cpWidth, true);
        yPos = Math.max(yCdiffReg1, yCdiffReg2);
        yPos = await addField("Follow-up required", clostridium.ongoingFollowUpRequired || "None", margin, yPos + 1, pageWidth - margin * 2);

        // 6. MRSA / MSSA
        yPos = await addSectionTitle("MRSA / MSSA STATUS", yPos + 4);
        yPos = await ensureIPCSpace(40, yPos);
        const rowMrsaY = yPos;
        let yMrsa1 = await addField("Known Colonisation?", getYesNo(mrsa.colonised), margin, rowMrsaY, cpWidth, true);
        yMrsa1 = await addField("Active Infection?", getYesNo(mrsa.infected), margin, yMrsa1 + 1, cpWidth, true);
        yMrsa1 = await addField("Last Positive Swab Date", mrsa.lastPositiveSwabDate ? format(new Date(mrsa.lastPositiveSwabDate), "dd/MM/yyyy") : "N/A", margin, yMrsa1 + 1, cpWidth, true);
        
        let yMrsa2 = await addField("Sites Positive", mrsa.sitesPositive || "N/A", cpCol2, rowMrsaY, cpWidth, true);
        yMrsa2 = await addField("Treatment Regimen Received", mrsa.treatmentReceived || "N/A", cpCol2, yMrsa2 + 1, cpWidth, true);
        yPos = Math.max(yMrsa1, yMrsa2);

        // Ongoing MRSA Regimen
        yPos = await addSectionTitle("ONGOING DECOLONISATION", yPos + 4);
        yPos = await addField("Details", mrsa.mrsaMssaDetails || "None", margin, yPos, pageWidth - margin * 2);
        yPos = await ensureIPCSpace(20, yPos);
        const rowMrsaRegY = yPos;
        let yMrsaReg1 = await addField("Regimen Start Date", mrsa.mrsaMssaDateCommenced ? format(new Date(mrsa.mrsaMssaDateCommenced), "dd/MM/yyyy") : "N/A", margin, rowMrsaRegY, cpWidth, true);
        let yMrsaReg2 = await addField("Projected Duration", mrsa.mrsaMssaLengthOfCourse || "N/A", cpCol2, rowMrsaRegY, cpWidth, true);
        yPos = Math.max(yMrsaReg1, yMrsaReg2);
        yPos = await addField("Follow-up required", mrsa.mrsaMssaFollowUpRequired || "None", margin, yPos + 1, pageWidth - margin * 2);

        // 7. MDRO
        yPos = await addSectionTitle("MULTI-DRUG RESISTANT ORGANISMS (MDRO)", yPos + 4);
        autoTable(doc, {
            startY: yPos,
            body: [
                ["ESBL", getYesNo(mdro.esbl)],
                ["VRE / GRE", getYesNo(mdro.vreGre)],
                ["CPE", getYesNo(mdro.cpe)]
            ],
            theme: 'grid',
            styles: { fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 30 } }
        });
        yPos = (doc as any).lastAutoTable.finalY + 4;
        yPos = await addField("Other MDR Organisms", mdro.other || "None", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Additional Clinical Notes", mdro.relevantInformation || "None", margin, yPos, pageWidth - margin * 2);

        // 8. Vaccinations & Awareness
        yPos = await addSectionTitle("VACCINATIONS & AWARENESS", yPos + 4);
        yPos = await ensureIPCSpace(20, yPos);
        const rowVacY = yPos;
        let yVac1 = await addField("Personal awareness of status?", getYesNo(exposure.awarenessOfInfection), margin, rowVacY, cpWidth, true);
        let yVac2 = await addField("Last Flu Vaccination Date", exposure.lastFluVaccinationDate ? format(new Date(exposure.lastFluVaccinationDate), "dd/MM/yyyy") : "N/A", cpCol2, rowVacY, cpWidth, true);
        yPos = Math.max(yVac1, yVac2) + 2;

        // 9. Completion & Sign-off
        yPos = await addSectionTitle("COMPLETION & SIGN-OFF", yPos + 4);
        yPos = await ensureIPCSpace(35, yPos);
        const rowSignY = yPos;
        let ySign1 = await addField("Completed By", assessmentData.completed_by || details.jobRole || "N/A", margin, rowSignY, cpWidth, true);
        ySign1 = await addField("Job Role", details.jobRole || "N/A", margin, ySign1 + 1, cpWidth, true);
        
        const cDate = assessmentData.assessment_date || data.assessment_date;
        let ySign2 = await addField("Completion Date", cDate ? format(new Date(cDate), "dd/MM/yyyy") : "N/A", cpCol2, rowSignY, cpWidth, true);
        ySign2 = await addField("Digital Signature", assessmentData.signature || resName || "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        yPos = Math.max(ySign1, ySign2);

        doc.save(`Infection-Prevention-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Photographic Consent Form Specialized Layout ---
    if (formName.toUpperCase().includes("PHOTOGRAPHIC CONSENT") || formName.toUpperCase().includes("PHOTOGRAPHY CONSENT")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawPhotoHeader = async () => {
            await drawHeader();
        };

        const ensurePhotoSpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawPhotoHeader();
                return 30;
            }
            return currentY;
        };

        let yPos = 30;
        await drawPhotoHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // 1. Resident Information
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
        yPos = await ensurePhotoSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField("Resident Name", assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField("Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField("Bedroom Number", assessmentData.bedroomNumber || (resident ? resident.room_number : "N/A"), cpCol2, rowResY, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // 2. Consent Permissions
        yPos = await addSectionTitle("PHOTOGRAPHY AND IMAGE USE CONSENT", yPos + 2);
        
        const consents = [
            { 
                label: "Healthcare Records", 
                value: assessmentData.healthcareRecords,
                description: "Photography for medical documentation, wound care monitoring, and healthcare record purposes."
            },
            { 
                label: "Internal Social Activities", 
                value: assessmentData.socialActivitiesInternal,
                description: "Photography during internal activities, celebrations, and events for internal facility use only."
            },
            { 
                label: "External Social Activities & Marketing", 
                value: assessmentData.socialActivitiesExternal,
                description: "Photography for marketing materials, website, social media, newsletters, and promotional activities."
            }
        ];

        for (const consent of consents) {
            yPos = await addField(consent.label, consent.value ? "CONSENT GIVEN" : "CONSENT NOT GIVEN", margin, yPos, pageWidth - margin * 2);
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(107, 114, 128);
            const splitDesc = doc.splitTextToSize(consent.description, pageWidth - margin * 2);
            doc.text(splitDesc, margin, yPos);
            yPos += (splitDesc.length * 4) + 4;
        }

        // 3. Resident / Representative Signature
        yPos = await addSectionTitle("SIGNATURES & AUTHORIZATION", yPos + 2);
        yPos = await ensurePhotoSpace(40, yPos);
        const rowSignY = yPos;
        
        let ySign1 = await addField("Resident Signature", assessmentData.residentSignature || "N/A", margin, rowSignY, cpWidth, true);
        
        let ySign2 = await addField("Representative Name", assessmentData.representativeName || "N/A", cpCol2, rowSignY, cpWidth, true);
        ySign2 = await addField("Relationship to Resident", assessmentData.representativeRelationship || "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        ySign2 = await addField("Representative Signature", assessmentData.representativeSignature || "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        ySign2 = await addField("Date (Representative)", assessmentData.representativeDate ? format(new Date(assessmentData.representativeDate), "dd/MM/yyyy") : "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        
        yPos = Math.max(ySign1, ySign2);

        // 4. Staff Verification
        yPos = await addSectionTitle("STAFF VERIFICATION", yPos + 2);
        yPos = await ensurePhotoSpace(30, yPos);
        const rowStaffY = yPos;
        
        let yStaff1 = await addField("Staff Name", assessmentData.nameStaff || "N/A", margin, rowStaffY, cpWidth, true);
        yStaff1 = await addField("Staff Signature", assessmentData.staffSignature || "N/A", margin, yStaff1 + 1, cpWidth, true);
        
        let yStaff2 = await addField("Date Completed", assessmentData.date ? format(new Date(assessmentData.date), "dd/MM/yyyy") : "N/A", cpCol2, rowStaffY, cpWidth, true);
        
        yPos = Math.max(yStaff1, yStaff2);

        doc.save(`Photographic-Consent-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Best Interest Decision Form Specialized Layout ---
    if (formName.toUpperCase().includes("BEST INTEREST DECISION")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawBIDHeader = async () => {
            await drawHeader();
        };

        const ensureBIDSpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawBIDHeader();
                return 30;
            }
            return currentY;
        };

        let yPos = 30;
        await drawBIDHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // 1. Resident Details
        yPos = await addSectionTitle("RESIDENT DETAILS", yPos);
        yPos = await ensureBIDSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField("Resident Name", assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField("Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField("GP Name", assessmentData.gpName || (resident ? resident.gp_name : "N/A"), cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField("Staff involved in Discussion", assessmentData.staffMemberInvolved || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // 2. Decision Details
        yPos = await addSectionTitle("DECISION DETAILS", yPos + 2);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(31, 41, 55);
        
        const label1 = "I/We have been involved in a discussion with the relevant health professionals over the investigation/treatment/procedure/restraint proposed of:";
        const splitLabel1 = doc.splitTextToSize(label1, pageWidth - margin * 2);
        doc.text(splitLabel1, margin, yPos);
        yPos += (splitLabel1.length * 5) + 2;

        doc.setFont("helvetica", "bold");
        const val1 = assessmentData.proposedTreatmentOf || "N/A";
        const splitVal1 = doc.splitTextToSize(val1, pageWidth - margin * 2);
        doc.text(splitVal1, margin, yPos);
        yPos += (splitVal1.length * 5) + 4;

        doc.setFont("helvetica", "normal");
        const label2 = "for (Explain what treatment is):";
        doc.text(label2, margin, yPos);
        yPos += 5;

        doc.setFont("helvetica", "bold");
        const val2 = assessmentData.treatmentDescription || "N/A";
        const splitVal2 = doc.splitTextToSize(val2, pageWidth - margin * 2);
        doc.text(splitVal2, margin, yPos);
        yPos += (splitVal2.length * 5) + 6;

        // 3. Declaration & Comments
        yPos = await addSectionTitle("DECLARATION & COMMENTS", yPos + 2);
        const declarationText = "I/We understand that he/she is unable to give his/her consent. I/We also understand that investigation/treatment/procedure/restraint may lawfully be carried out if it is in his/her best interests to receive it.";
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(107, 114, 128);
        const splitDecl = doc.splitTextToSize(declarationText, pageWidth - margin * 2);
        doc.text(splitDecl, margin, yPos);
        yPos += (splitDecl.length * 5) + 4;

        yPos = await addField("Any other comments, including concerns about the decision", assessmentData.otherComments || "N/A", margin, yPos, pageWidth - margin * 2);

        // 4. Sign-off
        yPos = await addSectionTitle("SIGN-OFF", yPos + 2);
        yPos = await ensureBIDSpace(40, yPos);
        const rowSignY = yPos;

        let ySign1 = await addField("Name", assessmentData.signerName || "N/A", margin, rowSignY, cpWidth, true);
        ySign1 = await addField("Relationship to Resident", assessmentData.signerRelationship || "N/A", margin, ySign1 + 1, cpWidth, true);
        ySign1 = await addField("Address", assessmentData.signerAddress || "N/A", margin, ySign1 + 1, cpWidth, true);

        let ySign2 = await addField("Signature", assessmentData.signerSignature || "N/A", cpCol2, rowSignY, cpWidth, true);
        ySign2 = await addField("Date", assessmentData.signerDate ? format(new Date(assessmentData.signerDate), "dd/MM/yyyy") : "N/A", cpCol2, ySign2 + 1, cpWidth, true);

        yPos = Math.max(ySign1, ySign2);

        doc.save(`Best-Interest-Decision-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- General Risk Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("GENERAL RISK ASSESSMENT")) {
        const assessment = (data?.assessment_data ?? data ?? {});

        const drawGeneralRiskHeader = async () => {
            await drawHeader();
        };

        const ensureGeneralRiskSpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawGeneralRiskHeader();
                return 30;
            }
            return currentY;
        };

        const renderYesNoList = async (label: string, selectedOptions: string[] | undefined, allOptions: readonly string[], y: number) => {
            y = await addSectionTitle(label, y);
            for (const option of allOptions) {
                const isSelected = selectedOptions?.includes(option);
                // The user wants: "Option Label: Yes" or "Option Label: No"
                y = await addField(option, isSelected ? "Yes" : "No", margin, y, pageWidth - margin * 2);
            }
            return y;
        };

        let yPos = 30;
        await drawGeneralRiskHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;

        // Section A — Resident Information
        yPos = await addSectionTitle("SECTION A — RESIDENT INFORMATION", yPos);
        yPos = await ensureGeneralRiskSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField("Full Name", assessment.fullName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessment.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField("Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField("Resident / NHS Number", assessment.nhsNumber || (resident ? resident.nhs_health_number : "N/A"), margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField("Room Number", assessment.roomNumber || (resident ? resident.room_number : "N/A"), cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField("Date of Assessment", assessment.dateOfAssessment ? format(new Date(assessment.dateOfAssessment), "dd/MM/yyyy") : "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // Section B — Assessment Details
        yPos = await addSectionTitle("SECTION B — ASSESSMENT DETAILS", yPos + 2);
        yPos = await ensureGeneralRiskSpace(20, yPos);
        const rowAssY = yPos;
        let yAss1 = await addField("Assessment Completed By", assessment.assessmentCompletedBy || "N/A", margin, rowAssY, cpWidth, true);
        let yAss2 = await addField("Role", assessment.role || "N/A", cpCol2, rowAssY, cpWidth, true);
        yPos = Math.max(yAss1, yAss2);

        const reasonOptions = ["New admission", "Change in condition", "Routine review", "Incident or accident"] as const;
        yPos = await renderYesNoList("Reason for Assessment", assessment.reasonForAssessment, reasonOptions, yPos + 2);
        if (assessment.otherReason) {
            yPos = await addField("Other Reason", assessment.otherReason, margin, yPos, pageWidth - margin * 2);
        }

        // Section C — Areas of Risk Identified
        const areasOptions = [
            "Falls and mobility", "Skin integrity / pressure ulcers", "Nutrition and hydration",
            "Medication management", "Behavioural or cognitive risks", "Infection control",
            "Manual handling needs", "Environmental hazards", "Wandering or absconding",
            "Choking or swallowing difficulties"
        ] as const;
        yPos = await renderYesNoList("SECTION C — AREAS OF RISK IDENTIFIED", assessment.areasOfRisk, areasOptions, yPos + 2);
        if (assessment.otherArea) {
            yPos = await addField("Other Area", assessment.otherArea, margin, yPos, pageWidth - margin * 2);
        }

        // Section D — Description of Identified Risks
        yPos = await addSectionTitle("SECTION D — DESCRIPTION OF IDENTIFIED RISKS", yPos + 2);
        yPos = await addField("Risk Description", assessment.riskDescription || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section E — Risk Level
        yPos = await addSectionTitle("SECTION E — RISK LEVEL", yPos + 2);
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
            yPos = await addField("Risk Levels", "No specific risk levels provided", margin, yPos, pageWidth - margin * 2);
        }

        // Section F — Control Measures and Actions
        yPos = await addSectionTitle("SECTION F — CONTROL MEASURES AND ACTIONS", yPos + 2);
        yPos = await addField("Control Measures", assessment.controlMeasures || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section G — Equipment or Support Required
        const equipOptions = [
            "Walking aid", "Pressure-relieving mattress or cushion", "Bed rails",
            "Sensor mats or alarms", "Specialist diet or thickened fluids", "Increased supervision"
        ] as const;
        yPos = await renderYesNoList("SECTION G — EQUIPMENT OR SUPPORT REQUIRED", assessment.equipmentRequired, equipOptions, yPos + 2);
        if (assessment.otherEquipment) {
            yPos = await addField("Other Equipment", assessment.otherEquipment, margin, yPos, pageWidth - margin * 2);
        }

        // Section H — Resident / Representative Involvement
        const involvementOptions = [
            "Resident involved in assessment", "Family or representative involved", "Resident unable to participate"
        ] as const;
        yPos = await renderYesNoList("SECTION H — RESIDENT / REPRESENTATIVE INVOLVEMENT", assessment.residentInvolvement, involvementOptions, yPos + 2);
        if (assessment.involvementComments) {
            yPos = await addField("Comments", assessment.involvementComments, margin, yPos, pageWidth - margin * 2);
        }

        // Section I — Review and Monitoring
        const freqOptions = ["Weekly", "Monthly", "Quarterly", "After any incident"] as const;
        yPos = await renderYesNoList("SECTION I — REVIEW AND MONITORING", assessment.reviewFrequency, freqOptions, yPos + 2);
        if (assessment.otherFrequency) {
            yPos = await addField("Other Frequency", assessment.otherFrequency, margin, yPos, pageWidth - margin * 2);
        }
        yPos = await addField("Next Review Date", assessment.nextReviewDate ? format(new Date(assessment.nextReviewDate), "dd/MM/yyyy") : "N/A", margin, yPos, pageWidth - margin * 2);

        // Section J — Signatures
        yPos = await addSectionTitle("SECTION J — SIGNATURES", yPos + 2);
        yPos = await ensureGeneralRiskSpace(30, yPos);
        const rowSigY = yPos;
        let ySig1 = await addField("Assessor Signature", assessment.assessorSignature || "N/A", margin, rowSigY, cpWidth, true);
        let ySig2 = await addField("Date", assessment.signatureDate ? format(new Date(assessment.signatureDate), "dd/MM/yyyy") : "N/A", cpCol2, rowSigY, cpWidth, true);
        yPos = Math.max(ySig1, ySig2);

        doc.save(`${resident?.last_name || "Resident"}_General_Risk_Assessment_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Abbey Pain Tool Specialized Layout ---
    if (formName.toUpperCase().includes("ABBEY PAIN TOOL")) {
        const assessment = (data?.assessment_data ?? data ?? {});
        const col2 = margin + (pageWidth - margin * 2) / 2;
        const colWidth = (pageWidth - margin * 2) / 2 - 5;

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
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
        yPos = await ensureSpace(25, yPos);
        const rowResidentY = yPos;
        let yLeft = await addField(
            "Full Name",
            [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "),
            margin,
            rowResidentY,
            colWidth,
            true
        );
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        yLeft = await addField("Date of Birth", dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A", margin, yLeft + 1, colWidth, true);
        yLeft = await addField("NHS Number", resident?.nhs_health_number || resident?.nhsHealthNumber || "N/A", margin, yLeft + 1, colWidth, true);

        let yRight = await addField("Care Home", careHomeName || "N/A", col2, rowResidentY, colWidth, true);
        yRight = await addField("Room Number", resident?.room_number || resident?.roomNumber || "N/A", col2, yRight + 1, colWidth, true);
        yRight = await addField("Date Generated", format(new Date(), "dd/MM/yyyy"), col2, yRight + 1, colWidth, true);
        yPos = Math.max(yLeft, yRight) + 6;

        // 2. Past assessment history table, when provided
        if (Array.isArray(data.history) && data.history.length > 0) {
            yPos = await addSectionTitle("PAST ASSESSMENTS HISTORY", yPos);
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


    // --- Dependency Assessment Specialized Layout ---
    if (isDependencyAssessment) {
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
                head: [[
                    'Date',
                    'Completed By',
                    'Mobility',
                    'Dressing',
                    'Personal Hygiene',
                    'Feeding',
                    'Eyesight',
                    'Hearing',
                    'Pressure Sore Risk',
                    'Continence (Urine)',
                    'Continence (Faeces)',
                    'Communication',
                    'Social Dependency',
                    'Behaviour',
                    'Total Score',
                    'Dependency Level'
                ]],
                body: data.history.map((h: any) => {
                    const det = h.assessment_details || {};
                    return [
                        format(new Date(h.assessment_date), "dd/MM/yyyy"),
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
                        h.dependency_level || "N/A"
                    ];
                }),
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94] },
                styles: {
                    fontSize: 6,
                    cellPadding: 1.5,
                    halign: 'center',
                    valign: 'middle',
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 16 },
                    1: { halign: 'left', cellWidth: 22 },
                    2: { cellWidth: 10 },
                    3: { cellWidth: 10 },
                    4: { cellWidth: 13 },
                    5: { cellWidth: 10 },
                    6: { cellWidth: 10 },
                    7: { cellWidth: 10 },
                    8: { cellWidth: 14 },
                    9: { cellWidth: 14 },
                    10: { cellWidth: 14 },
                    11: { cellWidth: 12 },
                    12: { cellWidth: 14 },
                    13: { cellWidth: 12 },
                    14: { cellWidth: 11 },
                    15: { halign: 'left', cellWidth: 18 },
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

    // --- Diet Notification Specialized Layout (jsPDF) ---
    if (formName.toUpperCase().includes("DIET NOTIFICATION")) {
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

        yPos = await addSectionTitle("ADMINISTRATIVE INFORMATION", yPos);
        yPos = await addField("Resident Name", assessmentData.residentName || [resident?.first_name, resident?.last_name].filter(Boolean).join(" ") || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Room Number", assessmentData.roomNumber || assessmentData.bedroomNumber || resident?.room_number || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Completed By", assessmentData.completed_by || assessmentData.completedBy || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Print Name", assessmentData.print_name || assessmentData.printName || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Job Role", assessmentData.job_role || assessmentData.jobRole || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Signature", assessmentData.signature || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle("DIETARY PREFERENCES & RISKS", yPos + 2);
        yPos = await addField("Likes / Favourite Foods", dietaryPreferences.likesFavouriteFoods || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Dislikes", dietaryPreferences.dislikes || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Foods To Be Avoided", dietaryPreferences.foodsToBeAvoided || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Choking Risk", assessmentData.choking_risk || assessmentData.chokingRiskAssessment || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle("MEAL & FLUID SPECIFICATIONS", yPos + 2);
        yPos = await addField("Preferred Meal Size", assessmentData.preferred_meal_size || assessmentData.preferredMealSize || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Diet Type", dietaryPreferences.dietType || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Food Allergy Or Intolerance", dietaryPreferences.foodAllergyOrIntolerance || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle("FOOD & FLUID CONSISTENCY", yPos + 2);
        yPos = await addField("FOOD CONSISTENCY", "", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 7 Regular", yesNo(foodConsistency.level7Regular), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 7 Easy Chew", yesNo(foodConsistency.level7EasyChew), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 6 Soft & Bite Sized", yesNo(foodConsistency.level6SoftBiteSized), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 5 Minced & Moist", yesNo(foodConsistency.level5MincedMoist), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 4 Pureed", yesNo(foodConsistency.level4Pureed), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 3 Liquidised", yesNo(foodConsistency.level3Liquidised), margin, yPos, pageWidth - margin * 2);

        yPos = await addField("FLUID CONSISTENCY", "", margin, yPos + 1, pageWidth - margin * 2);
        yPos = await addField("Level 4 Extremely Thick", yesNo(fluidConsistency.level4ExtremelyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 3 Moderately Thick", yesNo(fluidConsistency.level3ModeratelyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 2 Mildly Thick", yesNo(fluidConsistency.level2MildlyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 1 Slightly Thick", yesNo(fluidConsistency.level1SlightlyThick), margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Level 0 Thin", yesNo(fluidConsistency.level0Thin), margin, yPos, pageWidth - margin * 2);

        yPos = await addSectionTitle("KITCHEN REVIEW", yPos + 2);
        yPos = await addField("Reviewer Print Name", kitchenReview.reviewerPrintName || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Reviewer Job Title", kitchenReview.reviewerJobTitle || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Reviewer Signature", kitchenReview.reviewerSignature || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Reviewer Date", toDate(kitchenReview.reviewerDate), margin, yPos, pageWidth - margin * 2);

        doc.save(`Diet-Notification-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
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

    const isPEEPForm = formName.toUpperCase().includes("PEEP");
    const isPersonalProfileForm = formName.toUpperCase().includes("PERSONAL PROFILE");
    const isMovingHandlingForm =
        formName.toUpperCase().includes("MOVING") && formName.toUpperCase().includes("HANDLING");
    const isNutritionAssessmentForm =
        formName.toUpperCase().includes("NUTRITIONAL ASSESSMENT") ||
        formName.toUpperCase().includes("NUTRITION ASSESSMENT") ||
        (formName.toUpperCase().includes("NUTRITION") && formName.toUpperCase().includes("ASSESSMENT"));
    const col2 = margin + (pageWidth - margin * 2) / 2;
    const colWidth = (pageWidth - margin * 2) / 2 - 5;

    // --- Resident Info Section ---
    if (!isPEEPForm && !isPersonalProfileForm && !isMovingHandlingForm && !isNutritionAssessmentForm) {
        yPos = await addSectionTitle("RESIDENT INFORMATION", yPos);
        let y1 = await addField("Full Name", [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" "), margin, yPos, colWidth);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? new Date(dobValue).toLocaleDateString('en-GB') : "N/A";
        y1 = await addField("Date of Birth", formattedDob, margin, y1, colWidth);

        let y2 = await addField("Care Home", careHomeName || "N/A", col2, yPos, colWidth);
        y2 = await addField("Date Generated", new Date().toLocaleDateString('en-GB'), col2, y2, colWidth);

        yPos = Math.max(y1, y2) + 5;
    }

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

    const isResidentHandlingProfileForm = formName.toUpperCase().includes("RESIDENT HANDLING PROFILE");

    const formatResidentHandlingDate = (value: unknown): string => {
        if (value === null || value === undefined || value === "") return "N/A";

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (/^\d{13}$/.test(trimmed) || /^\d{10}$/.test(trimmed)) {
                const numeric = Number(trimmed);
                const normalized = trimmed.length === 10 ? numeric * 1000 : numeric;
                const parsed = new Date(normalized);
                return Number.isNaN(parsed.getTime()) ? "N/A" : format(parsed, "dd/MM/yyyy");
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                const [yearStr, monthStr, dayStr] = trimmed.split("-");
                return `${dayStr}/${monthStr}/${yearStr}`;
            }
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            const normalized = value < 1e12 ? value * 1000 : value;
            const parsed = new Date(normalized);
            return Number.isNaN(parsed.getTime()) ? "N/A" : format(parsed, "dd/MM/yyyy");
        }

        const parsed = new Date(value as string | number | Date);
        return Number.isNaN(parsed.getTime()) ? "N/A" : format(parsed, "dd/MM/yyyy");
    };

    if (!isPEEPForm && !isMovingHandlingForm && !isNutritionAssessmentForm) {
        yPos = await addSectionTitle("FORM DETAILS", yPos);
    }
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
        const isBedRailsRiskAssessmentForm =
            formName.toUpperCase().includes("BEDRAIL RISK ASSESSMENT") ||
            formName.toUpperCase().includes("BED RAIL RISK ASSESSMENT") ||
            formName.toUpperCase().includes("RISK ASSESSMENT FOR USE OF BED RAILS");

        if (isBedRailsRiskAssessmentForm) {
            const valueFromPath = (source: Record<string, unknown>, path: string): unknown => {
                return path.split(".").reduce<unknown>((acc, part) => {
                    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
                        return (acc as Record<string, unknown>)[part];
                    }
                    return undefined;
                }, source);
            };

            const toYesNo = (value: unknown): string => {
                if (value === true || value === "YES" || value === "Yes") return "Yes";
                if (value === false || value === "NO" || value === "No") return "No";
                return "No";
            };

            const toText = (value: unknown): string => {
                if (value === null || value === undefined) return "Not provided";
                if (typeof value === "string") return value.trim() ? value : "Not provided";
                return String(value);
            };
            const toDateText = (value: unknown): string => {
                if (value === null || value === undefined || value === "") return "Not provided";
                const parsed = new Date(value as string | number | Date);
                return Number.isNaN(parsed.getTime()) ? "Not provided" : format(parsed, "dd/MM/yyyy");
            };

            const residentFullName = [resident?.first_name, resident?.middle_name, resident?.last_name]
                .filter(Boolean)
                .join(" ")
                .trim();
            const bedRailsSource = {
                ...(data as Record<string, unknown>),
                ...(assessmentDataForSpecialized as Record<string, unknown>),
                ...(obj as Record<string, unknown>),
                residentName: (obj as Record<string, unknown>)?.residentName
                    ?? (assessmentDataForSpecialized as Record<string, unknown>)?.residentName
                    ?? (data as Record<string, unknown>)?.residentName
                    ?? residentFullName,
                dateOfBirth: (obj as Record<string, unknown>)?.dateOfBirth
                    ?? (assessmentDataForSpecialized as Record<string, unknown>)?.dateOfBirth
                    ?? (data as Record<string, unknown>)?.dateOfBirth
                    ?? resident?.date_of_birth
                    ?? resident?.dateOfBirth,
                careHomeName: (obj as Record<string, unknown>)?.careHomeName
                    ?? (assessmentDataForSpecialized as Record<string, unknown>)?.careHomeName
                    ?? (data as Record<string, unknown>)?.careHomeName
                    ?? (data as Record<string, unknown>)?.care_home_name
                    ?? careHomeName,
                bedroomNumber: (obj as Record<string, unknown>)?.bedroomNumber
                    ?? (assessmentDataForSpecialized as Record<string, unknown>)?.bedroomNumber
                    ?? (data as Record<string, unknown>)?.bedroomNumber
                    ?? (data as Record<string, unknown>)?.bedroom_number
                    ?? resident?.room_number
                    ?? resident?.roomNumber,
            } as Record<string, unknown>;
            const prettifyEnum = (value: unknown): string => {
                if (value === null || value === undefined) return "Not provided";
                const text = String(value).trim();
                if (!text) return "Not provided";
                return text.replace(/_/g, " ").replace(/\s+/g, " ").toUpperCase();
            };
            const firstDefined = (paths: string[]): unknown => {
                for (const path of paths) {
                    const value = valueFromPath(bedRailsSource, path);
                    if (value !== undefined && value !== null && value !== "") {
                        return value;
                    }
                }
                return undefined;
            };

            const sectionFieldMap: Array<{ section: string; fields: Array<{ label: string; paths: string[]; type?: "yesno" | "text" | "date" | "enum" }> }> = [
                {
                    section: "ADMINISTRATIVE DETAILS",
                    fields: [
                        { label: "Resident Name", paths: ["residentName", "assessment_data.residentName"], type: "text" },
                        { label: "Bedroom Number", paths: ["bedroomNumber", "bedroom_number", "assessment_data.bedroomNumber", "assessment_data.bedroom_number"], type: "text" },
                        { label: "Date of Birth", paths: ["dateOfBirth", "assessment_data.dateOfBirth"], type: "date" },
                        { label: "Date of Assessment", paths: ["assessment_date", "assessmentDate", "assessment_data.assessmentDate", "assessment_data.assessment_date"], type: "date" },
                        { label: "Assessment Completed By", paths: ["completed_by", "completedBy", "assessment_data.completed_by", "assessment_data.completedBy"], type: "text" },
                        { label: "Job Role", paths: ["jobRole", "job_role", "assessment_data.jobRole", "assessment_data.job_role"], type: "text" },
                        { label: "Care Home", paths: ["careHomeName", "care_home_name", "assessment_data.careHomeName", "assessment_data.care_home_name"], type: "text" },
                        { label: "Date Generated", paths: ["created_at", "assessment_data.created_at"], type: "date" },
                    ],
                },
                {
                    section: "TRIAL & RATIONALE",
                    fields: [
                        { label: "Alternative Equipment Considered/Trialled", paths: ["alternatives_considered.considered", "alternativeEquipmentConsidered", "assessment_data.alternativeEquipmentConsidered"], type: "text" },
                        { label: "Reasons Why Alternatives Have Not Been Successful", paths: ["alternatives_considered.reasons", "reasonsAlternativesNotSuccessful", "assessment_data.reasonsAlternativesNotSuccessful"], type: "text" },
                    ],
                },
                {
                    section: "EXCLUSION CRITERIA (WHEN RAILS CANNOT BE USED)",
                    fields: [
                        { label: "Resident with capacity refuses", paths: ["risks_identified.residentRefuses", "assessment_data.risks_identified.residentRefuses"], type: "yesno" },
                        { label: "Risk of climbing over rails", paths: ["risks_identified.climbingRisk", "assessment_data.risks_identified.climbingRisk"], type: "yesno" },
                        { label: "Risk of head/limb entrapment", paths: ["risks_identified.entrapmentRisk", "assessment_data.risks_identified.entrapmentRisk"], type: "yesno" },
                        { label: "Abnormally small body size", paths: ["risks_identified.abnormalBodySize", "assessment_data.risks_identified.abnormalBodySize"], type: "yesno" },
                        { label: "Used for restraint of violent movement", paths: ["risks_identified.restraintPurpose", "assessment_data.risks_identified.restraintPurpose"], type: "yesno" },
                        { label: "Used solely to prevent leaving bed", paths: ["risks_identified.freedomLimitation", "assessment_data.risks_identified.freedomLimitation"], type: "yesno" },
                        { label: "Any Exclusion Criteria Checked", paths: ["anyExclusionChecked", "assessment_data.anyExclusionChecked"], type: "yesno" },
                    ],
                },
                {
                    section: "BENEFITS & AUTHORIZATION (WHEN RAILS CAN BE USED)",
                    fields: [
                        { label: "Resident with capacity requests", paths: ["benefits_identified.residentRequests", "assessment_data.benefits_identified.residentRequests"], type: "yesno" },
                        { label: "MDT meeting understands risks", paths: ["benefits_identified.mdtMeetingCompleted", "assessment_data.benefits_identified.mdtMeetingCompleted"], type: "yesno" },
                        { label: "Falling risk outweighs rail risk", paths: ["benefits_identified.riskOutweighsBenefit", "assessment_data.benefits_identified.riskOutweighsBenefit"], type: "yesno" },
                        { label: "All other alternatives unsuccessful", paths: ["benefits_identified.alternativesExplored", "assessment_data.benefits_identified.alternativesExplored"], type: "yesno" },
                        { label: "Best interest decision (if no capacity)", paths: ["benefits_identified.bestInterestDecision", "assessment_data.benefits_identified.bestInterestDecision"], type: "yesno" },
                        { label: "Has the reason for using bed rails been explained to the Resident?", paths: ["decision.reasonExplainedToResident", "reasonExplainedToResident", "assessment_data.decision.reasonExplainedToResident"], type: "yesno" },
                    ],
                },
                {
                    section: "EQUIPMENT CONFIGURATION",
                    fields: [
                        { label: "Type of Bed", paths: ["decision.typeOfBed", "typeOfBed", "assessment_data.decision.typeOfBed"], type: "enum" },
                        { label: "Type of Mattress", paths: ["decision.typeOfMattress", "typeOfMattress", "assessment_data.decision.typeOfMattress"], type: "enum" },
                        { label: "Type of Bedrails", paths: ["decision.typeOfBedrails", "typeOfBedrails", "assessment_data.decision.typeOfBedrails"], type: "enum" },
                        { label: "Has Extended Height Bed Rails", paths: ["decision.hasExtendedHeightRails", "hasExtendedHeightRails", "assessment_data.decision.hasExtendedHeightRails"], type: "yesno" },
                        { label: "Obtained consent from Resident or consulted NOK?", paths: ["decision.consentObtained", "consentObtained", "assessment_data.decision.consentObtained"], type: "yesno" },
                        { label: "Have you completed a care plan?", paths: ["decision.carePlanCompleted", "carePlanCompleted", "assessment_data.decision.carePlanCompleted"], type: "yesno" },
                    ],
                },
                {
                    section: "SAFETY CHECKLIST (ENTRAPMENT RISK)",
                    fields: [
                        { label: "Gap between lower bar and top of mattress?", paths: ["decision.safetyChecklist.gapBetweenRailAndMattress", "safetyChecklist.gapBetweenRailAndMattress", "assessment_data.decision.safetyChecklist.gapBetweenRailAndMattress"], type: "yesno" },
                        { label: "Does mattress compress easily at edge?", paths: ["decision.safetyChecklist.mattressCompressesEasily", "safetyChecklist.mattressCompressesEasily", "assessment_data.decision.safetyChecklist.mattressCompressesEasily"], type: "yesno" },
                        { label: "Gap greater than 60mm between rail and headboard/wall?", paths: ["decision.safetyChecklist.gapMoreThan60mm", "safetyChecklist.gapMoreThan60mm", "assessment_data.decision.safetyChecklist.gapMoreThan60mm"], type: "yesno" },
                        { label: "Is the bed rail insecure?", paths: ["decision.safetyChecklist.bedRailInsecure", "safetyChecklist.bedRailInsecure", "assessment_data.decision.safetyChecklist.bedRailInsecure"], type: "yesno" },
                        { label: "Is the bed positioned against a wall?", paths: ["decision.safetyChecklist.bedAgainstWall", "safetyChecklist.bedAgainstWall", "assessment_data.decision.safetyChecklist.bedAgainstWall"], type: "yesno" },
                        { label: "Any Safety Check Failed", paths: ["decision.anySafetyCheckFailed", "anySafetyCheckFailed", "assessment_data.decision.anySafetyCheckFailed"], type: "yesno" },
                    ],
                },
                {
                    section: "EXTENDED HEIGHT BED RAILS",
                    fields: [
                        { label: "Is the extended bed rail positioned as far to the head of the bed as possible with a gap of less than 60mm?", paths: ["decision.extendedHeightChecks.positionedCorrectly", "extendedHeightChecks.positionedCorrectly", "assessment_data.decision.extendedHeightChecks.positionedCorrectly"], type: "yesno" },
                        { label: "Is the extended height bed rail securely fastened to the integrated bed rail?", paths: ["decision.extendedHeightChecks.securelyFastened", "extendedHeightChecks.securelyFastened", "assessment_data.decision.extendedHeightChecks.securelyFastened"], type: "yesno" },
                        { label: "Are the correct bumpers installed?", paths: ["decision.extendedHeightChecks.correctBumpersInstalled", "extendedHeightChecks.correctBumpersInstalled", "assessment_data.decision.extendedHeightChecks.correctBumpersInstalled"], type: "yesno" },
                        { label: "Does the mattress come below the plimsoll line on the bumper?", paths: ["decision.extendedHeightChecks.mattressBelowPlimsollLine", "extendedHeightChecks.mattressBelowPlimsollLine", "assessment_data.decision.extendedHeightChecks.mattressBelowPlimsollLine"], type: "yesno" },
                        { label: "Have staff been trained how to attach and remove the extended bed rail?", paths: ["decision.extendedHeightChecks.staffTrained", "extendedHeightChecks.staffTrained", "assessment_data.decision.extendedHeightChecks.staffTrained"], type: "yesno" },
                        { label: "Has the bed and bed rails been checked for any signs of damage or wear and tear?", paths: ["decision.extendedHeightChecks.checkedForDamage", "extendedHeightChecks.checkedForDamage", "assessment_data.decision.extendedHeightChecks.checkedForDamage"], type: "yesno" },
                    ],
                },
                {
                    section: "GENERAL & SIGN-OFF",
                    fields: [
                        { label: "Digital Signature (Assessor)", paths: ["signatureOfAssessor", "assessment_data.signatureOfAssessor", "completed_by", "completedBy"], type: "text" },
                        { label: "Signature Date", paths: ["signatureDate", "assessment_data.signatureDate", "assessment_date", "assessmentDate"], type: "date" },
                        { label: "Version Number", paths: ["version_number", "version", "assessment_data.version_number", "assessment_data.version"], type: "text" },
                    ],
                },
            ];

            const fullWidth = pageWidth - margin * 2;

            for (const section of sectionFieldMap) {
                if (localX !== margin) { localY = maxY + 2; localX = margin; }
                localY = await addSectionTitle(section.section, localY);

                for (const field of section.fields) {
                    const rawValue = firstDefined(field.paths);
                    let renderedValue = "";

                    if (field.type === "yesno") {
                        renderedValue = toYesNo(rawValue);
                    } else if (field.type === "date") {
                        renderedValue = toDateText(rawValue);
                    } else if (field.type === "enum") {
                        renderedValue = prettifyEnum(rawValue);
                    } else {
                        renderedValue = toText(rawValue);
                    }

                    const fieldY = await addField(field.label, renderedValue, margin, localY, fullWidth);
                    maxY = Math.max(maxY, fieldY);
                    localY = fieldY + 1;
                    maxY = localY;
                }
            }

            return maxY;
        }

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
                const normalizedLabel =
                    isResidentHandlingProfileForm && key === "nStaff"
                        ? "Number of staff required"
                        : formatFieldKey(key);
                const normalizedValue =
                    isResidentHandlingProfileForm && key.toLowerCase().includes("date")
                        ? formatResidentHandlingDate(value)
                        : value;

                const fieldY = await addField(normalizedLabel, normalizedValue, localX, localY, cWidth, true);
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

    // --- Night Observation Consent Specialized Layout ---
    if (formName.toUpperCase().includes("NIGHT OBSERVATION CONSENT")) {
        const assessmentData = data.assessment_data || data;
        const colWidth = (pageWidth - margin * 2) / 2 - 5;
        const col2 = margin + (pageWidth - margin * 2) / 2;

        // Section A: Resident Information
        yPos = await addSectionTitle("Section A — Resident Information", yPos);
        const row1Y = yPos;
        const ya1 = await addField("Full Name", assessmentData.residentName || "N/A", margin, row1Y, colWidth, true);
        const ya2 = await addField("Date of Birth", assessmentData.dateOfBirth ? format(new Date(assessmentData.dateOfBirth), "dd/MM/yyyy") : "N/A", col2, row1Y, colWidth, true);
        yPos = Math.max(ya1, ya2) + 2;

        const row2Y = yPos;
        const ya3 = await addField("Resident / NHS Number", assessmentData.nhsNumber || "N/A", margin, row2Y, colWidth, true);
        const ya4 = await addField("Room Number", assessmentData.roomNumber || "N/A", col2, row2Y, colWidth, true);
        yPos = Math.max(ya3, ya4) + 2;

        yPos = await addField("Date of Admission", assessmentData.dateOfAdmission ? format(new Date(assessmentData.dateOfAdmission), "dd/MM/yyyy") : "N/A", margin, yPos, colWidth);

        // Section B: Purpose
        yPos = await addSectionTitle("Section B — Purpose of Night Observations", yPos + 4);
        const purposeText = "Night observations are carried out to ensure the safety, wellbeing, and health of residents during night hours. Observations may include visual checks, monitoring breathing, repositioning, continence care, or responding to medical needs.";
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(75, 85, 99);
        const purposeLines = doc.splitTextToSize(purposeText, pageWidth - margin * 2);
        doc.text(purposeLines, margin, yPos);
        yPos += (purposeLines.length * 5) + 6;

        // Section C: Type of Observation
        yPos = await addSectionTitle("Section C — Type of Observation Required", yPos);
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
            yPos = await addField("Other Observation Details", assessmentData.otherObservationType, margin, yPos, pageWidth - margin * 2);
        }

        // Section D: Frequency
        yPos = await addSectionTitle("Section D — Frequency of Observations", yPos + 4);
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
            yPos = await addField("Other Frequency Details", assessmentData.otherFrequency, margin, yPos, pageWidth - margin * 2);
        }

        // Section E & F: Consent & Capacity
        yPos = await addSectionTitle("Section E & F — Consent & Capacity", yPos + 4);
        const rowCEF = yPos;
        const ye1 = await addField("Resident Consented", assessmentData.residentConsented ? "Yes" : "No", margin, rowCEF, colWidth, true);
        const ye2 = await addField("Has Capacity", assessmentData.hasCapacity || "N/A", col2, rowCEF, colWidth, true);
        yPos = Math.max(ye1, ye2) + 2;

        const rowSigRC = yPos;
        const ye3 = await addField("Resident Signature", assessmentData.residentSignature || "N/A", margin, rowSigRC, colWidth, true);
        const ye4 = await addField("Consent Date", assessmentData.consentDate ? format(new Date(assessmentData.consentDate), "dd/MM/yyyy") : "N/A", col2, rowSigRC, colWidth, true);
        yPos = Math.max(ye3, ye4) + 4;

        // Section G: Legal Rep
        if (assessmentData.representativeConsulted && assessmentData.representativeConsulted !== "Not Applicable") {
            yPos = await addSectionTitle("Section G — Legal Representative / Family Involvement", yPos);
            const rowRG = yPos;
            const yg1 = await addField("Consulted", assessmentData.representativeConsulted, margin, rowRG, colWidth, true);
            const yg2 = await addField("Representative Name", assessmentData.representativeName || "N/A", col2, rowRG, colWidth, true);
            yPos = Math.max(yg1, yg2) + 2;

            const rowRG2 = yPos;
            const yg3 = await addField("Relationship", assessmentData.relationshipToResident || "N/A", margin, rowRG2, colWidth, true);
            const yg4 = await addField("Contact / Notes", assessmentData.contactDetails || "N/A", col2, rowRG2, colWidth, true);
            yPos = Math.max(yg3, yg4) + 4;
        }

        // Section H: Risks
        yPos = await addSectionTitle("Section H — Risks Explained", yPos);
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
            yPos = await addField("Other Risk Details", assessmentData.otherRisk, margin, yPos, pageWidth - margin * 2);
        }

        // Section I: Staff Declaration
        yPos = await addSectionTitle("Section I — Staff Declaration", yPos + 4);
        const rowSI = yPos;
        const yi1 = await addField("Staff Name", assessmentData.staffName || "N/A", margin, rowSI, colWidth, true);
        const yi2 = await addField("Role / Designation", assessmentData.staffRole || "N/A", col2, rowSI, colWidth, true);
        yPos = Math.max(yi1, yi2) + 2;

        const rowSI2 = yPos;
        const yi3 = await addField("Staff Signature", assessmentData.staffSignature || "N/A", margin, rowSI2, colWidth, true);
        const yi4 = await addField("Declaration Date", assessmentData.declarationDate ? format(new Date(assessmentData.declarationDate), "dd/MM/yyyy") : "N/A", col2, rowSI2, colWidth, true);
        yPos = Math.max(yi3, yi4) + 4;

        // Finalize
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(`Generated by CareO System on ${new Date().toLocaleString('en-GB')}`, margin, doc.internal.pageSize.height - 10);
        doc.save(`Night-Observation-Consent-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Pain Assessment Specialized Layout ---
    if (formName.toUpperCase().includes("PAIN ASSESSMENT")) {
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
        const toYesNo = (value: unknown): string => (value === true ? "Yes" : "No");
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

        // Header table matching form view.
        const tableTopY = yPos;
        const headerHeight = 7;
        const valueHeight = 10;
        const colWidth = fullWidth / 3;
        const residentName = toText(
            getFormField("residentName") ?? [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" ")
        );
        const roomNumber = toText(getFormField("roomNumber") ?? getFormField("bedroomNumber") ?? resident?.room_number ?? resident?.roomNumber);
        const dob = formatDateOnly(getFormField("dateOfBirth") ?? resident?.date_of_birth ?? resident?.dateOfBirth);

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        for (let i = 0; i < 3; i += 1) {
            doc.rect(margin + i * colWidth, tableTopY, colWidth, headerHeight, "FD");
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text("RESIDENTS NAME", margin + 2, tableTopY + 4.5);
        doc.text("BEDROOM NUMBER", margin + colWidth + 2, tableTopY + 4.5);
        doc.text("DATE OF BIRTH", margin + colWidth * 2 + 2, tableTopY + 4.5);

        for (let i = 0; i < 3; i += 1) {
            doc.rect(margin + i * colWidth, tableTopY + headerHeight, colWidth, valueHeight, "S");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.text(doc.splitTextToSize(residentName, colWidth - 4), margin + 2, tableTopY + headerHeight + 4.5);
        doc.text(doc.splitTextToSize(roomNumber, colWidth - 4), margin + colWidth + 2, tableTopY + headerHeight + 4.5);
        doc.text(doc.splitTextToSize(dob, colWidth - 4), margin + colWidth * 2 + 2, tableTopY + headerHeight + 4.5);
        yPos = tableTopY + headerHeight + valueHeight + 8;

        // Main title matching form.
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39);
        doc.text("PAIN ASSESSMENT RECORD", pageWidth / 2, yPos, { align: "center" });
        yPos += 6;

        // Body map rendering with highlighted regions.
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

        // Field rows matching view layout.
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

        // Signature/footer area matching form bottom grouping.
        yPos = await ensureSpace(38, yPos);
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
        const assessedDate = formatDateOnly(getFormField("assessmentDate") ?? getFormField("assessment_date") ?? data?.assessment_date);
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

    // --- Personal Profile Specialized Layout ---
    if (formName.toUpperCase().includes("PERSONAL PROFILE")) {
        const assessmentData = assessmentDataForSpecialized as Record<string, unknown>;
        const fullWidth = pageWidth - margin * 2;

        const formatPersonalProfileDate = (value: unknown): string => {
            if (value === null || value === undefined || value === "") return "N/A";
            const dateObj = value instanceof Date ? value : new Date(value as string | number);
            if (Number.isNaN(dateObj.getTime())) return "N/A";
            return format(dateObj, "dd/MM/yyyy");
        };

        const normalizePersonalProfileValue = (value: unknown): string => {
            if (typeof value === "boolean") return value ? "Yes" : "No";
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "string") return value.trim() ? value : "N/A";
            if (typeof value === "number") return String(value);
            if (value instanceof Date) return formatPersonalProfileDate(value);
            return formatValue(value);
        };

        const readPersonalProfileField = (
            key: string,
            type: "text" | "date" | "checkbox" = "text"
        ): string => {
            const rawValue = assessmentData[key];

            if (type === "checkbox") {
                // Checkboxes must always be explicit in output.
                return normalizePersonalProfileValue(rawValue ?? false);
            }

            if (type === "date") {
                return formatPersonalProfileDate(rawValue);
            }

            return normalizePersonalProfileValue(rawValue);
        };

        const personalProfileSections: Array<{
            title: string;
            fields: Array<{ label: string; key: string; type?: "text" | "date" | "checkbox" }>;
        }> = [
                {
                    title: "Resident Details",
                    fields: [
                        { label: "First Name", key: "firstName" },
                        { label: "Last Name", key: "lastName" },
                        { label: "Date of Birth", key: "dateOfBirth", type: "date" },
                        { label: "Preferred Name", key: "desiredName" }
                    ]
                },
                {
                    title: "Consent",
                    fields: [
                        { label: "Information Sharing Consent", key: "informationSharingConsent", type: "checkbox" }
                    ]
                },
                {
                    title: "Life Story",
                    fields: [
                        { label: "Birth and Growth", key: "birthAndGrowth" },
                        { label: "Parents Details", key: "parentsDetails" },
                        { label: "Siblings Details", key: "siblingsDetails" },
                        { label: "Religion / Spirituality", key: "religionSpirituality" },
                        { label: "School / Childhood", key: "schoolChildhood" },
                        { label: "Friends / Neighbours", key: "friendsNeighbours" },
                        { label: "Partner / Family Details", key: "partnerFamilyDetails" },
                        { label: "Work History", key: "workHistory" }
                    ]
                },
                {
                    title: "Personal, Health and Well-being",
                    fields: [
                        { label: "Personality", key: "personality" },
                        { label: "Hobbies / Interests", key: "hobbiesInterests" },
                        { label: "Likes", key: "likes" },
                        { label: "Dislikes", key: "dislikes" },
                        { label: "Happiest Memory", key: "happiestMemory" },
                        { label: "Enjoy Talking About", key: "enjoyTalkingAbout" },
                        { label: "Traumatic Events", key: "traumaticEvents" },
                        { label: "Usual Routine", key: "usualRoutine" },
                        { label: "Mental Health Problems", key: "mentalHealthProblems" },
                        { label: "Illness Recovery", key: "illnessRecovery" },
                        { label: "Physical Health Problems", key: "physicalHealthProblems" },
                        { label: "Feelings About Care", key: "feelingsAboutCare" },
                        { label: "Staff Difficulties", key: "staffDifficulties" },
                        { label: "Additional Comments", key: "additionalComments" }
                    ]
                },
                {
                    title: "Family / Representative",
                    fields: [
                        { label: "Family Representative Name", key: "familyRepName" },
                        { label: "Family Representative Date", key: "familyRepDate", type: "date" },
                        { label: "Family Representative Signature", key: "familyRepSignature" }
                    ]
                },
                {
                    title: "Completed By (Staff)",
                    fields: [
                        { label: "Completed By Name", key: "completedByName" },
                        { label: "Completed By Designation", key: "completedByDesignation" },
                        { label: "Completed By Date", key: "completedByDate", type: "date" },
                        { label: "Completed By Signature", key: "completedBySignature" },
                        { label: "Assessment Date", key: "assessmentDate", type: "date" }
                    ]
                }
            ];

        for (const section of personalProfileSections) {
            yPos = await addSectionTitle(section.title, yPos);
            for (const field of section.fields) {
                yPos = await addField(
                    field.label,
                    readPersonalProfileField(field.key, field.type ?? "text"),
                    margin,
                    yPos,
                    fullWidth
                );
            }
        }

        doc.save(`Personal-Profile-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- PEEP (Personal Emergency Evacuation Plan) Specialized Layout ---
    if (formName.toUpperCase().includes("PEEP")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawPEEPHeader = async () => {
            await drawHeader("PEEP");
        };

        const ensurePEEPSpace = async (heightNeeded: number, currentY: number) => {
            if (currentY + heightNeeded > 280) {
                doc.addPage();
                await drawPEEPHeader();
                return 30;
            }
            return currentY;
        };

        let yPos = 30;
        await drawPEEPHeader();

        const cpWidth = (pageWidth - margin * 2) / 2 - 5;
        const cpCol2 = margin + (pageWidth - margin * 2) / 2;
        const addPEEPSectionAField = (label: string, value: unknown, x: number, y: number, width: number) => {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(107, 114, 128);
            doc.text(label.toUpperCase(), x, y);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(17, 24, 39);
            const splitValue = doc.splitTextToSize(formatValue(value), width);
            doc.text(splitValue, x, y + 6);
            return y + 6 + (splitValue.length * 5);
        };

        // Section A: Resident & Facility Details
        yPos = await addSectionTitle("SECTION A: RESIDENT & FACILITY DETAILS", yPos);
        yPos = await ensurePEEPSpace(40, yPos);
        // Use strict row-based placement so fields never overlap between lines when printed.
        const rowResY = yPos;
        const dobVal = assessmentData.residentDateOfBirth || (resident ? resident.date_of_birth : "");
        const generatedDate = format(new Date(), "dd/MM/yyyy");

        const row1Left = addPEEPSectionAField(
            "Resident Name",
            assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"),
            margin,
            rowResY,
            cpWidth
        );
        const row1Right = addPEEPSectionAField(
            "Care Home Name",
            assessmentData.facilityName || careHomeName || "N/A",
            cpCol2,
            rowResY,
            cpWidth
        );
        yPos = Math.max(row1Left, row1Right) + 3;

        const row2Left = addPEEPSectionAField(
            "Date of Birth",
            dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A",
            margin,
            yPos,
            cpWidth
        );
        const row2Right = addPEEPSectionAField(
            "Bedroom Number",
            assessmentData.bedroomNumber || (resident ? resident.room_number : "N/A"),
            cpCol2,
            yPos,
            cpWidth
        );
        yPos = Math.max(row2Left, row2Right) + 3;

        const row3Left = addPEEPSectionAField("Unit", assessmentData.unit || "N/A", margin, yPos, cpWidth);
        const row3Right = addPEEPSectionAField("Date Generated", generatedDate, cpCol2, yPos, cpWidth);
        yPos = Math.max(row3Left, row3Right);

        // Section B: Awareness of Procedure
        yPos = await addSectionTitle("SECTION B: AWARENESS OF PROCEDURE", yPos + 2);
        const informedBy = assessmentData.informedBy || {};
        yPos = await addField("Alarm System", informedBy.alarmSystem ?? "N/A", margin, yPos, cpWidth);
        yPos = await addField("Visual Alarm", informedBy.visualAlarm ?? "N/A", margin, yPos, cpWidth);
        yPos = await addField("Pager Device / Vibrating Pad", informedBy.pagerDevice ?? "N/A", margin, yPos, cpWidth);
        yPos = await addField("Other Informed Method", informedBy.other ?? "N/A", margin, yPos, cpWidth);
        if (informedBy.otherDetails || informedBy.other) {
            yPos = await addField("Other Details", informedBy.otherDetails || "N/A", margin, yPos, pageWidth - margin * 2);
        }

        // Section C: Assistance & Equipment
        yPos = await addSectionTitle("SECTION C: ASSISTANCE & EQUIPMENT", yPos + 2);
        yPos = await addField("Designated Assistance", assessmentData.designatedAssistance || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Equipment Required", assessmentData.equipmentRequired || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section D: Personalised Evacuation Procedure
        yPos = await addSectionTitle("SECTION D: PERSONALISED EVACUATION PROCEDURE", yPos + 2);
        if (assessmentData.steps && Array.isArray(assessmentData.steps) && assessmentData.steps.length > 0) {
            for (const step of assessmentData.steps) {
                yPos = await addField(step.name || "Step", step.description || "N/A", margin, yPos, pageWidth - margin * 2);
                yPos += 2;
            }
        } else {
            yPos = await addField("Step Details", "N/A", margin, yPos, pageWidth - margin * 2);
        }

        // Section E: Fire Hazards in Area / Room
        yPos = await addSectionTitle("SECTION E: FIRE HAZARDS IN AREA / ROOM", yPos + 2);
        const hazards = assessmentData.hazards || {};
        yPos = await addField("Oxygen Cylinders in use", hazards.oxygenCylinders ?? "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Soft Furnishings are Fire Retardant", hazards.furnishingsFireRetardant ?? "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField("Does the person smoke?", hazards.doesPersonSmoke ?? "N/A", margin, yPos, pageWidth - margin * 2);

        // Section F: Monitoring and Review / Signatures
        yPos = await addSectionTitle("SECTION F: MONITORING AND REVIEW / SIGNATURES", yPos + 2);
        yPos = await ensurePEEPSpace(40, yPos);
        const rowSignY = yPos;
        
        let ySign1 = await addField("Manager Signature", assessmentData.managerSignature || "N/A", margin, rowSignY, cpWidth, true);
        ySign1 = await addField("Date (Manager)", assessmentData.managerSignatureDate ? format(new Date(assessmentData.managerSignatureDate), "dd/MM/yyyy") : "N/A", margin, ySign1 + 1, cpWidth, true);

        let ySign2 = await addField("Person in Care Signature", assessmentData.personInCareSignature || "N/A", cpCol2, rowSignY, cpWidth, true);
        ySign2 = await addField("Date (Person)", assessmentData.personInCareSignatureDate ? format(new Date(assessmentData.personInCareSignatureDate), "dd/MM/yyyy") : "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        
        yPos = Math.max(ySign1, ySign2);

        doc.save(`PEEP-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Moving & Handling Specialized Layout ---
    if (formName.toUpperCase().includes("MOVING") && formName.toUpperCase().includes("HANDLING")) {
        const rawData = data as Record<string, unknown>;
        const source = assessmentDataForSpecialized as Record<string, unknown>;
        const sourceAssessment = (source.assessment_data ?? {}) as Record<string, unknown>;
        const rawAssessment = (rawData.assessment_data ?? {}) as Record<string, unknown>;

        const mobility = (
            source.mobility_assessment ??
            sourceAssessment.mobility_assessment ??
            rawData.mobility_assessment ??
            rawAssessment.mobility_assessment ??
            {}
        ) as Record<string, unknown>;

        const risk = (
            source.risk_factors ??
            source.riskFactors ??
            sourceAssessment.risk_factors ??
            sourceAssessment.riskFactors ??
            rawData.risk_factors ??
            rawData.riskFactors ??
            rawAssessment.risk_factors ??
            rawAssessment.riskFactors ??
            {}
        ) as Record<string, unknown>;

        const assessmentData: Record<string, unknown> = {
            ...rawData,
            ...source,
            ...rawAssessment,
            ...sourceAssessment,
            ...mobility,
            ...risk,
            equipmentUsed:
                source.equipmentUsed ??
                source.equipment_needed ??
                rawData.equipmentUsed ??
                rawData.equipment_needed,
            completedBy:
                source.completedBy ??
                source.completed_by ??
                rawData.completedBy ??
                rawData.completed_by,
            jobRole:
                source.jobRole ??
                source.job_role ??
                source.role ??
                risk.jobRole ??
                risk.job_role ??
                rawData.jobRole ??
                rawData.job_role,
            signature:
                source.signature ??
                source.staffSignature ??
                source.staff_signature ??
                risk.signature ??
                risk.staffSignature ??
                risk.staff_signature ??
                source.completedBy ??
                source.completed_by,
            assessmentDate:
                source.assessmentDate ??
                source.assessment_date ??
                source.completionDate ??
                source.completion_date ??
                rawData.assessmentDate ??
                rawData.assessment_date
        };
        const fullWidth = pageWidth - margin * 2;

        const display = (value: unknown): string => {
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "string") return value.trim() ? value : "N/A";
            return String(value);
        };

        const displayDate = (value: unknown): string => {
            if (!value) return "N/A";
            const parsed = new Date(value as string | number | Date);
            return Number.isNaN(parsed.getTime()) ? "N/A" : format(parsed, "dd/MM/yyyy");
        };

        const yesNo = (value: unknown): string => {
            if (value === true) return "Yes";
            if (value === false) return "No";
            if (typeof value === "number") return value === 1 ? "Yes" : "No";
            if (typeof value === "string") {
                const normalized = value.trim().toLowerCase();
                return normalized === "true" || normalized === "yes" || normalized === "1" ? "Yes" : "No";
            }
            return "No";
        };

        const enumDisplay = (value: unknown): string => {
            const text = display(value);
            if (text === "N/A") return text;
            return text.replace(/-/g, " ").replace(/_/g, " ").toUpperCase();
        };

        // Override field renderer for this form only to prevent text overlap.
        const addField = async (label: string, value: unknown, x: number, y: number, width: number) => {
            const displayValue = display(value);
            const splitValue = doc.splitTextToSize(displayValue, width);
            const lineHeight = 4.8;
            const neededHeight = 8 + (splitValue.length * lineHeight) + 2;

            y = await ensureSpace(neededHeight, y);

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(107, 114, 128);
            doc.text(label.toUpperCase(), x, y);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(17, 24, 39);
            doc.text(splitValue, x, y + 5);

            return y + 6 + (splitValue.length * lineHeight);
        };

        const addSubsectionTitle = async (title: string, y: number) => {
            if (y + 14 > 280) {
                doc.addPage();
                await drawHeader(formName);
                y = 30;
            }
            doc.setFillColor(219, 234, 254);
            doc.rect(margin, y, fullWidth, 8, "F");
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 58, 138);
            doc.text(title.toUpperCase(), margin + 2, y + 5.5);
            return y + 10;
        };

        yPos = 30;
        await drawHeader(formName);

        yPos = await addSectionTitle("SECTION 1 - RESIDENT INFORMATION", yPos);
        yPos = await addField("Resident Name", display(assessmentData.residentName || `${resident?.first_name || ""} ${resident?.last_name || ""}`.trim()), margin, yPos, fullWidth);
        yPos = await addField("Date of Birth", displayDate(assessmentData.dateOfBirth || resident?.date_of_birth), margin, yPos, fullWidth);
        yPos = await addField("Bedroom Number", display(assessmentData.bedroomNumber || resident?.room_number), margin, yPos, fullWidth);
        yPos = await addField("Weight (kg)", display(assessmentData.weight), margin, yPos, fullWidth);
        yPos = await addField("Height (cm)", display(assessmentData.height), margin, yPos, fullWidth);
        yPos = await addField("History of Falls", yesNo(assessmentData.historyOfFalls), margin, yPos, fullWidth);

        yPos = await addSectionTitle("SECTION 2 - MOBILITY ASSESSMENT", yPos + 2);
        yPos = await addField("Independent Mobility", yesNo(assessmentData.independentMobility), margin, yPos, fullWidth);
        yPos = await addField("Weight Bearing Capacity", enumDisplay(assessmentData.canWeightBear), margin, yPos, fullWidth);
        yPos = await addField("Limb Mobility - Upper Right", enumDisplay(assessmentData.limbUpperRight), margin, yPos, fullWidth);
        yPos = await addField("Limb Mobility - Upper Left", enumDisplay(assessmentData.limbUpperLeft), margin, yPos, fullWidth);
        yPos = await addField("Limb Mobility - Lower Right", enumDisplay(assessmentData.limbLowerRight), margin, yPos, fullWidth);
        yPos = await addField("Limb Mobility - Lower Left", enumDisplay(assessmentData.limbLowerLeft), margin, yPos, fullWidth);
        yPos = await addField("Equipment Needed", display(assessmentData.equipmentUsed), margin, yPos, fullWidth);
        yPos = await addField("Details of Support/Staff Required", display(assessmentData.needsRiskStaff), margin, yPos, fullWidth);

        yPos = await addSectionTitle("SECTION 3 - RISK FACTORS", yPos + 2);

        yPos = await addSubsectionTitle("Sensory & Behavioral", yPos);
        yPos = await addField("Deafness State", enumDisplay(assessmentData.deafnessState), margin, yPos, fullWidth);
        yPos = await addField("Deafness Comments", display(assessmentData.deafnessComments), margin, yPos, fullWidth);
        yPos = await addField("Blindness State", enumDisplay(assessmentData.blindnessState), margin, yPos, fullWidth);
        yPos = await addField("Blindness Comments", display(assessmentData.blindnessComments), margin, yPos, fullWidth);
        yPos = await addField("Unpredictable Behaviour State", enumDisplay(assessmentData.unpredictableBehaviourState), margin, yPos, fullWidth);
        yPos = await addField("Unpredictable Behaviour Comments", display(assessmentData.unpredictableBehaviourComments), margin, yPos, fullWidth);
        yPos = await addField("Uncooperative Behaviour State", enumDisplay(assessmentData.uncooperativeBehaviourState), margin, yPos, fullWidth);
        yPos = await addField("Uncooperative Behaviour Comments", display(assessmentData.uncooperativeBehaviourComments), margin, yPos, fullWidth);

        yPos = await addSubsectionTitle("Cognitive & Emotional", yPos + 1);
        yPos = await addField("Distressed Reaction State", enumDisplay(assessmentData.distressedReactionState), margin, yPos, fullWidth);
        yPos = await addField("Distressed Reaction Comments", display(assessmentData.distressedReactionComments), margin, yPos, fullWidth);
        yPos = await addField("Disorientated State", enumDisplay(assessmentData.disorientatedState), margin, yPos, fullWidth);
        yPos = await addField("Disorientated Comments", display(assessmentData.disorientatedComments), margin, yPos, fullWidth);
        yPos = await addField("Unconscious State", enumDisplay(assessmentData.unconsciousState), margin, yPos, fullWidth);
        yPos = await addField("Unconscious Comments", display(assessmentData.unconsciousComments), margin, yPos, fullWidth);
        yPos = await addField("Unbalance State", enumDisplay(assessmentData.unbalanceState), margin, yPos, fullWidth);
        yPos = await addField("Unbalance Comments", display(assessmentData.unbalanceComments), margin, yPos, fullWidth);

        yPos = await addSubsectionTitle("Physical & Other", yPos + 1);
        yPos = await addField("Spasms State", enumDisplay(assessmentData.spasmsState), margin, yPos, fullWidth);
        yPos = await addField("Spasms Comments", display(assessmentData.spasmsComments), margin, yPos, fullWidth);
        yPos = await addField("Stiffness State", enumDisplay(assessmentData.stiffnessState), margin, yPos, fullWidth);
        yPos = await addField("Stiffness Comments", display(assessmentData.stiffnessComments), margin, yPos, fullWidth);
        yPos = await addField("Catheters State", enumDisplay(assessmentData.cathetersState), margin, yPos, fullWidth);
        yPos = await addField("Catheters Comments", display(assessmentData.cathetersComments), margin, yPos, fullWidth);
        yPos = await addField("Incontinence State", enumDisplay(assessmentData.incontinenceState), margin, yPos, fullWidth);
        yPos = await addField("Incontinence Comments", display(assessmentData.incontinenceComments), margin, yPos, fullWidth);
        yPos = await addField("Localised Pain State", enumDisplay(assessmentData.localisedPain), margin, yPos, fullWidth);
        yPos = await addField("Localised Pain Comments", display(assessmentData.localisedPainComments), margin, yPos, fullWidth);
        yPos = await addField("Other Risk Factors State", enumDisplay(assessmentData.otherState), margin, yPos, fullWidth);
        yPos = await addField("Other Risk Factors Comments", display(assessmentData.otherComments), margin, yPos, fullWidth);

        yPos = await addSectionTitle("SECTION 4 - COMPLETION", yPos + 2);
        yPos = await addField("Completed By", display(assessmentData.completedBy), margin, yPos, fullWidth);
        yPos = await addField("Job Role", display(assessmentData.jobRole), margin, yPos, fullWidth);
        yPos = await addField("Signature", display(assessmentData.signature), margin, yPos, fullWidth);
        yPos = await addField("Assessment Date", displayDate(assessmentData.assessmentDate), margin, yPos, fullWidth);

        doc.save(`Moving-Handling-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Nutrition Assessment + Monthly Review Specialized Layout ---
    if (isNutritionAssessmentForm) {
        const source = data as Record<string, unknown>;
        const nested = (source.assessment_data ?? {}) as Record<string, unknown>;
        const details = (source.assessment_details ?? nested.assessment_details ?? {}) as Record<string, unknown>;
        const foodConsistency = (source.food_consistency ?? nested.food_consistency ?? source.foodConsistency ?? {}) as Record<string, unknown>;
        const fluidConsistency = (source.fluid_consistency ?? nested.fluid_consistency ?? source.fluidConsistency ?? {}) as Record<string, unknown>;
        const monthly = (details.monthlyEvaluations ?? source.monthlyEvaluations ?? []) as unknown[];

        const fullWidth = pageWidth - margin * 2;
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

        yPos = 30;
        await drawHeader(formName);

        yPos = await addSectionTitle("Resident Information", yPos);
        yPos = await addField("Resident Name", source.residentName ?? nested.residentName ?? `${resident?.first_name || ""} ${resident?.last_name || ""}`.trim(), margin, yPos, fullWidth);
        yPos = await addField("Date of Birth", source.dateOfBirth ?? nested.dateOfBirth ?? resident?.date_of_birth, margin, yPos, fullWidth);
        yPos = await addField("Bedroom Number", source.bedroomNumber ?? nested.bedroomNumber ?? resident?.room_number, margin, yPos, fullWidth);
        yPos = await addField("Assessment Date", displayDate(source.assessment_date ?? nested.assessment_date ?? source.assessmentDate ?? nested.assessmentDate), margin, yPos, fullWidth);
        yPos = await addField("Height", details.height ?? source.height ?? nested.height, margin, yPos, fullWidth);
        yPos = await addField("Weight", details.weight ?? source.weight ?? nested.weight, margin, yPos, fullWidth);
        yPos = await addField("Current MUST Score", source.must_score ?? source.mustScore ?? nested.must_score ?? nested.mustScore, margin, yPos, fullWidth);

        yPos = await addSectionTitle("Clinical Involvement", yPos + 2);
        yPos = await addField("SALT Involvement", yesNo(details.hasSaltInvolvement ?? source.hasSaltInvolvement ?? nested.hasSaltInvolvement), margin, yPos, fullWidth);
        yPos = await addField("SALT Therapist Name", details.saltTherapistName ?? source.saltTherapistName ?? nested.saltTherapistName, margin, yPos, fullWidth);
        yPos = await addField("SALT Contact Details", details.saltContactDetails ?? source.saltContactDetails ?? nested.saltContactDetails, margin, yPos, fullWidth);
        yPos = await addField("Dietitian Involvement", yesNo(details.hasDietitianInvolvement ?? source.hasDietitianInvolvement ?? nested.hasDietitianInvolvement), margin, yPos, fullWidth);
        yPos = await addField("Dietitian Name", details.dietitianName ?? source.dietitianName ?? nested.dietitianName, margin, yPos, fullWidth);
        yPos = await addField("Dietitian Contact Details", details.dietitianContactDetails ?? source.dietitianContactDetails ?? nested.dietitianContactDetails, margin, yPos, fullWidth);

        yPos = await addSectionTitle("Dietary Requirements", yPos + 2);
        yPos = await addField("Food Fortification Required", details.foodFortificationRequired ?? source.foodFortificationRequired ?? nested.foodFortificationRequired, margin, yPos, fullWidth);
        yPos = await addField("Supplements Prescribed", details.supplementsPrescribed ?? source.supplementsPrescribed ?? nested.supplementsPrescribed, margin, yPos, fullWidth);
        yPos = await addField("Assistance Required", details.assistanceRequired ?? source.assistanceRequired ?? nested.assistanceRequired, margin, yPos, fullWidth);

        yPos = await addSectionTitle("IDDSI Food Consistency", yPos + 2);
        for (const key of ["level7EasyChew", "level6SoftBiteSized", "level5MincedMoist", "level4Pureed", "level3Liquidised"]) {
            yPos = await addField(labelFromKey(key), yesNo(foodConsistency[key]), margin, yPos, fullWidth);
        }

        yPos = await addSectionTitle("IDDSI Fluid Consistency", yPos + 2);
        for (const key of ["level4ExtremelyThick", "level3ModeratelyThick", "level2MildlyThick", "level1SlightlyThick", "level0Thin"]) {
            yPos = await addField(labelFromKey(key), yesNo(fluidConsistency[key]), margin, yPos, fullWidth);
        }

        yPos = await addSectionTitle("Assessment Completion", yPos + 2);
        yPos = await addField("Completed By", source.completed_by ?? source.completedBy ?? nested.completed_by ?? nested.completedBy, margin, yPos, fullWidth);
        yPos = await addField("Job Role", details.jobRole ?? source.jobRole ?? nested.jobRole, margin, yPos, fullWidth);
        yPos = await addField("Signature", details.signature ?? source.signature ?? nested.signature, margin, yPos, fullWidth);

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
            yPos = await addSectionTitle("Monthly Review", yPos + 2);
            for (let i = 0; i < monthly.length; i += 1) {
                const review = (monthly[i] ?? {}) as Record<string, unknown>;
                yPos = await addSectionTitle(`Review ${i + 1}`, yPos + 1);
                yPos = await addField("Review Date", displayDate(review.date), margin, yPos, fullWidth);
                yPos = await addField("Completed By", display(review.completedBy), margin, yPos, fullWidth);
                for (const key of monthlyQuestions) {
                    yPos = await addField(labelFromKey(key), yesNo(review[key]), margin, yPos, fullWidth);
                    yPos = await addField(`${labelFromKey(key)} Notes`, display(review[`${key}Notes`]), margin, yPos, fullWidth);
                }
            }
        }

        doc.save(`Nutrition-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    const isBedrailConsentForm =
        formName.toUpperCase().includes("BEDRAIL CONSENT") ||
        formName.toUpperCase().includes("BEDRAILS CONSENT") ||
        formName.toUpperCase().includes("BEDRAIL CONSENT / AGREEMENT") ||
        formName.toUpperCase().includes("BEDRAILS CONSENT / AGREEMENT");
    const isRestraintsConsentForm = formName.toUpperCase().includes("CONSENT AND RISK ASSESSMENT FOR RESTRAINTS");
    if (!isRestraintsConsentForm && !isBedrailConsentForm) {
        yPos = await renderData(data, yPos, margin);
    }

    // Specialized fixed-field layout for Bedrail Consent / Agreement
    if (isBedrailConsentForm) {
        type ConsentType = "ABLE_TO_CONSENT" | "UNABLE_TO_CONSENT";
        type ConsentChoice = "CONSENT_TO_USE" | "REFUSE_TO_USE";
        type ResidentPreference = "WOULD_PREFER_USE" | "WOULD_NOT_PREFER_USE";

        interface BedrailAbleSection {
            consentChoice?: ConsentChoice;
            residentSignature?: string;
            staffMemberName?: string;
            staffMemberSignature?: string;
            staffSignatureDate?: string;
        }

        interface BedrailUnableSection {
            representativeName?: string;
            discussionAcknowledged?: boolean;
            residentPreference?: ResidentPreference;
            representativeSignature?: string;
            staffMemberName?: string;
            staffMemberSignature?: string;
            staffSignatureDate?: string;
        }

        interface BedrailAssessmentData {
            residentName?: string;
            bedroomNumber?: string;
            dateOfBirth?: string | number;
            assessment_date?: string | number;
            consentType?: ConsentType;
            ableToConsentSection?: BedrailAbleSection;
            unableToConsentSection?: BedrailUnableSection;
            assessment_data?: BedrailAssessmentData;
        }

        const source = data as BedrailAssessmentData;
        const assessmentData: BedrailAssessmentData = source.assessment_data || source;
        const fullWidth = pageWidth - margin * 2;
        const display = (value: unknown): string => {
            if (value === null || value === undefined) return "Not provided";
            if (typeof value === "string") return value.trim() ? value : "Not provided";
            if (typeof value === "number") return String(value);
            return String(value);
        };
        const displayDateValue = (value: unknown): string => {
            if (value === null || value === undefined || value === "") return "Not provided";
            try {
                const date = new Date(value as string | number);
                if (Number.isNaN(date.getTime())) return display(value);
                return format(date, "dd/MM/yyyy");
            } catch {
                return display(value);
            }
        };
        const yesNo = (value: boolean): string => (value ? "Yes" : "No");

        const consentType = assessmentData.consentType;
        const able = assessmentData.ableToConsentSection || {};
        const unable = assessmentData.unableToConsentSection || {};

        yPos = await addSectionTitle("Form Overview", yPos + 2);
        yPos = await addField("Resident Name", display(assessmentData.residentName), margin, yPos, fullWidth);
        yPos = await addField("Bedroom Number", display(assessmentData.bedroomNumber), margin, yPos, fullWidth);
        yPos = await addField("Date of Birth", displayDateValue(assessmentData.dateOfBirth), margin, yPos, fullWidth);
        yPos = await addField("Consent Type", display(consentType), margin, yPos, fullWidth);

        if (consentType === "ABLE_TO_CONSENT") {
            yPos = await addSectionTitle("Able To Consent Section", yPos + 2);
            yPos = await addField(
                "Consent Statement",
                "I understand that I may be at risk of falling out of bed and would therefore like bed rails/bumpers to be used on my bed.",
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                "Consent To Use Bedrails (checkbox)",
                yesNo(able.consentChoice === "CONSENT_TO_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                "Refusal Statement",
                "I understand that I may be at risk of falling out of bed, but I do NOT want bed rails or bumpers to be used on my bed.",
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                "Refuse To Use Bedrails (checkbox)",
                yesNo(able.consentChoice === "REFUSE_TO_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField("Resident Signature", display(able.residentSignature), margin, yPos, fullWidth);
            yPos = await addField("Staff Member Name", display(able.staffMemberName), margin, yPos, fullWidth);
            yPos = await addField("Staff Member Signature", display(able.staffMemberSignature), margin, yPos, fullWidth);
            yPos = await addField("Staff Signature Date", displayDateValue(able.staffSignatureDate), margin, yPos, fullWidth);
        } else if (consentType === "UNABLE_TO_CONSENT") {
            yPos = await addSectionTitle("Unable To Consent Section", yPos + 2);
            yPos = await addField("Representative Name", display(unable.representativeName), margin, yPos, fullWidth);
            yPos = await addField(
                "Discussion Statement",
                "I have discussed the issue of using bed rails/bumpers with the professionals concerned and based on my knowledge of the resident's previously expressed wishes and beliefs:",
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                "Discussion Acknowledged (checkbox)",
                yesNo(unable.discussionAcknowledged === true),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                "Resident would have preferred to use bed rails/bumpers (checkbox)",
                yesNo(unable.residentPreference === "WOULD_PREFER_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                "Resident would not have preferred to use bed rails/bumpers (checkbox)",
                yesNo(unable.residentPreference === "WOULD_NOT_PREFER_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField("Representative Signature", display(unable.representativeSignature), margin, yPos, fullWidth);
            yPos = await addField("Staff Member Name", display(unable.staffMemberName), margin, yPos, fullWidth);
            yPos = await addField("Staff Member Signature", display(unable.staffMemberSignature), margin, yPos, fullWidth);
            yPos = await addField("Staff Signature Date", displayDateValue(unable.staffSignatureDate), margin, yPos, fullWidth);
        }
    }

    // Specialized fixed-field layout for Consent and Risk Assessment for Restraints
    if (isRestraintsConsentForm) {
        const assessmentData = data.assessment_data || data;
        const selectedRestraints: string[] = Array.isArray(assessmentData.selectedRestraints)
            ? assessmentData.selectedRestraints
            : [];
        const consentType = assessmentData.consentType;
        const ableToConsent = assessmentData.ableToConsent || {};
        const discussionWithRelative = assessmentData.discussionWithRelative || {};
        const fullWidth = pageWidth - margin * 2;
        const cpWidth = (pageWidth - margin * 2) / 2 - 5;

        const toDisplay = (value: unknown): string => {
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "string") return value.trim() ? value : "N/A";
            return String(value);
        };
        const yesNo = (condition: boolean): string => condition ? "Yes" : "No";

        const restraintOptions = [
            "Wheelchair lap belt",
            "Specialised chair with no lap belt",
            "Specialised chair with lap belt",
            "Alarm mat",
            "Crash mat",
            "Bed rails",
            "Door alarms",
            "Chemical restraint"
        ];

        yPos = await addSectionTitle("Type of Restraint considered/required", yPos + 2);
        for (const option of restraintOptions) {
            yPos = await addField(option, yesNo(selectedRestraints.includes(option)), margin, yPos, fullWidth);
        }

        yPos = await addSectionTitle("Consent Status", yPos + 2);
        yPos = await addField("Resident is able to consent", yesNo(consentType === "ABLE_TO_CONSENT"), margin, yPos, fullWidth);
        yPos = await addField("Resident is unable to consent (Relative/Staff Discussion)", yesNo(consentType === "UNABLE_TO_CONSENT"), margin, yPos, fullWidth);

        yPos = await addSectionTitle("Persons who are able to Consent", yPos + 2);
        yPos = await addField("Name", toDisplay(ableToConsent.name), margin, yPos, fullWidth);
        yPos = await addField("Risk Of", toDisplay(ableToConsent.riskOf), margin, yPos, fullWidth);
        yPos = await addField("I prefer that restraint is used", yesNo(ableToConsent.preference === "PREFER_USE"), margin, yPos, fullWidth);
        yPos = await addField("I do not want any form of restraint used", yesNo(ableToConsent.preference === "DO_NOT_WANT_USE"), margin, yPos, fullWidth);
        const ableSigRowY = yPos;
        const ableSigY1 = await addField("Signature Of Person", toDisplay(ableToConsent.personSignature), margin, ableSigRowY, cpWidth, true);
        const ableSigY2 = await addField("Date", toDisplay(ableToConsent.personSignatureDate), col2, ableSigRowY, cpWidth, true);
        yPos = Math.max(ableSigY1, ableSigY2) + 2;
        const ableMemberRowY = yPos;
        const ableMemberY1 = await addField("Signature Of Member", toDisplay(ableToConsent.memberSignature), margin, ableMemberRowY, cpWidth, true);
        const ableMemberY2 = await addField("Date", toDisplay(ableToConsent.memberSignatureDate), col2, ableMemberRowY, cpWidth, true);
        yPos = Math.max(ableMemberY1, ableMemberY2) + 2;

        yPos = await addSectionTitle("Discussion with Relative (NOK)", yPos + 2);
        yPos = await addField("Relative Name", toDisplay(discussionWithRelative.relativeName), margin, yPos, fullWidth);
        yPos = await addField("Issue Of", toDisplay(discussionWithRelative.issueOf), margin, yPos, fullWidth);
        yPos = await addField("Resident Name", toDisplay(discussionWithRelative.residentName), margin, yPos, fullWidth);
        yPos = await addField("Would have preferred", yesNo(discussionWithRelative.preference === "WOULD_HAVE_PREFERRED"), margin, yPos, fullWidth);
        yPos = await addField("Would not have preferred", yesNo(discussionWithRelative.preference === "WOULD_NOT_HAVE_PREFERRED"), margin, yPos, fullWidth);
        yPos = await addField("Restraint Used", toDisplay(discussionWithRelative.restraintUsed), margin, yPos, fullWidth);
        const relSigRowY = yPos;
        const relSigY1 = await addField("Signature Of Person", toDisplay(discussionWithRelative.personSignature), margin, relSigRowY, cpWidth, true);
        const relSigY2 = await addField("Date", toDisplay(discussionWithRelative.personSignatureDate), col2, relSigRowY, cpWidth, true);
        yPos = Math.max(relSigY1, relSigY2) + 2;
        const relMemberRowY = yPos;
        const relMemberY1 = await addField("Signature Of Member", toDisplay(discussionWithRelative.memberSignature), margin, relMemberRowY, cpWidth, true);
        const relMemberY2 = await addField("Date", toDisplay(discussionWithRelative.memberSignatureDate), col2, relMemberRowY, cpWidth, true);
        yPos = Math.max(relMemberY1, relMemberY2) + 2;

        yPos = await addSectionTitle("System Fields", yPos + 2);
        const systemRowY = yPos;
        const systemY1 = await addField("Assessment Date", toDisplay(assessmentData.assessmentDate), margin, systemRowY, cpWidth, true);
        const systemY2 = await addField("Completed By", toDisplay(assessmentData.completedBy || data.completed_by), col2, systemRowY, cpWidth, true);
        yPos = Math.max(systemY1, systemY2) + 2;
        yPos = await addField("Status", toDisplay(assessmentData.status), margin, yPos, fullWidth);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated by CareO System on ${new Date().toLocaleString('en-GB')}`, margin, doc.internal.pageSize.height - 10);

    const safeFormName = toSafeFilePart(formName);
    const safeResidentName = toSafeFilePart(resident?.last_name || "Resident");
    doc.save(`${safeFormName}-${safeResidentName}-${new Date().getTime()}.pdf`);
};
