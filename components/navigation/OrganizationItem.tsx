"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
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
  const { supabase } = useSupabase();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogo() {
      const { data, error } = await supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", organization.id)
        .single();

      if (!error && data) {
        setLogoUrl(data.logo_url);
      }
    }

    fetchLogo();
  }, [organization.id, supabase]);

  return (
    <DropdownMenuItem
      onClick={() => onSelect(organization.id)}
      className={isActive ? "bg-accent border-l-2 border-sky-400" : ""}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Avatar className="size-6 rounded">
            <AvatarImage
              src={logoUrl ?? ""}
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
