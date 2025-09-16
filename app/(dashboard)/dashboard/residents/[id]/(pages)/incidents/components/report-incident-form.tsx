"use client";

import React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { CalendarIcon, Clock, MapPin, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const IncidentSchema = z.object({
  type: z.enum([
    "fall",
    "medication_error",
    "injury",
    "behavioral",
    "skin_integrity",
    "infection_control",
    "wandering",
    "aggression",
    "property_damage",
    "dietary",
    "other"
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  witnesses: z.string().optional(),
  description: z.string().min(10, "Please provide a detailed description"),
  immediateAction: z.string().min(5, "Please describe actions taken"),
  medicalAttention: z.enum(["yes", "no", "pending"]),
  doctorNotified: z.boolean(),
  familyNotified: z.boolean(),
  injuriesNoted: z.string().optional(),
  followUpRequired: z.string().optional(),
  preventativeMeasures: z.string().optional(),
  reportedBy: z.string().min(1, "Reporter name is required"),
  reporterRole: z.string().min(1, "Reporter role is required"),
});

interface ReportIncidentFormProps {
  residentId: string;
  residentName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReportIncidentForm({
  residentId,
  residentName,
  isOpen,
  onClose,
  onSuccess
}: ReportIncidentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const createIncident = useMutation(api.incidents.create);

  const form = useForm<z.infer<typeof IncidentSchema>>({
    resolver: zodResolver(IncidentSchema),
    defaultValues: {
      type: "fall",
      severity: "low",
      date: new Date(),
      time: format(new Date(), "HH:mm"),
      location: "",
      witnesses: "",
      description: "",
      immediateAction: "",
      medicalAttention: "no",
      doctorNotified: false,
      familyNotified: false,
      injuriesNoted: "",
      followUpRequired: "",
      preventativeMeasures: "",
      reportedBy: "",
      reporterRole: "",
    },
  });

  async function onSubmit(values: z.infer<typeof IncidentSchema>) {
    try {
      setIsSubmitting(true);
      
      await createIncident({
        residentId: residentId as Id<"residents">,
        type: values.type,
        severity: values.severity,
        date: values.date.toISOString(),
        time: values.time,
        location: values.location,
        witnesses: values.witnesses || "",
        description: values.description,
        immediateAction: values.immediateAction,
        medicalAttention: values.medicalAttention,
        doctorNotified: values.doctorNotified,
        familyNotified: values.familyNotified,
        injuriesNoted: values.injuriesNoted || "",
        followUpRequired: values.followUpRequired || "",
        preventativeMeasures: values.preventativeMeasures || "",
        reportedBy: values.reportedBy,
        reporterRole: values.reporterRole,
      });

      toast.success("Incident report submitted successfully");
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting incident report:", error);
      toast.error("Failed to submit incident report");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
          <DialogDescription>
            Document an incident involving {residentName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fall">Fall</SelectItem>
                        <SelectItem value="medication_error">Medication Error</SelectItem>
                        <SelectItem value="injury">Injury</SelectItem>
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="skin_integrity">Skin Integrity</SelectItem>
                        <SelectItem value="infection_control">Infection Control</SelectItem>
                        <SelectItem value="wandering">Wandering/Elopement</SelectItem>
                        <SelectItem value="aggression">Aggression</SelectItem>
                        <SelectItem value="property_damage">Property Damage</SelectItem>
                        <SelectItem value="dietary">Dietary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
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
                    <FormLabel>Date of Incident</FormLabel>
                    <Popover>
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
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
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
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time of Incident</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="time"
                          {...field}
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="e.g., Bedroom, Dining Room, Bathroom"
                          {...field}
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="witnesses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Witnesses (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Names of witnesses, if any"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description of Incident</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed description of what happened..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="immediateAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Immediate Action Taken</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the immediate actions taken after the incident..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="medicalAttention"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Attention Required</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="pending">Pending Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctorNotified"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor Notified</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      defaultValue={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="familyNotified"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Notified</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      defaultValue={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="injuriesNoted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Injuries Noted (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe any injuries observed..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="followUpRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Required (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe any follow-up actions needed..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preventativeMeasures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preventative Measures (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Suggest measures to prevent similar incidents..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reportedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reported By</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Your name"
                          {...field}
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reporterRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporter Role</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Nurse, Care Assistant"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}