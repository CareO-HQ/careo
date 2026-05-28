"use client";

import { Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INCIDENT_TIME_HOUR_OPTIONS,
  INCIDENT_TIME_MINUTE_OPTIONS,
  INCIDENT_TIME_PERIOD_OPTIONS,
  type AmPmPeriod,
  incidentTime24hFromParts,
  incidentTimePartsFrom24h,
} from "@/lib/incident-time-utils";
import { cn } from "@/lib/utils";

interface IncidentTimeSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function IncidentTimeSelect({
  value,
  onChange,
  disabled = false,
  className,
  id,
}: IncidentTimeSelectProps) {
  const parts = incidentTimePartsFrom24h(value);

  const updatePart = (
    patch: Partial<{ hour: string; minute: string; period: AmPmPeriod }>
  ) => {
    const next = { ...parts, ...patch };
    onChange?.(incidentTime24hFromParts(next));
  };

  return (
    <div
      id={id}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <Select
        value={parts.hour}
        onValueChange={(hour) => updatePart({ hour })}
        disabled={disabled}
      >
        <SelectTrigger className="w-[72px]" aria-label="Hour">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {INCIDENT_TIME_HOUR_OPTIONS.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">:</span>
      <Select
        value={parts.minute}
        onValueChange={(minute) => updatePart({ minute })}
        disabled={disabled}
      >
        <SelectTrigger className="w-[72px]" aria-label="Minute">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          {INCIDENT_TIME_MINUTE_OPTIONS.map((minute) => (
            <SelectItem key={minute} value={minute}>
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={parts.period}
        onValueChange={(period) => updatePart({ period: period as AmPmPeriod })}
        disabled={disabled}
      >
        <SelectTrigger className="w-[80px]" aria-label="AM or PM">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          {INCIDENT_TIME_PERIOD_OPTIONS.map((period) => (
            <SelectItem key={period} value={period}>
              {period}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
