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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const UpdateMedicationSchema = z.object({
  name: z.string().optional(),
  strength: z.string().optional(),
  strengthUnit: z.enum(["mg", "g"]).optional(),
  totalCount: z.number().positive().optional(),
  dosageForm: z
    .enum([
      "Tablet",
      "Capsule",
      "Liquid",
      "Injection",
      "Cream",
      "Ointment",
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
  frequency: z
    .enum([
      "Once daily (OD)",
      "Twice daily (BD)",
      "Three times daily (TD)",
      "Four times daily (QDS)",
      "Four times daily (QIS)",
      "As Needed (PRN)",
      "One time (STAT)",
      "Weekly",
      "Monthly"
    ])
    .optional(),
  scheduleType: z.enum(["Scheduled", "PRN (As Needed)"]).optional(),
  times: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  prescriberName: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional()
});

interface Medication {
  _id: string;
  _creationTime: number;
  name: string;
  strength: string;
  strengthUnit: string;
  dosageForm: string;
  route: string;
  frequency: string;
  scheduleType: string;
  times: string[];
  instructions?: string;
  prescriberName: string;
  startDate: number;
  endDate?: number;
  status: string;
  totalCount: number;
}

interface EditMedicationDialogProps {
  medication: Medication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditMedicationDialog({
  medication,
  open,
  onOpenChange
}: EditMedicationDialogProps) {
  const updateMedication = useMutation(api.medication.updateMedication);
  const [isLoading, startTransition] = useTransition();
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof UpdateMedicationSchema>>({
    resolver: zodResolver(UpdateMedicationSchema),
    mode: "onChange",
    defaultValues: {
      name: medication.name,
      strength: medication.strength,
      strengthUnit: medication.strengthUnit as "mg" | "g",
      totalCount: medication.totalCount,
      dosageForm: medication.dosageForm as any,
      route: medication.route as any,
      frequency: medication.frequency as any,
      scheduleType: medication.scheduleType as any,
      times: medication.times,
      instructions: medication.instructions || undefined,
      prescriberName: medication.prescriberName,
      startDate: new Date(medication.startDate),
      endDate: medication.endDate ? new Date(medication.endDate) : undefined,
      status: medication.status as "active" | "completed" | "cancelled"
    }
  });

  async function onSubmit(values: z.infer<typeof UpdateMedicationSchema>) {
    startTransition(async () => {
      try {
        const updates: Record<string, any> = {};

        // Only include changed fields
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === "startDate" && value instanceof Date) {
              updates[key] = new Date(
                value.getFullYear(),
                value.getMonth(),
                value.getDate(),
                12,
                0,
                0,
                0
              ).getTime();
            } else if (key === "endDate" && value instanceof Date) {
              updates[key] = new Date(
                value.getFullYear(),
                value.getMonth(),
                value.getDate(),
                12,
                0,
                0,
                0
              ).getTime();
            } else {
              updates[key] = value;
            }
          }
        });

        await updateMedication({
          medicationId: medication._id as Id<"medication">,
          updates
        });

        toast.success("Medication updated successfully");
        onOpenChange(false);
      } catch (error) {
        console.error("Error updating medication:", error);
        toast.error(
          `Failed to update medication: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Stock Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
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
                        <SelectItem value="g">g</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover
                      open={startDatePopoverOpen}
                      onOpenChange={setStartDatePopoverOpen}
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
                      <PopoverContent className="w-auto p-0" align="start">
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

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
                    <Popover
                      open={endDatePopoverOpen}
                      onOpenChange={setEndDatePopoverOpen}
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
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setEndDatePopoverOpen(false);
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
                onClick={() => onOpenChange(false)}
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
