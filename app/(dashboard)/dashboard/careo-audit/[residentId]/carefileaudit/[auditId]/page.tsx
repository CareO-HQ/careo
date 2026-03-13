"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Plus, X, Trash2, MoreHorizontal, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";
import { auditService, AuditTemplate, AuditCompletion } from "@/lib/audit-service";
import { supabase } from "@/lib/supabase";

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
  assignedTo: string; // This will be the UUID
  assignedToName: string; // This will be the name for display
  assignedToEmail: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  latestComment?: string;
  residentId?: string;
  residentName?: string;
}

function CareFileAuditEditorPageContent() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as string;
  const auditId = params.auditId as string;
  const { activeTeamId, activeOrganizationId, activeCareHomeId } = useActiveTeam();
  const { profile } = useProfile();

  // Fetch resident data
  const [resident, setResident] = useState<any>(undefined);
  const [template, setTemplate] = useState<AuditTemplate | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);

  // States
  const [items, setItems] = useState<Item[]>([]);
  const [itemResponses, setItemResponses] = useState<Map<string, ItemResponse>>(new Map());
  const [overallNotes, setOverallNotes] = useState("");
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  // Dialogs
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ name: "", type: "compliance" as any });
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState("");
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<string | null>(null);

  // Refs
  const isCreatingDraft = useRef(false);
  const hasLoadedDraft = useRef(false);
  const lastSavedData = useRef("");
  const isSaving = useRef(false);

  // Load Initial Data
  useEffect(() => {
    const load = async () => {
      if (residentId) {
        const { data } = await supabase.from('residents').select('*').eq('id', residentId).single();
        if (data) setResident(data);
      }

      // Try loading as template first
      const tmpl = await auditService.getCareFileTemplateById(auditId);
      if (tmpl) {
        setTemplate(tmpl);
        if (tmpl.items) setItems(tmpl.items);
      } else {
        // Try loading as response
        const resp = await auditService.getCareFileResponseById(auditId);
        if (resp) {
          setResponseId(resp.id);
          // Also get template info from response if possible or set dummy
          if (resp.template_id) {
            const t = await auditService.getCareFileTemplateById(resp.template_id);
            if (t) {
              setTemplate(t);
              if (t.items) setItems(t.items);
            }
          } else {
            // Fallback if template details are embedded or missing
            if (resp.items) {
              setItems(resp.items.map((i: any) => ({
                id: i.itemId,
                name: i.itemName,
                type: i.status === 'checked' || i.status === 'unchecked' ? 'checkbox' : 'compliance'
              })));
            }
            setTemplate({ name: resp.template_name || "Audit", id: "unknown" } as any);
          }

          // Load response content
          if (resp.items) {
            const map = new Map();
            resp.items.forEach((i: any) => map.set(i.itemId, i));
            setItemResponses(map);
          }
          if (resp.overall_notes) setOverallNotes(resp.overall_notes);

          // Load action plans
          const plans = await auditService.getCareFileActionPlans(resp.id);
          if (plans) {
            setActionPlans(plans.map((p: any) => ({
              id: p.id,
              auditId: p.audit_response_id,
              text: p.description,
              assignedTo: p.assigned_to,
              assignedToName: p.assigned_to_name || p.assigned_to,
              assignedToEmail: p.assigned_to_email || "",
              dueDate: p.due_date ? new Date(p.due_date) : undefined,
              priority: p.priority,
              status: p.status,
              latestComment: p.latest_comment,
              residentId: p.resident_id,
              residentName: p.resident_name
            })));
          }
        }
      }

      // Load org members
      if (activeOrganizationId) {
        const members = await auditService.getOrganizationMembers(activeOrganizationId);
        setOrgMembers(members || []);
      }
    }
    load();
  }, [residentId, auditId, activeOrganizationId]);


  // Check for drafts if we have a template but no response ID yet
  useEffect(() => {
    if (!template || responseId || hasLoadedDraft.current || !residentId) return;

    const checkDraft = async () => {
      const drafts = await auditService.getDraftCareFileResponses(template.id, residentId);
      if (drafts && drafts.length > 0) {
        const draft = drafts[0];
        setResponseId(draft.id);
        if (draft.items) {
          const map = new Map();
          draft.items.forEach((i: any) => map.set(i.itemId, i));
          setItemResponses(map);
        }
        if (draft.overall_notes) setOverallNotes(draft.overall_notes);

        const plans = await auditService.getCareFileActionPlans(draft.id);
        if (plans) {
          setActionPlans(plans.map((p: any) => ({
            id: p.id,
            auditId: p.audit_response_id,
            text: p.description,
            assignedTo: p.assigned_to,
            assignedToName: p.assigned_to_name || p.assigned_to,
            assignedToEmail: p.assigned_to_email || "",
            dueDate: p.due_date ? new Date(p.due_date) : undefined,
            priority: p.priority,
            status: p.status
          })));
        }
        hasLoadedDraft.current = true;
      } else if (!isCreatingDraft.current && activeOrganizationId && activeTeamId) {
        // Create new draft
        isCreatingDraft.current = true;
        try {
          const newDraft = await auditService.createCareFileResponse({
            template_id: template.id,
            template_name: template.name,
            resident_id: residentId,
            organization_id: activeOrganizationId,
            team_id: activeTeamId,
            audited_by: profile?.name || profile?.email || "Unknown",
            frequency: template.frequency,
            items: template.items ? template.items.map((i: any) => ({
              itemId: i.id,
              itemName: i.name,
              status: ""
            })) : [],
            status: 'draft'
          });
          setResponseId(newDraft.id);
          hasLoadedDraft.current = true;
        } catch (e) { console.error(e); }
        finally { isCreatingDraft.current = false; }
      }
    };

    checkDraft();
  }, [template, responseId, residentId, activeOrganizationId, activeTeamId, profile]);

  // Auto-Save
  useEffect(() => {
    if (!responseId) return;

    const timer = setTimeout(async () => {
      if (isSaving.current) return;

      const itemsArr = Array.from(itemResponses.values());
      const hash = JSON.stringify({ items: itemsArr, overallNotes });

      if (hash === lastSavedData.current) return;

      isSaving.current = true;
      try {
        await auditService.updateCareFileResponse(responseId, {
          items: itemsArr,
          overall_notes: overallNotes,
          status: 'in-progress'
        });
        lastSavedData.current = hash;
      } catch (e) { console.error("Auto-save failed", e); }
      finally { isSaving.current = false; }
    }, 5000);

    return () => clearTimeout(timer);
  }, [itemResponses, overallNotes, responseId]);

  // Handlers
  const handleAddItem = async () => {
    if (!newItemForm.name || !template) return;
    const newItem: Item = { id: `item_${Date.now()}`, name: newItemForm.name, type: newItemForm.type };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);

    // Update template in DB
    try {
      await auditService.updateCareFileTemplate(template.id, { items: updatedItems });
      toast.success("Item added");
      setIsAddItemDialogOpen(false);
      setNewItemForm({ name: "", type: "compliance" });
    } catch (e) { toast.error("Failed to add item to template"); }
  };

  const handleItemResponseChange = (itemId: string, itemName: string, field: string, value: any) => {
    const newMap = new Map(itemResponses);
    const existing = newMap.get(itemId) || { itemId, itemName };
    newMap.set(itemId, { ...existing, [field]: value });
    setItemResponses(newMap);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!template) return;
    const updatedItems = items.filter(i => i.id !== itemId);
    setItems(updatedItems);
    try {
      await auditService.updateCareFileTemplate(template.id, { items: updatedItems });
      const newMap = new Map(itemResponses);
      newMap.delete(itemId);
      setItemResponses(newMap);
      toast.success("Item removed");
    } catch (e) { toast.error("Failed to remove item"); }
  };


  const handleAddActionPlan = async () => {
    if (!actionPlanText || !assignedTo || !assignedToEmail || !priority || !dueDate) {
      toast.error("Please fill all action plan fields");
      return;
    }

    try {
      let savedPlan;
      if (responseId) {
        savedPlan = await auditService.createCareFileActionPlan({
          audit_response_id: responseId,
          resident_id: residentId,
          resident_name: resident ? `${resident.first_name || resident.firstName} ${resident.last_name || resident.lastName}` : "Unknown",
          description: actionPlanText,
          assigned_to: assignedToEmail,
          assigned_to_name: assignedTo,
          priority: priority,
          due_date: dueDate.toISOString(),
          organization_id: activeOrganizationId,
          careHomeId: activeCareHomeId,
          created_by: profile?.email,
          created_by_name: profile?.name || profile?.email,
          creatorId: profile?.id,
          status: 'pending'
        });
      }

      const newPlan: ActionPlan = {
        id: savedPlan?.id || `temp-${Date.now()}`,
        auditId: responseId || 'new',
        text: actionPlanText,
        assignedTo: assignedTo, // This is the UUID
        assignedToName: orgMembers.find(m => m.id === assignedTo)?.name || assignedToEmail,
        assignedToEmail: assignedToEmail,
        dueDate: dueDate,
        priority: priority,
        status: 'pending',
        residentId: residentId,
        residentName: resident ? `${resident.first_name || resident.firstName} ${resident.last_name || resident.lastName}` : "Unknown"
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

    const plan = actionPlans.find(p => p.id === actionPlanToDelete);
    if (plan && plan.id && !plan.id.startsWith('temp-')) {
      try {
        await auditService.deleteCareFileActionPlan(plan.id);
      } catch (e) {
        console.error("Error deleting persistent action plan:", e);
      }
    }

    setActionPlans(actionPlans.filter(p => p.id !== actionPlanToDelete));
    setDeleteDialogOpen(false);
    setActionPlanToDelete(null);
    toast.success("Action plan removed");
  };

  const handleCompleteAudit = async () => {
    if (!responseId) return;

    const itemsArr = Array.from(itemResponses.values());
    try {
      await auditService.completeCareFileResponse(responseId, {
        items: itemsArr,
        overall_notes: overallNotes,
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      // Save action plans (only those that are newly added and not yet in DB)
      for (const plan of actionPlans.filter(p => !p.id || p.id.startsWith('temp-'))) {
        await auditService.createCareFileActionPlan({
          audit_response_id: responseId,
          description: plan.text,
          assigned_to: plan.assignedTo, // This is the UUID
          assigned_to_name: plan.assignedToName,
          priority: plan.priority,
          due_date: plan.dueDate?.toISOString(),
          organization_id: activeOrganizationId,
          careHomeId: activeCareHomeId,
          resident_id: residentId,
          resident_name: resident ? `${resident.first_name || resident.firstName} ${resident.last_name || resident.lastName}` : "Unknown",
          created_by: profile?.email,
          created_by_name: profile?.name || profile?.email,
          creatorId: profile?.id,
          status: 'pending'
        });
      }

      toast.success("Audit completed!");
      router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`);
    } catch (e) { console.error(e); toast.error("Failed to complete audit"); }
  };

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

  if (!resident) return <div className="p-10">Loading...</div>;

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{template?.name || "Care File Audit"}</h1>
            <p className="text-sm text-muted-foreground">{resident.first_name || resident.firstName} {resident.last_name || resident.lastName}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2"></div>
        <div className="flex gap-2">
          <Button onClick={() => setIsActionPlanDialogOpen(true)} variant="outline" size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Add Action Plan
          </Button>
          <Button onClick={() => setIsAddItemDialogOpen(true)} size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
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
              <TableHead>Question</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const resp = itemResponses.get(item.id);
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Select value={resp?.status || ""} onValueChange={(val) => handleItemResponseChange(item.id, item.name, 'status', val)}>
                      <SelectTrigger className={`h-6 w-[140px] ${getItemStatusColor(resp?.status || "")}`}>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compliant">Compliant</SelectItem>
                        <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                        <SelectItem value="not-applicable">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="h-7 justify-start text-xs">
                          {resp?.date ? format(new Date(resp.date), "MMM dd") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={resp?.date ? new Date(resp.date) : undefined} onSelect={(date) => { if (date) handleItemResponseChange(item.id, item.name, 'date', date.toISOString()) }} />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Input value={resp?.notes || ""} onChange={(e) => handleItemResponseChange(item.id, item.name, 'notes', e.target.value)} className="h-8" />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="py-4"><Input placeholder="Item name" value={newItemForm.name} onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })} /></div>
          <DialogFooter><Button onClick={handleAddItem}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionPlanDialogOpen} onOpenChange={setIsActionPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Plan</DialogTitle>
            <DialogDescription>Assign a task to address a concern identified during the audit.</DialogDescription>
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
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={(date) => { if (date) { setDueDate(date); setDueDatePopoverOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddActionPlan}>Add Action Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Action Plan</DialogTitle>
            <DialogDescription>Are you sure you want to remove this action plan from the audit? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteActionPlan}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Plans Summary */}
      {actionPlans.length > 0 && (
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
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CareFileAuditEditorPage() {
  return <ErrorBoundary fallback={<AuditErrorFallback />}><CareFileAuditEditorPageContent /></ErrorBoundary>;
}
