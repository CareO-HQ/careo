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
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { format } from "date-fns";

const receiveStockSchema = z.object({
  quantity_received: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  supplier_name: z.string().optional(),
  prescription_reference: z.string().optional(),
  notes: z.string().optional(),
});

type ReceiveStockFormData = z.infer<typeof receiveStockSchema>;

interface ReceiveStockDialogProps {
  medication: {
    id: string;
    name: string;
    strength: string;
    strength_unit: string;
    total_count: number | null;
    organization_id: string;
    care_home_id: string | null;
  };
  residentId: string;
  residentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReceiveStockDialog({
  medication,
  residentId,
  residentName,
  open,
  onOpenChange,
  onSuccess,
}: ReceiveStockDialogProps) {
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReceiveStockFormData>({
    resolver: zodResolver(receiveStockSchema),
    defaultValues: {
      quantity_received: 0,
      batch_number: "",
      expiry_date: "",
      supplier_name: "",
      prescription_reference: "",
      notes: "",
    },
  });

  const onSubmit = async (data: ReceiveStockFormData) => {
    if (!profile) {
      toast.error("You must be logged in to receive stock");
      return;
    }

    setIsSubmitting(true);

    try {
      const currentStock = medication.total_count || 0;
      const newStock = currentStock + data.quantity_received;

      // Try to call the database function to receive stock
      const { data: result, error: functionError } = await supabase.rpc('receive_medication_stock', {
        p_medication_id: medication.id,
        p_resident_id: residentId,
        p_quantity_received: data.quantity_received,
        p_batch_number: data.batch_number || null,
        p_expiry_date: data.expiry_date || null,
        p_supplier_name: data.supplier_name || null,
        p_prescription_reference: data.prescription_reference || null,
        p_received_by: profile.id,
        p_notes: data.notes || null,
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

        // Insert stock receipt record
        const { error: insertError } = await supabase
          .from('medication_stock_receipts')
          .insert({
            medication_id: medication.id,
            resident_id: residentId,
            quantity_received: data.quantity_received,
            batch_number: data.batch_number || null,
            expiry_date: data.expiry_date || null,
            supplier_name: data.supplier_name || null,
            prescription_reference: data.prescription_reference || null,
            stock_before: currentStock,
            stock_after: newStock,
            received_by: profile.id,
            received_at: new Date().toISOString(),
            notes: data.notes || null,
            organization_id: medication.organization_id,
            care_home_id: medication.care_home_id,
          });

        if (insertError) throw insertError;
      } else if (functionError) {
        throw functionError;
      }

      toast.success(
        `Successfully received ${data.quantity_received} ${medication.strength_unit}. Stock updated from ${currentStock} to ${newStock}.`
      );

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error receiving stock:", error);
      toast.error("Failed to receive stock. Please try again.");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Receive Medication Stock
          </DialogTitle>
          <DialogDescription>
            Record new stock received for <strong>{medication.name}</strong> ({medication.strength} {medication.strength_unit}) for <strong>{residentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Stock Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Current Stock:</span>
                <span className="text-lg font-bold text-blue-700">
                  {medication.total_count ?? 0} {medication.strength_unit}
                </span>
              </div>
            </div>

            {/* Quantity Received */}
            <FormField
              control={form.control}
              name="quantity_received"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Received *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter quantity received"
                      {...field}
                      className="text-lg font-semibold"
                    />
                  </FormControl>
                  <FormDescription>
                    Number of {medication.strength_unit} received
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Batch Number */}
            <FormField
              control={form.control}
              name="batch_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BA12345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Batch or lot number from the medication packaging
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiry Date */}
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Expiration date from the medication packaging
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Supplier Name */}
            <FormField
              control={form.control}
              name="supplier_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier / Pharmacy</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Boots Pharmacy" {...field} />
                  </FormControl>
                  <FormDescription>
                    Name of the pharmacy or supplier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prescription Reference */}
            <FormField
              control={form.control}
              name="prescription_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescription Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., RX123456" {...field} />
                  </FormControl>
                  <FormDescription>
                    Prescription or order reference number
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this stock receipt..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            {form.watch("quantity_received") > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-900">New Stock After Receipt:</span>
                  <span className="text-lg font-bold text-green-700">
                    {(medication.total_count ?? 0) + form.watch("quantity_received")} {medication.strength_unit}
                  </span>
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
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? "Receiving Stock..." : "Receive Stock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
