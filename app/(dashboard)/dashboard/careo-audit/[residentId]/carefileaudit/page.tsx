"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, Eye, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";

interface AuditItem {
  id: string;
  name: string;
  status: string;
  auditor: string | null;
  lastAudited: string | null;
  dueDate: string;
  completionPercentage?: number;
  comment?: string;
  nextAudit?: string;
}

export default function CareFileAuditPage() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as Id<"residents">;

  // Get active team
  const { activeTeamId } = useActiveTeam();

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<AuditItem | null>(null);

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

  // Load completion data from localStorage and persist audit list
  useEffect(() => {
    const updateAuditItemsWithCompletions = () => {
      const completedAudits = localStorage.getItem('completed-audits');
      // Load team-specific frequency
      const savedFrequency = activeTeamId
        ? localStorage.getItem(`carefile-audit-frequency-${activeTeamId}`) || '3months'
        : '3months';

      // Map frequency to days
      const frequencyDays: { [key: string]: number } = {
        '3months': 90,
        '6months': 180,
        'yearly': 365,
      };

      const daysToAdd = frequencyDays[savedFrequency] || 90;

      if (!completedAudits) {
        // No completed audits, set next audit based on frequency from today
        const updatedAuditItems = auditItems.map(auditItem => {
          const nextAuditDate = new Date();
          nextAuditDate.setDate(nextAuditDate.getDate() + daysToAdd);
          const formattedNextAudit = nextAuditDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          return {
            ...auditItem,
            nextAudit: formattedNextAudit,
          };
        });
        setAuditItems(updatedAuditItems);
        return;
      }

      const allCompletedAudits = JSON.parse(completedAudits);

      // Filter completed audits for this resident
      const residentCompletedAudits = allCompletedAudits.filter(
        (audit: any) => audit.residentId === residentId && audit.category === 'carefile'
      );

      // Update audit items with completion data
      const updatedAuditItems = auditItems.map(auditItem => {
        const matchingCompletedAudits = residentCompletedAudits.filter(
          (ca: any) => ca.name === auditItem.name
        );

        if (matchingCompletedAudits.length > 0) {
          // Get the latest completion
          const latestCompletion = matchingCompletedAudits.sort(
            (a: any, b: any) => b.completedAt - a.completedAt
          )[0];

          const completionDate = new Date(latestCompletion.completedAt);
          const formattedDate = completionDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          // Calculate completion percentage based on compliant items
          const totalItems = latestCompletion.auditDetailItems?.length || 0;
          const compliantItems = latestCompletion.auditDetailItems?.filter(
            (item: any) => item.status === 'compliant'
          ).length || 0;
          const percentage = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 0;

          // Calculate next audit date based on last completion + frequency
          const nextAuditDate = new Date(completionDate);
          nextAuditDate.setDate(nextAuditDate.getDate() + daysToAdd);
          const formattedNextAudit = nextAuditDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          // Get auditor name from completed audit
          const auditorName = latestCompletion.auditor || null;

          return {
            ...auditItem,
            status: 'completed',
            lastAudited: formattedDate,
            completionPercentage: percentage,
            nextAudit: formattedNextAudit,
            auditor: auditorName,
          };
        }

        // Audit not completed yet, calculate next audit from today
        const nextAuditDate = new Date();
        nextAuditDate.setDate(nextAuditDate.getDate() + daysToAdd);
        const formattedNextAudit = nextAuditDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        return {
          ...auditItem,
          nextAudit: formattedNextAudit,
        };
      });

      setAuditItems(updatedAuditItems);
    };

    updateAuditItemsWithCompletions();
  }, [residentId, activeTeamId]);

  // Persist audit list to localStorage whenever it changes
  useEffect(() => {
    if (auditItems.length > 0 && residentId) {
      const auditListToSave = auditItems.map(item => ({
        id: item.id,
        name: item.name,
      }));
      localStorage.setItem(
        `carefile-audits-${residentId}`,
        JSON.stringify(auditListToSave)
      );
    }
  }, [auditItems, residentId]);

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

  const handleDeleteAudit = () => {
    if (!auditToDelete) return;

    // Remove audit from list
    const updatedAudits = auditItems.filter(item => item.id !== auditToDelete.id);
    setAuditItems(updatedAudits);

    // Close dialog
    setIsDeleteDialogOpen(false);
    setAuditToDelete(null);
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
          {/* Sort and Filter buttons removed */}
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
                Audit Name
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Status
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Auditor
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Last Audited
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Next Audit
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0 w-20">
                Actions
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
                  {audit.status === 'completed' && audit.completionPercentage !== undefined ? (
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${audit.completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {audit.completionPercentage}%
                      </span>
                    </div>
                  ) : (
                    <Badge variant="secondary" className={`text-xs h-6 ${getStatusColor(audit.status)}`}>
                      {audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="border-r last:border-r-0">{audit.auditor || "-"}</TableCell>
                <TableCell className="text-muted-foreground border-r last:border-r-0">
                  {audit.lastAudited || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground border-r last:border-r-0">
                  {audit.nextAudit || audit.dueDate || "-"}
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${audit.id}/view`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setAuditToDelete(audit);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      {/* Delete Audit Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Audit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{auditToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setAuditToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAudit}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
