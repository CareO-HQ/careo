"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AuditReportPageProps = {
  params: Promise<{ id: string }>;
};

const reports = [
  {
    id: 1,
    title: "December 2024 Care File Assessment.pdf",
    date: "22 Dec 2025, 11:27",
  },
  {
    id: 2,
    title: "November 2024 Medication Audit.pdf",
    date: "18 Nov 2025, 14:15",
  },
  {
    id: 3,
    title: "October 2024 Nutrition & Weight Monitoring.pdf",
    date: "25 Oct 2025, 09:30",
  },
  {
    id: 4,
    title: "September 2024 Resident Experience Survey.pdf",
    date: "15 Sept 2025, 16:45",
  },
];

export default function AuditReportPage({ params }: AuditReportPageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  // Get resident data
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
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
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/resident-audit/${id}/audit`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <p className="font-semibold text-xl">Resident Audit Report</p>
          <p className="text-sm text-muted-foreground">
            Audit reports for {fullName}
          </p>
        </div>

        {/* Resident Avatar and Name */}
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={resident.imageUrl}
              alt={fullName}
              className="border"
            />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{fullName}</p>
            <p className="text-xs text-muted-foreground">Room {resident.roomNumber || "N/A"}</p>
          </div>
        </div>
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
