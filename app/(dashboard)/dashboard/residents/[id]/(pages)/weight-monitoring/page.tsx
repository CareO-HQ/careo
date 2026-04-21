"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter, useParams } from "next/navigation";
import { WeightChart } from "@/components/residents/carefile/WeightChart";

export default function WeightMonitoringPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { profile } = useProfile();

  const [resident, setResident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResident = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setResident(data);
      } catch (error) {
        console.error("Error fetching resident:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResident();
  }, [id]);

  if (isLoading) return <div className="p-10 flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!resident) return <div className="p-10 flex justify-center">Resident not found</div>;

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/residents/${id}`)}
          >
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
              <span className="text-muted-foreground">/ Weight Monitoring</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Record and track resident weight history
            </p>
          </div>
        </div>

        {/* Weight Chart Section */}
        <div className="grid grid-cols-1 gap-6">
          <WeightChart
            residentId={id}
            residentName={fullName}
          />
        </div>
      </div>
    </div>
  );
}
