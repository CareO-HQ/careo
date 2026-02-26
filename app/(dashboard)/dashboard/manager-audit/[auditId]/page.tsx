"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Plus, X, CalendarIcon, Trash2, ArrowUpRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { withRoleGuard } from "@/lib/route-guards";

const auditNames: Record<string, string> = {
  "0": "Care File Audit",
  "1": "Accidents and Incidents Analysis",
  "2": "Agency Profiles and Induction Records",
  "3": "Bedrails Audit",
  "4": "Domestic Services",
  "5": "CARE Documentation (10% to be checked)",
  "6": "Catering Audit",
  "7": "Competency Assessment Review",
  "8": "Complaints Analysis",
  "9": "Decontamination",
  "10": "Dining Experience",
  "11": "DOLS",
  "12": "Domestic Audit",
  "13": "Falls Analysis",
  "14": "Hand Hygiene Audit",
  "15": "Hoist and Sling Register",
  "16": "IPC Short Audit",
  "17": "Mandatory Training Stats",
  "18": "Medication Audit",
  "19": "Modified Diet Audit",
  "20": "NMC NISSC Logs",
  "21": "Restrictive Practice",
  "22": "RTW Tracker",
  "23": "Safeguarding Database",
  "24": "Safety Alerts",
  "25": "Smoking Compliance",
  "26": "Supervision and Appraisal Matrix",
  "27": "Weights Analysis",
  "28": "Wounds Analysis",
  "29": "GDPR",
  "30": "Personnel Files",
  "31": "Resident Agreement",
};

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text";
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
  assignedTo: string;
  assignedToEmail: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  latestComment?: string;
  residentId?: string;
  residentName?: string;
}

interface AuditDetailPageProps {
  params: Promise<{ auditId: string }>;
}

function AuditDetailPage({ params }: AuditDetailPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const auditId = resolvedParams.auditId;
  const auditName = auditNames[auditId] || "Unknown Audit";

  const { profile } = useProfile();
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const [isLoading, setIsLoading] = useState(true);

  const [allResidents, setAllResidents] = useState<any[]>([]); // All available residents
  const [selectedResidents, setSelectedResidents] = useState<any[]>([]); // Residents in the audit
  const [residentAuditData, setResidentAuditData] = useState<{ [residentId: string]: { frequency: string; lastAudited: string; nextAudit: string; auditor: string } }>({});

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
  const [isAddResidentDialogOpen, setIsAddResidentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load ALL residents from the entire organization (all units/teams)
      if (activeOrganizationId) {
        const { data: resData } = await supabase.from('residents').select('*').eq('organization_id', activeOrganizationId);
        if (resData) {
          const mapped = resData.map((r: any) => ({
            _id: r.id,
            firstName: r.first_name || r.firstName,
            lastName: r.last_name || r.lastName,
            roomNumber: r.room_number || r.roomNumber,
            imageUrl: r.image_url || r.imageUrl
          }));
          setAllResidents(mapped);
        }
      }

      // Load org members for action plan assignments
      if (activeOrganizationId) {
        const { data: members } = await supabase
          .from('users')
          .select('id, email, name, image_url, role')
          .eq('active_organization_id', activeOrganizationId);
        setOrgMembers(members || []);
      }

      // Load saved selected residents from localStorage
      const savedSelectedResidents = localStorage.getItem(`manager-audit-selected-residents-${auditId}`);
      if (savedSelectedResidents) {
        setSelectedResidents(JSON.parse(savedSelectedResidents));
      }

      // Load saved questions from localStorage (can be moved to DB later)
      const savedQuestions = localStorage.getItem(`manager-audit-questions-${auditId}`);
      if (savedQuestions) {
        setQuestions(JSON.parse(savedQuestions));
      }

      // Load saved answers from localStorage
      const savedAnswers = localStorage.getItem(`manager-audit-answers-${auditId}`);
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }

      // Load saved comments from localStorage
      const savedComments = localStorage.getItem(`manager-audit-comments-${auditId}`);
      if (savedComments) {
        setComments(JSON.parse(savedComments));
      }

      // Load saved dates from localStorage
      const savedDates = localStorage.getItem(`manager-audit-dates-${auditId}`);
      if (savedDates) {
        setResidentDates(JSON.parse(savedDates));
      }

      // Load saved action plans from localStorage
      const savedActionPlans = localStorage.getItem(`manager-audit-action-plans-${auditId}`);
      if (savedActionPlans) {
        setActionPlans(JSON.parse(savedActionPlans));
      }

      // Load saved resident audit data for Care File Audit (ID 0)
      if (auditId === "0") {
        const savedResidentAuditData = localStorage.getItem(`manager-audit-resident-data-${auditId}`);
        if (savedResidentAuditData) {
          setResidentAuditData(JSON.parse(savedResidentAuditData));
        }
      }

    } catch (err) {
      console.error("Error loading audit:", err);
      toast.error("Failed to load audit");
    } finally {
      setIsLoading(false);
    }
  }, [auditId, activeOrganizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add resident to audit
  const handleAddResident = (residentId: string) => {
    // Check if resident already added
    if (selectedResidents.some((r) => r._id === residentId)) {
      toast.error("This resident has already been added to the audit");
      return;
    }

    const resident = allResidents.find((r) => r._id === residentId);
    if (resident) {
      const updatedResidents = [...selectedResidents, resident];
      setSelectedResidents(updatedResidents);
      localStorage.setItem(`manager-audit-selected-residents-${auditId}`, JSON.stringify(updatedResidents));
      toast.success(`${resident.firstName} ${resident.lastName} added to audit`);
      setIsAddResidentDialogOpen(false);
      setSearchQuery("");
    }
  };

  // Remove resident from audit
  const handleRemoveResident = (residentId: string) => {
    const resident = selectedResidents.find((r) => r._id === residentId);
    const updatedResidents = selectedResidents.filter((r) => r._id !== residentId);
    setSelectedResidents(updatedResidents);

    // Also remove their answers, comments, and dates
    setAnswers(answers.filter((a) => a.residentId !== residentId));
    setComments(comments.filter((c) => c.residentId !== residentId));
    const { [residentId]: removed, ...remainingDates } = residentDates;
    setResidentDates(remainingDates);

    // Remove action plans for this resident
    setActionPlans(actionPlans.filter((p) => p.residentId !== residentId));

    localStorage.setItem(`manager-audit-selected-residents-${auditId}`, JSON.stringify(updatedResidents));
    localStorage.setItem(`manager-audit-answers-${auditId}`, JSON.stringify(answers.filter((a) => a.residentId !== residentId)));
    localStorage.setItem(`manager-audit-comments-${auditId}`, JSON.stringify(comments.filter((c) => c.residentId !== residentId)));
    localStorage.setItem(`manager-audit-dates-${auditId}`, JSON.stringify(remainingDates));

    toast.success(`${resident?.firstName} ${resident?.lastName} removed from audit`);
  };

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

    const newPlan: ActionPlan = {
      id: `plan-${Date.now()}`,
      auditId: auditId,
      text: actionPlanText,
      assignedTo: assignedTo,
      assignedToEmail: assignedToEmail,
      dueDate: dueDate,
      priority: priority,
      status: 'pending',
      residentId: selectedResidentForActionPlan?._id,
      residentName: selectedResidentForActionPlan ? `${selectedResidentForActionPlan.firstName} ${selectedResidentForActionPlan.lastName}` : undefined
    };

    const updatedActionPlans = [...actionPlans, newPlan];
    setActionPlans(updatedActionPlans);

    // Persist to localStorage
    localStorage.setItem(`manager-audit-action-plans-${auditId}`, JSON.stringify(updatedActionPlans));

    setIsActionPlanDialogOpen(false);
    setSelectedResidentForActionPlan(null);
    toast.success("Action plan added to audit");
  };

  const handleRemoveActionPlan = (planId: string) => {
    setActionPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteActionPlan = async () => {
    if (!actionPlanToDelete) return;

    const updatedActionPlans = actionPlans.filter(p => p.id !== actionPlanToDelete);
    setActionPlans(updatedActionPlans);

    // Update localStorage
    localStorage.setItem(`manager-audit-action-plans-${auditId}`, JSON.stringify(updatedActionPlans));

    setDeleteDialogOpen(false);
    setActionPlanToDelete(null);
    toast.success("Action plan removed");
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
    localStorage.setItem(`manager-audit-questions-${auditId}`, JSON.stringify(updatedQuestions));
    toast.success("Question added");

    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = async (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    setAnswers(answers.filter(a => a.questionId !== questionId));
    localStorage.setItem(`manager-audit-questions-${auditId}`, JSON.stringify(updatedQuestions));
    toast.success("Question removed");
  };

  // Answer Handling
  const handleAnswerChange = (residentId: string, questionId: string, value: string) => {
    const existingAnswer = answers.find(a => a.residentId === residentId && a.questionId === questionId);
    let updatedAnswers;
    if (existingAnswer) {
      updatedAnswers = answers.map(a => a.residentId === residentId && a.questionId === questionId ? { ...a, value } : a);
    } else {
      updatedAnswers = [...answers, { residentId, questionId, value }];
    }
    setAnswers(updatedAnswers);
    localStorage.setItem(`manager-audit-answers-${auditId}`, JSON.stringify(updatedAnswers));
  };

  const getAnswer = (residentId: string, questionId: string) => {
    return answers.find(a => a.residentId === residentId && a.questionId === questionId);
  };

  const handleCommentChange = (residentId: string, text: string) => {
    const existing = comments.find(c => c.residentId === residentId);
    let updatedComments;
    if (existing) {
      updatedComments = comments.map(c => c.residentId === residentId ? { ...c, text } : c);
    } else {
      updatedComments = [...comments, { residentId, text }];
    }
    setComments(updatedComments);
    localStorage.setItem(`manager-audit-comments-${auditId}`, JSON.stringify(updatedComments));
  };

  const getComment = (residentId: string) => comments.find(c => c.residentId === residentId)?.text || "";

  const handleResidentDateChange = (residentId: string, dateValue: string) => {
    const updatedDates = { ...residentDates, [residentId]: dateValue };
    setResidentDates(updatedDates);
    localStorage.setItem(`manager-audit-dates-${auditId}`, JSON.stringify(updatedDates));
  };

  // Completion
  const handleCompleteAudit = async () => {
    if (selectedResidents.length === 0) {
      toast.error("Please add at least one resident to the audit");
      return;
    }

    // Prepare audit completion data
    const auditCompletionData = {
      auditId: auditId,
      auditName: auditName,
      completedDate: new Date().toISOString(),
      auditor: profile?.name || profile?.email || "Unknown",
      residents: selectedResidents.map(resident => ({
        id: resident._id,
        firstName: resident.firstName,
        lastName: resident.lastName,
        roomNumber: resident.roomNumber,
        answers: questions.map(q => {
          const answer = getAnswer(resident._id, q.id);
          return {
            questionId: q.id,
            questionText: q.text,
            questionType: q.type,
            value: answer?.value || null
          };
        }),
        comment: getComment(resident._id),
        date: residentDates[resident._id] || new Date().toISOString()
      })),
      questions: questions,
      actionPlans: actionPlans.map(plan => ({
        ...plan,
        dueDate: plan.dueDate?.toISOString()
      })),
      status: 'completed'
    };

    // Save completed audit to localStorage history
    const historyKey = `manager-audit-history-${auditId}`;
    const existingHistory = localStorage.getItem(historyKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];

    // Add new completion to history
    const newHistoryRecord = {
      id: `completion-${Date.now()}`,
      completedDate: auditCompletionData.completedDate,
      auditor: auditCompletionData.auditor,
      residentsAudited: selectedResidents.length,
      status: 'completed',
      notes: `${actionPlans.length} action plan(s) created`,
      data: auditCompletionData
    };

    history.unshift(newHistoryRecord);
    localStorage.setItem(historyKey, JSON.stringify(history));

    // Clear current audit data but keep action plans in history
    localStorage.removeItem(`manager-audit-selected-residents-${auditId}`);
    localStorage.removeItem(`manager-audit-questions-${auditId}`);
    localStorage.removeItem(`manager-audit-answers-${auditId}`);
    localStorage.removeItem(`manager-audit-comments-${auditId}`);
    localStorage.removeItem(`manager-audit-dates-${auditId}`);
    localStorage.removeItem(`manager-audit-action-plans-${auditId}`);

    toast.success(`Audit completed! ${actionPlans.length} action plan(s) attached.`);
    router.push('/dashboard/manager-audit');
  };

  const handleBack = () => {
    router.push("/dashboard/manager-audit");
  };

  // Update resident audit data for Care File Audit
  const updateResidentAuditData = (residentId: string, field: string, value: string) => {
    const updatedData = {
      ...residentAuditData,
      [residentId]: {
        ...(residentAuditData[residentId] || { frequency: "monthly", lastAudited: "-", nextAudit: "-", auditor: "-" }),
        [field]: value
      }
    };
    setResidentAuditData(updatedData);
    localStorage.setItem(`manager-audit-resident-data-${auditId}`, JSON.stringify(updatedData));
  };

  // Navigate to resident care file audit
  const handleViewResidentCareFileAudit = (residentId: string) => {
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/audit`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading audit...</p>
      </div>
    );
  }

  // Care File Audit (ID: 0) - Special Layout
  if (auditId === "0") {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">{auditName}</h2>
            <Badge variant="outline">{allResidents.length} Residents</Badge>
          </div>
        </div>

        {/* Residents Table for Care File Audit */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Resident</TableHead>
                <TableHead className="w-[100px]">Room</TableHead>
                <TableHead className="w-[150px]">Frequency</TableHead>
                <TableHead className="w-[150px]">Last Audited</TableHead>
                <TableHead className="w-[150px]">Next Audit</TableHead>
                <TableHead className="w-[200px]">Auditor</TableHead>
                <TableHead className="text-center w-[80px]">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allResidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No residents found.
                  </TableCell>
                </TableRow>
              ) : (
                allResidents.map((resident) => {
                  const auditData = residentAuditData[resident._id] || {
                    frequency: "monthly",
                    lastAudited: "-",
                    nextAudit: "-",
                    auditor: "-"
                  };
                  return (
                    <TableRow
                      key={resident._id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewResidentCareFileAudit(resident._id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={resident.imageUrl} />
                            <AvatarFallback>{resident.firstName[0]}</AvatarFallback>
                          </Avatar>
                          <span>{resident.firstName} {resident.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{resident.roomNumber || "-"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={auditData.frequency}
                          onValueChange={(val) => updateResidentAuditData(resident._id, "frequency", val)}
                        >
                          <SelectTrigger className={`w-[120px] border-none shadow-none font-medium ${
                            auditData.frequency === "monthly" ? "text-blue-600" :
                            auditData.frequency === "quarterly" ? "text-green-600" :
                            auditData.frequency === "6month" ? "text-orange-600" :
                            "text-purple-600"
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly" className="text-blue-600 font-medium">Monthly</SelectItem>
                            <SelectItem value="quarterly" className="text-green-600 font-medium">Quarterly</SelectItem>
                            <SelectItem value="6month" className="text-orange-600 font-medium">6 Month</SelectItem>
                            <SelectItem value="yearly" className="text-purple-600 font-medium">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="date"
                          value={auditData.lastAudited !== "-" ? auditData.lastAudited : ""}
                          onChange={(e) => updateResidentAuditData(resident._id, "lastAudited", e.target.value)}
                          className="border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="date"
                          value={auditData.nextAudit !== "-" ? auditData.nextAudit : ""}
                          onChange={(e) => updateResidentAuditData(resident._id, "nextAudit", e.target.value)}
                          className="border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={auditData.auditor}
                          onChange={(e) => updateResidentAuditData(resident._id, "auditor", e.target.value)}
                          placeholder="Enter auditor..."
                          className="border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewResidentCareFileAudit(resident._id)}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Standard Audit Layout (for all other audits)
  return (
    <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">{auditName}</h2>
          <Badge variant="outline">{selectedResidents.length} Residents</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsAddResidentDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Resident
          </Button>
          <Button variant="outline" onClick={() => setIsQuestionDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
          <Button onClick={handleCompleteAudit}>Complete Audit</Button>
        </div>
      </div>

      {/* Questions Table */}
      <div className="rounded-md border flex-1 overflow-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px] font-semibold">Resident</TableHead>
              <TableHead className="w-[80px] text-center font-semibold">Room</TableHead>
              {questions.map(q => (
                <TableHead key={q.id} className="min-w-[140px] font-semibold">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs leading-tight">{q.text}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive ml-2 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[250px] font-semibold">Comment</TableHead>
              <TableHead className="w-[110px] text-center font-semibold">Date</TableHead>
              <TableHead className="w-[80px] text-center font-semibold">Action</TableHead>
              <TableHead className="w-[70px] text-center font-semibold">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedResidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={questions.length + 6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-sm">No residents added yet.</p>
                    <p className="text-xs">Click "Add Resident" to begin the audit.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              selectedResidents.map(resident => (
              <TableRow key={resident._id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={resident.imageUrl} />
                      <AvatarFallback className="text-xs">{resident.firstName[0]}{resident.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{resident.firstName} {resident.lastName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">{resident.roomNumber || "-"}</TableCell>
                {questions.map(q => {
                  const answer = getAnswer(resident._id, q.id);

                  // Determine color based on answer value
                  const getAnswerColor = (value?: string) => {
                    if (!value) return "text-muted-foreground";
                    if (value === "yes" || value === "compliant") return "text-green-600 font-medium";
                    if (value === "no" || value === "non-compliant") return "text-red-600 font-medium";
                    if (value === "not-applicable") return "text-gray-500 font-medium";
                    return "";
                  };

                  return (
                    <TableCell key={q.id} className="px-2 py-3">
                      {q.type === 'text' ? (
                        <Input
                          value={answer?.value || ""}
                          onChange={(e) => handleAnswerChange(resident._id, q.id, e.target.value)}
                          placeholder="Enter text..."
                          className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                        />
                      ) : (
                        <Select
                          value={answer?.value}
                          onValueChange={(val) => handleAnswerChange(resident._id, q.id, val)}
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
                  );
                })}
                <TableCell className="px-3">
                  <Input
                    value={getComment(resident._id)}
                    onChange={(e) => handleCommentChange(resident._id, e.target.value)}
                    placeholder="Add comment..."
                    className="border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                  />
                </TableCell>
                <TableCell className="text-center px-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full h-8 justify-center text-sm font-normal border-none shadow-none p-0 hover:bg-accent"
                      >
                        {residentDates[resident._id] ? format(new Date(residentDates[resident._id]), "dd/MM/yy") : format(new Date(), "dd/MM/yy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        selected={residentDates[resident._id] ? new Date(residentDates[resident._id]) : new Date()}
                        onSelect={(date) => {
                          if (date) {
                            handleResidentDateChange(resident._id, date.toISOString());
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="text-center px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenActionPlanDialog(resident)}
                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className="text-center px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveResident(resident._id)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddResidentDialogOpen} onOpenChange={setIsAddResidentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Resident to Audit</DialogTitle>
            <DialogDescription>
              Select a resident from the list below to add to this audit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Filter by name or room number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {(() => {
                const addedResidentIds = new Set(selectedResidents.map((r) => r._id));
                const filteredAvailableResidents = allResidents
                  .filter((r) => !addedResidentIds.has(r._id))
                  .filter((r) =>
                    searchQuery
                      ? `${r.firstName} ${r.lastName} ${r.roomNumber || ""}`
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      : true
                  );

                return (
                  <>
                    {!searchQuery && filteredAvailableResidents.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Showing {filteredAvailableResidents.length} available resident{filteredAvailableResidents.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {searchQuery && filteredAvailableResidents.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Found {filteredAvailableResidents.length} resident{filteredAvailableResidents.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {filteredAvailableResidents.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          {searchQuery
                            ? "No residents found matching your search"
                            : "All residents have been added"}
                        </p>
                      ) : (
                        filteredAvailableResidents.map((resident) => (
                          <div
                            key={resident._id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                            onClick={() => handleAddResident(resident._id)}
                          >
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={resident.imageUrl} />
                                <AvatarFallback>{resident.firstName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {resident.firstName} {resident.lastName}
                                </p>
                                {resident.roomNumber && (
                                  <p className="text-sm text-muted-foreground">
                                    Room {resident.roomNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <DialogTitle className="text-base">Add Action Plan {selectedResidentForActionPlan && `for ${selectedResidentForActionPlan.firstName}`}</DialogTitle>
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium text-primary">{plan.residentName || 'General'}</TableCell>
                    <TableCell>{plan.text}</TableCell>
                    <TableCell>{plan.assignedTo}</TableCell>
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

export default withRoleGuard(AuditDetailPage, ["manager", "admin", "owner"]);
