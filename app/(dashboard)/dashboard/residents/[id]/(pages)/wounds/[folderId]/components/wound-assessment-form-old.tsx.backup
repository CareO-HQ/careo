"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile } from "@/hooks/use-profile";
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
  FormDescription,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Time options in 15-minute intervals
const TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 15) {
      options.push(
        `${i.toString().padStart(2, "0")}:${j.toString().padStart(2, "0")}`
      );
    }
  }
  return options;
})();

// Zod Schema for Wound Assessment
const WoundAssessmentSchema = z.object({
  // Assessment Details
  assessmentDate: z.date(),
  assessmentTime: z.string().min(1, "Time is required"),

  // Wound Measurements
  lengthCm: z.string().optional(),
  widthCm: z.string().optional(),
  depthCm: z.string().optional(),

  // Wound Bed Description
  woundBedDescription: z.string().optional(),
  woundBedPercentage: z.object({
    granulation: z.string().optional(),
    slough: z.string().optional(),
    necrotic: z.string().optional(),
    epithelializing: z.string().optional(),
  }).optional(),

  // Exudate
  exudateType: z.string().optional(),
  exudateAmount: z.string().optional(),

  // Surrounding Skin
  surroundingSkinCondition: z.string().optional(),

  // Odor
  odor: z.string().optional(),

  // Pain
  painLevel: z.string().optional(),
  painDescription: z.string().optional(),

  // Infection Signs
  infectionSigns: z.string().optional(),

  // Treatment
  treatmentApplied: z.string().optional(),
  dressingType: z.string().optional(),
  dressingFrequency: z.string().optional(),

  // Progress Notes
  progressNotes: z.string().min(10, "Please provide progress notes"),

  // Next Review
  nextReviewDate: z.date().optional(),

  // Assessor Details
  assessedByName: z.string().min(1, "Assessor name is required"),
  assessedByJobTitle: z.string().min(1, "Job title is required"),
});

type WoundAssessmentData = z.infer<typeof WoundAssessmentSchema>;

type WoundAssessmentFormProps = {
  residentId: string;
  folderId: string;
  woundId: string;
  residentName: string;
  onSaved: () => void;
};

export function WoundAssessmentForm({
  residentId,
  folderId,
  woundId,
  residentName,
  onSaved,
}: WoundAssessmentFormProps) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<WoundAssessmentData>({
    resolver: zodResolver(WoundAssessmentSchema),
    defaultValues: {
      assessmentDate: new Date(),
      assessmentTime: format(new Date(), "HH:mm"),
      assessedByName: profile?.name || "",
      assessedByJobTitle: profile?.role || "",
    },
  });

  const onSubmit = async (data: WoundAssessmentData) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Combine date and time
      const assessmentDateTime = new Date(data.assessmentDate);
      const [hours, minutes] = data.assessmentTime.split(":").map(Number);
      assessmentDateTime.setHours(hours, minutes);

      // Create wound assessment record
      const { error } = await supabase
        .from("wound_assessments")
        .insert({
          wound_id: woundId,
          resident_id: residentId,
          assessment_date: assessmentDateTime.toISOString(),
          length_cm: data.lengthCm ? parseFloat(data.lengthCm) : null,
          width_cm: data.widthCm ? parseFloat(data.widthCm) : null,
          depth_cm: data.depthCm ? parseFloat(data.depthCm) : null,
          wound_bed_description: data.woundBedDescription,
          wound_bed_percentage: data.woundBedPercentage || null,
          exudate_type: data.exudateType,
          exudate_amount: data.exudateAmount,
          surrounding_skin_condition: data.surroundingSkinCondition,
          odor: data.odor,
          pain_level: data.painLevel ? parseInt(data.painLevel) : null,
          pain_description: data.painDescription,
          infection_signs: data.infectionSigns,
          treatment_applied: data.treatmentApplied,
          dressing_type: data.dressingType,
          dressing_frequency: data.dressingFrequency,
          progress_notes: data.progressNotes,
          next_review_date: data.nextReviewDate?.toISOString().split("T")[0] || null,
          assessed_by: data.assessedByName,
          assessed_by_id: user.id,
          assessed_by_job_title: data.assessedByJobTitle,
        });

      if (error) throw error;

      // Update wound's last_reviewed_date
      await supabase
        .from("wounds")
        .update({
          last_reviewed_date: new Date().toISOString().split("T")[0],
          last_reviewed_by: data.assessedByName,
          last_reviewed_by_id: user.id,
          expected_next_review: data.nextReviewDate?.toISOString().split("T")[0] || null,
        })
        .eq("id", woundId);

      toast.success("Wound assessment saved successfully");
      onSaved();
    } catch (error: any) {
      console.error("Error saving wound assessment:", error);
      toast.error(error?.message || "Failed to save wound assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Wound Assessment</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Document wound assessment for {residentName}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Assessment Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assessment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assessmentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Assessment Date</FormLabel>
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
                    name="assessmentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Wound Measurements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wound Measurements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="lengthCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="widthCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="depthCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Depth (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Wound Bed Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wound Bed Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="woundBedDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wound Bed Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the wound bed appearance..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="exudateType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exudate Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="serous">Serous (clear/pale yellow)</SelectItem>
                            <SelectItem value="sanguineous">Sanguineous (blood-stained)</SelectItem>
                            <SelectItem value="serosanguineous">Serosanguineous (pale red)</SelectItem>
                            <SelectItem value="purulent">Purulent (thick, yellow/green)</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exudateAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exudate Amount</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select amount" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="heavy">Heavy</SelectItem>
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
                    name="surroundingSkinCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surrounding Skin</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="intact">Intact</SelectItem>
                            <SelectItem value="erythema">Erythema (redness)</SelectItem>
                            <SelectItem value="macerated">Macerated</SelectItem>
                            <SelectItem value="dry">Dry/Flaky</SelectItem>
                            <SelectItem value="swollen">Swollen/Edematous</SelectItem>
                            <SelectItem value="discolored">Discolored</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="odor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select odor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="mild">Mild</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="strong">Strong</SelectItem>
                            <SelectItem value="foul">Foul</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pain Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pain Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="painLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pain Level (0-10)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pain level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 11 }, (_, i) => i).map((level) => (
                              <SelectItem key={level} value={level.toString()}>
                                {level} - {level === 0 ? "No pain" : level <= 3 ? "Mild" : level <= 6 ? "Moderate" : "Severe"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="painDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pain Description</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., sharp, dull, throbbing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Treatment & Dressing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Treatment & Dressing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="treatmentApplied"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment Applied</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe treatment and cleansing method..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dressingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dressing Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Hydrocolloid, Foam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dressingFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dressing Change Frequency</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Daily, Every 3 days" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="infectionSigns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signs of Infection</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Document any signs of infection..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Note: redness, swelling, heat, purulent discharge, increased pain
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Progress Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="progressNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Document wound progress, changes, concerns..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextReviewDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Next Review Date</FormLabel>
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Assessor Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assessor Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assessedByName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessed By (Full Name)</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assessedByJobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Your job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Assessment"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
