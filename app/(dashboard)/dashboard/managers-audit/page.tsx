"use client";

import { useState, useEffect, Suspense } from "react";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, FileText, CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Resident } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAge } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

const governanceItems = [
  "Reg 29 Monthly Monitoring Visit & Action Plan",
  "Annual Governance/Quality Report",
  "Reg 30 Notifiable Events compliance",
  "Complaints – trend analysis & learning",
  "Incidents/Near Misses – trend analysis & learning",
  "Safeguarding Audit",
  "Staff Training / Supervision audit",
];

const clinicalItems = [
  "Medicines Management",
  "Infection Prevention & Control – hand hygiene, environment, PPE, decontamination",
  "Mattress Supervision / Integrity audits",
  "Hand Hygiene Audit",
  "Dining Experience Audit",
  "Anti-Coagulants Register",
  "Pressure Damage Prevention Audit",
  "Pressure Relieving Mattress and Cushion Audit",
];

const environmentItems = [
  "Fire Safety ",
  "Legionella – risk assessment, flushing, temperatures, descaling, logs",
  "LOLER – hoists/slings servicing",
  "Medical Devices – servicing, decontamination, incident logs",
  "Electrical Safety – EICR, PAT (risk-based)",
  "Gas Safety – annual Gas Safe certificates",
  "Food Safety – HACCP system, temps, cleaning, allergens, diary verification",
  "Safety Pause Audit",
];

const residentItems = [
  "Risk Assessment Audit",
  "Nutrition Audit",
  "Wound Audit",
  "Falls Audit",
  "Safeguarding Audit",
];

// Map resident audit items to their specific routes
const residentRouteMap: Record<string, string> = {
  "Risk Assessment Audit": "/dashboard/managers-audit/resident/risk-assessment-audit",
  "Nutrition Audit": "/dashboard/managers-audit/resident/nutrition-audit",
  "Wound Audit": "/dashboard/managers-audit/resident/wound-audit",
  "Falls Audit": "/dashboard/managers-audit/resident/falls-audit",
  "Safeguarding Audit": "/dashboard/managers-audit/resident/safeguarding-audit",
};

const AuditTable = ({ items, category, teamId, onOverdueChange, customRouteMap }: { items: string[]; category: string; teamId?: string; onOverdueChange?: (count: number) => void; customRouteMap?: Record<string, string> }) => {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [rowStatuses, setRowStatuses] = useState<Record<number, string>>({});
  const [auditorNames, setAuditorNames] = useState<Record<number, string>>({});
  const [lastAuditedDates, setLastAuditedDates] = useState<Record<number, string>>({});
  const [dueDates, setDueDates] = useState<Record<number, string>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    if (!teamId) return;

    const storageKey = `home-audit-${teamId}-${category}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setRowStatuses(parsed.rowStatuses || {});
        setAuditorNames(parsed.auditorNames || {});
        setLastAuditedDates(parsed.lastAuditedDates || {});
        setDueDates(parsed.dueDates || {});
      } catch (error) {
        console.error("Failed to load audit data from localStorage:", error);
      }
    } else {
      // Initialize with pending status if no saved data
      setRowStatuses(items.reduce((acc, _, index) => ({ ...acc, [index]: "pending" }), {}));
    }
    setIsLoaded(true);
  }, [category, items, teamId]);

  // Save data to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (!isLoaded || !teamId) return;

    const dataToSave = {
      rowStatuses,
      auditorNames,
      lastAuditedDates,
      dueDates,
    };
    const storageKey = `home-audit-${teamId}-${category}`;
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));

    // Update overdue count
    if (onOverdueChange) {
      const overdueCount = Object.values(rowStatuses).filter((status: any) => status === "overdue").length;
      onOverdueChange(overdueCount);
    }
  }, [category, isLoaded, rowStatuses, auditorNames, lastAuditedDates, dueDates, onOverdueChange, teamId]);

  const handleViewClick = (itemName: string) => {
    // Check if there's a custom route for this item
    if (customRouteMap && customRouteMap[itemName]) {
      router.push(customRouteMap[itemName]);
    } else {
      // Default behavior
      const itemId = encodeURIComponent(itemName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'));
      router.push(`/dashboard/managers-audit/${category}/${itemId}`);
    }
  };

  const handleStatusChange = (index: number, status: string) => {
    setRowStatuses(prev => ({ ...prev, [index]: status }));
  };

  const handleAuditorChange = (index: number, auditor: string) => {
    setAuditorNames(prev => ({ ...prev, [index]: auditor }));
  };

  const handleLastAuditedChange = (index: number, date: string) => {
    setLastAuditedDates(prev => ({ ...prev, [index]: date }));
  };

  const handleDueDateChange = (index: number, date: string) => {
    setDueDates(prev => ({ ...prev, [index]: date }));
  };

  const handleSortByStatus = () => {
    if (sortOrder === null || sortOrder === 'desc') {
      setSortOrder('asc');
    } else {
      setSortOrder('desc');
    }
  };

  const getStatusOrder = (status: string) => {
    const order: Record<string, number> = {
      'overdue': 1,
      'in-progress': 2,
      'pending': 3,
      'completed': 4,
      'not-applicable': 5,
    };
    return order[status] || 999;
  };

  const getSortedItems = () => {
    const itemsWithIndex = items.map((item, index) => ({ item, index }));

    if (sortOrder === null) {
      return itemsWithIndex;
    }

    return itemsWithIndex.sort((a, b) => {
      const statusA = rowStatuses[a.index] || 'pending';
      const statusB = rowStatuses[b.index] || 'pending';
      const orderA = getStatusOrder(statusA);
      const orderB = getStatusOrder(statusB);

      if (sortOrder === 'asc') {
        return orderA - orderB;
      } else {
        return orderB - orderA;
      }
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/50">
            <TableHead className="h-11 w-12 text-xs font-medium">No</TableHead>
            <TableHead className="h-11 text-xs font-medium">Audit Item</TableHead>
            <TableHead className="h-11 w-40 text-xs font-medium">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 -ml-2 hover:bg-transparent"
                onClick={handleSortByStatus}
              >
                Status
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="h-11 w-48 text-xs font-medium">Auditor Name</TableHead>
            <TableHead className="h-11 w-40 text-xs font-medium">Last Audited Date</TableHead>
            <TableHead className="h-11 w-40 text-xs font-medium">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getSortedItems().map(({ item, index }, displayIndex) => (
            <TableRow
              key={index}
              className="cursor-pointer hover:bg-muted/30 border-b last:border-0"
              onClick={() => handleViewClick(item)}
            >
              <TableCell className="h-14 text-[13px] text-muted-foreground">{displayIndex + 1}</TableCell>
              <TableCell className={`h-14 text-[13px] font-normal hover:text-primary ${
                rowStatuses[index] === "not-applicable" ? "text-gray-900" :
                rowStatuses[index] === "pending" ? "text-foreground" :
                rowStatuses[index] === "in-progress" ? "text-blue-600" :
                rowStatuses[index] === "completed" ? "text-green-600" :
                rowStatuses[index] === "overdue" ? "text-red-600" :
                ""
              }`}>
                {item}
              </TableCell>
              <TableCell className="h-14" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={rowStatuses[index] || "pending"}
                  onValueChange={(value) => handleStatusChange(index, value)}
                >
                  <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80">
                    <Badge
                      variant="secondary"
                      className={`text-[13px] px-2 py-0.5 h-6 font-normal ${
                        rowStatuses[index] === "not-applicable" ? "bg-black text-white" :
                        rowStatuses[index] === "pending" ? "bg-yellow-100 text-yellow-700" :
                        rowStatuses[index] === "in-progress" ? "bg-blue-100 text-blue-700" :
                        rowStatuses[index] === "completed" ? "bg-green-100 text-green-700" :
                        rowStatuses[index] === "overdue" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      <SelectValue />
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                        Pending
                      </Badge>
                    </SelectItem>
                    <SelectItem value="in-progress">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                        In Progress
                      </Badge>
                    </SelectItem>
                    <SelectItem value="completed">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                        Completed
                      </Badge>
                    </SelectItem>
                    <SelectItem value="overdue">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                        Overdue
                      </Badge>
                    </SelectItem>
                    <SelectItem value="not-applicable">
                      <Badge variant="secondary" className="bg-black text-white text-[13px] px-2 py-0.5 h-6 font-normal">
                        Not Applicable
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="h-14" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={auditorNames[index] || ""}
                  onValueChange={(value) => handleAuditorChange(index, value)}
                >
                  <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80">
                    {auditorNames[index] ? (
                      <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                        {auditorNames[index]}
                      </Badge>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">Select auditor</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sarah Johnson">
                      <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                        Sarah Johnson
                      </Badge>
                    </SelectItem>
                    <SelectItem value="Michael Chen">
                      <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                        Michael Chen
                      </Badge>
                    </SelectItem>
                    <SelectItem value="Emma Williams">
                      <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                        Emma Williams
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="h-14" onClick={(e) => e.stopPropagation()}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-6 text-[13px] px-2 py-0.5 font-normal bg-white hover:bg-gray-50"
                    >
                      {lastAuditedDates[index] ? format(new Date(lastAuditedDates[index]), "dd/MM/yyyy") : "Select date"}
                      <CalendarIcon className="ml-2 h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lastAuditedDates[index] ? new Date(lastAuditedDates[index]) : undefined}
                      onSelect={(date) => handleLastAuditedChange(index, date ? format(date, "yyyy-MM-dd") : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </TableCell>
              <TableCell className="h-14" onClick={(e) => e.stopPropagation()}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-6 text-[13px] px-2 py-0.5 font-normal bg-white hover:bg-gray-50"
                    >
                      {dueDates[index] ? format(new Date(dueDates[index]), "dd/MM/yyyy") : "Select date"}
                      <CalendarIcon className="ml-2 h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDates[index] ? new Date(dueDates[index]) : undefined}
                      onSelect={(date) => handleDueDateChange(index, date ? format(date, "yyyy-MM-dd") : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

function AuditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [governanceOverdue, setGovernanceOverdue] = useState(0);
  const [clinicalOverdue, setClinicalOverdue] = useState(0);
  const [environmentOverdue, setEnvironmentOverdue] = useState(0);
  const [residentOverdue, setResidentOverdue] = useState(0);

  const teamId = activeOrg?.id;
  const defaultTab = searchParams?.get('tab') || 'resident';

  // Get overdue count for a category
  const getOverdueCount = (category: string, itemCount: number) => {
    if (typeof window === 'undefined' || !teamId) return 0;

    const storageKey = `home-audit-${teamId}-${category}`;
    const savedData = localStorage.getItem(storageKey);
    if (!savedData) return 0;

    try {
      const parsed = JSON.parse(savedData);
      const statuses = Object.values(parsed.rowStatuses || {});
      return statuses.filter((status: any) => status === "overdue").length;
    } catch (error) {
      return 0;
    }
  };

  useEffect(() => {
    if (!teamId) return;

    setGovernanceOverdue(getOverdueCount("governance", governanceItems.length));
    setClinicalOverdue(getOverdueCount("clinical", clinicalItems.length));
    setEnvironmentOverdue(getOverdueCount("environment", environmentItems.length));
    setResidentOverdue(getOverdueCount("resident", residentItems.length));
  }, [teamId]);

  return (
    <div className="w-full">
      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Manager&apos;s Audit</p>
        <p className="text-sm text-muted-foreground">
          Manage and track care audits
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="resident">
            Residents
            {residentOverdue > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 h-5 font-normal">
                {residentOverdue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="care-file">
            Care File Audit
          </TabsTrigger>
          <TabsTrigger value="governance">
            Governance & Compliance
            {governanceOverdue > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 h-5 font-normal">
                {governanceOverdue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clinical">
            Clinical Care & Medicines
            {clinicalOverdue > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 h-5 font-normal">
                {clinicalOverdue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="environment">
            Environment & Safety
            {environmentOverdue > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 h-5 font-normal">
                {environmentOverdue}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="governance" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              className="gap-2 bg-black text-white hover:bg-black/90"
              onClick={() => router.push("/dashboard/managers-audit/governance-report")}
            >
              <FileText className="h-4 w-4" />
              Audit Report
            </Button>
          </div>
          <AuditTable items={governanceItems} category="governance" teamId={teamId} onOverdueChange={setGovernanceOverdue} />
        </TabsContent>

        <TabsContent value="clinical" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              className="gap-2 bg-black text-white hover:bg-black/90"
              onClick={() => router.push("/dashboard/managers-audit/clinical-report")}
            >
              <FileText className="h-4 w-4" />
              Audit Report
            </Button>
          </div>
          <AuditTable items={clinicalItems} category="clinical" teamId={teamId} onOverdueChange={setClinicalOverdue} />
        </TabsContent>

        <TabsContent value="environment" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              className="gap-2 bg-black text-white hover:bg-black/90"
              onClick={() => router.push("/dashboard/managers-audit/environment-report")}
            >
              <FileText className="h-4 w-4" />
              Audit Report
            </Button>
          </div>
          <AuditTable items={environmentItems} category="environment" teamId={teamId} onOverdueChange={setEnvironmentOverdue} />
        </TabsContent>

        <TabsContent value="resident" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              className="gap-2 bg-black text-white hover:bg-black/90"
              onClick={() => router.push("/dashboard/managers-audit/resident-report")}
            >
              <FileText className="h-4 w-4" />
              Audit Report
            </Button>
          </div>
          <AuditTable items={residentItems} category="resident" teamId={teamId} onOverdueChange={setResidentOverdue} customRouteMap={residentRouteMap} />
        </TabsContent>

        <TabsContent value="care-file" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              className="gap-2 bg-black text-white hover:bg-black/90"
              onClick={() => router.push("/dashboard/managers-audit/care-file-report")}
            >
              <FileText className="h-4 w-4" />
              Audit Report
            </Button>
          </div>
          <CareFileAuditContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="w-full p-8 text-center">Loading...</div>}>
      <AuditPageContent />
    </Suspense>
  );
}

function CareFileAuditContent() {
  const router = useRouter();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  const [auditData, setAuditData] = useState<Record<string, {
    lastAudited: string;
    dueDate: string;
    responsibleStaff: string;
    status: string;
    auditorName: string;
  }>>({});

  const handleLastAuditedChange = (residentId: string, date: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        lastAudited: date
      }
    }));
  };

  const handleDueDateChange = (residentId: string, date: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        dueDate: date
      }
    }));
  };

  const handleResponsibleStaffChange = (residentId: string, staff: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        responsibleStaff: staff
      }
    }));
  };

  const handleStatusChange = (residentId: string, status: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        status: status
      }
    }));
  };

  const handleAuditorNameChange = (residentId: string, auditor: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        auditorName: auditor
      }
    }));
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/50">
            <TableHead className="h-11 text-xs font-medium">Name</TableHead>
            <TableHead className="h-11 w-48 text-xs font-medium">Status</TableHead>
            <TableHead className="h-11 w-48 text-xs font-medium">Auditor Name</TableHead>
            <TableHead className="h-11 w-48 text-xs font-medium">Last Audited Date</TableHead>
            <TableHead className="h-11 w-48 text-xs font-medium">Due Date</TableHead>
            <TableHead className="h-11 w-48 text-xs font-medium">Responsible Staff</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents?.map((resident) => {
            const name = `${resident.firstName} ${resident.lastName}`;
            const initials = getInitials(name);
            const age = getAge(resident.dateOfBirth);
            const residentId = resident._id;

            return (
              <TableRow key={residentId} className="border-b last:border-0">
                <TableCell className="h-14">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                    onClick={() => router.push(`/dashboard/managers-audit/care-file/${residentId}`)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={resident.imageUrl} alt={name} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground">{age} years</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="h-14">
                  <Select
                    value={auditData[residentId]?.status || ''}
                    onValueChange={(value) => handleStatusChange(residentId, value)}
                  >
                    <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                      <Badge
                        variant="secondary"
                        className={`text-[13px] px-2 py-0.5 h-6 font-normal ${
                          auditData[residentId]?.status === "compliant" ? "bg-green-100 text-green-700" :
                          auditData[residentId]?.status === "non-compliant" ? "bg-red-100 text-red-700" :
                          auditData[residentId]?.status === "not-applicable" ? "bg-black text-white" :
                          "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        <SelectValue placeholder="Select status" />
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          Compliant
                        </Badge>
                      </SelectItem>
                      <SelectItem value="non-compliant">
                        <Badge variant="secondary" className="bg-red-100 text-red-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          Non Compliant
                        </Badge>
                      </SelectItem>
                      <SelectItem value="not-applicable">
                        <Badge variant="secondary" className="bg-black text-white text-[13px] px-2 py-0.5 h-6 font-normal">
                          Not Applicable
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="h-14">
                  <Select
                    value={auditData[residentId]?.auditorName || ''}
                    onValueChange={(value) => handleAuditorNameChange(residentId, value)}
                  >
                    <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                      {auditData[residentId]?.auditorName ? (
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          {auditData[residentId].auditorName}
                        </Badge>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">Select auditor</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sarah Johnson">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Sarah Johnson
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Michael Chen">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Michael Chen
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Emma Williams">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Emma Williams
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="h-14">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-6 text-[13px] px-2 py-0.5 font-normal bg-white hover:bg-gray-50"
                      >
                        {auditData[residentId]?.lastAudited ? format(new Date(auditData[residentId].lastAudited), "dd/MM/yyyy") : "Select date"}
                        <CalendarIcon className="ml-2 h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={auditData[residentId]?.lastAudited ? new Date(auditData[residentId].lastAudited) : undefined}
                        onSelect={(date) => handleLastAuditedChange(residentId, date ? format(date, "yyyy-MM-dd") : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="h-14">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-6 text-[13px] px-2 py-0.5 font-normal bg-white hover:bg-gray-50"
                      >
                        {auditData[residentId]?.dueDate ? format(new Date(auditData[residentId].dueDate), "dd/MM/yyyy") : "Select date"}
                        <CalendarIcon className="ml-2 h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={auditData[residentId]?.dueDate ? new Date(auditData[residentId].dueDate) : undefined}
                        onSelect={(date) => handleDueDateChange(residentId, date ? format(date, "yyyy-MM-dd") : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="h-14">
                  <Select
                    value={auditData[residentId]?.responsibleStaff || ''}
                    onValueChange={(value) => handleResponsibleStaffChange(residentId, value)}
                  >
                    <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                      {auditData[residentId]?.responsibleStaff ? (
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          {auditData[residentId].responsibleStaff}
                        </Badge>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">Select staff</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sarah Johnson">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Sarah Johnson
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Michael Chen">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Michael Chen
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Emma Williams">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Emma Williams
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
