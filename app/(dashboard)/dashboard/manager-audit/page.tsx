"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, MoreHorizontal, Eye, Download, Trash2, Search, SlidersHorizontal, X, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
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

  const handleNewAudit = () => {
    toast.info("Create new audit functionality coming soon");
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
        return "default";
      case "in-progress":
        return "secondary";
      case "due":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleFrequencyChange = (auditId: string, newFrequency: ManagerAudit["frequency"]) => {
    setAudits(prevAudits =>
      prevAudits.map(audit =>
        audit.id === auditId ? { ...audit, frequency: newFrequency } : audit
      )
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
                    <Badge variant={getStatusBadgeVariant(audit.status)}>
                      {audit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{audit.auditor}</TableCell>
                  <TableCell>{audit.lastAudited}</TableCell>
                  <TableCell>{audit.dueDate}</TableCell>
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

      {/* Care File Audit - Resident Selector Dialog */}
      <Dialog open={isResidentSelectorOpen} onOpenChange={setIsResidentSelectorOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Resident Care File</DialogTitle>
            <DialogDescription>
              Choose which resident's care file audit history you want to view
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
