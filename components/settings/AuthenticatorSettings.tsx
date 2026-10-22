"use client";

import { createBackupCodes, getBackupCodeStatus } from "@/app/actions/mfa";
import BackupCodesPanel from "@/components/auth/BackupCodesPanel";
import EnrollTotpForm from "@/components/auth/forms/EnrollTotpForm";
import { useSupabase } from "@/components/providers/SupabaseProvider";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requiresMfa } from "@/lib/mfa";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface AuthenticatorStatus {
  enrolledAt: string | null;
  backupCodesRemaining: number;
  backupCodesTotal: number;
}

/** Settings → Security: authenticator device and backup codes. Hidden for MFA-exempt roles. */
export default function AuthenticatorSettings() {
  const { user } = useSupabase();
  const [status, setStatus] = useState<AuthenticatorStatus | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [isRegenerating, startRegenerate] = useTransition();
  const mfaRequired = requiresMfa(user?.app_metadata?.role as string | undefined);

  const load = useCallback(async () => {
    const [{ data: factors }, codes] = await Promise.all([supabase.auth.mfa.listFactors(), getBackupCodeStatus()]);
    setStatus({
      enrolledAt: factors?.totp[0]?.created_at ?? null,
      backupCodesRemaining: codes.success ? codes.remaining : 0,
      backupCodesTotal: codes.success ? codes.total : 0,
    });
  }, []);

  useEffect(() => {
    if (user && mfaRequired) load();
  }, [user, mfaRequired, load]);

  function regenerate() {
    startRegenerate(async () => {
      const result = await createBackupCodes("regenerate");
      setConfirmRegenerate(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNewCodes(result.codes);
    });
  }

  if (!user || !mfaRequired) return null;

  const lowOnCodes = status !== null && status.backupCodesRemaining <= 2;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-row justify-between items-start w-full gap-4">
        <div className="flex flex-col">
          <p className="font-medium">Authenticator app</p>
          <p className="text-sm text-muted-foreground">
            {status?.enrolledAt
              ? `Set up on ${format(new Date(status.enrolledAt), "d MMM yyyy")}. A code from it is needed each time you sign in.`
              : "A code from your authenticator app is needed each time you sign in."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setReplaceOpen(true)}>
          Replace device
        </Button>
      </div>

      <div className="flex flex-row justify-between items-start w-full gap-4">
        <div className="flex flex-col">
          <p className="font-medium">Backup codes</p>
          <p className="text-sm text-muted-foreground" data-testid="backup-code-status">
            {status ? `${status.backupCodesRemaining} of ${status.backupCodesTotal} remaining` : "Loading..."}
          </p>
          {lowOnCodes && (
            <p className="text-sm text-destructive">
              You are running out of backup codes. Create a new set and keep it somewhere safe.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfirmRegenerate(true)}>
          Regenerate
        </Button>
      </div>

      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move your authenticator to a new device</DialogTitle>
            <DialogDescription>
              Your old device stops working once the new one is confirmed. Your backup codes stay the same.
            </DialogDescription>
          </DialogHeader>
          {replaceOpen && (
            <EnrollTotpForm
              mode="replace"
              onComplete={() => {
                setReplaceOpen(false);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new backup codes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current backup codes will stop working straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRegenerating}
              onClick={(event) => {
                event.preventDefault();
                regenerate();
              }}
            >
              {isRegenerating ? "Creating..." : "Create new codes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newCodes !== null} onOpenChange={(open) => !open && setNewCodes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new backup codes</DialogTitle>
            <DialogDescription>Your old codes no longer work.</DialogDescription>
          </DialogHeader>
          {newCodes && (
            <BackupCodesPanel
              codes={newCodes}
              continueLabel="Done"
              onContinue={() => {
                setNewCodes(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
