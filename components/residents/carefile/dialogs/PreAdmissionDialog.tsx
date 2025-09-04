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
import { cn } from "@/lib/utils";
import { preAdmissionSchema } from "@/schemas/residents/care-file/preAdmissionSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns-tz";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface PreAdmissionDialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  careHomeName: string;
  userName: string; 
  resident: Resident;
}

export default function PreAdmissionDialog({
  teamId,
  residentId,
  organizationId,
  careHomeName,
  userName,
  resident
}: PreAdmissionDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [consentAcceptedAt, setConsentAcceptedAt] = useState(false);

  const form = useForm<z.infer<typeof preAdmissionSchema>>({
    resolver: zodResolver(preAdmissionSchema),
    defaultValues: {
      residentId,
      teamId,
      organizationId,
      savedAsDraft: false,
      consentAcceptedAt: 0,
      careHomeName,
      nhsHealthCareNumber: "",
      userName,
      jobRole: "",
      date: new Date().getTime(),
      firstName: resident.firstName ?? "",
      lastName: resident.lastName ?? "",
      dateOfBirth: "",
      phoneNumber: resident.phoneNumber ?? ""
    }
  });

  function onSubmit(values: z.infer<typeof preAdmissionSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      return;
    }
    setStep(step - 1);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Pre-Admission Assessment Form"}
          {step === 2 && "Header information"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 &&
            "Gather essential information about the resident before their admission."}
          {step === 2 && "Basic information about the care home"}
        </DialogDescription>
      </DialogHeader>
      <div className="">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <FormField
                control={form.control}
                name="consentAcceptedAt"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={consentAcceptedAt}
                          id="terms-2"
                          {...field}
                          onCheckedChange={(e) => {
                            form.setValue(
                              "consentAcceptedAt",
                              new Date().getTime()
                            );

                            setConsentAcceptedAt(Boolean(e));
                          }}
                        />
                      </FormControl>
                      <FormLabel htmlFor="terms-2">
                        The person being assessed agree to the assessment being
                        completed
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="careHomeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Care home name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nhsHealthCareNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>NHS Health & Care Number</FormLabel>
                        <FormControl>
                          <Input placeholder="A345657" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Job Role</FormLabel>
                        <FormControl>
                          <Input placeholder="Nurse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of birth</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) => {
                                if (date) field.onChange(date);
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
              </>
            )}
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button onClick={handleBack} variant="outline">
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button onClick={handleNext} disabled={!consentAcceptedAt}>
          {step === 1 ? "Start Assessment" : "Next"}
        </Button>
      </DialogFooter>
    </>
  );
}
