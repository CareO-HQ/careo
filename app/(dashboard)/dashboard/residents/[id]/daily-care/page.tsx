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
  Home,
  Printer,
  Calendar,
  StickyNote,
  Plus,
  Eye
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

  // Get today's date and shift information
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  // Determine current shift: Day (8 AM - 8 PM) or Night (8 PM - 8 AM)
  const currentShift = (currentHour >= 8 && currentHour < 20) ? "Day" : "Night";
  const shiftDisplayName = currentShift === "Day" ? "Daily" : "Night";

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


  // Queries
  const todaysCareData = useQuery(api.personalCare.getDailyPersonalCare, {
    residentId: id as Id<"residents">,
    date: today,
    shift: currentShift,
  });

  // Mutations
  const createPersonalCareActivities = useMutation(api.personalCare.createPersonalCareActivities);
  const createDailyActivityRecord = useMutation(api.personalCare.createDailyActivityRecord);

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
      await createPersonalCareActivities({
        residentId: id as Id<"residents">,
        date: today,
        activities: data.activities,
        time: data.time,
        staff: data.staff,
        assistedStaff: data.assistedStaff,
        notes: data.notes,
        shift: currentShift,
      });

      // Clear form
      form.reset();
      toast.success("Personal care activities saved successfully");
    } catch (error) {
      console.error("Error saving personal care activities:", error);
      toast.error("Failed to save personal care activities");
    }
  };

  // Handle daily activity record submission
  const handleActivityRecordSubmit = async () => {
    if (!activityRecordStaff || !activityRecordTime) return;

    try {
      await createDailyActivityRecord({
        residentId: id as Id<"residents">,
        date: today,
        time: activityRecordTime,
        staff: activityRecordStaff,
        notes: activityRecordNotes || undefined,
      });

      // Clear form
      setActivityRecordStaff("");
      setActivityRecordTime("");
      setActivityRecordNotes("");
      toast.success("Daily activity record saved successfully");
    } catch (error) {
      console.error("Error saving daily activity record:", error);
      toast.error("Failed to save daily activity record");
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
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`;

  // Handle print functionality
  const handlePrint = () => {
    const printContent = document.getElementById('daily-report-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${shiftDisplayName} Report - ${fullName} (${today})</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
            .card { padding: 16px; border-radius: 8px; border: 1px solid; }
            .blue-card { background-color: #dbeafe; border-color: #bfdbfe; }
            .gray-card { background-color: #f9fafb; border-color: #e5e7eb; }
            .yellow-card { background-color: #fef3c7; border-color: #fde68a; }
            .title { font-weight: bold; margin-bottom: 8px; }
            .blue-text { color: #1e40af; }
            .gray-text { color: #374151; }
            .yellow-text { color: #92400e; }
            .small-text { font-size: 14px; }
            .badge { display: inline-block; background-color: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px; }
            .blue-badge { background-color: #dbeafe; color: #1e40af; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${shiftDisplayName} Report - ${fullName} (${today})</h1>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

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

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Daily Care</h1>
            <p className="text-muted-foreground text-sm">Care activities & dependencies</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching food-fluid pattern */}
      <Card className="border-0">
        <CardContent className="p-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => {/* TODO: Add Care Notes functionality */ }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
               <Plus className="w-4 h-4 mr-2" />
                Add Care Notes
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/daily-care/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                See All Records
              </Button>
        
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-15 h-15">
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
                <h3 className="font-semibold">{fullName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {/* TODO: Add Care Notes functionality */ }}
                className="bg-green-600 text-white hover:bg-green-700 hover:text-white "
              >
                <Plus className="w-4 h-4" />
                <span>Add Care Notes</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/daily-care/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                See All Records
              </Button>

        

          </div>
        </div>

        {/* Care Notes Section - Integrated into the card */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 mb-3">
            <StickyNote className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Care Notes</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
              Evening shower
            </Badge>
            <Badge className="bg-green-50 text-green-700 border-green-200">
              Independent when possible
            </Badge>
            <Badge className="bg-purple-50 text-purple-700 border-purple-200">
              Walking frame
            </Badge>
            <Badge className="bg-orange-50 text-orange-700 border-orange-200">
              Bed rails
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

      {/* Today's Personal Care */ }
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3 border rounded-md">
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
                            <FormLabel className="text-xs font-normal cursor-pointer">
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

          {/* Form Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <FormLabel className="text-sm font-medium">Primary Staff</FormLabel>
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
                    <FormLabel className="text-sm font-medium">Assisted By (optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select assisting staff..." />
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

            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
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
          </div>
        </form>
      </Form>
    </CardContent>
  </Card>

  {/* Daily Activity Record */ }
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Activity className="w-5 h-5 text-green-600" />
        <span>Daily Activity Record</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Activity Notes</Label>
          <Input
            placeholder="Enter activity details..."
            value={activityRecordNotes}
            onChange={(e) => setActivityRecordNotes(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Staff</Label>
          <Select value={activityRecordStaff} onValueChange={setActivityRecordStaff}>
            <SelectTrigger className="h-9">
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

        <div className="space-y-2">
          <Label className="text-sm font-medium">Time</Label>
          <Input
            type="time"
            value={activityRecordTime}
            onChange={(e) => setActivityRecordTime(e.target.value)}
            placeholder="Select time"
            className="h-9"
          />
        </div>

        <Button
          onClick={handleActivityRecordSubmit}
          disabled={!activityRecordStaff || !activityRecordTime}
          className="h-9 px-6"
        >
          Save Record
        </Button>
      </div>
    </CardContent>
  </Card>



  {/* Today's Daily Report */ }
  {
    todaysCareData && (
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span>{shiftDisplayName} Report - {fullName} ({today})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 px-3"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div id="daily-report-content" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="card blue-card p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="title font-semibold text-blue-800">Resident Information</h4>
                <p className="small-text text-sm text-blue-600">{fullName}</p>
                <p className="small-text text-sm text-blue-600">Room: {resident.roomNumber || 'Not assigned'}</p>
                <p className="small-text text-sm text-blue-600">
                  Date: {new Date(today).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="card gray-card p-4 rounded-lg bg-gray-50 border border-gray-200">
                <h4 className="title font-semibold text-gray-800">Personal Care</h4>
                <p className="small-text text-sm text-gray-600">
                  Total Activities: {todaysCareData.tasks.filter(task => task.taskType !== 'daily_activity_record').length}
                </p>
                <p className="small-text text-sm text-gray-600">
                  Completed: {todaysCareData.tasks.filter(task => task.taskType !== 'daily_activity_record' && task.status === 'completed').length}
                </p>
                <p className="small-text text-sm text-gray-600">
                  Records: {todaysCareData.tasks.filter(task => task.taskType === 'daily_activity_record').length}
                </p>
              </div>
            </div>
            <div className="card yellow-card p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="title font-semibold text-yellow-800 mb-2">Activity Records</h4>
              {todaysCareData.tasks && todaysCareData.tasks.length > 0 ? (
                <>
                  {todaysCareData.tasks.filter(task => task.taskType !== 'daily_activity_record').length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-yellow-700 mr-2">Personal Care Activities:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {todaysCareData.tasks
                          .filter(task => task.taskType !== 'daily_activity_record')
                          .map((task) => {
                            const activity = activityOptions.find(opt => opt.id === task.taskType);
                            const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string };
                            return (
                              <span key={task._id} className="badge inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                ✓ {activity?.label || task.taskType} {payload?.time && `(${payload.time})`}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}
                  {todaysCareData.tasks.filter(task => task.taskType === 'daily_activity_record').length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-yellow-700 mr-2">Daily Activity Records:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {todaysCareData.tasks
                          .filter(task => task.taskType === 'daily_activity_record')
                          .map((task) => {
                            const payload = task.payload as { time?: string; staff?: string };
                            return (
                              <span key={task._id} className="badge blue-badge inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                📝 {task.notes || 'Activity'} {payload?.time && `(${payload.time})`}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-yellow-700">No activities recorded yet for this shift.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

    </div >
  );
}