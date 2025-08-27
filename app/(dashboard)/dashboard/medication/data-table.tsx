"use client"
import * as React from "react"
import {
  IconDotsVertical,
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})
const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "header",
    header: "Name",
    cell: ({ row }) => {
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={"https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcQq2vO9nbMP1cnyRgWCReyixhwKk7dfibONHlApKagk00Lb9osjgUCVIDuKBVqQ6UBLiWHBPM7tzZtMq5Kk2L1xLw"} />
            <AvatarFallback className="text-xs">
              DJ
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">David John</span>
        </div>
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: "Unit",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.type}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "target",
    header: "Time",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.target}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Medications",
    cell: () => {
      const [selectedMeds, setSelectedMeds] = React.useState<string[]>([])
      const medications = [
        { id: "paracetamol", name: "Paracetamol 500mg", count: 1 },
        { id: "ibuprofen", name: "Ibuprofen 400mg", count: 2 },
        { id: "amoxicillin", name: "Amoxicillin 250mg", count: 2 },
        { id: "metformin", name: "Metformin 500mg", count: 2 },
        { id: "amlodipine", name: "Amlodipine 5mg", count: 2 },
      ]

      const handleSelectAll = (checked: boolean) => {
        if (checked) {
          setSelectedMeds(medications.map(med => med.id))
        } else {
          setSelectedMeds([])
        }
      }

      const handleMedToggle = (medId: string, checked: boolean) => {
        if (checked) {
          setSelectedMeds(prev => [...prev, medId])
        } else {
          setSelectedMeds(prev => prev.filter(id => id !== medId))
        }
      }

      const allSelected = selectedMeds.length === medications.length
      const someSelected = selectedMeds.length > 0 && selectedMeds.length < medications.length

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedMeds.length > 0 
                ? `${selectedMeds.length} Selected` 
                : "Select Medications"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Tablet Medications</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Checkbox
                checked={allSelected || someSelected}
                onCheckedChange={handleSelectAll}
                className="mr-2"
              />
              <label>
                {allSelected ? "Deselect All" : "Select All"}
              </label>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {medications.map((med) => (
              <DropdownMenuItem key={med.id} onSelect={(e) => e.preventDefault()}>
                <Checkbox
                  id={med.id}
                  className="mr-2"
                  checked={selectedMeds.includes(med.id)}
                  onCheckedChange={(checked) => handleMedToggle(med.id, !!checked)}
                />
                <label htmlFor={med.id} >
                  {med.name}
                  <Badge className="ms-3 h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                    {med.count}
                  </Badge>
                </label>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }
  ,

  {
    accessorKey: "limit",
    header: "Status",
    cell: ({ row }) => {
      return (
        <Select>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="given">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Given
              </Badge>
            </SelectItem>
            <SelectItem value="refused">
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                Refused
              </Badge>
            </SelectItem>
            <SelectItem value="hospital">
              <Badge variant="secondary" className="">
                Hospital
              </Badge>
            </SelectItem>
            <SelectItem value="social-leave">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                Social Leave
              </Badge>
            </SelectItem>
            <SelectItem value="not-available">
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                Not Available
              </Badge>
            </SelectItem>
          </SelectContent>
        </Select>
      )
    },
  },
  {
    accessorKey: "reviewer",
    header: "Administered By",
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <Checkbox id={`${row.original.id}-administered`} />
        <Label htmlFor={`${row.original.id}-administered`} className="text-sm">
          Ancy
        </Label>
      </div>
    ),
  },
  {
    accessorKey: "reviewer",
    header: "Witness By",
    cell: ({ row }) => (
      <Select>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select witness" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
          <SelectItem value="Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    accessorKey: "reviewer",
    header: "Notes",
    cell: ({ row }) => (
      <Input className="w-[140px]" placeholder="Add notes" />
    ),
  },
  {
    accessorKey: "reviewer",
    header: "Complete",
    cell: ({ row }) => (
      <Button size="sm">Save</Button>
    ),
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

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[]
}) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [completedRows, setCompletedRows] = React.useState<Set<string>>(new Set())
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])

  const handleSave = (rowId: string) => {
    setCompletedRows(prev => new Set([...prev, rowId]))
    setRowSelection(prev => ({ ...prev, [rowId]: true }))
  }

  const columnsWithHandlers = React.useMemo(() =>
    columns.map(col => {
      if (col.header === "Complete") {
        return {
          ...col,
          cell: ({ row }: { row: any }) => (
            <Button
              size="sm"
              onClick={() => handleSave(row.id)}
            >
              Save
            </Button>
          ),
        }
      }
      return col
    }), [])

  const table = useReactTable({
    data: initialData,
    columns: columnsWithHandlers,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })


  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
