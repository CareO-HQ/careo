"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState } from "react";
import { ActionPlanFormData, AuditItem, AuditStatus, Priority } from "./types";
import { staffMembers } from "./mock-data";

const statusColorMap: Record<AuditStatus, string> = {
  PENDING_AUDIT: "bg-red-100 text-red-800 hover:bg-red-100",
  ISSUE_ASSIGNED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  REASSIGNED: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  PENDING_VERIFICATION: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  AUDITED: "bg-green-100 text-green-800 hover:bg-green-100"
};

const priorityColorMap: Record<Priority, string> = {
  Low: "bg-green-100 text-green-800 hover:bg-green-100",
  Medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  High: "bg-red-100 text-red-800 hover:bg-red-100"
};

const formSchema = z.object({
  followUpNote: z.string().min(10, "Follow-up note must be at least 10 characters"),
  assignTo: z.string().min(1, "Please select a staff member"),
  priority: z.enum(["Low", "Medium", "High"] as const).optional(),
  dueDate: z.date({
    required_error: "Please select a due date"
  }).optional(),
  status: z.enum(["PENDING_AUDIT", "ISSUE_ASSIGNED", "REASSIGNED", "IN_PROGRESS", "PENDING_VERIFICATION", "AUDITED"] as const).optional()
});

interface ActionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditItem: AuditItem | null;
  onSubmit: (data: ActionPlanFormData) => void;
}

export function ActionPlanModal({
  open,
  onOpenChange,
  auditItem,
  onSubmit
}: ActionPlanModalProps) {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [assignToPopoverOpen, setAssignToPopoverOpen] = useState(false);

  const form = useForm<ActionPlanFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      followUpNote: "",
      assignTo: "",
      priority: undefined,
      dueDate: undefined,
      status: undefined
    }
  });

  // Reset form when auditItem changes or modal opens
  useEffect(() => {
    if (open && auditItem) {
      form.reset({
        followUpNote: auditItem.followUpNote || "",
        assignTo: auditItem.assignedTo || "",
        priority: auditItem.priority || undefined,
        dueDate: auditItem.dueDate ? new Date(auditItem.dueDate) : undefined,
        status: auditItem.status || undefined
      });
    } else if (!open) {
      form.reset();
    }
  }, [open, auditItem, form]);

  const handleSubmit = (data: ActionPlanFormData) => {
    onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  const statuses: { value: AuditStatus; label: string }[] = [
    { value: "ISSUE_ASSIGNED", label: "Issue assigned" },
    { value: "REASSIGNED", label: "Reassigned" }
  ];

  const priorities: { value: Priority; label: string }[] = [
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base font-semibold">Issue</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {auditItem ? `Update: ${auditItem.title}` : "Create issue"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="followUpNote"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium">Follow-up Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter follow-up notes..."
                      className="resize-none min-h-[60px] text-sm"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-wrap gap-2">
              <FormField
                control={form.control}
                name="assignTo"
                render={({ field }) => (
                  <FormItem>
                    <Popover modal open={assignToPopoverOpen} onOpenChange={setAssignToPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          {field.value || "Assign To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-1" align="start">
                        <div className="space-y-1">
                          {staffMembers.map((staff) => (
                            <Button
                              key={staff.id}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-7"
                              onClick={() => {
                                field.onChange(staff.name);
                                setAssignToPopoverOpen(false);
                              }}
                            >
                              {staff.name}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <Popover modal open={priorityPopoverOpen} onOpenChange={setPriorityPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          {field.value ? (
                            <Badge
                              variant="secondary"
                              className={`${priorityColorMap[field.value]} text-xs px-2 py-0`}
                            >
                              {field.value}
                            </Badge>
                          ) : (
                            "Priority"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-1" align="start">
                        <div className="space-y-1">
                          {priorities.map((priority) => (
                            <Button
                              key={priority.value}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-7"
                              onClick={() => {
                                field.onChange(priority.value);
                                setPriorityPopoverOpen(false);
                              }}
                            >
                              <Badge
                                variant="secondary"
                                className={`${priorityColorMap[priority.value]} text-xs`}
                              >
                                {priority.label}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <Popover modal open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          {field.value ? (
                            <Badge
                              variant="secondary"
                              className={`${statusColorMap[field.value]} text-xs px-2 py-0`}
                            >
                              {statuses.find(s => s.value === field.value)?.label}
                            </Badge>
                          ) : (
                            "Status"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="start">
                        <div className="space-y-1">
                          {statuses.map((status) => (
                            <Button
                              key={status.value}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-7"
                              onClick={() => {
                                field.onChange(status.value);
                                setStatusPopoverOpen(false);
                              }}
                            >
                              <Badge
                                variant="secondary"
                                className={`${statusColorMap[status.value]} text-xs`}
                              >
                                {status.label}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          {field.value ? (
                            format(field.value, "MMM d")
                          ) : (
                            "Due Date"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={(date) => {
                            field.onChange(date);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          defaultMonth={new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="text-xs text-muted-foreground/70">
              Created: {auditItem ? format(auditItem.createdDate, "MMM d") : format(new Date(), "MMM d")}
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8 px-3 text-sm"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-8 px-3 text-sm">
                Create Issue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}