"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CareoAuditItem, AuditFormData } from "./types";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, Calendar, User, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AUDIT_QUESTIONS, getQuestionsBySection } from "./questions";

interface SectionIssue {
  _id: Id<"sectionIssues">;
  residentId: Id<"residents">;
  section: string;
  title: string;
  description?: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high";
  assigneeId?: Id<"users">;
  dueDate?: number;
  createdAt: number;
  updatedAt?: number;
}

interface AuditQuestion {
  questionId: string;
  section: string;
  question: string;
  sectionOrder: number;
  questionOrder: number;
}

interface AuditData {
  questionId: string;
  status?: "compliant" | "non-compliant" | "n/a";
  comments?: string;
}

interface CommentInputProps {
  initialValue: string;
  onSave: (value: string) => void;
}

function CommentInput({ initialValue, onSave }: CommentInputProps) {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (value !== initialValue) {
      onSave(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="w-48 flex items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Add comment..."
        className="w-full h-9 text-sm border border-gray-200 rounded px-3 hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-colors bg-white"
      />
    </div>
  );
}

interface CareoAuditTableProps {
  residentId: Id<"residents">;
  auditData: Record<string, AuditData>; // questionId -> audit data
  onStatusChange: (questionId: string, status: "compliant" | "non-compliant" | "n/a") => void;
  onCommentChange: (questionId: string, comment: string) => void;
  onCreateIssue?: (issueData: {
    title: string;
    assignee?: Id<"users">;
    dueDate?: string;
    priority?: "low" | "medium" | "high";
    description?: string;
  }) => void;
  sectionIssue?: SectionIssue | null;
  staffMembers?: Array<{id: string; name: string; photo?: string}>;
  currentSection?: string;
  isLoading?: boolean;
}

export function CareoAuditTable({
  residentId,
  auditData,
  onStatusChange,
  onCommentChange,
  onCreateIssue,
  sectionIssue,
  staffMembers = [],
  currentSection,
  isLoading = false,
}: CareoAuditTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  // Issue creation state
  const [issueForm, setIssueForm] = React.useState({
    title: "",
    assignee: "",
    dueDate: "",
    priority: "" as "low" | "medium" | "high" | "",
    description: ""
  });

  // Initialize form with existing issue data
  React.useEffect(() => {
    if (sectionIssue) {
      setIssueForm({
        title: sectionIssue.title,
        assignee: sectionIssue.assigneeId || "",
        dueDate: sectionIssue.dueDate ? new Date(sectionIssue.dueDate).toISOString().split('T')[0] : "",
        priority: sectionIssue.priority || "",
        description: sectionIssue.description || ""
      });
    } else {
      setIssueForm({
        title: "",
        assignee: "",
        dueDate: "",
        priority: "",
        description: ""
      });
    }
  }, [sectionIssue]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-700 border-red-200";
      case "in-progress": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "resolved": return "bg-green-100 text-green-700 border-green-200";
      case "closed": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Get template questions for current section
  const sectionQuestions = React.useMemo(() => {
    if (!currentSection) return [];
    return getQuestionsBySection(currentSection);
  }, [currentSection]);

  // Combine template questions with resident-specific audit data
  const combinedData = React.useMemo(() => {
    return sectionQuestions.map(question => ({
      questionId: question.questionId,
      question: question.question,
      section: question.section,
      status: auditData[question.questionId]?.status,
      comments: auditData[question.questionId]?.comments || "",
    }));
  }, [sectionQuestions, auditData]);

  const getStatusText = (status?: "compliant" | "non-compliant" | "n/a") => {
    switch (status) {
      case "compliant":
        return <span className="text-sm font-medium text-green-600">Compliant</span>;
      case "non-compliant":
        return <span className="text-sm font-medium text-red-600">Non-Compliant</span>;
      case "n/a":
        return <span className="text-sm font-medium text-gray-600">N/A</span>;
      case undefined:
        return <span className="text-sm font-medium text-gray-400">-</span>;
      default:
        return <span className="text-sm font-medium text-gray-400">-</span>;
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "question",
      header: "Audit Question",
      size: 400,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="max-w-md pr-4 flex items-center">
            <div className="text-sm leading-normal text-gray-900 break-words whitespace-normal font-semibold">
              {item.question}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 120,
      cell: ({ row }) => {
        const status = row.getValue("status") as "compliant" | "non-compliant" | "n/a" | undefined;
        const questionId = row.original.questionId;

        return (
          <div className="w-32 flex items-center">
            <Select
              key={`${questionId}-${status}`}
              value={status || ""}
              onValueChange={(newStatus: "compliant" | "non-compliant" | "n/a") => {
                console.log(`Status change for ${questionId}: ${status} -> ${newStatus}`);
                onStatusChange(questionId, newStatus);
              }}
            >
              <SelectTrigger className="w-32 h-9 text-sm border-gray-200 bg-white">
                <SelectValue placeholder="Select status">
                  {status ? getStatusText(status) : <span className="text-gray-400">Select status</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-50" position="popper" sideOffset={4}>
                <SelectItem value="compliant">
                  <span className="text-sm font-medium text-green-600">Compliant</span>
                </SelectItem>
                <SelectItem value="non-compliant">
                  <span className="text-sm font-medium text-red-600">Non-Compliant</span>
                </SelectItem>
                <SelectItem value="n/a">
                  <span className="text-sm font-medium text-gray-600">N/A</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    {
      accessorKey: "comments",
      header: "Comments",
      size: 180,
      cell: ({ row }) => {
        const comment = row.getValue("comments") as string || "";
        const questionId = row.original.questionId;

        return (
          <CommentInput
            key={questionId}
            initialValue={comment}
            onSave={(value) => onCommentChange(questionId, value)}
          />
        );
      },
    },
  ];

  const table = useReactTable({
    data: combinedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      {currentSection && (
        <div className="flex items-center justify-between flex-shrink-0 mb-4">
          <h3 className="text-lg font-semibold">{currentSection}</h3>
          <div className="text-sm text-gray-600">
            {combinedData.length} questions
          </div>
        </div>
      )}

      {/* Table Container - Takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-b border-gray-200">
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id} className="text-sm font-semibold text-gray-700 py-2 px-3 bg-gray-50">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row, index) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={`hover:bg-gray-50 border-b border-gray-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2 px-3 align-middle">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-gray-500"
                      >
                        {currentSection
                          ? `No audit items found for ${currentSection}.`
                          : "No audit items found for this resident."
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* CareO Slip - Sticky at bottom */}
        {onCreateIssue && currentSection && (
          <div className="flex-shrink-0 bg-white border-t">
            <Card className="shadow-none mb-0 border-0 rounded-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    {sectionIssue ? 'CareO Slip' : 'CareO Slip'} - {currentSection}
                  </div>
                  {sectionIssue && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(sectionIssue.status)}`}>
                      {sectionIssue.status.charAt(0).toUpperCase() + sectionIssue.status.slice(1)}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="space-y-3">
                  {/* First Row */}
                  <div className="grid grid-cols-6 gap-3">
                    {/* Title */}
                    <div className="col-span-6 sm:col-span-4">
                      <Input
                        placeholder="Issue title..."
                        value={issueForm.title}
                        onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Create Button */}
                    <div className="col-span-6 sm:col-span-2">
                      <Button
                        onClick={() => {
                          if (issueForm.title.trim()) {
                            onCreateIssue({
                              title: issueForm.title,
                              assignee: issueForm.assignee ? issueForm.assignee as Id<"users"> : undefined,
                              dueDate: issueForm.dueDate || undefined,
                              priority: issueForm.priority || undefined,
                              description: issueForm.description || undefined,
                            });
                            // Only reset form if creating new issue
                            if (!sectionIssue) {
                              setIssueForm({
                                title: "",
                                assignee: "",
                                dueDate: "",
                                priority: "",
                                description: ""
                              });
                            }
                          }
                        }}
                        disabled={!issueForm.title.trim()}
                        className="w-full h-8 text-sm"
                        size="sm"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {sectionIssue ? 'Update CareO Slip' : 'Create CareO Slip'}
                      </Button>
                    </div>
                  </div>

                  {/* Second Row */}
                  <div className="grid grid-cols-6 gap-3">
                    {/* Assignee */}
                    <div className="col-span-6 sm:col-span-2">
                      <Select value={issueForm.assignee} onValueChange={(value) => setIssueForm(prev => ({ ...prev, assignee: value }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {staffMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {member.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div className="col-span-3 sm:col-span-2">
                      <Select value={issueForm.priority} onValueChange={(value: "low" | "medium" | "high") => setIssueForm(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Low
                            </span>
                          </SelectItem>
                          <SelectItem value="medium">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              Medium
                            </span>
                          </SelectItem>
                          <SelectItem value="high">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              High
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-3 sm:col-span-2">
                      <Input
                        type="date"
                        value={issueForm.dueDate}
                        onChange={(e) => setIssueForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="Due date"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}