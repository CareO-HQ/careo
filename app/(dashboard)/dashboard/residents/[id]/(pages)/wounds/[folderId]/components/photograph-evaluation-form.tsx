"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
type PhotographEvaluation = {
  id: string;
  photograph_date: string;
  site_of_wound: string;
  left_right: string | null;
  actual_position: string | null;
  state: string | null;
  inner_outer: string | null;
  actual_measurement: string | null;
  appearance: string | null;
  signature: string;
  created_at: string;
};

type PhotographEvaluationFormProps = {
  residentId: string;
  woundFolderId: string;
  residentName?: string;
  residentDOB?: string;
  roomNumber?: string;
  onSaved?: () => void;
};

export function PhotographEvaluationForm({
  residentId,
  woundFolderId,
  residentName,
  residentDOB,
  roomNumber,
  onSaved,
}: PhotographEvaluationFormProps) {
  const { profile } = useProfile();
  const [evaluations, setEvaluations] = useState<PhotographEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date(),
    siteOfWound: "",
    leftRight: "",
    actualPosition: "",
    state: "",
    innerOuter: "",
    actualMeasurement: "",
    appearance: "",
    signature: profile?.name || "",
  });

  // Fetch existing evaluations
  useEffect(() => {
    fetchEvaluations();
  }, [woundFolderId]);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("photograph_evaluations")
        .select("*")
        .eq("wound_folder_id", woundFolderId)
        .order("photograph_date", { ascending: false });

      if (!error && data) {
        setEvaluations(data);
      }
    } catch (err) {
      console.error("Error fetching evaluations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newEntry.siteOfWound || !newEntry.signature) {
      toast.error("Site of wound and signature are required");
      return;
    }

    if (!profile?.active_organization_id) {
      toast.error("No active organization found");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("photograph_evaluations")
        .insert({
          wound_folder_id: woundFolderId,
          resident_id: residentId,
          organization_id: profile?.active_organization_id,
          photograph_date: format(newEntry.date, "yyyy-MM-dd"),
          site_of_wound: newEntry.siteOfWound,
          left_right: newEntry.leftRight || null,
          actual_position: newEntry.actualPosition || null,
          state: newEntry.state || null,
          inner_outer: newEntry.innerOuter || null,
          actual_measurement: newEntry.actualMeasurement || null,
          appearance: newEntry.appearance || null,
          signature: newEntry.signature,
        })
        .select();

      if (error) {
        console.error("Save error:", error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      toast.success("Photographic evaluation saved successfully");

      // Reset form
      setNewEntry({
        date: new Date(),
        siteOfWound: "",
        leftRight: "",
        actualPosition: "",
        state: "",
        innerOuter: "",
        actualMeasurement: "",
        appearance: "",
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
          .photo-eval-form input:disabled {
            opacity: 1 !important;
            color: inherit !important;
            -webkit-text-fill-color: currentColor !important;
            background-color: #f9fafb !important;
          }

          .photo-eval-form textarea:disabled {
            opacity: 1 !important;
            color: inherit !important;
            -webkit-text-fill-color: currentColor !important;
            background-color: #f9fafb !important;
          }
        `}</style>

        <div className="photo-eval-form bg-white border-2 border-gray-300">
          {/* Header */}
          <div className="border-b-2 border-gray-300 p-4 bg-gray-50">
            <h1 className="text-xl font-bold text-center mb-3">
              Photographic Assessment
            </h1>
            <p className="text-xs text-center text-gray-600 mb-3">
              Please record wound photographs with details clearly
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
                  <th className="border-2 border-gray-300 p-2 font-bold text-left">Site of Wound</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-24">Left/Right</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left">Actual Position</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-24">State</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-24">Inner/Outer</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left">Actual Measurement</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left">Appearance</th>
                  <th className="border-2 border-gray-300 p-2 font-bold text-left w-32">Signature</th>
                </tr>
              </thead>
              <tbody>
                {/* New Entry Row */}
                <tr className="bg-blue-50">
                  <td className="border-2 border-gray-300 p-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-auto text-xs justify-start p-1 font-normal",
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
                      value={newEntry.siteOfWound}
                      onChange={(e) => setNewEntry({ ...newEntry, siteOfWound: e.target.value })}
                      className="h-auto text-xs border-0 p-1"
                      placeholder="e.g., Left heel"
                    />
                  </td>
                  <td className="border-2 border-gray-300 p-1">
                    <Input
                      value={newEntry.leftRight}
                      onChange={(e) => setNewEntry({ ...newEntry, leftRight: e.target.value })}
                      className="h-auto text-xs border-0 p-1"
                      placeholder="L/R"
                    />
                  </td>
                  <td className="border-2 border-gray-300 p-1">
                    <Textarea
                      value={newEntry.actualPosition}
                      onChange={(e) => setNewEntry({ ...newEntry, actualPosition: e.target.value })}
                      className="min-h-[60px] text-xs border-0 p-1 resize-none"
                      placeholder="Position details..."
                    />
                  </td>
                  <td className="border-2 border-gray-300 p-1">
                    <Input
                      value={newEntry.state}
                      onChange={(e) => setNewEntry({ ...newEntry, state: e.target.value })}
                      className="h-auto text-xs border-0 p-1"
                      placeholder="State"
                    />
                  </td>
                  <td className="border-2 border-gray-300 p-1">
                    <Input
                      value={newEntry.innerOuter}
                      onChange={(e) => setNewEntry({ ...newEntry, innerOuter: e.target.value })}
                      className="h-auto text-xs border-0 p-1"
                      placeholder="I/O"
                    />
                  </td>
                  <td className="border-2 border-gray-300 p-1">
                    <Input
                      value={newEntry.actualMeasurement}
                      onChange={(e) => setNewEntry({ ...newEntry, actualMeasurement: e.target.value })}
                      className="h-auto text-xs border-0 p-1"
                      placeholder="e.g., 2cm x 3cm"
                    />
                  </td>
                  <td className="border-2 border-gray-300 p-1">
                    <Textarea
                      value={newEntry.appearance}
                      onChange={(e) => setNewEntry({ ...newEntry, appearance: e.target.value })}
                      className="min-h-[60px] text-xs border-0 p-1 resize-none"
                      placeholder="Describe appearance..."
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

                {/* Existing Evaluations */}
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="hover:bg-gray-50">
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={format(new Date(evaluation.photograph_date), "dd/MM/yyyy")}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.site_of_wound}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.left_right || ""}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={evaluation.actual_position || ""}
                        disabled
                        className="min-h-[60px] text-xs border-0 p-1 resize-none"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.state || ""}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.inner_outer || ""}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Input
                        value={evaluation.actual_measurement || ""}
                        disabled
                        className="h-auto text-xs border-0 p-1"
                      />
                    </td>
                    <td className="border-2 border-gray-300 p-1">
                      <Textarea
                        value={evaluation.appearance || ""}
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

                {/* Empty rows for paper-like appearance */}
                {Array.from({ length: Math.max(0, 8 - evaluations.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td className="border-2 border-gray-300 p-1 h-16"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                    <td className="border-2 border-gray-300 p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="border-t-2 border-gray-300 p-4 bg-gray-50 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Add Photo Assessment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
