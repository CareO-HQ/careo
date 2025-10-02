"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MessageSquare, UserPlus, Calendar, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type AuditDetailPageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

const auditItems = [
  "Care File – assessments, plans, reviews, consent",
  "Nutrition & Weight monitoring trends",
  "Wounds / Tissue Viability (≥ Grade 2 notifications)",
  "Falls – post-falls review + trend logging",
  "Restrictive Practices – oversight, reduction, resident-specific logs",
  "Medication administration errors/resident MAR chart audit",
  "Resident Experience – satisfaction surveys, meeting notes",
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

export default function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { id, itemId } = React.use(params);
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});
  const [assignedStaff, setAssignedStaff] = useState<Record<string, string>>({});
  const [dueDates, setDueDates] = useState<Record<string, string>>({});
  const [priorities, setPriorities] = useState<Record<string, string>>({});

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

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    // TODO: Save responses to database
    console.log("Responses:", responses);
    console.log("Notes:", questionNotes);
    console.log("Assigned Staff:", assignedStaff);
    console.log("Due Dates:", dueDates);
    console.log("Priorities:", priorities);
    router.back();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Resident Audit</p>
            <h1 className="text-2xl font-bold">{auditName}</h1>
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
      <div className="space-y-4">
        {careFileQuestions.map((q, index) => (
          <Card key={q.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-sm font-medium text-foreground flex-1 pt-0.5">
                  {q.question}
                </p>
              </div>

              <RadioGroup
                value={responses[q.id]}
                onValueChange={(value) => handleResponseChange(q.id, value)}
                className="flex flex-row items-center gap-6 pl-9"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${q.id}-yes`} />
                  <Label htmlFor={`${q.id}-yes`} className="font-normal cursor-pointer text-sm">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${q.id}-no`} />
                  <Label htmlFor={`${q.id}-no`} className="font-normal cursor-pointer text-sm">
                    No
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id={`${q.id}-partial`} />
                  <Label htmlFor={`${q.id}-partial`} className="font-normal cursor-pointer text-sm">
                    Partial
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="na" id={`${q.id}-na`} />
                  <Label htmlFor={`${q.id}-na`} className="font-normal cursor-pointer text-sm">
                    N/A
                  </Label>
                </div>
              </RadioGroup>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pl-9 pt-1">
                {/* Note */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge
                      variant={questionNotes[q.id] ? "default" : "secondary"}
                      className="cursor-pointer hover:opacity-80"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Note
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Add Note</Label>
                      <Textarea
                        placeholder="Add any notes or comments..."
                        value={questionNotes[q.id] || ""}
                        onChange={(e) => setQuestionNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="min-h-24 text-sm"
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Assign Staff */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge
                      variant={assignedStaff[q.id] ? "default" : "secondary"}
                      className="cursor-pointer hover:opacity-80"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Assign
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Assign to Staff</Label>
                      <Input
                        placeholder="Enter staff name"
                        value={assignedStaff[q.id] || ""}
                        onChange={(e) => setAssignedStaff(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Due Date */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge
                      variant={dueDates[q.id] ? "default" : "secondary"}
                      className="cursor-pointer hover:opacity-80"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Due Date
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Set Due Date</Label>
                      <Input
                        type="date"
                        value={dueDates[q.id] || ""}
                        onChange={(e) => setDueDates(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Priority */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge
                      variant={priorities[q.id] ? "default" : "secondary"}
                      className="cursor-pointer hover:opacity-80"
                    >
                      {priorities[q.id] ? (
                        <>
                          <span className={`w-2 h-2 rounded-full mr-1 ${
                            priorities[q.id] === 'low' ? 'bg-green-500' :
                            priorities[q.id] === 'medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></span>
                          {priorities[q.id].charAt(0).toUpperCase() + priorities[q.id].slice(1)}
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
                        onClick={() => setPriorities(prev => ({ ...prev, [q.id]: 'low' }))}
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        Low
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 px-3"
                        onClick={() => setPriorities(prev => ({ ...prev, [q.id]: 'medium' }))}
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                        Medium
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 px-3"
                        onClick={() => setPriorities(prev => ({ ...prev, [q.id]: 'high' }))}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                        High
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Submit Audit
        </Button>
      </div>
    </div>
  );
}
