"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Plus, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { ErrorBoundary, AuditErrorFallback } from "@/components/error-boundary";
import { auditService, AuditTemplate } from "@/lib/audit-service";
import { supabase } from "@/lib/supabase";
import {
  CareFileAuditWorkspace,
  type CareFileAuditItem,
  type CareFileItemResponse,
  type CareFileActionPlanRow,
} from "@/components/careo-audit/care-file-audit-workspace";
import {
  normalizeCareFileItemStatus,
  nextCareFileItemStatus,
  persistCareFileItemStatus,
  coerceCareFileCompletionItem,
} from "@/lib/care-file-audit";

interface ActionPlan {
  id: string;
  auditId: string;
  text: string;
  assignedTo: string;
  assignedToName: string;
  assignedToEmail: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  latestComment?: string;
  residentId?: string;
  residentName?: string;
  /** Checklist item this plan was created for (persists to DB). */
  sourceItemId?: string;
}

function mapLoadedCareFilePlan(p: Record<string, unknown>): ActionPlan {
  const sourceRaw = p.source_item_id;
  return {
    id: String(p.id),
    auditId: String(p.audit_response_id),
    text: String(p.description ?? ""),
    assignedTo: String(p.assigned_to ?? ""),
    assignedToName: String(p.assigned_to_name ?? p.assigned_to ?? ""),
    assignedToEmail: String(p.assigned_to_email ?? ""),
    dueDate: p.due_date ? new Date(String(p.due_date)) : undefined,
    priority: String(p.priority ?? ""),
    status: p.status ? String(p.status) : undefined,
    latestComment: p.latest_comment ? String(p.latest_comment) : undefined,
    residentId: p.resident_id ? String(p.resident_id) : undefined,
    residentName: p.resident_name ? String(p.resident_name) : undefined,
    sourceItemId:
      typeof sourceRaw === "string" && sourceRaw.trim() !== ""
        ? sourceRaw.trim()
        : undefined,
  };
}

function toAuditItems(raw: unknown[]): CareFileAuditItem[] {
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    const id = String(o.id ?? "");
    const name = String(o.name ?? "");
    const t = o.type;
    const type: CareFileAuditItem["type"] =
      t === "checkbox" || t === "notes" ? t : "compliance";
    return {
      id,
      name,
      type,
      sectionId: typeof o.sectionId === "string" ? o.sectionId : undefined,
      sectionTitle:
        typeof o.sectionTitle === "string" ? o.sectionTitle : undefined,
      subsectionId:
        typeof o.subsectionId === "string" ? o.subsectionId : undefined,
      subsectionTitle:
        typeof o.subsectionTitle === "string" ? o.subsectionTitle : undefined,
      sourceLabel:
        typeof o.sourceLabel === "string" ? o.sourceLabel : undefined,
      sourceHref: typeof o.sourceHref === "string" ? o.sourceHref : undefined,
    };
  });
}

function CareFileAuditEditorPageContent() {
  const params = useParams();
  const router = useRouter();
  const residentId = params.residentId as string;
  const auditId = params.auditId as string;
  const { activeTeamId, activeOrganizationId, activeCareHomeId } =
    useActiveTeam();
  const { profile } = useProfile();

  const [resident, setResident] = useState<
    Record<string, unknown> | null | undefined
  >(undefined);
  const [template, setTemplate] = useState<AuditTemplate | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] = useState<string>("draft");
  const [auditedAtLabel, setAuditedAtLabel] = useState<string>("");
  const [lastEditedHint, setLastEditedHint] = useState<string>("");
  const [saveDraftPending, setSaveDraftPending] = useState(false);

  const [items, setItems] = useState<CareFileAuditItem[]>([]);
  const [itemResponses, setItemResponses] = useState<
    Map<string, CareFileItemResponse>
  >(new Map());
  const [overallNotes, setOverallNotes] = useState("");
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    type: "compliance" as CareFileAuditItem["type"],
  });
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState("");
  const [orgMembers, setOrgMembers] = useState<
    { id: string; email: string; name?: string; image_url?: string | null }[]
  >([]);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<string | null>(
    null
  );
  const [actionPlanSourceItemId, setActionPlanSourceItemId] = useState<
    string | undefined
  >(undefined);

  const isCreatingDraft = useRef(false);
  const hasLoadedDraft = useRef(false);
  const lastSavedData = useRef("");
  const isSaving = useRef(false);
  const actionPlanSourceItemIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      hasLoadedDraft.current = false;
      isCreatingDraft.current = false;
      lastSavedData.current = "";
      setActionPlans([]);

      if (residentId) {
        const { data, error } = await supabase
          .from("residents")
          .select("*")
          .eq("id", residentId)
          .single();
        if (data) setResident(data as Record<string, unknown>);
        else if (error) setResident(null);
      }

      const tmpl = await auditService.getCareFileTemplateById(auditId);
      if (tmpl) {
        setResponseId(null);
        setTemplate(tmpl);
        if (tmpl.items?.length) setItems(toAuditItems(tmpl.items as unknown[]));
        setAuditedAtLabel(format(new Date(), "dd MMM yyyy"));
        setCompletionStatus("draft");
        setItemResponses(new Map());
        setOverallNotes("");
      } else {
        const resp = await auditService.getCareFileResponseById(auditId);
        if (resp) {
          setResponseId(resp.id);
          setCompletionStatus(resp.status ?? "draft");
          const stamp = resp.audited_at || resp.updated_at || resp.created_at;
          if (stamp) setAuditedAtLabel(format(new Date(stamp), "dd MMM yyyy"));

          if (resp.template_id) {
            const t = await auditService.getCareFileTemplateById(
              resp.template_id
            );
            if (t) {
              setTemplate(t);
              if (t.items?.length)
                setItems(toAuditItems(t.items as unknown[]));
            }
          } else {
            if (resp.items) {
              setItems(
                resp.items.map((i: CareFileItemResponse & { itemName?: string }) => ({
                  id: i.itemId,
                  name: i.itemName ?? "",
                  type: "compliance",
                }))
              );
            }
            setTemplate({
              name: resp.template_name || "Audit",
              id: "unknown",
            } as AuditTemplate);
          }

          if (resp.items) {
            const map = new Map<string, CareFileItemResponse>();
            resp.items.forEach((row: unknown) => {
              const item = coerceCareFileCompletionItem(row);
              if (item) map.set(item.itemId, item as CareFileItemResponse);
            });
            setItemResponses(map);
          }
          if (resp.overall_notes) setOverallNotes(resp.overall_notes);

          const plans = await auditService.getCareFileActionPlans(resp.id);
          if (plans && plans.length > 0) {
            setActionPlans(
              plans.map((p: Record<string, unknown>) =>
                mapLoadedCareFilePlan(p)
              )
            );
          } else {
            setActionPlans([]);
          }
        }
      }
    };
    load();
  }, [residentId, auditId]);

  // Same pattern as sidebar "Care File Audit" (manager-audit/0/resident/.../audit):
  // load members only when org + care home context exist; primary query uses organization_id on users.
  useEffect(() => {
    if (!activeOrganizationId || !activeCareHomeId) {
      setOrgMembers([]);
      return;
    }

    let cancelled = false;

    type AssignableMember = {
      id: string;
      email: string;
      name?: string;
      image_url?: string | null;
      role?: string;
    };

    const normalize = (rows: unknown): AssignableMember[] =>
      (Array.isArray(rows) ? rows : []) as AssignableMember[];

    void (async () => {
      const { data: byOrgColumn, error: orgColumnError } = await supabase
        .from("users")
        .select("id, email, name, image_url")
        .eq("organization_id", activeOrganizationId);

      if (cancelled) return;

      if (!orgColumnError && byOrgColumn && byOrgColumn.length > 0) {
        setOrgMembers(normalize(byOrgColumn));
        return;
      }

      const { data: byActiveOrg, error: activeOrgError } = await supabase
        .from("users")
        .select("id, email, name, image_url, role")
        .eq("active_organization_id", activeOrganizationId);

      if (cancelled) return;

      if (!activeOrgError && byActiveOrg && byActiveOrg.length > 0) {
        setOrgMembers(normalize(byActiveOrg));
        return;
      }

      const { data: rlsScoped, error: rlsError } = await supabase
        .from("users")
        .select("id, email, name, image_url, role");

      if (cancelled) return;

      if (rlsError) {
        console.warn("[care-file-audit] assignable members:", rlsError);
        setOrgMembers([]);
        return;
      }

      setOrgMembers(normalize(rlsScoped));
    })();

    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, activeCareHomeId]);

  useEffect(() => {
    if (!template || responseId || hasLoadedDraft.current || !residentId)
      return;

    const checkDraft = async () => {
      const drafts = await auditService.getDraftCareFileResponses(
        template.id,
        residentId
      );
      if (drafts && drafts.length > 0) {
        const draft = drafts[0];
        setResponseId(draft.id);
        setCompletionStatus(draft.status ?? "draft");
        const stamp =
          draft.audited_at || draft.updated_at || draft.created_at;
        if (stamp) setAuditedAtLabel(format(new Date(stamp), "dd MMM yyyy"));
        if (draft.items) {
          const map = new Map<string, CareFileItemResponse>();
          draft.items.forEach((row: unknown) => {
            const item = coerceCareFileCompletionItem(row);
            if (item) map.set(item.itemId, item as CareFileItemResponse);
          });
          setItemResponses(map);
        }
        if (draft.overall_notes) setOverallNotes(draft.overall_notes);

        const plans = await auditService.getCareFileActionPlans(draft.id);
        if (plans && plans.length > 0) {
          setActionPlans(
            plans.map((p: Record<string, unknown>) => mapLoadedCareFilePlan(p))
          );
        } else {
          setActionPlans([]);
        }
        hasLoadedDraft.current = true;
      } else if (
        !isCreatingDraft.current &&
        activeOrganizationId &&
        activeTeamId
      ) {
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
            items: template.items
              ? template.items.map((i: { id: string; name: string }) => ({
                  itemId: i.id,
                  itemName: i.name,
                  status: "",
                }))
              : [],
            status: "draft",
          });
          setResponseId(newDraft.id);
          setCompletionStatus(newDraft.status ?? "draft");
          setAuditedAtLabel(format(new Date(), "dd MMM yyyy"));
          setActionPlans([]);
          if (newDraft.items?.length) {
            const map = new Map<string, CareFileItemResponse>();
            newDraft.items.forEach((row: unknown) => {
              const item = coerceCareFileCompletionItem(row);
              if (item) map.set(item.itemId, item as CareFileItemResponse);
            });
            setItemResponses(map);
          }
          hasLoadedDraft.current = true;
        } catch (e) {
          console.error(e);
        } finally {
          isCreatingDraft.current = false;
        }
      }
    };

    checkDraft();
  }, [template, responseId, residentId, activeOrganizationId, activeTeamId, profile]);

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
          status: "in-progress",
        });
        lastSavedData.current = hash;
        setLastEditedHint(
          `Last auto-saved · ${format(new Date(), "dd MMM yyyy, HH:mm")}`
        );
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        isSaving.current = false;
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [itemResponses, overallNotes, responseId]);

  const handleAddItem = async () => {
    if (!newItemForm.name || !template) return;
    const newItem: CareFileAuditItem = {
      id: `item_${Date.now()}`,
      name: newItemForm.name,
      type: newItemForm.type,
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);

    try {
      await auditService.updateCareFileTemplate(template.id, {
        items: updatedItems as unknown as AuditTemplate["items"],
      });
      toast.success("Item added");
      setIsAddItemDialogOpen(false);
      setNewItemForm({ name: "", type: "compliance" });
    } catch {
      toast.error("Failed to add item to template");
    }
  };

  const handleItemResponseChange = (
    itemId: string,
    itemName: string,
    field: string,
    value: unknown
  ) => {
    setItemResponses((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(itemId) || { itemId, itemName };
      let nextValue: unknown = value;
      if (field === "status" && typeof value === "string") {
        nextValue = persistCareFileItemStatus(
          normalizeCareFileItemStatus(value)
        );
      }
      newMap.set(itemId, {
        ...existing,
        [field]: nextValue,
      } as CareFileItemResponse);
      return newMap;
    });
  };

  const handleCycleItemStatus = (itemId: string, itemName: string) => {
    const cur = normalizeCareFileItemStatus(
      itemResponses.get(itemId)?.status
    );
    const next = nextCareFileItemStatus(cur);
    handleItemResponseChange(
      itemId,
      itemName,
      "status",
      persistCareFileItemStatus(next)
    );
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!template) return;
    const updatedItems = items.filter((i) => i.id !== itemId);
    setItems(updatedItems);
    try {
      await auditService.updateCareFileTemplate(template.id, {
        items: updatedItems as unknown as AuditTemplate["items"],
      });
      const newMap = new Map(itemResponses);
      newMap.delete(itemId);
      setItemResponses(newMap);
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleSaveDraft = async () => {
    if (!responseId) {
      toast.error("No draft to save yet");
      return;
    }
    setSaveDraftPending(true);
    try {
      const itemsArr = Array.from(itemResponses.values());
      await auditService.updateCareFileResponse(responseId, {
        items: itemsArr,
        overall_notes: overallNotes,
        status: "draft",
      });
      lastSavedData.current = JSON.stringify({ items: itemsArr, overallNotes });
      setCompletionStatus("draft");
      setLastEditedHint(
        `Last saved · ${format(new Date(), "dd MMM yyyy, HH:mm")}`
      );
      toast.success("Draft saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save draft");
    } finally {
      setSaveDraftPending(false);
    }
  };

  const handleAddActionPlan = async () => {
    const sourceItemId =
      (actionPlanSourceItemIdRef.current ?? actionPlanSourceItemId)?.trim() ||
      undefined;

    if (
      !actionPlanText ||
      !assignedTo ||
      !priority ||
      !dueDate
    ) {
      toast.error("Please fill all action plan fields");
      return;
    }

    try {
      let savedPlan: { id: string } | undefined;
      if (responseId) {
        savedPlan = await auditService.createCareFileActionPlan({
          audit_response_id: responseId,
          resident_id: residentId,
          resident_name: resident
            ? `${resident.first_name ?? resident.firstName ?? ""} ${resident.last_name ?? resident.lastName ?? ""}`.trim()
            : "Unknown",
          description: actionPlanText,
          assigned_to: assignedTo,
          assigned_to_name:
            orgMembers.find((m) => m.id === assignedTo)?.name ||
            assignedToEmail,
          priority,
          due_date: dueDate.toISOString(),
          organization_id: activeOrganizationId,
          careHomeId: activeCareHomeId,
          created_by: profile?.email,
          created_by_name: profile?.name || profile?.email,
          creatorId: profile?.id,
          status: "pending",
          ...(sourceItemId
            ? { source_item_id: sourceItemId }
            : {}),
        });
      }

      const newPlan: ActionPlan = {
        id: savedPlan?.id || `temp-${Date.now()}`,
        auditId: responseId || "new",
        text: actionPlanText,
        assignedTo,
        assignedToName:
          orgMembers.find((m) => m.id === assignedTo)?.name || assignedToEmail,
        assignedToEmail,
        dueDate,
        priority,
        status: "pending",
        residentId: residentId,
        residentName: resident
          ? `${resident.first_name ?? resident.firstName ?? ""} ${resident.last_name ?? resident.lastName ?? ""}`.trim()
          : "Unknown",
        sourceItemId,
      };

      setActionPlans((current) => [...current, newPlan]);
      setIsActionPlanDialogOpen(false);
      setActionPlanText("");
      setActionPlanSourceItemId(undefined);
      actionPlanSourceItemIdRef.current = undefined;
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

    const plan = actionPlans.find((p) => p.id === actionPlanToDelete);
    if (plan && plan.id && !plan.id.startsWith("temp-")) {
      try {
        await auditService.deleteCareFileActionPlan(plan.id);
      } catch (e) {
        console.error("Error deleting persistent action plan:", e);
      }
    }

    setActionPlans(actionPlans.filter((p) => p.id !== actionPlanToDelete));
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
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      for (const plan of actionPlans.filter(
        (p) => !p.id || p.id.startsWith("temp-")
      )) {
        await auditService.createCareFileActionPlan({
          audit_response_id: responseId,
          description: plan.text,
          assigned_to: plan.assignedTo,
          assigned_to_name: plan.assignedToName,
          priority: plan.priority,
          due_date: plan.dueDate?.toISOString(),
          organization_id: activeOrganizationId,
          careHomeId: activeCareHomeId,
          resident_id: residentId,
          resident_name: resident
            ? `${resident.first_name ?? resident.firstName ?? ""} ${resident.last_name ?? resident.lastName ?? ""}`.trim()
            : "Unknown",
          created_by: profile?.email,
          created_by_name: profile?.name || profile?.email,
          creatorId: profile?.id,
          status: "pending",
          ...(plan.sourceItemId
            ? { source_item_id: plan.sourceItemId }
            : {}),
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sidebar-counts-refresh"));
      }

      toast.success("Audit completed!");
      router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to complete audit");
    }
  };

  const openActionPlanDialog = (opts?: {
    prefill?: string;
    sourceItemId?: string;
  }) => {
    setActionPlanText(opts?.prefill ? `Follow up: ${opts.prefill}` : "");
    const sourceItemId = opts?.sourceItemId?.trim() || undefined;
    setActionPlanSourceItemId(sourceItemId);
    actionPlanSourceItemIdRef.current = sourceItemId;
    setAssignedTo("");
    setAssignedToEmail("");
    setDueDate(undefined);
    setPriority("");
    setIsActionPlanDialogOpen(true);
  };

  const actionPlanRows: CareFileActionPlanRow[] = actionPlans.map((p) => ({
    id: p.id,
    text: p.text,
    assignedToName: p.assignedToName || p.assignedTo,
    dueDate: p.dueDate,
    priority: p.priority,
    status: p.status,
    sourceItemId: p.sourceItemId,
  }));

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center p-10 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10">
        <p className="text-muted-foreground">Resident not found</p>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)
          }
        >
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="hidden items-center gap-3 border-b border-border px-4 py-3 lg:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)
          }
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {template?.name ?? "Care file audit"}
          </p>
          <p className="text-xs text-muted-foreground">
            Editor · {String(resident.first_name ?? resident.firstName ?? "")}{" "}
            {String(resident.last_name ?? resident.lastName ?? "")}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openActionPlanDialog()}
          >
            <Plus className="mr-1 size-4" />
            Add action plan
          </Button>
        </div>
      </div>

      <CareFileAuditWorkspace
        residentId={residentId}
        resident={resident}
        templateName={template?.name ?? "Care file audit"}
        templateFrequency={template?.frequency}
        templateId={
          template && typeof template.id === "string" && template.id !== "unknown"
            ? template.id
            : null
        }
        items={items}
        itemResponses={itemResponses}
        onItemResponseChange={handleItemResponseChange}
        onCycleItemStatus={handleCycleItemStatus}
        onRemoveItem={handleRemoveItem}
        responseId={responseId}
        completionStatus={completionStatus}
        auditedAtLabel={auditedAtLabel}
        auditorLabel={profile?.name || profile?.email || undefined}
        actionPlans={actionPlanRows}
        onOpenAddItem={() => setIsAddItemDialogOpen(true)}
        onOpenActionPlan={openActionPlanDialog}
        onRemoveActionPlan={handleRemoveActionPlan}
        onSaveDraft={handleSaveDraft}
        onSubmitAudit={handleCompleteAudit}
        saveDraftPending={saveDraftPending}
        lastEditedHint={lastEditedHint}
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-6 pt-2 sm:px-5">
        <Label htmlFor="care-audit-overall-notes" className="text-xs text-muted-foreground">
          Overall notes (optional)
        </Label>
        <Textarea
          id="care-audit-overall-notes"
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="Add overall notes for this audit…"
          className="mt-1.5 min-h-[72px] text-sm"
        />
      </div>

      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Item name"
              value={newItemForm.name}
              onChange={(e) =>
                setNewItemForm({ ...newItemForm, name: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAddItem}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isActionPlanDialogOpen}
        onOpenChange={(open) => {
          setIsActionPlanDialogOpen(open);
          if (!open) {
            setActionPlanText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add action plan</DialogTitle>
            <DialogDescription>
              Assign a task to address a concern identified during the audit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Action</Label>
              <Textarea
                value={actionPlanText}
                onChange={(e) => setActionPlanText(e.target.value)}
                placeholder="What needs to be done?"
                className="min-h-[84px] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Assign to</Label>
              <Select
                value={assignedToEmail || assignedTo}
                onValueChange={(val) => {
                  const member = orgMembers.find(
                    (m) => m.email === val || m.id === val
                  );
                  if (member) {
                    setAssignedTo(member.id);
                    setAssignedToEmail(member.email || "");
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {orgMembers.map((member) => {
                    const optionValue = member.email || member.id;
                    return (
                      <SelectItem key={member.id} value={optionValue}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.image_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                              {(
                                member.name?.[0] ||
                                member.email?.[0] ||
                                "?"
                              ).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {member.name || member.email || member.id}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Due date</Label>
              <Popover
                open={dueDatePopoverOpen}
                onOpenChange={setDueDatePopoverOpen}
                modal
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {dueDate ? (
                      format(dueDate, "dd/MM/yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      if (date) {
                        setDueDate(date);
                        setDueDatePopoverOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionPlanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddActionPlan}>Add action plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove action plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this action plan from the audit?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteActionPlan}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CareFileAuditEditorPage() {
  return (
    <ErrorBoundary fallback={<AuditErrorFallback />}>
      <CareFileAuditEditorPageContent />
    </ErrorBoundary>
  );
}
