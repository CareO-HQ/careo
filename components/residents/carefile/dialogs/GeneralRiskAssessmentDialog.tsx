"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
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
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    generalRiskAssessmentSchema,
    areasOfRiskOptions,
    equipmentOptions,
    reviewFrequencyOptions,
    reasonForAssessmentOptions
} from "@/schemas/residents/care-file/generalRiskAssessmentSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import NextReviewDateField from "./NextReviewDateField";

interface GeneralRiskAssessmentDialogProps {
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

type FormValues = z.infer<typeof generalRiskAssessmentSchema>;

const VIEW_DIV = "w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10";
const SECTION_HEADER = "text-sm font-semibold pb-2 border-b mb-4";

const involvementOptions = [
    "Resident involved in assessment",
    "Family or representative involved",
    "Resident unable to participate"
];

export default function GeneralRiskAssessmentDialog({
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
}: GeneralRiskAssessmentDialogProps) {
    const [isLoading, startTransition] = useTransition();
    const [loadingState, setLoadingState] = useState<string>("");

    const isMissingNextReviewDateColumn = (error: any) => {
        return (error?.code === "PGRST204" || error?.code === "42703") &&
            error?.message?.toLowerCase().includes("next_review_date");
    };

    const residentFullName = resident
        ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim()
        : "";

    const todayStr = new Date().toISOString().split("T")[0];
    const dobStr = resident?.date_of_birth
        ? new Date(resident.date_of_birth).toISOString().split("T")[0]
        : "";

    const form = useForm<FormValues>({
        resolver: zodResolver(generalRiskAssessmentSchema) as any,
        mode: "onChange",
        defaultValues: initialData
            ? {
                  ...initialData.assessment_data,
                  fullName: initialData.assessment_data?.fullName ?? residentFullName,
                  dateOfBirth: initialData.assessment_data?.dateOfBirth ?? dobStr,
                  nhsNumber: initialData.assessment_data?.nhsNumber ?? (resident?.nhs_health_number || resident?.nhsHealthNumber || ""),
                  roomNumber: initialData.assessment_data?.roomNumber ?? (resident?.roomNumber || resident?.room_number || ""),
                  dateOfAssessment: initialData.assessment_data?.dateOfAssessment ?? todayStr,
                  assessmentCompletedBy: initialData.assessment_data?.assessmentCompletedBy ?? (initialData.completed_by || userName || ""),
                  role: initialData.assessment_data?.role ?? "",
                  reasonForAssessment: initialData.assessment_data?.reasonForAssessment ?? [],
                  otherReason: initialData.assessment_data?.otherReason ?? "",
                  areasOfRisk: initialData.assessment_data?.areasOfRisk ?? [],
                  otherArea: initialData.assessment_data?.otherArea ?? "",
                  riskDescription: initialData.assessment_data?.riskDescription ?? "",
                  riskLevels: initialData.assessment_data?.riskLevels ?? [],
                  controlMeasures: initialData.assessment_data?.controlMeasures ?? "",
                  equipmentRequired: initialData.assessment_data?.equipmentRequired ?? [],
                  otherEquipment: initialData.assessment_data?.otherEquipment ?? "",
                  residentInvolvement: initialData.assessment_data?.residentInvolvement ?? [],
                  involvementComments: initialData.assessment_data?.involvementComments ?? "",
                  reviewFrequency: initialData.assessment_data?.reviewFrequency ?? [],
                  otherFrequency: initialData.assessment_data?.otherFrequency ?? "",
                  nextReviewDate: initialData.assessment_data?.nextReviewDate ?? "",
                  assessorSignature: initialData.assessment_data?.assessorSignature ?? (initialData.completed_by || userName || ""),
                  signatureDate: initialData.assessment_data?.signatureDate ?? todayStr,
                  status: initialData.assessment_data?.status ?? "submitted"
              }
            : {
                  fullName: residentFullName,
                  dateOfBirth: dobStr,
                  nhsNumber: resident?.nhs_health_number || resident?.nhsHealthNumber || "",
                  roomNumber: resident?.roomNumber || resident?.room_number || "",
                  dateOfAssessment: todayStr,
                  assessmentCompletedBy: userName || "",
                  role: "",
                  reasonForAssessment: [],
                  otherReason: "",
                  areasOfRisk: [],
                  otherArea: "",
                  riskDescription: "",
                  riskLevels: [],
                  controlMeasures: "",
                  equipmentRequired: [],
                  otherEquipment: "",
                  residentInvolvement: [],
                  involvementComments: "",
                  reviewFrequency: [],
                  otherFrequency: "",
                  nextReviewDate: "",
                  assessorSignature: userName || "",
                  signatureDate: todayStr,
                  status: "submitted"
              }
    });

    const areasOfRisk = form.watch("areasOfRisk") ?? [];
    const otherArea = form.watch("otherArea") ?? "";

    // Helper for truncated text with tooltip
    const TruncatedText = ({ text, maxLength = 30 }: { text: string; maxLength?: number }) => {
        if (!text) return null;
        if (text.length <= maxLength) return <span>{text}</span>;

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                            {text.substring(0, maxLength)}...
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] break-words">
                        <p>{text}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    const handleSubmit = async (values: FormValues) => {
        startTransition(async () => {
            try {
                setLoadingState("Saving general risk assessment...");

                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    assessment_date: values.dateOfAssessment || todayStr,
                    completed_by: userName,
                    created_by: userId,
                    next_review_date: values.nextReviewDate || null,
                    assessment_data: values
                };

                try {
                    await submitAssessmentWithVersioning(
                        "general_risk_assessments",
                        payload,
                        initialData,
                        isEditMode
                    );
                } catch (error: any) {
                    if (isMissingNextReviewDateColumn(error)) {
                        const { next_review_date: _, ...fallbackPayload } = payload;
                        await submitAssessmentWithVersioning(
                            "general_risk_assessments",
                            fallbackPayload,
                            initialData,
                            isEditMode
                        );
                    } else {
                        throw error;
                    }
                }

                toast.success(
                    isEditMode
                        ? "General risk assessment updated successfully"
                        : "General risk assessment saved successfully"
                );
                refreshForms?.();
                onClose?.();
            } catch (error) {
                console.error("Error submitting form:", error);
                toast.error("Failed to save general risk assessment");
            } finally {
                setLoadingState("");
            }
        });
    };

    // Helper to render a text input or a view-only div
    const renderField = (value: string | undefined) =>
        viewOnly ? (
            <div className={VIEW_DIV}>{value || " "}</div>
        ) : null;

    return (
        <>
            {!isInline && (
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? "Review" : "Complete"} General Risk Assessment
                    </DialogTitle>
                    <DialogDescription>
                        Identify and document risks to maintain a safe environment for the resident.
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
                                console.error("General Risk Assessment form errors:", errors);
                                toast.error("Please fill in all required fields correctly.");
                            })}
                        />

                        <div className="mb-6 p-4 border rounded-lg bg-muted/40">
                            <FormField
                                control={form.control}
                                name="nextReviewDate"
                                render={({ field }) => (
                                    <FormItem className="max-w-xs">
                                        <FormControl>
                                            <NextReviewDateField
                                                value={field.value || ""}
                                                onChange={field.onChange}
                                                disabled={viewOnly}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-8 px-1">
                            {/* ── Section A — Resident Information ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section A — Resident Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="fullName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Full Name</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
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
                                        name="dateOfBirth"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date of Birth</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} type="date" />
                                                    )}
                                                </FormControl>
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
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} placeholder="NHS / Resident number" />
                                                    )}
                                                </FormControl>
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
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dateOfAssessment"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date of Assessment</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} type="date" />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* ── Section B — Assessment Details ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section B — Assessment Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="assessmentCompletedBy"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Assessment Completed By</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
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
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Role</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} placeholder="Job title / role" />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <FormLabel>Reason for Assessment</FormLabel>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {reasonForAssessmentOptions.map((reason) => (
                                            <FormField
                                                key={reason}
                                                control={form.control}
                                                name="reasonForAssessment"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(reason)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value ?? []), reason])
                                                                        : field.onChange(field.value?.filter((v: string) => v !== reason));
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{reason}</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="otherReason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-normal text-muted-foreground">Other reason (if applicable)</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} placeholder="Specify other reason…" />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* ── Section C — Areas of Risk ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section C — Areas of Risk Identified</h4>
                                <p className="text-sm text-muted-foreground">Please tick all areas applicable to the resident:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {areasOfRiskOptions.map((area) => (
                                        <FormField
                                            key={area}
                                            control={form.control}
                                            name="areasOfRisk"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(area)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value ?? []), area])
                                                                    : field.onChange(field.value?.filter((v: string) => v !== area));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{area}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="otherArea"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-normal text-muted-foreground">Other (if applicable)</FormLabel>
                                            <FormControl>
                                                {viewOnly ? (
                                                    <div className={VIEW_DIV}>{field.value || " "}</div>
                                                ) : (
                                                    <Input {...field} placeholder="Specify other area…" />
                                                )}
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ── Section D — Description of Identified Risks ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section D — Description of Identified Risks</h4>
                                <p className="text-sm text-muted-foreground">Please provide details of each identified risk:</p>
                                <FormField
                                    control={form.control}
                                    name="riskDescription"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                {viewOnly ? (
                                                    <div className={`${VIEW_DIV} min-h-24`}>{field.value || " "}</div>
                                                ) : (
                                                    <Textarea
                                                        {...field}
                                                        rows={5}
                                                        placeholder="Describe each identified risk in detail…"
                                                    />
                                                )}
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ── Section E — Risk Level ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section E — Risk Level</h4>
                                <p className="text-sm text-muted-foreground">For each identified risk, indicate the level of concern:</p>
                                {areasOfRiskOptions.map((area, index) => {
                                    const isSelected = areasOfRisk.includes(area);
                                    if (!isSelected) return null;
                                    return (
                                        <div key={area} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                                            <p className="text-sm font-medium">{area}</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {(["low", "medium", "high"] as const).map((level) => (
                                                    <FormField
                                                        key={level}
                                                        control={form.control}
                                                        name={`riskLevels`}
                                                        render={({ field }) => {
                                                            const current = field.value ?? [];
                                                            const entry = current.find((e: any) => e.area === area);
                                                            const isChecked = entry?.level === level;
                                                            return (
                                                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked) => {
                                                                                const others = current.filter((e: any) => e.area !== area);
                                                                                if (checked) {
                                                                                    field.onChange([...others, { area, level, notes: entry?.notes ?? "" }]);
                                                                                } else {
                                                                                    field.onChange([...others, { area, level: undefined, notes: entry?.notes ?? "" }]);
                                                                                }
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal capitalize">{level}</FormLabel>
                                                                </FormItem>
                                                            );
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name={`riskLevels`}
                                                render={({ field }) => {
                                                    const current = field.value ?? [];
                                                    const entry = current.find((e: any) => e.area === area);
                                                    return (
                                                        <FormItem>
                                                            <FormLabel className="text-xs text-muted-foreground">Notes</FormLabel>
                                                            <FormControl>
                                                                {viewOnly ? (
                                                                    <div className={VIEW_DIV}>{entry?.notes || " "}</div>
                                                                ) : (
                                                                    <Input
                                                                        value={entry?.notes ?? ""}
                                                                        onChange={(e) => {
                                                                            const others = current.filter((el: any) => el.area !== area);
                                                                            field.onChange([...others, { area, level: entry?.level, notes: e.target.value }]);
                                                                        }}
                                                                        placeholder="Notes…"
                                                                    />
                                                                )}
                                                            </FormControl>
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                                {otherArea && (
                                    <div className="border rounded-lg p-4 space-y-3 bg-muted/20 border-primary/20">
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            <span className="text-muted-foreground mr-1">Other:</span>
                                            <TruncatedText text={otherArea} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {(["low", "medium", "high"] as const).map((level) => (
                                                <FormField
                                                    key={level}
                                                    control={form.control}
                                                    name={`riskLevels`}
                                                    render={({ field }) => {
                                                        const current = field.value ?? [];
                                                        const entry = current.find((e: any) => e.area === "OTHER_AREA");
                                                        const isChecked = entry?.level === level;
                                                        return (
                                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={isChecked}
                                                                        onCheckedChange={(checked) => {
                                                                            const others = current.filter((e: any) => e.area !== "OTHER_AREA");
                                                                            if (checked) {
                                                                                field.onChange([...others, { area: "OTHER_AREA", level, notes: entry?.notes ?? "" }]);
                                                                            } else {
                                                                                field.onChange([...others, { area: "OTHER_AREA", level: undefined, notes: entry?.notes ?? "" }]);
                                                                            }
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal capitalize">{level}</FormLabel>
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`riskLevels`}
                                            render={({ field }) => {
                                                const current = field.value ?? [];
                                                const entry = current.find((e: any) => e.area === "OTHER_AREA");
                                                return (
                                                    <FormItem>
                                                        <FormLabel className="text-xs text-muted-foreground">Notes</FormLabel>
                                                        <FormControl>
                                                            {viewOnly ? (
                                                                <div className={VIEW_DIV}>{entry?.notes || " "}</div>
                                                            ) : (
                                                                <Input
                                                                    value={entry?.notes ?? ""}
                                                                    onChange={(e) => {
                                                                        const others = current.filter((el: any) => el.area !== "OTHER_AREA");
                                                                        field.onChange([...others, { area: "OTHER_AREA", level: entry?.level, notes: e.target.value }]);
                                                                    }}
                                                                    placeholder="Notes…"
                                                                />
                                                            )}
                                                        </FormControl>
                                                    </FormItem>
                                                );
                                            }}
                                        />
                                    </div>
                                )}
                                {areasOfRisk.length === 0 && !otherArea && (
                                    <p className="text-sm text-muted-foreground italic">Select risk areas in Section C to set risk levels here.</p>
                                )}
                            </div>

                            {/* ── Section F — Control Measures ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section F — Control Measures and Actions</h4>
                                <p className="text-sm text-muted-foreground">Detail the actions required to reduce or manage the identified risks:</p>
                                <FormField
                                    control={form.control}
                                    name="controlMeasures"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                {viewOnly ? (
                                                    <div className={`${VIEW_DIV} min-h-24`}>{field.value || " "}</div>
                                                ) : (
                                                    <Textarea
                                                        {...field}
                                                        rows={5}
                                                        placeholder="Describe control measures and actions to manage risks…"
                                                    />
                                                )}
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ── Section G — Equipment or Support Required ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section G — Equipment or Support Required</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {equipmentOptions.map((item) => (
                                        <FormField
                                            key={item}
                                            control={form.control}
                                            name="equipmentRequired"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value ?? []), item])
                                                                    : field.onChange(field.value?.filter((v: string) => v !== item));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{item}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="otherEquipment"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-normal text-muted-foreground">Other (if applicable)</FormLabel>
                                            <FormControl>
                                                {viewOnly ? (
                                                    <div className={VIEW_DIV}>{field.value || " "}</div>
                                                ) : (
                                                    <Input {...field} placeholder="Specify other equipment or support…" />
                                                )}
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ── Section H — Resident / Representative Involvement ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section H — Resident / Representative Involvement</h4>
                                <div className="space-y-2">
                                    {involvementOptions.map((option) => (
                                        <FormField
                                            key={option}
                                            control={form.control}
                                            name="residentInvolvement"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(option)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value ?? []), option])
                                                                    : field.onChange(field.value?.filter((v: string) => v !== option));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{option}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="involvementComments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Comments</FormLabel>
                                            <FormControl>
                                                {viewOnly ? (
                                                    <div className={`${VIEW_DIV} min-h-16`}>{field.value || " "}</div>
                                                ) : (
                                                    <Textarea {...field} rows={3} placeholder="Additional comments…" />
                                                )}
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* ── Section I — Review and Monitoring ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section I — Review and Monitoring</h4>
                                <div className="space-y-2">
                                    <FormLabel>Review Frequency</FormLabel>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {reviewFrequencyOptions.map((freq) => (
                                            <FormField
                                                key={freq}
                                                control={form.control}
                                                name="reviewFrequency"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(freq)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value ?? []), freq])
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
                                    <FormField
                                        control={form.control}
                                        name="otherFrequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-normal text-muted-foreground">Other frequency (if applicable)</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} placeholder="Specify other frequency…" />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* ── Section J — Signatures ── */}
                            <div className="space-y-4">
                                <h4 className={SECTION_HEADER}>Section J — Signatures</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="assessorSignature"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Assessor Signature</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} placeholder="Typed name as signature" />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="signatureDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date</FormLabel>
                                                <FormControl>
                                                    {viewOnly ? (
                                                        <div className={VIEW_DIV}>{field.value || " "}</div>
                                                    ) : (
                                                        <Input {...field} type="date" />
                                                    )}
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {!isInline && !viewOnly && (
                            <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
                                <Button variant="outline" onClick={() => onClose?.()} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </Button>
                            </DialogFooter>
                        )}
                    </form>
                </fieldset>
            </Form>
        </>
    );
}
