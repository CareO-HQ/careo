"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface TopicalMarSheetProps {
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

export function TopicalMarSheet({
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
}: TopicalMarSheetProps) {
  const [selectedCell, setSelectedCell] = useState<{
    medication: any;
    date: number;
    administrations: any[];
  } | null>(null);

  // Generate array of days [1, 2, 3, ..., daysInMonth]
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Get administration record for a specific medication, date, and time
  const getAdministrationForCell = (medicationId: string, day: number, time: string) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Normalize time format: database returns "HH:mm:ss", medication times are "HH:mm"
    const normalizeTime = (t: string | null) => {
      if (!t) return null;
      // If already in HH:mm format, add :00 seconds
      if (t.length === 5 && t.includes(':')) return `${t}:00`;
      // If in HH:mm:ss format, return as-is
      return t;
    };

    const normalizedSearchTime = normalizeTime(time);

    return administrations.find(
      (admin) => {
        return admin.medication_id === medicationId &&
          admin.administration_date === dateStr &&
          normalizeTime(admin.scheduled_time) === normalizedSearchTime;
      }
    );
  };

  // Handle cell click - show details in read-only modal
  const handleCellClick = (medication: any, day: number, admin: any) => {
    if (admin) {
      setSelectedCell({ medication, date: day, administrations: [admin] });
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

  // Extract status from notes
  const getStatusFromNotes = (notes: string | null) => {
    if (!notes) return "Applied";
    const statusMatch = notes.match(/Status:\s*(Applied|Refused|Missed)/i);
    return statusMatch ? statusMatch[1] : "Applied";
  };

  // Get badge color based on status
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied":
        return "bg-green-100 text-green-800 border-green-300";
      case "refused":
        return "bg-red-100 text-red-800 border-red-300";
      case "missed":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border-2 border-black rounded bg-white">
        <p className="text-sm font-medium text-gray-700">No topical medications</p>
        <p className="text-xs text-gray-600">
          Topical medications will appear here once added to the resident&apos;s medication list.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Topical MAR Sheet with Header and Table */}
      <div className="bg-white border-2 border-black overflow-x-auto print:border-black print:break-inside-avoid">
        {/* Resident Information Header */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-700 text-white font-bold text-sm p-2 border-b-2 border-black">
            TOPICAL MEDICATION ADMINISTRATION RECORD (MAR) - {format(new Date(year, month - 1), "MMMM yyyy").toUpperCase()}
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

        {/* Topical MAR Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-2 border-black bg-gray-700 text-white font-bold text-xs p-2 sticky left-0 z-20 min-w-[220px]">
                MEDICATION / DOSE / APPLICATION SITE
              </th>
              <th className="border-2 border-black bg-gray-700 text-white font-bold text-xs p-2 min-w-[80px]">
                TIME
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
            {medications.map((medication, medIndex) => {
              const timesArray = medication.times || [];

              return timesArray.map((time: string, timeIndex: number) => (
                <tr key={`${medication.id}-${time}`} className={medIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {/* Medication Details - only show on first row */}
                  {timeIndex === 0 && (
                    <td
                      rowSpan={timesArray.length}
                      className="border-2 border-black p-2 font-medium sticky left-0 z-10 bg-inherit"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{medication.name}</p>
                        </div>
                        <div className="text-xs text-gray-700">
                          <span className="font-semibold">Dose:</span> {medication.strength} {medication.strength_unit}
                        </div>
                        <div className="text-xs text-gray-700">
                          <span className="font-semibold">Route:</span> {medication.route || "—"}
                        </div>
                        {medication.instructions && (
                          <div className="text-xs text-gray-700">
                            <span className="font-semibold">Site:</span> {medication.instructions}
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Time - show for each row */}
                  <td className="border-2 border-black p-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-sm">{time}</span>
                      <span className="text-[10px] text-gray-600">
                        ({medication.time_quantities?.[time] || 1}x)
                      </span>
                    </div>
                  </td>

                  {/* Day cells */}
                  {days.map((day) => {
                    const admin = getAdministrationForCell(medication.id, day, time);
                    const hasRecord = !!admin;
                    const status = admin ? getStatusFromNotes(admin.notes) : "";

                    return (
                      <td
                        key={day}
                        className={`border-2 border-black p-0 w-[28px] max-w-[28px] h-[45px] ${
                          hasRecord
                            ? status.toLowerCase() === 'applied' ? 'bg-green-100' :
                              status.toLowerCase() === 'refused' ? 'bg-red-100' :
                              status.toLowerCase() === 'missed' ? 'bg-amber-100' :
                              'bg-gray-100'
                            : 'bg-white'
                        } ${hasRecord ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => hasRecord && handleCellClick(medication, day, admin)}
                        title={hasRecord ? `${medication.name} - ${time} - ${status.toUpperCase()}\nStaff: ${admin.administered_by?.name || "Unknown"}\nDate: ${day}/${month}/${year}` : `Day ${day} - No application`}
                      >
                        {hasRecord ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className={`font-bold text-base leading-none ${
                              status.toLowerCase() === 'applied' ? 'text-green-700' :
                              status.toLowerCase() === 'refused' ? 'text-red-700' :
                              status.toLowerCase() === 'missed' ? 'text-amber-700' :
                              'text-gray-700'
                            }`}>
                              {status.charAt(0).toUpperCase()}
                            </span>
                            {admin.administered_by && (
                              <span className="text-[7px] font-bold text-gray-800 leading-tight mt-0.5">
                                {admin.administered_by.name?.split(" ").map((n: string) => n[0]).join("")}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>


      {/* Read-Only Details Modal */}
      {selectedCell && (
        <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Topical Application Details - {selectedCell.medication.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(year, month - 1, selectedCell.date), "EEEE, MMMM d, yyyy")}
              </p>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {selectedCell.administrations.map((admin, index) => {
                const status = getStatusFromNotes(admin.notes);
                return (
                  <div key={admin.id || index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Time</p>
                        <p className="text-sm font-medium">{formatTimeDisplay(admin.administered_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">Status</p>
                        <Badge className={`mt-1 ${getStatusBadgeColor(status)}`}>
                          {status}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Administered By</p>
                        <p className="text-sm font-medium">{admin.administered_by?.name || "Unknown"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
