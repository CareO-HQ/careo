"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ResidentHandoverData } from "@/lib/handover-data";
import {
  formatHandoverEvents,
  HandoverEventRow,
} from "@/lib/handover-events-display";

const toneClasses: Record<HandoverEventRow["tone"], string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  success: "text-green-600 font-medium",
  warning: "text-amber-600 font-medium",
  danger: "text-red-600 font-medium",
  info: "text-blue-600 font-medium",
};

interface HandoverEventsCellProps {
  data?: ResidentHandoverData;
  compact?: boolean;
}

function EventValue({ row }: { row: HandoverEventRow }) {
  const content = (
    <span className={cn("text-xs tabular-nums", toneClasses[row.tone])}>
      {row.value}
    </span>
  );

  if (!row.tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("text-xs tabular-nums cursor-default", toneClasses[row.tone])}>
          {row.value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-xs">
        {row.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function HandoverEventsCell({ data, compact = false }: HandoverEventsCellProps) {
  const rows = formatHandoverEvents(data);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {rows.map((row) => (
          <span
            key={row.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
              row.tone === "muted" && "bg-muted/40 text-muted-foreground border-transparent",
              row.tone === "success" && "bg-green-50 text-green-700 border-green-200",
              row.tone === "warning" && "bg-amber-50 text-amber-700 border-amber-200",
              row.tone === "danger" && "bg-red-50 text-red-700 border-red-200",
              row.tone === "info" && "bg-blue-50 text-blue-700 border-blue-200",
              row.tone === "default" && "bg-background border-border"
            )}
          >
            <span className="opacity-70">{row.label.split("/")[0]}</span>
            {row.value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 py-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 text-xs leading-tight">
          <span className="text-muted-foreground shrink-0 w-[88px]">{row.label}</span>
          <EventValue row={row} />
        </div>
      ))}
    </div>
  );
}
