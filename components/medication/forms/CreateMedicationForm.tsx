"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
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
import { config } from "@/config";
import { CreateMedicationSchema } from "@/schemas/medication/CreateMedicationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile } from "@/hooks/use-profile";
import { InteractiveBodyMap } from "@/components/body-map/InteractiveBodyMap";
import { BODY_REGIONS } from "@/lib/config/body-regions";
import type { BodyRegion } from "@/types/body-map";


export default function CreateMedicationForm({
  residentId,
  teamId,
  organizationId,
  gpName,
  initialType,
  onSuccess
}: {
  residentId: string;
  teamId?: string;
  organizationId?: string;
  gpName?: string;
  initialType?: "Scheduled" | "PRN (As Needed)" | "Topical" | "Supplement";
  onSuccess: () => void;
}) {
  const { profile } = useProfile();
  const [isLoading, startTransition] = useTransition();
  const [step, setStep] = useState(initialType ? 1 : 0);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [medicationType, setMedicationType] = useState<"Scheduled" | "PRN (As Needed)" | "Topical" | "Supplement" | null>(initialType || null);

  const form = useForm<z.infer<typeof CreateMedicationSchema>>({
    resolver: zodResolver(CreateMedicationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      strength: "",
      strengthUnit: "mg",
      totalCount: undefined,
      dosageForm: undefined,
      route: undefined,
      frequency: undefined,
      scheduleType: initialType || undefined,
      times: [],
      timeQuantities: {},
      instructions: undefined,
      prescriberName: gpName || "",
      startDate: toZonedTime(new Date(), "Europe/London"),
      status: "active",
      isControlledDrug: false,
      controlledDrugSchedule: undefined,
      minIntervalHours: undefined,
      maxDailyDose: undefined,
      maxDailyDoseUnit: undefined,
      bodyRegions: []
    }
  });

  // Watch schedule type to disable frequency field for PRN medications
  const scheduleType = form.watch("scheduleType");

  async function onSubmit(values: z.infer<typeof CreateMedicationSchema>) {
    console.log("Form submitted with values:", values);

    // Validate step 3 fields before submitting
    const isValid = await handleThirdStepValidation();
    if (!isValid) {
      return;
    }

    startTransition(async () => {
      try {
        const { data: newMedication, error } = await supabase
          .from("medications")
          .insert({
            resident_id: residentId,
            team_id: teamId,
            organization_id: organizationId,
            created_by: profile?.id,
            name: values.name,
            strength: values.strength,
            strength_unit: values.strengthUnit,
            total_count: values.totalCount,
            dosage_form: values.dosageForm,
            route: values.route,
            frequency: values.frequency,
            schedule_type: values.scheduleType,
            times: values.times,
            time_quantities: values.timeQuantities,
            instructions: values.instructions,
            prescriber_name: values.prescriberName,
            start_date: values.startDate.toISOString(),
            status: values.status,
            is_controlled_drug: values.isControlledDrug,
            controlled_drug_schedule: values.controlledDrugSchedule,
            min_interval_hours: values.minIntervalHours,
            max_daily_dose: values.maxDailyDose,
            max_daily_dose_unit: values.maxDailyDoseUnit,
            body_regions: values.bodyRegions
          })
          .select()
          .single();

        if (error) throw error;

        // Generate intakes for today if applicable
        if (newMedication && values.scheduleType !== "PRN (As Needed)" && values.times && values.times.length > 0) {
          const { getUKTodayDate } = await import("@/lib/date-utils");
          const ukTodayStr = getUKTodayDate();

          // Get start date string (treat the selected date as that day in UK time)
          const startDateStr = format(values.startDate, "yyyy-MM-dd");

          // Check if medication is active today
          // We compare standard date strings to avoid time/timezone confusion
          const isStarted = startDateStr <= ukTodayStr;

          if (isStarted && values.status === 'active') {
            const UK_TIMEZONE = "Europe/London";

            const intakes = values.times.map((time) => {
              // Construct the datetime string for the UK time
              // e.g. "2024-01-29T08:00:00"
              const dateTimeStr = `${ukTodayStr}T${time}:00`;

              // Convert this UK time to a UTC Date object for storage
              const scheduledTimeUTC = fromZonedTime(dateTimeStr, UK_TIMEZONE);

              return {
                medication_id: newMedication.id,
                resident_id: residentId,
                scheduled_time: scheduledTimeUTC.toISOString(),
                quantity: values.timeQuantities?.[time] || 1,
                status: 'scheduled',
                organization_id: organizationId,
                care_home_id: profile?.active_care_home_id
              };
            });

            const { error: intakeError } = await supabase.from("medication_intakes").insert(intakes);

            if (intakeError) {
              console.error("Error creating initial intakes:", intakeError);
              toast.error("Medication created but failed to generate today's schedule");
            }
          }
        }

        toast.success("Medication created successfully");
        onSuccess();
      } catch (error) {
        console.error("Error creating medication:", error);
        toast.error(`Failed to create medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  const handleFirstStep = async () => {
    const fieldsToValidate = [
      "name",
      "strength",
      "strengthUnit",
      "dosageForm",
      "route",
      "frequency",
      "scheduleType"
    ] as const;

    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    // Skip time selection step if medication is PRN
    const scheduleType = form.getValues("scheduleType");
    if (scheduleType === "PRN (As Needed)") {
      setStep(3); // Skip to step 3
    } else {
      setStep(2); // Go to time selection
    }
  };

  const handleSecondStep = async () => {
    const scheduleType = form.getValues("scheduleType");

    // PRN medications don't need time validation
    if (scheduleType !== "PRN (As Needed)") {
      const fieldsToValidate = ["times"] as const;
      // At least one time is required for non-PRN medications
      if (form.getValues("times")?.length === 0) {
        toast.error("Please add at least one time");
        return;
      }

      const isValid = await form.trigger(fieldsToValidate);

      if (!isValid) {
        toast.error("Please fill in all required fields correctly");
        return;
      }
    }

    setStep(step + 1);
  };

  const handleThirdStepValidation = async () => {
    const fieldsToValidate = ["startDate"] as const;

    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) {
      toast.error("Please fill in all required fields correctly");
      return false;
    }

    return true;
  };

  return (
    <div className="[&_label]:text-xs [&_label]:text-muted-foreground [&_input]:h-8 [&_.grid]:gap-3">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-base mb-1">Select Medication Type</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose the type of medication you want to add
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMedicationType("Scheduled");
                    form.setValue("scheduleType", "Scheduled");
                    setStep(1);
                  }}
                  className="p-3 border rounded-lg hover:border-primary hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="font-semibold text-sm mb-0.5">Scheduled</div>
                  <div className="text-xs text-muted-foreground">
                    Regular medications with set times
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMedicationType("PRN (As Needed)");
                    form.setValue("scheduleType", "PRN (As Needed)");
                    setStep(1);
                  }}
                  className="p-3 border rounded-lg hover:border-primary hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="font-semibold text-sm mb-0.5">PRN</div>
                  <div className="text-xs text-muted-foreground">
                    As needed medications
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMedicationType("Topical");
                    form.setValue("scheduleType", "Topical");
                    setStep(1);
                  }}
                  className="p-3 border rounded-lg hover:border-primary hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="font-semibold text-sm mb-0.5">Topical</div>
                  <div className="text-xs text-muted-foreground">
                    Creams, ointments, patches
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMedicationType("Supplement");
                    form.setValue("scheduleType", "Supplement");
                    setStep(1);
                  }}
                  className="p-3 border rounded-lg hover:border-primary hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="font-semibold text-sm mb-0.5">Supplement</div>
                  <div className="text-xs text-muted-foreground">
                    Vitamins and supplements
                  </div>
                </button>
              </div>
            </div>
          )}
          {step === 1 && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          medicationType === "Supplement"
                            ? "e.g., Vitamin D3, Omega-3, Calcium"
                            : "e.g., Paracetamol"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="strength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Strength</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={
                              medicationType === "Supplement"
                                ? "e.g., 1000, 10, 5"
                                : "100"
                            }
                            {...field}
                            className="pr-20 h-8"
                          />
                          <FormField
                            control={form.control}
                            name="strengthUnit"
                            render={({ field: unitField }) => (
                              <Select
                                onValueChange={unitField.onChange}
                                defaultValue={unitField.value}
                              >
                                <SelectTrigger className="absolute right-0 top-0 h-8 w-20 border-l border-l-border bg-muted/50 rounded-l-none text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mg">mg</SelectItem>
                                  <SelectItem value="mcg">mcg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="mL">mL</SelectItem>
                                  <SelectItem value="drops">drops</SelectItem>
                                  <SelectItem value="IU">IU</SelectItem>
                                  <SelectItem value="%">%</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </FormControl>
                      {medicationType === "Supplement" && (
                        <FormDescription className="text-xs">
                          Units: mg/mcg (tablets), mL (liquid), drops, IU (vitamins A/D/E)
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dosageForm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Dosage Form</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a dosage form" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {medicationType === "Topical" ? (
                            <>
                              <SelectItem value="Cream">Cream</SelectItem>
                              <SelectItem value="Ointment">Ointment</SelectItem>
                              <SelectItem value="Gel">Gel</SelectItem>
                              <SelectItem value="Lotion">Lotion</SelectItem>
                              <SelectItem value="Patch">Patch</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Tablet">Tablet</SelectItem>
                              <SelectItem value="Capsule">Capsule</SelectItem>
                              <SelectItem value="Softgel">Softgel</SelectItem>
                              <SelectItem value="Chewable Tablet">Chewable Tablet</SelectItem>
                              <SelectItem value="Gummy">Gummy</SelectItem>
                              <SelectItem value="Liquid">Liquid</SelectItem>
                              <SelectItem value="Syrup">Syrup</SelectItem>
                              <SelectItem value="Drops">Drops</SelectItem>
                              <SelectItem value="Powder">Powder</SelectItem>
                              <SelectItem value="Effervescent Tablet">Effervescent Tablet</SelectItem>
                              <SelectItem value="Spray">Spray</SelectItem>
                              <SelectItem value="Lozenge">Lozenge</SelectItem>
                              <SelectItem value="Injection">Injection</SelectItem>
                              <SelectItem value="Cream">Cream</SelectItem>
                              <SelectItem value="Ointment">Ointment</SelectItem>
                              <SelectItem value="Gel">Gel</SelectItem>
                              <SelectItem value="Patch">Patch</SelectItem>
                              <SelectItem value="Inhaler">Inhaler</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {medicationType === "Supplement" && (
                        <FormDescription className="text-xs">
                          Common forms: Tablets, Softgels, Drops (liquid), Gummies, Powder
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="route"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Route</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a route" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Oral">Oral</SelectItem>
                          <SelectItem value="Topical">Topical</SelectItem>
                          <SelectItem value="Intramuscular (IM)">
                            Intramuscular (IM)
                          </SelectItem>
                          <SelectItem value="Intravenous (IV)">
                            Intravenous (IV)
                          </SelectItem>
                          <SelectItem value="Subcutaneous">
                            Subcutaneous
                          </SelectItem>
                          <SelectItem value="Inhalation">Inhalation</SelectItem>
                          <SelectItem value="Rectal">Rectal</SelectItem>
                          <SelectItem value="Sublingual">Sublingual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalCount"
                  render={({ field }) => {
                    const dosageForm = form.watch("dosageForm")?.toLowerCase() || "";
                    const scheduleType = form.watch("scheduleType");
                    const frequencyValue = form.watch("frequency") || "";

                    // Determine unit and input type based on dosage form
                    let allowDecimals = false;
                    let step = "1";
                    let placeholder = "e.g., 30";
                    let unitLabel = "";
                    let description = "Total quantity in the package";

                    // Check PRN/Supplement dosage unit from frequency field
                    if (scheduleType === "PRN (As Needed)" || scheduleType === "Supplement") {
                      if (frequencyValue.includes('mL')) {
                        allowDecimals = true;
                        step = "0.1";
                        placeholder = "e.g., 100 or 250";
                        unitLabel = "mL";
                        description = "Total volume in the bottle";
                      } else if (frequencyValue.includes('Drops')) {
                        placeholder = "e.g., 50";
                        unitLabel = "drops";
                        description = "Total drops in the bottle";
                      } else if (frequencyValue.includes('Puffs')) {
                        placeholder = "e.g., 200";
                        unitLabel = "puffs";
                        description = "Total puffs in the inhaler";
                      } else if (frequencyValue.includes('Patches')) {
                        placeholder = "e.g., 10";
                        unitLabel = "patches";
                        description = "Total patches in the box";
                      } else if (frequencyValue.includes('Sachets')) {
                        placeholder = "e.g., 30";
                        unitLabel = "sachets";
                        description = "Total sachets in the box";
                      } else if (frequencyValue.includes('Injections')) {
                        allowDecimals = true;
                        step = "0.1";
                        placeholder = "e.g., 10";
                        unitLabel = "mL";
                        description = "Total volume in vial/ampoules";
                      } else if (frequencyValue.includes('Tablets')) {
                        placeholder = "e.g., 30";
                        unitLabel = "tablets";
                        description = "Total tablets in the package";
                      }
                    }
                    // Check scheduled medication dosage form
                    else {
                      // Check for topical medications (Cream, Ointment, Gel, Lotion)
                      if (dosageForm.includes('cream') || dosageForm.includes('ointment') ||
                          dosageForm.includes('gel') || dosageForm.includes('lotion')) {
                        placeholder = "e.g., 2 or 3";
                        unitLabel = "packs";
                        description = "Total packs in the box";
                      } else if (dosageForm.includes('liquid') || dosageForm.includes('syrup')) {
                        allowDecimals = true;
                        step = "0.1";
                        placeholder = "e.g., 100 or 250";
                        unitLabel = "mL";
                        description = "Total volume in the bottle";
                      } else if (dosageForm.includes('drops')) {
                        placeholder = "e.g., 50";
                        unitLabel = "drops/mL";
                        description = "Total drops or volume in the bottle";
                      } else if (dosageForm.includes('injection')) {
                        allowDecimals = true;
                        step = "0.1";
                        placeholder = "e.g., 10";
                        unitLabel = "mL";
                        description = "Total volume in vial/ampoules";
                      } else if (dosageForm.includes('inhaler')) {
                        placeholder = "e.g., 200";
                        unitLabel = "puffs";
                        description = "Total puffs in the inhaler";
                      } else if (dosageForm.includes('spray')) {
                        placeholder = "e.g., 120";
                        unitLabel = "sprays";
                        description = "Total sprays in the bottle";
                      } else if (dosageForm.includes('sachet') || dosageForm.includes('powder')) {
                        placeholder = "e.g., 30";
                        unitLabel = "sachets";
                        description = "Total sachets in the box";
                      } else if (dosageForm.includes('patch')) {
                        placeholder = "e.g., 10";
                        unitLabel = "patches";
                        description = "Total patches in the box";
                      } else if (dosageForm.includes('tablet')) {
                        placeholder = "e.g., 30";
                        unitLabel = "tablets";
                        description = "Total tablets in the package";
                      } else if (dosageForm.includes('capsule')) {
                        placeholder = "e.g., 60";
                        unitLabel = "capsules";
                        description = "Total capsules in the package";
                      } else if (dosageForm.includes('softgel')) {
                        placeholder = "e.g., 30";
                        unitLabel = "softgels";
                        description = "Total softgels in the package";
                      } else if (dosageForm.includes('gummy')) {
                        placeholder = "e.g., 60";
                        unitLabel = "gummies";
                        description = "Total gummies in the package";
                      }
                    }

                    return (
                      <FormItem>
                        <FormLabel>Total Count (Optional)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder={placeholder}
                              type="number"
                              min={allowDecimals ? "0.1" : "1"}
                              step={step}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (allowDecimals) {
                                  field.onChange(value ? parseFloat(value) : undefined);
                                } else {
                                  field.onChange(value ? parseInt(value) : undefined);
                                }
                              }}
                              value={field.value?.toString() || ""}
                              className="flex-1"
                            />
                            {unitLabel && (
                              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[60px]">
                                {unitLabel}
                              </span>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          {description}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              {/* Show selected medication type */}
              <div className="p-3 bg-primary/10 rounded-lg mb-4">
                <p className="text-sm font-medium">
                  Medication Type: <span className="text-primary">{medicationType}</span>
                </p>
              </div>

              {/* Show frequency field only for Scheduled and Topical medications */}
              {scheduleType !== "PRN (As Needed)" && scheduleType !== "Supplement" && (
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Once daily (OD)">
                            Once daily (OD)
                          </SelectItem>
                          <SelectItem value="Twice daily (BD)">
                            Twice daily (BD)
                          </SelectItem>
                          <SelectItem value="Three times daily (TD)">
                            Three times daily (TD)
                          </SelectItem>
                          <SelectItem value="Four times daily (QDS)">
                            Four times daily (QDS)
                          </SelectItem>
                          <SelectItem value="Four times daily (QIS)">
                            Four times daily (QIS)
                          </SelectItem>
                          <SelectItem value="One time (STAT)">
                            One time (STAT)
                          </SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* For PRN and Supplements, show dosage unit selector */}
              {(scheduleType === "PRN (As Needed)" || scheduleType === "Supplement") && (
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Default Dosage Unit</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select dosage unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Tablets/Capsules">Tablets/Capsules</SelectItem>
                          <SelectItem value="Drops">Drops</SelectItem>
                          <SelectItem value="mL (Milliliters)">mL (Milliliters)</SelectItem>
                          <SelectItem value="Puffs (Inhaler)">Puffs (Inhaler)</SelectItem>
                          <SelectItem value="Applications (Topical)">Applications (Topical)</SelectItem>
                          <SelectItem value="Sprays">Sprays</SelectItem>
                          <SelectItem value="Patches">Patches</SelectItem>
                          <SelectItem value="Sachets">Sachets</SelectItem>
                          <SelectItem value="Injections">Injections</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {scheduleType === "PRN (As Needed)"
                          ? "Select the unit type for PRN administration"
                          : "Select the unit type for supplement administration"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={handleFirstStep} size="sm" className="px-6">
                  Continue
                </Button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              {/* Skip time selection for PRN medications */}
              {scheduleType === "PRN (As Needed)" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">PRN Medication</p>
                    <p className="text-xs text-blue-700 mt-1">
                      PRN medications are administered as needed. No scheduled times required.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button type="button" onClick={handleSecondStep} size="sm" className="px-6">
                      Continue
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="times"
                    render={() => {
                      const frequency = form.watch("frequency");
                      const getMaxTimes = () => {
                        if (frequency?.includes("Once")) return 1;
                        if (frequency?.includes("Twice")) return 2;
                        if (frequency?.includes("Three")) return 3;
                        if (frequency?.includes("Four")) return 4;
                        return 99; // No limit for Supplements, Weekly, Monthly, etc.
                      };

                      const maxTimes = getMaxTimes();

                      return (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">
                              {scheduleType === "Supplement" ? "Supplement Times" : "Medication Times"}
                            </FormLabel>
                            <FormDescription>
                              {scheduleType === "Supplement"
                                ? "Select the times when this supplement should be taken."
                                : `Select the times when this medication should be administered. ${maxTimes < 99 ? `(Select up to ${maxTimes} time${maxTimes > 1 ? 's' : ''})` : ''}`
                              }
                            </FormDescription>
                          </div>
                        {config.times.map((timeGroup) => (
                          <div key={timeGroup.name} className="mb-6">
                            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                              {timeGroup.name}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              {timeGroup.values.map((time) => (
                                <FormField
                                  key={time}
                                  control={form.control}
                                  name="times"
                                  render={({ field }) => {
                                    const isSelected = field.value?.includes(time);
                                    const isDisabled = !isSelected && (field.value?.length || 0) >= maxTimes;
                                    const timeQuantities = form.watch("timeQuantities") || {};

                                    return (
                                      <FormItem key={time} className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              disabled={isDisabled}
                                              onClick={() => {
                                                const checked = !isSelected;
                                                if (checked) {
                                                  field.onChange([...(field.value || []), time]);
                                                  // Set default quantity to 1 when time is selected
                                                  form.setValue("timeQuantities", {
                                                    ...timeQuantities,
                                                    [time]: 1
                                                  });
                                                } else {
                                                  field.onChange(
                                                    field.value?.filter((value) => value !== time)
                                                  );
                                                  // Remove quantity when time is deselected
                                                  const newQuantities = { ...timeQuantities };
                                                  delete newQuantities[time];
                                                  form.setValue("timeQuantities", newQuantities);
                                                }
                                              }}
                                              className={cn(
                                                "flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors",
                                                "hover:bg-accent hover:text-accent-foreground",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background",
                                                isSelected
                                                  ? "bg-accent border-primary hover:bg-primary/10"
                                                  : "bg-background text-foreground border-input"
                                              )}
                                            >
                                              {time}
                                            </button>
                                            {isSelected && (() => {
                                              const dosageForm = form.watch("dosageForm")?.toLowerCase() || "";
                                              const scheduleType = form.watch("scheduleType");
                                              const frequencyValue = form.watch("frequency") || "";

                                              // Determine unit type and input configuration
                                              let allowDecimals = false;
                                              let step = "1";
                                              let placeholder = "Qty";
                                              let unitLabel = "";

                                              // Check PRN/Supplement dosage unit from frequency field
                                              if (scheduleType === "PRN (As Needed)" || scheduleType === "Supplement") {
                                                if (frequencyValue.includes('mL')) {
                                                  allowDecimals = true;
                                                  step = "0.1";
                                                  placeholder = "e.g., 5";
                                                  unitLabel = "mL";
                                                } else if (frequencyValue.includes('Drops')) {
                                                  allowDecimals = true;
                                                  step = "1";
                                                  placeholder = "e.g., 3";
                                                  unitLabel = "drops";
                                                } else if (frequencyValue.includes('Puffs')) {
                                                  placeholder = "e.g., 2";
                                                  unitLabel = "puffs";
                                                } else if (frequencyValue.includes('Applications')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "applications";
                                                } else if (frequencyValue.includes('Sprays')) {
                                                  placeholder = "e.g., 2";
                                                  unitLabel = "sprays";
                                                } else if (frequencyValue.includes('Patches')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "patches";
                                                } else if (frequencyValue.includes('Sachets')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "sachets";
                                                } else if (frequencyValue.includes('Injections')) {
                                                  allowDecimals = true;
                                                  step = "0.1";
                                                  placeholder = "e.g., 1.5";
                                                  unitLabel = "mL";
                                                } else if (frequencyValue.includes('Tablets')) {
                                                  placeholder = "e.g., 2";
                                                  unitLabel = "tablets";
                                                }
                                              }
                                              // Check scheduled medication dosage form
                                              else {
                                                if (dosageForm.includes('liquid') || dosageForm.includes('syrup')) {
                                                  allowDecimals = true;
                                                  step = "0.1";
                                                  placeholder = "e.g., 5";
                                                  unitLabel = "mL";
                                                } else if (dosageForm.includes('drops')) {
                                                  allowDecimals = true;
                                                  step = "1";
                                                  placeholder = "e.g., 3";
                                                  unitLabel = "drops";
                                                } else if (dosageForm.includes('injection')) {
                                                  allowDecimals = true;
                                                  step = "0.1";
                                                  placeholder = "e.g., 1.5";
                                                  unitLabel = "mL";
                                                } else if (dosageForm.includes('inhaler') || dosageForm.includes('spray')) {
                                                  placeholder = "e.g., 2";
                                                  unitLabel = "puffs";
                                                } else if (dosageForm.includes('sachet') || dosageForm.includes('powder')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "sachets";
                                                } else if (dosageForm.includes('patch')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "patches";
                                                } else if (dosageForm.includes('tablet')) {
                                                  placeholder = "e.g., 2";
                                                  unitLabel = "tablets";
                                                } else if (dosageForm.includes('capsule')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "capsules";
                                                } else if (dosageForm.includes('softgel')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "softgels";
                                                } else if (dosageForm.includes('gummy')) {
                                                  placeholder = "e.g., 2";
                                                  unitLabel = "gummies";
                                                } else if (dosageForm.includes('cream') || dosageForm.includes('ointment') || dosageForm.includes('gel')) {
                                                  placeholder = "e.g., 1";
                                                  unitLabel = "applications";
                                                }
                                              }

                                              return (
                                                <div className="flex items-center gap-2">
                                                  <Input
                                                    type="number"
                                                    min={allowDecimals ? "0.1" : "1"}
                                                    step={step}
                                                    placeholder={placeholder}
                                                    className="w-24"
                                                    value={timeQuantities[time] || 1}
                                                    onChange={(e) => {
                                                      const qty = allowDecimals ?
                                                        parseFloat(e.target.value) || 1 :
                                                        parseInt(e.target.value) || 1;
                                                      form.setValue("timeQuantities", {
                                                        ...timeQuantities,
                                                        [time]: qty
                                                      });
                                                    }}
                                                  />
                                                  {unitLabel && (
                                                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[60px]">
                                                      {unitLabel}
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <div className="flex justify-between items-center">
                    <Button
                      type="button"
                      onClick={() => setStep(0)}
                      variant="ghost"
                      size="sm"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSecondStep}
                      disabled={isLoading}
                      size="sm"
                      className="px-6"
                    >
                      Continue
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          {step === 3 && scheduleType === "Topical" && (
            <>
              <FormField
                control={form.control}
                name="bodyRegions"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Application Sites</FormLabel>
                      <FormDescription>
                        Select the body regions where this topical medication should be applied
                      </FormDescription>
                    </div>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="relative">
                          <InteractiveBodyMap
                            entries={(field.value || []).map((regionId: string) => {
                              const region = BODY_REGIONS.find(r => r.region_id === regionId);
                              return {
                                id: regionId,
                                region_id: regionId,
                                region_name: region?.region_name || regionId,
                                condition_type: "other" as const,
                                severity: 1,
                                notes: "Application site",
                                date_time: new Date().toISOString(),
                                status: "active" as const
                              };
                            })}
                            onRegionClick={(region: BodyRegion) => {
                              const currentRegions = field.value || [];
                              const isSelected = currentRegions.includes(region.region_id);

                              if (isSelected) {
                                // Remove region
                                field.onChange(currentRegions.filter((id: string) => id !== region.region_id));
                              } else {
                                // Add region
                                field.onChange([...currentRegions, region.region_id]);
                              }
                            }}
                            selectedRegionId={null}
                            viewMode={false}
                          />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border">
                          <p className="text-sm font-medium mb-2">Selected Application Sites:</p>
                          {field.value && field.value.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {field.value.map((regionId: string) => {
                                const region = BODY_REGIONS.find(r => r.region_id === regionId);
                                return (
                                  <span
                                    key={regionId}
                                    className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-md border border-purple-200"
                                  >
                                    {region?.region_name || regionId}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No sites selected. Click on the body map to select application sites.
                            </p>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    // Validate body regions
                    const bodyRegions = form.getValues("bodyRegions");
                    if (!bodyRegions || bodyRegions.length === 0) {
                      form.setError("bodyRegions", {
                        type: "manual",
                        message: "Please select at least one application site"
                      });
                      return;
                    }
                    setStep(4); // Go to final step
                  }}
                  disabled={isLoading}
                >
                  Continue
                </Button>
              </div>
            </>
          )}
          {((step === 4) || (step === 3 && scheduleType !== "Topical")) && (
            <>
              <FormField
                control={form.control}
                name="prescriberName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescriber Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. John Doe" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Defaults to resident's GP if available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes on the medication for the patient"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>Start date</FormLabel>
                      <Popover
                        open={startDatePopoverOpen}
                        onOpenChange={setStartDatePopoverOpen}
                        modal
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              onClick={() => setStartDatePopoverOpen((v) => !v)}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) field.onChange(date);
                              setStartDatePopoverOpen(false);
                            }}
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  onClick={() => {
                    // Go back to appropriate previous step
                    const scheduleType = form.getValues("scheduleType");
                    if (scheduleType === "PRN (As Needed)") {
                      setStep(1);
                    } else if (scheduleType === "Topical") {
                      setStep(3); // Go back to body map selection
                    } else {
                      setStep(2); // Go back to time selection
                    }
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} size="sm" className="px-6">
                  {isLoading ? "Creating..." : "Create Medication"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}
