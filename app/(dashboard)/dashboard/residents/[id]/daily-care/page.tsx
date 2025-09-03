"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Activity,
  User,
  Bed,
  Home
} from "lucide-react";
import { useRouter } from "next/navigation";

type DailyCarePageProps = {
  params: Promise<{ id: string }>;
};

export default function DailyCarePage({ params }: DailyCarePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get today's date
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Form schema
  const PersonalCareSchema = z.object({
    activities: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: "You have to select at least one activity.",
    }),
    time: z.string().min(1, "Time is required"),
    staff: z.string().optional(),
    assistedStaff: z.string().optional(),
    notes: z.string().optional(),
  });

  // Form setup
  const form = useForm<z.infer<typeof PersonalCareSchema>>({
    resolver: zodResolver(PersonalCareSchema),
    defaultValues: {
      activities: [],
      time: "",
      staff: "",
      assistedStaff: "",
      notes: "",
    },
  });

  // Daily Activity Record state variables
  const [activityRecordStaff, setActivityRecordStaff] = React.useState("");
  const [activityRecordTime, setActivityRecordTime] = React.useState("");
  const [activityRecordNotes, setActivityRecordNotes] = React.useState("");


  // Mutations
  const updatePersonalCareTask = useMutation(api.personalCare.updatePersonalCareTask);

  // Define activity options
  const activityOptions = [
    { id: "bath", label: "Bath/Shower" },
    { id: "dressed", label: "Dressed/Changed Clothes" },
    { id: "brushed", label: "Teeth Brushed/Dentures Cleaned" },
    { id: "hair_care", label: "Hair Care/Combed" },
    { id: "shaved", label: "Shaved" },
    { id: "nails_care", label: "Nail Care" },
    { id: "mouth_care", label: "Oral Care/Mouthwash" },
    { id: "toileting", label: "Toileting" },
    { id: "continence", label: "Continence Support (Pad Change)" },
    { id: "skin_care", label: "Skin Care/Creams Applied" },
    { id: "pressure_relief", label: "Pressure Relief/Position Change" },
    { id: "Bed_changed", label: "Bed Cover Changed" }
  ] as const;
  const staffOptions = [
    { key: "john_smith", label: "John Smith" },
    { key: "sarah_jones", label: "Sarah Jones" },
    { key: "mike_wilson", label: "Mike Wilson" },
    { key: "emma_brown", label: "Emma Brown" },
    { key: "david_taylor", label: "David Taylor" },
  ];

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof PersonalCareSchema>) => {
    try {
      // Save each selected activity
      for (const activity of data.activities) {
        await updatePersonalCareTask({
          residentId: id as Id<"residents">,
          date: today,
          taskType: activity,
          status: "completed",
          timePeriod: "morning" as "morning" | "afternoon" | "evening" | "night",
          notes: data.notes || undefined,
        });
      }
      
      // Clear form
      form.reset();
      toast.success("Personal care activities saved successfully");
    } catch (error) {
      console.error("Error saving personal care task:", error);
      toast.error("Failed to save personal care activities");
    }
  };

  // Handle daily activity record submission
  const handleActivityRecordSubmit = async () => {
    if (!activityRecordStaff || !activityRecordTime) return;
    
    try {
      await updatePersonalCareTask({
        residentId: id as Id<"residents">,
        date: today,
        taskType: "daily_activity_record",
        status: "completed",
        timePeriod: "morning" as "morning" | "afternoon" | "evening" | "night",
        notes: activityRecordNotes || undefined,
      });
      
      // Clear form
      setActivityRecordStaff("");
      setActivityRecordTime("");
      setActivityRecordNotes("");
    } catch (error) {
      console.error("Error saving daily activity record:", error);
    }
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;


  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <span className="text-foreground">Daily Care</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4 flex-1">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">Daily Care</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Care activities & dependencies for {fullName}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={() => router.push(`/dashboard/residents/${id}/daily-care/documents`)}
            className="flex items-center space-x-2 justify-center"
          >
            <Bed className="w-4 h-4" />
            <span className="hidden sm:inline">Show All Documents</span>
            <span className="sm:hidden">Documents</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/residents/${id}`)}
            className="flex items-center space-x-2 justify-center"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Resident Page</span>
            <span className="sm:hidden">Resident</span>
          </Button>
        </div>
      </div>

      {/* Today's Personal Care */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Today&apos;s Personal Care</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Activities Section */}
              <FormField
                control={form.control}
                name="activities"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Activities</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3 ">
                      {activityOptions.map((activity) => (
                        <FormField
                          key={activity.id}
                          control={form.control}
                          name="activities"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(activity.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, activity.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== activity.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-normal cursor-pointer leading-tight">
                                  {activity.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Controls Row */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="staff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Staff</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select staff..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staffOptions.map((staff) => (
                              <SelectItem key={staff.key} value={staff.key}>
                                {staff.label}
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
                    name="assistedStaff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Staff Assisted (optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select assisted staff..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staffOptions.map((staff) => (
                              <SelectItem key={staff.key} value={staff.key}>
                                {staff.label}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-sm font-medium">Notes (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter notes..."
                          className="h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit"
                  className="h-9 px-6 w-full sm:w-auto"
                  size="sm"
                >
                  Save Activities
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Daily Activity Record */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-green-600" />
            <span>Daily Activity Record</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="grid grid-cols-2 sm:flex sm:gap-3 gap-3 w-full sm:w-auto">
            <div className="space-y-1 flex-1">
              <Label className="text-xs font-medium">Activity Notes</Label>
              <Input
                placeholder="Enter activity details..."
                value={activityRecordNotes}
                onChange={(e) => setActivityRecordNotes(e.target.value)}
                className="h-8"
              />
            </div>
            
              <div className="space-y-1">
                <Label className="text-xs font-medium">Staff</Label>
                <Select value={activityRecordStaff} onValueChange={setActivityRecordStaff}>
                  <SelectTrigger className="h-8 w-full sm:w-32">
                    <SelectValue placeholder="Select staff..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffOptions.map((staff) => (
                      <SelectItem key={staff.key} value={staff.key}>
                        {staff.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs font-medium">Time</Label>
                <Input
                  type="time"
                  value={activityRecordTime}
                  onChange={(e) => setActivityRecordTime(e.target.value)}
                  placeholder="Select time"
                  className="h-8 w-full sm:w-24"
                />
              </div>
            </div>
            
        
            <Button 
              onClick={handleActivityRecordSubmit}
              disabled={!activityRecordStaff || !activityRecordTime}
              className="h-8 text-xs px-4 w-full sm:w-auto"
              size="sm"
            >
              Save Record
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Care Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bed className="w-5 h-5 text-indigo-600" />
            <span>Care Notes & Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Personal Preferences</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Prefers shower in the evening</li>
                <li>• Likes to be independent when possible</li>
                <li>• Requires verbal encouragement</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Mobility Aids</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Uses walking frame for mobility</li>
                <li>• Requires non-slip mat in bathroom</li>
                <li>• Bed rails for safety</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

  
    </div>
  );
}