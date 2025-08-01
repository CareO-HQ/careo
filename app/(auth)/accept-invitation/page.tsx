"use client";

import { useQueryState } from "nuqs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useEffect, Suspense } from "react";
import { toast } from "sonner";

function AcceptInvitationContent() {
  const router = useRouter();
  const [token] = useQueryState("token");

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = useQuery(api.auth.getCurrentUser);

  const handleAcceptInvitation = async () => {
    await authClient.organization.acceptInvitation(
      {
        invitationId: token!
      },
      {
        onSuccess: () => {
          toast.success("Invitation accepted");
          router.push("/dashboard");
        },
        onError: (error) => {
          toast.error("Failed to accept invitation");
          console.error(error);
        }
      }
    );
  };

  useEffect(() => {
    if (sessionPending) return;

    if (!session) {
      const params = new URLSearchParams();
      params.set("redirect", "accept-invitation");
      if (token) {
        params.set("token", token);
      }
      router.push(`/signup?${params.toString()}`);
    }
  }, [session, sessionPending, router, token]);

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
      {user && <p className="text-gray-600">Logged in as: {user.email}</p>}
      <p className="text-sm text-gray-500">Invitation Token: {token}</p>
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
