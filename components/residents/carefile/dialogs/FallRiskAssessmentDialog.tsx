"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { fallRiskAssessmentSchema, calculateFallRiskScore, getFallRiskLevel, FALL_RISK_OPTIONS, type FallRiskAssessmentFormData } from "@/schemas/residents/care-file/fallRiskAssessmentSchema";
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

interface FallRiskAssessmentDialogProps {
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

export default function FallRiskAssessmentDialog({
    teamId, residentId, organizationId, userId, userName, resident,
    isEditMode = false, initialData, onClose, isInline = false, viewOnly = false
}: FallRiskAssessmentDialogProps) {
    const [currentScore, setCurrentScore] = useState(0);
    const [currentLevel, setCurrentLevel] = useState<string>("Low Risk");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pastAssessments, setPastAssessments] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const { profile } = useProfile();

    const form = useForm<FallRiskAssessmentFormData>({
        resolver: zodResolver(fallRiskAssessmentSchema) as any,
        defaultValues: initialData ? {
            residentName: initialData.residentName || `${resident.first_name} ${resident.last_name}`,
            dateOfBirth: initialData.dateOfBirth || (resident.date_of_birth ? new Date(resident.date_of_birth).toISOString().split("T")[0] : ""),
            dateOfAssessment: initialData.assessment_date ? new Date(initialData.assessment_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            time: initialData.assessment_date ? new Date(initialData.assessment_date).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5),
            completedBy: initialData.completed_by || profile?.name || "",
            signature: initialData.signature || "",
            age: initialData.assessment_details?.age?.toString() || "Under 65",
            gender: initialData.assessment_details?.gender?.toString() || "Male",
            historyOfFalls: initialData.assessment_details?.historyOfFalls?.toString() || "Never Fallen",
            mobilityLevel: initialData.assessment_details?.mobilityLevel?.toString() || "Independent and safe unaided",
            balance: initialData.assessment_details?.balance?.toString() || "Yes",
            adlPersonal: initialData.assessment_details?.adlPersonal?.toString() || "Independent & Safe",
            adlDomestic: initialData.assessment_details?.adlDomestic?.toString() || "Independent & Safe",
            footwear: initialData.assessment_details?.footwear?.toString() || "Safe",
            visionProblems: initialData.assessment_details?.visionProblems?.toString() || "No",
            bladderBowel: initialData.assessment_details?.bladderBowel?.toString() || "No identified problems",
            environmentalRisks: initialData.assessment_details?.environmentalRisks?.toString() || "No",
            socialRisks: initialData.assessment_details?.socialRisks?.toString() || "24-hour care",
            medicalConditions: initialData.assessment_details?.medicalConditions?.toString() || "No identified medical conditions",
            medicines: initialData.assessment_details?.medicines?.toString() || "No medicines",
            safetyAwareness: initialData.assessment_details?.safetyAwareness?.toString() || "Yes",
            mentalState: initialData.assessment_details?.mentalState?.toString() || "Orientated",
        } : {
            residentName: `${resident.first_name} ${resident.last_name}`,
            dateOfBirth: resident.date_of_birth ? new Date(typeof resident.date_of_birth === 'number' ? resident.date_of_birth : resident.date_of_birth).toISOString().split("T")[0] : "",
            dateOfAssessment: new Date().toISOString().split("T")[0],
            time: new Date().toTimeString().slice(0, 5),
            completedBy: userName || profile?.name || "",
            signature: "",
            age: "Under 65", gender: "Male", historyOfFalls: "Never Fallen", mobilityLevel: "Independent and safe unaided", balance: "Yes",
            adlPersonal: "Independent & Safe", adlDomestic: "Independent & Safe", footwear: "Safe", visionProblems: "No",
            bladderBowel: "No identified problems", environmentalRisks: "No", socialRisks: "24-hour care",
            medicalConditions: "No identified medical conditions", medicines: "No medicines",
            safetyAwareness: "Yes", mentalState: "Orientated"
        }
    });

    const watchedValues = form.watch();

    useEffect(() => {
        const score = calculateFallRiskScore(watchedValues);
        const level = getFallRiskLevel(score);
        setCurrentScore(score);
        setCurrentLevel(level);
    }, [watchedValues]);

    const fetchHistory = async () => {
        if (!residentId) return;
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('fall_risk_assessments')
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

    const getSectionScore = (field: keyof typeof FALL_RISK_OPTIONS, label?: string) => {
        if (!label) return 0;
        const options = FALL_RISK_OPTIONS[field];
        const option = options.find(o => o.label === label);
        return option ? option.value : 0;
    };

    const onSubmit = async (data: FallRiskAssessmentFormData) => {
        try {
            setIsSubmitting(true);
            const currentUserId = userId;
            if (!currentUserId) throw new Error("User not authenticated");

            const payload = {
                resident_id: residentId,
                team_id: teamId,
                organization_id: organizationId,
                user_id: currentUserId,
                created_by: currentUserId,
                assessment_date: data.dateOfAssessment ? new Date(`${data.dateOfAssessment}T${data.time || "00:00"}`).toISOString() : new Date().toISOString(),
                completed_by: data.completedBy,
                assessment_details: {
                    age: data.age,
                    gender: data.gender,
                    historyOfFalls: data.historyOfFalls,
                    mobilityLevel: data.mobilityLevel,
                    balance: data.balance,
                    adlPersonal: data.adlPersonal,
                    adlDomestic: data.adlDomestic,
                    footwear: data.footwear,
                    visionProblems: data.visionProblems,
                    bladderBowel: data.bladderBowel,
                    environmentalRisks: data.environmentalRisks,
                    socialRisks: data.socialRisks,
                    medicalConditions: data.medicalConditions,
                    medicines: data.medicines,
                    safetyAwareness: data.safetyAwareness,
                    mentalState: data.mentalState,
                },
                total_score: currentScore,
                risk_level: currentLevel,
                signature: data.signature,
                saved_as_draft: data.savedAsDraft || false
            };

            await submitAssessmentWithVersioning(
                'fall_risk_assessments',
                payload,
                initialData,
                isEditMode
            );

            if (isEditMode && initialData?.id) {
                toast.success("Fall Risk Assessment updated");
            } else {
                toast.success("Fall Risk Assessment submitted");
                form.reset({
                    ...form.getValues(),
                    age: "Under 65", gender: "Male", historyOfFalls: "Never Fallen", mobilityLevel: "Independent and safe unaided",
                    balance: "Yes", adlPersonal: "Independent & Safe", adlDomestic: "Independent & Safe",
                    footwear: "Safe", visionProblems: "No", bladderBowel: "No identified problems",
                    environmentalRisks: "No", socialRisks: "24-hour care",
                    medicalConditions: "No identified medical conditions", medicines: "No medicines",
                    safetyAwareness: "Yes", mentalState: "Orientated"
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

    const AssessmentField = ({ label, name, options }: { label: string; name: keyof FallRiskAssessmentFormData; options: { label: string; value: number }[] }) => {
        const value = form.watch(name as any);
        return (
            <div className="space-y-3 p-4 border rounded-lg bg-card text-left">
                <h3 className="font-semibold text-sm border-b pb-2">{label}</h3>
                <RadioGroup
                    value={value?.toString()}
                    onValueChange={(val) => form.setValue(name as any, val)}
                    className="grid gap-2"
                >
                    {options.map((opt, idx) => (
                        <div key={`${name}-${idx}`} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.label} id={`${name}-${idx}`} />
                            <Label htmlFor={`${name}-${idx}`} className="text-sm font-normal cursor-pointer flex-1">
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
                    <DialogTitle className="text-xl">Fall Risk Assessment</DialogTitle>
                    <DialogDescription>Complete the assessment by selecting the appropriate level for each category</DialogDescription>
                </DialogHeader>
            )}

            <div className="mb-4 p-4 border-2 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="text-left">
                        <p className="text-xs font-medium text-muted-foreground">Total Fall Risk Score</p>
                        <p className="text-3xl font-bold mt-1">{currentScore} pts</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">Risk Level</p>
                        <p className={`text-xl font-bold mt-1 ${currentLevel === "Low Risk" ? "text-emerald-600" :
                            currentLevel === "Medium Risk" ? "text-yellow-600" : "text-red-600"
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
                    <div className="space-y-4 p-4 border rounded-lg bg-card text-left">
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
                        <AssessmentField label="Age" name="age" options={FALL_RISK_OPTIONS.age} />
                        <AssessmentField label="Gender" name="gender" options={FALL_RISK_OPTIONS.gender} />
                        <AssessmentField label="History of falls" name="historyOfFalls" options={FALL_RISK_OPTIONS.historyOfFalls} />
                        <AssessmentField label="Present Level of Mobility" name="mobilityLevel" options={FALL_RISK_OPTIONS.mobilityLevel} />
                        <AssessmentField label="Balance (Can resident stand unsupported)" name="balance" options={FALL_RISK_OPTIONS.balance} />
                        <AssessmentField label="Activities of Daily Living (Personal)" name="adlPersonal" options={FALL_RISK_OPTIONS.adlPersonal} />
                        <AssessmentField label="Activities of Daily Living (Domestic)" name="adlDomestic" options={FALL_RISK_OPTIONS.adlDomestic} />
                        <AssessmentField label="Footwear" name="footwear" options={FALL_RISK_OPTIONS.footwear} />
                        <AssessmentField label="Vision Problems" name="visionProblems" options={FALL_RISK_OPTIONS.visionProblems} />
                        <AssessmentField label="Bladder & Bowel Movement" name="bladderBowel" options={FALL_RISK_OPTIONS.bladderBowel} />
                        <AssessmentField label="Resident Environmental Risks" name="environmentalRisks" options={FALL_RISK_OPTIONS.environmentalRisks} />
                        <AssessmentField label="Social Risks" name="socialRisks" options={FALL_RISK_OPTIONS.socialRisks} />
                        <AssessmentField label="Medical Conditions" name="medicalConditions" options={FALL_RISK_OPTIONS.medicalConditions} />
                        <AssessmentField label="Medicines" name="medicines" options={FALL_RISK_OPTIONS.medicines} />
                        <AssessmentField label="Safety Awareness" name="safetyAwareness" options={FALL_RISK_OPTIONS.safetyAwareness} />
                        <AssessmentField label="Mental State" name="mentalState" options={FALL_RISK_OPTIONS.mentalState} />
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg bg-card text-left">
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
                            <Button onClick={form.handleSubmit(onSubmit as any)} disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : isEditMode ? "Update" : "Submit"}
                            </Button>
                        </div>
                    )}
                </form>
            </fieldset>

            <div className="mt-12 space-y-6 text-left">
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
                                    <TableHead className="whitespace-nowrap px-4">Date</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Age</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Sex</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Falls</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Mob</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Bal</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">ADLP</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">ADLD</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Foot</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Vis</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">B&B</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Env</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Soc</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">MedC</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Meds</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Safe</TableHead>
                                    <TableHead className="whitespace-nowrap px-2 text-center text-[10px] font-bold">Ment</TableHead>
                                    <TableHead className="text-center font-bold px-4">Total</TableHead>
                                    <TableHead className="text-right px-4">Risk</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pastAssessments.map((assessment) => (
                                    <TableRow key={assessment.id} className="hover:bg-muted/30 text-[11px]">
                                        <TableCell className="font-medium whitespace-nowrap px-4">
                                            {format(new Date(assessment.assessment_date), "dd/MM/yyyy")}
                                        </TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('age', assessment.assessment_details?.age)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('gender', assessment.assessment_details?.gender)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('historyOfFalls', assessment.assessment_details?.historyOfFalls)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('mobilityLevel', assessment.assessment_details?.mobilityLevel)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('balance', assessment.assessment_details?.balance)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('adlPersonal', assessment.assessment_details?.adlPersonal)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('adlDomestic', assessment.assessment_details?.adlDomestic)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('footwear', assessment.assessment_details?.footwear)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('visionProblems', assessment.assessment_details?.visionProblems)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('bladderBowel', assessment.assessment_details?.bladderBowel)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('environmentalRisks', assessment.assessment_details?.environmentalRisks)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('socialRisks', assessment.assessment_details?.socialRisks)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('medicalConditions', assessment.assessment_details?.medicalConditions)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('medicines', assessment.assessment_details?.medicines)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('safetyAwareness', assessment.assessment_details?.safetyAwareness)}</TableCell>
                                        <TableCell className="text-center px-2">{getSectionScore('mentalState', assessment.assessment_details?.mentalState)}</TableCell>
                                        <TableCell className="text-center font-bold px-4">{assessment.total_score}</TableCell>
                                        <TableCell className="text-right px-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${assessment.risk_level === "Low Risk" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                                assessment.risk_level === "Medium Risk" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                                    "bg-rose-100 text-rose-800 border border-rose-200"
                                                }`}>
                                                {assessment.risk_level?.replace(" Risk", "")}
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
