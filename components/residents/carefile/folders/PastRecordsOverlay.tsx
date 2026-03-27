"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  History, 
  X, 
  FileText, 
  BookOpen, 
  Clock, 
  Eye, 
  ArrowLeft,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { config } from "@/config";
import { CareFileDialogRenderer } from "./CareFileDialogRenderer";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// ─── Table Map ─────────────────────────────────────────────────────────────
const TABLE_MAP: Record<string, string> = {
  "preAdmission-form": "pre_admission_care_files",
  "infection-prevention": "infection_prevention_assessments",
  "blader-bowel-form": "bladder_bowel_assessments",
  "moving-handling-form": "moving_handling_assessments",
  "bedrail-consent-form": "bedrail_consents",
  "bed-rails-risk-assessment-form": "bedrails_risk_assessments",
  "long-term-fall-risk-form": "long_term_falls_risk_assessments",
  "admission-form": "admission_assessments",
  "photography-consent": "photography_consents",
  "dnacpr": "dnacprs",
  "peep": "peeps",
  "dependency-assessment": "dependency_assessments",
  "timl": "timl_assessments",

  "resident-valuables-form": "resident_valuables_assessments",
  "resident-handling-profile-form": "handling_profiles",
  "pain-assessment-form": "pain_assessments",
  "nutritional-assessment-form": "nutritional_assessments",
  "oral-assessment-form": "oral_assessments",
  "diet-notification-form": "diet_notifications",
  "choking-risk-assessment-form": "choking_risk_assessments",
  "cornell-depression-scale-form": "cornell_depression_scales",
  "best-interest-decision-form": "best_interest_decisions",
  "care-plan-form": "care_plan_assessments",
  "braden-risk-assessment-form": "braden_risk_assessments",
  "v2-restraints-risk": "restraints_consents",
  "fall-risk-assessment": "fall_risk_assessments",
  "smoking-risk-assessment": "smoking_risk_assessments",
  "v2-specimen-log": "specimen_records",
};

interface PastRecordsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: string;
  folderKey: string;
  resident: any;
  profile: any;
  activeOrganization: any;
  activeTeamId: string;
}

type FilterType = "forms" | "care-plans";

interface ArchivedRecord {
  id: string;
  formKey: string;
  formName: string;
  completedAt: number;
  archivedAt?: number;
}

export function PastRecordsOverlay({
  open,
  onOpenChange,
  residentId,
  folderKey,
  resident,
  profile,
  activeOrganization,
  activeTeamId,
}: PastRecordsOverlayProps) {
  const [filter, setFilter] = useState<FilterType>("forms");
  const [loading, setLoading] = useState(true);
  const [archivedForms, setArchivedForms] = useState<ArchivedRecord[]>([]);
  const [archivedCarePlans, setArchivedCarePlans] = useState<any[]>([]);
  
  // Viewer state
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedFormKey, setSelectedFormKey] = useState<string | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFetchingRecord, setIsFetchingRecord] = useState(false);

  const folder = config.careFilesV2.find((f) => f.key === folderKey);
  const folderHasCarePlans = !!(folder as any)?.carePlan;

  useEffect(() => {
    if (!open || !residentId || !folder) return;

    async function fetchData() {
      setLoading(true);
      try {
        const folderFormKeys = (folder!.forms || [])
          .map((f) => f.key)
          .filter((k) => k !== "care-plan-form" && TABLE_MAP[k]);

        const formResults: ArchivedRecord[] = [];

        await Promise.all(
          folderFormKeys.map(async (formKey) => {
            const tableName = TABLE_MAP[formKey];
            if (!tableName) return;
            const { data } = await supabase
              .from(tableName)
              .select("id, created_at, archived_at")
              .eq("resident_id", residentId)
              .eq("status", "archived")
              .order("created_at", { ascending: false });

            if (!data) return;
            const formLabel =
              folder!.forms.find((f) => f.key === formKey)?.value || formKey;
            data.forEach((row) => {
              formResults.push({
                id: row.id,
                formKey,
                formName: formLabel,
                completedAt: new Date(row.created_at).getTime(),
                archivedAt: row.archived_at
                  ? new Date(row.archived_at).getTime()
                  : undefined,
              });
            });
          })
        );

        formResults.sort((a, b) => (b.archivedAt ?? b.completedAt) - (a.archivedAt ?? a.completedAt));
        setArchivedForms(formResults);

        if (folderHasCarePlans) {
          const { data: cpData } = await supabase
            .from("care_plan_assessments")
            .select("*")
            .eq("resident_id", residentId)
            .eq("folder_key", folderKey)
            .eq("status", "archived")
            .order("created_at", { ascending: false });

          setArchivedCarePlans(cpData || []);
        }
      } catch (err) {
        console.error("Error fetching past records:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, residentId, folderKey, folderHasCarePlans]);

  const handleViewRecord = async (formKey: string, id: string) => {
    setIsFetchingRecord(true);
    try {
      const tableName = TABLE_MAP[formKey];
      if (!tableName) return;

      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setSelectedFormKey(formKey);
      setSelectedRecord(data);
      setIsViewOpen(true);
    } catch (err) {
      console.error("Error fetching record details:", err);
    } finally {
      setIsFetchingRecord(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
          <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Past Records</DialogTitle>
                <p className="text-sm text-muted-foreground">{folder?.value} — {resident?.first_name} {resident?.last_name}</p>
              </div>
            </div>
            <DialogPrimitive.Close className="rounded-full p-2 hover:bg-muted transition-colors outline-none focus:ring-2 focus:ring-primary">
              <X className="h-5 w-5 text-muted-foreground" />
            </DialogPrimitive.Close>
          </div>

          <div className="p-6 space-y-6">
            {/* Filter Tabs */}
            {folderHasCarePlans && (
              <div className="flex items-center gap-1 bg-muted/40 border rounded-lg p-1 w-fit">
                <button
                  onClick={() => setFilter("forms")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filter === "forms"
                      ? "bg-background text-primary shadow-sm border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Forms
                  <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5 font-semibold">
                    {archivedForms.length}
                  </span>
                </button>
                <button
                  onClick={() => setFilter("care-plans")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filter === "care-plans"
                      ? "bg-background text-primary shadow-sm border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Care Plans
                  <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5 font-semibold">
                    {archivedCarePlans.length}
                  </span>
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Fetching history...</p>
              </div>
            ) : filter === "forms" ? (
              <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
                {archivedForms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-semibold text-foreground/80">No History Yet</p>
                    <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                      Archive versions will appear here when you update forms in this folder.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold px-4">Form Type</TableHead>
                        <TableHead className="font-semibold">Completed</TableHead>
                        <TableHead className="font-semibold">Archived</TableHead>
                        <TableHead className="text-right px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedForms.map((record) => (
                        <TableRow key={record.id} className="hover:bg-muted/50 transition-colors group">
                          <TableCell className="px-4 py-3 font-medium flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                             {record.formName}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {format(record.completedAt, "dd MMM yyyy, HH:mm")}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {record.archivedAt ? format(record.archivedAt, "dd MMM yyyy, HH:mm") : "—"}
                          </TableCell>
                          <TableCell className="text-right px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 hover:bg-primary/10 hover:text-primary transition-all opacity-80 group-hover:opacity-100"
                              disabled={isFetchingRecord}
                              onClick={() => handleViewRecord(record.formKey, record.id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
                 {archivedCarePlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-semibold text-foreground/80">No Past Care Plans</p>
                    <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                      Previous versions of care plans will be archived here.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold px-4">Care Plan</TableHead>
                        <TableHead className="font-semibold">Written By</TableHead>
                        <TableHead className="font-semibold">Archived At</TableHead>
                        <TableHead className="text-right px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedCarePlans.map((cp) => (
                        <TableRow key={cp.id} className="hover:bg-muted/50 transition-colors group">
                          <TableCell className="px-4 py-3 font-medium flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                             {cp.care_plan_type || "Care Plan"}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {cp.written_by || "—"}
                          </TableCell>
                          <TableCell className="py-3 text-muted-foreground">
                            {format(new Date(cp.archived_at || cp.created_at), "dd MMM yyyy, HH:mm")}
                          </TableCell>
                          <TableCell className="text-right px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 hover:bg-primary/10 hover:text-primary transition-all opacity-80 group-hover:opacity-100"
                              disabled={isFetchingRecord}
                              onClick={() => handleViewRecord("care-plan-form", cp.id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Actual Form Viewer Overlay */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogPrimitive.Content asChild>
          <div className="relative">
            <CareFileDialogRenderer
              formKey={selectedFormKey as any}
              residentId={residentId}
              teamId={activeTeamId}
              organizationId={profile?.active_organization_id ?? ""}
              userId={profile?.id ?? ""}
              userName={profile?.name || profile?.email || "User"}
              userRole={profile?.role ?? ""}
              resident={resident}
              careHomeName={profile?.care_home_name ?? ""}
              teamName={profile?.active_team_name ?? ""}
              folderKey={folderKey}
              formDataForEdit={selectedRecord}
              isReviewMode={false}
              onClose={() => setIsViewOpen(false)}
              isInline={true}
              viewOnly={true}
              orgLogoUrl={activeOrganization?.logo_url}
            />
          </div>
        </DialogPrimitive.Content>
      </Dialog>
    </>
  );
}
