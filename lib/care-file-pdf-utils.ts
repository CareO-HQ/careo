import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    doc.text(formName.toUpperCase(), margin, 14);

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
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
        doc.setDrawColor(34, 197, 94); // Use green for section accent too
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + 8);
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), margin + 4, y + 5.5);
        doc.setTextColor(0, 0, 0);
        return y + 12;
    };

    const addField = (label: string, value: any, x: number, y: number, width: number) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(label.toUpperCase(), x, y);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);

        // Format value
        let displayValue = "N/A";
        if (value !== null && value !== undefined) {
            if (typeof value === "boolean") {
                displayValue = value ? "Yes" : "No";
            } else if (typeof value === "object") {
                displayValue = JSON.stringify(value); // This utility is for simpler structures first
            } else {
                displayValue = String(value);
            }
        }

        const splitValue = doc.splitTextToSize(displayValue, width);
        doc.text(splitValue, x, y + 5);
        return y + 5 + (splitValue.length * 5);
    };

    // --- Resident Info Section ---
    yPos = addSectionTitle("RESIDENT INFORMATION", yPos);
    const col2 = margin + (pageWidth - margin * 2) / 2;
    const colWidth = (pageWidth - margin * 2) / 2 - 5;

    let y1 = addField("Full Name", `${resident?.first_name} ${resident?.last_name}`, margin, yPos, colWidth);
    const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
    const formattedDob = dobValue ? new Date(dobValue).toLocaleDateString('en-GB') : "N/A";
    y1 = addField("Date of Birth", formattedDob, margin, y1, colWidth);

    let y2 = addField("Care Home", careHomeName || "N/A", col2, yPos, colWidth);
    y2 = addField("Date Generated", new Date().toLocaleDateString('en-GB'), col2, y2, colWidth);

    yPos = Math.max(y1, y2) + 5;

    // --- Form Data Rendering ---
    // We'll use a generic approach: iterate over keys, skipping internal ones
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
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    };

    yPos = addSectionTitle("FORM DETAILS", yPos);

    const entries = Object.entries(data).filter(([k, v]) => !SKIP_KEYS.has(k) && !isEmptyValue(v));
    let currentX = margin;
    let rowY = yPos;
    let maxYInRow = yPos;

    for (const [key, value] of entries) {
        if (typeof value === 'object' && value !== null) {
            // Handle lists or nested objects with autoTable or just a block
            if (Array.isArray(value)) {
                const filteredItems = value.filter(item => !isEmptyValue(item));
                if (filteredItems.length === 0) continue;

                if (currentX !== margin) { rowY = maxYInRow + 5; currentX = margin; }
                rowY = addSectionTitle(formatFieldKey(key), rowY);

                if (filteredItems.length > 0) {
                    // Specific field filtering and reordering for evaluations
                    const EVAL_DATE_KEYS = ["evaluationDate", "evaluation_date"];
                    const EVAL_NOTES_KEYS = ["progress_notes", "comments"];
                    let headers = Object.keys(filteredItems[0]).filter(k => !SKIP_KEYS.has(k));

                    // If it looks like an evaluation array, restrict to strict columns
                    const isEvaluation = headers.some(k => EVAL_DATE_KEYS.includes(k) || EVAL_NOTES_KEYS.includes(k));
                    if (isEvaluation) {
                        // Narrow down to one date and one notes field
                        const dateKey = headers.find(k => EVAL_DATE_KEYS.includes(k));
                        const notesKey = headers.find(k => EVAL_NOTES_KEYS.includes(k));
                        headers = [dateKey, notesKey].filter((k): k is string => !!k);
                    }

                    const rows = filteredItems.map(item =>
                        headers.map(k => {
                            const v = item[k];
                            if (v === null || v === undefined) return "";
                            // Basic date detection and formatting
                            if (typeof v === "string" && v.includes("T") && !isNaN(Date.parse(v))) {
                                try {
                                    return new Date(v).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    });
                                } catch (e) { return v; }
                            }
                            return String(v);
                        })
                    );

                    const displayHeaders = headers.map(formatFieldKey);

                    autoTable(doc, {
                        startY: rowY,
                        head: [displayHeaders],
                        body: rows,
                        margin: { left: margin, right: margin },
                        theme: 'grid',
                        styles: { fontSize: 8, cellPadding: 3 },
                        headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' },
                        columnStyles: {
                            0: { cellWidth: 40 }, // Usually date
                        }
                    });
                    rowY = (doc as any).lastAutoTable.finalY + 10;
                } else {
                    doc.setFontSize(10);
                    doc.text("No entries", margin, rowY);
                    rowY += 10;
                }
                maxYInRow = rowY;
            } else {
                // Nested object - treat as a subsection
                if (currentX !== margin) { rowY = maxYInRow + 5; currentX = margin; }
                const subEntries = Object.entries(value).filter(([k, v]) => !SKIP_KEYS.has(k) && !isEmptyValue(v));
                if (subEntries.length === 0) continue;

                rowY = addSectionTitle(formatFieldKey(key), rowY);
                for (const [sk, sv] of subEntries) {
                    rowY = addField(formatFieldKey(sk), sv, margin, rowY, pageWidth - margin * 2);
                }
                maxYInRow = rowY;
            }
        } else {
            // Primitive
            const fieldY = addField(formatFieldKey(key), value, currentX, rowY, colWidth);
            maxYInRow = Math.max(maxYInRow, fieldY);

            if (currentX === margin) {
                currentX = col2;
            } else {
                currentX = margin;
                rowY = maxYInRow + 2;
                maxYInRow = rowY;
            }
        }

        if (rowY > 260) {
            doc.addPage();
            rowY = 20;
            maxYInRow = 20;
            currentX = margin;
        }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated by CareO System on ${new Date().toLocaleString('en-GB')}`, margin, doc.internal.pageSize.height - 10);

    doc.save(`${formName.replace(/\s+/g, '-')}-${resident?.last_name}-${new Date().getTime()}.pdf`);
};
