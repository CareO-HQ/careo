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
        if (doc.shift === 'AM') {
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
      
      // Separate activities into two sections
      const personalCareActivities = activities.filter(activity => activity.taskType !== 'daily_activity_record');
      const activityRecords = activities.filter(activity => activity.taskType === 'daily_activity_record');

      // Add content to container
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 28px; color: #2563eb; font-weight: bold;">Daily Care Report</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; color: #374151; font-weight: 600;">${fullName}</h2>
        </div>
        
        <!-- Resident Information & Shift Details -->
        <div style="margin-bottom: 30px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Care Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <div style="font-weight: 600; color: #374151; margin-bottom: 5px;">Date & Shift</div>
              <div style="color: #6b7280; font-size: 14px;">${new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
              <div style="color: #6b7280; font-size: 14px;">${shift} Shift</div>
            </div>
            <div>
              <div style="font-weight: 600; color: #374151; margin-bottom: 5px;">Activity Summary</div>
              <div style="color: #6b7280; font-size: 14px;">Personal Care: ${personalCareActivities.length}</div>
              <div style="color: #6b7280; font-size: 14px;">Activity Records: ${activityRecords.length}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; color: #9ca3af;">Total Activities: ${activities.length}</div>
            <div style="font-size: 12px; color: #9ca3af;">Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>
        
        ${activities.length > 0 ? `
          <!-- Personal Care Activities Section -->
          <div style="margin-bottom: 30px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">
              <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <span style="color: white; font-size: 12px; font-weight: bold;">👤</span>
              </div>
              <h3 style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 600;">Personal Care Activities</h3>
            </div>
            ${personalCareActivities.length > 0 ? `
              <div>
                ${personalCareActivities
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((activity, index) => `
                    <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #bfdbfe; border-radius: 8px; background: #eff6ff;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: #1e40af; font-size: 14px;">
                          ${index + 1}. ${activity.taskType}
                        </strong>
                        <span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">
                          ${activity.status}
                        </span>
                      </div>
                      ${activity.notes ? `<div style="margin-bottom: 8px; font-style: italic; color: #1e40af; font-size: 12px; padding: 5px 0;">${activity.notes}</div>` : ''}
                      <div style="font-size: 10px; color: #6b7280;">
                        Recorded: ${new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  `).join('')}
              </div>
            ` : `
              <div style="text-align: center; padding: 20px; background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e40af;">
                <div style="font-size: 14px; margin-bottom: 5px;">No personal care activities recorded</div>
                <div style="font-size: 11px;">No personal care activities were logged for this ${shift.toLowerCase()} shift.</div>
              </div>
            `}
          </div>

          <!-- Daily Activity Records Section -->
          <div style="margin-bottom: 30px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #10b981;">
              <div style="width: 24px; height: 24px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <span style="color: white; font-size: 12px; font-weight: bold;">📋</span>
              </div>
              <h3 style="margin: 0; color: #047857; font-size: 18px; font-weight: 600;">Daily Activity Records</h3>
            </div>
            ${activityRecords.length > 0 ? `
              <div>
                ${activityRecords
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((activity, index) => `
                    <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #a7f3d0; border-radius: 8px; background: #ecfdf5;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: #047857; font-size: 14px;">
                          ${index + 1}. Daily Activity Record
                        </strong>
                        <span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">
                          ${activity.status}
                        </span>
                      </div>
                      ${activity.notes ? `<div style="margin-bottom: 8px; font-style: italic; color: #047857; font-size: 12px; padding: 5px 0;">${activity.notes}</div>` : ''}
                      <div style="font-size: 10px; color: #6b7280;">
                        Recorded: ${new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  `).join('')}
              </div>
            ` : `
              <div style="text-align: center; padding: 20px; background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 8px; color: #047857;">
                <div style="font-size: 14px; margin-bottom: 5px;">No daily activity records</div>
                <div style="font-size: 11px;">No daily activity records were logged for this ${shift.toLowerCase()} shift.</div>
              </div>
            `}
          </div>
        ` : `
          <div style="text-align: center; padding: 40px 0; color: #6b7280; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div style="font-size: 18px; margin-bottom: 10px; font-weight: 600;">No activities recorded</div>
            <div style="font-size: 14px;">No care activities were logged for this ${shift.toLowerCase()} shift.</div>
          </div>
        `}
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center;">
          <div style="font-weight: 600; margin-bottom: 5px;">Generated by Care Management System</div>
          <div>${new Date().toISOString()} • Confidential Care Documentation</div>
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

              {/* Activities List - Split into Two Sections */}
              <div className="space-y-6">
                {/* Personal Care Activities Section */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-900">Personal Care Activities</h3>
                  </div>
                  {(() => {
                    const personalCareActivities = selectedDocument.activities.filter(activity => activity.taskType !== 'daily_activity_record');
                    return personalCareActivities.length > 0 ? (
                      <div className="space-y-3">
                        {personalCareActivities
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .map((activity, index) => (
                            <div key={`${activity._id}-${index}`} className="p-4 rounded-lg border border-blue-200 bg-blue-50/50">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-blue-900">
                                      {activity.taskType}
                                    </h5>
                                    <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                                      {activity.status}
                                    </Badge>
                                  </div>
                                  {activity.notes && (
                                    <p className="text-sm mb-2 text-blue-700">
                                      {activity.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-blue-600">
                                    Recorded at {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-blue-50/30 rounded-lg border border-blue-100">
                        <div className="flex justify-center mb-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <User className="w-6 h-6 text-blue-400" />
                          </div>
                        </div>
                        <p className="text-blue-600 font-medium mb-1 text-sm">No personal care activities</p>
                        <p className="text-xs text-blue-500">
                          No personal care activities were recorded for this shift
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Daily Activity Records Section */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Activity className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">Daily Activity Records</h3>
                  </div>
                  {(() => {
                    const activityRecords = selectedDocument.activities.filter(activity => activity.taskType === 'daily_activity_record');
                    return activityRecords.length > 0 ? (
                      <div className="space-y-3">
                        {activityRecords
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .map((activity, index) => (
                            <div key={`${activity._id}-${index}`} className="p-4 rounded-lg border border-green-200 bg-green-50/50">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <Activity className="w-4 h-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-green-900">
                                      Daily Activity Record
                                    </h5>
                                    <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                                      {activity.status}
                                    </Badge>
                                  </div>
                                  {activity.notes && (
                                    <p className="text-sm mb-2 text-green-700">
                                      {activity.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-green-600">
                                    Recorded at {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-green-50/30 rounded-lg border border-green-100">
                        <div className="flex justify-center mb-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <Activity className="w-6 h-6 text-green-400" />
                          </div>
                        </div>
                        <p className="text-green-600 font-medium mb-1 text-sm">No daily activity records</p>
                        <p className="text-xs text-green-500">
                          No daily activity records were logged for this shift
                        </p>
                      </div>
                    );
                  })()}
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