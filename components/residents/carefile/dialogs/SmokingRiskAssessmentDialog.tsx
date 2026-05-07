"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { smokingRiskAssessmentSchema, type SmokingRiskAssessmentFormData } from "@/schemas/residents/care-file/smokingRiskAssessmentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import NextReviewDateField from "./NextReviewDateField";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";
import { useCareFileForms } from "@/hooks/use-care-file-forms";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";

interface SmokingRiskAssessmentDialogProps {
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
    onSaveSuccess?: (data: any) => void;
    orgLogoUrl?: string;
}

export default function SmokingRiskAssessmentDialog({
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
    refreshForms,
    onSaveSuccess,
    orgLogoUrl,
}: SmokingRiskAssessmentDialogProps) {
    const [isLoading, startTransition] = useTransition();
    const [completionDatePopoverOpen, setCompletionDatePopoverOpen] = useState(false);
    const [isSubmittedLocal, setIsSubmittedLocal] = useState(false);

    const isMissingNextReviewDateColumn = (error: any) => {
        return (error?.code === "PGRST204" || error?.code === "42703") &&
            error?.message?.toLowerCase().includes("next_review_date");
    };

    const isViewMode = viewOnly || isSubmittedLocal;

    // Reset local submission state when parent switches modes or data changes
    useEffect(() => {
        if (!viewOnly) {
            setIsSubmittedLocal(false);
        }
    }, [viewOnly, initialData]);

    const form = useForm<z.infer<typeof smokingRiskAssessmentSchema>>({
        resolver: zodResolver(smokingRiskAssessmentSchema),
        mode: "onChange",
        defaultValues: initialData
            ? {
                ...initialData,
                nextReviewDate: initialData.nextReviewDate || initialData.next_review_date || "",
                materialsControlled: initialData.materials_controlled ?? false,
                materialsControlledDetails: initialData.materials_controlled_details ?? "",
                assistanceLighting: initialData.assistance_lighting ?? false,
                assistanceLightingDetails: initialData.assistance_lighting_details ?? "",
                oneCigaretteAtTime: initialData.one_cigarette_at_time ?? false,
                oneCigaretteAtTimeDetails: initialData.one_cigarette_at_time_details ?? "",
                supervisionRequired: initialData.supervision_required ?? false,
                supervisionRequiredDetails: initialData.supervision_required_details ?? "",
                extinguishedCorrectly: initialData.extinguished_correctly ?? false,
                extinguishedCorrectlyDetails: initialData.extinguished_correctly_details ?? "",
                bedroomControlMeasures: initialData.bedroom_control_measures ?? "",
                bedroomControlMeasuresBool: initialData.bedroom_control_measures_bool ?? false,
                oxygenInUseInBedroom: initialData.oxygen_in_use_in_bedroom ?? false,
                oxygenInUseInBedroomDetails: initialData.oxygen_in_use_in_bedroom_details ?? "",
                oxygenCylinderStorageSafe: initialData.oxygen_cylinder_storage_safe ?? false,
                oxygenCylinderStorageSafeDetails: initialData.oxygen_cylinder_storage_safe_details ?? "",
                oxygenNoSmokingSignage: initialData.oxygen_no_smoking_signage ?? false,
                oxygenNoSmokingSignageDetails: initialData.oxygen_no_smoking_signage_details ?? "",
                fuelCombustibleMaterialsNearOxygen: initialData.fuel_combustible_materials_near_oxygen ?? false,
                fuelCombustibleMaterialsNearOxygenDetails: initialData.fuel_combustible_materials_near_oxygen_details ?? "",
                fuelSoftFurnishingsNearSmoking: initialData.fuel_soft_furnishings_near_smoking ?? false,
                fuelSoftFurnishingsNearSmokingDetails: initialData.fuel_soft_furnishings_near_smoking_details ?? "",
                fuelWasteBinsAndRubbishManaged: initialData.fuel_waste_bins_and_rubbish_managed ?? false,
                fuelWasteBinsAndRubbishManagedDetails: initialData.fuel_waste_bins_and_rubbish_managed_details ?? "",
                smokingRoomHasSafeAshtrays: initialData.smoking_room_has_safe_ashtrays ?? false,
                smokingRoomHasSafeAshtraysDetails: initialData.smoking_room_has_safe_ashtrays_details ?? "",
                smokingRoomNoSmokingInBed: initialData.smoking_room_no_smoking_in_bed ?? false,
                smokingRoomNoSmokingInBedDetails: initialData.smoking_room_no_smoking_in_bed_details ?? "",
                smokingRoomSupervisionProvided: initialData.smoking_room_supervision_provided ?? false,
                smokingRoomSupervisionProvidedDetails: initialData.smoking_room_supervision_provided_details ?? "",
                smokingRoomDoorClosedToCorridors: initialData.smoking_room_door_closed_to_corridors ?? false,
                smokingRoomDoorClosedToCorridorsDetails: initialData.smoking_room_door_closed_to_corridors_details ?? "",
                smokingRoomFireDoorsAndExitsClear: initialData.smoking_room_fire_doors_and_exits_clear ?? false,
                smokingRoomFireDoorsAndExitsClearDetails: initialData.smoking_room_fire_doors_and_exits_clear_details ?? "",
                smokingRoomHousekeepingGood: initialData.smoking_room_housekeeping_good ?? false,
                smokingRoomHousekeepingGoodDetails: initialData.smoking_room_housekeeping_good_details ?? "",
                riskReviewMonthly: initialData.risk_review_monthly ?? false,
                riskReviewOnConditionChange: initialData.risk_review_on_condition_change ?? false,
                riskReviewOnIncident: initialData.risk_review_on_incident ?? false,
                relativesAware: initialData.relatives_aware ?? false,
                relativesAwarenessDate: initialData.relatives_awareness_date ? new Date(initialData.relatives_awareness_date).getTime() : undefined,
                relativesAwarenessTime: initialData.relatives_awareness_time ?? "",
                assessmentDate: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
                completedBy: initialData.completed_by || userName,
                completedBySignature: initialData.completed_by || userName,
                completedByRole: initialData.completed_by_role ?? "",
            }
            : {
                residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
                residentDateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
                nextReviewDate: "",
                materialsControlled: false,
                materialsControlledDetails: "",
                assistanceLighting: false,
                assistanceLightingDetails: "",
                oneCigaretteAtTime: false,
                oneCigaretteAtTimeDetails: "",
                supervisionRequired: false,
                supervisionRequiredDetails: "",
                extinguishedCorrectly: false,
                extinguishedCorrectlyDetails: "",
                bedroomControlMeasures: "",
                bedroomControlMeasuresBool: false,
                oxygenInUseInBedroom: false,
                oxygenInUseInBedroomDetails: "",
                oxygenCylinderStorageSafe: false,
                oxygenCylinderStorageSafeDetails: "",
                oxygenNoSmokingSignage: false,
                oxygenNoSmokingSignageDetails: "",
                fuelCombustibleMaterialsNearOxygen: false,
                fuelCombustibleMaterialsNearOxygenDetails: "",
                fuelSoftFurnishingsNearSmoking: false,
                fuelSoftFurnishingsNearSmokingDetails: "",
                fuelWasteBinsAndRubbishManaged: false,
                fuelWasteBinsAndRubbishManagedDetails: "",
                smokingRoomHasSafeAshtrays: false,
                smokingRoomHasSafeAshtraysDetails: "",
                smokingRoomNoSmokingInBed: false,
                smokingRoomNoSmokingInBedDetails: "",
                smokingRoomSupervisionProvided: false,
                smokingRoomSupervisionProvidedDetails: "",
                smokingRoomDoorClosedToCorridors: false,
                smokingRoomDoorClosedToCorridorsDetails: "",
                smokingRoomFireDoorsAndExitsClear: false,
                smokingRoomFireDoorsAndExitsClearDetails: "",
                smokingRoomHousekeepingGood: false,
                smokingRoomHousekeepingGoodDetails: "",
                riskReviewMonthly: false,
                riskReviewOnConditionChange: false,
                riskReviewOnIncident: false,
                relativesAware: false,
                relativesAwarenessDate: undefined,
                relativesAwarenessTime: "",
                completedBy: userName,
                completedBySignature: userName,
                completedByRole: "",
                assessmentDate: Date.now(),
                status: "draft"
            }
    });

    const onSubmit = async (values: z.infer<typeof smokingRiskAssessmentSchema>) => {
        console.log("Submitting form with values:", values);
        startTransition(async () => {
            try {
                if (!userId) {
                    toast.error("User not authenticated. Please log in again.");
                    return;
                }

                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    assessment_date: format(new Date(values.assessmentDate || Date.now()), "yyyy-MM-dd"),
                    next_review_date: values.nextReviewDate || null,
                    created_by: userId,
                    completed_by: values.completedBy,
                    status: "active", // Explicitly set to active upon submission

                    // Assessment fields
                    materials_controlled: values.materialsControlled,
                    materials_controlled_details: values.materialsControlledDetails,
                    assistance_lighting: values.assistanceLighting,
                    assistance_lighting_details: values.assistanceLightingDetails,
                    one_cigarette_at_time: values.oneCigaretteAtTime,
                    one_cigarette_at_time_details: values.oneCigaretteAtTimeDetails,
                    supervision_required: values.supervisionRequired,
                    supervision_required_details: values.supervisionRequiredDetails,
                    extinguished_correctly: values.extinguishedCorrectly,
                    extinguished_correctly_details: values.extinguishedCorrectlyDetails,
                    bedroom_control_measures: values.bedroomControlMeasures,
                    bedroom_control_measures_bool: values.bedroomControlMeasuresBool,
                    oxygen_in_use_in_bedroom: values.oxygenInUseInBedroom,
                    oxygen_in_use_in_bedroom_details: values.oxygenInUseInBedroomDetails,
                    oxygen_cylinder_storage_safe: values.oxygenCylinderStorageSafe,
                    oxygen_cylinder_storage_safe_details: values.oxygenCylinderStorageSafeDetails,
                    oxygen_no_smoking_signage: values.oxygenNoSmokingSignage,
                    oxygen_no_smoking_signage_details: values.oxygenNoSmokingSignageDetails,
                    fuel_combustible_materials_near_oxygen: values.fuelCombustibleMaterialsNearOxygen,
                    fuel_combustible_materials_near_oxygen_details: values.fuelCombustibleMaterialsNearOxygenDetails,
                    fuel_soft_furnishings_near_smoking: values.fuelSoftFurnishingsNearSmoking,
                    fuel_soft_furnishings_near_smoking_details: values.fuelSoftFurnishingsNearSmokingDetails,
                    fuel_waste_bins_and_rubbish_managed: values.fuelWasteBinsAndRubbishManaged,
                    fuel_waste_bins_and_rubbish_managed_details: values.fuelWasteBinsAndRubbishManagedDetails,
                    smoking_room_has_safe_ashtrays: values.smokingRoomHasSafeAshtrays,
                    smoking_room_has_safe_ashtrays_details: values.smokingRoomHasSafeAshtraysDetails,
                    smoking_room_no_smoking_in_bed: values.smokingRoomNoSmokingInBed,
                    smoking_room_no_smoking_in_bed_details: values.smokingRoomNoSmokingInBedDetails,
                    smoking_room_supervision_provided: values.smokingRoomSupervisionProvided,
                    smoking_room_supervision_provided_details: values.smokingRoomSupervisionProvidedDetails,
                    smoking_room_door_closed_to_corridors: values.smokingRoomDoorClosedToCorridors,
                    smoking_room_door_closed_to_corridors_details: values.smokingRoomDoorClosedToCorridorsDetails,
                    smoking_room_fire_doors_and_exits_clear: values.smokingRoomFireDoorsAndExitsClear,
                    smoking_room_fire_doors_and_exits_clear_details: values.smokingRoomFireDoorsAndExitsClearDetails,
                    smoking_room_housekeeping_good: values.smokingRoomHousekeepingGood,
                    smoking_room_housekeeping_good_details: values.smokingRoomHousekeepingGoodDetails,
                    risk_review_monthly: values.riskReviewMonthly,
                    risk_review_on_condition_change: values.riskReviewOnConditionChange,
                    risk_review_on_incident: values.riskReviewOnIncident,
                    relatives_aware: values.relativesAware,
                    relatives_awareness_date: values.relativesAwarenessDate
                        ? format(new Date(values.relativesAwarenessDate), "yyyy-MM-dd")
                        : null,
                    relatives_awareness_time: values.relativesAwarenessTime || null,
                    completed_by_role: values.completedByRole,
                };

                console.log("Sending payload to DB:", payload);

                try {
                    await submitAssessmentWithVersioning(
                        'smoking_risk_assessments',
                        payload,
                        initialData,
                        isEditMode
                    );
                } catch (error: any) {
                    if (isMissingNextReviewDateColumn(error)) {
                        const { next_review_date: _, ...fallbackPayload } = payload;
                        await submitAssessmentWithVersioning(
                            'smoking_risk_assessments',
                            fallbackPayload,
                            initialData,
                            isEditMode
                        );
                    } else {
                        throw error;
                    }
                }

                toast.success(isEditMode ? "Assessment updated successfully" : "Assessment saved successfully");

                // Refresh sidebar status
                refreshForms?.();

                // Notify parent of success
                onSaveSuccess?.(payload);

                // Show as completed in the UI instead of closing
                setIsSubmittedLocal(true);
            } catch (error) {
                console.error("Error submitting form:", error);
                toast.error("Failed to save assessment");
            }
        });
    };

    const onError = (errors: any) => {
        console.error("Form validation errors:", errors);
        toast.error("Please ensure all fields are filled correctly.");
    };

    const renderInput = (field: any, props: any = {}) => isViewMode ? (
        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[40px]">
            {field.value || " "}
        </div>
    ) : <Input {...field} {...props} />;

    const renderTextarea = (field: any, props: any = {}) => isViewMode ? (
        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[80px]">
            {field.value || " "}
        </div>
    ) : <Textarea {...field} {...props} />;

    type QuestionConfig = {
        id: keyof SmokingRiskAssessmentFormData;
        label: string;
        detailsId: keyof SmokingRiskAssessmentFormData;
    };

    const ignitionQuestions: QuestionConfig[] = [
        {
            id: "materialsControlled",
            label: "Are the Resident&apos;s smoking materials controlled by the Home? If &apos;Yes&apos;, detail where they are secured and who is designated as the Responsible Person.",
            detailsId: "materialsControlledDetails"
        },
        {
            id: "assistanceLighting",
            label: "Does the Resident require assistance to light smoking materials or use vaporiser? If 'Yes', detail what assistance is required and by whom?",
            detailsId: "assistanceLightingDetails"
        },
        {
            id: "oneCigaretteAtTime",
            label: "Is the Resident given only one cigarette or vaporiser at any given time? If 'Yes', detail how this controlled and by whom?",
            detailsId: "oneCigaretteAtTimeDetails"
        },
        {
            id: "supervisionRequired",
            label: "Does the Resident require supervision whilst in a smoking room/area? If 'Yes' detail who by and what level of supervision is required.",
            detailsId: "supervisionRequiredDetails"
        },
        {
            id: "extinguishedCorrectly",
            label: "Do Staff ensure that cigarettes/vaporisers have been appropriately extinguished when assisting the Resident out of the smoking room/area? If 'No' measures are to be put in place to ensure that cigarettes/vaporisers have been appropriately extinguished.",
            detailsId: "extinguishedCorrectlyDetails"
        },
        {
            id: "bedroomControlMeasuresBool",
            label: "Detail the control measures that are in place to ensure that Residents do not smoke or use vaporisers in their bedrooms?",
            detailsId: "bedroomControlMeasures"
        }
    ];

    const oxygenQuestions: QuestionConfig[] = [
        {
            id: "oxygenInUseInBedroom",
            label: "Are controls in place to ensure that the resident does NOT smoke/vape in bed or whilst seated on an air flow cushion? If 'Yes' detail what controls have been put in place.",
            detailsId: "oxygenInUseInBedroomDetails"
        }
    ];

    const fuelQuestions: QuestionConfig[] = [
        {
            id: "fuelCombustibleMaterialsNearOxygen",
            label: "Has a Fire Resistant Fire Apron been provided? (Suppliers Countywide). This product is seen as a control measure to prevent ignition sources coming in contact with: 1. Fumes emanating from a build-up of emollient cream on the residents' clothes, 2. Non-fire retardant clothing i.e. sleepwear. If \"Yes\" detail where the apron is stored when not in use.",
            detailsId: "fuelCombustibleMaterialsNearOxygenDetails"
        },
        {
            id: "fuelSoftFurnishingsNearSmoking",
            label: "Has a water based emollient cream been considered an alternative to paraffin/petroleum based cream? (Consult with GP/Boots). If 'Yes' detail what alternative has been provided.",
            detailsId: "fuelSoftFurnishingsNearSmokingDetails"
        },
        {
            id: "fuelWasteBinsAndRubbishManaged",
            label: "Are staff made aware of the location of fire extinguishers and fire blankets and the actions to take in the event of a Resident’s clothing igniting? If 'Yes' detail date and time of training.",
            detailsId: "fuelWasteBinsAndRubbishManagedDetails"
        }
    ];

    const smokingRoomQuestions: QuestionConfig[] = [
        {
            id: "smokingRoomHasSafeAshtrays",
            label: "Are staff directed to restrict flammable material being taken into the smoking room/area by the Resident? (Newspapers, books, etc.).",
            detailsId: "smokingRoomHasSafeAshtraysDetails"
        },
        {
            id: "smokingRoomNoSmokingInBed",
            label: "Do domestic staff / housekeepers ensure that the smoking room/area is cleaned, daily, and there is no build-up of newspapers or other materials in bins?",
            detailsId: "smokingRoomNoSmokingInBedDetails"
        },
        {
            id: "smokingRoomSupervisionProvided",
            label: "Are ashtrays constructed of non-combustible material and emptied on a regular basis?",
            detailsId: "smokingRoomSupervisionProvidedDetails"
        },
        {
            id: "smokingRoomDoorClosedToCorridors",
            label: "Are staff aware that enclosed seating (Lounge Chairs) are not suitable for use in smoking rooms/areas as they could retain smouldering un-extinguished cigarettes?",
            detailsId: "smokingRoomDoorClosedToCorridorsDetails"
        },
        {
            id: "smokingRoomFireDoorsAndExitsClear",
            label: "Are only chairs with open sides and back provided in the smoking room/area? If \"No\" the chairs should be changed to open side and back type seating as a matter of urgency.",
            detailsId: "smokingRoomFireDoorsAndExitsClearDetails"
        }
    ];

    const renderQuestionTable = (
        sectionTitle: string,
        hazardTitle: string,
        hazardDescription: string,
        questions: QuestionConfig[]
    ) => (
        <div className="space-y-2">
            <h3 className="text-base font-semibold">{sectionTitle}</h3>
            <div className="overflow-hidden border rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold border-b border-r w-1/4">HAZARD/PROBLEM</th>
                            <th className="px-4 py-3 text-left font-bold border-b border-r w-1/3">INFORMATION TO CONSIDER FOR ENTRY INTO RESIDENT&apos;S CARE PLAN TO CONTROL IGNITION SOURCES</th>
                            <th className="px-4 py-3 text-center font-bold border-b border-r w-16">Yes</th>
                            <th className="px-4 py-3 text-center font-bold border-b border-r w-16">No</th>
                            <th className="px-4 py-3 text-left font-bold border-b">DETAILS / IDENTIFY ANY ACTION TO BE TAKEN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.map((q, idx) => (
                            <tr key={q.id as string} className="border-b last:border-b-0">
                                {idx === 0 && (
                                    <td rowSpan={questions.length} className="px-4 py-6 align-top border-r bg-muted/20">
                                        <div className="space-y-2">
                                            <p className="font-bold underline">{hazardTitle}</p>
                                            <p className="text-xs italic text-muted-foreground">
                                                {hazardDescription}
                                            </p>
                                        </div>
                                    </td>
                                )}
                                <td className="px-4 py-4 border-r align-top">
                                    {q.label}
                                </td>
                                <td className="px-4 py-4 border-r align-top text-center" colSpan={2}>
                                    <FormField
                                        control={form.control}
                                        name={q.id as any}
                                        render={({ field }) => (
                                            <FormItem className="space-y-0">
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={(val) => field.onChange(val === "yes")}
                                                        value={field.value === true ? "yes" : field.value === false ? "no" : undefined}
                                                        className="flex justify-center gap-8"
                                                    >
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="yes" />
                                                            </FormControl>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="no" />
                                                            </FormControl>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <FormField
                                        control={form.control}
                                        name={q.detailsId as any}
                                        render={({ field }) => (
                                            <FormItem className="space-y-0">
                                                <FormControl>
                                                    {renderTextarea(field, {
                                                        className: "min-h-[80px] resize-none text-xs",
                                                        placeholder: "Enter details..."
                                                    })}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col space-y-8">
            {!isInline && (
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">PERSONAL RISK ASSESSMENT OF RESIDENT FOR SMOKING OR VAPING IN THE CARE HOME</DialogTitle>
                    <DialogDescription className="text-center font-semibold text-primary uppercase">
                        {isSubmittedLocal ? "ASSESSMENT COMPLETED" : "TO BE COMPLETED AND HELD IN SECTION 15 OF THE RESIDENT'S CARE PLAN"}
                    </DialogDescription>
                </DialogHeader>
            )}

            <div className="space-y-12 pb-20">
                <Form {...form}>
                    <div className="mb-6 p-4 border rounded-lg bg-muted/40">
                        <FormField
                            control={form.control}
                            name="nextReviewDate"
                            render={({ field }) => (
                                <FormItem className="max-w-xs">
                                    <FormControl>
                                        <NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={isViewMode} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
                        <button
                            type="submit"
                            id="care-file-submit-btn"
                            className="hidden"
                        />
                        <fieldset disabled={isViewMode} className={isViewMode ? "pointer-events-none opacity-90" : ""}>

                            <div className="space-y-8">
                                {renderQuestionTable(
                                    "Resident-Specific Ignition Sources",
                                    "IGNITION SOURCES",
                                    "e.g. lighters, matches, cigarettes, vaporisers and chargers.",
                                    ignitionQuestions
                                )}
                                {renderQuestionTable(
                                    "Oxygen Sources",
                                    "OXYGEN SOURCES",
                                    "For Oxygen bottles, Oxygen concentrators, Air Flow Mattresses, Air Flow cushions - Can all supply a constant flow of air to fire, which may encourage the development and rapid spread of fire.",
                                    oxygenQuestions
                                )}
                                {renderQuestionTable(
                                    "Fuel Sources",
                                    "FUEL SOURCES",
                                    "These should be the only FUEL SOURCES Petroleum based emollient creams, Paper products, Non fire retardant - furniture / textiles, soft furnishings, sleepwear items.",
                                    fuelQuestions
                                )}
                                {renderQuestionTable(
                                    "Smoking Room / Area",
                                    "SMOKING ROOM / AREA",
                                    "Combustible materials, furniture.",
                                    smokingRoomQuestions
                                )}
                            </div>

                            {/* Risk Assessment Review */}
                            <div className="mt-8 pt-6 border-t space-y-4">
                                <h3 className="text-base font-semibold tracking-wide">RISK ASSESSMENT REVIEW</h3>
                                <p className="text-xs text-muted-foreground">
                                    This risk assessment will be reviewed:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <FormField
                                        control={form.control}
                                        name="riskReviewMonthly"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value || false}
                                                        onCheckedChange={(checked) => field.onChange(!!checked)}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Monthly
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="riskReviewOnConditionChange"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value || false}
                                                        onCheckedChange={(checked) => field.onChange(!!checked)}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Upon any significant change in the residents&apos; condition
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="riskReviewOnIncident"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value || false}
                                                        onCheckedChange={(checked) => field.onChange(!!checked)}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    In the event of a smoking related incident
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Relatives / Visitors Awareness */}
                            <div className="mt-8 pt-6 border-t space-y-4">
                                <h3 className="text-base font-semibold tracking-wide">RELATIVES / VISITORS AWARENESS</h3>
                                <div className="space-y-3 text-sm">
                                    <FormField
                                        control={form.control}
                                        name="relativesAware"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>
                                                    Have relatives/visitors been made aware of the content of this risk assessment and of the risk to the resident while smoking?
                                                </FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={(val) => field.onChange(val === "yes")}
                                                        value={field.value === true ? "yes" : field.value === false ? "no" : undefined}
                                                        className="flex gap-6"
                                                    >
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="yes" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">Yes</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="no" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">No</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch("relativesAware") && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="relativesAwarenessDate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Date of meeting</FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "w-full text-left font-normal",
                                                                            !field.value && "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {field.value ? format(new Date(field.value), "PPP") : "Pick date"}
                                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={field.value ? new Date(field.value) : undefined}
                                                                    onSelect={(date) => {
                                                                        if (date) {
                                                                            field.onChange(date.getTime());
                                                                        }
                                                                    }}
                                                                    disabled={(date) => date > new Date()}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="relativesAwarenessTime"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Time of meeting</FormLabel>
                                                        <FormControl>
                                                            {renderInput(field, {
                                                                type: "time"
                                                            })}
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sign-off Section */}
                            <div className="mt-8 pt-6 border-t space-y-4">
                                <h3 className="text-base font-semibold tracking-wide">SIGN-OFF</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="completedBySignature"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Signature of Person Completing Form and Updating Room File</FormLabel>
                                                <FormControl>
                                                    {renderInput(field)}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="completedBy"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Print Staff Name</FormLabel>
                                                <FormControl>
                                                    {renderInput(field)}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="assessmentDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Date</FormLabel>
                                                <Popover modal open={completionDatePopoverOpen} onOpenChange={setCompletionDatePopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? format(new Date(field.value), "PPP") : "Pick date"}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value ? new Date(field.value) : undefined}
                                                            onSelect={(date) => {
                                                                if (date) {
                                                                    field.onChange(date.getTime());
                                                                    setCompletionDatePopoverOpen(false);
                                                                }
                                                            }}
                                                            disabled={(date) => date > new Date()}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="completedByRole"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Role</FormLabel>
                                                <FormControl>
                                                    {renderInput(field, { placeholder: "e.g. Senior Carer" })}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </fieldset>
                    </form>
                </Form>
            </div>

            {
                !isInline && !isViewMode && (
                    <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
                        <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading} size="lg">Cancel</Button>
                        <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} size="lg" className="min-w-[150px]">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? "Update Assessment" : "Save Assessment")}
                        </Button>
                    </div>
                )
            }

            {
                !isInline && isSubmittedLocal && (
                    <div className="border-t pt-8 flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 pb-2">
                        <Button onClick={() => onClose?.()} size="lg" className="min-w-[150px]">Close Assessment</Button>
                    </div>
                )
            }
        </div >
    );
}
