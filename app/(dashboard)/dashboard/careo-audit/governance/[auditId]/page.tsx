"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, CalendarIcon, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface AuditDetailItem {
  id: string;
  itemName: string;
  status: string;
  reviewer: string | null;
  lastReviewed: string | null;
  notes: string | null;
}

interface ActionPlan {
  id: string;
  auditId: string;
  text: string;
  assignedTo: string;
  assignedToEmail: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  latestComment?: string;
}

export default function GovernanceAuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  // Get current user session
  const { data: session } = authClient.useSession();

  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const [auditName, setAuditName] = useState("Governance & Complaints Audit");

  // Load organization members for action plan assignment
  const organizationMembers = useQuery(
    api.teams.getOrganizationMembers,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Database hooks - Template management
  const updateTemplate = useMutation(api.governanceAuditTemplates.updateTemplate);

  // Check if auditId is a Convex ID (starts with lowercase letter, not a timestamp)
  const isConvexId = auditId && /^[a-z]/.test(auditId);

  // Determine if it's a template ID or response ID
  // Governance template IDs start with letters like 'v', 'k', 'j', etc.
  // We need to check if the template actually exists to determine the type
  const isTemplateId = isConvexId; // Assume template first
  const isResponseId = false; // Will be determined after we check if template exists

  const getTemplate = useQuery(
    api.governanceAuditTemplates.getTemplateById,
    isTemplateId
      ? { templateId: auditId as Id<"governanceAuditTemplates"> }
      : "skip"
  );

  // Database hooks - Audit response management
  const getOrCreateDraft = useMutation(api.governanceAuditResponses.getOrCreateDraft);
  const updateResponse = useMutation(api.governanceAuditResponses.updateResponse);
  const completeAudit = useMutation(api.governanceAuditResponses.completeAudit);

  // State for tracking current audit response ID
  const [responseId, setResponseId] = useState<Id<"governanceAuditCompletions"> | null>(null);

  // Fetch existing drafts for this template and organization
  const existingDrafts = useQuery(
    api.governanceAuditResponses.getDraftResponsesByTemplate,
    getTemplate && activeOrganizationId
      ? { templateId: getTemplate._id, organizationId: activeOrganizationId }
      : "skip"
  );

  // State-based draft creation prevention (more reliable than refs)
  const [draftCreationState, setDraftCreationState] = useState<'idle' | 'creating' | 'created'>('idle');
  const hasLoadedDraft = React.useRef(false);

  // Database hooks - Action plan management
  const createActionPlan = useMutation(api.governanceAuditActionPlans.createActionPlan);
  const deleteActionPlanMutation = useMutation(api.governanceAuditActionPlans.deleteActionPlan);

  // Load existing action plans from database (only if we have a responseId)
  const dbActionPlans = useQuery(
    api.governanceAuditActionPlans.getActionPlansByAudit,
    responseId ? { auditResponseId: responseId } : "skip"
  );

  // Load audit name from template
  useEffect(() => {
    if (getTemplate) {
      console.log("✅ Loading from database template:", getTemplate.name);
      setAuditName(getTemplate.name);
    }
  }, [getTemplate]);

  const [auditDetailItems, setAuditDetailItems] = useState<AuditDetailItem[]>([]);

  // Load template items into audit detail items
  useEffect(() => {
    if (getTemplate && getTemplate.items && auditDetailItems.length === 0 && !hasLoadedDraft.current) {
      const items: AuditDetailItem[] = getTemplate.items.map((item: any) => ({
        id: item.id,
        itemName: item.name,
        status: "",
        reviewer: null,
        lastReviewed: null,
        notes: null,
      }));
      setAuditDetailItems(items);
    }
  }, [getTemplate]);

  // Load existing draft if available (only once to prevent resets)
  useEffect(() => {
    console.log("🔍 Checking for existing governance drafts:", {
      existingDrafts: existingDrafts?.length,
      responseId,
      hasLoadedDraft: hasLoadedDraft.current
    });

    // Only load once to prevent resetting user's work
    if (existingDrafts && existingDrafts.length > 0 && !responseId && !hasLoadedDraft.current) {
      const latestDraft = existingDrafts[0];
      console.log("📄 Loading existing draft:", latestDraft._id);
      setResponseId(latestDraft._id);

      // Load item responses
      if (latestDraft.items && latestDraft.items.length > 0) {
        const items: AuditDetailItem[] = latestDraft.items.map((item: any) => ({
          id: item.itemId,
          itemName: item.itemName,
          status: item.status || "",
          reviewer: null,
          lastReviewed: item.date || null,
          notes: item.notes || null,
        }));
        setAuditDetailItems(items);
      }

      hasLoadedDraft.current = true; // Mark as loaded to prevent resets
      console.log("✅ Draft loaded successfully");
    }
  }, [existingDrafts, responseId]);

  // Create draft response when page loads with template (if one doesn't exist)
  useEffect(() => {
    if (!getTemplate || responseId || !activeOrganizationId || !session) return;

    // If drafts exist, we'll use one of them (handled by another useEffect)
    if (existingDrafts && existingDrafts.length > 0) return;

    // DUPLICATE PREVENTION: Use state-based locking
    if (draftCreationState !== 'idle') {
      return;
    }

    console.log("📝 No existing governance draft found, creating new draft response...");
    setDraftCreationState('creating');

    const auditorName = session?.user?.name || session?.user?.email || "Unknown User";
    getOrCreateDraft({
      templateId: getTemplate._id,
      organizationId: activeOrganizationId,
      auditedBy: auditorName,
    })
      .then(draftId => {
        console.log("✅ Draft response created:", draftId);
        setResponseId(draftId);
        setDraftCreationState('created');
      })
      .catch(error => {
        console.error("Failed to create draft:", error);
        setDraftCreationState('idle'); // Allow retry on error
      });
  }, [getTemplate, responseId, activeOrganizationId, session, existingDrafts, draftCreationState, getOrCreateDraft]);

  // Load action plans from database
  useEffect(() => {
    if (dbActionPlans !== undefined && dbActionPlans.length > 0) {
      const transformedPlans: ActionPlan[] = dbActionPlans.map((plan: any) => ({
        id: plan._id,
        auditId: plan.auditResponseId,
        text: plan.description,
        assignedTo: plan.assignedToName || plan.assignedTo,
        assignedToEmail: plan.assignedTo,
        dueDate: plan.dueDate ? new Date(plan.dueDate) : undefined,
        priority: plan.priority,
        status: plan.status,
        latestComment: plan.latestComment,
      }));
      setActionPlans(transformedPlans);
    }
  }, [dbActionPlans]);

  // Dialog state for adding new items
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    question: "",
    status: "n/a",
    date: "",
    comment: "",
  });
  const [addItemDatePopoverOpen, setAddItemDatePopoverOpen] = useState(false);

  // Action plan state
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [assignedToEmail, setAssignedToEmail] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState<string>("");
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [openDatePopover, setOpenDatePopover] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<string | null>(null);

  const handleCommentChange = (itemId: string, newComment: string) => {
    setAuditDetailItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, notes: newComment } : item
      )
    );
  };

  const handleStatusChange = (itemId: string, newStatus: string) => {
    setAuditDetailItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );
  };

  const handleDateChange = (itemId: string, newDate: string) => {
    setAuditDetailItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, lastReviewed: newDate } : item
      )
    );
  };

  // Memoize filtered action plans to avoid repeated filtering on every render
  // For governance audits, we don't need to filter by auditId because dbActionPlans
  // already queries by responseId, so all action plans are relevant
  const relevantActionPlans = useMemo(
    () => actionPlans,
    [actionPlans]
  );

  const handleDeleteActionPlan = async () => {
    if (!actionPlanToDelete) return;

    try {
      // Check if this is a database action plan (Convex ID)
      const isDbPlan = /^[a-z]/.test(actionPlanToDelete);

      if (isDbPlan) {
        // Delete from database
        await deleteActionPlanMutation({
          actionPlanId: actionPlanToDelete as Id<"governanceAuditActionPlans">
        });
      }

      // Remove from local state
      setActionPlans(actionPlans.filter(plan => plan.id !== actionPlanToDelete));

      toast.success("Action plan deleted successfully");
      setDeleteDialogOpen(false);
      setActionPlanToDelete(null);
    } catch (error) {
      console.error("Failed to delete action plan:", error);
      toast.error("Failed to delete action plan. Please try again.");
    }
  };

  const openDeleteDialog = (planId: string) => {
    setActionPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const handleAddItem = async () => {
    if (!newItemForm.question) {
      toast.error("Please enter a question");
      return;
    }

    if (!getTemplate) {
      toast.error("Template not found");
      return;
    }

    const newItem: AuditDetailItem = {
      id: `item_${Date.now()}`,
      itemName: newItemForm.question,
      status: newItemForm.status,
      reviewer: null,
      lastReviewed: newItemForm.date || null,
      notes: newItemForm.comment || null,
    };

    const updatedAuditItems = [...auditDetailItems, newItem];
    setAuditDetailItems(updatedAuditItems);

    try {
      // Update template with new item
      const updatedTemplateItems = [
        ...getTemplate.items,
        {
          id: newItem.id,
          name: newItem.itemName,
          type: "compliance" as const,
        }
      ];

      await updateTemplate({
        templateId: getTemplate._id,
        items: updatedTemplateItems,
      });

      toast.success("Question added successfully");
      setIsAddItemDialogOpen(false);
      setNewItemForm({
        question: "",
        status: "n/a",
        date: "",
        comment: "",
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add question");
      // Revert local state on error
      setAuditDetailItems(auditDetailItems);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "non-compliant":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "n/a":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "compliant":
        return "Compliant";
      case "non-compliant":
        return "Non-Compliant";
      case "n/a":
        return "N/A";
      case "":
      case null:
      case undefined:
        return "-";
      default:
        return status;
    }
  };

  // Track if data has actually changed to avoid unnecessary saves
  const lastSavedData = React.useRef<string>("");
  const saveTimeoutRef = React.useRef<NodeJS.Timeout>();
  const abortControllerRef = React.useRef<AbortController>();

  // Auto-save audit progress to database (debounced and optimized)
  useEffect(() => {
    if (!responseId || !getTemplate || !activeOrganizationId) {
      return;
    }

    // Only save if we have actual data
    if (auditDetailItems.length === 0) {
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Prepare items array
      const items = auditDetailItems.map((item) => ({
        itemId: item.id,
        itemName: item.itemName,
        status: item.status as "compliant" | "non-compliant" | "not-applicable" | "checked" | "unchecked" | undefined,
        notes: item.notes || undefined,
        date: item.lastReviewed || undefined,
      }));

      // Check if data actually changed
      const currentDataHash = JSON.stringify(items);
      if (currentDataHash === lastSavedData.current) {
        return;
      }

      // Cancel previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        console.log("💾 Auto-saving governance audit data...");

        // Auto-save to database
        await updateResponse({
          responseId,
          items,
          status: "in-progress",
        });

        lastSavedData.current = currentDataHash;
        console.log("✅ Auto-save successful");
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error("❌ Auto-save failed:", error);
        }
      }
    }, 5000); // Save every 5 seconds after changes stop

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, [auditDetailItems, responseId, getTemplate, activeOrganizationId, updateResponse]);

  // Handle complete audit
  const handleCompleteAudit = async () => {
    if (!activeOrganizationId || !getTemplate || !responseId) {
      toast.error("Missing required data. Please try again.");
      return;
    }

    try {
      // Prepare items array
      const items = auditDetailItems.map((item) => ({
        itemId: item.id,
        itemName: item.itemName,
        status: item.status && item.status.trim() !== ""
          ? (item.status as "compliant" | "non-compliant" | "not-applicable" | "checked" | "unchecked")
          : undefined,
        notes: item.notes || undefined,
        date: item.lastReviewed || undefined,
      }));

      // Complete the audit in database
      await completeAudit({
        responseId,
        items,
      });

      // Save action plans to database atomically
      if (relevantActionPlans.length > 0) {
        const planPromises = relevantActionPlans.map(plan =>
          createActionPlan({
            auditResponseId: responseId,
            templateId: getTemplate._id,
            description: plan.text,
            assignedTo: plan.assignedToEmail || plan.assignedTo,
            assignedToName: plan.assignedTo,
            priority: plan.priority as "Low" | "Medium" | "High",
            dueDate: plan.dueDate?.getTime(),
            organizationId: activeOrganizationId,
            createdBy: session?.user?.email || session?.user?.name || "Unknown",
            createdByName: session?.user?.name || session?.user?.email || "Unknown",
          })
        );
        await Promise.all(planPromises);
      }

      toast.success(`${auditName} completed successfully! Starting new audit...`, {
        duration: 3000,
      });

      // Clear all field values but keep the questions
      const clearedItems = getTemplate.items.map((item: any) => ({
        id: item.id,
        itemName: item.name,
        status: "",
        reviewer: null,
        lastReviewed: null,
        notes: null,
      }));

      setAuditDetailItems(clearedItems);
      setActionPlans([]);
      setResponseId(null);

      // Reset state to allow new draft
      setDraftCreationState('idle');
      hasLoadedDraft.current = false;
    } catch (error) {
      console.error("Failed to complete audit:", error);
      toast.error("Failed to complete audit. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/careo-audit?tab=governance")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{auditName}</h1>
            <p className="text-sm text-muted-foreground">Governance & Complaints</p>
          </div>
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
        <Button onClick={() => setIsAddItemDialogOpen(true)} size="sm" className="h-8">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
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
                Question
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Status
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Date
              </TableHead>
              <TableHead className="font-medium border-r last:border-r-0">
                Comment
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditDetailItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell className="border-r last:border-r-0">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  <span className="font-medium">{item.itemName}</span>
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  {/* Status badge with small styling */}
                  <Select
                    value={item.status}
                    onValueChange={(value) => handleStatusChange(item.id, value)}
                  >
                    <SelectTrigger className="h-6 border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 bg-transparent hover:bg-transparent shadow-none">
                      <Badge variant="secondary" className={`text-xs h-6 ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">Compliant</SelectItem>
                      <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                      <SelectItem value="n/a">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  <Popover
                    open={openDatePopover === item.id}
                    onOpenChange={(open) => setOpenDatePopover(open ? item.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-7 w-full justify-start text-xs font-normal border-0 shadow-none px-2 hover:bg-transparent"
                      >
                        {item.lastReviewed ? format(new Date(item.lastReviewed), "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <Calendar
                        mode="single"
                        selected={item.lastReviewed ? new Date(item.lastReviewed) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            handleDateChange(item.id, format(date, "yyyy-MM-dd"));
                            setOpenDatePopover(null); // Close the popover after selection
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="border-r last:border-r-0">
                  <Input
                    type="text"
                    placeholder="Add comment..."
                    value={item.notes || ""}
                    onChange={(e) => handleCommentChange(item.id, e.target.value)}
                    className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Bottom border */}
        <div className="border-t"></div>

        {/* Action Plans Section */}
        <div className="py-4 space-y-4">
          <div className="px-2 pb-4 border-b border-dashed flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={() => setIsActionPlanDialogOpen(true)}>
              Action Plan
            </Button>
            <Button size="sm" onClick={handleCompleteAudit}>
              Complete Audit
            </Button>
          </div>
          <div className="px-2">
            {/* Action Plan Cards */}
            {relevantActionPlans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {relevantActionPlans.map((plan) => {
                  // Get status badge color
                  const getStatusColor = (status?: string) => {
                    switch (status) {
                      case "pending":
                        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
                      case "in_progress":
                        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
                      case "completed":
                        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
                      case "overdue":
                        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                      default:
                        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
                    }
                  };
                  const getStatusLabel = (status?: string) => {
                    switch (status) {
                      case "pending":
                        return "Pending";
                      case "in_progress":
                        return "In Progress";
                      case "completed":
                        return "Completed";
                      default:
                        return status;
                    }
                  };
                  return (
                    <div
                      key={plan.id}
                      className="border rounded-lg p-4 space-y-3 bg-card relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1">{plan.text}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => openDeleteDialog(plan.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Status Badge */}
                        {plan.status && (
                          <Badge className={getStatusColor(plan.status) + " text-xs"}>
                            {getStatusLabel(plan.status)}
                          </Badge>
                        )}
                        {plan.assignedTo && (
                          <Badge variant="secondary" className="text-xs">
                            {plan.assignedTo}
                          </Badge>
                        )}
                        {plan.dueDate && (
                          <Badge variant="secondary" className="text-xs">
                            {format(plan.dueDate, "MMM dd, yyyy")}
                          </Badge>
                        )}
                        {plan.priority && (
                          <Badge
                            variant="secondary"
                            className="text-xs flex items-center gap-1"
                          >
                            <div className={`w-2 h-2 rounded-full ${
                              plan.priority === "High" ? "bg-red-500" :
                              plan.priority === "Medium" ? "bg-yellow-500" :
                              "bg-green-500"
                            }`}></div>
                            {plan.priority}
                          </Badge>
                        )}
                      </div>
                      {/* Latest Comment */}
                      {plan.latestComment && (
                        <div className="text-xs text-muted-foreground italic border-l-2 pl-2 mt-2">
                          &quot;{plan.latestComment}&quot;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>
              Add a new audit question/item to this audit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="e.g., Are all complaints properly documented?"
                value={newItemForm.question}
                onChange={(e) =>
                  setNewItemForm({ ...newItemForm, question: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newItemForm.status}
                onValueChange={(value) =>
                  setNewItemForm({ ...newItemForm, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                  <SelectItem value="n/a">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover open={addItemDatePopoverOpen} onOpenChange={setAddItemDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {newItemForm.date ? format(new Date(newItemForm.date), "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Calendar
                    mode="single"
                    selected={newItemForm.date ? new Date(newItemForm.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNewItemForm({ ...newItemForm, date: format(date, "yyyy-MM-dd") });
                        setAddItemDatePopoverOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comment">Comment</Label>
              <Input
                id="comment"
                placeholder="Add any notes or comments..."
                value={newItemForm.comment}
                onChange={(e) =>
                  setNewItemForm({ ...newItemForm, comment: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddItem}>
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Plan Dialog */}
      <Dialog open={isActionPlanDialogOpen} onOpenChange={setIsActionPlanDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Action Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <textarea
              placeholder="Enter action plan details..."
              value={actionPlanText}
              onChange={(e) => setActionPlanText(e.target.value)}
              className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md focus:outline-none resize-none"
              autoFocus
            />
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              {/* Assign to */}
              <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
                <PopoverTrigger asChild>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent max-w-[200px] truncate">
                    {assignedTo || "Assign to"}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {organizationMembers && organizationMembers.length > 0 ? (
                      organizationMembers.map((member: any) => (
                        <div
                          key={member.id}
                          className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            setAssignedTo(member.name || member.email);
                            setAssignedToEmail(member.email);
                            setAssignPopoverOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {member.image && (
                              <img
                                src={member.image}
                                alt={member.name || member.email}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{member.name || member.email}</span>
                              {member.name && (
                                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {member.role}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                        No staff members found
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {/* Due Date */}
              <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    {dueDate ? format(dueDate, "MMM dd") : "Due"}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setDueDatePopoverOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              {/* Priority */}
              <Popover open={priorityPopoverOpen} onOpenChange={setPriorityPopoverOpen}>
                <PopoverTrigger asChild>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent flex items-center gap-1">
                    {priority && (
                      <div className={`w-2 h-2 rounded-full ${
                        priority === "High" ? "bg-red-500" :
                        priority === "Medium" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`}></div>
                    )}
                    {priority || "Priority"}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="space-y-1">
                    <div
                      className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        setPriority("High");
                        setPriorityPopoverOpen(false);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      High
                    </div>
                    <div
                      className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        setPriority("Medium");
                        setPriorityPopoverOpen(false);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Medium
                    </div>
                    <div
                      className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        setPriority("Low");
                        setPriorityPopoverOpen(false);
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Low
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsActionPlanDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={async () => {
                  if (!actionPlanText.trim()) {
                    toast.error("Please enter action plan details");
                    return;
                  }

                  if (!assignedToEmail) {
                    toast.error("Please select an assignee");
                    return;
                  }

                  if (!priority) {
                    toast.error("Please select a priority");
                    return;
                  }

                  try {
                    if (!responseId) {
                      toast.error("Please wait for the audit to load before creating action plans");
                      return;
                    }

                    // Save action plan to database
                    if (responseId && getTemplate && activeOrganizationId) {
                      const actionPlanId = await createActionPlan({
                        auditResponseId: responseId,
                        templateId: getTemplate._id,
                        description: actionPlanText,
                        assignedTo: assignedToEmail,
                        assignedToName: assignedTo,
                        priority: priority as "Low" | "Medium" | "High",
                        dueDate: dueDate?.getTime(),
                        organizationId: activeOrganizationId,
                        createdBy: session?.user?.email || session?.user?.name || "Unknown",
                        createdByName: session?.user?.name || session?.user?.email || "Unknown",
                      });

                      // Add to local state immediately for instant UI update
                      const newActionPlan: ActionPlan = {
                        id: actionPlanId,
                        auditId: responseId,
                        text: actionPlanText,
                        assignedTo: assignedTo,
                        assignedToEmail: assignedToEmail,
                        dueDate: dueDate,
                        priority: priority,
                        status: "pending",
                      };

                      setActionPlans([...actionPlans, newActionPlan]);
                      toast.success("Action plan created and assignee notified");
                    } else {
                      toast.error("Failed to create action plan - missing required data");
                    }
                  } catch (error) {
                    console.error("Failed to create action plan:", error);
                    toast.error("Failed to create action plan");
                    return;
                  }

                  setActionPlanText("");
                  setAssignedTo("");
                  setAssignedToEmail("");
                  setDueDate(undefined);
                  setPriority("");
                  setIsActionPlanDialogOpen(false);
                }}
              >
                Create
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this action plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteActionPlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
