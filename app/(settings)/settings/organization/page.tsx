"use client";

import OrganizationDetailsForm from "@/components/settings/OrganizationDetailsForm";
import OrganizationNameLogoForm from "@/components/settings/OrganizationNameLogoForm";
import OrganizationSocialMediaForm from "@/components/settings/OrganizationSocialMediaForm";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useCallback } from "react";

export default function OrganizationPage() {
  const {
    data: activeOrganization,
    isPending,
    refetch
  } = authClient.useActiveOrganization();

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
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <p className="font-medium">Logo and name</p>
        <OrganizationNameLogoForm
          isPending={isPending || !activeOrganization}
          name={activeOrganization?.name ?? ""}
          onSuccess={handleFormSuccess}
        />
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <p className="font-medium">Details</p>
        <OrganizationDetailsForm
          isPending={isPending || !activeOrganization}
          metadata={organizationMetadata}
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
          onSuccess={handleFormSuccess}
        />
      </div>
    </div>
  );
}
