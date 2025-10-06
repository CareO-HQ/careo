"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon, Archive, Plus, UserPlus, AlertCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Resident } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { authClient } from "@/lib/auth-client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ActionPlan = {
  id: string;
  note: string;
  assignedTo: string;
  dueDate: string;
  priority: string;
};

export default function IndividualCareFileAuditPage() {
  const router = useRouter();
  const params = useParams();
  const residentId = params?.residentId as Id<"residents">;
  const { data: session } = authClient.useSession();

  const resident = useQuery(api.residents.getById, {
    residentId: residentId ?? "skip" as any
  }) as Resident | undefined;

  const [auditDate, setAuditDate] = useState<Date>(new Date());
  const auditorName = session?.user?.name || "Unknown Auditor";

  const questions = [
    "Is the care plan up to date and reviewed within the last month?",
    "Are all risk assessments completed and current?",
    "Is there evidence of family/next of kin involvement in care planning?",
    "Are all required consents and legal documentation in place?",
    "Is the resident's medication administration record (MAR) chart complete and accurate?",
    "Are daily care notes documented appropriately and signed?",
    "Is there evidence of regular health monitoring (weight, vital signs)?",
    "Are the resident's preferences and wishes clearly documented?",
    "Is there a record of all professional visits (GP, dentist, optician)?",
    "Are care file documents filed correctly and easily accessible?"
  ];

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<ActionPlan>({
    id: '',
    note: '',
    assignedTo: '',
    dueDate: '',
    priority: '',
  });

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleCommentChange = (questionIndex: number, comment: string) => {
    setComments(prev => ({ ...prev, [questionIndex]: comment }));
  };

  const openAddActionDialog = () => {
    setCurrentAction({
      id: Date.now().toString(),
      note: '',
      assignedTo: '',
      dueDate: '',
      priority: '',
    });
    setIsDialogOpen(true);
  };

  const saveActionPlan = () => {
    if (currentAction.note.trim()) {
      setActionPlans(prev => [...prev, currentAction]);
      setIsDialogOpen(false);
      setCurrentAction({
        id: '',
        note: '',
        assignedTo: '',
        dueDate: '',
        priority: '',
      });
    }
  };

  const removeActionPlan = (id: string) => {
    setActionPlans(prev => prev.filter(plan => plan.id !== id));
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSubmit = () => {
    console.log("Care File Audit submitted");
    router.push('/dashboard/managers-audit?tab=care-file');
  };

  if (!resident) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading resident information...</p>
        </div>
      </div>
    );
  }

  const name = `${resident.firstName} ${resident.lastName}`;
  const initials = getInitials(name);
  const age = getAge(resident.dateOfBirth);

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/managers-audit?tab=care-file')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Care File Audit</h1>
          <p className="text-sm text-muted-foreground">
            Individual Care File Audit
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/managers-audit/care-file/${residentId}/archived`)}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          Archived Audits
        </Button>
      </div>

      {/* Resident Info Card */}
      <div className="border rounded-lg p-6 mb-6 bg-card">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={resident.imageUrl} alt={name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-sm text-muted-foreground">{age} years old</p>
          </div>
        </div>
      </div>

      {/* Care File Audit Content */}
      <div className="border rounded-lg overflow-hidden bg-card mb-6">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Care File Audit Details</h3>
          <p className="text-sm text-muted-foreground">Complete the audit checklist for {name}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50">
              <TableHead className="h-11 w-12 text-xs font-medium">No</TableHead>
              <TableHead className="h-11 text-xs font-medium">Question</TableHead>
              <TableHead className="h-11 w-48 text-xs font-medium">Response</TableHead>
              <TableHead className="h-11 text-xs font-medium">Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question, index) => (
              <TableRow key={index} className="border-b last:border-0">
                <TableCell className="h-14 text-[13px] text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="h-14 text-[13px]">
                  {question}
                </TableCell>
                <TableCell className="h-14">
                  <Select
                    value={answers[index] || ''}
                    onValueChange={(value) => handleAnswerChange(index, value)}
                  >
                    <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                      <Badge
                        variant="secondary"
                        className={`text-[13px] px-2 py-0.5 h-6 font-normal ${
                          answers[index] === "compliant" ? "bg-green-100 text-green-700" :
                          answers[index] === "non-compliant" ? "bg-red-100 text-red-700" :
                          answers[index] === "not-applicable" ? "bg-black text-white" :
                          "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        <SelectValue placeholder="Select" />
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          Compliant
                        </Badge>
                      </SelectItem>
                      <SelectItem value="non-compliant">
                        <Badge variant="secondary" className="bg-red-100 text-red-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          Non Compliant
                        </Badge>
                      </SelectItem>
                      <SelectItem value="not-applicable">
                        <Badge variant="secondary" className="bg-black text-white text-[13px] px-2 py-0.5 h-6 font-normal">
                          Not Applicable
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="h-14">
                  <Textarea
                    value={comments[index] || ''}
                    onChange={(e) => handleCommentChange(index, e.target.value)}
                    placeholder="Add comment..."
                    className="text-[13px] min-h-[32px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={1}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Action Plan Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Action Plan</h2>
          <Button onClick={openAddActionDialog} size="sm" className="bg-black text-white hover:bg-black/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </div>

        {actionPlans.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 bg-gray-50 rounded-lg">
            No action plans added yet. Click &quot;Add Action&quot; to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {actionPlans.map((plan) => (
              <div key={plan.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{plan.note}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    {plan.assignedTo && (
                      <Badge variant="secondary" className="bg-gray-800 text-white">
                        <UserPlus className="w-3 h-3 mr-1" />
                        {plan.assignedTo}
                      </Badge>
                    )}
                    {plan.dueDate && (
                      <Badge variant="secondary" className="bg-gray-800 text-white">
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {format(new Date(plan.dueDate), "MMM d, yyyy")}
                      </Badge>
                    )}
                    {plan.priority && (
                      <Badge variant="secondary" className="bg-gray-800 text-white">
                        <span className={`w-2 h-2 rounded-full mr-1 ${
                          plan.priority === 'low' ? 'bg-green-500' :
                          plan.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></span>
                        {plan.priority.charAt(0).toUpperCase() + plan.priority.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeActionPlan(plan.id)}
                    className="text-destructive hover:text-destructive h-auto px-2 py-0.5 text-xs bg-red-100 border border-red-200"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="p-6 space-y-4">
            <Textarea
              placeholder="Action plan description..."
              value={currentAction.note}
              onChange={(e) => setCurrentAction(prev => ({ ...prev, note: e.target.value }))}
              className="min-h-24 border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-0 shadow-none"
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Assign to</Label>
                <Select
                  value={currentAction.assignedTo}
                  onValueChange={(value) => setCurrentAction(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                    <SelectItem value="Michael Chen">Michael Chen</SelectItem>
                    <SelectItem value="Emma Williams">Emma Williams</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 text-sm w-full justify-start text-left font-normal"
                    >
                      {currentAction.dueDate ? format(new Date(currentAction.dueDate), "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentAction.dueDate ? new Date(currentAction.dueDate) : undefined}
                      onSelect={(date) => setCurrentAction(prev => ({ ...prev, dueDate: date ? format(date, "yyyy-MM-dd") : '' }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select
                  value={currentAction.priority}
                  onValueChange={(value) => setCurrentAction(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveActionPlan} className="bg-black text-white hover:bg-black/90">
                Add Action
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Action Bar */}
      <div className="border-t pt-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Auditor:</span>
              <Badge variant="outline" className="bg-white text-foreground text-sm px-3 py-1 font-normal">
                {auditorName}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Audit Date:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-sm px-3 py-1 font-normal bg-white hover:bg-gray-50"
                  >
                    {format(auditDate, "dd/MM/yyyy")}
                    <CalendarIcon className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={auditDate}
                    onSelect={(date) => date && setAuditDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            className="bg-black text-white hover:bg-black/90"
          >
            Complete Audit
          </Button>
        </div>
      </div>
    </div>
  );
}
