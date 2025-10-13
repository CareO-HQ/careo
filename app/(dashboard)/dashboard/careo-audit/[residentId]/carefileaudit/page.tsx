"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface AuditItem {
  id: string;
  name: string;
  status: string;
  auditor: string | null;
  lastAudited: string | null;
  dueDate: string;
}

export default function CareFileAuditPage() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as Id<"residents">;

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId: residentId });

  // State for audits
  const [auditItems, setAuditItems] = useState<AuditItem[]>([
    {
      id: "1",
      name: "Pre-Admission Assessment",
      status: "completed",
      lastAudited: "2024-01-15",
      auditor: "Sarah Johnson",
      dueDate: "2024-03-15",
    },
    {
      id: "2",
      name: "Admission Assessment",
      status: "completed",
      lastAudited: "2024-01-20",
      auditor: "John Smith",
      dueDate: "2024-03-20",
    },
    {
      id: "3",
      name: "Risk Assessment",
      status: "pending",
      lastAudited: null,
      auditor: null,
      dueDate: "2024-02-28",
    },
    {
      id: "4",
      name: "Care Plan",
      status: "completed",
      lastAudited: "2024-01-10",
      auditor: "Emma Williams",
      dueDate: "2024-03-10",
    },
    {
      id: "5",
      name: "Medication Review",
      status: "overdue",
      lastAudited: "2023-12-15",
      auditor: "Dr. Michael Brown",
      dueDate: "2024-01-15",
    },
  ]);

  // Dialog states
  const [isAddAuditDialogOpen, setIsAddAuditDialogOpen] = useState(false);

  // Form states
  const [newAuditForm, setNewAuditForm] = useState({
    name: "",
    status: "pending",
    auditor: "",
    lastAudited: "",
    dueDate: "",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const handleAddAudit = () => {
    if (!newAuditForm.name || !newAuditForm.dueDate) {
      return;
    }

    const newAudit: AuditItem = {
      id: Date.now().toString(),
      name: newAuditForm.name,
      status: newAuditForm.status,
      auditor: newAuditForm.auditor || null,
      lastAudited: newAuditForm.lastAudited || null,
      dueDate: newAuditForm.dueDate,
    };

    setAuditItems([...auditItems, newAudit]);
    setIsAddAuditDialogOpen(false);
    setNewAuditForm({
      name: "",
      status: "pending",
      auditor: "",
      lastAudited: "",
      dueDate: "",
    });
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Resident not found</p>
        <Button onClick={() => router.push("/dashboard/careo-audit")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audits
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/careo-audit?tab=carefile")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
              <AvatarFallback>
                {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">
                {resident.firstName} {resident.lastName} - Care File Audit
              </h1>
              <p className="text-sm text-muted-foreground">
                Room {resident.roomNumber || "N/A"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/view`)}
          >
            View Audit
          </Button>
          <Button onClick={() => setIsAddAuditDialogOpen(true)} size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Add Audit
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-12 border-r last:border-r-0">
                <input type="checkbox" className="rounded border-gray-300" />
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                <div className="flex items-center gap-1">
                  <span>Audit Name</span>
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                <div className="flex items-center gap-1">
                  <span>Auditor</span>
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                <div className="flex items-center gap-1">
                  <span>Last Audited</span>
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                <div className="flex items-center gap-1">
                  <span>Due Date</span>
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditItems.map((audit) => (
              <TableRow key={audit.id} className="hover:bg-muted/50">
                <TableCell className="border-r last:border-r-0">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  <button
                    onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${audit.id}`)}
                    className="font-medium hover:underline text-left"
                  >
                    {audit.name}
                  </button>
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  <Badge variant="secondary" className={`text-xs h-6 ${getStatusColor(audit.status)}`}>
                    {audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="border-r last:border-r-0">{audit.auditor || "-"}</TableCell>
                <TableCell className="text-muted-foreground border-r last:border-r-0">
                  {audit.lastAudited || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground border-r last:border-r-0">
                  {audit.dueDate}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>

      {/* Add Audit Dialog */}
      <Dialog open={isAddAuditDialogOpen} onOpenChange={setIsAddAuditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Audit</DialogTitle>
            <DialogDescription>
              Add a new care file audit item for this resident.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="auditName">Audit Name</Label>
              <Input
                id="auditName"
                placeholder="e.g., Skin Integrity Assessment"
                value={newAuditForm.name}
                onChange={(e) =>
                  setNewAuditForm({ ...newAuditForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newAuditForm.status}
                onValueChange={(value) =>
                  setNewAuditForm({ ...newAuditForm, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auditor">Auditor Name</Label>
              <Input
                id="auditor"
                placeholder="e.g., John Smith"
                value={newAuditForm.auditor}
                onChange={(e) =>
                  setNewAuditForm({ ...newAuditForm, auditor: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastAudited">Last Audited</Label>
              <Input
                id="lastAudited"
                type="date"
                value={newAuditForm.lastAudited}
                onChange={(e) =>
                  setNewAuditForm({ ...newAuditForm, lastAudited: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newAuditForm.dueDate}
                onChange={(e) =>
                  setNewAuditForm({ ...newAuditForm, dueDate: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddAuditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddAudit}>
              Add Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
