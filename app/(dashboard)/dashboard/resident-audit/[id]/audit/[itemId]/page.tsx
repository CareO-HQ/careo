"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Plus, UserPlus, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";

type AuditDetailPageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

const auditItems = [
  "Care File Audit",
  "Nutrition & Weight Audit",
  "Wounds / Tissue Viability Audit",
  "Incident and Accident Analysis",
  "Restrictive Practices Audit",
  "Medication administration errors/resident MAR chart audit",
  "Resident Experience / satisfaction surveys",
  "DNACPR Audit",
  "Choking Risk Audit",
  "Diet Notification Form Audit",
  "Post Fall Management Tracker",
  "Bedrail Audit",
  "Moving & Handling Audit",
  "DOLS Tracker",
  "Care Management Reviews",
  "Meaningful Activities Audit",
];

const careFileQuestions = [
  {
    id: "q1",
    question: "Is the care plan up to date and reviewed within the last 30 days?",
  },
  {
    id: "q2",
    question: "Are all assessments completed and signed by qualified staff?",
  },
  {
    id: "q3",
    question: "Is there documented evidence of resident/family consent for care?",
  },
  {
    id: "q4",
    question: "Are risk assessments (falls, pressure ulcers, nutrition) current?",
  },
  {
    id: "q5",
    question: "Is the care plan person-centered and reflect resident preferences?",
  },
  {
    id: "q6",
    question: "Are all care interventions documented clearly and consistently?",
  },
  {
    id: "q7",
    question: "Is there evidence of multidisciplinary team involvement?",
  },
  {
    id: "q8",
    question: "Are reviews conducted following any significant changes in condition?",
  },
  {
    id: "q9",
    question: "Is capacity assessment documented where applicable?",
  },
  {
    id: "q10",
    question: "Are advance care planning discussions documented?",
  },
];

type ActionPlan = {
  id: string;
  note: string;
  assignedTo: string;
  dueDate: string;
  priority: string;
};

export default function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { id, itemId } = React.use(params);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [auditDate, setAuditDate] = useState<Date>(new Date());
  const [currentAction, setCurrentAction] = useState<ActionPlan>({
    id: '',
    note: '',
    assignedTo: '',
    dueDate: '',
    priority: '',
  });

  const auditorName = session?.user?.name || "Unknown Auditor";

  // Get resident data
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Find the actual audit name from the list
  const decodedItemId = decodeURIComponent(itemId);
  const auditName = auditItems.find(item => {
    const slug = item.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
    return slug === decodedItemId;
  }) || decodedItemId;

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
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

  const handleSubmit = () => {
    // TODO: Save responses to database
    console.log("Responses:", responses);
    console.log("Action Plans:", actionPlans);
    console.log("Auditor:", auditorName);
    console.log("Audit Date:", auditDate);
    router.back();
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Resident Audit</p>
            <h1 className="text-xl font-bold">{auditName}</h1>
          </div>
        </div>

        {/* Resident Info */}
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={resident.imageUrl}
              alt={fullName}
              className="border"
            />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{fullName}</p>
            <p className="text-xs text-muted-foreground">Room {resident.roomNumber || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-2">
        {careFileQuestions.map((q, index) => (
          <div
            key={q.id}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
              responses[q.id] === 'compliant' ? 'bg-green-50 hover:bg-green-100' :
              responses[q.id] === 'non-compliant' ? 'bg-red-50 hover:bg-red-100' :
              responses[q.id] === 'na' ? 'bg-yellow-50 hover:bg-yellow-100' :
              'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-muted-foreground text-sm font-medium">{index + 1}.</span>
              <p className={`text-sm ${
                responses[q.id] === 'compliant' ? 'text-green-700' :
                responses[q.id] === 'non-compliant' ? 'text-red-700' :
                responses[q.id] === 'na' ? 'text-yellow-700' :
                'text-foreground'
              }`}>{q.question}</p>
            </div>

            <RadioGroup
              value={responses[q.id]}
              onValueChange={(value) => handleResponseChange(q.id, value)}
              className="flex flex-row items-center gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="compliant" id={`${q.id}-compliant`} className="border-green-600 text-green-600" />
                <Label htmlFor={`${q.id}-compliant`} className="font-normal cursor-pointer text-sm text-green-700">
                  Compliant
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non-compliant" id={`${q.id}-non-compliant`} className="border-red-600 text-red-600" />
                <Label htmlFor={`${q.id}-non-compliant`} className="font-normal cursor-pointer text-sm text-red-700">
                  Non Compliant
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="na" id={`${q.id}-na`} className="border-yellow-600 text-yellow-600" />
                <Label htmlFor={`${q.id}-na`} className="font-normal cursor-pointer text-sm text-yellow-700">
                  N/A
                </Label>
              </div>
            </RadioGroup>
          </div>
        ))}
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

            <div className="flex items-center gap-2 pt-2 border-t">
              {/* Assign Badge */}
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={`cursor-pointer hover:opacity-80 ${
                      currentAction.assignedTo ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    {currentAction.assignedTo || "Assign"}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-3"
                      onClick={() => setCurrentAction(prev => ({ ...prev, assignedTo: 'Sarah Johnson' }))}
                    >
                      Sarah Johnson
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-3"
                      onClick={() => setCurrentAction(prev => ({ ...prev, assignedTo: 'Michael Chen' }))}
                    >
                      Michael Chen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 px-3"
                      onClick={() => setCurrentAction(prev => ({ ...prev, assignedTo: 'Emma Williams' }))}
                    >
                      Emma Williams
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Due Date Badge */}
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={`cursor-pointer hover:opacity-80 ${
                      currentAction.dueDate ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {currentAction.dueDate ? format(new Date(currentAction.dueDate), "MMM d, yyyy") : "Due Date"}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={currentAction.dueDate ? new Date(currentAction.dueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setCurrentAction(prev => ({ ...prev, dueDate: format(date, 'yyyy-MM-dd') }));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Priority Badge */}
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={`cursor-pointer hover:opacity-80 ${
                      currentAction.priority ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {currentAction.priority ? (
                      <>
                        <span className={`w-2 h-2 rounded-full mr-1 ${
                          currentAction.priority === 'low' ? 'bg-green-500' :
                          currentAction.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></span>
                        {currentAction.priority.charAt(0).toUpperCase() + currentAction.priority.slice(1)}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Priority
                      </>
                    )}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 px-3"
                      onClick={() => setCurrentAction(prev => ({ ...prev, priority: 'low' }))}
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                      Low
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 px-3"
                      onClick={() => setCurrentAction(prev => ({ ...prev, priority: 'medium' }))}
                    >
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                      Medium
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 px-3"
                      onClick={() => setCurrentAction(prev => ({ ...prev, priority: 'high' }))}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                      High
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex-1"></div>

              <Button onClick={saveActionPlan} size="sm" className="bg-black text-white hover:bg-black/90">
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Auditor:</Label>
            <Badge variant="secondary" className="bg-gray-800 text-white">
              <UserPlus className="w-3 h-3 mr-1" />
              {auditorName}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Audit Date:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-6 px-2 text-xs">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {format(auditDate, "MMM d, yyyy")}
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
        <Button onClick={handleSubmit}>
          Complete Audit
        </Button>
      </div>
    </div>
  );
}
