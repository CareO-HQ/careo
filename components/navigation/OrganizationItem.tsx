"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

// Separate component for organization items to avoid hook issues
export default function OrganizationItem({
  organization,
  isActive,
  onSelect
}: {
  organization: { id: string; name: string };
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const logoQuery = useQuery(api.files.image.getOrganizationLogoById, {
    organizationId: organization.id
  });

  return (
    <DropdownMenuItem
      onClick={() => onSelect(organization.id)}
      className={isActive ? "bg-accent border-l-2 border-sky-400" : ""}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Avatar className="size-6 rounded">
            <AvatarImage
              src={logoQuery?.url ?? ""}
              alt={`${organization.name} logo`}
            />
            <AvatarFallback className="text-xs rounded bg-primary text-secondary">
              {organization.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{organization.name}</span>
        </div>
        {isActive && (
          <span className="text-xs text-muted-foreground">Active</span>
        )}
      </div>
    </DropdownMenuItem>
  );
}
