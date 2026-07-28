"use client";

import InviteForm from "@/components/onboarding/invites/InviteForm";
import CareHomeForm from "@/components/onboarding/careHome/CareHomeForm";
import ProfileForm from "@/components/onboarding/profile/ProfileForm";
import CreateMultipleTeams from "@/components/onboarding/teams/CreateMultipleTeams";
import Stepper from "@/components/stepper/Stepper";
import ContentWrapper from "@/components/utils/ContentWrapper";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const OWNER_TOTAL_STEPS = 3;
  const MANAGER_PROFILE_ONLY_STEPS = 1;
  const MANAGER_WITH_TEAM_SETUP_STEPS = 2;
  const NURSE_TOTAL_STEPS = 1;
  const CARE_ASSISTANT_TOTAL_STEPS = 1;

  const { session, user, isLoading: isAuthLoading } = useSupabase();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();

  // Use profile data but fall back to auth metadata if profile hasn't synced yet
  const isSaasAdmin = profile?.is_saas_admin === true || user?.app_metadata?.role === 'saas_admin' || user?.app_metadata?.is_saas_admin === true;
  const userRole = profile?.role || (user?.app_metadata?.role as string);
  const isOnboardingComplete = profile?.is_onboarding_complete === true;
  const [managerNeedsTeamCreation, setManagerNeedsTeamCreation] = useState(false);
  const [isCheckingManagerTeams, setIsCheckingManagerTeams] = useState(false);

  console.log("[DEBUG onboarding] state:", {
    isProfileLoading,
    isAuthLoading,
    isSaasAdmin,
    userRole,
    isOnboardingComplete,
    profileId: profile?.id
  });

  // Early return: Redirect SaaS Admin to admin dashboard if onboarding is already complete
  useEffect(() => {
    if (!isProfileLoading && isSaasAdmin && isOnboardingComplete) {
      console.log("[DEBUG onboarding] REDIRECTING SaaS Admin to /admin");
      router.push("/admin");
    }
  }, [isSaasAdmin, isOnboardingComplete, isProfileLoading, router]);

  // Redirect users with roles to dashboard if onboarding is already complete
  useEffect(() => {
    if (!isProfileLoading && !isSaasAdmin && userRole && isOnboardingComplete) {
      console.log(`[DEBUG onboarding] REDIRECTING User with role ${userRole} to dashboard`);
      router.push("/dashboard");
    }
  }, [isSaasAdmin, userRole, isOnboardingComplete, isProfileLoading, router]);

  useEffect(() => {
    const checkManagerTeams = async () => {
      if (isProfileLoading || userRole !== "manager") {
        setManagerNeedsTeamCreation(false);
        setIsCheckingManagerTeams(false);
        return;
      }

      if (!profile?.active_care_home_id) {
        setManagerNeedsTeamCreation(false);
        setIsCheckingManagerTeams(false);
        return;
      }

      setIsCheckingManagerTeams(true);
      try {
        const { data, error } = await supabase
          .from("teams")
          .select("id")
          .eq("care_home_id", profile.active_care_home_id)
          .limit(1);

        if (error) {
          console.error("Failed to check existing teams during onboarding:", error);
          setManagerNeedsTeamCreation(false);
          return;
        }

        setManagerNeedsTeamCreation((data?.length ?? 0) === 0);
      } catch (error) {
        console.error("Unexpected error while checking manager teams:", error);
        setManagerNeedsTeamCreation(false);
      } finally {
        setIsCheckingManagerTeams(false);
      }
    };

    checkManagerTeams();
  }, [isProfileLoading, userRole, profile?.active_care_home_id]);

  // Show loading while checking onboarding status
  if (isAuthLoading || isProfileLoading || (userRole === "manager" && isCheckingManagerTeams)) {
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // If no session, redirect to login (this shouldn't happen due to middleware, but handle it anyway)
  if (!session) {
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Authentication Required</p>
            <p className="text-muted-foreground">Please sign in to continue.</p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // SAAS ADMIN ONBOARDING (first user)
  if (isSaasAdmin && !isOnboardingComplete) {
    const SAAS_ADMIN_TOTAL_STEPS = 1;
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img
              src="/images/CareO_Logo.png"
              alt="CareO"
              className="h-8 w-auto max-w-[140px] object-contain object-left"
            />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={SAAS_ADMIN_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Welcome! As the platform administrator, set up your profile. You&apos;ll be able to manage all care homes and create new owners."}
          </p>
          {step === 1 && <ProfileForm step={step} setStep={setStep} isLastStep={true} />}
        </div>
      </ContentWrapper>
    );
  }

  // If SaaS Admin but onboarding is complete, show loading
  if (isSaasAdmin && isOnboardingComplete) {
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Redirecting to admin dashboard...</p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // OWNER ONBOARDING
  if (userRole === "owner") {
    // Redirect if onboarding already complete
    if (isOnboardingComplete) {
      return (
        <ContentWrapper className="max-w-xl w-full">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          </div>
        </ContentWrapper>
      );
    }

    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img
              src="/images/CareO_Logo.png"
              alt="CareO"
              className="h-8 w-auto max-w-[140px] object-contain object-left"
            />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={OWNER_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
            {step === 2 && "Add your Care home"}
            {step === 3 && "Invite your managing team"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
            {step === 2 &&
              "Create your care home now. You’ll be able to edit this later."}
            {step === 3 &&
              "Add managers and let them invite their team members."}
          </p>
          {step === 1 && <ProfileForm step={step} setStep={setStep} />}
          {step === 2 && <CareHomeForm step={step} setStep={setStep} />}
          {step === 3 && <InviteForm />}
        </div>
      </ContentWrapper>
    );
  }

  // MANAGER ONBOARDING
  if (userRole === "manager") {
    // Redirect if onboarding already complete
    if (isOnboardingComplete) {
      return (
        <ContentWrapper className="max-w-xl w-full">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          </div>
        </ContentWrapper>
      );
    }

    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img
              src="/images/CareO_Logo.png"
              alt="CareO"
              className="h-8 w-auto max-w-[140px] object-contain object-left"
            />
          </span>
          {/* Stepper */}
          <Stepper
            step={step}
            totalSteps={
              managerNeedsTeamCreation
                ? MANAGER_WITH_TEAM_SETUP_STEPS
                : MANAGER_PROFILE_ONLY_STEPS
            }
          />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
            {step === 2 && managerNeedsTeamCreation && "Create teams"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
            {step === 2 &&
              managerNeedsTeamCreation &&
              "Create your first teams for your care home. You'll be able to create more teams and invite members to them later."}
          </p>
          {step === 1 && (
            <ProfileForm
              step={step}
              setStep={setStep}
              isLastStep={!managerNeedsTeamCreation}
            />
          )}
          {step === 2 && managerNeedsTeamCreation && (
            <CreateMultipleTeams step={step} setStep={setStep} />
          )}
        </div>
      </ContentWrapper>
    );
  }

  // NURSE ONBOARDING
  if (userRole === "nurse") {
    // Redirect if onboarding already complete
    if (isOnboardingComplete) {
      return (
        <ContentWrapper className="max-w-xl w-full">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          </div>
        </ContentWrapper>
      );
    }

    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img
              src="/images/CareO_Logo.png"
              alt="CareO"
              className="h-8 w-auto max-w-[140px] object-contain object-left"
            />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={NURSE_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
          </p>
          {step === 1 && (
            <ProfileForm
              step={step}
              setStep={setStep}
              isLastStep={true}
            />
          )}
        </div>
      </ContentWrapper>
    );
  }

  // CARE ASSISTANT ONBOARDING
  if (userRole === "care_assistant") {
    // Redirect if onboarding already complete
    if (isOnboardingComplete) {
      return (
        <ContentWrapper className="max-w-xl w-full">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          </div>
        </ContentWrapper>
      );
    }

    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img
              src="/images/CareO_Logo.png"
              alt="CareO"
              className="h-8 w-auto max-w-[140px] object-contain object-left"
            />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={CARE_ASSISTANT_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
          </p>
          {step === 1 && (
            <ProfileForm
              step={step}
              setStep={setStep}
              isLastStep={true}
            />
          )}
        </div>
      </ContentWrapper>
    );
  }

  // MDT or RQIA ONBOARDING
  if (userRole === "mdt" || userRole === "rqia") {
    // Redirect if onboarding already complete
    if (isOnboardingComplete) {
      return (
        <ContentWrapper className="max-w-xl w-full">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          </div>
        </ContentWrapper>
      );
    }

    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img
              src="/images/CareO_Logo.png"
              alt="CareO"
              className="h-8 w-auto max-w-[140px] object-contain object-left"
            />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={1} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
          </p>
          {step === 1 && (
            <ProfileForm
              step={step}
              setStep={setStep}
              isLastStep={true}
            />
          )}
        </div>
      </ContentWrapper>
    );
  }

  // Fallback: If no activeMember or role doesn't match, show new user onboarding
  // This handles cases where the user is newly registered and doesn't have a role yet
  // They need to create an organization to become an owner
  const NEW_USER_TOTAL_STEPS = 3;

  return (
    <ContentWrapper className="max-w-xl w-full">
      <div className="flex flex-col justify-start items-start mt-4">
        <span className="flex justify-center items-center w-full">
          <img
            src="/images/CareO_Logo.png"
            alt="CareO"
            className="h-8 w-auto max-w-[140px] object-contain object-left"
          />
        </span>
        {/* Stepper */}
        <Stepper step={step} totalSteps={NEW_USER_TOTAL_STEPS} />
        <p className="text-2xl font-bold mt-4">
          {step === 1 && "Set up your profile"}
          {step === 2 && "Create your Care Home"}
          {step === 3 && "Invite your managing team"}
        </p>
        <p className="text-muted-foreground my-2">
          {step === 1 &&
            "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
          {step === 2 &&
            "Create your care home organization. You'll become the owner and can invite your team."}
          {step === 3 &&
            "Add managers and let them invite their team members."}
        </p>
        {step === 1 && <ProfileForm step={step} setStep={setStep} />}
        {step === 2 && <CareHomeForm step={step} setStep={setStep} />}
        {step === 3 && <InviteForm />}
      </div>
    </ContentWrapper>
  );
}
