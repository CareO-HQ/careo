"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { TrendingDown, TrendingUp } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const adjustStockSchema = z.object({
  adjustment_type: z.enum([
    "manual_correction",
    "damaged",
    "expired",
    "lost",
    "returned_to_pharmacy",
    "other",
  ]),
  direction: z.enum(["increase", "decrease"]),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().min(3, "Reason is required"),
  notes: z.string().optional(),
});

type AdjustStockFormData = z.infer<typeof adjustStockSchema>;

interface AdjustStockDialogProps {
  medication: {
    id: string;
    name: string;
    strength: string;
    strength_unit: string;
    dosage_form: string;
    total_count: number | null;
    organization_id: string;
    care_home_id: string | null;
  } | null;
  residentId: string;
  residentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const adjustmentTypeLabels: Record<string, string> = {
  manual_correction: "Manual Correction",
  damaged: "Damaged",
  expired: "Expired",
  lost: "Lost",
  returned_to_pharmacy: "Returned to Pharmacy",
  other: "Other",
};

export function AdjustStockDialog({
  medication,
  residentId,
  residentName,
  open,
  onOpenChange,
  onSuccess,
}: AdjustStockDialogProps) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AdjustStockFormData>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      adjustment_type: "manual_correction",
      direction: "increase",
      quantity: 0,
      reason: "",
      notes: "",
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setIsSubmitting(false);
    }
  }, [open, form]);

  const getStockUnitLabel = (med: NonNullable<AdjustStockDialogProps["medication"]>) => {
    const form = med.dosage_form?.toLowerCase() || "";
    
    if (form.includes("tablet")) return "tablets";
    if (form.includes("capsule")) return "capsules";
    if (form.includes("softgel")) return "softgels";
    if (form.includes("gummy")) return "gummies";
    if (form.includes("lozenge")) return "lozenges";
    if (form.includes("liquid") || form.includes("syrup") || form.includes("injection")) return "mL";
    if (form.includes("drops")) return "drops";
    if (form.includes("spray")) return "sprays";
    if (form.includes("inhaler")) return "puffs";
    if (form.includes("patch")) return "patches";
    if (form.includes("cream") || form.includes("ointment") || form.includes("gel") || form.includes("lotion")) return "packs";
    if (form.includes("sachet") || form.includes("powder")) return "sachets";
    
    return "units";
  };

  const unitLabel = medication ? getStockUnitLabel(medication) : "units";

  const direction = form.watch("direction");
  const quantity = Number(form.watch("quantity") || 0);
  const currentStock = Number(medication?.total_count ?? 0);
  const quantityChange = direction === "increase" ? quantity : -quantity;
  const newStock = Math.max(0, currentStock + quantityChange);

  const onSubmit = async (data: AdjustStockFormData) => {
    if (!profile || !medication) {
      toast.error("You must be logged in to adjust stock");
      return;
    }

    setIsSubmitting(true);

    try {
      const quantityChange = data.direction === "increase" ? data.quantity : -data.quantity;

      // Try to call the database function to adjust stock
      const { data: result, error: functionError } = await supabase.rpc('adjust_medication_stock', {
        p_medication_id: medication.id,
        p_resident_id: residentId,
        p_adjustment_type: data.adjustment_type,
        p_quantity_change: quantityChange,
        p_reason: data.reason,
        p_notes: data.notes || null,
        p_adjusted_by: profile.id,
        p_organization_id: medication.organization_id,
        p_care_home_id: medication.care_home_id,
      });

      // If function doesn't exist, fall back to manual insert
      if (functionError && functionError.message?.includes('function') && functionError.message?.includes('does not exist')) {
        console.warn('Database function not found, using fallback method');

        // Update medication stock count
        const { error: updateError } = await supabase
          .from('medications')
          .update({ total_count: newStock, updated_at: new Date().toISOString() })
          .eq('id', medication.id);

        if (updateError) throw updateError;

        // Insert stock adjustment record
        const { error: insertError } = await supabase
          .from('medication_stock_adjustments')
          .insert({
            medication_id: medication.id,
            resident_id: residentId,
            adjustment_type: data.adjustment_type,
            quantity_change: quantityChange,
            stock_before: currentStock,
            stock_after: newStock,
            reason: data.reason,
            notes: data.notes || null,
            adjusted_by: profile.id,
            adjusted_at: new Date().toISOString(),
            organization_id: medication.organization_id,
            care_home_id: medication.care_home_id,
          });

        if (insertError) throw insertError;
      } else if (functionError) {
        throw functionError;
      }

      const changeText = data.direction === "increase" ? `increased by ${data.quantity}` : `decreased by ${data.quantity}`;
      toast.success(
        `Stock ${changeText}. Updated from ${currentStock} to ${newStock} ${unitLabel}.`
      );

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to adjust stock. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  // Guard: Don't render if no medication
  if (!medication) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {direction === "increase" ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-orange-600" />
            )}
            Adjust Medication Stock
          </DialogTitle>
          <DialogDescription>
            Adjust stock count for <strong>{medication.name}</strong> ({medication.strength} {medication.strength_unit}) for <strong>{residentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Stock Info */}
            <div className="flex flex-col gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Medication Strength</p>
                  <p className="text-xs text-blue-700">{medication.strength} {medication.strength_unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-900">Physical Inventory (Current)</p>
                  <span className="text-xl font-bold text-blue-700">
                    {currentStock} {unitLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Direction */}
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Direction *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <RadioGroupItem value="increase" id="increase" />
                        <Label
                          htmlFor="increase"
                          className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg flex-1"
                        >
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="font-medium">Increase Stock</div>
                            <div className="text-xs text-muted-foreground">Add to current count</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <RadioGroupItem value="decrease" id="decrease" />
                        <Label
                          htmlFor="decrease"
                          className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg flex-1"
                        >
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                          <div>
                            <div className="font-medium">Decrease Stock</div>
                            <div className="text-xs text-muted-foreground">Subtract from current count</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-bold">Quantity to {direction === 'increase' ? 'Add' : 'Remove'} (Physical Count) *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="e.g. 10"
                        {...field}
                        className="text-lg font-semibold pr-20 h-12"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground bg-background px-2">
                        {unitLabel}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="text-sm text-blue-600 font-medium">
                    Enter the number of <strong>{unitLabel}</strong> to {direction}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Adjustment Type */}
            <FormField
              control={form.control}
              name="adjustment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(adjustmentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Reason category for this adjustment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl>
                    <Input placeholder="Explain why this adjustment is needed" {...field} />
                  </FormControl>
                  <FormDescription>
                    Brief explanation for this stock adjustment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional details about this adjustment..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            {quantity > 0 && (
              <div className={`p-4 border rounded-lg ${
                direction === "increase"
                  ? "bg-green-50 border-green-200"
                  : "bg-orange-50 border-orange-200"
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      direction === "increase" ? "text-green-900" : "text-orange-900"
                    }`}>
                      Change:
                    </span>
                    <span className={`text-lg font-bold ${
                      direction === "increase" ? "text-green-700" : "text-orange-700"
                    }`}>
                      {direction === "increase" ? "+" : "-"}{quantity} {unitLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      direction === "increase" ? "text-green-900" : "text-orange-900"
                    }`}>
                      New Stock After Adjustment:
                    </span>
                    <span className={`text-lg font-bold ${
                      direction === "increase" ? "text-green-700" : "text-orange-700"
                    }`}>
                      {newStock} {unitLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                disabled={isSubmitting}
                className={direction === "increase"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-orange-600 hover:bg-orange-700"
                }
              >
                {isSubmitting ? "Adjusting Stock..." : "Adjust Stock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
