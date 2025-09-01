"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { IconDotsVertical } from "@tabler/icons-react"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
      if (!conditions || conditions.length === 0) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 text-muted-foreground">
                No conditions
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem disabled>No health conditions recorded</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      let conditionsList: string[] = []
      if (Array.isArray(conditions) && typeof conditions[0] === 'string') {
        conditionsList = conditions as string[]
      } else if (Array.isArray(conditions)) {
        conditionsList = (conditions as { condition: string }[]).map(c => c.condition)
      }
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2">
              Health Conditions
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {conditionsList.map((condition, index) => (
              <DropdownMenuItem key={index} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {condition}
                </Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  {
    accessorKey: "risks",
    header: "Risks",
    cell: ({ row }) => {
      const risks = row.original.risks
      
      if (!risks || risks.length === 0) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 text-muted-foreground">
                No risks
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem disabled>No risks recorded</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      
      let risksList: { risk: string; level?: string }[] = []
      if (Array.isArray(risks) && typeof risks[0] === 'string') {
        risksList = (risks as string[]).map(r => ({ risk: r }))
      } else if (Array.isArray(risks)) {
        risksList = (risks as { risk: string; level?: "low" | "medium" | "high" }[])
      }
      
      const getRiskColor = (level?: string) => {
        switch (level) {
          case 'high': return 'destructive'
          case 'medium': return 'default'
          case 'low': return 'secondary'
          default: return 'secondary'
        }
      }
      
      // Get the highest risk level to color the button
      const getHighestRiskLevel = () => {
        const levels = risksList.map(r => r.level).filter(Boolean)
        if (levels.includes('high')) return 'high'
        if (levels.includes('medium')) return 'medium'
        if (levels.includes('low')) return 'low'
        return undefined
      }
      
      const highestRiskLevel = getHighestRiskLevel()
      const getButtonProps = () => {
        switch (highestRiskLevel) {
          case 'high':
            return { variant: 'destructive' as const, className: 'h-8 px-2' }
          case 'medium':
            return { variant: 'outline' as const, className: 'h-8 px-2 border-orange-500 text-orange-600 hover:bg-orange-50' }
          case 'low':
            return { variant: 'outline' as const, className: 'h-8 px-2 border-blue-500 text-blue-600 hover:bg-blue-50' }
          default:
            return { variant: 'ghost' as const, className: 'h-8 px-2' }
        }
      }
      
      const buttonProps = getButtonProps()
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={buttonProps.variant} className={buttonProps.className}>
              Risks
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {risksList.map((riskItem, index) => (
              <DropdownMenuItem key={index} className="flex items-center gap-2">
                <Badge variant={getRiskColor(riskItem.level)} className="text-xs">
                  {riskItem.risk}
                  {riskItem.level && ` (${riskItem.level})`}
                </Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  {
    accessorKey: "dependencies",
    header: "Dependency",
    cell: ({ row }) => {
      const deps = row.original.dependencies
      
      if (!deps) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 text-muted-foreground">
                No dependencies
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem disabled>No dependencies recorded</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      
      if (Array.isArray(deps)) {
        const depsList = deps as string[]
        const displayText = depsList.length > 2 
          ? `${depsList.slice(0, 2).join(", ")}... (+${depsList.length - 2})`
          : depsList.join(", ")
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2">
                {displayText}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {depsList.map((dep, index) => (
                <DropdownMenuItem key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {dep}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      } else if (typeof deps === 'object') {
        const depObj = deps as { mobility: string; eating: string; dressing: string; toileting: string }
        const activeDeps = Object.entries(depObj).filter(([, value]) => value && value !== 'Independent')
        const displayText = activeDeps.length > 0 
          ? `${activeDeps.length} dependencies`
          : "Independent"
        
        const getDependencyColor = (level: string) => {
          switch (level) {
            case 'Fully Dependent': return 'destructive'
            case 'Assistance Needed': return 'default'
            case 'Supervision Needed': return 'secondary'
            case 'Independent': return 'outline'
            default: return 'outline'
          }
        }
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2">
                {displayText}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {Object.entries(depObj).map(([category, level]) => (
                <DropdownMenuItem key={category} className="flex items-center justify-between gap-2">
                  <span className="capitalize font-medium">{category}</span>
                  <Badge variant={getDependencyColor(level)} className="text-xs">
                    {level}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
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