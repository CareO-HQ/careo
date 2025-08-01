"use client";

import LeaveWorkspaceModal from "@/components/settings/LeaveWorkspaceModal";
import PersonalDetailsForm from "@/components/settings/PersonalDetailsForm";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "next-themes";

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const { data: member } = authClient.useActiveMember();
  const { setTheme, theme } = useTheme();

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
          name={session?.user?.name ?? ""}
          email={session?.user?.email ?? ""}
          imageUrl={session?.user?.image ?? ""}
        />
      </div>
      <Separator />
      {/* Theme selector - TODO: Move to a separate component */}
      <div className="space-y-6 w-full max-w-sm">
        <p className="font-medium">Theme</p>
        <RadioGroup
          className="grid-cols-3"
          defaultValue={theme}
          onValueChange={handleThemeChange}
        >
          <div className="border-input has-data-[state=checked]:border-primary/50 relative flex flex-col gap-4 rounded-md border shadow-xs outline-none bg-zinc-100 h-16 overflow-hidden">
            <RadioGroupItem
              id="light"
              value="light"
              className="absolute bottom-2 right-2 z-10 after:absolute after:inset-0"
            />
            <Label htmlFor="light" className="h-full relative">
              <div className="absolute bottom-0 right-0 border-l border-t border-zinc-200 bg-white h-12 w-20 rounded-tl rounded-br px-2 py-1 text-lg pointer-events-none">
                <p className="text-black">Aa</p>
              </div>
            </Label>
          </div>
          <div className="border-input has-data-[state=checked]:border-primary/50 relative flex flex-col gap-4 rounded-md border shadow-xs outline-none bg-zinc-900 h-16 overflow-hidden">
            <RadioGroupItem
              id="dark"
              value="dark"
              className="absolute bottom-2 right-2 z-10 after:absolute after:inset-0"
            />
            <Label htmlFor="dark" className="h-full relative">
              <div className="absolute bottom-0 right-0 border-l border-zinc-700 border-t bg-zinc-800 h-12 w-20 rounded-tl rounded-br px-2 py-1 text-lg pointer-events-none">
                <p className="text-white">Aa</p>
              </div>
            </Label>
          </div>
          <div className="border-input has-data-[state=checked]:border-primary/50 relative rounded-md border shadow-xs outline-none h-16 overflow-hidden">
            <RadioGroupItem
              id="system"
              value="system"
              className="absolute bottom-2 right-2 z-10 after:absolute after:inset-0 border-zinc-200"
            />
            <Label
              htmlFor="system"
              className="h-full flex flex-row justify-center items-end gap-0"
            >
              <div className="bg-zinc-100 h-full flex flex-col justify-end w-full pl-3">
                <div className="flex-1  flex flex-col justify-end">
                  <div className="border-l border-t border-zinc-200 bg-white h-12 flex items-start justify-start pl-2 text-sm pointer-events-none rounded-tl">
                    <p className="text-black">Aa</p>
                  </div>
                </div>
              </div>

              {/* Right half - Dark */}
              <div className="bg-zinc-900 h-full flex flex-col justify-end w-full pl-3">
                <div className="flex-1  flex flex-col justify-end">
                  <div className="border-l border-t border-zinc-700 bg-zinc-800 h-12 flex items-start justify-start pl-2 text-sm pointer-events-none rounded-tl">
                    <p className="text-white">Aa</p>
                  </div>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
      <Separator />
      {/* Workspace access */}
      <div className="w-full">
        <p className="font-medium">Workspace access</p>
        <div className="w-full flex flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Remove yourself from the workspace
          </p>
          <LeaveWorkspaceModal orgId={member?.organizationId} />
        </div>
      </div>
    </div>
  );
}
