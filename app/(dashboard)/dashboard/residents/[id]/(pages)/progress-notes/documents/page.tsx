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
  NotebookPen,
  Eye,
  Download,
  Calendar,
  User,
  Clock,
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
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProgressNotesDocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get all progress notes for this resident
  const progressNotes = useQuery(api.progressNotes.getByResidentId, {
    residentId: id as Id<"residents">
  });

  // Filter notes based on calendar selection and group by date
  const filteredAndGroupedNotes = React.useMemo(() => {
    if (!progressNotes) return {};
    
    let filtered = progressNotes;
    
    // Filter by calendar selection
    if (selectedDate) {
      const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter(note => note.date === selectedDateString);
    }
    
    // Group by date
    const grouped = filtered.reduce((acc: any, note: any) => {
      const date = note.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(note);
      return acc;
    }, {});

    // Sort dates in descending order
    const sortedDates = Object.keys(grouped).sort().reverse();
    const sortedGrouped: any = {};
    sortedDates.forEach(date => {
      sortedGrouped[date] = grouped[date].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return sortedGrouped;
  }, [progressNotes, selectedDate]);

  const handleViewNote = () => {
    // View note functionality handled by dialog
  };

  const handleDownloadNote = (note: any) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    const htmlContent = generatePDFContent(note, resident);
    generatePDFFromHTML(htmlContent, note);
    toast.success("Progress note will open for printing");
  };

  const handleDownloadDayReport = (date: string, notes: any[]) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    const htmlContent = generateDayReportContent(date, notes, resident);
    generatePDFFromHTML(htmlContent, { date, type: 'day-report' });
    toast.success("Daily progress notes report will open for printing");
  };

  const generatePDFContent = (note: any, resident: any) => {
    const formattedDate = new Date(note.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="header">
        <h1>Progress Note</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Time</h3>
          <p>${note.time}</p>
        </div>
        <div class="info-box">
          <h3>Type</h3>
          <p>${note.type.charAt(0).toUpperCase() + note.type.slice(1)}</p>
        </div>
        <div class="info-box">
          <h3>Author</h3>
          <p>${note.authorName}</p>
        </div>
      </div>

      <div class="note-content">
        <h2>Note Content</h2>
        <div class="note-text">
          ${note.note.replace(/\n/g, '<br>')}
        </div>
      </div>

      <div class="footer">
        <p>This note was created on ${format(new Date(note.createdAt), "PPP 'at' p")}</p>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
  };

  const generateDayReportContent = (date: string, notes: any[], resident: any) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const typeStats = notes.reduce((acc: any, note: any) => {
      acc[note.type] = (acc[note.type] || 0) + 1;
      return acc;
    }, {});

    return `
      <div class="header">
        <h1>Daily Progress Notes Report</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Report Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Total Notes</h3>
          <p>${notes.length}</p>
        </div>
        <div class="info-box">
          <h3>Room Number</h3>
          <p>${resident.roomNumber || 'N/A'}</p>
        </div>
        <div class="info-box">
          <h3>Generated</h3>
          <p>${new Date().toLocaleString()}</p>
        </div>
      </div>

      <div class="summary">
        <h2>Summary by Type</h2>
        <div class="summary-grid">
          ${Object.entries(typeStats).map(([type, count]) => `
            <div class="summary-item">
              <span class="number">${count}</span>
              <span class="label">${type.charAt(0).toUpperCase() + type.slice(1)} Notes</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="notes-list">
        <h2>Progress Notes</h2>
        ${notes.length > 0 
          ? notes.map((note: any) => `
              <div class="note-card">
                <div class="note-header">
                  <span class="note-type">${note.type.charAt(0).toUpperCase() + note.type.slice(1)}</span>
                  <span class="note-time">${note.time}</span>
                  <span class="note-author">${note.authorName}</span>
                </div>
                <div class="note-content">
                  ${note.note.replace(/\n/g, '<br>')}
                </div>
              </div>
            `).join('')
          : `<div style="text-align: center; padding: 40px; color: #64748B;">
               <p>No progress notes recorded for this date.</p>
             </div>`
        }
      </div>

      <div class="footer">
        <p>This report was automatically generated by the Care Management System.</p>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
  };

  const generatePDFFromHTML = (content: string, noteInfo: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const title = noteInfo.type === 'day-report' 
      ? `Daily Progress Notes - ${noteInfo.date}`
      : `Progress Note - ${noteInfo.type}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
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
              border-bottom: 2px solid #7C3AED;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #7C3AED;
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
              border-left: 4px solid #7C3AED;
            }
            .info-box h3 {
              margin: 0 0 8px 0;
              color: #7C3AED;
              font-size: 16px;
            }
            .info-box p {
              margin: 0;
              font-size: 14px;
              color: #64748B;
            }
            .summary {
              background: #F0F4FF;
              border: 1px solid #C7D2FE;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .summary h2 {
              color: #4338CA;
              margin: 0 0 15px 0;
              font-size: 18px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 15px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item .number {
              font-size: 24px;
              font-weight: bold;
              color: #4338CA;
              display: block;
            }
            .summary-item .label {
              font-size: 12px;
              color: #3730A3;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .note-content, .notes-list {
              margin-top: 30px;
            }
            .note-content h2, .notes-list h2 {
              color: #7C3AED;
              border-bottom: 1px solid #E2E8F0;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .note-text {
              background: #F8FAFC;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #7C3AED;
              white-space: pre-wrap;
              line-height: 1.6;
            }
            .note-card {
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
            }
            .note-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
              font-size: 12px;
              color: #64748B;
            }
            .note-type {
              background: #7C3AED;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: bold;
            }
            .note-content {
              color: #374151;
              line-height: 1.5;
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
            <button onclick="window.print()" style="padding: 10px 20px; background: #7C3AED; color: white; border: none; border-radius: 5px; cursor: pointer;">Print PDF</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6B7280; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
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
  const availableDates = Object.keys(filteredAndGroupedNotes);
  const totalNotes = Object.values(filteredAndGroupedNotes).flat().length;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Progress Notes Documents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              All archived progress notes for {fullName}
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
          {totalNotes} progress notes found across {availableDates.length} days
        </p>
      </div>

      {/* Notes List */}
      {progressNotes === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading progress notes...</p>
          </div>
        </div>
      ) : availableDates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <NotebookPen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {selectedDate ? "No progress notes found for this date" : "No progress notes found"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedDate ? "Try selecting a different date" : "Progress notes will appear here as they are created"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {availableDates.map((date) => {
            const notesForDate = filteredAndGroupedNotes[date];
            const formattedDate = new Date(date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            });

            return (
              <div key={date} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">{formattedDate}</span>
                    <Badge variant="outline" className="ml-2">
                      {notesForDate.length} notes
                    </Badge>
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDayReport(date, notesForDate)}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Day Report
                  </Button>
                </div>

                <div className="space-y-3">
                  {notesForDate.map((note: any) => (
                    <Card key={note._id} className="cursor-pointer shadow-none w-full">
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:gap-4">
                          {/* Icon and Text */}
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-md">
                              <NotebookPen className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm sm:text-base">
                                  {note.type.charAt(0).toUpperCase() + note.type.slice(1)} Note
                                </h3>
                                <Badge 
                                  variant={note.type === 'incident' ? 'destructive' : 
                                          note.type === 'medical' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {note.type}
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                {note.note}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {note.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {note.authorName}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleViewNote()} 
                                  className="flex items-center text-xs sm:text-sm px-2 py-1"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center space-x-2">
                                    <NotebookPen className="w-5 h-5 text-purple-600" />
                                    <span className="text-sm sm:text-base">
                                      {note.type.charAt(0).toUpperCase() + note.type.slice(1)} Progress Note
                                    </span>
                                  </DialogTitle>
                                  <DialogDescription>
                                    Created on {format(new Date(note.date), "PPP")} at {note.time}
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div>
                                      <h4 className="font-medium text-purple-800">Type</h4>
                                      <p className="text-sm text-purple-700">{note.type}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-purple-800">Time</h4>
                                      <p className="text-sm text-purple-700">{note.time}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-purple-800">Author</h4>
                                      <p className="text-sm text-purple-700">{note.authorName}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-purple-800">Created</h4>
                                      <p className="text-sm text-purple-700">
                                        {format(new Date(note.createdAt), "PPp")}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="font-medium">Note Content</h4>
                                    <div className="p-4 bg-gray-50 border rounded-lg">
                                      <p className="whitespace-pre-wrap text-sm">{note.note}</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDownloadNote(note)} 
                              className="flex items-center text-xs sm:text-sm px-2 py-1"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}