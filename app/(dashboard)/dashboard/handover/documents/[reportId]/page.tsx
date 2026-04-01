"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, AlertCircle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HandoverReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.reportId as string;
  const { supabase } = useSupabase();
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the specific handover report
  useEffect(() => {
    if (!reportId || !supabase) {
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        const { data, error } = await supabase
          .from("handover_reports")
          .select("*")
          .eq("id", reportId)
          .single();

        if (error) throw error;

        if (data) {
          // Parse handover_data JSONB field
          const handoverData = typeof data.handover_data === 'string'
            ? JSON.parse(data.handover_data)
            : data.handover_data;

          setReport({
            id: data.id,
            date: data.date,
            shift: data.shift,
            teamId: data.team_id,
            teamName: handoverData?.teamName || "Unknown Team",
            organizationId: handoverData?.organizationId || "",
            residentHandovers: handoverData?.residentHandovers || [],
            createdBy: data.created_by,
            createdByName: handoverData?.createdByName || "Unknown",
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : null,
            updatedByName: handoverData?.updatedByName || null,
            inCharge: handoverData?.inCharge || "",
            hospital: handoverData?.hospital || "",
            vacant: handoverData?.vacant || "",
          });
        } else {
          setReport(null);
        }
      } catch (error) {
        console.error("Error fetching handover report:", error);
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [reportId, supabase]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full w-full bg-background">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading handover report...</p>
          </div>
        </div>
      </div>
    );
  }

  // Report not found
  if (!report) {
    return (
      <div className="flex flex-col min-h-full w-full bg-background">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Report not found</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/dashboard/handover/documents")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isNightShift = report.shift === "night";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Controls */}
      <div className="border-b px-6 py-4 print:hidden bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/handover/documents")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                Handover Report - {format(new Date(report.date), "dd MMMM yyyy")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {report.teamName} • Created by {report.createdByName || "Unknown"}
              </p>
            </div>
          </div>
          <Button onClick={handlePrint} size="sm" className="h-8">
            <Printer className="w-3 h-3 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable Handover Sheet */}
      <div className="flex-1 overflow-auto print:overflow-visible">
        <div className="max-w-[1400px] mx-auto bg-white print:max-w-full">
          {/* Header Section */}
          <div className="border-b border-gray-300 p-6 print:p-4">
            <h1 className="text-2xl font-bold text-center mb-4 print:text-xl uppercase">
              {report.teamName} HANDOVER SHEET
            </h1>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm max-w-4xl mx-auto mb-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">Date:</span>
                <span className="border-b border-dotted border-gray-400 flex-1 px-2">
                  {format(new Date(report.date), "dd/MM/yyyy")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">In Charge:</span>
                <span className="border-b border-dotted border-gray-400 flex-1 px-2">
                  {report.inCharge || "—"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">Hospital:</span>
                <span className="border-b border-dotted border-gray-400 flex-1 px-2">
                  {report.hospital || "—"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">Vacant:</span>
                <span className="border-b border-dotted border-gray-400 flex-1 px-2">
                  {report.vacant || "—"}
                </span>
              </div>

              <div className="col-span-2 flex items-center gap-4 pt-2">
                <span className="font-semibold">Shift:</span>
                <div className="flex gap-10 items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={report.shift === "day"}
                      readOnly
                      className="w-4 h-4"
                    />
                    <span>Day</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={report.shift === "night"}
                      readOnly
                      className="w-4 h-4"
                    />
                    <span>Night</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Shift Summary Section */}
            <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto py-3 px-4 border-2 border-gray-200 rounded-lg bg-gray-50/50">
              <div className="text-center space-y-1 border-r border-gray-200">
                <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Total Incidents</div>
                <div className={cn(
                  "text-2xl font-black",
                  report.residentHandovers.reduce((sum: number, h: any) => sum + (h.incidentCount || h.incident_count || 0), 0) > 0 ? "text-red-600" : "text-gray-400"
                )}>
                  {report.residentHandovers.reduce((sum: number, h: any) => sum + (h.incidentCount || h.incident_count || 0), 0)}
                </div>
              </div>
              <div className="text-center space-y-1 border-r border-gray-200">
                <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Total Falls</div>
                <div className={cn(
                  "text-2xl font-black",
                  report.residentHandovers.reduce((sum: number, h: any) => sum + (h.fallCount || h.fall_count || 0), 0) > 0 ? "text-red-600" : "text-gray-400"
                )}>
                  {report.residentHandovers.reduce((sum: number, h: any) => sum + (h.fallCount || h.fall_count || 0), 0)}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Hospital Transport</div>
                <div className={cn(
                  "text-2xl font-black",
                  report.residentHandovers.reduce((sum: number, h: any) => sum + (h.hospitalTransferCount || h.hospital_transfer_count || h.hospitalTransferLogs?.length || 0), 0) > 0 ? "text-blue-600" : "text-gray-400"
                )}>
                  {report.residentHandovers.reduce((sum: number, h: any) => sum + (h.hospitalTransferCount || h.hospital_transfer_count || h.hospitalTransferLogs?.length || 0), 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-300">
            {/* Table Header */}
            <div className="grid grid-cols-[10%_50%_40%] border-b border-gray-300 bg-gray-100">
              <div className="border-r border-gray-300 p-3 font-bold text-center text-sm uppercase">
                ROOM NO
              </div>
              <div className="border-r border-gray-300 p-3 font-bold text-sm uppercase">
                RESIDENT DETAILS
              </div>
              <div className="p-3 font-bold text-sm uppercase">
                {report.shift.toUpperCase()} COMMENTS
              </div>
            </div>

            {/* Table Body */}
            {report.residentHandovers?.map((resident: any) => {
              const hasIncident = (resident.incidentCount || 0) > 0;
              const hasHospitalTransfer = (resident.hospitalTransferCount || 0) > 0;
              const foodIntakePercentage = Math.round((resident.foodIntakeCount / 3) * 100);

              return (
                <div key={resident.residentId} className="grid grid-cols-[10%_50%_40%] border-b border-gray-300 print:break-inside-avoid">
                  {/* Column 1: Room Number */}
                  <div className="border-r border-gray-300 p-4 flex items-center justify-center bg-gray-50">
                    <div className="text-lg font-bold text-center">
                      {resident.roomNumber || "—"}
                    </div>
                  </div>

                  {/* Column 2: Resident Details */}
                  <div className="border-r border-gray-300 p-4 space-y-3">
                    {/* Resident Name */}
                    <div className="font-bold text-base">
                      {resident.residentName}
                    </div>

                    {/* Auto-populated Data */}
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Food Intake Today:</span>
                        <span className={cn(
                          "font-semibold",
                          foodIntakePercentage >= 75 ? "text-green-600" :
                          foodIntakePercentage >= 50 ? "text-amber-600" : "text-red-600"
                        )}>
                          {Math.min(foodIntakePercentage, 100)}%
                        </span>
                      </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Fluid Intake:</span>
                          <span className={cn(
                            "font-semibold",
                            resident.totalFluid >= 1500 ? "text-green-600" :
                            resident.totalFluid >= 1000 ? "text-amber-600" : "text-red-600"
                          )}>
                            {resident.totalFluid} ml
                          </span>
                        </div>
                      </div>

                    {/* Indicators */}
                    {( (resident.incidentCount || resident.incident_count || 0) > 0 || (resident.fallCount || resident.fall_count || 0) > 0 || (resident.hospitalTransferCount || resident.hospital_transfer_count || 0) > 0) && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(resident.incidentCount || resident.incident_count || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Incident{(resident.incidentCount || resident.incident_count) > 1 ? `s - ${(resident.incidentCount || resident.incident_count)}` : ' - 1'}
                          </Badge>
                        )}
                        {(resident.fallCount || resident.fall_count || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Fall{(resident.fallCount || resident.fall_count) > 1 ? `s - ${(resident.fallCount || resident.fall_count)}` : ' - 1'}
                          </Badge>
                        )}
                        {(resident.hospitalTransferCount || resident.hospital_transfer_count || 0) > 0 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                            <Building2 className="w-3 h-3 mr-1" />
                            Hospital Transport{(resident.hospitalTransferCount || resident.hospital_transfer_count) > 1 ? `s - ${(resident.hospitalTransferCount || resident.hospital_transfer_count)}` : ' - 1'}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Comments */}
                  <div className="p-4 bg-white">
                    <div className="text-sm whitespace-pre-wrap min-h-[100px]">
                      {resident.comments || "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:max-w-full {
            max-width: 100% !important;
          }
          .border-gray-300 {
            border-color: #d1d5db !important;
          }
        }
      `}</style>
    </div>
  );
}
