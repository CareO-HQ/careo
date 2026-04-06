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
  Plus,
  Edit,
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
  woundNumber?: number;
  evaluations?: Array<{
    id: string;
    photograph_date: string;
    photograph_url: string;
    signedUrl?: string;
    site_of_wound: string;
    length_cm?: number;
    width_cm?: number;
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
  woundNumber,
  evaluations = [],
  isLoadingEvaluations = false,
  onSaved,
}: Props) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);

  // Show new form by default if no evaluations exist
  React.useEffect(() => {
    if (evaluations.length === 0) {
      setShowNewForm(true);
    } else {
      setShowNewForm(false);
    }
  }, [evaluations.length]);

  // Reset image error when selected evaluation changes
  React.useEffect(() => {
    setImageError(false);
  }, [selectedEvaluationId]);

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

  const handleEditEvaluation = (evaluation: typeof evaluations[0]) => {
    // Parse site_of_wound to extract components
    // Format: "Main Site (LeftRight | ActualPosition | State | InnerOuter)"
    const siteText = evaluation.site_of_wound || "";
    let mainSite = siteText;
    let leftRight = "";
    let actualPosition = "";
    let state = "";
    let innerOuter = "";

    // Check if there are parentheses (additional info)
    if (siteText.includes("(") && siteText.includes(")")) {
      mainSite = siteText.split("(")[0].trim();
      const additionalInfo = siteText.split("(")[1].split(")")[0];
      const parts = additionalInfo.split("|").map(p => p.trim());

      // The order is: leftRight, actualPosition, state, innerOuter
      leftRight = parts[0] || "";
      actualPosition = parts[1] || "";
      state = parts[2] || "";
      innerOuter = parts[3] || "";
    }

    // Build measurement string from length and width
    let measurement = "";
    if (evaluation.length_cm && evaluation.width_cm) {
      measurement = `${evaluation.length_cm} x ${evaluation.width_cm} cm`;
    } else if (evaluation.length_cm) {
      measurement = `${evaluation.length_cm} cm`;
    }

    // Set form values with existing data
    form.reset({
      photographDate: evaluation.photograph_date ? new Date(evaluation.photograph_date) : new Date(),
      siteOfWound: mainSite,
      leftRight: leftRight,
      actualPosition: actualPosition,
      state: state,
      innerOuter: innerOuter,
      actualMeasurement: measurement,
      rgnSignature: evaluation.rgn_signature || profile?.name || "",
      comments: evaluation.comment || "",
    });

    // Set the existing photo as preview
    setPhotoPreview(evaluation.signedUrl || evaluation.photograph_url);
    setPhotoFile(null); // No file yet, using existing URL

    // Enter edit mode
    setEditingEvaluationId(evaluation.id);
    setShowNewForm(true);
  };

  const handleCancelEdit = () => {
    setEditingEvaluationId(null);
    setShowNewForm(false);
    form.reset({
      photographDate: new Date(),
      siteOfWound: "",
      leftRight: "",
      actualPosition: "",
      state: "",
      innerOuter: "",
      actualMeasurement: "",
      rgnSignature: profile?.name || "",
      comments: "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const onSubmit = async (values: PhotographEvaluationFormValues) => {
    if (!profile?.active_organization_id) {
      toast.error("No active organization found");
      return;
    }

    // When editing, photo is optional (can keep existing one)
    // When creating new, photo is required
    if (!editingEvaluationId && !photoFile) {
      toast.error("Please upload a photograph");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("=== Photograph Evaluation Submission ===");
      console.log("Form Data:", values);
      console.log("Edit Mode:", !!editingEvaluationId);

      let photographUrl = photoPreview; // Default to existing preview

      // Upload new photograph if provided
      if (photoFile) {
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

        photographUrl = publicUrl;
      }

      // Build site info
      const siteInfo = [
        values.leftRight,
        values.actualPosition,
        values.state,
        values.innerOuter
      ].filter(Boolean).join(" | ");

      const evaluationData = {
        wound_folder_id: woundFolderId,
        resident_id: residentId,
        organization_id: profile.active_organization_id,
        photograph_date: format(values.photographDate, "yyyy-MM-dd"),
        photograph_time: new Date().toTimeString().slice(0, 5),
        photograph_url: photographUrl,
        site_of_wound: `${values.siteOfWound}${siteInfo ? ` (${siteInfo})` : ""}`,
        length_cm: values.actualMeasurement ? parseFloat(values.actualMeasurement.split("x")[0]) : null,
        width_cm: values.actualMeasurement && values.actualMeasurement.includes("x")
          ? parseFloat(values.actualMeasurement.split("x")[1])
          : null,
        rgn_signature: values.rgnSignature,
        rgn_user_id: profile.id,
        comment: values.comments || null,
        created_by: profile.id,
      };

      // Update or insert based on edit mode
      if (editingEvaluationId) {
        const { error: dbError } = await supabase
          .from("wound_photograph_evaluations")
          .update(evaluationData)
          .eq("id", editingEvaluationId);

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`Failed to update: ${dbError.message}`);
          return;
        }

        console.log("✓ Successfully updated photograph evaluation");
        toast.success("Photograph evaluation updated successfully");
      } else {
        const { error: dbError } = await supabase
          .from("wound_photograph_evaluations")
          .insert(evaluationData);

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`Failed to save: ${dbError.message}`);
          return;
        }

        console.log("✓ Successfully saved photograph evaluation");
        toast.success("Photograph evaluation saved successfully");
      }

      // Reset form and close form
      handleCancelEdit();

      // Callback to parent
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Loading state */}
        {isLoadingEvaluations && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* New Evaluation Button */}
        {!isLoadingEvaluations && evaluations.length > 0 && !showNewForm && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowNewForm(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              New Evaluation
            </Button>
          </div>
        )}

        {/* New Evaluation Form (only for creating new, not editing) */}
        {!isLoadingEvaluations && showNewForm && !editingEvaluationId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-8 py-6 border-b border-gray-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    New Wound Evaluation
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Resident:</span> {residentName}
                  </p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Photograph Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                        <h3 className="text-base font-semibold text-gray-900">Photograph</h3>
                      </div>
                      <div className="">
                        {photoPreview ? (
                          <div className="space-y-3">
                            <div className="relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                              <img
                                src={photoPreview}
                                alt="Preview"
                                className="w-full max-h-[400px] object-contain"
                              />
                              {editingEvaluationId && !photoFile && (
                                <Badge className="absolute top-3 left-3 bg-blue-500 shadow-sm">
                                  Current Photo
                                </Badge>
                              )}
                              {photoFile && (
                                <Badge className="absolute top-3 left-3 bg-emerald-500 shadow-sm">
                                  New Photo
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <label htmlFor="photo-change" className="flex-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-gray-300 hover:bg-gray-50"
                                  asChild
                                >
                                  <span>
                                    <Upload className="w-4 h-4 mr-2" />
                                    {editingEvaluationId ? "Change Photo" : "Change"}
                                  </span>
                                </Button>
                                <input
                                  id="photo-change"
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoChange}
                                  className="hidden"
                                />
                              </label>
                              {!editingEvaluationId && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleRemovePhoto}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center min-h-[350px] flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                              <ImageIcon className="w-8 h-8 text-blue-500" />
                            </div>
                            <label htmlFor="photo-upload" className="cursor-pointer">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-semibold text-gray-900 mb-1">
                                  Upload wound photograph
                                </span>
                                <span className="text-xs text-gray-500">
                                  JPG, PNG or GIF (max 10MB)
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="mt-4"
                                  asChild
                                >
                                  <span>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Choose file
                                  </span>
                                </Button>
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
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                        <h3 className="text-base font-semibold text-gray-900">Evaluation Details</h3>
                      </div>

                      <div className="space-y-4">
                        {/* Date Field */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Date Photograph Taken</label>
                          <FormField
                            control={form.control}
                            name="photographDate"
                            render={({ field }) => (
                              <FormItem>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal h-10 border-gray-300",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                                        {field.value ? format(field.value, "dd/MM/yyyy") : <span>Select date</span>}
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

                        {/* Site of Wound Section */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-sm font-semibold text-gray-900">Site of Wound</h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-600">Left/Right</label>
                              <FormField
                                control={form.control}
                                name="leftRight"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        className="h-9 border-gray-300"
                                        placeholder="e.g., Left"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-600">Actual Position</label>
                              <FormField
                                control={form.control}
                                name="actualPosition"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        className="h-9 border-gray-300"
                                        placeholder="e.g., Heel"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-600">State</label>
                              <FormField
                                control={form.control}
                                name="state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        className="h-9 border-gray-300"
                                        placeholder="e.g., Grade 2"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-600">Inner/Outer</label>
                              <FormField
                                control={form.control}
                                name="innerOuter"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        className="h-9 border-gray-300"
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

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600">Wound Location <span className="text-red-500">*</span></label>
                            <FormField
                              control={form.control}
                              name="siteOfWound"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      className="h-9 border-gray-300"
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

                        {/* Measurement */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-600">Actual Measurement</label>
                          <FormField
                            control={form.control}
                            name="actualMeasurement"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    className="h-9 border-gray-300"
                                    placeholder="e.g., 2 x 1.5 cm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* RGN Signature */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-600">RGN Signature <span className="text-red-500">*</span></label>
                          <FormField
                            control={form.control}
                            name="rgnSignature"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    className="h-9 border-gray-300"
                                    placeholder="Your name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                        {/* Comments */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-600">Comments</label>
                          <FormField
                            control={form.control}
                            name="comments"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    className="min-h-[100px] border-gray-300 resize-none"
                                    placeholder="Additional notes or observations..."
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

                {/* Submit Button */}
                <div className="border-t border-gray-200/60 px-8 py-5 bg-gray-50/50 flex justify-between items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="px-6">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingEvaluationId ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingEvaluationId ? "Update Evaluation" : "Save Evaluation"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Existing Evaluations List */}
        {!isLoadingEvaluations && evaluations.length > 0 && (
          <div className="space-y-6">
            {!showNewForm && evaluations.length > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                <h3 className="font-semibold text-foreground mb-2">Previous Evaluations</h3>
                <p>{evaluations.length} {evaluations.length === 1 ? "evaluation" : "evaluations"} recorded</p>
              </div>
            )}

            {evaluations.map((evaluation, index) => {
              const isEditing = editingEvaluationId === evaluation.id;

              return (
              <div key={evaluation.id} className="bg-white border rounded-lg shadow-sm">
                {!isEditing ? (
                  <>
                    {/* Display View Header */}
                    <div className="border-b bg-slate-50 px-6 py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold">WOUND PHOTOGRAPHIC EVALUATION</h2>
                          {woundNumber && (
                            <Badge variant="outline" className="font-mono font-semibold text-base">
                              Wound #{woundNumber}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            Evaluation #{evaluations.length - index}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEvaluation(evaluation)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Resident:</span> {residentName}
                      </div>
                    </div>

                    {/* Display View Content */}
                    <div className="p-6">
                  {/* Single border around both sections */}
                  <div className="border-2 border-black">
                    <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x-2 lg:divide-black">
                      {/* Insert Photograph Section */}
                      <div>
                        <div className="bg-slate-100 border-b-2 border-black px-3 py-2">
                          <div className="font-bold text-sm">Insert Photograph</div>
                        </div>
                        <div className="p-4 flex items-center justify-center min-h-[300px]">
                          {(evaluation.signedUrl || evaluation.photograph_url) ? (
                            <img
                              src={evaluation.signedUrl || evaluation.photograph_url}
                              alt="Wound photograph"
                              className="max-w-full max-h-[400px] object-contain"
                              onError={(e) => {
                                console.error("Failed to load image for evaluation:", evaluation.id, {
                                  signedUrl: evaluation.signedUrl,
                                  photograph_url: evaluation.photograph_url
                                });
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `
                                  <div class="text-center text-muted-foreground">
                                    <svg class="w-16 h-16 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <p class="text-sm">Failed to load photograph</p>
                                    <p class="text-xs mt-2">Image may have been deleted or moved</p>
                                  </div>
                                `;
                              }}
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
                      <div>
                        <div className="bg-slate-100 border-b-2 border-black px-4 py-2">
                          <div className="font-bold text-sm">Evaluation Details</div>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Date Photograph taken</div>
                            <div className="text-base font-medium">
                              {evaluation.photograph_date
                                ? format(new Date(evaluation.photograph_date), "dd/MM/yyyy")
                                : "N/A"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Site of Wound</div>
                            <div className="text-base font-medium">{evaluation.site_of_wound}</div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-1">RGN Signature</div>
                            <div className="text-base font-medium">{evaluation.rgn_signature}</div>
                          </div>

                          {evaluation.comment && (
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-1">Comments</div>
                              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                                {evaluation.comment}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                      <div className="mt-6 flex justify-between">
                        <Badge variant="secondary" className="text-xs">
                          Recorded: {evaluation.created_at
                            ? format(new Date(evaluation.created_at), "dd MMM yyyy HH:mm")
                            : "Unknown"}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit View - Inline Form */}
                    <div className="border-b bg-slate-50 px-6 py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold">EDIT WOUND PHOTOGRAPHIC EVALUATION</h2>
                          {woundNumber && (
                            <Badge variant="outline" className="font-mono font-semibold text-base">
                              Wound #{woundNumber}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary">Editing</Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Resident:</span> {residentName}
                      </div>
                    </div>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="p-6">
                          {/* Single border around both sections */}
                          <div className="border-2 border-black">
                            <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x-2 lg:divide-black">
                              {/* Insert Photograph Section */}
                              <div>
                                <div className="bg-slate-100 border-b-2 border-black px-3 py-2">
                                  <div className="font-bold text-sm">Insert Photograph</div>
                                </div>
                                <div className="p-4">
                                  {photoPreview ? (
                                    <div className="space-y-3">
                                      <div className="relative">
                                        <img
                                          src={photoPreview}
                                          alt="Preview"
                                          className="w-full max-h-[400px] object-contain border-2 border-gray-300"
                                        />
                                        {editingEvaluationId && !photoFile && (
                                          <Badge className="absolute top-2 left-2 bg-blue-500">
                                            Current Photo
                                          </Badge>
                                        )}
                                        {photoFile && (
                                          <Badge className="absolute top-2 left-2 bg-green-500">
                                            New Photo
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <label htmlFor="photo-change-inline" className="flex-1">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            asChild
                                          >
                                            <span>
                                              <Upload className="w-4 h-4 mr-2" />
                                              Change Photo
                                            </span>
                                          </Button>
                                          <input
                                            id="photo-change-inline"
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                                      <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                                      <label htmlFor="photo-upload-inline" className="cursor-pointer">
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
                                          id="photo-upload-inline"
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
                              <div>
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
                        </div>

                        <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSubmitting} size="lg">
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Update Evaluation
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
