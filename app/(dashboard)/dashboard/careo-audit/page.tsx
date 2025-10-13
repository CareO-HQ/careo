"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, ClipboardCheck, Eye, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Audit {
  id: string;
  name: string;
  status: "active" | "inactive" | "pending";
  auditor: string;
  lastAudited: string;
  dueDate: string;
  category: string;
}

interface Resident {
  _id: Id<"residents">;
  firstName: string;
  lastName: string;
  roomNumber?: string;
  dateOfBirth: string;
  teamId: string;
  teamName?: string;
  imageUrl?: string;
}

export default function CareOAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [audits, setAudits] = useState<Audit[]>([]);
  const { activeTeamId } = useActiveTeam();

  // Get tab from URL query params, default to "resident"
  const tabFromUrl = searchParams.get("tab") || "resident";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch residents for the active team
  const residents = useQuery(
    api.residents.getByTeamId,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Load audits from localStorage on mount
  useEffect(() => {
    const savedAudits = localStorage.getItem('careo-audits');
    if (savedAudits) {
      setAudits(JSON.parse(savedAudits));
    } else {
      // Set default audit if none exist
      const defaultAudits = [
        {
          id: "1",
          name: "Risk Assessment Audit",
          status: "active",
          auditor: "John Smith",
          lastAudited: "2 months ago",
          dueDate: "1 month",
          category: "resident",
        },
      ];
      setAudits(defaultAudits);
      localStorage.setItem('careo-audits', JSON.stringify(defaultAudits));
    }
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    auditName: "",
    auditorName: "",
    frequency: "",
  });

  const handleNewAudit = () => {
    setIsDialogOpen(true);
  };

  const handleCreateAudit = () => {
    if (!formData.auditName || !formData.auditorName || !formData.frequency) {
      return;
    }

    const newAudit: Audit = {
      id: Date.now().toString(),
      name: formData.auditName,
      status: "active",
      auditor: formData.auditorName,
      lastAudited: "Just now",
      dueDate: formData.frequency,
      category: activeTab,
    };

    const updatedAudits = [...audits, newAudit];
    setAudits(updatedAudits);

    // Save to localStorage
    localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));

    setIsDialogOpen(false);
    setFormData({ auditName: "", auditorName: "", frequency: "" });

    // Navigate to the new audit page
    router.push(`/dashboard/careo-audit/${activeTab}/${newAudit.id}`);
  };

  const handleDeleteClick = (audit: Audit) => {
    setOpenDropdownId(null); // Close the dropdown menu
    setAuditToDelete(audit);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!auditToDelete) return;

    const auditId = auditToDelete.id;

    // Close dialog first
    setIsDeleteDialogOpen(false);
    setAuditToDelete(null);

    // Use setTimeout to ensure dialog is fully closed before state update
    setTimeout(() => {
      // Update audits state
      const updatedAudits = audits.filter(audit => audit.id !== auditId);
      setAudits(updatedAudits);

      // Update localStorage
      localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));
    }, 0);
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setAuditToDelete(null);
  };

  const filteredAudits = audits.filter(audit => audit.category === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          <h1 className="text-xl font-semibold">Audits</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6 py-3">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          router.push(`/dashboard/careo-audit?tab=${value}`);
        }}>
          <TabsList>
            <TabsTrigger value="resident">Resident Audit</TabsTrigger>
            <TabsTrigger value="carefile">Care File Audit</TabsTrigger>
            <TabsTrigger value="governance">Governance & Complaints</TabsTrigger>
            <TabsTrigger value="clinical">Clinical Care & Medicines</TabsTrigger>
            <TabsTrigger value="environment">Environment & Safety</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
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
          {activeTab !== "carefile" && (
            <Button onClick={handleNewAudit} size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-2" />
              New Audit
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {activeTab === "carefile" ? (
          // Residents Table for Care File Audit
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-12 border-r last:border-r-0">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  <div className="flex items-center gap-1">
                    <span>Resident</span>
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
                    <span>Due</span>
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0 w-20">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents && residents.length > 0 ? (
                residents.map((resident) => (
                  <TableRow key={resident._id} className="hover:bg-muted/50">
                    <TableCell className="border-r last:border-r-0">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <button
                        onClick={() => router.push(`/dashboard/careo-audit/${resident._id}/carefileaudit`)}
                        className="flex items-center gap-3 font-medium hover:underline text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
                          <AvatarFallback>
                            {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{resident.firstName} {resident.lastName}</span>
                      </button>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.floor(Math.random() * 41) + 30}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {Math.floor(Math.random() * 41) + 30}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">-</TableCell>
                    <TableCell className="text-muted-foreground border-r last:border-r-0">-</TableCell>
                    <TableCell className="text-muted-foreground border-r last:border-r-0">-</TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/careo-audit/${resident._id}/carefileaudit`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Download care file audit:', resident._id)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {residents === undefined ? "Loading residents..." : "No residents found in this team"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          // Audits Table for other tabs
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-12 border-r last:border-r-0">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  <div className="flex items-center gap-1">
                    <span>Audit</span>
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
                    <span>Due</span>
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0 w-20">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={filteredAudits.length}>
              {filteredAudits.map((audit) => (
                <TableRow key={audit.id} className="hover:bg-muted/50">
                  <TableCell className="border-r last:border-r-0">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">
                    <button
                      onClick={() => router.push(`/dashboard/careo-audit/${audit.category}/${audit.id}`)}
                      className="font-medium hover:underline text-left"
                    >
                      {audit.name}
                    </button>
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">
                    <Badge variant="secondary" className={getStatusColor(audit.status)}>
                      {audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">{audit.auditor}</TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">{audit.lastAudited}</TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">{audit.dueDate}</TableCell>
                  <TableCell className="border-r last:border-r-0">
                    <DropdownMenu
                      open={openDropdownId === audit.id}
                      onOpenChange={(open) => {
                        setOpenDropdownId(open ? audit.id : null);
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setOpenDropdownId(null);
                            router.push(`/dashboard/careo-audit/${audit.category}/${audit.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setOpenDropdownId(null);
                            console.log('Download audit:', audit.id);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(audit);
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
        )}

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>

      {/* New Audit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Audit</DialogTitle>
            <DialogDescription>
              Add a new audit to your system. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="auditName">Audit Name</Label>
              <Input
                id="auditName"
                placeholder="e.g., Risk Assessment Audit"
                value={formData.auditName}
                onChange={(e) =>
                  setFormData({ ...formData, auditName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auditorName">Auditor Name</Label>
              <Input
                id="auditorName"
                placeholder="e.g., John Smith"
                value={formData.auditorName}
                onChange={(e) =>
                  setFormData({ ...formData, auditorName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency of Audit</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 week">Weekly</SelectItem>
                  <SelectItem value="2 weeks">Bi-weekly</SelectItem>
                  <SelectItem value="1 month">Monthly</SelectItem>
                  <SelectItem value="3 months">Quarterly</SelectItem>
                  <SelectItem value="6 months">Semi-annually</SelectItem>
                  <SelectItem value="1 year">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateAudit}>
              Create Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setAuditToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Audit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this audit? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <span className="font-semibold">Audit Name:</span> {auditToDelete?.name}
            </p>
            <p className="text-sm mt-2">
              <span className="font-semibold">Auditor:</span> {auditToDelete?.auditor}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
