"use client";

import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { canFillCareFileForms } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { CareFileFormKey } from "@/types/care-files";
import { config } from "@/config";
import { BodyMapData } from "@/types/body-map";
import { ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2, Plus, X, Edit3, Printer, History, Clock, FileCheck, ChevronRight, ExternalLink, PanelRight, PanelRightClose, Map as MapIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import UploadFileModal from "@/components/residents/carefile/folders/UploadFileModal";
import FormStatusIndicator, { FormStatusBadge } from "@/components/residents/carefile/FormStatusIndicator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Resident } from "@/types";
import { RiskAssessmentViewer } from "@/components/residents/carefile/folders/RiskAssessmentViewDialog";
import { CarePlanEvaluations } from "@/components/residents/carefile/CarePlanEvaluations";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";
import { Badge } from "@/components/ui/badge";
import { BodyMapDialog } from "@/components/body-map/BodyMapDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadedFile = {
    id: string;
    name: string;
    original_name: string;
    file_size: number;
    storage_path: string;
    file_type: string;
    created_at: string;
    signedUrl?: string;
};

interface CareFolderBodyMapRecord {
    id: string;
    resident_id: string;
    folder_key: string;
    body_map_data: BodyMapData | null;
}

// ─── Helper Mapping ───────────────────────────────────────────────────────────

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
    "v2-capacity-consent": "capacity_consents",
    "v2-night-obs-consent": "night_observation_consents",
    "v2-general-risk": "general_risk_assessments",
    "v2-personal-profile": "personal_profiles",
    "progress-note-form": "progress_notes"
};

// ─── File Viewer ──────────────────────────────────────────────────────────────

function FileViewer({ file }: { file: UploadedFile }) {
    const ext = (file.original_name ?? file.name).split(".").pop()?.toLowerCase() ?? "";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
    const isPdf = ext === "pdf" || file.file_type === "application/pdf";
    const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
    const url = file.signedUrl ?? "";

    if (!url) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading file…</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                        {(file.file_size / 1024).toFixed(0)} KB
                    </span>
                </div>
                <a
                    href={url}
                    download={file.original_name ?? file.name}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors flex-shrink-0"
                >
                    <Download className="w-3.5 h-3.5" />
                    Download
                </a>
            </div>
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
                {isPdf && <iframe src={url} className="w-full h-full border-none" title={file.name} />}
                {isImage && (
                    <div className="flex items-center justify-center h-full p-6">
                        <img src={url} alt={file.name} className="max-w-full max-h-full object-contain rounded shadow-sm" />
                    </div>
                )}
                {isOffice && <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} className="w-full h-full border-none" title={file.name} />}
                {!isPdf && !isImage && !isOffice && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <a href={url} download={file.original_name ?? file.name} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors">
                            <Download className="w-4 h-4" /> Download file
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CareFileV2FolderPage() {
    const params = useParams();
    const residentId = params.id as string;
    const folderKey = params.folderKey as string;
    const router = useRouter();
    const { profile } = useProfile();
    const { activeTeamId } = useActiveTeam();
    const { getFormState, loading: formsLoading, refreshForms } = useCareFileForms({ residentId });
    const canFillForms = canFillCareFileForms(profile?.role);

    const folder = config.careFilesV2.find(f => f.key === folderKey);
    const v1Folder = config.careFiles.find(f => f.forms.some(formItem => folder?.forms.some(v2Form => v2Form.key === formItem.key)));
    const effectiveV1Key = v1Folder?.key || folderKey;

    const [resident, setResident] = useState<Resident | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFormKey, setActiveFormKey] = useState<CareFileFormKey | null>(null);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [formDataForEdit, setFormDataForEdit] = useState<any>(undefined);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCarePlanSelectionOpen, setIsCarePlanSelectionOpen] = useState(false);
    const [activeOrganization, setActiveOrganization] = useState<any>(null);
    const [selectedCarePlanName, setSelectedCarePlanName] = useState<string | undefined>(undefined);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadDefaultFileName, setUploadDefaultFileName] = useState("");
    const [folderBodyMap, setFolderBodyMap] = useState<CareFolderBodyMapRecord | null>(null);
    const [isBodyMapDialogOpen, setIsBodyMapDialogOpen] = useState(false);
    // SidebarTrigger handles the left sidebar, hook used for state if needed.
    const { toggleSidebar, state: leftSidebarState } = useSidebar();

    const folderFormKeys = (folder?.forms || []).map(f => f.key as CareFileFormKey);

    const {
        activeCarePlanForms = [],
        latestCarePlanForm,
        archivedCarePlans,
        isLoading: folderFormsLoading,
        refetch: refetchFolderForms
    } = useFolderForms({
        residentId,
        folderFormKeys,
        organizationId: profile?.active_organization_id ?? undefined,
        folderKey: folderKey, // Use V2 folderKey directly for consistent care plan filtering
        includeCarePlans: (folder as any)?.carePlan
    });

    const activeFile = uploadedFiles.find((f) => f.id === activeFileId);

    const activeOrganizationId = profile?.active_organization_id;

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    useEffect(() => {
        if (!residentId) return;
        supabase.from("residents").select("*, emergency_contacts(*)").eq("id", residentId).single()
            .then(({ data, error }) => { if (!error) setResident(data as Resident); });

        if (profile?.active_organization_id) {
            supabase.from("organizations").select("*").eq("id", profile.active_organization_id).single()
                .then(({ data, error }) => { if (!error) setActiveOrganization(data); });
        }
    }, [residentId, profile?.active_organization_id]);

    const fetchFolderBodyMap = useCallback(async () => {
        if (!residentId) return;
        try {
            const { data, error } = await supabase
                .from("care_folder_body_maps")
                .select("id, resident_id, folder_key, body_map_data")
                .eq("resident_id", residentId)
                .eq("folder_key", folderKey)
                .maybeSingle();

            if (error && error.code !== "PGRST116") {
                console.error("Error fetching care folder body map:", error);
                return;
            }

            setFolderBodyMap((data as CareFolderBodyMapRecord) || null);
        } catch (error) {
            console.error("Error fetching care folder body map:", error);
        }
    }, [residentId, folderKey]);

    const fetchUploadedFiles = useCallback(async () => {
        if (!residentId || !folder) return;
        setFilesLoading(true);
        const { data, error } = await supabase.from("files").select("id, name, original_name, file_size, storage_path, file_type, created_at").eq("resident_id", residentId)
            .eq("folder_name", folder.value || folderKey).order("created_at", { ascending: false });
        if (!error && data) setUploadedFiles(data as UploadedFile[]);
        setFilesLoading(false);
    }, [residentId, folder, folderKey]);

    useEffect(() => { fetchUploadedFiles(); }, [fetchUploadedFiles]);

    useEffect(() => {
        if (folderKey === "v2-hygiene" || folderKey === "v2-skin-integrity" || folderKey === "v2-safeguarding") {
            fetchFolderBodyMap();
        }
    }, [fetchFolderBodyMap, folderKey]);

    const handleFormClick = async (key: CareFileFormKey) => {
        if (key === "v2-body-map-hygiene" || key === "v2-body-map-skin") {
            setIsBodyMapDialogOpen(true);
            return;
        }

        const v2Form = folder?.forms.find(f => f.key === key);
        if ((v2Form as any)?.isComingSoon) {
            toast.info("Coming Soon", { description: "This form is currently being developed." });
            return;
        }

        // Special handling for external links
        const formAsAny = v2Form as any;
        if (formAsAny?.type === "link" && formAsAny.url) {
            window.open(formAsAny.url, "_blank");
            return;
        }

        if (!canFillForms) return;


        setActiveFileId(null);
        if (activeFormKey === key) {
            setActiveFormKey(null);
            setFormDataForEdit(undefined);
            setIsReviewMode(false);
            setIsViewOnly(false);
            return;
        }

        setActiveFormKey(key);

        if (key === "care-plan-form") {
            if (activeCarePlanForms.length > 0) {
                setIsViewOnly(true);
                setIsReviewMode(false);
                setFormDataForEdit(activeCarePlanForms[0]);
            } else {
                setIsViewOnly(false);
                setIsReviewMode(false);
                setFormDataForEdit(null);
            }
            return;
        }

        const formState = getFormState(key);
        // Braden form, Dependency Assessment, Fall Risk Assessment, and Choking Risk Assessment should always be in edit mode
        if (key === "braden-risk-assessment-form" || key === "dependency-assessment" || key === "fall-risk-assessment" || key === "choking-risk-assessment-form") {
            setIsViewOnly(false);
            setIsReviewMode(false);
            setFormDataForEdit(null);
        } else if (formState.hasData) {
            setIsViewOnly(true);
            setIsReviewMode(false);
            setFormDataForEdit(undefined);
            const table = TABLE_MAP[key];
            if (table) {
                const { data, error } = await supabase.from(table).select('*').eq('resident_id', residentId)
                    .order('created_at', { ascending: false }).limit(1).single();
                if (!error && data) setFormDataForEdit(data);
                else setFormDataForEdit(null);
            }
        } else {
            setIsViewOnly(false);
            setIsReviewMode(false);
            setFormDataForEdit(null);
        }
    };

    const handleFileClick = async (fileId: string) => {
        setActiveFormKey(null);
        if (activeFileId === fileId) {
            setActiveFileId(null);
            return;
        }
        setActiveFileId(fileId);
        const file = uploadedFiles.find((f) => f.id === fileId);
        if (file && !file.signedUrl) {
            const { data } = await supabase.storage.from("resident-files").createSignedUrl(file.storage_path, 3600);
            if (data?.signedUrl) {
                setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, signedUrl: data.signedUrl } : f)));
            }
        }
    };

    const handleCloseForm = () => {
        setActiveFormKey(null);
        setFormDataForEdit(undefined);
        setIsReviewMode(false);
        setIsViewOnly(false);
        setSelectedCarePlanName(undefined);
        refreshForms();
        refetchFolderForms();
    };

    const handleCarePlanSelect = (name: string) => {
        setActiveFileId(null);
        setFormDataForEdit(null);
        setSelectedCarePlanName(name);
        setIsReviewMode(false);
        setIsViewOnly(false);
        setActiveFormKey("care-plan-form" as CareFileFormKey);
        setIsCarePlanSelectionOpen(false);
    };

    const handleSaveSuccess = (data: any) => {
        setFormDataForEdit(data);
        setIsViewOnly(true);
        setIsReviewMode(false);
        setIsSaving(false);
    };

    const handlePrint = async () => {
        if (!activeFormKey || !resident) return;
        if (activeFormKey !== "dependency-assessment" && activeFormKey !== "fall-risk-assessment" && activeFormKey !== "choking-risk-assessment-form" && !formDataForEdit) return;
        const formName = activeFormKey === "care-plan-form" ? (formDataForEdit.care_plan_type || "Care Plan") : (folder?.forms.find(f => f.key === activeFormKey)?.value || "Form");

        toast.info(`Generating PDF for ${formName}...`);

        const dataToPrint: any = { ...formDataForEdit };

        // If it's a care plan, fetch the 5 most recent evaluations
        if (activeFormKey === "care-plan-form") {
            const { data: evaluations, error } = await supabase
                .from('care_plan_evaluations')
                .select('*')
                .eq('care_plan_id', formDataForEdit.id || formDataForEdit._id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && evaluations) {
                dataToPrint.evaluations = evaluations.map(e => ({
                    evaluation_date: e.evaluation_date || e.created_at,
                    progress_notes: e.progress_notes || e.comments,
                    outcome: e.outcome,
                    position: e.position,
                    staff_name: e.reviewed_by_name,
                    next_review_date: e.new_review_date
                }));
            }
        }

        // If it's a dependency assessment, fetch all past assessments
        if (activeFormKey === "dependency-assessment") {
            const { data: history, error } = await supabase
                .from('dependency_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (!error && history) {
                dataToPrint.history = history;
            }
        }

        // If it's a fall risk assessment, fetch all past assessments
        if (activeFormKey === "fall-risk-assessment") {
            const { data: history, error } = await supabase
                .from('fall_risk_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (!error && history) {
                dataToPrint.history = history;
            }
        }

        // If it's a choking risk assessment, fetch all past assessments
        if (activeFormKey === "choking-risk-assessment-form") {
            const { data: history, error } = await supabase
                .from('choking_risk_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (!error && history) {
                dataToPrint.history = history;
            }
        }

        // If it's an oral assessment, fetch the 5 most recent evaluations
        if (activeFormKey === "oral-assessment-form") {
            const { data: evaluations, error } = await supabase
                .from('oral_assessment_evaluations')
                .select('*')
                .eq('resident_id', residentId)
                .order('evaluation_date', { ascending: false })
                .limit(5);

            if (!error && evaluations) {
                dataToPrint.evaluations = evaluations;
            }
        }

        await generateCareFilePDF({
            formName,
            data: dataToPrint,
            resident,
            orgLogoUrl: activeOrganization?.logo_url,
            careHomeName: activeOrganization?.name || profile?.care_home_name
        });
        toast.success("PDF generated successfully");
    };

    const handleExternalSubmit = () => {
        const submitBtn = document.getElementById('care-file-submit-btn');
        if (submitBtn) {
            setIsSaving(true);
            submitBtn.click();
            // Reset saving state after a delay if no other action happens
            // This is a safety measure in case validation fails
            setTimeout(() => setIsSaving(false), 2000);
        } else {
            toast.error("Form submission button not found");
        }
    };

    const handleBodyMapSave = async (bodyMapData: BodyMapData) => {
        if (!activeOrganizationId || !profile?.id) {
            toast.error("Auth error: Missing organization or profile");
            return;
        }

        try {
            const { data, error } = await supabase
                .from("care_folder_body_maps")
                .upsert(
                    {
                        resident_id: residentId,
                        folder_key: folderKey,
                        body_map_data: bodyMapData,
                        organization_id: activeOrganizationId,
                        created_by: profile.id,
                        updated_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "resident_id,folder_key",
                    }
                )
                .select("id, resident_id, folder_key, body_map_data")
                .single();

            if (error) {
                throw error;
            }

            setFolderBodyMap((data as CareFolderBodyMapRecord) || null);
            await fetchFolderBodyMap();
            toast.success("Body map saved");
        } catch (error) {
            console.error("Error saving care-folder body map:", error);
            toast.error("Failed to save body map");
        }
    };

    const handleDeleteFile = async (file: UploadedFile, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
        await supabase.storage.from("resident-files").remove([file.storage_path]);
        await supabase.from("files").delete().eq("id", file.id);
        if (activeFileId === file.id) setActiveFileId(null);
        fetchUploadedFiles();
    };

    if (!folder) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Go Back</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full relative h-[calc(100vh-theme(spacing.24))]">
            {/* Top Bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-background border-b flex-shrink-0">
                <button
                    onClick={() => router.push(`/dashboard/residents/${residentId}/care-file-v2` as any)}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
                    <span>Care File</span> <span>/</span> <span className="font-medium text-foreground">{folder.value}</span>
                    {activeFormKey && <><span>/</span> <span className="text-foreground">{folder.forms.find(f => f.key === activeFormKey)?.value || "Form"}</span></>}
                    {activeFile && <><span>/</span> <span className="text-foreground">{activeFile.name}</span></>}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/residents/${residentId}/care-file-v2/${folderKey}/past-records` as any)}
                    className="h-8 gap-1.5 text-xs"
                    title="View all past versions of forms and care plans in this folder"
                >
                    <History className="h-3.5 w-3.5" />
                    View All Past Records
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-200"
                    title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
                >
                    {isSidebarCollapsed ? (
                        <PanelRight className="h-4 w-4" />
                    ) : (
                        <PanelRightClose className="h-4 w-4" />
                    )}
                </Button>
            </div >

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/10">
                    {activeFile ? <FileViewer file={activeFile} /> : activeFormKey && resident ? (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
                            <div className="w-full bg-background rounded-xl border shadow-sm mb-8 overflow-visible">
                                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg"><FileText className="w-5 h-5 text-primary" /></div>
                                        <div>
                                            <h2 className="text-lg font-bold leading-none">{activeFormKey === "care-plan-form" ? (formDataForEdit?.care_plan_type || "Care Plan") : (folder.forms.find(f => f.key === activeFormKey)?.value || "Form")}</h2>
                                            {isViewOnly && formDataForEdit && <p className="text-xs text-muted-foreground mt-1">Completed on {new Date(formDataForEdit.created_at || formDataForEdit._creationTime).toLocaleDateString()}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isViewOnly ? (
                                            <>
                                                {activeFormKey !== "dependency-assessment" && (
                                                    <Button variant="outline" size="sm" onClick={() => { setIsViewOnly(false); setIsReviewMode(true); }} className="gap-2">
                                                        <Edit3 className="w-4 h-4" /> Edit
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="outline" size="sm" onClick={handleCloseForm} disabled={isSaving}>Cancel</Button>
                                                <Button size="sm" onClick={handleExternalSubmit} disabled={isSaving} className="gap-2">
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Submit
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrint}
                                            disabled={activeFormKey !== "dependency-assessment" && activeFormKey !== "fall-risk-assessment" && activeFormKey !== "choking-risk-assessment-form" && !formDataForEdit}
                                            className="gap-2"
                                        >
                                            <Printer className="w-4 h-4" /> Print
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={handleCloseForm}><X className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div className="p-6 sm:p-10">
                                    {isViewOnly ? (
                                        <div className="relative">
                                            <CareFileDialogRenderer
                                                formKey={activeFormKey}
                                                residentId={residentId}
                                                teamId={activeTeamId ?? ""}
                                                organizationId={profile?.active_organization_id ?? ""}
                                                userId={profile?.id ?? ""}
                                                userName={profile?.name || profile?.email || "User"}
                                                userRole={profile?.role ?? ""}
                                                resident={resident}
                                                careHomeName={profile?.care_home_name ?? ""}
                                                teamName={profile?.active_team_name ?? ""}
                                                folderKey={folderKey}
                                                formDataForEdit={formDataForEdit}
                                                isReviewMode={isReviewMode}
                                                onClose={handleCloseForm}
                                                isInline={true}
                                                viewOnly={true}
                                                refreshForms={refreshForms}
                                                onSaveSuccess={handleSaveSuccess}
                                                orgLogoUrl={activeOrganization?.logo_url}
                                            />
                                        </div>
                                    ) : (
                                        <Dialog open={true} modal={false}>
                                            <DialogPrimitive.Title className="sr-only">
                                                {activeFormKey === "care-plan-form" ? (formDataForEdit?.care_plan_type || "Care Plan") : (folder.forms.find(f => f.key === activeFormKey)?.value || "Form")}
                                            </DialogPrimitive.Title>
                                            <DialogPrimitive.Content asChild>
                                                <div className="relative">
                                                    <CareFileDialogRenderer formKey={activeFormKey} residentId={residentId} teamId={activeTeamId ?? ""} organizationId={profile?.active_organization_id ?? ""} userId={profile?.id ?? ""} userName={profile?.name || profile?.email || "User"} userRole={profile?.role ?? ""} resident={resident} careHomeName={profile?.care_home_name ?? ""} teamName={profile?.active_team_name ?? ""} folderKey={folderKey} formDataForEdit={formDataForEdit} isReviewMode={isReviewMode} onClose={handleCloseForm} isInline={true} newCarePlanName={selectedCarePlanName} refreshForms={refreshForms} onSaveSuccess={handleSaveSuccess} orgLogoUrl={activeOrganization?.logo_url} />
                                                </div>
                                            </DialogPrimitive.Content>
                                        </Dialog>
                                    )}

                                    {activeFormKey === "care-plan-form" && (formDataForEdit?.id || formDataForEdit?._id) && (
                                        <div className="mt-8 pt-8 border-t">
                                            <CarePlanEvaluations
                                                carePlanId={formDataForEdit.id || formDataForEdit._id}
                                                residentId={residentId}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8 text-muted-foreground">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2"><FileText className="w-8 h-8" /></div>
                            <h3 className="text-lg font-medium text-foreground">Select an item</h3>
                            <p className="max-w-xs text-sm">Pick a form, care plan or document from the right panel to view its details.</p>
                        </div>
                    )}
                </main>

                <aside className={`flex-shrink-0 border-l bg-background h-full transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-0 opacity-0 invisible" : "w-[200px] opacity-100"
                    } overflow-y-auto overflow-x-hidden p-3`}>
                    <div className="flex flex-col gap-6">
                        {folder.forms.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Forms</p>
                                    {formsLoading && (
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    {folder.forms.map((form) => {
                                        const isActive = activeFormKey === form.key;
                                        const formState = formsLoading ? { status: "not-started" as const, hasData: false, isAudited: false } : getFormState(form.key as CareFileFormKey);
                                        const isLink = form.type === "link";
                                        return (
                                            <button key={form.key} onClick={() => handleFormClick(form.key as CareFileFormKey)} disabled={formsLoading || !canFillForms} className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"} ${(form as any).isComingSoon || formsLoading ? 'opacity-50' : ''} disabled:cursor-wait`}>
                                                {!isLink && (
                                                    <FormStatusIndicator status={formState.status} className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                )}
                                                {isLink && (
                                                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold leading-tight mb-0.5">{form.value}</p>
                                                    {(form as any).isComingSoon ? (
                                                        <Badge variant="outline" className="text-[8px] h-3 px-1">SOON</Badge>
                                                    ) : formsLoading ? (
                                                        <span className="inline-block h-2 w-10 bg-muted rounded animate-pulse" />
                                                    ) : !isLink && (
                                                        <FormStatusBadge status={formState.status} isAudited={formState.isAudited} />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {((folder as any).carePlan || activeCarePlanForms.length > 0) && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Care Plans</p>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsCarePlanSelectionOpen(true)}><Plus className="h-3 w-3" /></Button>
                                </div>
                                {activeCarePlanForms.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                        {activeCarePlanForms.map((cp) => (
                                            <button
                                                key={cp._id}
                                                onClick={() => {
                                                    setActiveFileId(null);
                                                    setActiveFormKey("care-plan-form" as CareFileFormKey);
                                                    setFormDataForEdit(cp);
                                                    setSelectedCarePlanName(undefined);
                                                    setIsViewOnly(true);
                                                    setIsReviewMode(false);
                                                }}
                                                className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${activeFormKey === "care-plan-form" && (formDataForEdit?._id === cp._id || formDataForEdit?.id === cp.id) ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"}`}
                                            >
                                                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold leading-tight truncate">{cp.care_plan_type || "Care Plan"}</p>
                                                    <p className="text-[10px] text-muted-foreground">Last updated: {new Date(cp._creationTime).toLocaleDateString()}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : <div className="px-2 py-3 border border-dashed rounded-lg text-center"><p className="text-[10px] text-muted-foreground italic">No care plans yet</p></div>}
                            </div>
                        )}

                        {(folderKey === "v2-hygiene" || folderKey === "v2-skin-integrity") && (
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                                    Body Map
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsBodyMapDialogOpen(true);
                                    }}
                                    className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all hover:bg-muted/60"
                                >
                                    <MapIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold leading-tight mb-0.5 truncate">
                                            Body Map
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {folderBodyMap && folderBodyMap.body_map_data && folderBodyMap.body_map_data.sessions.length > 0
                                                ? `${folderBodyMap.body_map_data.sessions.reduce((count, s) => count + (s.entries?.length || 0), 0)} observations`
                                                : "No body map yet"}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Documents</p>
                                {folderKey === "v2-mobility" ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 hover:bg-muted"
                                                title="Upload PDF"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("Physiotherapy");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                Physiotherapy
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("OT");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                OT
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("Falls Team");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                Falls Team
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : folderKey === "v2-nutrition-hydration" ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 hover:bg-muted"
                                                title="Upload PDF"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("GP input");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                GP input
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("SALT");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                SALT
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("Dietitian");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                Dietitian
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : folderKey === "v2-incontinence" ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 hover:bg-muted"
                                                title="Upload PDF"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setUploadDefaultFileName("Incontinence Team reports");
                                                setIsUploadModalOpen(true);
                                            }}>
                                                Incontinence Team reports
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <UploadFileModal
                                        folderName={folder.value || folderKey}
                                        residentId={residentId}
                                        variant="icon"
                                        onUploaded={fetchUploadedFiles}
                                    />
                                )}
                            </div>

                            <UploadFileModal
                                folderName={folder.value || folderKey}
                                residentId={residentId}
                                variant="none"
                                open={isUploadModalOpen}
                                onOpenChange={setIsUploadModalOpen}
                                defaultFileName={uploadDefaultFileName}
                                onUploaded={fetchUploadedFiles}
                            />
                            {filesLoading ? (
                                <div className="flex items-center justify-center p-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                            ) : uploadedFiles.length === 0 ? (
                                <div className="px-2 py-3 border border-dashed rounded-lg text-center"><p className="text-[10px] text-muted-foreground italic">No uploads found</p></div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {uploadedFiles.map((file) => {
                                        const isActive = activeFileId === file.id;
                                        return (
                                            <div key={file.id} className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg transition-all ${isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"}`}>
                                                <button onClick={() => handleFileClick(file.id)} className="flex items-start gap-2 flex-1 min-w-0 text-left">
                                                    <Paperclip className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                                                    <div className="min-w-0"><p className="text-xs font-semibold leading-tight truncate">{file.name}</p></div>
                                                </button>
                                                <button onClick={(e) => handleDeleteFile(file, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            <Dialog open={isCarePlanSelectionOpen} onOpenChange={setIsCarePlanSelectionOpen}>
                <DialogContent className="max-w-md p-6">
                    <DialogHeader className="mb-4 text-center sm:text-left">
                        <DialogTitle className="text-sm font-semibold">Select Care Plan Type</DialogTitle>
                        <DialogPrimitive.Description className="text-[10px]">Choose a care plan to add</DialogPrimitive.Description>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="cursor-pointer hover:bg-muted/50 p-2.5 border" onClick={() => handleCarePlanSelect("General Care Plan")}>
                            <div className="flex items-start gap-2">
                                <div className="p-1.5 rounded-md bg-blue-100 text-blue-600"><FileText className="w-4 h-4" /></div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-xs">General Care Plan</h3>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">Generic documentation</p>
                                </div>
                            </div>
                        </Card>
                        {folder.value !== "General" && (
                            <Card className="cursor-pointer hover:bg-muted/50 p-2.5 border" onClick={() => handleCarePlanSelect(`${folder.value} Care Plan`)}>
                                <div className="flex items-start gap-2">
                                    <div className="p-1.5 rounded-md bg-green-100 text-green-600"><FileText className="w-4 h-4" /></div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-xs">{folder.value} Plan</h3>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">Specific for {folder.value}</p>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {folderKey === "v2-additional-cp" && (
                            <>
                                {[
                                    { title: "Altered State of Consciousness", desc: "ASC Care Plan" },
                                    { title: "Behaviour", desc: "Behaviour Care Plan" },
                                    { title: "Breathing", desc: "Breathing Care Plan" },
                                    { title: "Hypertension", desc: "Hypertension Care Plan" },
                                    { title: "Diabetes Management", desc: "Diabetes Management Care Plan" },
                                    { title: "Anaemia", desc: "Anaemia Care Plan" },
                                    { title: "Cognition", desc: "Cognition Care Plan" },
                                    { title: "Communication", desc: "Communication Care Plan" },
                                    { title: "Pain Assessment", desc: "Pain Assessment Care Plan" },
                                    { title: "Pain Management", desc: "Pain Management Care Plan" },
                                    { title: "Sleep", desc: "Sleep Care Plan" },
                                    { title: "End of Life", desc: "End of Life Care Plan" },
                                    { title: "DNACPR", desc: "DNACPR Care Plan" },
                                    { title: "Infection Control / Environmental", desc: "Infection Control Care Plan" },
                                    { title: "Expressing Sexuality", desc: "Expressing Sexuality Care Plan" },
                                    { title: "Sexual Needs", desc: "Sexual Needs Care Plan" },
                                    { title: "Spiritual Needs", desc: "Spiritual Needs Care Plan" }
                                ].map((plan) => (
                                    <Card
                                        key={plan.title}
                                        className="cursor-pointer hover:bg-muted/50 p-2.5 border"
                                        onClick={() => handleCarePlanSelect(`${plan.title} Care Plan`)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="p-1.5 rounded-md bg-purple-100 text-purple-600">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-xs text-left">{plan.title}</h3>
                                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                    {plan.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </>
                        )}
                        {folderKey === "v2-hygiene" && (
                            <>
                                <Card
                                    className="cursor-pointer hover:bg-muted/50 p-2.5 border"
                                    onClick={() => handleCarePlanSelect("Care Plan for Level of Assistance")}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-xs text-left">Level of Assistance</h3>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                Care Plan for Level of Assistance
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                                <Card
                                    className="cursor-pointer hover:bg-muted/50 p-2.5 border"
                                    onClick={() => handleCarePlanSelect("Pressure Ulcer Care Plan")}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="p-1.5 rounded-md bg-red-100 text-red-600">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-xs text-left">Pressure Ulcer</h3>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                Pressure Ulcer Care Plan
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </>
                        )}
                        {folderKey === "v2-medication" && (
                            <>
                                <Card className="cursor-pointer hover:bg-muted/50 p-2.5 border col-span-2 sm:col-span-1" onClick={() => handleCarePlanSelect("PRN Medication Care Plan")}>
                                    <div className="flex items-start gap-2">
                                        <div className="p-1.5 rounded-md bg-purple-100 text-purple-600"><FileText className="w-4 h-4" /></div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-xs">PRN Medication Care Plan</h3>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">Specialized documentation for PRN medications</p>
                                        </div>
                                    </div>
                                </Card>
                                <Card className="cursor-pointer hover:bg-muted/50 p-2.5 border col-span-2 sm:col-span-1" onClick={() => handleCarePlanSelect("Topical Creams Care Plan")}>
                                    <div className="flex items-start gap-2">
                                        <div className="p-1.5 rounded-md bg-pink-100 text-pink-600"><FileText className="w-4 h-4" /></div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-xs">Topical Creams Care Plan</h3>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">Specialized documentation for topical creams</p>
                                        </div>
                                    </div>
                                </Card>
                            </>
                        )}
                        {folderKey === "v2-safe-environment" && (
                            <Card className="cursor-pointer hover:bg-muted/50 p-2.5 border col-span-2" onClick={() => handleCarePlanSelect("Dementia/brain injury Care Plan")}>
                                <div className="flex items-start gap-2">
                                    <div className="p-1.5 rounded-md bg-orange-100 text-orange-600"><FileText className="w-4 h-4" /></div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-xs">Dementia/brain injury Care Plan</h3>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">Specialized documentation for dementia and brain injury</p>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {folderKey === "v2-mobility" && (
                            <Card
                                className="cursor-pointer hover:bg-muted/50 p-2.5 border col-span-2 sm:col-span-1"
                                onClick={() => handleCarePlanSelect("Assistance care plan")}
                            >
                                <div className="flex items-start gap-2">
                                    <div className="p-1.5 rounded-md bg-orange-100 text-orange-600">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-xs">Assistance Plan</h3>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                                            Care plan for assistance
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {folderKey === "v2-valuables" && (
                            <Card
                                className="cursor-pointer hover:bg-muted/50 p-2.5 border col-span-2"
                                onClick={() => handleCarePlanSelect("Residents’ Valuables and Personal Property Care Plan")}
                            >
                                <div className="flex items-start gap-2">
                                    <div className="p-1.5 rounded-md bg-yellow-100 text-yellow-600">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-xs text-left">Valuables Care Plan</h3>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                                            Care plan for residents&apos; valuables and personal property
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}
                        {folderKey === "v2-nutrition-hydration" && (
                            <>
                                {[
                                    { title: "Risk of Malnutrition", desc: "Care plan for malnutrition risk" },
                                    { title: "Supplements", desc: "Care plan for nutritional supplements" },
                                    { title: "Thickener", desc: "Care plan for fluid thickeners" },
                                    { title: "Risk of Choking", desc: "Care plan for choking risk" },
                                    { title: "Weight Loss", desc: "Care plan for weight loss management" },
                                    { title: "Diabetic Diet", desc: "Care plan for diabetic management" },
                                    { title: "Fluid Restriction", desc: "Care plan for fluid restriction" }
                                ].map((plan) => (
                                    <Card
                                        key={plan.title}
                                        className="cursor-pointer hover:bg-muted/50 p-2.5 border"
                                        onClick={() => handleCarePlanSelect(`Care Plan: ${plan.title}`)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="p-1.5 rounded-md bg-green-100 text-green-600">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-xs">{plan.title}</h3>
                                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                    {plan.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <BodyMapDialog
                isOpen={isBodyMapDialogOpen}
                onClose={() => {
                    setIsBodyMapDialogOpen(false);
                }}
                residentName={resident ? `${resident.first_name} ${resident.last_name}` : undefined}
                initialData={folderBodyMap?.body_map_data || undefined}
                onSave={handleBodyMapSave}
                incidentType={folder.value ? `${folder.value} Body Map` : "Care File Body Map"}
                incidentDate={new Date().toISOString().split("T")[0]}
                orgLogoUrl={activeOrganization?.logo_url}
                simpleMode={folderKey === "v2-medication" || folderKey === "v2-hygiene" || folderKey === "v2-skin-integrity" || folderKey === "v2-safeguarding"}
            />
        </div>
    );
}
