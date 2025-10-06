"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const getTodayDate = () => {
  return format(new Date(), "d MMM yyyy, HH:mm");
};

const reports = [
  {
    id: 1,
    title: "Risk Assessment Audit.pdf",
    date: getTodayDate(),
  },
  {
    id: 2,
    title: "Nutrition Audit.pdf",
    date: getTodayDate(),
  },
  {
    id: 3,
    title: "Wound Audit.pdf",
    date: getTodayDate(),
  },
  {
    id: 4,
    title: "Falls Audit.pdf",
    date: getTodayDate(),
  },
  {
    id: 5,
    title: "Safeguarding Audit.pdf",
    date: getTodayDate(),
  },
];

export default function ResidentReportPage() {
  const router = useRouter();

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/managers-audit?tab=resident")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Residents Audit Report</p>
        <p className="text-sm text-muted-foreground">
          Comprehensive report for residents audits
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
