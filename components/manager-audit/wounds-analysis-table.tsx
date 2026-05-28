"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  WOUNDS_ANALYSIS_OPTIONS,
  filterWoundsColumnQuestions,
  formatWoundsAnalysisDate,
  formatYesNoDisplay,
  type WoundsAnalysisAnswer,
  type WoundsAnalysisQuestion,
  type WoundsAnalysisRow,
} from "@/lib/wounds-analysis-utils";
import { cn } from "@/lib/utils";

interface WoundsAnalysisTableProps {
  rows: WoundsAnalysisRow[];
  questions: WoundsAnalysisQuestion[];
  answers: WoundsAnalysisAnswer[];
  readOnly?: boolean;
  compact?: boolean;
  auditMonthLabel?: string;
  teams?: { id: string; name: string }[];
  selectedUnitId?: string | null;
  onUnitChange?: (unitId: string) => void;
  isSyncing?: boolean;
  onAnswerChange?: (
    rowId: string,
    questionId: string,
    value: string
  ) => void;
  onSyncFromWounds?: () => void;
}

function getCellValue(
  answers: WoundsAnalysisAnswer[],
  rowId: string,
  questionId: string
): string {
  return (
    answers.find(
      (answer) =>
        answer.residentId === rowId && answer.questionId === questionId
    )?.value ?? ""
  );
}

const ROW_LABEL_HEAD =
  "sticky left-0 z-10 min-w-[200px] max-w-[260px] whitespace-normal bg-muted/50 px-3 py-3 font-semibold align-bottom";
const ROW_LABEL_CELL =
  "sticky left-0 z-10 min-w-[200px] max-w-[260px] whitespace-normal break-words bg-white px-3 py-3 align-top font-medium";
const DATA_HEAD =
  "min-w-[120px] whitespace-normal px-3 py-3 font-semibold align-bottom leading-snug";
const DATA_CELL =
  "min-w-[120px] whitespace-normal break-words px-3 py-3 align-top text-sm";
const WIDE_DATA_HEAD = "min-w-[200px]";
const WIDE_DATA_CELL = "min-w-[200px]";

const WIDE_COLUMN_IDS = new Set([
  "wound-last-type",
  "wound-last-comments",
  "wound-curr-type",
  "wound-curr-referral",
  "wound-curr-status",
]);

function WoundsAnalysisCell({
  question,
  value,
  readOnly,
  onChange,
}: {
  question: WoundsAnalysisQuestion;
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  const isLongTextColumn =
    question.id === "wound-last-comments" ||
    question.id === "wound-curr-status" ||
    question.id === "wound-curr-referral";
  const optionPills = WOUNDS_ANALYSIS_OPTIONS[question.id];

  if (readOnly) {
    let displayValue = value;
    if (question.type === "yesno") {
      displayValue = formatYesNoDisplay(value);
    } else if (question.type === "date") {
      displayValue = formatWoundsAnalysisDate(value);
    }
    return (
      <span className="whitespace-pre-line break-words text-sm text-foreground">
        {displayValue || "—"}
      </span>
    );
  }

  if (isLongTextColumn) {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[72px] w-full text-xs"
        rows={3}
      />
    );
  }

  if (question.type === "yesno") {
    return (
      <Select
        value={value || "__unset__"}
        onValueChange={(next) =>
          onChange(next === "__unset__" ? "" : next)
        }
      >
        <SelectTrigger className="h-8 w-full max-w-[120px] text-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unset__">—</SelectItem>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (question.type === "date") {
    return (
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full text-xs"
      />
    );
  }

  if (optionPills?.length) {
    const valueInOptions = value ? optionPills.includes(value) : false;

    if (value && !valueInOptions) {
      return (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full text-xs"
        />
      );
    }

    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full max-w-[200px] text-xs">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {optionPills.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          {value && !valueInOptions ? (
            <SelectItem value={value}>{value}</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full text-xs"
    />
  );
}

export function WoundsAnalysisTable({
  rows,
  questions,
  answers,
  readOnly = false,
  compact = false,
  auditMonthLabel,
  teams,
  selectedUnitId,
  onUnitChange,
  isSyncing = false,
  onAnswerChange,
  onSyncFromWounds,
}: WoundsAnalysisTableProps) {
  const columnQuestions = filterWoundsColumnQuestions(questions);

  const displayedRows =
    teams && teams.length > 0 && selectedUnitId
      ? rows.filter((row) => {
          if (selectedUnitId === "unassigned") return !row.teamId;
          return row.teamId === selectedUnitId;
        })
      : rows;

  const uniqueResidents = new Set(displayedRows.map((row) => row.residentId));
  const showToolbar = !compact && !readOnly;

  return (
    <div
      className={cn(
        "flex w-full max-w-full min-w-0 flex-col gap-4",
        compact ? "p-4 sm:p-5" : "mx-4 my-4 sm:mx-5"
      )}
    >
      {showToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {auditMonthLabel ? (
              <Badge variant="secondary" className="text-sm font-medium">
                {auditMonthLabel}
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-sm font-medium">
              Wounds: {rows.length}
            </Badge>
            <Badge variant="outline" className="text-sm font-medium">
              Residents: {uniqueResidents.size}
            </Badge>
            {teams && teams.length > 0 ? (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Unit/Home
                </label>
                <select
                  value={selectedUnitId || ""}
                  onChange={(event) => onUnitChange?.(event.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                  <option value="unassigned">Unassigned Residents</option>
                </select>
              </div>
            ) : null}
          </div>
          {onSyncFromWounds ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSyncFromWounds}
              disabled={isSyncing}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")}
              />
              Sync from wounds
            </Button>
          ) : null}
        </div>
      ) : null}

      {displayedRows.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No wound folders created this month.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Only wound folders created in the current audit month appear here.
            Use sync to refresh after wound records are updated.
          </p>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-md border bg-white">
          <table className="w-max border-collapse text-sm caption-bottom">
            <thead className="[&_tr]:border-b">
              <tr className="border-b bg-muted/50">
                <th className={ROW_LABEL_HEAD}>Resident / wound</th>
                {columnQuestions.map((column) => {
                  const isWideColumn = WIDE_COLUMN_IDS.has(column.id);
                  return (
                    <th
                      key={column.id}
                      className={cn(
                        DATA_HEAD,
                        isWideColumn && WIDE_DATA_HEAD
                      )}
                    >
                      {column.text}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {displayedRows.map((row) => (
                <tr
                  key={row.rowId}
                  className="border-b transition-colors hover:bg-muted/20"
                >
                  <td className={ROW_LABEL_CELL}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{row.residentName}</span>
                      {row.woundType || row.location ? (
                        <span className="text-xs text-muted-foreground">
                          {[row.woundType, row.location]
                            .filter(Boolean)
                            .join(" — ")}
                        </span>
                      ) : null}
                      {row.isHealedReview ? (
                        <span className="text-xs text-muted-foreground">
                          Healed this month
                        </span>
                      ) : null}
                      {row.woundCountForResident > 1 ? (
                        <span className="text-xs text-muted-foreground">
                          Wound {row.woundIndex} of {row.woundCountForResident}
                        </span>
                      ) : null}
                      {row.roomNumber ? (
                        <span className="text-xs text-muted-foreground">
                          Rm {row.roomNumber}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  {columnQuestions.map((column) => {
                    const value = getCellValue(answers, row.rowId, column.id);
                    const isWideColumn = WIDE_COLUMN_IDS.has(column.id);

                    return (
                      <td
                        key={column.id}
                        className={cn(
                          DATA_CELL,
                          isWideColumn && WIDE_DATA_CELL
                        )}
                      >
                        <WoundsAnalysisCell
                          question={column}
                          value={value}
                          readOnly={readOnly}
                          onChange={(nextValue) =>
                            onAnswerChange?.(row.rowId, column.id, nextValue)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
