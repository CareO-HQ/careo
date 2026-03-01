"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PhotographyConsentSchema } from "@/schemas/residents/care-file/photographySchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";

interface PhotographyConsentDialogProps {
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

export default function PhotographyConsentDialog({
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
}: PhotographyConsentDialogProps) {
  const [isLoading, startTransition] = useTransition();
  const [loadingState, setLoadingState] = useState<string>("");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [representativeDatePopoverOpen, setRepresentativeDatePopoverOpen] = useState(false);
  const [dateCompletedPopoverOpen, setDateCompletedPopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof PhotographyConsentSchema>>({
    resolver: zodResolver(PhotographyConsentSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
        residentId: residentId,
        teamId,
        organizationId,
        userId,
        ...(initialData.assessment_data || {}),
        residentName:
          initialData.assessment_data?.residentName ??
          initialData.residentName ??
          (`${resident.first_name || ""} ${resident.last_name || ""}`.trim() ||
            ""),
        bedroomNumber: initialData.assessment_data?.bedroomNumber ?? initialData.bedroomNumber ?? resident.room_number ?? "",
        dateOfBirth:
          initialData.assessment_data?.dateOfBirth ??
          initialData.dateOfBirth ??
          (resident.date_of_birth
            ? new Date(resident.date_of_birth).getTime()
            : Date.now()),
        healthcareRecords: initialData.assessment_data?.healthcareRecords ?? initialData.healthcareRecords ?? false,
        socialActivitiesInternal:
          initialData.assessment_data?.socialActivitiesInternal ?? initialData.socialActivitiesInternal ?? false,
        socialActivitiesExternal:
          initialData.assessment_data?.socialActivitiesExternal ?? initialData.socialActivitiesExternal ?? false,
        residentSignature: initialData.assessment_data?.residentSignature ?? initialData.residentSignature ?? "",
        representativeName: initialData.assessment_data?.representativeName ?? initialData.representativeName ?? "",
        representativeRelationship:
          initialData.assessment_data?.representativeRelationship ?? initialData.representativeRelationship ?? "",
        representativeSignature: initialData.assessment_data?.representativeSignature ?? initialData.representativeSignature ?? "",
        representativeDate: initialData.assessment_data?.representativeDate ?? initialData.representativeDate ?? undefined,
        nameStaff: initialData.assessment_data?.nameStaff ?? initialData.nameStaff ?? userName,
        staffSignature: initialData.assessment_data?.staffSignature ?? initialData.staffSignature ?? userName,
        date: initialData.assessment_data?.date ?? initialData.date ?? Date.now()
      }
      : {
        residentId: residentId,
        teamId,
        organizationId,
        userId,
        residentName:
          `${resident.first_name || ""} ${resident.last_name || ""}`.trim() ||
          "",
        bedroomNumber: resident.room_number ?? "",
        dateOfBirth: resident.date_of_birth
          ? new Date(resident.date_of_birth).getTime()
          : Date.now(),
        healthcareRecords: false,
        socialActivitiesInternal: false,
        socialActivitiesExternal: false,
        residentSignature: "",
        representativeName: "",
        representativeRelationship: "",
        representativeSignature: "",
        representativeDate: undefined,
        nameStaff: userName,
        staffSignature: userName,
        date: Date.now()
      }
  });

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues();

        setLoadingState("Saving consent form...");

        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_data: formData,
          assessment_date: format(new Date(formData.date), "yyyy-MM-dd"),
          completed_by: formData.nameStaff,
          created_by: userId,
          status: "completed"
        };

        await submitAssessmentWithVersioning(
          'photography_consents',
          payload,
          initialData,
          isEditMode
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success(isEditMode ? "Photography consent updated successfully" : "Photography consent saved successfully");

        setLoadingState("");
        onClose?.();
      } catch (error) {
        console.error("Error submitting form:", error);
        setLoadingState("");
        toast.error("Failed to save photography consent");
      }
    });
  };

  return (
    <>
      {!isInline && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Review" : "Complete"} Photography Consent Form
          </DialogTitle>
          <DialogDescription>
            Complete all sections below for the photography consent form
          </DialogDescription>
        </DialogHeader>
      )}

      <Form {...form}>
        <fieldset disabled={viewOnly} className={viewOnly ? "pointer-events-none" : ""}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <button type="submit" id="care-file-submit-btn" className="hidden" />
            <div className="space-y-8 px-1">

              {/* Section 1: Resident Information */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Resident Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Enter the resident&apos;s basic information
                  </p>
                </div>
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
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date of Birth</FormLabel>
                      <Popover modal open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
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
                            captionLayout="dropdown"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              field.onChange(date?.getTime());
                              setDobPopoverOpen(false);
                            }}
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
              </div>

              {/* Section 2: Consent Permissions */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Photography and Image Use Consent</h4>
                  <p className="text-sm text-muted-foreground">
                    Select the types of photography and image use you consent to
                  </p>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="healthcareRecords"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            Healthcare Records
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Photography for medical documentation, wound care
                            monitoring, and healthcare record purposes.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialActivitiesInternal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            Internal Social Activities
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Photography during internal activities, celebrations,
                            and events for internal facility use only.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialActivitiesExternal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            External Social Activities & Marketing
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Photography for marketing materials, website, social
                            media, newsletters, and promotional activities.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: Signatures */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Resident Signature</h4>
                  <p className="text-sm text-muted-foreground">
                    If the resident is able to provide consent and signature
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="residentSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resident Signature</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter resident signature or mark 'X' if applicable..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 mt-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">
                      Representative Information
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      If consent is provided by a representative (family member,
                      guardian, etc.)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="representativeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Representative Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Full name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="representativeRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship to Resident</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Son, Daughter, Guardian"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="representativeSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Representative Signature</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Representative signature..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="representativeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Signed by Representative</FormLabel>
                        <Popover modal open={representativeDatePopoverOpen} onOpenChange={setRepresentativeDatePopoverOpen}>
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
                              captionLayout="dropdown"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) => {
                                field.onChange(date?.getTime());
                                setRepresentativeDatePopoverOpen(false);
                              }}
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
                </div>
              </div>

              {/* Section 4: Staff Verification */}
              <div className="space-y-4">
                <div className="space-y-1 pb-2 border-b">
                  <h4 className="text-sm font-medium">Staff Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Staff member completing this consent form
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nameStaff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Staff Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Full name" readOnly disabled className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Date Completed</FormLabel>
                        <Popover modal open={dateCompletedPopoverOpen} onOpenChange={setDateCompletedPopoverOpen}>
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
                              captionLayout="dropdown"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) => {
                                field.onChange(date?.getTime());
                                setDateCompletedPopoverOpen(false);
                              }}
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
                </div>

                <FormField
                  control={form.control}
                  name="staffSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Staff Signature</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Staff member signature..."
                          rows={2}
                          readOnly
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sticky Footer */}
            {!isInline && !viewOnly && (
              <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose?.()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingState || "Submitting..."}
                    </>
                  ) : (
                    "Save Consent"
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
