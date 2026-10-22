"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { getMfaStep, mfaStepPath, type MfaStep } from "@/lib/mfa";
import { getPostLoginPath, withLoginParams, type LoginAppMetadata } from "@/lib/post-login-route";
import { supabase } from "@/lib/supabase";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Keeps a user on the MFA page that matches their state: no session goes to /login,
 * a finished (or exempt) user goes on to their home, and the wrong MFA page swaps to the
 * right one. The check runs once, so completing MFA on the page doesn't trigger a redirect
 * before the page is done (e.g. while backup codes are shown).
 */
export function useMfaGate(expected: Exclude<MfaStep, "none">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isLoading } = useSupabase();
  const [ready, setReady] = useState(false);
  const checked = useRef(false);

  const loginParams = useMemo(
    () => ({
      redirect: searchParams.get("redirect"),
      token: searchParams.get("token"),
      email: searchParams.get("email"),
    }),
    [searchParams]
  );

  useEffect(() => {
    if (isLoading || checked.current) return;
    checked.current = true;
    if (!session) {
      router.replace("/login");
      return;
    }
    const appMetadata: LoginAppMetadata = session.user.app_metadata ?? {};
    getMfaStep(supabase, appMetadata.role).then((step) => {
      if (step === "none") {
        router.replace(getPostLoginPath(appMetadata, loginParams) as Route);
      } else if (step !== expected) {
        router.replace(withLoginParams(mfaStepPath(step), loginParams) as Route);
      } else {
        setReady(true);
      }
    });
  }, [isLoading, session, expected, loginParams, router]);

  /** Sends the user to where login would have taken them. */
  const finish = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const appMetadata: LoginAppMetadata = data.user?.app_metadata ?? {};
    // Return to the page middleware sent the user away from, if it is a local path.
    const redirectedFrom = searchParams.get("redirectedFrom");
    if (appMetadata.is_onboarding_complete && redirectedFrom?.startsWith("/") && !redirectedFrom.startsWith("//")) {
      router.push(redirectedFrom as Route);
      return;
    }
    router.push(getPostLoginPath(appMetadata, loginParams) as Route);
  }, [loginParams, router, searchParams]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  return { ready, finish, signOut };
}
