"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { dependencyAssessmentSchema, calculateDependencyScore, getDependencyLevel, type DependencyAssessmentFormData } from "@/schemas/residents/care-file/dependencyAssessmentSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { Resident } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface DependencyAssessmentDialogProps {
    teamId: string;
    residentId: string;
    organizationId: string;
    userId: string;
    userName?: string;
    resident: Resident;
    isEditMode?: boolean;
    initialData?: any;
    onClose: () => void;
    isInline?: boolean;
    viewOnly?: boolean;
}

export default function DependencyAssessmentDialog({
    teamId, residentId, organizationId, userId, userName, resident,
    isEditMode = false, initialData, onClose, isInline = false, viewOnly = false
}: DependencyAssessmentDialogProps) {
    const [currentScore, setCurrentScore] = useState(0);
    const [currentLevel, setCurrentLevel] = useState<string>("Low Dependency");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pastAssessments, setPastAssessments] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const { profile } = useProfile();

    const form = useForm<DependencyAssessmentFormData>({
        resolver: zodResolver(dependencyAssessmentSchema) as any,
        defaultValues: initialData ? {
            residentName: initialData.residentName || `${resident.first_name} ${resident.last_name}`,
            dateOfBirth: initialData.dateOfBirth || (resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : ""),
            dateOfAssessment: initialData.dateOfAssessment || new Date().toISOString().split("T")[0],
            time: initialData.time || new Date().toTimeString().slice(0, 5),
            completedBy: initialData.completedBy || profile?.name || "",
            signature: initialData.signature || "",
            mobility: initialData.assessment_details?.mobility || 0,
            dressing: initialData.assessment_details?.dressing || 0,
            personalHygiene: initialData.assessment_details?.personalHygiene || 0,
            feeding: initialData.assessment_details?.feeding || 0,
            eyesight: initialData.assessment_details?.eyesight || 0,
            hearing: initialData.assessment_details?.hearing || 0,
            pressureSoreRisk: initialData.assessment_details?.pressureSoreRisk || 0,
            continenceUrine: initialData.assessment_details?.continenceUrine || 0,
            continenceFaeces: initialData.assessment_details?.continenceFaeces || 0,
            communication: initialData.assessment_details?.communication || 0,
            socialDependency: initialData.assessment_details?.socialDependency || 0,
            behaviour: initialData.assessment_details?.behaviour || 0,
        } : {
            residentName: `${resident.first_name} ${resident.last_name}`,
            dateOfBirth: resident.date_of_birth ? new Date(typeof resident.date_of_birth === 'number' ? resident.date_of_birth : resident.date_of_birth).toISOString().split("T")[0] : "",
            dateOfAssessment: new Date().toISOString().split("T")[0],
            time: new Date().toTimeString().slice(0, 5),
            completedBy: userName || profile?.name || "",
            signature: "",
            mobility: 0, dressing: 0, personalHygiene: 0, feeding: 0, eyesight: 0, hearing: 0,
            pressureSoreRisk: 0, continenceUrine: 0, continenceFaeces: 0, communication: 0,
            socialDependency: 0, behaviour: 0
        }
    });

    const watchedValues = form.watch();

    useEffect(() => {
        const score = calculateDependencyScore(watchedValues);
        const level = getDependencyLevel(score);
        setCurrentScore(score);
        setCurrentLevel(level);
    }, [watchedValues]);

    const fetchHistory = async () => {
        if (!residentId) return;
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('dependency_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (error) throw error;
            setPastAssessments(data || []);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [residentId]);

    useEffect(() => {
        if (!form.getValues("completedBy")) {
            const name = userName || profile?.name;
            if (name) {
                form.setValue("completedBy", name);
            }
        }
    }, [userName, profile, form]);

    const onSubmit = async (data: DependencyAssessmentFormData) => {
        try {
            setIsSubmitting(true);
            const currentUserId = userId;
            if (!currentUserId) throw new Error("User not authenticated");

            const assessmentDetails = {
                mobility: data.mobility,
                dressing: data.dressing,
                personalHygiene: data.personalHygiene,
                feeding: data.feeding,
                eyesight: data.eyesight,
                hearing: data.hearing,
                pressureSoreRisk: data.pressureSoreRisk,
                continenceUrine: data.continenceUrine,
                continenceFaeces: data.continenceFaeces,
                communication: data.communication,
                socialDependency: data.socialDependency,
                behaviour: data.behaviour,
            };

            const payload = {
                resident_id: residentId,
                team_id: teamId,
                organization_id: organizationId,
                user_id: currentUserId,
                created_by: currentUserId,
                assessment_date: data.dateOfAssessment ? new Date(`${data.dateOfAssessment}T${data.time || "00:00"}`).toISOString() : new Date().toISOString(),
                completed_by: data.completedBy,
                assessment_details: assessmentDetails,
                total_score: currentScore,
                dependency_level: currentLevel,
                signature: data.signature,
                saved_as_draft: data.savedAsDraft || false
            };

            await submitAssessmentWithVersioning(
                'dependency_assessments',
                payload,
                initialData,
                isEditMode
            );

            if (isEditMode && initialData?.id) {
                toast.success("Dependency Assessment updated");
            } else {
                toast.success("Dependency Assessment submitted");
                form.reset({
                    ...form.getValues(),
                    mobility: 0, dressing: 0, personalHygiene: 0, feeding: 0, eyesight: 0, hearing: 0,
                    pressureSoreRisk: 0, continenceUrine: 0, continenceFaeces: 0, communication: 0,
                    socialDependency: 0, behaviour: 0
                });
                fetchHistory();
            }
            if (!isInline) onClose();
        } catch (error) {
            console.error("Error submitting:", error);
            toast.error("Failed to submit assessment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const AssessmentField = ({ label, name, options }: { label: string; name: keyof DependencyAssessmentFormData; options: { label: string; value: number }[] }) => {
        const value = form.watch(name as any);
        return (
            <div className="space-y-3 p-4 border rounded-lg bg-card">
                <h3 className="font-semibold text-sm border-b pb-2">{label}</h3>
                <RadioGroup
                    value={value?.toString()}
                    onValueChange={(val) => form.setValue(name as any, parseInt(val))}
                    className="grid gap-2"
                >
                    {options.map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.value.toString()} id={`${name}-${opt.value}`} />
                            <Label htmlFor={`${name}-${opt.value}`} className="text-sm font-normal cursor-pointer flex-1">
                                {opt.label} ({opt.value} pts)
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        );
    };

    return (
        <>
            {!isInline && (
                <DialogHeader>
                    <DialogTitle className="text-xl">Dependency Assessment</DialogTitle>
                    <DialogDescription>Complete the assessment by selecting the appropriate level for each category</DialogDescription>
                </DialogHeader>
            )}

            <div className="mb-4 p-4 border-2 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Dependency Score</p>
                        <p className="text-3xl font-bold mt-1">{currentScore} pts</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">Dependency Level</p>
                        <p className={`text-xl font-bold mt-1 ${currentLevel === "Low Dependency" ? "text-emerald-600" :
                            currentLevel === "Medium Dependency" ? "text-yellow-600" :
                                currentLevel === "High Dependency" ? "text-orange-600" : "text-red-600"
                            }`}>{currentLevel}</p>
                    </div>
                </div>
            </div>

            <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 pb-20">
                    <button
                        type="button"
                        id="care-file-submit-btn"
                        className="hidden"
                        onClick={form.handleSubmit(onSubmit as any, (errors) => {
                            console.error("Form errors:", errors);
                            toast.error("Please fill in all required fields correctly.");
                        })}
                    />
                    <div className="space-y-4 p-4 border rounded-lg bg-card">
                        <h3 className="font-semibold text-sm border-b pb-2">Resident Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="residentName" className="text-sm">Resident Name</Label>
                                <Input id="residentName" {...form.register("residentName")} disabled className="text-sm bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth</Label>
                                <Input id="dateOfBirth" {...form.register("dateOfBirth")} disabled className="text-sm bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateOfAssessment" className="text-sm">Date of Assessment</Label>
                                <Input id="dateOfAssessment" type="date" {...form.register("dateOfAssessment")} className="text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time" className="text-sm">Time of Assessment</Label>
                                <Input id="time" type="time" {...form.register("time")} className="text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AssessmentField
                            label="A. MOBILITY"
                            name="mobility"
                            options={[
                                { label: "Manages unaided", value: 0 },
                                { label: "Uses an aid", value: 1 },
                                { label: "Requires assistance of 1 person", value: 2 },
                                { label: "Requires assistance of 2 people", value: 3 },
                                { label: "Bedfast / chairbound", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="B. DRESSING"
                            name="dressing"
                            options={[
                                { label: "Manages unaided", value: 0 },
                                { label: "Uses an aid / equipment", value: 1 },
                                { label: "Requires the help of 1 person", value: 2 },
                                { label: "Is totally reliant on 1 person", value: 3 },
                                { label: "Needs help of more than 1 person", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="C. PERSONAL HYGIENE"
                            name="personalHygiene"
                            options={[
                                { label: "Manages unaided", value: 0 },
                                { label: "Washes / needs help to bath", value: 1 },
                                { label: "Needs help of 1 to wash & bathe", value: 2 },
                                { label: "Is totally reliant on 1 person", value: 3 },
                                { label: "Needs help of more than 1 person", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="D. FEEDING"
                            name="feeding"
                            options={[
                                { label: "Manages unaided", value: 0 },
                                { label: "Uses aids / equipment", value: 1 },
                                { label: "Needs assistance with feeding", value: 2 },
                                { label: "Needs feeding", value: 3 },
                                { label: "Choke risk", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="E. EYESIGHT"
                            name="eyesight"
                            options={[
                                { label: "Good without spectacles / lenses", value: 0 },
                                { label: "Good with spectacles / lenses", value: 1 },
                                { label: "Poor with spectacles / lenses", value: 2 },
                                { label: "Very poor with spectacles / lenses", value: 3 },
                                { label: "Completely unsighted", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="F. HEARING"
                            name="hearing"
                            options={[
                                { label: "Good with no hearing aid", value: 0 },
                                { label: "Good with hearing aid", value: 1 },
                                { label: "Mild loss without hearing aid", value: 2 },
                                { label: "Severe loss without hearing aid", value: 3 },
                                { label: "Completely deaf", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="G. PRESSURE SORE RISK (Braden)"
                            name="pressureSoreRisk"
                            options={[
                                { label: "No at risk (Over 16)", value: 0 },
                                { label: "Low Risk (15-16)", value: 1 },
                                { label: "Medium Risk (13-14)", value: 2 },
                                { label: "High Risk (10-12)", value: 3 },
                                { label: "Very High Risk (Under 9)", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="H. CONTINENCE (Urine)"
                            name="continenceUrine"
                            options={[
                                { label: "Has full control of bladder", value: 0 },
                                { label: "Needs supervision / reminding", value: 1 },
                                { label: "Occasionally incontinent by day", value: 2 },
                                { label: "Continent with bladder training", value: 3 },
                                { label: "Regularly incontinent / Catheterised / Urostomy", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="I. CONTINENCE (Faeces)"
                            name="continenceFaeces"
                            options={[
                                { label: "Has full control", value: 0 },
                                { label: "Regular enemata / suppositories", value: 1 },
                                { label: "Occasionally incontinent", value: 2 },
                                { label: "Colostomy / Ileostomy", value: 3 },
                                { label: "Regularly incontinent", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="J. COMMUNICATION"
                            name="communication"
                            options={[
                                { label: "Retains information and is able to indicate needs verbally", value: 0 },
                                { label: "Retains most information and can indicate needs verbally", value: 1 },
                                { label: "Difficulty speaking but retains information and indicates needs non-verbally", value: 2 },
                                { label: "Can speak but cannot indicate needs or retain information", value: 3 },
                                { label: "No effective means of communication", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="K. SOCIAL DEPENDENCY"
                            name="socialDependency"
                            options={[
                                { label: "Able to cope / informal support / carer giving sustained support", value: 0 },
                                { label: "Informal support / carer coping but possibility of a breakdown", value: 1 },
                                { label: "Main carer frequently absent", value: 2 },
                                { label: "Unable to manage alone", value: 3 },
                                { label: "Unable to manage alone and at risk", value: 4 },
                            ]}
                        />

                        <AssessmentField
                            label="L. BEHAVIOUR"
                            name="behaviour"
                            options={[
                                { label: "Alert / sociable", value: 0 },
                                { label: "Forgetful / vague / Walking by day/night", value: 2 },
                                { label: "Apathetic / withdrawn", value: 4 },
                                { label: "Very confused", value: 6 },
                                { label: "Verbally abusive", value: 8 },
                                { label: "Physically aggressive", value: 10 },
                            ]}
                        />
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg bg-card">
                        <h3 className="font-semibold text-sm border-b pb-2">Completion</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="completedBy" className="text-sm">Name of Person Filling</Label>
                                <Input id="completedBy" {...form.register("completedBy")} className="text-sm" placeholder="Enter name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signature" className="text-sm">Signature</Label>
                                <Input id="signature" {...form.register("signature")} className="text-sm" placeholder="e-Signature" />
                            </div>
                        </div>
                    </div>

                    {!isInline && !viewOnly && (
                        <div className="flex items-center justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 pb-2 z-10">
                            <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={isSubmitting}>Cancel</Button>
                            <Button
                                onClick={() => {
                                    form.handleSubmit(onSubmit as any, (errors) => {
                                        console.error("Form errors:", errors);
                                        toast.error("Please fill in all required fields");
                                    })();
                                }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Submitting..." : isEditMode ? "Update" : "Submit"}
                            </Button>
                        </div>
                    )}
                </form>
            </fieldset>

            <div className="mt-12 space-y-6">
                <h3 className="text-xl font-bold border-b pb-2">Past Assessments</h3>
                {isLoadingHistory ? (
                    <div className="flex justify-center p-8"><p className="text-muted-foreground animate-pulse text-sm">Loading history...</p></div>
                ) : pastAssessments.length === 0 ? (
                    <div className="text-center p-8 border rounded-lg bg-muted/20"><p className="text-muted-foreground text-sm">No previous assessments found</p></div>
                ) : (
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="whitespace-nowrap">Date</TableHead>
                                    <TableHead className="whitespace-nowrap">Completed By</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Mob</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Dre</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Hyg</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Fed</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Eye</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Hea</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Brad</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Uri</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Fae</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Com</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Soc</TableHead>
                                    <TableHead className="text-center font-bold text-[10px] uppercase">Beh</TableHead>
                                    <TableHead className="text-center font-bold">Total</TableHead>
                                    <TableHead className="text-right">Level</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pastAssessments.map((assessment) => (
                                    <TableRow key={assessment.id} className="hover:bg-muted/30 text-xs">
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {format(new Date(assessment.assessment_date), "dd/MM/yyyy")}
                                        </TableCell>
                                        <TableCell className="max-w-[100px] truncate">{assessment.completed_by}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.mobility}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.dressing}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.personalHygiene}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.feeding}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.eyesight}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.hearing}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.pressureSoreRisk}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.continenceUrine}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.continenceFaeces}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.communication}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.socialDependency}</TableCell>
                                        <TableCell className="text-center">{assessment.assessment_details?.behaviour}</TableCell>
                                        <TableCell className="text-center font-bold">{assessment.total_score} pts</TableCell>
                                        <TableCell className="text-right">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${assessment.dependency_level === "Low Dependency" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                                assessment.dependency_level === "Medium Dependency" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                                    assessment.dependency_level === "High Dependency" ? "bg-orange-100 text-orange-800 border border-orange-200" :
                                                        "bg-rose-100 text-rose-800 border border-rose-200"
                                                }`}>
                                                {assessment.dependency_level.split(' ')[0]}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    );
}
