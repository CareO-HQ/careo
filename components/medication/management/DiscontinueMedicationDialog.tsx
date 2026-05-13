"use client";

import { useState, useEffect, useMemo } from "react";
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
  discontinuation_checked_by_user_id: z
    .string()
    .uuid({ message: "Please select Checked by staff" }),
});

type DiscontinueFormData = z.infer<typeof discontinueSchema>;

type OrgUserRow = { id: string; name: string | null; email: string | null };

interface DiscontinueMedicationDialogProps {
  medication: {
    id: string;
    name: string;
    strength: string;
    strength_unit: string;
    dosage_form: string;
    route: string;
    schedule_type: string;
  } | null;
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
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);

  const form = useForm<DiscontinueFormData>({
    resolver: zodResolver(discontinueSchema),
    defaultValues: {
      discontinuation_reason: "",
      discontinuation_notes: "",
      discontinuation_checked_by_user_id: "",
    },
  });

  useEffect(() => {
    if (!open || !profile?.active_organization_id) {
      if (!open) setOrgUsers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("active_organization_id", profile.active_organization_id);
      if (!cancelled) {
        if (error) {
          console.error("[DiscontinueMedicationDialog] load users:", error);
          setOrgUsers([]);
        } else {
          setOrgUsers((data ?? []) as OrgUserRow[]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, profile?.active_organization_id]);

  const checkerStaffOptions = useMemo(() => {
    return [...orgUsers]
      .filter((u) => u.id !== profile?.id)
      .sort((a, b) => {
        const an = (a.name || a.email || "").toLowerCase();
        const bn = (b.name || b.email || "").toLowerCase();
        return an.localeCompare(bn);
      })
      .map((u) => ({
        id: u.id,
        label: u.name?.trim() || u.email || u.id,
      }));
  }, [orgUsers, profile?.id]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        discontinuation_reason: "",
        discontinuation_notes: "",
        discontinuation_checked_by_user_id: "",
      });
      setIsSubmitting(false);
      setShowConfirmation(false);
      setFormData(null);
    }
  }, [open, form]);

  const onSubmit = (data: DiscontinueFormData) => {
    if (!profile?.id) {
      toast.error("You must be signed in to discontinue medication");
      return;
    }
    if (data.discontinuation_checked_by_user_id === profile.id) {
      form.setError("discontinuation_checked_by_user_id", {
        type: "manual",
        message: "Must be another staff member",
      });
      toast.error("Checked by must be another staff member");
      return;
    }
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirmDiscontinue = async () => {
    if (!profile || !formData || !medication) {
      toast.error("Unable to discontinue medication");
      return;
    }

    if (formData.discontinuation_checked_by_user_id === profile.id) {
      toast.error("Checked by must be another staff member");
      setShowConfirmation(false);
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
          discontinuation_checked_by: formData.discontinuation_checked_by_user_id,
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

      form.reset({
        discontinuation_reason: "",
        discontinuation_notes: "",
        discontinuation_checked_by_user_id: "",
      });
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
      form.reset({
        discontinuation_reason: "",
        discontinuation_notes: "",
        discontinuation_checked_by_user_id: "",
      });
      setShowConfirmation(false);
      setFormData(null);
    }
    onOpenChange(newOpen);
  };

  // Guard: Don't render if no medication
  if (!medication) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-red-700 text-lg">
              {showConfirmation ? <AlertTriangle className="h-4 w-4" /> : <StopCircle className="h-4 w-4" />}
              {showConfirmation ? "Confirm Discontinuation" : "Discontinue Medication"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {showConfirmation 
                ? "Please review the details below before proceeding."
                : <span className="text-xs">Discontinue <strong>{medication.name}</strong> ({medication.strength} {medication.strength_unit}) for <strong>{residentName}</strong>.</span>
              }
            </DialogDescription>
          </DialogHeader>

          {showConfirmation ? (
            <div className="px-4 pb-4 space-y-4">
              <div className="space-y-3 text-sm">
                <p>
                  Are you absolutely sure you want to discontinue{" "}
                  <strong>{medication.name}</strong> for <strong>{residentName}</strong>?
                </p>
                {formData && (
                  <div className="p-3 bg-gray-50 border rounded text-sm space-y-1">
                    <div className="font-medium text-foreground">
                      Reason:{" "}
                      {discontinuationReasons.find((r) => r.value === formData.discontinuation_reason)
                        ?.label || formData.discontinuation_reason}
                    </div>
                    {formData.discontinuation_notes && (
                      <div className="text-muted-foreground">
                        Notes: {formData.discontinuation_notes}
                      </div>
                    )}
                    <div className="pt-2 space-y-0.5 text-muted-foreground border-t mt-2">
                      <div>
                        <span className="font-medium text-foreground">Discontinued by: </span>
                        {profile?.name?.trim() || profile?.email || "—"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Checked by: </span>
                        {(() => {
                          const u = orgUsers.find(
                            (row) => row.id === formData.discontinuation_checked_by_user_id
                          );
                          return u?.name?.trim() || u?.email?.trim() || "—";
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-red-600 font-medium">
                  This action will stop all future administrations immediately.
                </p>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDiscontinue}
                  variant="destructive"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Discontinuing..." : "Yes, Discontinue"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-4">
              {/* Warning */}
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">Important</p>
                  <ul className="text-amber-800 list-disc list-inside">
                    <li>Stops future scheduled doses</li>
                    <li>Preserves audit history</li>
                    <li>Requires authorization</li>
                  </ul>
                </div>
              </div>

              {/* Medication Details */}
              <div className="p-2 bg-gray-50 border rounded-lg space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Medication:</span>
                  <span className="font-medium">{medication.name} ({medication.strength}{medication.strength_unit})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type/Route:</span>
                  <div className="flex gap-1 items-center">
                    <Badge variant="outline" className="h-4 text-[9px] px-1">{medication.schedule_type}</Badge>
                    <span className="font-medium">{medication.route}</span>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  {/* Discontinuation Reason */}
                  <FormField
                    control={form.control}
                    name="discontinuation_reason"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Discontinuation Reason *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Reason" />
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
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Prescriber name, date..."
                            {...field}
                            rows={2}
                            className="text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                    <div className="text-[11px] space-y-0.5">
                      <p className="text-muted-foreground font-medium">Discontinued by</p>
                      <p className="font-medium">{profile?.name?.trim() || profile?.email || "—"}</p>
                      <FormDescription className="text-[10px]">
                        Signed-in staff initiating discontinuation
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="discontinuation_checked_by_user_id"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel required className="text-xs">
                            Checked by
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select verifying staff..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {checkerStaffOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {checkerStaffOptions.length === 0 && (
                            <p className="text-[11px] text-amber-600">
                              No other organisation staff found for dual check.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      disabled={isSubmitting}
                    >
                      Discontinue
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
