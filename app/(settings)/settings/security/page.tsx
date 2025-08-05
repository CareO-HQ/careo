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
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";

export default function SecurityPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const user = useQuery(api.auth.getCurrentUser);

  // Update local state when user data loads
  useEffect(() => {
    if (user) {
      setTwoFactorEnabled(user.twoFactorEnabled ?? false);
    }
  }, [user]);

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
    startTransition(async () => {
      // If enable, disable it
      if (twoFactorEnabled) {
        await authClient.twoFactor.disable(
          {
            password: form.getValues("password")
          },
          {
            onSuccess: () => {
              toast.success("Two-factor authentication disabled");
              setTwoFactorEnabled(false);
              setOpenDialog(false);
            },
            onError: () => {
              toast.error("Invalid password");
            }
          }
        );
        return;
      }
      await authClient.twoFactor.enable(
        {
          password: form.getValues("password"), // required
          issuer: "my-app-name"
        },
        {
          onSuccess: () => {
            toast.success("Two-factor authentication enabled");
            setTwoFactorEnabled(true);
            setOpenDialog(false);
          },
          onError: () => {
            toast.error("Invalid password");
          }
        }
      );
    });
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Security</p>
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
