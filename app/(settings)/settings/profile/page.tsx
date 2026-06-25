"use client";

import PersonalDetailsForm from "@/components/settings/PersonalDetailsForm";
import ProfessionalRegistrationForm from "@/components/settings/ProfessionalRegistrationForm";
import { Separator } from "@/components/ui/separator";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";

const PROFESSIONAL_REGISTRATION_ROLES = ["nurse", "care_assistant", "manager"];

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useSupabase();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const isPending = isAuthLoading || isProfileLoading;
  const showProfessionalRegistration = PROFESSIONAL_REGISTRATION_ROLES.includes(
    profile?.role ?? ""
  );

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Profile</p>
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <p className="font-medium">Personal details</p>
        <PersonalDetailsForm
          isPending={isPending}
          name={profile?.name ?? ""}
          email={profile?.email ?? ""}
          imageUrl={profile?.image_url ?? ""}
        />
      </div>
      {showProfessionalRegistration && (
        <>
          <Separator />
          <div className="flex flex-col justify-start items-start gap-2 w-full">
            <p className="font-medium">Professional registration</p>
            <ProfessionalRegistrationForm
              isPending={isPending}
              nmcPinNumber={profile?.nmc_pin_number ?? ""}
              nmcRenewalFeeDate={profile?.nmc_renewal_fee_date ?? ""}
              nisccRegistrationNumber={profile?.niscc_registration_number ?? ""}
              nisccRegistrationDate={profile?.niscc_registration_date ?? ""}
              nisccAnnualFeeDate={profile?.niscc_annual_fee_date ?? ""}
            />
          </div>
        </>
      )}
    </div>
  );
}
