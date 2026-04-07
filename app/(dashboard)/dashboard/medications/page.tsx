"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Loader2, Calendar, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { config } from "@/config";
import { getUKTodayDate, UK_TIMEZONE, formatTimestampToUKTime } from "@/lib/date-utils";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { Resident } from "@/types";

type Wound = any; // reused some imports mentally, we just need types for Meds

// Re-using the time helper
const getNearestMedicationTime = (): string | null => {
  const now = new Date();
  const ukNow = toZonedTime(now, UK_TIMEZONE);
  const currentHour = ukNow.getHours();
  const currentMinute = ukNow.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const allTimes = config.times.flatMap((timeGroup) => timeGroup.values);
  if (allTimes.length === 0) return null;

  let nearestTime = allTimes[0];
  let smallestDiff = Infinity;

  allTimes.forEach((time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const diff = Math.abs(timeInMinutes - currentTimeInMinutes);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      nearestTime = time;
    }
  });

  return nearestTime;
};

export default function MedicationsPage() {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { activeTeamId, activeCareHomeId, activeOrganizationId } = useActiveTeam();
  
  const [selectedTime, setSelectedTime] = useState<string>(
    getNearestMedicationTime() || config.times[0]?.values[0] || "08:00"
  );
  
  const [residents, setResidents] = useState<Resident[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const contextLoading = isProfileLoading;

  const fetchData = useCallback(async () => {
    if (contextLoading || (!activeTeamId && !activeCareHomeId && !activeOrganizationId)) return;

    try {
      setIsLoading(true);

      let query = supabase.from("residents").select("*");

      if (activeTeamId) {
        query = query.eq("team_id", activeTeamId);
      } else if (activeCareHomeId) {
        query = query.eq("care_home_id", activeCareHomeId);
      } else if (activeOrganizationId) {
        query = query.eq("organization_id", activeOrganizationId);
      }

      const { data: residentsData, error: residentsError } = await query;
      if (residentsError) throw residentsError;

      const residentsList = residentsData || [];
      setResidents(residentsList);

      if (residentsList.length === 0) {
        setMedications([]);
        setTodayIntakes([]);
        return;
      }

      const residentIds = residentsList.map((r) => r.id);

      // 2. Fetch Active Medications
      const { data: medsData, error: medsError } = await supabase
        .from("medications")
        .select("id, name, strength, strength_unit, times, schedule_type, resident_id, status")
        .in("resident_id", residentIds)
        .eq("status", "active");
        
      if (medsError) throw medsError;
      setMedications(medsData || []);

      // 3. Fetch Today's Intakes — same approach as resident medication tab
      const startOfDayStr = getUKTodayDate();
      const rangeStart = fromZonedTime(`${startOfDayStr}T00:00:00`, UK_TIMEZONE);
      const rangeEnd = fromZonedTime(`${startOfDayStr}T23:59:59.999`, UK_TIMEZONE);

      const { data: intakesData, error: intakesError } = await supabase
        .from("medication_intakes")
        .select("id, medication_id, resident_id, scheduled_time, status")
        .in("resident_id", residentIds)
        .gte("scheduled_time", rangeStart.toISOString())
        .lte("scheduled_time", rangeEnd.toISOString());

      if (intakesError) {
        console.error("Error fetching today's intakes:", intakesError);
        setTodayIntakes([]);
      } else {
        setTodayIntakes(intakesData || []);
      }

    } catch (error) {
      console.error("Error fetching medications context:", error);
      toast.error("Failed to load medication tracking");
    } finally {
      setIsLoading(false);
    }
  }, [activeTeamId, activeCareHomeId, activeOrganizationId, contextLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch data when the window regains focus (e.g. user administered meds and came back)
  useEffect(() => {
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchData]);

  const handleCardClick = (residentId: string) => {
    router.push(`/dashboard/residents/${residentId}/medication`);
  };

  const residentsWithPendingMeds = residents.map(resident => {
    // Current resident medications for the chosen time
    const resMeds = medications.filter(m => 
      m.resident_id === resident.id && 
      m.times?.includes(selectedTime) && 
      m.schedule_type !== 'PRN (As Needed)' && 
      m.schedule_type !== 'Topical'
    );

    // Filter to only the ones that are pending
    // Uses formatTimestampToUKTime — same as the resident medication tab (line 969)
    const pendingMeds = resMeds.filter(med => {
      // Find intake records for this medication at the selected time today
      const intake = todayIntakes.find(i => 
        i.medication_id === med.id && 
        formatTimestampToUKTime(i.scheduled_time) === selectedTime
      );
      // Pending = no intake record exists, or intake exists but hasn't been acted upon
      return !intake || intake.status === 'scheduled';
    });

    return {
      resident,
      pendingMeds
    };
  }).filter(item => item.pendingMeds.length > 0);

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // All valid config times flattened
  const allTimes = config.times.flatMap((t) => t.values);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-gray-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded">
                <Pill className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Pending Medications</h1>
                <p className="text-xs text-gray-500">
                  {residentsWithPendingMeds.length} residents have meds for {selectedTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Time Filter */}
              <Select value={selectedTime} onValueChange={(value) => setSelectedTime(value)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  {allTimes.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {residentsWithPendingMeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-3 bg-gray-100 rounded-full mb-3">
              <Pill className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No pending medications</h3>
            <p className="text-xs text-gray-500 mt-1">
              All set! There are no medications to be given to active residents for {selectedTime}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {residentsWithPendingMeds.map(({ resident, pendingMeds }) => (
              <div
                key={resident.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                onClick={() => handleCardClick(resident.id)}
              >
                {/* Card Header */}
                <div className="p-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 border border-white">
                      <AvatarImage src={resident.image_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
                        {resident.first_name?.[0]}
                        {resident.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs text-gray-900 truncate">
                        {resident.first_name} {resident.last_name}
                      </h3>
                      {resident.room_number && (
                        <p className="text-[10px] text-gray-500">Rm {resident.room_number}</p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center">
                    {pendingMeds.length}
                  </Badge>
                </div>

                {/* Card Body (Medications List) */}
                <div className="p-2.5 flex-1 min-h-[5rem]">
                  <p className="text-[10px] text-gray-500 mb-1 font-medium bg-gray-50 px-1 py-0.5 rounded uppercase tracking-wider inline-block">To give</p>
                  <ul className="space-y-1.5">
                    {pendingMeds.map((med) => (
                      <li key={med.id} className="text-xs text-gray-800 flex flex-col">
                        <span className="font-medium truncate" title={med.name}>{med.name}</span>
                        {(med.strength || med.strength_unit) && (
                          <span className="text-[10px] text-gray-500">{med.strength} {med.strength_unit}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Footer */}
                <div className="p-2 bg-gray-50 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-7 text-xs hover:bg-blue-50 hover:text-blue-600 px-2"
                  >
                    <span>Administer</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
