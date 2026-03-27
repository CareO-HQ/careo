import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BodyMapSession } from "@/types/body-map";
import { BODY_REGIONS } from "@/lib/config/body-regions";

interface GenerateBodyMapPDFOptions {
    residentName?: string;
    incidentDate?: string;
    incidentType?: string;
    currentSession: BodyMapSession;
    orgLogoUrl?: string;
}

export const generateBodyMapPDF = async ({
    residentName,
    incidentDate,
    incidentType,
    currentSession,
    orgLogoUrl
}: GenerateBodyMapPDFOptions) => {
    // Initialize jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // Helper to load images for jsPDF
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

    // White header background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Green bottom border line
    doc.setFillColor(34, 197, 94); // #22c55e green
    doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');

    // Title text in dark color
    doc.setTextColor(31, 41, 55); // dark gray
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Body Mapping Documentation", margin, 14);

    // Try to render org logo in the top right, otherwise fall back to placeholder text
    const logoSize = 14; // logo height in mm
    const logoY = (headerHeight - logoSize) / 2;

    if (orgLogoUrl) {
        try {
            const logoImg = await loadImage(orgLogoUrl);
            const canvas = document.createElement('canvas');
            canvas.width = logoImg.naturalWidth;
            canvas.height = logoImg.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(logoImg, 0, 0);
            const logoDataUrl = canvas.toDataURL('image/png');
            // Draw as square logo maintaining aspect ratio
            const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
            const logoW = logoSize * aspect;
            doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, logoY, logoW, logoSize);
        } catch {
            // Fallback if logo fails to load (silent fallback as per PDF header change)
        }
    }

    doc.setTextColor(0, 0, 0);
    // --- Resident & Incident Info ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    let yPos = 30;
    const lineHeight = 6;

    doc.setFont("helvetica", "bold");
    doc.text("Resident Information", margin, yPos);
    yPos += lineHeight + 2;

    doc.setFont("helvetica", "normal");
    doc.text(`Resident: ${residentName || "N/A"}`, margin, yPos);
    doc.text(`Incident Type: ${incidentType || "N/A"}`, pageWidth / 2, yPos);
    yPos += lineHeight;
    doc.text(`Incident Date: ${incidentDate || "N/A"}`, margin, yPos);
    doc.text(`Record Date: ${currentSession ? new Date(currentSession.date).toLocaleDateString("en-GB") : "N/A"}`, pageWidth / 2, yPos);
    yPos += 10;

    // --- Body Map Image & Markers ---
    doc.setFont("helvetica", "bold");
    doc.text("Anatomical Distribution", margin, yPos);
    yPos += 5;

    // Define map dimensions on PDF
    const mapWidth = 140;
    const mapHeight = (mapWidth * 515) / 577; // Maintain aspect ratio
    const mapX = (pageWidth - mapWidth) / 2;
    const mapY = yPos;

    // Draw Background Rectangle for the map
    doc.setDrawColor(226, 232, 240);
    doc.rect(mapX, mapY, mapWidth, mapHeight);

    // Add the image
    const imgPath = "/images/body_template_without_rectangular_boxes.png";

    try {
        const img = await loadImage(imgPath);
        doc.addImage(img, 'PNG', mapX, mapY, mapWidth, mapHeight);
    } catch (e) {
        console.error("Failed to load body map template image", e);
    }

    // Draw Markers
    currentSession?.entries.forEach(entry => {
        const region = BODY_REGIONS.find(r => r.region_id === entry.region_id);
        if (region) {
            const isResolved = String(entry.status).toLowerCase() === "resolved";

            // Convert percentage coordinates to PDF coordinates
            const rectX = mapX + (region.x * mapWidth) / 100;
            const rectY = mapY + (region.y * mapHeight) / 100;
            const rectW = (region.width * mapWidth) / 100;
            const rectH = (region.height * mapHeight) / 100;

            // Set marker style
            if (isResolved) {
                doc.setFillColor(34, 197, 94); // #22c55e Green
                doc.setDrawColor(34, 197, 94);
                doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
            } else {
                doc.setFillColor(168, 85, 247); // #a855f7 Purple
                doc.setDrawColor(147, 51, 234);
                doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
            }

            doc.rect(rectX, rectY, rectW, rectH, 'F');
            doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
            doc.rect(rectX, rectY, rectW, rectH, 'S');
        }
    });

    yPos = mapY + mapHeight + 15;

    // --- Clinical Observations Table ---
    doc.setFont("helvetica", "bold");
    doc.text("Clinical Observations", margin, yPos);
    yPos += 5;

    const tableData = (currentSession?.entries || []).map(entry => [
        entry.region_name,
        entry.condition_type,
        entry.assessed_by || "N/A",
        `${entry.notes || ""}${entry.measurements ? `\nSize: ${entry.measurements}` : ""}`,
        entry.date_time ? new Date(entry.date_time).toLocaleDateString("en-GB") : "N/A"
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Region', 'Observation Type', 'Assessed By', 'Notes & Measurements', 'Date']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [51, 65, 85],
            fontStyle: 'bold',
            lineWidth: 0.1
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 35 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 25 }
        }
    });

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated by CareO System on ${new Date().toLocaleString("en-GB")}`, margin, doc.internal.pageSize.height - 10);
    doc.text(`Confidential Medical Record`, pageWidth - margin - doc.getTextWidth(`Confidential Medical Record`), doc.internal.pageSize.height - 10);

    // Save the PDF
    const fileName = `body-map-${residentName?.replace(/\s+/g, "-") || "report"}-${currentSession?.date || "session"}.pdf`;
    doc.save(fileName);
};
