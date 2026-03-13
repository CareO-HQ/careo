"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, CalendarIcon, Trash2, X, MoreHorizontal } from "lucide-react";
import { DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { auditService, AuditTemplate, AuditCompletion } from "@/lib/audit-service";

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
  assignedTo: string; // This will be the UUID
  assignedToName: string; // This will be the name for display
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

  const { profile } = useProfile();
  const { activeOrganizationId, activeCareHomeId } = useActiveTeam();
  const [auditName, setAuditName] = useState("Environment Audit");

  const [template, setTemplate] = useState<AuditTemplate | null>(null);
  const [response, setResponse] = useState<AuditCompletion | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isTemplateId, setIsTemplateId] = useState(false);
  const isCreatingDraft = useRef(false);
  const hasLoadedDraft = useRef(false);

  // 1. Initial Load
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const possibleTemplate = await auditService.getEnvironmentTemplateById(auditId);

      if (possibleTemplate) {
        setTemplate(possibleTemplate);
        setIsTemplateId(true);
        setAuditName(possibleTemplate.name);
      } else {
        const possibleResponse = await auditService.getEnvironmentResponseById(auditId);
        if (possibleResponse) {
          setResponse(possibleResponse);
          setResponseId(possibleResponse.id);
          setIsTemplateId(false);

          if (possibleResponse.template_id) {
            const tmpl = await auditService.getEnvironmentTemplateById(possibleResponse.template_id);
            if (tmpl) {
              setTemplate(tmpl);
              setAuditName(tmpl.name);
            } else {
              setAuditName(possibleResponse.template_name || "Unknown Environment Audit");
            }
          }
          loadResponseData(possibleResponse);
        }
      }
    } catch (err) {
      console.error("Error loading environment audit:", err);
      toast.error("Failed to load audit");
    } finally {
      setIsLoading(false);
    }
  }, [auditId]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadResponseData = (auditResponse: AuditCompletion) => {
    if (auditResponse.items) {
      const loadedItems: AuditDetailItem[] = auditResponse.items.map((item: any) => ({
        id: item.itemId,
        itemName: item.itemName,
        status: item.status || "",
        reviewer: null,
        lastReviewed: item.date || null,
        notes: item.notes || null,
      }));
      setAuditDetailItems(loadedItems);
    }
    if (auditResponse.audited_by_name) {
      setAuditorName(auditResponse.audited_by_name);
    } else if (auditResponse.audited_by) {
      setAuditorName(auditResponse.audited_by);
    }
    if (auditResponse.id) {
      auditService.getEnvironmentActionPlans(auditResponse.id).then(plans => {
        if (plans) {
          const mappedPlans: ActionPlan[] = plans.map((p: any) => ({
            id: p.id,
            auditId: p.audit_response_id,
            text: p.description,
            assignedTo: p.assigned_to,
            assignedToName: p.assigned_to_name || p.assigned_to,
            assignedToEmail: p.assigned_to_email || "",
            dueDate: p.due_date ? new Date(p.due_date) : undefined,
            priority: p.priority,
            status: p.status,
            latestComment: p.latest_comment
          }));
          setActionPlans(mappedPlans);
        }
      });
    }
  };

  useEffect(() => {
    if (isLoading || !isTemplateId || !template || !activeOrganizationId || responseId || hasLoadedDraft.current) return;

    const checkDrafts = async () => {
      try {
        const drafts = await auditService.getDraftEnvironmentResponses(template.id, activeOrganizationId);

        if (drafts && drafts.length > 0) {
          const recentDraft = drafts[0];
          setResponseId(recentDraft.id);
          setResponse(recentDraft);
          loadResponseData(recentDraft);
          hasLoadedDraft.current = true;
        } else if (!isCreatingDraft.current) {
          isCreatingDraft.current = true;
          const newDraft = await auditService.createEnvironmentResponse({
            template_id: template.id,
            template_name: template.name,
            category: 'environment',
            organization_id: activeOrganizationId,
            audited_by: profile?.email || "Unknown",
            audited_by_name: profile?.name || profile?.email || "Unknown",
            frequency: template.frequency,
            status: 'draft'
          });
          setAuditorName(profile?.name || profile?.email || "Unknown");
          setResponseId(newDraft.id);
          setResponse(newDraft);
          isCreatingDraft.current = false;
          if (template.items) {
            setAuditDetailItems(template.items.map((item: any) => ({
              id: item.id,
              itemName: item.name,
              status: "",
              reviewer: null,
              lastReviewed: null,
              notes: null
            })));
          }
          hasLoadedDraft.current = true;
        }
      } catch (e) {
        console.error("Draft error:", e);
        isCreatingDraft.current = false;
      }
    };
    checkDrafts();

    // Load org members
    if (activeOrganizationId) {
      auditService.getOrganizationMembers(activeOrganizationId).then(setOrgMembers);
    }
  }, [isLoading, isTemplateId, template, activeOrganizationId, responseId, profile]);

  useEffect(() => {
    if (template && template.items && !responseId && !hasLoadedDraft.current) {
      setAuditDetailItems(template.items.map((item: any) => ({
        id: item.id,
        itemName: item.name,
        status: "",
        reviewer: null,
        lastReviewed: null,
        notes: null
      })));
    }
  }, [template, responseId]);

  const [auditDetailItems, setAuditDetailItems] = useState<AuditDetailItem[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [auditorName, setAuditorName] = useState("");

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ question: "", status: "", date: "", comment: "" });
  const [openDatePopover, setOpenDatePopover] = useState<string | null>(null);
  const [newItemDatePopoverOpen, setNewItemDatePopoverOpen] = useState(false);
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<string | null>(null);

  // Action Plan Form State
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState("");
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);

  const handleStatusChange = (itemId: string, newStatus: string) => {
    setAuditDetailItems(items => items.map(item => item.id === itemId ? { ...item, status: newStatus } : item));
  };

  const handleCommentChange = (itemId: string, newComment: string) => {
    setAuditDetailItems(items => items.map(item => item.id === itemId ? { ...item, notes: newComment } : item));
  };

  const handleDateChange = (itemId: string, newDate: string) => {
    setAuditDetailItems(items => items.map(item => item.id === itemId ? { ...item, lastReviewed: newDate } : item));
  };

  const handleAddItem = async () => {
    if (!newItemForm.question || !template) return;

    const newItemId = `item_${Date.now()}`;
    const updatedTemplateItems = [
      ...(template.items || []),
      { id: newItemId, name: newItemForm.question, type: 'compliance' }
    ];

    try {
      // 1. Update the template so future audits have this item
      await auditService.updateEnvironmentTemplate(template.id, { items: updatedTemplateItems });

      const newItem: AuditDetailItem = {
        id: newItemId,
        itemName: newItemForm.question,
        status: newItemForm.status || "",
        reviewer: null,
        lastReviewed: newItemForm.date || null,
        notes: newItemForm.comment || null
      };

      const newItemsList = [...auditDetailItems, newItem];
      setAuditDetailItems(newItemsList);

      // 2. If we have an active draft response, update it immediately to persist the new item
      if (responseId) {
        const itemsToSave = newItemsList.map(item => ({
          itemId: item.id,
          itemName: item.itemName,
          status: item.status,
          notes: item.notes,
          date: item.lastReviewed
        }));

        await auditService.updateEnvironmentResponse(responseId, {
          items: itemsToSave
        });
      }

      toast.success("Question added");
      setIsAddItemDialogOpen(false);
      setNewItemForm({ question: "", status: "", date: "", comment: "" });
    } catch (e) {
      console.error("Error adding item:", e);
      toast.error("Failed to add question");
    }
  };

  const handleAddActionPlan = async () => {
    if (!actionPlanText || !assignedTo || !assignedToEmail || !priority || !dueDate) {
      toast.error("Please fill all action plan fields");
      return;
    }

    try {
      let savedPlan;
      if (responseId) {
        savedPlan = await auditService.createEnvironmentActionPlan({
          audit_response_id: responseId,
          description: actionPlanText,
          assigned_to: assignedTo, // This is the UUID
          assigned_to_name: orgMembers.find(m => m.id === assignedTo)?.name || assignedTo,
          priority: priority,
          due_date: dueDate.toISOString(),
          organization_id: activeOrganizationId,
          careHomeId: activeCareHomeId,
          created_by: profile?.email,
          created_by_name: profile?.name || profile?.email,
          status: 'pending'
        });
      }

      const newPlan: ActionPlan = {
        id: savedPlan?.id || `temp-${Date.now()}`,
        auditId: responseId || 'new',
        text: actionPlanText,
        assignedTo: assignedTo, // This is the UUID
        assignedToName: orgMembers.find(m => m.id === assignedTo)?.name || assignedTo,
        assignedToEmail: assignedToEmail,
        dueDate: dueDate,
        priority: priority,
        status: 'pending'
      };

      setActionPlans([...actionPlans, newPlan]);
      setIsActionPlanDialogOpen(false);
      toast.success("Action plan added to audit");
    } catch (e) {
      console.error("Error adding action plan:", e);
      toast.error("Failed to add action plan to database");
    }
  };

  const handleRemoveActionPlan = (planId: string) => {
    setActionPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteActionPlan = async () => {
    if (!actionPlanToDelete) return;
    setActionPlans(actionPlans.filter(p => p.id !== actionPlanToDelete));
    setDeleteDialogOpen(false);
    setActionPlanToDelete(null);
    toast.success("Action plan removed");
  };

  const handleCompleteAudit = async () => {
    if (!responseId || !activeOrganizationId) return;
    try {
      const itemsToSave = auditDetailItems.map(item => ({
        itemId: item.id,
        itemName: item.itemName,
        status: item.status,
        notes: item.notes,
        date: item.lastReviewed
      }));

      await auditService.completeEnvironmentResponse(responseId, {
        items: itemsToSave,
        audited_by: profile?.email,
        audited_by_name: auditorName || profile?.name || profile?.email,
        organization_id: activeOrganizationId
      });

      for (const plan of actionPlans.filter(p => !p.id || p.id.startsWith('temp'))) {
        await auditService.createEnvironmentActionPlan({
          audit_response_id: responseId,
          description: plan.text,
          assigned_to: plan.assignedTo, // This is the UUID
          assigned_to_name: plan.assignedToName,
          priority: plan.priority,
          due_date: plan.dueDate?.toISOString(),
          organization_id: activeOrganizationId,
          careHomeId: activeCareHomeId,
          created_by: profile?.email,
          created_by_name: profile?.name || profile?.email,
          status: 'pending'
        });
      }

      toast.success("Audit completed!");
      router.push("/dashboard/careo-audit?tab=environment");
    } catch (e) {
      console.error("Error completing audit", e);
      toast.error("Failed to complete audit");
    }
  };

  const lastSavedData = React.useRef("");
  const isSaving = React.useRef(false);

  useEffect(() => {
    if (!responseId || auditDetailItems.length === 0) return;
    const timer = setTimeout(async () => {
      if (isSaving.current) return;
      const itemsToSave = auditDetailItems.map(item => ({
        itemId: item.id,
        itemName: item.itemName,
        status: item.status,
        notes: item.notes,
        date: item.lastReviewed
      }));
      const hash = JSON.stringify({ items: itemsToSave, auditor: auditorName });
      if (hash === lastSavedData.current) return;

      isSaving.current = true;
      try {
        await auditService.updateEnvironmentResponse(responseId, {
          items: itemsToSave,
          audited_by_name: auditorName,
          status: 'in-progress'
        });
        lastSavedData.current = hash;
        console.log("Auto-saved environment audit");
      } catch (e) { console.error(e); }
      finally { isSaving.current = false; }
    }, 2000); // Reduced time to 2s
    return () => clearTimeout(timer);
  }, [auditDetailItems, responseId, auditorName]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "non-compliant": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "n/a": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/careo-audit?tab=environment")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{auditName}</h1>
            <p className="text-sm text-muted-foreground">{responseId && "Draft In Progress"}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2"></div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddItemDialogOpen(true)} size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button onClick={() => setIsActionPlanDialogOpen(true)} size="sm" variant="outline" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Add Action Plan
          </Button>
          <Button onClick={handleCompleteAudit} size="sm" className="h-8">
            Complete Audit
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Item</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditDetailItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell>
                  <Select value={item.status} onValueChange={(value) => handleStatusChange(item.id, value)}>
                    <SelectTrigger className={`h-6 w-[140px] ${getStatusColor(item.status)}`}>
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">Compliant</SelectItem>
                      <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                      <SelectItem value="n/a">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Popover open={openDatePopover === item.id} onOpenChange={(open) => setOpenDatePopover(open ? item.id : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="h-7 justify-start text-xs">
                        {item.lastReviewed ? format(new Date(item.lastReviewed), "MMM dd") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={item.lastReviewed ? new Date(item.lastReviewed) : undefined} onSelect={(date) => { if (date) { handleDateChange(item.id, date.toISOString()); setOpenDatePopover(null); } }} />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <Input value={item.notes || ""} onChange={(e) => handleCommentChange(item.id, e.target.value)} className="h-8" placeholder="Add note..." />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>Add a new audit question/item to this audit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={newItemForm.question}
                onChange={(e) => setNewItemForm({ ...newItemForm, question: e.target.value })}
                placeholder="e.g., Is the fire alarm system tested weekly?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newItemForm.status}
                onValueChange={(val) => setNewItemForm({ ...newItemForm, status: val })}
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
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={newItemDatePopoverOpen} onOpenChange={setNewItemDatePopoverOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newItemForm.date ? format(new Date(newItemForm.date), "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newItemForm.date ? new Date(newItemForm.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNewItemForm({ ...newItemForm, date: date.toISOString() });
                        setNewItemDatePopoverOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Input
                id="comment"
                value={newItemForm.comment}
                onChange={(e) => setNewItemForm({ ...newItemForm, comment: e.target.value })}
                placeholder="Add any notes or comments..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionPlanDialogOpen} onOpenChange={setIsActionPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Plan</DialogTitle>
            <DialogDescription>Assign a task to address a concern.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Action</Label>
              <Input value={actionPlanText} onChange={(e) => setActionPlanText(e.target.value)} className="col-span-3" placeholder="What needs to be done?" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Assign To</Label>
              <Select value={assignedToEmail} onValueChange={(val) => {
                setAssignedToEmail(val);
                const member = orgMembers.find(m => m.email === val);
                if (member) setAssignedTo(member.id); // Store UUID instead of name/email
              }}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {orgMembers.map(member => (
                    <SelectItem key={member.email} value={member.email}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.image_url || ""} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {(member.name?.[0] || member.email[0]).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Due Date</Label>
              <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={(date) => { if (date) { setDueDate(date); setDueDatePopoverOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddActionPlan}>Add Action Plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Action Plan</DialogTitle>
            <DialogDescription>Are you sure you want to remove this action plan?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteActionPlan}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Plans Summary */}
      {
        actionPlans.length > 0 && (
          <div className="p-6 border-t bg-muted/30">
            <h3 className="text-lg font-semibold mb-4 text-primary">Audit Action Plans</h3>
            <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action Required</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latest Comment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.text}</TableCell>
                      <TableCell>{plan.assignedToName || plan.assignedTo}</TableCell>
                      <TableCell>{plan.dueDate ? format(plan.dueDate, "dd/MM/yyyy") : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={plan.priority === 'High' ? 'destructive' : 'outline'}>
                          {plan.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          plan.status === 'completed' ? 'bg-green-500 hover:bg-green-600' :
                            plan.status === 'in_progress' ? 'bg-blue-500 hover:bg-blue-600' :
                              'bg-yellow-500 hover:bg-yellow-600'
                        }>
                          {(plan.status || 'pending').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {plan.latestComment || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveActionPlan(plan.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      }
    </div >
  );
}
