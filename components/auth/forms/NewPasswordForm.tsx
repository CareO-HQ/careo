"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { NewPasswordSchema } from "@/schemas/auth/NewPasswordSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleCheckIcon,
  CircleXIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function NewPasswordForm() {
  const router = useRouter();
  const [isLoading, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasCapital, setHasCapital] = useState(false);
  const [hasLowercase, setHasLowercase] = useState(false);
  const [hasLength, setHasLength] = useState(false);
  const [token] = useQueryState("token");

  const form = useForm<z.infer<typeof NewPasswordSchema>>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: {
      password: ""
    }
  });

  const onSubmit = (values: z.infer<typeof NewPasswordSchema>) => {
    startTransition(async () => {
      const { error } = await authClient.resetPassword(
        {
          newPassword: values.password,
          token: token!
        },
        {
          onError: (ctx) => {
            if (ctx.error.code === "INVALID_TOKEN") {
              toast.error("Invalid token");
              return;
            }
            toast.error("Error changing password");
          },
          onSuccess: () => {
            toast.success("Password changed successfully");
          }
        }
      );
      if (!error) {
        router.push("/login");
      }
    });
  };

  useEffect(() => {
    const password = form.watch("password") || "";

    setHasLength(password.length >= 8);
    setHasCapital(/[A-Z]/.test(password));
    setHasNumber(/[0-9]/.test(password));
    setHasLowercase(/[a-z]/.test(password));
  }, [form, password]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {!hasLength ? (
            <div
              className="flex items-center gap-1 text-sm text-muted-foreground
            "
            >
              <CircleXIcon className="w-3 h-3" />8 characters or more
            </div>
          ) : !hasCapital ? (
            <div
              className="flex items-center gap-1 text-sm text-muted-foreground
            "
            >
              <CircleXIcon className="w-3 h-3" />
              At least one capital letter
            </div>
          ) : !hasNumber ? (
            <div
              className="flex items-center gap-1 text-sm text-muted-foreground
            "
            >
              <CircleXIcon className="w-3 h-3" />
              At least one number
            </div>
          ) : !hasLowercase ? (
            <div
              className="flex items-center gap-1 text-sm text-muted-foreground
            "
            >
              <CircleXIcon className="w-3 h-3" />
              At least one lowercase letter
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-emerald-500">
              <CircleCheckIcon className="w-3 h-3" />
              Correcto
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={
            isLoading ||
            !hasLength ||
            !hasCapital ||
            !hasNumber ||
            !hasLowercase
          }
          className="w-full"
        >
          Change password
        </Button>
      </form>
    </Form>
  );
}
