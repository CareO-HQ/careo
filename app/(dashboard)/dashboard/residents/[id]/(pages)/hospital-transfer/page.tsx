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
  Ambulance,
  User,
  Calendar,
  Clock,
  Plus,
  Eye,
  Phone,
  AlertTriangle,
  FileText,
  MapPin
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type HospitalTransferPageProps = {
  params: Promise<{ id: string }>;
};

// Hospital Transfer Schema
const HospitalTransferSchema = z.object({
  transferType: z.enum(["emergency", "planned", "urgent", "routine"]),
  reason: z.string().min(1, "Reason for transfer is required"),
  symptoms: z.string().optional(),
  vitalSigns: z.object({
    temperature: z.string().optional(),
    bloodPressure: z.string().optional(),
    pulse: z.string().optional(),
    respirations: z.string().optional(),
    oxygenSaturation: z.string().optional(),
  }).optional(),
  consciousness: z.enum(["alert", "confused", "drowsy", "unconscious"]).optional(),
  mobility: z.enum(["walking", "wheelchair", "stretcher", "bed"]).optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  nextOfKinContacted: z.boolean().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  gpContacted: z.boolean().optional(),
  gpName: z.string().optional(),
  gpPhone: z.string().optional(),
  hospitalName: z.string().min(1, "Hospital name is required"),
  ambulanceService: z.string().optional(),
  ambulanceTime: z.string().optional(),
  departureTime: z.string().optional(),
  accompanyingStaff: z.string().optional(),
  handoverNotes: z.string().optional(),
  personalItems: z.string().optional(),
  reportingStaff: z.string().min(1, "Reporting staff is required"),
  transferDate: z.string().min(1, "Transfer date is required"),
  transferTime: z.string().min(1, "Transfer time is required"),
});

type HospitalTransferFormData = z.infer<typeof HospitalTransferSchema>;

export default function HospitalTransferPage({ params }: HospitalTransferPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Form setup
  const form = useForm<HospitalTransferFormData>({
    resolver: zodResolver(HospitalTransferSchema),
    defaultValues: {
      transferType: "emergency",
      reason: "",
      symptoms: "",
      vitalSigns: {
        temperature: "",
        bloodPressure: "",
        pulse: "",
        respirations: "",
        oxygenSaturation: "",
      },
      consciousness: "alert",
      mobility: "walking",
      medications: "",
      allergies: "",
      nextOfKinContacted: false,
      nextOfKinName: "",
      nextOfKinPhone: "",
      gpContacted: false,
      gpName: "",
      gpPhone: "",
      hospitalName: "",
      ambulanceService: "",
      ambulanceTime: "",
      departureTime: "",
      accompanyingStaff: "",
      handoverNotes: "",
      personalItems: "",
      reportingStaff: "",
      transferDate: today,
      transferTime: "",
    },
  });

  // Dialog states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = React.useState(false);

  // Auth data
  const { data: user } = authClient.useSession();

  // Update staff field when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('reportingStaff', staffName);
    }
  }, [user, form]);

  // Mock mutations (you'll need to implement these in your Convex schema)
  // const createHospitalTransfer = useMutation(api.hospitalTransfers.createHospitalTransfer);
  // const getRecentTransfers = useQuery(api.hospitalTransfers.getRecentTransfers, {
  //   residentId: id as Id<"residents">
  // });

  const handleSubmit = async (data: HospitalTransferFormData) => {
    try {
      // Implement hospital transfer creation
      // await createHospitalTransfer({
      //   residentId: id as Id<"residents">,
      //   ...data,
      // });

      toast.success("Hospital transfer record created successfully");
      form.reset();
      setIsTransferDialogOpen(false);
    } catch (error) {
      console.error("Error creating hospital transfer record:", error);
      toast.error("Failed to create hospital transfer record");
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
        <span className="text-foreground">Hospital Transfer</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Ambulance className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Hospital Transfer</h1>
            <p className="text-muted-foreground text-sm">Emergency transfers & hospital admissions</p>
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
                  <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Emergency Ready
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsTransferDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Transfer
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
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
                  <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Emergency Ready
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsTransferDialogOpen(true)}
                className="bg-red-600 text-white hover:bg-red-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Record Transfer</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Transfer History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span>Emergency Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">GP Contact</span>
              </div>
              <p className="text-sm text-blue-800">
                {resident.gpName || "Not specified"}
              </p>
              <p className="text-xs text-blue-600">
                {resident.gpPhone || "No phone number"}
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Next of Kin</span>
              </div>
              <p className="text-sm text-green-800">
                {resident.emergencyContacts?.[0]?.name || "Not specified"}
              </p>
              <p className="text-xs text-green-600">
                {resident.emergencyContacts?.[0]?.phoneNumber || "No phone number"}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-900">NHS Number</span>
              </div>
              <p className="text-sm text-purple-800 font-mono">
                {resident.nhsHealthNumber || "Not specified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ambulance className="w-5 h-5 text-red-600" />
            <span>Transfer Recording</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setIsTransferDialogOpen(true)}
            >
              <Ambulance className="w-6 h-6 mr-3" />
              Record Hospital Transfer
            </Button>
            <Button
             className="h-16 text-lg bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
            >
              <Eye className="w-6 h-6 mr-3" />
              View Transfer History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>Recent Transfers</span>
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 ml-auto">
              Last 30 days
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mock data - replace with actual query results */}
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Ambulance className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 font-medium mb-2">No recent transfers</p>
            <p className="text-sm text-gray-500">
              No hospital transfers recorded for {fullName} in the last 30 days
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hospital Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Hospital Transfer for {fullName}</DialogTitle>
            <DialogDescription>
              Record detailed information about hospital transfer or emergency admission.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* Transfer Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-red-900">Transfer Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="transferDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transferTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transferType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transfer type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="routine">Routine</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hospitalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hospital/Destination</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter hospital name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-blue-900">Medical Information</h4>
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Transfer</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the reason for hospital transfer..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="symptoms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Symptoms</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe current symptoms and observations..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="consciousness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level of Consciousness</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select consciousness level..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="alert">Alert</SelectItem>
                            <SelectItem value="confused">Confused</SelectItem>
                            <SelectItem value="drowsy">Drowsy</SelectItem>
                            <SelectItem value="unconscious">Unconscious</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                              <SelectValue placeholder="Select mobility status..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="walking">Walking</SelectItem>
                            <SelectItem value="wheelchair">Wheelchair</SelectItem>
                            <SelectItem value="stretcher">Stretcher</SelectItem>
                            <SelectItem value="bed">Bed-bound</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Vital Signs */}
              <div className="space-y-4">
                <h4 className="font-medium text-green-900">Vital Signs</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="vitalSigns.temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature (°C)</FormLabel>
                        <FormControl>
                          <Input placeholder="36.5" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vitalSigns.bloodPressure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Pressure</FormLabel>
                        <FormControl>
                          <Input placeholder="120/80" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vitalSigns.pulse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pulse (bpm)</FormLabel>
                        <FormControl>
                          <Input placeholder="72" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vitalSigns.respirations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Respirations</FormLabel>
                        <FormControl>
                          <Input placeholder="16" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vitalSigns.oxygenSaturation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>O2 Sat (%)</FormLabel>
                        <FormControl>
                          <Input placeholder="98" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-purple-900">Contact Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="nextOfKinContacted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer">
                            Next of Kin Contacted
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('nextOfKinContacted') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <FormField
                        control={form.control}
                        name="nextOfKinName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next of Kin Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter name..." {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nextOfKinPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number..." {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="gpContacted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer">
                            GP Contacted
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('gpContacted') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <FormField
                        control={form.control}
                        name="gpName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GP Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter GP name..." {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gpPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GP Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter GP phone..." {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Additional Information</h4>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="medications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Medications</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List current medications..."
                            className="min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter known allergies..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="handoverNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handover Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Important information for hospital staff..."
                            className="min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Staff Information */}
              <FormField
                control={form.control}
                name="reportingStaff"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporting Staff Member</FormLabel>
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
                    setIsTransferDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  Record Hospital Transfer
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}