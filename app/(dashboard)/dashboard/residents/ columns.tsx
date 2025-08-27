"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconDotsVertical } from "@tabler/icons-react"

export type Resident = {
  id: string
  avatar: string
  details: string
  unit: string
  health: string
  risks: string
  dependency: string
  medication: string
}

export const columns: ColumnDef<Resident>[] = [
  {
    accessorKey: "avatar",
    header: "",
    cell: ({ row }) => {
      const resident = row.original
      const name = resident.details.split(',')[0] // Extract name from details
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
      return (
        <Avatar className="h-8 w-8">
          <AvatarImage src={resident.avatar} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )
    },
  },
  {
    accessorKey: "details",
    header: "Details",
  },
  {
    accessorKey: "unit",
    header: "Unit/Room No",
  },
  {
    accessorKey: "health",
    header: "Health Condition",
  },
  {
    accessorKey: "risks",
    header: "Risks",
  },
  {
    accessorKey: "dependency",
    header: "Dependency",
  },
  {
    accessorKey: "medication",
    header: "Next Scheduled Medication",
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Make a copy</DropdownMenuItem>
          <DropdownMenuItem>Favorite</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]