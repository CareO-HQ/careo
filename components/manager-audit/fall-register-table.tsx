"use client";

import { format, parseISO } from "date-fns";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_FALLS_COLUMN_QUESTIONS,
  FALLS_REGISTER_OPTIONS,
  formatAuditMonthLabel,
  type FallRegisterRow,
  type FallsRegisterAnswer,
} from "@/lib/falls-register-utils";
import { cn } from "@/lib/utils";

interface FallRegisterTableProps {
  auditMonth: string;
  rows: FallRegisterRow[];
  answers: FallsRegisterAnswer[];
  readOnly?: boolean;
  isSyncing?: boolean;
  onAnswerChange?: (
    rowId: string,
    questionId: string,
    value: string
  ) => void;
  onSyncFromIncidents?: () => void;
}

function getCellValue(
  answers: FallsRegisterAnswer[],
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

function formatFallDate(fallDate: string): string {
  try {
    return format(parseISO(fallDate), "dd MMM yyyy");
  } catch {
    return fallDate;
  }
}

function OptionCell({
  value,
  options,
  readOnly,
  onChange,
  allowCustomText = false,
}: {
  value: string;
  options?: string[];
  readOnly?: boolean;
  onChange: (value: string) => void;
  allowCustomText?: boolean;
}) {
  if (readOnly) {
    const displayValue =
      value.includes("; ") && value.split("; ").every((part) => part.includes(":"))
        ? value.replace(/;\s*/g, "\n")
        : value;
    return (
      <span className="text-sm text-foreground whitespace-pre-line break-words">
        {displayValue || "—"}
      </span>
    );
  }

  if (allowCustomText && options && value && !options.includes(value)) {
    return (
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 min-w-[140px] text-xs"
      />
    );
  }

  if (options?.length) {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 min-w-[140px] text-xs">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          {allowCustomText && value && !options.includes(value) ? (
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
      className="h-8 min-w-[140px] text-xs"
    />
  );
}

export function FallRegisterTable({
  auditMonth,
  rows,
  answers,
  readOnly = false,
  isSyncing = false,
  onAnswerChange,
  onSyncFromIncidents,
}: FallRegisterTableProps) {
  const totalFalls = rows.length;
  const monthLabel = formatAuditMonthLabel(auditMonth);

  return (
    <div className="mx-4 my-4 flex flex-col gap-4 sm:mx-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-sm font-medium">
            {monthLabel}
          </Badge>
          <Badge variant="outline" className="text-sm font-medium">
            Total falls: {totalFalls}
          </Badge>
        </div>
        {!readOnly && onSyncFromIncidents ? (
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

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No fall folders created for {monthLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Fall folders created this month will appear here once incident
            reports are saved.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-10 min-w-[180px] bg-muted/50 font-semibold">
                  Resident
                </TableHead>
                {DEFAULT_FALLS_COLUMN_QUESTIONS.map((column) => (
                  <TableHead
                    key={column.id}
                    className="min-w-[160px] font-semibold"
                  >
                    {column.text}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowId} className="hover:bg-muted/20">
                  <TableCell className="sticky left-0 z-10 bg-white font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{row.residentName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFallDate(row.fallDate)}
                      </span>
                    </div>
                  </TableCell>
                  {DEFAULT_FALLS_COLUMN_QUESTIONS.map((column) => {
                    const value = getCellValue(answers, row.rowId, column.id);
                    const options = FALLS_REGISTER_OPTIONS[column.id];
                    const isReadOnlyCell =
                      readOnly || column.id === "falls-q-6";
                    const allowCustomText =
                      column.id === "falls-q-1" ||
                      column.id === "falls-q-2" ||
                      column.id === "falls-q-3" ||
                      column.id === "falls-q-4" ||
                      column.id === "falls-q-7";
                    const useTextInput =
                      column.id === "falls-q-1" || column.id === "falls-q-2";

                    return (
                      <TableCell key={column.id} className="align-top py-3">
                        <OptionCell
                          value={value}
                          options={useTextInput ? undefined : options}
                          readOnly={isReadOnlyCell}
                          allowCustomText={allowCustomText}
                          onChange={(nextValue) =>
                            onAnswerChange?.(row.rowId, column.id, nextValue)
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

export { DEFAULT_FALLS_COLUMN_QUESTIONS, formatAuditMonthLabel };
