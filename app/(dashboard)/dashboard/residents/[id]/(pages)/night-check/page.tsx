"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Moon,
  Calendar,
  Clock,
  Plus,
  Eye,
  ChevronDown,
  BedDouble,
  ShieldCheck,
  Home,
  StickyNote,
  RotateCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge as BadgeComponent } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type NightCheckPageProps = {
  params: Promise<{ id: string }>;
};

// Night Check Schema
const NightCheckSchema = z.object({
  checkTime: z.string().min(1, "Check time is required"),
  position: z.enum(["left_side", "right_side", "back", "sitting_up"]),
  breathing: z.enum(["normal", "shallow", "irregular", "difficulty"]),
  skin_condition: z.enum(["normal", "dry", "moist", "clammy", "hot", "cold"]),
  comfort_level: z.enum(["comfortable", "restless", "agitated", "peaceful"]),
  continence_check: z.boolean().optional(),
  pad_changed: z.boolean().optional(),
  repositioned: z.boolean().optional(),
  covers_adjusted: z.boolean().optional(),
  medication_given: z.boolean().optional(),
  medication_details: z.string().optional(),
  observations: z.string().optional(),
  staff: z.string().min(1, "Staff name is required"),
});

type NightCheckFormData = z.infer<typeof NightCheckSchema>;

export default function NightCheckPage({ params }: NightCheckPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });


  // Form setup
  const form = useForm<NightCheckFormData>({
    resolver: zodResolver(NightCheckSchema),
    defaultValues: {
      checkTime: "",
      position: "left_side",
      breathing: "normal",
      skin_condition: "normal",
      comfort_level: "comfortable",
      continence_check: false,
      pad_changed: false,
      repositioned: false,
      covers_adjusted: false,
      medication_given: false,
      medication_details: "",
      observations: "",
      staff: "",
    },
  });

  // Dialog states
  const [isNightCheckDialogOpen, setIsNightCheckDialogOpen] = React.useState(false);

  // Auth data
  const { data: user } = authClient.useSession();

  // Update staff field when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('staff', staffName);
    }
  }, [user, form]);

  // Mock mutations (you'll need to implement these in your Convex schema)
  // const createNightCheck = useMutation(api.nightChecks.createNightCheck);
  // const getTodaysNightChecks = useQuery(api.nightChecks.getTodaysNightChecks, {
  //   residentId: id as Id<"residents">,
  //   date: today
  // });

  const handleSubmit = async (data: NightCheckFormData) => {
    try {
      // Implement night check creation
      // await createNightCheck({
      //   residentId: id as Id<"residents">,
      //   ...data,
      //   date: today,
      // });

      toast.success("Night check recorded successfully");
      form.reset();
      setIsNightCheckDialogOpen(false);
    } catch (error) {
      console.error("Error recording night check:", error);
      toast.error("Failed to record night check");
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
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
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

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
        <span className="text-foreground">Night Check</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Moon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Night Check</h1>
            <p className="text-muted-foreground text-sm">Night monitoring & wellness checks</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching daily-care pattern */}
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
                  <BadgeComponent variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </BadgeComponent>
                  <BadgeComponent variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <Moon className="w-3 h-3 mr-1" />
                    Night Shift
                  </BadgeComponent>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsNightCheckDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Night Check
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/night-check/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
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
                  <BadgeComponent variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </BadgeComponent>
                  <BadgeComponent variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </BadgeComponent>
                  <BadgeComponent variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <Moon className="w-3 h-3 mr-1" />
                    Night Shift
                  </BadgeComponent>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsNightCheckDialogOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Record Night Check</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/night-check/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Night Check Entry Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Moon className="w-5 h-5 text-blue-600" />
            <span>Night Check Recording</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsNightCheckDialogOpen(true)}
            >
              <Moon className="w-6 h-6 mr-3" />
              Record Night Check
            </Button>
            <Button
             className="h-16 text-lg bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => router.push(`/dashboard/residents/${id}/night-check/documents`)}
            >
              <Eye className="w-6 h-6 mr-3" />
              View Night Check History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Night Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>Tonight&apos;s Checks</span>
            <BadgeComponent variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 ml-auto">
              {new Date().toLocaleDateString()}
            </BadgeComponent>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mock data - replace with actual query results */}
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Moon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 font-medium mb-2">No night checks recorded yet</p>
            <p className="text-sm text-gray-500">
              Start recording {fullName}&apos;s night checks using the button above
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Night Check Dialog */}
      <Dialog open={isNightCheckDialogOpen} onOpenChange={setIsNightCheckDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Night Check for {fullName}</DialogTitle>
            <DialogDescription>
              Record night monitoring observations and care activities.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* Time and Staff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <FormLabel>Staff Member</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled
                          className="bg-gray-50 text-gray-600"
                          placeholder="Current user"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Observations */}
              <div className="space-y-4">
                <h4 className="font-medium">Observations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select position..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="left_side">Left Side</SelectItem>
                            <SelectItem value="right_side">Right Side</SelectItem>
                            <SelectItem value="back">Back</SelectItem>
                            <SelectItem value="sitting_up">Sitting Up</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="breathing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Breathing</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select breathing..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="shallow">Shallow</SelectItem>
                            <SelectItem value="irregular">Irregular</SelectItem>
                            <SelectItem value="difficulty">Difficulty</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="skin_condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skin Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select skin condition..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="dry">Dry</SelectItem>
                            <SelectItem value="moist">Moist</SelectItem>
                            <SelectItem value="clammy">Clammy</SelectItem>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="cold">Cold</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comfort_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comfort Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select comfort level..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="comfortable">Comfortable</SelectItem>
                            <SelectItem value="restless">Restless</SelectItem>
                            <SelectItem value="agitated">Agitated</SelectItem>
                            <SelectItem value="peaceful">Peaceful</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Care Activities */}
              <div className="space-y-4">
                <h4 className="font-medium">Care Activities</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="continence_check"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          Continence Check
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pad_changed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          Pad Changed
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repositioned"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          Repositioned
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="covers_adjusted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          Covers Adjusted
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medication_given"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          Medication Given
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('medication_given') && (
                  <FormField
                    control={form.control}
                    name="medication_details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medication Details</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter medication details..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Additional Observations */}
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Observations</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter any additional observations..."
                        {...field}
                      />
                    </FormControl>
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
                    setIsNightCheckDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Night Check
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}