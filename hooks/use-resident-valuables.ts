import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";

export const useResidentValuables = (residentId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [valuablesAssessments, setValuablesAssessments] = useState<any[]>([]);
  const { supabase, user } = useSupabase();

  // Fetch assessments
  const fetchAssessments = async () => {
    if (!residentId || !supabase) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("resident_valuables_assessments")
        .select("*")
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setValuablesAssessments(data || []);
    } catch (error) {
      console.error("Error fetching valuables assessments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [residentId, supabase]);

  const getValuablesById = async (assessmentId: string) => {
    if (!assessmentId || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from("resident_valuables_assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching valuables by id:", error);
      return null;
    }
  };

  // Actions
  const handleSubmitValuables = async (data: any) => {
    if (!user || !supabase) {
      toast.error("Not authenticated");
      return false;
    }

    setIsLoading(true);
    try {
      // Extract organization_id from user metadata if possible, or omit if handled by triggers
      // For now, we'll try to get it from the data passed in if available
      const { organizationId, teamId, ...formData } = data;

      const { error } = await supabase
        .from("resident_valuables_assessments")
        .insert({
          resident_id: residentId,
          organization_id: organizationId || user.app_metadata.active_organization_id,
          valuables_list: formData, // Store the rest of the form in JSONB
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Resident valuables saved successfully");
      fetchAssessments();
      return true;
    } catch (error) {
      console.error("Error submitting valuables:", error);
      toast.error("Failed to save resident valuables");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateValuables = async (assessmentId: string, data: any) => {
    if (!user || !supabase) {
      toast.error("Not authenticated");
      return false;
    }

    setIsLoading(true);
    try {
      const { organizationId, teamId, ...formData } = data;

      // In the Convex implementation, update actually inserted a NEW version (line 138)
      // We'll follow the same pattern if desired, or just update the existing one.
      // The Supabase schema seems to imply a single record per assessment.

      const { error } = await supabase
        .from("resident_valuables_assessments")
        .update({
          valuables_list: formData,
        })
        .eq("id", assessmentId);

      if (error) throw error;

      toast.success("Resident valuables updated successfully");
      fetchAssessments();
      return true;
    } catch (error) {
      console.error("Error updating valuables:", error);
      toast.error("Failed to update resident valuables");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteValuables = async (assessmentId: string) => {
    if (!supabase) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("resident_valuables_assessments")
        .delete()
        .eq("id", assessmentId);

      if (error) throw error;

      toast.success("Resident valuables deleted successfully");
      fetchAssessments();
      return true;
    } catch (error) {
      console.error("Error deleting valuables:", error);
      toast.error("Failed to delete resident valuables");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    valuablesAssessments,
    getValuablesById,
    isLoading,
    handleSubmitValuables,
    handleUpdateValuables,
    handleDeleteValuables
  };
};
