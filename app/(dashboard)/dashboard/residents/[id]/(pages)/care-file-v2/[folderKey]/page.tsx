"use client";

import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { useFolderForms } from "@/hooks/use-folder-forms";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { canFillCareFileForms } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { CareFileFormKey } from "@/types/care-files";
import { config } from "@/config";
import { ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2, Plus, X, Edit3, Printer, History, Clock, FileCheck, ChevronRight, ExternalLink } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
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
    "care-plan-form": "care_plan_assessments"
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
            <div className="flex-1 overflow-auto bg-muted/30">
                {isPdf && <iframe src={url} className="w-full h-full border-none" title={file.name} />}
                {isImage && (
                    <div className="flex items-center justify-center h-full p-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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

    const fetchUploadedFiles = useCallback(async () => {
        if (!residentId || !folder) return;
        setFilesLoading(true);
        const { data, error } = await supabase.from("files").select("id, name, original_name, file_size, storage_path, file_type, created_at").eq("resident_id", residentId)
            .eq("folder_name", folder.value || folderKey).order("created_at", { ascending: false });
        if (!error && data) setUploadedFiles(data as UploadedFile[]);
        setFilesLoading(false);
    }, [residentId, folder, folderKey]);

    useEffect(() => { fetchUploadedFiles(); }, [fetchUploadedFiles]);

    const handleFormClick = async (key: CareFileFormKey) => {
        const v2Form = folder?.forms.find(f => f.key === key);
        if (v2Form?.isComingSoon) {
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
        if (formState.hasData) {
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

    const handlePrint = async () => {
        if (!activeFormKey || !formDataForEdit || !resident) return;
        const formName = activeFormKey === "care-plan-form" ? (formDataForEdit.care_plan_type || "Care Plan") : (folder?.forms.find(f => f.key === activeFormKey)?.value || "Form");

        toast.info(`Generating PDF for ${formName}...`);

        let dataToPrint = { ...formDataForEdit };

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
                    evaluationDate: e.evaluation_date || e.created_at,
                    progress_notes: e.progress_notes || e.comments
                }));
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
        if (submitBtn) submitBtn.click();
        else toast.error("Form submission button not found");
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
        <div className="flex flex-col -mx-16 -mt-16 -mb-6 h-screen overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center gap-3 px-6 py-3 bg-background border-b flex-shrink-0">
                <button onClick={() => router.push(`/dashboard/residents/${residentId}/care-file-v2` as any)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Care File V2</span> <span>/</span> <span className="font-medium text-foreground">{folder.value}</span>
                    {activeFormKey && <><span>/</span> <span className="text-foreground">{folder.forms.find(f => f.key === activeFormKey)?.value || "Form"}</span></>}
                    {activeFile && <><span>/</span> <span className="text-foreground">{activeFile.name}</span></>}
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/10">
                    {activeFile ? <FileViewer file={activeFile} /> : activeFormKey && resident ? (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin">
                            <div className="mx-auto w-full max-w-4xl bg-background rounded-xl border shadow-sm mb-8 overflow-visible">
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
                                                <Button variant="outline" size="sm" onClick={() => { setIsViewOnly(false); setIsReviewMode(true); }} className="gap-2">
                                                    <Edit3 className="w-4 h-4" /> Edit
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={handlePrint} disabled={!formDataForEdit} className="gap-2">
                                                    <Printer className="w-4 h-4" /> Print
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="outline" size="sm" onClick={handleCloseForm} disabled={isSaving}>Cancel</Button>
                                                <Button size="sm" onClick={handleExternalSubmit} disabled={isSaving} className="gap-2">
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Submit
                                                </Button>
                                            </>
                                        )}
                                        <Button variant="ghost" size="icon" onClick={handleCloseForm}><X className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                                <div className="p-6 sm:p-10">
                                    {isViewOnly ? (
                                        <RiskAssessmentViewer assessment={{ formKey: activeFormKey, formId: formDataForEdit?.id || formDataForEdit?._id, name: activeFormKey === "care-plan-form" ? (formDataForEdit?.care_plan_type || "Care Plan") : (folder.forms.find(f => f.key === activeFormKey)?.value || "Form"), completedAt: formDataForEdit?.created_at || formDataForEdit?._creationTime }} />
                                    ) : (
                                        <Dialog open={true} modal={false}>
                                            <DialogPrimitive.Title className="sr-only">
                                                {activeFormKey === "care-plan-form" ? (formDataForEdit?.care_plan_type || "Care Plan") : (folder.forms.find(f => f.key === activeFormKey)?.value || "Form")}
                                            </DialogPrimitive.Title>
                                            <DialogPrimitive.Content asChild>
                                                <div className="relative">
                                                    <CareFileDialogRenderer formKey={activeFormKey} residentId={residentId} teamId={activeTeamId ?? ""} organizationId={profile?.active_organization_id ?? ""} userId={profile?.id ?? ""} userName={profile?.name || profile?.email || "User"} userRole={profile?.role ?? ""} resident={resident} careHomeName={profile?.care_home_name ?? ""} folderKey={folderKey} formDataForEdit={formDataForEdit} isReviewMode={isReviewMode} onClose={handleCloseForm} isInline={true} newCarePlanName={selectedCarePlanName} />
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

                <aside className="w-[200px] flex-shrink-0 border-l bg-background h-full p-3 overflow-y-auto">
                    <div className="flex flex-col gap-6">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Forms</p>
                            <div className="flex flex-col gap-1">
                                {folder.forms.map((form) => {
                                    const isActive = activeFormKey === form.key;
                                    const formState = formsLoading ? { status: "not-started" as const, hasData: false, isAudited: false } : getFormState(form.key as CareFileFormKey);
                                    const isLink = form.type === "link";
                                    return (
                                        <button key={form.key} onClick={() => handleFormClick(form.key as CareFileFormKey)} disabled={!canFillForms} className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-all ${isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60 text-foreground"} ${form.isComingSoon ? 'opacity-50' : ''}`}>
                                            {!isLink && (
                                                <FormStatusIndicator status={formState.status} className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                            )}
                                            {isLink && (
                                                <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold leading-tight mb-0.5">{form.value}</p>
                                                {form.isComingSoon ? (
                                                    <Badge variant="outline" className="text-[8px] h-3 px-1">SOON</Badge>
                                                ) : !isLink && (
                                                    <FormStatusBadge status={formState.status} isAudited={formState.isAudited} />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

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

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Documents</p>
                                <UploadFileModal folderName={folder.value || folderKey} residentId={residentId} variant="icon" onUploaded={fetchUploadedFiles} />
                            </div>
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
                <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg rounded-lg overflow-hidden">
                    <div className="mb-4 text-center sm:text-left">
                        <DialogPrimitive.Title className="text-sm font-semibold">Select Care Plan Type</DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-[10px]">Choose a care plan to add</DialogPrimitive.Description>
                    </div>
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
                    </div>
                </DialogPrimitive.Content>
            </Dialog>
        </div>
    );
}
