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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DnacprSchema } from "@/schemas/residents/care-file/dnacprSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface DnacprDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  resident: Resident;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

export default function DnacprDialog({
  teamId,
  residentId,
  organizationId,
  userId,
  resident,
  onClose,
  initialData,
  isEditMode = false
}: DnacprDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [residentDatePopoverOpen, setResidentDatePopoverOpen] = useState(false);
  const [relativeDatePopoverOpen, setRelativeDatePopoverOpen] = useState(false);
  const [nokDatePopoverOpen, setNokDatePopoverOpen] = useState(false);
  const [gpDatePopoverOpen, setGpDatePopoverOpen] = useState(false);

  const submitDnacpr = useMutation(api.careFiles.dnacpr.submitDnacpr);
  const updateDnacpr = useMutation(api.careFiles.dnacpr.updateDnacpr);

  // Helper function to safely convert date to timestamp
  const getDateOfBirthTimestamp = (): number => {
    if (typeof resident.dateOfBirth === "number") {
      return resident.dateOfBirth;
    }
    if (resident.dateOfBirth && typeof resident.dateOfBirth === "string") {
      const timestamp = new Date(resident.dateOfBirth).getTime();
      // Check if the conversion resulted in a valid timestamp
      if (!isNaN(timestamp) && timestamp > 0) {
        return timestamp;
      }
    }
    // Fallback: return current date minus 70 years as a reasonable default
    const defaultAge = 70;
    return Date.now() - (defaultAge * 365.25 * 24 * 60 * 60 * 1000);
  };

  const form = useForm<z.infer<typeof DnacprSchema>>({
    resolver: zodResolver(DnacprSchema),
    mode: "onChange",
    defaultValues: initialData
      ? {
          // Use existing data for editing
          residentId: residentId,
          teamId,
          organizationId,
          userId,
          residentName:
            initialData.residentName ??
            `${resident.firstName} ${resident.lastName}`,
          bedroomNumber: initialData.bedroomNumber ?? resident.roomNumber ?? "",
          dateOfBirth:
            typeof initialData.dateOfBirth === "number" && initialData.dateOfBirth > 0
              ? initialData.dateOfBirth
              : getDateOfBirthTimestamp(),
          dnacpr: initialData.dnacpr ?? false,
          dnacprComments: initialData.dnacprComments ?? "",
          reason: initialData.reason ?? "TERMINAL-PROGRESSIVE",
          date: initialData.date ?? Date.now(),
          discussedResident: initialData.discussedResident ?? false,
          discussedResidentComments:
            initialData.discussedResidentComments ?? "",
          discussedResidentDate: initialData.discussedResidentDate ?? undefined,
          discussedRelatives: initialData.discussedRelatives ?? false,
          discussedRelativesComments:
            initialData.discussedRelativesComments ?? "",
          discussedRelativeDate: initialData.discussedRelativeDate ?? undefined,
          discussedNOKs: initialData.discussedNOKs ?? false,
          discussedNOKsComments: initialData.discussedNOKsComments ?? "",
          discussedNOKsDate: initialData.discussedNOKsDate ?? undefined,
          comments: initialData.comments ?? "",
          gpDate: initialData.gpDate ?? Date.now(),
          gpSignature: initialData.gpSignature ?? "",
          residentNokSignature: initialData.residentNokSignature ?? "",
          registeredNurseSignature: initialData.registeredNurseSignature ?? ""
        }
      : {
          // Default values for new forms
          residentId: residentId,
          teamId,
          organizationId,
          userId,
          residentName: `${resident.firstName} ${resident.lastName}`,
          bedroomNumber: resident.roomNumber ?? "",
          dateOfBirth: getDateOfBirthTimestamp(),
          dnacpr: false,
          dnacprComments: "",
          reason: "TERMINAL-PROGRESSIVE",
          date: Date.now(),
          discussedResident: false,
          discussedResidentComments: "",
          discussedResidentDate: undefined,
          discussedRelatives: false,
          discussedRelativesComments: "",
          discussedRelativeDate: undefined,
          discussedNOKs: false,
          discussedNOKsComments: "",
          discussedNOKsDate: undefined,
          comments: "",
          gpDate: Date.now(),
          gpSignature: "",
          residentNokSignature: "",
          registeredNurseSignature: ""
        }
  });

  const totalSteps = 7;

  const handleNext = async () => {
    let isValid = false;

    // Close all date popovers when moving between steps
    setDobPopoverOpen(false);
    setDatePopoverOpen(false);
    setResidentDatePopoverOpen(false);
    setRelativeDatePopoverOpen(false);
    setNokDatePopoverOpen(false);
    setGpDatePopoverOpen(false);

    if (step === 1) {
      const fieldsToValidate = [
        "residentName",
        "bedroomNumber",
        "dateOfBirth"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 2) {
      const fieldsToValidate = ["dnacpr", "reason", "date"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 3) {
      const fieldsToValidate = ["discussedResident"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 4) {
      const fieldsToValidate = ["discussedRelatives"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 5) {
      const fieldsToValidate = ["discussedNOKs"] as const;
      isValid = await form.trigger(fieldsToValidate);
    } else if (step === 6) {
      // Additional comments - no validation required
      isValid = true;
    } else if (step === 7) {
      const fieldsToValidate = [
        "gpDate",
        "gpSignature",
        "residentNokSignature",
        "registeredNurseSignature"
      ] as const;
      isValid = await form.trigger(fieldsToValidate);
    }

    if (isValid || step === totalSteps) {
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    // Close all date popovers when moving between steps
    setDobPopoverOpen(false);
    setDatePopoverOpen(false);
    setResidentDatePopoverOpen(false);
    setRelativeDatePopoverOpen(false);
    setNokDatePopoverOpen(false);
    setGpDatePopoverOpen(false);

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        // Validate all required fields before submission
        const isValid = await form.trigger();
        if (!isValid) {
          toast.error("Please fill in all required fields");
          return;
        }

        const formData = form.getValues();

        // Check required signature fields specifically
        if (
          !formData.gpSignature ||
          !formData.residentNokSignature ||
          !formData.registeredNurseSignature
        ) {
          toast.error("All signature fields are required");
          return;
        }

        if (isEditMode && initialData) {
          await updateDnacpr({
            dnacprId: initialData._id,
            ...formData,
            residentId: residentId as Id<"residents">
          });
          toast.success("DNACPR form updated successfully");
        } else {
          await submitDnacpr({
            ...formData,
            residentId: residentId as Id<"residents">
          });
          toast.success("DNACPR form saved successfully");
        }

        onClose?.();
      } catch (error) {
        console.error("Error submitting DNACPR form:", error);
        toast.error("Failed to save DNACPR form");
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4" key="step-1">
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
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Date of Birth</FormLabel>
                  <Popover
                    open={dobPopoverOpen}
                    onOpenChange={setDobPopoverOpen}
                    modal
                  >
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
                        captionLayout="dropdown"
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.getTime());
                            setDobPopoverOpen(false);
                          }
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
        );

      case 2:
        return (
          <div className="space-y-4" key="step-2">
            <FormField
              control={form.control}
              name="dnacpr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    DNACPR (Do Not Attempt Cardiopulmonary Resuscitation)
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select DNACPR decision" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">
                        CPR should be attempted
                      </SelectItem>
                      <SelectItem value="true">
                        DNACPR - Do not attempt CPR
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dnacprComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNACPR Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional comments regarding DNACPR decision..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Reason for DNACPR</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TERMINAL-PROGRESSIVE">
                        Terminal Progressive Illness
                      </SelectItem>
                      <SelectItem value="UNSUCCESSFUL-CPR">
                        Unsuccessful CPR Likely
                      </SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Date of Decision</FormLabel>
                  <Popover
                    open={datePopoverOpen}
                    onOpenChange={setDatePopoverOpen}
                    modal
                  >
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
                          if (date) {
                            field.onChange(date.getTime());
                            setDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4" key="step-3">
            <h4 className="text-md font-medium">Discussion with Resident</h4>
            <FormField
              control={form.control}
              name="discussedResident"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    Was this discussed with the resident?
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">
                        No - Not discussed with resident
                      </SelectItem>
                      <SelectItem value="true">
                        Yes - Discussed with resident
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discussedResidentComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Comments about discussion with resident..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discussedResidentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Date of Discussion</FormLabel>
                  <Popover
                    modal
                    open={residentDatePopoverOpen}
                    onOpenChange={setResidentDatePopoverOpen}
                  >
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
                        captionLayout="dropdown"
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.getTime());
                            setResidentDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4" key="step-4">
            <h4 className="text-md font-medium">Discussion with Relatives</h4>
            <FormField
              control={form.control}
              name="discussedRelatives"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Was this discussed with relatives?</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">
                        No - Not discussed with relatives
                      </SelectItem>
                      <SelectItem value="true">
                        Yes - Discussed with relatives
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discussedRelativesComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Comments about discussion with relatives..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discussedRelativeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Discussion</FormLabel>
                  <Popover
                    modal
                    open={relativeDatePopoverOpen}
                    onOpenChange={setRelativeDatePopoverOpen}
                  >
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
                        captionLayout="dropdown"
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.getTime());
                            setRelativeDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-4" key="step-5">
            <h4 className="text-md font-medium">Discussion with Next of Kin</h4>
            <FormField
              control={form.control}
              name="discussedNOKs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Was this discussed with next of kin?</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">
                        No - Not discussed with next of kin
                      </SelectItem>
                      <SelectItem value="true">
                        Yes - Discussed with next of kin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discussedNOKsComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Comments about discussion with next of kin..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discussedNOKsDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Discussion</FormLabel>
                  <Popover
                    modal
                    open={nokDatePopoverOpen}
                    onOpenChange={setNokDatePopoverOpen}
                  >
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
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.getTime());
                            setNokDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-4" key="step-6">
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional comments about the DNACPR decision..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 7:
        return (
          <div className="space-y-4" key="step-7">
            <FormField
              control={form.control}
              name="gpDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>GP Date</FormLabel>
                  <Popover
                    modal
                    open={gpDatePopoverOpen}
                    onOpenChange={setGpDatePopoverOpen}
                  >
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
                        captionLayout="dropdown"
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date.getTime());
                            setGpDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
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
              name="gpSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>GP Signature</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="GP signature or name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residentNokSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Resident/Next of Kin Signature</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Resident or next of kin signature"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registeredNurseSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Registered Nurse Signature</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Registered nurse signature or name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            ? "Review DNACPR Form"
            : step === 1
              ? "DNACPR Form - Resident Information"
              : step === 2
                ? "DNACPR Form - Decision Details"
                : step === 3
                  ? "DNACPR Form - Discussion with Resident"
                  : step === 4
                    ? "DNACPR Form - Discussion with Relatives"
                    : step === 5
                      ? "DNACPR Form - Discussion with Next of Kin"
                      : step === 6
                        ? "DNACPR Form - Additional Comments"
                        : step === 7
                          ? "DNACPR Form - Signatures"
                          : "DNACPR Form"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Review and update the DNACPR form details"
            : step === 1
              ? "Enter the resident's basic information for the DNACPR form"
              : step === 2
                ? "Complete the DNACPR decision details and reasoning"
                : step === 3
                  ? "Record discussion held with the resident"
                  : step === 4
                    ? "Record discussion held with relatives"
                    : step === 5
                      ? "Record discussion held with next of kin"
                      : step === 6
                        ? "Add any additional comments about the DNACPR decision"
                        : step === 7
                          ? "Obtain required signatures to complete the DNACPR form"
                          : "Complete the Do Not Attempt Cardiopulmonary Resuscitation form"}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6"
          autoComplete="off"
        >
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onClose : handlePrevious}
              disabled={step === 1 || isLoading}
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
                  ? "Save DNACPR Form"
                  : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
