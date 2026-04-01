"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Ambulance, ClipboardList, FolderOpen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { hospitalTransferService } from "@/lib/hospital-transfer-service";
import { ViewPassportInline } from "../view-passport-inline";
import { ViewTransferLogInline } from "../view-transfer-log-inline";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";

type RecordsPageProps = {
  params: Promise<{ id: string }>;
};

export default function HospitalTransferRecordsPage({ params }: RecordsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { isLoading: isProfileLoading } = useProfile();

  const [resident, setResident] = useState<any>(null);
  const [passports, setPassports] = useState<any[]>([]);
  const [transferLogs, setTransferLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecords() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [residentData, passportData, logData] = await Promise.all([
          hospitalTransferService.getResidentWithContacts(id),
          hospitalTransferService.getPassportsByResidentId(id),
          hospitalTransferService.getTransferLogsByResidentId(id),
        ]);
        setResident(residentData);
        setPassports(passportData);
        setTransferLogs(logData);
      } catch (error) {
        console.error("Error loading historical records:", error);
        toast.error("Failed to load historical records");
      } finally {
        setIsLoading(false);
      }
    }
    loadRecords();
  }, [id]);

  const fullName = `${resident?.firstName || ""} ${resident?.lastName || ""}`.trim();

  const formatDate = (dateValue: string | number | Date) => {
    if (!dateValue) return "Not specified";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString("en-GB", { timeZone: "Europe/London" });
  };

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center animate-in fade-in duration-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading historical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 w-full relative min-h-[calc(100vh-theme(spacing.24))] bg-muted/5">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background border-b flex-shrink-0">
        <button
          onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer` as any)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground overflow-hidden">
          <span className="hover:text-foreground cursor-pointer whitespace-nowrap" onClick={() => router.push(`/dashboard/residents/${id}` as any)}>Residents</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="hover:text-foreground cursor-pointer truncate" onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer` as any)}>{fullName}</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="hover:text-foreground cursor-pointer whitespace-nowrap" onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer` as any)}>Hospital Transfer</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-medium text-foreground whitespace-nowrap">Records History</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-primary" />
                Transfer History & Passports
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                View all past hospital passports and transfer logs for {fullName}.
              </p>
            </div>
          </div>

          <Tabs defaultValue="transfer-logs" className="w-full">
            <TabsList className="bg-muted/50 w-full sm:w-auto p-1 border">
              <TabsTrigger value="transfer-logs" className="flex items-center gap-2 px-6">
                <ClipboardList className="w-4 h-4" />
                Transfer Logs ({transferLogs.length})
              </TabsTrigger>
              <TabsTrigger value="passports" className="flex items-center gap-2 px-6">
                <Ambulance className="w-4 h-4" />
                Hospital Passports ({passports.length})
              </TabsTrigger>
            </TabsList>

            {/* Transfer Logs Tab */}
            <TabsContent value="transfer-logs" className="mt-6 space-y-6">
              {transferLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-2xl border border-dashed shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No Transfer Logs</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    There are no recorded hospital transfer logs for this resident yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {transferLogs.map((log) => (
                    <div key={log._id} className="bg-background rounded-2xl border shadow-sm p-6 overflow-hidden">
                      <div className="flex items-center justify-between border-b pb-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-primary/10 rounded-xl">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg leading-tight">{log.hospitalName || "Hospital Transfer"}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {formatDate(log.date)} {log.time ? `at ${log.time}` : ""}
                            </p>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9">
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none rounded-2xl bg-muted/5">
                            <DialogHeader className="px-6 py-4 bg-background border-b sticky top-0 z-10">
                              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <ClipboardList className="w-5 h-5 text-primary" /> Transfer Log Details
                              </DialogTitle>
                            </DialogHeader>
                            <div className="p-6 bg-background">
                              <div className="view-records-readonly-wrapper">
                                <ViewTransferLogInline 
                                  log={log} 
                                  formatDate={formatDate}
                                  onEdit={() => {}} 
                                  onDelete={() => {}} 
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Passports Tab */}
            <TabsContent value="passports" className="mt-6 space-y-6">
              {passports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-2xl border border-dashed shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Ambulance className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No Passports</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    There are no hospital passports recorded for this resident yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {passports.map((passport) => (
                    <div key={passport._id} className="bg-background rounded-2xl border shadow-sm p-6 overflow-hidden">
                      <div className="flex items-center justify-between border-b pb-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-primary/10 rounded-xl">
                            <Ambulance className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg leading-tight">Hospital Passport</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Created on {formatDate(passport.createdAt || passport._creationTime)}
                            </p>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9">
                              <Eye className="w-4 h-4 mr-2" /> View Passport
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none rounded-2xl bg-muted/5">
                            <DialogHeader className="px-6 py-4 bg-background border-b sticky top-0 z-10">
                              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Ambulance className="w-5 h-5 text-primary" /> Hospital Passport (SBAR)
                              </DialogTitle>
                            </DialogHeader>
                            <div className="p-6 md:p-10 bg-background">
                              <div className="view-records-readonly-wrapper">
                                <ViewPassportInline 
                                  passport={passport} 
                                  resident={resident}
                                  onEdit={() => {}} 
                                  onDelete={() => {}}
                                  onPrint={() => {}}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* CSS to hide the action buttons inside the view components */}
      <style dangerouslySetInnerHTML={{__html: `
        .view-records-readonly-wrapper .border-t.pt-6 {
          display: none !important;
        }
        .view-records-readonly-wrapper .flex.justify-end.gap-3.pt-6 {
          display: none !important;
        }
      `}} />
    </div>
  );
}
