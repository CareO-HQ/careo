"use client";

import React, { useState } from "react";
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
import {
  CalendarIcon,
  Upload,
  Save,
  Loader2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Zod Schema ---
const PhotographEvaluationSchema = z.object({
  photographDate: z.date(),
  siteOfWound: z.string().min(1, "Site of wound is required"),
  leftRight: z.string().optional(),
  actualPosition: z.string().optional(),
  state: z.string().optional(),
  innerOuter: z.string().optional(),
  actualMeasurement: z.string().optional(),
  rgnSignature: z.string().min(1, "RGN signature is required"),
  comments: z.string().optional(),
});

type PhotographEvaluationFormValues = z.infer<typeof PhotographEvaluationSchema>;

type Props = {
  woundFolderId: string;
  residentId: string;
  residentName: string;
  evaluations?: Array<{
    id: string;
    photograph_date: string;
    photograph_url: string;
    site_of_wound: string;
    rgn_signature: string;
    comment?: string;
    created_at: string;
  }>;
  isLoadingEvaluations?: boolean;
  onSaved?: () => void;
};

export function PhotographEvaluationForm({
  woundFolderId,
  residentId,
  residentName,
  evaluations = [],
  isLoadingEvaluations = false,
  onSaved,
}: Props) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);

  // Auto-select first evaluation if it exists
  React.useEffect(() => {
    if (evaluations.length > 0 && !selectedEvaluationId) {
      setSelectedEvaluationId(evaluations[0].id);
    }
  }, [evaluations, selectedEvaluationId]);

  const form = useForm<PhotographEvaluationFormValues>({
    resolver: zodResolver(PhotographEvaluationSchema),
    defaultValues: {
      photographDate: new Date(),
      siteOfWound: "",
      leftRight: "",
      actualPosition: "",
      state: "",
      innerOuter: "",
      actualMeasurement: "",
      rgnSignature: profile?.name || "",
      comments: "",
    },
  });

  // Update RGN signature when profile loads
  React.useEffect(() => {
    if (profile?.name && !form.getValues("rgnSignature")) {
      form.setValue("rgnSignature", profile.name);
    }
  }, [profile?.name, form]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB");
        return;
      }

      setPhotoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const onSubmit = async (values: PhotographEvaluationFormValues) => {
    if (!photoFile) {
      toast.error("Please upload a photograph");
      return;
    }

    if (!profile?.active_organization_id) {
      toast.error("No active organization found");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("=== Photograph Evaluation Submission ===");
      console.log("Form Data:", values);

      // Upload photograph to storage
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${woundFolderId}/${Date.now()}.${fileExt}`;
      const filePath = `wound-photographs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("wound-photos")
        .upload(filePath, photoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload photograph");
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("wound-photos")
        .getPublicUrl(filePath);

      // Build site info
      const siteInfo = [
        values.leftRight,
        values.actualPosition,
        values.state,
        values.innerOuter
      ].filter(Boolean).join(" | ");

      // Save evaluation to database
      const { error: dbError } = await supabase
        .from("wound_photograph_evaluations")
        .insert({
          wound_folder_id: woundFolderId,
          resident_id: residentId,
          organization_id: profile.active_organization_id,
          photograph_date: format(values.photographDate, "yyyy-MM-dd"),
          photograph_time: new Date().toTimeString().slice(0, 5),
          photograph_url: publicUrl,
          site_of_wound: `${values.siteOfWound}${siteInfo ? ` (${siteInfo})` : ""}`,
          length_cm: values.actualMeasurement ? parseFloat(values.actualMeasurement.split("x")[0]) : null,
          width_cm: values.actualMeasurement && values.actualMeasurement.includes("x")
            ? parseFloat(values.actualMeasurement.split("x")[1])
            : null,
          rgn_signature: values.rgnSignature,
          rgn_user_id: profile.id,
          comment: values.comments || null,
          created_by: profile.id,
        });

      if (dbError) {
        console.error("Database error:", dbError);
        toast.error(`Failed to save: ${dbError.message}`);
        return;
      }

      console.log("✓ Successfully saved photograph evaluation");
      toast.success("Photograph evaluation saved successfully");

      // Reset form
      form.reset();
      handleRemovePhoto();

      // Callback to parent
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // View selected evaluation
  const selectedEvaluation = evaluations.find((e) => e.id === selectedEvaluationId);

  // Determine what to show
  const showNewForm = evaluations.length === 0 && !selectedEvaluationId;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-6xl mx-auto p-6">
        {/* Loading state */}
        {isLoadingEvaluations && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Selected Evaluation Viewer */}
        {!isLoadingEvaluations && selectedEvaluationId && selectedEvaluation && (
          <div className="bg-white border rounded-lg shadow-sm">
            {/* Header */}
            <div className="border-b bg-slate-50 px-6 py-4">
              <h1 className="text-2xl font-bold text-center">WOUND PHOTOGRAPHIC EVALUATION</h1>
              <div className="mt-2 text-sm text-center text-muted-foreground">
                <span className="font-semibold">Resident:</span> {residentName}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Insert Photograph Section */}
                <div className="border-2 border-black">
                  <div className="bg-slate-100 border-b-2 border-black px-3 py-2">
                    <div className="font-bold text-sm">Insert Photograph</div>
                  </div>
                  <div className="p-4 flex items-center justify-center min-h-[300px]">
                    {selectedEvaluation.photograph_url ? (
                      <img
                        src={selectedEvaluation.photograph_url}
                        alt="Wound photograph"
                        className="max-w-full max-h-[400px] object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No photograph available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evaluation Details */}
                <div className="border-2 border-black">
                  <div className="divide-y divide-gray-300">
                    <div className="px-3 py-2 bg-slate-100 border-b-2 border-black">
                      <div className="font-bold text-sm">Evaluation Details</div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-300">
                      <div className="px-3 py-2 text-xs font-medium">Date Photograph taken</div>
                      <div className="px-3 py-2 text-sm">
                        {selectedEvaluation.photograph_date
                          ? format(new Date(selectedEvaluation.photograph_date), "dd/MM/yyyy")
                          : "N/A"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-300">
                      <div className="px-3 py-2 text-xs font-medium">Site of Wound</div>
                      <div className="px-3 py-2 text-sm">{selectedEvaluation.site_of_wound}</div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-300">
                      <div className="px-3 py-2 text-xs font-medium">RGN Signature</div>
                      <div className="px-3 py-2 text-sm">{selectedEvaluation.rgn_signature}</div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-300">
                      <div className="px-3 py-2 text-xs font-medium">Comments</div>
                      <div className="px-3 py-2 text-sm">{selectedEvaluation.comment || "None"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Badge variant="secondary" className="text-xs">
                  Recorded: {selectedEvaluation.created_at
                    ? format(new Date(selectedEvaluation.created_at), "dd MMM yyyy HH:mm")
                    : "Unknown"}
                </Badge>
                {evaluations.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    Showing 1 of {evaluations.length} evaluations
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Evaluation Form */}
        {!isLoadingEvaluations && showNewForm && (
          <div className="bg-white border rounded-lg shadow-sm">
            {/* Header */}
            <div className="border-b bg-slate-50 px-6 py-4">
              <h1 className="text-2xl font-bold text-center">WOUND PHOTOGRAPHIC EVALUATION</h1>
              <div className="mt-2 text-sm text-center text-muted-foreground">
                <span className="font-semibold">Resident:</span> {residentName}
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Insert Photograph Section */}
                    <div className="border-2 border-black">
                      <div className="bg-slate-100 border-b-2 border-black px-3 py-2">
                        <div className="font-bold text-sm">Insert Photograph</div>
                      </div>
                      <div className="p-4">
                        {photoPreview ? (
                          <div className="relative">
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="w-full max-h-[400px] object-contain border-2 border-gray-300"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={handleRemovePhoto}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                            <label htmlFor="photo-upload" className="cursor-pointer">
                              <div className="flex flex-col items-center">
                                <Upload className="w-8 h-8 mb-2 text-primary" />
                                <span className="text-sm font-medium text-primary">
                                  Click to upload photograph
                                </span>
                                <span className="text-xs text-muted-foreground mt-1">
                                  JPG, PNG or GIF (max 10MB)
                                </span>
                              </div>
                              <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="border-2 border-black">
                      <div className="divide-y divide-gray-300">
                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-2 text-xs font-medium border-r border-gray-300 bg-slate-50">
                            Date Photograph taken
                          </div>
                          <div className="px-3 py-2">
                            <FormField
                              control={form.control}
                              name="photographDate"
                              render={({ field }) => (
                                <FormItem>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="ghost"
                                          className={cn(
                                            "h-6 text-xs w-full justify-start text-left font-normal p-0 hover:bg-transparent",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value ? format(field.value, "dd/MM/yyyy") : <span>Select date</span>}
                                          <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => date > new Date()}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="px-3 py-2 bg-slate-50 font-bold text-xs">Site of Wound</div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">
                            Left/Right
                          </div>
                          <div className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name="leftRight"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                      placeholder="e.g., Left"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">
                            Actual Position
                          </div>
                          <div className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name="actualPosition"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                      placeholder="e.g., Heel"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">State</div>
                          <div className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                      placeholder="e.g., Grade 2"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">
                            Inner/Outer
                          </div>
                          <div className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name="innerOuter"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                      placeholder="e.g., Inner"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">
                            Wound Location *
                          </div>
                          <div className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name="siteOfWound"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                      placeholder="e.g., Right Elbow"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">
                            Actual Measurement
                          </div>
                          <div className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name="actualMeasurement"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                      placeholder="e.g., 2 x 1.5 cm"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-1.5 text-xs font-medium border-r border-gray-300">
                            RGN Signature *
                          </div>
                          <div className="px-3 py-1.5">
                            <FormField
                              control={form.control}
                              name="rgnSignature"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-6 text-xs border-0 p-0 focus-visible:ring-0"
                                      placeholder="Your name"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                          <div className="px-3 py-2 text-xs font-medium border-r border-gray-300">Comments</div>
                          <div className="px-3 py-2">
                            <FormField
                              control={form.control}
                              name="comments"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      className="min-h-[80px] text-xs border-0 p-0 focus-visible:ring-0 resize-none"
                                      placeholder="Additional notes..."
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="border-t px-6 py-4 bg-slate-50 flex justify-end">
                  <Button type="submit" disabled={isSubmitting} size="lg">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Evaluation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
