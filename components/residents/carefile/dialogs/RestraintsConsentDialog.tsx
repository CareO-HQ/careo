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
    FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
    restraintsConsentSchema,
    restraintTypes
} from "@/schemas/residents/care-file/restraintsConsentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import NextReviewDateField from "./NextReviewDateField";

interface RestraintsConsentDialogProps {
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

export default function RestraintsConsentDialog({
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
}: RestraintsConsentDialogProps) {
    const [isLoading, startTransition] = useTransition();
    const [loadingState, setLoadingState] = useState<string>("");

    const { supabase } = useSupabase();

    const form = useForm<z.infer<typeof restraintsConsentSchema>>({
        resolver: zodResolver(restraintsConsentSchema) as any,
        mode: "onChange",
        defaultValues: initialData ? {
            ...initialData.assessment_data,
            residentName: initialData.assessment_data?.residentName ?? (resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : ""),
            nextReviewDate: initialData.assessment_data?.nextReviewDate ?? initialData.nextReviewDate ?? "",
            careHomeUnit: initialData.assessment_data?.careHomeUnit ?? (resident?.care_home_id ?? ""),
            dateOfBirth: initialData.assessment_data?.dateOfBirth ?? (resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now()),
            selectedRestraints: initialData.assessment_data?.selectedRestraints ?? [],
            consentType: initialData.assessment_data?.consentType ?? "ABLE_TO_CONSENT",
            ableToConsent: {
                name: initialData.assessment_data?.ableToConsent?.name ?? (resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : ""),
                riskOf: initialData.assessment_data?.ableToConsent?.riskOf ?? "",
                preference: initialData.assessment_data?.ableToConsent?.preference ?? "PREFER_USE",
                personSignature: initialData.assessment_data?.ableToConsent?.personSignature ?? "",
                personSignatureDate: initialData.assessment_data?.ableToConsent?.personSignatureDate ?? new Date().toISOString().split("T")[0],
                memberSignature: initialData.assessment_data?.ableToConsent?.memberSignature ?? (initialData.completed_by || userName || ""),
                memberSignatureDate: initialData.assessment_data?.ableToConsent?.memberSignatureDate ?? new Date(initialData.assessment_date || Date.now()).toISOString().split("T")[0]
            },
            discussionWithRelative: {
                relativeName: initialData.assessment_data?.discussionWithRelative?.relativeName ?? "",
                issueOf: initialData.assessment_data?.discussionWithRelative?.issueOf ?? "",
                residentName: initialData.assessment_data?.discussionWithRelative?.residentName ?? (resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : ""),
                preference: initialData.assessment_data?.discussionWithRelative?.preference ?? "WOULD_HAVE_PREFERRED",
                restraintUsed: initialData.assessment_data?.discussionWithRelative?.restraintUsed ?? "",
                personSignature: initialData.assessment_data?.discussionWithRelative?.personSignature ?? "",
                personSignatureDate: initialData.assessment_data?.discussionWithRelative?.personSignatureDate ?? new Date().toISOString().split("T")[0],
                memberSignature: initialData.assessment_data?.discussionWithRelative?.memberSignature ?? (initialData.completed_by || userName || ""),
                memberSignatureDate: initialData.assessment_data?.discussionWithRelative?.memberSignatureDate ?? new Date(initialData.assessment_date || Date.now()).toISOString().split("T")[0]
            }
        } : {
            residentName: (resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : ""),
            nextReviewDate: "",
            careHomeUnit: "",
            dateOfBirth: resident?.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
            selectedRestraints: [],
            consentType: "ABLE_TO_CONSENT",
            ableToConsent: {
                name: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
                riskOf: "",
                preference: "PREFER_USE",
                personSignature: "",
                personSignatureDate: new Date().toISOString().split("T")[0],
                memberSignature: userName || "",
                memberSignatureDate: new Date().toISOString().split("T")[0]
            },
            discussionWithRelative: {
                relativeName: "",
                issueOf: "",
                residentName: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
                preference: "WOULD_HAVE_PREFERRED",
                restraintUsed: "",
                personSignature: "",
                personSignatureDate: new Date().toISOString().split("T")[0],
                memberSignature: userName || "",
                memberSignatureDate: new Date().toISOString().split("T")[0]
            }
        }
    });

    const consentType = form.watch("consentType");
    const ableToConsentValues = form.watch("ableToConsent");
    const discussionWithRelativeValues = form.watch("discussionWithRelative");

    const handleSubmit = async (values: z.infer<typeof restraintsConsentSchema>) => {
        startTransition(async () => {
            try {
                setLoadingState("Saving restraints consent form...");

                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    assessment_date: new Date().toISOString().split("T")[0],
                    consent_given: values.consentType === "ABLE_TO_CONSENT"
                        ? values.ableToConsent?.preference === "PREFER_USE"
                        : values.discussionWithRelative?.preference === "WOULD_HAVE_PREFERRED",
                    representative_name: values.discussionWithRelative?.relativeName,
                    completed_by: userName,
                    created_by: userId,
                    assessment_data: values
                };

                await submitAssessmentWithVersioning(
                    'restraints_consents',
                    payload,
                    initialData,
                    isEditMode
                );

                toast.success(isEditMode ? "Restraints consent updated successfully" : "Restraints consent saved successfully");
                refreshForms?.();
                onClose?.();
            } catch (error) {
                console.error("Error submitting form:", error);
                toast.error("Failed to save restraints consent");
            } finally {
                setLoadingState("");
            }
        });
    };

    return (
        <>
            {!isInline && (
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Review" : "Complete"} Consent for Use of Restraint</DialogTitle>
                    <DialogDescription>
                        Document the consent for using specific restraints for the resident.
                    </DialogDescription>
                </DialogHeader>
            )}

            <Form {...form}>
                <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
                    <div className="mb-6 p-4 border rounded-lg bg-muted/40 px-1">
                        <FormField
                            control={form.control}
                            name="nextReviewDate"
                            render={({ field }) => (
                                <FormItem className="max-w-xs">
                                    <FormControl>
                                        <NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={viewOnly} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <button
                            type="button"
                            id="care-file-submit-btn"
                            className="hidden"
                            onClick={form.handleSubmit(handleSubmit as any, (errors) => {
                                console.error("Restraints Consent form errors:", errors);
                                toast.error("Please fill in all required fields correctly.");
                            })}
                        />

                        <div className="space-y-8 px-1">
                            {/* Section 1: Resident Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="residentName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel required>Person in Care&apos;s Name</FormLabel>
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
                                    name="careHomeUnit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel required>Care Home/Unit</FormLabel>
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

                            {/* Section 2: Type of Restraint */}
                            <div className="space-y-4">
                                <div className="space-y-1 pb-2 border-b">
                                    <h4 className="text-sm font-medium">Type of Restraint considered/required:</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {restraintTypes.map((type) => (
                                        <FormField
                                            key={type}
                                            control={form.control}
                                            name="selectedRestraints"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(type)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...field.value, type])
                                                                    : field.onChange(field.value?.filter((value: string) => value !== type));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{type}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <FormMessage>{form.formState.errors.selectedRestraints?.message}</FormMessage>
                            </div>

                            {/* Section 3: Consent Type */}
                            <div className="space-y-6">
                                <div className="space-y-1 pb-2 border-b">
                                    <h4 className="text-sm font-medium">Consent Status</h4>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="consentType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    className="flex flex-col space-y-1"
                                                >
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="ABLE_TO_CONSENT" /></FormControl>
                                                        <FormLabel className="font-normal">Resident is able to consent</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="UNABLE_TO_CONSENT" /></FormControl>
                                                        <FormLabel className="font-normal">Resident is unable to consent (Relative/Staff Discussion)</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {/* Able to Consent Sub-Section */}
                                {consentType === "ABLE_TO_CONSENT" && (
                                    <div className="space-y-6 pt-4 border-t bg-muted/30 p-4 rounded-lg">
                                        <div className="space-y-4">
                                            {viewOnly ? (
                                                <p className="text-sm leading-relaxed">
                                                    {[
                                                        "I",
                                                        ableToConsentValues?.name || "_____",
                                                        "understand that I may be at risk of",
                                                        ableToConsentValues?.riskOf || "_____"
                                                    ].join(" ") + "."}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-1 text-sm">
                                                    <span>I</span>
                                                    <FormField
                                                        control={form.control}
                                                        name="ableToConsent.name"
                                                        render={({ field }) => (
                                                            <FormItem className="w-40">
                                                                <FormControl><Input {...field} placeholder="Full Name" className="h-8" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <span>understand that I may be at risk of</span>
                                                    <FormField
                                                        control={form.control}
                                                        name="ableToConsent.riskOf"
                                                        render={({ field }) => (
                                                            <FormItem className="w-40">
                                                                <FormControl><Input {...field} placeholder="Description of risk" className="h-8" /></FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            <FormField
                                                control={form.control}
                                                name="ableToConsent.preference"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormControl>
                                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                                    <FormControl><RadioGroupItem value="PREFER_USE" /></FormControl>
                                                                    <FormLabel className="font-normal">I prefer that restraint is used.</FormLabel>
                                                                </FormItem>
                                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                                    <FormControl><RadioGroupItem value="DO_NOT_WANT_USE" /></FormControl>
                                                                    <FormLabel className="font-normal">But I do not want any form of restraint used.</FormLabel>
                                                                </FormItem>
                                                            </RadioGroup>
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                                <FormField
                                                    control={form.control}
                                                    name="ableToConsent.personSignature"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel required>Signature of Person</FormLabel>
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
                                                    name="ableToConsent.personSignatureDate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Date</FormLabel>
                                                            <FormControl><Input {...field} type="date" /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="ableToConsent.memberSignature"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Signature of Member</FormLabel>
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
                                                    name="ableToConsent.memberSignatureDate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Date</FormLabel>
                                                            <FormControl><Input {...field} type="date" /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground italic">(This must be the member of staff who had the discussion with the person)</p>
                                        </div>
                                    </div>
                                )}

                                {/* Unable to Consent Sub-Section */}
                                {consentType === "UNABLE_TO_CONSENT" && (
                                    <div className="space-y-6 pt-4 border-t bg-muted/30 p-4 rounded-lg">
                                        <h4 className="text-sm font-medium">Discussion with Relative (NOK)</h4>
                                        <div className="flex flex-col gap-3">
                                            {viewOnly ? (
                                                <p className="text-sm leading-relaxed">
                                                    {[
                                                        "I",
                                                        discussionWithRelativeValues?.relativeName || "_____",
                                                        "(nearest relative) have discussed the issue of",
                                                        discussionWithRelativeValues?.issueOf || "_____",
                                                        "with the professionals concerned and feel that",
                                                        discussionWithRelativeValues?.residentName || "_____"
                                                    ].join(" ") + "."}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-1 text-sm">
                                                    <span>I</span>
                                                    <FormField
                                                        control={form.control}
                                                        name="discussionWithRelative.relativeName"
                                                        render={({ field }) => (
                                                            <FormItem className="w-40"><FormControl><Input {...field} placeholder="Relative Name" className="h-8" /></FormControl><FormMessage /></FormItem>
                                                        )}
                                                    />
                                                    <span>(nearest relative) have discussed the issue of</span>
                                                    <FormField
                                                        control={form.control}
                                                        name="discussionWithRelative.issueOf"
                                                        render={({ field }) => (
                                                            <FormItem className="w-40"><FormControl><Input {...field} placeholder="Issue" className="h-8" /></FormControl></FormItem>
                                                        )}
                                                    />
                                                    <span>with the professionals concerned and feel that</span>
                                                    <FormField
                                                        control={form.control}
                                                        name="discussionWithRelative.residentName"
                                                        render={({ field }) => (
                                                            <FormItem className="w-40"><FormControl><Input {...field} placeholder="Resident Name" className="h-8" /></FormControl></FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            <FormField
                                                control={form.control}
                                                name="discussionWithRelative.preference"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormControl>
                                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row gap-4">
                                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                                    <FormControl><RadioGroupItem value="WOULD_HAVE_PREFERRED" /></FormControl>
                                                                    <FormLabel className="font-normal">would have preferred</FormLabel>
                                                                </FormItem>
                                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                                    <FormControl><RadioGroupItem value="WOULD_NOT_HAVE_PREFERRED" /></FormControl>
                                                                    <FormLabel className="font-normal">not preferred</FormLabel>
                                                                </FormItem>
                                                            </RadioGroup>
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {viewOnly ? (
                                                <p className="text-sm leading-relaxed">
                                                    {[
                                                        discussionWithRelativeValues?.preference === "WOULD_NOT_HAVE_PREFERRED"
                                                            ? "would not have preferred"
                                                            : "would have preferred",
                                                        "to have",
                                                        discussionWithRelativeValues?.restraintUsed || "_____",
                                                        "used."
                                                    ].join(" ")}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-1 text-sm">
                                                    <span>to have</span>
                                                    <FormField
                                                        control={form.control}
                                                        name="discussionWithRelative.restraintUsed"
                                                        render={({ field }) => (
                                                            <FormItem className="w-48 max-w-full">
                                                                <FormControl><Input {...field} placeholder="Restraint type(s)" className="h-8" /></FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <span>used.</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                                <FormField
                                                    control={form.control}
                                                    name="discussionWithRelative.personSignature"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel required>Signature of Person</FormLabel>
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
                                                    name="discussionWithRelative.personSignatureDate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Date</FormLabel>
                                                            <FormControl><Input {...field} type="date" /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="discussionWithRelative.memberSignature"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Signature of Member</FormLabel>
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
                                                    name="discussionWithRelative.memberSignatureDate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Date</FormLabel>
                                                            <FormControl><Input {...field} type="date" /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground italic">(This must be the member of staff who had the discussion with the Relative)</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isInline && !viewOnly && (
                            <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
                                <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading}>Cancel</Button>
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
