"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, ClipboardCheck, Eye, Download, Trash2, Archive } from "lucide-react";
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
  status: "new" | "in-progress" | "completed" | "due";
  auditor: string;
  lastAudited: string;
  dueDate: string;
  category: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
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

function CareOAuditPageContent() {
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
      let audits = JSON.parse(savedAudits);

      // Migration: Add default frequency to audits that don't have it
      let hasUpdates = false;
      audits = audits.map((audit: any) => {
        if (!audit.frequency) {
          hasUpdates = true;
          return { ...audit, frequency: "monthly" };
        }
        return audit;
      });

      // Save back if we added frequencies
      if (hasUpdates) {
        localStorage.setItem('careo-audits', JSON.stringify(audits));
      }

      setAudits(audits);
    } else {
      // Set default audit if none exist
      const defaultAudits = [
        {
          id: "1",
          name: "Risk Assessment Audit",
          status: "new" as const,
          auditor: "John Smith",
          lastAudited: "--",
          dueDate: "--",
          category: "resident",
          frequency: "monthly" as const,
        },
      ];
      setAudits(defaultAudits);
      localStorage.setItem('careo-audits', JSON.stringify(defaultAudits));
    }
  }, []);

  // Check and update due status for audits based on frequency
  useEffect(() => {
    if (audits.length === 0) return;

    const frequencyDays: { [key: string]: number } = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };

    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return;

    let allCompletedAudits = JSON.parse(completedAudits);

    // Migration: Add default frequency to completed audits that don't have it
    let hasCompletedUpdates = false;
    allCompletedAudits = allCompletedAudits.map((completedAudit: any) => {
      if (!completedAudit.frequency) {
        hasCompletedUpdates = true;
        // Try to find the matching audit to get its frequency
        const matchingAudit = audits.find(
          (a) => a.name === completedAudit.name && a.category === completedAudit.category
        );
        return { ...completedAudit, frequency: matchingAudit?.frequency || "monthly" };
      }
      return completedAudit;
    });

    // Save back if we added frequencies to completed audits
    if (hasCompletedUpdates) {
      localStorage.setItem('completed-audits', JSON.stringify(allCompletedAudits));
    }
    let hasUpdates = false;
    const updatedAudits = audits.map((audit) => {
      // Skip if no frequency set
      if (!audit.frequency) return audit;

      // Find all completed audits for this audit name and category
      const matchingCompletedAudits = allCompletedAudits.filter(
        (a: any) =>
          a.name === audit.name &&
          a.category === audit.category &&
          a.status === "completed"
      );

      if (matchingCompletedAudits.length === 0) return audit;

      // Find the most recent completion
      const latestCompleted = matchingCompletedAudits.sort(
        (a: any, b: any) => b.completedAt - a.completedAt
      )[0];

      // Calculate days since last completion
      const daysSinceCompletion = Math.floor(
        (Date.now() - latestCompleted.completedAt) / (1000 * 60 * 60 * 24)
      );

      const daysUntilDue = frequencyDays[audit.frequency.toLowerCase()] || 30;

      // If days passed exceeds the frequency, mark as due
      if (daysSinceCompletion >= daysUntilDue && audit.status !== "due") {
        hasUpdates = true;
        return {
          ...audit,
          status: "due" as const,
        };
      }

      // If still completed and not due yet, keep status as completed
      if (audit.status === "completed" && daysSinceCompletion < daysUntilDue) {
        return audit;
      }

      return audit;
    });

    // Only update state and localStorage if there were changes
    if (hasUpdates) {
      setAudits(updatedAudits);
      localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));
    }
  }, [audits]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    auditName: "",
    auditorName: "",
    frequency: "",
  });

  const [careFileFrequency, setCareFileFrequency] = useState<string>("3months");

  // Load frequency from localStorage on mount (team-specific)
  useEffect(() => {
    if (activeTeamId) {
      const savedFrequency = localStorage.getItem(`carefile-audit-frequency-${activeTeamId}`);
      if (savedFrequency) {
        setCareFileFrequency(savedFrequency);
      } else {
        // Default to 3 months if no saved frequency for this team
        setCareFileFrequency("3months");
      }
    }
  }, [activeTeamId]);

  // Save frequency to localStorage when it changes (team-specific)
  useEffect(() => {
    if (activeTeamId && careFileFrequency) {
      localStorage.setItem(`carefile-audit-frequency-${activeTeamId}`, careFileFrequency);
    }
  }, [careFileFrequency, activeTeamId]);

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
      status: "new",
      auditor: formData.auditorName,
      lastAudited: "--",
      dueDate: "--",
      category: activeTab,
      frequency: formData.frequency as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
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

  const handleDownloadAudit = (audit: Audit) => {
    setOpenDropdownId(null);

    // Check if audit is completed
    if (audit.status === "completed") {
      // For completed audits, open the view page which has print/download functionality
      const viewUrl = `/dashboard/careo-audit/${audit.category}/${audit.id}/view`;

      // Open in new tab
      window.open(viewUrl, '_blank');

      toast.success("Audit opened in new tab", {
        description: "Click 'Download PDF' to save the audit report",
      });
    } else {
      // For incomplete audits, show a warning
      toast.warning("Audit not completed yet", {
        description: "Please complete the audit before downloading",
      });
    }
  };

  const filteredAudits = audits.filter(audit => audit.category === activeTab);

  // State to store resident completion percentages for care file audits
  const [residentCompletions, setResidentCompletions] = useState<{[residentId: string]: number}>({});

  // Calculate overall completion percentage for a resident's care file audits
  const calculateResidentCareFileCompletion = (residentId: string): number => {
    // Define default audit list (same as in carefileaudit page)
    const defaultAudits = [
      { id: "1", name: "Pre-Admission Assessment" },
      { id: "2", name: "Admission Assessment" },
      { id: "3", name: "Risk Assessment" },
      { id: "4", name: "Care Plan" },
      { id: "5", name: "Medication Review" },
    ];

    // Try to load custom audit list from localStorage, fallback to defaults
    let auditList = defaultAudits;
    const savedAudits = localStorage.getItem(`carefile-audits-${residentId}`);
    if (savedAudits) {
      try {
        auditList = JSON.parse(savedAudits);
      } catch (e) {
        console.error('Error parsing saved audits:', e);
      }
    }

    if (auditList.length === 0) {
      return 0;
    }

    // Get all completed audits from localStorage
    const completedAuditsStr = localStorage.getItem('completed-audits');
    if (!completedAuditsStr) {
      return 0;
    }

    let allCompletedAudits = [];
    try {
      allCompletedAudits = JSON.parse(completedAuditsStr);
    } catch (e) {
      console.error('Error parsing completed audits:', e);
      return 0;
    }

    // Calculate percentage for each audit
    let totalPercentage = 0;

    auditList.forEach((audit: any) => {
      // Find completed audits for this specific audit and resident
      const matchingCompletedAudits = allCompletedAudits.filter(
        (ca: any) =>
          ca.residentId === residentId &&
          ca.name === audit.name &&
          ca.category === 'carefile'
      );

      if (matchingCompletedAudits.length > 0) {
        // Get the latest completion
        const latestCompletion = matchingCompletedAudits.sort(
          (a: any, b: any) => b.completedAt - a.completedAt
        )[0];

        // Calculate percentage based on compliant items
        const totalItems = latestCompletion.auditDetailItems?.length || 0;
        if (totalItems === 0) {
          totalPercentage += 0;
        } else {
          const compliantItems = latestCompletion.auditDetailItems?.filter(
            (item: any) => item.status === 'compliant'
          ).length || 0;
          const percentage = Math.round((compliantItems / totalItems) * 100);
          totalPercentage += percentage;
        }
      } else {
        // Audit not completed, counts as 0%
        totalPercentage += 0;
      }
    });

    // Return average percentage
    return Math.round(totalPercentage / auditList.length);
  };

  // Calculate completion percentages for all residents when they load or tab changes
  useEffect(() => {
    if (activeTab === 'carefile' && residents && residents.length > 0) {
      const completions: {[residentId: string]: number} = {};

      residents.forEach(resident => {
        completions[resident._id] = calculateResidentCareFileCompletion(resident._id);
      });

      setResidentCompletions(completions);
    }
  }, [residents, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "due":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "New";
      case "in-progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "due":
        return "Due";
      default:
        return status;
    }
  };

  const getFrequencyLabel = (frequency?: string) => {
    if (!frequency) return "Not set";
    switch (frequency.toLowerCase()) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      case "quarterly":
        return "Quarterly";
      case "yearly":
        return "Yearly";
      default:
        return frequency;
    }
  };

  const getLastAuditedDate = (audit: Audit) => {
    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return "--";

    const allCompletedAudits = JSON.parse(completedAudits);
    const matchingCompletedAudits = allCompletedAudits.filter(
      (a: any) =>
        a.name === audit.name &&
        a.category === audit.category &&
        a.status === "completed"
    );

    if (matchingCompletedAudits.length === 0) return "--";

    // Find the most recent completion
    const latestCompleted = matchingCompletedAudits.sort(
      (a: any, b: any) => b.completedAt - a.completedAt
    )[0];

    // Format the date
    const date = new Date(latestCompleted.completedAt);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDueDate = (audit: Audit) => {
    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return "--";

    const allCompletedAudits = JSON.parse(completedAudits);
    const matchingCompletedAudits = allCompletedAudits.filter(
      (a: any) =>
        a.name === audit.name &&
        a.category === audit.category &&
        a.status === "completed"
    );

    if (matchingCompletedAudits.length === 0) return "--";

    // Find the most recent completion
    const latestCompleted = matchingCompletedAudits.sort(
      (a: any, b: any) => b.completedAt - a.completedAt
    )[0];

    // Get frequency from audit or from completed audit
    const frequency = audit.frequency || latestCompleted.frequency;
    if (!frequency) return "--";

    const frequencyDays: { [key: string]: number } = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };

    const daysToAdd = frequencyDays[frequency.toLowerCase()] || 30;
    const dueDate = new Date(latestCompleted.completedAt);
    dueDate.setDate(dueDate.getDate() + daysToAdd);

    return dueDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
          {activeTab === "carefile" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Frequency:</span>
              <Select value={careFileFrequency} onValueChange={setCareFileFrequency}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort
              </Button>
              <Button variant="ghost" size="sm" className="h-8">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </>
          )}
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
                  Status
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
                      {(() => {
                        const completionPercentage = residentCompletions[resident._id] ?? 0;
                        return (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {completionPercentage}%
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
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
                  Audit
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
                      {getStatusLabel(audit.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">{audit.auditor}</TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">{getLastAuditedDate(audit)}</TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">{getDueDate(audit)}</TableCell>
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

                            // ALWAYS try to find the latest completed audit with the same name
                            const completedAudits = localStorage.getItem('completed-audits');
                            if (completedAudits) {
                              const audits = JSON.parse(completedAudits);
                              const latestCompleted = audits
                                .filter((a: any) => a.name === audit.name && a.category === audit.category && a.status === "completed")
                                .sort((a: any, b: any) => b.completedAt - a.completedAt)[0];

                              if (latestCompleted) {
                                // Found a completed audit - open it in view mode
                                router.push(`/dashboard/careo-audit/${latestCompleted.category}/${latestCompleted.id}/view`);
                                return;
                              }
                            }

                            // Fallback: No completed audits found, open the audit in edit mode
                            router.push(`/dashboard/careo-audit/${audit.category}/${audit.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Latest Completed
                        </DropdownMenuItem>
                        {audit.status !== "completed" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setOpenDropdownId(null);
                              router.push(`/dashboard/careo-audit/${audit.category}/${audit.id}`);
                            }}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Continue Audit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDownloadAudit(audit)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setOpenDropdownId(null);
                            router.push(`/dashboard/careo-audit/archived?name=${encodeURIComponent(audit.name)}&category=${audit.category}`);
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archived
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
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
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

export default function CareOAuditPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <CareOAuditPageContent />
    </Suspense>
  );
}
