"use client";

import React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  endTime: z
    .string()
    .min(1, "End time is required"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(200, "Location must be under 200 characters"),
  staffId: z
    .string()
    .optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return new Date(data.endTime) > new Date(data.startTime);
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
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

  // Get all users for staff selection
  const allUsers = useQuery(api.user.getAllUsers);

  // Auth data
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

  // Create Appointment Form setup
  const createAppointmentForm = useForm<z.infer<typeof CreateAppointmentSchema>>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
      staffId: "none",
    },
  });

  // Mutations
  const createAppointment = useMutation(api.appointments.createAppointment);

  // Get other staff (excluding current user) for assisted staff dropdown
  const otherStaffOptions = allUsers?.filter(u => u.email !== user?.user?.email).map(u => ({
    key: u.name,
    label: u.name,
    email: u.email
  })) || [];

  // Handle create appointment submission
  const onCreateAppointmentSubmit = async (data: z.infer<typeof CreateAppointmentSchema>) => {
    if (!user || !activeOrganization) {
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
        endTime: data.endTime,
        location: data.location,
        staffId: data.staffId === "none" ? undefined : data.staffId,
        organizationId: activeOrganization.id,
        teamId: activeOrganization.id, // Using organization ID as team ID for now
        createdBy: user.user.id,
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
                  <FormLabel>Description (optional)</FormLabel>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={createAppointmentForm.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date & Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createAppointmentForm.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date & Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location */}
            <FormField
              control={createAppointmentForm.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
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
                  <FormLabel>Assigned Staff (optional)</FormLabel>
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