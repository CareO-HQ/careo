"use client";

import InviteForm from "@/components/onboarding/invites/InviteForm";
import OrganizationForm from "@/components/onboarding/organization/OrganizationForm";
import ProfileForm from "@/components/onboarding/profile/ProfileForm";
import CreateMultipleTeams from "@/components/onboarding/teams/CreateMultipleTeams";
import SelectTheme from "@/components/onboarding/theme/SelectTheme";
import Stepper from "@/components/stepper/Stepper";
import ContentWrapper from "@/components/utils/ContentWrapper";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const OWNER_TOTAL_STEPS = 4;
  const MANAGER_TOTAL_STEPS = 3;
  const NURSE_TOTAL_STEPS = 2;
  const CARE_ASSISTANT_TOTAL_STEPS = 2;

  const { data: session } = authClient.useSession();
  console.log(session);

  const { data: activeMember, isPending } = authClient.useActiveMember();
  console.log(activeMember);

  if (isPending) {
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

  // OWNER ONBOARDING
  if (activeMember?.role === "owner") {
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={OWNER_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
            {step === 2 && "Choose your theme"}
            {step === 3 && "Add your Care home"}
            {step === 4 && "Invite your managing team"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
            {step === 2 &&
              "Select the theme for the application. You’ll be able to change this later."}
            {step === 3 &&
              "Create your care home now. You’ll be able to edit this later."}
            {step === 4 &&
              "Add managers and let them invite their team members."}
          </p>
          {step === 1 && <ProfileForm step={step} setStep={setStep} />}
          {step === 2 && <SelectTheme step={step} setStep={setStep} />}
          {step === 3 && <OrganizationForm step={step} setStep={setStep} />}
          {step === 4 && <InviteForm />}
        </div>
      </ContentWrapper>
    );
  }

  // MANAGER ONBOARDING
  if (activeMember?.role === "manager") {
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={MANAGER_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
            {step === 2 && "Choose your theme"}
            {step === 3 && "Create teams"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
            {step === 2 &&
              "Select the theme for the application. You'll be able to change this later."}
            {step === 3 &&
              "Create your first teams for your care home. You'll be able to create more teams and invite members to them later."}
          </p>
          {step === 1 && <ProfileForm step={step} setStep={setStep} />}
          {step === 2 && <SelectTheme step={step} setStep={setStep} />}
          {step === 3 && <CreateMultipleTeams step={step} setStep={setStep} />}
        </div>
      </ContentWrapper>
    );
  }

  // NURSE ONBOARDING
  if (activeMember?.role === "nurse") {
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={NURSE_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
            {step === 2 && "Choose your theme"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
            {step === 2 &&
              "Select the theme for the application. You'll be able to change this later."}
          </p>
          {step === 1 && <ProfileForm step={step} setStep={setStep} />}
          {step === 2 && (
            <SelectTheme
              step={step}
              setStep={setStep}
              isLastStep={step === NURSE_TOTAL_STEPS}
            />
          )}
        </div>
      </ContentWrapper>
    );
  }

  // CARE ASSISTANT ONBOARDING
  if (activeMember?.role === "care_assistant") {
    return (
      <ContentWrapper className="max-w-xl w-full">
        <div className="flex flex-col justify-start items-start mt-4">
          <span className="flex justify-center items-center w-full">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
          </span>
          {/* Stepper */}
          <Stepper step={step} totalSteps={CARE_ASSISTANT_TOTAL_STEPS} />
          <p className="text-2xl font-bold mt-4">
            {step === 1 && "Set up your profile"}
            {step === 2 && "Choose your theme"}
          </p>
          <p className="text-muted-foreground my-2">
            {step === 1 &&
              "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
            {step === 2 &&
              "Select the theme for the application. You'll be able to change this later."}
          </p>
          {step === 1 && <ProfileForm step={step} setStep={setStep} />}
          {step === 2 && (
            <SelectTheme
              step={step}
              setStep={setStep}
              isLastStep={step === CARE_ASSISTANT_TOTAL_STEPS}
            />
          )}
        </div>
      </ContentWrapper>
    );
  }

  // Fallback: If no activeMember or role doesn't match, show default onboarding
  // This handles cases where the user is newly registered and doesn't have a role yet
  return (
    <ContentWrapper className="max-w-xl w-full">
      <div className="flex flex-col justify-start items-start mt-4">
        <span className="flex justify-center items-center w-full">
          <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
        </span>
        {/* Stepper */}
        <Stepper step={step} totalSteps={NURSE_TOTAL_STEPS} />
        <p className="text-2xl font-bold mt-4">
          {step === 1 && "Set up your profile"}
          {step === 2 && "Choose your theme"}
        </p>
        <p className="text-muted-foreground my-2">
          {step === 1 &&
            "Check if the profile information is correct. You'll be able to change this later in the account settings page."}
          {step === 2 &&
            "Select the theme for the application. You'll be able to change this later."}
        </p>
        {step === 1 && <ProfileForm step={step} setStep={setStep} />}
        {step === 2 && (
          <SelectTheme
            step={step}
            setStep={setStep}
            isLastStep={step === NURSE_TOTAL_STEPS}
          />
        )}
      </div>
    </ContentWrapper>
  );
}
