"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export function useSpecimenRecords(residentId: string) {
    const { supabase } = useSupabase();
    const [specimenRecords, setSpecimenRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSpecimenRecords = useCallback(async () => {
        if (!residentId) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("specimen_records")
                .select("*")
                .eq("resident_id", residentId)
                .order("date_time_obtained", { ascending: false });

            if (error) throw error;
            setSpecimenRecords(data || []);
        } catch (error) {
            console.error("Error fetching specimen records:", error);
            toast.error("Failed to load specimen records");
        } finally {
            setIsLoading(false);
        }
    }, [residentId, supabase]);

    useEffect(() => {
        fetchSpecimenRecords();
    }, [fetchSpecimenRecords]);

    const handleDeleteRecord = async (recordId: string) => {
        try {
            const { error } = await supabase
                .from("specimen_records")
                .delete()
                .eq("id", recordId);

            if (error) throw error;

            setSpecimenRecords(prev => prev.filter(r => r.id !== recordId));
            toast.success("Record deleted successfully");
        } catch (error) {
            console.error("Error deleting specimen record:", error);
            toast.error("Failed to delete record");
        }
    };

    return {
        specimenRecords,
        isLoading,
        refreshRecords: fetchSpecimenRecords,
        handleDeleteRecord
    };
}
