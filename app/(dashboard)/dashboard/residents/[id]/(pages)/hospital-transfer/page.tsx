"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { HospitalPassportSchema, HospitalPassportFormData } from "./types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Ambulance,
  User,
  Calendar,
  Plus,
  Eye,
  Phone,
  AlertTriangle,
  FileText,
  Shield,
  Printer,
  Edit,
  FileCheck,
  Trash2,
  Pill,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cross,
  Download,
  PanelRight,
  PanelRightClose,
  X,
  Clock,
  CircleDashed,
  Map as MapIcon,
  History,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { HospitalPassportInlineForm } from "./hospital-passport-inline-form";
import { ViewPassportInline } from "./view-passport-inline";
import { TransferLogInlineForm } from "./transfer-log-inline-form";
import { ViewTransferLogInline } from "./view-transfer-log-inline";
import { HospitalPassportCard } from "./hospital-passport-card";
import { hospitalTransferService } from "@/lib/hospital-transfer-service";
import {
  insertHospitalPassportNotification,
  insertHospitalTransferLogNotification,
} from "@/lib/notifications";
import { BodyMapWorkspace } from "@/components/body-map/BodyMapWorkspace";
import { BodyMapData } from "@/types/body-map";
import { generateBodyMapPDF } from "@/lib/body-map-pdf-utils";
import { generatePassportPDF } from "@/lib/hospital-passport-pdf-utils";
import KardexModal from "@/components/medication/KardexModal";
import { enrichMedicationsWithKardexStaffNames } from "@/lib/medication/kardex-staff-names";

type HospitalTransferPageProps = {
  params: Promise<{ id: string }>;
};

export default function HospitalTransferPage({ params }: HospitalTransferPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { activeOrganization, activeOrganizationId } = useActiveTeam();
  const { supabase } = useSupabase();
  const [orgLogoUrl, setOrgLogoUrl] = React.useState<string | undefined>(undefined);

  // Fetch org logo_url
  React.useEffect(() => {
    if (!activeOrganizationId || !supabase) return;
    supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', activeOrganizationId)
      .single()
      .then(({ data }) => {
        if (data?.logo_url) setOrgLogoUrl(data.logo_url);
      });
  }, [activeOrganizationId, supabase]);

  // State for data
  const [resident, setResident] = useState<any>(null);
  const [dietInformation, setDietInformation] = useState<any>(null);
  const [hospitalPassports, setHospitalPassports] = useState<any[]>([]);
  const [transferLogs, setTransferLogs] = useState<any[]>([]);
  const [residentBodyMaps, setResidentBodyMaps] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [kardexStaffUsers, setKardexStaffUsers] = useState<
    Array<{ id: string; name: string | null; email: string | null }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState<{ type: 'passport' | 'transfer-log' | 'body-map' | 'kardex', id: string | 'new', data?: any } | null>(null);
  const [isEditingPassport, setIsEditingPassport] = useState(false);
  const [isViewingFullPassport, setIsViewingFullPassport] = useState(false);
  const [isEditingTransferLog, setIsEditingTransferLog] = useState(false);
  const [editingTransferLog, setEditingTransferLog] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog states for deletion
  const [showDeletePassportDialog, setShowDeletePassportDialog] = useState(false);
  const [passportToDelete, setPassportToDelete] = useState<any>(null);
  const [showDeleteTransferLogDialog, setShowDeleteTransferLogDialog] = useState(false);
  const [transferLogToDelete, setTransferLogToDelete] = useState<any>(null);
  const [showDeleteBodyMapDialog, setShowDeleteBodyMapDialog] = useState(false);
  const [bodyMapToDelete, setBodyMapToDelete] = useState<any>(null);
  const deeplinkHandledRef = React.useRef<string | null>(null);

  // Fetch data on load
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [residentData, dietData, passportData, logData, bodyMapData, { data: medsData }] = await Promise.all([
          hospitalTransferService.getResidentWithContacts(id),
          hospitalTransferService.getDietInformation(id),
          hospitalTransferService.getPassportsByResidentId(id),
          hospitalTransferService.getTransferLogsByResidentId(id),
          hospitalTransferService.getBodyMapsByResidentId(id),
          supabase.from("medications").select("*").eq("resident_id", id)
        ]);
        setResident(residentData);
        setDietInformation(dietData);
        setHospitalPassports(passportData);
        setTransferLogs(logData);
        setResidentBodyMaps(bodyMapData);
        setMedications(medsData || []);
      } catch (error) {
        console.error("Error loading hospital transfer data:", error);
        toast.error("Failed to load resident data");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, supabase]);

  useEffect(() => {
    if (isLoading) return;

    const open = searchParams.get("open");
    const logId = searchParams.get("logId");
    const edit = searchParams.get("edit");

    if (open !== "transfer-log" || !logId) {
      deeplinkHandledRef.current = null;
      return;
    }

    const deeplinkKey = `${logId}:${edit ?? ""}`;
    if (deeplinkHandledRef.current === deeplinkKey) return;

    const log = transferLogs.find((entry) => entry._id === logId);
    if (!log) {
      toast.error("Transfer log not found");
      router.replace(`/dashboard/residents/${id}/hospital-transfer`);
      return;
    }

    deeplinkHandledRef.current = deeplinkKey;
    setActiveItem({ type: "transfer-log", id: log._id, data: log });
    if (edit === "1") {
      setEditingTransferLog(log);
      setIsEditingTransferLog(true);
    }

    router.replace(`/dashboard/residents/${id}/hospital-transfer`);
  }, [isLoading, searchParams, transferLogs, id, router]);

  useEffect(() => {
    if (!activeOrganizationId || !supabase) {
      setKardexStaffUsers([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("users")
      .select("id, name, email")
      .eq("active_organization_id", activeOrganizationId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[HospitalTransfer] Failed to load users for Kardex:", error);
          setKardexStaffUsers([]);
        } else {
          setKardexStaffUsers((data ?? []) as Array<{ id: string; name: string | null; email: string | null }>);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, supabase]);

  const medicationsForKardex = useMemo(
    () => enrichMedicationsWithKardexStaffNames(medications, kardexStaffUsers),
    [medications, kardexStaffUsers]
  );

  // Refresh data helper
  const refreshData = async () => {
    try {
      const [passportData, logData, bodyMapData] = await Promise.all([
        hospitalTransferService.getPassportsByResidentId(id),
        hospitalTransferService.getTransferLogsByResidentId(id),
        hospitalTransferService.getBodyMapsByResidentId(id)
      ]);
      setHospitalPassports(passportData);
      setTransferLogs(logData);
      setResidentBodyMaps(bodyMapData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const notifyHospitalPassportSaved = async (
    passportRow: { id: string },
    isVersionUpdate: boolean
  ) => {
    if (!resident || !profile?.id || !activeOrganizationId) return;
    const displayName =
      [resident.firstName, resident.lastName].filter(Boolean).join(" ").trim() ||
      [resident.first_name, resident.last_name].filter(Boolean).join(" ").trim() ||
      "Resident";
    try {
      await insertHospitalPassportNotification(supabase, {
        organizationId: activeOrganizationId,
        careHomeId: resident.care_home_id ?? null,
        teamId: resident.team_id ?? null,
        residentId: id,
        passportId: passportRow.id,
        residentDisplayName: displayName,
        senderId: profile.id,
        senderName: profile.name || profile.email || "Unknown",
        isVersionUpdate,
      });
      window.dispatchEvent(new CustomEvent("sidebar-counts-refresh"));
    } catch (notifError) {
      console.error("Failed to create hospital passport notification:", notifError);
    }
  };

  const notifyHospitalTransferLogCreated = async (
    transferLogRow: { id: string; hospital_name?: string | null; date?: string | null }
  ) => {
    if (!resident || !profile?.id || !activeOrganizationId) return;
    const displayName =
      [resident.firstName, resident.lastName].filter(Boolean).join(" ").trim() ||
      [resident.first_name, resident.last_name].filter(Boolean).join(" ").trim() ||
      "Resident";

    try {
      await insertHospitalTransferLogNotification(supabase, {
        organizationId: activeOrganizationId,
        careHomeId: resident.care_home_id ?? null,
        teamId: resident.team_id ?? null,
        residentId: id,
        transferLogId: transferLogRow.id,
        residentDisplayName: displayName,
        senderId: profile.id,
        senderName: profile.name || profile.email || "Unknown",
        hospitalName: transferLogRow.hospital_name ?? null,
        transferDate: transferLogRow.date ?? null,
      });
      window.dispatchEvent(new CustomEvent("sidebar-counts-refresh"));
    } catch (notifError) {
      console.error("Failed to create hospital transfer log notification:", notifError);
    }
  };

  const formatDate = (dateValue: string | number | Date) => {
    if (!dateValue) return "Not specified";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
  };

  const handlePrintPassport = async (passport: any) => {
    if (!passport) return;
    try {
      await generatePassportPDF({ passport, resident, orgLogoUrl });
      toast.success("Passport PDF generated");
    } catch (error) {
      console.error("Error generating passport PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleEditTransferLog = (log: any) => {
    setEditingTransferLog(log);
    setIsEditingTransferLog(true);
    setActiveItem({ type: 'transfer-log', id: log._id, data: log });
  };

  const handleDeleteTransferLog = (log: any) => {
    setTransferLogToDelete(log);
    setShowDeleteTransferLogDialog(true);
  };

  const confirmDeleteTransferLog = async () => {
    if (!transferLogToDelete) return;
    setIsDeleting(true);
    try {
      await hospitalTransferService.deleteTransferLog(transferLogToDelete._id);
      toast.success("Transfer log deleted");
      setShowDeleteTransferLogDialog(false);
      if (activeItem?.id === transferLogToDelete._id) setActiveItem(null);
      refreshData();
    } catch (error) {
      toast.error("Failed to delete log");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (data: HospitalPassportFormData) => {
    if (!activeOrganizationId || !profile?.id) return;
    const savingToast = toast.loading("Creating new passport version...");
    try {
      // Any "Edit" now technically creates a new version while archiving the old one
      const inserted = await hospitalTransferService.createPassport({
        ...data,
        residentId: id,
        organizationId: activeOrganizationId,
        createdBy: profile.id
      });
      await notifyHospitalPassportSaved({ id: inserted.id }, true);
      toast.success("Passport version updated", { id: savingToast });
      setIsEditingPassport(false);
      setActiveItem(null); // Return to list/placeholder or maybe select the new one? Null is safer.
      refreshData();
    } catch (error) {
      toast.error("Failed to create new version", { id: savingToast });
    }
  };

  const handleDeletePassport = (passport: any) => {
    setPassportToDelete(passport);
    setShowDeletePassportDialog(true);
  };

  const confirmDeletePassport = async () => {
    if (!passportToDelete) return;
    setIsDeleting(true);
    try {
      await hospitalTransferService.deletePassport(passportToDelete._id);
      toast.success("Passport deleted");
      setShowDeletePassportDialog(false);
      if (activeItem?.id === passportToDelete._id) setActiveItem(null);
      refreshData();
    } catch (error) {
      toast.error("Failed to delete passport");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (data: HospitalPassportFormData) => {
    if (!activeOrganizationId || !profile?.id) return;
    const creatingToast = toast.loading("Creating passport...");
    try {
      const inserted = await hospitalTransferService.createPassport({
        ...data,
        residentId: id,
        organizationId: activeOrganizationId,
        createdBy: profile.id
      });
      await notifyHospitalPassportSaved({ id: inserted.id }, false);
      toast.success("Passport created successfully", { id: creatingToast });
      setActiveItem(null);
      refreshData();
    } catch (error) {
      toast.error("Failed to create passport", { id: creatingToast });
    }
  };

  const handleTransferLogSubmit = async (data: any) => {
    if (!activeOrganizationId || !profile?.id) return;
    const savingToast = toast.loading("Saving transfer log...");
    try {
      if (isEditingTransferLog && editingTransferLog) {
        await hospitalTransferService.updateTransferLog(editingTransferLog._id, data);
        toast.success("Transfer log updated", { id: savingToast });
      } else {
        const createdLog = await hospitalTransferService.createTransferLog({
          ...data,
          residentId: id,
          organizationId: activeOrganizationId,
          createdBy: profile.id,
        });
        await notifyHospitalTransferLogCreated(createdLog);
        toast.success("Transfer log created", { id: savingToast });
      }
      setIsEditingTransferLog(false);
      setEditingTransferLog(null);
      setActiveItem(null);
      refreshData();
    } catch (error) {
      toast.error("Failed to save transfer log", { id: savingToast });
    }
  };

  const handleBodyMapSave = async (bodyMapData: BodyMapData) => {
    if (!activeOrganizationId || !profile?.id) return;
    try {
      const sessionLabel = bodyMapData.sessions?.[bodyMapData.sessions.length - 1]?.label || `Body Map ${new Date().toLocaleDateString()}`;
      if (activeItem?.id !== 'new') {
        await hospitalTransferService.updateBodyMap(activeItem!.id, { bodyMapData, label: sessionLabel });
      } else {
        await hospitalTransferService.createBodyMap({
          residentId: id,
          date: new Date().toISOString().split('T')[0],
          label: sessionLabel,
          bodyMapData,
          organizationId: activeOrganizationId,
          createdBy: profile.id
        });
      }
      setActiveItem(null);
      refreshData();
      toast.success("Body map saved");
    } catch (error) {
      toast.error("Failed to save body map");
    }
  };

  const confirmDeleteBodyMap = async () => {
    if (!bodyMapToDelete) return;
    setIsDeleting(true);
    try {
      await hospitalTransferService.deleteBodyMap(bodyMapToDelete._id);
      toast.success("Body map deleted");
      setShowDeleteBodyMapDialog(false);
      if (activeItem?.id === bodyMapToDelete._id) setActiveItem(null);
      refreshData();
    } catch (error) {
      toast.error("Failed to delete body map");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadBodyMap = async (bm: any) => {
    try {
      await generateBodyMapPDF({
        residentName: fullName,
        incidentDate: bm.date,
        incidentType: "Hospital Passport Documentation",
        currentSession: bm.bodyMapData.sessions[0],
        orgLogoUrl
      });
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const fullName = `${resident?.firstName || ""} ${resident?.lastName || ""}`.trim();

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center animate-in fade-in duration-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Preparing clinical workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 w-full relative h-[calc(100vh-theme(spacing.24))]">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background border-b flex-shrink-0">
        <button
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground overflow-hidden">
          <span className="hover:text-foreground cursor-pointer whitespace-nowrap" onClick={() => router.push(`/dashboard/residents/${id}`)}>Residents</span> 
          <span className="text-muted-foreground/30">/</span> 
          <span className="hover:text-foreground cursor-pointer truncate" onClick={() => setActiveItem(null)}>{fullName}</span> 
          <span className="text-muted-foreground/30">/</span> 
          <span className="font-medium text-foreground whitespace-nowrap">Hospital Transfer</span>
          {activeItem && (
            <>
              <span className="text-muted-foreground/30">/</span>
              <span className="text-foreground font-medium whitespace-nowrap">
                {activeItem.type === 'passport' ? 'Hospital Passport' :
                 activeItem.type === 'transfer-log' ? 'Transfer Log' :
                 activeItem.type === 'body-map' ? 'Body Map' : 'Kardex'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/records` as any)}
            className="h-9 text-muted-foreground hover:text-foreground hidden sm:flex border-neutral-200"
          >
            <History className="w-4 h-4 mr-2" /> View All Records
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            {isSidebarCollapsed ? <PanelRight className="h-4.5 w-4.5" /> : <PanelRightClose className="h-4.5 w-4.5" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden bg-muted/5">
        {/* Main Area */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {activeItem?.type === 'passport' ? (
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="max-w-4xl mx-auto bg-background rounded-2xl border shadow-sm p-8 min-h-full">
                <div className="flex items-center justify-between mb-8 border-b pb-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl">
                        <Ambulance className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{activeItem.id === 'new' ? 'New Hospital Passport (SBAR)' : 'Hospital Passport'}</h2>
                        <p className="text-xs text-muted-foreground mt-1">SBAR Communication Tool</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => setActiveItem(null)}><X className="w-5 h-5" /></Button>
                </div>
                {activeItem.id === 'new' || isEditingPassport ? (
                  <HospitalPassportInlineForm
                    resident={resident}
                    profile={profile}
                    onSubmit={isEditingPassport ? handleEditSubmit : handleSubmit}
                    onCancel={() => { setIsEditingPassport(false); if(activeItem.id === 'new') setActiveItem(null); }}
                    initialData={isEditingPassport ? activeItem.data : undefined}
                    isEditing={isEditingPassport}
                    dietInformation={dietInformation}
                    medications={medications}
                    bodyMapsCount={residentBodyMaps.length}
                  />
                ) : isViewingFullPassport ? (
                  <ViewPassportInline
                    passport={activeItem.data}
                    resident={resident}
                    onEdit={() => setIsEditingPassport(true)}
                    onDelete={() => handleDeletePassport(activeItem.data)}
                    onPrint={() => handlePrintPassport(activeItem.data)}
                    onBack={() => setIsViewingFullPassport(false)}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12">
                     <HospitalPassportCard
                       passport={activeItem.data}
                       resident={resident}
                       onView={() => setIsViewingFullPassport(true)}
                       onEdit={() => setIsEditingPassport(true)}
                       onPrint={() => handlePrintPassport(activeItem.data)}
                       onDelete={() => handleDeletePassport(activeItem.data)}
                     />
                  </div>
                )}
              </div>
            </div>
          ) : activeItem?.type === 'transfer-log' ? (
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="max-w-3xl mx-auto bg-background rounded-2xl border shadow-sm p-8">
                 <div className="flex items-center justify-between mb-8 border-b pb-6">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-2xl">
                         <ClipboardList className="w-6 h-6 text-primary" />
                       </div>
                        <h2 className="text-xl font-bold">
                          {activeItem.id === 'new' ? 'Add Transfer Log' : (activeItem.data?.label || 'Transfer Log Details')}
                        </h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setActiveItem(null)}><X className="w-5 h-5" /></Button>
                 </div>
                 {activeItem.id === 'new' || isEditingTransferLog ? (
                   <TransferLogInlineForm
                     onSubmit={handleTransferLogSubmit}
                     onCancel={() => { setIsEditingTransferLog(false); if(activeItem.id === 'new') setActiveItem(null); }}
                     isEditing={isEditingTransferLog}
                     initialData={isEditingTransferLog ? activeItem.data : undefined}
                   />
                  ) : (
                    <ViewTransferLogInline
                      log={activeItem.data}
                      onEdit={() => handleEditTransferLog(activeItem.data)}
                      onDelete={() => handleDeleteTransferLog(activeItem.data)}
                      formatDate={formatDate}
                    />
                 )}
              </div>
            </div>
          ) : activeItem?.type === 'body-map' ? (
            <div className="flex-1 overflow-hidden bg-background">
              <BodyMapWorkspace
                residentName={fullName}
                initialData={activeItem.data?.bodyMapData}
                onSave={handleBodyMapSave}
                simpleMode={true}
                orgLogoUrl={orgLogoUrl}
                onClose={() => setActiveItem(null)}
              />
            </div>
          ) : activeItem?.type === 'kardex' ? (
            <div className="flex-1 bg-background flex flex-col h-full overflow-hidden">
               <div className="flex items-center justify-between px-6 py-4 border-b">
                 <h2 className="text-xl font-bold flex items-center gap-3"><Pill className="w-6 h-6 text-primary" /> Resident Kardex</h2>
                 <Button variant="ghost" size="icon" onClick={() => setActiveItem(null)}><X className="w-5 h-5" /></Button>
               </div>
               <div className="flex-1 overflow-hidden">
                 <KardexModal
                   resident={resident}
                   medications={medicationsForKardex}
                   inlineMode={true}
                 />
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5 animate-in fade-in duration-500">
               {(() => {
                 const recentPassport = hospitalPassports.find(p => !p.isArchived);
                 if (recentPassport) {
                   return (
                     <div className="flex flex-col items-center gap-8">
                       <div className="space-y-2">
                         <h3 className="text-2xl font-bold tracking-tight">Active documentation</h3>
                         <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                           The most recent clinical passport is ready for oversight or transfer.
                         </p>
                       </div>
                       <HospitalPassportCard
                         passport={recentPassport}
                         resident={resident}
                         onView={() => setActiveItem({ type: 'passport', id: recentPassport._id, data: recentPassport })}
                         onEdit={() => {
                           setIsEditingPassport(true);
                           setActiveItem({ type: 'passport', id: recentPassport._id, data: recentPassport });
                         }}
                         onPrint={() => handlePrintPassport(recentPassport)}
                         onDelete={() => handleDeletePassport(recentPassport)}
                       />
                     </div>
                   );
                 }
                 return (
                   <div className="flex flex-col items-center justify-center">
                     <div className="w-20 h-20 rounded-3xl bg-background border shadow-sm flex items-center justify-center mb-6">
                       <Ambulance className="w-8 h-8 text-primary/40" />
                     </div>
                     <h3 className="text-xl font-bold mb-2">Hospital transfer records</h3>
                     <p className="max-w-xs text-muted-foreground leading-relaxed text-sm">
                       Select a clinical record from the sidebar or click <Plus className="inline w-3 h-3 text-primary" /> to begin documenting.
                     </p>
                   </div>
                 );
               })()}
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className={`flex-shrink-0 border-l bg-background transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-0 opacity-0 invisible" : "w-[200px] opacity-100"} overflow-y-auto p-3`}>
          <div className="flex flex-col gap-6">
            {/* Hospital Passport */}
            <section>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Hospital Passport</p>
              <div className="flex flex-col gap-1">
                {(() => {
                  const activePassport = hospitalPassports.find(p => !p.isArchived);
                  return (
                    <div className="group relative">
                      <button 
                        onClick={() => { 
                          if (activePassport) {
                            setIsEditingPassport(false);
                            setIsViewingFullPassport(false);
                            setActiveItem({ type: 'passport', id: activePassport._id, data: activePassport }); 
                          } else {
                            setIsEditingPassport(false); 
                            setIsViewingFullPassport(false);
                            setActiveItem({ type: 'passport', id: 'new' });
                          }
                        }} 
                        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${activeItem?.type === 'passport' ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"}`}
                      >
                        <CircleDashed className={`h-4 w-4 flex-shrink-0 mt-0.5 ${activeItem?.type === 'passport' ? "text-primary" : "text-muted-foreground/70"}`} />
                        <div className="min-w-0 pr-6">
                          <p className="text-xs font-semibold leading-tight">
                            {activePassport ? "View Passport" : "Create Passport"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {activePassport ? `Updated ${formatDate(activePassport.updatedAt)}` : "Record missing"}
                          </p>
                        </div>
                      </button>
                      {activePassport && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPassportToDelete(activePassport); setShowDeletePassportDialog(true); }}
                          className="absolute right-2 top-1.5 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Hospital Transfer */}
            <section>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Hospital Transfers</p>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-primary" onClick={() => { setIsEditingTransferLog(false); setActiveItem({ type: 'transfer-log', id: 'new' }); }}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex flex-col gap-1">
                {transferLogs.length > 0 ? (
                  transferLogs.map(log => (
                    <div key={log._id} className="group relative">
                      <button 
                        onClick={() => { setIsEditingTransferLog(false); setActiveItem({ type: 'transfer-log', id: log._id, data: log }); }} 
                        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${activeItem?.id === log._id ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"}`}
                      >
                        <CircleDashed className={`h-4 w-4 flex-shrink-0 mt-0.5 ${activeItem?.id === log._id ? "text-primary" : "text-muted-foreground/70"}`} />
                        <div className="min-w-0 pr-6">
                          <p className="text-xs font-semibold leading-tight truncate">
                            {log.label || (log.hospitalName || "Hospital Transfer")}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(log.date)}</p>
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTransferLogToDelete(log); setShowDeleteTransferLogDialog(true); }}
                        className="absolute right-2 top-1.5 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-3 border border-dashed rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground italic">No transfer logs found</p>
                  </div>
                )}
              </div>
            </section>

            {/* Body Map */}
            <section>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Body Maps</p>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-primary" onClick={() => { setActiveItem({ type: 'body-map', id: 'new' }); }}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex flex-col gap-1">
                {residentBodyMaps.length > 0 ? (
                  residentBodyMaps.map(bm => (
                    <div key={bm._id} className="group relative">
                      <button 
                        onClick={() => { setActiveItem({ type: 'body-map', id: bm._id, data: bm }); }} 
                        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${activeItem?.id === bm._id ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"}`}
                      >
                        <CircleDashed className={`h-4 w-4 flex-shrink-0 mt-0.5 ${activeItem?.id === bm._id ? "text-primary" : "text-muted-foreground/70"}`} />
                        <div className="min-w-0 pr-6">
                          <p className="text-xs font-semibold leading-tight mb-0.5 truncate">{bm.label || "Observation"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{formatDate(bm.date || bm.created_at)}</p>
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setBodyMapToDelete(bm); setShowDeleteBodyMapDialog(true); }}
                        className="absolute right-2 top-1.5 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-3 border border-dashed rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground italic">No body maps found</p>
                  </div>
                )}
              </div>
            </section>

            {/* Kardex */}
            <section>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Medication Record</p>
              <button 
                onClick={() => setActiveItem({ type: 'kardex', id: 'view' })} 
                className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${activeItem?.type === 'kardex' ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"}`}
              >
                <CircleDashed className={`h-4 w-4 flex-shrink-0 mt-0.5 ${activeItem?.type === 'kardex' ? "text-primary" : "text-muted-foreground/70"}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">Resident Kardex</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Current Record</p>
                </div>
              </button>
            </section>
          </div>
        </aside>
      </div>

      {/* Delete Dialogs */}
      <AlertDialog open={showDeletePassportDialog} onOpenChange={setShowDeletePassportDialog}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Delete record?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-2xl h-12">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeletePassport} className="rounded-2xl h-12 bg-destructive hover:bg-destructive/90">Delete Permanently</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteTransferLogDialog} onOpenChange={setShowDeleteTransferLogDialog}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Delete transfer log?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-2xl h-12">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteTransferLog} className="rounded-2xl h-12 bg-destructive hover:bg-destructive/90">Delete Log</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteBodyMapDialog} onOpenChange={setShowDeleteBodyMapDialog}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Remove body map?</AlertDialogTitle><AlertDialogDescription>This will delete all observations associated with this record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-2xl h-12">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteBodyMap} className="rounded-2xl h-12 bg-destructive hover:bg-destructive/90">Remove Record</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
