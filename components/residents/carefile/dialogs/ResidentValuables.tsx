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
import { CalendarIcon, Loader2, Plus, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface ResidentValuablesProps {
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
}

export default function ResidentValuables({
  teamId, residentId, organizationId, userId, userName, resident,
  onClose, initialData, isEditMode = false, isInline = false, viewOnly = false
}: ResidentValuablesProps) {
  const [isLoading, startTransition] = useTransition();

  const form = useForm<z.infer<typeof residentValuablesSchema>>({
    resolver: zodResolver(residentValuablesSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        // Data is stored in assessment_data JSONB in the DB row
        ...(initialData.assessment_data || {}),
        residentName:
          (initialData.assessment_data?.residentName ?? initialData.residentName) ??
          (`${resident.first_name || ""} ${resident.last_name || ""}`.trim() || ""),
        bedroomNumber:
          (initialData.assessment_data?.bedroomNumber ?? initialData.bedroomNumber) ??
          resident.room_number ?? "",
        date: (initialData.assessment_data?.date ?? initialData.date) ?? Date.now(),
        completedBy:
          (initialData.assessment_data?.completedBy ?? initialData.completedBy) ??
          userName,
        completedByRole:
          (initialData.assessment_data?.completedByRole ?? initialData.completedByRole) ??
          "",
        witnessedBy:
          (initialData.assessment_data?.witnessedBy ?? initialData.witnessedBy) ??
          "",
        witnessedByRole:
          (initialData.assessment_data?.witnessedByRole ?? initialData.witnessedByRole) ??
          "",
        valuables: initialData.assessment_data?.valuables ?? initialData.valuables ?? [],
        n50: initialData.assessment_data?.n50 ?? initialData.n50 ?? undefined,
        n20: initialData.assessment_data?.n20 ?? initialData.n20 ?? undefined,
        n10: initialData.assessment_data?.n10 ?? initialData.n10 ?? undefined,
        n5: initialData.assessment_data?.n5 ?? initialData.n5 ?? undefined,
        n2: initialData.assessment_data?.n2 ?? initialData.n2 ?? undefined,
        n1: initialData.assessment_data?.n1 ?? initialData.n1 ?? undefined,
        p50: initialData.assessment_data?.p50 ?? initialData.p50 ?? undefined,
        p20: initialData.assessment_data?.p20 ?? initialData.p20 ?? undefined,
        p10: initialData.assessment_data?.p10 ?? initialData.p10 ?? undefined,
        p5: initialData.assessment_data?.p5 ?? initialData.p5 ?? undefined,
        p2: initialData.assessment_data?.p2 ?? initialData.p2 ?? undefined,
        p1: initialData.assessment_data?.p1 ?? initialData.p1 ?? undefined,
        total: initialData.assessment_data?.total ?? initialData.total ?? 0,
        clothing: initialData.assessment_data?.clothing ?? initialData.clothing ?? [],
        other: initialData.assessment_data?.other ?? initialData.other ?? [],
        comments: initialData.assessment_data?.comments ?? initialData.comments ?? ""
      }
      : {
        residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim() || "",
        bedroomNumber: resident.room_number ?? "",
        date: Date.now(),
        completedBy: userName,
        completedByRole: "",
        witnessedBy: "",
        witnessedByRole: "",
        valuables: [],
        n50: undefined, n20: undefined, n10: undefined, n5: undefined,
        n2: undefined, n1: undefined,
        p50: undefined, p20: undefined, p10: undefined, p5: undefined,
        p2: undefined, p1: undefined,
        total: 0, clothing: [], other: [], comments: ""
      }
  });

  const { fields: valuablesFields, append: appendValuable, remove: removeValuable } =
    useFieldArray({ control: form.control, name: "valuables" as const });
  const { fields: clothingFields, append: appendClothing, remove: removeClothing } =
    useFieldArray({ control: form.control, name: "clothing" as const });
  const { fields: otherFields, append: appendOther, remove: removeOther } =
    useFieldArray({ control: form.control, name: "other" as const });

  const calculateTotal = () => {
    const v = form.getValues();
    const pounds = (v.n50 || 0) * 50 + (v.n20 || 0) * 20 + (v.n10 || 0) * 10 +
      (v.n5 || 0) * 5 + (v.n2 || 0) * 2 + (v.n1 || 0) * 1;
    const pence = (v.p50 || 0) * 0.5 + (v.p20 || 0) * 0.2 + (v.p10 || 0) * 0.1 +
      (v.p5 || 0) * 0.05 + (v.p2 || 0) * 0.02 + (v.p1 || 0) * 0.01;
    const total = pounds + pence;
    form.setValue("total", parseFloat(total.toFixed(2)));
    return total;
  };

  const isViewMode = viewOnly;

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

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        calculateTotal();
        const formData = form.getValues();
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_data: formData,
          created_by: userId
        };
        await submitAssessmentWithVersioning(
          "resident_valuables_assessments", payload, initialData, isEditMode
        );
        toast.success(isEditMode
          ? "Resident valuables updated successfully!"
          : "Resident valuables saved successfully");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to save resident valuables");
      }
    });
  };

  const renderMoneyField = (name: string, label: string) => (
    <FormField control={form.control} name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {renderInput(field, {
              type: "number",
              value: field.value ?? "",
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                field.onChange(e.target.valueAsNumber || undefined);
                setTimeout(calculateTotal, 0);
              }
            })}
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
  );

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} Resident Valuables Assessment
          </DialogTitle>
          <DialogDescription>
            Complete all sections below for the valuables inventory
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <button
              type="button"
              id="care-file-submit-btn"
              className="hidden"
              onClick={form.handleSubmit(handleSubmit, (errors) => {
                console.error("Resident Valuables form errors:", errors);
                toast.error("Please fill in all required fields correctly.");
              })}
            />
            <div className="space-y-8 px-1">

              {/* Section 1: Resident Information */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Resident Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Enter the resident&apos;s information and assessment details
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="residentName"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Resident Name</FormLabel>
                        <FormControl>{renderInput(field)}</FormControl><FormMessage />
                      </FormItem>)} />
                  <FormField control={form.control} name="bedroomNumber"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Bedroom Number</FormLabel>
                        <FormControl>{renderInput(field)}</FormControl><FormMessage />
                      </FormItem>)} />
                </div>
                <FormField control={form.control} name="date"
                  render={({ field }) => (
                    <FormItem><FormLabel required>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline"
                              className={cn("w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground")}>
                              {field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single"
                            selected={field.value && (typeof field.value === 'number' || typeof field.value === 'string') ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.getTime())}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="completedBy"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Completed By</FormLabel>
                        <FormControl>{renderInput(field)}</FormControl><FormMessage />
                      </FormItem>)} />
                  <FormField control={form.control} name="completedByRole"
                    render={({ field }) => (
                      <FormItem><FormLabel>Job Role</FormLabel>
                        <FormControl>{renderInput(field, { placeholder: "e.g. Senior Carer" })}</FormControl><FormMessage />
                      </FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="witnessedBy"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Witnessed By</FormLabel>
                        <FormControl>{renderInput(field)}</FormControl><FormMessage />
                      </FormItem>)} />
                  <FormField control={form.control} name="witnessedByRole"
                    render={({ field }) => (
                      <FormItem><FormLabel>Job Role</FormLabel>
                        <FormControl>{renderInput(field, { placeholder: "e.g. Registered Nurse" })}</FormControl><FormMessage />
                      </FormItem>)} />
                </div>
              </div>

              {/* Section 2: Valuables */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Valuables</h4>
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => appendValuable({ value: "" })}>
                      <Plus className="h-4 w-4 mr-2" />Add Item
                    </Button>
                  </div>
                </div>
                {valuablesFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField control={form.control} name={`valuables.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            {renderInput(field, { placeholder: "Valuable item description" })}
                          </FormControl><FormMessage />
                        </FormItem>)} />
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => removeValuable(index)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {valuablesFields.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No valuables added yet</p>
                )}
              </div>

              {/* Section 3: Money */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Money</h4>
                  <p className="text-sm text-muted-foreground">
                    Record any money in the resident&apos;s possession
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <h4 className="col-span-2 font-medium">Pounds</h4>
                  {renderMoneyField("n50", "£50 Notes")}
                  {renderMoneyField("n20", "£20 Notes")}
                  {renderMoneyField("n10", "£10 Notes")}
                  {renderMoneyField("n5", "£5 Notes")}
                  {renderMoneyField("n2", "£2 Coins")}
                  {renderMoneyField("n1", "£1 Coins")}
                  <h4 className="col-span-2 font-medium mt-4">Pence</h4>
                  {renderMoneyField("p50", "50p Coins")}
                  {renderMoneyField("p20", "20p Coins")}
                  {renderMoneyField("p10", "10p Coins")}
                  {renderMoneyField("p5", "5p Coins")}
                  {renderMoneyField("p2", "2p Coins")}
                  {renderMoneyField("p1", "1p Coins")}
                </div>
                <div className="bg-muted p-4 rounded-md mt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Total Amount</h4>
                    <FormField control={form.control} name="total"
                      render={({ field }) => (
                        <div className="font-bold text-lg">£{field.value.toFixed(2)}</div>
                      )} />
                  </div>
                </div>
              </div>

              {/* Section 4: Clothing & Other */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1 pb-2 border-b">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">Clothing</h4>
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => appendClothing({ value: "" })}>
                        <Plus className="h-4 w-4 mr-2" />Add Clothing
                      </Button>
                    </div>
                  </div>
                  {clothingFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <FormField control={form.control} name={`clothing.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              {renderInput(field, { placeholder: "Clothing item description" })}
                            </FormControl><FormMessage />
                          </FormItem>)} />
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => removeClothing(index)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {clothingFields.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No clothing items added</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1 pb-2 border-b">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">Other Items</h4>
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => appendOther({
                          details: "", receivedBy: "", witnessedBy: "",
                          date: Date.now(), time: "12:00"
                        })}>
                        <Plus className="h-4 w-4 mr-2" />Add Other Item
                      </Button>
                    </div>
                  </div>
                  {otherFields.map((field, index) => (
                    <div key={field.id} className="border rounded-md p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => removeOther(index)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormField control={form.control} name={`other.${index}.details`}
                        render={({ field }) => (
                          <FormItem><FormLabel>Item Details</FormLabel>
                            <FormControl>{renderTextarea(field, { placeholder: "Describe the item" })}</FormControl>
                            <FormMessage />
                          </FormItem>)} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name={`other.${index}.receivedBy`}
                          render={({ field }) => (
                            <FormItem><FormLabel>Received By</FormLabel>
                              <FormControl>{renderInput(field)}</FormControl><FormMessage />
                            </FormItem>)} />
                        <FormField control={form.control} name={`other.${index}.witnessedBy`}
                          render={({ field }) => (
                            <FormItem><FormLabel>Witnessed By</FormLabel>
                              <FormControl>{renderInput(field)}</FormControl><FormMessage />
                            </FormItem>)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name={`other.${index}.date`}
                          render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button variant="outline"
                                      className={cn("w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground")}>
                                      {field.value ? format(new Date(field.value), "PPP")
                                        : <span>Pick a date</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.getTime())}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("1900-01-01")} />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>)} />
                        <FormField control={form.control} name={`other.${index}.time`}
                          render={({ field }) => (
                            <FormItem><FormLabel>Time</FormLabel>
                              <FormControl><Input type="time" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>)} />
                      </div>
                    </div>
                  ))}
                  {otherFields.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No other items added</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1 pb-2 border-b">
                    <h4 className="text-sm font-medium">Comments</h4>
                  </div>
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          {renderTextarea(field, {
                            placeholder: "Enter any additional comments or observations...",
                            className: "min-h-[120px]"
                          })}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {!isInline && !viewOnly && (
              <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onClose?.()}
                  disabled={isLoading}>Cancel</Button>
                <Button type="button" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : "Save Assessment"}
                </Button>
              </DialogFooter>
            )}
          </form>
        </fieldset>
      </Form>
    </>
  );
}
