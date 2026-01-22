"use client";

import LeaveWorkspaceModal from "@/components/settings/LeaveWorkspaceModal";
import PersonalDetailsForm from "@/components/settings/PersonalDetailsForm";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "next-themes";

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useSupabase();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { setTheme, theme } = useTheme();
  const isPending = isAuthLoading || isProfileLoading;

  const handleThemeChange = (theme: string) => {
    setTheme(theme);
  };

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Profile</p>
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <p className="font-medium">Personal details</p>
        <PersonalDetailsForm
          isPending={isPending}
          name={profile?.name ?? ""}
          email={profile?.email ?? ""}
          imageUrl={profile?.image_url ?? ""}
        />
      </div>
      <Separator />
      {/* Theme selector - TODO: Move to a separate component */}
      {/* ... (Theme selector content) ... */}
      <Separator />
      {/* Workspace access */}
      <div className="w-full">
        <p className="font-medium">Workspace access</p>
        <div className="w-full flex flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Remove yourself from the workspace
          </p>
          <LeaveWorkspaceModal orgId={profile?.active_organization_id ?? undefined} />
        </div>
      </div>
    </div>
  );
}
