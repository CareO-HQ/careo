"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Eye, Download } from "lucide-react";
import { format } from "date-fns";

// Mock archived audits data - in real implementation, this would come from the database
const getArchivedAudits = () => {
  return [
    {
      id: 1,
      title: "Risk Assessment Audit - December 2024",
      date: "18 Dec 2024, 11:50",
      auditor: "Sarah Johnson",
    },
    {
      id: 2,
      title: "Risk Assessment Audit - November 2024",
      date: "22 Nov 2024, 14:30",
      auditor: "Michael Chen",
    },
    {
      id: 3,
      title: "Risk Assessment Audit - October 2024",
      date: "12 Oct 2024, 09:45",
      auditor: "Emma Williams",
    },
    {
      id: 4,
      title: "Risk Assessment Audit - September 2024",
      date: "20 Sept 2024, 16:15",
      auditor: "Sarah Johnson",
    },
    {
      id: 5,
      title: "Risk Assessment Audit - August 2024",
      date: "15 Aug 2024, 10:20",
      auditor: "Michael Chen",
    },
    {
      id: 6,
      title: "Risk Assessment Audit - July 2024",
      date: "18 Jul 2024, 13:45",
      auditor: "Emma Williams",
    },
    {
      id: 7,
      title: "Risk Assessment Audit - June 2024",
      date: "20 Jun 2024, 11:30",
      auditor: "Sarah Johnson",
    },
    {
      id: 8,
      title: "Risk Assessment Audit - May 2024",
      date: "22 May 2024, 15:00",
      auditor: "Michael Chen",
    },
    {
      id: 9,
      title: "Risk Assessment Audit - April 2024",
      date: "18 Apr 2024, 09:15",
      auditor: "Emma Williams",
    },
    {
      id: 10,
      title: "Risk Assessment Audit - March 2024",
      date: "20 Mar 2024, 14:45",
      auditor: "Sarah Johnson",
    },
    {
      id: 11,
      title: "Risk Assessment Audit - February 2024",
      date: "22 Feb 2024, 10:30",
      auditor: "Michael Chen",
    },
    {
      id: 12,
      title: "Risk Assessment Audit - January 2024",
      date: "18 Jan 2024, 16:00",
      auditor: "Emma Williams",
    },
  ].slice(0, 12); // Maximum 12 audits
};

export default function ArchivedRiskAssessmentAuditsPage() {
  const router = useRouter();
  const archivedAudits = getArchivedAudits();

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/managers-audit/resident/risk-assessment-audit")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Archived Risk Assessment Audits</p>
        <p className="text-sm text-muted-foreground">
          View and download previously completed audits (maximum 12 shown)
        </p>
      </div>

      <div className="space-y-3">
        {archivedAudits.map((audit) => (
          <div
            key={audit.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <FileText className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{audit.title}</p>
              <p className="text-xs text-muted-foreground">
                Created: {audit.date} • Auditor: {audit.auditor}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
              <Download className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
