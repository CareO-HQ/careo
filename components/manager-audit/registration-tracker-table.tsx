"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatRegistrationDate,
  type RegistrationTrackerAnswer,
  type RegistrationTrackerRow,
  type RegistrationTrackerType,
} from "@/lib/registration-tracker-utils";
import { cn } from "@/lib/utils";

interface RegistrationTrackerTableProps {
  trackerType: RegistrationTrackerType;
  rows: RegistrationTrackerRow[];
  questions: Array<{
    id: string;
    text: string;
    type: "text" | "date" | string;
  }>;
  answers: RegistrationTrackerAnswer[];
  readOnly?: boolean;
  /** Hides the summary bar and uses flush padding (history/read-only views). */
  compact?: boolean;
  isRefreshing?: boolean;
  onAnswerChange?: (
    staffId: string,
    questionId: string,
    value: string
  ) => void;
  onRefreshFromProfiles?: () => void;
}

function getCellValue(
  answers: RegistrationTrackerAnswer[],
  staffId: string,
  questionId: string
): string {
  return (
    answers.find(
      (answer) =>
        answer.residentId === staffId && answer.questionId === questionId
    )?.value ?? ""
  );
}

function TrackerCell({
  question,
  value,
  readOnly,
  onChange,
}: {
  question: { id: string; text: string; type: string };
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  const isNotesColumn = question.id === "nmc-q7" || question.id === "niscc-q8";

  if (readOnly) {
    const displayValue =
      question.type === "date" ? formatRegistrationDate(value) : value;
    return (
      <span className="text-sm text-foreground whitespace-pre-line break-words">
        {displayValue || "—"}
      </span>
    );
  }

  if (isNotesColumn) {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[72px] min-w-[180px] text-xs"
        rows={3}
      />
    );
  }

  if (question.type === "date") {
    return (
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 min-w-[140px] text-xs"
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 min-w-[140px] text-xs"
    />
  );
}

export function RegistrationTrackerTable({
  trackerType,
  rows,
  questions,
  answers,
  readOnly = false,
  compact = false,
  isRefreshing = false,
  onAnswerChange,
  onRefreshFromProfiles,
}: RegistrationTrackerTableProps) {
  const staffLabel = trackerType === "nmc" ? "Nurses" : "Staff";
  const emptyMessage =
    trackerType === "nmc"
      ? "No registered nurses found in this care home."
      : "No eligible staff found in this care home.";
  const showSummaryBar = !compact && !readOnly;

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        compact ? "p-4 sm:p-5" : "mx-4 my-4 sm:mx-5"
      )}
    >
      {showSummaryBar ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm font-medium">
              {staffLabel}
            </Badge>
            <Badge variant="outline" className="text-sm font-medium">
              Total: {rows.length}
            </Badge>
          </div>
          {onRefreshFromProfiles ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshFromProfiles}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
              />
              Refresh from profiles
            </Button>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {trackerType === "nmc"
              ? "Only staff with the nurse role are shown in this tracker."
              : "All onboarded staff except owners are shown in this tracker."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-20 min-w-[160px] bg-muted/50 font-semibold">
                  Staff
                </TableHead>
                {questions.map((column) => {
                  const isNotesColumn =
                    column.id === "nmc-q7" || column.id === "niscc-q8";

                  return (
                    <TableHead
                      key={column.id}
                      className={cn(
                        "min-w-[140px] whitespace-normal align-bottom font-semibold leading-snug",
                        isNotesColumn && "min-w-[220px]"
                      )}
                    >
                      {column.text}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.staffId} className="hover:bg-muted/20">
                  <TableCell className="sticky left-0 z-10 bg-white font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{row.staffName}</span>
                      {trackerType === "niscc" && row.roleLabel ? (
                        <span className="text-xs text-muted-foreground">
                          {row.roleLabel}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  {questions.map((column) => {
                    const value = getCellValue(answers, row.staffId, column.id);

                    return (
                      <TableCell key={column.id} className="align-top py-3">
                        <TrackerCell
                          question={column}
                          value={value}
                          readOnly={readOnly}
                          onChange={(nextValue) =>
                            onAnswerChange?.(row.staffId, column.id, nextValue)
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
