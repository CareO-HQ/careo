"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  User,
  Clock,
  FileText,
  Droplet,
  Utensils,
  AlertTriangle,
  Hospital,
  MessageSquare,
  Printer,
} from "lucide-react";

export default function HandoverReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.reportId as string;

  // Fetch the specific handover report
  const report = useQuery(
    api.handoverReports.getHandoverReportById,
    reportId ? { reportId: reportId as Id<"handoverReports"> } : "skip"
  );

  // Loading state
  if (report === undefined) {
    return (
      <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
        <div className="flex items-center justify-center h-full">
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
      <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
        <div className="flex items-center justify-center h-full">
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
    <>
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10 print:h-auto print:w-auto print:m-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 print:border-none">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/handover/documents")}
            className="h-8 w-8 print:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">
                Handover Report - {format(new Date(report.date), "dd MMMM yyyy")}
              </h1>
              <Badge
                variant="secondary"
                className={
                  isNightShift
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }
              >
                {isNightShift ? (
                  <Moon className="w-3 h-3 mr-1" />
                ) : (
                  <Sun className="w-3 h-3 mr-1" />
                )}
                {isNightShift ? "Night" : "Day"} Shift
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.teamName} • Created by {report.createdByName}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="h-8 print:hidden"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Report Info */}
      <div className="border-b px-6 py-3 bg-muted/30">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span>{format(new Date(report.createdAt), "dd/MM/yyyy HH:mm")}</span>
          </div>
          {report.updatedAt && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Updated:</span>
              <span>{format(new Date(report.updatedAt), "dd/MM/yyyy HH:mm")}</span>
              {report.updatedByName && <span>by {report.updatedByName}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 print:overflow-visible">
        <div className="max-w-6xl mx-auto space-y-6 border border-border/40 rounded-lg p-6 bg-background">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-2">
                <User className="h-4 w-4" />
                Residents
              </div>
              <div className="text-2xl font-bold">{report.residentHandovers.length}</div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-2">
                <AlertTriangle className="h-4 w-4" />
                Incidents
              </div>
              <div className="text-2xl font-bold">
                {report.residentHandovers.reduce((sum, r) => sum + r.incidentCount, 0)}
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-2">
                <Hospital className="h-4 w-4" />
                Transfers
              </div>
              <div className="text-2xl font-bold">
                {report.residentHandovers.reduce((sum, r) => sum + r.hospitalTransferCount, 0)}
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-2">
                <Droplet className="h-4 w-4" />
                Total Fluids
              </div>
              <div className="text-2xl font-bold">
                {report.residentHandovers.reduce((sum, r) => sum + r.totalFluid, 0)} ml
              </div>
            </div>
          </div>

          {/* Resident Details */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Resident Details</h2>
              <p className="text-sm text-muted-foreground">
                Detailed handover information for each resident
              </p>
            </div>
            <div className="space-y-6">
              {report.residentHandovers.map((resident, index) => (
                <div key={resident.residentId} className="bg-muted/20 rounded-lg p-4 border border-border/40">
                    {/* Resident Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{resident.residentName}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {resident.roomNumber && <span>Room {resident.roomNumber}</span>}
                          <span>Age {resident.age}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                        <Utensils className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">Food Intake</div>
                          <div className="font-semibold">{resident.foodIntakeCount}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                        <Droplet className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">Fluids</div>
                          <div className="font-semibold">{resident.totalFluid} ml</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">Incidents</div>
                          <div className="font-semibold">{resident.incidentCount}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                        <Hospital className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">Transfers</div>
                          <div className="font-semibold">{resident.hospitalTransferCount}</div>
                        </div>
                      </div>
                    </div>

                    {/* Food Intake Logs */}
                    {resident.foodIntakeLogs && resident.foodIntakeLogs.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Utensils className="h-3 w-3" />
                          Food Intake Logs
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Section</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resident.foodIntakeLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell>{format(new Date(log.timestamp), "HH:mm")}</TableCell>
                                <TableCell>{log.typeOfFoodDrink || "—"}</TableCell>
                                <TableCell>{log.amountEaten || "—"}</TableCell>
                                <TableCell>{log.section || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Fluid Logs */}
                    {resident.fluidLogs && resident.fluidLogs.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Droplet className="h-3 w-3" />
                          Fluid Intake Logs
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount (ml)</TableHead>
                              <TableHead>Section</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resident.fluidLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell>{format(new Date(log.timestamp), "HH:mm")}</TableCell>
                                <TableCell>{log.typeOfFoodDrink || "—"}</TableCell>
                                <TableCell>{log.fluidConsumedMl || 0} ml</TableCell>
                                <TableCell>{log.section || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Incidents */}
                    {resident.incidents && resident.incidents.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          Incidents
                        </h4>
                        <div className="space-y-2">
                          {resident.incidents.map((incident) => (
                            <div key={incident.id} className="rounded-lg p-3 bg-orange-50 dark:bg-orange-900/10">
                              <div className="flex items-center gap-2 mb-1">
                                {incident.type.map((type) => (
                                  <Badge key={type} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                              {incident.level && (
                                <div className="text-sm text-muted-foreground">Level: {incident.level}</div>
                              )}
                              {incident.time && (
                                <div className="text-sm text-muted-foreground">Time: {incident.time}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hospital Transfers */}
                    {resident.hospitalTransfers && resident.hospitalTransfers.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Hospital className="h-3 w-3" />
                          Hospital Transfers
                        </h4>
                        <div className="space-y-2">
                          {resident.hospitalTransfers.map((transfer) => (
                            <div key={transfer.id} className="rounded-lg p-3 bg-blue-50 dark:bg-blue-900/10">
                              {transfer.hospitalName && (
                                <div className="font-medium">{transfer.hospitalName}</div>
                              )}
                              {transfer.reason && (
                                <div className="text-sm text-muted-foreground mt-1">{transfer.reason}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {resident.comments && (
                      <div className="mb-2">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          Comments
                        </h4>
                        <div className="rounded-lg p-3 bg-muted/30">
                          <p className="text-sm whitespace-pre-wrap">{resident.comments}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
