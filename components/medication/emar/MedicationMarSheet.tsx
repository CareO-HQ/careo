"use client";

import React from "react";
import { format } from "date-fns";
import { resolveStorageObjectUrl } from "@/lib/storage";

interface MedicationMarSheetProps {
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

export function MedicationMarSheet({
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
}: MedicationMarSheetProps) {
  const residentImageUrl = resolveStorageObjectUrl("careo-public", resident?.image_url);

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

    const result = administrations.find(
      (admin) => {
        const match = admin.medication_id === medicationId &&
          admin.administration_date === dateStr &&
          normalizeTime(admin.scheduled_time) === normalizedSearchTime;

        // Debug logging
        if (day === 23 && time === '08:00') {
          console.log('Searching for:', { medicationId, dateStr, time, normalizedSearchTime });
          console.log('Checking admin:', {
            medication_id: admin.medication_id,
            administration_date: admin.administration_date,
            scheduled_time: admin.scheduled_time,
            normalized: normalizeTime(admin.scheduled_time),
            match
          });
        }

        return match;
      }
    );

    return result;
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "taken":
        return "bg-green-100 text-green-800 border-green-300";
      case "refused":
        return "bg-red-100 text-red-800 border-red-300";
      case "hospitalised":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "social_leave":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "refused_destroyed":
        return "bg-red-50 text-red-700 border-red-200";
      case "not_required":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "made_available":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  // Get status symbol
  const getStatusSymbol = (status: string) => {
    switch (status) {
      case "taken":
        return "T";
      case "refused":
        return "R";
      case "hospitalised":
        return "C";
      case "social_leave":
        return "D";
      case "refused_destroyed":
        return "E";
      case "not_required":
        return "NR";
      case "made_available":
        return "M";
      default:
        return "";
    }
  };

  // Get status full text for tooltip
  const getStatusFullText = (status: string) => {
    switch (status) {
      case "taken":
        return "When a medication is consumed by a service user";
      case "refused":
        return "When a service user refuses a medication";
      case "hospitalised":
        return "If the service user has been hospitalised";
      case "social_leave":
        return "If the service user is on social leave";
      case "refused_destroyed":
        return "If the service user refused the medication and the medication was then destroyed";
      case "not_required":
        return "If the service user no longer requires the medication";
      case "made_available":
        return "If the medication was made available for the service user to take";
      default:
        return "";
    }
  };

  // Get status simplified text
  const getStatusSimplifiedText = (status: string) => {
    switch (status) {
      case "taken": return "Taken";
      case "refused": return "Refused";
      case "hospitalised": return "Hospitalised";
      case "social_leave": return "Social leave";
      case "refused_destroyed": return "Refused and destroyed";
      case "not_required": return "Not required";
      case "made_available": return "Made available";
      default: return status;
    }
  };

  // Format time for display (convert 24h to 12h with AM/PM)
  const formatTimeDisplay = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
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
        <p className="text-sm font-medium text-gray-700">No scheduled medications</p>
        <p className="text-xs text-gray-600">
          Scheduled medications will appear here once added to the resident&apos;s medication list.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Combined MAR Sheet with Header and Table */}
      <div className="bg-white border-2 border-black overflow-x-auto print:border-black print:break-inside-avoid">
        {/* Resident Information Header */}
        <div className="border-b-2 border-black">
          <div className="bg-gray-700 text-white font-bold text-sm p-2 border-b-2 border-black">
            MEDICATION ADMINISTRATION RECORD (MAR) - {format(new Date(year, month - 1), "MMMM yyyy").toUpperCase()}
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr] gap-0">
            {/* Resident Photo */}
            <div className="border-r-2 border-black p-2 flex items-center justify-center">
              {residentImageUrl ? (
                <img
                  src={residentImageUrl}
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

        {/* MAR Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-2 border-black bg-gray-700 text-white font-bold text-xs p-2 sticky left-0 z-20 min-w-[220px]">
                MEDICATION / DOSE / ROUTE
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
                    const status = admin?.status || "scheduled";

                    return (
                      <td
                        key={day}
                        className={`border-2 border-black p-0 w-[28px] max-w-[28px] h-[45px] ${
                          hasRecord
                            ? status === 'given' ? 'bg-green-100' :
                              status === 'refused' ? 'bg-red-100' :
                              status === 'missed' ? 'bg-amber-100' :
                              'bg-gray-100'
                            : 'bg-white'
                        }`}
                        title={hasRecord ? `${medication.name} - ${formatTimeDisplay(time)} - ${getStatusSimplifiedText(status)}\n${getStatusFullText(status)}\nStaff: ${admin.administered_by?.name || "Unknown"}${admin.witness?.name ? `\nWitness: ${admin.witness.name}` : ""}\nDate: ${day}/${month}/${year}` : `Day ${day} - No administration`}
                      >
                        {hasRecord ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className={`font-bold ${status === 'not_required' ? 'text-sm' : 'text-base'} leading-none ${
                                status === 'taken' ? 'text-green-700' :
                                status === 'refused' ? 'text-red-700' :
                                status === 'hospitalised' ? 'text-blue-700' :
                                status === 'social_leave' ? 'text-orange-700' :
                                status === 'refused_destroyed' ? 'text-red-700' :
                                status === 'not_required' ? 'text-gray-700' :
                                status === 'made_available' ? 'text-purple-700' :
                                'text-gray-700'
                              }`}>
                              {getStatusSymbol(status)}
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

      {/* Administration Key */}
      <div className="mt-6 border-2 border-black p-4 bg-white print:break-inside-avoid">
        <h3 className="font-bold text-sm mb-3 uppercase text-gray-900 border-b-2 border-black pb-2">
          Administration Codes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-green-600 bg-green-50 flex items-center justify-center font-bold text-base text-green-700" title={getStatusFullText("taken")}>
              T
            </div>
            <div>
              <div className="font-bold text-gray-900">Taken</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-red-600 bg-red-50 flex items-center justify-center font-bold text-base text-red-700" title={getStatusFullText("refused")}>
              R
            </div>
            <div>
              <div className="font-bold text-gray-900">Refused</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 bg-blue-50 flex items-center justify-center font-bold text-base text-blue-700" title={getStatusFullText("hospitalised")}>
              C
            </div>
            <div>
              <div className="font-bold text-gray-900">Hospitalised</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-600 bg-orange-50 flex items-center justify-center font-bold text-base text-orange-700" title={getStatusFullText("social_leave")}>
              D
            </div>
            <div>
              <div className="font-bold text-gray-900">Social leave</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-red-600 bg-red-50 flex items-center justify-center font-bold text-base text-red-700" title={getStatusFullText("refused_destroyed")}>
              E
            </div>
            <div>
              <div className="font-bold text-gray-900">Refused/Destroyed</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-600 bg-gray-50 flex items-center justify-center font-bold text-sm text-gray-700" title={getStatusFullText("not_required")}>
              NR
            </div>
            <div>
              <div className="font-bold text-gray-900">Not Required</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-600 bg-purple-50 flex items-center justify-center font-bold text-base text-purple-700" title={getStatusFullText("made_available")}>
              M
            </div>
            <div>
              <div className="font-bold text-gray-900">Made Available</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
