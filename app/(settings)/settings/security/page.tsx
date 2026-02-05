"use client";

import { Form } from "@/components/ui/form";
import { FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@/types";
import SessionPill from "@/components/settings/SessionPill";
import UserRevokeSingleSessionModal from "@/components/settings/members/UserRevokeSingleSessionModal";
import UserRevokeAllSessionsModal from "@/components/settings/members/UserRevokeAllSessionsModal";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export default function SecurityPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const { profile } = useProfile();
  const { user } = useSupabase();

  // Update local state when user data loads
  useEffect(() => {
    getUserSessions();
    // Two-factor auth not yet implemented in Supabase migration
    setTwoFactorEnabled(false);
  }, [profile, user]);

  const schema = z.object({
    password: z.string().min(8)
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: ""
    }
  });

  function handleSwitchClick() {
    setOpenDialog(true);
    // Don't change switch state here - only on successful enable
  }

  function handleEnable2FA() {
    toast.error("Two-factor authentication settings are currently unavailable.");
    setOpenDialog(false);
  }

  async function getUserSessions() {
    // contrast to BetterAuth, Supabase doesn't expose listSessions client-side easily
    setSessions([]);
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Security</p>
      <div className="flex flex-row justify-between items-start w-full">
        <div className="flex flex-col justify-start items-start">
          <p className="font-medium">Sessions</p>
          <p className="text-sm text-muted-foreground">
            Devices logged into your account
          </p>
        </div>
        <UserRevokeAllSessionsModal
          name={profile?.name ?? user?.email?.split("@")[0] ?? ""}
          email={user?.email ?? ""}
        />
      </div>
      {sessions.length ? (
        sessions.map((session) => (
          <SessionPill
            key={session.id}
            ipAddress={session.ipAddress ?? ""}
            sessionId={session.id}
            sessionToken={session.token}
            createdAt={session.createdAt}
            userName={profile?.name ?? user?.email?.split("@")[0] ?? ""}
            userEmail={user?.email ?? ""}
            revokeSessionComponent={
              <UserRevokeSingleSessionModal
                sessionToken={session.token}
                name={profile?.name ?? user?.email?.split("@")[0] ?? ""}
                email={user?.email ?? ""}
              />
            }
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No sessions found</p>
      )}
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <p className="font-medium">
          {twoFactorEnabled
            ? "Disable two-factor authentication"
            : "Enable two-factor authentication"}
        </p>
        <div className="grid grid-cols-5 gap-2">
          <p className="text-sm text-muted-foreground col-span-4">
            Managers will be able to enforce two-factor authentication for all
            users.
          </p>
          <Switch
            checked={twoFactorEnabled}
            onCheckedChange={handleSwitchClick}
          />
        </div>
      </div>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Introduce your password</DialogTitle>
            <DialogDescription>
              {twoFactorEnabled
                ? "We want to make sure it is you before we disable two-factor authentication."
                : "We want to make sure it is you before we enable two-factor authentication."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEnable2FA)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <Input
                    icon={LockIcon}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    showPasswordToggle={
                      <Button
                        disabled={isLoading}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-md"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowPassword(!showPassword);
                        }}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </Button>
                    }
                    {...field}
                  />
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
