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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { format } from "date-fns";
import { SignaturePad } from "./SignaturePad";

interface MedicationAdministrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: any;
  date: number;
  month: number;
  year: number;
  time: string;
  sheetId: string;
  existingRecord?: any;
  onSuccess: () => void;
}

export function MedicationAdministrationModal({
  isOpen,
  onClose,
  medication,
  date,
  month,
  year,
  time,
  sheetId,
  existingRecord,
  onSuccess,
}: MedicationAdministrationModalProps) {
  const { profile } = useProfile();
  const [status, setStatus] = useState<string>(existingRecord?.status || "given");
  const [notes, setNotes] = useState<string>(existingRecord?.notes || "");
  const [witnessId, setWitnessId] = useState<string>(existingRecord?.witness_id || "");
  const [availableWitnesses, setAvailableWitnesses] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string>(existingRecord?.administered_signature || "");

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  const displayDate = format(new Date(year, month - 1, date), "EEEE, MMMM d, yyyy");

  // Fetch available witnesses (other staff members)
  useEffect(() => {
    const fetchWitnesses = async () => {
      if (!profile?.active_organization_id) return;

      const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("active_organization_id", profile.active_organization_id)
        .neq("id", profile.id); // Exclude current user

      setAvailableWitnesses(users || []);
    };

    if (isOpen) {
      fetchWitnesses();
    }
  }, [isOpen, profile]);

  // Handle save
  const handleSave = async () => {
    if (!profile) {
      toast.error("User profile not found");
      return;
    }

    // Validation
    if (status === "given" && !witnessId) {
      toast.error("Please select a witness for medication administration");
      return;
    }

    if (status === "given" && !signature) {
      toast.error("Please provide your signature");
      return;
    }

    setIsSaving(true);

    try {
      const administrationData = {
        emar_sheet_id: sheetId,
        medication_id: medication.id,
        administration_date: dateStr,
        scheduled_time: time,
        status: status,
        administered_at: new Date().toISOString(),
        administered_by: profile.id,
        administered_signature: signature,
        witness_id: status === "given" ? witnessId : null,
        witness_at: status === "given" ? new Date().toISOString() : null,
        notes: notes || null,
        quantity: medication.time_quantities?.[time] || 1,
        organization_id: profile.active_organization_id,
        care_home_id: profile.active_care_home_id,
      };

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("emar_administrations")
          .update(administrationData)
          .eq("id", existingRecord.id);

        if (error) throw error;
        toast.success("Administration record updated");
      } else {
        // Create new record
        const { error } = await supabase
          .from("emar_administrations")
          .insert(administrationData);

        if (error) throw error;
        toast.success("Administration recorded successfully");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving administration:", error);
      toast.error(error.message || "Failed to save administration record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Medication Administration</DialogTitle>
          <DialogDescription>
            {displayDate} at {time}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Medication Information */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{medication.name}</h3>
              {medication.is_controlled_drug && (
                <Badge variant="destructive" className="text-xs">⚠ CD</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Dose:</span>{" "}
                <span className="font-medium">
                  {medication.time_quantities?.[time] || 1} × {medication.strength} {medication.strength_unit}
                </span>
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
                <span className="text-gray-600">Prescriber:</span>{" "}
                <span className="font-medium">{medication.prescriber_name || "—"}</span>
              </div>
            </div>
            {medication.instructions && (
              <div className="text-sm">
                <span className="text-gray-600">Instructions:</span>{" "}
                <span className="font-medium">{medication.instructions}</span>
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="font-semibold">Administration Status *</Label>
            <RadioGroup value={status} onValueChange={setStatus}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-green-50 transition-colors">
                <RadioGroupItem value="given" id="given" />
                <Label htmlFor="given" className="flex-1 cursor-pointer">
                  <div className="font-medium">✓ Given</div>
                  <div className="text-xs text-gray-600">Medication administered as prescribed</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-orange-50 transition-colors">
                <RadioGroupItem value="refused" id="refused" />
                <Label htmlFor="refused" className="flex-1 cursor-pointer">
                  <div className="font-medium">R Refused</div>
                  <div className="text-xs text-gray-600">Resident refused to take medication</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="omitted" id="omitted" />
                <Label htmlFor="omitted" className="flex-1 cursor-pointer">
                  <div className="font-medium">O Omitted</div>
                  <div className="text-xs text-gray-600">Medication not given for clinical reasons</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <RadioGroupItem value="not_required" id="not_required" />
                <Label htmlFor="not_required" className="flex-1 cursor-pointer">
                  <div className="font-medium">N Not Required</div>
                  <div className="text-xs text-gray-600">Medication not needed (e.g., resident out, medication discontinued)</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Witness Selection (required for "given") */}
          {status === "given" && (
            <div className="space-y-2">
              <Label htmlFor="witness" className="font-semibold">Witness *</Label>
              <Select value={witnessId} onValueChange={setWitnessId}>
                <SelectTrigger id="witness">
                  <SelectValue placeholder="Select a witness" />
                </SelectTrigger>
                <SelectContent>
                  {availableWitnesses.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                A second staff member must witness controlled drug and high-risk medication administration
              </p>
            </div>
          )}

          {/* Signature */}
          {status === "given" && (
            <div className="space-y-2">
              <Label className="font-semibold">Your Signature *</Label>
              <SignaturePad
                value={signature}
                onChange={setSignature}
                userName={profile?.name || ""}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="font-semibold">
              Notes {status !== "given" && "(Required)"}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                status === "refused"
                  ? "Please provide reason for refusal..."
                  : status === "omitted"
                  ? "Please provide clinical reason for omission..."
                  : "Add any additional notes..."
              }
              rows={3}
            />
          </div>

          {/* Administered By */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <span className="text-gray-700">Administered by:</span>{" "}
            <span className="font-semibold">{profile?.name || "Unknown"}</span>
            <span className="text-gray-600 ml-2">
              {format(new Date(), "dd/MM/yyyy HH:mm")}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : existingRecord ? "Update Record" : "Save Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
