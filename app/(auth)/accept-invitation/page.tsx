"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";

type InvitationLookupResult = {
  id: string;
  email: string;
  token: string;
  role: string;
  organization_id: string | null;
  care_home_id: string | null;
  team_id: string | null;
  invited_by: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  organization_name: string | null;
};

function AcceptInvitationContent() {
  const router = useRouter();
  const [token] = useQueryState("token");
  const [email] = useQueryState("email");
  const { session, isLoading: sessionPending } = useSupabase();
  const { profile, refresh: refreshProfile } = useProfile();
  const [invitation, setInvitation] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message || "Unknown error";
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object") {
      const maybeMessage = (error as { message?: string }).message;
      if (maybeMessage) return maybeMessage;
      const nestedMessage =
        (error as { error?: { message?: string } }).error?.message;
      if (nestedMessage) return nestedMessage;
      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== "{}") {
          return serialized;
        }
      } catch {
        // ignore serialization failures
      }
    }
    return "Unknown error";
  };

  const handleAcceptInvitation = async () => {
    if (!token) {
      toast.error("Missing invitation token");
      return;
    }

    if (!invitation) {
      toast.error("Invitation details not loaded");
      return;
    }

    setIsAccepting(true);
    try {
      // 1. Update user role in auth.users metadata
      // 2. Update user with organization and care home info in public.users
      // The DB trigger on_user_change_sync_metadata will automatically sync this to auth.users metadata
      const { error: userError } = await supabase
        .from("users")
        .update({
          role: invitation.role,
          active_organization_id: invitation.organization_id,
          active_care_home_id: invitation.care_home_id,
          active_team_id: invitation.team_id,
          is_onboarding_complete: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", session?.user.id);

      if (userError) {
        console.error("User update error:", userError);
        throw userError;
      }
      // 3. Add to junction tables based on role
      if (invitation.role === "manager" && invitation.care_home_id) {
        await supabase.from("care_home_managers").upsert({
          care_home_id: invitation.care_home_id,
          user_id: session?.user.id,
          assigned_at: new Date().toISOString()
        });
      } else if ((invitation.role === "nurse" || invitation.role === "care_assistant") && invitation.team_id) {
        await supabase.from("team_staff").upsert({
          team_id: invitation.team_id,
          user_id: session?.user.id,
          role: invitation.role,
          assigned_at: new Date().toISOString()
        });
      }

      // Add owner to users table with organization info
      if (invitation.role === "owner") {
        // Already handled in the users table update above
        console.log("Owner role set successfully");
      }

      // 4. Mark invitation as accepted via a scoped RPC.
      const { data: accepted, error: acceptError } = await supabase.rpc("accept_invitation", {
        p_token: token,
      });

      if (acceptError || !accepted) {
        throw acceptError ?? new Error("Failed to accept invitation");
      }

      await refreshProfile();
      toast.success("Invitation accepted!");
      console.log("[DEBUG] Redirecting to /onboarding after accepting invitation");
      router.push("/onboarding");
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  const getInvitation = useCallback(async () => {
    if (!token) return;

    console.log("[DEBUG] Fetching invitation with token:", token);

    const { data: invitationData, error: checkError } = await supabase
      .rpc("get_invitation_by_token", { p_token: token })
      .maybeSingle();

    const resolvedInvitation = invitationData as InvitationLookupResult | null;

    console.log("[DEBUG] Invitation query result:", { invitationData: resolvedInvitation, checkError });

    if (checkError) {
      console.error("Error checking invitation:", checkError);
      toast.error("Failed to load invitation");
      return;
    }

    if (!resolvedInvitation) {
      console.error("No invitation found with token:", token);
      toast.error("Invitation not found. The link may be invalid.");
      return;
    }

    console.log("[DEBUG] Found invitation:", resolvedInvitation);

    // Check if already accepted
    if (resolvedInvitation.status === "accepted") {
      toast.info("This invitation has already been accepted");
      router.push("/dashboard");
      return;
    }

    // Check if expired
    if (resolvedInvitation.expires_at && new Date(resolvedInvitation.expires_at) < new Date()) {
      toast.error("This invitation has expired");
      return;
    }

    // Check if pending
    if (resolvedInvitation.status !== "pending") {
      toast.error(`This invitation is ${resolvedInvitation.status}`);
      return;
    }

    // Fetch inviter email separately if invited_by exists
    let inviterEmail = null;
    if (resolvedInvitation.invited_by) {
      const { data: inviterData } = await supabase
        .from("users")
        .select("email")
        .eq("id", resolvedInvitation.invited_by)
        .single();
      inviterEmail = inviterData?.email;
    }

    setInvitation({
      ...resolvedInvitation,
      organizationName: resolvedInvitation.organization_name,
      inviterEmail
    });
  }, [token, router]);

  useEffect(() => {
    if (sessionPending) return;

    if (!session) {
      const params = new URLSearchParams();
      params.set("redirect", "accept-invitation");
      if (token) {
        params.set("token", token);
      }
      if (email) {
        params.set("email", email);
      }
      router.push(`/signup?${params.toString()}`);
    } else {
      // Only fetch invitation if we don't have it yet and we're not currently accepting
      if (!invitation && !isAccepting) {
        getInvitation();
      }
    }
  }, [session, sessionPending, router, token, email, getInvitation, invitation, isAccepting]);

  if (!session) {
    return null;
  }

  if (!token) {
    return (
      <div className="flex flex-col justify-center items-center h-dvh">
        <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
        <p className="text-gray-600 mb-4">No invitation token found.</p>
        <Button onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-dvh space-y-4">
      <h1 className="text-2xl font-bold">Accept Invitation</h1>
      <p className="text-muted-foreground text-center max-w-sm text-sm">
        You have been invited by{" "}
        <span className="font-semibold text-primary">
          {invitation?.inviterEmail}
        </span>{" "}
        to join{" "}
        <span className="font-semibold text-primary">
          {invitation?.organizationName}
        </span>{" "}
        as a{" "}
        <span className="font-semibold text-primary">{invitation?.role}</span>.
      </p>

      <Button
        onClick={handleAcceptInvitation}
        disabled={isAccepting || !invitation}
      >
        {isAccepting ? "Accepting..." : "Accept Invitation"}
      </Button>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center h-dvh">
          <p>Loading...</p>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
