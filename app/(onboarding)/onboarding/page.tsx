"use client";

import ProfileForm from "@/components/onboarding/profile/ProfileForm";
import OrganizationForm from "@/components/onboarding/organization/OrganizationForm";
import SelectTheme from "@/components/onboarding/theme/SelectTheme";
import Stepper from "@/components/stepper/Stepper";
import ContentWrapper from "@/components/utils/ContentWrapper";
import { useState } from "react";
import InviteForm from "@/components/onboarding/invites/InviteForm";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  return (
    <ContentWrapper className="max-w-xl w-full">
      <div className="flex flex-col justify-start items-start mt-4">
        <span className="flex justify-center items-center w-full">
          <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
        </span>
        {/* Stepper */}
        <Stepper step={step} totalSteps={TOTAL_STEPS} />
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
          {step === 4 && "Add managers and let them invite their team members."}
        </p>
        {step === 1 && <ProfileForm step={step} setStep={setStep} />}
        {step === 2 && <SelectTheme step={step} setStep={setStep} />}
        {step === 3 && <OrganizationForm step={step} setStep={setStep} />}
        {step === 4 && <InviteForm />}
      </div>
    </ContentWrapper>
  );
}
