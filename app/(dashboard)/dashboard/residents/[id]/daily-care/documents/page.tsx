"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Sun,
  Moon,
  FileText,
  Eye,
  Download,
  Activity,
  User
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = React.useState<{
    date: string;
    shift: string;
    activities: any[];
  } | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false);
  
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get all daily care documents
  const allDailyCareDocuments = useQuery(api.personalCare.getAllPersonalCareRecords, {
    residentId: id as Id<"residents">
  });

  // Group documents by date and shift
  const groupedDocuments = React.useMemo(() => {
    if (!allDailyCareDocuments) return {};
    
    const grouped: Record<string, Record<string, any[]>> = {};
    
    allDailyCareDocuments.forEach((doc) => {
      const date = doc.date;
      // Handle different shift formats from backend
      let displayShift = 'Day'; // Default
      
      if (doc.shift) {
        if (doc.shift === 'AM' || doc.shift === 'Day') {
          displayShift = 'Day';
        } else if (doc.shift === 'Night' || doc.shift === 'PM') {
          displayShift = 'Night';
        }
      }
      
      if (!grouped[date]) {
        grouped[date] = {};
      }
      if (!grouped[date][displayShift]) {
        grouped[date][displayShift] = [];
      }
      
      grouped[date][displayShift].push(doc);
    });
    
    // Ensure each date has both Day and Night entries (even if empty)
    Object.keys(grouped).forEach(date => {
      if (!grouped[date]['Day']) {
        grouped[date]['Day'] = [];
      }
      if (!grouped[date]['Night']) {
        grouped[date]['Night'] = [];
      }
    });
    
    return grouped;
  }, [allDailyCareDocuments]);

  // Handle view document
  const handleViewDocument = (date: string, shift: string, activities: any[]) => {
    setSelectedDocument({ date, shift, activities });
    setIsViewDialogOpen(true);
  };

  // Handle download document
  const handleDownloadDocument = (date: string, shift: string, activities: any[]) => {
    const fullName = `${resident?.firstName} ${resident?.lastName}`;
    const filename = `${fullName}_Daily_Care_${shift}_${date.replace(/-/g, '_')}.pdf`;
    
    // Generate PDF using HTML canvas approach
    const generatePDF = () => {
      // Create a temporary container for PDF content
      const container = document.createElement('div');
      container.style.width = '210mm';
      container.style.padding = '20mm';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.fontSize = '12px';
      container.style.lineHeight = '1.4';
      container.style.color = '#000';
      container.style.backgroundColor = '#fff';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      
      // Add content to container
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; color: #2563eb;">Daily Care Report</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 18px; color: #666;">${fullName}</h2>
        </div>
        
        <div style="margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            <div><strong>Shift:</strong> ${shift}</div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div><strong>Total Activities:</strong> ${activities.length}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
          </div>
        </div>
        
        ${activities.length > 0 ? `
          <div>
            <h3 style="margin-bottom: 15px; color: #1f2937; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Activities & Records</h3>
            ${activities
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((activity, index) => {
                const isActivityRecord = activity.taskType === 'daily_activity_record';
                return `
                  <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: ${isActivityRecord ? '#f0f9ff' : '#fef3c7'};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <strong style="color: ${isActivityRecord ? '#0369a1' : '#92400e'};">
                        ${index + 1}. ${isActivityRecord ? 'Daily Activity Record' : activity.taskType}
                      </strong>
                      <span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px;">
                        ${activity.status}
                      </span>
                    </div>
                    ${activity.notes ? `<div style="margin-bottom: 8px; font-style: italic; color: #4b5563;">${activity.notes}</div>` : ''}
                    <div style="font-size: 10px; color: #6b7280;">
                      Recorded: ${new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                `;
              }).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 40px 0; color: #6b7280;">
            <div style="font-size: 16px; margin-bottom: 10px;">No activities recorded</div>
            <div style="font-size: 12px;">No care activities were logged for this ${shift.toLowerCase()} shift.</div>
          </div>
        `}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #6b7280; text-align: center;">
          Generated by Care Management System • ${new Date().toISOString()}
        </div>
      `;
      
      document.body.appendChild(container);
      
      // Use html2canvas and jsPDF approach, but since we don't have those libraries,
      // let's create a simpler HTML-based approach
      setTimeout(() => {
        // Create print window
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                @page { size: A4; margin: 0; }
                @media print { 
                  body { margin: 0; } 
                  .no-print { display: none; }
                }
                body { 
                  font-family: Arial, sans-serif; 
                  line-height: 1.4; 
                  color: #000;
                  margin: 0;
                  padding: 20mm;
                }
              </style>
            </head>
            <body>
              <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
                <button onclick="window.print()" style="margin-right: 10px; padding: 5px 10px;">Print/Save as PDF</button>
                <button onclick="window.close()" style="padding: 5px 10px;">Close</button>
              </div>
              ${container.innerHTML}
            </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
          printWindow.print();
        }, 500);
        
        document.body.removeChild(container);
      }, 100);
    };
    
    generatePDF();
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
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/residents/${id}/daily-care`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Daily Care
        </Button>
        <span>/</span>
        <span className="text-foreground">All Documents</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Daily Care Documents</h1>
              <p className="text-muted-foreground">All care records & documents for {fullName}</p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push(`/dashboard/residents/${id}/daily-care`)}
          className="flex items-center space-x-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Back to Daily Care</span>
        </Button>
      </div>

      {/* Daily Care Documents List */}
      {allDailyCareDocuments === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      ) : Object.keys(groupedDocuments).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No daily care documents found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(groupedDocuments)
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, shifts]) => (
                  <div key={date}>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="space-y-1 ml-4">
                      {['Day', 'Night'].map((shift) => {
                        const activities = shifts[shift] || [];
                        const hasActivities = activities.length > 0;
                        
                        return (
                          <div key={shift} className={`flex items-center justify-between p-2 rounded border hover:bg-gray-50 ${
                            !hasActivities ? 'opacity-50' : ''
                          }`}>
                            <div className="flex items-center space-x-2">
                              {shift === 'Night' ? (
                                <Moon className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Sun className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="text-sm">{shift} Shift</span>
                              <Badge variant={hasActivities ? "secondary" : "outline"} className="text-xs">
                                {activities.length}
                              </Badge>
                            </div>
                            <div className="flex space-x-1">
                              {hasActivities ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewDocument(date, shift, activities)}
                                    className="h-7 px-2"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadDocument(date, shift, activities)}
                                    className="h-7 px-2"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">No data</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>
                {selectedDocument && `${fullName} - ${selectedDocument.shift} Shift - ${
                  new Date(selectedDocument.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })
                }`}
              </span>
            </DialogTitle>
            <DialogDescription>
              Daily care activities and records for this shift
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-1">Total Activities</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedDocument.activities.length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-1">Completed</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedDocument.activities.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-1">Last Activity</h4>
                  <p className="text-lg font-semibold text-gray-600">
                    {new Date(Math.max(...selectedDocument.activities.map(a => a.createdAt))).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Activities List */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Activities & Records</h4>
                <div className="space-y-3">
                  {selectedDocument.activities
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((activity, index) => {
                      const isActivityRecord = activity.taskType === 'daily_activity_record';
                      return (
                        <div key={`${activity._id}-${index}`} className={`p-4 rounded-lg border ${
                          isActivityRecord 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-blue-200 bg-blue-50'
                        }`}>
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {isActivityRecord ? (
                                <Activity className="w-5 h-5 text-green-600" />
                              ) : (
                                <User className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className={`font-medium ${
                                  isActivityRecord ? 'text-green-800' : 'text-blue-800'
                                }`}>
                                  {isActivityRecord ? 'Daily Activity Record' : activity.taskType}
                                </h5>
                                <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                                  {activity.status}
                                </Badge>
                              </div>
                              {activity.notes && (
                                <p className={`text-sm mb-2 ${
                                  isActivityRecord ? 'text-green-700' : 'text-blue-700'
                                }`}>
                                  {activity.notes}
                                </p>
                              )}
                              <p className={`text-xs ${
                                isActivityRecord ? 'text-green-600' : 'text-blue-600'
                              }`}>
                                Recorded at {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => selectedDocument && handleDownloadDocument(
                    selectedDocument.date, 
                    selectedDocument.shift, 
                    selectedDocument.activities
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}