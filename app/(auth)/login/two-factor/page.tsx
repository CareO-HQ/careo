"use client";

import MfaPageShell, { MfaPageLoading } from "@/components/auth/MfaPageShell";
import TwoFactorForm from "@/components/auth/forms/TwoFactorForm";
import { useMfaGate } from "@/hooks/use-mfa-gate";
import { Suspense } from "react";

function TwoFactorContent() {
  const { ready, finish, signOut } = useMfaGate("verify");
  if (!ready) return <MfaPageLoading />;

  return (
    <MfaPageShell
      title="Two-factor authentication"
      description="Enter the 6-digit code from your authenticator app."
    >
      <TwoFactorForm onVerified={finish} onSignOut={signOut} />
    </MfaPageShell>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<MfaPageLoading />}>
      <TwoFactorContent />
    </Suspense>
  );
}
