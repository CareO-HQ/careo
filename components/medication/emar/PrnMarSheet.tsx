"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface PrnMarSheetProps {
  residentId: string;
  residentName: string;
  sheetId: string;
  medications: any[];
  administrations: any[];
  month: number;
  year: number;
  daysInMonth: number;
  isReadOnly: boolean;
  onRefresh: () => void;
  resident?: any;
  careHomeName?: string;
}

export function PrnMarSheet({
  residentId,
  residentName,
  sheetId,
  medications,
  administrations,
  month,
  year,
  daysInMonth,
  isReadOnly,
  onRefresh,
  resident,
  careHomeName,
}: PrnMarSheetProps) {
  const [selectedCell, setSelectedCell] = useState<{
    medication: any;
    date: number;
    administrations: any[];
  } | null>(null);

  // Generate array of days [1, 2, 3, ..., daysInMonth]
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Get all administrations for a specific medication and date
  const getAdministrationsForCell = (medicationId: string, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return administrations.filter(
      (admin) =>
        admin.medication_id === medicationId &&
        admin.administration_date === dateStr
    );
  };

  // Handle cell click - show details in read-only modal
  const handleCellClick = (medication: any, day: number) => {
    const admins = getAdministrationsForCell(medication.id, day);
    if (admins.length > 0) {
      setSelectedCell({ medication, date: day, administrations: admins });
    }
  };

  // Format time for display
  const formatTimeDisplay = (timestamp: string | null) => {
    if (!timestamp) return "Not recorded";
    try {
      const date = new Date(timestamp);
      return format(date, "h:mm a");
    } catch {
      return "Invalid time";
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  // Get allergies list
  const getAllergies = () => {
    if (!resident?.allergies || resident.allergies.length === 0) return "None recorded";
    return resident.allergies.join(", ");
  };

  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border-2 border-black rounded bg-white">
        <p className="text-sm font-medium text-gray-700">No PRN medications</p>
        <p className="text-xs text-gray-600">
          PRN (as-required) medications will appear here once added to the resident&apos;s medication list.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Combined PRN MAR Sheet with Header and Table */}
      <div className="bg-white border-2 border-black overflow-x-auto print:border-black print:break-inside-avoid">
        {/* Resident Information Header */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-700 text-white font-bold text-sm p-2 border-b-2 border-black">
            PRN MEDICATION ADMINISTRATION RECORD (MAR) - {format(new Date(year, month - 1), "MMMM yyyy").toUpperCase()}
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr] gap-0">
            {/* Resident Photo */}
            <div className="border-r-2 border-black p-2 flex items-center justify-center">
              {resident?.image_url ? (
                <img
                  src={resident.image_url}
                  alt={residentName}
                  className="w-24 h-24 object-cover rounded border-2 border-gray-300"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-xs text-center">No Photo</span>
                </div>
              )}
            </div>

            {/* Left Column */}
            <div className="border-r-2 border-black">
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">Name: </span>
                <span className="text-sm font-medium">{residentName}</span>
              </div>
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">DOB: </span>
                <span className="text-sm font-medium">{formatDate(resident?.date_of_birth)}</span>
              </div>
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">GP: </span>
                <span className="text-sm font-medium">{resident?.gp_name || "—"}</span>
              </div>
              <div className="p-2">
                <span className="font-bold text-xs uppercase text-gray-700">Allergies: </span>
                <span className="text-sm font-medium text-red-700">{getAllergies()}</span>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">Care Home: </span>
                <span className="text-sm font-medium">{careHomeName || "—"}</span>
              </div>
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">Room Number: </span>
                <span className="text-sm font-medium">{resident?.room_number || "—"}</span>
              </div>
              <div className="p-2">
                <span className="font-bold text-xs uppercase text-gray-700">NHS Number: </span>
                <span className="text-sm font-medium">{resident?.nhs_number || "Not recorded"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRN MAR Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-2 border-black bg-gray-700 text-white font-bold text-xs p-2 sticky left-0 z-20 min-w-[220px]">
                MEDICATION / DOSE / INDICATION
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="border-2 border-black bg-gray-700 text-white font-bold text-[10px] p-0.5 w-[28px] max-w-[28px] text-center"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medications.map((medication, medIndex) => (
              <tr key={medication.id} className={medIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {/* Medication Details Column */}
                <td className="border-2 border-black p-2 font-medium sticky left-0 z-10 bg-inherit">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{medication.name}</p>
                      {medication.is_controlled_drug && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-800 border border-red-400 rounded">
                          CD
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold">Dose:</span> {medication.strength} {medication.strength_unit}
                    </div>
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold">Route:</span> {medication.route || "—"}
                    </div>
                    {medication.instructions && (
                      <div className="text-xs text-gray-700">
                        <span className="font-semibold">Indication:</span> {medication.instructions}
                      </div>
                    )}
                  </div>
                </td>

                {/* Day cells */}
                {days.map((day) => {
                  const admins = getAdministrationsForCell(medication.id, day);
                  const adminCount = admins.length;

                  // Build detailed tooltip
                  const buildTooltip = () => {
                    if (adminCount === 0) return "No PRN administrations";

                    return admins.map((admin, idx) => {
                      const parts = [
                        `Dose ${idx + 1}:`,
                        `Time: ${formatTimeDisplay(admin.administered_at)}`,
                        `Staff: ${admin.administered_by?.name || "Unknown"}`,
                        admin.prn_reason ? `Reason: ${admin.prn_reason}` : null,
                        admin.prn_dose_administered ? `Dose Given: ${admin.prn_dose_administered}` : null,
                        admin.prn_outcome ? `Outcome: ${admin.prn_outcome}` : null,
                      ].filter(Boolean).join('\n');
                      return parts;
                    }).join('\n\n');
                  };

                  return (
                    <td
                      key={day}
                      className={`border-2 border-black p-1 w-[28px] max-w-[28px] min-h-[45px] ${
                        adminCount > 0 ? 'bg-green-100 cursor-pointer hover:bg-green-200' : 'bg-white'
                      }`}
                      onClick={() => handleCellClick(medication, day)}
                      title={buildTooltip()}
                    >
                      {adminCount > 0 ? (
                        <div className="flex flex-col items-center justify-start gap-1 h-full">
                          {admins.map((admin, index) => (
                            <div
                              key={admin.id || index}
                              className="flex flex-col items-center w-full group relative"
                            >
                              {index > 0 && (
                                <div className="w-full border-t border-gray-400 my-1"></div>
                              )}
                              <div className="flex flex-col items-center gap-0.5 py-0.5">
                                <span className="font-bold text-sm text-green-700 leading-none">
                                  ✓
                                </span>
                                {admin.administered_by && (
                                  <span className="text-[7px] font-bold text-gray-800 leading-none">
                                    {admin.administered_by.name?.split(" ").map((n: string) => n[0]).join("")}
                                  </span>
                                )}
                                <span className="text-[6px] text-gray-600 leading-none">
                                  {formatTimeDisplay(admin.administered_at).replace(' ', '')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Read-Only Details Modal */}
      {selectedCell && (
        <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                PRN Administration Details - {selectedCell.medication.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(year, month - 1, selectedCell.date), "EEEE, MMMM d, yyyy")}
              </p>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {selectedCell.administrations.map((admin, index) => (
                <div key={admin.id || index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Time</p>
                      <p className="text-sm font-medium">{formatTimeDisplay(admin.administered_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Status</p>
                      <Badge className="mt-1 bg-green-100 text-green-800 border-green-300">
                        {admin.status || "Given"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Dose Administered</p>
                      <p className="text-sm font-medium">{admin.prn_dose_administered || `${admin.quantity || 1}x`}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Administered By</p>
                      <p className="text-sm font-medium">{admin.administered_by?.name || "Unknown"}</p>
                    </div>
                    {admin.prn_reason && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Reason</p>
                        <p className="text-sm">{admin.prn_reason}</p>
                      </div>
                    )}
                    {admin.prn_outcome && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Outcome</p>
                        <p className="text-sm">{admin.prn_outcome}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
