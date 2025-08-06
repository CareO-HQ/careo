"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UserRevokeAllSessionsModal({
  name,
  email
}: {
  name: string;
  email: string;
}) {
  const [isLoading, startTransition] = useTransition();
  const router = useRouter();
  const revokeAllSessions = () => {
    startTransition(async () => {
      await authClient.revokeSessions(
        {},
        {
          onSuccess: () => {
            toast.success("Session revoked");
            router.refresh();
          },
          onError: () => {
            toast.error("Failed to revoke session");
          }
        }
      );
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Revoke all sessions
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke all sessions</AlertDialogTitle>
          <AlertDialogDescription>
            This will revoke access of {name} ({email}) from all devices.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading} onClick={revokeAllSessions}>
            Revoke
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
