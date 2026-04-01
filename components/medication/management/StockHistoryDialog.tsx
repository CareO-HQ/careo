"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Package, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StockHistoryDialogProps {
  medication: {
    id: string;
    name: string;
    strength: string;
    strength_unit: string;
    dosage_form: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type StockTransaction = {
  id: string;
  transaction_type: "receipt" | "adjustment";
  quantity: number | null;
  quantity_change: number | null;
  stock_before: number;
  stock_after: number;
  performed_by: string;
  performed_at: string;
  description: string;
  notes: string | null;
};

export function StockHistoryDialog({
  medication,
  open,
  onOpenChange,
}: StockHistoryDialogProps) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performerNames, setPerformerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && medication) {
      fetchStockHistory();
    }
  }, [open, medication?.id]);

  const getStockUnitLabel = (med: NonNullable<StockHistoryDialogProps["medication"]>) => {
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

  const fetchStockHistory = async () => {
    if (!medication) return;

    setIsLoading(true);
    try {
      // Fetch stock receipts
      const { data: receipts, error: receiptsError } = await supabase
        .from("medication_stock_receipts")
        .select("*")
        .eq("medication_id", medication.id)
        .order("received_at", { ascending: false });

      // If table doesn't exist, show empty state
      if (receiptsError && receiptsError.message?.includes('relation') && receiptsError.message?.includes('does not exist')) {
        console.warn('Stock tracking tables not yet created. Please run the migration.');
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      // Fetch stock adjustments
      const { data: adjustments, error: adjustmentsError } = await supabase
        .from("medication_stock_adjustments")
        .select("*")
        .eq("medication_id", medication.id)
        .order("adjusted_at", { ascending: false });

      // If table doesn't exist, show empty state
      if (adjustmentsError && adjustmentsError.message?.includes('relation') && adjustmentsError.message?.includes('does not exist')) {
        console.warn('Stock tracking tables not yet created. Please run the migration.');
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      // Combine and format transactions
      const formattedReceipts: StockTransaction[] = (receipts || []).map((r) => ({
        id: r.id,
        transaction_type: "receipt" as const,
        quantity: r.quantity_received,
        quantity_change: null,
        stock_before: r.stock_before,
        stock_after: r.stock_after,
        performed_by: r.received_by,
        performed_at: r.received_at,
        description: `Stock received: ${r.quantity_received}${
          r.supplier_name ? ` from ${r.supplier_name}` : ""
        }${r.batch_number ? ` (Batch: ${r.batch_number})` : ""}`,
        notes: r.notes,
      }));

      const formattedAdjustments: StockTransaction[] = (adjustments || []).map((a) => ({
        id: a.id,
        transaction_type: "adjustment" as const,
        quantity: null,
        quantity_change: a.quantity_change,
        stock_before: a.stock_before,
        stock_after: a.stock_after,
        performed_by: a.adjusted_by,
        performed_at: a.adjusted_at,
        description: `Stock adjustment (${a.adjustment_type}): ${
          a.quantity_change > 0 ? "+" : ""
        }${a.quantity_change} - ${a.reason}`,
        notes: a.notes,
      }));

      // Merge and sort by date
      const allTransactions = [...formattedReceipts, ...formattedAdjustments].sort(
        (a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
      );

      setTransactions(allTransactions);

      // Fetch user names for performed_by
      const userIds = [...new Set(allTransactions.map((t) => t.performed_by))];
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);

        const nameMap: Record<string, string> = {};
        (users || []).forEach((u) => {
          nameMap[u.id] = u.name || "Unknown User";
        });
        setPerformerNames(nameMap);
      }
    } catch (error) {
      console.error("Error fetching stock history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionBadge = (transaction: StockTransaction) => {
    if (transaction.transaction_type === "receipt") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <TrendingUp className="h-3 w-3 mr-1" />
          Receipt
        </Badge>
      );
    }

    const isIncrease = (transaction.quantity_change || 0) > 0;
    return (
      <Badge
        variant="outline"
        className={
          isIncrease
            ? "bg-blue-50 text-blue-700 border-blue-300"
            : "bg-orange-50 text-orange-700 border-orange-300"
        }
      >
        {isIncrease ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        Adjustment
      </Badge>
    );
  };

  // Guard: Don't render if no medication
  if (!medication) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Stock History
          </DialogTitle>
          <DialogDescription>
            Complete stock movement history for <strong>{medication.name}</strong> ({medication.strength} {medication.strength_unit})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No stock history found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Stock receipts and adjustments will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Stock Before</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Stock After</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(transaction.performed_at), "MMM dd, yyyy")}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transaction.performed_at), "HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell>{getTransactionBadge(transaction)}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="space-y-1">
                        <div className="text-sm">{transaction.description}</div>
                        {transaction.notes && (
                          <div className="text-xs text-muted-foreground italic">
                            {transaction.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {transaction.stock_before} {unitLabel}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {transaction.transaction_type === "receipt" ? (
                        <span className="text-green-700">
                          +{transaction.quantity} {unitLabel}
                        </span>
                      ) : (
                        <span
                          className={
                            (transaction.quantity_change || 0) > 0
                              ? "text-blue-700"
                              : "text-orange-700"
                          }
                        >
                          {(transaction.quantity_change || 0) > 0 ? "+" : ""}
                          {transaction.quantity_change} {unitLabel}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {transaction.stock_after} {unitLabel}
                    </TableCell>
                    <TableCell className="text-sm">
                      {performerNames[transaction.performed_by] || "Unknown"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
