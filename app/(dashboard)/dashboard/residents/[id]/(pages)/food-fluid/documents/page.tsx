"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Utensils,
  Droplets,
  Eye,
  Download,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function FoodFluidDocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [selectedReport, setSelectedReport] = React.useState<{
    date: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get all available report dates for this resident
  const availableDates = useQuery(api.foodFluidLogs.getAvailableFoodFluidDates, {
    residentId: id as Id<"residents">
  });

  // Get the selected report data when viewing
  const selectedReportData = useQuery(
    api.foodFluidLogs.getDailyFoodFluidReport,
    selectedReport ? {
      residentId: id as Id<"residents">,
      date: selectedReport.date
    } : "skip"
  );

  // Filter dates based on calendar selection
  const filteredDates = React.useMemo(() => {
    if (!availableDates) return [];
    
    let filtered = availableDates;
    
    // Filter by calendar selection
    if (selectedDate) {
      // Use local timezone to avoid date shifting issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const selectedDateString = `${year}-${month}-${day}`;
      filtered = filtered.filter(date => date === selectedDateString);
    }
    
    return filtered;
  }, [availableDates, selectedDate]);

  const handleViewReport = (date: string) => {
    setSelectedReport({
      date
    });
  };

  const handleDownloadReport = (date: string) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    // Use the currently loaded report data if available, otherwise create a mock
    const reportToDownload = selectedReportData && selectedReport?.date === date
      ? selectedReportData
      : { logs: [], reportGenerated: false, totalEntries: 0, foodEntries: 0, fluidEntries: 0, totalFluidMl: 0 };

    const htmlContent = generatePDFContent({
      resident,
      report: reportToDownload,
      date
    });

    generatePDFFromHTML(htmlContent);

    toast.success(`Food & Fluid report will open for printing`);
  };

  const generatePDFContent = ({
    resident,
    report,
    date
  }: {
    resident: any;
    report: any;
    date: string;
  }) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="header">
        <h1>Daily Food & Fluid Report</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Report Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Generated</h3>
          <p>${new Date().toLocaleString()}</p>
        </div>
        <div class="info-box">
          <h3>Room Number</h3>
          <p>${resident.roomNumber || 'N/A'}</p>
        </div>
        <div class="info-box">
          <h3>Report Type</h3>
          <p>Daily Food & Fluid Log</p>
        </div>
      </div>

      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="number">${report.totalEntries || 0}</span>
            <span class="label">Total Entries</span>
          </div>
          <div class="summary-item">
            <span class="number">${report.foodEntries || 0}</span>
            <span class="label">Food Entries</span>
          </div>
          <div class="summary-item">
            <span class="number">${report.fluidEntries || 0}</span>
            <span class="label">Fluid Entries</span>
          </div>
          <div class="summary-item">
            <span class="number">${report.totalFluidMl || 0}ml</span>
            <span class="label">Total Fluid Intake</span>
          </div>
        </div>
      </div>

      <div class="activities">
        <h2>Food & Fluid Log</h2>
        ${report.logs && report.logs.length > 0 
          ? `<table class="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Section</th>
                  <th>Type</th>
                  <th>Food/Drink</th>
                  <th>Portion</th>
                  <th>Consumed</th>
                  <th>Volume (ml)</th>
                  <th>Staff</th>
                </tr>
              </thead>
              <tbody>
                ${report.logs.map((log: any) => {
                  const isFluid = ['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl;
                  return `
                    <tr class="${isFluid ? 'fluid-entry' : 'food-entry'}">
                      <td>${new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>${log.section.replace('-', ' - ')}</td>
                      <td>${isFluid ? '🥤 Fluid' : '🍽️ Food'}</td>
                      <td>${log.typeOfFoodDrink}</td>
                      <td>${log.portionServed}</td>
                      <td class="consumption-${log.amountEaten.toLowerCase()}">${log.amountEaten}</td>
                      <td>${log.fluidConsumedMl || '-'}</td>
                      <td>${log.signature}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>`
          : `
              <div style="text-align: center; padding: 40px; color: #64748B;">
                <p>No food & fluid entries logged for this date.</p>
              </div>
            `
        }
      </div>

      <div class="footer">
        <p>This report was automatically generated by the Care Management System.</p>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
  };

  const generatePDFFromHTML = (content: string) => {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Food & Fluid Report</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 2cm;
              }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #4F46E5;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #4F46E5;
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-box {
              background: #F8FAFC;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #4F46E5;
            }
            .info-box h3 {
              margin: 0 0 8px 0;
              color: #4F46E5;
              font-size: 16px;
            }
            .info-box p {
              margin: 0;
              font-size: 14px;
              color: #64748B;
            }
            .summary {
              background: #F0FDF4;
              border: 1px solid #BBF7D0;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .summary h2 {
              color: #166534;
              margin: 0 0 15px 0;
              font-size: 18px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item .number {
              font-size: 24px;
              font-weight: bold;
              color: #166534;
              display: block;
            }
            .summary-item .label {
              font-size: 12px;
              color: #065F46;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .activities {
              margin-top: 30px;
            }
            .activities h2 {
              color: #4F46E5;
              border-bottom: 1px solid #E2E8F0;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .log-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .log-table th, .log-table td {
              border: 1px solid #E2E8F0;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            .log-table th {
              background-color: #F8FAFC;
              font-weight: bold;
            }
            .food-entry {
              background-color: #FFF8E7;
            }
            .fluid-entry {
              background-color: #E7F3FF;
            }
            .consumption-all {
              color: #28a745;
              font-weight: bold;
            }
            .consumption-none {
              color: #dc3545;
              font-weight: bold;
            }
            .consumption-1\\/4, .consumption-1\\/2, .consumption-3\\/4 {
              color: #fd7e14;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E2E8F0;
              text-align: center;
              color: #64748B;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${content}
          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">Print PDF</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6B7280; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Food & Fluid Documents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              All archived food & fluid reports for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 mb-6">
        <div className="flex items-center space-x-2 sm:space-x-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-[240px] justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? selectedDate.toLocaleDateString() : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(undefined)}
              className="sm:ml-2"
            >
              Clear
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {filteredDates?.length || 0} report dates found
        </p>
      </div>

      {/* Reports List */}
      {availableDates === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      ) : filteredDates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {selectedDate ? "No reports found for this date" : "No food & fluid reports found"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedDate ? "Try selecting a different date" : "Reports will appear here as food & fluid entries are logged"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredDates.map((date) => (
            <div key={date} className="space-y-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center space-x-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </span>
              </h2>

              <div className="space-y-4">
                {/* Daily Report Card */}
                <Card className="cursor-pointer shadow-none w-full">
                  <CardContent className="">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:gap-4">
                      {/* Icon and Text */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 rounded-md">
                          <Utensils className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">Daily Food & Fluid Report</h3>
                  
                          <p className="text-xs sm:text-sm mt-1 text-green-600">✓ Archived report</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleViewReport(date)} className="flex items-center text-xs sm:text-sm px-2 py-1">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <Utensils className="w-5 h-5 text-yellow-600" />
                                <span className="text-sm sm:text-base">Food & Fluid Report - {new Date(date).toLocaleDateString()}</span>
                              </DialogTitle>
                              <DialogDescription>
                                All food & fluid entries logged for this date
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {selectedReport?.date === date && (
                                selectedReportData === undefined ? (
                                  <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="mt-2 text-muted-foreground">Loading report...</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <div>
                                        <h4 className="font-medium text-yellow-800">Total Entries</h4>
                                        <p className="text-sm text-yellow-700">{selectedReportData?.totalEntries || 0}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-yellow-800">Food Entries</h4>
                                        <p className="text-sm text-yellow-700">{selectedReportData?.foodEntries || 0}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-yellow-800">Fluid Entries</h4>
                                        <p className="text-sm text-yellow-700">{selectedReportData?.fluidEntries || 0}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-yellow-800">Total Fluid</h4>
                                        <p className="text-sm text-yellow-700">{selectedReportData?.totalFluidMl || 0}ml</p>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <h4 className="font-medium">Food & Fluid Log</h4>
                                      {selectedReportData?.logs && selectedReportData.logs.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                          {selectedReportData.logs.map((log: any, index: number) => {
                                            const isFluid = ['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl;
                                            return (
                                              <div key={index} className={`p-3 border rounded-lg ${isFluid ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
                                                <div className="flex justify-between items-start">
                                                  <div>
                                                    <div className="flex items-center space-x-2 mb-1">
                                                      {isFluid ? (
                                                        <Droplets className="w-4 h-4 text-blue-600" />
                                                      ) : (
                                                        <Utensils className="w-4 h-4 text-orange-600" />
                                                      )}
                                                      <p className="font-medium">{log.typeOfFoodDrink}</p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                      {new Date(log.timestamp).toLocaleTimeString()} • {log.section.replace('-', ' - ')}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                      Portion: {log.portionServed}
                                                      {log.fluidConsumedMl && ` • Volume: ${log.fluidConsumedMl}ml`}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">Staff: {log.signature}</p>
                                                  </div>
                                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    log.amountEaten === 'All' 
                                                      ? 'bg-green-100 text-green-800'
                                                      : log.amountEaten === 'None'
                                                      ? 'bg-red-100 text-red-800'
                                                      : 'bg-yellow-100 text-yellow-800'
                                                  }`}>
                                                    {log.amountEaten}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-muted-foreground py-8 text-center">No entries logged for this date</p>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button variant="ghost" size="sm" onClick={() => handleDownloadReport(date)} className="flex items-center text-xs sm:text-sm px-2 py-1">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}