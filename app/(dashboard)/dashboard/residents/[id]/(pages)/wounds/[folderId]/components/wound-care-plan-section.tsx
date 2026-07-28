"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FileText, Loader2, Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { CareFileDialogRenderer } from "@/components/residents/carefile/folders/CareFileDialogRenderer";
import { CarePlanEvaluations } from "@/components/residents/carefile/CarePlanEvaluations";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface WoundCarePlanSectionProps {
    residentId: string;
    folderId: string;
    resident: any;
}

export function WoundCarePlanSection({ residentId, folderId, resident }: WoundCarePlanSectionProps) {
    const { profile } = useProfile();
    const { activeTeamId } = useActiveTeam();
    const [activeCarePlans, setActiveCarePlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFormKey, setActiveFormKey] = useState<any>(null);
    const [formDataForEdit, setFormDataForEdit] = useState<any>(undefined);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeOrganization, setActiveOrganization] = useState<any>(null);

    const fetchCarePlans = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('care_plan_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .eq('wound_folder_id', folderId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActiveCarePlans(data || []);
        } catch (error) {
            console.error("Error fetching wound care plans:", error);
            toast.error("Failed to load care plans");
        } finally {
            setLoading(false);
        }
    }, [residentId, folderId]);

    useEffect(() => {
        fetchCarePlans();
    }, [fetchCarePlans]);

    useEffect(() => {
        if (profile?.active_organization_id) {
            supabase.from("organizations").select("*").eq("id", profile.active_organization_id).single()
                .then(({ data, error }) => { if (!error) setActiveOrganization(data); });
        }
    }, [profile?.active_organization_id]);

    const handleCreateNew = () => {
        setFormDataForEdit(null);
        setIsReviewMode(false);
        setIsViewOnly(false);
        setActiveFormKey("care-plan-form");
    };

    const handleEdit = (cp: any) => {
        setFormDataForEdit(cp);
        setIsViewOnly(true);
        setIsReviewMode(false);
        setActiveFormKey("care-plan-form");
    };

    const handleCloseForm = () => {
        setActiveFormKey(null);
        setFormDataForEdit(undefined);
        setIsReviewMode(false);
        setIsViewOnly(false);
        fetchCarePlans();
    };

    const handleSaveSuccess = (data: any) => {
        setFormDataForEdit(data);
        setIsViewOnly(true);
        setIsReviewMode(false);
        setIsSaving(false);
        fetchCarePlans();
    };

    const handleExternalSubmit = () => {
        const submitBtn = document.getElementById('care-file-submit-btn');
        if (submitBtn) {
            setIsSaving(true);
            submitBtn.click();
            setTimeout(() => setIsSaving(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Care Plans
                </h2>
                <Button onClick={handleCreateNew} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Care Plan
                </Button>
            </div>

            {activeCarePlans.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {activeCarePlans.map((cp) => (
                        <Card key={cp.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all">
                            <CardHeader className="bg-muted/30 py-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-bold">{cp.care_plan_type || "Care Plan"}</CardTitle>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(cp)} className="gap-2 text-xs">
                                        <Edit3 className="w-3.5 h-3.5" />
                                        {profile?.role === "rqia" ? "View" : "View/Edit"}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1.5">
                                        Created: {new Date(cp.created_at).toLocaleDateString()}
                                    </span>
                                    {cp.goals?.writtenBy && (
                                        <span className="flex items-center gap-1.5">
                                            By: {cp.goals.writtenBy}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Identified Needs</h4>
                                            <p className="text-sm line-clamp-3">{cp.need_identified}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Aims</h4>
                                            <p className="text-sm line-clamp-2">{cp.goals?.aims}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <CarePlanEvaluations carePlanId={cp.id} residentId={residentId} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10 text-muted-foreground">
                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-foreground">No Care Plans yet</h3>
                    <p className="max-w-xs text-center text-sm mt-2 mb-6">Create a structured care plan specifically for this wound to track goals and interventions.</p>
                    {profile?.role !== "rqia" && (
                        <Button onClick={handleCreateNew} variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create First Care Plan
                        </Button>
                    )}
                </div>
            )}

            {activeFormKey && (
                <Dialog open={true} onOpenChange={(open) => !open && handleCloseForm()}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                        <DialogPrimitive.Title className="sr-only">
                            {formDataForEdit?.care_plan_type || "Wound Care Plan"}
                        </DialogPrimitive.Title>
                        <div className="flex flex-col h-full bg-background rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/5 sticky top-0 z-10 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg"><FileText className="w-5 h-5 text-primary" /></div>
                                    <div>
                                        <h2 className="text-lg font-bold leading-none">{formDataForEdit?.care_plan_type || "Wound Care Plan"}</h2>
                                        {isViewOnly && formDataForEdit && <p className="text-xs text-muted-foreground mt-1">Updated on {new Date(formDataForEdit.updated_at || formDataForEdit.created_at).toLocaleDateString()}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isViewOnly ? (
                                        profile?.role !== "rqia" && (
                                            <Button variant="outline" size="sm" onClick={() => { setIsViewOnly(false); setIsReviewMode(true); }} className="gap-2">
                                                <Edit3 className="w-4 h-4" /> Edit
                                            </Button>
                                        )
                                    ) : (
                                        <Button size="sm" onClick={handleExternalSubmit} disabled={isSaving} className="gap-2">
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Submit
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={handleCloseForm}><X className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <div className="p-6 sm:p-10">
                                <CareFileDialogRenderer
                                    formKey={activeFormKey}
                                    residentId={residentId}
                                    teamId={activeTeamId ?? ""}
                                    organizationId={profile?.active_organization_id ?? ""}
                                    userId={profile?.id ?? ""}
                                    userName={profile?.name || profile?.email || "User"}
                                    userRole={profile?.role ?? ""}
                                    resident={resident}
                                    formDataForEdit={formDataForEdit}
                                    isReviewMode={isReviewMode}
                                    onClose={handleCloseForm}
                                    isInline={true}
                                    viewOnly={isViewOnly}
                                    refreshForms={fetchCarePlans}
                                    onSaveSuccess={handleSaveSuccess}
                                    orgLogoUrl={activeOrganization?.logo_url}
                                    woundFolderId={folderId}
                                />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
