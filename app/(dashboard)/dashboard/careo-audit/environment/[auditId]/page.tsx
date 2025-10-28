"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, CalendarIcon } from "lucide-react";
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

export default function EnvironmentAuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  // Get current user session
  const { data: session } = authClient.useSession();

  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const [auditName, setAuditName] = useState("Environment & Safety Audit");

  // Load organization members for action plan assignment
  const organizationMembers = useQuery(
    api.teams.getOrganizationMembers,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Database hooks - Template management
  const updateTemplate = useMutation(api.environmentAuditTemplates.updateTemplate);

  // Check if auditId is a Convex ID (starts with lowercase letter, not a timestamp)
  const isConvexId = auditId && /^[a-z]/.test(auditId);

  // Determine if it's a template ID or response ID
  // Environment template IDs start with letters like 'v', 'k', 'j', etc.
  // We need to check if the template actually exists to determine the type
  const isTemplateId = isConvexId; // Assume template first
  const isResponseId = false; // Will be determined after we check if template exists

  const getTemplate = useQuery(
    api.environmentAuditTemplates.getTemplateById,
    isTemplateId
      ? { templateId: auditId as Id<"environmentAuditTemplates"> }
      : "skip"
  );

  // Database hooks - Audit response management
  const getOrCreateDraft = useMutation(api.environmentAuditResponses.getOrCreateDraft);
  const updateResponse = useMutation(api.environmentAuditResponses.updateResponse);
  const completeAudit = useMutation(api.environmentAuditResponses.completeAudit);

  // State for tracking current audit response ID
  const [responseId, setResponseId] = useState<Id<"environmentAuditCompletions"> | null>(null);

  // Ref to prevent duplicate draft creation
  const isCreatingDraft = React.useRef(false);

  // Database hooks - Action plan management
  const createActionPlan = useMutation(api.environmentAuditActionPlans.createActionPlan);

  // Load existing action plans from database (only if we have a responseId)
  const dbActionPlans = useQuery(
    api.environmentAuditActionPlans.getActionPlansByAudit,
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
    if (getTemplate && getTemplate.items && auditDetailItems.length === 0) {
      const items: AuditDetailItem[] = getTemplate.items.map((item: any) => ({
        id: item.id,
        itemName: item.name,
        status: "n/a",
        reviewer: null,
        lastReviewed: null,
        notes: null,
      }));
      setAuditDetailItems(items);
    }
  }, [getTemplate]);

  // Create draft response when page loads with template (if one doesn't exist)
  useEffect(() => {
    if (!getTemplate || responseId || !activeOrganizationId || !session) return;

    // DUPLICATE PREVENTION: Check if already creating
    if (isCreatingDraft.current) {
      console.log("⏳ Draft creation already in progress, skipping...");
      return;
    }

    console.log("📝 Creating new draft response...");

    const createDraft = async () => {
      isCreatingDraft.current = true;

      try {
        const auditorName = session?.user?.name || session?.user?.email || "Unknown User";
        const draftId = await getOrCreateDraft({
          templateId: getTemplate._id,
          organizationId: activeOrganizationId,
          auditedBy: auditorName,
        });
        console.log("✅ Draft response created:", draftId);
        setResponseId(draftId);
      } catch (error) {
        console.error("Failed to create draft:", error);
      } finally {
        setTimeout(() => {
          isCreatingDraft.current = false;
        }, 2000);
      }
    };

    createDraft();
  }, [getTemplate, responseId, activeOrganizationId, session, getOrCreateDraft]);

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

  // Action plan state
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState<string>("");
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);

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

  const handleAddItem = () => {
    if (!newItemForm.question) {
      return;
    }

    const newItem: AuditDetailItem = {
      id: Date.now().toString(),
      itemName: newItemForm.question,
      status: newItemForm.status,
      reviewer: null,
      lastReviewed: newItemForm.date || null,
      notes: newItemForm.comment || null,
    };

    setAuditDetailItems([...auditDetailItems, newItem]);
    setIsAddItemDialogOpen(false);
    setNewItemForm({
      question: "",
      status: "n/a",
      date: "",
      comment: "",
    });
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
      default:
        return status;
    }
  };

  // Track if data has actually changed to avoid unnecessary saves
  const lastSavedData = React.useRef<string>("");
  const isSaving = React.useRef(false);

  // Auto-save audit progress to database (debounced and optimized)
  useEffect(() => {
    if (!responseId || !getTemplate || !activeOrganizationId) {
      console.log("⏸️ Auto-save skipped:", { responseId: !!responseId, template: !!getTemplate, orgId: !!activeOrganizationId });
      return;
    }

    // Only save if we have actual data
    if (auditDetailItems.length === 0) {
      console.log("⏸️ Auto-save skipped: No data to save");
      return;
    }

    const timer = setTimeout(async () => {
      // Prevent concurrent saves
      if (isSaving.current) {
        console.log("⏸️ Auto-save skipped: Already saving");
        return;
      }

      try {
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
          console.log("⏸️ Auto-save skipped: No changes detected");
          return;
        }

        isSaving.current = true;
        console.log("💾 Auto-saving environment audit data...", {
          items: items.length,
        });

        // Auto-save to database
        await updateResponse({
          responseId,
          items,
          status: "in-progress",
        });

        lastSavedData.current = currentDataHash;
        console.log("✅ Auto-save successful");
      } catch (error) {
        console.error("❌ Auto-save failed:", error);
        // Silent fail for auto-save
      } finally {
        isSaving.current = false;
      }
    }, 5000); // Save every 5 seconds after changes stop

    return () => clearTimeout(timer);
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
        status: item.status as "compliant" | "non-compliant" | "not-applicable" | "checked" | "unchecked" | undefined,
        notes: item.notes || undefined,
        date: item.lastReviewed || undefined,
      }));

      // Complete the audit in database
      await completeAudit({
        responseId,
        items,
      });

      // Save action plans to database
      for (const plan of actionPlans.filter((p) => p.auditId === auditId)) {
        if (getTemplate && activeOrganizationId) {
          await createActionPlan({
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
          });
        }
      }

      toast.success(`${auditName} completed successfully! Starting new audit...`, {
        duration: 3000,
      });

      // Reset form to start a new audit
      setAuditDetailItems([]);
      setActionPlans([]);
      setResponseId(null);

      // Reset flags to allow new draft
      isCreatingDraft.current = false;

      // Reload the page to start fresh
      router.push(`/dashboard/careo-audit/environment/${auditId}`);
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
            onClick={() => router.push("/dashboard/careo-audit?tab=environment")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{auditName}</h1>
            <p className="text-sm text-muted-foreground">Environment & Safety</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dbActionPlans && dbActionPlans.length > 0 && (
            <Badge variant="secondary" className="mr-2">
              {dbActionPlans.length} Action Plan{dbActionPlans.length > 1 ? "s" : ""}
            </Badge>
          )}
          <Button onClick={handleCompleteAudit} className="mr-2">
            Complete Audit
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-7 w-full justify-start text-xs font-normal border-0 shadow-none px-2 hover:bg-transparent"
                      >
                        {item.lastReviewed ? format(new Date(item.lastReviewed), "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={item.lastReviewed ? new Date(item.lastReviewed) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            handleDateChange(item.id, format(date, "yyyy-MM-dd"));
                          }
                        }}
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
          <div className="px-2 pb-4 border-b border-dashed">
            <Button variant="outline" size="sm" onClick={() => setIsActionPlanDialogOpen(true)}>
              Action Plan
            </Button>
          </div>
          <div className="px-2">
            {/* Action Plan Cards */}
            {actionPlans.filter(plan => plan.auditId === auditId).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {actionPlans.filter(plan => plan.auditId === auditId).map((plan) => (
                  <div
                    key={plan.id}
                    className="border rounded-lg p-4 space-y-3 bg-card"
                  >
                    <p className="text-sm">{plan.text}</p>
                    <div className="flex flex-wrap gap-2">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
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
              <Input
                id="date"
                type="date"
                value={newItemForm.date}
                onChange={(e) =>
                  setNewItemForm({ ...newItemForm, date: e.target.value })
                }
              />
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Action Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              placeholder="Enter action plan details..."
              value={actionPlanText}
              onChange={(e) => setActionPlanText(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 text-base rounded-md border focus:outline-none resize-none"
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
                <PopoverContent className="w-48 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {organizationMembers?.map((member: any) => (
                      <div
                        key={member.email}
                        className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setAssignedTo(member.name || member.email);
                          setAssignedToEmail(member.email);
                          setAssignPopoverOpen(false);
                        }}
                      >
                        {member.name || member.email}
                      </div>
                    ))}
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
                onClick={() => {
                  if (actionPlanText.trim()) {
                    const newActionPlan: ActionPlan = {
                      id: `ap${actionPlans.length + 1}`,
                      auditId: auditId,
                      text: actionPlanText,
                      assignedTo: assignedTo,
                      assignedToEmail: assignedToEmail,
                      dueDate: dueDate,
                      priority: priority,
                    };
                    setActionPlans([...actionPlans, newActionPlan]);
                    setActionPlanText("");
                    setAssignedTo("");
                    setAssignedToEmail("");
                    setDueDate(undefined);
                    setPriority("");
                    setIsActionPlanDialogOpen(false);
                  }
                }}
              >
                Create
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
