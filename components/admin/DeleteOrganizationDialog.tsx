"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
}

interface DeletionPreview {
  organizationName: string;
  counts: {
    members: number;
    careHomes: number;
    teams: number;
    residents: number;
  };
}

export default function DeleteOrganizationDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}: DeleteOrganizationDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const router = useRouter();

  const fetchPreview = useCallback(async () => {
    if (!organizationId || !open) return;

    try {
      setIsLoadingPreview(true);

      // Fetch counts for preview
      const [membersRes, chRes, teamsRes, residentsRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }).eq("active_organization_id", organizationId),
        supabase.from("care_homes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("teams").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("residents").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
      ]);

      setPreview({
        organizationName,
        counts: {
          members: membersRes.count || 0,
          careHomes: chRes.count || 0,
          teams: teamsRes.count || 0,
          residents: residentsRes.count || 0,
        }
      });
    } catch (error) {
      console.error("Error fetching deletion preview:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [organizationId, organizationName, open]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleDelete = () => {
    if (confirmName !== organizationName) {
      toast.error("Organization name does not match");
      return;
    }

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("organizations")
          .delete()
          .eq("id", organizationId);

        if (error) throw error;

        toast.success("Organization deleted successfully");
        onOpenChange(false);
        router.push("/admin/care-homes");
      } catch (error) {
        console.error("Error deleting organization:", error);
        toast.error("Failed to delete organization");
      }
    });
  };

  const isConfirmValid = confirmName === organizationName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Delete Care Home
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All data associated with this care home will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPreview ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          </div>
        ) : preview && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-sm text-destructive">
                You are about to permanently delete <strong>{preview.organizationName}</strong> and all associated data.
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">The following will be deleted:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members:</span>
                  <span className="font-medium">{preview.counts.members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Care Homes:</span>
                  <span className="font-medium">{preview.counts.careHomes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teams:</span>
                  <span className="font-medium">{preview.counts.teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Residents:</span>
                  <span className="font-medium">{preview.counts.residents}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <strong>{organizationName}</strong> to confirm:
              </label>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={organizationName}
                disabled={isPending}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isPending}
          >
            {isPending ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
