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
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LeaveWorkspaceModal({
  orgId
}: {
  orgId: string | undefined;
}) {
  const [isLoading, startTransition] = useTransition();
  const router = useRouter();

  const handleLeaveWorkspace = () => {
    if (!orgId) return;
    startTransition(async () => {
      try {
        await authClient.organization.leave({
          organizationId: orgId
        });
        router.push("/");
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Leave workspace</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently remove your
            account from the workspace.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeaveWorkspace} asChild>
            <Button
              variant="destructive"
              disabled={isLoading || !orgId}
              className="text-primary"
            >
              Leave workspace
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
