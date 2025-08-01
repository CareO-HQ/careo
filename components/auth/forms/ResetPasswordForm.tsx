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
import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

export default function ResetPasswordForm() {
  const [isLoading, startTransition] = useTransition();
  const [isSent, setIsSent] = useState(false);
  const formSchema = z.object({
    email: z.string().email()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const sent = await authClient.forgetPassword({
        email: values.email,
        redirectTo: "/new-password"
      });
      console.log(sent);
      setIsSent(true);
    });
  };

  if (isSent) {
    return (
      <div className="flex flex-col items-center justify-center bg-blue-500/15 px-4 py-3 rounded-md text-sm">
        <p>
          If you don&apos;t receive an email soon, check that the email address
          you entered is correct, check your spam folder or reach out to support
          if the issue persists.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  icon={MailIcon}
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          Send instructions
        </Button>
      </form>
    </Form>
  );
}
