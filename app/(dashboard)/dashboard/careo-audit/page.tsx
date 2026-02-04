"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
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
import { Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, ClipboardCheck, Eye, Download, Trash2, Archive, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useActiveTeam } from "@/hooks/use-active-team";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/use-profile";
import { withRoleGuard } from "@/lib/route-guards";
import { auditService, AuditTemplate, AuditCompletion } from "@/lib/audit-service";
import { supabase } from "@/lib/supabase";

interface Audit {
  id: string;
  name: string;
  status: "new" | "in-progress" | "completed" | "due";
  auditor: string;
  lastAudited: string;
  dueDate: string;
  category: string;
  frequency?: "monthly" | "quarterly" | "yearly" | "adhoc";
}

interface Resident {
  id: string; // Added id for compatibility
  _id: string;
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
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const { profile } = useProfile();

  // Get tab from URL query params, default to "resident"
  const tabFromUrl = searchParams.get("tab") || "resident";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // State for fetched data
  const [residentTemplates, setResidentTemplates] = useState<AuditTemplate[]>([]);
  const [latestCompletions, setLatestCompletions] = useState<AuditCompletion[]>([]);

  const [careFileTemplates, setCareFileTemplates] = useState<AuditTemplate[]>([]);
  const [careFileResponses, setCareFileResponses] = useState<AuditCompletion[]>([]);

  const [governanceTemplates, setGovernanceTemplates] = useState<AuditTemplate[]>([]);
  const [governanceCompletions, setGovernanceCompletions] = useState<AuditCompletion[]>([]);

  const [clinicalTemplates, setClinicalTemplates] = useState<AuditTemplate[]>([]);
  const [clinicalCompletions, setClinicalCompletions] = useState<AuditCompletion[]>([]);

  const [environmentTemplates, setEnvironmentTemplates] = useState<AuditTemplate[]>([]);
  const [environmentCompletions, setEnvironmentCompletions] = useState<AuditCompletion[]>([]);

  const [residents, setResidents] = useState<Resident[]>([]); // Need a way to fetch this via Supabase too if not migrating residents yet. Assuming residents are still fetchable or I need a service for them. 

  // Data Fetching Functions
  const fetchData = useCallback(async () => {
    if (!activeOrganizationId) return;

    try {
      if (activeTab === 'resident' || activeTab === 'careFile') {
        const templates = await auditService.getResidentTemplates(activeOrganizationId);
        setResidentTemplates(templates);

        if (activeTeamId) {
          const completions = await auditService.getLatestResidentCompletions(activeTeamId);
          setLatestCompletions(completions);

          // Fetch residents (simple fetch)
          const { data: resData } = await supabase.from('residents').select('*').eq('team_id', activeTeamId);
          // Manually mapping Supabase response to Resident interface
          if (resData) {
            const mappedResidents = resData.map((r: any) => ({
              _id: r.id,
              id: r.id, // Ensure id is also available
              firstName: r.first_name,
              lastName: r.last_name,
              roomNumber: r.room_number,
              dateOfBirth: r.date_of_birth,
              teamId: r.team_id,
              imageUrl: r.image_url
            }));
            setResidents(mappedResidents);
          }
        }
      } else if (activeTab === 'governance') {
        const templates = await auditService.getGovernanceTemplates(activeOrganizationId);
        setGovernanceTemplates(templates);
        const completions = await auditService.getLatestGovernanceCompletions(activeOrganizationId);
        setGovernanceCompletions(completions);
      } else if (activeTab === 'clinical') {
        const templates = await auditService.getClinicalTemplates(activeOrganizationId);
        setClinicalTemplates(templates);
        const completions = await auditService.getLatestClinicalCompletions(activeOrganizationId);
        setClinicalCompletions(completions);
      } else if (activeTab === 'environment') {
        const templates = await auditService.getEnvironmentTemplates(activeOrganizationId);
        setEnvironmentTemplates(templates);
        const completions = await auditService.getLatestEnvironmentCompletions(activeOrganizationId);
        setEnvironmentCompletions(completions);
      }

      // CareFile always needed for calculating completion?
      const cfTemplates = await auditService.getCareFileTemplates(activeOrganizationId);
      setCareFileTemplates(cfTemplates);
      if (activeTeamId) {
        const cfResponses = await auditService.getLatestCareFileCompletions(activeTeamId);
        setCareFileResponses(cfResponses);
      }

    } catch (error) {
      console.error("Error fetching audit data:", error);
      toast.error("Failed to load audit data");
    }
  }, [activeOrganizationId, activeTeamId, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Logic to process fetched data into `audits` state
  useEffect(() => {
    if (activeTab === "governance") {
      const templatesAsAudits: Audit[] = governanceTemplates.map((template) => {
        const latestCompletion = governanceCompletions?.find(
          (completion) => completion.template_id === template.id
        );
        const isCompleted = latestCompletion && latestCompletion.status === "completed";

        return {
          id: template.id,
          name: template.name,
          status: isCompleted ? "completed" : "new",
          auditor: latestCompletion?.audited_by_name || latestCompletion?.audited_by || template.created_by,
          lastAudited: isCompleted && latestCompletion?.completed_at
            ? new Date(latestCompletion.completed_at).toLocaleDateString()
            : "-",
          dueDate: isCompleted && latestCompletion?.next_audit_due
            ? new Date(latestCompletion.next_audit_due).toLocaleDateString()
            : "-",
          category: "governance",
          frequency: template.frequency as Audit['frequency'],
        };
      });
      setAudits(templatesAsAudits);
    } else if (activeTab === "clinical") {
      const templatesAsAudits: Audit[] = clinicalTemplates.map((template) => {
        const latestCompletion = clinicalCompletions?.find(
          (completion) => completion.template_id === template.id
        );
        const isCompleted = latestCompletion && latestCompletion.status === "completed";

        return {
          id: template.id,
          name: template.name,
          status: isCompleted ? "completed" : "new",
          auditor: latestCompletion?.audited_by_name || latestCompletion?.audited_by || template.created_by,
          lastAudited: isCompleted && latestCompletion?.completed_at
            ? new Date(latestCompletion.completed_at).toLocaleDateString()
            : "-",
          dueDate: isCompleted && latestCompletion?.next_audit_due
            ? new Date(latestCompletion.next_audit_due).toLocaleDateString()
            : "-",
          category: "clinical",
          frequency: template.frequency as Audit['frequency'],
        };
      });
      setAudits(templatesAsAudits);
    } else if (activeTab === "environment") {
      const templatesAsAudits: Audit[] = environmentTemplates.map((template) => {
        const latestCompletion = environmentCompletions?.find(
          (completion) => completion.template_id === template.id
        );
        const isCompleted = latestCompletion && latestCompletion.status === "completed";

        return {
          id: template.id,
          name: template.name,
          status: isCompleted ? "completed" : "new",
          auditor: latestCompletion?.audited_by_name || latestCompletion?.audited_by || template.created_by,
          lastAudited: isCompleted && latestCompletion?.completed_at
            ? new Date(latestCompletion.completed_at).toLocaleDateString()
            : "-",
          dueDate: isCompleted && latestCompletion?.next_audit_due
            ? new Date(latestCompletion.next_audit_due).toLocaleDateString()
            : "-",
          category: "environment",
          frequency: template.frequency as Audit['frequency'],
        };
      });
      setAudits(templatesAsAudits);
    } else if (activeTab === "resident") {
      const templatesAsAudits: Audit[] = residentTemplates.map((template) => {
        const latestCompletion = latestCompletions?.find(
          (completion) => completion.template_id === template.id
        );
        const isCompleted = latestCompletion && latestCompletion.status === "completed";

        return {
          id: template.id,
          name: template.name,
          status: isCompleted ? "completed" : "new",
          auditor: latestCompletion?.audited_by || template.created_by,
          lastAudited: isCompleted && latestCompletion.completed_at
            ? new Date(latestCompletion.completed_at).toLocaleDateString('en-GB')
            : "-",
          dueDate: isCompleted && latestCompletion.next_audit_due
            ? new Date(latestCompletion.next_audit_due).toLocaleDateString('en-GB')
            : "-",
          category: "resident",
          frequency: template.frequency as Audit['frequency'],
        };
      });
      setAudits(templatesAsAudits);
    }
  }, [
    activeTab,
    residentTemplates, latestCompletions,
    governanceTemplates, governanceCompletions,
    clinicalTemplates, clinicalCompletions,
    environmentTemplates, environmentCompletions
  ]);


  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<{ auditCount: number; actionPlanCount: number } | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    auditName: "",
    auditorName: "",
    frequency: "",
  });

  const handleNewAudit = () => {
    setFormData(prev => ({
      ...prev,
      auditorName: profile?.name || profile?.email || ""
    }));
    setIsDialogOpen(true);
  };

  const handleCreateAudit = async () => {
    if (!formData.auditName || !formData.frequency) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!activeOrganizationId || !profile) {
      toast.error("Missing organization or profile information");
      return;
    }

    try {
      let newTemplateId;
      const createdBy = formData.auditorName || profile.name || profile.email || "Unknown";

      if (activeTab === "resident") {
        if (!activeTeamId) {
          toast.error("Please select a unit to create a resident audit");
          return;
        }
        const res = await auditService.createResidentTemplate({
          name: formData.auditName,
          category: "resident",
          questions: [],
          frequency: formData.frequency,
          team_id: activeTeamId,
          organization_id: activeOrganizationId,
          created_by: createdBy,
          is_active: true
        });
        newTemplateId = res.id;
      } else if (activeTab === "governance") {
        const res = await auditService.createGovernanceTemplate({
          name: formData.auditName,
          items: [],
          frequency: formData.frequency,
          organization_id: activeOrganizationId,
          created_by: createdBy,
          is_active: true
        });
        newTemplateId = res.id;
      } else if (activeTab === "clinical") {
        const res = await auditService.createClinicalTemplate({
          name: formData.auditName,
          items: [],
          frequency: formData.frequency,
          organization_id: activeOrganizationId,
          created_by: createdBy,
          is_active: true
        });
        newTemplateId = res.id;
      } else if (activeTab === "environment") {
        const res = await auditService.createEnvironmentTemplate({
          name: formData.auditName,
          items: [],
          frequency: formData.frequency,
          organization_id: activeOrganizationId,
          created_by: createdBy,
          is_active: true
        });
        newTemplateId = res.id;
      }

      setIsDialogOpen(false);
      setFormData({ auditName: "", auditorName: "", frequency: "" });
      toast.success(`${(activeTab.charAt(0).toUpperCase() + activeTab.slice(1))} audit created successfully!`);

      // Refresh data
      fetchData();

      if (newTemplateId) {
        router.push(`/dashboard/careo-audit/${activeTab}/${newTemplateId}`);
      }

    } catch (error) {
      console.error(`Failed to create ${activeTab} template:`, error);
      toast.error(`Failed to create ${activeTab} audit template`);
    }
  };

  const handleDeleteClick = async (audit: Audit) => {
    setOpenDropdownId(null);
    setAuditToDelete(audit);
    // Mock impact for now or implement in service
    setDeletionImpact({ auditCount: 0, actionPlanCount: 0 });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!auditToDelete) return;
    const auditId = auditToDelete.id;

    setIsDeleteDialogOpen(false);
    setAuditToDelete(null);

    try {
      if (auditToDelete.category === "resident") {
        await auditService.deleteResidentTemplate(auditId);
      } else if (auditToDelete.category === "governance") {
        await auditService.deleteGovernanceTemplate(auditId);
      } else if (auditToDelete.category === "clinical") {
        await auditService.deleteClinicalTemplate(auditId);
      } else if (auditToDelete.category === "environment") {
        await auditService.deleteEnvironmentTemplate(auditId);
      }

      toast.success("Audit deleted successfully");
      fetchData(); // Refresh list

    } catch (error) {
      console.error("Failed to delete audit:", error);
      toast.error("Failed to delete audit. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setAuditToDelete(null);
    setDeletionImpact(null);
  };

  const handleDownloadAudit = (audit: Audit) => {
    setOpenDropdownId(null);

    if (audit.status === "completed") {
      const viewUrl = `/dashboard/careo-audit/${audit.category}/${audit.id}/view`;
      window.open(viewUrl, '_blank');
      toast.success("Audit opened in new tab", {
        description: "Click 'Download PDF' to save the audit report",
      });
    } else {
      toast.warning("Audit not completed yet", {
        description: "Please complete the audit before downloading",
      });
    }
  };

  const filteredAudits = audits.filter(audit => audit.category === activeTab);

  // State to store resident completion percentages for care file audits
  const [residentCompletions, setResidentCompletions] = useState<{ [residentId: string]: number }>({});

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Care O Audit</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleNewAudit}>
            <Plus className="mr-2 h-4 w-4" /> New Audit
          </Button>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        router.push(`/dashboard/careo-audit?tab=${value}`);
      }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resident">Resident Audit</TabsTrigger>
          <TabsTrigger value="careFile">Care File Audit</TabsTrigger>
          <TabsTrigger value="governance">Governance Audit</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Audit</TabsTrigger>
          <TabsTrigger value="environment">Environment Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="resident" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Last Audited</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No audits found. Create a new one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAudits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">{audit.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            audit.status === "completed"
                              ? "default" // "success" if you have it
                              : audit.status === "due"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {audit.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{audit.auditor}</TableCell>
                      <TableCell>{audit.lastAudited}</TableCell>
                      <TableCell>{audit.dueDate}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu open={openDropdownId === audit.id} onOpenChange={(open) => setOpenDropdownId(open ? audit.id : null)}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/careo-audit/${activeTab}/${audit.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> View/Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDownloadAudit(audit)}>
                              <Download className="mr-2 h-4 w-4" /> Download Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(audit)} className="text-red-600 focus:text-red-600">
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
        </TabsContent>

        <TabsContent value="careFile" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Resident +</TableHead>
                  <TableHead className="w-[30%]">Status</TableHead>
                  <TableHead>Last Audited</TableHead>
                  <TableHead>Next Audit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No residents found.
                    </TableCell>
                  </TableRow>
                ) : (
                  residents.map((resident) => {
                    const completedResponses = careFileResponses.filter(
                      r => (r.resident_id === resident._id || (r as any).resident_id === (resident as any).id) && r.status === 'completed'
                    );

                    // Sort completed responses by date to find the latest
                    const sortedResponses = [...completedResponses].sort((a, b) =>
                      new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
                    );

                    const latestCompletion = sortedResponses[0];
                    const uniqueCompletedTemplates = new Set(completedResponses.map(r => r.template_id));
                    const progress = careFileTemplates.length > 0
                      ? Math.round((uniqueCompletedTemplates.size / careFileTemplates.length) * 100)
                      : 0;

                    return (
                      <TableRow
                        key={resident.id || resident._id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          const id = resident.id || resident._id;
                          if (id) router.push(`/dashboard/careo-audit/${id}/carefileaudit`);
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={resident.imageUrl} />
                              <AvatarFallback>
                                {resident.firstName[0]}
                                {resident.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {resident.firstName} {resident.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {latestCompletion?.completed_at
                            ? new Date(latestCompletion.completed_at).toLocaleDateString("en-GB")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {latestCompletion?.next_audit_due
                            ? new Date(latestCompletion.next_audit_due).toLocaleDateString("en-GB")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                const id = resident.id || resident._id;
                                if (id) router.push(`/dashboard/careo-audit/${id}/carefileaudit`);
                              }}>
                                <Eye className="mr-2 h-4 w-4" /> View Audits
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Reusing the same table structure for other tabs */}
        {["governance", "clinical", "environment"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auditor</TableHead>
                    <TableHead>Last Audited</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No audits found. Create a new one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAudits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell className="font-medium">{audit.name}</TableCell>
                        <TableCell>
                          <Badge variant={audit.status === "completed" ? "default" : "secondary"}>
                            {audit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{audit.auditor}</TableCell>
                        <TableCell>{audit.lastAudited}</TableCell>
                        <TableCell>{audit.dueDate}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu open={openDropdownId === audit.id} onOpenChange={(open) => setOpenDropdownId(open ? audit.id : null)}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/careo-audit/${activeTab}/${audit.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> View/Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(audit)} className="text-red-600">
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
          </TabsContent>
        ))}

      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Audit</DialogTitle>
            <DialogDescription>
              Create a new audit template. You can add questions after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.auditName}
                onChange={(e) => setFormData({ ...formData, auditName: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="auditorName" className="text-right">
                Auditor
              </Label>
              <Input
                id="auditorName"
                value={formData.auditorName}
                onChange={(e) => setFormData({ ...formData, auditorName: e.target.value })}
                className="col-span-3"
                placeholder="Enter auditor name (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frequency" className="text-right">
                Frequency
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAudit}>Create Audit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Audit</DialogTitle>
            <DialogDescription>Are you sure you want to delete this audit? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRoleGuard(CareOAuditPageContent, ["manager", "admin", "nurse"]);
