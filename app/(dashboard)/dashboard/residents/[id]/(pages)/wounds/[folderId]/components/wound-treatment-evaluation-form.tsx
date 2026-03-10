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
import { CalendarIcon, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

// --- Types ---
type WoundTreatmentEvaluation = {
  id: string;
  evaluation_date: string;
  wound_number: string;
  cleansing_method: string | null;
  dressing_choice: string | null;
  frequency: string | null;
  rationale_for_change: string | null;
  wound_evaluation: string | null;
  signature: string;
  created_at: string;
};

type WoundTreatmentEvaluationFormProps = {
  residentId: string;
  woundFolderId: string;
  residentName?: string;
  residentDOB?: string;
  roomNumber?: string;
  evaluations?: WoundTreatmentEvaluation[];
  onSaved?: () => void;
};

// --- Zod Schema ---
const WoundTreatmentEvaluationSchema = z.object({
  evaluationDate: z.date(),
  woundNumber: z.string().min(1, "Wound number is required"),
  cleansingMethod: z.string().optional(),
  dressingChoice: z.string().optional(),
  frequency: z.string().optional(),
  rationaleForChange: z.string().optional(),
  woundEvaluation: z.string().optional(),
  signature: z.string().min(1, "Signature is required"),
});

type WoundTreatmentEvaluationFormData = z.infer<typeof WoundTreatmentEvaluationSchema>;

export function WoundTreatmentEvaluationForm({
  residentId,
  woundFolderId,
  residentName,
  residentDOB,
  roomNumber,
  evaluations = [],
  onSaved,
}: WoundTreatmentEvaluationFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<string | null>(null);
  const { profile } = useProfile();

  const form = useForm<WoundTreatmentEvaluationFormData>({
    resolver: zodResolver(WoundTreatmentEvaluationSchema),
    defaultValues: {
      evaluationDate: new Date(),
      woundNumber: "",
      cleansingMethod: "",
      dressingChoice: "",
      frequency: "",
      rationaleForChange: "",
      woundEvaluation: "",
      signature: "",
    },
  });

  const onSubmit = async (data: WoundTreatmentEvaluationFormData) => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("wound_treatment_evaluations")
        .insert({
          wound_folder_id: woundFolderId,
          resident_id: residentId,
          organization_id: profile?.active_organization_id,
          evaluation_date: format(data.evaluationDate, "yyyy-MM-dd"),
          wound_number: data.woundNumber,
          cleansing_method: data.cleansingMethod || null,
          dressing_choice: data.dressingChoice || null,
          frequency: data.frequency || null,
          rationale_for_change: data.rationaleForChange || null,
          wound_evaluation: data.woundEvaluation || null,
          signature: data.signature,
        });

      if (error) {
        console.error("Error saving evaluation:", error);
        toast.error("Failed to save evaluation");
        return;
      }

      toast.success("Treatment evaluation saved successfully");
      form.reset();
      setShowForm(false);

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (evaluationId: string) => {
    setEvaluationToDelete(evaluationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!evaluationToDelete) return;

    setDeletingId(evaluationToDelete);

    try {
      const { error } = await supabase
        .from("wound_treatment_evaluations")
        .delete()
        .eq("id", evaluationToDelete);

      if (error) {
        console.error("Error deleting evaluation:", error);
        toast.error("Failed to delete evaluation");
        return;
      }

      toast.success("Treatment evaluation deleted successfully");

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wound Treatment and Evaluation of Care</h2>
          <p className="text-sm text-muted-foreground mt-1">
            To be completed when treatment dressing type/regime changed - Please record clearly
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "New Evaluation"}
        </Button>
      </div>

      {/* Resident Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Resident Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Resident Name</p>
            <p className="font-medium">{residentName || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">D.O.B.</p>
            <p className="font-medium">
              {residentDOB ? format(new Date(residentDOB), "dd/MM/yyyy") : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Room No.</p>
            <p className="font-medium">{roomNumber || "N/A"}</p>
          </div>
        </CardContent>
      </Card>

      {/* New Evaluation Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Treatment Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="evaluationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
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
                                  format(field.value, "dd/MM/yyyy")
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
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Wound Number */}
                  <FormField
                    control={form.control}
                    name="woundNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wound Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter wound number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Cleansing Method */}
                  <FormField
                    control={form.control}
                    name="cleansingMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cleansing Method</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Normal saline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dressing Choice */}
                  <FormField
                    control={form.control}
                    name="dressingChoice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dressing Choice</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Hydrocolloid" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Frequency */}
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Daily, Twice daily, Every 3 days" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rationale for Changing Dressing Type */}
                <FormField
                  control={form.control}
                  name="rationaleForChange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rationale for Changing Dressing Type</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Explain why the dressing type/regime was changed"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Wound Evaluation */}
                <FormField
                  control={form.control}
                  name="woundEvaluation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wound Evaluation</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., Healing, dry, showing signs of improvement"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Signature */}
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signature</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter your name/initials" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
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
          </CardContent>
        </Card>
      )}

      {/* Previous Evaluations */}
      {evaluations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Previous Evaluations</h3>
            <Badge variant="secondary">{evaluations.length} evaluation(s)</Badge>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id} className="relative group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {format(new Date(evaluation.evaluation_date), "dd/MM/yyyy")} - Wound #{evaluation.wound_number}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recorded on {format(new Date(evaluation.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteClick(evaluation.id)}
                        disabled={deletingId === evaluation.id}
                      >
                        {deletingId === evaluation.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      {evaluation.cleansing_method && (
                        <div>
                          <p className="text-muted-foreground text-xs">Cleansing Method</p>
                          <p>{evaluation.cleansing_method}</p>
                        </div>
                      )}
                      {evaluation.dressing_choice && (
                        <div>
                          <p className="text-muted-foreground text-xs">Dressing Choice</p>
                          <p>{evaluation.dressing_choice}</p>
                        </div>
                      )}
                      {evaluation.frequency && (
                        <div>
                          <p className="text-muted-foreground text-xs">Frequency</p>
                          <p>{evaluation.frequency}</p>
                        </div>
                      )}
                    </div>

                    {evaluation.rationale_for_change && (
                      <div>
                        <p className="text-muted-foreground text-xs">Rationale for Change</p>
                        <p className="mt-1">{evaluation.rationale_for_change}</p>
                      </div>
                    )}

                    {evaluation.wound_evaluation && (
                      <div>
                        <p className="text-muted-foreground text-xs">Wound Evaluation</p>
                        <p className="mt-1">{evaluation.wound_evaluation}</p>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-muted-foreground text-xs">Signature</p>
                        <p className="font-medium">{evaluation.signature}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {evaluations.length === 0 && !showForm && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Save className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No Evaluations Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first treatment evaluation to track wound care
            </p>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Evaluation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Treatment Evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this treatment evaluation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
