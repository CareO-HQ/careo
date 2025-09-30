import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

export const useResidentValuables = (residentId: string) => {
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const valuablesAssessments = useQuery(
    api.careFiles.residentValuables.getResidentValuablesByResidentId,
    { residentId: residentId as Id<"residents"> }
  );

  const getValuablesById = useQuery(
    api.careFiles.residentValuables.getResidentValuablesById,
    { assessmentId: undefined as unknown as Id<"residentValuablesAssessments"> }
  );

  // Mutations
  const submitValuables = useMutation(
    api.careFiles.residentValuables.submitResidentValuables
  );
  const updateValuables = useMutation(
    api.careFiles.residentValuables.updateResidentValuables
  );
  const deleteValuables = useMutation(
    api.careFiles.residentValuables.deleteResidentValuables
  );

  // Actions
  const handleSubmitValuables = async (data: any) => {
    setIsLoading(true);
    try {
      await submitValuables({
        ...data,
        residentId: residentId as Id<"residents">
      });
      toast.success("Resident valuables saved successfully");
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
    setIsLoading(true);
    try {
      await updateValuables({
        ...data,
        assessmentId: assessmentId as Id<"residentValuablesAssessments">,
        residentId: residentId as Id<"residents">
      });
      toast.success("Resident valuables updated successfully");
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
    setIsLoading(true);
    try {
      await deleteValuables({
        assessmentId: assessmentId as Id<"residentValuablesAssessments">
      });
      toast.success("Resident valuables deleted successfully");
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
