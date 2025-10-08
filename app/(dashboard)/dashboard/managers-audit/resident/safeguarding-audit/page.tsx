"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, UserPlus, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Resident } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAge } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type ActionPlan = {
  id: string;
  note: string;
  assignedTo: string;
  dueDate: string;
  priority: string;
};

export default function SafeguardingAuditPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const { data: session } = authClient.useSession();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  const [auditData, setAuditData] = useState<Record<string, {
    date: string;
    completed: string;
    careNeedsReviewed: string;
    safeguardingConcerns: string;
    comment: string;
  }>>({});

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

  const handleDateChange = (residentId: string, date: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        date
      }
    }));
  };

  const handleCompletedChange = (residentId: string, completed: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        completed
      }
    }));
  };

  const handleCareNeedsReviewedChange = (residentId: string, careNeedsReviewed: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        careNeedsReviewed
      }
    }));
  };

  const handleSafeguardingConcernsChange = (residentId: string, safeguardingConcerns: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        safeguardingConcerns
      }
    }));
  };

  const handleCommentChange = (residentId: string, comment: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        comment
      }
    }));
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
    // TODO: Save audit data to database
    console.log("Audit Data:", auditData);
    console.log("Action Plans:", actionPlans);
    router.back();
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/managers-audit?tab=resident')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">
            Residents Audit {activeTeam?.name && `• ${activeTeam.name}`}
          </p>
          <h1 className="text-xl font-bold">Safeguarding Audit</h1>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50">
              <TableHead className="h-11 text-xs font-medium w-[230px]">Name</TableHead>
              <TableHead className="h-11 text-xs font-medium w-[130px]">Date</TableHead>
              <TableHead className="h-11 text-xs font-medium w-[180px]">All Risk Assessment Completed</TableHead>
              <TableHead className="h-11 text-xs font-medium w-[180px]">Care Needs Reviewed</TableHead>
              <TableHead className="h-11 text-xs font-medium w-[200px]">Are there any safeguarding concerns?</TableHead>
              <TableHead className="h-11 text-xs font-medium">Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!residents || residents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {!activeTeamId ? "Please select a team" : "No residents found for this team"}
                </TableCell>
              </TableRow>
            ) : (
              residents.map((resident, index) => {
                const residentId = resident._id;
                const data = auditData[residentId] || {
                  date: "",
                  completed: "",
                  careNeedsReviewed: "",
                  safeguardingConcerns: "",
                  comment: ""
                };

                const name = `${resident.firstName} ${resident.lastName}`;
                const initials = `${resident.firstName?.[0] || ''}${resident.lastName?.[0] || ''}`.toUpperCase();
                const age = getAge(resident.dateOfBirth);

                return (
                  <TableRow key={residentId} className="hover:bg-muted/30 border-b last:border-0">
                    <TableCell className="h-14">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={resident.imageUrl} alt={name} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-normal text-foreground">{name}</span>
                          <span className="text-[11px] text-muted-foreground">{age} years old</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="h-14">
                      <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                        <Input
                          type="date"
                          value={data.date}
                          onChange={(e) => handleDateChange(residentId, e.target.value)}
                          className="h-auto text-[13px] border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </Badge>
                    </TableCell>
                    <TableCell className="h-14">
                      <Select
                        value={data.completed}
                        onValueChange={(value) => handleCompletedChange(residentId, value)}
                      >
                        <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                          {data.completed ? (
                            <Badge
                              variant="secondary"
                              className={`text-[13px] px-2 py-0.5 h-6 font-normal ${
                                data.completed === "compliant" ? "bg-green-100 text-green-700" :
                                data.completed === "non-compliant" ? "bg-red-100 text-red-700" :
                                data.completed === "not-applicable" ? "bg-black text-white" :
                                "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              <SelectValue />
                            </Badge>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">Select</span>
                          )}
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
                      <Select
                        value={data.careNeedsReviewed}
                        onValueChange={(value) => handleCareNeedsReviewedChange(residentId, value)}
                      >
                        <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                          {data.careNeedsReviewed ? (
                            <Badge
                              variant="secondary"
                              className={`text-[13px] px-2 py-0.5 h-6 font-normal ${
                                data.careNeedsReviewed === "compliant" ? "bg-green-100 text-green-700" :
                                data.careNeedsReviewed === "non-compliant" ? "bg-red-100 text-red-700" :
                                data.careNeedsReviewed === "not-applicable" ? "bg-black text-white" :
                                "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              <SelectValue />
                            </Badge>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">Select</span>
                          )}
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
                      <Select
                        value={data.safeguardingConcerns}
                        onValueChange={(value) => handleSafeguardingConcernsChange(residentId, value)}
                      >
                        <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                          {data.safeguardingConcerns ? (
                            <Badge
                              variant="secondary"
                              className={`text-[13px] px-2 py-0.5 h-6 font-normal ${
                                data.safeguardingConcerns === "compliant" ? "bg-green-100 text-green-700" :
                                data.safeguardingConcerns === "non-compliant" ? "bg-red-100 text-red-700" :
                                data.safeguardingConcerns === "not-applicable" ? "bg-black text-white" :
                                "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              <SelectValue />
                            </Badge>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">Select</span>
                          )}
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
                        placeholder="Add comment..."
                        value={data.comment}
                        onChange={(e) => handleCommentChange(residentId, e.target.value)}
                        className="min-h-[36px] text-[13px] resize-none border-0"
                        rows={1}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
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
        <Button onClick={handleSubmit} className="bg-black text-white hover:bg-black/90">
          Complete Audit
        </Button>
      </div>
    </div>
  );
}
