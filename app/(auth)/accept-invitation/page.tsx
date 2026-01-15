"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useConvex, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function AcceptInvitationContent() {
  const router = useRouter();
  const [token] = useQueryState("token");
  const [email] = useQueryState("email");
  const [invitation, setInvitation] = useState<{
    inviterEmail: string;
    role: string;
    organizationName: string;
    email: string;
  } | null>(null);
  const convex = useConvex();
  const assignTeamFromInvitation = useMutation(api.customInvite.assignTeamFromInvitationPublic);
  const ensureAndSetActiveOrganization = useMutation(api.auth.ensureAndSetActiveOrganization);
  const resetOnboardingStatus = useMutation(api.user.resetOnboardingStatus);

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const handleAcceptInvitation = async () => {
    await authClient.organization.acceptInvitation(
      {
        invitationId: token!
      },
      {
        onSuccess: async () => {
          // CRITICAL: Ensure organization is set in session after accepting invitation
          // This is needed because Better Auth's acceptInvitation might not immediately
          // update the session's activeOrganizationId
          try {
            // Wait a moment for Better Auth to process the invitation
            await new Promise((resolve) => setTimeout(resolve, 500));
            
            // Try to ensure and set active organization from member record
            const orgResult = await ensureAndSetActiveOrganization();
            if (orgResult) {
              console.log("[accept-invitation] Set active organization:", orgResult.id);
            } else {
              console.warn("[accept-invitation] Could not set active organization immediately, will retry during onboarding");
            }
          } catch (error) {
            // Don't fail invitation acceptance if this fails - onboarding will handle it
            console.error("[accept-invitation] Error ensuring active organization:", error);
          }

          // Reset onboarding status to ensure invited users complete role-specific onboarding
          // This is important because users might have completed onboarding for a different role
          try {
            await resetOnboardingStatus();
            console.log("[accept-invitation] Reset onboarding status for invited user");
          } catch (error) {
            // Don't fail invitation acceptance if this fails - onboarding will handle it
            console.error("[accept-invitation] Error resetting onboarding status:", error);
          }

          // Try to assign team from invitation if it exists
          if (token) {
            try {
              const teamResult = await assignTeamFromInvitation({
                invitationId: token,
              });
              if (teamResult.success) {
                console.log("User assigned to team:", teamResult.teamId);
              }
            } catch (error) {
              // Silently fail - team assignment will be handled during onboarding if needed
              console.error("Error assigning team:", error);
            }
          }

          // Always redirect invited users to onboarding to complete role-specific onboarding
          // Even if they've completed onboarding before, they need to complete it for their new role
          router.push("/onboarding");
          return;
        },
        onError: (error) => {
          toast.error("Failed to accept invitation");
          console.error(error);
        }
      }
    );
  };

  const getInvitation = useCallback(async () => {
    if (!token) return;
    const { data } = await authClient.organization.getInvitation({
      query: {
        id: token
      }
    });
    if (data) {
      setInvitation(data);
    }
  }, [token]);

  useEffect(() => {
    if (sessionPending) return;
    getInvitation();

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
    }
  }, [session, sessionPending, router, token, email, getInvitation]);

  if (sessionPending) {
    return (
      <div className="flex flex-col justify-center items-center h-dvh">
        <p>Loading...</p>
      </div>
    );
  }

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

      <Button onClick={handleAcceptInvitation}>Accept Invitation</Button>
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
