import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GeneratePassportPDFOptions {
    passport: any;
    resident: any;
    orgLogoUrl?: string;
}

export const generatePassportPDF = async ({
    passport,
    resident,
    orgLogoUrl
}: GeneratePassportPDFOptions) => {
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

    // --- Header ---
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Green bottom border line
    doc.setFillColor(34, 197, 94); // #22c55e green
    doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');

    // Title
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("HOSPITAL PASSPORT", margin, 14);

    // Org Logo
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

    let yPos = 30;

    const addSectionTitle = (title: string, y: number) => {
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + 8);
        doc.setTextColor(30, 64, 175);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 4, y + 5.5);
        doc.setTextColor(0, 0, 0);
        return y + 12;
    };

    const addField = (label: string, value: string, x: number, y: number, width: number) => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(label.toUpperCase(), x, y);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        const splitValue = doc.splitTextToSize(String(value || "N/A"), width);
        doc.text(splitValue, x, y + 5);
        return y + 5 + (splitValue.length * 5);
    };

    const formatDateUK = (date: any) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString('en-GB');
    };

    const formatDateTimeUK = (date: any) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleString('en-GB');
    };

    // 1. General & Transfer Details
    yPos = addSectionTitle("1. GENERAL & TRANSFER DETAILS", yPos);
    const col2 = margin + (pageWidth - margin * 2) / 2;
    const colWidth = (pageWidth - margin * 2) / 2 - 5;

    let y1 = addField("Full Name", passport.generalDetails.personName, margin, yPos, colWidth);
    y1 = addField("Known As", passport.generalDetails.knownAs, margin, y1, colWidth);
    y1 = addField("Date of Birth", formatDateUK(passport.generalDetails.dateOfBirth), margin, y1, colWidth);

    let y2 = addField("NHS Number", passport.generalDetails.nhsNumber, col2, yPos, colWidth);
    y2 = addField("Care Type", passport.generalDetails.careType, col2, y2, colWidth);
    y2 = addField("Transfer Time", formatDateTimeUK(passport.generalDetails.transferDateTime), col2, y2, colWidth);

    yPos = Math.max(y1, y2) + 5;

    // 2. Contact & Clinical Partners
    yPos = addSectionTitle("2. CONTACT & CLINICAL PARTNERS", yPos);
    autoTable(doc, {
        startY: yPos,
        head: [['Care Home', 'Hospital/Destination', 'Next of Kin']],
        body: [[
            `${passport.generalDetails.careHomeName}\n${passport.generalDetails.careHomePhone}`,
            `${passport.generalDetails.hospitalName}\n${passport.generalDetails.hospitalPhone}`,
            `${passport.generalDetails.nextOfKinName}\n${passport.generalDetails.nextOfKinPhone}`
        ]],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [249, 250, 251], textColor: [31, 41, 55], fontStyle: 'bold' }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // 3. Medical Needs & SBAR Assessment
    yPos = addSectionTitle("3. MEDICAL NEEDS & SBAR ASSESSMENT", yPos);
    yPos = addField("Situation", passport.medicalCareNeeds.situation, margin, yPos, pageWidth - margin * 2);
    yPos = addField("Background", passport.medicalCareNeeds.background, margin, yPos, pageWidth - margin * 2);
    yPos = addField("Assessment", passport.medicalCareNeeds.assessment, margin, yPos, pageWidth - margin * 2);
    yPos = addField("Recommendation", passport.medicalCareNeeds.recommendations, margin, yPos, pageWidth - margin * 2);

    // 4. Core Care Needs
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    yPos = addSectionTitle("4. CORE CARE NEEDS", yPos);
    const tableData = [
        ["Mobility", `${passport.medicalCareNeeds.mobilityAssistance} (${passport.medicalCareNeeds.mobilityAids})`],
        ["Toileting", `${passport.medicalCareNeeds.toiletingAssistance} | ${passport.medicalCareNeeds.continenceStatus}`],
        ["Nutrition", `${passport.medicalCareNeeds.dietType} | MUST: ${passport.medicalCareNeeds.mustScore}`],
        ["Communication", `${passport.medicalCareNeeds.communicationIssues || "None"}`]
    ];
    autoTable(doc, {
        startY: yPos,
        body: tableData,
        theme: 'plain',
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // 5. Skin Care & Medication
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    yPos = addSectionTitle("5. SKIN CARE & MEDICATION", yPos);
    yPos = addField("Current Medication Regime", passport.skinMedicationAttachments.currentMedicationRegime, margin, yPos, pageWidth - margin * 2);
    yPos = addField("Last Medication Given", formatDateTimeUK(passport.skinMedicationAttachments.lastMedicationDateTime), margin, yPos, pageWidth - margin * 2);

    // 6. Authorization & Sign-off
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    yPos = addSectionTitle("6. AUTHORIZATION & SIGN-OFF", yPos);
    if (passport.signOff) {
        y1 = addField("Signature", passport.signOff.signature || "N/A", margin, yPos, colWidth);
        y2 = addField("Printed Name", passport.signOff.printedName || "N/A", col2, yPos, colWidth);
        yPos = Math.max(y1, y2) + 5;
        y1 = addField("Designation", passport.signOff.designation || "N/A", margin, yPos, colWidth);
        y2 = addField("Completion Date", formatDateUK(passport.signOff.completedDate), col2, yPos, colWidth);
    } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Authorization details not provided", margin, yPos + 5);
        yPos += 15;
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated by CareO System on ${new Date().toLocaleString('en-GB')}`, margin, doc.internal.pageSize.height - 10);

    doc.save(`hospital-passport-${passport.generalDetails.personName?.replace(/\s+/g, '-')}-${passport._id}.pdf`);
};
