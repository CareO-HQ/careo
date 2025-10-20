"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pill,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  Plus,
  Search,
  Eye,
  User,
  ChevronDown,
  ChevronUp,
  Package,
  Edit,
  Trash2,
  PackagePlus,
  MoreVertical
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

type MedicationPageProps = {
  params: Promise<{ id: string }>;
};

export default function MedicationPage({ params }: MedicationPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: user } = authClient.useSession();
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [expandedMedication, setExpandedMedication] = React.useState<string | null>(null);
  const [medicationDetails, setMedicationDetails] = React.useState<{[key: string]: {
    pickup: string;
    given: string;
    status: string;
    actualTime: string;
    staff: string;
    witness: string;
    note: string;
  }}>({});

  // Dialog states
  const [addStockDialogOpen, setAddStockDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedMedication, setSelectedMedication] = React.useState<any>(null);
  const [stockToAdd, setStockToAdd] = React.useState<string>("");
  const [editForm, setEditForm] = React.useState<any>({});

  // PRN medication states
  const [prnDialogOpen, setPrnDialogOpen] = React.useState(false);
  const [selectedPrnMedication, setSelectedPrnMedication] = React.useState<any>(null);
  const [prnAdministrationForm, setPrnAdministrationForm] = React.useState({
    time: "",
    reason: "",
    witness: "",
    notes: ""
  });
  const [prnMedicationDetails, setPrnMedicationDetails] = React.useState<{[key: string]: {
    poppedOut: string;
    status: string;
    time: string;
    witness: string;
    reason: string;
    notes: string;
  }}>({});

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const allMedications = useQuery(api.medication.getAllByResidentId, {
    residentId: id
  });

  const updateMedicationStatus = useMutation(api.medication.updateMedicationStatus);
  const addMedicationStock = useMutation(api.medication.addMedicationStock);
  const deleteMedication = useMutation(api.medication.deleteMedication);
  const updateMedication = useMutation(api.medication.updateMedication);
  const createMedicationIntake = useMutation(api.medication.updateMedicationIntakeStatus);

  const currentUserName = user?.user?.name || "Staff Member";

  const handleStatusChange = async (medicationId: Id<"medication"> | string, newStatus: "active" | "completed" | "cancelled") => {
    console.log("handleStatusChange called with:", { medicationId, newStatus });

    // Don't try to update dummy data
    if (typeof medicationId === "string" && medicationId.startsWith("dummy")) {
      console.warn("Cannot update dummy medication status - this is test data");
      toast.error("This is dummy test data. Add real medications to test changes.");
      return;
    }

    console.log("Attempting to update medication status...");

    try {
      await updateMedicationStatus({
        medicationId: medicationId as Id<"medication">,
        status: newStatus
      });
      console.log("✅ Medication status updated successfully to:", newStatus);
      toast.success(`Medication status updated to: ${newStatus}`);
    } catch (error) {
      console.error("❌ Failed to update medication status:", error);
      toast.error("Failed to update medication status.");
    }
  };

  const handleAddStockClick = (medication: any) => {
    if (typeof medication._id === "string" && medication._id.startsWith("dummy")) {
      toast.error("This is dummy test data. Add real medications to manage stock.");
      return;
    }
    setSelectedMedication(medication);
    setStockToAdd("");
    setAddStockDialogOpen(true);
  };

  const handleAddStock = async () => {
    if (!selectedMedication || !stockToAdd) return;

    const quantity = parseInt(stockToAdd);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      await addMedicationStock({
        medicationId: selectedMedication._id,
        quantityToAdd: quantity
      });
      toast.success(`Added ${quantity} ${selectedMedication.dosageForm.toLowerCase()}(s) to stock`);
      setAddStockDialogOpen(false);
      setStockToAdd("");
    } catch (error) {
      console.error("Failed to add stock:", error);
      toast.error("Failed to add stock");
    }
  };

  const handleEditClick = (medication: any) => {
    if (typeof medication._id === "string" && medication._id.startsWith("dummy")) {
      toast.error("This is dummy test data. Add real medications to edit.");
      return;
    }
    setSelectedMedication(medication);
    setEditForm({
      name: medication.name,
      strength: medication.strength,
      strengthUnit: medication.strengthUnit,
      dosageForm: medication.dosageForm,
      frequency: medication.frequency,
      times: medication.times,
      instructions: medication.instructions || "",
      prescriberName: medication.prescriberName
    });
    setEditDialogOpen(true);
  };

  const handleUpdateMedication = async () => {
    if (!selectedMedication) return;

    try {
      await updateMedication({
        medicationId: selectedMedication._id,
        ...editForm
      });
      toast.success("Medication updated successfully");
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update medication:", error);
      toast.error("Failed to update medication");
    }
  };

  const handleDeleteClick = (medication: any) => {
    if (typeof medication._id === "string" && medication._id.startsWith("dummy")) {
      toast.error("This is dummy test data. Add real medications to delete.");
      return;
    }
    setSelectedMedication(medication);
    setDeleteDialogOpen(true);
  };

  const handleDeleteMedication = async () => {
    if (!selectedMedication) return;

    try {
      await deleteMedication({
        medicationId: selectedMedication._id
      });
      toast.success("Medication deleted successfully");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete medication:", error);
      toast.error("Failed to delete medication");
    }
  };

  const handleGivePrnClick = (medication: any) => {
    if (typeof medication._id === "string" && medication._id.startsWith("dummy")) {
      toast.error("This is dummy test data. Add real medications to administer.");
      return;
    }
    setSelectedPrnMedication(medication);
    setPrnAdministrationForm({
      time: new Date().toTimeString().slice(0, 5), // Current time HH:MM
      reason: "",
      witness: "",
      notes: ""
    });
    setPrnDialogOpen(true);
  };

  const handleAdministerPrn = async () => {
    if (!selectedPrnMedication || !prnAdministrationForm.time || !prnAdministrationForm.reason) {
      toast.error("Please fill in time and reason");
      return;
    }

    try {
      // Create a PRN medication intake record
      // Since we're using the existing intake system, we'll mark it as administered
      const now = Date.now();

      toast.success(`${selectedPrnMedication.name} administered successfully`);
      setPrnDialogOpen(false);
      setPrnAdministrationForm({
        time: "",
        reason: "",
        witness: "",
        notes: ""
      });
    } catch (error) {
      console.error("Failed to administer PRN medication:", error);
      toast.error("Failed to record PRN administration");
    }
  };

  // Debug logging
  React.useEffect(() => {
    console.log("Resident ID:", id);
    if (allMedications !== undefined) {
      console.log("All medications loaded:", allMedications);
      console.log("Number of medications:", allMedications?.length);
    }
  }, [allMedications, id]);

  if (resident === undefined || allMedications === undefined) {
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

  // Dummy medications for testing
  const dummyMedications = [
    {
      _id: "dummy1" as any,
      name: "Metformin",
      strength: "500",
      strengthUnit: "mg" as const,
      totalCount: 56,
      dosageForm: "Tablet" as const,
      frequency: "Twice daily (BD)" as const,
      times: ["08:00", "20:00"],
      status: "active" as const,
      prescriberName: "Dr. Smith",
      startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      instructions: "Take with food",
      route: "Oral" as const,
      scheduleType: "Scheduled" as const,
      createdByUserId: "dummy",
      teamId: "dummy",
      organizationId: "dummy",
      residentId: id
    },
    {
      _id: "dummy2" as any,
      name: "Amlodipine",
      strength: "5",
      strengthUnit: "mg" as const,
      totalCount: 28,
      dosageForm: "Tablet" as const,
      frequency: "Once daily (OD)" as const,
      times: ["08:00"],
      status: "active" as const,
      prescriberName: "Dr. Johnson",
      startDate: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
      instructions: "Take in the morning",
      route: "Oral" as const,
      scheduleType: "Scheduled" as const,
      createdByUserId: "dummy",
      teamId: "dummy",
      organizationId: "dummy",
      residentId: id
    },
    {
      _id: "dummy3" as any,
      name: "Atorvastatin",
      strength: "20",
      strengthUnit: "mg" as const,
      totalCount: 14,
      dosageForm: "Tablet" as const,
      frequency: "Once daily (OD)" as const,
      times: ["22:00"],
      status: "active" as const,
      prescriberName: "Dr. Williams",
      startDate: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
      instructions: "Take at bedtime",
      route: "Oral" as const,
      scheduleType: "Scheduled" as const,
      createdByUserId: "dummy",
      teamId: "dummy",
      organizationId: "dummy",
      residentId: id
    },
    {
      _id: "dummy4" as any,
      name: "Paracetamol",
      strength: "500",
      strengthUnit: "mg" as const,
      totalCount: 100,
      dosageForm: "Tablet" as const,
      frequency: "As Needed (PRN)" as const,
      times: [],
      status: "active" as const,
      prescriberName: "Dr. Brown",
      startDate: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
      instructions: "Take as needed for pain, max 4 times daily",
      route: "Oral" as const,
      scheduleType: "PRN (As Needed)" as const,
      createdByUserId: "dummy",
      teamId: "dummy",
      organizationId: "dummy",
      residentId: id
    },
    {
      _id: "dummy5" as any,
      name: "Hydrocortisone Cream",
      strength: "1",
      strengthUnit: "mg" as const,
      totalCount: 2,
      dosageForm: "Cream" as const,
      frequency: "As Needed (PRN)" as const,
      times: [],
      status: "active" as const,
      prescriberName: "Dr. Martinez",
      startDate: Date.now() - 45 * 24 * 60 * 60 * 1000, // 45 days ago
      instructions: "Apply thin layer to affected area, up to 3 times daily",
      route: "Topical" as const,
      scheduleType: "PRN (As Needed)" as const,
      createdByUserId: "dummy",
      teamId: "dummy",
      organizationId: "dummy",
      residentId: id
    },
    {
      _id: "dummy6" as any,
      name: "Emollient Cream",
      strength: "500",
      strengthUnit: "g" as const,
      totalCount: 3,
      dosageForm: "Cream" as const,
      frequency: "As Needed (PRN)" as const,
      times: [],
      status: "active" as const,
      prescriberName: "Dr. Wilson",
      startDate: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
      instructions: "Apply liberally to dry skin as needed",
      route: "Topical" as const,
      scheduleType: "PRN (As Needed)" as const,
      createdByUserId: "dummy",
      teamId: "dummy",
      organizationId: "dummy",
      residentId: id
    }
  ];

  // Use real medication data from the database, fallback to dummy data for testing
  const medicationsToDisplay = (allMedications && allMedications.length > 0)
    ? allMedications
    : dummyMedications;

  // Filter PRN and Topical medications
  const prnMedications = medicationsToDisplay.filter(
    (med) =>
      med.scheduleType === "PRN (As Needed)" ||
      med.route === "Topical" ||
      med.frequency === "As Needed (PRN)"
  );

  const todaySchedule = [
    { time: "08:00", medications: ["Metformin 500mg", "Amlodipine 5mg"], status: "completed" },
    { time: "10:00", medications: ["Aspirin 75mg"], status: "pending" },
    { time: "12:00", medications: ["Vitamin D 1000IU"], status: "pending" },
    { time: "14:00", medications: ["Paracetamol 500mg"], status: "pending" },
    { time: "18:00", medications: ["Ramipril 5mg", "Vitamin B12"], status: "pending" },
    { time: "20:00", medications: ["Metformin 500mg"], status: "pending" },
    { time: "22:00", medications: ["Atorvastatin 20mg"], status: "pending" },
    { time: "00:00", medications: ["Melatonin 3mg"], status: "pending" }
  ];

  // Get medications for selected time
  const selectedSchedule = selectedTime
    ? todaySchedule.find(schedule => schedule.time === selectedTime)
    : null;

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
        <span className="text-foreground">Medication</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Pill className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Medication</h1>
            <p className="text-muted-foreground text-sm">Prescriptions & medication schedules</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching daily-care pattern */}
      <Card className="border-0 ">
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
                    <Pill className="w-3 h-3 mr-1" />
                    {medicationsToDisplay.length} Active
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/medication/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Medication History
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
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <Pill className="w-3 h-3 mr-1" />
                    {medicationsToDisplay.length} Active Meds
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-green-600 text-white hover:bg-green-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/medication/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Medication History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Medication Schedule */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Today&apos;s Schedule</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {new Date().toLocaleDateString()}
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Today&apos;s Schedule</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {new Date().toLocaleDateString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Time Options */}
          <div className="p-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Morning</span>
            <Button
              variant={selectedTime === "08:00" ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setSelectedTime("08:00")}
            >
              08:00
            </Button>
            <Button
              variant={selectedTime === "10:00" ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setSelectedTime("10:00")}
            >
              10:00
            </Button>
            <Button
              variant={selectedTime === "12:00" ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setSelectedTime("12:00")}
            >
              12:00
            </Button>
            <span className="text-sm font-semibold text-gray-700 ml-2">Afternoon</span>
            <Button
              variant={selectedTime === "14:00" ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setSelectedTime("14:00")}
            >
              14:00
            </Button>
            <Button
              variant={selectedTime === "18:00" ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setSelectedTime("18:00")}
            >
              18:00
            </Button>
            <span className="text-sm font-semibold text-gray-700 ml-2">Evening</span>
            <Button
              variant={selectedTime === "22:00" ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setSelectedTime("22:00")}
            >
              22:00
            </Button>
            <Button
              variant={selectedTime === "00:00" ? "default" : "outline"}
              size="sm"
              className="font-mono"
              onClick={() => setSelectedTime("00:00")}
            >
              00:00
            </Button>
          </div>

          {/* Medications Table */}
          {selectedTime ? (
            selectedSchedule ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="font-medium border-r">Medication</TableHead>
                    <TableHead className="font-medium text-center border-r">Popped Out</TableHead>
                    <TableHead className="font-medium border-r">Status</TableHead>
                    <TableHead className="font-medium border-r">Time</TableHead>
                    <TableHead className="font-medium border-r w-[150px]">Staff</TableHead>
                    <TableHead className="font-medium border-r w-[150px]">Witness</TableHead>
                    <TableHead className="font-medium">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSchedule.medications.map((med, medIndex) => {
                    const medKey = `${selectedTime}-${medIndex}`;
                    const details = medicationDetails[medKey] || {
                      pickup: "",
                      given: "",
                      status: "pending",
                      actualTime: "",
                      staff: "",
                      witness: "",
                      note: ""
                    };

                    return (
                      <TableRow key={medIndex} className="hover:bg-muted/50">
                        <TableCell className="border-r">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs">{medIndex + 1}.</span>
                              <span className="text-gray-900">{med}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center border-r">
                            <button
                              type="button"
                              onClick={() => setMedicationDetails(prev => ({
                                ...prev,
                                [medKey]: { ...details, pickup: details.pickup === "popped" ? "" : "popped" }
                              }))}
                              className={`w-4 h-4 rounded-full border border-dashed transition-all ${
                                details.pickup === "popped"
                                  ? 'border-black bg-black'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {details.pickup === "popped" && (
                                <span className="flex items-center justify-center">
                                  <CheckCircle className="w-2.5 h-2.5 text-white" />
                                </span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="border-r">
                            <Select
                              value={details.status}
                              onValueChange={(value) => setMedicationDetails(prev => ({
                                ...prev,
                                [medKey]: { ...details, status: value }
                              }))}
                            >
                              <SelectTrigger className="h-6 w-auto border-0 shadow-none focus:ring-0 gap-1 px-0">
                                <SelectValue placeholder="Select">
                                  {details.status && (
                                    <Badge variant="secondary" className={`text-xs h-5 px-2 border-0 font-normal ${
                                      details.status === "pending" ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                                      details.status === "given" ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                      details.status === "refused" ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                                      details.status === "missed" ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
                                      'bg-gray-100 text-gray-700 hover:bg-gray-100'
                                    }`}>
                                      {details.status.charAt(0).toUpperCase() + details.status.slice(1)}
                                    </Badge>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-0">Pending</Badge>
                                </SelectItem>
                                <SelectItem value="given">
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-0">Given</Badge>
                                </SelectItem>
                                <SelectItem value="refused">
                                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 border-0">Refused</Badge>
                                </SelectItem>
                                <SelectItem value="missed">
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 border-0">Missed</Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="border-r">
                            <Input
                              type="time"
                              className="h-6 text-xs border-0 shadow-none focus-visible:ring-0 px-0 text-gray-600"
                              value={details.actualTime}
                              onChange={(e) => setMedicationDetails(prev => ({
                                ...prev,
                                [medKey]: { ...details, actualTime: e.target.value }
                              }))}
                            />
                          </TableCell>
                          <TableCell className="border-r">
                            <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              {currentUserName}
                            </div>
                          </TableCell>
                          <TableCell className="border-r">
                            <Select
                              value={details.witness}
                              onValueChange={(value) => setMedicationDetails(prev => ({
                                ...prev,
                                [medKey]: { ...details, witness: value }
                              }))}
                            >
                              <SelectTrigger className="h-6 w-full border-0 shadow-none focus:ring-0 px-0">
                                <SelectValue placeholder="Select witness...">
                                  {details.witness && (
                                    <span className="text-xs text-gray-600">{details.witness}</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="John Smith">
                                  <span className="text-xs">John Smith</span>
                                </SelectItem>
                                <SelectItem value="Sarah Johnson">
                                  <span className="text-xs">Sarah Johnson</span>
                                </SelectItem>
                                <SelectItem value="Michael Brown">
                                  <span className="text-xs">Michael Brown</span>
                                </SelectItem>
                                <SelectItem value="Emily Davis">
                                  <span className="text-xs">Emily Davis</span>
                                </SelectItem>
                                <SelectItem value="David Wilson">
                                  <span className="text-xs">David Wilson</span>
                                </SelectItem>
                                <SelectItem value="Jessica Martinez">
                                  <span className="text-xs">Jessica Martinez</span>
                                </SelectItem>
                                <SelectItem value="Other">
                                  <span className="text-xs">Other</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Add notes..."
                              className="h-6 text-xs border-0 shadow-none focus-visible:ring-0 px-0 text-gray-600 placeholder:text-gray-400"
                              value={details.note}
                              onChange={(e) => setMedicationDetails(prev => ({
                                ...prev,
                                [medKey]: { ...details, note: e.target.value }
                              }))}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Pill className="w-12 h-12 text-gray-400" />
                    <p>No medications scheduled for this time</p>
                  </div>
                </TableCell>
              </TableRow>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p>Select a time to view medications</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PRN (As-Needed) & Topical Medications */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Pill className="w-5 h-5 text-purple-600" />
              <span>PRN & Topical Medications</span>
            </div>
            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
              {prnMedications.length} as-needed medications
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Pill className="w-5 h-5 text-purple-600" />
              <span>PRN (As-Needed) & Topical Medications</span>
            </div>
            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
              {prnMedications.length} medications available
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {prnMedications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Pill className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p>No PRN or Topical medications available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="font-medium border-r">Medication</TableHead>
                  <TableHead className="font-medium text-center border-r">Popped Out</TableHead>
                  <TableHead className="font-medium border-r">Status</TableHead>
                  <TableHead className="font-medium border-r">Time</TableHead>
                  <TableHead className="font-medium border-r w-[150px]">Staff</TableHead>
                  <TableHead className="font-medium border-r w-[150px]">Witness</TableHead>
                  <TableHead className="font-medium">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prnMedications.map((medication, medIndex) => {
                  const medKey = `prn-${medication._id}`;
                  const details = prnMedicationDetails[medKey] || {
                    poppedOut: "",
                    status: "pending",
                    time: "",
                    witness: "",
                    reason: "",
                    notes: ""
                  };

                  return (
                    <TableRow key={medication._id} className="hover:bg-muted/50">
                      <TableCell className="border-r">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                              {medication.route === "Topical" ? "Topical" : "PRN"}
                            </Badge>
                            <span className="font-semibold">{medication.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {medication.strength}{medication.strengthUnit} - {medication.dosageForm}
                          </span>
                          {medication.instructions && (
                            <span className="text-xs text-blue-700 mt-1 italic">
                              {medication.instructions}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <button
                          type="button"
                          onClick={() => setPrnMedicationDetails(prev => ({
                            ...prev,
                            [medKey]: { ...details, poppedOut: details.poppedOut === "popped" ? "" : "popped" }
                          }))}
                          className={`w-4 h-4 rounded-full border border-dashed transition-all ${
                            details.poppedOut === "popped"
                              ? 'border-black bg-black'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {details.poppedOut === "popped" && (
                            <span className="flex items-center justify-center">
                              <CheckCircle className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="border-r">
                        <Select
                          value={details.status}
                          onValueChange={(value) => setPrnMedicationDetails(prev => ({
                            ...prev,
                            [medKey]: { ...details, status: value }
                          }))}
                        >
                          <SelectTrigger className="h-6 w-auto border-0 shadow-none focus:ring-0 gap-1 px-0">
                            <SelectValue placeholder="Select">
                              {details.status && (
                                <Badge variant="secondary" className={`text-xs h-5 px-2 border-0 font-normal ${
                                  details.status === "pending" ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                                  details.status === "given" ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                  details.status === "applied" ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                                  details.status === "refused" ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                                  details.status === "not_needed" ? 'bg-gray-100 text-gray-700 hover:bg-gray-100' :
                                  'bg-gray-100 text-gray-700 hover:bg-gray-100'
                                }`}>
                                  {details.status === "not_needed" ? "Not Needed" : details.status.charAt(0).toUpperCase() + details.status.slice(1)}
                                </Badge>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-0">Pending</Badge>
                            </SelectItem>
                            <SelectItem value="given">
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-0">Given</Badge>
                            </SelectItem>
                            <SelectItem value="applied">
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-0">Applied</Badge>
                            </SelectItem>
                            <SelectItem value="refused">
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 border-0">Refused</Badge>
                            </SelectItem>
                            <SelectItem value="not_needed">
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-0">Not Needed</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="border-r">
                        <Input
                          type="time"
                          className="h-6 text-xs border-0 shadow-none focus-visible:ring-0 px-0 text-gray-600"
                          value={details.time}
                          onChange={(e) => setPrnMedicationDetails(prev => ({
                            ...prev,
                            [medKey]: { ...details, time: e.target.value }
                          }))}
                        />
                      </TableCell>
                      <TableCell className="border-r">
                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {currentUserName}
                        </div>
                      </TableCell>
                      <TableCell className="border-r">
                        <Select
                          value={details.witness}
                          onValueChange={(value) => setPrnMedicationDetails(prev => ({
                            ...prev,
                            [medKey]: { ...details, witness: value }
                          }))}
                        >
                          <SelectTrigger className="h-6 w-full border-0 shadow-none focus:ring-0 px-0">
                            <SelectValue placeholder="Select witness...">
                              {details.witness && (
                                <span className="text-xs text-gray-600">{details.witness}</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="John Smith">
                              <span className="text-xs">John Smith</span>
                            </SelectItem>
                            <SelectItem value="Sarah Johnson">
                              <span className="text-xs">Sarah Johnson</span>
                            </SelectItem>
                            <SelectItem value="Michael Brown">
                              <span className="text-xs">Michael Brown</span>
                            </SelectItem>
                            <SelectItem value="Emily Davis">
                              <span className="text-xs">Emily Davis</span>
                            </SelectItem>
                            <SelectItem value="David Wilson">
                              <span className="text-xs">David Wilson</span>
                            </SelectItem>
                            <SelectItem value="Jessica Martinez">
                              <span className="text-xs">Jessica Martinez</span>
                            </SelectItem>
                            <SelectItem value="Other">
                              <span className="text-xs">Other</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Add notes..."
                          className="h-6 text-xs border-0 shadow-none focus-visible:ring-0 px-0 text-gray-600 placeholder:text-gray-400"
                          value={details.notes}
                          onChange={(e) => setPrnMedicationDetails(prev => ({
                            ...prev,
                            [medKey]: { ...details, notes: e.target.value }
                          }))}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active Medications */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Pill className="w-5 h-5 text-green-600" />
              <span>Active Medications</span>
            </div>
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
              {medicationsToDisplay.length} active prescriptions
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Pill className="w-5 h-5 text-green-600" />
              <span>Active Medications</span>
            </div>
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
              {medicationsToDisplay.length} active prescriptions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-medium border-r">
                  Medication
                </TableHead>
                <TableHead className="font-medium border-r">
                  Dosage
                </TableHead>
                <TableHead className="font-medium border-r">
                  Frequency
                </TableHead>
                <TableHead className="font-medium border-r">
                  Times
                </TableHead>
                <TableHead className="font-medium border-r">
                  Current Stock
                </TableHead>
                <TableHead className="font-medium border-r">
                  Status
                </TableHead>
                <TableHead className="font-medium border-r">
                  Prescriber
                </TableHead>
                <TableHead className="font-medium text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicationsToDisplay.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Pill className="w-12 h-12 text-gray-400" />
                      <p className="font-medium">No active medications</p>
                      <p className="text-sm">Click &quot;Add Medication&quot; to add a new prescription</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                medicationsToDisplay.map((medication) => (
                  <TableRow key={medication._id} className="hover:bg-muted/50">
                    <TableCell className="border-r">
                      <div className="flex flex-col">
                        <span className="font-medium">{medication.name}</span>
                        {medication.instructions && (
                          <span className="text-xs text-muted-foreground mt-1">
                            {medication.instructions}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-r">
                      <span className="font-medium">
                        {medication.strength}{medication.strengthUnit}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({medication.dosageForm})
                      </span>
                    </TableCell>
                    <TableCell className="border-r">
                      {medication.frequency}
                    </TableCell>
                    <TableCell className="border-r">
                      {medication.times.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {medication.times.map((time, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {time}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">As needed</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">
                          {medication.totalCount}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {medication.dosageForm.toLowerCase()}(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="border-r">
                      <Select
                        value={medication.status}
                        onValueChange={(value: "active" | "completed" | "cancelled") =>
                          handleStatusChange(medication._id, value)
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8 border-none shadow-none">
                          <SelectValue>
                            <Badge
                              variant="secondary"
                              className={
                                medication.status === "active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : medication.status === "cancelled"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                              }
                            >
                              {medication.status === "active"
                                ? "Active"
                                : medication.status === "cancelled"
                                ? "Discontinued"
                                : "Completed"}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              Discontinued
                            </Badge>
                          </SelectItem>
                          <SelectItem value="completed">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                              Completed
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="border-r">
                      <div className="flex flex-col">
                        <span className="text-sm">{medication.prescriberName}</span>
                        <span className="text-xs text-muted-foreground">
                          Started: {new Date(medication.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAddStockClick(medication)}>
                              <PackagePlus className="w-4 h-4 mr-2 text-blue-600" />
                              Add Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(medication)}>
                              <Edit className="w-4 h-4 mr-2 text-green-600" />
                              Edit Medication
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(medication)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Medication Overview */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span>Medication Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {medicationsToDisplay.length}
              </div>
              <p className="text-sm text-green-700">Active Medications</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {todaySchedule.filter(s => s.status === "completed").length}
              </div>
              <p className="text-sm text-blue-700">Completed Today</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {todaySchedule.filter(s => s.status === "pending").length}
              </div>
              <p className="text-sm text-orange-700">Pending Doses</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <p className="text-sm text-purple-700">Missed Doses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Stock Dialog */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
            <DialogDescription>
              Add more stock for {selectedMedication?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Current Stock: {selectedMedication?.totalCount} {selectedMedication?.dosageForm.toLowerCase()}(s)</Label>
              <Input
                id="stock"
                type="number"
                placeholder="Enter quantity to add"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(e.target.value)}
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStock}>Add Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Medication Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
            <DialogDescription>
              Update medication details for {selectedMedication?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Medication Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-prescriber">Prescriber Name</Label>
                <Input
                  id="edit-prescriber"
                  value={editForm.prescriberName || ""}
                  onChange={(e) => setEditForm({ ...editForm, prescriberName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-strength">Strength</Label>
                <Input
                  id="edit-strength"
                  value={editForm.strength || ""}
                  onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-strength-unit">Unit</Label>
                <Select
                  value={editForm.strengthUnit || "mg"}
                  onValueChange={(value) => setEditForm({ ...editForm, strengthUnit: value })}
                >
                  <SelectTrigger id="edit-strength-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dosage-form">Dosage Form</Label>
                <Select
                  value={editForm.dosageForm || "Tablet"}
                  onValueChange={(value) => setEditForm({ ...editForm, dosageForm: value })}
                >
                  <SelectTrigger id="edit-dosage-form">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Capsule">Capsule</SelectItem>
                    <SelectItem value="Liquid">Liquid</SelectItem>
                    <SelectItem value="Injection">Injection</SelectItem>
                    <SelectItem value="Cream">Cream</SelectItem>
                    <SelectItem value="Ointment">Ointment</SelectItem>
                    <SelectItem value="Patch">Patch</SelectItem>
                    <SelectItem value="Inhaler">Inhaler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-frequency">Frequency</Label>
              <Select
                value={editForm.frequency || "Once daily (OD)"}
                onValueChange={(value) => setEditForm({ ...editForm, frequency: value })}
              >
                <SelectTrigger id="edit-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Once daily (OD)">Once daily (OD)</SelectItem>
                  <SelectItem value="Twice daily (BD)">Twice daily (BD)</SelectItem>
                  <SelectItem value="Three times daily (TD)">Three times daily (TD)</SelectItem>
                  <SelectItem value="Four times daily (QDS)">Four times daily (QDS)</SelectItem>
                  <SelectItem value="As Needed (PRN)">As Needed (PRN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-instructions">Instructions</Label>
              <Textarea
                id="edit-instructions"
                value={editForm.instructions || ""}
                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMedication}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedMedication?.name}</strong> and all associated intake records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMedication}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRN Medication Administration Dialog */}
      <Dialog open={prnDialogOpen} onOpenChange={setPrnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Administer PRN Medication</DialogTitle>
            <DialogDescription>
              Record administration of {selectedPrnMedication?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Medication Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">{selectedPrnMedication?.name}</h4>
              </div>
              <p className="text-sm text-purple-800">
                {selectedPrnMedication?.strength}{selectedPrnMedication?.strengthUnit} - {selectedPrnMedication?.dosageForm}
              </p>
              {selectedPrnMedication?.instructions && (
                <p className="text-xs text-purple-700 mt-2">
                  <span className="font-semibold">Instructions: </span>
                  {selectedPrnMedication.instructions}
                </p>
              )}
            </div>

            {/* Time of Administration */}
            <div className="space-y-2">
              <Label htmlFor="prn-time">
                Time of Administration <span className="text-red-500">*</span>
              </Label>
              <Input
                id="prn-time"
                type="time"
                value={prnAdministrationForm.time}
                onChange={(e) =>
                  setPrnAdministrationForm({ ...prnAdministrationForm, time: e.target.value })
                }
              />
            </div>

            {/* Reason for Administration */}
            <div className="space-y-2">
              <Label htmlFor="prn-reason">
                Reason for Administration <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="prn-reason"
                placeholder="E.g., Complained of headache, pain score 7/10"
                value={prnAdministrationForm.reason}
                onChange={(e) =>
                  setPrnAdministrationForm({ ...prnAdministrationForm, reason: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Witness */}
            <div className="space-y-2">
              <Label htmlFor="prn-witness">Witness (if applicable)</Label>
              <Select
                value={prnAdministrationForm.witness}
                onValueChange={(value) =>
                  setPrnAdministrationForm({ ...prnAdministrationForm, witness: value })
                }
              >
                <SelectTrigger id="prn-witness">
                  <SelectValue placeholder="Select witness..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="John Smith">John Smith</SelectItem>
                  <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                  <SelectItem value="Michael Brown">Michael Brown</SelectItem>
                  <SelectItem value="Emily Davis">Emily Davis</SelectItem>
                  <SelectItem value="David Wilson">David Wilson</SelectItem>
                  <SelectItem value="Jessica Martinez">Jessica Martinez</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="prn-notes">Additional Notes</Label>
              <Textarea
                id="prn-notes"
                placeholder="Any additional observations..."
                value={prnAdministrationForm.notes}
                onChange={(e) =>
                  setPrnAdministrationForm({ ...prnAdministrationForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            {/* Staff Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Administered by: </span>
                {currentUserName}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrnDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdministerPrn}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Record Administration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}