"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
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
import { useActiveTeam } from "@/hooks/use-active-team";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";

function CareFileAuditPageContent() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as Id<"residents">;
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const { data: session } = authClient.useSession();

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId: residentId });

  // Fetch care file audit templates for the organization
  const templates = useQuery(
    api.careFileAuditTemplates.getTemplatesByOrganization,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Fetch all responses for this resident
  const responses = useQuery(
    api.careFileAuditResponses.getResponsesByResident,
    { residentId }
  );

  // Dialog states
  const [isAddAuditDialogOpen, setIsAddAuditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  // Form states
  const [newAuditForm, setNewAuditForm] = useState({
    name: "",
    description: "",
    frequency: "6months" as "3months" | "6months" | "yearly",
  });

  // Mutations
  const createTemplate = useMutation(api.careFileAuditTemplates.createTemplate);
  const deleteTemplate = useMutation(api.careFileAuditTemplates.deleteTemplate);

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
    if (!newAuditForm.name || !activeTeamId || !activeOrganizationId || !session?.user?.email) {
      toast.error("Missing required information");
      return;
    }

    try {
      const templateId = await createTemplate({
        name: newAuditForm.name,
        description: newAuditForm.description,
        items: [],
        frequency: newAuditForm.frequency,
        teamId: activeTeamId,
        organizationId: activeOrganizationId,
        createdBy: session.user.email,
      });

      toast.success("Audit template created successfully");
      setIsAddAuditDialogOpen(false);
      setNewAuditForm({
        name: "",
        description: "",
        frequency: "6months",
      });

      // Navigate to the audit editor
      router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${templateId}`);
    } catch (error) {
      console.error("Error creating audit template:", error);
      toast.error("Failed to create audit template");
    }
  };

  const handleDeleteAudit = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate({ templateId: templateToDelete._id });
      toast.success("Audit template deleted successfully");
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Error deleting audit template:", error);
      toast.error("Failed to delete audit template");
    }
  };

  // Helper to get latest completion for a template
  const getLatestCompletion = (templateId: string) => {
    if (!responses) return null;

    const templateResponses = responses.filter(
      (r) => r.templateId === templateId && r.status === "completed"
    );

    if (templateResponses.length === 0) return null;

    return templateResponses.sort((a, b) =>
      (b.completedAt || 0) - (a.completedAt || 0)
    )[0];
  };

  // Helper to calculate completion percentage
  const getCompletionPercentage = (completion: any) => {
    if (!completion || !completion.items || completion.items.length === 0) return 0;

    const compliantItems = completion.items.filter(
      (item: any) => item.status === "compliant" || item.status === "checked"
    ).length;

    return Math.round((compliantItems / completion.items.length) * 100);
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
          {/* Placeholder for filters */}
        </div>
        <div className="flex items-center gap-2">
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
            {templates && templates.length > 0 ? (
              templates.map((template) => {
                const latestCompletion = getLatestCompletion(template._id);
                const isCompleted = !!latestCompletion;
                const completionPercentage = latestCompletion ? getCompletionPercentage(latestCompletion) : 0;

                const lastAudited = isCompleted && latestCompletion.completedAt
                  ? new Date(latestCompletion.completedAt).toLocaleDateString('en-GB')
                  : "-";

                const nextAudit = isCompleted && latestCompletion.nextAuditDue
                  ? new Date(latestCompletion.nextAuditDue).toLocaleDateString('en-GB')
                  : "-";

                return (
                  <TableRow key={template._id} className="hover:bg-muted/50">
                    <TableCell className="border-r last:border-r-0">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <button
                        onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${template._id}`)}
                        className="font-medium hover:underline text-left"
                      >
                        {template.name}
                      </button>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      {isCompleted ? (
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
                      ) : (
                        <Badge variant="secondary" className={`text-xs h-6 ${getStatusColor("new")}`}>
                          New
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      {latestCompletion?.auditedBy || "-"}
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
                          {isCompleted && latestCompletion ? (
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${template._id}/view`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Completed
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit/${template._id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Start Audit
                            </DropdownMenuItem>
                          )}
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

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>

      {/* Add Audit Dialog */}
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
                onChange={(e) =>
                  setNewAuditForm({ ...newAuditForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this audit"
                value={newAuditForm.description}
                onChange={(e) =>
                  setNewAuditForm({ ...newAuditForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={newAuditForm.frequency}
                onValueChange={(value: "3months" | "6months" | "yearly") =>
                  setNewAuditForm({ ...newAuditForm, frequency: value })
                }
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
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
              Create Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Audit Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Audit Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{templateToDelete?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setTemplateToDelete(null);
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

export default function CareFileAuditPage() {
  return (
    <ErrorBoundary fallback={<AuditErrorFallback context="listing" />}>
      <CareFileAuditPageContent />
    </ErrorBoundary>
  );
}
