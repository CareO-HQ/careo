"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckSquare, Square } from "lucide-react";

interface ViewTransferLogInlineProps {
  log: any;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (v: any) => string;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="min-h-[2.5rem] rounded-lg border border-input bg-muted/20 px-3 py-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
        {value || <span className="text-muted-foreground italic">Not provided</span>}
      </div>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {checked ? (
        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
      ) : (
        <Square className="w-4 h-4 text-muted-foreground/40 shrink-0" />
      )}
      <span className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground/60"}`}>
        {label}
      </span>
    </div>
  );
}

export function ViewTransferLogInline({
  log,
  onEdit,
  onDelete,
  formatDate,
}: ViewTransferLogInlineProps) {
  const files = log.filesChanged ?? {};
  const meds = log.medicationChanges ?? {};

  return (
    <div className="space-y-8">
      {/* ── Transfer Details ── */}
      <section className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {log.label || "Transfer Details"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Information about the hospital transfer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Transfer Date"
            value={log.date ? formatDate(log.date) : undefined}
          />
          <Field label="Transfer Time" value={log.time} />
        </div>

        <Field label="Hospital Name" value={log.hospitalName} />
        <Field label="Reason for Transfer" value={log.reason} />
        <Field label="Outcome" value={log.outcome} />
        <Field label="Follow-up Actions" value={log.followUp} />
      </section>

      {/* ── Files Changed ── */}
      <div className="border-t" />
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Files Changed</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Documents updated as a result of this transfer
          </p>
        </div>

        <div className="rounded-xl border border-input bg-muted/20 px-4 py-3 space-y-1">
          <CheckItem label="Care Plan Updated" checked={!!files.carePlan} />
          <CheckItem label="Risk Assessment Updated" checked={!!files.riskAssessment} />
        </div>

        {files.other && (
          <Field label="Other Files Changed" value={files.other} />
        )}
      </section>

      {/* ── Medication Changes ── */}
      <div className="border-t" />
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Medication Changes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Any changes to medications resulting from this transfer
          </p>
        </div>

        <div className="rounded-xl border border-input bg-muted/20 px-4 py-3 space-y-1">
          <CheckItem label="Medications Added" checked={!!meds.medicationsAdded} />
          <CheckItem label="Medications Removed" checked={!!meds.medicationsRemoved} />
          <CheckItem label="Medications Modified" checked={!!meds.medicationsModified} />
        </div>

        {meds.medicationsAdded && (
          <Field label="Added Medications" value={meds.addedMedications} />
        )}
        {meds.medicationsRemoved && (
          <Field label="Removed Medications" value={meds.removedMedications} />
        )}
        {meds.medicationsModified && (
          <Field label="Modified Medications" value={meds.modifiedMedications} />
        )}
      </section>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          variant="outline"
          className="rounded-xl px-6 h-10"
          onClick={onEdit}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Record
        </Button>
        <Button
          variant="ghost"
          className="rounded-xl px-6 h-10 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}
