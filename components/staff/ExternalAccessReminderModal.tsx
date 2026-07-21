"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface ExternalAccessReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  onConfirmReminder: (durationMinutes: number) => Promise<void>;
}

const PRESET_OPTIONS = [
  { label: "15 Mins", minutes: 15 },
  { label: "30 Mins", minutes: 30 },
  { label: "1 Hour", minutes: 60 },
  { label: "2 Hours", minutes: 120 },
  { label: "4 Hours", minutes: 240 },
];

export function ExternalAccessReminderModal({
  isOpen,
  onClose,
  staffName,
  onConfirmReminder,
}: ExternalAccessReminderModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(30); // Default 30 mins
  const [customValue, setCustomValue] = useState<number>(30);
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">("minutes");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetClick = (minutes: number) => {
    setSelectedPreset(minutes);
    if (minutes % 60 === 0) {
      setCustomValue(minutes / 60);
      setCustomUnit("hours");
    } else {
      setCustomValue(minutes);
      setCustomUnit("minutes");
    }
  };

  const handleCustomValueChange = (val: number) => {
    setSelectedPreset(null);
    setCustomValue(val);
  };

  const handleCustomUnitChange = (unit: "minutes" | "hours") => {
    setSelectedPreset(null);
    setCustomUnit(unit);
  };

  const handleSubmit = async () => {
    let totalMinutes = 0;
    if (selectedPreset !== null) {
      totalMinutes = selectedPreset;
    } else {
      const num = Number(customValue);
      if (!num || num <= 0) {
        toast.error("Please enter a valid positive duration");
        return;
      }
      totalMinutes = customUnit === "hours" ? num * 60 : num;
    }

    try {
      setIsSubmitting(true);
      await onConfirmReminder(totalMinutes);
      onClose();
    } catch (err: any) {
      console.error("Error setting reminder:", err);
      toast.error(err?.message || "Failed to set reminder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Set Access Duration Reminder
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Remind yourself to revoke login access for external staff
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3">
          <div className="p-3 bg-muted/40 rounded-lg border text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              External access is now <span className="font-medium text-foreground">ALLOWED</span> for{" "}
              <span className="font-semibold text-foreground">{staffName || "MDT Staff"}</span>. Set a timer to receive a notification in your sidebar when it&apos;s time to toggle off access.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Presets
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = selectedPreset === opt.minutes;
                return (
                  <Button
                    key={opt.minutes}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-8 ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handlePresetClick(opt.minutes)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Duration Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-duration" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Or Custom Duration
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="custom-duration"
                type="number"
                min={1}
                max={1440}
                value={customValue || ""}
                onChange={(e) => handleCustomValueChange(Math.max(1, parseInt(e.target.value) || 0))}
                className="h-9 text-sm font-medium"
                placeholder="Duration"
              />
              <Select
                value={customUnit}
                onValueChange={(val: "minutes" | "hours") => handleCustomUnitChange(val)}
              >
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip Reminder
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-xs px-4"
          >
            {isSubmitting ? "Setting..." : "Set Reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
