"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Loader2, ArrowRight, Search, MoreVertical, Edit, StopCircle, Package, History, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ShiftTimes from "@/components/medication/daily/ShiftTimes";
import { toast } from "sonner";
import { config } from "@/config";
import { getUKTodayDate, UK_TIMEZONE, formatTimestampToUKTime } from "@/lib/date-utils";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { Resident } from "@/types";

// UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Stock Dialogs
import { ReceiveStockDialog } from "@/components/medication/management/ReceiveStockDialog";
import { AdjustStockDialog } from "@/components/medication/management/AdjustStockDialog";
import { StockHistoryDialog } from "@/components/medication/management/StockHistoryDialog";
import { DiscontinueMedicationDialog } from "@/components/medication/management/DiscontinueMedicationDialog";
import EditMedicationDialog from "@/components/medication/forms/EditMedicationDialog";

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

  // Tab & Filters State
  const [activeTab, setActiveTab] = useState<string>("tracker");
  const [stockSearch, setStockSearch] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<string>("all");

  // Selected med/resident for dialogs
  const [selectedMedication, setSelectedMedication] = useState<any | null>(null);
  const [selectedResidentForMed, setSelectedResidentForMed] = useState<{ id: string; name: string } | null>(null);
  const [activeDialog, setActiveDialog] = useState<
    "edit" | "receive" | "adjust" | "history" | "discontinue" | null
  >(null);

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

      // 2. Fetch Active Medications with stock management fields
      const { data: medsData, error: medsError } = await supabase
        .from("medications")
        .select(
          "id, name, strength, strength_unit, times, schedule_type, resident_id, status, total_count, dosage_form, frequency, route, is_controlled_drug, controlled_drug_schedule, organization_id"
        )
        .in("resident_id", residentIds)
        .eq("status", "active");
        
      if (medsError) throw medsError;

      // Enrich medications with resident's care_home_id and team_id from the resident record
      const enrichedMeds = (medsData || []).map((med) => {
        const res = residentsList.find((r) => r.id === med.resident_id);
        return {
          ...med,
          care_home_id: res?.care_home_id || null,
          team_id: res?.team_id || null,
        };
      });
      setMedications(enrichedMeds);

      // 3. Fetch Today's Intakes
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

  // Re-fetch data when the window regains focus
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

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setActiveDialog(null);
      setSelectedMedication(null);
      setSelectedResidentForMed(null);
    }
  }, []);

  const handleOpenDialog = (dialog: "edit" | "receive" | "adjust" | "history" | "discontinue", med: any, res: any) => {
    setSelectedMedication(med);
    setSelectedResidentForMed({ id: res.id, name: `${res.first_name} ${res.last_name}` });
    setActiveDialog(dialog);
  };

  // Stock status helper logic
  const getStockStatus = (count: number | null) => {
    if (count === null || count === undefined) return "unknown";
    if (count === 0) return "out";
    if (count < 20) return "low";
    return "ok";
  };

  const getStockUnitLabel = (medication: any) => {
    if (medication.schedule_type === "PRN (As Needed)" || medication.schedule_type === "Supplement") {
      const dosageUnit = medication.frequency || "";
      if (dosageUnit.includes('mL')) return 'mL';
      if (dosageUnit.includes('Drops')) return 'drops';
      if (dosageUnit.includes('Puffs')) return 'puffs';
      if (dosageUnit.includes('Patches')) return 'patches';
      if (dosageUnit.includes('Sachets')) return 'sachets';
      if (dosageUnit.includes('Injections')) return 'mL';
      if (dosageUnit.includes('Tablets')) return 'tablets';
    }

    const dosageForm = medication.dosage_form?.toLowerCase() || "";
    if (dosageForm.includes('liquid') || dosageForm.includes('syrup')) return 'mL';
    if (dosageForm.includes('drops')) return 'drops';
    if (dosageForm.includes('inhaler')) return 'puffs';
    if (dosageForm.includes('spray')) return 'sprays';
    if (dosageForm.includes('injection')) return 'mL';
    if (dosageForm.includes('sachet') || dosageForm.includes('powder')) return 'sachets';
    if (dosageForm.includes('patch')) return 'patches';
    if (dosageForm.includes('tablet')) return 'tablets';
    if (dosageForm.includes('capsule')) return 'capsules';
    if (dosageForm.includes('softgel')) return 'softgels';
    if (dosageForm.includes('gummy')) return 'gummies';
    if (dosageForm.includes('cream') || dosageForm.includes('ointment') || dosageForm.includes('gel')) return 'packs';

    return medication.strength_unit === 'mg' ? 'units' : medication.strength_unit || 'units';
  };

  const getStockBadge = (medication: any) => {
    const count = medication.total_count;
    const status = getStockStatus(count);
    const unitLabel = getStockUnitLabel(medication);
    const displayCount = count !== null && count !== undefined ? `${count} ${unitLabel}` : "-";

    switch (status) {
      case "out":
        return (
          <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-300 text-[10px] px-1.5 py-0 h-5 shrink-0 font-medium">
            <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />
            Out of Stock
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-300 text-[10px] px-1.5 py-0 h-5 shrink-0 font-medium">
            <TrendingDown className="h-3 w-3 text-yellow-600 shrink-0" />
            Low ({displayCount})
          </Badge>
        );
      case "ok":
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-300 text-[10px] px-1.5 py-0 h-5 shrink-0 font-medium">
            <TrendingUp className="h-3 w-3 text-green-600 shrink-0" />
            {displayCount}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 bg-gray-50 text-gray-600 text-[10px] px-1.5 py-0 h-5 shrink-0 font-medium">
            Not tracked
          </Badge>
        );
    }
  };

  const residentsWithPendingMeds = residents.map(resident => {
    // Current resident medications for the chosen time
    const resMeds = medications.filter(m => 
      m.resident_id === resident.id && 
      m.times?.includes(selectedTime) && 
      m.schedule_type !== 'PRN (As Needed)'
    );

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

  // Stock filtering memo
  const filteredResidentMeds = useMemo(() => {
    return residents.map(resident => {
      let resMeds = medications.filter(m => m.resident_id === resident.id);
      
      if (stockFilter === "low") {
        resMeds = resMeds.filter(m => {
          const count = m.total_count;
          return count !== null && count > 0 && count < 20;
        });
      } else if (stockFilter === "out") {
        resMeds = resMeds.filter(m => m.total_count === 0);
      } else if (stockFilter === "controlled") {
        resMeds = resMeds.filter(m => m.is_controlled_drug);
      }

      if (stockSearch.trim() !== "") {
        const query = stockSearch.toLowerCase();
        const matchesResidentName = 
          resident.first_name?.toLowerCase().includes(query) || 
          resident.last_name?.toLowerCase().includes(query);
        
        if (!matchesResidentName) {
          resMeds = resMeds.filter(m => m.name?.toLowerCase().includes(query));
        }
      }

      return {
        resident,
        meds: resMeds,
        hasMatch: stockSearch.trim() === "" 
          ? (stockFilter === "all" || resMeds.length > 0)
          : (
              resident.first_name?.toLowerCase().includes(stockSearch.toLowerCase()) || 
              resident.last_name?.toLowerCase().includes(stockSearch.toLowerCase()) ||
              resMeds.length > 0
            )
      };
    }).filter(item => item.hasMatch);
  }, [residents, medications, stockSearch, stockFilter]);

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-7rem)] flex flex-col bg-gray-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-4 py-3">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded">
                <Pill className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Medications</h1>
                <p className="text-xs text-gray-500">
                  {activeTab === "tracker" 
                    ? `${residentsWithPendingMeds.length} residents have pending meds for ${selectedTime}`
                    : "Track and manage physical stock levels"
                  }
                </p>
              </div>
            </div>
            
            <TabsList className="grid grid-cols-2 w-[240px]">
              <TabsTrigger value="tracker">Tracker</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
            </TabsList>
          </div>
          
          {/* Subheader controls */}
          {activeTab === "tracker" ? (
            <ShiftTimes selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Input 
                  placeholder="Search resident or medication..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="h-8 text-xs pl-8 bg-gray-50 border-gray-200"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="h-8 text-xs w-[160px] bg-gray-50 border-gray-200">
                  <SelectValue placeholder="All Stock Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="low">Low Stock (&lt; 20)</SelectItem>
                  <SelectItem value="out">Out of Stock (0)</SelectItem>
                  <SelectItem value="controlled">Controlled Drugs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <TabsContent value="tracker" className="h-full m-0 outline-none flex flex-col">
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
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center font-semibold">
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
        </TabsContent>

        <TabsContent value="stock" className="h-full m-0 outline-none flex flex-col">
          {filteredResidentMeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="p-3 bg-gray-100 rounded-full mb-3">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">No stock records found</h3>
              <p className="text-xs text-gray-500 mt-1">
                No residents or medications matched your active stock filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
              {filteredResidentMeds.map(({ resident, meds }) => (
                <div
                  key={resident.id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  {/* Card Header */}
                  <div 
                    className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer"
                    onClick={() => handleCardClick(resident.id)}
                  >
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
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {meds.length} Meds
                    </Badge>
                  </div>

                  {/* Card Body (Medications list with stocks) */}
                  <div className="p-3 flex-1 min-h-[5rem]">
                    {meds.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">No medications matching filters</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {meds.map((med) => (
                          <div key={med.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-800 truncate" title={med.name}>
                                {med.name}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {med.strength} {med.strength_unit} • {med.dosage_form}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {getStockBadge(med)}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                                    <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                  <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                                    Stock Management
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => handleOpenDialog("receive", med, resident)}
                                  >
                                    <Package className="mr-2 h-3.5 w-3.5" />
                                    Receive Stock
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => handleOpenDialog("adjust", med, resident)}
                                  >
                                    <TrendingUp className="mr-2 h-3.5 w-3.5" />
                                    Adjust Stock
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => handleOpenDialog("history", med, resident)}
                                  >
                                    <History className="mr-2 h-3.5 w-3.5" />
                                    View Stock History
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                                    Configuration
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => handleOpenDialog("edit", med, resident)}
                                  >
                                    <Edit className="mr-2 h-3.5 w-3.5" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs text-red-600 focus:text-red-600"
                                    onClick={() => handleOpenDialog("discontinue", med, resident)}
                                  >
                                    <StopCircle className="mr-2 h-3.5 w-3.5" />
                                    Discontinue
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </div>

      {/* Dialogs */}
      <EditMedicationDialog
        medication={selectedMedication}
        open={activeDialog === "edit"}
        onOpenChange={handleDialogClose}
        onSuccess={fetchData}
      />

      <ReceiveStockDialog
        medication={selectedMedication ? {
          ...selectedMedication,
          dosage_form: selectedMedication.dosage_form
        } : null}
        residentId={selectedResidentForMed?.id || ""}
        residentName={selectedResidentForMed?.name || ""}
        open={activeDialog === "receive"}
        onOpenChange={handleDialogClose}
        onSuccess={fetchData}
      />

      <AdjustStockDialog
        medication={selectedMedication ? {
          ...selectedMedication,
          dosage_form: selectedMedication.dosage_form
        } : null}
        residentId={selectedResidentForMed?.id || ""}
        residentName={selectedResidentForMed?.name || ""}
        open={activeDialog === "adjust"}
        onOpenChange={handleDialogClose}
        onSuccess={fetchData}
      />

      <DiscontinueMedicationDialog
        medication={selectedMedication}
        residentName={selectedResidentForMed?.name || ""}
        open={activeDialog === "discontinue"}
        onOpenChange={handleDialogClose}
        onSuccess={fetchData}
      />

      <StockHistoryDialog
        medication={selectedMedication ? {
          ...selectedMedication,
          dosage_form: selectedMedication.dosage_form
        } : null}
        open={activeDialog === "history"}
        onOpenChange={handleDialogClose}
      />
    </Tabs>
  );
}
