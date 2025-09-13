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
  Sun,
  Moon,
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

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [selectedReport, setSelectedReport] = React.useState<{
    type: 'day' | 'night';
    date: string;
    activities: any[];
  } | null>(null);
  const [dateFilter, setDateFilter] = React.useState<string>("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get all available report dates for this resident
  const availableDates = useQuery(api.personalCare.getAvailableReportDates, {
    residentId: id as Id<"residents">
  });

  // Get ALL daily care data (without shift filtering) for the selected date
  const selectedReportData = useQuery(
    api.personalCare.getDailyPersonalCare,
    selectedReport ? {
      residentId: id as Id<"residents">,
      date: selectedReport.date,
      // Remove shift filtering - get all activities for this date
    } : "skip"
  );

  // For night reports, we also need yesterday's data (for 8pm+ activities)
  const yesterdayReportData = useQuery(
    api.personalCare.getDailyPersonalCare,
    selectedReport?.type === 'night' ? {
      residentId: id as Id<"residents">,
      date: (() => {
        const yesterday = new Date(selectedReport.date);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
      })(),
      // Remove shift filtering - get all activities for yesterday
    } : "skip"
  );

  // Filter dates based on search
  const filteredDates = React.useMemo(() => {
    if (!availableDates) return [];
    
    let filtered = availableDates;
    
    // Filter by text search
    if (dateFilter) {
      filtered = filtered.filter(date => 
        date.includes(dateFilter) || 
        new Date(date).toLocaleDateString().includes(dateFilter)
      );
    }
    
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
  }, [availableDates, dateFilter, selectedDate]);

  const handleViewReport = (date: string, type: 'day' | 'night') => {
    // Set the selected report state - the dialog will handle loading the data
    setSelectedReport({
      type,
      date,
      activities: [] // Will be loaded by the useQuery hook
    });
  };

  const handleDownloadReport = (date: string, type: 'day' | 'night') => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    // Use the currently loaded report data if available, otherwise create a mock
    const reportToDownload = selectedReportData && selectedReport?.date === date && selectedReport?.type === type
      ? selectedReportData
      : { activities: [], reportGenerated: false };

    const htmlContent = generatePDFContent({
      resident,
      report: reportToDownload,
      type,
      date
    });

    generatePDFFromHTML(htmlContent);

    toast.success(`${type === 'day' ? 'Day' : 'Night'} report will open for printing`);
  };

  const generatePDFContent = ({
    resident,
    report,
    type,
    date
  }: {
    resident: any;
    report: any;
    type: 'day' | 'night';
    date: string;
  }) => {
    const timeRange = type === 'day' ? '8:00 AM - 8:00 PM' : '8:00 PM - 8:00 AM';
    const shiftName = type === 'day' ? 'Day' : 'Night';
    const completedCount = report.activities?.filter((a: any) => a.status === 'completed').length || 0;
    const totalActivities = report.activities?.length || 0;
    const completionRate = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="header">
        <h1>Daily Care Report - ${shiftName} Shift</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Report Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Shift Period</h3>
          <p>${timeRange}</p>
        </div>
        <div class="info-box">
          <h3>Generated</h3>
          <p>${new Date().toLocaleString()}</p>
        </div>
        <div class="info-box">
          <h3>Report Type</h3>
          <p>${shiftName} Shift Report</p>
        </div>
      </div>

      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="number">${totalActivities}</span>
            <span class="label">Total Activities</span>
          </div>
          <div class="summary-item">
            <span class="number">${completedCount}</span>
            <span class="label">Completed</span>
          </div>
          <div class="summary-item">
            <span class="number">${completionRate}%</span>
            <span class="label">Completion Rate</span>
          </div>
        </div>
      </div>

      <div class="activities">
        <h2>Activities Log</h2>
        ${report.activities && report.activities.length > 0 
          ? report.activities.map((activity: any) => `
              <div class="activity-item">
                <div class="activity-content">
                  <h4>${activity.taskType}</h4>
                  <div class="time">
                    ${activity.completedAt 
                      ? `Completed at: ${new Date(activity.completedAt).toLocaleTimeString()}`
                      : 'Time: Pending'
                    }
                  </div>
                  ${activity.notes ? `<div class="notes">Notes: ${activity.notes}</div>` : ''}
                </div>
                <div class="status-badge status-${activity.status}">
                  ${activity.status}
                </div>
              </div>
            `).join('')
          : `
              <div style="text-align: center; padding: 40px; color: #64748B;">
                <p>No activities logged for this ${type} shift.</p>
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
          <title>Daily Care Report</title>
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
              grid-template-columns: repeat(3, 1fr);
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
            .activity-item {
              background: white;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .activity-content h4 {
              margin: 0 0 5px 0;
              color: #1E293B;
              font-size: 16px;
            }
            .activity-content .time {
              color: #64748B;
              font-size: 14px;
              margin-bottom: 8px;
            }
            .activity-content .notes {
              color: #475569;
              font-size: 14px;
              font-style: italic;
            }
            .status-badge {
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 500;
              text-transform: capitalize;
            }
            .status-completed {
              background: #DCFCE7;
              color: #166534;
            }
            .status-pending {
              background: #FEF3C7;
              color: #92400E;
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
            <h1 className="text-xl sm:text-2xl font-bold">Daily Care Documents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              All archived reports for {fullName}
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
              {dateFilter ? "No reports found for this search" : "No daily care reports found"}
            </p>
            <p className="text-sm text-muted-foreground">
              {dateFilter ? "Try a different search term" : "Reports will appear here as daily care activities are logged"}
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

              <div className="space-y-4 sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-4 sm:space-y-0">
                {/* Day Report Card */}
                <Card className="cursor-pointer shadow-none w-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:gap-4">
                      {/* Icon and Text */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-md">
                          <Sun className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">Day Report</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">8:00 AM - 8:00 PM</p>
                          <p className="text-xs sm:text-sm mt-1 text-green-600">✓ Archived report</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleViewReport(date, 'day')} className="flex items-center text-xs sm:text-sm px-2 py-1">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <Sun className="w-5 h-5 text-amber-600" />
                                <span className="text-sm sm:text-base">Day Report - {new Date(date).toLocaleDateString()}</span>
                              </DialogTitle>
                              <DialogDescription>
                                All activities logged from 8:00 AM to 8:00 PM
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {selectedReport?.type === 'day' && selectedReport?.date === date && (
                                selectedReportData === undefined ? (
                                  <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="mt-2 text-muted-foreground">Loading report...</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                      <div>
                                        <h4 className="font-medium text-amber-800">Shift Period</h4>
                                        <p className="text-sm text-amber-700">8:00 AM - 8:00 PM</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-amber-800">Total Activities</h4>
                                        <p className="text-sm text-amber-700">{(() => {
                                          // Filter day shift activities (8am-8pm)
                                          const dayActivities = (selectedReportData?.tasks || []).filter((task: any) => {
                                            const hour = new Date(task.createdAt).getHours();
                                            return hour >= 8 && hour < 20;
                                          });
                                          return dayActivities.length;
                                        })()}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-amber-800">Completion Rate</h4>
                                        <p className="text-sm text-amber-700">
                                          {(() => {
                                            const dayActivities = (selectedReportData?.tasks || []).filter((task: any) => {
                                              const hour = new Date(task.createdAt).getHours();
                                              return hour >= 8 && hour < 20;
                                            });
                                            return dayActivities.length > 0 
                                              ? Math.round((dayActivities.filter((a: any) => a.status === 'completed').length / dayActivities.length) * 100)
                                              : 0;
                                          })()}%
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <h4 className="font-medium">Activities Log</h4>
                                      {(() => {
                                        const dayActivities = (selectedReportData?.tasks || []).filter((task: any) => {
                                          const hour = new Date(task.createdAt).getHours();
                                          return hour >= 8 && hour < 20;
                                        });
                                        return dayActivities.length > 0 ? (
                                          <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {dayActivities.map((activity: any, index: number) => (
                                            <div key={index} className="p-3 border border-gray-200 rounded-lg">
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <p className="font-medium">{activity.taskType}</p>
                                                  <p className="text-sm text-muted-foreground">
                                                    {activity.completedAt ? new Date(activity.completedAt).toLocaleTimeString() : 'Pending'}
                                                  </p>
                                                  {activity.notes && (
                                                    <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
                                                  )}
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                  activity.status === 'completed' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                  {activity.status}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        ) : (
                                          <p className="text-muted-foreground py-8 text-center">No activities logged for day shift</p>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button variant="ghost" size="sm" onClick={() => handleDownloadReport(date, 'day')} className="flex items-center text-xs sm:text-sm px-2 py-1">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Night Report Card */}
                <Card className="cursor-pointer shadow-none w-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:gap-4">
                      {/* Icon and Text */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-md">
                          <Moon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">Night Report</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">8:00 PM - 8:00 AM</p>
                          <p className="text-xs sm:text-sm mt-1 text-green-600">✓ Archived report</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleViewReport(date, 'night')} className="flex items-center text-xs sm:text-sm px-2 py-1">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <Moon className="w-5 h-5 text-indigo-600" />
                                <span className="text-sm sm:text-base">Night Report - {new Date(date).toLocaleDateString()}</span>
                              </DialogTitle>
                              <DialogDescription>
                                All activities logged from 8:00 PM to 8:00 AM
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {selectedReport?.type === 'night' && selectedReport?.date === date && (
                                selectedReportData === undefined ? (
                                  <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="mt-2 text-muted-foreground">Loading report...</p>
                                  </div>
                                ) : (
                                  (() => {
                                    // Enhanced Debug: Log comprehensive data
                                    console.log('=== NIGHT REPORT DEBUG ===');
                                    console.log('Selected Date:', selectedReport?.date);
                                    console.log('Today Report Data:', {
                                      hasData: !!selectedReportData,
                                      daily: selectedReportData?.daily,
                                      taskCount: selectedReportData?.tasks?.length || 0,
                                      tasks: selectedReportData?.tasks?.map(t => ({
                                        taskType: t.taskType,
                                        createdAt: t.createdAt,
                                        completedAt: t.completedAt,
                                        createdTime: new Date(t.createdAt).toLocaleString(),
                                        completedTime: t.completedAt ? new Date(t.completedAt).toLocaleString() : 'N/A',
                                        createdHour: new Date(t.createdAt).getHours(),
                                        completedHour: t.completedAt ? new Date(t.completedAt).getHours() : 'N/A'
                                      }))
                                    });
                                    console.log('Yesterday Report Data:', {
                                      hasData: !!yesterdayReportData,
                                      daily: yesterdayReportData?.daily,
                                      taskCount: yesterdayReportData?.tasks?.length || 0,
                                      tasks: yesterdayReportData?.tasks?.map(t => ({
                                        taskType: t.taskType,
                                        createdAt: t.createdAt,
                                        completedAt: t.completedAt,
                                        createdTime: new Date(t.createdAt).toLocaleString(),
                                        completedTime: t.completedAt ? new Date(t.completedAt).toLocaleString() : 'N/A',
                                        createdHour: new Date(t.createdAt).getHours(),
                                        completedHour: t.completedAt ? new Date(t.completedAt).getHours() : 'N/A'
                                      }))
                                    });

                                    // Combine today's and yesterday's data for night shift
                                    const allNightActivities = [
                                      ...(selectedReportData?.tasks || []),
                                      ...(yesterdayReportData?.tasks || [])
                                    ];

                                    console.log('All combined activities:', allNightActivities.length);

                                    // Enhanced filtering logic for night shift (8pm-8am)
                                    const nightShiftActivities = allNightActivities.filter(activity => {
                                      // Use createdAt as primary time reference (it's always present as a number timestamp)
                                      const timeToCheck = activity.createdAt;
                                      const activityTime = new Date(timeToCheck);
                                      const hour = activityTime.getHours();
                                      
                                      // Night shift: 8pm (20:00) onwards OR before 8am (08:00)
                                      const isNightShift = hour >= 20 || hour < 8;
                                      
                                      console.log(`Activity ${activity.taskType}:`, {
                                        createdAt: timeToCheck,
                                        timeString: activityTime.toLocaleString(),
                                        hour: hour,
                                        isNightShift: isNightShift
                                      });
                                      
                                      return isNightShift;
                                    });

                                    console.log(`Filtered ${nightShiftActivities.length} night shift activities out of ${allNightActivities.length} total`);

                                    // TEMPORARY DEBUG: Show all activities regardless of time filter
                                    console.log('=== TEMP DEBUG: SHOWING ALL ACTIVITIES ===');
                                    const debugActivities = allNightActivities; // Use all activities temporarily
                                    
                                    // Separate personal care and daily activities
                                    const personalCareActivities = debugActivities.filter(activity => 
                                      activity.taskType !== 'daily_activity_record'
                                    );
                                    const dailyActivities = debugActivities.filter(activity => 
                                      activity.taskType === 'daily_activity_record'
                                    );
                                    
                                    console.log('Personal Care Activities:', personalCareActivities.length);
                                    console.log('Daily Activities:', dailyActivities.length);

                                    return (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                          <div>
                                            <h4 className="font-medium text-indigo-800">Shift Period</h4>
                                            <p className="text-sm text-indigo-700">8:00 PM - 8:00 AM</p>
                                          </div>
                                          <div>
                                            <h4 className="font-medium text-indigo-800">Total Activities</h4>
                                            <p className="text-sm text-indigo-700">{debugActivities.length}</p>
                                          </div>
                                          <div>
                                            <h4 className="font-medium text-indigo-800">Completion Rate</h4>
                                            <p className="text-sm text-indigo-700">
                                              {debugActivities.length > 0 
                                                ? Math.round((debugActivities.filter((a: any) => a.status === 'completed').length / debugActivities.length) * 100)
                                                : 0}%
                                            </p>
                                          </div>
                                        </div>

                                        {/* Personal Care Activities Section */}
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 bg-blue-600 rounded"></div>
                                            <h4 className="font-medium text-blue-900">Personal Care Activities</h4>
                                            <span className="text-sm text-muted-foreground">({personalCareActivities.length})</span>
                                          </div>
                                          {personalCareActivities.length > 0 ? (
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                              {personalCareActivities
                                                .sort((a, b) => new Date(b.createdAt || b.completedAt).getTime() - new Date(a.createdAt || a.completedAt).getTime())
                                                .map((activity: any, index: number) => (
                                                <div key={index} className="p-3 border border-blue-200 bg-blue-50/30 rounded-lg">
                                                  <div className="flex justify-between items-start">
                                                    <div>
                                                      <p className="font-medium text-blue-900">{activity.taskType}</p>
                                                      <p className="text-sm text-blue-700">
                                                        {activity.completedAt ? new Date(activity.completedAt).toLocaleTimeString() : 'Pending'}
                                                      </p>
                                                      {activity.notes && (
                                                        <p className="text-sm text-blue-600 mt-1">{activity.notes}</p>
                                                      )}
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                      activity.status === 'completed' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                      {activity.status}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-muted-foreground py-4 text-center text-sm">No personal care activities logged for night shift</p>
                                          )}
                                        </div>

                                        {/* Night Activities Section */}
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 bg-green-600 rounded"></div>
                                            <h4 className="font-medium text-green-900">Night Activities</h4>
                                            <span className="text-sm text-muted-foreground">({dailyActivities.length})</span>
                                          </div>
                                          {dailyActivities.length > 0 ? (
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                              {dailyActivities
                                                .sort((a, b) => new Date(b.createdAt || b.completedAt).getTime() - new Date(a.createdAt || a.completedAt).getTime())
                                                .map((activity: any, index: number) => (
                                                <div key={index} className="p-3 border border-green-200 bg-green-50/30 rounded-lg">
                                                  <div className="flex justify-between items-start">
                                                    <div>
                                                      <p className="font-medium text-green-900">Night Activity Record</p>
                                                      <p className="text-sm text-green-700">
                                                        {activity.completedAt ? new Date(activity.completedAt).toLocaleTimeString() : 'Pending'}
                                                      </p>
                                                      {activity.notes && (
                                                        <p className="text-sm text-green-600 mt-1">{activity.notes}</p>
                                                      )}
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                      activity.status === 'completed' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                      {activity.status}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-muted-foreground py-4 text-center text-sm">No night activities logged for night shift</p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()
                                )
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button variant="ghost" size="sm" onClick={() => handleDownloadReport(date, 'night')} className="flex items-center text-xs sm:text-sm px-2 py-1">
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