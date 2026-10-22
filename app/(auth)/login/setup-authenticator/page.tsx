"use client";

import MfaPageShell, { MfaPageLoading } from "@/components/auth/MfaPageShell";
import EnrollTotpForm from "@/components/auth/forms/EnrollTotpForm";
import { Button } from "@/components/ui/button";
import { useMfaGate } from "@/hooks/use-mfa-gate";
import { Suspense } from "react";

function SetupAuthenticatorContent() {
  const { ready, finish, signOut } = useMfaGate("enroll");
  if (!ready) return <MfaPageLoading />;

  return (
    <MfaPageShell
      title="Set up your authenticator app"
      description="CareO needs a code from an authenticator app on your phone each time you sign in."
    >
      <EnrollTotpForm mode="login" onComplete={finish} />
      <div className="mt-4 border-t pt-4 text-center">
        <Button type="button" variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </MfaPageShell>
  );
}

export default function SetupAuthenticatorPage() {
  return (
    <Suspense fallback={<MfaPageLoading />}>
      <SetupAuthenticatorContent />
    </Suspense>
  );
}
