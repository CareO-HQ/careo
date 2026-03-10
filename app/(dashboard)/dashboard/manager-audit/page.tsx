"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Eye, Download, Trash2, Search, SlidersHorizontal, X, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withRoleGuard } from "@/lib/route-guards";
import { useActiveTeam } from "@/hooks/use-active-team";
import { supabase } from "@/lib/supabase";

interface ManagerAudit {
  id: string;
  name: string;
  status: "new" | "in-progress" | "completed" | "due";
  auditor: string;
  lastAudited: string;
  dueDate: string;
  frequency: "monthly" | "quarterly" | "6month" | "yearly";
  category: "staff" | "clinical" | "operational" | "general";
}

const initialAudits: ManagerAudit[] = [
  {
    id: "1",
    name: "Accidents and Incidents Analysis",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "2",
    name: "Agency Profiles and Induction Records",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "staff",
  },
  {
    id: "3",
    name: "Bedrails Audit",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "4",
    name: "Domestic Services",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "operational",
  },
  {
    id: "6",
    name: "Catering Audit",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "operational",
  },
  {
    id: "7",
    name: "Competency Assessment Review",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "staff",
  },
  {
    id: "8",
    name: "Complaints Analysis",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "general",
  },
  {
    id: "9",
    name: "Decontamination",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "10",
    name: "Dining Experience",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "operational",
  },
  {
    id: "11",
    name: "DOLS",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "12",
    name: "Domestic Audit",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "operational",
  },
  {
    id: "13",
    name: "Falls Analysis",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "14",
    name: "Hand Hygiene Audit",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "15",
    name: "Hoist and Sling Register",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "clinical",
  },
  {
    id: "16",
    name: "IPC Short Audit",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "17",
    name: "Mandatory Training Stats",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "staff",
  },
  {
    id: "18",
    name: "Medication Audit",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "19",
    name: "Modified Diet Audit",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "20",
    name: "NMC NISSC Logs",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "staff",
  },
  {
    id: "21",
    name: "Restrictive Practice",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "clinical",
  },
  {
    id: "22",
    name: "RTW Tracker",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "staff",
  },
  {
    id: "23",
    name: "Safeguarding Database",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "24",
    name: "Safety Alerts",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "general",
  },
  {
    id: "25",
    name: "Smoking Compliance",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "clinical",
  },
  {
    id: "26",
    name: "Supervision and Appraisal Matrix",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "staff",
  },
  {
    id: "27",
    name: "Weights Analysis",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "28",
    name: "Wounds Analysis",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "monthly",
    category: "clinical",
  },
  {
    id: "29",
    name: "GDPR",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "yearly",
    category: "general",
  },
  {
    id: "30",
    name: "Personnel Files",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "quarterly",
    category: "staff",
  },
  {
    id: "31",
    name: "Resident Agreement",
    status: "new",
    auditor: "-",
    lastAudited: "-",
    dueDate: "-",
    frequency: "yearly",
    category: "general",
  },
];

// Helper function to calculate due date based on frequency and last audited date
const calculateDueDate = (lastAuditedDate: string, frequency: ManagerAudit["frequency"]): string => {
  const lastDate = new Date(lastAuditedDate);

  switch (frequency) {
    case "monthly":
      lastDate.setMonth(lastDate.getMonth() + 1);
      break;
    case "quarterly":
      lastDate.setMonth(lastDate.getMonth() + 3);
      break;
    case "6month":
      lastDate.setMonth(lastDate.getMonth() + 6);
      break;
    case "yearly":
      lastDate.setFullYear(lastDate.getFullYear() + 1);
      break;
  }

  return lastDate.toISOString().split('T')[0];
};

// Helper function to determine audit status based on due date
const determineAuditStatus = (dueDate: string | null): ManagerAudit["status"] => {
  if (!dueDate || dueDate === "-") return "new";

  const due = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "due"; // Past due
  if (diffDays <= 7) return "due"; // Due within 7 days
  return "completed"; // Completed and not due yet
};

// Helper function to format dates for display
const formatDisplayDate = (dateString: string): string => {
  if (dateString === "-") return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch {
    return dateString;
  }
};

function ManagerAuditPage() {
  const router = useRouter();
  const { activeOrganizationId } = useActiveTeam();
  const [audits, setAudits] = useState<ManagerAudit[]>(initialAudits);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("clinical");

  // Care File Audit resident selector
  const [isResidentSelectorOpen, setIsResidentSelectorOpen] = useState(false);
  const [allResidents, setAllResidents] = useState<any[]>([]);
  const [residentSearchQuery, setResidentSearchQuery] = useState("");

  // New Audit Template Dialog
  const [isNewAuditDialogOpen, setIsNewAuditDialogOpen] = useState(false);
  const [newAuditStep, setNewAuditStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newAuditName, setNewAuditName] = useState('');
  const [newAuditCategory, setNewAuditCategory] = useState<'staff' | 'clinical' | 'operational' | 'general'>('clinical');
  const [staffType, setStaffType] = useState<'nurses' | 'care-staff' | 'both'>('both');

  // Load audit completion data from localStorage
  useEffect(() => {
    const loadAuditCompletionData = () => {
      // Load custom audits from localStorage
      const customAuditsKey = 'manager-custom-audits';
      const customAuditsData = localStorage.getItem(customAuditsKey);
      let customAudits: ManagerAudit[] = [];

      if (customAuditsData) {
        customAudits = JSON.parse(customAuditsData);
      }

      // Update initial audits with completion data
      const updatedInitialAudits = initialAudits.map(audit => {
        const historyKey = `manager-audit-history-${audit.id}`;
        const historyData = localStorage.getItem(historyKey);

        if (historyData) {
          const history = JSON.parse(historyData);
          if (history.length > 0) {
            const latestCompletion = history[0]; // Most recent completion
            const lastAuditedDate = latestCompletion.completedDate.split('T')[0];
            const dueDate = calculateDueDate(lastAuditedDate, audit.frequency);
            const status = determineAuditStatus(dueDate);

            return {
              ...audit,
              status,
              auditor: latestCompletion.auditor,
              lastAudited: lastAuditedDate,
              dueDate
            };
          }
        }

        return audit;
      });

      // Update custom audits with completion data
      const updatedCustomAudits = customAudits.map(audit => {
        const historyKey = `manager-audit-history-${audit.id}`;
        const historyData = localStorage.getItem(historyKey);

        if (historyData) {
          const history = JSON.parse(historyData);
          if (history.length > 0) {
            const latestCompletion = history[0];
            const lastAuditedDate = latestCompletion.completedDate.split('T')[0];
            const dueDate = calculateDueDate(lastAuditedDate, audit.frequency);
            const status = determineAuditStatus(dueDate);

            return {
              ...audit,
              status,
              auditor: latestCompletion.auditor,
              lastAudited: lastAuditedDate,
              dueDate
            };
          }
        }

        return audit;
      });

      // Combine initial and custom audits
      setAudits([...updatedInitialAudits, ...updatedCustomAudits]);
    };

    loadAuditCompletionData();
  }, []);

  const handleNewAudit = () => {
    // Reset form
    setNewAuditStep(1);
    setSelectedTemplate('');
    setNewAuditName('');
    setNewAuditCategory('clinical');
    setStaffType('both');
    setIsNewAuditDialogOpen(true);
  };

  const handleSelectAuditTemplate = (templateType: string) => {
    setSelectedTemplate(templateType);
    // If staff-based, go to staff type selection (step 2)
    // Otherwise, go to name input (step 2)
    setNewAuditStep(2);
  };

  const handleNextStep = () => {
    // Validation for name step
    const isStaffBased = selectedTemplate === 'staff-based';
    const nameStep = isStaffBased ? 3 : 2;

    if (newAuditStep === nameStep && !newAuditName.trim()) {
      toast.error("Please enter an audit name");
      return;
    }
    setNewAuditStep(newAuditStep + 1);
  };

  const handlePreviousStep = () => {
    setNewAuditStep(newAuditStep - 1);
  };

  const handleCreateAudit = () => {
    if (!newAuditName.trim()) {
      toast.error("Please enter an audit name");
      return;
    }

    // Create a new audit ID
    const newAuditId = `custom-${Date.now()}`;

    // Store audit metadata in localStorage
    localStorage.setItem(`manager-audit-template-${newAuditId}`, selectedTemplate);
    localStorage.setItem(`manager-audit-name-${newAuditId}`, newAuditName.trim());
    localStorage.setItem(`manager-audit-category-${newAuditId}`, newAuditCategory);

    if (newAuditCategory === 'staff') {
      localStorage.setItem(`manager-audit-staff-type-${newAuditId}`, staffType);
    }

    // Close dialog and navigate
    setIsNewAuditDialogOpen(false);
    toast.success("Audit created successfully");
    router.push(`/dashboard/manager-audit/${newAuditId}`);
  };

  const handleViewEdit = (auditId: string) => {
    setOpenDropdownId(null);
    router.push(`/dashboard/manager-audit/${auditId}`);
  };

  const handleDownload = (audit: ManagerAudit) => {
    setOpenDropdownId(null);
    if (audit.status === "completed") {
      toast.success("Downloading audit report...");
    } else {
      toast.warning("Audit not completed yet", {
        description: "Please complete the audit before downloading",
      });
    }
  };

  const handleDelete = (auditId: string) => {
    setOpenDropdownId(null);
    toast.info("Delete functionality coming soon");
  };

  const getStatusBadgeVariant = (status: ManagerAudit["status"]) => {
    switch (status) {
      case "completed":
        return "default"; // Will apply custom green styling
      case "in-progress":
        return "secondary";
      case "due":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusBadgeClassName = (status: ManagerAudit["status"]) => {
    if (status === "completed") {
      return "bg-green-500 hover:bg-green-600 text-white";
    }
    return "";
  };

  const getStatusDisplayText = (status: ManagerAudit["status"]) => {
    switch (status) {
      case "completed":
        return "Up to date";
      case "new":
        return "New";
      case "in-progress":
        return "In Progress";
      case "due":
        return "Due";
      default:
        return status;
    }
  };

  const handleFrequencyChange = (auditId: string, newFrequency: ManagerAudit["frequency"]) => {
    setAudits(prevAudits =>
      prevAudits.map(audit => {
        if (audit.id === auditId) {
          // If audit has been completed, recalculate due date with new frequency
          let newDueDate = audit.dueDate;
          if (audit.lastAudited !== "-") {
            newDueDate = calculateDueDate(audit.lastAudited, newFrequency);
          }
          return {
            ...audit,
            frequency: newFrequency,
            dueDate: newDueDate,
            status: newDueDate !== "-" ? determineAuditStatus(newDueDate) : audit.status
          };
        }
        return audit;
      })
    );
    toast.success("Frequency updated successfully");
  };

  const handleRowClick = (auditId: string) => {
    router.push(`/dashboard/manager-audit/${auditId}` as any);
  };

  const handleViewHistory = async (auditId: string) => {
    // For Care File Audit (ID: 0), show resident selector first
    if (auditId === "0") {
      // Load residents
      if (activeOrganizationId) {
        const { data: resData } = await supabase
          .from('residents')
          .select('*')
          .eq('organization_id', activeOrganizationId);

        if (resData) {
          const mapped = resData.map((r: any) => ({
            _id: r.id,
            firstName: r.first_name || r.firstName,
            lastName: r.last_name || r.lastName,
            roomNumber: r.room_number || r.roomNumber,
            imageUrl: r.image_url || r.imageUrl
          }));
          setAllResidents(mapped);
          setIsResidentSelectorOpen(true);
        }
      }
    } else {
      // For other audits, go directly to history page
      router.push(`/dashboard/manager-audit/${auditId}/history`);
    }
  };

  const handleSelectResidentReport = (residentId: string) => {
    setIsResidentSelectorOpen(false);
    setResidentSearchQuery("");
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
  };

  const getFrequencyColor = (frequency: ManagerAudit["frequency"]) => {
    const colors = {
      monthly: "text-blue-600",
      quarterly: "text-green-600",
      "6month": "text-orange-600",
      yearly: "text-purple-600",
    };
    return colors[frequency];
  };

  // Filter audits based on search and filters
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      // Search filter
      const matchesSearch = audit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        audit.auditor.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || audit.status === statusFilter;

      // Frequency filter
      const matchesFrequency = frequencyFilter === "all" || audit.frequency === frequencyFilter;

      // Category filter (based on active tab) - only show audits matching the selected category
      const matchesCategory = audit.category === activeTab;

      return matchesSearch && matchesStatus && matchesFrequency && matchesCategory;
    });
  }, [audits, searchQuery, statusFilter, frequencyFilter, activeTab]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFrequencyFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || frequencyFilter !== "all";

  // Filter residents for Care File Audit report selector
  const filteredResidents = useMemo(() => {
    return allResidents.filter((resident) => {
      const matchesSearch = `${resident.firstName} ${resident.lastName} ${resident.roomNumber || ""}`
        .toLowerCase()
        .includes(residentSearchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allResidents, residentSearchQuery]);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Manager Audit</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleNewAudit}>
            <Plus className="mr-2 h-4 w-4" /> New Audit
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="clinical">Clinical Audits</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="operational">Operational Audits</TabsTrigger>
          <TabsTrigger value="staff">Staff Audits</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters Section */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-accent" : ""}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center" variant="destructive">
                  !
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="due">Due</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Frequency</label>
                  <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All frequencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Frequencies</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="6month">6 Month</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredAudits.length} of {audits.length} audits
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">Audit Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Last Audited</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center w-[80px]">Report</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {searchQuery || statusFilter !== "all" || frequencyFilter !== "all"
                        ? "No audits match your filters."
                        : "No audits found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAudits.map((audit) => (
                    <TableRow
                      key={audit.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(audit.id)}
                    >
                      <TableCell className="font-medium">{audit.name}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={audit.frequency}
                          onValueChange={(value) => handleFrequencyChange(audit.id, value as ManagerAudit["frequency"])}
                        >
                          <SelectTrigger className={`w-[120px] border-none shadow-none font-medium ${getFrequencyColor(audit.frequency)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly" className="text-blue-600 font-medium">Monthly</SelectItem>
                            <SelectItem value="quarterly" className="text-green-600 font-medium">Quarterly</SelectItem>
                            <SelectItem value="6month" className="text-orange-600 font-medium">6 Month</SelectItem>
                            <SelectItem value="yearly" className="text-purple-600 font-medium">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(audit.status)}
                          className={getStatusBadgeClassName(audit.status)}
                        >
                          {getStatusDisplayText(audit.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{audit.auditor}</TableCell>
                      <TableCell>{formatDisplayDate(audit.lastAudited)}</TableCell>
                      <TableCell>{formatDisplayDate(audit.dueDate)}</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(audit.id)}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          open={openDropdownId === audit.id}
                          onOpenChange={(open) =>
                            setOpenDropdownId(open ? audit.id : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewEdit(audit.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View/Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDownload(audit)}>
                              <Download className="mr-2 h-4 w-4" /> Download Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(audit.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* New Audit Template Dialog */}
          <Dialog open={isNewAuditDialogOpen} onOpenChange={setIsNewAuditDialogOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>
                  {newAuditStep === 1 && "Create New Audit - Select Template"}
                  {newAuditStep === 2 && selectedTemplate === 'staff-based' && "Create New Audit - Staff Type"}
                  {newAuditStep === 2 && selectedTemplate !== 'staff-based' && "Create New Audit - Enter Name"}
                  {newAuditStep === 3 && selectedTemplate === 'staff-based' && "Create New Audit - Enter Name"}
                  {newAuditStep === 3 && selectedTemplate !== 'staff-based' && "Create New Audit - Select Category"}
                  {newAuditStep === 4 && "Create New Audit - Select Category"}
                </DialogTitle>
                <DialogDescription>
                  Step {newAuditStep} of {selectedTemplate === 'staff-based' ? 4 : 3}
                </DialogDescription>
              </DialogHeader>

              {/* Step 1: Select Template */}
              {newAuditStep === 1 && (
                <div className="space-y-3 py-4">
                  <div
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTemplate === 'resident-based'
                        ? 'border-primary bg-accent'
                        : 'border-transparent hover:border-primary hover:bg-accent'
                      }`}
                    onClick={() => handleSelectAuditTemplate('resident-based')}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">Resident-based Audit</h3>
                      <p className="text-sm text-muted-foreground">
                        Audit multiple residents with customizable questions. Ideal for care quality assessments.
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                  </div>

                  <div
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTemplate === 'home-based'
                        ? 'border-primary bg-accent'
                        : 'border-transparent hover:border-primary hover:bg-accent'
                      }`}
                    onClick={() => handleSelectAuditTemplate('home-based')}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">Home-based Audit</h3>
                      <p className="text-sm text-muted-foreground">
                        General home audit with grid layout. Perfect for facility inspections and operational reviews.
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                  </div>

                  <div
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTemplate === 'staff-based'
                        ? 'border-primary bg-accent'
                        : 'border-transparent hover:border-primary hover:bg-accent'
                      }`}
                    onClick={() => handleSelectAuditTemplate('staff-based')}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">Staff-based Audit</h3>
                      <p className="text-sm text-muted-foreground">
                        Audit staff members for training, competency assessments, and performance evaluations.
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                  </div>

                  <div
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTemplate === 'plain-template'
                        ? 'border-primary bg-accent'
                        : 'border-transparent hover:border-primary hover:bg-accent'
                      }`}
                    onClick={() => handleSelectAuditTemplate('plain-template')}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">Plain Template</h3>
                      <p className="text-sm text-muted-foreground">
                        Blank audit template. Build your own custom audit from scratch with full flexibility.
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                  </div>
                </div>
              )}

              {/* Step 2: Staff Type (for staff-based) or Name (for others) */}
              {newAuditStep === 2 && selectedTemplate === 'staff-based' && (
                <div className="space-y-4 py-4">
                  <div className="space-y-3">
                    <Label>Select Staff Type</Label>
                    <div className="space-y-3">
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${staffType === 'nurses'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setStaffType('nurses')}
                      >
                        <h3 className="font-semibold">Nurses Only</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Audit registered nurses and nursing staff
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${staffType === 'care-staff'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setStaffType('care-staff')}
                      >
                        <h3 className="font-semibold">Care Staff Only</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Audit care assistants and support workers
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${staffType === 'both'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setStaffType('both')}
                      >
                        <h3 className="font-semibold">Both</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Audit all nursing and care staff members
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button onClick={handleNextStep}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {newAuditStep === 2 && selectedTemplate !== 'staff-based' && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="audit-name">Audit Name</Label>
                    <Input
                      id="audit-name"
                      value={newAuditName}
                      onChange={(e) => setNewAuditName(e.target.value)}
                      placeholder="e.g., Monthly Resident Care Review"
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNextStep();
                      }}
                      autoFocus
                    />
                    <p className="text-sm text-muted-foreground">
                      Choose a descriptive name for your audit
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button onClick={handleNextStep}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Name (for staff-based) or Category (for others) */}
              {newAuditStep === 3 && selectedTemplate === 'staff-based' && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="audit-name">Audit Name</Label>
                    <Input
                      id="audit-name"
                      value={newAuditName}
                      onChange={(e) => setNewAuditName(e.target.value)}
                      placeholder="e.g., Monthly Staff Competency Review"
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNextStep();
                      }}
                      autoFocus
                    />
                    <p className="text-sm text-muted-foreground">
                      Choose a descriptive name for your audit
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button onClick={handleNextStep}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {newAuditStep === 3 && selectedTemplate !== 'staff-based' && (
                <div className="space-y-4 py-4">
                  <div className="space-y-3">
                    <Label>Select Category</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'clinical'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('clinical')}
                      >
                        <h3 className="font-semibold">Clinical Audits</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Health, care quality, clinical procedures
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'general'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('general')}
                      >
                        <h3 className="font-semibold">General</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          General audits, compliance, safety
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'operational'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('operational')}
                      >
                        <h3 className="font-semibold">Operational Audits</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Facility operations, environment checks
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'staff'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('staff')}
                      >
                        <h3 className="font-semibold">Staff Audits</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Staff training, competency, performance
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button onClick={handleCreateAudit}>
                      Create Audit
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Category (only for staff-based audits) */}
              {newAuditStep === 4 && selectedTemplate === 'staff-based' && (
                <div className="space-y-4 py-4">
                  <div className="space-y-3">
                    <Label>Select Category</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'clinical'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('clinical')}
                      >
                        <h3 className="font-semibold">Clinical Audits</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Health, care quality, clinical procedures
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'general'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('general')}
                      >
                        <h3 className="font-semibold">General</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          General audits, compliance, safety
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'operational'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('operational')}
                      >
                        <h3 className="font-semibold">Operational Audits</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Facility operations, environment checks
                        </p>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${newAuditCategory === 'staff'
                            ? 'border-primary bg-accent'
                            : 'border-gray-200 hover:border-primary hover:bg-accent'
                          }`}
                        onClick={() => setNewAuditCategory('staff')}
                      >
                        <h3 className="font-semibold">Staff Audits</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Staff training, competency, performance
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Back
                    </Button>
                    <Button onClick={handleCreateAudit}>
                      Create Audit
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Care File Audit - Resident Selector Dialog */}
          <Dialog open={isResidentSelectorOpen} onOpenChange={setIsResidentSelectorOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Select Resident Care File</DialogTitle>
                <DialogDescription>
                  Choose which resident&apos;s care file audit history you want to view
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Search residents by name or room number..."
                  value={residentSearchQuery}
                  onChange={(e) => setResidentSearchQuery(e.target.value)}
                  className="w-full"
                />
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredResidents.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {residentSearchQuery
                        ? "No residents found matching your search"
                        : "No residents available"}
                    </p>
                  ) : (
                    filteredResidents.map((resident) => (
                      <div
                        key={resident._id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleSelectResidentReport(resident._id)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={resident.imageUrl} />
                            <AvatarFallback className="text-sm">
                              {resident.firstName[0]}{resident.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {resident.firstName} {resident.lastName}
                            </p>
                            {resident.roomNumber && (
                              <p className="text-sm text-muted-foreground">
                                Room {resident.roomNumber}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withRoleGuard(ManagerAuditPage, ["manager", "admin", "owner"]);
