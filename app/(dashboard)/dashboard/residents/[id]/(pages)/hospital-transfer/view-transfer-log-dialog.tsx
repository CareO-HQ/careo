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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
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
            <h3 className="text-lg font-semibold text-gray-900">Transfer Details</h3>

            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Transfer Date</span>
                  <p className="text-gray-900 font-medium">{formatDate(transferLog.date)}</p>
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

              {transferLog.outcome && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Outcome</span>
                  <p className="text-gray-900 mt-1">{transferLog.outcome}</p>
                </div>
              )}

              {transferLog.followUp && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Follow Up Required</span>
                  <p className="text-gray-900 mt-1">{transferLog.followUp}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Files Changed Section */}
          {transferLog.filesChanged && (transferLog.filesChanged.carePlan || transferLog.filesChanged.riskAssessment || transferLog.filesChanged.other) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Files Changed</h3>

              <div className="bg-white rounded-lg border p-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {transferLog.filesChanged.carePlan && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Care Plan Updated
                      </Badge>
                    )}
                    {transferLog.filesChanged.riskAssessment && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Risk Assessment Updated
                      </Badge>
                    )}
                    {transferLog.filesChanged.other && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Other Files Updated
                      </Badge>
                    )}
                  </div>

                  {transferLog.filesChanged.other && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Other Files Changed</span>
                      <p className="text-gray-900 mt-1">{transferLog.filesChanged.other}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {transferLog.filesChanged && !(transferLog.filesChanged.carePlan || transferLog.filesChanged.riskAssessment || transferLog.filesChanged.other) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Files Changed</h3>
              <div className="bg-white rounded-lg border p-4 text-center">
                <p className="text-gray-500">No file changes recorded</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Medication Changes Section */}
          {transferLog.medicationChanges && (
            transferLog.medicationChanges.medicationsAdded ||
            transferLog.medicationChanges.medicationsRemoved ||
            transferLog.medicationChanges.medicationsModified
          ) ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Medication Changes</h3>

              <div className="space-y-4">
                {/* Medications Added */}
                {transferLog.medicationChanges.medicationsAdded && (
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Medications Added
                      </Badge>
                    </div>
                    {transferLog.medicationChanges.addedMedications ? (
                      <p className="text-gray-900">{transferLog.medicationChanges.addedMedications}</p>
                    ) : (
                      <p className="text-gray-600 italic">No specific medications listed</p>
                    )}
                  </div>
                )}

                {/* Medications Removed */}
                {transferLog.medicationChanges.medicationsRemoved && (
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Medications Removed
                      </Badge>
                    </div>
                    {transferLog.medicationChanges.removedMedications ? (
                      <p className="text-gray-900">{transferLog.medicationChanges.removedMedications}</p>
                    ) : (
                      <p className="text-gray-600 italic">No specific medications listed</p>
                    )}
                  </div>
                )}

                {/* Medications Modified */}
                {transferLog.medicationChanges.medicationsModified && (
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Medications Modified
                      </Badge>
                    </div>
                    {transferLog.medicationChanges.modifiedMedications ? (
                      <p className="text-gray-900">{transferLog.medicationChanges.modifiedMedications}</p>
                    ) : (
                      <p className="text-gray-600 italic">No specific modifications listed</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Medication Changes</h3>
              <div className="bg-white rounded-lg border p-4 text-center">
                <p className="text-gray-500">No medication changes recorded</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Record Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Record Information</h3>

            <div className="bg-white rounded-lg border p-4 space-y-2">
              <div className="text-sm text-gray-600">
                <span>Created: {new Date(transferLog.createdAt).toLocaleString()}</span>
              </div>
              {transferLog.updatedAt && (
                <div className="text-sm text-gray-600">
                  <span>Last updated: {new Date(transferLog.updatedAt).toLocaleString()}</span>
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