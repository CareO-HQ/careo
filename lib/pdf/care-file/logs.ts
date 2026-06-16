import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
    drawHeader,
    drawHeaderSync,
    addSectionTitle,
    addField,
    toSafeFilePart,
    GenerateCareFilePDFOptions,
    PDFContext
} from "./helpers";

export const generateLogsPDF = async (options: GenerateCareFilePDFOptions) => {
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
    
    // Draw Header
    const drawLogHeaderSync = () => {
        drawHeaderSync(ctx);
    };

    // --- Specimen Record Log ---
    if (isSpecimenLog) {
        const records: any[] = Array.isArray(data) ? data : (data.records || []);

        const toVal = (v: any, fallback = "N/A"): string => {
            if (v === null || v === undefined || v === "") return fallback;
            return String(v);
        };

        const fmtDateTime = (v: any): string => {
            if (!v) return "N/A";
            try {
                const d = new Date(v);
                if (isNaN(d.getTime())) return "N/A";
                return format(d, "dd/MM/yyyy HH:mm");
            } catch {
                return "N/A";
            }
        };

        // Resident details — 4-column grid
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        const quarterWidth = (pageWidth - margin * 2) / 4 - 4;
        const col2 = margin + (pageWidth - margin * 2) / 4;
        const col3 = margin + (pageWidth - margin * 2) / 2;
        const col4 = margin + ((pageWidth - margin * 2) * 3) / 4;

        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        const fullName = [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" ") || "N/A";

        const rowY = yPos;
        const yA = await addField(ctx, "Full Name",      fullName,                                   margin, rowY, quarterWidth, true);
        const yB = await addField(ctx, "Date of Birth",  formattedDob,                               col2,   rowY, quarterWidth, true);
        const yC = await addField(ctx, "Bedroom / Room", toVal(resident?.room_number),               col3,   rowY, quarterWidth, true);
        const yD = await addField(ctx, "Care Home",      toVal(careHomeName),                        col4,   rowY, quarterWidth, true);
        yPos = Math.max(yA, yB, yC, yD) + 8;

        // Records table
        yPos = await addSectionTitle(ctx, "SPECIMEN RECORDS LOG", yPos);

        const tableBody = records.length > 0
            ? records.map((r: any) => [
                fmtDateTime(r.date_time_obtained || r.dateTimeObtained),
                toVal(r.specimen_type       || r.specimenType,       "—"),
                toVal(r.specimen_requested  || r.specimenRequested,  "—"),
                toVal(r.staff_obtaining_signature || r.staffObtainingSignature, "—"),
                fmtDateTime(r.date_results_received || r.dateResultsReceived) === "N/A" ? "—" : fmtDateTime(r.date_results_received || r.dateResultsReceived),
                toVal(r.results,                               "—"),
                toVal(r.staff_receiving_signature || r.staffReceivingSignature, "—"),
              ])
            : [["No records found", "", "", "", "", "", ""]];

        autoTable(doc, {
            startY: yPos,
            head: [["Date/Time Obtained", "Type of Specimen", "Specimen Requested", "Obtained By", "Results Date/Time", "Results", "Received By"]],
            body: tableBody,
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineColor: [229, 231, 235],
                lineWidth: 0.3,
                textColor: [17, 24, 39],
            },
            headStyles: {
                fillColor: [34, 197, 94],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251],
            },
            columnStyles: {
                0: { cellWidth: 36 },
                4: { cellWidth: 36 },
            },
            didDrawPage: () => {
                drawLogHeaderSync();
            },
        });

        // Footer — date generated
        const finalY = (doc as any).lastAutoTable.finalY + 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(107, 114, 128);
        doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, finalY);

        doc.save(`${toSafeFilePart(resident?.last_name)}_Specimen_Record_Log_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Key Worker Diary ---
    if (isKeyWorkerDiaryPdf) {
        const rawEntries: unknown[] = Array.isArray(data) ? data : (data && typeof data === "object" && "entries" in data ? (data as { entries: unknown[] }).entries : []);

        const diaryCell = (v: unknown): string => {
            if (typeof v === "boolean") return v ? "Yes" : "No";
            if (v === null || v === undefined) return "N/A";
            if (typeof v === "string" && v.trim() === "") return "N/A";
            if (typeof v === "number" && !Number.isNaN(v)) return String(v);
            return String(v);
        };

        const fmtDiaryDateTime = (v: unknown): string => {
            if (v === null || v === undefined || v === "") return "N/A";
            try {
                const d = new Date(v as string | number);
                if (Number.isNaN(d.getTime())) return "N/A";
                return format(d, "dd/MM/yyyy HH:mm");
            } catch {
                return "N/A";
            }
        };

        const entryRecord = (e: unknown): Record<string, unknown> =>
            e !== null && typeof e === "object" && !Array.isArray(e) ? (e as Record<string, unknown>) : {};

        const entryDateTimeLabel = (r: Record<string, unknown>): string => {
            const dateRaw = r.date;
            const timeRaw = r.time;
            const timeStr = typeof timeRaw === "string" && timeRaw.trim() !== "" ? timeRaw.trim() : "";
            if (dateRaw !== null && dateRaw !== undefined && dateRaw !== "") {
                try {
                    const d = new Date(dateRaw as string | number);
                    if (!Number.isNaN(d.getTime())) {
                        const dateStr = format(d, "dd/MM/yyyy");
                        return timeStr ? `${dateStr} ${timeStr}` : dateStr;
                    }
                } catch {
                    /* fall through */
                }
            }
            return fmtDiaryDateTime(r.created_at);
        };

        const quarterWidth = (pageWidth - margin * 2) / 4 - 4;
        const col2 = margin + (pageWidth - margin * 2) / 4;
        const col3 = margin + (pageWidth - margin * 2) / 2;
        const col4 = margin + ((pageWidth - margin * 2) * 3) / 4;

        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        const dobValue = resident?.date_of_birth || resident?.dateOfBirth;
        const formattedDob = dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A";
        const fullName = [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" ") || "N/A";
        const roomVal = resident?.room_number;
        const careHomeVal = careHomeName;

        const rowY = yPos;
        const yA = await addField(ctx, "Resident name", fullName, margin, rowY, quarterWidth, true);
        const yB = await addField(ctx, "Date of birth", formattedDob, col2, rowY, quarterWidth, true);
        const yC = await addField(ctx, "Room number", diaryCell(roomVal), col3, rowY, quarterWidth, true);
        const yD = await addField(ctx, "Care home", diaryCell(careHomeVal), col4, rowY, quarterWidth, true);
        yPos = Math.max(yA, yB, yC, yD) + 8;

        yPos = await addSectionTitle(ctx, "DIARY ENTRIES", yPos);

        const head = ["Date & time", "Recorded by", "Comments"];

        const tableBody =
            rawEntries.length > 0
                ? rawEntries.map((entry) => {
                      const r = entryRecord(entry);
                      return [
                          entryDateTimeLabel(r),
                          diaryCell(r.author_name),
                          diaryCell(r.comments ?? r.comment),
                      ];
                  })
                : [head.map(() => "N/A")];

        autoTable(doc, {
            startY: yPos,
            head: [head],
            body: tableBody,
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 7,
                cellPadding: 2,
                lineColor: [229, 231, 235],
                lineWidth: 0.3,
                textColor: [17, 24, 39],
                overflow: "linebreak",
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 7,
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251],
            },
            columnStyles: {
                0: { cellWidth: 38 },
                1: { cellWidth: 42 },
                2: { cellWidth: "auto" },
            },
            didDrawPage: () => {
                drawLogHeaderSync();
            },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(107, 114, 128);
        doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, finalY);

        doc.save(`${toSafeFilePart(resident?.last_name)}_Key_Worker_Diary_${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Progress Notes ---
    if (isProgressNotesPdf) {
        const textOrDash = (v: unknown): string => {
            if (v === null || v === undefined) return "—";
            if (typeof v === "string" && v.trim() === "") return "—";
            return String(v);
        };

        const fmtDate = (v: unknown): string => {
            if (v === null || v === undefined || v === "") return "—";
            try {
                const d = new Date(v as string | number);
                if (Number.isNaN(d.getTime())) return textOrDash(v);
                return format(d, "dd/MM/yyyy");
            } catch {
                return "—";
            }
        };

        const noteTypeDisplay = (t: unknown): string => {
            const s = textOrDash(t);
            if (s === "—") return "—";
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        };

        const careFileNumbersCell = (row: Record<string, unknown>): string => {
            const rawCf = row.care_file_numbers ?? row.careFileNumbers;
            if (!Array.isArray(rawCf) || rawCf.length === 0) return "—";
            const nums = rawCf.filter(
                (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 18
            );
            if (nums.length === 0) return "—";
            return [...new Set(nums)].sort((a, b) => a - b).join(", ");
        };

        const toRow = (row: Record<string, unknown>): string[] => [
            fmtDate(row.date),
            textOrDash(row.time),
            noteTypeDisplay(row.type),
            careFileNumbersCell(row),
            textOrDash(row.note),
            textOrDash(row.author_name ?? row.authorName),
        ];

        let tableRows: Record<string, unknown>[];
        if (Array.isArray(data)) {
            tableRows = data.filter(
                (item): item is Record<string, unknown> =>
                    item !== null && typeof item === "object" && !Array.isArray(item)
            ) as Record<string, unknown>[];
        } else if (data && typeof data === "object" && !Array.isArray(data)) {
            tableRows = [data as Record<string, unknown>];
        } else {
            tableRows = [];
        }
        if (tableRows.length === 0) {
            tableRows = [{}];
        }

        const body = tableRows.map(toRow);

        yPos = 30;
        await drawHeader(ctx);

        const residentFullName =
            [resident?.first_name, resident?.middle_name, resident?.last_name].filter(Boolean).join(" ") || "—";
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(75, 85, 99);
        doc.text(`Resident: ${residentFullName}`, margin, yPos);
        if (careHomeName) {
            doc.text(`Care home: ${careHomeName}`, margin + 95, yPos);
        }
        yPos += 6;

        autoTable(doc, {
            startY: yPos,
            head: [["Date", "Time", "Note Type", "Care File Numbers", "Progress Note", "Recorded By"]],
            body,
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 7,
                cellPadding: 2,
                lineColor: [229, 231, 235],
                lineWidth: 0.3,
                textColor: [17, 24, 39],
                overflow: "linebreak",
                valign: "top",
            },
            headStyles: {
                fillColor: [34, 197, 94],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 7,
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251],
            },
            columnStyles: {
                0: { cellWidth: 24 },
                1: { cellWidth: 16 },
                2: { cellWidth: 22 },
                3: { cellWidth: 28 },
                4: { cellWidth: "auto" },
                5: { cellWidth: 36 },
            },
            didDrawPage: () => {
                drawLogHeaderSync();
            },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(107, 114, 128);
        doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, finalY);

        doc.save(
            `${toSafeFilePart(resident?.last_name)}_Progress_Notes_${format(new Date(), "ddMMyyyy")}.pdf`
        );
        return;
    }
};
