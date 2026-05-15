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
import { Textarea } from "@/components/ui/textarea";
import { peepSchema } from "@/schemas/residents/care-file/peepSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import NextReviewDateField from "./NextReviewDateField";

interface PeepDialogProps {
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
  careHomeName?: string;
  teamName?: string;
}

export default function PeepDialog({
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
  careHomeName,
  teamName,
}: PeepDialogProps) {
  const [isPending, startTransition] = useTransition();

  const formData = initialData?.assessment_data || initialData || {};

  const form = useForm<z.infer<typeof peepSchema>>({
    resolver: zodResolver(peepSchema),
    mode: "onChange",
    defaultValues: {
      facilityName: formData.facilityName || careHomeName || "",
      residentName:
        formData.residentName ||
        `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      residentDateOfBirth:
        typeof formData.residentDateOfBirth === "number"
          ? formData.residentDateOfBirth
          : typeof resident.date_of_birth === "number"
            ? resident.date_of_birth
            : resident.date_of_birth
              ? new Date(resident.date_of_birth).getTime()
              : Date.now(),
      bedroomNumber:
        formData.bedroomNumber ||
        resident.room_number ||
        "",
      unit: formData.unit || teamName || "",
      nextReviewDate: formData.nextReviewDate || "",
      informedBy: {
        alarmSystem: formData.informedBy?.alarmSystem ?? false,
        visualAlarm: formData.informedBy?.visualAlarm ?? false,
        pagerDevice: formData.informedBy?.pagerDevice ?? false,
        other: formData.informedBy?.other ?? false,
        otherDetails: formData.informedBy?.otherDetails ?? "",
      },
      designatedAssistance: formData.designatedAssistance || "",
      equipmentRequired: formData.equipmentRequired || "",
      steps: formData.steps || [{ name: "", description: "" }],
      hazards: {
        oxygenCylinders: formData.hazards?.oxygenCylinders ?? false,
        furnishingsFireRetardant: formData.hazards?.furnishingsFireRetardant ?? false,
        doesPersonSmoke: formData.hazards?.doesPersonSmoke ?? false,
      },
      managerSignature: formData.managerSignature || userName || "",
      managerSignatureDate: formData.managerSignatureDate || Date.now(),
      personInCareSignature: formData.personInCareSignature || "",
      personInCareSignatureDate: formData.personInCareSignatureDate || Date.now(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "steps"
  });

  const onSubmit = async (values: z.infer<typeof peepSchema>) => {
    startTransition(async () => {
      try {
        if (!userId) {
          toast.error("User not authenticated. Please log in again.");
          return;
        }

        if (!organizationId || organizationId === "") {
          toast.error("Organization ID is missing. Please try again.");
          console.error("Missing organizationId", { organizationId });
          return;
        }

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_date: format(new Date(), "yyyy-MM-dd"),
          created_by: userId,
          completed_by: values.managerSignature,
          assessment_data: {
            ...values
          }
        };

        await submitAssessmentWithVersioning(
          'peeps',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "PEEP updated successfully" : "PEEP submitted successfully");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to submit PEEP. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {!isInline && (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Personal Emergency Evacuation Plan (PEEP)</DialogTitle>
          <DialogDescription>
            Complete the PEEP for the resident. This information will be used in case of emergency.
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <div className="mb-4 p-4 border rounded-lg bg-muted/40">
          <FormField
            control={form.control}
            name="nextReviewDate"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormControl>
                  <NextReviewDateField value={field.value || ""} onChange={field.onChange} disabled={viewOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="facilityName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of Facility</FormLabel>
                  <FormControl>
                    {viewOnly ? (
                      <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                        {field.value || " "}
                      </div>
                    ) : (
                      <Input {...field} disabled={viewOnly} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="residentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident&apos;s Name</FormLabel>
                  <FormControl>
                    {viewOnly ? (
                      <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                        {field.value || " "}
                      </div>
                    ) : (
                      <Input {...field} disabled={viewOnly} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="residentDateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                      onChange={(e) => field.onChange(new Date(e.target.value).getTime())}
                      disabled={viewOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bedroomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room No.</FormLabel>
                    <FormControl>
                      {viewOnly ? (
                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                          {field.value || " "}
                        </div>
                      ) : (
                        <Input {...field} disabled={viewOnly} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      {viewOnly ? (
                        <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                          {field.value || " "}
                        </div>
                      ) : (
                        <Input {...field} disabled={viewOnly} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Awareness of Procedure</h3>
            <p className="text-sm text-muted-foreground italic">Is informed of a fire evacuation by: (please tick relevant box)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="informedBy.alarmSystem"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={field.value} onChange={field.onChange} disabled={viewOnly} className="h-4 w-4" />
                    <label className="text-sm">Existing alarm system</label>
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name="informedBy.visualAlarm"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={field.value} onChange={field.onChange} disabled={viewOnly} className="h-4 w-4" />
                    <label className="text-sm">Visual Alarm System</label>
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name="informedBy.pagerDevice"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={field.value} onChange={field.onChange} disabled={viewOnly} className="h-4 w-4" />
                    <label className="text-sm">Pager Device</label>
                  </div>
                )}
              />
              <div className="flex items-center space-x-2 col-span-1 sm:col-span-2">
                <FormField
                  control={form.control}
                  name="informedBy.other"
                  render={({ field }) => (
                    <input type="checkbox" checked={field.value} onChange={field.onChange} disabled={viewOnly} className="h-4 w-4" />
                  )}
                />
                <label className="text-sm">Other</label>
                <FormField
                  control={form.control}
                  name="informedBy.otherDetails"
                  render={({ field }) => (
                    viewOnly ? (
                      <div className="h-auto min-h-8 ml-2 flex-1 rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words">
                        {field.value || " "}
                      </div>
                    ) : (
                      <Input {...field} className="h-8 ml-2 flex-1" placeholder="Please specify" disabled={viewOnly} />
                    )
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="designatedAssistance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">DESIGNATED ASSISTANCE</FormLabel>
                  <p className="text-xs text-muted-foreground">( e.g. Transfer Procedures methods of guidance etc.)</p>
                  <FormControl>
                    {viewOnly ? (
                      <div className="min-h-[100px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words">
                        {field.value || " "}
                      </div>
                    ) : (
                      <Textarea {...field} className="min-h-[100px]" disabled={viewOnly} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="equipmentRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">EQUIPMENT REQUIRED</FormLabel>
                  <p className="text-xs text-muted-foreground">( INCLUDING MEANS OF COMMUNICATION)</p>
                  <FormControl>
                    {viewOnly ? (
                      <div className="min-h-[100px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words">
                        {field.value || " "}
                      </div>
                    ) : (
                      <Textarea {...field} className="min-h-[100px]" disabled={viewOnly} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-lg">PERSONALISED EVACUATION PROCEDURE</h3>
              {!viewOnly && (
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", description: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Step
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">( a step by step account beginning with the first alarm)</p>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start p-4 border rounded-md relative group">
                  <div className="flex items-center justify-center font-bold text-lg bg-muted h-8 w-8 rounded-full shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-2">
                    <FormField
                      control={form.control}
                      name={`steps.${index}.name`}
                      render={({ field }) => (
                        viewOnly ? (
                          <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                            {field.value || " "}
                          </div>
                        ) : (
                          <Input {...field} placeholder={`Step ${index + 1} Title`} disabled={viewOnly} />
                        )
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`steps.${index}.description`}
                      render={({ field }) => (
                        viewOnly ? (
                          <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-[80px]">
                            {field.value || " "}
                          </div>
                        ) : (
                          <Textarea {...field} placeholder="Procedure details..." disabled={viewOnly} />
                        )
                      )}
                    />
                  </div>
                  {!viewOnly && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => remove(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">FIRE HAZARDS IN AREA ROOM</h3>
            <div className="space-y-3">
              {[
                { name: "oxygenCylinders", label: "Are there any oxygen cylinders?" },
                { name: "furnishingsFireRetardant", label: "Are all furnishings fire retardant?" },
                { name: "doesPersonSmoke", label: "Does the person smoke? (Refer to smoking Risk assessment)" }
              ].map((hazard) => (
                <div key={hazard.name} className="flex justify-between items-center max-w-2xl">
                  <span className="text-sm">{hazard.label}</span>
                  <div className="flex space-x-6">
                    <FormField
                      control={form.control}
                      name={`hazards.${hazard.name}` as any}
                      render={({ field }) => (
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input 
                              type="radio" 
                              checked={field.value === true} 
                              onChange={() => field.onChange(true)} 
                              disabled={viewOnly}
                              className="h-4 w-4"
                            />
                            <span className="text-xs font-bold uppercase transition-colors hover:text-primary">YES</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input 
                              type="radio" 
                              checked={field.value === false} 
                              onChange={() => field.onChange(false)} 
                              disabled={viewOnly}
                              className="h-4 w-4"
                            />
                            <span className="text-xs font-bold uppercase transition-colors hover:text-primary">NO</span>
                          </label>
                        </div>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 uppercase">Monitoring and Review</h3>
            <p className="text-xs italic text-muted-foreground">PEEP&apos;s must be reviewed and updated when there is any significant change in the Person in Care&apos;s File</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="managerSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signed by Manager</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                            {field.value || " "}
                          </div>
                        ) : (
                          <Input {...field} disabled={viewOnly} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="managerSignatureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value).getTime())}
                          disabled={viewOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="personInCareSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signed by person in Care/Relative</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-70 whitespace-pre-wrap break-words min-h-10">
                            {field.value || " "}
                          </div>
                        ) : (
                          <Input {...field} disabled={viewOnly} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personInCareSignatureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value).getTime())}
                          disabled={viewOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Hidden submit button specifically for the parent's control to trigger form submission */}
          <button id="care-file-submit-btn" type="submit" className="hidden" disabled={isPending} />
        </form>
      </Form>
    </div>
  );
}
