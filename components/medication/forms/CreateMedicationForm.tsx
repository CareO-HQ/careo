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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { CreateMedicationSchema } from "@/schemas/medication/CreateMedicationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export default function CreateMedicationForm({
  residentId,
  teamId,
  organizationId,
  onSuccess
}: {
  residentId: Id<"residents">;
  teamId?: string;
  organizationId?: string;
  onSuccess: () => void;
}) {
  const createMedication = useMutation(api.medication.createMedication);
  const [isLoading, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
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
      scheduleType: undefined,
      times: [],
      timeQuantities: {},
      instructions: undefined,
      prescriberName: "",
      startDate: new Date(),
      endDate: undefined,
      status: "active",
      isControlledDrug: false,
      controlledDrugSchedule: undefined,
      minIntervalHours: undefined,
      maxDailyDose: undefined,
      maxDailyDoseUnit: undefined
    }
  });

  async function onSubmit(values: z.infer<typeof CreateMedicationSchema>) {
    console.log("Form submitted with values:", values);

    // Validate step 3 fields before submitting
    const isValid = await handleThirdStepValidation();
    if (!isValid) {
      return;
    }

    startTransition(async () => {
      try {
        console.log("Creating medication with:", {
          residentId,
          teamId,
          organizationId,
          medication: values
        });

        const medicationId = await createMedication({
          residentId,
          teamId,
          organizationId,
          medication: {
            ...values,
            prescriberName: values.prescriberName,
            startDate: new Date(
              values.startDate.getFullYear(),
              values.startDate.getMonth(),
              values.startDate.getDate(),
              12,
              0,
              0,
              0
            ).getTime(),
            endDate: values.endDate
              ? new Date(
                  values.endDate.getFullYear(),
                  values.endDate.getMonth(),
                  values.endDate.getDate(),
                  12,
                  0,
                  0,
                  0
                ).getTime()
              : undefined
          }
        });

        console.log("Medication created successfully with ID:", medicationId);

        if (medicationId) {
          toast.success("Medication created successfully");
          onSuccess();
        }
      } catch (error) {
        console.error("Error creating medication:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast.error(`Failed to create medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  const handleFirstStep = async () => {
    const fieldsToValidate = [
      "name",
      "strength",
      "strengthUnit",
      "totalCount",
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
    const fieldsToValidate = ["times"] as const;
    // At least one time is required
    if (form.getValues("times").length === 0) {
      toast.error("Please add at least one time");
      return;
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setStep(step + 1);
  };

  const handleThirdStepValidation = async () => {
    const fieldsToValidate = ["prescriberName", "startDate"] as const;

    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) {
      toast.error("Please fill in all required fields correctly");
      return false;
    }

    return true;
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {step === 1 && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Paracetamol" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="strength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Strength</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="100"
                            {...field}
                            className="pr-16"
                          />
                          <FormField
                            control={form.control}
                            name="strengthUnit"
                            render={({ field: unitField }) => (
                              <Select
                                onValueChange={unitField.onChange}
                                defaultValue={unitField.value}
                              >
                                <SelectTrigger className="absolute right-0 top-0 h-full w-18 border-l border-l-border bg-muted/50 rounded-l-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mg">mg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Total Count</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="100"
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          value={field.value?.toString() || ""}
                        />
                      </FormControl>
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
                          <SelectItem value="Tablet">Tablet</SelectItem>
                          <SelectItem value="Capsule">Capsule</SelectItem>
                          <SelectItem value="Liquid">Liquid</SelectItem>
                          <SelectItem value="Injection">Injection</SelectItem>
                          <SelectItem value="Cream">Cream</SelectItem>
                          <SelectItem value="Ointment">Ointment</SelectItem>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="As Needed (PRN)">
                            As Needed (PRN)
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
                <FormField
                  control={form.control}
                  name="scheduleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Schedule Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a schedule type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="PRN (As Needed)">
                            PRN (As Needed)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={handleFirstStep}>
                  Continue
                </Button>
              </div>
            </>
          )}
          {step === 2 && (
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
                    return 99; // No limit for PRN, Weekly, Monthly, etc.
                  };

                  const maxTimes = getMaxTimes();

                  return (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">
                          Medication Times
                        </FormLabel>
                        <FormDescription>
                          Select the times when this medication should be
                          administered. {maxTimes < 99 && `(Select up to ${maxTimes} time${maxTimes > 1 ? 's' : ''})`}
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
                                  const isDisabled = !isSelected && field.value?.length >= maxTimes;
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
                                                field.onChange([...field.value, time]);
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
                                          {isSelected && (
                                            <Input
                                              type="number"
                                              min="1"
                                              placeholder="Qty"
                                              className="w-20"
                                              value={timeQuantities[time] || 1}
                                              onChange={(e) => {
                                                const qty = parseInt(e.target.value) || 1;
                                                form.setValue("timeQuantities", {
                                                  ...timeQuantities,
                                                  [time]: qty
                                                });
                                              }}
                                            />
                                          )}
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
                  onClick={() => setStep(1)}
                  variant="outline"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSecondStep}
                  disabled={isLoading}
                >
                  Continue
                </Button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <FormField
                control={form.control}
                name="prescriberName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Prescriber Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. John Doe" {...field} />
                    </FormControl>
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
              <div className="grid grid-cols-2 gap-4 items-end">
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
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End date</FormLabel>
                      <Popover
                        open={endDatePopoverOpen}
                        onOpenChange={setEndDatePopoverOpen}
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
                              onClick={() => setEndDatePopoverOpen((v) => !v)}
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
                              setEndDatePopoverOpen(false);
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
                  onClick={() => setStep(2)}
                  variant="outline"
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading}>
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
