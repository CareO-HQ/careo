"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, Calendar, ArrowRight, Filter as FilterIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { toast } from "sonner";

type Wound = {
  id: string;
  resident_id: string;
  wound_folder_id: string;
  wound_name: string;
  location: string;
  wound_type: string;
  stage: string | null;
  status: string;
  date_identified: string;
  last_reviewed_date: string | null;
  last_reviewed_by: string | null;
  organization_id: string;
  team_id: string | null;
  care_home_id: string | null;
  resident?: {
    id: string;
    first_name: string;
    last_name: string;
    image_url: string | null;
    room_number?: string;
  };
};

type WoundAlertRead = {
  wound_id: string;
};

export default function WoundsPage() {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [filter, setFilter] = useState<"all" | "active" | "healing" | "deteriorating" | "infected">("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadWoundIds, setUnreadWoundIds] = useState<Set<string>>(new Set());
  const unreadWoundIdsRef = useRef<Set<string>>(new Set());

  const userRole = profile?.role;
  const userId = profile?.id;
  const activeOrganizationId = profile?.active_organization_id;
  const activeTeamId = profile?.active_team_id;
  const activeCareHomeId = profile?.active_care_home_id;
  const canSeeUnreadIndicators = Boolean(userId);

  const markWoundsAsRead = useCallback(async (woundIds: string[]) => {
    if (!canSeeUnreadIndicators || !userId || woundIds.length === 0) return;

    const payload = woundIds.map((woundId) => ({
      user_id: userId,
      wound_id: woundId,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("wound_alert_reads")
      .upsert(payload, { onConflict: "user_id,wound_id" });

    if (error) {
      console.error("Failed to mark wound alerts as read:", error);
    }
  }, [canSeeUnreadIndicators, userId]);

  const fetchWounds = useCallback(async () => {
    if (!activeOrganizationId || !profile) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from("wounds")
        .select(`
          *,
          resident:residents(id, first_name, last_name, image_url, room_number)
        `)
        .neq("status", "healed"); // Exclude healed wounds

      // Filtering logic:
      // 1. If manager/owner/admin, filter by organization_id AND active_care_home_id if selected
      // 2. Otherwise, filter by team_id
      const isPowerUser = userRole === "manager" || userRole === "owner" || userRole === "saas_admin";

      if (isPowerUser) {
        query = query.eq("organization_id", activeOrganizationId);
        if (activeCareHomeId) {
          query = query.eq("care_home_id", activeCareHomeId);
        }
      } else if (activeTeamId) {
        query = query.eq("team_id", activeTeamId);
      }

      query = query.order("date_identified", { ascending: false });

      const { data: woundsData, error } = await query.limit(100);

      if (error) {
        console.error("Supabase wounds query error:", error);
        throw error;
      }

      const nextWounds = woundsData || [];
      setWounds(nextWounds);

      if (canSeeUnreadIndicators && userId && nextWounds.length > 0) {
        const woundIds = nextWounds.map((wound) => wound.id);
        const { data: readData, error: readError } = await supabase
          .from("wound_alert_reads")
          .select("wound_id")
          .eq("user_id", userId)
          .in("wound_id", woundIds);

        if (readError) {
          console.error("Failed to fetch wound read statuses:", readError);
          // Fallback: keep wounds visibly unread if read-tracking table is unavailable.
          // This prevents silently hiding the red banner/dot indicators.
          const unreadFallbackSet = new Set(woundIds);
          setUnreadWoundIds(unreadFallbackSet);
          unreadWoundIdsRef.current = unreadFallbackSet;
        } else {
          const readRows = (readData as WoundAlertRead[] | null) ?? [];
          const readSet = new Set(readRows.map((row) => row.wound_id));
          const unreadSet = new Set(woundIds.filter((woundId) => !readSet.has(woundId)));
          setUnreadWoundIds(unreadSet);
          unreadWoundIdsRef.current = unreadSet;
        }
      } else {
        setUnreadWoundIds(new Set());
        unreadWoundIdsRef.current = new Set();
      }

      // Extract unique room numbers (using as "units")
      const uniqueRooms = Array.from(
        new Set(
          (woundsData || [])
            .map((w) => w.resident?.room_number)
            .filter((r): r is string => !!r)
        )
      ).sort();
      setUnits(uniqueRooms);
    } catch (error) {
      console.error("Error fetching wounds:", error);
      toast.error("Failed to load wounds");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, activeTeamId, activeCareHomeId, userRole, profile, canSeeUnreadIndicators, userId]);

  useEffect(() => {
    fetchWounds();
  }, [fetchWounds]);

  useEffect(() => {
    return () => {
      const unreadIds = Array.from(unreadWoundIdsRef.current);
      void markWoundsAsRead(unreadIds);
    };
  }, [markWoundsAsRead]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "healing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "deteriorating":
        return "bg-red-100 text-red-800 border-red-200";
      case "infected":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredWounds = useMemo(() => wounds.filter((wound) => {
    if (filter !== "all" && wound.status !== filter) return false;
    if (unitFilter !== "all" && wound.resident?.room_number !== unitFilter) return false;
    return true;
  }), [wounds, filter, unitFilter]);

  const unreadFilteredCount = useMemo(
    () => filteredWounds.filter((wound) => unreadWoundIds.has(wound.id)).length,
    [filteredWounds, unreadWoundIds]
  );

  const handleWoundClick = (wound: Wound) => {
    router.push(`/dashboard/residents/${wound.resident_id}/wounds/${wound.wound_folder_id}`);
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-gray-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 rounded">
                <Heart className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Wounds</h1>
                <p className="text-xs text-gray-500">
                  {filteredWounds.length} active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <Select
                value={filter}
                onValueChange={(value: "all" | "active" | "healing" | "deteriorating" | "infected") => setFilter(value)}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="healing">Healing</SelectItem>
                  <SelectItem value="deteriorating">Deteriorating</SelectItem>
                  <SelectItem value="infected">Infected</SelectItem>
                </SelectContent>
              </Select>

              {/* Room Filter */}
              {units.length > 0 && (
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="Rooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {units.map((room) => (
                      <SelectItem key={room} value={room}>
                        Rm {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {canSeeUnreadIndicators && unreadFilteredCount > 0 && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {unreadFilteredCount} new wound{unreadFilteredCount === 1 ? "" : "s"} need attention.
          </div>
        )}

        {filteredWounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-3 bg-gray-100 rounded-full mb-3">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No wounds found</h3>
            <p className="text-xs text-gray-500 mt-1">
              {filter !== "all" || unitFilter !== "all"
                ? "Try adjusting your filters"
                : "No active wounds to display"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {filteredWounds.map((wound) => (
              <div
                key={wound.id}
                className="relative bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                onClick={() => handleWoundClick(wound)}
              >
                {canSeeUnreadIndicators && unreadWoundIds.has(wound.id) && (
                  <span className="absolute right-2 top-2 z-10 h-2.5 w-2.5 rounded-full bg-red-600" />
                )}
                {/* Card Header */}
                <div className="p-2.5 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 border border-white">
                      <AvatarImage src={wound.resident?.image_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
                        {wound.resident?.first_name?.[0]}
                        {wound.resident?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs text-gray-900 truncate">
                        {wound.resident?.first_name} {wound.resident?.last_name}
                      </h3>
                      {wound.resident?.room_number && (
                        <p className="text-[10px] text-gray-500">Rm {wound.resident.room_number}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-2.5 flex-1 space-y-2">
                  {/* Status Badge */}
                  <Badge className={`${getStatusColor(wound.status)} border w-full justify-center text-[10px] py-0.5 font-medium capitalize`}>
                    {wound.status}
                  </Badge>

                  {/* Wound Type */}
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Type</p>
                    <p className="text-xs font-medium text-gray-900 truncate">{wound.wound_type}</p>
                  </div>

                  {/* Location */}
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Location</p>
                    <p className="text-xs font-medium text-gray-900 truncate">{wound.location}</p>
                  </div>

                  {/* Date */}
                  <div className="pt-1.5 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(wound.date_identified), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-2 bg-gray-50 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-7 text-xs hover:bg-blue-50 hover:text-blue-600 px-2"
                  >
                    <span>View Details</span>
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
