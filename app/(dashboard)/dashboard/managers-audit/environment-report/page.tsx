"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const reports = [
  {
    id: 1,
    title: "December 2024 Fire Safety Inspection.pdf",
    date: "18 Dec 2025, 11:50",
  },
  {
    id: 2,
    title: "Q4 2024 Legionella Risk Assessment.pdf",
    date: "22 Nov 2025, 14:30",
  },
  {
    id: 3,
    title: "October 2024 LOLER Equipment Audit.pdf",
    date: "12 Oct 2025, 09:45",
  },
  {
    id: 4,
    title: "Q3 2024 Environmental Safety Report.pdf",
    date: "20 Sept 2025, 16:15",
  },
];

export default function EnvironmentReportPage() {
  const router = useRouter();

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/managers-audit")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Environment & Safety Audit Report</p>
        <p className="text-sm text-muted-foreground">
          Comprehensive report for environment and safety audits
        </p>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <FileText className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm">
                {report.title}
                <span className="text-muted-foreground ml-2">Created: {report.date}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Download className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
