import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { loadImage, GenerateCareFilePDFOptions } from "./helpers";

export const generateIncidentPDF = async (options: GenerateCareFilePDFOptions) => {
    const { formName, data, resident } = options;
    const doc = new jsPDF({
        orientation: "portrait",
    });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

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
                    { content: val(data.keyWorkerNameDesignation), styles: { cellWidth: 50 } }, 
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
};
