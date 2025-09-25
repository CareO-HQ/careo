"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Calendar, User, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { AuditItem, ReportContent } from "./types";

interface ReportDetailDialogProps {
  item: AuditItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getRiskLevelColor = (level: "Low" | "Medium" | "High") => {
  switch (level) {
    case "Low":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "High":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "Care Plan":
      return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
    case "Risk Assessment":
      return "bg-rose-100 text-rose-800 hover:bg-rose-100";
    case "Incident Report":
      return "bg-amber-100 text-amber-800 hover:bg-amber-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

export function ReportDetailDialog({ item, open, onOpenChange }: ReportDetailDialogProps) {
  if (!item) return null;

  const { reportContent } = item;

  // Show placeholder content if no report content exists
  const defaultContent: ReportContent = {
    summary: "Report content is currently being processed or not available. This is a placeholder summary for demonstration purposes.",
    findings: [
      "Assessment pending completion",
      "Additional documentation required",
      "Follow-up review scheduled"
    ],
    recommendations: [
      "Complete pending assessments",
      "Schedule follow-up review",
      "Update care documentation"
    ],
    riskLevel: "Medium",
    nextReviewDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    assessor: "System Generated",
    completedDate: format(new Date(), "yyyy-MM-dd")
  };

  const content = reportContent || defaultContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold leading-tight">
                {item.title}
              </DialogTitle>
              <DialogDescription className="text-base">
                Detailed report for {item.residentName}
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge className={getTypeColor(item.type)} variant="secondary">
                {item.type}
              </Badge>
              {content.riskLevel && (
                <Badge className={getRiskLevelColor(content.riskLevel)} variant="secondary">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {content.riskLevel} Risk
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Report Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Summary
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 leading-relaxed">
                  {content.summary}
                </p>
              </div>
            </div>

            <Separator />

            {/* Findings */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Key Findings
              </h3>
              <div className="space-y-2">
                {content.findings.map((finding, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-gray-700">{finding}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Recommendations */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                Recommendations
              </h3>
              <div className="space-y-2">
                {content.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Report Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Report Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Assessor:</span>
                    <span className="text-sm font-medium">{content.assessor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Completed:</span>
                    <span className="text-sm font-medium">{content.completedDate}</span>
                  </div>
                  {content.nextReviewDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Next Review:</span>
                      <span className="text-sm font-medium">{content.nextReviewDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Resident Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium ml-2">{item.residentName}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">ID:</span>
                    <span className="text-sm font-medium ml-2">{item.residentId}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Priority:</span>
                    <Badge variant="outline" className="ml-2">
                      {item.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Associated Files */}
            {item.files && item.files.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Associated Files</h3>
                  <div className="space-y-2">
                    {item.files.map((file) => (
                      <div key={file.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium flex-1">{file.name}</span>
                        <span className="text-xs text-gray-500">PDF</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}