"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMonths, addYears, format, isValid, parseISO } from "date-fns";

type NextReviewPreset = "one_month" | "six_months" | "next_year" | "pick_date" | "na";

interface NextReviewDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

function toDateValue(value: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  return null;
}

function formatDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export default function NextReviewDateField({
  value,
  onChange,
  disabled = false,
  label = "Next review date",
  className = ""
}: NextReviewDateFieldProps) {
  const currentDate = toDateValue(value);
  const hasDate = Boolean(currentDate);
  const selectedPreset: NextReviewPreset = hasDate ? "pick_date" : "na";

  const applyPreset = (preset: NextReviewPreset) => {
    const now = new Date();

    if (preset === "one_month") {
      onChange(formatDateValue(addMonths(now, 1)));
      return;
    }

    if (preset === "six_months") {
      onChange(formatDateValue(addMonths(now, 6)));
      return;
    }

    if (preset === "next_year") {
      onChange(formatDateValue(addYears(now, 1)));
      return;
    }

    if (preset === "na") {
      onChange("");
      return;
    }
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <Label className="text-sm font-medium">{label}</Label>
      <Select
        value={selectedPreset}
        onValueChange={(selectedValue) => applyPreset(selectedValue as NextReviewPreset)}
        disabled={disabled}
      >
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Select next review option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one_month">After one month</SelectItem>
          <SelectItem value="six_months">After 6 months</SelectItem>
          <SelectItem value="next_year">Next year</SelectItem>
          <SelectItem value="pick_date">Pick a date</SelectItem>
          <SelectItem value="na">N/A</SelectItem>
        </SelectContent>
      </Select>
      {selectedPreset === "pick_date" && (
        <input
          type="date"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={disabled}
        />
      )}
    </div>
  );
}
