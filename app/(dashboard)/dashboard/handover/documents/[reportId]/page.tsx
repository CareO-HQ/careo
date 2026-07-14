"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatArchivedHandoverEvents } from "@/lib/handover-events-display";
import { formatMetaStatValue } from "@/lib/handover-meta";
import { formatResidentNameWithRoom } from "@/lib/handover-hospital-transfer";

interface ArchivedHandoverMeta {
  inCharge: string;
  totalBeds: number | null;
  vacantBeds: number | null;
  hospitalAdmissions: number | null;
  legacyHospital: string;
  legacyVacant: string;
  usesLegacyMeta: boolean;
}

function parseArchivedHandoverMeta(
  handoverData: Record<string, unknown> | null | undefined
): ArchivedHandoverMeta {
  const hasNewMeta =
    handoverData?.totalBeds !== undefined ||
    handoverData?.vacantBeds !== undefined ||
    handoverData?.hospitalAdmissions !== undefined;

  return {
    inCharge: String(handoverData?.inCharge || ""),
    totalBeds:
      handoverData?.totalBeds === null || handoverData?.totalBeds === undefined
        ? null
        : Number(handoverData.totalBeds),
    vacantBeds:
      handoverData?.vacantBeds === null || handoverData?.vacantBeds === undefined
        ? null
        : Number(handoverData.vacantBeds),
    hospitalAdmissions:
      handoverData?.hospitalAdmissions === null ||
      handoverData?.hospitalAdmissions === undefined
        ? null
        : Number(handoverData.hospitalAdmissions),
    legacyHospital: String(handoverData?.hospital || ""),
    legacyVacant: String(handoverData?.vacant || ""),
    usesLegacyMeta: !hasNewMeta,
  };
}

export default function HandoverReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.reportId as string;
  const { supabase } = useSupabase();
  const [report, setReport] = useState<{
    id: string;
    date: string;
    shift: string;
    teamName: string;
    residentHandovers: Record<string, unknown>[];
    createdByName: string;
    meta: ArchivedHandoverMeta;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          const handoverData =
            typeof data.handover_data === "string"
              ? JSON.parse(data.handover_data)
              : data.handover_data;

          setReport({
            id: data.id,
            date: data.date,
            shift: data.shift,
            teamName: handoverData?.teamName || "Unknown Team",
            residentHandovers: handoverData?.residentHandovers || [],
            createdByName: handoverData?.createdByName || "Unknown",
            meta: parseArchivedHandoverMeta(handoverData),
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

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full w-full bg-background">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">Loading handover report…</p>
          </div>
        </div>
      </div>
    );
  }

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-white">
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
                Handover Report — {format(new Date(report.date), "dd MMMM yyyy")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {report.teamName} · Created by {report.createdByName}
              </p>
            </div>
          </div>
          <Button onClick={handlePrint} size="sm" className="h-8">
            <Printer className="w-3 h-3 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto print:overflow-visible">
        <div className="max-w-[1400px] mx-auto bg-white print:max-w-full">
          <div className="border-b p-6 print:p-4">
            <h1 className="text-2xl font-bold text-center mb-4 print:text-xl uppercase">
              {report.teamName} HANDOVER SHEET
            </h1>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm max-w-4xl mx-auto mb-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">Date:</span>
                <span>{format(new Date(report.date), "dd/MM/yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">In charge:</span>
                <span>{report.meta.inCharge || "—"}</span>
              </div>
              {report.meta.usesLegacyMeta ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold min-w-[100px]">Hospital:</span>
                    <span>{report.meta.legacyHospital || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold min-w-[100px]">Vacant:</span>
                    <span>{report.meta.legacyVacant || "—"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold min-w-[100px]">Total beds:</span>
                    <span>{formatMetaStatValue(report.meta.totalBeds)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold min-w-[180px]">
                      Any hospital admissions:
                    </span>
                    <span>
                      {report.meta.hospitalAdmissions === null
                        ? "—"
                        : String(report.meta.hospitalAdmissions)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold min-w-[100px]">Vacant beds:</span>
                    <span>{formatMetaStatValue(report.meta.vacantBeds)}</span>
                  </div>
                </>
              )}
              <div className="col-span-2 flex items-center gap-2">
                <span className="font-semibold">Shift:</span>
                <span className="capitalize">{report.shift}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse border border-border">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border border-border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
                    Resident
                  </th>
                  <th className="border border-border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide min-w-[200px]">
                    Events
                  </th>
                  <th className="border border-border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide min-w-[220px]">
                    Handover Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.residentHandovers?.map((resident, index) => {
                  const eventRows = formatArchivedHandoverEvents(resident);
                  const toneClasses: Record<string, string> = {
                    muted: "text-muted-foreground",
                    success: "text-green-600",
                    warning: "text-amber-600",
                    danger: "text-red-600",
                    info: "text-blue-600",
                    default: "text-foreground",
                  };

                  return (
                    <tr
                      key={String(resident.residentId || resident.resident_id || index)}
                      className={cn(index % 2 === 1 && "bg-muted/20", "print:break-inside-avoid")}
                    >
                      <td className="border border-border px-3 py-2 align-top font-semibold text-sm">
                        {formatResidentNameWithRoom(
                          String(resident.residentName || resident.resident_name || "Unknown"),
                          String(resident.roomNumber || resident.room_number || "")
                        )}
                      </td>
                      <td className="border border-border px-3 py-2 align-top">
                        <div className="space-y-0.5">
                          {eventRows.map((row) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="text-muted-foreground shrink-0 w-[88px]">
                                {row.label}
                              </span>
                              <span className={cn("tabular-nums", toneClasses[row.tone])}>
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border border-border px-3 py-2 align-top text-sm whitespace-pre-wrap">
                        {String(resident.comments || "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
