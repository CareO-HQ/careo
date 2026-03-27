import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatTimestampToUKTime, formatDateForDisplay, getLocalHour, UK_TIMEZONE } from "./date-utils";
import { formatInTimeZone } from "date-fns-tz";

interface FoodFluidReport {
  logs: any[];
  totalEntries: number;
  foodEntries: number;
  fluidEntries: number;
  totalFluidMl: number;
}

interface FoodFluidPDFData {
  resident: any;
  reports: Array<{
    date: string;
    report: FoodFluidReport;
  }>;
  orgLogoUrl?: string;
}

const TIME_BLOCKS = [
  { label: "Midnight to 7am", startHour: 0, endHour: 7 },
  { label: "7am to 12 midday\n\n(Breakfast & Mid morning snacks & drinks)", startHour: 7, endHour: 12 },
  { label: "Midday to 5pm\n\n(Lunch & Mid-afternoon snacks & drinks)", startHour: 12, endHour: 17 },
  { label: "5pm to midnight\n\n(Evening meal & Supper & drinks)", startHour: 17, endHour: 24 },
];

export const generateFoodFluidPDF = async ({ resident, reports, orgLogoUrl }: FoodFluidPDFData) => {
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

  const logoUrl = orgLogoUrl || window.location.origin + '/Logo_CareO.png';
  let logoDataUrl: string | null = null;
  try {
    const logoImg = await loadImage(logoUrl);
    const canvas = document.createElement('canvas');
    canvas.width = logoImg.naturalWidth;
    canvas.height = logoImg.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(logoImg, 0, 0);
    logoDataUrl = canvas.toDataURL('image/png');
  } catch (e) {
    console.warn("Logo load failed", e);
  }

  for (let i = 0; i < reports.length; i++) {
    const { date, report } = reports[i];
    if (i > 0) doc.addPage();

    // --- Header Branding ---
    const headerHeight = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    doc.setFillColor(34, 197, 94); // Green border
    doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');

    // Title
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DAILY FOOD & FLUID REPORT", margin, 14);

    if (logoDataUrl) {
      const logoSize = 12;
      doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - 30, (headerHeight - logoSize) / 2 - 1, 30, logoSize);
    }

    let yPos = 30;

    // Resident Info and Date
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Resident: ${resident.first_name} ${resident.last_name}`, margin, yPos);
    
    doc.setFont("helvetica", "normal");
    const formattedDate = formatInTimeZone(new Date(date + "T00:00:00"), UK_TIMEZONE, "EEEE, dd MMMM yyyy");
    doc.text(`Date: ${formattedDate}`, pageWidth - margin - doc.getTextWidth(`Date: ${formattedDate}`), yPos);
    yPos += 10;

    // Prepare table data grouped by time blocks
    const tableData: any[] = [];
    
    TIME_BLOCKS.forEach(block => {
      const blockLogs = report.logs.filter(log => {
        const hour = getLocalHour(log.timestamp);
        return hour >= block.startHour && hour < block.endHour;
      });

      if (blockLogs.length === 0) {
        tableData.push([
          block.label,
          "",
          "",
          "",
          "",
          "",
          ""
        ]);
      } else {
        blockLogs.forEach((log, index) => {
          tableData.push([
            index === 0 ? block.label : "",
            formatTimestampToUKTime(log.timestamp),
            log.typeOfFoodDrink,
            log.portionServed || "—",
            log.amountEaten || "—",
            log.fluidConsumedMl ? `${log.fluidConsumedMl} ml` : "—",
            log.signature || ""
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          { content: 'Start Day & Date', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Time', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Type of Food & Drink', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Amount Taken', colSpan: 3, styles: { halign: 'center' } },
          { content: 'Signature', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        ],
        [
          { content: 'Portion served', styles: { halign: 'center' } },
          { content: 'Amount Eaten', styles: { halign: 'center' } },
          { content: 'Fluid Consumed (Mls)', styles: { halign: 'center' } },
        ]
      ],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        valign: 'middle'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        // If it's the first column and not the header, keep grouping styling
        if (data.column.index === 0 && data.section === 'body') {
          // You can add logic here if you want to handle row spanning manually
          // but jsPDF-autotable handles it via rowSpan in content if we pre-calculate it.
          // For now, keeping it simple as per the tableData preparation.
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY;

    // Total Fluids Footer for the day
    autoTable(doc, {
      startY: yPos,
      body: [[
        { content: 'TOTAL FLUIDS CONSUMED IN 24 HOURS', styles: { halign: 'right', fontStyle: 'bold', cellWidth: 140 + (pageWidth - margin * 2 - 165) } },
        { content: `${report.totalFluidMl} ml`, styles: { halign: 'center', fontStyle: 'bold' } }
      ]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: pageWidth - margin * 2 - 40 },
        1: { cellWidth: 40 }
      }
    });
  }

  // Footer with generation info
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Report generated on ${format(new Date(), "dd/MM/yyyy HH:mm")} - Page ${i} of ${pageCount}`,
      margin,
      doc.internal.pageSize.height - 10
    );
  }

  const filename = reports.length === 1 
    ? `Food-Fluid-Report-${resident.last_name}-${reports[0].date}.pdf`
    : `Food-Fluid-Reports-${resident.last_name}-${reports[0].date}-to-${reports[reports.length-1].date}.pdf`;
    
  doc.save(filename);
};
