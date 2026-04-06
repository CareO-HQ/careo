import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { UK_TIMEZONE, formatTimestampToUKTime } from "@/lib/date-utils";

export interface GenerateDailyRecordPDFOptions {
    resident: any;
    recordType: 'personal_care' | 'activity_record';
    periodType: 'daily' | 'monthly';
    date?: string; // string for daily
    month?: number;
    year?: number;
    tasks?: any[]; // for daily map
    tasksByDay?: Record<string, any[]>; // for monthly map
    users: any[];
    orgLogoUrl?: string;
    careHomeName?: string;
}

const activityLabels: Record<string, string> = {
    bed_bath: "Bed Bath",
    shampoo_in_bed: "Shampoo In Bed",
    shower_shampoo: "Shower + Shampoo",
    wash_upper_body: "Wash Upper Body",
    wash_lower_body: "Wash Lower Body",
    creams_applied: "Creams Applied",
    shaved: "Shaved",
    oral_care: "Oral Care",
    fingernails_trimmed: "Fingernails Trimmed",
    fingernails_cleaned: "Fingernails Cleaned",
    hair_brushed: "Hair Brushed",
    hair_washed_hairdresser: "Hair Washed/Set by Hairdresser",
    clothing_changed: "Clothing Changed",
    bed_linens_changed: "Bed Linens Changed",
    bed_made: "Bed Made",
    eyeglasses_care: "Eyeglasses Care",
    footwear_care: "Footwear Care",
};

function getUserDisplayName(users: any[], identifier: string | undefined): string {
    if (!identifier) return 'Staff';
  
    const user = users.find((u: any) =>
      u.id === identifier ||
      u.email === identifier ||
      u.username === identifier
    );
  
    if (user) {
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      if (user.first_name) return user.first_name;
      if (user.name) return user.name;
    }
  
    return identifier || 'Staff';
}

export const generateDailyRecordPDF = async ({
    resident,
    recordType,
    periodType,
    date,
    month,
    year,
    tasks,
    tasksByDay,
    users,
    orgLogoUrl,
    careHomeName
}: GenerateDailyRecordPDFOptions) => {
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

    const isPersonalCare = recordType === 'personal_care';
    const formTitle = isPersonalCare ? "PERSONAL CARE RECORD" : "DAILY ACTIVITY RECORD";
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

    let subTitle = "";
    if (periodType === 'daily' && date) {
        subTitle = `Day: ${format(parseISO(date), "EEEE, MMMM d, yyyy")}`;
    } else if (periodType === 'monthly' && year && month) {
        subTitle = `Month: ${format(new Date(year, month - 1), "MMMM yyyy")}`;
    }

    await drawHeader(formTitle, subTitle);
    
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

    // Gather all tasks
    let allTasks: any[] = [];
    if (periodType === 'daily' && tasks) {
        allTasks = [...tasks];
    } else if (periodType === 'monthly' && tasksByDay) {
        Object.keys(tasksByDay).forEach(day => {
            allTasks = allTasks.concat(tasksByDay[day]);
        });
    }

    const mapTasksForTable = (taskList: any[]) => {
        // Sort tasks chronologically
        const sortedTasks = taskList.sort((a: any, b: any) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
        });

        if (sortedTasks.length === 0) {
            return [['', '', 'No records found for this period.', '', '']];
        }

        return sortedTasks.map(task => {
            const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string; staff?: string; response?: string } | null;
            const displayTime = payload?.time || (task.created_at ? formatTimestampToUKTime(task.created_at) : '--');
            const staffIdentifier = payload?.primaryStaff || payload?.staff;
            const staffName = getUserDisplayName(users, staffIdentifier);
            const assistedStaffName = payload?.assistedStaff ? getUserDisplayName(users, payload.assistedStaff) : null;
            let activityName = activityLabels[task.task_type] || task.task_type;
            
            if (!isPersonalCare && payload?.response) {
                // Formatting for activity where response is appended
                activityName = `${activityName}\nResponse: ${payload.response}`;
            }

            const notes = task.notes || '';
            
            const taskDateLocal = task.created_at ? formatTimestampToUKTime(task.created_at) : null; 
            // the created_at formatting needs to output the date
            let displayDate = "--";
            if (task.created_at) {
                const dateObj = new Date(task.created_at);
                displayDate = formatInTimeZone(dateObj, UK_TIMEZONE, "dd/MM/yyyy");
            } else if (date) {
                displayDate = format(parseISO(date), "dd/MM/yyyy");
            }

            const staffDisplay = assistedStaffName
              ? `${staffName}\n(Assisted: ${assistedStaffName})`
              : staffName;

            return [displayDate, displayTime, activityName, notes || '--', staffDisplay];
        });
    };

    const tableData = mapTasksForTable(allTasks);

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Time', isPersonalCare ? 'Activity' : 'Activity', 'Comments', 'Staff Name']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 15 },
            2: { cellWidth: 40 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 35 }
        },
        willDrawPage: (data) => {
            // Check if we need to draw header on new pages
            if (data.pageNumber > 1 && data.cursor) {
                // If drawHeader is async, it might not work perfectly inside willDrawPage of autoTable.
                // We'll manage with generic text if it fails, or we just let autoTable push it down.
            }
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

    let defaultFileName = 'record.pdf';
    const nameStr = [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join('-');
    
    if (periodType === 'daily') {
        const filePrefix = isPersonalCare ? 'personal-care' : 'activity-record';
        defaultFileName = `${filePrefix}-${nameStr}-${date}.pdf`;
    } else {
        const filePrefix = isPersonalCare ? 'personal-care-record' : 'activity-record';
        const monthStart = parseISO(`${year}-${String(month).padStart(2, '0')}-01`);
        const monthName = format(monthStart, 'MMMM-yyyy');
        defaultFileName = `${filePrefix}-${nameStr}-${monthName}.pdf`;
    }

    doc.save(defaultFileName);
};
