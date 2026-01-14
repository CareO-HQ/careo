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
import { CreateNewOrgSchema } from "@/schemas/CreateNewOrgSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function CreateOrgForm({
  onSuccess
}: {
  onSuccess: () => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const createCareHome = useMutation(api.rbac.careHomes.createCareHome);

  const form = useForm<z.infer<typeof CreateNewOrgSchema>>({
    resolver: zodResolver(CreateNewOrgSchema),
    defaultValues: {
      name: ""
    }
  });

  // 2. Define a submit handler.
  // IMPORTANT: This form creates a CARE HOME in the Convex careHomes table,
  // NOT a Better Auth organization. Organizations are created separately.
  function onSubmit(values: z.infer<typeof CreateNewOrgSchema>) {
    startTransition(async () => {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CreateOrgForm.tsx:onSubmit:entry',message:'CreateOrgForm submit',data:{name:values.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      }
      // #endregion
      try {
        // Create care home in Convex careHomes table (NOT a Better Auth organization)
        const result = await createCareHome({
          name: values.name
        });
        
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CreateOrgForm.tsx:onSubmit:result',message:'createCareHome result',data:{success:result.success,hasCareHomeId:!!result.careHomeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        }
        // #endregion

        if (result.success) {
          toast.success("Care home created successfully");
          onSuccess();
        } else {
          toast.error("Error creating Care home");
        }
      } catch (error) {
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CreateOrgForm.tsx:onSubmit:error',message:'createCareHome error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        }
        // #endregion
        const errorMessage = error instanceof Error ? error.message : "Error creating Care home";
        if (errorMessage.includes("already exists") || errorMessage.includes("already assigned")) {
          form.setError("name", {
            message: "A Care home with this name already exists"
          });
        } else {
          toast.error(errorMessage);
        }
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Care home name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
                  className="w-full"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-24 mt-4" disabled={isLoading}>
          Continue
        </Button>
      </form>
    </Form>
  );
}
