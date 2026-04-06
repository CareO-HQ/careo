"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
type WoundTreatmentEvaluation = {
  id: string;
  evaluation_date: string;
  wound_number: string;
  cleansing_method: string | null;
  dressing_choice: string | null;
  frequency: string | null;
  rationale_for_change: string | null;
  wound_evaluation: string | null;
  signature: string;
  created_at: string;
};

type WoundTreatmentEvaluationFormProps = {
  residentId: string;
  woundFolderId: string;
  residentName?: string;
  residentDOB?: string;
  roomNumber?: string;
  woundNumber?: number;
  evaluations?: WoundTreatmentEvaluation[];
  onSaved?: () => void;
};

export function WoundTreatmentEvaluationForm({
  residentId,
  woundFolderId,
  residentName,
  residentDOB,
  roomNumber,
  woundNumber,
  onSaved,
}: WoundTreatmentEvaluationFormProps) {
  const { profile } = useProfile();
  const [evaluations, setEvaluations] = useState<WoundTreatmentEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date(),
    woundNumber: "",
    cleansingMethod: "",
    dressingChoice: "",
    frequency: "",
    rationaleForChange: "",
    woundEvaluation: "",
    signature: profile?.name || "",
  });

  // Fetch existing evaluations
  useEffect(() => {
    fetchEvaluations();
  }, [woundFolderId]);

  // Set showNewEntry based on whether evaluations exist
  useEffect(() => {
    if (!isLoading) {
      setShowNewEntry(evaluations.length === 0);
    }
  }, [evaluations.length, isLoading]);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("wound_treatment_evaluations")
        .select("*")
        .eq("wound_folder_id", woundFolderId)
        .order("evaluation_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        console.log("Fetched evaluations (newest first):", data);
        setEvaluations(data);
      }
    } catch (err) {
      console.error("Error fetching evaluations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newEntry.woundNumber || !newEntry.signature) {
      toast.error("Wound number and signature are required");
      return;
    }

    if (!profile?.active_organization_id) {
      toast.error("No active organization found");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Attempting to save evaluation:", {
        wound_folder_id: woundFolderId,
        resident_id: residentId,
        organization_id: profile?.active_organization_id,
      });

      const { error, data } = await supabase
        .from("wound_treatment_evaluations")
        .insert({
          wound_folder_id: woundFolderId,
          resident_id: residentId,
          organization_id: profile?.active_organization_id,
          evaluation_date: format(newEntry.date, "yyyy-MM-dd"),
          wound_number: newEntry.woundNumber,
          cleansing_method: newEntry.cleansingMethod || null,
          dressing_choice: newEntry.dressingChoice || null,
          frequency: newEntry.frequency || null,
          rationale_for_change: newEntry.rationaleForChange || null,
          wound_evaluation: newEntry.woundEvaluation || null,
          signature: newEntry.signature,
        })
        .select();

      if (error) {
        console.error("Save error:", error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      console.log("Save successful:", data);
      toast.success("Evaluation saved successfully");

      // Hide new entry form and reset
      setShowNewEntry(false);
      setNewEntry({
        date: new Date(),
        woundNumber: "",
        cleansingMethod: "",
        dressingChoice: "",
        frequency: "",
        rationaleForChange: "",
        woundEvaluation: "",
        signature: profile?.name || "",
      });

      // Refresh data
      await fetchEvaluations();
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-full mx-auto p-6">
        <style>{`
          .treatment-eval-form input:disabled {
            opacity: 1 !important;
            color: inherit !important;
            -webkit-text-fill-color: currentColor !important;
            background-color: #f9fafb !important;
          }

          .treatment-eval-form textarea:disabled {
            opacity: 1 !important;
            color: inherit !important;
            -webkit-text-fill-color: currentColor !important;
            background-color: #f9fafb !important;
          }
        `}</style>

        <div className="treatment-eval-form bg-white border-2 border-gray-300">
          {/* Header */}
          <div className="border-b-2 border-gray-300 p-4 bg-gray-50">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h1 className="text-xl font-bold text-center">
                Wound Treatment and Evaluation of Care
              </h1>
              {woundNumber && (
                <Badge variant="outline" className="font-mono font-semibold text-base">
                  Wound #{woundNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs text-center text-gray-600 mb-3">
              (To be completed when treatment or dressing type / regime / changed / Please record clearly)
            </p>

            {/* Resident Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Resident's name:</span> {residentName || "N/A"}
              </div>
              <div>
                <span className="font-semibold">D.O.B:</span>{" "}
                {residentDOB ? format(new Date(residentDOB), "dd/MM/yyyy") : "N/A"}
              </div>
              <div>
                <span className="font-semibold">Rm. No.:</span> {roomNumber || "N/A"}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-24">Date</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-20">Wound Number</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left">Cleansing Method, Dressing Choice</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-24">Frequency</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left">Rationale for changing dressing type</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left">Wound evaluation (healing, dry etc.)</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-32">Signature</th>
                </tr>
              </thead>
              <tbody>
                {/* New Entry Row - Only show when adding */}
                {showNewEntry && (
                  <tr>
                    <td className="border-2 border-gray-300 p-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full h-auto text-xs justify-start p-2 font-normal",
                              !newEntry.date && "text-muted-foreground"
                            )}
                          >
                            {newEntry.date ? format(newEntry.date, "dd/MM/yyyy") : "Pick"}
                            <CalendarIcon className="ml-auto h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newEntry.date}
                            onSelect={(date) => setNewEntry({ ...newEntry, date: date || new Date() })}
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={newEntry.woundNumber}
                        onChange={(e) => setNewEntry({ ...newEntry, woundNumber: e.target.value })}
                        className="h-auto text-xs border-0 p-1"
                        placeholder="#"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={newEntry.cleansingMethod}
                        onChange={(e) => setNewEntry({ ...newEntry, cleansingMethod: e.target.value })}
                        className="min-h-[60px] text-xs border-0 p-1 resize-none"
                        placeholder="Describe cleansing method and dressing..."
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={newEntry.frequency}
                        onChange={(e) => setNewEntry({ ...newEntry, frequency: e.target.value })}
                        className="h-auto text-xs border-0 p-1"
                        placeholder="e.g., Daily"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={newEntry.rationaleForChange}
                        onChange={(e) => setNewEntry({ ...newEntry, rationaleForChange: e.target.value })}
                        className="min-h-[60px] text-xs border-0 p-1 resize-none"
                        placeholder="Reason for change..."
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={newEntry.woundEvaluation}
                        onChange={(e) => setNewEntry({ ...newEntry, woundEvaluation: e.target.value })}
                        className="min-h-[60px] text-xs border-0 p-1 resize-none"
                        placeholder="Wound status..."
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={newEntry.signature}
                        onChange={(e) => setNewEntry({ ...newEntry, signature: e.target.value })}
                        className="h-auto text-xs border-0 p-1"
                        placeholder="Sign"
                      />
                    </td>
                  </tr>
                )}

                {/* Existing Evaluations - Newest First */}
                {evaluations.map((evaluation, index) => (
                  <tr key={evaluation.id} className="hover:bg-gray-50">
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={format(new Date(evaluation.evaluation_date), "dd/MM/yyyy")}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.wound_number}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={evaluation.cleansing_method || ""}
                        disabled
                        className="min-h-[60px] text-xs border-0 p-1 resize-none"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.frequency || ""}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={evaluation.rationale_for_change || ""}
                        disabled
                        className="min-h-[60px] text-xs border-0 p-1 resize-none"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={evaluation.wound_evaluation || ""}
                        disabled
                        className="min-h-[60px] text-xs border-0 p-1 resize-none"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.signature}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="border-t-2 border-gray-300 p-4 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''} recorded
              {evaluations.length > 0 && <span className="ml-2 text-xs text-muted-foreground">(Most recent first)</span>}
            </div>
            <div className="flex gap-2">
              {showNewEntry ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewEntry(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Evaluation
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShowNewEntry(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Evaluation
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
