"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  Calendar as CalendarIcon,
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TimePicker } from "@/components/ui/date-time-picker";

import { formatInTimeZone } from "date-fns-tz";

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

const UK_TIMEZONE = "Europe/London";

export default function HealthMonitoringPage({ params }: HealthMonitoringPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

  const [resident, setResident] = useState<any>(null);
  const [latestVitals, setLatestVitals] = useState<Record<string, any>>({});
  const [recentVitals, setRecentVitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get today's date in UK time
  const now = new Date();
  const today = formatInTimeZone(now, UK_TIMEZONE, 'yyyy-MM-dd');
  const currentTime = formatInTimeZone(now, UK_TIMEZONE, 'HH:mm');

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
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = React.useState(false);

  // Update staff field when user data loads
  React.useEffect(() => {
    if (profile) {
      const staffName = profile.name || profile.email?.split('@')[0] || "";
      form.setValue('recordedBy', staffName);
    }
  }, [profile, form]);

  const fetchData = useCallback(async () => {
    if (!id || !profile?.active_organization_id) return;
    setIsLoading(true);
    try {
      // Fetch Resident
      const { data: rData } = await supabase.from('residents').select('*').eq('id', id).single();
      if (rData) setResident(rData);

      // Fetch Recent Vitals
      const { data: vData } = await supabase
        .from('vitals')
        .select('*')
        .eq('resident_id', id)
        .order('record_date', { ascending: false })
        .order('record_time', { ascending: false })
        .limit(50);

      if (vData) {
        setRecentVitals(vData.slice(0, 10)); // Just strict recent

        // Process Latest per Type
        const latest: Record<string, any> = {};
        vData.forEach(v => {
          if (!latest[v.vital_type]) latest[v.vital_type] = {
            value: v.value,
            value2: v.value2,
            unit: v.unit,
            vitalType: v.vital_type,
            recordDate: v.record_date,
            recordTime: v.record_time
          };
        });
        setLatestVitals(latest);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [id, profile?.active_organization_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (data: SingleVitalFormData) => {
    if (!profile?.active_organization_id) {
      toast.error("Not authenticated");
      return;
    }

    try {
      const { error } = await supabase.from('vitals').insert({
        resident_id: id,
        organization_id: profile.active_organization_id,
        vital_type: data.vitalType,
        value: data.value,
        value2: data.value2,
        unit: data.unit,
        notes: data.notes,
        recorded_by: profile.id,
        record_date: data.recordDate,
        record_time: data.recordTime
      });

      if (error) throw error;

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

      // Keep dialog open for adding more vitals, or close if button clicked
      setIsVitalsDialogOpen(false);
      fetchData();

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

  // Helper function to format vital display
  const formatVitalValue = (vital: any) => {
    if (!vital) return "—";

    if (vital.vitalType === "bloodPressure" && vital.value2) {
      return `${vital.value}/${vital.value2} ${vital.unit || "mmHg"}`;
    }

    // Map unit if needed, otherwise use raw
    const unitDisplay = vital.unit === "celsius" ? "°C" :
      vital.unit === "fahrenheit" ? "°F" :
        vital.unit === "percent" ? "%" :
          vital.unit === "bpm" ? " bpm" :
            vital.unit === "breaths/min" ? "/min" :
              vital.unit || "";

    return `${vital.value}${unitDisplay}`;
  };

  const getLatestVitalValue = (vitalType: string) => {
    if (!latestVitals || !latestVitals[vitalType]) return "—";
    return formatVitalValue(latestVitals[vitalType]);
  };

  if (isLoading) return <div className="p-10 flex justify-center">Loading...</div>;
  if (!resident) return <div className="p-10 flex justify-center">Resident not found</div>;

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={resident.image_url} alt={fullName} className="border" />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Health & Monitoring</h1>
            <p className="text-muted-foreground text-sm">
              View vital signs and health tracking for {fullName}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button onClick={() => setIsVitalsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Record Vital
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/residents/${id}/health-monitoring/documents`)}>
              <Eye className="w-4 h-4 mr-2" /> View History
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Heart Rate</span>
                  <span className="text-lg font-bold">{getLatestVitalValue("heartRate")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Temperature</span>
                  <span className="text-lg font-bold">{getLatestVitalValue("temperature")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">BP</span>
                  <span className="text-lg font-bold">{getLatestVitalValue("bloodPressure")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">O2 Sat</span>
                  <span className="text-lg font-bold">{getLatestVitalValue("oxygenSaturation")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vitals List */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              <span>Recent Vitals</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {Object.keys(latestVitals).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No vitals recorded yet</p>
                <Button variant="outline" onClick={() => setIsVitalsDialogOpen(true)} className="mt-3">
                  <Plus className="w-4 h-4 mr-2" /> Record First Vital
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <Thermometer className="w-5 h-5 text-red-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-red-600">{formatVitalValue(latestVitals?.temperature)}</div>
                  <p className="text-xs text-red-700">Temperature</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Heart className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-blue-600">{formatVitalValue(latestVitals?.bloodPressure)}</div>
                  <p className="text-xs text-blue-700">Blood Pressure</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <Activity className="w-5 h-5 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-600">{formatVitalValue(latestVitals?.heartRate)}</div>
                  <p className="text-xs text-green-700">Heart Rate</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Wind className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-purple-600">{formatVitalValue(latestVitals?.respiratoryRate)}</div>
                  <p className="text-xs text-purple-700">Respiratory Rate</p>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <Activity className="w-5 h-5 text-pink-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-pink-600">{formatVitalValue(latestVitals?.glucoseLevel)}</div>
                  <p className="text-xs text-pink-700">Blood Sugar</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <TrendingUp className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-orange-600">{formatVitalValue(latestVitals?.weight)}</div>
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
              <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 ml-auto">History</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentVitals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No vitals history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVitals.map((vital: any) => {
                  const vitalIcon = vitalTypeOptions[vital.vital_type as keyof typeof vitalTypeOptions];
                  const Icon = vitalIcon?.icon || Activity;
                  const color = vitalIcon?.color || "gray";

                  return (
                    <div key={vital.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-mono text-gray-600 min-w-[80px]">{vital.record_date}</div>
                        <div className="text-sm font-mono text-gray-500">{vital.record_time}</div>
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 text-${color}-500`} />
                          <span className="font-medium">{vitalIcon?.label || vital.vital_type}:</span>
                          <span className="text-lg font-semibold">{formatVitalValue({
                            ...vital,
                            vitalType: vital.vital_type
                          })}</span>
                        </div>
                        {vital.notes && <span className="text-sm text-gray-500 italic">Note: {vital.notes}</span>}
                      </div>
                      {/* Placeholder for recorded_by name resolution if needed, or use profile name from insertion time equivalent */}
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
              <DialogDescription>Select a vital type and enter the measurement value.</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="recordDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm">Date</FormLabel>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" type="button" className={cn("h-9 w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => { if (date) field.onChange(format(date, "yyyy-MM-dd")); }}
                            disabled={(date) => date > new Date()}
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                  />
                  <FormField control={form.control} name="recordTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Time</FormLabel>
                      <FormControl><TimePicker value={field.value} onChange={field.onChange} className="h-9" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                  />
                </div>

                {/* Vital Type Selection */}
                <FormField control={form.control} name="vitalType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vital Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Choose a vital..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(vitalTypeOptions).map(([key, vital]) => {
                          const Icon = vital.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center space-x-2"><Icon className={`w-4 h-4 text-${vital.color}-600`} /><span>{vital.label}</span></div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
                />

                {/* Dynamic Value Input */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="font-medium">{vitalTypeOptions[selectedVitalType].label}</span>
                  </div>
                  {selectedVitalType === "bloodPressure" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="value" render={({ field }) => (
                        <FormItem><FormLabel className="text-sm">Systolic</FormLabel><FormControl><Input placeholder="120" {...field} className="h-9" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="value2" render={({ field }) => (
                        <FormItem><FormLabel className="text-sm">Diastolic</FormLabel><FormControl><Input placeholder="80" {...field} className="h-9" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  ) : (
                    <FormField control={form.control} name="value" render={({ field }) => (
                      <FormItem><FormLabel className="text-sm">Value</FormLabel><FormControl><Input placeholder={vitalTypeOptions[selectedVitalType].placeholder} {...field} className="h-9" /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}

                  {vitalTypeOptions[selectedVitalType].units.length > 1 && (
                    <FormField control={form.control} name="unit" render={({ field }) => (
                      <FormItem><FormLabel className="text-sm">Unit</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl><SelectContent>{vitalTypeOptions[selectedVitalType].units.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select></FormItem>
                    )} />
                  )}
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm">Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Add notes..." className="min-h-[60px] resize-none" {...field} /></FormControl></FormItem>
                )} />

                {/* Recorded By */}
                <FormField control={form.control} name="recordedBy" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm">Recorded By</FormLabel><FormControl><Input {...field} disabled className="bg-gray-50 text-gray-600 h-9" /></FormControl></FormItem>
                )} />

                <div className="flex justify-between pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={() => { setIsVitalsDialogOpen(false); form.reset(); }}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
                </div>

              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}