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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  X,
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
  position: z.enum(["left_side", "right_side", "back", "sitting_up"]).optional(),
  status: z.enum(["asleep", "awake", "walking", "sitting"]).optional(),
  additional_notes: z.string().optional(),
  staff: z.string().min(1, "Staff name is required"),
  // Pad Change fields
  continence_check: z.boolean().optional(),
  pad_changed: z.boolean().optional(),
  skin_condition: z.enum(["normal", "dry", "moist", "clammy", "hot", "cold"]).optional(),
  // Bed Rails fields
  repositioned: z.boolean().optional(),
  covers_adjusted: z.boolean().optional(),
  // Environmental fields
  medication_given: z.boolean().optional(),
  medication_details: z.string().optional(),
  observations: z.string().optional(),
});

type NightCheckFormData = z.infer<typeof NightCheckSchema>;

export default function NightCheckPage({ params }: NightCheckPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Fetch night check configurations for this resident
  const nightCheckConfigs = useQuery(api.nightCheckConfigurations.getByResident, {
    residentId: id as Id<"residents">
  });

  // Mutations
  const createConfiguration = useMutation(api.nightCheckConfigurations.create);
  const removeConfiguration = useMutation(api.nightCheckConfigurations.remove);
  const createRecording = useMutation(api.nightCheckRecordings.create);

  // Get session data
  const { data: session } = authClient.useSession();

  // Form setup
  const form = useForm<NightCheckFormData>({
    resolver: zodResolver(NightCheckSchema),
    defaultValues: {
      checkTime: "",
      position: undefined,
      status: undefined,
      additional_notes: "",
      staff: "",
      continence_check: false,
      pad_changed: false,
      skin_condition: undefined,
      repositioned: false,
      covers_adjusted: false,
      medication_given: false,
      medication_details: "",
      observations: "",
    },
  });

  // Dialog states
  const [isNightCheckDialogOpen, setIsNightCheckDialogOpen] = React.useState(false);
  const [isFrequencyDialogOpen, setIsFrequencyDialogOpen] = React.useState(false);
  const [isBedRailsConfigDialogOpen, setIsBedRailsConfigDialogOpen] = React.useState(false);
  const [isEnvironmentalConfigDialogOpen, setIsEnvironmentalConfigDialogOpen] = React.useState(false);
  const [selectedFrequency, setSelectedFrequency] = React.useState<string>("30");
  const [selectedEquipment, setSelectedEquipment] = React.useState<string[]>([]);
  const [selectedEnvironmentalItems, setSelectedEnvironmentalItems] = React.useState<string[]>([]);
  const [selectedCleaningItems, setSelectedCleaningItems] = React.useState<string[]>([]);
  const [bedRailsFrequency, setBedRailsFrequency] = React.useState<string>("60");
  const [customEquipmentInput, setCustomEquipmentInput] = React.useState<string>("");
  const [customEnvironmentalInput, setCustomEnvironmentalInput] = React.useState<string>("");
  const [customCleaningInput, setCustomCleaningInput] = React.useState<string>("");
  const [showCustomEquipmentInput, setShowCustomEquipmentInput] = React.useState<boolean>(false);
  const [showCustomEnvironmentalInput, setShowCustomEnvironmentalInput] = React.useState<boolean>(false);
  const [showCustomCleaningInput, setShowCustomCleaningInput] = React.useState<boolean>(false);
  const [customEquipmentList, setCustomEquipmentList] = React.useState<string[]>([]);
  const [customEnvironmentalList, setCustomEnvironmentalList] = React.useState<string[]>([]);
  const [customCleaningList, setCustomCleaningList] = React.useState<string[]>([]);
  const [currentRecordingItem, setCurrentRecordingItem] = React.useState<typeof nightCheckItems[0] | null>(null);
  const [isCleaningConfigDialogOpen, setIsCleaningConfigDialogOpen] = React.useState(false);
  const [pendingCleaningAdd, setPendingCleaningAdd] = React.useState(false);
  const [pendingNightCheckAdd, setPendingNightCheckAdd] = React.useState(false);
  const [pendingPositioningAdd, setPendingPositioningAdd] = React.useState(false);
  const [pendingPadChangeAdd, setPendingPadChangeAdd] = React.useState(false);
  const [pendingBedRailsAdd, setPendingBedRailsAdd] = React.useState(false);
  const [pendingEnvironmentalAdd, setPendingEnvironmentalAdd] = React.useState(false);
  const [frequencyDialogType, setFrequencyDialogType] = React.useState<"night_check" | "positioning" | "pad_change">("night_check");
  const [dialogType, setDialogType] = React.useState<
    "night_check" | "positioning" | "pad_change" | "bed_rails" | "environmental" | "night_note" | "cleaning"
  >("night_check");

  // State for resident's night check items
  const [nightCheckItems, setNightCheckItems] = React.useState<Array<{
    id: string;
    type: typeof dialogType;
    title: string;
    icon: string;
    color: string;
    frequency?: string;
    equipment?: string[];
    environmentalItems?: string[];
    cleaningItems?: string[];
  }>>([]);

  const openDialog = (type: typeof dialogType, item?: typeof nightCheckItems[0]) => {
    setDialogType(type);
    setCurrentRecordingItem(item || null);
    setIsNightCheckDialogOpen(true);
  };

  // Check if an item type is already added
  const isItemTypeAdded = (type: typeof dialogType) => {
    return nightCheckItems.some(item => item.type === type);
  };

  const addNightCheckItem = (type: typeof dialogType) => {
    // Check if already added
    if (isItemTypeAdded(type)) {
      toast.error("This item is already added to night checks");
      return;
    }

    // If it's night_check, mark as pending and let dropdown close first
    if (type === "night_check") {
      setPendingNightCheckAdd(true);
      setFrequencyDialogType("night_check");
      // Dialog will open via useEffect when dropdown closes
      return;
    }

    // If it's positioning, mark as pending for frequency selection
    if (type === "positioning") {
      setPendingPositioningAdd(true);
      setFrequencyDialogType("positioning");
      // Dialog will open via useEffect when dropdown closes
      return;
    }

    // If it's pad_change, mark as pending for frequency selection
    if (type === "pad_change") {
      setPendingPadChangeAdd(true);
      setFrequencyDialogType("pad_change");
      setSelectedFrequency("120"); // Default to 2 hours for pad change
      // Dialog will open via useEffect when dropdown closes
      return;
    }

    // If it's bed_rails, open configuration dialog
    if (type === "bed_rails") {
      setPendingBedRailsAdd(true);
      // Dialog will open via useEffect when dropdown closes
      return;
    }

    // If it's environmental, open configuration dialog
    if (type === "environmental") {
      setPendingEnvironmentalAdd(true);
      // Dialog will open via useEffect when dropdown closes
      return;
    }

    // If it's cleaning, open configuration dialog
    if (type === "cleaning") {
      setPendingCleaningAdd(true);
      // Dialog will open via useEffect when dropdown closes
      return;
    }

    // For other types (night_note), add directly
    const itemConfig = {
      night_note: { title: "Night Note", icon: "note", color: "bg-pink-600 hover:bg-pink-700" },
    };

    const config = itemConfig[type as keyof typeof itemConfig];

    // Save to database
    if (!session?.user?.id || !resident?.teamId || !resident?.organizationId) {
      toast.error("Missing required information");
      return;
    }

    createConfiguration({
      residentId: id as Id<"residents">,
      teamId: resident.teamId,
      organizationId: resident.organizationId,
      checkType: type,
      createdBy: session.user.id,
    }).then((configId) => {
      const newItem = {
        id: configId,
        type,
        title: config.title,
        icon: config.icon,
        color: config.color,
      };

      setNightCheckItems(prev => [...prev, newItem]);
      toast.success(`${config.title} added to night checks`);
    }).catch((error) => {
      toast.error("Failed to add night note");
      console.error(error);
    });
  };

  const confirmFrequencyAndAdd = async () => {
    if (!session?.user?.id || !resident?.teamId || !resident?.organizationId) {
      toast.error("Missing required information");
      return;
    }

    let frequencyLabel = "";

    if (frequencyDialogType === "pad_change") {
      // Pad change uses hours only
      frequencyLabel = selectedFrequency === "120" ? "2 hours" :
                      selectedFrequency === "180" ? "3 hours" :
                      selectedFrequency === "240" ? "4 hours" :
                      selectedFrequency === "300" ? "5 hours" :
                      "6 hours";
    } else {
      // Night check and positioning use minutes/hours
      frequencyLabel = selectedFrequency === "15" ? "15 minutes" :
                      selectedFrequency === "30" ? "30 minutes" :
                      selectedFrequency === "60" ? "1 hour" :
                      "2 hours";
    }

    try {
      // Save to database
      const configId = await createConfiguration({
        residentId: id as Id<"residents">,
        teamId: resident.teamId,
        organizationId: resident.organizationId,
        checkType: frequencyDialogType,
        frequencyMinutes: parseInt(selectedFrequency),
        createdBy: session.user.id,
      });

      let newItem;

      if (frequencyDialogType === "night_check") {
        newItem = {
          id: configId,
          type: "night_check" as const,
          title: "Night Check",
          icon: "moon",
          color: "bg-blue-600 hover:bg-blue-700",
          frequency: selectedFrequency,
        };
      } else if (frequencyDialogType === "positioning") {
        newItem = {
          id: configId,
          type: "positioning" as const,
          title: "Positioning",
          icon: "rotate",
          color: "bg-indigo-600 hover:bg-indigo-700",
          frequency: selectedFrequency,
        };
      } else {
        // pad_change
        newItem = {
          id: configId,
          type: "pad_change" as const,
          title: "Pad Change",
          icon: "shield",
          color: "bg-violet-600 hover:bg-violet-700",
          frequency: selectedFrequency,
        };
      }

      // Add item and close dialog
      setNightCheckItems(prev => [...prev, newItem]);
      setIsFrequencyDialogOpen(false);
      setSelectedFrequency("30"); // Reset to default

      const itemName = frequencyDialogType === "night_check" ? "Night Check" :
                       frequencyDialogType === "positioning" ? "Positioning" :
                       "Pad Change";
      toast.success(`${itemName} added (Every ${frequencyLabel})`);
    } catch (error) {
      toast.error("Failed to add night check item");
      console.error(error);
    }
  };

  const confirmBedRailsAndAdd = async () => {
    if (selectedEquipment.length === 0) {
      toast.error("Please select at least one equipment item to check");
      return;
    }

    if (!session?.user?.id || !resident?.teamId || !resident?.organizationId) {
      toast.error("Missing required information");
      return;
    }

    try {
      // Save to database
      const configId = await createConfiguration({
        residentId: id as Id<"residents">,
        teamId: resident.teamId,
        organizationId: resident.organizationId,
        checkType: "bed_rails",
        selectedItems: selectedEquipment,
        createdBy: session.user.id,
      });

      const newItem = {
        id: configId,
        type: "bed_rails" as const,
        title: "Bed Rails Check",
        icon: "bed",
        color: "bg-purple-600 hover:bg-purple-700",
        equipment: selectedEquipment,
      };

      setNightCheckItems(prev => [...prev, newItem]);
      setIsBedRailsConfigDialogOpen(false);
      setSelectedEquipment([]); // Clear selections

      toast.success(`Bed Rails Equipment Check added (${selectedEquipment.length} items)`);
    } catch (error) {
      toast.error("Failed to add bed rails check");
      console.error(error);
    }
  };

  const removeNightCheckItem = async (itemId: string) => {
    if (!session?.user?.id) {
      toast.error("Missing user information");
      return;
    }

    try {
      // Remove from database
      await removeConfiguration({
        configId: itemId as Id<"nightCheckConfigurations">,
        updatedBy: session.user.id,
      });

      // Remove from UI
      setNightCheckItems(prev => prev.filter(item => item.id !== itemId));
      toast.success("Item removed from night checks");
    } catch (error) {
      toast.error("Failed to remove item");
      console.error(error);
    }
  };

  const toggleEquipment = (equipment: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment)
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

  const confirmEnvironmentalAndAdd = async () => {
    if (selectedEnvironmentalItems.length === 0) {
      toast.error("Please select at least one environmental item to check");
      return;
    }

    if (!session?.user?.id || !resident?.teamId || !resident?.organizationId) {
      toast.error("Missing required information");
      return;
    }

    try {
      // Save to database
      const configId = await createConfiguration({
        residentId: id as Id<"residents">,
        teamId: resident.teamId,
        organizationId: resident.organizationId,
        checkType: "environmental",
        selectedItems: selectedEnvironmentalItems,
        createdBy: session.user.id,
      });

      const newItem = {
        id: configId,
        type: "environmental" as const,
        title: "Environmental Check",
        icon: "home",
        color: "bg-fuchsia-600 hover:bg-fuchsia-700",
        environmentalItems: selectedEnvironmentalItems,
      };

      setNightCheckItems(prev => [...prev, newItem]);
      setIsEnvironmentalConfigDialogOpen(false);
      setSelectedEnvironmentalItems([]); // Clear selections

      toast.success(`Environmental Check added (${selectedEnvironmentalItems.length} items)`);
    } catch (error) {
      toast.error("Failed to add environmental check");
      console.error(error);
    }
  };

  const toggleEnvironmentalItem = (item: string) => {
    setSelectedEnvironmentalItems(prev =>
      prev.includes(item)
        ? prev.filter(e => e !== item)
        : [...prev, item]
    );
  };

  const addCustomEquipment = () => {
    if (customEquipmentInput.trim()) {
      setCustomEquipmentList(prev => [...prev, customEquipmentInput.trim()]);
      setCustomEquipmentInput("");
      setShowCustomEquipmentInput(false);
      toast.success("Custom equipment item added");
    }
  };

  const addCustomEnvironmentalItem = () => {
    if (customEnvironmentalInput.trim()) {
      setCustomEnvironmentalList(prev => [...prev, customEnvironmentalInput.trim()]);
      setCustomEnvironmentalInput("");
      setShowCustomEnvironmentalInput(false);
      toast.success("Custom environmental item added");
    }
  };

  const confirmCleaningAndAdd = async () => {
    if (selectedCleaningItems.length === 0) {
      toast.error("Please select at least one cleaning item");
      return;
    }

    if (!session?.user?.id || !resident?.teamId || !resident?.organizationId) {
      toast.error("Missing required information");
      return;
    }

    try {
      // Save to database
      const configId = await createConfiguration({
        residentId: id as Id<"residents">,
        teamId: resident.teamId,
        organizationId: resident.organizationId,
        checkType: "cleaning",
        selectedItems: selectedCleaningItems,
        createdBy: session.user.id,
      });

      const newItem = {
        id: configId,
        type: "cleaning" as const,
        title: "Cleaning",
        icon: "sparkles",
        color: "bg-teal-600 hover:bg-teal-700",
        cleaningItems: selectedCleaningItems,
      };

      setNightCheckItems(prev => [...prev, newItem]);
      setIsCleaningConfigDialogOpen(false);
      setSelectedCleaningItems([]);

      toast.success(`Cleaning added (${selectedCleaningItems.length} items)`);
    } catch (error) {
      toast.error("Failed to add cleaning check");
      console.error(error);
    }
  };

  const toggleCleaningItem = (item: string) => {
    setSelectedCleaningItems(prev =>
      prev.includes(item)
        ? prev.filter(e => e !== item)
        : [...prev, item]
    );
  };

  const addCustomCleaningItem = () => {
    if (customCleaningInput.trim()) {
      setCustomCleaningList(prev => [...prev, customCleaningInput.trim()]);
      setCustomCleaningInput("");
      setShowCustomCleaningInput(false);
      toast.success("Custom cleaning item added");
    }
  };

  // Update staff field when session data loads or dialog opens
  React.useEffect(() => {
    if (session?.user && isNightCheckDialogOpen) {
      const staffName = session.user.name || session.user.email?.split('@')[0] || "";
      form.setValue('staff', staffName);
    }
  }, [session, form, isNightCheckDialogOpen]);

  // Open frequency dialog when pending flag is set (after dropdown closes)
  React.useEffect(() => {
    if (pendingNightCheckAdd) {
      // Use timeout to ensure dropdown has fully closed
      const timer = setTimeout(() => {
        setIsFrequencyDialogOpen(true);
        setPendingNightCheckAdd(false);
      }, 300); // 300ms delay to let dropdown close animation complete

      return () => clearTimeout(timer);
    }
  }, [pendingNightCheckAdd]);

  // Open frequency dialog for positioning
  React.useEffect(() => {
    if (pendingPositioningAdd) {
      // Use timeout to ensure dropdown has fully closed
      const timer = setTimeout(() => {
        setIsFrequencyDialogOpen(true);
        setPendingPositioningAdd(false);
      }, 300); // 300ms delay to let dropdown close animation complete

      return () => clearTimeout(timer);
    }
  }, [pendingPositioningAdd]);

  // Open frequency dialog for pad change
  React.useEffect(() => {
    if (pendingPadChangeAdd) {
      // Use timeout to ensure dropdown has fully closed
      const timer = setTimeout(() => {
        setIsFrequencyDialogOpen(true);
        setPendingPadChangeAdd(false);
      }, 300); // 300ms delay to let dropdown close animation complete

      return () => clearTimeout(timer);
    }
  }, [pendingPadChangeAdd]);

  // Open configuration dialog for bed rails
  React.useEffect(() => {
    if (pendingBedRailsAdd) {
      // Use timeout to ensure dropdown has fully closed
      const timer = setTimeout(() => {
        setIsBedRailsConfigDialogOpen(true);
        setPendingBedRailsAdd(false);
      }, 300); // 300ms delay to let dropdown close animation complete

      return () => clearTimeout(timer);
    }
  }, [pendingBedRailsAdd]);

  // Open configuration dialog for environmental
  React.useEffect(() => {
    if (pendingEnvironmentalAdd) {
      // Use timeout to ensure dropdown has fully closed
      const timer = setTimeout(() => {
        setIsEnvironmentalConfigDialogOpen(true);
        setPendingEnvironmentalAdd(false);
      }, 300); // 300ms delay to let dropdown close animation complete

      return () => clearTimeout(timer);
    }
  }, [pendingEnvironmentalAdd]);

  // Open configuration dialog for cleaning
  React.useEffect(() => {
    if (pendingCleaningAdd) {
      // Use timeout to ensure dropdown has fully closed
      const timer = setTimeout(() => {
        setIsCleaningConfigDialogOpen(true);
        setPendingCleaningAdd(false);
      }, 300); // 300ms delay to let dropdown close animation complete

      return () => clearTimeout(timer);
    }
  }, [pendingCleaningAdd]);

  // Load configurations from database
  React.useEffect(() => {
    if (nightCheckConfigs) {
      const items = nightCheckConfigs.map((config) => {
        const typeIconMap: Record<string, { icon: string; color: string; title: string }> = {
          night_check: { icon: "moon", color: "bg-blue-600 hover:bg-blue-700", title: "Night Check" },
          positioning: { icon: "rotate", color: "bg-indigo-600 hover:bg-indigo-700", title: "Positioning" },
          pad_change: { icon: "shield", color: "bg-violet-600 hover:bg-violet-700", title: "Pad Change" },
          bed_rails: { icon: "bed", color: "bg-purple-600 hover:bg-purple-700", title: "Bed Rails Check" },
          environmental: { icon: "home", color: "bg-fuchsia-600 hover:bg-fuchsia-700", title: "Environmental Check" },
          night_note: { icon: "note", color: "bg-amber-600 hover:bg-amber-700", title: "Night Note" },
          cleaning: { icon: "sparkles", color: "bg-teal-600 hover:bg-teal-700", title: "Cleaning" },
        };

        const typeInfo = typeIconMap[config.checkType] || { icon: "moon", color: "bg-gray-600", title: config.checkType };

        return {
          id: config._id,
          type: config.checkType as typeof dialogType,
          title: typeInfo.title,
          icon: typeInfo.icon,
          color: typeInfo.color,
          frequency: config.frequencyMinutes?.toString(),
          equipment: config.checkType === "bed_rails" ? config.selectedItems : undefined,
          environmentalItems: config.checkType === "environmental" ? config.selectedItems : undefined,
          cleaningItems: config.checkType === "cleaning" ? config.selectedItems : undefined,
        };
      });

      setNightCheckItems(items);
    }
  }, [nightCheckConfigs]);

  const handleSubmit = async (data: NightCheckFormData) => {
    if (!session?.user?.id || !resident?.teamId || !resident?.organizationId || !currentRecordingItem) {
      toast.error("Missing required information");
      return;
    }

    try {
      const now = new Date();
      const recordDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const recordTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
      const recordDateTime = now.getTime();

      // Prepare check-specific data
      let checkData: any = {};

      if (dialogType === "night_check") {
        checkData = {
          position: data.position,
          status: data.status,
          additional_notes: data.additional_notes,
        };
      } else if (dialogType === "positioning") {
        checkData = {
          position: data.position,
          additional_notes: data.additional_notes,
        };
      } else if (dialogType === "pad_change") {
        checkData = {
          continence_check: data.continence_check,
          pad_changed: data.pad_changed,
          skin_condition: data.skin_condition,
          additional_notes: data.additional_notes,
        };
      } else if (dialogType === "bed_rails") {
        checkData = {
          equipment_checked: currentRecordingItem.equipment,
          additional_notes: data.additional_notes,
        };
      } else if (dialogType === "environmental") {
        checkData = {
          items_checked: currentRecordingItem.environmentalItems,
          additional_notes: data.additional_notes,
        };
      } else if (dialogType === "cleaning") {
        checkData = {
          items_cleaned: currentRecordingItem.cleaningItems,
          additional_notes: data.additional_notes,
        };
      } else if (dialogType === "night_note") {
        checkData = {
          notes: data.additional_notes,
        };
      }

      // Save to database
      await createRecording({
        configurationId: currentRecordingItem.id as Id<"nightCheckConfigurations">,
        residentId: id as Id<"residents">,
        teamId: resident.teamId,
        organizationId: resident.organizationId,
        checkType: dialogType,
        recordDate,
        recordTime,
        recordDateTime,
        checkData,
        notes: data.additional_notes,
        recordedBy: session.user.id,
        recordedByName: session.user.name || session.user.email?.split('@')[0] || "Unknown",
      });

      toast.success("Night check recorded successfully");
      form.reset();

      // Immediately repopulate staff field for next recording
      if (session?.user) {
        const staffName = session.user.name || session.user.email?.split('@')[0] || "";
        form.setValue('staff', staffName);
      }

      setIsNightCheckDialogOpen(false);
      setCurrentRecordingItem(null);
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

  const getDialogTitle = () => {
    switch (dialogType) {
      case "night_check":
        return "Record Night Check";
      case "positioning":
        return "Record Positioning";
      case "pad_change":
        return "Record Pad Change";
      case "bed_rails":
        return "Bed Rails Equipment Check";
      case "environmental":
        return "Environmental Checks";
      case "cleaning":
        return "Record Cleaning";
      case "night_note":
        return "Night Note";
      default:
        return "Record Night Check";
    }
  };

  const getDialogDescription = () => {
    switch (dialogType) {
      case "night_check":
        return "Record night monitoring observations and care activities.";
      case "positioning":
        return "Record resident repositioning and position changes.";
      case "pad_change":
        return "Record pad/continence care changes.";
      case "bed_rails":
        return "Check and record bed rails and equipment safety status.";
      case "environmental":
        return "Record environmental safety checks for the resident's room.";
      case "night_note":
        return "Add a general night shift note or observation.";
      default:
        return "Record night monitoring observations and care activities.";
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Night Checks
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Add Check Item</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("night_check")}
                    onClick={() => addNightCheckItem("night_check")}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Night Check
                    {isItemTypeAdded("night_check") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("positioning")}
                    onClick={() => addNightCheckItem("positioning")}
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Positioning
                    {isItemTypeAdded("positioning") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("pad_change")}
                    onClick={() => addNightCheckItem("pad_change")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Pad Change
                    {isItemTypeAdded("pad_change") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("bed_rails")}
                    onClick={() => addNightCheckItem("bed_rails")}
                  >
                    <BedDouble className="w-4 h-4 mr-2" />
                    Bed Rails Equipment Check
                    {isItemTypeAdded("bed_rails") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("environmental")}
                    onClick={() => addNightCheckItem("environmental")}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Environmental Checks
                    {isItemTypeAdded("environmental") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("cleaning")}
                    onClick={() => addNightCheckItem("cleaning")}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Cleaning
                    {isItemTypeAdded("cleaning") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("night_note")}
                    onClick={() => addNightCheckItem("night_note")}
                  >
                    <StickyNote className="w-4 h-4 mr-2" />
                    Night Note
                    {isItemTypeAdded("night_note") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Night Checks
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Add Check Item</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("night_check")}
                    onClick={() => addNightCheckItem("night_check")}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Night Check
                    {isItemTypeAdded("night_check") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("positioning")}
                    onClick={() => addNightCheckItem("positioning")}
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Positioning
                    {isItemTypeAdded("positioning") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("pad_change")}
                    onClick={() => addNightCheckItem("pad_change")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Pad Change
                    {isItemTypeAdded("pad_change") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("bed_rails")}
                    onClick={() => addNightCheckItem("bed_rails")}
                  >
                    <BedDouble className="w-4 h-4 mr-2" />
                    Bed Rails Equipment Check
                    {isItemTypeAdded("bed_rails") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("environmental")}
                    onClick={() => addNightCheckItem("environmental")}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Environmental Checks
                    {isItemTypeAdded("environmental") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("cleaning")}
                    onClick={() => addNightCheckItem("cleaning")}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Cleaning
                    {isItemTypeAdded("cleaning") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isItemTypeAdded("night_note")}
                    onClick={() => addNightCheckItem("night_note")}
                  >
                    <StickyNote className="w-4 h-4 mr-2" />
                    Night Note
                    {isItemTypeAdded("night_note") && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Night Check Recording - Shows added items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Moon className="w-5 h-5 text-blue-600" />
            <span>Night Check Recording</span>
            {nightCheckItems.length > 0 && (
              <BadgeComponent variant="outline" className="ml-auto bg-blue-50 border-blue-200 text-blue-700">
                {nightCheckItems.length} {nightCheckItems.length === 1 ? 'Item' : 'Items'}
              </BadgeComponent>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nightCheckItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Moon className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Night Check Items Added</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Use the &quot;Add Night Checks&quot; button above to add specific check items for {fullName}.
                Each resident can have different night check requirements.
              </p>
              <p className="text-sm text-gray-500">
                Available items: Night Check, Positioning, Pad Change, Bed Rails, Environmental Checks, Night Note
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nightCheckItems.map((item) => (
                <div key={item.id} className="relative group">
                  <Button
                    className="bg-black text-white hover:bg-gray-800"
                    onClick={() => openDialog(item.type, item)}
                  >
                    {item.title}
                    {item.frequency && (
                      <span className="ml-2 text-xs opacity-70">
                        ({item.frequency === "15" ? "15min" :
                          item.frequency === "30" ? "30min" :
                          item.frequency === "60" ? "1hr" :
                          item.frequency === "120" ? "2hrs" :
                          item.frequency === "180" ? "3hrs" :
                          item.frequency === "240" ? "4hrs" :
                          item.frequency === "300" ? "5hrs" :
                          item.frequency === "360" ? "6hrs" :
                          "2hrs"})
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNightCheckItem(item.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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

      {/* Frequency Selection Dialog for Night Check & Positioning */}
      <Dialog
        open={isFrequencyDialogOpen}
        onOpenChange={(open) => {
          setIsFrequencyDialogOpen(open);
          if (!open) {
            setSelectedFrequency("30"); // Reset to default when closing
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {frequencyDialogType === "night_check"
                ? "Set Night Check Frequency"
                : frequencyDialogType === "positioning"
                ? "Set Positioning Frequency"
                : "Set Pad Change Frequency"}
            </DialogTitle>
            <DialogDescription>
              {frequencyDialogType === "night_check"
                ? `How often should ${fullName} be checked during the night shift?`
                : frequencyDialogType === "positioning"
                ? `How often should ${fullName} be repositioned during the night shift?`
                : `How often should ${fullName}'s pad be changed during the night shift?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {frequencyDialogType === "pad_change" ? (
              // Pad change frequency options: 2-6 hours
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className={selectedFrequency === "120" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("120")}
                >
                  Every 2 hours
                </Button>

                <Button
                  variant="outline"
                  className={selectedFrequency === "180" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("180")}
                >
                  Every 3 hours
                </Button>

                <Button
                  variant="outline"
                  className={selectedFrequency === "240" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("240")}
                >
                  Every 4 hours
                </Button>

                <Button
                  variant="outline"
                  className={selectedFrequency === "300" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("300")}
                >
                  Every 5 hours
                </Button>

                <Button
                  variant="outline"
                  className={selectedFrequency === "360" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("360")}
                >
                  Every 6 hours
                </Button>
              </div>
            ) : (
              // Night check and positioning frequency options: 15min-2hours
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className={selectedFrequency === "15" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("15")}
                >
                  Every 15 mins
                </Button>

                <Button
                  variant="outline"
                  className={selectedFrequency === "30" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("30")}
                >
                  Every 30 mins
                </Button>

                <Button
                  variant="outline"
                  className={selectedFrequency === "60" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("60")}
                >
                  Every 1 hour
                </Button>

                <Button
                  variant="outline"
                  className={selectedFrequency === "120" ? "bg-black text-white hover:bg-gray-800 hover:text-white" : ""}
                  onClick={() => setSelectedFrequency("120")}
                >
                  Every 2 hours
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsFrequencyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-black hover:bg-gray-800"
              onClick={confirmFrequencyAndAdd}
            >
              {frequencyDialogType === "night_check" ? "Add Night Check" :
               frequencyDialogType === "positioning" ? "Add Positioning" :
               "Add Pad Change"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bed Rails Equipment Check Configuration Dialog */}
      <Dialog
        open={isBedRailsConfigDialogOpen}
        onOpenChange={(open) => {
          setIsBedRailsConfigDialogOpen(open);
          if (!open) {
            setBedRailsFrequency("60"); // Reset to default
            setSelectedEquipment([]); // Clear selections
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Bed Rails Equipment Check</DialogTitle>
            <DialogDescription>
              Select equipment items to check for {fullName} during night shift.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Equipment Selection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Select Equipment to Check</h4>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className={selectedEquipment.includes("bed_rails") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEquipment("bed_rails")}
                >
                  Bed Rails
                </Button>

                <Button
                  variant="outline"
                  className={selectedEquipment.includes("oxygen") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEquipment("oxygen")}
                >
                  Oxygen Equipment
                </Button>

                <Button
                  variant="outline"
                  className={selectedEquipment.includes("air_bed") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEquipment("air_bed")}
                >
                  Air Bed / Pressure Mattress
                </Button>

                <Button
                  variant="outline"
                  className={selectedEquipment.includes("call_bell") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEquipment("call_bell")}
                >
                  Call Bell
                </Button>

                <Button
                  variant="outline"
                  className={selectedEquipment.includes("monitor") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEquipment("monitor")}
                >
                  Monitor/Sensors
                </Button>

                <Button
                  variant="outline"
                  className={selectedEquipment.includes("mobility_aids") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEquipment("mobility_aids")}
                >
                  Mobility Aids (Walker/Wheelchair)
                </Button>

                {customEquipmentList.map((item) => (
                  <Button
                    key={item}
                    variant="outline"
                    className={selectedEquipment.includes(item) ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                    onClick={() => toggleEquipment(item)}
                  >
                    {item}
                  </Button>
                ))}

                {showCustomEquipmentInput ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter custom equipment..."
                      value={customEquipmentInput}
                      onChange={(e) => setCustomEquipmentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addCustomEquipment();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={addCustomEquipment}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setShowCustomEquipmentInput(false);
                        setCustomEquipmentInput("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="justify-start text-muted-foreground"
                    onClick={() => setShowCustomEquipmentInput(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsBedRailsConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-black hover:bg-gray-800"
              onClick={confirmBedRailsAndAdd}
              disabled={selectedEquipment.length === 0}
            >
              Add Equipment Check
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Environmental Check Configuration Dialog */}
      <Dialog
        open={isEnvironmentalConfigDialogOpen}
        onOpenChange={(open) => {
          setIsEnvironmentalConfigDialogOpen(open);
          if (!open) {
            setSelectedEnvironmentalItems([]); // Clear selections
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Environmental Check</DialogTitle>
            <DialogDescription>
              Select environmental items to check for {fullName} during night shift.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Environmental Items Selection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Select Items to Check</h4>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className={selectedEnvironmentalItems.includes("window") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEnvironmentalItem("window")}
                >
                  Window
                </Button>

                <Button
                  variant="outline"
                  className={selectedEnvironmentalItems.includes("curtains") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEnvironmentalItem("curtains")}
                >
                  Curtains
                </Button>

                <Button
                  variant="outline"
                  className={selectedEnvironmentalItems.includes("door") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEnvironmentalItem("door")}
                >
                  Door
                </Button>

                <Button
                  variant="outline"
                  className={selectedEnvironmentalItems.includes("temperature") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleEnvironmentalItem("temperature")}
                >
                  Temperature
                </Button>

                {customEnvironmentalList.map((item) => (
                  <Button
                    key={item}
                    variant="outline"
                    className={selectedEnvironmentalItems.includes(item) ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                    onClick={() => toggleEnvironmentalItem(item)}
                  >
                    {item}
                  </Button>
                ))}

                {showCustomEnvironmentalInput ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter custom environmental item..."
                      value={customEnvironmentalInput}
                      onChange={(e) => setCustomEnvironmentalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addCustomEnvironmentalItem();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={addCustomEnvironmentalItem}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setShowCustomEnvironmentalInput(false);
                        setCustomEnvironmentalInput("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="justify-start text-muted-foreground"
                    onClick={() => setShowCustomEnvironmentalInput(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEnvironmentalConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-black hover:bg-gray-800"
              onClick={confirmEnvironmentalAndAdd}
              disabled={selectedEnvironmentalItems.length === 0}
            >
              Add Environmental Check
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cleaning Configuration Dialog */}
      <Dialog
        open={isCleaningConfigDialogOpen}
        onOpenChange={(open) => {
          setIsCleaningConfigDialogOpen(open);
          if (!open) {
            setSelectedCleaningItems([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Cleaning</DialogTitle>
            <DialogDescription>
              Select cleaning items for {fullName} during night shift.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cleaning Items Selection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Select Items to Clean</h4>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className={selectedCleaningItems.includes("bed") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleCleaningItem("bed")}
                >
                  Bed
                </Button>

                <Button
                  variant="outline"
                  className={selectedCleaningItems.includes("floor") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleCleaningItem("floor")}
                >
                  Floor
                </Button>

                <Button
                  variant="outline"
                  className={selectedCleaningItems.includes("bathroom") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleCleaningItem("bathroom")}
                >
                  Bathroom
                </Button>

                <Button
                  variant="outline"
                  className={selectedCleaningItems.includes("surfaces") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleCleaningItem("surfaces")}
                >
                  Surfaces
                </Button>

                <Button
                  variant="outline"
                  className={selectedCleaningItems.includes("bins") ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                  onClick={() => toggleCleaningItem("bins")}
                >
                  Bins
                </Button>

                {customCleaningList.map((item) => (
                  <Button
                    key={item}
                    variant="outline"
                    className={selectedCleaningItems.includes(item) ? "bg-black text-white hover:bg-gray-800 hover:text-white justify-start" : "justify-start"}
                    onClick={() => toggleCleaningItem(item)}
                  >
                    {item}
                  </Button>
                ))}

                {showCustomCleaningInput ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter custom cleaning item..."
                      value={customCleaningInput}
                      onChange={(e) => setCustomCleaningInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addCustomCleaningItem();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={addCustomCleaningItem}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setShowCustomCleaningInput(false);
                        setCustomCleaningInput("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="justify-start text-muted-foreground"
                    onClick={() => setShowCustomCleaningInput(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsCleaningConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-black hover:bg-gray-800"
              onClick={confirmCleaningAndAdd}
              disabled={selectedCleaningItems.length === 0}
            >
              Add Cleaning
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Night Check Dialog */}
      <Dialog open={isNightCheckDialogOpen} onOpenChange={setIsNightCheckDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            {dialogType === "positioning" && (
              <DialogDescription className="text-[11px] leading-tight pt-1 text-red-600">
                At each check, record the position of the person in bed in relation to their proximity to the bed rail. If it is identified that the person is positioned near the right or left bed rail, comment whether the person is safe and detail action taken if required.
              </DialogDescription>
            )}
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

              {/* Common Fields - Time and Staff */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="checkTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
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
                      <FormLabel>Staff</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Conditional Forms Based on Type */}
              {dialogType === "night_check" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Position</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
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
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="asleep">Asleep</SelectItem>
                              <SelectItem value="awake">Awake</SelectItem>
                              <SelectItem value="walking">Walking</SelectItem>
                              <SelectItem value="sitting">Sitting</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Additional Notes */}
                  <FormField
                    control={form.control}
                    name="additional_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter observations..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Pad Change Form */}
              {dialogType === "pad_change" && (
                <div className="space-y-3">
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
                        <FormLabel className="cursor-pointer text-sm">
                          Continence Check Performed
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
                        <FormLabel className="cursor-pointer text-sm">
                          Pad Changed
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="skin_condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Skin Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
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
                    name="additional_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Detail Action Taken</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter details of action taken..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Positioning Form */}
              {dialogType === "positioning" && (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Position</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
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
                    name="additional_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Safety Notes & Actions Taken</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Comment on safety and detail any action taken..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Bed Rails Equipment Check Form */}
              {dialogType === "bed_rails" && currentRecordingItem?.equipment && (
                <div className="space-y-3">
                  {currentRecordingItem.equipment.map((equipmentItem) => {
                    const equipmentLabels: Record<string, string> = {
                      bed_rails: "Bed Rails",
                      oxygen: "Oxygen Equipment",
                      air_bed: "Air Bed / Pressure Mattress",
                      call_bell: "Call Bell",
                      monitor: "Monitor/Sensors",
                      mobility_aids: "Mobility Aids (Walker/Wheelchair)"
                    };

                    return (
                      <div key={equipmentItem} className="flex items-center space-x-2">
                        <Checkbox id={equipmentItem} />
                        <label
                          htmlFor={equipmentItem}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {equipmentLabels[equipmentItem] || equipmentItem}
                        </label>
                      </div>
                    );
                  })}

                  <FormField
                    control={form.control}
                    name="additional_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Issues or Comments</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Note any issues or observations..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Environmental Checks Form */}
              {dialogType === "environmental" && currentRecordingItem?.environmentalItems && (
                <div className="space-y-3">
                  {currentRecordingItem.environmentalItems.map((envItem) => {
                    const environmentalLabels: Record<string, string> = {
                      window: "Window",
                      curtains: "Curtains",
                      door: "Door",
                      temperature: "Temperature"
                    };

                    return (
                      <div key={envItem} className="flex items-center space-x-2">
                        <Checkbox id={envItem} />
                        <label
                          htmlFor={envItem}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {environmentalLabels[envItem] || envItem}
                        </label>
                      </div>
                    );
                  })}

                  <FormField
                    control={form.control}
                    name="additional_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Issues or Comments</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Note any issues or observations..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Night Note Form */}
              {dialogType === "night_note" && (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="additional_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Note</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your night shift note or observation..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Cleaning Form */}
              {dialogType === "cleaning" && currentRecordingItem?.cleaningItems && (
                <div className="space-y-3">
                  {currentRecordingItem.cleaningItems.map((cleaningItem) => {
                    const cleaningLabels: Record<string, string> = {
                      bed: "Bed",
                      floor: "Floor",
                      bathroom: "Bathroom",
                      surfaces: "Surfaces",
                      bins: "Bins"
                    };

                    return (
                      <div key={cleaningItem} className="flex items-center space-x-2">
                        <Checkbox id={cleaningItem} />
                        <label
                          htmlFor={cleaningItem}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {cleaningLabels[cleaningItem] || cleaningItem}
                        </label>
                      </div>
                    );
                  })}

                  <FormField
                    control={form.control}
                    name="additional_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Comments</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Note any issues or observations..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-2">
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
                <Button type="submit" className="bg-black hover:bg-gray-800">
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}