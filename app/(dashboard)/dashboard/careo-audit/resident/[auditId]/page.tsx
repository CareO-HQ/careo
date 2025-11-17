"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Resident as ResidentType } from "@/types";
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
import { ArrowLeft, Plus, X, CalendarIcon, ArrowUpDown, SlidersHorizontal, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { AuditHistory } from "@/components/audit/audit-history";
import { authClient } from "@/lib/auth-client";

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno";
}

interface Answer {
  residentId: string;
  questionId: string;
  value: string; // "compliant" | "non-compliant" | "not-applicable" | "yes" | "no"
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
  assignedTo: string;  // Display name
  assignedToEmail: string;  // Email for backend
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  latestComment?: string;
}

export default function ResidentAuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  // Get current user session
  const { data: session } = authClient.useSession();

  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const [auditName, setAuditName] = useState("");

  // Load organization members for action plan assignment
  const organizationMembers = useQuery(
    api.teams.getOrganizationMembers,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Database hooks - Template management
  const createTemplate = useMutation(api.auditTemplates.createTemplate);
  const updateTemplate = useMutation(api.auditTemplates.updateTemplate);

  // Check if auditId is a Convex ID (starts with lowercase letter, not a timestamp)
  const isConvexId = auditId && /^[a-z]/.test(auditId);

  // Determine if it's a template ID (starts with 't') or response ID (starts with other letters)
  const isTemplateId = isConvexId && auditId.startsWith('t');
  const isResponseId = isConvexId && !auditId.startsWith('t');

  const getTemplate = useQuery(
    api.auditTemplates.getTemplateById,
    isTemplateId
      ? { templateId: auditId as Id<"residentAuditTemplates"> }
      : "skip"
  );

  // Database hooks - Audit response management
  const createResponse = useMutation(api.auditResponses.createResponse);
  const updateResponse = useMutation(api.auditResponses.updateResponse);
  const completeResponse = useMutation(api.auditResponses.completeResponse);

  // State for tracking current audit response ID
  const [responseId, setResponseId] = useState<Id<"residentAuditCompletions"> | null>(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true);

  // Ref to prevent duplicate draft creation (multiple tabs/rapid re-renders)
  const isCreatingDraft = React.useRef(false);

  // Try to load existing audit response if auditId is actually a response ID
  const existingResponse = useQuery(
    api.auditResponses.getResponseById,
    isResponseId
      ? { responseId: auditId as Id<"residentAuditCompletions"> }
      : "skip"
  );

  // For template pages, try to find existing draft response
  const existingDrafts = useQuery(
    api.auditResponses.getDraftResponsesByTemplate,
    isTemplateId && activeTeamId
      ? {
          templateId: auditId as Id<"residentAuditTemplates">,
          teamId: activeTeamId
        }
      : "skip"
  );

  // Database hooks - Action plan management
  const createActionPlan = useMutation(api.auditActionPlans.createActionPlan);
  const deleteActionPlanMutation = useMutation(api.auditActionPlans.deleteActionPlan);

  // Load existing action plans from database
  // Use responseId if available, otherwise use auditId if it's a response ID
  const actionPlanQueryArg = responseId
    ? { auditResponseId: responseId }
    : isResponseId
    ? { auditResponseId: auditId as Id<"residentAuditCompletions"> }
    : "skip";

  console.log("🔍 Action plan query arg:", actionPlanQueryArg, "responseId:", responseId, "isResponseId:", isResponseId);

  const dbActionPlans = useQuery(
    api.auditActionPlans.getActionPlansByAudit,
    actionPlanQueryArg
  );

  // Set responseId from existing response if it exists (for completed audits)
  useEffect(() => {
    if (existingResponse && !responseId) {
      console.log("📄 Loading existing completed audit response:", existingResponse._id);
      setResponseId(existingResponse._id);
    }
  }, [existingResponse, responseId]);

  // Clear all data when team changes (important for team switching)
  useEffect(() => {
    if (isTemplateId && activeTeamId) {
      console.log("🔄 Team changed, clearing all audit data to load new team's data");
      setResponseId(null);
      setActionPlans([]);
      setAnswers([]);  // Array, not object
      setComments([]);
      setResidentDates({});
      // Reset draft creation flag to allow new draft for new team
      isCreatingDraft.current = false;
      hasLoadedDraft.current = false; // Reset draft loaded flag
    }
  }, [activeTeamId, isTemplateId]);

  // Track if we've already loaded draft data to prevent resets
  const hasLoadedDraft = React.useRef(false);

  // Set responseId from existing draft if it exists (for template pages)
  useEffect(() => {
    console.log("🔍 Checking for existing drafts:", {
      existingDrafts: existingDrafts?.length,
      responseId,
      isTemplateId,
      activeTeamId,
      hasLoadedDraft: hasLoadedDraft.current
    });

    // Only load once to prevent resetting user's work
    if (existingDrafts && existingDrafts.length > 0 && !responseId && !hasLoadedDraft.current) {
      // Use the most recent draft (in-progress or draft status)
      const recentDraft = existingDrafts.find(d => d.status === "in-progress" || d.status === "draft") || existingDrafts[0];
      console.log("📝 Loading existing draft response:", recentDraft._id, "status:", recentDraft.status, "teamId:", recentDraft.teamId);
      setResponseId(recentDraft._id);

      // Load the draft data into the form
      if (recentDraft.responses && recentDraft.responses.length > 0) {
        console.log("📥 Loading draft data into form...");

        // Convert responses to answers format
        const loadedAnswers: Answer[] = [];
        const loadedComments: Comment[] = [];
        const loadedDates: { [residentId: string]: string } = {};

        recentDraft.responses.forEach((response: any) => {
          // Load answers
          response.answers?.forEach((answer: any) => {
            if (answer.value !== undefined) {
              loadedAnswers.push({
                residentId: response.residentId,
                questionId: answer.questionId,
                value: answer.value,
                notes: answer.notes
              });
            }
          });

          // Load comments
          if (response.comment) {
            loadedComments.push({
              residentId: response.residentId,
              text: response.comment
            });
          }

          // Load dates
          if (response.date) {
            loadedDates[response.residentId] = response.date;
          }
        });

        setAnswers(loadedAnswers);
        setComments(loadedComments);
        setResidentDates(loadedDates);
        hasLoadedDraft.current = true; // Mark as loaded
        console.log("✅ Draft data loaded:", {
          answers: loadedAnswers.length,
          comments: loadedComments.length,
          dates: Object.keys(loadedDates).length,
          sampleAnswers: loadedAnswers.slice(0, 3),
          sampleComments: loadedComments.slice(0, 3),
          sampleDates: Object.entries(loadedDates).slice(0, 3)
        });
      }
    }
  }, [existingDrafts, responseId, isTemplateId, activeTeamId]);

  // Load audit name from localStorage (fallback) or template
  useEffect(() => {
    console.log("Loading audit - auditId:", auditId, "isConvexId:", isConvexId, "getTemplate:", getTemplate);

    if (getTemplate) {
      console.log("✅ Loading from database template:", getTemplate.name);
      setAuditName(getTemplate.name);
      setIsLoadingFromDB(false);
    } else if (!isConvexId) {
      // Fallback to localStorage for non-database audits
      console.log("Loading from localStorage for ID:", auditId);
      const savedAudits = localStorage.getItem('careo-audits');
      if (savedAudits) {
        const audits = JSON.parse(savedAudits);
        const currentAudit = audits.find((audit: any) => audit.id === auditId);
        if (currentAudit) {
          setAuditName(currentAudit.name);
        }
      }
      setIsLoadingFromDB(false);
    }
  }, [auditId, getTemplate, isConvexId]);

  // Fetch real residents from database
  const dbResidents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as ResidentType[] | undefined;

  const [questions, setQuestions] = useState<Question[]>([]);

  // Load questions from template or localStorage
  useEffect(() => {
    if (getTemplate) {
      // Load from database template
      setQuestions(getTemplate.questions);
    } else {
      // Fallback to localStorage
      const savedQuestions = localStorage.getItem(`audit-questions-${auditId}`);
      if (savedQuestions) {
        setQuestions(JSON.parse(savedQuestions));
      }
    }
  }, [auditId, getTemplate]);

  const [answers, setAnswers] = useState<Answer[]>([]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [residentDates, setResidentDates] = useState<{ [residentId: string]: string }>({});
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"compliance" | "yesno">("compliance");
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");  // Display name
  const [assignedToEmail, setAssignedToEmail] = useState<string>("");  // Email for backend
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState<string>("");
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    residentName: 250,
    room: 100,
    date: 150,
    comment: 300,
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [openDatePopover, setOpenDatePopover] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionPlanToDelete, setActionPlanToDelete] = useState<string | null>(null);

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;

    const newQuestion: Question = {
      id: `q${Date.now()}`, // Use timestamp for unique ID
      text: newQuestionText,
      type: newQuestionType,
    };

    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);

    // Save to database if template exists
    if (getTemplate) {
      try {
        await updateTemplate({
          templateId: getTemplate._id,
          questions: updatedQuestions,
        });
      } catch (error) {
        console.error("Failed to update template:", error);
        toast.error("Failed to save question");
      }
    } else {
      // Fallback to localStorage
      localStorage.setItem(`audit-questions-${auditId}`, JSON.stringify(updatedQuestions));
    }

    // Update audit status to in-progress
    updateAuditStatusToInProgress();

    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = async (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    setAnswers(answers.filter(a => a.questionId !== questionId));

    // Save to database if template exists
    if (getTemplate) {
      try {
        await updateTemplate({
          templateId: getTemplate._id,
          questions: updatedQuestions,
        });
      } catch (error) {
        console.error("Failed to update template:", error);
        toast.error("Failed to remove question");
      }
    } else {
      // Fallback to localStorage
      localStorage.setItem(`audit-questions-${auditId}`, JSON.stringify(updatedQuestions));
    }
  };

  const handleAnswerChange = (residentId: string, questionId: string, value: string) => {
    const existingAnswer = answers.find(
      a => a.residentId === residentId && a.questionId === questionId
    );

    // Update audit status to in-progress on first answer
    updateAuditStatusToInProgress();

    if (existingAnswer) {
      setAnswers(
        answers.map(a =>
          a.residentId === residentId && a.questionId === questionId
            ? { ...a, value }
            : a
        )
      );
    } else {
      setAnswers([
        ...answers,
        { residentId, questionId, value },
      ]);
    }
  };

  const getAnswer = (residentId: string, questionId: string) => {
    return answers.find(
      a => a.residentId === residentId && a.questionId === questionId
    );
  };

  const handleDateChange = (residentId: string, questionId: string, date: string) => {
    const existingAnswer = answers.find(
      a => a.residentId === residentId && a.questionId === questionId
    );

    if (existingAnswer) {
      setAnswers(
        answers.map(a =>
          a.residentId === residentId && a.questionId === questionId
            ? { ...a, date }
            : a
        )
      );
    } else {
      setAnswers([
        ...answers,
        { residentId, questionId, value: "", date },
      ]);
    }
  };

  const handleCommentChange = (residentId: string, text: string) => {
    const existingComment = comments.find(c => c.residentId === residentId);

    if (existingComment) {
      setComments(
        comments.map(c =>
          c.residentId === residentId ? { ...c, text } : c
        )
      );
    } else {
      setComments([...comments, { residentId, text }]);
    }
  };

  const handleResidentDateChange = (residentId: string, date: string) => {
    setResidentDates(prev => ({
      ...prev,
      [residentId]: date,
    }));
  };

  const getComment = (residentId: string) => {
    return comments.find(c => c.residentId === residentId)?.text || "";
  };

  // Function to update audit status to "in-progress" on first interaction
  const updateAuditStatusToInProgress = () => {
    const savedAudits = localStorage.getItem('careo-audits');
    if (savedAudits) {
      const audits = JSON.parse(savedAudits);
      const audit = audits.find((a: any) => a.id === auditId);

      // Only update if status is "new"
      if (audit && audit.status === "new") {
        const updatedAudits = audits.map((a: any) =>
          a.id === auditId
            ? { ...a, status: "in-progress", lastAudited: "Just now" }
            : a
        );
        localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));
        console.log('Updated audit status to in-progress');
      }
    }
  };

  // Function to check and update "due" status for previous audits
  const checkAndUpdateDueAudits = (auditName: string, category: string, frequency: string) => {
    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return;

    const audits = JSON.parse(completedAudits);

    // Find all completed audits with the same name and category
    const matchingAudits = audits
      .filter((a: any) => a.name === auditName && a.category === category && a.status === "completed")
      .sort((a: any, b: any) => b.completedAt - a.completedAt);

    if (matchingAudits.length < 2) return; // Need at least 2 to check frequency

    // Get the latest completed audit
    const latestAudit = matchingAudits[0];
    const latestCompletedDate = new Date(latestAudit.completedAt);
    const now = new Date();

    // Calculate days passed since last completion
    const daysPassed = Math.floor((now.getTime() - latestCompletedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Determine if audit is due based on frequency
    const frequencyDays: { [key: string]: number } = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };

    const daysUntilDue = frequencyDays[frequency.toLowerCase()] || 30;

    // If past due date, update previous audit status to "due"
    if (daysPassed >= daysUntilDue && matchingAudits.length > 1) {
      const savedAudits = localStorage.getItem('careo-audits');
      if (savedAudits) {
        const allAudits = JSON.parse(savedAudits);
        const updated = allAudits.map((audit: any) => {
          // Find audits with same name that are completed but not the latest
          const isOlderCompletedAudit =
            audit.name === auditName &&
            audit.category === category &&
            audit.status === "completed" &&
            audit.id !== latestAudit.id;

          if (isOlderCompletedAudit) {
            return { ...audit, status: "due" };
          }
          return audit;
        });
        localStorage.setItem('careo-audits', JSON.stringify(updated));
        console.log('Updated previous audits to "due" status');
      }
    }
  };


  const handleCompleteAudit = async () => {
    if (!activeTeamId || !dbResidents) {
      toast.error("Missing required data. Please try again.");
      return;
    }

    try {
      // Get auditor name from session
      const auditorName = session?.user?.name || session?.user?.email || "Unknown User";

      // Prepare responses array with resident data
      const responses = (dbResidents || []).map((resident) => ({
        residentId: resident._id,
        residentName: `${resident.firstName} ${resident.lastName}`,
        roomNumber: resident.roomNumber,
        answers: questions.map((q) => {
          const answer = answers.find(
            (a) => a.residentId === resident._id && a.questionId === q.id
          );
          return {
            questionId: q.id,
            value: answer?.value,
            notes: answer?.notes,
          };
        }),
        date: residentDates[resident._id],
        comment: comments.find((c) => c.residentId === resident._id)?.text,
      }));

      // Check if we need to create a draft response first or complete existing one
      let completionId = responseId;

      if (!responseId && getTemplate) {
        // Create a new response first
        completionId = await createResponse({
          templateId: getTemplate._id,
          templateName: getTemplate.name,
          category: "resident",
          teamId: activeTeamId,
          organizationId: activeTeamId, // Using teamId as orgId for now
          auditedBy: auditorName,
          frequency: getTemplate.frequency,
        });
        setResponseId(completionId);
      }

      if (completionId) {
        // Complete the audit in database
        await completeResponse({
          responseId: completionId,
          responses,
        });

        // Save action plans to database
        for (const plan of actionPlans.filter((p) => p.auditId === auditId)) {
          if (getTemplate && activeOrganizationId) {
            await createActionPlan({
              auditResponseId: completionId,
              templateId: getTemplate._id,
              description: plan.text,
              assignedTo: plan.assignedToEmail || plan.assignedTo,  // Use email for backend
              assignedToName: plan.assignedTo,  // Display name
              priority: plan.priority as "Low" | "Medium" | "High",
              dueDate: plan.dueDate?.getTime(),
              teamId: activeTeamId,
              organizationId: activeOrganizationId,
              createdBy: session?.user?.email || auditorName,  // Use email
              createdByName: session?.user?.name || auditorName,  // Display name
            });
          }
        }

        toast.success(`${auditName} completed successfully! Starting new audit...`, {
          duration: 3000,
        });

        // Reset form to start a new audit
        setAnswers([]);
        setComments([]);
        setResidentDates({});
        setActionPlans([]);
        setResponseId(null);

        // Reset flags to allow new draft and data loading
        isCreatingDraft.current = false;
        hasLoadedDraft.current = false;

        // The page will automatically create a new draft and reload fresh data
      } else {
        // Fallback to localStorage if no database connection
        handleCompleteAuditLocalStorage();
      }
    } catch (error) {
      console.error("Failed to complete audit:", error);
      toast.error("Failed to complete audit. Please try again.");
    }
  };

  // Track if data has actually changed to avoid unnecessary saves
  const lastSavedData = React.useRef<string>("");
  const isSaving = React.useRef(false);

  // Auto-save audit progress to database (debounced and optimized)
  useEffect(() => {
    if (!responseId || !getTemplate || !activeTeamId || !dbResidents) {
      console.log("⏸️ Auto-save skipped:", { responseId: !!responseId, template: !!getTemplate, teamId: !!activeTeamId, residents: !!dbResidents });
      return;
    }

    // Only save if we have actual data
    if (answers.length === 0 && comments.length === 0 && Object.keys(residentDates).length === 0) {
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
        // Prepare responses array
        const responses = (dbResidents || []).map((resident) => ({
          residentId: resident._id,
          residentName: `${resident.firstName} ${resident.lastName}`,
          roomNumber: resident.roomNumber,
          answers: questions.map((q) => {
            const answer = answers.find(
              (a) => a.residentId === resident._id && a.questionId === q.id
            );
            return {
              questionId: q.id,
              value: answer?.value,
              notes: answer?.notes,
            };
          }),
          date: residentDates[resident._id],
          comment: comments.find((c) => c.residentId === resident._id)?.text,
        }));

        // Check if data actually changed
        const currentDataHash = JSON.stringify(responses);
        if (currentDataHash === lastSavedData.current) {
          console.log("⏸️ Auto-save skipped: No changes detected");
          return;
        }

        isSaving.current = true;
        console.log("💾 Auto-saving audit data...", {
          answers: answers.length,
          comments: comments.length,
          dates: Object.keys(residentDates).length,
          residents: dbResidents.length
        });

        // Auto-save to database
        await updateResponse({
          responseId,
          responses,
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
  }, [answers, comments, residentDates, questions, responseId, getTemplate, activeTeamId, dbResidents, updateResponse]);

  // Create draft response when page loads with template (if one doesn't exist)
  useEffect(() => {
    // Don't create if we already have a responseId or if we're loading existing drafts
    if (!getTemplate || responseId || !activeTeamId || !activeOrganizationId || !session) return;

    // Wait for existingDrafts query to complete
    if (existingDrafts === undefined) return;

    // If drafts exist, we'll use one of them (handled by another useEffect)
    if (existingDrafts && existingDrafts.length > 0) return;

    // DUPLICATE PREVENTION: Check if already creating
    if (isCreatingDraft.current) {
      console.log("⏳ Draft creation already in progress, skipping...");
      return;
    }

    console.log("📝 No existing draft found, creating new draft response...");

    const createDraft = async () => {
      // Set flag to prevent duplicate calls
      isCreatingDraft.current = true;

      try {
        const auditorName = session?.user?.name || session?.user?.email || "Unknown User";
        const draftId = await createResponse({
          templateId: getTemplate._id,
          templateName: getTemplate.name,
          category: "resident",
          teamId: activeTeamId,
          organizationId: activeOrganizationId,
          auditedBy: auditorName,
          frequency: getTemplate.frequency,
        });
        console.log("✅ Draft response created:", draftId);
        setResponseId(draftId);
      } catch (error) {
        console.error("Failed to create draft:", error);
      } finally {
        // Reset flag after creation completes or fails
        setTimeout(() => {
          isCreatingDraft.current = false;
        }, 2000); // Wait 2 seconds before allowing another attempt
      }
    };

    createDraft();
  }, [getTemplate, responseId, activeTeamId, activeOrganizationId, session, existingDrafts, createResponse]);

  // Load existing action plans from database
  useEffect(() => {
    console.log("🔄 Action plan loading effect triggered:", {
      dbActionPlans: dbActionPlans?.length,
      responseId,
      isResponseId,
      currentActionPlans: actionPlans.length
    });

    if (dbActionPlans !== undefined) {
      if (dbActionPlans.length > 0) {
        // Transform database action plans to local format
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

        console.log("✅ Loaded action plans from database:", transformedPlans);
        // Replace local action plans with database action plans (database is source of truth)
        setActionPlans(transformedPlans);
      } else {
        console.log("📋 No action plans found in database, responseId:", responseId, "isResponseId:", isResponseId);
        // Don't clear action plans immediately - they might still be loading
        // Only clear if we have a stable responseId/isResponseId and confirmed no plans exist
      }
    }
  }, [dbActionPlans]);

  // Fallback localStorage version
  const handleCompleteAuditLocalStorage = () => {
    const savedAudits = localStorage.getItem('careo-audits');
    let currentAudit: any = null;
    if (savedAudits) {
      const audits = JSON.parse(savedAudits);
      currentAudit = audits.find((a: any) => a.id === auditId);
    }

    const completionId = `${auditId}-completion-${Date.now()}`;
    const auditorName = session?.user?.name || session?.user?.email || "Unknown User";

    const completedAudit = {
      id: completionId,
      originalAuditId: auditId,
      name: auditName,
      category: "resident",
      completedAt: Date.now(),
      questions,
      answers,
      comments,
      residentDates,
      actionPlans: actionPlans.filter(plan => plan.auditId === auditId),
      status: "completed",
      frequency: currentAudit?.frequency,
      auditor: auditorName
    };

    const existingCompletedAudits = localStorage.getItem('completed-audits');
    const completedAudits = existingCompletedAudits
      ? JSON.parse(existingCompletedAudits)
      : [];

    completedAudits.push(completedAudit);
    localStorage.setItem('completed-audits', JSON.stringify(completedAudits));

    if (savedAudits) {
      const audits = JSON.parse(savedAudits);
      const updatedAudits = audits.map((audit: any) =>
        audit.id === auditId
          ? {
              ...audit,
              status: "completed",
              lastAudited: new Date().toLocaleDateString(),
              auditor: auditorName,
            }
          : audit
      );
      localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));

      if (currentAudit && currentAudit.frequency) {
        checkAndUpdateDueAudits(currentAudit.name, currentAudit.category, currentAudit.frequency);
      }
    }

    toast.success(`${auditName} completed!`, { duration: 3000 });
    setTimeout(() => {
      router.push('/dashboard/careo-audit?tab=resident');
    }, 1500);
  };

  const handleMouseDown = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnId);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnId] || 200);
  };

  // Add event listeners for resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return;

      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);

      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizingColumn, startX, startWidth]);

  const handleDeleteActionPlan = async () => {
    if (!actionPlanToDelete) return;

    try {
      // Check if this is a database action plan (Convex ID)
      const isDbPlan = /^[a-z]/.test(actionPlanToDelete);

      if (isDbPlan) {
        // Delete from database
        await deleteActionPlanMutation({
          actionPlanId: actionPlanToDelete as Id<"residentAuditActionPlans">
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

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/careo-audit")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{auditName}</h1>
            <p className="text-sm text-muted-foreground">Resident Audit</p>
          </div>
        </div>
        {/* Removed 3-dot menu - history now accessible via Actions > Archived on listing page */}
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
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsQuestionDialogOpen(true)} size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="sticky left-0 bg-background z-10 border-r border-l relative"
                style={{ width: `${columnWidths.residentName}px` }}
              >
                <div className="flex items-center justify-between">
                  <span>Resident Name</span>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => handleMouseDown('residentName', e)}
                  />
                </div>
              </TableHead>
              <TableHead
                className="border-r relative"
                style={{ width: `${columnWidths.room}px` }}
              >
                <div className="flex items-center justify-between">
                  <span>Room</span>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => handleMouseDown('room', e)}
                  />
                </div>
              </TableHead>
              {questions.map(question => {
                const width = columnWidths[question.id] || 200;
                return (
                  <TableHead
                    key={question.id}
                    className="border-r relative"
                    style={{ width: `${width}px` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1">{question.text}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveQuestion(question.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                        onMouseDown={(e) => handleMouseDown(question.id, e)}
                      />
                    </div>
                  </TableHead>
                );
              })}
              <TableHead
                className="border-r relative"
                style={{ width: `${columnWidths.date}px` }}
              >
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => handleMouseDown('date', e)}
                  />
                </div>
              </TableHead>
              <TableHead
                className="border-r relative"
                style={{ width: `${columnWidths.comment}px` }}
              >
                <div className="flex items-center justify-between">
                  <span>Comment</span>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => handleMouseDown('comment', e)}
                  />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(dbResidents || []).map(resident => (
              <TableRow key={resident._id} className="hover:bg-muted/50 border-b">
                <TableCell
                  className="font-medium sticky left-0 bg-background border-r border-l"
                  style={{ width: `${columnWidths.residentName}px` }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
                      <AvatarFallback>
                        {resident.firstName[0]}{resident.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span>{resident.firstName} {resident.lastName}</span>
                  </div>
                </TableCell>
                <TableCell
                  className="border-r"
                  style={{ width: `${columnWidths.room}px` }}
                >
                  {resident.roomNumber || "-"}
                </TableCell>
                {questions.map(question => {
                  const answer = getAnswer(resident._id, question.id);
                  const width = columnWidths[question.id] || 200;
                  return (
                    <TableCell
                      key={question.id}
                      className="border-r"
                      style={{ width: `${width}px` }}
                    >
                      <Select
                        value={answer?.value || ""}
                        onValueChange={(value) => handleAnswerChange(resident._id, question.id, value)}
                      >
                        <SelectTrigger className="h-6 border-0 shadow-none w-fit p-0 bg-transparent hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                          {answer?.value ? (
                            <Badge
                              variant="secondary"
                              className={`text-xs h-6 ${
                                answer?.value === "compliant" || answer?.value === "yes" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                answer?.value === "non-compliant" || answer?.value === "no" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                              }`}
                            >
                              {answer.value === "compliant" ? "Compliant" :
                               answer.value === "non-compliant" ? "Non-Compliant" :
                               answer.value === "yes" ? "Yes" :
                               answer.value === "no" ? "No" :
                               "N/A"}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Select</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {question.type === "compliance" ? (
                            <>
                              <SelectItem value="compliant" className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  Compliant
                                </div>
                              </SelectItem>
                              <SelectItem value="non-compliant" className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  Non-Compliant
                                </div>
                              </SelectItem>
                              <SelectItem value="not-applicable" className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                  Not Applicable
                                </div>
                              </SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="yes" className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  Yes
                                </div>
                              </SelectItem>
                              <SelectItem value="no" className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  No
                                </div>
                              </SelectItem>
                              <SelectItem value="not-applicable" className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                  Not Applicable
                                </div>
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  );
                })}
                <TableCell
                  className="border-r"
                  style={{ width: `${columnWidths.date}px` }}
                >
                  <Popover
                    open={openDatePopover === resident._id}
                    onOpenChange={(open) => setOpenDatePopover(open ? resident._id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-7 w-full justify-start text-xs font-normal border-0 shadow-none px-2 hover:bg-transparent"
                      >
                        {residentDates[resident._id] ? format(new Date(residentDates[resident._id]), "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={residentDates[resident._id] ? new Date(residentDates[resident._id]) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            handleResidentDateChange(resident._id, format(date, "yyyy-MM-dd"));
                            setOpenDatePopover(null); // Close the popover after selection
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell
                  className="border-r p-0"
                  style={{ width: `${columnWidths.comment}px` }}
                >
                  <Input
                    type="text"
                    placeholder="Add comment..."
                    value={getComment(resident._id)}
                    onChange={(e) => handleCommentChange(resident._id, e.target.value)}
                    className="h-full w-full border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-4"
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
            {actionPlans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {actionPlans.map((plan) => {
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
                )})}
              </div>
            )}
          </div>

          {/* Audit History Section - Temporarily disabled to prevent conflicts with sheet */}
          {/* <div className="px-2">
            <AuditHistory
              auditName={auditName}
              auditCategory="resident"
              currentAuditId={auditId}
              maxItems={10}
            />
          </div> */}
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
          <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
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
            <div className="flex gap-2 shrink-0">
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
                  // Handle action plan creation
                  if (!actionPlanText.trim()) {
                    toast.error("Please enter action plan details");
                    return;
                  }

                  if (!assignedToEmail) {
                    toast.error("Please assign to a staff member");
                    return;
                  }

                  if (!priority) {
                    toast.error("Please select a priority");
                    return;
                  }

                  try {
                    // Ensure we have a responseId (should be created by page load useEffect)
                    if (!responseId) {
                      toast.error("Please wait for the audit to load before creating action plans");
                      return;
                    }

                    // Save action plan to database
                    if (responseId && getTemplate && activeOrganizationId) {
                      console.log("💾 Saving action plan to database with responseId:", responseId);
                      const actionPlanId = await createActionPlan({
                        auditResponseId: responseId,
                        templateId: getTemplate._id,
                        description: actionPlanText,
                        assignedTo: assignedToEmail,
                        assignedToName: assignedTo,
                        priority: priority as "Low" | "Medium" | "High",
                        dueDate: dueDate?.getTime(),
                        teamId: activeTeamId || "",
                        organizationId: activeOrganizationId,
                        createdBy: session?.user?.email || "",
                        createdByName: session?.user?.name || session?.user?.email || "",
                      });

                      console.log("✅ Action plan created with ID:", actionPlanId);
                      toast.success("Action plan created and assignee notified");

                      // Don't add to local state - let the database query update it
                      // This ensures consistency with the database
                    } else {
                      console.error("❌ Cannot create action plan - missing required data", {
                        responseId,
                        getTemplate: !!getTemplate,
                        activeOrganizationId
                      });
                      toast.error("Failed to create action plan - missing required data");
                    }

                    // Update audit status to in-progress
                    updateAuditStatusToInProgress();
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
                Save
                <span className="ml-2 text-xs">⌘ ↵</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>
              Add a new question column to the audit table.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="questionText">Question</Label>
              <Input
                id="questionText"
                placeholder="e.g., All risk assessment files completed?"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={newQuestionType}
                onValueChange={(value: "compliance" | "yesno") => setNewQuestionType(value)}
              >
                <SelectTrigger id="questionType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance">Compliant / Non-Compliant / Not Applicable</SelectItem>
                  <SelectItem value="yesno">Yes / No / Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuestionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddQuestion}>
              Add Question
            </Button>
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
