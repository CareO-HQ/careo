"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Sun,
  Moon,
  Eye,
  FileText,
} from "lucide-react";

export default function HandoverDocumentsPage() {
  const router = useRouter();
  const { activeTeamId } = useActiveTeam();

  // Fetch handover reports from Convex
  const handovers = useQuery(
    api.handoverReports.getHandoverReportsByTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Group handovers by date
  const groupedHandovers = useMemo(() => {
    if (!handovers) return [];

    // Group by date
    const grouped = handovers.reduce((acc: any, handover: any) => {
      const date = handover.date;
      if (!acc[date]) {
        acc[date] = { date, day: null, night: null };
      }
      if (handover.shift === "day") {
        acc[date].day = handover;
      } else {
        acc[date].night = handover;
      }
      return acc;
    }, {});

    let filtered = Object.values(grouped);

    // Sort by date descending
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [handovers]);

  // Loading state
  if (handovers === undefined) {
    return (
      <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading handover reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <h1 className="text-xl font-semibold">Handover History</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/handover")}
            className="h-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Handover
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <Badge variant="outline" className="rounded-sm">
          {groupedHandovers.length} Reports
        </Badge>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-12">
                <input type="checkbox" className="rounded border-gray-300" />
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Date</span>
                </div>
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Day Shift</span>
                </div>
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Night Shift</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedHandovers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 font-medium">No handover reports found</p>
                    <p className="text-gray-400 text-sm mt-1">No handover reports recorded yet</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              groupedHandovers.map((item: any) => (
                <TableRow key={item.date} className="hover:bg-muted/50">
                  <TableCell>
                    <input type="checkbox" className="rounded border-gray-300" />
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(item.date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {item.day ? (
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-300 rounded-sm">
                        <Sun className="w-3 h-3 mr-1" />
                        Day Report
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.night ? (
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-300 rounded-sm">
                        <Moon className="w-3 h-3 mr-1" />
                        Night Report
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>
    </div>
  );
}
