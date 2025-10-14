"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { residentValuablesSchema } from "@/schemas/residents/care-file/residentValuablesSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface ResidentValuablesProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function ResidentValuables({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: ResidentValuablesProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();

  const submitValuables = useMutation(
    api.careFiles.residentValuables.submitResidentValuables
  );
  const updateValuables = useMutation(
    api.careFiles.residentValuables.updateResidentValuables
  );

  const form = useForm<z.infer<typeof residentValuablesSchema>>({
    resolver: zodResolver(residentValuablesSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          residentName: initialData.residentName ?? "",
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          date: initialData.date ?? Date.now(),
          completedBy: initialData.completedBy ?? "",
          witnessedBy: initialData.witnessedBy ?? "",
          valuables: initialData.valuables ?? [],
          n50: initialData.n50 ?? undefined,
          n20: initialData.n20 ?? undefined,
          n10: initialData.n10 ?? undefined,
          n5: initialData.n5 ?? undefined,
          n2: initialData.n2 ?? undefined,
          n1: initialData.n1 ?? undefined,
          p50: initialData.p50 ?? undefined,
          p20: initialData.p20 ?? undefined,
          p10: initialData.p10 ?? undefined,
          p5: initialData.p5 ?? undefined,
          p2: initialData.p2 ?? undefined,
          p1: initialData.p1 ?? undefined,
          total: initialData.total ?? 0,
          clothing: initialData.clothing ?? [],
          other: initialData.other ?? []
        }
      : {
          // Default values for new forms
          residentName: "",
          bedroomNumber: resident.roomNumber ?? "",
          date: Date.now(),
          completedBy: "",
          witnessedBy: "",
          valuables: [],
          n50: undefined,
          n20: undefined,
          n10: undefined,
          n5: undefined,
          n2: undefined,
          n1: undefined,
          p50: undefined,
          p20: undefined,
          p10: undefined,
          p5: undefined,
          p2: undefined,
          p1: undefined,
          total: 0,
          clothing: [],
          other: []
        }
  });

  // Field arrays for dynamic lists
  const {
    fields: valuablesFields,
    append: appendValuable,
    remove: removeValuable
  } = useFieldArray({
    control: form.control,
    name: "valuables" as const
  });

  const {
    fields: clothingFields,
    append: appendClothing,
    remove: removeClothing
  } = useFieldArray({
    control: form.control,
    name: "clothing" as const
  });

  const {
    fields: otherFields,
    append: appendOther,
    remove: removeOther
  } = useFieldArray({
    control: form.control,
    name: "other" as const
  });

  const totalSteps = 4;

  const calculateTotal = () => {
    const values = form.getValues();
    const pounds =
      (values.n50 || 0) * 50 +
      (values.n20 || 0) * 20 +
      (values.n10 || 0) * 10 +
      (values.n5 || 0) * 5 +
      (values.n2 || 0) * 2 +
      (values.n1 || 0) * 1;

    const pence =
      (values.p50 || 0) * 0.5 +
      (values.p20 || 0) * 0.2 +
      (values.p10 || 0) * 0.1 +
      (values.p5 || 0) * 0.05 +
      (values.p2 || 0) * 0.02 +
      (values.p1 || 0) * 0.01;

    const total = pounds + pence;
    form.setValue("total", parseFloat(total.toFixed(2)));
    return total;
  };

  const handleNext = async () => {
    let isValid = false;

    if (step === 1) {
      const fieldsToValidate = [
        "residentName",
        "bedroomNumber",
        "date",
        "completedBy",
        "witnessedBy"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      // Valuables step - no required fields
      isValid = true;
    } else if (step === 3) {
      // Money step - calculate total
      calculateTotal();
      isValid = true;
    } else if (step === 4) {
      // Clothing and other items - no required fields
      isValid = true;
    }

    if (isValid) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        // Ensure total is calculated before submission
        calculateTotal();

        if (isEditMode && initialData) {
          await updateValuables({
            assessmentId: initialData._id,
            ...formData,
            residentId: residentId as Id<"residents">,
            teamId,
            organizationId,
            userId
          });
          toast.success("Resident valuables updated successfully");
        } else {
          await submitValuables({
            ...formData,
            residentId: residentId as Id<"residents">,
            teamId,
            organizationId,
            userId
          });
          toast.success("Resident valuables saved successfully");
        }

        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save resident valuables");
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="residentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Resident Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedroomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Bedroom Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
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
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => field.onChange(date?.getTime())}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="completedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Completed By</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="witnessedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Witnessed By</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Valuables</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendValuable({ value: "" })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {valuablesFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`valuables.${index}.value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Valuable item description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeValuable(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {valuablesFields.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No valuables added yet
              </p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Money</h3>

            <div className="grid grid-cols-2 gap-4">
              <h4 className="col-span-2 font-medium">Pounds</h4>
              <FormField
                control={form.control}
                name="n50"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>£50 Notes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="n20"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>£20 Notes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="n10"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>£10 Notes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="n5"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>£5 Notes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="n2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>£2 Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="n1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>£1 Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h4 className="col-span-2 font-medium mt-4">Pence</h4>
              <FormField
                control={form.control}
                name="p50"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>50p Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="p20"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>20p Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="p10"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>10p Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="p5"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>5p Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="p2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2p Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="p1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>1p Coins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber || undefined);
                          setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted p-4 rounded-md mt-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Total Amount</h4>
                <FormField
                  control={form.control}
                  name="total"
                  render={({ field }) => (
                    <div className="font-bold text-lg">
                      £{field.value.toFixed(2)}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Clothing section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Clothing</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendClothing({ value: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Clothing
                </Button>
              </div>

              {clothingFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`clothing.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Clothing item description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeClothing(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {clothingFields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No clothing items added yet
                </p>
              )}
            </div>

            {/* Other items section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Other Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendOther({
                      details: "",
                      receivedBy: "",
                      witnessedBy: "",
                      date: Date.now(),
                      time: "12:00"
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Other Item
                </Button>
              </div>

              {otherFields.map((field, index) => (
                <div key={field.id} className="border rounded-md p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOther(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`other.${index}.details`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Details</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe the item"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`other.${index}.receivedBy`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Received By</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`other.${index}.witnessedBy`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Witnessed By</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`other.${index}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onSelect={(date) =>
                                  field.onChange(date?.getTime())
                                }
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`other.${index}.time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              {otherFields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No other items added yet
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditMode
            ? "Review Resident Valuables"
            : step === 1
              ? "Resident Valuables Assessment"
              : step === 2
                ? "Valuables List"
                : step === 3
                  ? "Money Inventory"
                  : step === 4
                    ? "Clothing & Other Items"
                    : "Resident Valuables Assessment"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the resident's valuables inventory"
            : step === 1
              ? "Enter the resident's information and assessment details"
              : step === 2
                ? "List any valuable items in the resident's possession"
                : step === 3
                  ? "Record any money in the resident's possession"
                  : step === 4
                    ? "Record clothing items and other possessions"
                    : "Complete the valuables assessment for the resident"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onClose : handlePrevious}
              disabled={isLoading}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              onClick={step === totalSteps ? handleSubmit : handleNext}
              disabled={isLoading}
            >
              {isLoading
                ? "Saving..."
                : step === totalSteps
                  ? "Save Assessment"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
