"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldAlert, User, ClipboardCheck } from "lucide-react";

export default function RqiaSessionPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { supabase } = useSupabase();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Pre-fill name from profile if available
  useEffect(() => {
    if (profile?.name) {
      const parts = profile.name.trim().split(" ");
      if (parts.length > 0) {
        setFirstName(parts[0]);
        if (parts.length > 1) {
          setLastName(parts.slice(1).join(" "));
        }
      }
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    if (!lastName.trim()) {
      toast.error("Please enter your last name");
      return;
    }

    startTransition(async () => {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Insert session log entry into public.rqia_login_logs table
      if (supabase && profile?.id) {
        try {
          const { error: logError } = await supabase.from("rqia_login_logs").insert({
            user_id: profile.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            care_home_id: profile.active_care_home_id || (profile as any).care_home_id || null,
            organization_id: profile.active_organization_id || (profile as any).organization_id || null,
            logged_in_at: new Date().toISOString()
          });

          if (logError) {
            console.error("Failed to insert RQIA login log:", logError);
          }
        } catch (err) {
          console.error("Failed to log RQIA session entry:", err);
        }
      }

      const sessionData = {
        userId: profile?.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        timestamp: Date.now()
      };

      // Set cookie (session cookie, cleared when browser session closes)
      document.cookie = `rqia_session_data=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; SameSite=Lax`;

      toast.success("RQIA inspection session registered successfully");
      router.push("/dashboard/rqia-portal" as any);
    });
  };

  if (profile && profile.role !== "rqia") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          This portal is reserved for Regulation and Quality Improvement Authority (RQIA) inspectors.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-8 px-4">
      <Card className="w-full max-w-lg border-0 shadow-lg bg-white">
        <CardHeader className="space-y-1 text-center bg-blue-50/70 rounded-t-xl py-6 border-b border-blue-100">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white mb-2 shadow-md">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-950">
            RQIA Inspection Portal Registration
          </CardTitle>
          <CardDescription className="text-blue-700/80">
            Please enter your first name and last name to proceed with your inspection session.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <User className="w-4 h-4 text-blue-600" /> First Name
              </Label>
              <Input
                id="firstName"
                placeholder="e.g. Sarah"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isPending}
                required
                className="h-11 border-gray-300 focus-visible:ring-blue-600"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <User className="w-4 h-4 text-blue-600" /> Last Name
              </Label>
              <Input
                id="lastName"
                placeholder="e.g. Jenkins"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isPending}
                required
                className="h-11 border-gray-300 focus-visible:ring-blue-600"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm transition-all mt-4"
            >
              {isPending ? "Accessing Portal..." : "Enter Inspection Portal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
