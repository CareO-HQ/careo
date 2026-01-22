"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { canAddNightCheck as canCreateNightCheckPermission, canDeleteNightCheck as canDeleteNightCheckPermission } from "@/lib/permissions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Types
type NightCheckPageProps = {
  params: Promise<{ id: string }>;
};

// Validations
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
  // Cleaning / Generic
  itemsChecked: z.array(z.string()).optional(),
  itemsCleaned: z.array(z.string()).optional(),
  equipmentChecked: z.array(z.string()).optional(),
  safetyRailsUp: z.boolean().optional(),
});

type NightCheckFormData = z.infer<typeof NightCheckSchema>;

export default function NightCheckPage({ params }: NightCheckPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

  // Data State
  const [resident, setResident] = useState<any>(null);
  const [nightCheckConfigs, setNightCheckConfigs] = useState<any[]>([]);
  const [todayRecordings, setTodayRecordings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog & Form State
  const [isNightCheckDialogOpen, setIsNightCheckDialogOpen] = React.useState(false);
  const [isFrequencyDialogOpen, setIsFrequencyDialogOpen] = React.useState(false);
  const [isBedRailsConfigDialogOpen, setIsBedRailsConfigDialogOpen] = React.useState(false);
  const [isEnvironmentalConfigDialogOpen, setIsEnvironmentalConfigDialogOpen] = React.useState(false);
  const [isCleaningConfigDialogOpen, setIsCleaningConfigDialogOpen] = React.useState(false);

  const [dialogType, setDialogType] = React.useState<
    "night_check" | "positioning" | "pad_change" | "bed_rails" | "environmental" | "night_note" | "cleaning"
  >("night_check");
  const [frequencyDialogType, setFrequencyDialogType] = React.useState<"night_check" | "positioning" | "pad_change">("night_check");

  const [selectedFrequency, setSelectedFrequency] = React.useState<string>("30");
  const [bedRailsFrequency, setBedRailsFrequency] = React.useState<string>("60");

  const [selectedEquipment, setSelectedEquipment] = React.useState<string[]>([]);
  const [selectedEnvironmentalItems, setSelectedEnvironmentalItems] = React.useState<string[]>([]);
  const [selectedCleaningItems, setSelectedCleaningItems] = React.useState<string[]>([]);

  const [customEquipmentInput, setCustomEquipmentInput] = React.useState("");
  const [customEnvironmentalInput, setCustomEnvironmentalInput] = React.useState("");
  const [customCleaningInput, setCustomCleaningInput] = React.useState("");

  const [showCustomEquipmentInput, setShowCustomEquipmentInput] = React.useState(false);
  const [showCustomEnvironmentalInput, setShowCustomEnvironmentalInput] = React.useState(false);
  const [showCustomCleaningInput, setShowCustomCleaningInput] = React.useState(false);

  const [customEquipmentList, setCustomEquipmentList] = React.useState<string[]>([]);
  const [customEnvironmentalList, setCustomEnvironmentalList] = React.useState<string[]>([]);
  const [customCleaningList, setCustomCleaningList] = React.useState<string[]>([]);

  const [pendingNightCheckAdd, setPendingNightCheckAdd] = React.useState(false);
  const [pendingPositioningAdd, setPendingPositioningAdd] = React.useState(false);
  const [pendingPadChangeAdd, setPendingPadChangeAdd] = React.useState(false);
  const [pendingBedRailsAdd, setPendingBedRailsAdd] = React.useState(false);
  const [pendingEnvironmentalAdd, setPendingEnvironmentalAdd] = React.useState(false);
  const [pendingCleaningAdd, setPendingCleaningAdd] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [currentRecordingItem, setCurrentRecordingItem] = React.useState<any>(null);

  // Derived State
  const nightCheckItems = nightCheckConfigs.map(config => {
    const typeIconMap: Record<string, { icon: any; color: string; title: string }> = {
      night_check: { icon: Moon, color: "bg-blue-600 hover:bg-blue-700", title: "Night Check" },
      positioning: { icon: RotateCw, color: "bg-indigo-600 hover:bg-indigo-700", title: "Positioning" },
      pad_change: { icon: ShieldCheck, color: "bg-violet-600 hover:bg-violet-700", title: "Pad Change" },
      bed_rails: { icon: BedDouble, color: "bg-purple-600 hover:bg-purple-700", title: "Bed Rails Check" },
      environmental: { icon: Home, color: "bg-fuchsia-600 hover:bg-fuchsia-700", title: "Environmental Check" },
      night_note: { icon: StickyNote, color: "bg-amber-600 hover:bg-amber-700", title: "Night Note" },
      cleaning: { icon: ShieldCheck, color: "bg-teal-600 hover:bg-teal-700", title: "Cleaning" },
    };
    const typeInfo = typeIconMap[config.check_type] || { icon: Moon, color: "bg-gray-600", title: config.check_type };

    return {
      id: config.id,
      type: config.check_type as typeof dialogType,
      title: typeInfo.title,
      icon: typeInfo.icon,
      color: typeInfo.color,
      frequency: config.frequency_minutes?.toString(),
      equipment: config.check_type === 'bed_rails' ? config.selected_items : undefined,
      environmentalItems: config.check_type === 'environmental' ? config.selected_items : undefined,
      cleaningItems: config.check_type === 'cleaning' ? config.selected_items : undefined,
    };
  });

  const form = useForm<NightCheckFormData>({
    resolver: zodResolver(NightCheckSchema),
    defaultValues: {
      checkTime: "",
      staff: "",
      additional_notes: "",
    },
  });

  // Effects
  const fetchData = useCallback(async () => {
    if (!id || !profile?.active_organization_id) return;
    setIsLoading(true);
    try {
      // 1. Fetch Resident
      const { data: rData, error: rError } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .single();
      if (rError) throw rError;
      setResident(rData);

      // 2. Fetch Configs
      const { data: cData, error: cError } = await supabase
        .from('night_check_configurations')
        .select('*')
        .eq('resident_id', id)
        .eq('is_active', true);
      if (cError) throw cError;
      setNightCheckConfigs(cData || []);

      // 3. Fetch Today's Recordings
      const today = new Date().toISOString().split('T')[0];
      const { data: recData, error: recError } = await supabase
        .from('night_check_recordings')
        .select('*')
        .eq('resident_id', id)
        .eq('record_date', today)
        .order('record_date_time', { ascending: false });
      if (recError) throw recError;

      // Transform recordings to match component expectations if needed
      const formattedRecordings = (recData || []).map(r => ({
        _id: r.id,
        checkType: r.check_type,
        recordTime: r.record_time,
        checkData: r.check_data,
        notes: r.notes,
        recordedByName: r.recorded_by_name,
      }));
      setTodayRecordings(formattedRecordings);

    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [id, profile?.active_organization_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dialog Delay Effects (simulating dropdown close before opening dialog)
  useEffect(() => {
    if (pendingNightCheckAdd || pendingPositioningAdd || pendingPadChangeAdd) {
      const timer = setTimeout(() => {
        setIsFrequencyDialogOpen(true);
        if (pendingPadChangeAdd) setSelectedFrequency("120"); // Default 2h
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingNightCheckAdd, pendingPositioningAdd, pendingPadChangeAdd]);

  useEffect(() => {
    if (pendingBedRailsAdd) {
      const timer = setTimeout(() => setIsBedRailsConfigDialogOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, [pendingBedRailsAdd]);

  useEffect(() => {
    if (pendingEnvironmentalAdd) {
      const timer = setTimeout(() => setIsEnvironmentalConfigDialogOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, [pendingEnvironmentalAdd]);

  useEffect(() => {
    if (pendingCleaningAdd) {
      const timer = setTimeout(() => setIsCleaningConfigDialogOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, [pendingCleaningAdd]);

  // Update staff field from session
  useEffect(() => {
    if (profile && isNightCheckDialogOpen) {
      form.setValue('staff', profile.name || profile.email || "Unknown");
      const now = new Date();
      form.setValue('checkTime', now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [profile, isNightCheckDialogOpen, form]);


  // Permissions
  // Fallback to simpler role check if needed, but profile should have role
  // Assuming strict implementation of canCreateNightCheckPermission
  // We can pass the role string
  const userRole = profile?.role;
  // canCreateNightCheckPermission expects specific role types. We can cast or use a safe check.
  const canCreateNightCheck = ['owner', 'manager', 'nurse', 'care_assistant'].includes(userRole || ''); // Simplified for now
  const canDeleteNightCheckItem = ['owner', 'manager', 'nurse'].includes(userRole || '');

  // Handlers
  const isItemTypeAdded = (type: string) => nightCheckItems.some(i => i.type === type);

  const openDialog = (type: typeof dialogType, item?: any) => {
    setDialogType(type);
    setCurrentRecordingItem(item || null);
    setIsNightCheckDialogOpen(true);
  };

  const removeNightCheckItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('night_check_configurations')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      toast.success("Item removed");
      fetchData();
    } catch (e) {
      toast.error("Failed to remove item");
    }
  };

  const confirmFrequencyAndAdd = async () => {
    if (!profile?.active_organization_id || !id) return;
    try {
      const type = frequencyDialogType;
      const { error } = await supabase.from('night_check_configurations').insert({
        resident_id: id,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
        team_id: resident?.team_id,
        check_type: type,
        frequency_minutes: parseInt(selectedFrequency),
        created_by: profile.id,
        is_active: true
      });
      if (error) throw error;
      toast.success(`${type.replace('_', ' ')} added`);
      setIsFrequencyDialogOpen(false);
      setPendingNightCheckAdd(false);
      setPendingPositioningAdd(false);
      setPendingPadChangeAdd(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to add configuration");
      console.error(e);
    }
  };

  const confirmBedRailsAndAdd = async () => {
    if (!profile?.active_organization_id || !id) return;
    try {
      const { error } = await supabase.from('night_check_configurations').insert({
        resident_id: id,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
        team_id: resident?.team_id,
        check_type: 'bed_rails',
        frequency_minutes: parseInt(bedRailsFrequency),
        selected_items: selectedEquipment,
        created_by: profile.id,
        is_active: true
      });
      if (error) throw error;
      toast.success("Bed Rails Check added");
      setIsBedRailsConfigDialogOpen(false);
      setPendingBedRailsAdd(false);
      fetchData();
    } catch (e) {
      toast.error("Error adding configuration");
      console.error(e);
    }
  };

  const confirmEnvironmentalAndAdd = async () => {
    if (!profile?.active_organization_id || !id) return;
    try {
      const { error } = await supabase.from('night_check_configurations').insert({
        resident_id: id,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
        team_id: resident?.team_id,
        check_type: 'environmental',
        selected_items: selectedEnvironmentalItems,
        created_by: profile.id,
        is_active: true
      });
      if (error) throw error;
      toast.success("Environmental Check added");
      setIsEnvironmentalConfigDialogOpen(false);
      setPendingEnvironmentalAdd(false);
      fetchData();
    } catch (e) {
      toast.error("Error adding configuration");
    }
  };

  const confirmCleaningAndAdd = async () => {
    if (!profile?.active_organization_id || !id) return;
    try {
      const { error } = await supabase.from('night_check_configurations').insert({
        resident_id: id,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
        team_id: resident?.team_id,
        check_type: 'cleaning',
        selected_items: selectedCleaningItems,
        created_by: profile.id,
        is_active: true
      });
      if (error) throw error;
      toast.success("Cleaning added");
      setIsCleaningConfigDialogOpen(false);
      setPendingCleaningAdd(false);
      fetchData();
    } catch (e) {
      toast.error("Error adding configuration");
    }
  };

  const handleSubmit = async (values: NightCheckFormData) => {
    if (!profile?.active_organization_id || !id) return;

    try {
      let checkData: any = {};
      if (dialogType === "night_check") {
        checkData = { position: values.position, status: values.status };
      } else if (dialogType === "positioning") {
        checkData = { position: values.position };
      } else if (dialogType === "pad_change") {
        checkData = {
          continence_check: values.continence_check,
          pad_changed: values.pad_changed,
          skin_condition: values.skin_condition
        };
      } else if (dialogType === "bed_rails") {
        checkData = { equipment_checked: values.equipmentChecked };
      } else if (dialogType === "environmental") {
        checkData = { items_checked: values.itemsChecked };
      } else if (dialogType === "cleaning") {
        checkData = { items_cleaned: values.itemsCleaned };
      }

      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = values.checkTime || now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const { error } = await supabase.from('night_check_recordings').insert({
        resident_id: id,
        configuration_id: currentRecordingItem?.id,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
        team_id: resident?.team_id,
        check_type: dialogType,
        record_date: date,
        record_time: time,
        record_date_time: now.toISOString(),
        check_data: checkData,
        notes: values.additional_notes,
        recorded_by: profile.id,
        recorded_by_name: profile.name || profile.email
      });

      if (error) throw error;
      toast.success("Night check recorded");
      setIsNightCheckDialogOpen(false);
      fetchData();

    } catch (e) {
      toast.error("Failed to record check");
      console.error(e);
    }
  };

  // Helper handling
  const toggleEquipment = (item: string) => {
    setSelectedEquipment(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };
  const toggleEnvironmentalItem = (item: string) => {
    setSelectedEnvironmentalItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };
  const toggleCleaningItem = (item: string) => {
    setSelectedCleaningItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };
  const addCustomEquipment = () => {
    if (customEquipmentInput) {
      setCustomEquipmentList(p => [...p, customEquipmentInput]);
      setSelectedEquipment(p => [...p, customEquipmentInput]);
      setCustomEquipmentInput("");
      setShowCustomEquipmentInput(false);
    }
  };
  const addCustomEnvironmentalItem = () => {
    if (customEnvironmentalInput) {
      setCustomEnvironmentalList(p => [...p, customEnvironmentalInput]);
      setSelectedEnvironmentalItems(p => [...p, customEnvironmentalInput]);
      setCustomEnvironmentalInput("");
      setShowCustomEnvironmentalInput(false);
    }
  };
  const addCustomCleaningItem = () => {
    if (customCleaningInput) {
      setCustomCleaningList(p => [...p, customCleaningInput]);
      setSelectedCleaningItems(p => [...p, customCleaningInput]);
      setCustomCleaningInput("");
      setShowCustomCleaningInput(false);
    }
  };

  const getDialogTitle = () => {
    switch (dialogType) {
      case "night_check": return "Record Night Check";
      case "positioning": return "Record Positioning";
      case "pad_change": return "Record Pad Change";
      case "bed_rails": return "Bed Rails Equipment Check";
      case "environmental": return "Environmental Checks";
      case "cleaning": return "Record Cleaning";
      case "night_note": return "Night Note";
      default: return "Record Night Check";
    }
  };

  if (isLoading) return <div className="p-10 flex justify-center">Loading...</div>;
  if (!resident) return <div className="p-10 flex justify-center">Resident not found</div>;

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
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
            <h1 className="text-xl sm:text-2xl font-bold">Night Check</h1>
            <p className="text-muted-foreground text-sm">
              View night monitoring and wellness checks for {fullName}.
            </p>
          </div>
          <div className="flex flex-row gap-2">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Check
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Night Check Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isItemTypeAdded("night_check")} onClick={() => { setPendingNightCheckAdd(true); setFrequencyDialogType("night_check"); }}>
                  <Moon className="w-4 h-4 mr-2" /> Night Check
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isItemTypeAdded("positioning")} onClick={() => { setPendingPositioningAdd(true); setFrequencyDialogType("positioning"); }}>
                  <RotateCw className="w-4 h-4 mr-2" /> Positioning
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isItemTypeAdded("pad_change")} onClick={() => { setPendingPadChangeAdd(true); setFrequencyDialogType("pad_change"); }}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Pad Change
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isItemTypeAdded("bed_rails")} onClick={() => setPendingBedRailsAdd(true)}>
                  <BedDouble className="w-4 h-4 mr-2" /> Bed Rails Check
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isItemTypeAdded("environmental")} onClick={() => setPendingEnvironmentalAdd(true)}>
                  <Home className="w-4 h-4 mr-2" /> Environmental Check
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isItemTypeAdded("cleaning")} onClick={() => setPendingCleaningAdd(true)}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Cleaning
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDialog("night_note")}>
                  <StickyNote className="w-4 h-4 mr-2" /> Night Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => router.push(`/dashboard/residents/${id}/night-check/documents`)}>
              <Eye className="w-4 h-4 mr-2" /> See All Records
            </Button>
          </div>
        </div>

        {/* Configured Items */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Moon className="w-5 h-5 text-blue-600" />
              <span>Night Check Recording</span>
              {nightCheckItems.length > 0 && <BadgeComponent variant="outline" className="ml-auto bg-blue-50 border-blue-200 text-blue-700">{nightCheckItems.length} Items</BadgeComponent>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nightCheckItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No checks configured. Add checks using the button above.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nightCheckItems.map(item => (
                  <div key={item.id} className="relative group">
                    <Button className="bg-black text-white hover:bg-gray-800" onClick={() => openDialog(item.type, item)}>
                      {item.title}
                      {item.frequency && <span className="ml-2 text-xs opacity-70">({item.frequency}min)</span>}
                    </Button>
                    {canDeleteNightCheckItem && (
                      <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity p-0" onClick={(e) => { e.stopPropagation(); removeNightCheckItem(item.id); }}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Recordings */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>Tonight's Checks</span>
              <BadgeComponent variant="outline" className="ml-auto">{new Date().toLocaleDateString()}</BadgeComponent>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="night_check">Night Check</TabsTrigger>
                <TabsTrigger value="positioning">Positioning</TabsTrigger>
                <TabsTrigger value="pad_change">Pad Change</TabsTrigger>
                <TabsTrigger value="bed_rails">Bed Rails</TabsTrigger>
                <TabsTrigger value="environmental">Environmental</TabsTrigger>
                <TabsTrigger value="cleaning">Cleaning</TabsTrigger>
                <TabsTrigger value="night_note">Note</TabsTrigger>
              </TabsList>

              {["all", "night_check", "positioning", "pad_change", "bed_rails", "environmental", "cleaning", "night_note"].map(tabValue => {
                const filtered = tabValue === 'all' ? todayRecordings : todayRecordings.filter(r => r.checkType === tabValue);
                return (
                  <TabsContent key={tabValue} value={tabValue} className="mt-4">
                    {filtered.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">No records found.</p>
                    ) : (
                      <div className="space-y-2">
                        {filtered.map(rec => (
                          <div key={rec._id} className="text-sm border-b pb-2">
                            <span className="font-medium">{rec.recordTime}</span> - <span className="text-muted-foreground">{rec.checkType?.replace('_', ' ')}</span>
                            {rec.notes && <span className="ml-2 text-gray-500">- {rec.notes}</span>}
                            <span className="ml-2 text-xs italic text-gray-400">by {rec.recordedByName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={isFrequencyDialogOpen} onOpenChange={setIsFrequencyDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Set Frequency</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-2 py-4">
              {["15", "30", "60", "120", "180", "240", "300", "360"].map(freq => (
                <Button key={freq} variant={selectedFrequency === freq ? "default" : "outline"} onClick={() => setSelectedFrequency(freq)}>Every {freq} min</Button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsFrequencyDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmFrequencyAndAdd}>Confirm</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isBedRailsConfigDialogOpen} onOpenChange={setIsBedRailsConfigDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Bed Rails Config</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium">Select Equipment</h4>
                <div className="flex flex-col gap-2">
                  {['bed_rails', 'oxygen', 'air_bed', 'call_bell', 'monitor', 'mobility_aids'].map(e => (
                    <Button key={e} variant={selectedEquipment.includes(e) ? "default" : "outline"} onClick={() => toggleEquipment(e)} className="justify-start">{e.replace('_', ' ')}</Button>
                  ))}
                  {customEquipmentList.map(item => (
                    <Button key={item} variant={selectedEquipment.includes(item) ? "default" : "outline"} onClick={() => toggleEquipment(item)} className="justify-start">{item}</Button>
                  ))}
                  {showCustomEquipmentInput ? (
                    <div className="flex gap-2"><Input value={customEquipmentInput} onChange={(e) => setCustomEquipmentInput(e.target.value)} /><Button onClick={addCustomEquipment} size="sm">Add</Button></div>
                  ) : <Button variant="outline" onClick={() => setShowCustomEquipmentInput(true)} className="justify-start text-muted-foreground">Add Custom</Button>}
                </div>
              </div>
              <Button onClick={confirmBedRailsAndAdd} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEnvironmentalConfigDialogOpen} onOpenChange={setIsEnvironmentalConfigDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Environmental Config</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium">Select Items</h4>
                <div className="flex flex-col gap-2">
                  {['window', 'curtains', 'door', 'temperature'].map(e => (
                    <Button key={e} variant={selectedEnvironmentalItems.includes(e) ? "default" : "outline"} onClick={() => toggleEnvironmentalItem(e)} className="justify-start">{e}</Button>
                  ))}
                  {customEnvironmentalList.map(item => (
                    <Button key={item} variant={selectedEnvironmentalItems.includes(item) ? "default" : "outline"} onClick={() => toggleEnvironmentalItem(item)} className="justify-start">{item}</Button>
                  ))}
                  {showCustomEnvironmentalInput ? (
                    <div className="flex gap-2"><Input value={customEnvironmentalInput} onChange={(e) => setCustomEnvironmentalInput(e.target.value)} /><Button onClick={addCustomEnvironmentalItem} size="sm">Add</Button></div>
                  ) : <Button variant="outline" onClick={() => setShowCustomEnvironmentalInput(true)} className="justify-start text-muted-foreground">Add Custom</Button>}
                </div>
              </div>
              <Button onClick={confirmEnvironmentalAndAdd} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCleaningConfigDialogOpen} onOpenChange={setIsCleaningConfigDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cleaning Config</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium">Select Items</h4>
                <div className="flex flex-col gap-2">
                  {['bed', 'floor', 'bathroom', 'surfaces', 'bins'].map(e => (
                    <Button key={e} variant={selectedCleaningItems.includes(e) ? "default" : "outline"} onClick={() => toggleCleaningItem(e)} className="justify-start">{e}</Button>
                  ))}
                  {customCleaningList.map(item => (
                    <Button key={item} variant={selectedCleaningItems.includes(item) ? "default" : "outline"} onClick={() => toggleCleaningItem(item)} className="justify-start">{item}</Button>
                  ))}
                  {showCustomCleaningInput ? (
                    <div className="flex gap-2"><Input value={customCleaningInput} onChange={(e) => setCustomCleaningInput(e.target.value)} /><Button onClick={addCustomCleaningItem} size="sm">Add</Button></div>
                  ) : <Button variant="outline" onClick={() => setShowCustomCleaningInput(true)} className="justify-start text-muted-foreground">Add Custom</Button>}
                </div>
              </div>
              <Button onClick={confirmCleaningAndAdd} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Recording Dialog */}
        <Dialog open={isNightCheckDialogOpen} onOpenChange={setIsNightCheckDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
              {dialogType === 'positioning' && <DialogDescription className="text-red-500 text-xs">Check position regarding bed rails.</DialogDescription>}
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <FormField control={form.control} name="checkTime" render={({ field }) => (
                    <FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="staff" render={({ field }) => (
                    <FormItem><FormLabel>Staff</FormLabel><FormControl><Input readOnly className="bg-muted" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                {dialogType === 'night_check' && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name="position" render={({ field }) => (
                      <FormItem><FormLabel>Position</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="left_side">Left Side</SelectItem><SelectItem value="right_side">Right Side</SelectItem><SelectItem value="back">Back</SelectItem><SelectItem value="sitting_up">Sitting Up</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="asleep">Asleep</SelectItem><SelectItem value="awake">Awake</SelectItem><SelectItem value="walking">Walking</SelectItem><SelectItem value="sitting">Sitting</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                )}

                {dialogType === 'positioning' && (
                  <FormField control={form.control} name="position" render={({ field }) => (
                    <FormItem><FormLabel>Position</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="left_side">Left Side</SelectItem><SelectItem value="right_side">Right Side</SelectItem><SelectItem value="back">Back</SelectItem><SelectItem value="sitting_up">Sitting Up</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                )}

                {dialogType === 'pad_change' && (
                  <div className="space-y-2">
                    <FormField control={form.control} name="continence_check" render={({ field }) => (
                      <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="m-0">Continence Check</FormLabel></FormItem>
                    )} />
                    <FormField control={form.control} name="pad_changed" render={({ field }) => (
                      <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="m-0">Pad Changed</FormLabel></FormItem>
                    )} />
                    <FormField control={form.control} name="skin_condition" render={({ field }) => (
                      <FormItem><FormLabel>Skin</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="dry">Dry</SelectItem><SelectItem value="moist">Moist</SelectItem><SelectItem value="clammy">Clammy</SelectItem><SelectItem value="hot">Hot</SelectItem><SelectItem value="cold">Cold</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                )}

                {/* Additional Notes */}
                <FormField control={form.control} name="additional_notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <Button type="submit" className="w-full">Save</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}