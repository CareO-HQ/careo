"use client";

import { useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Ban } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeactivateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  isDeactivated: boolean;
}

export default function DeactivateOrganizationDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  isDeactivated,
}: DeactivateOrganizationDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAction = () => {
    startTransition(async () => {
      try {
        const newStatus = isDeactivated ? "active" : "deactivated";

        // Update organization_status table
        const { error } = await supabase
          .from("organization_status")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("organization_id", organizationId);

        if (error) throw error;

        toast.success(`Organization ${isDeactivated ? "activated" : "deactivated"} successfully`);
        onOpenChange(false);
        setReason("");
        router.refresh(); // Trigger server data refresh if needed
      } catch (error) {
        console.error("Error updating organization status:", error);
        toast.error("Failed to update organization status");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDeactivated ? (
              <>
                <Ban className="w-5 h-5 text-green-600" />
                Activate Care Home
              </>
            ) : (
              <>
                <Ban className="w-5 h-5 text-destructive" />
                Deactivate Care Home
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDeactivated
              ? `Reactivate ${organizationName}. Users will be able to access this care home again.`
              : `Deactivate ${organizationName}. Users will not be able to access this care home, but all data will be preserved.`}
          </DialogDescription>
        </DialogHeader>

        {!isDeactivated && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                When deactivated, all users will lose access to this care home. Users who belong to multiple
                organizations will still be able to access their other active organizations. All data will be
                preserved and can be restored by reactivating the care home.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Subscription expired, temporary closure..."
                disabled={isPending}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason("");
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={isDeactivated ? "default" : "destructive"}
            onClick={handleAction}
            disabled={isPending}
          >
            {isPending
              ? isDeactivated
                ? "Activating..."
                : "Deactivating..."
              : isDeactivated
                ? "Activate"
                : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
