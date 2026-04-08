import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { UK_TIMEZONE, formatTimestampToUKTime } from "@/lib/date-utils";

export interface GenerateChecksPDFOptions {
    resident: any;
    recordings: any[];
    date: string;
    orgLogoUrl?: string;
    careHomeName?: string;
}

const checkTypeLabels: Record<string, string> = {
    night_check: "Check",
    positioning: "Positioning",
    pad_change: "Pad Change",
    bed_rails: "Bed Rails Check",
    environmental: "Environmental Check",
    night_note: "Note",
    cleaning: "Cleaning"
};

export const generateChecksPDF = async ({
    resident,
    recordings,
    date,
    orgLogoUrl,
    careHomeName
}: GenerateChecksPDFOptions) => {
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

    const fullName = [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join(" ");
    const dob = resident.date_of_birth ? format(parseISO(resident.date_of_birth), "dd/MM/yyyy") : '--';
    const room = resident.room_number || '--';
    const careHome = careHomeName || resident.care_home_name || '--';

    const drawHeader = async (pageTitle: string, subTitle: string) => {
        const headerHeight = 22;
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        doc.setFillColor(34, 197, 94); // #22c55e green
        doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(pageTitle.toUpperCase(), margin, 14);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(subTitle, margin, 18);

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
                doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, (headerHeight - 2 - logoSize) / 2, logoW, logoSize);
            } catch (e) {
                console.warn("Logo load failed", e);
            }
        }
    };

    const formattedDate = format(new Date(date + 'T00:00:00'), "EEEE, MMMM d, yyyy");
    const subTitle = `Report Date: ${formattedDate}`;

    await drawHeader("Check Report", subTitle);
    
    // Draw info table
    autoTable(doc, {
        startY: 25,
        theme: 'grid',
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
        body: [
            [{ content: 'Name of Home:', styles: { fontStyle: 'bold' } }, { content: careHome, colSpan: 3 }],
            [
                { content: 'Resident\'s Name:', styles: { fontStyle: 'bold' } }, 
                { content: fullName },
                { content: 'Date of Birth:', styles: { fontStyle: 'bold' } },
                { content: dob }
            ],
            [{ content: 'Room No:', styles: { fontStyle: 'bold' } }, { content: room, colSpan: 3 }]
        ]
    });

    const currentY = (doc as any).lastAutoTable.finalY + 5;

    // Map recordings for table
    const tableData = recordings.map(rec => {
        const typeLabel = checkTypeLabels[rec.checkType] || rec.checkType || '--';
        const time = rec.recordTime || '--';
        const notes = rec.notes || '--';
        const staffName = rec.recordedByName || '--';
        const checkDate = rec.recordDate ? format(parseISO(rec.recordDate), "dd/MM/yyyy") : '--';

        return [checkDate, time, typeLabel, notes, staffName];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Time', 'Check Type', 'Notes', 'Recorded By']],
        body: tableData.length > 0 ? tableData : [['', '', 'No checks logged for this day.', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 15 },
            2: { cellWidth: 35 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 35 }
        },
        didDrawPage: (data) => {
            // Add footer on every page
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generated on ${formatInTimeZone(new Date(), UK_TIMEZONE, 'dd/MM/yyyy HH:mm')} UK Time • CareO Management System`, margin, pageHeight - 10);
            doc.text(`Page ${data.pageNumber}`, pageWidth - margin - 20, pageHeight - 10);
        }
    });

    const fileName = `Check-Report-${fullName.replace(/\s+/g, '-')}-${date}.pdf`;
    doc.save(fileName);
};
