"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
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
import { ArrowLeft, Plus, X, CalendarIcon, ArrowUpDown, SlidersHorizontal, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { auditService, AuditTemplate, AuditCompletion } from "@/lib/audit-service";
import { supabase } from "@/lib/supabase";

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno";
}

interface Answer {
  residentId: string;
  questionId: string;
  value: string;
  notes?: string;
  date?: string;
}

interface Comment {
  residentId: string;
  text: string;
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

export default function ResidentAuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  const { profile } = useProfile();
  const { activeTeamId, activeOrganizationId, activeCareHomeId } = useActiveTeam();
  const [auditName, setAuditName] = useState("");

  // Data State
  const [template, setTemplate] = useState<AuditTemplate | null>(null);
  const [response, setResponse] = useState<AuditCompletion | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbResidents, setDbResidents] = useState<any[]>([]);

  // Is this ID a template or a response?
  const [isTemplateId, setIsTemplateId] = useState(false);

  // Ref to prevent duplicate draft creation
  const isCreatingDraft = React.useRef(false);
  const hasLoadedDraft = React.useRef(false);

  // 1. Initial Load: Determine ID type and fetch data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Try fetching as template first
      const possibleTemplate = await auditService.getResidentTemplateById(auditId);

      if (possibleTemplate) {
        console.log("Found template:", possibleTemplate);
        setTemplate(possibleTemplate);
        setIsTemplateId(true);
        setAuditName(possibleTemplate.name);
        setQuestions(possibleTemplate.questions || []);
      } else {
        // Try fetching as response
        const possibleResponse = await auditService.getResidentResponseById(auditId);
        if (possibleResponse) {
          console.log("Found response:", possibleResponse);
          setResponse(possibleResponse);
          setResponseId(possibleResponse.id);
          setIsTemplateId(false);

          // Also need to fetch the template details (name, questions)
          if (possibleResponse.template_id) {
            const tmpl = await auditService.getResidentTemplateById(possibleResponse.template_id);
            if (tmpl) {
              setTemplate(tmpl);
              setAuditName(tmpl.name);
              setQuestions(tmpl.questions || []);
            } else {
              // Fallback if template deleted but audit exists
              setAuditName(possibleResponse.template_name || "Unknown Audit");
            }
          }

          // Load answers from response
          loadResponseData(possibleResponse);
        } else {
          // Fallback: LocalStorage (legacy/new unsaved)
          const savedAudits = localStorage.getItem('careo-audits');
          if (savedAudits) {
            const audits = JSON.parse(savedAudits);
            const currentAudit = audits.find((audit: any) => audit.id === auditId);
            if (currentAudit) {
              setAuditName(currentAudit.name);
              // Load questions from LS
              const savedQuestions = localStorage.getItem(`audit-questions-${auditId}`);
              if (savedQuestions) setQuestions(JSON.parse(savedQuestions));
            }
          }
        }
      }

      // Load residents
      if (activeTeamId) {
        const { data: resData } = await supabase.from('residents').select('*').eq('team_id', activeTeamId);
        if (resData) {
          const mapped = resData.map((r: any) => ({
            _id: r.id,
            firstName: r.first_name || r.firstName,
            lastName: r.last_name || r.lastName,
            roomNumber: r.room_number || r.roomNumber,
            imageUrl: r.image_url || r.imageUrl
          }));
          setDbResidents(mapped);
        }
      }

      // Load org members
      if (activeOrganizationId) {
        const members = await auditService.getOrganizationMembers(activeOrganizationId);
        setOrgMembers(members || []);
      }

    } catch (err) {
      console.error("Error loading audit:", err);
      toast.error("Failed to load audit");
    } finally {
      setIsLoading(false);
    }
  }, [auditId, activeTeamId, activeOrganizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // Helper to parse response data
  const loadResponseData = (auditResponse: AuditCompletion) => {
    if (auditResponse.responses) {
      const loadedAnswers: Answer[] = [];
      const loadedComments: Comment[] = [];
      const loadedDates: { [residentId: string]: string } = {};

      auditResponse.responses.forEach((res: any) => {
        res.answers?.forEach((ans: any) => {
          if (ans.value !== undefined) {
            loadedAnswers.push({
              residentId: res.residentId,
              questionId: ans.questionId,
              value: ans.value,
              notes: ans.notes
            });
          }
        });

        if (res.comment) {
          loadedComments.push({ residentId: res.residentId, text: res.comment });
        }
        if (res.date) {
          loadedDates[res.residentId] = res.date;
        }
      });

      setAnswers(loadedAnswers);
      setComments(loadedComments);
      setResidentDates(loadedDates);
    }

    // Load action plans
    if (auditResponse.id) {
      auditService.getResidentActionPlans(auditResponse.id).then(plans => {
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
            latestComment: p.latest_comment,
            residentId: p.resident_id,
            residentName: p.resident_name
          }));
          setActionPlans(mappedPlans);
        }
      });
    }
  };

  // 2. Draft Management (Only if it's a template ID)
  useEffect(() => {
    if (isLoading || !isTemplateId || !template || !activeTeamId || responseId || hasLoadedDraft.current) return;

    const checkDrafts = async () => {
      try {
        // Check for existing drafts
        const drafts = await auditService.getDraftResidentResponses(template.id, activeTeamId);

        if (drafts && drafts.length > 0) {
          const recentDraft = drafts[0];
          console.log("Loaded existing draft:", recentDraft.id);
          setResponseId(recentDraft.id);
          setResponse(recentDraft);
          loadResponseData(recentDraft);
          hasLoadedDraft.current = true;
        } else if (!isCreatingDraft.current) {
          // Create new draft
          console.log("Creating new draft...");
          isCreatingDraft.current = true;
          const newDraft = await auditService.createResidentResponse({
            template_id: template.id,
            template_name: template.name,
            category: 'resident',
            team_id: activeTeamId,
            organization_id: activeOrganizationId!,
            audited_by: profile?.name || profile?.email || "Unknown",
            frequency: template.frequency,
            status: 'draft'
          });
          setResponseId(newDraft.id);
          setResponse(newDraft);
          isCreatingDraft.current = false;
          hasLoadedDraft.current = true;
        }
      } catch (e) {
        console.error("Draft error:", e);
        isCreatingDraft.current = false;
      }
    };

    checkDrafts();
  }, [isLoading, isTemplateId, template, activeTeamId, responseId, activeOrganizationId, profile]);


  // State for form
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [residentDates, setResidentDates] = useState<{ [residentId: string]: string }>({});
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  // State for action plan creation
  const [selectedResidentForActionPlan, setSelectedResidentForActionPlan] = useState<any>(null);

  // UI State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"compliance" | "yesno">("compliance");
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
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);

  const handleOpenActionPlanDialog = (resident: any) => {
    setSelectedResidentForActionPlan(resident);
    setActionPlanText("");
    setAssignedTo("");
    setAssignedToEmail("");
    setDueDate(undefined);
    setPriority("");
    setIsActionPlanDialogOpen(true);
  };

  const handleAddActionPlan = async () => {
    if (!actionPlanText || !assignedTo || !assignedToEmail || !priority || !dueDate) {
      toast.error("Please fill all action plan fields");
      return;
    }

    try {
      let savedPlan;
      if (responseId) {
        savedPlan = await auditService.createResidentActionPlan({
          audit_response_id: responseId,
          template_id: template?.id,
          description: actionPlanText,
          assigned_to: assignedTo, // Pass the UUID here
          assigned_to_name: assignedTo, // This might need to be the name if you want to store it, but let's see how createResidentActionPlan uses it
          priority: priority,
          due_date: dueDate.toISOString(),
          team_id: activeTeamId,
          organization_id: activeOrganizationId,
          careHomeId: activeCareHomeId,
          created_by: profile?.email,
          created_by_name: profile?.name || profile?.email,
          creatorId: profile?.id,
          resident_id: selectedResidentForActionPlan?._id,
          resident_name: selectedResidentForActionPlan ? `${selectedResidentForActionPlan.firstName} ${selectedResidentForActionPlan.lastName}` : undefined,
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
        residentId: selectedResidentForActionPlan?._id,
        residentName: selectedResidentForActionPlan ? `${selectedResidentForActionPlan.firstName} ${selectedResidentForActionPlan.lastName}` : undefined
      };

      setActionPlans([...actionPlans, newPlan]);
      setIsActionPlanDialogOpen(false);
      setSelectedResidentForActionPlan(null);
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
    if (plan && plan.id && !plan.id.startsWith('temp')) {
      try {
        await auditService.deleteResidentActionPlan(plan.id);
      } catch (e) {
        console.error("Error deleting persistent action plan:", e);
      }
    }

    setActionPlans(actionPlans.filter(p => p.id !== actionPlanToDelete));
    setDeleteDialogOpen(false);
    setActionPlanToDelete(null);
    toast.success("Action plan removed");
  };
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    residentName: 250,
    room: 100,
    date: 150,
    comment: 300,
  });

  // Question Management
  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;

    const newQuestion: Question = {
      id: `q${Date.now()}`,
      text: newQuestionText,
      type: newQuestionType,
    };

    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);

    if (template) {
      await auditService.updateResidentTemplate(template.id, { questions: updatedQuestions });
      toast.success("Question added");
    } else {
      // Fallback LS
      localStorage.setItem(`audit-questions-${auditId}`, JSON.stringify(updatedQuestions));
    }

    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = async (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    setAnswers(answers.filter(a => a.questionId !== questionId));

    if (template) {
      await auditService.updateResidentTemplate(template.id, { questions: updatedQuestions });
      toast.success("Question removed");
    } else {
      localStorage.setItem(`audit-questions-${auditId}`, JSON.stringify(updatedQuestions));
    }
  };

  // Answer Handling
  const handleAnswerChange = (residentId: string, questionId: string, value: string) => {
    const existingAnswer = answers.find(a => a.residentId === residentId && a.questionId === questionId);
    if (existingAnswer) {
      setAnswers(answers.map(a => a.residentId === residentId && a.questionId === questionId ? { ...a, value } : a));
    } else {
      setAnswers([...answers, { residentId, questionId, value }]);
    }
  };

  const getAnswer = (residentId: string, questionId: string) => {
    return answers.find(a => a.residentId === residentId && a.questionId === questionId);
  };

  const handleCommentChange = (residentId: string, text: string) => {
    const existing = comments.find(c => c.residentId === residentId);
    if (existing) {
      setComments(comments.map(c => c.residentId === residentId ? { ...c, text } : c));
    } else {
      setComments([...comments, { residentId, text }]);
    }
  };

  const getComment = (residentId: string) => comments.find(c => c.residentId === residentId)?.text || "";

  const handleResidentDateChange = (residentId: string, date: string) => {
    setResidentDates(prev => ({ ...prev, [residentId]: date }));
  };

  // Completion
  const handleCompleteAudit = async () => {
    if (!activeTeamId || !dbResidents) {
      toast.error("Missing data");
      return;
    }

    try {
      const responses = dbResidents.map((resident) => ({
        residentId: resident._id,
        residentName: `${resident.firstName} ${resident.lastName}`,
        roomNumber: resident.roomNumber,
        answers: questions.map((q) => {
          const answer = answers.find(a => a.residentId === resident._id && a.questionId === q.id);
          return {
            questionId: q.id,
            value: answer?.value,
            notes: answer?.notes,
          };
        }),
        date: residentDates[resident._id],
        comment: comments.find((c) => c.residentId === resident._id)?.text,
      }));

      // If we have a responseId (draft), complete it
      if (responseId) {
        await auditService.completeResidentResponse(responseId, { responses: responses as any });

        // Save action plans
        for (const plan of actionPlans.filter(p => !p.id || p.id.startsWith('temp'))) {
          await auditService.createResidentActionPlan({
            audit_response_id: responseId,
            template_id: template?.id,
            description: plan.text,
            assigned_to: plan.assignedToEmail,
            assigned_to_name: plan.assignedTo,
            priority: plan.priority,
            due_date: plan.dueDate?.toISOString(),
            team_id: activeTeamId,
            organization_id: activeOrganizationId,
            careHomeId: activeCareHomeId,
            created_by: profile?.email,
            created_by_name: profile?.name || profile?.email,
            creatorId: profile?.id,
            resident_id: plan.residentId,
            resident_name: plan.residentName,
            status: 'pending'
          });
        }

        toast.success("Audit completed!");
        router.push('/dashboard/careo-audit'); // Or reset form
      } else {
        toast.error("No active draft found to complete");
      }
    } catch (e) {
      console.error("Complete error:", e);
      toast.error("Failed to complete");
    }
  };

  // Auto Save
  const lastSavedData = React.useRef<string>("");
  const isSaving = React.useRef(false);

  useEffect(() => {
    if (!responseId || !dbResidents.length) return;
    if (answers.length === 0 && comments.length === 0) return;

    const timer = setTimeout(async () => {
      if (isSaving.current) return;

      const responses = dbResidents.map((resident) => ({
        residentId: resident._id,
        residentName: `${resident.firstName} ${resident.lastName}`,
        roomNumber: resident.roomNumber,
        answers: questions.map((q) => {
          const answer = answers.find(a => a.residentId === resident._id && a.questionId === q.id);
          return {
            questionId: q.id,
            value: answer?.value,
            notes: answer?.notes,
          };
        }),
        date: residentDates[resident._id],
        comment: comments.find((c) => c.residentId === resident._id)?.text,
      }));

      const hash = JSON.stringify(responses);
      if (hash === lastSavedData.current) return;

      isSaving.current = true;
      try {
        await auditService.updateResidentResponse(responseId, {
          responses: responses as any,
          status: 'in-progress'
        });
        lastSavedData.current = hash;
        console.log("Auto-saved");
      } catch (e) { console.error(e) }
      finally { isSaving.current = false; }

    }, 5000);

    return () => clearTimeout(timer);
  }, [answers, comments, residentDates, questions, responseId, dbResidents]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">{auditName}</h2>
          {responseId && <Badge variant="outline">Draft Saved</Badge>}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsQuestionDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
          <Button onClick={handleCompleteAudit}>Complete Audit</Button>
        </div>
      </div>

      {/* Questions Table */}
      <div className="rounded-md border flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: columnWidths.residentName }}>Resident</TableHead>
              <TableHead style={{ width: columnWidths.room }}>Room</TableHead>
              {questions.map(q => (
                <TableHead key={q.id} className="text-center min-w-[120px]">
                  <div className="flex items-center justify-center space-x-1">
                    <span>{q.text}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestion(q.id)}><X className="h-3 w-3" /></Button>
                  </div>
                </TableHead>
              ))}
              <TableHead style={{ width: columnWidths.comment }}>Comment</TableHead>
              <TableHead style={{ width: columnWidths.date }}>Date</TableHead>
              <TableHead className="text-center w-[100px]">Action Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dbResidents.map(resident => (
              <TableRow key={resident._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={resident.imageUrl} />
                      <AvatarFallback>{resident.firstName[0]}</AvatarFallback>
                    </Avatar>
                    <span>{resident.firstName} {resident.lastName}</span>
                  </div>
                </TableCell>
                <TableCell>{resident.roomNumber}</TableCell>
                {questions.map(q => {
                  const answer = getAnswer(resident._id, q.id);
                  return (
                    <TableCell key={q.id} className="text-center p-2">
                      <Select
                        value={
                          answer?.value && answer.value.trim() !== ""
                            ? answer.value
                            : undefined
                        }
                        onValueChange={(val) => handleAnswerChange(resident._id, q.id, val)}
                      >
                        <SelectTrigger className="mx-auto w-[110px]">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {q.type === 'yesno' ? (
                            <>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="compliant">Compliant</SelectItem>
                              <SelectItem value="action-required">Action required</SelectItem>
                              <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                              <SelectItem value="not-applicable">N/A</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Input
                    value={getComment(resident._id)}
                    onChange={(e) => handleCommentChange(resident._id, e.target.value)}
                    placeholder="Add comment..."
                  />
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[130px] justify-start text-left font-normal h-8">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {residentDates[resident._id] ? format(new Date(residentDates[resident._id]), "PPP") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={residentDates[resident._id] ? new Date(residentDates[resident._id]) : undefined}
                        onSelect={(date) => date && handleResidentDateChange(resident._id, date.toISOString())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenActionPlanDialog(resident)}>
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Question</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Question</Label>
              <Input value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <Select value={newQuestionType} onValueChange={(val: any) => setNewQuestionType(val)}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance">Compliance (C/NC/NA)</SelectItem>
                  <SelectItem value="yesno">Yes/No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddQuestion}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionPlanDialogOpen} onOpenChange={setIsActionPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Plan {selectedResidentForActionPlan && `for ${selectedResidentForActionPlan.firstName}`}</DialogTitle>
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
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-bold">Audit Action Plans</h3>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
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
                    <TableCell className="font-medium text-primary">{plan.residentName || 'General'}</TableCell>
                    <TableCell>{plan.text}</TableCell>
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
                    <TableCell className="max-w-[200px] truncate">
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
