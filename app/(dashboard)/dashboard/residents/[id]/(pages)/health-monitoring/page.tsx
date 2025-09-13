"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
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
import { Textarea } from "@/components/ui/textarea";
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
  Stethoscope,
  User,
  Calendar,
  Clock,
  Plus,
  Eye,
  Heart,
  Thermometer,
  Activity,
  Wind,
  Droplets,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type HealthMonitoringPageProps = {
  params: Promise<{ id: string }>;
};

// Vitals Schema
const VitalsSchema = z.object({
  recordDate: z.string().min(1, "Record date is required"),
  recordTime: z.string().min(1, "Record time is required"),
  temperature: z.string().optional(),
  temperatureUnit: z.enum(["celsius", "fahrenheit"]).optional(),
  bloodPressureSystolic: z.string().optional(),
  bloodPressureDiastolic: z.string().optional(),
  heartRate: z.string().optional(),
  respiratoryRate: z.string().optional(),
  oxygenSaturation: z.string().optional(),
  weight: z.string().optional(),
  weightUnit: z.enum(["kg", "lbs"]).optional(),
  height: z.string().optional(),
  heightUnit: z.enum(["cm", "inches"]).optional(),
  glucoseLevel: z.string().optional(),
  glucoseUnit: z.enum(["mg/dl", "mmol/l"]).optional(),
  painLevel: z.string().optional(), // 0-10 scale
  consciousnessLevel: z.enum(["alert", "drowsy", "confused", "unresponsive"]).optional(),
  mobility: z.enum(["independent", "assisted", "wheelchair", "bedbound"]).optional(),
  skinCondition: z.enum(["normal", "dry", "moist", "hot", "cold", "clammy"]).optional(),
  generalObservations: z.string().optional(),
  concernsOrAlerts: z.string().optional(),
  recordedBy: z.string().min(1, "Recorded by is required"),
});

type VitalsFormData = z.infer<typeof VitalsSchema>;

export default function HealthMonitoringPage({ params }: HealthMonitoringPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().slice(0, 5);

  // Form setup
  const form = useForm<VitalsFormData>({
    resolver: zodResolver(VitalsSchema),
    defaultValues: {
      recordDate: today,
      recordTime: currentTime,
      temperature: "",
      temperatureUnit: "celsius",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      weight: "",
      weightUnit: "kg",
      height: "",
      heightUnit: "cm",
      glucoseLevel: "",
      glucoseUnit: "mg/dl",
      painLevel: "",
      consciousnessLevel: "alert",
      mobility: "independent",
      skinCondition: "normal",
      generalObservations: "",
      concernsOrAlerts: "",
      recordedBy: "",
    },
  });

  // Dialog states
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = React.useState(false);

  // Auth data
  const { data: user } = authClient.useSession();

  // Update staff field when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('recordedBy', staffName);
    }
  }, [user, form]);

  // Mock mutations (you'll need to implement these in your Convex schema)
  // const createVitalsRecord = useMutation(api.healthMonitoring.createVitalsRecord);
  // const getRecentVitals = useQuery(api.healthMonitoring.getRecentVitals, {
  //   residentId: id as Id<"residents">
  // });

  const handleSubmit = async (data: VitalsFormData) => {
    try {
      // Implement vitals record creation
      // await createVitalsRecord({
      //   residentId: id as Id<"residents">,
      //   ...data,
      // });

      toast.success("Vitals recorded successfully");
      form.reset();
      setIsVitalsDialogOpen(false);
    } catch (error) {
      console.error("Error recording vitals:", error);
      toast.error("Failed to record vitals");
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

  const calculateLengthOfStay = (admissionDate: string) => {
    const today = new Date();
    const admission = new Date(admissionDate);
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  // Mock vitals data
  const mockLatestVitals = {
    temperature: "36.8°C",
    bloodPressure: "125/80",
    heartRate: "72 bpm",
    respiratoryRate: "16/min",
    oxygenSaturation: "98%",
    weight: "70.5 kg",
    recordedAt: "2024-01-15 09:30",
    recordedBy: "Staff Member"
  };

  const mockVitalsHistory = [
    {
      id: 1,
      date: "2024-01-15",
      time: "09:30",
      temperature: "36.8°C",
      bloodPressure: "125/80",
      heartRate: "72",
      oxygenSaturation: "98%",
      status: "normal"
    },
    {
      id: 2,
      date: "2024-01-14",
      time: "09:15",
      temperature: "36.9°C",
      bloodPressure: "128/82",
      heartRate: "74",
      oxygenSaturation: "97%",
      status: "normal"
    },
    {
      id: 3,
      date: "2024-01-13",
      time: "09:45",
      temperature: "37.2°C",
      bloodPressure: "130/85",
      heartRate: "78",
      oxygenSaturation: "96%",
      status: "attention"
    }
  ];

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
        <span className="text-foreground">Health & Monitoring</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Stethoscope className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Health & Monitoring</h1>
            <p className="text-muted-foreground text-sm">Vital signs & health tracking</p>
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
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    Vitals
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsVitalsDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Vitals
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/health-monitoring/documents`)}
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
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    Health Monitoring
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsVitalsDialogOpen(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Record Vitals</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/health-monitoring/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Vitals Overview */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Latest Vitals</span>
            </div>
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
              {mockLatestVitals.recordedAt}
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Latest Vitals</span>
            </div>
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
              {mockLatestVitals.recordedAt}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <Thermometer className="w-5 h-5 text-red-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-red-600">
                {mockLatestVitals.temperature}
              </div>
              <p className="text-xs text-red-700">Temperature</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Heart className="w-5 h-5 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-600">
                {mockLatestVitals.bloodPressure}
              </div>
              <p className="text-xs text-blue-700">Blood Pressure</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <Activity className="w-5 h-5 text-green-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-600">
                {mockLatestVitals.heartRate}
              </div>
              <p className="text-xs text-green-700">Heart Rate</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Wind className="w-5 h-5 text-purple-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-purple-600">
                {mockLatestVitals.respiratoryRate}
              </div>
              <p className="text-xs text-purple-700">Respiratory Rate</p>
            </div>
            <div className="text-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
              <Droplets className="w-5 h-5 text-cyan-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-cyan-600">
                {mockLatestVitals.oxygenSaturation}
              </div>
              <p className="text-xs text-cyan-700">O2 Saturation</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <TrendingUp className="w-5 h-5 text-orange-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-orange-600">
                {mockLatestVitals.weight}
              </div>
              <p className="text-xs text-orange-700">Weight</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Vitals History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>Recent Vitals</span>
            <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 ml-auto">
              Last 7 days
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockVitalsHistory.map((vital) => (
              <div key={vital.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-mono text-gray-600 min-w-[80px]">
                    {vital.date}
                  </div>
                  <div className="text-sm font-mono text-gray-500">
                    {vital.time}
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center space-x-1">
                      <Thermometer className="w-4 h-4 text-red-500" />
                      <span>{vital.temperature}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Heart className="w-4 h-4 text-blue-500" />
                      <span>{vital.bloodPressure}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Activity className="w-4 h-4 text-green-500" />
                      <span>{vital.heartRate} bpm</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Droplets className="w-4 h-4 text-cyan-500" />
                      <span>{vital.oxygenSaturation}</span>
                    </span>
                  </div>
                </div>
                <div>
                  <Badge 
                    variant="outline" 
                    className={vital.status === "normal" 
                      ? "bg-green-50 border-green-200 text-green-700" 
                      : "bg-orange-50 border-orange-200 text-orange-700"
                    }
                  >
                    {vital.status === "normal" ? "Normal" : "Attention"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Monitoring Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
            <span>Health Monitoring Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setIsVitalsDialogOpen(true)}
            >
              <Plus className="w-6 h-6 mr-3" />
              Record New Vitals
            </Button>
            <Button
             className="h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push(`/dashboard/residents/${id}/health-monitoring/documents`)}
            >
              <Eye className="w-6 h-6 mr-3" />
              View Complete History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Record Vitals Dialog */}
      <Dialog open={isVitalsDialogOpen} onOpenChange={setIsVitalsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Vitals for {fullName}</DialogTitle>
            <DialogDescription>
              Record comprehensive vital signs and health observations.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recordDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Record Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recordTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Record Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Vital Signs */}
              <div className="space-y-4">
                <h4 className="font-medium text-emerald-900">Vital Signs</h4>
                
                {/* Temperature */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature</FormLabel>
                        <FormControl>
                          <Input placeholder="36.5" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperatureUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="celsius">°C (Celsius)</SelectItem>
                            <SelectItem value="fahrenheit">°F (Fahrenheit)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Blood Pressure */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bloodPressureSystolic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Systolic BP</FormLabel>
                        <FormControl>
                          <Input placeholder="120" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bloodPressureDiastolic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diastolic BP</FormLabel>
                        <FormControl>
                          <Input placeholder="80" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Other Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="heartRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heart Rate (bpm)</FormLabel>
                        <FormControl>
                          <Input placeholder="72" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="respiratoryRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Respiratory Rate</FormLabel>
                        <FormControl>
                          <Input placeholder="16" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="oxygenSaturation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>O2 Saturation (%)</FormLabel>
                        <FormControl>
                          <Input placeholder="98" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Physical Measurements */}
              <div className="space-y-4">
                <h4 className="font-medium text-blue-900">Physical Measurements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input placeholder="70.5" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weightUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lbs">lbs</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Clinical Observations */}
              <div className="space-y-4">
                <h4 className="font-medium text-purple-900">Clinical Observations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="painLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pain Level (0-10)</FormLabel>
                        <FormControl>
                          <Input placeholder="0" min="0" max="10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consciousnessLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consciousness Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="alert">Alert</SelectItem>
                            <SelectItem value="drowsy">Drowsy</SelectItem>
                            <SelectItem value="confused">Confused</SelectItem>
                            <SelectItem value="unresponsive">Unresponsive</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobility Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mobility..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="independent">Independent</SelectItem>
                            <SelectItem value="assisted">Assisted</SelectItem>
                            <SelectItem value="wheelchair">Wheelchair</SelectItem>
                            <SelectItem value="bedbound">Bedbound</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="skinCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skin Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="dry">Dry</SelectItem>
                            <SelectItem value="moist">Moist</SelectItem>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="cold">Cold</SelectItem>
                            <SelectItem value="clammy">Clammy</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="generalObservations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Observations</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter general observations about the resident's condition..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="concernsOrAlerts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concerns or Alerts</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any concerns or alerts that need attention..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Staff Information */}
              <FormField
                control={form.control}
                name="recordedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recorded By</FormLabel>
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

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsVitalsDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Record Vitals
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}