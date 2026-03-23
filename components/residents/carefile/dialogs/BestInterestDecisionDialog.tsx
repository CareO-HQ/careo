"use client";

import { Button } from "@/components/ui/button";
import {
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
import {
    bestInterestDecisionSchema,
    BestInterestDecisionFormData
} from "@/schemas/residents/care-file/bestInterestDecisionSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface BestInterestDecisionDialogProps {
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
    refreshForms?: () => void;
}

export default function BestInterestDecisionDialog({
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
    refreshForms
}: BestInterestDecisionDialogProps) {
    const [isLoading, startTransition] = useTransition();
    const [loadingState, setLoadingState] = useState<string>("");

    const { supabase } = useSupabase();

    const form = useForm<BestInterestDecisionFormData>({
        resolver: zodResolver(bestInterestDecisionSchema),
        mode: "onChange",
        defaultValues: initialData ? {
            ...initialData.assessment_data,
        } : {
            residentId,
            teamId,
            organizationId,
            userId,
            residentName: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
            dateOfBirth: resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
            gpName: resident?.gp_name || "",
            staffMemberInvolved: userName || "",
            proposedTreatmentOf: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
            treatmentDescription: "",
            otherComments: "",
            signerName: "",
            signerRelationship: "",
            signerAddress: "",
            signerSignature: "",
            signerDate: new Date().toISOString().split("T")[0],
        }
    });

    const handleSubmit = async (values: BestInterestDecisionFormData) => {
        startTransition(async () => {
            try {
                setLoadingState("Saving best interest decision form...");

                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    assessment_date: new Date().toISOString().split("T")[0],
                    completed_by: userName,
                    created_by: userId,
                    assessment_data: values,
                    decision_details: values.treatmentDescription 
                };

                await submitAssessmentWithVersioning(
                    'best_interest_decisions',
                    payload,
                    initialData,
                    isEditMode
                );

                toast.success(isEditMode ? "Best interest decision updated successfully" : "Best interest decision saved successfully");
                refreshForms?.();
                onClose?.();
            } catch (error) {
                console.error("Error submitting form:", error);
                toast.error("Failed to save best interest decision");
            } finally {
                setLoadingState("");
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto py-4">
            {!isInline && (
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-xl font-bold text-center leading-tight">
                        BEST INTEREST DECISION FORM FOR RESIDENTS WHO ARE UNABLE TO CONSENT TO INVESTIGATION/TREATMENT/PROCEDURE/RESTRAINT
                    </DialogTitle>
                </DialogHeader>
            )}

            <Form {...form}>
                <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* Resident Details Box */}
                        <div className="space-y-6">
                            <h3 className="font-bold underline text-lg">Resident Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <FormField
                                    control={form.control}
                                    name="residentName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Resident&apos;s Name</FormLabel>
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
                                    <FormLabel className="font-bold">Date of Birth</FormLabel>
                                    <FormControl>
                                        <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                                            {resident?.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : "N/A"}
                                        </div>
                                    </FormControl>
                                </FormItem>
                                <FormField
                                    control={form.control}
                                    name="gpName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">GP</FormLabel>
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
                                    name="staffMemberInvolved"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Staff member involved in Discussion (PRINT)</FormLabel>
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
                            </div>
                        </div>

                        {/* Declaration Section */}
                        <div className="space-y-6 text-sm leading-loose">
                            <div className="space-y-2">
                                <p>I/We have been involved in a discussion with the relevant health professionals over the investigation/treatment/procedure/restraint proposed of:</p>
                                <FormField
                                    control={form.control}
                                    name="proposedTreatmentOf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                {viewOnly ? (
                                                    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[60px]">
                                                        {field.value || " "}
                                                    </div>
                                                ) : (
                                                    <Textarea 
                                                        {...field} 
                                                        className="min-h-[60px]" 
                                                        placeholder="Enter resident name or proposed treatment..."
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <p>for (Explain what treatment is):</p>
                                <FormField
                                    control={form.control}
                                    name="treatmentDescription"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                {viewOnly ? (
                                                    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[100px]">
                                                        {field.value || " "}
                                                    </div>
                                                ) : (
                                                    <Textarea 
                                                        {...field} 
                                                        className="min-h-[100px]" 
                                                        placeholder="Enter detailed treatment description..."
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <p className="mt-4 border-l-4 pl-4 py-2 bg-muted/20">
                                I/We understand that he/she is unable to give his/her consent. I/We also understand that investigation/treatment/procedure/restraint may lawfully be carried out if it is in his/her best interests to receive it.
                            </p>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="otherComments"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Any other comments, including concerns about the decision:</FormLabel>
                                        <FormControl>
                                            {viewOnly ? (
                                                <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[120px]">
                                                    {field.value || " "}
                                                </div>
                                            ) : (
                                                <Textarea 
                                                    {...field} 
                                                    className="min-h-[120px]" 
                                                    placeholder="Enter any additional comments or concerns here..."
                                                />
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Sign-off Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-4 border-t">
                            <FormField
                                control={form.control}
                                name="signerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Name</FormLabel>
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
                                name="signerRelationship"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Relationship to Resident</FormLabel>
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
                                name="signerAddress"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="font-bold">Address</FormLabel>
                                        <FormControl>
                                            {viewOnly ? (
                                                <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[60px]">
                                                    {field.value || " "}
                                                </div>
                                            ) : (
                                                <Textarea 
                                                    {...field} 
                                                    className="min-h-[60px]" 
                                                    placeholder="Enter signer's full address..."
                                                />
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="signerSignature"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Signature (Type name to sign)</FormLabel>
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
                                name="signerDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Date</FormLabel>
                                        <FormControl><Input {...field} type="date" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <button type="submit" id="care-file-submit-btn" className="hidden" />

                        {!isInline && !viewOnly && (
                            <DialogFooter className="flex flex-row justify-end gap-2 pt-8 border-t sticky bottom-0 bg-background pb-2">
                                <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} type="button">Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Decision"}
                                </Button>
                            </DialogFooter>
                        )}
                    </form>
                </fieldset>
            </Form>
        </div>
    );
}
