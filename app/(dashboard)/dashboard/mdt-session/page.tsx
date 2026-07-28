"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { residentService, Resident } from "@/lib/resident-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldAlert, User, Briefcase, MapPin, Users } from "lucide-react";

// Standard MDT professions
const MDT_PROFESSIONS = [
  "GP",
  "District Nurse",
  "Physiotherapist",
  "Occupational Therapist",
  "Dietitian",
  "Speech & Language Therapist (SLT)",
  "Pharmacist",
  "Mental Health Professional",
  "Social Worker",
  "Other"
];

export default function MdtSessionPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { supabase } = useSupabase();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [fullName, setFullName] = useState("");
  const [profession, setProfession] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState("");

  // Options fetched from DB
  const [units, setUnits] = useState<any[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isLoadingResidents, setIsLoadingResidents] = useState(false);

  // Pre-fill name from profile if available
  useEffect(() => {
    if (profile?.name) {
      setFullName(profile.name);
    }
  }, [profile]);

  // Fetch Units (Teams)
  useEffect(() => {
    async function fetchUnits() {
      if (!supabase || !profile) return;
      try {
        let query = supabase.from("teams").select("id, name");
        if (profile.active_care_home_id) {
          query = query.eq("care_home_id", profile.active_care_home_id);
        } else if (profile.active_organization_id) {
          query = query.eq("organization_id", profile.active_organization_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        setUnits(data || []);
      } catch (error) {
        console.error("Error fetching units:", error);
        toast.error("Failed to load units");
      } finally {
        setIsLoadingUnits(false);
      }
    }
    fetchUnits();
  }, [supabase, profile]);

  // Fetch Residents when unit changes
  useEffect(() => {
    async function fetchResidents() {
      if (!selectedUnitId) {
        setResidents([]);
        return;
      }
      setIsLoadingResidents(true);
      try {
        const data = await residentService.getResidentsByTeamId(selectedUnitId);
        setResidents(data || []);
      } catch (error) {
        console.error("Error fetching residents:", error);
        toast.error("Failed to load residents for this unit");
      } finally {
        setIsLoadingResidents(false);
      }
    }
    fetchResidents();
  }, [selectedUnitId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!profession) {
      toast.error("Please select your profession");
      return;
    }
    if (!selectedUnitId) {
      toast.error("Please select a unit");
      return;
    }
    if (!selectedResidentId) {
      toast.error("Please select the resident you are visiting");
      return;
    }

    startTransition(async () => {
      const selectedResident = residents.find(r => r.id === selectedResidentId);
      const selectedUnit = units.find(u => u.id === selectedUnitId);
      const residentName = selectedResident ? `${selectedResident.firstName} ${selectedResident.lastName}` : "";

      // Insert session log entry into public.mdt_login_logs table
      if (supabase && profile?.id) {
        try {
          const { error: logError } = await supabase.from("mdt_login_logs").insert({
            user_id: profile.id,
            full_name: fullName.trim(),
            profession,
            unit_id: selectedUnitId,
            unit_name: selectedUnit?.name || "",
            resident_id: selectedResidentId,
            resident_name: residentName,
            care_home_id: profile.active_care_home_id || (profile as any).care_home_id || null,
            organization_id: profile.active_organization_id || (profile as any).organization_id || null,
            logged_in_at: new Date().toISOString()
          });

          if (logError) {
            console.error("Failed to insert MDT login log:", logError);
          }
        } catch (err) {
          console.error("Failed to log MDT session entry:", err);
        }
      }

      const sessionData = {
        userId: profile?.id,
        fullName: fullName.trim(),
        profession,
        unitId: selectedUnitId,
        unitName: selectedUnit?.name || "",
        residentId: selectedResidentId,
        residentName,
        timestamp: Date.now()
      };

      // Set cookie (session cookie, cleared when browser session closes)
      document.cookie = `mdt_session_data=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; SameSite=Lax`;

      toast.success("Visit session registered successfully");
      router.push(`/dashboard/residents/${selectedResidentId}/multidisciplinary-note`);
    });
  };

  if (profile && profile.role !== "mdt") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          This portal is reserved for external Multi-Disciplinary Team (MDT) professionals.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-8 px-4">
      <Card className="w-full max-w-lg border-0 shadow-lg bg-white">
        <CardHeader className="space-y-1 text-center bg-indigo-50/50 rounded-t-xl py-6">
          <CardTitle className="text-2xl font-bold text-indigo-900">MDT Visit Registration</CardTitle>
          <CardDescription>
            Please register your visit details to gain secure access to the resident&apos;s clinical note.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <User className="w-4 h-4 text-indigo-500" /> Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="Dr. John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {/* Profession */}
            <div className="space-y-2">
              <Label htmlFor="profession" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Briefcase className="w-4 h-4 text-indigo-500" /> Profession
              </Label>
              <Select
                value={profession}
                onValueChange={setProfession}
                disabled={isPending}
              >
                <SelectTrigger id="profession">
                  <SelectValue placeholder="Select your profession..." />
                </SelectTrigger>
                <SelectContent>
                  {MDT_PROFESSIONS.map((prof) => (
                    <SelectItem key={prof} value={prof}>
                      {prof}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit (Team) */}
            <div className="space-y-2">
              <Label htmlFor="unit" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MapPin className="w-4 h-4 text-indigo-500" /> Select Unit
              </Label>
              <Select
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                disabled={isPending || isLoadingUnits}
              >
                <SelectTrigger id="unit">
                  <SelectValue placeholder={isLoadingUnits ? "Loading units..." : "Select unit..."} />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resident */}
            <div className="space-y-2">
              <Label htmlFor="resident" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Users className="w-4 h-4 text-indigo-500" /> Select Resident
              </Label>
              <Select
                value={selectedResidentId}
                onValueChange={setSelectedResidentId}
                disabled={isPending || isLoadingResidents || !selectedUnitId}
              >
                <SelectTrigger id="resident">
                  <SelectValue
                    placeholder={
                      !selectedUnitId
                        ? "Select unit first..."
                        : isLoadingResidents
                        ? "Loading residents..."
                        : residents.length === 0
                        ? "No active residents found in this unit"
                        : "Select resident..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {residents.map((res) => (
                    <SelectItem key={res.id} value={res.id}>
                      {res.firstName} {res.lastName} {res.roomNumber ? `(Room ${res.roomNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 transition-colors mt-6"
              disabled={isPending}
            >
              {isPending ? "Registering..." : "Start Visit Session"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
