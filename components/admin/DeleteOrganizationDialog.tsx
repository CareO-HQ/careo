"use client";

import { useState, useTransition } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
}

export default function DeleteOrganizationDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}: DeleteOrganizationDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const preview = useQuery(api.saasAdmin.getOrganizationDeletionPreview, {
    organizationId,
  });
  const deleteOrganization = useMutation(api.saasAdmin.deleteOrganization);

  const handleDelete = () => {
    if (confirmName !== organizationName) {
      toast.error("Organization name does not match");
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteOrganization({
          organizationId,
          confirmDeletion: true,
        });

        if (result.success) {
          toast.success("Organization deleted successfully");
          onOpenChange(false);
          router.push("/admin/care-homes");
        } else {
          toast.error(result.error || "Failed to delete organization");
        }
      } catch (error) {
        console.error("Error deleting organization:", error);
        toast.error("An error occurred while deleting the organization");
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

        {preview && (
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
                  <span className="text-muted-foreground">Teams:</span>
                  <span className="font-medium">{preview.counts.teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Residents:</span>
                  <span className="font-medium">{preview.counts.residents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team Members:</span>
                  <span className="font-medium">{preview.counts.teamMembers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Files:</span>
                  <span className="font-medium">{preview.counts.files}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Folders:</span>
                  <span className="font-medium">{preview.counts.folders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Labels:</span>
                  <span className="font-medium">{preview.counts.labels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invitations:</span>
                  <span className="font-medium">{preview.counts.invitations}</span>
                </div>
              </div>
            </div>

            {preview.membersWithMultipleOrgs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Users who will retain access to other organizations:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {preview.membersWithMultipleOrgs.map((member: { email: string; name?: string; otherOrgCount: number }, index: number) => (
                    <li key={index}>
                      {member.name || member.email} ({member.otherOrgCount} other organization{member.otherOrgCount !== 1 ? "s" : ""})
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
