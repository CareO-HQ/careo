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
import { Label } from "@/components/ui/label";
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
  Camera,
  Save,
  Plus,
  X,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Zod Schema ---
const PhotographEvaluationSchema = z.object({
  photographDate: z.date(),
  photographTime: z.string().min(1, "Time is required"),
  siteOfWound: z.string().min(1, "Site of wound is required"),
  lengthCm: z.string().optional(),
  widthCm: z.string().optional(),
  depthCm: z.string().optional(),
  rgnSignature: z.string().min(1, "RGN signature is required"),
  comment: z.string().optional(),
});

type PhotographEvaluationFormValues = z.infer<typeof PhotographEvaluationSchema>;

type Props = {
  woundFolderId: string;
  residentId: string;
  residentName: string;
  evaluations?: any[];
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
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<{ id: string; url: string } | null>(null);

  const form = useForm<PhotographEvaluationFormValues>({
    resolver: zodResolver(PhotographEvaluationSchema),
    defaultValues: {
      photographDate: new Date(),
      photographTime: new Date().toTimeString().slice(0, 5),
      siteOfWound: "",
      lengthCm: "",
      widthCm: "",
      depthCm: "",
      rgnSignature: profile?.name || "",
      comment: "",
    },
  });

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
      // Upload photograph to storage
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${woundFolderId}/${Date.now()}.${fileExt}`;
      const filePath = `wound-photographs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
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

      // Save evaluation to database
      const { error: dbError } = await supabase
        .from("wound_photograph_evaluations")
        .insert({
          wound_folder_id: woundFolderId,
          resident_id: residentId,
          organization_id: profile.active_organization_id,
          photograph_date: format(values.photographDate, "yyyy-MM-dd"),
          photograph_time: values.photographTime,
          photograph_url: publicUrl,
          site_of_wound: values.siteOfWound,
          length_cm: values.lengthCm ? parseFloat(values.lengthCm) : null,
          width_cm: values.widthCm ? parseFloat(values.widthCm) : null,
          depth_cm: values.depthCm ? parseFloat(values.depthCm) : null,
          rgn_signature: values.rgnSignature,
          rgn_user_id: profile.id,
          comment: values.comment || null,
          created_by: profile.id,
        });

      if (dbError) {
        console.error("Database error:", dbError);
        toast.error("Failed to save evaluation");
        return;
      }

      toast.success("Photograph evaluation saved successfully");

      // Reset form
      form.reset({
        photographDate: new Date(),
        photographTime: new Date().toTimeString().slice(0, 5),
        siteOfWound: "",
        lengthCm: "",
        widthCm: "",
        depthCm: "",
        rgnSignature: profile?.name || "",
        comment: "",
      });
      handleRemovePhoto();
      setShowNewForm(false);

      // Callback to parent
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (evaluationId: string, photographUrl: string) => {
    setEvaluationToDelete({ id: evaluationId, url: photographUrl });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!evaluationToDelete) return;

    setDeletingId(evaluationToDelete.id);

    try {
      // Extract file path from URL
      const urlParts = evaluationToDelete.url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const folderPath = urlParts[urlParts.length - 2];
      const filePath = `wound-photographs/${folderPath}/${fileName}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("wound-photos")
        .remove([filePath]);

      if (storageError) {
        console.warn("Storage deletion warning:", storageError);
        // Continue even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("wound_photograph_evaluations")
        .delete()
        .eq("id", evaluationToDelete.id);

      if (dbError) {
        console.error("Database error:", dbError);
        toast.error("Failed to delete evaluation");
        return;
      }

      toast.success("Photograph evaluation deleted successfully");

      // Callback to refresh
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error("Error deleting evaluation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setEvaluationToDelete(null);
    }
  };

  const selectedEvaluation = selectedEvaluationId
    ? evaluations.find((e) => e.id === selectedEvaluationId)
    : null;

  return (
    <div className="h-full flex flex-col p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold">Photograph Evaluations</h3>
        </div>
        {!showNewForm && (
          <Button onClick={() => setShowNewForm(true)} size="sm" className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
        )}
      </div>

      {/* New Evaluation Form */}
      {showNewForm && (
        <Card className="border border-blue-200 flex-shrink-0">
          <CardHeader className="bg-blue-50 py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">New Evaluation</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setShowNewForm(false);
                  form.reset();
                  handleRemovePhoto();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                {/* Photograph Upload */}
                <div className="space-y-1">
                  <Label className="text-xs">Photograph *</Label>
                  {!photoPreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <Camera className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-600">Click to upload</p>
                        <p className="text-[10px] text-gray-400">PNG, JPG up to 10MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative border border-blue-200 rounded-lg p-1">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="rounded object-cover mx-auto w-full h-32"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemovePhoto}
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="photographDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 text-xs pl-2 text-left font-normal w-full",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yy")
                                ) : (
                                  <span>Date</span>
                                )}
                                <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
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
                    name="photographTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Time *</FormLabel>
                        <FormControl>
                          <Input type="time" className="h-8 text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Site of Wound */}
                <FormField
                  control={form.control}
                  name="siteOfWound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Site of Wound *</FormLabel>
                      <FormControl>
                        <Input className="h-8 text-xs" placeholder="e.g., Left heel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Actual Measurements */}
                <div className="space-y-1">
                  <Label className="text-xs">Measurements (cm)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="lengthCm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">Length</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              className="h-7 text-xs"
                              {...field}
                            />
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
                          <FormLabel className="text-[10px]">Width</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              className="h-7 text-xs"
                              {...field}
                            />
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
                          <FormLabel className="text-[10px]">Depth</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              className="h-7 text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* RGN Signature */}
                <FormField
                  control={form.control}
                  name="rgnSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">RGN Signature *</FormLabel>
                      <FormControl>
                        <Input className="h-8 text-xs" placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Comment */}
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Comment</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes..."
                          rows={2}
                          className="text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowNewForm(false);
                      form.reset();
                      handleRemovePhoto();
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-7 text-xs" disabled={isSubmitting || !photoFile}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Evaluations List */}
      <div className="flex-1 min-h-0 flex flex-col border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-3 py-2 border-b flex-shrink-0">
          <h4 className="text-xs font-semibold">Previous Evaluations ({evaluations.length})</h4>
        </div>
        <div className="flex-1 overflow-auto p-3">
          {isLoadingEvaluations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-xs">No evaluations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
                {evaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className={cn(
                      "border rounded-lg p-2 hover:bg-gray-50 transition-colors relative group",
                      selectedEvaluationId === evaluation.id && "ring-1 ring-blue-500"
                    )}
                  >
                    <div className="flex gap-2 cursor-pointer" onClick={() => setSelectedEvaluationId(evaluation.id)}>
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <img
                          src={evaluation.photograph_url}
                          alt="Wound"
                          className="rounded object-cover border w-16 h-16"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-semibold truncate">{evaluation.site_of_wound}</p>
                          <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">{evaluation.rgn_signature}</Badge>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {format(new Date(evaluation.photograph_date), "dd MMM yyyy")} {evaluation.photograph_time}
                        </p>

                        {(evaluation.length_cm || evaluation.width_cm || evaluation.depth_cm) && (
                          <p className="text-[10px] text-gray-600">
                            {evaluation.length_cm && `L:${evaluation.length_cm} `}
                            {evaluation.width_cm && `W:${evaluation.width_cm} `}
                            {evaluation.depth_cm && `D:${evaluation.depth_cm}cm`}
                          </p>
                        )}

                        {evaluation.comment && (
                          <p className="text-[10px] text-gray-600 italic truncate">{evaluation.comment}</p>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute bottom-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(evaluation.id, evaluation.photograph_url);
                      }}
                      disabled={deletingId === evaluation.id}
                    >
                      {deletingId === evaluation.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
          )}
        </div>
      </div>

      {/* Full Image View Dialog */}
      {selectedEvaluation && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvaluationId(null)}
        >
          <div className="max-w-4xl w-full bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedEvaluation.site_of_wound}</h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(selectedEvaluation.photograph_date), "dd MMM yyyy")} at{" "}
                  {selectedEvaluation.photograph_time}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvaluationId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedEvaluation.photograph_url}
                alt="Wound photograph"
                className="rounded-lg object-contain mx-auto max-h-[70vh] w-full"
              />
              <div className="mt-4 space-y-2">
                {(selectedEvaluation.length_cm || selectedEvaluation.width_cm || selectedEvaluation.depth_cm) && (
                  <p className="text-sm">
                    <strong>Measurements:</strong>{" "}
                    {selectedEvaluation.length_cm && `Length: ${selectedEvaluation.length_cm}cm, `}
                    {selectedEvaluation.width_cm && `Width: ${selectedEvaluation.width_cm}cm, `}
                    {selectedEvaluation.depth_cm && `Depth: ${selectedEvaluation.depth_cm}cm`}
                  </p>
                )}
                <p className="text-sm">
                  <strong>Recorded by:</strong> {selectedEvaluation.rgn_signature}
                </p>
                {selectedEvaluation.comment && (
                  <p className="text-sm">
                    <strong>Comment:</strong> {selectedEvaluation.comment}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photograph Evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photograph evaluation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
