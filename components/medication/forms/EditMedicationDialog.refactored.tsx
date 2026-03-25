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
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  medication: Medication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ✅ PERFORMANCE FIX #1: Extract unit calculation logic into pure function
function getUnitConfig(dosageForm: string, scheduleType: string, frequencyValue: string) {
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
  } else {
    // Check scheduled medication dosage form
    const lowerForm = dosageForm.toLowerCase();
    if (lowerForm.includes('liquid') || lowerForm.includes('syrup')) {
      allowDecimals = true;
      step = "0.1";
      placeholder = "e.g., 100 or 250";
      unitLabel = "mL";
      description = "Total volume in the bottle";
    } else if (lowerForm.includes('drops')) {
      placeholder = "e.g., 50";
      unitLabel = "drops/mL";
      description = "Total drops or volume in the bottle";
    } else if (lowerForm.includes('injection')) {
      allowDecimals = true;
      step = "0.1";
      placeholder = "e.g., 10";
      unitLabel = "mL";
      description = "Total volume in vial/ampoules";
    } else if (lowerForm.includes('inhaler')) {
      placeholder = "e.g., 200";
      unitLabel = "puffs";
      description = "Total puffs in the inhaler";
    } else if (lowerForm.includes('spray')) {
      placeholder = "e.g., 120";
      unitLabel = "sprays";
      description = "Total sprays in the bottle";
    } else if (lowerForm.includes('sachet') || lowerForm.includes('powder')) {
      placeholder = "e.g., 30";
      unitLabel = "sachets";
      description = "Total sachets in the box";
    } else if (lowerForm.includes('patch')) {
      placeholder = "e.g., 10";
      unitLabel = "patches";
      description = "Total patches in the box";
    } else if (lowerForm.includes('tablet')) {
      placeholder = "e.g., 30";
      unitLabel = "tablets";
      description = "Total tablets in the package";
    } else if (lowerForm.includes('capsule')) {
      placeholder = "e.g., 60";
      unitLabel = "capsules";
      description = "Total capsules in the package";
    } else if (lowerForm.includes('softgel')) {
      placeholder = "e.g., 30";
      unitLabel = "softgels";
      description = "Total softgels in the package";
    } else if (lowerForm.includes('gummy')) {
      placeholder = "e.g., 60";
      unitLabel = "gummies";
      description = "Total gummies in the package";
    }
  }

  return { allowDecimals, step, placeholder, unitLabel, description };
}

// ✅ PERFORMANCE FIX #2: Memoized TotalCount Field Component
const TotalCountField = memo(({ control }: { control: any }) => {
  // Use useWatch instead of form.watch() for better performance
  const dosageForm = useWatch({ control, name: "dosageForm" }) || "";
  const scheduleType = useWatch({ control, name: "scheduleType" }) || "";
  const frequencyValue = useWatch({ control, name: "frequency" }) || "";

  // Memoize unit configuration
  const unitConfig = useMemo(
    () => getUnitConfig(dosageForm, scheduleType, frequencyValue),
    [dosageForm, scheduleType, frequencyValue]
  );

  return (
    <FormField
      control={control}
      name="totalCount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Total Count (Optional)</FormLabel>
          <FormControl>
            <div className="flex items-center gap-2">
              <Input
                placeholder={unitConfig.placeholder}
                type="number"
                min={unitConfig.allowDecimals ? "0.1" : "1"}
                step={unitConfig.step}
                onChange={(e) => {
                  const value = e.target.value;
                  if (unitConfig.allowDecimals) {
                    field.onChange(value ? parseFloat(value) : undefined);
                  } else {
                    field.onChange(value ? parseInt(value) : undefined);
                  }
                }}
                value={field.value?.toString() || ""}
                className="flex-1"
              />
              {unitConfig.unitLabel && (
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[60px]">
                  {unitConfig.unitLabel}
                </span>
              )}
            </div>
          </FormControl>
          <FormDescription className="text-xs">
            {unitConfig.description}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});
TotalCountField.displayName = "TotalCountField";

// ✅ PERFORMANCE FIX #3: Memoized Time Selection Item
const TimeSelectionItem = memo(({
  time,
  control,
  isSelected,
  isDisabled,
  onToggle
}: {
  time: string;
  control: any;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (time: string, checked: boolean) => void;
}) => {
  const dosageForm = useWatch({ control, name: "dosageForm" }) || "";
  const scheduleType = useWatch({ control, name: "scheduleType" }) || "";
  const frequencyValue = useWatch({ control, name: "frequency" }) || "";
  const timeQuantities = useWatch({ control, name: "timeQuantities" }) || {};

  // Memoize time-specific unit config
  const timeUnitConfig = useMemo(() => {
    let allowDecimals = false;
    let step = "1";
    let placeholder = "Qty";
    let unitLabel = "";

    const lowerForm = dosageForm.toLowerCase();

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
    } else {
      // For scheduled/topical medications, determine from dosage form
      if (lowerForm.includes('liquid') || lowerForm.includes('syrup')) {
        allowDecimals = true;
        step = "0.1";
        placeholder = "e.g., 5";
        unitLabel = "mL";
      } else if (lowerForm.includes('drops')) {
        allowDecimals = true;
        step = "1";
        placeholder = "e.g., 3";
        unitLabel = "drops";
      } else if (lowerForm.includes('injection')) {
        allowDecimals = true;
        step = "0.1";
        placeholder = "e.g., 1.5";
        unitLabel = "mL";
      } else if (lowerForm.includes('inhaler') || lowerForm.includes('spray')) {
        placeholder = "e.g., 2";
        unitLabel = "puffs";
      } else if (lowerForm.includes('sachet') || lowerForm.includes('powder')) {
        placeholder = "e.g., 1";
        unitLabel = "sachets";
      } else if (lowerForm.includes('patch')) {
        placeholder = "e.g., 1";
        unitLabel = "patches";
      } else if (lowerForm.includes('tablet')) {
        placeholder = "e.g., 2";
        unitLabel = "tablets";
      } else if (lowerForm.includes('capsule')) {
        placeholder = "e.g., 1";
        unitLabel = "capsules";
      } else if (lowerForm.includes('softgel')) {
        placeholder = "e.g., 1";
        unitLabel = "softgels";
      } else if (lowerForm.includes('gummy')) {
        placeholder = "e.g., 2";
        unitLabel = "gummies";
      } else if (lowerForm.includes('cream') || lowerForm.includes('ointment') || lowerForm.includes('gel')) {
        placeholder = "e.g., 1";
        unitLabel = "applications";
      }
    }

    return { allowDecimals, step, placeholder, unitLabel };
  }, [dosageForm, scheduleType, frequencyValue]);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, setValue: any, timeQuantities: any) => {
    const qty = timeUnitConfig.allowDecimals
      ? parseFloat(e.target.value) || 1
      : parseInt(e.target.value) || 1;
    setValue("timeQuantities", {
      ...timeQuantities,
      [time]: qty
    });
  }, [time, timeUnitConfig.allowDecimals]);

  return (
    <FormField
      control={control}
      name="times"
      render={({ field }) => (
        <FormItem className="space-y-0">
          <FormControl>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onToggle(time, !isSelected)}
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
              {isSelected && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={timeUnitConfig.allowDecimals ? "0.1" : "1"}
                    step={timeUnitConfig.step}
                    placeholder={timeUnitConfig.placeholder}
                    className="w-24"
                    value={timeQuantities[time] || 1}
                    onChange={(e) => handleQuantityChange(e, field.onChange, timeQuantities)}
                  />
                  {timeUnitConfig.unitLabel && (
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[60px]">
                      {timeUnitConfig.unitLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
});
TimeSelectionItem.displayName = "TimeSelectionItem";

// ✅ PERFORMANCE FIX #4: Memoized Time Selection Section
const TimesSelectionField = memo(({ control, setValue }: { control: any; setValue: any }) => {
  const scheduleType = useWatch({ control, name: "scheduleType" });
  const frequency = useWatch({ control, name: "frequency" });
  const selectedTimes = useWatch({ control, name: "times" }) || [];
  const timeQuantities = useWatch({ control, name: "timeQuantities" }) || {};

  // Hide time selection for PRN medications
  if (scheduleType === "PRN (As Needed)") {
    return null;
  }

  const getMaxTimes = useCallback(() => {
    if (frequency?.includes("Once")) return 1;
    if (frequency?.includes("Twice")) return 2;
    if (frequency?.includes("Three")) return 3;
    if (frequency?.includes("Four")) return 4;
    return 99; // No limit for Supplements, Weekly, Monthly, etc.
  }, [frequency]);

  const maxTimes = getMaxTimes();

  const handleTimeToggle = useCallback((time: string, checked: boolean) => {
    if (checked) {
      setValue("times", [...selectedTimes, time]);
      setValue("timeQuantities", {
        ...timeQuantities,
        [time]: 1
      });
    } else {
      setValue("times", selectedTimes.filter((t: string) => t !== time));
      const newQuantities = { ...timeQuantities };
      delete newQuantities[time];
      setValue("timeQuantities", newQuantities);
    }
  }, [selectedTimes, timeQuantities, setValue]);

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
            {timeGroup.values.map((time) => {
              const isSelected = selectedTimes.includes(time);
              const isDisabled = !isSelected && selectedTimes.length >= maxTimes;

              return (
                <TimeSelectionItem
                  key={time}
                  time={time}
                  control={control}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  onToggle={handleTimeToggle}
                />
              );
            })}
          </div>
        </div>
      ))}
      <FormMessage />
    </FormItem>
  );
});
TimesSelectionField.displayName = "TimesSelectionField";

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

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (open && medication) {
      // Dialog opening - populate form with medication data
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
    } else if (!open) {
      // Dialog closing - reset form to default empty state
      form.reset();
      setIsLoading(false);
      setStartDatePopoverOpen(false);
    }
  }, [open, medication?.id, form]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    // Prevent closing while loading
    if (!newOpen && isLoading) {
      return;
    }

    onOpenChange(newOpen);
  }, [isLoading, onOpenChange]);

  const onSubmit = useCallback(async (values: z.infer<typeof UpdateMedicationSchema>) => {
    // Prevent double submission or null medication
    if (isLoading || !medication) return;

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

      // If times were changed, delete existing 'scheduled' intakes for today (UK time)
      if (values.times !== undefined) {
        const { fromZonedTime } = await import("date-fns-tz");
        const UK_TIMEZONE = "Europe/London";
        const ukNow = new Date().toLocaleDateString("en-CA", { timeZone: UK_TIMEZONE });
        const startOfDay = fromZonedTime(`${ukNow}T00:00:00`, UK_TIMEZONE).toISOString();

        await supabase
          .from("medication_intakes")
          .delete()
          .eq("medication_id", medication.id)
          .in("status", ["scheduled", "pending"])
          .gte("scheduled_time", startOfDay);
      }

      toast.success("Medication updated successfully");
      handleOpenChange(false);

      if (onSuccess) {
        onSuccess();
      } else {
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
  }, [isLoading, medication, handleOpenChange, onSuccess]);

  // Guard: Don't render if no medication
  if (!medication) return null;

  // ✅ PERFORMANCE FIX #5: Only render dialog when open
  if (!open) return null;

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

              <TotalCountField control={form.control} />
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

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => {
                const scheduleType = useWatch({ control: form.control, name: "scheduleType" });
                const isPRNOrSupplement = scheduleType === "PRN (As Needed)" || scheduleType === "Supplement";

                if (!isPRNOrSupplement) {
                  return (
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
                          <SelectItem value="Once daily (OD)">Once daily (OD)</SelectItem>
                          <SelectItem value="Twice daily (BD)">Twice daily (BD)</SelectItem>
                          <SelectItem value="Three times daily (TD)">Three times daily (TD)</SelectItem>
                          <SelectItem value="Four times daily (QDS)">Four times daily (QDS)</SelectItem>
                          <SelectItem value="Four times daily (QIS)">Four times daily (QIS)</SelectItem>
                          <SelectItem value="One time (STAT)">One time (STAT)</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }

                return (
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
                );
              }}
            />

            <TimesSelectionField control={form.control} setValue={form.setValue} />

            <FormField
              control={form.control}
              name="prescriberName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescriber Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Smith" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Defaults to resident&apos;s GP if available
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

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
