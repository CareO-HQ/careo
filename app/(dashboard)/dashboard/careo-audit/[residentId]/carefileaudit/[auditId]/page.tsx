"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Plus, X, Trash2, MoreHorizontal, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";

interface Item {
  id: string;
  name: string;
  type: "compliance" | "checkbox" | "notes";
}

interface ItemResponse {
  itemId: string;
  itemName: string;
  status?: "compliant" | "non-compliant" | "not-applicable" | "checked" | "unchecked";
  notes?: string;
  date?: string;
}

interface ActionPlan {
  id: string;
  auditId: string;
  text: string;
  assignedTo: string;
  assignedToEmail: string;
  dueDate: Date | undefined;
  priority: string;
  status?: "pending" | "in_progress" | "completed" | "overdue";
  latestComment?: string;
}

function CareFileAuditEditorPageContent() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as Id<"residents">;
  const auditId = params.auditId as Id<"careFileAuditTemplates">;
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const { data: session } = authClient.useSession();

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Fetch template data
  const template = useQuery(api.careFileAuditTemplates.getTemplateById, { templateId: auditId });

  // State (defined early so it can be used in queries)
  const [items, setItems] = useState<Item[]>([]);
  const [itemResponses, setItemResponses] = useState<Map<string, ItemResponse>>(new Map());
  const [overallNotes, setOverallNotes] = useState("");
  const [responseId, setResponseId] = useState<Id<"careFileAuditCompletions"> | null>(null);

  // Fetch existing drafts for this resident and template
  const existingDrafts = useQuery(
    api.careFileAuditResponses.getDraftResponsesByTemplateAndResident,
    { templateId: auditId, residentId }
  );

  // Load organization members for action plan assignment
  const organizationMembers = useQuery(
    api.teams.getOrganizationMembers,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Query action plans from database for this audit (if response exists)
  const dbActionPlans = useQuery(
    api.careFileAuditActionPlans.getActionPlansByAudit,
    responseId ? { auditResponseId: responseId } : "skip"
  );

  // Mutations
  const updateTemplate = useMutation(api.careFileAuditTemplates.updateTemplate);
  const createResponse = useMutation(api.careFileAuditResponses.createResponse);
  const updateResponseMutation = useMutation(api.careFileAuditResponses.updateResponse);
  const completeResponseMutation = useMutation(api.careFileAuditResponses.completeResponse);
  const createActionPlanMutation = useMutation(api.careFileAuditActionPlans.createActionPlan);
  const deleteActionPlanMutation = useMutation(api.careFileAuditActionPlans.deleteActionPlan);

  // Refs to prevent duplicate operations and track state
  const isCreatingDraft = useRef(false);
  const hasLoadedDraft = useRef(false);

  // Additional state
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    type: "compliance" as "compliance" | "checkbox" | "notes",
  });

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

  // Load template items
  useEffect(() => {
    if (template) {
      setItems(template.items);
    }
  }, [template]);

  // Load existing draft if available (only once to prevent resets)
  useEffect(() => {
    console.log("🔍 Checking for existing care file drafts:", {
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
      const responsesMap = new Map<string, ItemResponse>();
      latestDraft.items.forEach((item) => {
        responsesMap.set(item.itemId, item);
      });
      setItemResponses(responsesMap);
      setOverallNotes(latestDraft.overallNotes || "");

      hasLoadedDraft.current = true; // Mark as loaded to prevent resets
      console.log("✅ Draft loaded successfully");
    }
  }, [existingDrafts, responseId]);

  // Load action plans from database
  useEffect(() => {
    if (dbActionPlans && dbActionPlans.length > 0) {
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

  // Track if data has actually changed to avoid unnecessary saves
  const lastSavedData = useRef<string>("");
  const isSaving = useRef(false);

  // Auto-save functionality (debounced and optimized)
  useEffect(() => {
    if (!responseId) {
      console.log("⏸️ Auto-save skipped: No response ID");
      return;
    }

    // Only save if we have actual data
    if (itemResponses.size === 0 && !overallNotes) {
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
        const items = Array.from(itemResponses.values());

        // Check if data actually changed
        const currentDataHash = JSON.stringify({ items, overallNotes });
        if (currentDataHash === lastSavedData.current) {
          console.log("⏸️ Auto-save skipped: No changes detected");
          return;
        }

        isSaving.current = true;
        console.log("💾 Auto-saving care file audit data...", {
          responseId,
          itemCount: items.length,
          hasOverallNotes: !!overallNotes,
        });

        await updateResponseMutation({
          responseId,
          items,
          overallNotes,
          status: "in-progress",
        });

        lastSavedData.current = currentDataHash;
        console.log("✅ Auto-save successful");
      } catch (error) {
        console.error("❌ Auto-save failed:", error);
      } finally {
        isSaving.current = false;
      }
    }, 5000); // Save every 5 seconds after changes stop

    return () => clearTimeout(timer);
  }, [itemResponses, overallNotes, responseId, updateResponseMutation]);

  // Automatically create draft response if none exists
  useEffect(() => {
    if (!template || !resident || !activeTeamId || !activeOrganizationId || !session?.user?.email) {
      return;
    }

    // If response already exists, no need to create
    if (responseId) return;

    // If drafts exist, we'll use one of them (handled by another useEffect)
    if (existingDrafts && existingDrafts.length > 0) return;

    // DUPLICATE PREVENTION: Check if already creating
    if (isCreatingDraft.current) {
      console.log("⏳ Care file draft creation already in progress, skipping...");
      return;
    }

    console.log("📝 No existing care file draft found, creating new draft response...");

    const createDraft = async () => {
      // Set flag to prevent duplicate calls
      isCreatingDraft.current = true;

      try {
        const auditorName = session.user.name || session.user.email;
        const draftId = await createResponse({
          templateId: auditId,
          templateName: template.name,
          residentId,
          residentName: `${resident.firstName} ${resident.lastName}`,
          roomNumber: resident.roomNumber,
          teamId: activeTeamId,
          organizationId: activeOrganizationId,
          auditedBy: auditorName,
          frequency: template.frequency,
        });
        console.log("✅ Care file draft response created:", draftId);
        setResponseId(draftId);
      } catch (error) {
        console.error("Failed to create care file draft:", error);
      } finally {
        // Reset flag after creation completes or fails
        setTimeout(() => {
          isCreatingDraft.current = false;
        }, 2000); // Wait 2 seconds before allowing another attempt
      }
    };

    createDraft();
  }, [template, resident, responseId, activeTeamId, activeOrganizationId, session, existingDrafts, createResponse, auditId, residentId]);

  const handleAddItem = async () => {
    if (!newItemForm.name) {
      toast.error("Please enter an item name");
      return;
    }

    const newItem: Item = {
      id: `item_${Date.now()}`,
      name: newItemForm.name,
      type: newItemForm.type,
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);

    try {
      await updateTemplate({
        templateId: auditId,
        items: updatedItems,
      });

      toast.success("Item added successfully");
      setIsAddItemDialogOpen(false);
      setNewItemForm({ name: "", type: "compliance" });
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const updatedItems = items.filter((item) => item.id !== itemId);
    setItems(updatedItems);

    try {
      await updateTemplate({
        templateId: auditId,
        items: updatedItems,
      });

      // Also remove from responses
      const newResponses = new Map(itemResponses);
      newResponses.delete(itemId);
      setItemResponses(newResponses);

      toast.success("Item removed successfully");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleItemResponseChange = (itemId: string, itemName: string, field: string, value: any) => {
    const newResponses = new Map(itemResponses);
    const existing = newResponses.get(itemId) || { itemId, itemName };
    newResponses.set(itemId, { ...existing, [field]: value });
    setItemResponses(newResponses);
  };

  // Helper function to get status badge color (for audit items)
  const getItemStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
      case "checked":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "non-compliant":
      case "unchecked":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "not-applicable":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Helper function to get action plan status badge color
  const getActionPlanStatusColor = (status?: string) => {
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

  // Helper function to get action plan status label
  const getActionPlanStatusLabel = (status?: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "overdue":
        return "Overdue";
      default:
        return status || "Pending";
    }
  };

  const handleCompleteAudit = async () => {
    if (!resident || !template || !activeTeamId || !activeOrganizationId || !session?.user?.email) {
      toast.error("Missing required information");
      return;
    }

    try {
      let currentResponseId = responseId;

      // Create response if it doesn't exist
      if (!currentResponseId) {
        currentResponseId = await createResponse({
          templateId: auditId,
          templateName: template.name,
          residentId,
          residentName: `${resident.firstName} ${resident.lastName}`,
          roomNumber: resident.roomNumber,
          teamId: activeTeamId,
          organizationId: activeOrganizationId,
          auditedBy: session.user.name || session.user.email,
          frequency: template.frequency,
        });
        setResponseId(currentResponseId);
      }

      // Note: Action plans are already saved when created, no need to save them again here

      // Complete the response
      await completeResponseMutation({
        responseId: currentResponseId,
        items: Array.from(itemResponses.values()),
        overallNotes,
      });

      toast.success("Audit completed successfully! Starting new audit...");

      // Reset form to start a new audit
      setItemResponses(new Map());
      setOverallNotes("");
      setActionPlans([]);
      setResponseId(null);

      // Reset flags to allow new draft and data loading
      isCreatingDraft.current = false;
      hasLoadedDraft.current = false;

      console.log("🔄 Audit completed and reset - ready for new audit");

      // The page will stay on the same template, ready for a new audit
    } catch (error) {
      console.error("Error completing audit:", error);
      toast.error("Failed to complete audit");
    }
  };

  if (!resident || !template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
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
            onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)}
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
                {template.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {resident.firstName} {resident.lastName} - Room {resident.roomNumber || "N/A"}
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

      {/* Actions Bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          {/* Placeholder for filters */}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddItemDialogOpen(true)} size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
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
              <TableHead className="w-12 border-r last:border-r-0"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => {
                const response = itemResponses.get(item.id);
                return (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="border-r last:border-r-0">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <span className="font-medium">{item.name}</span>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      {item.type === "compliance" ? (
                        <Select
                          value={response?.status || ""}
                          onValueChange={(value) =>
                            handleItemResponseChange(item.id, item.name, "status", value)
                          }
                        >
                          <SelectTrigger className="h-6 border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 bg-transparent hover:bg-transparent shadow-none">
                            {response?.status ? (
                              <Badge variant="secondary" className={`text-xs h-6 ${getItemStatusColor(response.status)}`}>
                                {response.status === "compliant" ? "Compliant" : response.status === "non-compliant" ? "Non-Compliant" : "N/A"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compliant">Compliant</SelectItem>
                            <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                            <SelectItem value="not-applicable">N/A</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : item.type === "checkbox" ? (
                        <Select
                          value={response?.status || ""}
                          onValueChange={(value) =>
                            handleItemResponseChange(item.id, item.name, "status", value)
                          }
                        >
                          <SelectTrigger className="h-6 border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 bg-transparent hover:bg-transparent shadow-none">
                            {response?.status ? (
                              <Badge variant="secondary" className={`text-xs h-6 ${getItemStatusColor(response.status)}`}>
                                {response.status === "checked" ? "Checked" : "Unchecked"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checked">Checked</SelectItem>
                            <SelectItem value="unchecked">Unchecked</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-full justify-start text-left font-normal border-0 shadow-none px-2 hover:bg-transparent"
                          >
                            {response?.date ? format(new Date(response.date), "MMM dd, yyyy") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={response?.date ? new Date(response.date) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                handleItemResponseChange(item.id, item.name, "date", format(date, "yyyy-MM-dd"));
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
                        value={response?.notes || ""}
                        onChange={(e) =>
                          handleItemResponseChange(item.id, item.name, "notes", e.target.value)
                        }
                        className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                      />
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No items added yet</p>
                    <Button variant="outline" size="sm" onClick={() => setIsAddItemDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Question
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
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
            {actionPlans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {actionPlans.map((plan, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-3 bg-card relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{plan.text}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={async () => {
                          // Check if this is a database plan (has Convex ID format)
                          const isDbPlan = /^[a-z]/.test(plan.id);

                          if (isDbPlan) {
                            try {
                              await deleteActionPlanMutation({
                                actionPlanId: plan.id as Id<"careFileAuditActionPlans">
                              });
                              toast.success("Action plan deleted successfully");
                            } catch (error) {
                              console.error("Error deleting action plan:", error);
                              toast.error("Failed to delete action plan");
                              return;
                            }
                          }

                          // Remove from local state
                          const updatedPlans = actionPlans.filter((_, i) => i !== index);
                          setActionPlans(updatedPlans);

                          if (!isDbPlan) {
                            toast.success("Action plan removed");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Status Badge */}
                      {plan.status && (
                        <Badge className={`${getActionPlanStatusColor(plan.status)} text-xs`}>
                          {getActionPlanStatusLabel(plan.status)}
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
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

                  // Ensure we have a response ID (create one if needed)
                  let currentResponseId = responseId;

                  if (!currentResponseId) {
                    if (!resident || !template || !activeTeamId || !activeOrganizationId || !session?.user?.email) {
                      toast.error("Missing required information");
                      return;
                    }

                    try {
                      currentResponseId = await createResponse({
                        templateId: auditId,
                        templateName: template.name,
                        residentId,
                        residentName: `${resident.firstName} ${resident.lastName}`,
                        roomNumber: resident.roomNumber,
                        teamId: activeTeamId,
                        organizationId: activeOrganizationId,
                        auditedBy: session.user.name || session.user.email,
                        frequency: template.frequency,
                      });
                      setResponseId(currentResponseId);
                    } catch (error) {
                      console.error("Error creating response:", error);
                      toast.error("Failed to create audit response");
                      return;
                    }
                  }

                  // Save action plan to database immediately
                  try {
                    const actionPlanId = await createActionPlanMutation({
                      auditResponseId: currentResponseId,
                      templateId: auditId,
                      residentId,
                      description: actionPlanText,
                      assignedTo: assignedToEmail,
                      assignedToName: assignedTo,
                      priority: priority as "Low" | "Medium" | "High",
                      dueDate: dueDate?.getTime(),
                      teamId: activeTeamId!,
                      organizationId: activeOrganizationId!,
                      createdBy: session!.user!.email!,
                      createdByName: session!.user!.name || session!.user!.email!,
                    });

                    const newActionPlan: ActionPlan = {
                      id: actionPlanId,
                      text: actionPlanText,
                      assignedTo: assignedTo,
                      assignedToEmail: assignedToEmail,
                      dueDate: dueDate,
                      priority: priority,
                      status: "pending",
                    };

                    setActionPlans([...actionPlans, newActionPlan]);
                    setActionPlanText("");
                    setAssignedTo("");
                    setAssignedToEmail("");
                    setDueDate(undefined);
                    setPriority("");
                    setIsActionPlanDialogOpen(false);
                    toast.success("Action plan added and saved");
                  } catch (error) {
                    console.error("Error creating action plan:", error);
                    toast.error("Failed to create action plan");
                  }
                }}
              >
                Create
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>
              Add a new question/item to this audit template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemName">Question</Label>
              <Input
                id="itemName"
                placeholder="e.g., Has the resident been informed of their rights?"
                value={newItemForm.name}
                onChange={(e) =>
                  setNewItemForm({ ...newItemForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="itemType">Type</Label>
              <Select
                value={newItemForm.type}
                onValueChange={(value: "compliance" | "checkbox" | "notes") =>
                  setNewItemForm({ ...newItemForm, type: value })
                }
              >
                <SelectTrigger id="itemType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance">Compliance (Compliant/Non-Compliant/N/A)</SelectItem>
                  <SelectItem value="checkbox">Checkbox (Checked/Unchecked)</SelectItem>
                  <SelectItem value="notes">Notes Only</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}


export default function CareFileAuditEditorPage() {
  return (
    <ErrorBoundary fallback={<AuditErrorFallback context="editor" />}>
      <CareFileAuditEditorPageContent />
    </ErrorBoundary>
  );
}
