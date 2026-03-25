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
import { residentHandlingProfileSchema } from "@/schemas/residents/care-file/residentHandlingProfileSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface ResidentHandlingProfileProps {
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

export default function ResidentHandlingProfile({
  teamId, residentId, organizationId, userId, userName, resident,
  onClose, initialData, isEditMode = false, isInline = false, viewOnly = false
}: ResidentHandlingProfileProps) {
  const [isLoading, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [reviewDatePopovers, setReviewDatePopovers] = useState<Record<string, boolean>>({});

  const getDefaultActivityValues = () => ({
    nStaff: 0, equipment: "", handlingPlan: "", dateForReview: Date.now()
  });

  const form = useForm<z.infer<typeof residentHandlingProfileSchema>>({
    resolver: zodResolver(residentHandlingProfileSchema) as any,
    mode: "onChange",
    defaultValues: initialData ? {
      residentId, teamId, organizationId,
      completedBy: initialData.completed_by || userName || "",
      jobRole: initialData.job_role || "",
      date: initialData.assessment_date ? new Date(initialData.assessment_date).getTime() : Date.now(),
      residentName: initialData.residentName || `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
      bedroomNumber: initialData.bedroomNumber ?? initialData.bedroom_number ?? resident.room_number ?? "",
      weight: initialData.weight ?? undefined,
      weightBearing: initialData.weight_bearing || "",
      transferBed: {
        nStaff: initialData.activities?.transferBed?.nStaff ?? 0,
        equipment: initialData.activities?.transferBed?.equipment ?? "",
        handlingPlan: initialData.activities?.transferBed?.handlingPlan ?? "",
        dateForReview: initialData.activities?.transferBed?.dateForReview ?? Date.now()
      },
      transferChair: {
        nStaff: initialData.activities?.transferChair?.nStaff ?? 0,
        equipment: initialData.activities?.transferChair?.equipment ?? "",
        handlingPlan: initialData.activities?.transferChair?.handlingPlan ?? "",
        dateForReview: initialData.activities?.transferChair?.dateForReview ?? Date.now()
      },
      walking: {
        nStaff: initialData.activities?.walking?.nStaff ?? 0,
        equipment: initialData.activities?.walking?.equipment ?? "",
        handlingPlan: initialData.activities?.walking?.handlingPlan ?? "",
        dateForReview: initialData.activities?.walking?.dateForReview ?? Date.now()
      },
      toileting: {
        nStaff: initialData.activities?.toileting?.nStaff ?? 0,
        equipment: initialData.activities?.toileting?.equipment ?? "",
        handlingPlan: initialData.activities?.toileting?.handlingPlan ?? "",
        dateForReview: initialData.activities?.toileting?.dateForReview ?? Date.now()
      },
      movementInBed: {
        nStaff: initialData.activities?.movementInBed?.nStaff ?? 0,
        equipment: initialData.activities?.movementInBed?.equipment ?? "",
        handlingPlan: initialData.activities?.movementInBed?.handlingPlan ?? "",
        dateForReview: initialData.activities?.movementInBed?.dateForReview ?? Date.now()
      },
      bath: {
        nStaff: initialData.activities?.bath?.nStaff ?? 0,
        equipment: initialData.activities?.bath?.equipment ?? "",
        handlingPlan: initialData.activities?.bath?.handlingPlan ?? "",
        dateForReview: initialData.activities?.bath?.dateForReview ?? Date.now()
      },
      outdoorMobility: {
        nStaff: initialData.activities?.outdoorMobility?.nStaff ?? 0,
        equipment: initialData.activities?.outdoorMobility?.equipment ?? "",
        handlingPlan: initialData.activities?.outdoorMobility?.handlingPlan ?? "",
        dateForReview: initialData.activities?.outdoorMobility?.dateForReview ?? Date.now()
      }
    } : {
      residentId, teamId, organizationId,
      completedBy: userName || "", jobRole: "", date: Date.now(),
      residentName: `${resident.first_name} ${resident.last_name}`,
      bedroomNumber: resident.room_number ?? "",
      weight: undefined, weightBearing: "",
      transferBed: getDefaultActivityValues(),
      transferChair: getDefaultActivityValues(),
      walking: getDefaultActivityValues(),
      toileting: getDefaultActivityValues(),
      movementInBed: getDefaultActivityValues(),
      bath: getDefaultActivityValues(),
      outdoorMobility: getDefaultActivityValues()
    }
  });

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();
        if (!userId) throw new Error("User not authenticated");

        const activities = {
          transferBed: formData.transferBed,
          transferChair: formData.transferChair,
          walking: formData.walking,
          toileting: formData.toileting,
          movementInBed: formData.movementInBed,
          bath: formData.bath,
          outdoorMobility: formData.outdoorMobility
        };

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          completed_by: formData.completedBy,
          job_role: formData.jobRole,
          weight: formData.weight,
          weight_bearing: formData.weightBearing,
          activities: activities,
          assessment_date: new Date(formData.date).toISOString().split('T')[0],
          created_by: userId
        };

        await submitAssessmentWithVersioning(
          'handling_profiles', payload, initialData, isEditMode
        );

        if (isEditMode && initialData?.id) {
          await supabase.from('manager_audits').insert({
            form_type: 'handling_profiles', form_id: initialData.id,
            resident_id: residentId, audited_by: userId,
            audit_notes: "Form reviewed", organization_id: organizationId
          });
          toast.success("Handling profile updated!");
        } else {
          toast.success("Handling profile saved");
        }
        onClose?.();
      } catch (error) {
        console.error("Error submitting:", error);
        toast.error("Failed to save handling profile");
      }
    });
  };

  const renderActivityFields = (activityName: string, title: string) => {
    const popoverKey = `${activityName}_review`;
    const isPopoverOpen = reviewDatePopovers[popoverKey] || false;
    return (
      <div className="space-y-4">
        <div className="space-y-1 pb-2 border-b">
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name={`${activityName}.nStaff` as any}
            render={({ field }) => (
              <FormItem><FormLabel required>Number of Staff</FormLabel>
                <FormControl><Input type="number" min="0" {...field}
                  onChange={e => field.onChange(Number(e.target.value))} />
                </FormControl><FormMessage />
              </FormItem>
            )} />
          <FormField control={form.control} name={`${activityName}.equipment` as any}
            render={({ field }) => (
              <FormItem><FormLabel required>Equipment</FormLabel>
                <FormControl><Input placeholder="Hoist, slide sheet" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
        </div>
        <FormField control={form.control} name={`${activityName}.handlingPlan` as any}
          render={({ field }) => (
            <FormItem><FormLabel required>Handling Plan</FormLabel>
              <FormControl>
                {viewOnly ? (
                  <div className="min-h-[80px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm whitespace-pre-wrap overflow-hidden">
                    {field.value || "Not provided"}
                  </div>
                ) : (
                  <Textarea placeholder="Describe the handling plan..." {...field} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        <FormField control={form.control} name={`${activityName}.dateForReview` as any}
          render={({ field }) => (
            <FormItem><FormLabel required>Date for Review</FormLabel>
              <Popover open={isPopoverOpen}
                onOpenChange={open => setReviewDatePopovers(prev => ({ ...prev, [popoverKey]: open }))} modal>
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
                    selected={field.value ? new Date(field.value) : undefined}
                    captionLayout="dropdown"
                    onSelect={date => {
                      if (date) {
                        field.onChange(date.getTime());
                        setReviewDatePopovers(prev => ({ ...prev, [popoverKey]: false }));
                      }
                    }}
                    disabled={date => date < new Date()} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
      </div>
    );
  };

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} Resident Handling Profile
          </DialogTitle>
          <DialogDescription>
            Complete all sections below for the handling profile
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" autoComplete="off">
            <button
              type="button"
              id="care-file-submit-btn"
              className="hidden"
              onClick={form.handleSubmit(handleSubmit, (errors) => {
                console.error("Handling Profile form errors:", errors);
                toast.error("Please fill in all required fields correctly.");
              })}
            />
            <div className="space-y-8 px-1">
              {/* Resident Information */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Resident Information</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="residentName"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Resident Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl><FormMessage />
                      </FormItem>
                    )} />
                  <FormField control={form.control} name="bedroomNumber"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Bedroom</FormLabel>
                        <FormControl><Input {...field} /></FormControl><FormMessage />
                      </FormItem>
                    )} />
                  <FormField control={form.control} name="weight"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Weight (kg)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.1" {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  <FormField control={form.control} name="weightBearing"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Weight Bearing</FormLabel>
                        <FormControl><Input placeholder="Full weight bearing" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
              </div>

              {renderActivityFields("transferBed", "Transfer to or from Bed")}
              {renderActivityFields("transferChair", "Transfer to or from Chair")}
              {renderActivityFields("walking", "Walking")}
              {renderActivityFields("toileting", "Toileting")}
              {renderActivityFields("movementInBed", "Movement in Bed")}
              {renderActivityFields("bath", "Bathing")}
              {renderActivityFields("outdoorMobility", "Outdoor Mobility")}

              {/* Completed By */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Completed By</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="completedBy"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Name</FormLabel>
                        <FormControl><Input placeholder="John Smith" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  <FormField control={form.control} name="jobRole"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Job Role</FormLabel>
                        <FormControl><Input placeholder="Care Assistant" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  <FormField control={form.control} name="date"
                    render={({ field }) => (
                      <FormItem><FormLabel required>Date</FormLabel>
                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal>
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
                              selected={field.value ? new Date(field.value) : undefined}
                              captionLayout="dropdown"
                              onSelect={date => {
                                if (date) { field.onChange(date.getTime()); setDatePopoverOpen(false); }
                              }} />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
              </div>
            </div>

            {!isInline && !viewOnly && (
              <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onClose?.()}
                  disabled={isLoading}>Cancel</Button>
                <Button type="button" onClick={form.handleSubmit(handleSubmit)} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : "Save Profile"}
                </Button>
              </DialogFooter>
            )}
          </form>
        </fieldset>
      </Form>
    </>
  );
}
