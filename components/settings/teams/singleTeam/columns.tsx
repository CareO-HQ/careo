"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { EllipsisIcon, UserMinusIcon } from "lucide-react";
import { formatRoleName } from "@/lib/utils";

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  organizationId: string;
}

const MemberAvatar = ({ image, name }: { image: string | null; name: string }) => {
  if (image) {
    return (
      <img
        src={image}
        alt={`${name}'s avatar`}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }

  // Fallback to initials or placeholder
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
      {initials || "?"}
    </div>
  );
};

export const columns: ColumnDef<Member>[] = [
  {
    id: "member",
    header: () => <div className="text-left">Name</div>,
    cell: ({ row }) => {
      const member = row.original;
      return (
        <div className="flex flex-row justify-start items-center gap-2">
          <MemberAvatar image={member.image} name={member.name} />
          <div className="flex flex-col justify-start items-start">
            <div className="text-left font-medium text-sm">{member.name}</div>
            <div className="text-left font-medium text-xs text-muted-foreground">
              {member.email}
            </div>
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "role",
    header: () => <div className="text-left">Role</div>,
    cell: ({ row }) => {
      const member = row.original;

      return (
        <div className="text-left text-sm">
          {formatRoleName(member.role)}
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex flex-row justify-end items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <EllipsisIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                <UserMinusIcon />
                Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
  }
];
