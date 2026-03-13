import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatTimestampToUKTime, formatDateForDisplay } from "./date-utils";

interface FoodFluidPDFData {
  resident: any;
  report: {
    logs: any[];
    totalEntries: number;
    foodEntries: number;
    fluidEntries: number;
    totalFluidMl: number;
  };
  date: string;
  orgLogoUrl?: string;
}

export const generateFoodFluidPDF = async ({ resident, report, date, orgLogoUrl }: FoodFluidPDFData) => {
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

  // --- Header Branding ---
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
  doc.text("DAILY FOOD & FLUID REPORT", margin, 14);

  // Logo
  const logoUrl = orgLogoUrl || window.location.origin + '/Logo_CareO.png';
  try {
    const logoImg = await loadImage(logoUrl);
    const canvas = document.createElement('canvas');
    canvas.width = logoImg.naturalWidth;
    canvas.height = logoImg.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(logoImg, 0, 0);
    const logoDataUrl = canvas.toDataURL('image/png');
    const logoSize = 14;
    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
    const logoW = logoSize * aspect;
    doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, (headerHeight - logoSize) / 2 - 1, logoW, logoSize);
  } catch (e) {
    console.warn("Logo load failed", e);
  }

  let yPos = 30;

  // Resident Info
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${resident.first_name} ${resident.last_name}`, margin, yPos);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`Report Date: ${formatDateForDisplay(date)}`, margin, yPos + 6);
  yPos += 15;

  // Stats Summary
  autoTable(doc, {
    startY: yPos,
    theme: 'plain',
    margin: { left: margin },
    tableWidth: pageWidth - (margin * 2),
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      [
        { content: 'TOTAL ENTRIES', styles: { fontStyle: 'bold', textColor: [107, 114, 128] } },
        { content: 'FOOD ENTRIES', styles: { fontStyle: 'bold', textColor: [107, 114, 128] } },
        { content: 'FLUID ENTRIES', styles: { fontStyle: 'bold', textColor: [107, 114, 128] } },
        { content: 'TOTAL FLUID', styles: { fontStyle: 'bold', textColor: [107, 114, 128] } }
      ],
      [
        { content: String(report.totalEntries || 0), styles: { fontSize: 12, fontStyle: 'bold' } },
        { content: String(report.foodEntries || 0), styles: { fontSize: 12, fontStyle: 'bold' } },
        { content: String(report.fluidEntries || 0), styles: { fontSize: 12, fontStyle: 'bold' } },
        { content: `${report.totalFluidMl || 0} ml`, styles: { fontSize: 12, fontStyle: 'bold' } }
      ]
    ]
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Logs Table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text("FOOD & FLUID LOG", margin, yPos);
  yPos += 4;

  const tableData = report.logs.map(log => [
    formatTimestampToUKTime(log.timestamp),
    log.typeOfFoodDrink,
    log.portionServed || "N/A",
    log.amountEaten,
    log.fluidConsumedMl ? `${log.fluidConsumedMl} ml` : "—",
    log.signature
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Time', 'Food/Drink', 'Portion', 'Amount', 'Volume', 'Staff']],
    body: tableData.length > 0 ? tableData : [['', 'No entries logged for this date', '', '', '', '']],
    theme: 'grid',
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [229, 231, 235],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 35 }
    }
  });

  // Footer
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

  doc.save(`Food-Fluid-Report-${resident.last_name}-${date}.pdf`);
};
