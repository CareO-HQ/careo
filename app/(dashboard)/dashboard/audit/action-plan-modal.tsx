"use client";

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
import { useEffect } from "react";
import { ActionPlanFormData, AuditItem, AuditStatus, Priority } from "./types";
import { staffMembers } from "./mock-data";

const formSchema = z.object({
  followUpNote: z.string().min(10, "Follow-up note must be at least 10 characters"),
  assignTo: z.string().min(1, "Please select a staff member"),
  priority: z.enum(["Low", "Medium", "High"] as const),
  dueDate: z.date({
    required_error: "Please select a due date"
  }),
  status: z.enum(["NEW", "ACTION_PLAN", "IN_PROGRESS", "COMPLETED", "REVIEWED", "REASSIGN", "AUDITED"] as const)
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
  const form = useForm<ActionPlanFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      followUpNote: "",
      assignTo: "",
      priority: "Medium",
      dueDate: undefined,
      status: "NEW"
    }
  });

  // Reset form when auditItem changes or modal opens
  useEffect(() => {
    if (open && auditItem) {
      form.reset({
        followUpNote: auditItem.followUpNote || "",
        assignTo: auditItem.assignedTo || "",
        priority: auditItem.priority || "Medium",
        dueDate: auditItem.dueDate ? new Date(auditItem.dueDate) : undefined,
        status: auditItem.status || "NEW"
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
    { value: "NEW", label: "New" },
    { value: "ACTION_PLAN", label: "Action Plan" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "REVIEWED", label: "Reviewed" },
    { value: "REASSIGN", label: "Reassign" },
    { value: "AUDITED", label: "Audited" }
  ];

  const priorities: { value: Priority; label: string }[] = [
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Action Plan</DialogTitle>
          <DialogDescription>
            {auditItem ? `Create or update action plan for: ${auditItem.title}` : "Create an action plan"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="followUpNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter follow-up notes..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="assignTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.name}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-muted-foreground">
              Created Date: {auditItem ? format(auditItem.createdDate, "PPP") : format(new Date(), "PPP")}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Action Plan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}