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

export default function DeleteTeamModal({
  teamId
}: {
  teamId: string | undefined;
}) {
  const [isLoading, startTransition] = useTransition();
  const router = useRouter();

  const handleDeleteTeam = () => {
    if (!teamId) return;
    startTransition(async () => {
      try {
        await authClient.organization.removeTeam({
          teamId
        });
        router.push("/settings/teams");
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete team</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently remove the team
            and all its members from the workspace.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteTeam} asChild>
            <Button
              variant="destructive"
              disabled={isLoading || !teamId}
              className="text-primary"
            >
              Delete team
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
