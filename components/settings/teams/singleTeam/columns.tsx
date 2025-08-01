"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { EllipsisIcon, UserMinusIcon } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  image: string;
  role: string;
  organizationId: string;
}

const MemberAvatar = ({ email, name }: { email: string; name: string }) => {
  const userImage = useQuery(api.files.image.getUserLogoByEmail, {
    email: email
  });

  if (userImage?.url) {
    return (
      <img
        src={userImage.url}
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
          <MemberAvatar email={member.email} name={member.name} />
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
          {member.role.slice(0, 1).toUpperCase() +
            member.role.slice(1).toLowerCase()}
        </div>
      );
    }
  },
  {
    id: "actions",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
