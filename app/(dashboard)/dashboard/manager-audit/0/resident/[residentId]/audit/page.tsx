"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
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
import { ArrowLeft, Plus, X, CalendarIcon, Trash2, History } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { withRoleGuard } from "@/lib/route-guards";

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text";
}

interface Answer {
  questionId: string;
  value: string;
  notes?: string;
}

interface ActionPlan {
  id: string;
  text: string;
  assignedTo: string;
  assignedToEmail: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
}

interface ResidentCareFileAuditPageProps {
  params: Promise<{ residentId: string }>;
}

function ResidentCareFileAuditPage({ params }: ResidentCareFileAuditPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const residentId = resolvedParams.residentId;

  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [resident, setResident] = useState<any>(null);

  // State for form
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [comment, setComment] = useState("");
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString());
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  // UI State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"compliance" | "yesno" | "text">("compliance");
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

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load resident
      const { data: resData } = await supabase
        .from('residents')
        .select('*')
        .eq('id', residentId)
        .single();

      if (resData) {
        const mappedResident = {
          _id: resData.id,
          firstName: resData.first_name || resData.firstName,
          lastName: resData.last_name || resData.lastName,
          roomNumber: resData.room_number || resData.roomNumber,
          imageUrl: resData.image_url || resData.imageUrl,
          organizationId: resData.organization_id
        };
        setResident(mappedResident);

        // Load org members for action plan assignments
        if (resData.organization_id) {
          const { data: members } = await supabase
            .from('users')
            .select('id, email, name, image_url, role')
            .eq('active_organization_id', resData.organization_id);
          setOrgMembers(members || []);
        }
      }

      // Load saved questions from localStorage
      const savedQuestions = localStorage.getItem(`care-file-audit-questions-${residentId}`);
      if (savedQuestions) {
        setQuestions(JSON.parse(savedQuestions));
      }

      // Load saved answers from localStorage
      const savedAnswers = localStorage.getItem(`care-file-audit-answers-${residentId}`);
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }

      // Load saved comment from localStorage
      const savedComment = localStorage.getItem(`care-file-audit-comment-${residentId}`);
      if (savedComment) {
        setComment(JSON.parse(savedComment));
      }

      // Load saved date from localStorage
      const savedDate = localStorage.getItem(`care-file-audit-date-${residentId}`);
      if (savedDate) {
        setAuditDate(JSON.parse(savedDate));
      }

      // Load saved action plans from localStorage
      const savedActionPlans = localStorage.getItem(`care-file-audit-action-plans-${residentId}`);
      if (savedActionPlans) {
        setActionPlans(JSON.parse(savedActionPlans));
      }

    } catch (err) {
      console.error("Error loading audit:", err);
      toast.error("Failed to load audit");
    } finally {
      setIsLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = () => {
    router.push("/dashboard/manager-audit/0");
  };

  const handleViewHistory = () => {
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
  };

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
    localStorage.setItem(`care-file-audit-questions-${residentId}`, JSON.stringify(updatedQuestions));
    toast.success("Question added");

    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = async (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    setAnswers(answers.filter(a => a.questionId !== questionId));
    localStorage.setItem(`care-file-audit-questions-${residentId}`, JSON.stringify(updatedQuestions));
    toast.success("Question removed");
  };

  // Answer Handling
  const handleAnswerChange = (questionId: string, value: string) => {
    const existingAnswer = answers.find(a => a.questionId === questionId);
    let updatedAnswers;
    if (existingAnswer) {
      updatedAnswers = answers.map(a => a.questionId === questionId ? { ...a, value } : a);
    } else {
      updatedAnswers = [...answers, { questionId, value }];
    }
    setAnswers(updatedAnswers);
    localStorage.setItem(`care-file-audit-answers-${residentId}`, JSON.stringify(updatedAnswers));
  };

  const getAnswer = (questionId: string) => {
    return answers.find(a => a.questionId === questionId);
  };

  const handleCommentChange = (text: string) => {
    setComment(text);
    localStorage.setItem(`care-file-audit-comment-${residentId}`, JSON.stringify(text));
  };

  const handleDateChange = (date: string) => {
    setAuditDate(date);
    localStorage.setItem(`care-file-audit-date-${residentId}`, JSON.stringify(date));
  };

  // Action Plan Management
  const handleAddActionPlan = async () => {
    if (!actionPlanText || !assignedTo || !assignedToEmail || !priority || !dueDate) {
      toast.error("Please fill all action plan fields");
      return;
    }

    const newPlan: ActionPlan = {
      id: `plan-${Date.now()}`,
      text: actionPlanText,
      assignedTo: assignedTo,
      assignedToEmail: assignedToEmail,
      dueDate: dueDate,
      priority: priority,
      status: 'pending'
    };

    const updatedActionPlans = [...actionPlans, newPlan];
    setActionPlans(updatedActionPlans);
    localStorage.setItem(`care-file-audit-action-plans-${residentId}`, JSON.stringify(updatedActionPlans));

    setIsActionPlanDialogOpen(false);
    toast.success("Action plan added");
  };

  const confirmDeleteActionPlan = async () => {
    if (!actionPlanToDelete) return;

    const updatedActionPlans = actionPlans.filter(p => p.id !== actionPlanToDelete);
    setActionPlans(updatedActionPlans);
    localStorage.setItem(`care-file-audit-action-plans-${residentId}`, JSON.stringify(updatedActionPlans));

    setDeleteDialogOpen(false);
    setActionPlanToDelete(null);
    toast.success("Action plan removed");
  };

  // Completion
  const handleCompleteAudit = async () => {
    const auditCompletionData = {
      residentId: residentId,
      residentName: resident ? `${resident.firstName} ${resident.lastName}` : "Unknown",
      completedDate: new Date().toISOString(),
      auditor: profile?.name || profile?.email || "Unknown",
      answers: questions.map(q => {
        const answer = getAnswer(q.id);
        return {
          questionId: q.id,
          questionText: q.text,
          questionType: q.type,
          value: answer?.value || null
        };
      }),
      questions: questions,
      comment: comment,
      auditDate: auditDate,
      actionPlans: actionPlans.map(plan => ({
        ...plan,
        dueDate: plan.dueDate?.toISOString()
      })),
      status: 'completed'
    };

    // Save completed audit to localStorage history
    const historyKey = `care-file-audit-history-${residentId}`;
    const existingHistory = localStorage.getItem(historyKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];

    const newHistoryRecord = {
      id: `completion-${Date.now()}`,
      completedDate: auditCompletionData.completedDate,
      auditor: auditCompletionData.auditor,
      frequency: "monthly",
      status: 'completed',
      notes: `${actionPlans.length} action plan(s) created`,
      data: auditCompletionData
    };

    history.unshift(newHistoryRecord);
    localStorage.setItem(historyKey, JSON.stringify(history));

    // Clear current audit data
    localStorage.removeItem(`care-file-audit-questions-${residentId}`);
    localStorage.removeItem(`care-file-audit-answers-${residentId}`);
    localStorage.removeItem(`care-file-audit-comment-${residentId}`);
    localStorage.removeItem(`care-file-audit-date-${residentId}`);
    localStorage.removeItem(`care-file-audit-action-plans-${residentId}`);

    toast.success(`Audit completed! ${actionPlans.length} action plan(s) attached.`);
    router.push('/dashboard/manager-audit/0');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading audit...</p>
      </div>
    );
  }

  const getAnswerColor = (value?: string) => {
    if (!value) return "text-muted-foreground";
    if (value === "yes" || value === "compliant") return "text-green-600 font-medium";
    if (value === "no" || value === "non-compliant") return "text-red-600 font-medium";
    if (value === "not-applicable") return "text-gray-500 font-medium";
    return "";
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center space-x-3">
            {resident && (
              <>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={resident.imageUrl} />
                  <AvatarFallback className="text-sm">
                    {resident.firstName[0]}{resident.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {resident.firstName} {resident.lastName}
                  </h2>
                  <p className="text-muted-foreground">
                    Care File Audit {resident.roomNumber && `• Room ${resident.roomNumber}`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleViewHistory}>
            <History className="mr-2 h-4 w-4" /> View History
          </Button>
          <Button variant="outline" onClick={() => setIsQuestionDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
          <Button onClick={handleCompleteAudit}>Complete Audit</Button>
        </div>
      </div>

      {/* Audit Form */}
      <div className="rounded-md border flex-1 overflow-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-[200px] font-semibold">Question</TableHead>
              <TableHead className="w-[150px] font-semibold">Answer</TableHead>
              <TableHead className="w-[70px] text-center font-semibold">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-sm">No questions added yet.</p>
                    <p className="text-xs">Click "Add Question" to begin the audit.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q) => {
                const answer = getAnswer(q.id);
                return (
                  <TableRow key={q.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">{q.text}</TableCell>
                    <TableCell className="px-2 py-3">
                      {q.type === 'text' ? (
                        <Input
                          value={answer?.value || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Enter text..."
                          className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                        />
                      ) : (
                        <Select
                          value={answer?.value}
                          onValueChange={(val) => handleAnswerChange(q.id, val)}
                        >
                          <SelectTrigger className={`w-full border-none shadow-none text-sm h-8 ${getAnswerColor(answer?.value)}`}>
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {q.type === 'yesno' ? (
                              <>
                                <SelectItem value="yes" className="text-green-600 font-medium">✓ Yes</SelectItem>
                                <SelectItem value="no" className="text-red-600 font-medium">✗ No</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="compliant" className="text-green-600 font-medium">✓ Compliant</SelectItem>
                                <SelectItem value="non-compliant" className="text-red-600 font-medium">✗ Non-Compliant</SelectItem>
                                <SelectItem value="not-applicable" className="text-gray-500 font-medium">— N/A</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Comment and Date Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Overall Comment</Label>
          <Input
            value={comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Add overall audit comment..."
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Audit Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {auditDate ? format(new Date(auditDate), "dd/MM/yy") : format(new Date(), "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={auditDate ? new Date(auditDate) : new Date()}
                onSelect={(date) => {
                  if (date) {
                    handleDateChange(date.toISOString());
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Action Plans Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Action Plans</Label>
          <Button variant="outline" size="sm" onClick={() => setIsActionPlanDialogOpen(true)}>
            <Plus className="mr-2 h-3 w-3" /> Add Action Plan
          </Button>
        </div>
        {actionPlans.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Action Required</TableHead>
                  <TableHead className="font-semibold">Assigned To</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.text}</TableCell>
                    <TableCell>{plan.assignedTo}</TableCell>
                    <TableCell>{plan.dueDate ? format(plan.dueDate, "dd/MM/yyyy") : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={plan.priority === 'High' ? 'destructive' : 'outline'}>
                        {plan.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setActionPlanToDelete(plan.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialogs */}
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
                  <SelectItem value="text">Text</SelectItem>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Action Plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Action</Label>
              <Input value={actionPlanText} onChange={(e) => setActionPlanText(e.target.value)} placeholder="What needs to be done?" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Assign To</Label>
              <Select value={assignedToEmail} onValueChange={(val) => {
                setAssignedToEmail(val);
                const member = orgMembers.find(m => m.email === val);
                if (member) setAssignedTo(member.name || member.email);
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {orgMembers.map(member => (
                    <SelectItem key={member.email} value={member.email}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.image_url || ""} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {(member.name?.[0] || member.email[0]).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Due Date</Label>
                <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      <span className="text-sm">{dueDate ? format(dueDate, "dd/MM/yy") : "Pick date"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(date) => { if (date) { setDueDate(date); setDueDatePopoverOpen(false); } }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsActionPlanDialogOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={handleAddActionPlan} className="h-9">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Action Plan</DialogTitle>
            <DialogDescription>Are you sure you want to remove this action plan? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteActionPlan}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRoleGuard(ResidentCareFileAuditPage, ["manager", "admin", "owner"]);
