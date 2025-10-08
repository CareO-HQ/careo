"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const reports = [
  {
    id: 1,
    title: "Q4 2024 Governance Compliance Report.pdf",
    date: "15 Dec 2025, 14:27",
  },
  {
    id: 2,
    title: "Q3 2024 Regulatory Audit Summary.pdf",
    date: "30 Sept 2025, 09:15",
  },
  {
    id: 3,
    title: "Q2 2024 Policy Compliance Review.pdf",
    date: "28 Jun 2025, 16:42",
  },
  {
    id: 4,
    title: "Q1 2024 Annual Governance Report.pdf",
    date: "31 Mar 2025, 11:30",
  },
];

export default function GovernanceReportPage() {
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
        <p className="font-semibold text-xl">Governance & Compliance Audit Report</p>
        <p className="text-sm text-muted-foreground">
          Comprehensive report for governance and compliance audits
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
