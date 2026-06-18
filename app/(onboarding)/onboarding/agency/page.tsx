"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, User, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { getAgencyRequestByToken } from "@/app/actions/agency-onboarding";

function AgencyOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const { session, isLoading: isSessionLoading, supabase } = useSupabase();
  const { refresh: refreshProfile } = useProfile();

  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch request data based on activation token — uses server action (service role)
  // to bypass RLS since the user may not be authenticated yet at this point.
  useEffect(() => {
    async function loadRequest() {
      if (!token) {
        setError("Missing onboarding token.");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await getAgencyRequestByToken(token);

        if (fetchError || !data) {
          console.error("Error fetching request:", fetchError);
          setError("Invalid or expired onboarding link.");
          return;
        }

        if (data.status === "active") {
          setError("This shift assignment is already active.");
          return;
        }

        if (data.status === "offboarded") {
          setError("This shift assignment has already ended.");
          return;
        }

        setRequestData(data);
      } catch (err: any) {
        console.error("Fetch request error:", err);
        setError("Failed to verify onboarding link.");
      } finally {
        setIsLoading(false);
      }
    }

    loadRequest();
  }, [token]);

  // Check login state and email matching
  useEffect(() => {
    if (!isSessionLoading && !isLoading && requestData) {
      if (!session) {
        // Redirect to signup/login if not authenticated
        const params = new URLSearchParams();
        params.set("redirect", "onboarding-agency");
        if (token) params.set("token", token);
        if (emailParam || requestData.agency_staff?.email) {
          params.set("email", emailParam || requestData.agency_staff.email);
        }
        
        toast.info("Please log in or register to activate your assignment.");
        router.push(`/login?${params.toString()}`);
      }
    }
  }, [session, isSessionLoading, isLoading, requestData, router, token, emailParam]);

  const handleActivate = async () => {
    if (!session || !requestData) return;

    // Double check email alignment
    const userEmail = session.user?.email;
    const targetEmail = requestData.agency_staff?.email;

    if (userEmail?.toLowerCase() !== targetEmail?.toLowerCase()) {
      toast.error("Logged-in email does not match assignment email.");
      return;
    }

    setIsActivating(true);
    try {
      const timestamp = new Date().toISOString();
      
      // Determine the persona based on agency role
      const agencyRole = requestData.agency_staff?.role;
      const careoRole = agencyRole === "nurse" ? "agency_nurse" : "agency_care_assistant";

      // 1. Update public.users
      const { error: userError } = await supabase
        .from("users")
        .upsert({
          id: session.user.id,
          email: targetEmail,
          name: requestData.agency_staff?.name,
          role: careoRole,
          is_saas_admin: false,
          active_organization_id: requestData.organization_id,
          active_care_home_id: requestData.care_home_id,
          active_team_id: requestData.team_id,
          is_onboarding_complete: true,
          updated_at: timestamp
        }, {
          onConflict: 'id'
        });

      if (userError) throw userError;

      // 2. Add to public.team_staff
      if (requestData.team_id) {
        const { error: teamStaffError } = await supabase
          .from("team_staff")
          .upsert({
            team_id: requestData.team_id,
            user_id: session.user.id,
            role: careoRole,
            assigned_at: timestamp
          }, {
            onConflict: 'team_id,user_id'
          });

        if (teamStaffError) throw teamStaffError;
      }

      // 3. Update agency_requests status
      const { error: requestError } = await supabase
        .from("agency_requests")
        .update({
          status: "active",
          activated_at: timestamp,
          updated_at: timestamp
        })
        .eq("id", requestData.id);

      if (requestError) throw requestError;

      // 4. Update agency_staff status and auth ID
      const { error: staffError } = await supabase
        .from("agency_staff")
        .update({
          status: "active",
          auth_user_id: session.user.id,
          updated_at: timestamp
        })
        .eq("id", requestData.agency_staff_id);

      if (staffError) throw staffError;

      // 5. Force auth metadata update via RPC or trigger (trigger on_user_change_sync_metadata will sync role and IDs automatically)
      
      toast.success("Shift assignment successfully activated!");
      await refreshProfile();
      
      // Delay slightly for profile sync
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err: any) {
      console.error("Activation error:", err);
      toast.error(err.message || "Failed to activate shift assignment.");
    } finally {
      setIsActivating(false);
    }
  };

  if (isSessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50 p-4">
        <Card className="w-full max-w-md shadow-lg border-slate-100">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50 p-4">
        <Card className="w-full max-w-md shadow-lg border-red-100">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-slate-800">Onboarding Failed</CardTitle>
            <CardDescription className="mt-2 text-slate-600">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-slate-800 hover:bg-slate-900">Return to Log In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Double check if emails align when logged in
  const userEmail = session?.user?.email;
  const targetEmail = requestData?.agency_staff?.email;
  const isEmailMismatch = userEmail && targetEmail && userEmail.toLowerCase() !== targetEmail.toLowerCase();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50/50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-100/80 overflow-hidden bg-white/95 backdrop-blur-md">
        <div className="h-2 bg-teal-600 w-full" />
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-100 capitalize">
              Agency Assignment
            </Badge>
            <Badge variant="outline" className="text-slate-500 capitalize">
              {requestData?.agency_staff?.role?.replace("_", " ")}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 pt-2">
            Activate Shift Assignment
          </CardTitle>
          <CardDescription className="text-slate-600">
            Confirm your details to connect your agency account with the care home system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assignment Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-teal-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Care Home / Team</p>
                <p className="text-slate-800 font-medium">{requestData?.care_homes?.name}</p>
                <p className="text-xs text-slate-600">{requestData?.teams?.name || "All Units"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border-t border-slate-200/60 pt-3">
              <User className="h-5 w-5 text-teal-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Staff Member</p>
                <p className="text-slate-800 font-medium">{requestData?.agency_staff?.name}</p>
                <p className="text-xs text-slate-600">{requestData?.agency_staff?.email}</p>
              </div>
            </div>
          </div>

          {/* Email mismatch warnings */}
          {isEmailMismatch && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-xs flex gap-2.5">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold block mb-0.5">Email Mismatch Detected</span>
                You are currently signed in as <strong className="font-semibold">{userEmail}</strong>, but this assignment belongs to <strong className="font-semibold">{targetEmail}</strong>. Please switch accounts.
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {isEmailMismatch ? (
            <Button
              className="w-full bg-slate-800 hover:bg-slate-900"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
            >
              Sign Out & Relogin
            </Button>
          ) : (
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium gap-2 py-6 rounded-xl"
              disabled={isActivating || !session}
              onClick={handleActivate}
            >
              {isActivating ? (
                "Activating Shift..."
              ) : (
                <>
                  Accept & Start Shift
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
          <p className="text-[10px] text-center text-slate-500 mt-2">
            By accepting, you will gain access to patient care charts and medication sheets for this care home.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AgencyOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <p className="text-slate-500">Loading activation info...</p>
      </div>
    }>
      <AgencyOnboardingContent />
    </Suspense>
  );
}
