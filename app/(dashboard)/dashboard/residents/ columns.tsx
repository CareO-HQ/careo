"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconDotsVertical } from "@tabler/icons-react"

export type Resident = {
  _id: string
  firstName: string
  lastName: string
  roomNumber?: string
  healthConditions?: string[] | { condition: string }[]
  risks?: string[] | { risk: string; level?: "low" | "medium" | "high" }[]
  dependencies?: string[] | {
    mobility: string
    eating: string
    dressing: string
    toileting: string
  }
  phoneNumber?: string
  dateOfBirth: string
  admissionDate: string
}

export const columns: ColumnDef<Resident>[] = [
  {
    accessorKey: "avatar",
    header: "",
    cell: ({ row }) => {
      const resident = row.original
      const name = `${resident.firstName} ${resident.lastName}`
      const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase()
      
      return (
        <Avatar className="h-8 w-8">
          <AvatarImage src="" alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      )
    },
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => {
      const resident = row.original
      return (
        <div>
          <div className="font-medium">{resident.firstName} {resident.lastName}</div>
          <div className="text-sm text-muted-foreground">DOB: {resident.dateOfBirth}</div>
          {resident.phoneNumber && (
            <div className="text-sm text-muted-foreground">{resident.phoneNumber}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "roomNumber",
    header: "Unit/Room No",
    cell: ({ row }) => row.original.roomNumber || "-",
  },
  {
    accessorKey: "healthConditions",
    header: "Health Condition",
    cell: ({ row }) => {
      const conditions = row.original.healthConditions
      if (!conditions || conditions.length === 0) return "-"
      
      if (Array.isArray(conditions) && typeof conditions[0] === 'string') {
        return (conditions as string[]).join(", ")
      } else if (Array.isArray(conditions)) {
        return (conditions as { condition: string }[]).map(c => c.condition).join(", ")
      }
      return "-"
    },
  },
  {
    accessorKey: "risks",
    header: "Risks",
    cell: ({ row }) => {
      const risks = row.original.risks
      if (!risks || risks.length === 0) return "-"
      
      if (Array.isArray(risks) && typeof risks[0] === 'string') {
        return (risks as string[]).join(", ")
      } else if (Array.isArray(risks)) {
        return (risks as { risk: string }[]).map(r => r.risk).join(", ")
      }
      return "-"
    },
  },
  {
    accessorKey: "dependencies",
    header: "Dependency",
    cell: ({ row }) => {
      const deps = row.original.dependencies
      if (!deps) return "-"
      
      if (Array.isArray(deps)) {
        return (deps as string[]).join(", ")
      } else if (typeof deps === 'object') {
        const depObj = deps as { mobility: string; eating: string; dressing: string; toileting: string }
        return `Mobility: ${depObj.mobility}, Eating: ${depObj.eating}`
      }
      return "-"
    },
  },
  {
    accessorKey: "medication",
    header: "Next Scheduled Medication",
    cell: () => "-", // Leave blank as requested
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