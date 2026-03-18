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
import RiskAssessmentViewDialog from "@/components/residents/carefile/folders/RiskAssessmentViewDialog";
import CarePlanViewDialog from "@/components/residents/carefile/folders/CarePlanViewDialog";
import { supabase } from "@/lib/supabase";
import { config } from "@/config";

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

    const folder = config.careFilesV2.find(f => f.key === folderKey);
    const folderHasCarePlans = !!(folder as any)?.carePlan;

    const [filter, setFilter] = useState<FilterType>("forms");
    const [resident, setResident] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [archivedForms, setArchivedForms] = useState<ArchivedRecord[]>([]);
    const [archivedCarePlans, setArchivedCarePlans] = useState<ArchivedCarePlan[]>([]);

    // Viewer state
    const [viewingAssessment, setViewingAssessment] = useState<{
        formKey: string;
        formId: string;
        name: string;
        completedAt: number;
        category: string;
    } | null>(null);
    const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);

    const [viewingCarePlan, setViewingCarePlan] = useState<{
        formKey: string;
        formId: string;
        name: string;
        completedAt: number;
        isLatest: boolean;
    } | null>(null);
    const [isCarePlanDialogOpen, setIsCarePlanDialogOpen] = useState(false);

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
                                                onClick={() => {
                                                    setViewingAssessment({
                                                        formKey: record.formKey,
                                                        formId: record._id,
                                                        name: record.formName,
                                                        completedAt: record.completedAt,
                                                        category: folder.value,
                                                    });
                                                    setIsAssessmentDialogOpen(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
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
                                                    onClick={() => {
                                                        setViewingCarePlan({
                                                            formKey: "care-plan-form",
                                                            formId: cp._id,
                                                            name: cp.care_plan_type || "Care Plan",
                                                            completedAt: cp._creationTime,
                                                            isLatest: false,
                                                        });
                                                        setIsCarePlanDialogOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
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

            {/* Dialogs */}
            {viewingAssessment && (
                <RiskAssessmentViewDialog
                    open={isAssessmentDialogOpen}
                    onOpenChange={setIsAssessmentDialogOpen}
                    assessment={viewingAssessment}
                />
            )}
            {viewingCarePlan && (
                <CarePlanViewDialog
                    open={isCarePlanDialogOpen}
                    onOpenChange={setIsCarePlanDialogOpen}
                    carePlan={viewingCarePlan}
                />
            )}
        </div>
    );
}
