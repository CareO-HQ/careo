"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { SignaturePad } from "./SignaturePad";

interface PrnAdministrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: any;
  date: number;
  month: number;
  year: number;
  sheetId: string;
  existingRecords: any[];
  onSuccess: () => void;
}

export function PrnAdministrationModal({
  isOpen,
  onClose,
  medication,
  date,
  month,
  year,
  sheetId,
  existingRecords,
  onSuccess,
}: PrnAdministrationModalProps) {
  const { profile } = useProfile();
  const [reason, setReason] = useState("");
  const [doseAdministered, setDoseAdministered] = useState(
    `${medication.strength} ${medication.strength_unit}`
  );
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [signature, setSignature] = useState("");

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  const displayDate = format(new Date(year, month - 1, date), "EEEE, MMMM d, yyyy");

  // Handle adding a new PRN administration
  const handleAddAdministration = async () => {
    if (!profile) {
      toast.error("User profile not found");
      return;
    }

    // Validation
    if (!reason.trim()) {
      toast.error("Please provide a reason for PRN administration");
      return;
    }

    if (!doseAdministered.trim()) {
      toast.error("Please specify the dose administered");
      return;
    }

    if (!outcome.trim()) {
      toast.error("Please describe the outcome");
      return;
    }

    if (!signature) {
      toast.error("Please provide your signature");
      return;
    }

    setIsSaving(true);

    try {
      const administrationData = {
        emar_sheet_id: sheetId,
        medication_id: medication.id,
        administration_date: dateStr,
        scheduled_time: null, // PRN has no scheduled time
        status: "given",
        administered_at: new Date().toISOString(),
        administered_by: profile.id,
        administered_signature: signature,
        prn_reason: reason,
        prn_dose_administered: doseAdministered,
        prn_outcome: outcome,
        notes: notes || null,
        quantity: 1,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
      };

      const { error } = await supabase
        .from("emar_administrations")
        .insert(administrationData);

      if (error) throw error;

      toast.success("PRN administration recorded");

      // Reset form
      setReason("");
      setDoseAdministered(`${medication.strength} ${medication.strength_unit}`);
      setOutcome("");
      setNotes("");
      setSignature("");

      onSuccess();
    } catch (error: any) {
      console.error("Error saving PRN administration:", error);
      toast.error(error.message || "Failed to save PRN administration");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deleting an existing administration
  const handleDeleteAdministration = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this administration record?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("emar_administrations")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      toast.success("Administration record deleted");
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting administration:", error);
      toast.error(error.message || "Failed to delete administration");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>PRN Medication Administration</DialogTitle>
          <DialogDescription>
            {displayDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Medication Information */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{medication.name}</h3>
              <Badge variant="outline" className="text-xs">PRN</Badge>
              {medication.is_controlled_drug && (
                <Badge variant="destructive" className="text-xs">⚠ CD</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Strength:</span>{" "}
                <span className="font-medium">{medication.strength} {medication.strength_unit}</span>
              </div>
              <div>
                <span className="text-gray-600">Route:</span>{" "}
                <span className="font-medium">{medication.route}</span>
              </div>
              <div>
                <span className="text-gray-600">Form:</span>{" "}
                <span className="font-medium">{medication.dosage_form}</span>
              </div>
              <div>
                <span className="text-gray-600">Max Dose:</span>{" "}
                <span className="font-medium">{medication.frequency || "As required"}</span>
              </div>
            </div>
            {medication.instructions && (
              <div className="text-sm">
                <span className="text-gray-600">Indication:</span>{" "}
                <span className="font-medium">{medication.instructions}</span>
              </div>
            )}
          </div>

          {/* Existing Administrations */}
          {existingRecords.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Previous Administrations Today</h3>
              <div className="space-y-2">
                {existingRecords.map((record) => (
                  <div key={record.id} className="p-3 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1 text-sm">
                        <div>
                          <span className="font-semibold">Time:</span>{" "}
                          {format(new Date(record.administered_at), "HH:mm")}
                        </div>
                        <div>
                          <span className="font-semibold">Reason:</span> {record.prn_reason}
                        </div>
                        <div>
                          <span className="font-semibold">Dose:</span> {record.prn_dose_administered}
                        </div>
                        <div>
                          <span className="font-semibold">Outcome:</span> {record.prn_outcome}
                        </div>
                        {record.notes && (
                          <div>
                            <span className="font-semibold">Notes:</span> {record.notes}
                          </div>
                        )}
                        <div className="text-xs text-gray-600">
                          By: {record.administered_by?.name || "Unknown"} at{" "}
                          {format(new Date(record.administered_at), "dd/MM/yyyy HH:mm")}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteAdministration(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* New Administration Form */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Record New Administration
            </h3>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="font-semibold">
                Reason for PRN *
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Resident complaining of pain (8/10), restless and uncomfortable..."
                rows={2}
              />
              <p className="text-xs text-gray-600">
                Document the symptoms or circumstances requiring PRN medication
              </p>
            </div>

            {/* Dose Administered */}
            <div className="space-y-2">
              <Label htmlFor="dose" className="font-semibold">
                Dose Administered *
              </Label>
              <Input
                id="dose"
                value={doseAdministered}
                onChange={(e) => setDoseAdministered(e.target.value)}
                placeholder="e.g., 500mg, 1 tablet"
              />
            </div>

            {/* Outcome */}
            <div className="space-y-2">
              <Label htmlFor="outcome" className="font-semibold">
                Outcome/Effectiveness *
              </Label>
              <Textarea
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="e.g., Pain reduced to 3/10 after 30 minutes, resident settled and comfortable..."
                rows={2}
              />
              <p className="text-xs text-gray-600">
                Record the effectiveness and any observed changes after 15-30 minutes
              </p>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-semibold">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional observations or context..."
                rows={2}
              />
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <Label className="font-semibold">Your Signature *</Label>
              <SignaturePad
                value={signature}
                onChange={setSignature}
                userName={profile?.name || ""}
              />
            </div>

            {/* Administered By Info */}
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <span className="text-gray-700">Administered by:</span>{" "}
              <span className="font-semibold">{profile?.name || "Unknown"}</span>
              <span className="text-gray-600 ml-2">
                {format(new Date(), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {existingRecords.length > 0 ? "Done" : "Cancel"}
          </Button>
          <Button onClick={handleAddAdministration} disabled={isSaving}>
            {isSaving ? "Saving..." : "Add Administration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
