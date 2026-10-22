"use client";

import { redeemBackupCode } from "@/app/actions/mfa";
import SixDigitCodeInput from "@/components/auth/SixDigitCodeInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { BackupCodeSchema, TwoFactorSchema } from "@/schemas/auth/TwoFactorSchema";
import { useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * Second login step: a code from the authenticator app, or a one-time backup code.
 * A backup code removes the lost authenticator and signs the user out; they sign in
 * again and set up a new one.
 */
export default function TwoFactorForm({
  onVerified,
  onSignOut,
}: {
  onVerified: () => void;
  onSignOut: () => void;
}) {
  const [mode, setMode] = useState<"app" | "backup">("app");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, startTransition] = useTransition();

  function verifyAppCode() {
    const parsed = TwoFactorSchema.safeParse({ code });
    if (!parsed.success) return;
    startTransition(async () => {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp[0];
      if (listError || !factor) {
        toast.error("No authenticator is set up for this account. Ask your manager to reset it.");
        return;
      }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: parsed.data.code });
      if (error) {
        setCode("");
        toast.error("That code didn't match. Try the newest code from your app.");
        return;
      }
      onVerified();
    });
  }

  function submitBackupCode() {
    const parsed = BackupCodeSchema.safeParse({ code: backupCode });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a backup code");
      return;
    }
    startTransition(async () => {
      const result = await redeemBackupCode(parsed.data.code);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // Removing the authenticator ended every session, including this one.
      toast.success("Backup code accepted. Sign in again to set up your new authenticator.", { duration: 8000 });
      onSignOut();
    });
  }

  return (
    <div className="space-y-4">
      {mode === "app" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            verifyAppCode();
          }}
        >
          <SixDigitCodeInput value={code} onChange={setCode} disabled={isLoading} />
          <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
            {isLoading ? "Verifying..." : "Verify code"}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => setMode("backup")}>
            Use a backup code instead
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitBackupCode();
          }}
        >
          <p className="text-sm text-muted-foreground">
            Using a backup code removes your current authenticator. You will sign in again and set up a new one.
          </p>
          <Input
            value={backupCode}
            onChange={(event) => setBackupCode(event.target.value)}
            placeholder="xxxxx-xxxxx"
            aria-label="Backup code"
            autoComplete="off"
            autoFocus
            disabled={isLoading}
          />
          <Button type="submit" className="w-full" disabled={isLoading || backupCode.trim().length === 0}>
            {isLoading ? "Checking..." : "Use backup code"}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => setMode("app")}>
            Use the authenticator app instead
          </Button>
        </form>
      )}

      <div className="space-y-2 border-t pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Lost your phone and your backup codes? Ask your manager to reset your authenticator.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onSignOut} disabled={isLoading}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
