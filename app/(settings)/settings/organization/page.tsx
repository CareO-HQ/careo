"use client";

import OrganizationDetailsForm from "@/components/settings/OrganizationDetailsForm";
import OrganizationNameLogoForm from "@/components/settings/OrganizationNameLogoForm";
import OrganizationSocialMediaForm from "@/components/settings/OrganizationSocialMediaForm";
import { Separator } from "@/components/ui/separator";
import { useCallback, useState, useEffect } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";

export default function OrganizationPage() {
  const { activeOrganizationId } = useActiveTeam();
  const { supabase } = useSupabase();
  const { profile } = useProfile();
  const [activeOrganization, setActiveOrganization] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const canEditOrganization = profile?.role === "owner";

  const refetch = useCallback(async () => {
    if (!activeOrganizationId) return;
    setIsPending(true);
    const { data } = await supabase.from('organizations').select('*').eq('id', activeOrganizationId).single();
    setActiveOrganization(data);
    setIsPending(false);
  }, [activeOrganizationId, supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Parse metadata if it exists to get additional organization details
  const organizationMetadata = activeOrganization?.metadata
    ? JSON.parse(activeOrganization.metadata)
    : {};

  console.log(organizationMetadata);

  // Callback to refresh organization data after form submissions
  const handleFormSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Organization</p>
      {!canEditOrganization && (
        <p className="text-sm text-muted-foreground">
          Organization settings are read-only. Only owners can edit these details.
        </p>
      )}
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <p className="font-medium">Logo and name</p>
        <OrganizationNameLogoForm
          isPending={isPending || !activeOrganization}
          name={activeOrganization?.name ?? ""}
          logoUrl={activeOrganization?.logo_url ?? ""}
          canEdit={canEditOrganization}
          onSuccess={handleFormSuccess}
        />
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <p className="font-medium">Details</p>
        <OrganizationDetailsForm
          isPending={isPending || !activeOrganization}
          metadata={organizationMetadata}
          canEdit={canEditOrganization}
          onSuccess={handleFormSuccess}
        />
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-4 w-full mb-10">
        <div className="flex flex-col justify-start items-start w-full">
          <p className="font-medium">Social media</p>
          <p className="text-sm text-muted-foreground">
            Add full URLs to your social media profiles, including https://...
          </p>
        </div>
        <OrganizationSocialMediaForm
          isPending={isPending || !activeOrganization}
          metadata={organizationMetadata}
          canEdit={canEditOrganization}
          onSuccess={handleFormSuccess}
        />
      </div>
    </div>
  );
}
