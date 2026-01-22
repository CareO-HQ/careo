"use client";

import React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDateTimePicker } from "@/components/ui/date-time-picker";
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
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Create Appointment Schema
const CreateAppointmentSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters long")
    .max(100, "Title must be under 100 characters"),
  description: z
    .string()
    .max(500, "Description can be up to 500 characters")
    .optional(),
  startTime: z
    .string()
    .min(1, "Start time is required"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(200, "Location must be under 200 characters"),
  staffId: z
    .string()
    .optional(),
});

interface CreateAppointmentFormProps {
  residentId: string;
  residentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAppointmentForm({
  residentId,
  residentName,
  isOpen,
  onClose
}: CreateAppointmentFormProps) {
  const [createAppointmentLoading, setCreateAppointmentLoading] = React.useState(false);

  // Auth data
  const { activeOrganizationId } = useActiveTeam();
  const { profile } = useProfile();

  // Get all users for staff selection (using enriched members to get roles and filtering)
  const allUsers = useQuery(api.users.getEnrichedOrgMembers,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Helper to format role name
  const formatRole = (role?: string) => {
    if (!role) return "";
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Create Appointment Form setup
  const createAppointmentForm = useForm<z.infer<typeof CreateAppointmentSchema>>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      location: "",
      staffId: "none",
    },
  });

  // Mutations
  const createAppointment = useMutation(api.appointments.createAppointment);

  // Get other staff (excluding current user) for assisted staff dropdown
  const otherStaffOptions = allUsers?.filter((u: any) => u.user?.email !== profile?.email).map((u: any) => ({
    key: u.user.id || u.id,
    label: `${u.user.name} (${formatRole(u.role)})`,
    email: u.user.email,
    id: u.user.id, // Store ID if needed, but currently form uses email or id? Form schema says staffId string
    // Schema says staffId: z.string().optional()
    // Original code used u.email in value={staff.email}. But update used u.key=u.name
    // Let's stick to using what the backend expects. appointments.ts creates appointment with staffId: v.optional(v.string())
    // Is it expecting an ID or an Email?
    // In createAppointment mutation: staffId: v.optional(v.string())
    // Let's check appointments.ts handler:
    // It doesn't use staffId for logic much, just stores it.
    // However, notifications use it? No, notifications use senderId.
    // Let's preserve the existing behavior: value={staff.email}
  })) || [];

  // Handle create appointment submission
  const onCreateAppointmentSubmit = async (data: z.infer<typeof CreateAppointmentSchema>) => {
    if (!profile || !activeOrganizationId) {
      toast.error("Authentication required");
      return;
    }

    setCreateAppointmentLoading(true);
    try {
      await createAppointment({
        residentId: residentId as Id<"residents">,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        location: data.location,
        staffId: data.staffId === "none" ? undefined : data.staffId,
        organizationId: activeOrganizationId,
        teamId: activeOrganizationId, // Using organization ID as team ID for now
        createdBy: profile.id,
      });

      toast.success("Appointment created successfully");
      createAppointmentForm.reset();
      onClose();
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Failed to create appointment");
    } finally {
      setCreateAppointmentLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Appointment for {residentName}</DialogTitle>
          <DialogDescription>
            Schedule a new appointment for this resident.
          </DialogDescription>
        </DialogHeader>

        <Form {...createAppointmentForm}>
          <form onSubmit={createAppointmentForm.handleSubmit(onCreateAppointmentSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={createAppointmentForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Appointment Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Doctor Visit, Physical Therapy"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={createAppointmentForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Additional details about the appointment"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <FormField
              control={createAppointmentForm.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Date & Time</FormLabel>
                  <FormControl>
                    <FormDateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      dateLabel="Date"
                      timeLabel="Time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={createAppointmentForm.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., General Hospital, Room 205"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Staff Assignment */}
            <FormField
              control={createAppointmentForm.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Staff</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No staff assigned</SelectItem>
                      {otherStaffOptions.length > 0 ? (
                        otherStaffOptions.map((staff) => (
                          <SelectItem key={staff.key} value={staff.email}>
                            {staff.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_staff" disabled>
                          No other staff available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  createAppointmentForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAppointmentLoading}>
                {createAppointmentLoading ? "Creating..." : "Create Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}