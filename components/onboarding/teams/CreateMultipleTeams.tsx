"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { CreateMultipleTeamsSchema } from "@/schemas/CreateMultipleTeamsSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { PlusIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function CreateMultipleTeams({
  step,
  setStep
}: {
  step: number;
  setStep: (step: number) => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const organization = authClient.useActiveOrganization();
  const router = useRouter();
  const setIsOnboardingCompleted = useMutation(
    api.user.setIsOnboardingCompleted
  );
  const existingTeams = useQuery(api.auth.getTeamsForCurrentUser) || [];
  const updateActiveTeam = useMutation(api.auth.updateActiveTeam);

  const form = useForm<z.infer<typeof CreateMultipleTeamsSchema>>({
    resolver: zodResolver(CreateMultipleTeamsSchema),
    defaultValues: {
      teams: [
        {
          name: ""
        }
      ]
    }
  });

  function onSubmit(values: z.infer<typeof CreateMultipleTeamsSchema>) {
    startTransition(async () => {
      try {
        // Filter out teams with empty names
        const teamsWithNames = values.teams.filter(
          (team) => team?.name && team.name.trim() !== ""
        );

        const finalData = {
          ...values,
          teams: teamsWithNames
        };

        let createdCount = 0;
        let existingCount = 0;
        let errorCount = 0;

        for (const team of finalData.teams) {
          if (!team?.name) continue;

          // Check if team already exists in the fetched list
          const existingTeam = existingTeams.find(
            (t: any) => t.name.toLowerCase() === team.name.toLowerCase()
          );

          if (existingTeam) {
            toast.info(`Team "${team.name}" already exists`);
            try {
              await updateActiveTeam({ teamId: existingTeam.id });
            } catch (e) {
              console.error("Failed to set active team:", e);
            }
            existingCount++;
            continue;
          }

          try {
            const { error } = await authClient.organization.createTeam({
              name: team.name,
              organizationId: organization?.data?.id
            });

            if (!error) {
              createdCount++;
            } else {
              // Check if team already exists (fallback if not in list yet)
              if (
                error.message?.toLowerCase().includes("exist") ||
                error.code === "TEAM_EXISTS"
              ) {
                toast.info(`Team "${team.name}" already exists`);
                // Treat as success for the purpose of onboarding flow
                existingCount++;
              } else {
                errorCount++;
                console.error("Error creating team:", error);
              }
            }
          } catch (error: any) {
            if (
              error?.message?.toLowerCase().includes("exist") ||
              error?.code === "TEAM_EXISTS"
            ) {
              toast.info(`Team "${team.name}" already exists`);
              existingCount++;
            } else {
              errorCount++;
              console.error("Error creating team:", error);
            }
          }
        }

        if (createdCount > 0) {
          toast.success(
            `${createdCount} team${createdCount > 1 ? "s" : ""} created successfully`
          );
        }

        if (errorCount > 0) {
          toast.error(
            `Failed to create ${errorCount} team${errorCount > 1 ? "s" : ""}`
          );
        }

        router.push("/dashboard");
        await setIsOnboardingCompleted();
      } catch (error) {
        console.error("Error creating teams:", error);
        toast.error("An unexpected error occurred");
      }
    });
  }

  const MAX_TEAMS = 5;

  const addTeam = () => {
    const currentTeams = form.getValues("teams");
    if (currentTeams.length < MAX_TEAMS) {
      form.setValue("teams", [...currentTeams, { name: "" }]);
    }
  };

  const removeTeam = (index: number) => {
    const currentTeams = form.getValues("teams");
    if (currentTeams.length > 1) {
      const updatedTeams = currentTeams.filter((_, i) => i !== index);
      form.setValue("teams", updatedTeams);
    }
  };

  const teams = form.watch("teams");

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 w-full"
        >
          <FormField
            control={form.control}
            name="teams"
            render={() => (
              <FormItem>
                <div className="flex flex-row justify-between items-center">
                  <h3 className="font-medium">Team names</h3>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addTeam}
                    disabled={isLoading || teams.length >= MAX_TEAMS}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add team
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            {teams.map((_, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <FormField
                    control={form.control}
                    name={`teams.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Team"
                            {...field}
                            value={field.value || ""}
                            disabled={isLoading}
                          />
                        </FormControl>
                        {field.value && field.value.trim() !== "" && (
                          <FormMessage />
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                {teams.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTeam(index)}
                    disabled={isLoading}
                    className="px-2"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-start pt-4">
            <Button type="submit" className="px-8" disabled={isLoading}>
              Finish
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
