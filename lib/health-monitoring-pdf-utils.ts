import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { UK_TIMEZONE } from "@/lib/date-utils";

export interface GenerateHealthMonitoringPDFOptions {
    resident: any;
    vitals: any[];
    date: string;
    vitalType: string;
    vitalTypeLabel: string;
    orgLogoUrl?: string;
    careHomeName?: string;
}

export const generateHealthMonitoringPDF = async ({
    resident,
    vitals,
    date,
    vitalType,
    vitalTypeLabel,
    orgLogoUrl,
    careHomeName
}: GenerateHealthMonitoringPDFOptions) => {
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

    // Handle both single date (YYYY-MM-DD) and month-year format (Month YYYY or Month-YYYY)
    let formattedDate: string;
    // Check if it looks like a monthly report (contains month name)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const isMonthlyReport = monthNames.some(month => date.includes(month));

    if (isMonthlyReport) {
        // Monthly format like "March 2026" or "March-2026"
        formattedDate = date;
    } else {
        // Single date format like "2026-03-15"
        try {
            formattedDate = format(new Date(date + 'T00:00:00'), "EEEE, MMMM d, yyyy");
        } catch (e) {
            formattedDate = date;
        }
    }
    const subTitle = `Report Date: ${formattedDate} | Vital Type: ${vitalTypeLabel}`;

    await drawHeader("Health Monitoring Report", subTitle);

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

    // Helper to format vital value
    const formatVitalValue = (vital: any) => {
        if (vital.vitalType === "bloodPressure" && vital.value2) {
            return `${vital.value}/${vital.value2} ${vital.unit || "mmHg"}`;
        }

        const unitDisplay = vital.unit ?
            (vital.unit === "celsius" ? "°C" :
                vital.unit === "fahrenheit" ? "°F" :
                    vital.unit === "percent" ? "%" :
                        vital.unit === "bpm" ? " bpm" :
                            vital.unit === "breaths/min" ? "/min" :
                                vital.unit) : "";

        return `${vital.value}${unitDisplay}`;
    };

    // Map vitals for table
    const tableData = vitals.map(vital => {
        const time = vital.recordTime || '--';
        const value = formatVitalValue(vital);
        const notes = vital.notes || '--';
        const staffName = vital.recordedByName || '--';

        // Handle date formatting safely
        let vitalDate = '--';
        if (vital.recordDate) {
            try {
                vitalDate = format(parseISO(vital.recordDate), "dd/MM/yyyy");
            } catch (e) {
                // Fallback if date parsing fails
                vitalDate = vital.recordDate;
            }
        }

        return [vitalDate, time, value, notes, staffName];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Time', 'Value', 'Notes', 'Recorded By']],
        body: tableData.length > 0 ? tableData : [['', '', 'No vitals recorded for this day.', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 15 },
            2: { cellWidth: 25 },
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

    const fileName = `Health-Monitoring-${vitalTypeLabel.replace(/\s+/g, '-')}-${fullName.replace(/\s+/g, '-')}-${date}.pdf`;
    doc.save(fileName);
};
