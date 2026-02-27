"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ArrowLeft, Plus, X, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { withRoleGuard } from "@/lib/route-guards";

interface Question {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text";
  isSection?: boolean;
}

interface Answer {
  residentId: string;
  questionId: string;
  value: string;
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

  // State for grid-based audit
  const [rowQuestions, setRowQuestions] = useState<Question[]>([]);
  const [columnQuestions, setColumnQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [fixedColumnData, setFixedColumnData] = useState<{
    [rowId: string]: {
      comment?: string;
      actionRequired?: string;
      actionCompleted?: string;
    };
  }>({});

  // UI State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [questionDialogMode, setQuestionDialogMode] = useState<"row" | "column">("row");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"compliance" | "yesno" | "text">("compliance");

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

        // Load saved row questions (shared across all residents in organization)
        const savedRowQuestions = localStorage.getItem(`care-file-audit-row-questions-${resData.organization_id}`);
        if (savedRowQuestions) {
          setRowQuestions(JSON.parse(savedRowQuestions));
        }

        // Load saved column questions (shared across all residents in organization)
        const savedColumnQuestions = localStorage.getItem(`care-file-audit-column-questions-${resData.organization_id}`);
        if (savedColumnQuestions) {
          setColumnQuestions(JSON.parse(savedColumnQuestions));
        }
      }

      // Load saved answers
      const savedAnswers = localStorage.getItem(`care-file-audit-answers-${residentId}`);
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }

      // Load fixed column data
      const savedFixedColumnData = localStorage.getItem(`care-file-audit-fixed-columns-${residentId}`);
      if (savedFixedColumnData) {
        setFixedColumnData(JSON.parse(savedFixedColumnData));
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

  // Row Question Management
  const handleAddRowQuestion = () => {
    if (!newQuestionText.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (!resident?.organizationId) {
      toast.error("Organization not found");
      return;
    }
    const newQuestion: Question = {
      id: `row-q${Date.now()}`,
      text: newQuestionText,
      type: "text",
    };
    const updatedRowQuestions = [...rowQuestions, newQuestion];
    setRowQuestions(updatedRowQuestions);
    localStorage.setItem(`care-file-audit-row-questions-${resident.organizationId}`, JSON.stringify(updatedRowQuestions));
    toast.success("Row added");
    setNewQuestionText("");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveRowQuestion = (questionId: string) => {
    if (!resident?.organizationId) return;
    const updatedRowQuestions = rowQuestions.filter(q => q.id !== questionId);
    setRowQuestions(updatedRowQuestions);
    setAnswers(answers.filter(a => a.residentId !== questionId));
    localStorage.setItem(`care-file-audit-row-questions-${resident.organizationId}`, JSON.stringify(updatedRowQuestions));
    toast.success("Row removed");
  };

  // Column Question Management
  const handleAddColumnQuestion = () => {
    if (!newQuestionText.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (!resident?.organizationId) {
      toast.error("Organization not found");
      return;
    }
    const newQuestion: Question = {
      id: `col-q${Date.now()}`,
      text: newQuestionText,
      type: newQuestionType,
    };
    const updatedColumnQuestions = [...columnQuestions, newQuestion];
    setColumnQuestions(updatedColumnQuestions);
    localStorage.setItem(`care-file-audit-column-questions-${resident.organizationId}`, JSON.stringify(updatedColumnQuestions));
    toast.success("Column added");
    setNewQuestionText("");
    setNewQuestionType("compliance");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveColumnQuestion = (questionId: string) => {
    if (!resident?.organizationId) return;
    const updatedColumnQuestions = columnQuestions.filter(q => q.id !== questionId);
    setColumnQuestions(updatedColumnQuestions);
    setAnswers(answers.filter(a => a.questionId !== questionId));
    localStorage.setItem(`care-file-audit-column-questions-${resident.organizationId}`, JSON.stringify(updatedColumnQuestions));
    toast.success("Column removed");
  };

  // Section Management
  const handleAddSection = () => {
    if (!resident?.organizationId) {
      toast.error("Organization not found");
      return;
    }
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
    localStorage.setItem(`care-file-audit-row-questions-${resident.organizationId}`, JSON.stringify(updatedRowQuestions));
    toast.success("Section added");
  };

  const handleUpdateSectionText = (sectionId: string, text: string) => {
    if (!resident?.organizationId) return;
    const updatedRowQuestions = rowQuestions.map(q =>
      q.id === sectionId ? { ...q, text } : q
    );
    setRowQuestions(updatedRowQuestions);
    localStorage.setItem(`care-file-audit-row-questions-${resident.organizationId}`, JSON.stringify(updatedRowQuestions));
  };

  // Dialog openers
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

  // Answer Handling
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
    localStorage.setItem(`care-file-audit-answers-${residentId}`, JSON.stringify(updatedAnswers));
  };

  const getGridAnswer = (rowQuestionId: string, columnQuestionId: string) => {
    return answers.find(a => a.residentId === rowQuestionId && a.questionId === columnQuestionId);
  };

  // Fixed Column Handling
  const handleFixedColumnChange = (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted', value: string) => {
    const updatedData = {
      ...fixedColumnData,
      [rowId]: {
        ...fixedColumnData[rowId],
        [field]: value
      }
    };
    setFixedColumnData(updatedData);
    localStorage.setItem(`care-file-audit-fixed-columns-${residentId}`, JSON.stringify(updatedData));
  };

  const getFixedColumnValue = (rowId: string, field: 'comment' | 'actionRequired' | 'actionCompleted') => {
    return fixedColumnData[rowId]?.[field] || '';
  };

  // Completion
  const handleCompleteAudit = async () => {
    if (rowQuestions.length === 0) {
      toast.error("Please add at least one row to the audit");
      return;
    }

    const auditCompletionData = {
      residentId: residentId,
      residentName: resident ? `${resident.firstName} ${resident.lastName}` : "Unknown",
      completedDate: new Date().toISOString(),
      auditor: profile?.name || profile?.email || "Unknown",
      rowQuestions: rowQuestions,
      columnQuestions: columnQuestions,
      answers: answers,
      fixedColumnData: fixedColumnData,
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
      rowCount: rowQuestions.filter(q => !q.isSection).length,
      data: auditCompletionData
    };

    history.unshift(newHistoryRecord);
    localStorage.setItem(historyKey, JSON.stringify(history));

    // Clear current audit data for THIS resident only
    // Row questions and column questions are shared across all residents - DON'T remove them
    localStorage.removeItem(`care-file-audit-answers-${residentId}`);
    localStorage.removeItem(`care-file-audit-fixed-columns-${residentId}`);
    // Questions intentionally NOT removed - they're organization-wide and persist for all residents

    toast.success("Audit completed!");
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
          <Button onClick={handleCompleteAudit}>Complete Audit</Button>
        </div>
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

export default withRoleGuard(ResidentCareFileAuditPage, ["manager", "admin", "owner"]);
