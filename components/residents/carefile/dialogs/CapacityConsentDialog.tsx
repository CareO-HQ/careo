"use client";

import { Button } from "@/components/ui/button";
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    capacityConsentSchema,
} from "@/schemas/residents/care-file/capacityConsentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface CapacityConsentDialogProps {
    teamId: string;
    residentId: string;
    organizationId: string;
    userId: string;
    userName: string;
    resident: Resident;
    onClose?: () => void;
    initialData?: any;
    isEditMode?: boolean;
    isInline?: boolean;
    viewOnly?: boolean;
    careHomeName?: string;
    refreshForms?: () => void;
}

export default function CapacityConsentDialog({
    teamId,
    residentId,
    organizationId,
    userId,
    userName,
    resident,
    onClose,
    initialData,
    isEditMode = false,
    isInline = false,
    viewOnly = false,
    careHomeName = "",
    refreshForms
}: CapacityConsentDialogProps) {
    const [isLoading, startTransition] = useTransition();

    const form = useForm<z.infer<typeof capacityConsentSchema>>({
        resolver: zodResolver(capacityConsentSchema) as any,
        mode: "onChange",
        defaultValues: initialData ? {
            ...initialData.assessment_data,
            residentName: initialData.assessment_data?.residentName ?? (resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : ""),
            dateOfBirth: initialData.assessment_data?.dateOfBirth ?? (resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
            careHomeName: initialData.assessment_data?.careHomeName ?? careHomeName,
            assessorName: initialData.assessment_data?.assessorName ?? userName,
            assessmentDate: initialData.assessment_data?.assessmentDate ?? new Date().toISOString().split("T")[0]
        } : {
            residentId,
            teamId,
            organizationId,
            userId,
            residentName: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
            dateOfBirth: resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
            nhsNumber: resident?.nhs_health_number || resident?.nhsHealthNumber || "",
            dateOfAdmission: resident?.admissionDate || resident?.admission_date ? new Date(resident.admissionDate || resident.admission_date as string).toISOString().split('T')[0] : "",
            decisionToBeMade: "",
            admissionToCareHome: false,
            consentToCarePlanning: false,
            consentToMedication: false,
            consentToSharingInfo: false,
            otherDecision: false,
            otherDecisionDetails: "",
            hasImpairment: "",
            impairmentDetails: "",
            understandInformation: "",
            understandNotes: "",
            retainInformation: "",
            retainNotes: "",
            useWeighInformation: "",
            useWeighNotes: "",
            communicateDecision: "",
            communicateNotes: "",
            hasCapacity: undefined as any,
            residentSignature: "",
            residentConsentDate: new Date().toISOString().split("T")[0],
            assessorName: userName,
            assessorRole: "",
            assessorSignature: "",
            assessmentDate: new Date().toISOString().split("T")[0],
            legalRepresentativeType: "None",
            representativeName: "",
            relationshipToResident: "",
            contactDetails: "",
            nextReviewDate: "",
            reasonForReassessment: "",
            careHomeName: careHomeName,
            address: "",
            formVersion: "1.0",
            reviewDate: new Date().toISOString().split("T")[0]
        }
    });

    const hasCapacity = form.watch("hasCapacity");

    const handleSubmit = async (values: z.infer<typeof capacityConsentSchema>) => {
        startTransition(async () => {
            try {
                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    assessment_date: values.assessmentDate,
                    completed_by: userName,
                    user_id: userId,
                    assessment_data: values
                };

                await submitAssessmentWithVersioning(
                    'capacity_consents',
                    payload,
                    initialData,
                    isEditMode
                );

                toast.success(isEditMode ? "Capacity & Consent updated successfully" : "Capacity & Consent saved successfully");
                refreshForms?.();
                onClose?.();
            } catch (error) {
                console.error("Error submitting form:", error);
                toast.error("Failed to save Capacity & Consent assessment");
            }
        });
    };

    return (
        <>
            {!isInline && (
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Review" : "Complete"} Capacity & Consent Assessment</DialogTitle>
                    <DialogDescription>
                        Evaluate resident capacity for specific decisions and obtain consent if applicable.
                    </DialogDescription>
                </DialogHeader>
            )}

            <Form {...form}>
                <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <button
                            type="button"
                            id="care-file-submit-btn"
                            className="hidden"
                            onClick={form.handleSubmit(handleSubmit as any, (errors) => {
                                console.error("Form errors:", errors);
                                toast.error("Please fill in all required fields correctly.");
                            })}
                        />

                        <div className="space-y-8 px-1">
                            
                            {/* Section A */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section A — Resident Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="residentName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Resident Name</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="nhsNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Resident / NHS Number</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormItem>
                                        <FormLabel>Date of Birth</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="date" 
                                                value={form.watch("dateOfBirth") ? new Date(form.watch("dateOfBirth") as number).toISOString().split('T')[0] : ''} 
                                                disabled 
                                            />
                                        </FormControl>
                                    </FormItem>
                                    <FormField
                                        control={form.control}
                                        name="dateOfAdmission"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date of Admission</FormLabel>
                                                <FormControl><Input {...field} type="date" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section B */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section B — Details of Decision</h3>
                                <p className="text-sm font-medium">Capacity must be assessed for a specific decision.</p>
                                <div className="space-y-3">
                                    <FormLabel>Decision requiring assessment:</FormLabel>
                                    <div className="grid grid-cols-1 gap-2">
                                        <FormField
                                            control={form.control}
                                            name="admissionToCareHome"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 mt-1" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Admission to care home</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="consentToCarePlanning"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 mt-1" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Consent to care planning</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="consentToMedication"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 mt-1" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Consent to medication management</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="consentToSharingInfo"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 mt-1" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Consent to sharing information with professionals</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        <div className="flex flex-col space-y-2">
                                            <FormField
                                                control={form.control}
                                                name="otherDecision"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl>
                                                            <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 mt-1" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">Other:</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                            {form.watch("otherDecision") && (
                                                <FormField
                                                    control={form.control}
                                                    name="otherDecisionDetails"
                                                    render={({ field }) => (
                                                        <FormItem className="ml-7">
                                                            <FormControl>
                                                                {viewOnly ? (
                                                                    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                                        {field.value || " "}
                                                                    </div>
                                                                ) : (
                                                                    <Input {...field} placeholder="Please specify..." />
                                                                )}
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section C */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section C — Stage 1 (Diagnostic Test)</h3>
                                <FormField
                                    control={form.control}
                                    name="hasImpairment"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel required>Is there an impairment of, or disturbance in the functioning of, the person&apos;s mind or brain?</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row space-x-4">
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {form.watch("hasImpairment") === "Yes" && (
                                    <FormField
                                        control={form.control}
                                        name="impairmentDetails"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>If yes, please provide details regarding the impairment/disturbance:</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[60px]">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Textarea {...field} />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            {/* Section D */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section D — Stage 2 (Functional Test)</h3>
                                <p className="text-sm text-muted-foreground">Does the impairment or disturbance mean that the person is unable to make the specific decision at the time it needs to be made?</p>
                                
                                <div className="space-y-6">
                                    {/* 1. Understand */}
                                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="understandInformation"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel required>1. Are they able to understand the information relevant to the decision?</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row space-x-4">
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="understandNotes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Notes / Details of how this was assessed:</FormLabel>
                                                    <FormControl>
                                                        {viewOnly ? (
                                                            <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[60px]">
                                                                {field.value || " "}
                                                            </div>
                                                        ) : (
                                                            <Textarea {...field} />
                                                        )}
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* 2. Retain */}
                                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="retainInformation"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel required>2. Are they able to retain that information long enough to make a decision?</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row space-x-4">
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="retainNotes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Notes / Details of how this was assessed:</FormLabel>
                                                    <FormControl>
                                                        {viewOnly ? (
                                                            <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[60px]">
                                                                {field.value || " "}
                                                            </div>
                                                        ) : (
                                                            <Textarea {...field} />
                                                        )}
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* 3. Use/Weigh */}
                                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="useWeighInformation"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel required>3. Are they able to use or weigh that information as part of the decision?</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row space-x-4">
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="useWeighNotes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Notes / Details of how this was assessed:</FormLabel>
                                                    <FormControl>
                                                        {viewOnly ? (
                                                            <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[60px]">
                                                                {field.value || " "}
                                                            </div>
                                                        ) : (
                                                            <Textarea {...field} />
                                                        )}
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* 4. Communicate */}
                                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="communicateDecision"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel required>4. Are they able to communicate their decision (by any means)?</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row space-x-4">
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="communicateNotes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Notes / Details of how this was assessed:</FormLabel>
                                                    <FormControl>
                                                        {viewOnly ? (
                                                            <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[60px]">
                                                                {field.value || " "}
                                                            </div>
                                                        ) : (
                                                            <Textarea {...field} />
                                                        )}
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section E */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section E — Outcome of Capacity Assessment</h3>
                                <FormField
                                    control={form.control}
                                    name="hasCapacity"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Yes" /></FormControl>
                                                        <FormLabel className="font-normal">The resident <b>has capacity</b> to make this decision</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="No" /></FormControl>
                                                        <FormLabel className="font-normal">The resident <b>lacks capacity</b> to make this decision</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <p className="text-sm font-medium mt-2">
                                    If the resident lacks capacity, a Best Interest Decision Form must be completed
                                </p>
                            </div>

                            {/* Section F */}
                            {hasCapacity === "Yes" && (
                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="text-lg font-semibold">Section F — Resident Consent (Complete only if capacity is present)</h3>
                                    <p className="text-sm">I confirm that I have been given clear information about my care and I understand the options available to me. I consent to the care and support proposed.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="residentSignature"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Resident Signature</FormLabel>
                                                    <FormControl>
                                                        {viewOnly ? (
                                                            <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                                {field.value || " "}
                                                            </div>
                                                        ) : (
                                                            <Input {...field} />
                                                        )}
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="residentConsentDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Date</FormLabel>
                                                    <FormControl><Input {...field} type="date" /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Section G */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section G — Assessor Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="assessorName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Name of Assessor</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="assessorRole"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Role / Profession</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="assessorSignature"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Signature</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="assessmentDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Date of Assessment</FormLabel>
                                                <FormControl><Input {...field} type="date" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section H */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section H — Legal Representative (if applicable)</h3>
                                <FormField
                                    control={form.control}
                                    name="legalRepresentativeType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Lasting Power of Attorney (Health & Welfare)" /></FormControl>
                                                        <FormLabel className="font-normal">Lasting Power of Attorney (Health & Welfare)</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Court Appointed Deputy" /></FormControl>
                                                        <FormLabel className="font-normal">Court Appointed Deputy</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="None" /></FormControl>
                                                        <FormLabel className="font-normal">No legal representative</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                {form.watch("legalRepresentativeType") !== "None" && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="representativeName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Representative Name</FormLabel>
                                                    <FormControl>
                                                        {viewOnly ? (
                                                            <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                                {field.value || " "}
                                                            </div>
                                                        ) : (
                                                            <Input {...field} />
                                                        )}
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="relationshipToResident"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Relationship to Resident</FormLabel>
                                                        <FormControl>
                                                            {viewOnly ? (
                                                                <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                                    {field.value || " "}
                                                                </div>
                                                            ) : (
                                                                <Input {...field} />
                                                            )}
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="contactDetails"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Contact Details</FormLabel>
                                                        <FormControl>
                                                            {viewOnly ? (
                                                                <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                                    {field.value || " "}
                                                                </div>
                                                            ) : (
                                                                <Input {...field} />
                                                            )}
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Section I */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Section I — Review and Reassessment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="nextReviewDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Next Review Date</FormLabel>
                                                <FormControl><Input {...field} type="date" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="reasonForReassessment"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reason for reassessment (e.g., change in condition)</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="careHomeName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Care Home Name</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="formVersion"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Form Version</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                                                            {field.value || " "}
                                                        </div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="reviewDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Review Date</FormLabel>
                                                <FormControl><Input {...field} type="date" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {!isInline && !viewOnly && (
                            <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
                                <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} type="button">Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save"}
                                </Button>
                            </DialogFooter>
                        )}
                    </form>
                </fieldset>
            </Form >
        </>
    );
}
