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

// Single Vital Schema
const SingleVitalSchema = z.object({
  recordDate: z.string().min(1, "Record date is required"),
  recordTime: z.string().min(1, "Record time is required"),
  vitalType: z.enum([
    "temperature",
    "bloodPressure",
    "heartRate",
    "respiratoryRate",
    "oxygenSaturation",
    "weight",
    "height",
    "glucoseLevel",
    "painLevel"
  ]),
  value: z.string().min(1, "Value is required"),
  value2: z.string().optional(), // For blood pressure diastolic
  unit: z.string().optional(),
  notes: z.string().optional(),
  recordedBy: z.string().min(1, "Recorded by is required"),
});

type SingleVitalFormData = z.infer<typeof SingleVitalSchema>;

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
  const form = useForm<SingleVitalFormData>({
    resolver: zodResolver(SingleVitalSchema),
    defaultValues: {
      recordDate: today,
      recordTime: currentTime,
      vitalType: "temperature",
      value: "",
      value2: "",
      unit: "celsius",
      notes: "",
      recordedBy: "",
    },
  });

  // Vital type options with their properties
  const vitalTypeOptions = {
    temperature: { 
      label: "Temperature", 
      icon: Thermometer,
      units: [
        { value: "celsius", label: "°C" },
        { value: "fahrenheit", label: "°F" }
      ],
      placeholder: "36.5",
      color: "red"
    },
    bloodPressure: { 
      label: "Blood Pressure", 
      icon: Heart,
      units: [{ value: "mmHg", label: "mmHg" }],
      placeholder: "120",
      placeholder2: "80",
      color: "blue"
    },
    heartRate: { 
      label: "Heart Rate", 
      icon: Activity,
      units: [{ value: "bpm", label: "bpm" }],
      placeholder: "72",
      color: "green"
    },
    respiratoryRate: { 
      label: "Respiratory Rate", 
      icon: Wind,
      units: [{ value: "breaths/min", label: "breaths/min" }],
      placeholder: "16",
      color: "purple"
    },
    oxygenSaturation: { 
      label: "Oxygen Saturation", 
      icon: Droplets,
      units: [{ value: "percent", label: "%" }],
      placeholder: "98",
      color: "cyan"
    },
    weight: { 
      label: "Weight", 
      icon: TrendingUp,
      units: [
        { value: "kg", label: "kg" },
        { value: "lbs", label: "lbs" }
      ],
      placeholder: "70.5",
      color: "orange"
    },
    height: { 
      label: "Height", 
      icon: TrendingUp,
      units: [
        { value: "cm", label: "cm" },
        { value: "inches", label: "inches" }
      ],
      placeholder: "170",
      color: "indigo"
    },
    glucoseLevel: { 
      label: "Blood Sugar", 
      icon: Activity,
      units: [
        { value: "mg/dl", label: "mg/dl" },
        { value: "mmol/l", label: "mmol/l" }
      ],
      placeholder: "100",
      color: "pink"
    },
    painLevel: { 
      label: "Pain Level (0-10)", 
      icon: AlertTriangle,
      units: [{ value: "scale", label: "0-10 scale" }],
      placeholder: "0",
      color: "yellow"
    }
  };

  const [selectedVitalType, setSelectedVitalType] = React.useState<keyof typeof vitalTypeOptions>("temperature");

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

  // Vitals mutations and queries
  const createVitalsRecord = useMutation(api.healthMonitoring.createVitalRecord);
  const latestVitals = useQuery(api.healthMonitoring.getLatestVitals, {
    residentId: id as Id<"residents">
  });
  const recentVitals = useQuery(api.healthMonitoring.getRecentVitals, {
    residentId: id as Id<"residents">,
    limit: 7
  });

  const handleSubmit = async (data: SingleVitalFormData) => {
    try {
      await createVitalsRecord({
        residentId: id as Id<"residents">,
        ...data,
      });

      const vitalLabel = vitalTypeOptions[data.vitalType as keyof typeof vitalTypeOptions].label;
      toast.success(`${vitalLabel} recorded successfully`);
      
      // Reset form but keep date/time/recorded by
      form.reset({
        recordDate: data.recordDate,
        recordTime: data.recordTime,
        vitalType: "temperature",
        value: "",
        value2: "",
        unit: "celsius",
        notes: "",
        recordedBy: data.recordedBy,
      });
      
      // Keep dialog open for adding more vitals
      // setIsVitalsDialogOpen(false);
    } catch (error) {
      console.error("Error recording vital:", error);
      toast.error("Failed to record vital");
    }
  };

  // Handle vital type change
  React.useEffect(() => {
    const vitalType = form.watch("vitalType");
    if (vitalType && vitalTypeOptions[vitalType as keyof typeof vitalTypeOptions]) {
      const vital = vitalTypeOptions[vitalType as keyof typeof vitalTypeOptions];
      form.setValue("unit", vital.units[0].value);
      setSelectedVitalType(vitalType as keyof typeof vitalTypeOptions);
    }
  }, [form.watch("vitalType")]);

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

  // Helper function to format vital display
  const formatVitalValue = (vital: any) => {
    if (!vital) return "—";
    
    if (vital.vitalType === "bloodPressure" && vital.value2) {
      return `${vital.value}/${vital.value2} ${vital.unit || "mmHg"}`;
    }
    
    const unitDisplay = vital.unit ? 
      (vital.unit === "celsius" ? "°C" : 
       vital.unit === "fahrenheit" ? "°F" :
       vital.unit === "percent" ? "%" :
       vital.unit === "bpm" ? " bpm" :
       vital.unit === "breaths/min" ? "/min" :
       vital.unit) : "";
    
    return `${vital.value}${unitDisplay}`;
  };

  // Helper to get latest recorded time from vitals
  const getLatestRecordedTime = () => {
    if (!latestVitals) return null;
    
    const vitalsArray = Object.values(latestVitals);
    if (vitalsArray.length === 0) return null;
    
    const mostRecent = vitalsArray.reduce((latest: any, current: any) => {
      if (!latest) return current;
      const latestTime = new Date(`${latest.recordDate} ${latest.recordTime}`);
      const currentTime = new Date(`${current.recordDate} ${current.recordTime}`);
      return currentTime > latestTime ? current : latest;
    }, null);
    
    return mostRecent ? `${mostRecent.recordDate} ${mostRecent.recordTime}` : null;
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
            {getLatestRecordedTime() && (
              <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                {getLatestRecordedTime()}
              </Badge>
            )}
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Latest Vitals</span>
            </div>
            {getLatestRecordedTime() && (
              <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                {getLatestRecordedTime()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latestVitals || Object.keys(latestVitals).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No vitals recorded yet</p>
              <Button
                variant="outline"
                onClick={() => setIsVitalsDialogOpen(true)}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record First Vital
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <Thermometer className="w-5 h-5 text-red-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-red-600">
                  {formatVitalValue(latestVitals?.temperature)}
                </div>
                <p className="text-xs text-red-700">Temperature</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Heart className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-600">
                  {formatVitalValue(latestVitals?.bloodPressure)}
                </div>
                <p className="text-xs text-blue-700">Blood Pressure</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <Activity className="w-5 h-5 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-600">
                  {formatVitalValue(latestVitals?.heartRate)}
                </div>
                <p className="text-xs text-green-700">Heart Rate</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Wind className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-purple-600">
                  {formatVitalValue(latestVitals?.respiratoryRate)}
                </div>
                <p className="text-xs text-purple-700">Respiratory Rate</p>
              </div>
              <div className="text-center p-3 bg-pink-50 rounded-lg border border-pink-200">
                <Activity className="w-5 h-5 text-pink-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-pink-600">
                  {formatVitalValue(latestVitals?.glucoseLevel)}
                </div>
                <p className="text-xs text-pink-700">Blood Sugar</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <TrendingUp className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-orange-600">
                  {formatVitalValue(latestVitals?.weight)}
                </div>
                <p className="text-xs text-orange-700">Weight</p>
              </div>
            </div>
          )}
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
          {!recentVitals || recentVitals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No vitals history available</p>
              <Button
                variant="outline"
                onClick={() => setIsVitalsDialogOpen(true)}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record First Vital
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVitals.map((vital: any) => {
                const vitalIcon = vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions];
                const Icon = vitalIcon?.icon || Activity;
                const color = vitalIcon?.color || "gray";
                
                return (
                  <div key={vital._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-mono text-gray-600 min-w-[80px]">
                        {vital.recordDate}
                      </div>
                      <div className="text-sm font-mono text-gray-500">
                        {vital.recordTime}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 text-${color}-500`} />
                        <span className="font-medium">{vitalIcon?.label}:</span>
                        <span className="text-lg font-semibold">{formatVitalValue(vital)}</span>
                      </div>
                      {vital.notes && (
                        <span className="text-sm text-gray-500 italic">
                          Note: {vital.notes}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      by {vital.recordedBy}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

  

      {/* Record Vitals Dialog */}
      <Dialog open={isVitalsDialogOpen} onOpenChange={setIsVitalsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Vital for {fullName}</DialogTitle>
            <DialogDescription>
              Select a vital type and enter the measurement value.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="recordDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-9" />
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
                      <FormLabel className="text-sm">Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Vital Type Selection */}
              <FormField
                control={form.control}
                name="vitalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vital Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a vital to record..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(vitalTypeOptions).map(([key, vital]) => {
                          const Icon = vital.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center space-x-2">
                                <Icon className={`w-4 h-4 text-${vital.color}-600`} />
                                <span>{vital.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dynamic Value Input based on selected vital type */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                {(() => {
                  const currentVital = vitalTypeOptions[selectedVitalType];
                  const Icon = currentVital.icon;
                  
                  return (
                    <>
                      <div className="flex items-center space-x-2 mb-3">
                        <Icon className={`w-5 h-5 text-${currentVital.color}-600`} />
                        <span className="font-medium">{currentVital.label}</span>
                      </div>
                      
                      {selectedVitalType === "bloodPressure" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Systolic</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={currentVital.placeholder}
                                    {...field}
                                    className="h-9"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="value2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Diastolic</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={currentVital.placeholder2}
                                    {...field}
                                    className="h-9"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : (
                        <FormField
                          control={form.control}
                          name="value"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Value</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={currentVital.placeholder}
                                  {...field}
                                  type={selectedVitalType === "painLevel" ? "number" : "text"}
                                  min={selectedVitalType === "painLevel" ? "0" : undefined}
                                  max={selectedVitalType === "painLevel" ? "10" : undefined}
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Unit Selection */}
                      {currentVital.units.length > 1 && (
                        <FormField
                          control={form.control}
                          name="unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Unit</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {currentVital.units.map((unit) => (
                                    <SelectItem key={unit.value} value={unit.value}>
                                      {unit.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Optional Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes..."
                        className="min-h-[60px] resize-none"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Recorded By */}
              <FormField
                control={form.control}
                name="recordedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Recorded By</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        className="bg-gray-50 text-gray-600 h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsVitalsDialogOpen(false);
                    form.reset();
                  }}
                  className="text-gray-600"
                >
                  Done
                </Button>
                <div className="space-x-2">
                  <Button
                    type="submit"
                    variant="outline"
                    className="bg-white"
                  >
                    Save & Add Another
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => {
                      form.handleSubmit(handleSubmit)();
                      setIsVitalsDialogOpen(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Save & Close
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}