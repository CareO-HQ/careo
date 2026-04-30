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
import { isLiquidDosageForm } from "@/lib/medication/liquid-helpers";

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
  const [status, setStatus] = useState<string>(existingRecord?.status || "taken");
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
    const needsWitness = status === "taken" || status === "made_available";

    if (needsWitness && !witnessId) {
      toast.error("Please select a witness for this status");
      return;
    }

    if (needsWitness && !signature) {
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
        witness_id: needsWitness ? witnessId : null,
        witness_at: needsWitness ? new Date().toISOString() : null,
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

          {/* Liquid medication or Injection: Available Volume Info */}
          {(isLiquidDosageForm(medication.dosage_form) || medication.dosage_form?.toLowerCase().includes('injection')) && medication.total_count != null && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {medication.dosage_form?.toLowerCase().includes('injection') && medication.container_type 
                    ? "Available Stock" 
                    : "Available Volume"}
                </span>
                <span className="text-lg font-bold text-blue-700">
                  {medication.total_count} {(() => {
                    if (medication.dosage_form?.toLowerCase().includes('injection') && medication.container_type) {
                      const ct = medication.container_type.toLowerCase();
                      return medication.total_count === 1 ? ct : (ct.endsWith('s') ? ct : ct + 's');
                    }
                    return 'ml';
                  })()}
                </span>
              </div>
              {(() => {
                const doseQty = medication.time_quantities?.[time] || 1;
                const unit = (() => {
                  if (medication.dosage_form?.toLowerCase().includes('injection') && medication.container_type) {
                    const ct = medication.container_type.toLowerCase();
                    return doseQty === 1 ? ct : (ct.endsWith('s') ? ct : ct + 's');
                  }
                  return 'ml';
                })();
                const remaining = Math.max(0, (medication.total_count || 0) - doseQty);
                const exceedsStock = doseQty > (medication.total_count || 0);
                return (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-800">Dispensing this dose:</span>
                      <span className="font-semibold text-blue-700">{doseQty} {unit}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-800">Remaining after:</span>
                      <span className={`font-semibold ${exceedsStock ? 'text-red-600' : 'text-blue-700'}`}>
                        {remaining} {unit}
                      </span>
                    </div>
                    {exceedsStock && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        ⚠ Dispensed amount exceeds available stock
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="font-semibold">Administration Status *</Label>
            <RadioGroup value={status} onValueChange={setStatus} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-green-50 transition-colors">
                <RadioGroupItem value="taken" id="taken" />
                <Label htmlFor="taken" className="flex-1 cursor-pointer">
                  <div className="font-medium">T Taken</div>
                  <div className="text-xs text-gray-600">When a medication is consumed by a service user</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-orange-50 transition-colors">
                <RadioGroupItem value="refused" id="refused" />
                <Label htmlFor="refused" className="flex-1 cursor-pointer">
                  <div className="font-medium">R Refused</div>
                  <div className="text-xs text-gray-600">When a service user refuses a medication</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-red-50 transition-colors">
                <RadioGroupItem value="refused_destroyed" id="refused_destroyed" />
                <Label htmlFor="refused_destroyed" className="flex-1 cursor-pointer">
                  <div className="font-medium">E Refused and destroyed</div>
                  <div className="text-xs text-gray-600">If the service user refused and medication was destroyed</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <RadioGroupItem value="hospitalised" id="hospitalised" />
                <Label htmlFor="hospitalised" className="flex-1 cursor-pointer">
                  <div className="font-medium">C Hospitalised</div>
                  <div className="text-xs text-gray-600">If the service user has been hospitalised</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-amber-50 transition-colors">
                <RadioGroupItem value="social_leave" id="social_leave" />
                <Label htmlFor="social_leave" className="flex-1 cursor-pointer">
                  <div className="font-medium">D Social leave</div>
                  <div className="text-xs text-gray-600">If the service user is on social leave</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="not_required" id="not_required" />
                <Label htmlFor="not_required" className="flex-1 cursor-pointer">
                  <div className="font-medium">NR Not required</div>
                  <div className="text-xs text-gray-600">If the service user no longer requires the medication</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-purple-50 transition-colors">
                <RadioGroupItem value="made_available" id="made_available" />
                <Label htmlFor="made_available" className="flex-1 cursor-pointer">
                  <div className="font-medium">M Made available</div>
                  <div className="text-xs text-gray-600">If the medication was made available for the user</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Witness Selection */}
          {(status === "taken" || status === "made_available") && (
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
          {(status === "taken" || status === "made_available") && (
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
              Notes {(status !== "taken" && status !== "made_available") && "(Required)"}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                status === "refused"
                  ? "Please provide reason for refusal..."
                  : status === "not_required"
                  ? "Please provide reason why not required..."
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
