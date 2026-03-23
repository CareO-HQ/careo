"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const UpdateMedicationSchema = z.object({
  name: z.string().optional(),
  strength: z.string().optional(),
  strengthUnit: z.enum(["mg", "mcg", "g", "mL", "drops", "IU", "%"]).optional(),
  totalCount: z.number().positive().optional(),
  dosageForm: z
    .enum([
      "Tablet",
      "Capsule",
      "Softgel",
      "Chewable Tablet",
      "Gummy",
      "Liquid",
      "Syrup",
      "Drops",
      "Powder",
      "Effervescent Tablet",
      "Spray",
      "Lozenge",
      "Injection",
      "Cream",
      "Ointment",
      "Gel",
      "Patch",
      "Inhaler"
    ])
    .optional(),
  route: z
    .enum([
      "Oral",
      "Topical",
      "Intramuscular (IM)",
      "Intravenous (IV)",
      "Subcutaneous",
      "Inhalation",
      "Rectal",
      "Sublingual"
    ])
    .optional(),
  frequency: z.string().optional(),
  scheduleType: z.enum(["Scheduled", "PRN (As Needed)", "Topical", "Supplement"]).optional(),
  times: z.array(z.string()).optional(),
  timeQuantities: z.record(z.number()).optional(),
  instructions: z.string().optional(),
  prescriberName: z.string().optional(),
  startDate: z.date().optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional()
});

interface Medication {
  id: string;
  created_at: string;
  name: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  route: string;
  frequency: string;
  schedule_type: string;
  times: string[];
  time_quantities: Record<string, number> | null;
  instructions?: string;
  prescriber_name: string;
  start_date: string;
  end_date?: string;
  status: string;
  total_count: number;
}

interface EditMedicationDialogProps {
  medication: Medication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditMedicationDialog({
  medication,
  open,
  onOpenChange,
  onSuccess
}: EditMedicationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof UpdateMedicationSchema>>({
    resolver: zodResolver(UpdateMedicationSchema),
    mode: "onBlur",
  });

  // Reset form when dialog opens - only depend on `open` and medication.id to prevent loops
  useEffect(() => {
    if (open && medication) {
      form.reset({
        name: medication.name,
        strength: medication.strength,
        strengthUnit: medication.strength_unit as any,
        totalCount: medication.total_count,
        dosageForm: medication.dosage_form as any,
        route: medication.route as any,
        frequency: medication.frequency as any,
        scheduleType: medication.schedule_type as any,
        times: medication.times || [],
        timeQuantities: medication.time_quantities || {},
        instructions: medication.instructions || undefined,
        prescriberName: medication.prescriber_name,
        startDate: medication.start_date ? new Date(medication.start_date) : new Date(),
        status: medication.status as "active" | "completed" | "cancelled"
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medication?.id]); // Only re-run when dialog opens or medication ID changes

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing while loading
    if (!newOpen && isLoading) {
      return;
    }

    if (!newOpen) {
      // Clean up all state when closing
      setIsLoading(false);
      setStartDatePopoverOpen(false);

      // Defer form reset to avoid re-render during close animation
      setTimeout(() => {
        form.reset();
      }, 100);
    }

    onOpenChange(newOpen);
  };

  async function onSubmit(values: z.infer<typeof UpdateMedicationSchema>) {
    // Prevent double submission
    if (isLoading) return;

    setIsLoading(true);
    try {
      const updates: Record<string, any> = {};

      // Only include changed fields and map to snake_case
      if (values.name !== undefined) updates.name = values.name;
      if (values.strength !== undefined) updates.strength = values.strength;
      if (values.strengthUnit !== undefined) updates.strength_unit = values.strengthUnit;
      if (values.totalCount !== undefined) updates.total_count = values.totalCount;
      if (values.dosageForm !== undefined) updates.dosage_form = values.dosageForm;
      if (values.route !== undefined) updates.route = values.route;
      if (values.frequency !== undefined) updates.frequency = values.frequency;
      if (values.scheduleType !== undefined) updates.schedule_type = values.scheduleType;
      if (values.times !== undefined) updates.times = values.times;
      if (values.timeQuantities !== undefined) updates.time_quantities = values.timeQuantities;
      if (values.instructions !== undefined) updates.instructions = values.instructions;
      if (values.prescriberName !== undefined) updates.prescriber_name = values.prescriberName;
      if (values.startDate !== undefined) updates.start_date = values.startDate.toISOString();
      if (values.status !== undefined) updates.status = values.status;

      const { error } = await supabase
        .from("medications")
        .update(updates)
        .eq("id", medication.id);

      if (error) throw error;

      // Issue 4: If times were changed, delete existing 'scheduled' intakes for today (UK time)
      // so they get regenerated with the new times
      if (values.times !== undefined) {
        const { fromZonedTime } = await import("date-fns-tz");
        const UK_TIMEZONE = "Europe/London";
        // Get today's date in UK timezone
        const ukNow = new Date().toLocaleDateString("en-CA", { timeZone: UK_TIMEZONE }); // "YYYY-MM-DD"
        const startOfDay = fromZonedTime(`${ukNow}T00:00:00`, UK_TIMEZONE).toISOString();
        const endOfDay = fromZonedTime(`${ukNow}T23:59:59.999`, UK_TIMEZONE).toISOString();

        console.log("DEBUG: Deleting intakes for:", {
          medicationId: medication.id,
          ukNow,
          startOfDay,
          endOfDay
        });

        const { data: foundIntakes } = await supabase
          .from("medication_intakes")
          .select("id, scheduled_time, status")
          .eq("medication_id", medication.id)
          .in("status", ["scheduled", "pending"])
          .gte("scheduled_time", startOfDay);

        console.log("DEBUG: Found intakes to delete:", foundIntakes);

        const { error: deleteError } = await supabase
          .from("medication_intakes")
          .delete()
          .eq("medication_id", medication.id)
          .in("status", ["scheduled", "pending"])
          .gte("scheduled_time", startOfDay);

        if (deleteError) {
          console.error("DEBUG: Delete failed:", deleteError);
          toast.error("Failed to cleanup old scheduled intakes. You may see duplicates.");
        } else {
          console.log("DEBUG: Delete successful");
        }
      }

      toast.success("Medication updated successfully");
      handleOpenChange(false);

      // Call onSuccess callback if provided, otherwise reload the page
      if (onSuccess) {
        onSuccess();
      } else {
        // Force a page reload to regenerate intakes with new times
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating medication:", error);
      toast.error(
        `Failed to update medication: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Medication</DialogTitle>
          <DialogDescription>
            Update medication details for {medication.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medication Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Aspirin" {...field} />
                    </FormControl>
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
                    if (dosageForm.includes('liquid') || dosageForm.includes('syrup')) {
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="strength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strength</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strengthUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dosageForm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage Form</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select form" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="route"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select route" />
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
            </div>

            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="PRN (As Needed)">
                        PRN (As Needed)
                      </SelectItem>
                      <SelectItem value="Topical">Topical</SelectItem>
                      <SelectItem value="Supplement">Supplement</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show frequency field only for Scheduled and Topical medications */}
            {form.watch("scheduleType") !== "PRN (As Needed)" && form.watch("scheduleType") !== "Supplement" && (
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
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
            {(form.watch("scheduleType") === "PRN (As Needed)" || form.watch("scheduleType") === "Supplement") && (
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Dosage Unit</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                        <SelectItem value="Injections">Injections</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {form.watch("scheduleType") === "PRN (As Needed)"
                        ? "Select the unit type for PRN administration"
                        : "Select the unit type for supplement administration"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Medication Times Selection with Quantities */}
            <FormField
              control={form.control}
              name="times"
              render={() => {
                const scheduleType = form.watch("scheduleType");
                const frequency = form.watch("frequency");

                // Hide time selection for PRN medications
                if (scheduleType === "PRN (As Needed)") {
                  return <></>;
                }

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
                        <div className="grid grid-cols-1 gap-3">
                          {timeGroup.values.map((time) => (
                            <FormField
                              key={time}
                              control={form.control}
                              name="times"
                              render={({ field }) => {
                                const isSelected = field.value?.includes(time);
                                const isDisabled = !isSelected && (field.value?.length ?? 0) >= maxTimes;
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
                                                field.value?.filter((value) => value !== time) || []
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
                                          const frequencyValue = form.watch("frequency") || "";

                                          // Determine unit type and input configuration
                                          let allowDecimals = false;
                                          let step = "1";
                                          let placeholder = "Qty";
                                          let unitLabel = "";

                                          // For supplements, use the frequency field which stores dosage unit
                                          if (scheduleType === "Supplement") {
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
                                            } else if (frequencyValue.includes('Injections')) {
                                              allowDecimals = true;
                                              step = "0.1";
                                              placeholder = "e.g., 1.5";
                                              unitLabel = "mL";
                                            } else if (frequencyValue.includes('Tablets')) {
                                              placeholder = "e.g., 2";
                                              unitLabel = "tablets";
                                            }
                                          } else {
                                            // For scheduled/topical medications, determine from dosage form
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

            <FormField
              control={form.control}
              name="prescriberName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescriber Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover
                      open={startDatePopoverOpen}
                      onOpenChange={setStartDatePopoverOpen}
                      modal={true}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
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
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setStartDatePopoverOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional instructions..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Medication"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
