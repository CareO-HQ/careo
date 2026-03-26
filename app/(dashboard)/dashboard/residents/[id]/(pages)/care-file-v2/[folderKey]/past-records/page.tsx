"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, Clock, FileText, BookOpen } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { config } from "@/config";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { KeyWorkerDiaryPastRecords } from "@/components/residents/carefile/folders/KeyWorkerDiaryPastRecords";
import { useProfile } from "@/hooks/use-profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";

// ─── Table Map (same as folder page) ─────────────────────────────────────────

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
    "skin-integrity-form": "skin_integrity_assessments",
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
    "v2-capacity-consent": "capacity_consents",
    "v2-night-obs-consent": "night_observation_consents",
    "v2-general-risk": "general_risk_assessments",
    "v2-personal-profile": "personal_profiles"
};

type FilterType = "forms" | "care-plans";

interface ArchivedRecord {
    _id: string;
    formKey: string;
    formName: string;
    completedAt: number;
    archivedAt?: number;
}

interface ArchivedCarePlan {
    _id: string;
    care_plan_type: string;
    written_by?: string;
    date_written?: string;
    goals?: any;
    archived_at?: string;
    created_at: string;
    _creationTime: number;
}

export default function PastRecordsPage() {
    const params = useParams();
    const residentId = params.id as string;
    const folderKey = params.folderKey as string;
    const router = useRouter();
    const { profile } = useProfile();

    const folder = config.careFilesV2.find(f => f.key === folderKey);
    const folderHasCarePlans = !!(folder as any)?.carePlan;

    const [filter, setFilter] = useState<FilterType>("forms");
    const [resident, setResident] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [archivedForms, setArchivedForms] = useState<ArchivedRecord[]>([]);
    const [archivedCarePlans, setArchivedCarePlans] = useState<ArchivedCarePlan[]>([]);
    
    // Form view states
    const [selectedFormKey, setSelectedFormKey] = useState<string | null>(null);
    const [selectedFormName, setSelectedFormName] = useState<string | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [loadingRecordId, setLoadingRecordId] = useState<string | null>(null);

    useEffect(() => {
        if (!residentId || !folder) return;

        async function fetchData() {
            setLoading(true);
            try {
                // Fetch resident
                const { data: residentData } = await supabase
                    .from("residents")
                    .select("*")
                    .eq("id", residentId)
                    .single();
                setResident(residentData);

                // ── Forms: only keys in this folder ──────────────────────────
                const folderFormKeys = (folder!.forms || [])
                    .map(f => f.key)
                    .filter(k => k !== "care-plan-form" && TABLE_MAP[k]);

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
                            folder!.forms.find(f => f.key === formKey)?.value ||
                            formKey;
                        data.forEach(row => {
                            formResults.push({
                                _id: row.id,
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

                // Sort newest first
                formResults.sort((a, b) => (b.archivedAt ?? b.completedAt) - (a.archivedAt ?? a.completedAt));
                setArchivedForms(formResults);

                // ── Care Plans ────────────────────────────────────────────────
                if (folderHasCarePlans) {
                    const { data: cpData } = await supabase
                        .from("care_plan_assessments")
                        .select("*")
                        .eq("resident_id", residentId)
                        .eq("folder_key", folderKey)
                        .eq("status", "archived")
                        .order("created_at", { ascending: false });

                    const mapped = (cpData || []).map(cp => ({
                        ...cp,
                        _id: cp.id,
                        _creationTime: new Date(cp.created_at).getTime(),
                    }));
                    setArchivedCarePlans(mapped);
                }
            } catch (err) {
                console.error("Error fetching past records:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [residentId, folderKey, folderHasCarePlans]);

    const handleViewRecord = async (formKey: string, id: string, formName?: string) => {
        setLoadingRecordId(id);
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
            setSelectedFormName(formName ?? formKey);
            setSelectedRecord(data);
            setIsViewOpen(true);
        } catch (err) {
            console.error("Error fetching record details:", err);
        } finally {
            setLoadingRecordId(null);
        }
    };

    if (!folder) {
        return (
            <div className="flex items-center justify-center h-64">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading past records…</p>
                </div>
            </div>
        );
    }

    if (!resident) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-lg font-semibold">Resident not found</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const fullName = `${resident.first_name} ${resident.last_name}`;
    const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

    // Special handling for Key Worker Diary - show custom component
    if (folderKey === "v2-key-worker") {
        return <KeyWorkerDiaryPastRecords residentId={residentId} resident={resident} />;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                        router.push(
                            `/dashboard/residents/${residentId}/care-file-v2/${folderKey}` as any
                        )
                    }
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-10 h-10">
                    <AvatarImage src={resident.image_url} alt={fullName} className="border" />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <h1 className="text-xl sm:text-2xl font-bold">
                            Past Records — {folder.value}
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Previous versions of forms and care plans for {resident.first_name}{" "}
                        {resident.last_name}
                    </p>
                </div>
            </div>

            {/* Filter Tabs */}
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
                {folderHasCarePlans && (
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
                )}
            </div>

            {/* ── Forms Table ─────────────────────────────────────────────── */}
            {filter === "forms" && (
                <div className="rounded-lg border bg-card">
                    {archivedForms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-semibold mb-2">No Past Form Versions</p>
                            <p className="text-sm text-muted-foreground text-center max-w-md">
                                No archived form versions found for this folder. When a form is
                                updated, the previous version will appear here.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Form Name</TableHead>
                                    <TableHead>Completed At</TableHead>
                                    <TableHead>Archived At</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {archivedForms.map((record) => (
                                    <TableRow key={`${record.formKey}-${record._id}`} className="bg-muted/10">
                                        <TableCell className="font-medium">
                                            {record.formName}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(record.completedAt), "dd MMM yyyy, HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            {record.archivedAt
                                                ? format(new Date(record.archivedAt), "dd MMM yyyy, HH:mm")
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                                                Archived
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2"
                                                disabled={loadingRecordId !== null}
                                                onClick={() => handleViewRecord(record.formKey, record._id, record.formName)}
                                            >
                                                {loadingRecordId === record._id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
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

            {/* ── Care Plans Table ─────────────────────────────────────────── */}
            {filter === "care-plans" && folderHasCarePlans && (
                <div className="rounded-lg border bg-card">
                    {archivedCarePlans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-semibold mb-2">No Past Care Plan Versions</p>
                            <p className="text-sm text-muted-foreground text-center max-w-md">
                                No archived care plan versions found for this folder. When a care
                                plan is updated, the previous version will appear here.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Care Plan Name</TableHead>
                                    <TableHead>Written By</TableHead>
                                    <TableHead>Date Written</TableHead>
                                    <TableHead>Archived At</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {archivedCarePlans.map((cp: any) => {
                                    const goals = cp.goals || {};
                                    let writtenBy = goals.writtenBy;
                                    if (!writtenBy || writtenBy.toLowerCase() === "user") {
                                        writtenBy = cp.written_by || "—";
                                    }
                                    const dateWritten = goals.dateWritten || cp.date_written;

                                    return (
                                        <TableRow key={cp._id} className="bg-muted/10">
                                            <TableCell className="font-medium">
                                                {cp.care_plan_type || "Care Plan"}
                                            </TableCell>
                                            <TableCell>{writtenBy || "—"}</TableCell>
                                            <TableCell>
                                                {dateWritten
                                                    ? format(new Date(dateWritten), "dd MMM yyyy")
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {format(
                                                    new Date(cp.archived_at || cp.created_at),
                                                    "dd MMM yyyy, HH:mm"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                                                    Archived
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2"
                                                    disabled={loadingRecordId !== null}
                                                    onClick={() => handleViewRecord("care-plan-form", cp._id, cp.care_plan_type || "Care Plan")}
                                                >
                                                    {loadingRecordId === cp._id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}

            {/* Actual Form Viewer Overlay */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-5xl h-[92vh] overflow-y-auto p-0 border-none shadow-2xl bg-background">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{selectedFormName || selectedFormKey?.replace("-", " ") || "Form"}</DialogTitle>
                        <DialogDescription>Viewing archived record</DialogDescription>
                    </DialogHeader>
                    {/* Visible header with form name */}
                    <div className="sticky top-0 z-10 flex items-center gap-3 px-6 pt-5 pb-4 bg-background border-b">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Archived Record</p>
                            <h2 className="text-base font-semibold leading-tight">{selectedFormName || "Form"}</h2>
                        </div>
                    </div>
                    <div className="relative pl-6 pt-4">
                        <CareFileDialogRenderer
                            formKey={selectedFormKey as any}
                            residentId={residentId}
                            teamId={profile?.active_team_id ?? ""}
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
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
