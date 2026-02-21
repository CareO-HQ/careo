"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
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
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SimpleIncidentSchema = z.object({
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  incidentType: z.string().min(1, "Incident type is required"),
  description: z.string().min(10, "Please provide a detailed description"),
  severity: z.enum(["minor", "moderate", "severe"]),
  actionTaken: z.string().optional(),
  reportedBy: z.string().min(1, "Reporter name is required"),
});

type SimpleIncidentFormData = z.infer<typeof SimpleIncidentSchema>;

interface SimpleIncidentFormProps {
  residentId: string;
  folderId: string;
  residentName: string;
  onSaved?: () => void;
}

export function SimpleIncidentForm({
  residentId,
  folderId,
  residentName,
  onSaved,
}: SimpleIncidentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SimpleIncidentFormData>({
    resolver: zodResolver(SimpleIncidentSchema),
    defaultValues: {
      date: new Date(),
      time: format(new Date(), "HH:mm"),
      location: "",
      incidentType: "",
      description: "",
      severity: "minor",
      actionTaken: "",
      reportedBy: "",
    },
  });

  const onSubmit = async (data: SimpleIncidentFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("incidents").insert({
        resident_id: residentId,
        date: format(data.date, "yyyy-MM-dd"),
        time: data.time,
        home_name: data.location,
        incident_types: [data.incidentType],
        detailed_description: data.description,
        incident_level: data.severity === "minor" ? "no_harm" : data.severity === "moderate" ? "minor_injury" : "permanent_harm",
        treatment_details: data.actionTaken || "",
        completed_by_full_name: data.reportedBy,
        date_completed: format(new Date(), "yyyy-MM-dd"),
      });

      if (error) throw error;

      toast.success("Incident report saved successfully");
      form.reset();
      onSaved?.();
    } catch (error) {
      console.error("Error saving incident:", error);
      toast.error("Failed to save incident report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Simple Incident Report
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Report for: <strong>{residentName}</strong>
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
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
                      <FormLabel>Time *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Room 101, Dining Room" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Incident Type and Severity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="incidentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fall">Fall</SelectItem>
                          <SelectItem value="medication_error">Medication Error</SelectItem>
                          <SelectItem value="injury">Injury</SelectItem>
                          <SelectItem value="behavioral">Behavioral Incident</SelectItem>
                          <SelectItem value="equipment">Equipment Failure</SelectItem>
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
                      <FormLabel>Severity *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="severe">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of what happened..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Taken */}
              <FormField
                control={form.control}
                name="actionTaken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Taken</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe any immediate actions taken..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reported By */}
              <FormField
                control={form.control}
                name="reportedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reported By *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Report
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
