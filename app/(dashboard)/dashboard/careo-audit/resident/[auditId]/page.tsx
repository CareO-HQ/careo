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
import { ArrowLeft, Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Question {
  id: string;
  text: string;
}

interface Answer {
  residentId: string;
  questionId: string;
  completed: boolean;
  notes?: string;
}

export default function ResidentAuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;

  const { activeTeamId } = useActiveTeam();
  const [auditName] = useState("Risk Assessment Audit");

  // Fetch real residents from database
  const dbResidents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as ResidentType[] | undefined;

  const [questions, setQuestions] = useState<Question[]>([
    { id: "q1", text: "All risk assessment files completed?" },
    { id: "q2", text: "Care plans up to date?" },
  ]);

  const [answers, setAnswers] = useState<Answer[]>([
    { residentId: "1", questionId: "q1", completed: true },
    { residentId: "1", questionId: "q2", completed: false },
    { residentId: "2", questionId: "q1", completed: true },
    { residentId: "2", questionId: "q2", completed: true },
  ]);

  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    residentName: 250,
    room: 100,
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;

    const newQuestion: Question = {
      id: `q${questions.length + 1}`,
      text: newQuestionText,
    };

    setQuestions([...questions, newQuestion]);
    setNewQuestionText("");
    setIsQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    setAnswers(answers.filter(a => a.questionId !== questionId));
  };

  const handleToggleAnswer = (residentId: string, questionId: string) => {
    const existingAnswer = answers.find(
      a => a.residentId === residentId && a.questionId === questionId
    );

    if (existingAnswer) {
      setAnswers(
        answers.map(a =>
          a.residentId === residentId && a.questionId === questionId
            ? { ...a, completed: !a.completed }
            : a
        )
      );
    } else {
      setAnswers([
        ...answers,
        { residentId, questionId, completed: true },
      ]);
    }
  };

  const getAnswer = (residentId: string, questionId: string) => {
    return answers.find(
      a => a.residentId === residentId && a.questionId === questionId
    );
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
          <Button onClick={() => setIsQuestionDialogOpen(true)} size="sm">
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
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={answer?.completed || false}
                          onCheckedChange={() =>
                            handleToggleAnswer(resident._id, question.id)
                          }
                        />
                        <span className="text-sm">
                          {answer?.completed ? "✅ Complete" : "⏳ Pending"}
                        </span>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>

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
