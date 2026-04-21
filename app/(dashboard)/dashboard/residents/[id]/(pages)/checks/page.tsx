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

  Scale,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge as BadgeComponent } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { getUKTodayDate, formatTimestampToUKTime } from "@/lib/date-utils";
import { WeightChart } from "@/components/residents/carefile/WeightChart";

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

// Generate time options in 15-minute intervals (00:00 to 23:45)
const generateTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      times.push(timeStr);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

// Format time for display (12-hour format with AM/PM)
const formatTimeForDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

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
      night_check: { icon: Moon, color: "bg-blue-600 hover:bg-blue-700", title: "Check" },
      positioning: { icon: RotateCw, color: "bg-indigo-600 hover:bg-indigo-700", title: "Positioning" },
      pad_change: { icon: ShieldCheck, color: "bg-violet-600 hover:bg-violet-700", title: "Pad Change" },
      bed_rails: { icon: BedDouble, color: "bg-purple-600 hover:bg-purple-700", title: "Bed Rails Check" },
      environmental: { icon: Home, color: "bg-fuchsia-600 hover:bg-fuchsia-700", title: "Environmental Check" },
      night_note: { icon: StickyNote, color: "bg-amber-600 hover:bg-amber-700", title: "Note" },
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

      // 3. Fetch Today's Recordings (using UK timezone)
      const today = getUKTodayDate(); // Returns YYYY-MM-DD format
      console.log("Fetching recordings for date:", today, "resident_id:", id, "Type:", typeof id);
      
      // Query using record_date (DATE type in Supabase)
      // Use date range query to handle PostgreSQL DATE type comparison more reliably
      // Calculate next day for range query - use UTC to avoid timezone issues
      const [year, month, day] = today.split('-').map(Number);
      const todayDate = new Date(Date.UTC(year, month - 1, day));
      const nextDayDate = new Date(todayDate);
      nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1);
      const nextDayStr = `${nextDayDate.getUTCFullYear()}-${String(nextDayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDayDate.getUTCDate()).padStart(2, '0')}`;
      
      console.log("Query date range: from", today, "to", nextDayStr);
      console.log("Today date object:", todayDate.toISOString());
      console.log("Next day date object:", nextDayDate.toISOString());
      
      // First, check if ANY records exist for this resident (no date filter)
      const { data: allResidentRecords, error: allResidentError } = await supabase
        .from('night_check_recordings')
        .select('id, check_type, record_date, record_time, created_at')
        .eq('resident_id', id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log("All resident records (no date filter):", allResidentRecords?.length || 0, "records");
      if (allResidentRecords && allResidentRecords.length > 0) {
        console.log("Sample resident records:", allResidentRecords.map(r => ({
          id: r.id,
          check_type: r.check_type,
          record_date: r.record_date,
          record_date_type: typeof r.record_date,
          created_at: r.created_at
        })));
      }
      
      // Try a simple equality query first
      const { data: recDataEq, error: recErrorEq } = await supabase
        .from('night_check_recordings')
        .select('*')
        .eq('resident_id', id)
        .eq('record_date', today)
        .order('record_date_time', { ascending: false });
      
      console.log("Equality query result:", recDataEq?.length || 0, "records, error:", recErrorEq);
      if (recDataEq && recDataEq.length > 0) {
        console.log("Equality query found records with dates:", recDataEq.map(r => r.record_date));
      }
      
      // Also try range query as fallback
      const { data: recData, error: recError } = await supabase
        .from('night_check_recordings')
        .select('*')
        .eq('resident_id', id)
        .gte('record_date', today)
        .lt('record_date', nextDayStr)
        .order('record_date_time', { ascending: false });
      
      console.log("Range query result:", recData?.length || 0, "records, error:", recError);
      if (recData && recData.length > 0) {
        console.log("Range query found records with dates:", recData.map(r => r.record_date));
      }
      
      // Use whichever query returned data (prefer equality, fallback to range)
      const finalRecData = (recDataEq && recDataEq.length > 0) ? recDataEq : recData;
      const finalRecError = recErrorEq || recError;
      
      if (finalRecError) {
        console.error("Error fetching recordings:", finalRecError);
        throw finalRecError;
      }
      
      console.log("Fetched recordings:", finalRecData?.length || 0, "records for", today);
      console.log("Raw recordings data:", finalRecData?.map(r => ({
        id: r.id,
        check_type: r.check_type,
        record_date: r.record_date,
        record_date_type: typeof r.record_date,
        record_time: r.record_time,
        check_data: r.check_data
      })));

      // Transform recordings to match component expectations
      const formattedRecordings = (finalRecData || []).map(r => {
        // Ensure check_data is always an object
        let checkData = r.check_data;
        if (!checkData || typeof checkData !== 'object') {
          checkData = {};
        }
        
        // Normalize record_date to YYYY-MM-DD format for consistency
        let normalizedDate = r.record_date;
        if (typeof normalizedDate === 'string') {
          normalizedDate = normalizedDate.split('T')[0]; // Remove time part if present
        }
        
        return {
          _id: r.id,
          checkType: r.check_type,
          recordTime: r.record_time,
          checkData: checkData,
          notes: r.notes || null,
          recordedByName: r.recorded_by_name || 'Unknown',
          recordDateTime: r.record_date_time,
        };
      });
      
      console.log("Formatted recordings:", formattedRecordings.length, "items");
      console.log("Check types found:", formattedRecordings.map(r => r.checkType));
      
      // Debug: Also fetch all recent recordings to see what dates are actually stored
      const { data: allRecentData, error: allRecentError } = await supabase
        .from('night_check_recordings')
        .select('id, check_type, record_date, record_time, created_at, resident_id')
        .eq('resident_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log("All recent recordings query - Error:", allRecentError);
      console.log("All recent recordings query - Count:", allRecentData?.length || 0);
      console.log("Last 10 recordings (all dates):", allRecentData?.map(r => ({
        id: r.id,
        check_type: r.check_type,
        record_date: r.record_date,
        record_date_type: typeof r.record_date,
        record_time: r.record_time,
        resident_id: r.resident_id,
        resident_id_type: typeof r.resident_id,
        created_at: r.created_at
      })));
      
      // Enhanced debug: Compare query date with stored dates
      if (allRecentData && allRecentData.length > 0) {
        const storedDates = allRecentData.map(r => {
          const date = typeof r.record_date === 'string' ? r.record_date.split('T')[0] : r.record_date;
          return date;
        });
        console.log("Stored dates in DB:", storedDates);
        console.log("Query date:", today);
        console.log("Date match check:", storedDates.includes(today));
        console.log("Resident ID match check - Query ID:", id, "Stored IDs:", [...new Set(allRecentData.map(r => r.resident_id))]);
      } else {
        // Try querying without resident_id filter to see if ANY records exist
        const { data: anyRecords } = await supabase
          .from('night_check_recordings')
          .select('id, resident_id, record_date, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        console.log("Any records in table (no filter):", anyRecords?.length || 0);
        console.log("Sample records:", anyRecords?.map(r => ({
          id: r.id,
          resident_id: r.resident_id,
          record_date: r.record_date,
          created_at: r.created_at
        })));
      }
      
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
      // Use UK timezone for time display - format as HH:mm for dropdown
      const ukTime = now.toLocaleTimeString('en-GB', { 
        timeZone: 'Europe/London',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
      // Round to nearest 15 minutes for dropdown
      const [hours, minutes] = ukTime.split(':').map(Number);
      const roundedMinutes = Math.round(minutes / 15) * 15;
      const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
      const finalHours = roundedMinutes === 60 ? (hours + 1) % 24 : hours;
      const timeValue = `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
      form.setValue('checkTime', timeValue);
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
        checkData = { 
          position: values.position || null, 
          status: values.status || null 
        };
      } else if (dialogType === "positioning") {
        checkData = { position: values.position || null };
      } else if (dialogType === "pad_change") {
        checkData = {
          continence_check: values.continence_check || false,
          pad_changed: values.pad_changed || false,
          skin_condition: values.skin_condition || null
        };
      } else if (dialogType === "bed_rails") {
        checkData = { equipment_checked: values.equipmentChecked || [] };
      } else if (dialogType === "environmental") {
        checkData = { items_checked: values.itemsChecked || [] };
      } else if (dialogType === "cleaning") {
        checkData = { items_cleaned: values.itemsCleaned || [] };
      } else if (dialogType === "night_note") {
        checkData = { notes: values.additional_notes || null };
      }
      
      console.log("Check data prepared for", dialogType, ":", checkData);

      // Use UK timezone for date and time
      const now = new Date();
      let date = getUKTodayDate(); // Returns YYYY-MM-DD format
      
      // Normalize date to ensure YYYY-MM-DD format (remove any time component)
      if (typeof date === 'string') {
        date = date.split('T')[0]; // Remove time part if present
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.error("Invalid date format:", date);
        toast.error("Invalid date format");
        return;
      }
      
      console.log("Normalized date for insertion:", date, "Type:", typeof date);
      
      // Get time in HH:mm format (24-hour)
      let timeFormatted: string;
      if (values.checkTime) {
        // If time is provided, ensure it's in HH:mm format
        // Handle both "HH:mm" and "HHmm" formats
        const timeStr = values.checkTime.replace(/[^0-9:]/g, '');
        if (timeStr.includes(':')) {
          const [hours, minutes] = timeStr.split(':');
          timeFormatted = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        } else if (timeStr.length >= 4) {
          timeFormatted = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
        } else {
          // Fallback to current UK time
          timeFormatted = now.toLocaleTimeString('en-GB', { 
            timeZone: 'Europe/London',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
        }
      } else {
        // Use current UK time
        timeFormatted = now.toLocaleTimeString('en-GB', { 
          timeZone: 'Europe/London',
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        });
      }

      // Ensure check_data is never null/undefined - use empty object if needed
      const finalCheckData = checkData && Object.keys(checkData).length > 0 ? checkData : {};
      
      const insertData = {
        resident_id: id,
        configuration_id: currentRecordingItem?.id || null,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
        team_id: resident?.team_id || null,
        check_type: dialogType,
        record_date: date, // DATE type in Supabase expects YYYY-MM-DD string
        record_time: timeFormatted, // TIME type expects HH:mm format
        record_date_time: now.toISOString(), // TIMESTAMPTZ accepts ISO string
        check_data: finalCheckData, // Always an object, never null
        notes: values.additional_notes || null,
        recorded_by: profile.id,
        recorded_by_name: profile.name || profile.email || "Unknown"
      };
      
      // Validate required fields
      if (!insertData.check_type) {
        console.error("Missing check_type!");
        toast.error("Check type is required");
        return;
      }
      
      if (!insertData.record_date) {
        console.error("Missing record_date!");
        toast.error("Record date is required");
        return;
      }

      console.log("=== INSERTING NIGHT CHECK ===");
      console.log("Dialog type:", dialogType);
      console.log("Form values:", values);
      console.log("Check data:", checkData);
      console.log("Insert data:", insertData);
      console.log("Date being inserted:", date, "Type:", typeof date);
      console.log("Time being inserted:", timeFormatted, "Type:", typeof timeFormatted);
      console.log("Current recording item:", currentRecordingItem);

      const { error, data } = await supabase
        .from('night_check_recordings')
        .insert(insertData)
        .select();

      if (error) {
        console.error("❌ Error inserting night check:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast.error(`Failed to record check: ${error.message}`);
        throw error;
      }

      console.log("✅ Night check inserted successfully:", data);
      console.log("Inserted record:", data?.[0]);
      
      // Verify the record was actually saved by querying it back
      if (data && data[0]) {
        const insertedId = data[0].id;
        const { data: verifyData, error: verifyError } = await supabase
          .from('night_check_recordings')
          .select('*')
          .eq('id', insertedId)
          .single();
        
        if (verifyError) {
          console.error("❌ Could not verify inserted record:", verifyError);
        } else {
          console.log("✅ Verified inserted record:", verifyData);
          const storedDate = typeof verifyData.record_date === 'string' 
            ? verifyData.record_date.split('T')[0] 
            : verifyData.record_date;
          console.log("Inserted date:", date, "Type:", typeof date);
          console.log("Stored date in DB:", storedDate, "Type:", typeof storedDate);
          console.log("Date match:", date === storedDate);
          console.log("Record date:", verifyData.record_date, "Check type:", verifyData.check_type);
          
          // Try querying by date to see if it's findable
          const { data: dateQueryData, error: dateQueryError } = await supabase
            .from('night_check_recordings')
            .select('id, check_type, record_date')
            .eq('resident_id', id)
            .eq('record_date', date);
          
          if (dateQueryError) {
            console.error("❌ Error querying by date:", dateQueryError);
          } else {
            console.log("✅ Date query result:", dateQueryData?.length || 0, "records found for date", date);
            if (dateQueryData && dateQueryData.length > 0) {
              console.log("Found records:", dateQueryData.map(r => ({
                id: r.id,
                check_type: r.check_type,
                record_date: r.record_date,
                record_date_type: typeof r.record_date
              })));
            }
          }
        }
      }
      
      toast.success("Check recorded");
      setIsNightCheckDialogOpen(false);
      
      // Reset form
      form.reset();
      
      // Refresh data immediately and again after a short delay
      console.log("Refreshing data immediately...");
      await fetchData();
      setTimeout(() => {
        console.log("Refreshing data again after delay...");
        fetchData();
      }, 500);

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
      case "night_check": return "Record Check";
      case "positioning": return "Record Positioning";
      case "pad_change": return "Record Pad Change";
      case "bed_rails": return "Bed Rails Equipment Check";
      case "environmental": return "Environmental Checks";
      case "cleaning": return "Record Cleaning";
      case "night_note": return "Note";
      default: return "Record Check";
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
          <Avatar className="w-16 h-16">
            <AvatarImage src={resident.image_url} alt={fullName} className="border" />
            <AvatarFallback className="text-base bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black text-xl">{fullName}</span>
              <span className="text-muted-foreground">/ Checks</span>
            </div>
            <p className="text-muted-foreground text-sm">
              View night monitoring and wellness checks
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
                <DropdownMenuLabel>Check Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isItemTypeAdded("night_check")} onClick={() => { setPendingNightCheckAdd(true); setFrequencyDialogType("night_check"); }}>
                  <Moon className="w-4 h-4 mr-2" /> Check
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
                  <StickyNote className="w-4 h-4 mr-2" /> Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => router.push(`/dashboard/residents/${id}/checks/documents`)}>
              <Eye className="w-4 h-4 mr-2" /> See All Records
            </Button>
          </div>
        </div>

        {/* Configured Items */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Moon className="w-5 h-5 text-blue-600" />
              <span>Check Recording</span>
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
              <span>Tonight&apos;s Checks</span>
              <BadgeComponent variant="outline" className="ml-auto">{new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}</BadgeComponent>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="night_check">Check</TabsTrigger>
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
                      <div className="space-y-3">
                        {filtered.map(rec => {
                          const checkData = rec.checkData || {};
                          const typeLabels: Record<string, string> = {
                            night_check: "Check",
                            positioning: "Positioning",
                            pad_change: "Pad Change",
                            bed_rails: "Bed Rails Check",
                            environmental: "Environmental Check",
                            night_note: "Note",
                            cleaning: "Cleaning",
                          };
                          
                          const positionLabels: Record<string, string> = {
                            left_side: "Left Side",
                            right_side: "Right Side",
                            back: "Back",
                            sitting_up: "Sitting Up"
                          };
                          
                          const statusLabels: Record<string, string> = {
                            asleep: "Asleep",
                            awake: "Awake",
                            walking: "Walking",
                            sitting: "Sitting"
                          };
                          
                          const skinConditionLabels: Record<string, string> = {
                            normal: "Normal",
                            dry: "Dry",
                            moist: "Moist",
                            clammy: "Clammy",
                            hot: "Hot",
                            cold: "Cold"
                          };
                          
                          const equipmentLabels: Record<string, string> = {
                            bed_rails: "Bed Rails",
                            oxygen: "Oxygen Equipment",
                            air_bed: "Air Bed / Pressure Mattress",
                            call_bell: "Call Bell",
                            monitor: "Monitor/Sensors",
                            mobility_aids: "Mobility Aids"
                          };
                          
                          const environmentalLabels: Record<string, string> = {
                            window: "Window",
                            curtains: "Curtains",
                            door: "Door",
                            temperature: "Temperature"
                          };
                          
                          const cleaningLabels: Record<string, string> = {
                            bed: "Bed",
                            floor: "Floor",
                            bathroom: "Bathroom",
                            surfaces: "Surfaces",
                            bins: "Bins"
                          };

                          return (
                            <div key={rec._id} className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-base">{rec.recordTime}</span>
                                  <BadgeComponent variant="outline" className="text-xs">
                                    {typeLabels[rec.checkType] || rec.checkType?.replace('_', ' ')}
                                  </BadgeComponent>
                                </div>
                                <span className="text-xs text-gray-400 italic">by {rec.recordedByName}</span>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                {rec.checkType === 'night_check' && (
                                  <>
                                    {checkData.position && (
                                      <div className="flex gap-2">
                                        <span className="text-gray-600 font-medium">Position:</span>
                                        <span>{positionLabels[checkData.position] || checkData.position}</span>
                                      </div>
                                    )}
                                    {checkData.status && (
                                      <div className="flex gap-2">
                                        <span className="text-gray-600 font-medium">Status:</span>
                                        <span>{statusLabels[checkData.status] || checkData.status}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {rec.checkType === 'positioning' && checkData.position && (
                                  <div className="flex gap-2">
                                    <span className="text-gray-600 font-medium">Position:</span>
                                    <span>{positionLabels[checkData.position] || checkData.position}</span>
                                  </div>
                                )}
                                
                                {rec.checkType === 'pad_change' && (
                                  <>
                                    {checkData.continence_check !== undefined && (
                                      <div className="flex gap-2">
                                        <span className="text-gray-600 font-medium">Continence Check:</span>
                                        <span>{checkData.continence_check ? 'Yes' : 'No'}</span>
                                      </div>
                                    )}
                                    {checkData.pad_changed !== undefined && (
                                      <div className="flex gap-2">
                                        <span className="text-gray-600 font-medium">Pad Changed:</span>
                                        <span>{checkData.pad_changed ? 'Yes' : 'No'}</span>
                                      </div>
                                    )}
                                    {checkData.skin_condition && (
                                      <div className="flex gap-2">
                                        <span className="text-gray-600 font-medium">Skin Condition:</span>
                                        <span>{skinConditionLabels[checkData.skin_condition] || checkData.skin_condition}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {rec.checkType === 'bed_rails' && checkData.equipment_checked && (
                                  <div className="flex gap-2">
                                    <span className="text-gray-600 font-medium">Equipment Checked:</span>
                                    <span className="flex-1">
                                      {Array.isArray(checkData.equipment_checked) 
                                        ? checkData.equipment_checked.map((item: string) => equipmentLabels[item] || item).join(', ')
                                        : checkData.equipment_checked}
                                    </span>
                                  </div>
                                )}
                                
                                {rec.checkType === 'environmental' && checkData.items_checked && (
                                  <div className="flex gap-2">
                                    <span className="text-gray-600 font-medium">Items Checked:</span>
                                    <span className="flex-1">
                                      {Array.isArray(checkData.items_checked)
                                        ? checkData.items_checked.map((item: string) => environmentalLabels[item] || item).join(', ')
                                        : checkData.items_checked}
                                    </span>
                                  </div>
                                )}
                                
                                {rec.checkType === 'cleaning' && checkData.items_cleaned && (
                                  <div className="flex gap-2">
                                    <span className="text-gray-600 font-medium">Items Cleaned:</span>
                                    <span className="flex-1">
                                      {Array.isArray(checkData.items_cleaned)
                                        ? checkData.items_cleaned.map((item: string) => cleaningLabels[item] || item).join(', ')
                                        : checkData.items_cleaned}
                                    </span>
                                  </div>
                                )}
                                
                                {rec.checkType === 'night_note' && checkData.notes && (
                                  <div className="flex gap-2">
                                    <span className="text-gray-600 font-medium">Note:</span>
                                    <span className="flex-1">{checkData.notes}</span>
                                  </div>
                                )}
                                
                                {rec.notes && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t">
                                    <span className="text-gray-600 font-medium">Additional Notes:</span>
                                    <span className="flex-1 text-gray-700">{rec.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Weight Monitoring Section */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Scale className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">Weight Monitoring</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart residentId={id} residentName={fullName} />
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={isFrequencyDialogOpen} onOpenChange={setIsFrequencyDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Set Frequency</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-2 py-4">
              {[
                { value: "15", label: "Every 15 min" },
                { value: "30", label: "Every 30 min" },
                { value: "60", label: "Every hour" },
                { value: "120", label: "Every 2 hours" },
                { value: "180", label: "Every 3 hours" },
                { value: "240", label: "Every 4 hours" },
                { value: "300", label: "Every 5 hours" },
                { value: "360", label: "Every 6 hours" }
              ].map(freq => (
                <Button key={freq.value} variant={selectedFrequency === freq.value ? "default" : "outline"} onClick={() => setSelectedFrequency(freq.value)}>{freq.label}</Button>
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
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {formatTimeForDisplay(time)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
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