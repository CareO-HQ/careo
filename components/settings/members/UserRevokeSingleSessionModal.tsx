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

/**
 * This component uses a USER method to revoke a session.
 */
export default function UserRevokeSingleSessionModal({
  sessionToken,
  name,
  email
}: {
  sessionToken: string;
  name: string;
  email: string;
}) {
  const [isLoading, startTransition] = useTransition();
  const router = useRouter();
  const revokeSession = () => {
    startTransition(async () => {
      await authClient.revokeSession(
        {
          token: sessionToken
        },
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
          Revoke
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke access</AlertDialogTitle>
          <AlertDialogDescription>
            This will revoke access of {name} ({email}) from the device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading} onClick={revokeSession}>
            Revoke
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
