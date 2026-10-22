"use client";

import { createBackupCodes, recordDeviceReplaced } from "@/app/actions/mfa";
import BackupCodesPanel from "@/components/auth/BackupCodesPanel";
import SixDigitCodeInput from "@/components/auth/SixDigitCodeInput";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { CopyIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

interface PendingFactor {
  id: string;
  qrCode: string;
  secret: string;
}

/**
 * Sets up an authenticator app: scan the QR code (or type the secret), confirm with a code.
 * - "login": first-time setup during sign-in; ends by showing new backup codes.
 * - "replace": moving to a new device from settings; removes the old authenticator after
 *   the new one is confirmed and keeps the existing backup codes.
 */
export default function EnrollTotpForm({
  mode,
  onComplete,
}: {
  mode: "login" | "replace";
  onComplete: () => void;
}) {
  const [factor, setFactor] = useState<PendingFactor | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isVerifying, startVerify] = useTransition();
  const started = useRef(false);

  useEffect(() => {
    // Enrol once, even when React runs effects twice in development.
    if (started.current) return;
    started.current = true;

    (async () => {
      // A previous attempt that was never confirmed would block a new one; remove it.
      const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setSetupError(listError.message);
        return;
      }
      for (const stale of existing.all.filter((f) => f.factor_type === "totp" && f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        // Friendly names must be unique per user, which matters when replacing a device.
        friendlyName: `Authenticator app ${new Date().toISOString()}`,
      });
      if (error) {
        setSetupError(error.message);
        return;
      }
      setFactor({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  function verify() {
    if (!factor) return;
    startVerify(async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) {
        setCode("");
        toast.error("That code didn't match. Check the time on your phone and try the newest code.");
        return;
      }

      if (mode === "replace") {
        const { data } = await supabase.auth.mfa.listFactors();
        for (const old of data?.totp.filter((f) => f.id !== factor.id) ?? []) {
          await supabase.auth.mfa.unenroll({ factorId: old.id });
        }
        await recordDeviceReplaced();
        toast.success("Authenticator moved to your new device");
        onComplete();
        return;
      }

      const result = await createBackupCodes("enrolment");
      if (!result.success) {
        toast.error("Authenticator set up, but backup codes could not be created. Create them in Settings → Security.");
        onComplete();
        return;
      }
      setBackupCodes(result.codes);
    });
  }

  async function copySecret() {
    if (!factor) return;
    try {
      await navigator.clipboard.writeText(factor.secret);
      toast.success("Setup key copied");
    } catch {
      toast.error("Could not copy the setup key");
    }
  }

  if (backupCodes) {
    return <BackupCodesPanel codes={backupCodes} onContinue={onComplete} />;
  }

  if (setupError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not start authenticator setup: {setupError}
      </p>
    );
  }

  if (!factor) {
    return <p className="text-sm text-muted-foreground">Preparing setup...</p>;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        verify();
      }}
    >
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Open an authenticator app such as Google Authenticator or Microsoft Authenticator.</li>
        <li>Scan this QR code, or enter the setup key.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <div className="flex justify-center">
        {/* qr_code is an SVG data URI from Supabase */}
        <img src={factor.qrCode} alt="QR code for your authenticator app" className="size-44 rounded-md border bg-white p-2" />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Setup key</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-md bg-muted px-2 py-1 text-xs" data-testid="totp-secret">
            {factor.secret}
          </code>
          <Button type="button" variant="ghost" size="sm" onClick={copySecret} aria-label="Copy setup key">
            <CopyIcon className="size-4" />
          </Button>
        </div>
      </div>
      <SixDigitCodeInput value={code} onChange={setCode} disabled={isVerifying} />
      <Button type="submit" className="w-full" disabled={isVerifying || code.length !== 6}>
        {isVerifying ? "Verifying..." : "Verify and continue"}
      </Button>
    </form>
  );
}
