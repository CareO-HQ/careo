"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Resident as ResidentType } from "@/types";
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
import { ArrowLeft, Plus, X, CalendarIcon, MoreHorizontal, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

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
  assignedTo: string;
  dueDate: Date | undefined;
  priority: string;
}

export default function ResidentAuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  const { activeTeamId } = useActiveTeam();
  const [auditName, setAuditName] = useState("Risk Assessment Audit");

  // Load audit name from localStorage
  useEffect(() => {
    const savedAudits = localStorage.getItem('careo-audits');
    if (savedAudits) {
      const audits = JSON.parse(savedAudits);
      const currentAudit = audits.find((audit: any) => audit.id === auditId);
      if (currentAudit) {
        setAuditName(currentAudit.name);
      }
    }
  }, [auditId]);

  // Fetch real residents from database
  const dbResidents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as ResidentType[] | undefined;

  const [questions, setQuestions] = useState<Question[]>([]);

  const [answers, setAnswers] = useState<Answer[]>([]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [residentDates, setResidentDates] = useState<{ [residentId: string]: string }>({});
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);

  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"compliance" | "yesno">("compliance");
  const [isActionPlanDialogOpen, setIsActionPlanDialogOpen] = useState(false);
  const [actionPlanText, setActionPlanText] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
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

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;

    const newQuestion: Question = {
      id: `q${questions.length + 1}`,
      text: newQuestionText,
      type: newQuestionType,
    };

    setQuestions([...questions, newQuestion]);
    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    setAnswers(answers.filter(a => a.questionId !== questionId));
  };

  const handleAnswerChange = (residentId: string, questionId: string, value: string) => {
    const existingAnswer = answers.find(
      a => a.residentId === residentId && a.questionId === questionId
    );

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
        <div className="flex items-center gap-2">
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
                  <Popover>
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
          <div className="px-2 pb-4 border-b border-dashed flex gap-2">
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
              className="w-full min-h-[80px] px-3 py-2 text-base rounded-md focus:outline-none resize-none"
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
                <PopoverContent className="w-48 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="space-y-1">
                    <div
                      className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setAssignedTo("John Doe");
                        setAssignPopoverOpen(false);
                      }}
                    >
                      John Doe
                    </div>
                    <div
                      className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setAssignedTo("Jane Smith");
                        setAssignPopoverOpen(false);
                      }}
                    >
                      Jane Smith
                    </div>
                    <div
                      className="px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setAssignedTo("Bob Johnson");
                        setAssignPopoverOpen(false);
                      }}
                    >
                      Bob Johnson
                    </div>
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
                  // Handle action plan creation
                  if (actionPlanText.trim()) {
                    const newActionPlan: ActionPlan = {
                      id: `ap${actionPlans.length + 1}`,
                      auditId: auditId,
                      text: actionPlanText,
                      assignedTo: assignedTo,
                      dueDate: dueDate,
                      priority: priority,
                    };
                    setActionPlans([...actionPlans, newActionPlan]);
                  }
                  setActionPlanText("");
                  setAssignedTo("");
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
    </div>
  );
}
