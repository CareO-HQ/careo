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
  INCIDENT_AUDIT_OPTION_PILLS,
  formatIncidentAuditDateTimeAnswer,
  formatYesNoDisplay,
  type IncidentAuditAnswer,
  type IncidentAuditQuestion,
  type IncidentAuditRow,
} from "@/lib/incident-audit-utils";
import { cn } from "@/lib/utils";

interface IncidentAuditTableProps {
  rows: IncidentAuditRow[];
  questions: IncidentAuditQuestion[];
  answers: IncidentAuditAnswer[];
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
  onSyncFromIncidents?: () => void;
}

function getCellValue(
  answers: IncidentAuditAnswer[],
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
  "min-w-[200px] max-w-[260px] whitespace-normal px-3 py-3 font-semibold align-bottom";
const ROW_LABEL_CELL =
  "min-w-[200px] max-w-[260px] whitespace-normal break-words px-3 py-3 align-top font-medium";
const DATA_HEAD =
  "min-w-[120px] whitespace-normal px-3 py-3 font-semibold align-bottom leading-snug";
const DATA_CELL =
  "min-w-[120px] whitespace-normal break-words px-3 py-3 align-top text-sm";
const WIDE_DATA_HEAD = "min-w-[200px]";
const WIDE_DATA_CELL = "min-w-[200px]";

function IncidentAuditCell({
  question,
  value,
  readOnly,
  onChange,
}: {
  question: IncidentAuditQuestion;
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  const isCommentsColumn = question.id === "acc-q-11";
  const isDateTimeColumn = question.id === "acc-q-2";
  const optionPills = INCIDENT_AUDIT_OPTION_PILLS[question.id];

  if (readOnly) {
    let displayValue = value;
    if (question.type === "yesno") {
      displayValue = formatYesNoDisplay(value);
    } else if (isDateTimeColumn) {
      displayValue = formatIncidentAuditDateTimeAnswer(value);
    }
    return (
      <span className="whitespace-pre-line break-words text-sm text-foreground">
        {displayValue || "—"}
      </span>
    );
  }

  if (isCommentsColumn) {
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

  if (optionPills?.length) {
    const valueInOptions = value ? optionPills.includes(value) : false;

    if (!readOnly && value && !valueInOptions) {
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

export function IncidentAuditTable({
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
  onSyncFromIncidents,
}: IncidentAuditTableProps) {
  const columnQuestions = questions.filter((q) => !q.isSection);

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
              Incidents: {rows.length}
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
          {onSyncFromIncidents ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSyncFromIncidents}
              disabled={isSyncing}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")}
              />
              Sync from incidents
            </Button>
          ) : null}
        </div>
      ) : null}

      {displayedRows.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No incident-folder reports recorded this month.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Only incidents saved in incident folders appear here (fall folders
            are excluded). Use sync to refresh after new incident reports are
            completed.
          </p>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-md border bg-white">
          <table className="w-max border-collapse text-sm caption-bottom">
            <thead className="[&_tr]:border-b">
              <tr className="border-b bg-muted/50">
                <th className={ROW_LABEL_HEAD}>Resident / incident</th>
                {columnQuestions.map((column) => {
                  const isWideColumn =
                    column.id === "acc-q-11" || column.id === "acc-q-4";
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
                      {row.incidentTypeLabel ? (
                        <span className="text-xs text-muted-foreground">
                          {row.incidentTypeLabel}
                        </span>
                      ) : null}
                      {row.incidentCountForResident > 1 ? (
                        <span className="text-xs text-muted-foreground">
                          Incident {row.incidentIndex} of{" "}
                          {row.incidentCountForResident}
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
                    const isWideColumn =
                      column.id === "acc-q-11" || column.id === "acc-q-4";

                    return (
                      <td
                        key={column.id}
                        className={cn(
                          DATA_CELL,
                          isWideColumn && WIDE_DATA_CELL
                        )}
                      >
                        <IncidentAuditCell
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
