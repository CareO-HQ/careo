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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { nightObservationSchema, NightObservationFormData } from "@/schemas/residents/care-file/nightObservationSchema";
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

interface NightObservationDialogProps {
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

const OBSERVATION_TYPES = [
    "General welfare checks at regular intervals",
    "Increased observation due to medical condition",
    "Falls risk monitoring",
    "Pressure area care / repositioning",
    "Behavioral monitoring",
    "Other (please specify below)"
];

const RISKS_EXPLAINED = [
    "Risk of falls",
    "Risk of medical deterioration",
    "Risk of pressure sores",
    "Risk of wandering or confusion",
    "Other (please specify below)"
];

const FREQUENCIES = [
    "Every 15 minutes",
    "Every 30 minutes",
    "Hourly",
    "Two-hourly",
    "As required based on condition",
    "Other (please specify below)"
];

export default function NightObservationDialog({
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
}: NightObservationDialogProps) {
    const [isLoading, startTransition] = useTransition();
    const [loadingState, setLoadingState] = useState<string>("");

    const form = useForm<NightObservationFormData>({
        resolver: zodResolver(nightObservationSchema) as any,
        mode: "onChange",
        defaultValues: {
            residentId,
            organizationId,
            userId,
            teamId,
            residentName: resident ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim() : "",
            dateOfBirth: resident?.date_of_birth ? format(new Date(resident.date_of_birth), "yyyy-MM-dd") : "",
            nhsNumber: resident?.nhs_health_number || "",
            roomNumber: resident?.room_number || "",
            dateOfAdmission: resident?.admission_date ? format(new Date(resident.admission_date), "yyyy-MM-dd") : "",
            observationTypes: [],
            otherObservationType: "",
            frequency: [],
            otherFrequency: "",
            risksExplained: [],
            otherRisk: "",
            residentConsented: false,
            residentSignature: "",
            consentDate: "",
            hasCapacity: undefined as any,
            representativeConsulted: undefined as any,
            representativeName: "",
            relationshipToResident: "",
            contactDetails: "",
            staffName: userName || "",
            staffRole: "",
            staffSignature: "",
            declarationDate: new Date().toISOString().split("T")[0],
            ...(initialData?.assessment_data || {})
        }
    });

    const watchedObservationTypes = form.watch("observationTypes");
    const watchedFrequency = form.watch("frequency");
    const watchedRisksExplained = form.watch("risksExplained");

    const handleSubmit = async (values: NightObservationFormData) => {
        startTransition(async () => {
            try {
                setLoadingState("Saving night observation consent...");

                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    team_id: teamId,
                    user_id: userId,
                    assessment_data: values,
                    status: 'completed'
                };

                await submitAssessmentWithVersioning(
                    'night_observation_consents',
                    payload,
                    initialData,
                    isEditMode
                );

                toast.success(isEditMode ? "Night observation consent updated" : "Night observation consent saved");
                refreshForms?.();
                onClose?.();
            } catch (error) {
                console.error("Error submitting form:", error);
                toast.error("Failed to save night observation consent");
            } finally {
                setLoadingState("");
            }
        });
    };

    return (
        <div className="space-y-6">
            {!isInline && (
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Review" : "Complete"} Night Observation Consent</DialogTitle>
                    <DialogDescription>
                        Document the agreement and plan for night observations to ensure safety and wellbeing.
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
                                console.error("Night Obs Consent form errors:", errors);
                                toast.error("Please fill in all required fields.");
                            })}
                        />

                        <div className="space-y-8 px-1">
                            {/* Section A: Resident Information */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Section A — Resident Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="residentName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dateOfBirth"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date of Birth</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="date" />
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
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="roomNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Room Number</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dateOfAdmission"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date of Admission</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="date" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* Section B: Purpose */}
                            <section className="space-y-2 bg-muted/30 p-4 rounded-lg">
                                <h3 className="text-md font-semibold">Section B — Purpose of Night Observations</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Night observations are carried out to ensure the safety, wellbeing, and health of residents during night hours.
                                    Observations may include visual checks, monitoring breathing, repositioning, continence care, or responding to medical needs.
                                </p>
                            </section>

                            {/* Section C: Type of Observation */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Section C — Type of Observation Required</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {OBSERVATION_TYPES.map((type) => (
                                        <FormField
                                            key={type}
                                            control={form.control}
                                            name="observationTypes"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(type)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...field.value, type])
                                                                    : field.onChange(field.value?.filter((v: string) => v !== type));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{type}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                {watchedObservationTypes?.includes("Other (please specify below)") && (
                                    <FormField
                                        control={form.control}
                                        name="otherObservationType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Other (specify)</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} placeholder="Specify if other selected" className="min-h-[80px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </section>

                            {/* Section D: Frequency */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Section D — Frequency of Observations</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {FREQUENCIES.map((freq) => (
                                        <FormField
                                            key={freq}
                                            control={form.control}
                                            name="frequency"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(freq)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value || []), freq])
                                                                    : field.onChange(field.value?.filter((v: string) => v !== freq));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{freq}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                {watchedFrequency?.includes("Other (please specify below)") && (
                                    <FormField
                                        control={form.control}
                                        name="otherFrequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Other Frequency Details (specify)</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} placeholder="Specify if other selected" className="min-h-[80px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </section>

                            {/* Section E & F: Consent & Capacity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Section E — Resident Consent</h3>
                                    <p className="text-sm border-l-4 border-primary pl-4 py-2 bg-muted/20 italic">
                                        I confirm that the purpose and nature of night observations have been explained to me, and I understand that staff may enter my room during the night to ensure my safety and wellbeing.
                                    </p>
                                    <FormField
                                        control={form.control}
                                        name="residentConsented"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-muted/20 p-3 rounded-md">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>I consent to the agreed night observations.</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="residentSignature"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Resident Signature</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Type name to sign" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="consentDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="date" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Section F — Capacity Consideration</h3>
                                    <FormField
                                        control={form.control}
                                        name="hasCapacity"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Does the resident have the capacity to consent?</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        className="flex flex-col space-y-1"
                                                    >
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="Yes" /></FormControl>
                                                            <FormLabel className="font-normal">Yes</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="No" /></FormControl>
                                                            <FormLabel className="font-normal">No</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <p className="text-[11px] text-muted-foreground italic">
                                        If the resident lacks capacity, this decision must be recorded in the Best Interest Decision Form in accordance with care home policy
                                    </p>
                                </section>
                            </div>

                            {/* Section G: Legal Rep */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Section G — Legal Representative / Family Involvement</h3>
                                <FormField
                                    control={form.control}
                                    name="representativeConsulted"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Who was consulted? (If resident lacks capacity)</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex flex-row space-x-4 space-y-0"
                                                >
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="LPA" /></FormControl>
                                                        <FormLabel className="font-normal">LPA (Lasting Power of Attorney - Health & Welfare)</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="Family" /></FormControl>
                                                        <FormLabel className="font-normal">Next of Kin / Family</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="Not Applicable" /></FormControl>
                                                        <FormLabel className="font-normal">N/A</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="representativeName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Representative Name</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="relationshipToResident"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Relationship</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="contactDetails"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Contact Details / Agreement Notes</FormLabel>
                                                <FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* Section H: Risks */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Section H — Risks Explained</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {RISKS_EXPLAINED.map((risk) => (
                                        <FormField
                                            key={risk}
                                            control={form.control}
                                            name="risksExplained"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(risk)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...field.value, risk])
                                                                    : field.onChange(field.value?.filter((v: string) => v !== risk));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{risk}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                {watchedRisksExplained?.includes("Other (please specify below)") && (
                                    <FormField
                                        control={form.control}
                                        name="otherRisk"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Other Risks</FormLabel>
                                                <FormControl><Textarea {...field} className="min-h-[80px]" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </section>

                            {/* Section I: Staff Declaration */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Section I — Staff Declaration</h3>
                                <p className="text-sm text-muted-foreground italic">
                                    I confirm that the resident (or their representative) has been provided with clear information regarding night observations and has had the opportunity to ask questions
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="staffName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Staff Name</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="staffRole"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Role / Designation</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="staffSignature"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Staff Signature</FormLabel>
                                                <FormControl><Input {...field} placeholder="Type name to sign" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="declarationDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Date</FormLabel>
                                                <FormControl><Input {...field} type="date" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>
                        </div>

                        {!isInline && !viewOnly && (
                            <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2 z-10">
                                <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading}>Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Assessment"}
                                </Button>
                            </DialogFooter>
                        )}
                    </form>
                </fieldset>
            </Form>
        </div>
    );
}
