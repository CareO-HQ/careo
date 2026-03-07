"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WoundStatusFormProps = {
  folderId: string;
  currentStatus?: string;
  currentNextReviewDate?: string;
  onUpdated?: () => void;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-red-100 text-red-700" },
  { value: "healing", label: "Healing", color: "bg-yellow-100 text-yellow-700" },
  { value: "under_review", label: "Under Review", color: "bg-blue-100 text-blue-700" },
  { value: "healed", label: "Healed", color: "bg-green-100 text-green-700" },
];

export function WoundStatusForm({
  folderId,
  currentStatus = "active",
  currentNextReviewDate,
  onUpdated,
}: WoundStatusFormProps) {
  const [status, setStatus] = useState(currentStatus);
  const [nextReviewDate, setNextReviewDate] = useState<Date | undefined>(
    currentNextReviewDate ? new Date(currentNextReviewDate) : undefined
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("wound_folders")
        .update({
          status,
          next_review_date: nextReviewDate ? format(nextReviewDate, "yyyy-MM-dd") : null,
        })
        .eq("id", folderId);

      if (error) throw error;

      toast.success("Status updated successfully");
      if (onUpdated) onUpdated();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStatusOption = STATUS_OPTIONS.find((opt) => opt.value === status);

  return (
    <div className="space-y-3">
      {/* Next Review Date */}
      <div className="space-y-1">
        <Label className="text-xs">Next Review Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-8 text-xs w-full justify-start text-left font-normal",
                !nextReviewDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {nextReviewDate ? format(nextReviewDate, "dd/MM/yyyy") : "Set date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={nextReviewDate}
              onSelect={setNextReviewDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Status Selection */}
      <div className="space-y-1">
        <Label className="text-xs">Wound Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", option.color)}>
                    {option.label}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-7 text-xs"
        size="sm"
      >
        {isSaving ? (
          "Saving..."
        ) : (
          <>
            <Save className="w-3 h-3 mr-1" />
            Update Status
          </>
        )}
      </Button>
    </div>
  );
}
