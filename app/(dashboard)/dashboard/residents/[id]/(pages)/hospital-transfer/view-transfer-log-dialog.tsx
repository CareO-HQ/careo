"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// No icons needed for clean design

interface ViewTransferLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferLog: any | null;
  residentName: string;
  currentUser: any | null;
}

export function ViewTransferLogDialog({
  open,
  onOpenChange,
  transferLog,
  residentName,
  currentUser,
}: ViewTransferLogDialogProps) {
  if (!transferLog) {
    return null;
  }

  const formatDate = (dateValue: string | number | Date) => {
    if (!dateValue) return "Not specified";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);

    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/London'
    });
  };

  const formatDateTime = (dateValue: string | number | Date) => {
    if (!dateValue) return "Not specified";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleString('en-GB', {
      timeZone: 'Europe/London'
    });
  };

  const getCreatedByName = () => {
    if (!transferLog.createdBy) return null;

    // If current user ID matches the createdBy ID, show current user's name
    if (currentUser && currentUser.user?.id === transferLog.createdBy) {
      return currentUser.user.name || currentUser.user.email || 'Current User';
    }

    // Otherwise, show the user ID (could be enhanced to fetch user details from API)
    return transferLog.createdBy;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Transfer Log Details</DialogTitle>
          <DialogDescription>
            Complete transfer information for {residentName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-1">
          {/* Transfer Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{transferLog.label || "Transfer Details"}</h3>

            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Date</span>
                  <p className="text-gray-900 font-medium">{formatDate(transferLog.date)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Time</span>
                  <p className="text-gray-900 font-medium">{transferLog.time || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Hospital</span>
                  <p className="text-gray-900 font-medium">{transferLog.hospitalName}</p>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600">Reason for Transfer</span>
                <p className="text-gray-900 mt-1">{transferLog.reason}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600">Outcome</span>
                <p className={transferLog.outcome ? "text-gray-900 mt-1" : "text-gray-500 mt-1 italic"}>
                  {transferLog.outcome || "Not provided"}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600">Follow Up Required</span>
                <p className={transferLog.followUp ? "text-gray-900 mt-1" : "text-gray-500 mt-1 italic"}>
                  {transferLog.followUp || "Not provided"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Files Changed Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Files Changed</h3>

            <div className="bg-white rounded-lg border p-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={transferLog.filesChanged?.carePlan ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-400 border-gray-200"}>
                    Care Plan {transferLog.filesChanged?.carePlan ? "Updated" : "Not Updated"}
                  </Badge>
                  <Badge variant="outline" className={transferLog.filesChanged?.riskAssessment ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-400 border-gray-200"}>
                    Risk Assessment {transferLog.filesChanged?.riskAssessment ? "Updated" : "Not Updated"}
                  </Badge>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Other Files Changed</span>
                  <p className={transferLog.filesChanged?.other ? "text-gray-900 mt-1" : "text-gray-500 mt-1 italic"}>
                    {transferLog.filesChanged?.other || "None recorded"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Medication Changes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Medication Changes</h3>

            <div className="space-y-4">
              {/* Medications Added */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="outline" className={transferLog.medicationChanges?.medicationsAdded ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"}>
                    Medications {transferLog.medicationChanges?.medicationsAdded ? "Added" : "Not Added"}
                  </Badge>
                </div>
                {transferLog.medicationChanges?.medicationsAdded && (
                  <p className={transferLog.medicationChanges.addedMedications ? "text-gray-900" : "text-gray-500 italic"}>
                    {transferLog.medicationChanges.addedMedications || "No specific medications listed"}
                  </p>
                )}
              </div>

              {/* Medications Removed */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="outline" className={transferLog.medicationChanges?.medicationsRemoved ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-400 border-gray-200"}>
                    Medications {transferLog.medicationChanges?.medicationsRemoved ? "Removed" : "Not Removed"}
                  </Badge>
                </div>
                {transferLog.medicationChanges?.medicationsRemoved && (
                  <p className={transferLog.medicationChanges.removedMedications ? "text-gray-900" : "text-gray-500 italic"}>
                    {transferLog.medicationChanges.removedMedications || "No specific medications listed"}
                  </p>
                )}
              </div>

              {/* Medications Modified */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="outline" className={transferLog.medicationChanges?.medicationsModified ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-gray-50 text-gray-400 border-gray-200"}>
                    Medications {transferLog.medicationChanges?.medicationsModified ? "Modified" : "Not Modified"}
                  </Badge>
                </div>
                {transferLog.medicationChanges?.medicationModified && (
                  <p className={transferLog.medicationChanges.modifiedMedications ? "text-gray-900" : "text-gray-500 italic"}>
                    {transferLog.medicationChanges.modifiedMedications || "No specific modifications listed"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Record Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Record Information</h3>

            <div className="bg-white rounded-lg border p-4 space-y-2">
              <div className="text-sm text-gray-600">
                <span>Created: {formatDateTime(transferLog.createdAt)}</span>
              </div>
              {transferLog.updatedAt && (
                <div className="text-sm text-gray-600">
                  <span>Last updated: {formatDateTime(transferLog.updatedAt)}</span>
                </div>
              )}
              {getCreatedByName() && (
                <div className="text-sm text-gray-600">
                  <span>Created by: {getCreatedByName()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}