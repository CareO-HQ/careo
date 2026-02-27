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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, X, CalendarIcon, Trash2, ArrowUpRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  isSection?: boolean; // For grid audit sections
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
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  // State for grid-based audit (ID: 1)
  const [rowQuestions, setRowQuestions] = useState<Question[]>([]);
  const [columnQuestions, setColumnQuestions] = useState<Question[]>([]);
  const [fixedColumnData, setFixedColumnData] = useState<{
    [rowId: string]: {
      comment?: string;
      actionRequired?: string;
      actionCompleted?: string;
    };
  }>({});

  // State for action plan creation
  const [selectedResidentForActionPlan, setSelectedResidentForActionPlan] = useState<any>(null);

  // UI State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [questionDialogMode, setQuestionDialogMode] = useState<"row" | "column" | "standard">("standard");
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
      let allResidentsData: any[] = [];
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
          allResidentsData = mapped;
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

      // FLEXIBLE AUDIT SYSTEM:
      // 1. First time or after completion: Load ALL residents (manager can remove unwanted ones)
      // 2. Work in progress: Keep exactly what manager has selected/removed
      // 3. Questions persist forever (each care home customizes their own)
      const savedSelectedResidents = localStorage.getItem(`manager-audit-selected-residents-${auditId}`);
      if (savedSelectedResidents) {
        // Restore work-in-progress state (residents manager is currently auditing)
        setSelectedResidents(JSON.parse(savedSelectedResidents));
      } else {

        // Special handling for Grid-based audits (ID: 1, 2, 9, 18)
        if (auditId === "1" || auditId === "2" || auditId === "9" || auditId === "18") {
          // Start with empty array - manager adds numbered entries manually
          setSelectedResidents([]);
          localStorage.setItem(`manager-audit-selected-residents-${auditId}`, JSON.stringify([]));
        } else {
          // First time or fresh start: Load ALL residents, manager removes unwanted ones
          setSelectedResidents(allResidentsData);
          localStorage.setItem(`manager-audit-selected-residents-${auditId}`, JSON.stringify(allResidentsData));
        }
      }

      // Questions are permanent for this audit type (each care home customizes)
      const savedQuestions = localStorage.getItem(`manager-audit-questions-${auditId}`);
      if (savedQuestions) {
        setQuestions(JSON.parse(savedQuestions));
      }

      // Load work-in-progress answers
      const savedAnswers = localStorage.getItem(`manager-audit-answers-${auditId}`);
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }

      // Load work-in-progress comments
      const savedComments = localStorage.getItem(`manager-audit-comments-${auditId}`);
      if (savedComments) {
        setComments(JSON.parse(savedComments));
      }

      // Load saved action plans from localStorage
      const savedActionPlans = localStorage.getItem(`manager-audit-action-plans-${auditId}`);
      if (savedActionPlans) {
        setActionPlans(JSON.parse(savedActionPlans));
      }

      // Load grid questions for Grid-based Audits (ID 1, 2, 9, 18)
      if (auditId === "1" || auditId === "2" || auditId === "9" || auditId === "18") {
        const savedRowQuestions = localStorage.getItem(`manager-audit-row-questions-${auditId}`);
        if (savedRowQuestions) {
          setRowQuestions(JSON.parse(savedRowQuestions));
        }
        const savedColumnQuestions = localStorage.getItem(`manager-audit-column-questions-${auditId}`);
        if (savedColumnQuestions) {
          setColumnQuestions(JSON.parse(savedColumnQuestions));
        }
        const savedFixedColumnData = localStorage.getItem(`manager-audit-fixed-columns-${auditId}`);
        if (savedFixedColumnData) {
          setFixedColumnData(JSON.parse(savedFixedColumnData));
        }
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

    // Also remove their answers and comments
    setAnswers(answers.filter((a) => a.residentId !== residentId));
    setComments(comments.filter((c) => c.residentId !== residentId));

    // Remove action plans for this resident
    setActionPlans(actionPlans.filter((p) => p.residentId !== residentId));

    localStorage.setItem(`manager-audit-selected-residents-${auditId}`, JSON.stringify(updatedResidents));
    localStorage.setItem(`manager-audit-answers-${auditId}`, JSON.stringify(answers.filter((a) => a.residentId !== residentId)));
    localStorage.setItem(`manager-audit-comments-${auditId}`, JSON.stringify(comments.filter((c) => c.residentId !== residentId)));

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

  // Completion
  const handleCompleteAudit = async () => {
    if (selectedResidents.length === 0) {
      const itemType = (auditId === "1" || auditId === "2" || auditId === "9" || auditId === "18") ? "entry" : "resident";
      toast.error(`Please add at least one ${itemType} to the audit`);
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
        comment: getComment(resident._id)
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

    // RESET FOR NEXT AUDIT CYCLE:
    // ✓ KEEP: Questions (each care home has custom questions)
    // ✗ CLEAR: Residents (will load all residents again next time)
    // ✗ CLEAR: Answers, Comments, Action Plans (fresh start for next audit)
    localStorage.removeItem(`manager-audit-selected-residents-${auditId}`);
    // Questions INTENTIONALLY NOT removed - they persist forever for this audit type
    localStorage.removeItem(`manager-audit-answers-${auditId}`);
    localStorage.removeItem(`manager-audit-comments-${auditId}`);
    localStorage.removeItem(`manager-audit-action-plans-${auditId}`);
    localStorage.removeItem(`manager-audit-fixed-columns-${auditId}`);

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

  // Grid-based Audits (ID: 1, 2, 9, 18) - Grid-based with row and column questions
  if (auditId === "1" || auditId === "2" || auditId === "9" || auditId === "18") {
    const handleAddRowQuestion = () => {
      if (!newQuestionText.trim()) {
        toast.error("Please enter a question");
        return;
      }
      const newQuestion: Question = {
        id: `row-q${Date.now()}`,
        text: newQuestionText,
        type: "text",
      };
      const updatedRowQuestions = [...rowQuestions, newQuestion];
      setRowQuestions(updatedRowQuestions);
      localStorage.setItem(`manager-audit-row-questions-${auditId}`, JSON.stringify(updatedRowQuestions));
      toast.success("Row added");
      setNewQuestionText("");
      setIsQuestionDialogOpen(false);
    };

    const handleAddColumnQuestion = () => {
      if (!newQuestionText.trim()) {
        toast.error("Please enter a question");
        return;
      }
      const newQuestion: Question = {
        id: `col-q${Date.now()}`,
        text: newQuestionText,
        type: newQuestionType,
      };
      const updatedColumnQuestions = [...columnQuestions, newQuestion];
      setColumnQuestions(updatedColumnQuestions);
      localStorage.setItem(`manager-audit-column-questions-${auditId}`, JSON.stringify(updatedColumnQuestions));
      toast.success("Column added");
      setNewQuestionText("");
      setNewQuestionType("compliance");
      setIsQuestionDialogOpen(false);
    };

    const openAddRowDialog = () => {
      setQuestionDialogMode("row");
      setNewQuestionText("");
      setIsQuestionDialogOpen(true);
    };

    const openAddColumnDialog = () => {
      setQuestionDialogMode("column");
      setNewQuestionText("");
      setNewQuestionType("compliance");
      setIsQuestionDialogOpen(true);
    };

    const handleAddSection = () => {
      const sectionText = prompt("Enter section title:");
      if (!sectionText?.trim()) return;

      const newSection: Question = {
        id: `section-${Date.now()}`,
        text: sectionText,
        type: "text",
        isSection: true
      };
      const updatedRowQuestions = [...rowQuestions, newSection];
      setRowQuestions(updatedRowQuestions);
      localStorage.setItem(`manager-audit-row-questions-${auditId}`, JSON.stringify(updatedRowQuestions));
      toast.success("Section added");
    };

    const handleUpdateSectionText = (sectionId: string, text: string) => {
      const updatedRowQuestions = rowQuestions.map(q =>
        q.id === sectionId ? { ...q, text } : q
      );
      setRowQuestions(updatedRowQuestions);
      localStorage.setItem(`manager-audit-row-questions-${auditId}`, JSON.stringify(updatedRowQuestions));
    };

    const handleRemoveRowQuestion = (questionId: string) => {
      const updatedRowQuestions = rowQuestions.filter(q => q.id !== questionId);
      setRowQuestions(updatedRowQuestions);
      setAnswers(answers.filter(a => a.residentId !== questionId));
      localStorage.setItem(`manager-audit-row-questions-${auditId}`, JSON.stringify(updatedRowQuestions));
      toast.success("Row question removed");
    };

    const handleRemoveColumnQuestion = (questionId: string) => {
      const updatedColumnQuestions = columnQuestions.filter(q => q.id !== questionId);
      setColumnQuestions(updatedColumnQuestions);
      setAnswers(answers.filter(a => a.questionId !== questionId));
      localStorage.setItem(`manager-audit-column-questions-${auditId}`, JSON.stringify(updatedColumnQuestions));
      toast.success("Column question removed");
    };

    const handleGridAnswerChange = (rowQuestionId: string, columnQuestionId: string, value: string) => {
      const existingAnswer = answers.find(a => a.residentId === rowQuestionId && a.questionId === columnQuestionId);
      let updatedAnswers;
      if (existingAnswer) {
        updatedAnswers = answers.map(a =>
          a.residentId === rowQuestionId && a.questionId === columnQuestionId ? { ...a, value } : a
        );
      } else {
        updatedAnswers = [...answers, { residentId: rowQuestionId, questionId: columnQuestionId, value }];
      }
      setAnswers(updatedAnswers);
      localStorage.setItem(`manager-audit-answers-${auditId}`, JSON.stringify(updatedAnswers));
    };

    const getGridAnswer = (rowQuestionId: string, columnQuestionId: string) => {
      return answers.find(a => a.residentId === rowQuestionId && a.questionId === columnQuestionId);
    };

    const handleFixedColumnChange = (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted', value: string) => {
      const updatedData = {
        ...fixedColumnData,
        [rowId]: {
          ...fixedColumnData[rowId],
          [field]: value
        }
      };
      setFixedColumnData(updatedData);
      localStorage.setItem(`manager-audit-fixed-columns-${auditId}`, JSON.stringify(updatedData));
    };

    const getFixedColumnValue = (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted') => {
      return fixedColumnData[rowId]?.[field] || '';
    };

    return (
      <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">{auditName}</h2>
          </div>
          <Button onClick={handleCompleteAudit}>Complete Audit</Button>
        </div>

        {/* Grid Table */}
        <div className="rounded-md border flex-1 overflow-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[250px] font-semibold sticky left-0 bg-muted/50 z-10">Questions</TableHead>
                {columnQuestions.map(q => (
                  <TableHead key={q.id} className="min-w-[140px] max-w-[180px] font-semibold">
                    <div className="flex items-center justify-between px-2 gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs leading-tight truncate flex-1 cursor-help">
                            {q.text.length > 20 ? `${q.text.substring(0, 20)}...` : q.text}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{q.text}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveColumnQuestion(q.id)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="min-w-[200px] font-semibold bg-blue-50">Comment</TableHead>
                <TableHead className="min-w-[200px] font-semibold bg-green-50">Action Required</TableHead>
                <TableHead className="min-w-[200px] font-semibold bg-orange-50">Action Completed</TableHead>
                <TableHead className="w-[60px] bg-muted/50 sticky right-0 z-10">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openAddColumnDialog}
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">Add Column</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>

              {rowQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnQuestions.length + 5} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-sm">No questions added yet.</p>
                      <p className="text-xs">Click the buttons below to add rows and columns</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {rowQuestions.map((rowQ) => {
                // Section Row - spans full width
                if (rowQ.isSection) {
                  return (
                    <TableRow key={rowQ.id} className="bg-slate-100 hover:bg-slate-200 transition-colors border-y-2 border-slate-300">
                      <TableCell colSpan={columnQuestions.length + 5} className="sticky left-0 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={rowQ.text}
                            onChange={(e) => handleUpdateSectionText(rowQ.id, e.target.value)}
                            placeholder="Section title..."
                            className="font-bold text-base border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-10 bg-transparent"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRowQuestion(rowQ.id)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Regular Question Row
                const getAnswerColor = (value?: string) => {
                  if (!value) return "text-muted-foreground";
                  if (value === "yes" || value === "compliant") return "text-green-600 font-medium";
                  if (value === "no" || value === "non-compliant") return "text-red-600 font-medium";
                  if (value === "not-applicable") return "text-gray-500 font-medium";
                  return "";
                };

                return (
                  <TableRow key={rowQ.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium sticky left-0 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm truncate flex-1 cursor-help">
                              {rowQ.text.length > 30 ? `${rowQ.text.substring(0, 30)}...` : rowQ.text}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{rowQ.text}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRowQuestion(rowQ.id)}
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    {columnQuestions.map(colQ => {
                      const answer = getGridAnswer(rowQ.id, colQ.id);

                      return (
                        <TableCell key={colQ.id} className="px-2 py-3">
                          {colQ.type === 'text' ? (
                            <Input
                              value={answer?.value || ""}
                              onChange={(e) => handleGridAnswerChange(rowQ.id, colQ.id, e.target.value)}
                              placeholder="..."
                              className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                            />
                          ) : (
                            <Select
                              value={answer?.value}
                              onValueChange={(val) => handleGridAnswerChange(rowQ.id, colQ.id, val)}
                            >
                              <SelectTrigger className={`w-full border-none shadow-none text-sm h-8 ${getAnswerColor(answer?.value)}`}>
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {colQ.type === 'yesno' ? (
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
                    <TableCell className="px-2 py-3 bg-blue-50/30">
                      <Input
                        value={getFixedColumnValue(rowQ.id, 'comment')}
                        onChange={(e) => handleFixedColumnChange(rowQ.id, 'comment', e.target.value)}
                        placeholder="Add comment..."
                        className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-3 bg-green-50/30">
                      <Input
                        value={getFixedColumnValue(rowQ.id, 'actionRequired')}
                        onChange={(e) => handleFixedColumnChange(rowQ.id, 'actionRequired', e.target.value)}
                        placeholder="Action required..."
                        className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-3 bg-orange-50/30">
                      <Input
                        value={getFixedColumnValue(rowQ.id, 'actionCompleted')}
                        onChange={(e) => handleFixedColumnChange(rowQ.id, 'actionCompleted', e.target.value)}
                        placeholder="Action completed..."
                        className="w-full border-none shadow-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                      />
                    </TableCell>
                    <TableCell className="sticky right-0 bg-white"></TableCell>
                  </TableRow>
                );
              })}

              {/* Add Row and Section Buttons - Always visible */}
              <TableRow className="hover:bg-muted/20 transition-colors border-t-2">
                <TableCell colSpan={columnQuestions.length + 5} className="sticky left-0 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openAddRowDialog}
                      className="flex-1 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddSection}
                      className="flex-1 h-8 text-muted-foreground hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="sticky right-0 bg-white"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Unified Dialog for Adding Rows/Columns */}
        <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {questionDialogMode === "row" ? "Add Row Question" : "Add Column Question"}
              </DialogTitle>
              <DialogDescription>
                {questionDialogMode === "row"
                  ? "This will appear as a new row on the left side"
                  : "This will appear as a new column header"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Question</Label>
                <Input
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="col-span-3"
                  placeholder={questionDialogMode === "row" ? "Enter row question..." : "Enter column question..."}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      questionDialogMode === "row" ? handleAddRowQuestion() : handleAddColumnQuestion();
                    }
                  }}
                />
              </div>
              {questionDialogMode === "column" && (
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
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>Cancel</Button>
              <Button onClick={questionDialogMode === "row" ? handleAddRowQuestion : handleAddColumnQuestion}>
                Add {questionDialogMode === "row" ? "Row" : "Column"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <Button variant="outline" onClick={() => { setQuestionDialogMode("standard"); setIsQuestionDialogOpen(true); }}>
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
              {questions.map(q => (
                <TableHead key={q.id} className="min-w-[140px] max-w-[180px] font-semibold">
                  <div className="flex items-center justify-between px-2 gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs leading-tight truncate flex-1 cursor-help">
                          {q.text.length > 20 ? `${q.text.substring(0, 20)}...` : q.text}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{q.text}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[250px] font-semibold">Comment</TableHead>
              <TableHead className="w-[80px] text-center font-semibold">Action</TableHead>
              <TableHead className="w-[70px] text-center font-semibold">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedResidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={questions.length + 4} className="h-32 text-center text-muted-foreground">
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
                    <div>
                      <div className="text-sm">{resident.firstName} {resident.lastName}</div>
                      {resident.roomNumber && (
                        <div className="text-xs text-muted-foreground">Room {resident.roomNumber}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
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
