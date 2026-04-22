"use client";

import { Resident } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { format, addDays } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Printer, AlertCircle, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { getCurrentShift, SHIFT_CONFIG } from "@/lib/config/shift-config";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useHandoverComment } from "@/hooks/use-handover-comment";
import { cn, getAge } from "@/lib/utils";

interface HandoverSheetViewProps {
  residents: Resident[];
  teamId: string;
  teamName: string;
  currentUserId?: string;
  currentUserName?: string;
  organizationId?: string;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  selectedShift: "day" | "night";
  setSelectedShift: (s: "day" | "night") => void;
  inCharge: string;
  setInCharge: (val: string) => void;
  hospital: string;
  setHospital: (val: string) => void;
  vacant: string;
  setVacant: (val: string) => void;
  onPrint?: () => void;
}

interface ResidentHandoverData {
  residentId: string;
  foodIntakeCount: number;
  foodIntakePercentage: number;
  totalFluid: number;
  incidentCount: number;
  fallCount: number;
  woundCount: number;
  hospitalTransferCount: number;
  appointmentCount: number;
  appointments: any[];
  dietInfo?: {
    textureGrade?: string;
    fluidConsistency?: string;
    diabeticStatus?: string;
    dietaryRequirements?: string;
  };
}

const ResidentRow = ({
  resident,
  handoverData,
  teamId,
  currentUserId,
  currentUserName,
  organizationId,
  shift,
  date,
}: {
  resident: Resident;
  handoverData?: ResidentHandoverData;
  teamId: string;
  currentUserId?: string;
  currentUserName?: string;
  organizationId?: string;
  shift: "day" | "night";
  date: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    comment,
    setComment,
    isSaving,
    lastSavedText,
  } = useHandoverComment({
    teamId,
    residentId: resident.id,
    date,
    shift,
    currentUserId: currentUserId || "",
    currentUserName: currentUserName || "",
    organizationId: organizationId || "",
  });

  const hasIncident = (handoverData?.incidentCount || 0) > 0;
  const hasHospitalTransfer = (handoverData?.hospitalTransferCount || 0) > 0;

  return (
    <div className="bg-background rounded-lg border border-gray-100 print:break-inside-avoid hover:shadow-md transition-all">
      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-[10%_50%_40%]">
        {/* Column 1: Room Number */}
        <div className="p-6 flex items-center justify-center">
          <div className="text-lg font-bold text-center">
            {resident.room_number || "—"}
          </div>
        </div>

        {/* Column 2: Resident Details */}
        <div className="p-6 space-y-3 border-l border-gray-100">
          {/* Resident Name & Photo */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border shadow-sm">
              <AvatarImage src={resident.image_url || undefined} alt="Resident photo" />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {resident.first_name?.[0]}{resident.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="font-bold text-base">
              {resident.first_name} {resident.last_name}
            </div>
          </div>

          {/* Care Details - Bullet Points */}
          <div className="space-y-1 text-sm pt-1">
            {handoverData?.dietInfo?.textureGrade && (
              <div>• Level {handoverData.dietInfo.textureGrade} diet</div>
            )}
            {handoverData?.dietInfo?.fluidConsistency && (
              <div>• Level {handoverData.dietInfo.fluidConsistency} fluids</div>
            )}
            {handoverData?.dietInfo?.diabeticStatus && (
              <div>• Diabetic {handoverData.dietInfo.diabeticStatus}</div>
            )}
            {handoverData?.appointments && handoverData.appointments.length > 0 && (
              <div className="mt-3 text-purple-700 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Upcoming Appointments:
                </div>
                {handoverData.appointments.map((apt: any) => (
                  <div key={apt.id} className="ml-2 text-xs pl-3 py-1 bg-purple-50/50 rounded">
                    <span className="font-semibold">{format(new Date(apt.start_time), "HH:mm")}</span> - {apt.title}
                    {apt.location && <span className="text-muted-foreground italic"> ({apt.location})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-populated Data */}
          <div className="space-y-1.5 text-sm pt-3 mt-3 border-t border-gray-100">
            {handoverData && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Food Intake (24h):</span>
                  <span className={cn(
                    "font-semibold",
                    handoverData.foodIntakePercentage >= 75 ? "text-green-600" :
                    handoverData.foodIntakePercentage >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {handoverData.foodIntakePercentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Fluid Intake (24h):</span>
                  <span className={cn(
                    "font-semibold",
                    handoverData.totalFluid >= 1500 ? "text-green-600" :
                    handoverData.totalFluid >= 1000 ? "text-amber-600" : "text-red-600"
                  )}>
                    {handoverData.totalFluid} ml
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Indicators */}
          {handoverData && (handoverData.incidentCount > 0 || handoverData.hospitalTransferCount > 0 || handoverData.fallCount > 0 || handoverData.woundCount > 0 || handoverData.appointmentCount > 0) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {handoverData.incidentCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Incident{handoverData.incidentCount > 1 ? `s - ${handoverData.incidentCount}` : ' - 1'}
                </Badge>
              )}
              {handoverData.fallCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Fall{handoverData.fallCount > 1 ? `s - ${handoverData.fallCount}` : ' - 1'}
                </Badge>
              )}
              {handoverData.woundCount > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Wound Status - {handoverData.woundCount} active
                </Badge>
              )}
              {handoverData.appointmentCount > 0 && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Appointment{handoverData.appointmentCount > 1 ? `s - ${handoverData.appointmentCount}` : ' - 1'}
                </Badge>
              )}
              {handoverData.hospitalTransferCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                  <Building2 className="w-3 h-3 mr-1" />
                  Hospital Transport{handoverData.hospitalTransferCount > 1 ? `s - ${handoverData.hospitalTransferCount}` : ' - 1'}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Column 3: Comments */}
        <div className="p-6 relative border-l border-gray-100">
          <textarea
            placeholder="Add handover notes..."
            className="w-full h-full min-h-[220px] text-sm border-0 resize-none focus:outline-none focus:ring-0 bg-transparent"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {(isSaving || lastSavedText) && (
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground italic">
              {isSaving ? "Saving..." : lastSavedText}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Header - Always visible */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">{resident.room_number || "—"}</div>
            <Avatar className="w-8 h-8 border shadow-sm">
              <AvatarImage src={resident.image_url || undefined} alt="Resident photo" />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {resident.first_name?.[0]}{resident.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="font-bold text-base">
              {resident.first_name} {resident.last_name}
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>

        {/* Mobile Expandable Content */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Care Details */}
            <div className="space-y-1 text-sm">
              {handoverData?.dietInfo?.textureGrade && (
                <div>• Level {handoverData.dietInfo.textureGrade} diet</div>
              )}
              {handoverData?.dietInfo?.fluidConsistency && (
                <div>• Level {handoverData.dietInfo.fluidConsistency} fluids</div>
              )}
              {handoverData?.dietInfo?.diabeticStatus && (
                <div>• Diabetic {handoverData.dietInfo.diabeticStatus}</div>
              )}
              {handoverData?.appointments && handoverData.appointments.length > 0 && (
                <div className="mt-3 text-purple-700 space-y-1 bg-purple-50 p-2 rounded-md border border-purple-100">
                  <div className="font-bold flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    Appointments:
                  </div>
                  {handoverData.appointments.map((apt: any) => (
                    <div key={apt.id} className="text-xs">
                      <span className="font-semibold">{format(new Date(apt.start_time), "HH:mm")}</span> - {apt.title}
                      {apt.location && <span className="text-muted-foreground"> @ {apt.location}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-populated Data */}
            <div className="space-y-1 text-sm border-t border-gray-300 pt-2">
              {handoverData && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Food Intake (Last 24h):</span>
                    <span className={cn(
                      "font-semibold",
                      handoverData.foodIntakePercentage >= 75 ? "text-green-600" :
                      handoverData.foodIntakePercentage >= 50 ? "text-amber-600" : "text-red-600"
                    )}>
                      {handoverData.foodIntakePercentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Fluid Intake (Last 24h):</span>
                    <span className={cn(
                      "font-semibold",
                      handoverData.totalFluid >= 1500 ? "text-green-600" :
                      handoverData.totalFluid >= 1000 ? "text-amber-600" : "text-red-600"
                    )}>
                      {handoverData.totalFluid} ml
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Indicators */}
            {handoverData && (handoverData.incidentCount > 0 || handoverData.hospitalTransferCount > 0 || handoverData.fallCount > 0 || handoverData.woundCount > 0 || handoverData.appointmentCount > 0) && (
              <div className="flex flex-wrap gap-2">
                {handoverData.incidentCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Incident{handoverData.incidentCount > 1 ? `s - ${handoverData.incidentCount}` : ' - 1'}
                  </Badge>
                )}
                {handoverData.fallCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Fall{handoverData.fallCount > 1 ? `s - ${handoverData.fallCount}` : ' - 1'}
                  </Badge>
                )}
                {handoverData.woundCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Wound Status - {handoverData.woundCount} active
                  </Badge>
                )}
                {handoverData.appointmentCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Appointment{handoverData.appointmentCount > 1 ? `s - ${handoverData.appointmentCount}` : ' - 1'}
                  </Badge>
                )}
                {handoverData.hospitalTransferCount > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    <Building2 className="w-3 h-3 mr-1" />
                    Hospital Transport{handoverData.hospitalTransferCount > 1 ? `s - ${handoverData.hospitalTransferCount}` : ' - 1'}
                  </Badge>
                )}
              </div>
            )}

            {/* Comments - Large text area */}
            <div className="relative">
              <Label className="text-sm font-medium mb-2 block">Comments</Label>
              <textarea
                placeholder="Add handover notes..."
                className="w-full min-h-[150px] text-sm border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {(isSaving || lastSavedText) && (
                <div className="mt-1 text-[10px] text-muted-foreground italic">
                  {isSaving ? "Saving..." : lastSavedText}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function HandoverSheetView({
  residents,
  teamId,
  teamName,
  currentUserId,
  currentUserName,
  organizationId,
  selectedDate,
  setSelectedDate,
  selectedShift,
  setSelectedShift,
  inCharge,
  setInCharge,
  hospital,
  setHospital,
  vacant,
  setVacant,
  onPrint,
}: HandoverSheetViewProps) {
  const { supabase } = useSupabase();
  const [handoverData, setHandoverData] = useState<Record<string, ResidentHandoverData>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchHandoverData = useCallback(async () => {
    if (!residents.length || !supabase) return;

    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const UK_TIMEZONE = "Europe/London";

      // Calculate shift boundaries in UTC
      let shiftStartUTC: Date;
      let shiftEndUTC: Date;

      if (selectedShift === "day") {
        shiftStartUTC = fromZonedTime(`${dateStr}T08:00:00`, UK_TIMEZONE);
        shiftEndUTC = fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE);
      } else {
        // Night shift starts at 8 PM on selectedDate and ends at 8 AM next day
        const nextDayStr = format(addDays(selectedDate, 1), "yyyy-MM-dd");
        shiftStartUTC = fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE);
        shiftEndUTC = fromZonedTime(`${nextDayStr}T08:00:00`, UK_TIMEZONE);
      }

      const startOfDayUTC = fromZonedTime(`${dateStr}T00:00:00`, UK_TIMEZONE);
      const endOfDayUTC = fromZonedTime(`${dateStr}T23:59:59`, UK_TIMEZONE);

      const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];

      const dataPromises = residents.map(async (resident) => {
        // Fetch food/fluid logs for the full calendar day
        const { data: logs } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("timestamp", startOfDayUTC.toISOString())
          .lte("timestamp", endOfDayUTC.toISOString())
          .eq("is_archived", false)
          .order("timestamp", { ascending: false });

        // Separate food and fluid logs
        const foodLogs = (logs || []).filter(
          (log) =>
            log.type_of_food_drink &&
            !fluidTypes.includes(log.type_of_food_drink) &&
            !log.fluid_consumed_ml &&
            log.amount_eaten &&
            log.amount_eaten !== "None" &&
            log.amount_eaten.trim() !== ""
        );

        const fluidLogs = (logs || []).filter(
          (log) =>
            fluidTypes.includes(log.type_of_food_drink) ||
            (log.fluid_consumed_ml && log.fluid_consumed_ml > 0)
        );

        const totalFluid = fluidLogs.reduce(
          (sum, log) => sum + (log.fluid_consumed_ml || 0),
          0
        );

        // Calculate food intake percentage (assuming 3 meals per day)
        const foodIntakePercentage = Math.round((foodLogs.length / 3) * 100);

        // Fetch incidents for the shift
        const { data: incidents } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());

        // Fetch incident folders for the shift
        const { data: folders } = await supabase
          .from("incident_folders")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());

        // Fetch hospital transfers for the shift
        const { data: transfers } = await supabase
          .from("hospital_transfer_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("created_at", shiftStartUTC.toISOString())
          .lt("created_at", shiftEndUTC.toISOString());
          
        // Fetch active wounds
        const { data: wounds } = await supabase
          .from("wounds")
          .select("*")
          .eq("resident_id", resident.id)
          .neq("status", "healed");

        // Fetch appointments for the selected date
        const { data: appointments } = await supabase
          .from("appointments")
          .select("*")
          .eq("resident_id", resident.id)
          .gte("start_time", startOfDayUTC.toISOString())
          .lte("start_time", endOfDayUTC.toISOString());

        // Fetch diet information
        const { data: dietInfo } = await supabase
          .from("diet_information")
          .select("*")
          .eq("resident_id", resident.id)
          .maybeSingle();

        // Calculate counts from folders and loose incidents
        const fallsFromFolders = (folders || []).filter(f => f.folder_type === 'fall').length;
        const incidentsFromFolders = (folders || []).filter(f => f.folder_type === 'incident').length;

        // Differentiate Incidents vs Falls from the incidents table (only those NOT in a folder to avoid double counting)
        const fallsFromIncidents = (incidents || []).filter(inc => {
          if (inc.folder_id) return false;
          const types = inc.incident_types || [];
          return types.some((t: string) => t.toLowerCase() === 'fall' || t.toLowerCase() === 'falls');
        }).length;
        const nonFallIncidentsFromIncidents = (incidents || []).filter(inc => {
          if (inc.folder_id) return false;
          const types = inc.incident_types || [];
          return !types.some((t: string) => t.toLowerCase() === 'fall' || t.toLowerCase() === 'falls');
        }).length;

        return {
          residentId: resident.id,
          foodIntakeCount: foodLogs.length,
          foodIntakePercentage: Math.min(foodIntakePercentage, 100),
          totalFluid,
          incidentCount: incidentsFromFolders + nonFallIncidentsFromIncidents,
          fallCount: fallsFromFolders + fallsFromIncidents,
          woundCount: wounds?.length || 0,
          hospitalTransferCount: transfers?.length || 0,
          appointmentCount: appointments?.length || 0,
          appointments: appointments || [],
          dietInfo: dietInfo
            ? {
                textureGrade: dietInfo.texture_grade,
                fluidConsistency: dietInfo.fluid_consistency,
                diabeticStatus: dietInfo.dietary_requirements?.includes("diabetic")
                  ? "tablet controlled"
                  : undefined,
                dietaryRequirements: dietInfo.dietary_requirements,
              }
            : undefined,
        };
      });

      const results = await Promise.all(dataPromises);
      const dataMap = results.reduce(
        (acc, data) => {
          acc[data.residentId] = data;
          return acc;
        },
        {} as Record<string, ResidentHandoverData>
      );

      setHandoverData(dataMap);
    } catch (error) {
      console.error("Error fetching handover data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [residents, supabase, selectedDate, selectedShift]);

  useEffect(() => {
    fetchHandoverData();
  }, [fetchHandoverData]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const dateString = format(selectedDate, "yyyy-MM-dd");

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      {/* Header Controls - Hidden on Print */}
      <div className="px-6 py-5 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 rounded-lg">
                    <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Shift</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={selectedShift === "day" ? "default" : "outline"}
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => setSelectedShift("day")}
                >
                  Day
                </Button>
                <Button
                  variant={selectedShift === "night" ? "default" : "outline"}
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={() => setSelectedShift("night")}
                >
                  Night
                </Button>
              </div>
            </div>
          </div>

          <Button onClick={handlePrint} size="sm" className="h-9 rounded-lg gap-2">
            <Printer className="w-3.5 h-3.5" />
            Print Handover Sheet
          </Button>
        </div>
      </div>

      {/* Printable Handover Sheet */}
      <div className="flex-1 overflow-auto print:overflow-visible">
        <div className="max-w-[1400px] mx-auto bg-white print:max-w-full">
          {/* Header Section */}
          <div className="p-6 print:p-4 mb-4">
            <h1 className="text-2xl font-bold text-center mb-8 print:text-xl uppercase tracking-tight">
              {teamName} HANDOVER SHEET
            </h1>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[100px] text-muted-foreground">Date:</span>
                <span className="border-b border-dotted border-gray-200 flex-1 px-2 py-1">
                  {format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[100px] text-muted-foreground">In Charge:</span>
                <Input
                  value={inCharge}
                  onChange={(e) => setInCharge(e.target.value)}
                  className="flex-1 h-8 border-b border-dotted border-gray-200 border-t-0 border-x-0 rounded-none px-2 focus-visible:border-primary print:border-b"
                  placeholder="Name"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[100px] text-muted-foreground">Hospital:</span>
                <Input
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="flex-1 h-8 border-b border-dotted border-gray-200 border-t-0 border-x-0 rounded-none px-2 focus-visible:border-primary print:border-b"
                  placeholder="Number"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium min-w-[100px] text-muted-foreground">Vacant:</span>
                <Input
                  value={vacant}
                  onChange={(e) => setVacant(e.target.value)}
                  className="flex-1 h-8 border-b border-dotted border-gray-200 border-t-0 border-x-0 rounded-none px-2 focus-visible:border-primary print:border-b"
                  placeholder="Room(s)"
                />
              </div>

              <div className="col-span-2 flex items-center gap-4 pt-2">
                <span className="font-medium text-muted-foreground">Shift:</span>
                <div className="flex gap-10 items-center">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedShift === "day"}
                      onChange={() => setSelectedShift("day")}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm">Day</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedShift === "night"}
                      onChange={() => setSelectedShift("night")}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm">Night</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Shift Summary Section */}
            {!isLoading && (
              <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto py-6 px-6 rounded-xl bg-muted/5">
                <div className="text-center space-y-2">
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Total Incidents</div>
                  <div className={cn(
                    "text-3xl font-bold",
                    Object.values(handoverData).reduce((sum, h) => sum + h.incidentCount, 0) > 0 ? "text-red-600" : "text-gray-400"
                  )}>
                    {Object.values(handoverData).reduce((sum, h) => sum + h.incidentCount, 0)}
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Total Falls</div>
                  <div className={cn(
                    "text-3xl font-bold",
                    Object.values(handoverData).reduce((sum, h) => sum + h.fallCount, 0) > 0 ? "text-orange-600" : "text-gray-400"
                  )}>
                    {Object.values(handoverData).reduce((sum, h) => sum + h.fallCount, 0)}
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Hospital Transport</div>
                  <div className={cn(
                    "text-3xl font-bold",
                    Object.values(handoverData).reduce((sum, h) => sum + h.hospitalTransferCount, 0) > 0 ? "text-blue-600" : "text-gray-400"
                  )}>
                    {Object.values(handoverData).reduce((sum, h) => sum + h.hospitalTransferCount, 0)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Residents List */}
          <div className="space-y-3">
            {/* Table Header - Desktop */}
            <div className="hidden md:grid md:grid-cols-[10%_50%_40%] px-4 py-2">
              <div className="p-2 font-semibold text-center text-xs uppercase tracking-wider text-muted-foreground">
                Room
              </div>
              <div className="p-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Resident Details
              </div>
              <div className="p-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                {selectedShift} Comments
              </div>
            </div>

            {/* Table Header - Mobile */}
            <div className="md:hidden border-b border-gray-300 bg-gray-100 p-3">
              <div className="font-bold text-sm text-center uppercase">
                {selectedShift.toUpperCase()} HANDOVER
              </div>
            </div>

            {/* Table Body */}
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Loading resident data...
              </div>
            ) : residents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No residents found
              </div>
            ) : (
              residents.map((resident) => (
                <ResidentRow
                  key={resident.id}
                  resident={resident}
                  handoverData={handoverData[resident.id]}
                  teamId={teamId}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  organizationId={organizationId}
                  shift={selectedShift}
                  date={dateString}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:max-w-full {
            max-width: 100% !important;
          }
          textarea {
            border: none !important;
            background: transparent !important;
            resize: none !important;
            overflow: visible !important;
          }
          input[type="text"] {
            border: none !important;
            border-bottom: 1px dotted #9ca3af !important;
            background: transparent !important;
          }
          .print\\:border-b {
            border-bottom: 1px dotted #9ca3af !important;
          }
          .border-gray-300 {
            border-color: #d1d5db !important;
          }
        }
      `}</style>
    </div>
  );
}
