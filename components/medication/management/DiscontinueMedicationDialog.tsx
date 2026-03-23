"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { AlertTriangle, StopCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const discontinueSchema = z.object({
  discontinuation_reason: z.string().min(1, "Please select a reason"),
  discontinuation_notes: z.string().optional(),
});

type DiscontinueFormData = z.infer<typeof discontinueSchema>;

interface DiscontinueMedicationDialogProps {
  medication: {
    id: string;
    name: string;
    strength: string;
    strength_unit: string;
    dosage_form: string;
    route: string;
    schedule_type: string;
  };
  residentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const discontinuationReasons = [
  { value: "treatment_complete", label: "Treatment Complete" },
  { value: "side_effects", label: "Side Effects / Adverse Reaction" },
  { value: "ineffective", label: "Medication Ineffective" },
  { value: "prescriber_instruction", label: "Prescriber Instruction" },
  { value: "resident_request", label: "Resident / Family Request" },
  { value: "transferred_to_hospital", label: "Transferred to Hospital" },
  { value: "deceased", label: "Resident Deceased" },
  { value: "medication_review", label: "Medication Review / Deprescribing" },
  { value: "duplicate_therapy", label: "Duplicate Therapy" },
  { value: "interaction_risk", label: "Drug Interaction Risk" },
  { value: "other", label: "Other" },
];

export function DiscontinueMedicationDialog({
  medication,
  residentName,
  open,
  onOpenChange,
  onSuccess,
}: DiscontinueMedicationDialogProps) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<DiscontinueFormData | null>(null);

  const form = useForm<DiscontinueFormData>({
    resolver: zodResolver(discontinueSchema),
    defaultValues: {
      discontinuation_reason: "",
      discontinuation_notes: "",
    },
  });

  const onSubmit = (data: DiscontinueFormData) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirmDiscontinue = async () => {
    if (!profile || !formData) {
      toast.error("Unable to discontinue medication");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("medications")
        .update({
          status: "discontinued",
          discontinued_at: new Date().toISOString(),
          discontinued_by: profile.id,
          discontinuation_reason: formData.discontinuation_reason,
          discontinuation_notes: formData.discontinuation_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", medication.id);

      if (error) throw error;

      const reasonLabel = discontinuationReasons.find(
        (r) => r.value === formData.discontinuation_reason
      )?.label || formData.discontinuation_reason;

      toast.success(
        `${medication.name} has been discontinued. Reason: ${reasonLabel}`
      );

      form.reset();
      setShowConfirmation(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error discontinuing medication:", error);
      toast.error("Failed to discontinue medication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      form.reset();
      setShowConfirmation(false);
      setFormData(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <StopCircle className="h-5 w-5" />
              Discontinue Medication
            </DialogTitle>
            <DialogDescription>
              You are about to discontinue <strong>{medication.name}</strong> ({medication.strength} {medication.strength_unit}) for <strong>{residentName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900">Important</p>
              <p className="text-sm text-amber-800">
                Discontinuing this medication will:
              </p>
              <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
                <li>Stop all future scheduled administrations</li>
                <li>Move this medication to the Discontinued section</li>
                <li>Preserve all administration history for audit purposes</li>
                <li>Require prescriber approval (ensure authorization before proceeding)</li>
              </ul>
            </div>
          </div>

          {/* Medication Details */}
          <div className="p-4 bg-gray-50 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Medication:</span>
              <span className="font-medium">{medication.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Strength:</span>
              <span className="font-medium">{medication.strength} {medication.strength_unit}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Form:</span>
              <span className="font-medium">{medication.dosage_form}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Route:</span>
              <span className="font-medium">{medication.route}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Badge variant="outline">{medication.schedule_type}</Badge>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Discontinuation Reason */}
              <FormField
                control={form.control}
                name="discontinuation_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discontinuation Reason *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {discontinuationReasons.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the primary reason for discontinuing this medication
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Notes */}
              <FormField
                control={form.control}
                name="discontinuation_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Prescriber name, date of authorization, specific instructions..."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Include prescriber authorization details and any relevant clinical information
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  Discontinue Medication
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Confirm Discontinuation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you absolutely sure you want to discontinue{" "}
                <strong>{medication.name}</strong> for <strong>{residentName}</strong>?
              </p>
              {formData && (
                <div className="p-3 bg-gray-50 border rounded text-sm space-y-1">
                  <div className="font-medium">
                    Reason:{" "}
                    {discontinuationReasons.find((r) => r.value === formData.discontinuation_reason)
                      ?.label || formData.discontinuation_reason}
                  </div>
                  {formData.discontinuation_notes && (
                    <div className="text-muted-foreground">
                      Notes: {formData.discontinuation_notes}
                    </div>
                  )}
                </div>
              )}
              <p className="text-red-600 font-medium">
                This action will stop all future administrations immediately.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscontinue}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Discontinuing..." : "Yes, Discontinue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
