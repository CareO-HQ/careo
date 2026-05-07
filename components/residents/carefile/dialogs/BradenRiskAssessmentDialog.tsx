"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    bradenRiskAssessmentSchema,
    calculateBradenScore,
    getBradenRiskLevel,
    getBradenRiskColor,
    bradenCategories
} from "@/schemas/residents/care-file/bradenRiskAssessmentSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect, useTransition, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import NextReviewDateField from "./NextReviewDateField";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface BradenRiskAssessmentDialogProps {
    teamId: string;
    residentId: string;
    organizationId: string;
    userId: string;
    userName: string;
    resident: {
        firstName?: string;
        lastName?: string;
        first_name?: string;
        last_name?: string;
        room_number?: string;
        care_home_id?: string;
        date_of_birth?: string;
    };
    isEditMode?: boolean;
    initialData?: any;
    onClose: () => void;
    isInline?: boolean;
    viewOnly?: boolean;
    onSaveSuccess?: (data?: any) => void;
}

export default function BradenRiskAssessmentDialog({
    teamId, residentId, organizationId, userId, userName, resident,
    isEditMode = false, initialData, onClose, isInline = false, viewOnly = false,
    onSaveSuccess
}: BradenRiskAssessmentDialogProps) {
    const [isPending, startTransition] = useTransition();
    const [previousAssessments, setPreviousAssessments] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Calculate resident age
    const dob = resident.date_of_birth || (resident as any).dateOfBirth;
    const residentAge = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : undefined;

    const form = useForm<z.infer<typeof bradenRiskAssessmentSchema>>({
        resolver: zodResolver(bradenRiskAssessmentSchema),
        defaultValues: {
            residentName: initialData?.residentName || `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
            bedroomNumber: initialData?.bedroomNumber || initialData?.bedroom_number || resident.room_number || "—",
            assessmentDate: Date.now(),
            nextReviewDate: initialData?.nextReviewDate || initialData?.assessment_details?.nextReviewDate || "",
            completedBy: userName,
            // Categories always start empty for new assessments as per user request
            sensoryPerception: initialData?.assessment_details?.sensoryPerception?.toString() || undefined,
            moisture: initialData?.assessment_details?.moisture?.toString() || undefined,
            activity: initialData?.assessment_details?.activity?.toString() || undefined,
            mobility: initialData?.assessment_details?.mobility?.toString() || undefined,
            nutrition: initialData?.assessment_details?.nutrition?.toString() || undefined,
            frictionShear: initialData?.assessment_details?.frictionShear?.toString() || undefined
        }
    });

    const watchedValues = form.watch();
    const currentScore = calculateBradenScore(watchedValues);
    const currentRisk = getBradenRiskLevel(currentScore, residentAge);

    const fetchHistory = useCallback(async () => {
        if (!residentId) return;
        try {
            setLoadingHistory(true);
            const { data, error } = await supabase
                .from('braden_risk_assessments')
                .select('*')
                .eq('resident_id', residentId)
                .order('assessment_date', { ascending: false });

            if (error) throw error;
            setPreviousAssessments(data || []);
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [residentId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const onSubmit = async (data: z.infer<typeof bradenRiskAssessmentSchema>) => {
        startTransition(async () => {
            try {
                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    assessment_details: {
                        nextReviewDate: data.nextReviewDate,
                        sensoryPerception: parseInt(data.sensoryPerception),
                        moisture: parseInt(data.moisture),
                        activity: parseInt(data.activity),
                        mobility: parseInt(data.mobility),
                        nutrition: parseInt(data.nutrition),
                        frictionShear: parseInt(data.frictionShear)
                    },
                    risk_score: currentScore,
                    risk_level: currentRisk,
                    assessment_date: new Date(data.assessmentDate).toISOString().split('T')[0],
                    completed_by: data.completedBy,
                    created_by: userId
                };

                const result = await submitAssessmentWithVersioning(
                    'braden_risk_assessments',
                    payload,
                    initialData,
                    isEditMode
                );

                toast.success(isEditMode ? "Assessment updated" : "Assessment submitted");
                // Refresh history and reset form for new entry
                fetchHistory();
                form.reset({
                    residentName: form.getValues('residentName'),
                    bedroomNumber: form.getValues('bedroomNumber'),
                    completedBy: form.getValues('completedBy'),
                    assessmentDate: Date.now(),
                    nextReviewDate: "",
                    sensoryPerception: undefined,
                    moisture: undefined,
                    activity: undefined,
                    mobility: undefined,
                    nutrition: undefined,
                    frictionShear: undefined
                });
                onSaveSuccess?.(result);
                if (onClose && isEditMode) onClose();
            } catch (error) {
                console.error("Error submitting:", error);
                toast.error("Failed to submit assessment");
            }
        });
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col space-y-6">
                {!isInline && (
                    <DialogHeader>
                        <DialogTitle className="text-xl">Braden Risk Assessment</DialogTitle>
                        <DialogDescription>Assess resident&apos;s risk for pressure sores across 6 key categories.</DialogDescription>
                    </DialogHeader>
                )}

                {/* Current Score Summary */}
                <div className="p-6 border rounded-xl bg-muted/20 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Braden Score</p>
                        <p className="text-4xl font-black">{currentScore}</p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Level</p>
                        <p className={`text-2xl font-bold ${getBradenRiskColor(currentRisk)}`}>{currentRisk}</p>
                    </div>
                </div>

                <Form {...form}>
                    <div className="mb-4 p-4 border rounded-lg bg-muted/40 px-1">
                        <FormField
                            control={form.control}
                            name="nextReviewDate"
                            render={({ field }) => (
                                <FormItem className="space-y-1 max-w-xs">
                                    <FormControl>
                                        <NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={viewOnly} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10 px-1">
                        <button
                            type="button"
                            id="care-file-submit-btn"
                            className="hidden"
                            onClick={form.handleSubmit(onSubmit, (errors) => {
                                console.error("Braden form errors:", errors);
                                toast.error("Please fill in all required fields correctly.");
                            })}
                        />

                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-card">
                            <FormField
                                control={form.control}
                                name="residentName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Resident Name</FormLabel>
                                        <FormControl><Input {...field} disabled className="bg-muted h-9" /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="bedroomNumber"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Bedroom Number</FormLabel>
                                        <FormControl><Input {...field} disabled className="bg-muted h-9" /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                            {bradenCategories.map((category) => (
                                <FormField
                                    key={category.key}
                                    control={form.control}
                                    name={category.key as any}
                                    render={({ field }) => (
                                        <FormItem className="space-y-4">
                                            <div className="flex flex-col space-y-1">
                                                <FormLabel className="text-base font-bold flex items-center gap-2">
                                                    {category.label}
                                                </FormLabel>
                                                <FormDescription className="text-xs leading-relaxed">
                                                    {category.description}
                                                </FormDescription>
                                            </div>

                                            <FormControl>
                                                <RadioGroup
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    className="grid grid-cols-1 gap-2"
                                                    disabled={viewOnly}
                                                >
                                                    {category.options.map((option) => {
                                                        const isSelected = field.value === String(option.score);
                                                        const optionId = `${category.key}-${option.score}`;

                                                        return (
                                                            <FormItem key={option.score} className="space-y-0">
                                                                <Label
                                                                    htmlFor={optionId}
                                                                    className={cn(
                                                                        "flex items-center space-x-3 p-3 rounded-lg border transition-all select-none",
                                                                        isSelected
                                                                            ? "border-primary bg-primary/5 shadow-sm"
                                                                            : "border-muted-foreground/10",
                                                                        !viewOnly ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
                                                                    )}
                                                                >
                                                                    <FormControl>
                                                                        <RadioGroupItem
                                                                            value={String(option.score)}
                                                                            id={optionId}
                                                                            disabled={viewOnly}
                                                                        />
                                                                    </FormControl>
                                                                    <div className="flex-1">
                                                                        <span className="font-medium text-sm block">
                                                                            {option.label}
                                                                        </span>
                                                                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 italic font-normal">
                                                                            {option.fullText}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
                                                                        {option.score}
                                                                    </span>
                                                                </Label>
                                                            </FormItem>
                                                        );
                                                    })}
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-card mt-6">
                            <FormField
                                control={form.control}
                                name="completedBy"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Assessed By</FormLabel>
                                        <FormControl><Input {...field} readOnly className="bg-muted h-9" /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="assessmentDate"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Date</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                value={format(new Date(field.value), "yyyy-MM-dd")}
                                                onChange={(e) => field.onChange(new Date(e.target.value).getTime())}
                                                className="bg-background h-9"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {!isInline && (
                            <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background/90 backdrop-blur-sm py-4 border-t z-10">
                                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Assessment"
                                    )}
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>

                {/* History Table */}
                <div className="mt-12 space-y-4 pb-20">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-lg font-bold">Previous Braden Assessments</h3>
                        <p className="text-xs text-muted-foreground">{previousAssessments.length} total assessments</p>
                    </div>

                    {loadingHistory ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : previousAssessments.length > 0 ? (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-24">Date</TableHead>
                                        <TableHead className="w-32">Next Review Date</TableHead>
                                        <TableHead className="text-center text-xs">Sensory</TableHead>
                                        <TableHead className="text-center text-xs">Moist</TableHead>
                                        <TableHead className="text-center text-xs">Activity</TableHead>
                                        <TableHead className="text-center text-xs">Mobility</TableHead>
                                        <TableHead className="text-center text-xs">Nutri</TableHead>
                                        <TableHead className="text-center text-xs">Friction</TableHead>
                                        <TableHead className="text-right font-bold w-20">Total</TableHead>
                                        <TableHead className="text-right w-32">Risk</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previousAssessments.map((item) => (
                                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/20">
                                            <TableCell className="font-medium text-xs whitespace-nowrap">
                                                {format(new Date(item.assessment_date), "dd MMM yyyy")}
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {item.assessment_details?.nextReviewDate
                                                    ? format(new Date(item.assessment_details.nextReviewDate), "dd MMM yyyy")
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-center text-xs">{item.assessment_details?.sensoryPerception || "—"}</TableCell>
                                            <TableCell className="text-center text-xs">{item.assessment_details?.moisture || "—"}</TableCell>
                                            <TableCell className="text-center text-xs">{item.assessment_details?.activity || "—"}</TableCell>
                                            <TableCell className="text-center text-xs">{item.assessment_details?.mobility || "—"}</TableCell>
                                            <TableCell className="text-center text-xs">{item.assessment_details?.nutrition || "—"}</TableCell>
                                            <TableCell className="text-center text-xs">{item.assessment_details?.frictionShear || "—"}</TableCell>
                                            <TableCell className="text-right font-bold">{item.risk_score}</TableCell>
                                            <TableCell className="text-right">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.risk_level?.includes("High") ? "bg-red-50 border-red-200 text-red-700" :
                                                    item.risk_level?.includes("Moderate") ? "bg-amber-50 border-amber-200 text-amber-700" :
                                                        "bg-green-50 border-green-200 text-green-700"
                                                    }`}>
                                                    {item.risk_level}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-muted/10 rounded-lg border border-dashed">
                            <p className="text-sm text-muted-foreground">No previous assessments found for this resident.</p>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
