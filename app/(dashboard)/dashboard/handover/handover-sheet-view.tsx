"use client";

import { Resident } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { format, addDays } from "date-fns";
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
import { formatTimestampToUKTime } from "@/lib/date-utils";

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
}

interface ResidentHandoverData {
  residentId: string;
  foodIntakeCount: number;
  foodIntakePercentage: number;
  totalFluid: number;
  incidentCount: number;
  hospitalTransferCount: number;
  medicationStatus: "all_administered" | "missed" | "pending";
  nextMedicationName?: string;
  nextMedicationTime?: string;
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
    <div className="border-b border-gray-300 print:break-inside-avoid">
      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-[10%_50%_40%]">
        {/* Column 1: Room Number */}
        <div className="border-r border-gray-300 p-4 flex items-center justify-center bg-gray-50">
          <div className="text-lg font-bold text-center">
            {resident.room_number || "—"}
          </div>
        </div>

        {/* Column 2: Resident Details */}
        <div className="border-r border-gray-300 p-4 space-y-3">
          {/* Resident Name */}
          <div className="font-bold text-base">
            {resident.first_name} {resident.last_name}
          </div>

          {/* Care Details - Bullet Points */}
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
          </div>

          {/* Auto-populated Data */}
          <div className="space-y-1 text-sm border-t border-gray-300 pt-2 mt-2">
            {handoverData && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Food Intake Today:</span>
                  <span className={cn(
                    "font-semibold",
                    handoverData.foodIntakePercentage >= 75 ? "text-green-600" :
                    handoverData.foodIntakePercentage >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {handoverData.foodIntakePercentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Fluid Intake:</span>
                  <span className={cn(
                    "font-semibold",
                    handoverData.totalFluid >= 1500 ? "text-green-600" :
                    handoverData.totalFluid >= 1000 ? "text-amber-600" : "text-red-600"
                  )}>
                    {handoverData.totalFluid} ml
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Medication:</span>
                  <span className={cn(
                    "font-semibold",
                    handoverData.medicationStatus === "all_administered" ? "text-green-600" :
                    handoverData.medicationStatus === "missed" ? "text-red-600" : "text-amber-600"
                  )}>
                    {handoverData.medicationStatus === "all_administered"
                      ? "All administered"
                      : `${handoverData.medicationStatus === "missed" ? "Missed dose" : "Pending"} ${handoverData.nextMedicationName ? `- ${handoverData.nextMedicationName}` : ""} (${handoverData.nextMedicationTime || "--:--"})`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Indicators */}
          {(hasIncident || hasHospitalTransfer) && (
            <div className="flex gap-2 pt-2">
              {hasIncident && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  ⚠ Incident recorded
                </Badge>
              )}
              {hasHospitalTransfer && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                  <Building2 className="w-3 h-3 mr-1" />
                  🏥 Hospital transfer
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Column 3: Comments */}
        <div className="p-2 relative bg-white">
          <textarea
            placeholder="Add handover notes..."
            className="w-full h-full min-h-[220px] text-sm border-0 resize-none focus:outline-none focus:ring-0 p-2"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {(isSaving || lastSavedText) && (
            <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground italic">
              {isSaving ? "Saving..." : lastSavedText}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Header - Always visible */}
        <div
          className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer border-b border-gray-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">{resident.room_number || "—"}</div>
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
            </div>

            {/* Auto-populated Data */}
            <div className="space-y-1 text-sm border-t border-gray-300 pt-2">
              {handoverData && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Food Intake:</span>
                    <span className={cn(
                      "font-semibold",
                      handoverData.foodIntakePercentage >= 75 ? "text-green-600" :
                      handoverData.foodIntakePercentage >= 50 ? "text-amber-600" : "text-red-600"
                    )}>
                      {handoverData.foodIntakePercentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Fluid Intake:</span>
                    <span className={cn(
                      "font-semibold",
                      handoverData.totalFluid >= 1500 ? "text-green-600" :
                      handoverData.totalFluid >= 1000 ? "text-amber-600" : "text-red-600"
                    )}>
                      {handoverData.totalFluid} ml
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Medication:</span>
                    <span className={cn(
                      "font-semibold",
                      handoverData.medicationStatus === "all_administered" ? "text-green-600" :
                      handoverData.medicationStatus === "missed" ? "text-red-600" : "text-amber-600"
                    )}>
                      {handoverData.medicationStatus === "all_administered"
                        ? "All administered"
                        : `${handoverData.medicationStatus === "missed" ? "Missed dose" : "Pending"} ${handoverData.nextMedicationName ? `- ${handoverData.nextMedicationName}` : ""} (${handoverData.nextMedicationTime || "--:--"})`}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Indicators */}
            {(hasIncident || hasHospitalTransfer) && (
              <div className="flex gap-2">
                {hasIncident && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Incident
                  </Badge>
                )}
                {hasHospitalTransfer && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    <Building2 className="w-3 h-3 mr-1" />
                    Hospital
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

      const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];

      const dataPromises = residents.map(async (resident) => {
        // Fetch food/fluid logs
        const { data: logs } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", dateStr)
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

        // Fetch incidents
        const { data: incidents } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", dateStr);

        // Fetch hospital transfers
        const { data: transfers } = await supabase
          .from("hospital_transfer_logs")
          .select("*")
          .eq("resident_id", resident.id)
          .eq("date", dateStr);

        // Fetch diet information
        const { data: dietInfo } = await supabase
          .from("diet_information")
          .select("*")
          .eq("resident_id", resident.id)
          .maybeSingle();

        // Fetch medication status for the shift
        const { data: medicationIntakes } = await supabase
          .from("medication_intakes")
          .select("status, scheduled_time, medication:medication_id (name)")
          .eq("resident_id", resident.id)
          .gte("scheduled_time", shiftStartUTC.toISOString())
          .lt("scheduled_time", shiftEndUTC.toISOString())
          .order("scheduled_time", { ascending: true });

        let medStatus: "all_administered" | "missed" | "pending" = "all_administered";
        let nextMedName: string | undefined = undefined;
        let nextMedTime: string | undefined = undefined;

        if (medicationIntakes && medicationIntakes.length > 0) {
          const missedIntakes = medicationIntakes.filter(i => i.status === 'missed' || i.status === 'refused');
          const pendingIntakes = medicationIntakes.filter(i => i.status === 'scheduled' || i.status === 'pending');

          if (missedIntakes.length > 0) {
            medStatus = "missed";
            nextMedTime = formatTimestampToUKTime(missedIntakes[0].scheduled_time);
            nextMedName = (missedIntakes[0].medication as any)?.name;
          } else if (pendingIntakes.length > 0) {
            medStatus = "pending";
            nextMedTime = formatTimestampToUKTime(pendingIntakes[0].scheduled_time);
            nextMedName = (pendingIntakes[0].medication as any)?.name;
          }
        }

        return {
          residentId: resident.id,
          foodIntakeCount: foodLogs.length,
          foodIntakePercentage: Math.min(foodIntakePercentage, 100),
          totalFluid,
          incidentCount: incidents?.length || 0,
          hospitalTransferCount: transfers?.length || 0,
          medicationStatus: medStatus,
          nextMedicationName: nextMedName,
          nextMedicationTime: nextMedTime,
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
    window.print();
  };

  const dateString = format(selectedDate, "yyyy-MM-dd");

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Controls - Hidden on Print */}
      <div className="border-b px-6 py-4 print:hidden bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <CalendarIcon className="w-3 h-3 mr-2" />
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

            <div className="space-y-1">
              <Label className="text-xs font-medium">Shift</Label>
              <div className="flex gap-1">
                <Button
                  variant={selectedShift === "day" ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setSelectedShift("day")}
                >
                  Day
                </Button>
                <Button
                  variant={selectedShift === "night" ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setSelectedShift("night")}
                >
                  Night
                </Button>
              </div>
            </div>
          </div>

          <Button onClick={handlePrint} size="sm" className="h-8">
            <Printer className="w-3 h-3 mr-2" />
            Print Handover Sheet
          </Button>
        </div>
      </div>

      {/* Printable Handover Sheet */}
      <div className="flex-1 overflow-auto print:overflow-visible">
        <div className="max-w-[1400px] mx-auto bg-white print:max-w-full">
          {/* Header Section */}
          <div className="border-b border-gray-300 p-6 print:p-4">
            <h1 className="text-2xl font-bold text-center mb-4 print:text-xl uppercase">
              {teamName} HANDOVER SHEET
            </h1>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm max-w-4xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">Date:</span>
                <span className="border-b border-dotted border-gray-400 flex-1 px-2">
                  {format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">In Charge:</span>
                <Input
                  value={inCharge}
                  onChange={(e) => setInCharge(e.target.value)}
                  className="flex-1 h-7 border-b border-dotted border-gray-400 border-t-0 border-x-0 rounded-none px-2 print:border-b"
                  placeholder="Name"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">Hospital:</span>
                <Input
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="flex-1 h-7 border-b border-dotted border-gray-400 border-t-0 border-x-0 rounded-none px-2 print:border-b"
                  placeholder="Name"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold min-w-[100px]">Vacant:</span>
                <Input
                  value={vacant}
                  onChange={(e) => setVacant(e.target.value)}
                  className="flex-1 h-7 border-b border-dotted border-gray-400 border-t-0 border-x-0 rounded-none px-2 print:border-b"
                  placeholder="Room(s)"
                />
              </div>

              <div className="col-span-2 flex items-center gap-4 pt-2">
                <span className="font-semibold">Shift:</span>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedShift === "day"}
                      onChange={() => setSelectedShift("day")}
                      className="w-4 h-4"
                    />
                    <span>Day</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedShift === "night"}
                      onChange={() => setSelectedShift("night")}
                      className="w-4 h-4"
                    />
                    <span>Night</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-300">
            {/* Table Header - Desktop */}
            <div className="hidden md:grid md:grid-cols-[10%_50%_40%] border-b border-gray-300 bg-gray-100">
              <div className="border-r border-gray-300 p-3 font-bold text-center text-sm uppercase">
                ROOM NO
              </div>
              <div className="border-r border-gray-300 p-3 font-bold text-sm uppercase">
                RESIDENT DETAILS
              </div>
              <div className="p-3 font-bold text-sm uppercase">
                {selectedShift.toUpperCase()} COMMENTS
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
