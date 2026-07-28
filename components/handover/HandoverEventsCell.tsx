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
  success: "text-green-700 dark:text-green-400 font-medium",
  warning: "text-amber-700 dark:text-amber-400 font-medium",
  danger: "text-red-700 dark:text-red-400 font-medium",
  info: "text-blue-700 dark:text-blue-400 font-medium",
};

interface HandoverEventsCellProps {
  data?: ResidentHandoverData;
  compact?: boolean;
}

function FormattedText({ text, className }: { text: string; className?: string }) {
  if (!text.includes("**")) {
    return <span className={className}>{text}</span>;
  }
  const parts = text.split("**");
  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  );
}

function EventValue({ row }: { row: HandoverEventRow }) {
  const content = (
    <FormattedText text={row.value} className={cn("text-xs leading-relaxed", toneClasses[row.tone])} />
  );

  if (!row.tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{content}</span>
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
      <div className="flex flex-wrap gap-1.5 py-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs border leading-tight",
              row.tone === "muted" && "bg-muted/30 text-muted-foreground border-border/50",
              row.tone === "success" && "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300",
              row.tone === "warning" && "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
              row.tone === "danger" && "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300",
              row.tone === "info" && "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
              row.tone === "default" && "bg-background border-border"
            )}
          >
            <span className="font-semibold text-[11px] opacity-80 shrink-0">{row.label}:</span>
            <EventValue row={row} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden text-xs bg-background divide-y shadow-xs">
      <div className="flex bg-muted/40 font-semibold text-muted-foreground px-3 py-2 border-b">
        <div className="w-36 shrink-0">Category</div>
        <div className="flex-1">Details</div>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-start px-3 py-2.5 gap-3 hover:bg-muted/20 transition-colors">
          <div className="w-36 shrink-0 font-medium text-foreground pt-0.5">{row.label}</div>
          <div className="flex-1">
            <EventValue row={row} />
          </div>
        </div>
      ))}
    </div>
  );
}

