"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";
import { auditService, AuditTemplate, AuditCompletion } from "@/lib/audit-service";
import { supabase } from "@/lib/supabase";

function residentFirstName(r: Record<string, unknown>): string {
  return String(r.first_name ?? r.firstName ?? "");
}

function residentLastName(r: Record<string, unknown>): string {
  return String(r.last_name ?? r.lastName ?? "");
}

function residentRoom(r: Record<string, unknown>): string {
  const v = r.room_number ?? r.roomNumber ?? r.room;
  return v != null && String(v).trim() ? String(v) : "N/A";
}

function residentImage(r: Record<string, unknown>): string | undefined {
  const u = r.image_url ?? r.imageUrl;
  return typeof u === "string" ? u : undefined;
}

function CareFileAuditPageContent() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as string;
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const { profile } = useProfile();

  // Fetch resident data
  const [resident, setResident] = useState<Record<string, unknown> | null | undefined>(
    undefined
  );
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [responses, setResponses] = useState<AuditCompletion[]>([]);

  useEffect(() => {
    if (residentId) {
      supabase
        .from("residents")
        .select("*")
        .eq("id", residentId)
        .single()
        .then(({ data, error }) => {
          if (data) setResident(data as Record<string, unknown>);
          else if (error) setResident(null);
        });
    }
  }, [residentId]);


  useEffect(() => {
    if (activeOrganizationId) {
      auditService.getCareFileTemplates(activeOrganizationId).then(setTemplates);
    }
    if (residentId) {
      auditService.getCareFileCompletionsByResident(residentId).then(setResponses);
    }
  }, [activeOrganizationId, residentId]);

  // Dialog states
  const [isAddAuditDialogOpen, setIsAddAuditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  // Form states
  const [newAuditForm, setNewAuditForm] = useState({
    name: "",
    description: "",
    frequency: "quarterly" as "monthly" | "quarterly" | "yearly",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "pending":
      case "new":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const handleAddAudit = async () => {
    if (!newAuditForm.name || !activeTeamId || !activeOrganizationId || !profile?.email) {
      toast.error("Missing required information");
      return;
    }

    try {
      const template = await auditService.createCareFileTemplate({
        name: newAuditForm.name,
        description: newAuditForm.description,
        items: [],
        frequency: newAuditForm.frequency,
        team_id: activeTeamId,
        organization_id: activeOrganizationId,
        created_by: profile.email,
        is_active: true,
        category: 'carefile'
      });

      toast.success("Audit template created successfully");
      setIsAddAuditDialogOpen(false);
      setNewAuditForm({
        name: "",
        description: "",
        frequency: "quarterly",
      });

      // Refresh templates
      const updatedTemplates = await auditService.getCareFileTemplates(activeOrganizationId);
      setTemplates(updatedTemplates);

      // Navigate to the audit editor
      if (template) {
        router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${template.id}`);
      }
    } catch (error) {
      console.error("Error creating audit template:", error);
      toast.error("Failed to create audit template");
    }
  };

  const handleDeleteAudit = async () => {
    if (!templateToDelete) return;

    try {
      await auditService.deleteCareFileTemplate(templateToDelete.id);
      toast.success("Audit template deleted successfully");
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
      // Refresh
      if (activeOrganizationId) {
        const t = await auditService.getCareFileTemplates(activeOrganizationId);
        setTemplates(t);
      }
    } catch (error) {
      console.error("Error deleting audit template:", error);
      toast.error("Failed to delete audit template");
    }
  };

  const getLatestCompletion = (templateId: string) => {
    if (!responses) return null;
    const templateResponses = responses.filter(
      (r) => r.template_id === templateId && r.status === "completed"
    );
    if (templateResponses.length === 0) return null;
    return templateResponses.sort((a, b) =>
      new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
    )[0];
  };

  const getCompletionPercentage = (completion: {
    items?: { status?: string }[];
  }) => {
    if (!completion?.items?.length) return 0;
    const total = completion.items.length;
    const reviewed = completion.items.filter((item) => {
      const s = item.status;
      if (!s || s === "") return false;
      if (s === "unchecked" || s === "not-reviewed") return false;
      return true;
    }).length;
    return Math.round((reviewed / total) * 100);
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
        <Button onClick={() => router.push("/dashboard/careo-audit?tab=careFile" as Route)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audits
        </Button>
      </div>
    );
  }

  const fn = residentFirstName(resident);
  const ln = residentLastName(resident);
  const residentLabel = `${fn} ${ln}`.trim() || "Resident";
  const initials = `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="flex w-full flex-col bg-background pb-8">
      <div className="mx-auto w-full max-w-[1400px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/dashboard/careo-audit?tab=careFile" as Route)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Breadcrumb className="min-w-0 flex-1 text-muted-foreground">
            <BreadcrumbList className="flex-wrap sm:gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={"/dashboard/careo-audit?tab=careFile" as Route}>
                    Audits
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground max-w-[220px] truncate font-medium sm:max-w-none">
                  Care file audits · {residentLabel} · Rm {residentRoom(resident)}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button onClick={() => setIsAddAuditDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add audit
          </Button>
        </div>

        <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={residentImage(resident)} alt="" />
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-base font-medium text-foreground">
                Care file audit · {residentLabel}
              </h1>
              <p className="text-xs text-muted-foreground">
                Choose a template below to open the checklist workspace. Room{" "}
                {residentRoom(resident)}.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-x-auto bg-muted/20 px-2 py-4 sm:px-4">
          <Table>
            <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-12 border-r last:border-r-0">
                <input type="checkbox" className="rounded border-gray-300 ml-1" />
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">Audit Name</TableHead>
              <TableHead className="font-medium border-r last:border-r-0">Status</TableHead>
              <TableHead className="font-medium border-r last:border-r-0">Auditor</TableHead>
              <TableHead className="font-medium border-r last:border-r-0">Last Audited</TableHead>
              <TableHead className="font-medium border-r last:border-r-0">Next Audit</TableHead>
              <TableHead className="font-medium border-r last:border-r-0 w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates && templates.length > 0 ? (
              templates.map((template) => {
                const latestCompletion = getLatestCompletion(template.id);
                const isCompleted = !!latestCompletion;
                const completionPercentage = latestCompletion ? getCompletionPercentage(latestCompletion) : 0;

                const lastAudited = isCompleted && latestCompletion.completed_at
                  ? new Date(latestCompletion.completed_at).toLocaleDateString('en-GB')
                  : "-";

                const nextAudit = isCompleted && latestCompletion.next_audit_due
                  ? new Date(latestCompletion.next_audit_due).toLocaleDateString('en-GB')
                  : "-";

                return (
                  <TableRow key={template.id} className="hover:bg-muted/50">
                    <TableCell className="border-r last:border-r-0">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <button
                        onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${template.id}`)}
                        className="font-medium hover:underline text-left"
                      >
                        {template.name}
                      </button>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                        {completionPercentage === 100 ? "completed" : "new"}
                      </Badge>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      {latestCompletion?.audited_by_name || latestCompletion?.audited_by || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground border-r last:border-r-0">
                      {lastAudited}
                    </TableCell>
                    <TableCell className="text-muted-foreground border-r last:border-r-0">
                      {nextAudit}
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${template.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {isCompleted ? "View/Audit Again" : "Start Audit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setTemplateToDelete(template);
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
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No audit templates available</p>
                    <Button variant="outline" size="sm" onClick={() => setIsAddAuditDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Audit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={isAddAuditDialogOpen} onOpenChange={setIsAddAuditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Audit Template</DialogTitle>
            <DialogDescription>
              Create a new care file audit template. You can add questions/items after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="auditName">Audit Name</Label>
              <Input
                id="auditName"
                placeholder="e.g., Pre-Admission Assessment"
                value={newAuditForm.name}
                onChange={(e) => setNewAuditForm({ ...newAuditForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this audit"
                value={newAuditForm.description}
                onChange={(e) => setNewAuditForm({ ...newAuditForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={newAuditForm.frequency}
                onValueChange={(value: "monthly" | "quarterly" | "yearly") =>
                  setNewAuditForm({ ...newAuditForm, frequency: value })
                }
              >
                <SelectTrigger id="frequency">
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
            <Button type="button" variant="outline" onClick={() => setIsAddAuditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleAddAudit}>Create Audit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Audit Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{templateToDelete?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setTemplateToDelete(null); }}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteAudit}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CareFileAuditPage() {
  return (
    <ErrorBoundary fallback={<AuditErrorFallback />}>
      <CareFileAuditPageContent />
    </ErrorBoundary>
  );
}
