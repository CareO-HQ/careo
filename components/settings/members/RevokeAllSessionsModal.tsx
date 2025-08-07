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

export default function RevokeAllSessionsModal({
  userId,
  name,
  email,
  sessionsCount
}: {
  userId: string;
  name: string;
  email: string;
  sessionsCount: number;
}) {
  const [isLoading, startTransition] = useTransition();
  const router = useRouter();
  const revokeAllUserSessions = () => {
    startTransition(async () => {
      await authClient.admin.revokeUserSessions(
        {
          userId
        },
        {
          onSuccess: () => {
            toast.success("All sessions revoked");
            router.refresh();
          },
          onError: () => {
            toast.error("Failed to revoke some of the sessions");
          }
        }
      );
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={sessionsCount === 0}
        >
          Revoke all sessions
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Revoke {sessionsCount} {sessionsCount === 1 && "session"}
            {sessionsCount > 1 && "sessions"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will revoke all active sessions of {name} ({email}). This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={revokeAllUserSessions}
          >
            Revoke all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
