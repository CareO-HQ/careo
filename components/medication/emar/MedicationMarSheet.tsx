"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MedicationAdministrationModal } from "./MedicationAdministrationModal";

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
}: MedicationMarSheetProps) {
  const [selectedCell, setSelectedCell] = useState<{
    medication: any;
    date: number;
    time: string;
  } | null>(null);

  // Generate array of days [1, 2, 3, ..., daysInMonth]
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Get administration record for a specific medication, date, and time
  const getAdministrationForCell = (medicationId: string, day: number, time: string) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return administrations.find(
      (admin) =>
        admin.medication_id === medicationId &&
        admin.administration_date === dateStr &&
        admin.scheduled_time === time
    );
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "given":
        return "bg-green-100 text-green-800 border-green-300";
      case "refused":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "omitted":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "not_required":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  // Get status symbol
  const getStatusSymbol = (status: string) => {
    switch (status) {
      case "given":
        return "✓";
      case "refused":
        return "R";
      case "omitted":
        return "O";
      case "not_required":
        return "N";
      default:
        return "";
    }
  };

  // Handle cell click
  const handleCellClick = (medication: any, day: number, time: string) => {
    if (isReadOnly) return;
    setSelectedCell({ medication, date: day, time });
  };

  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border rounded-lg bg-muted/30">
        <p className="text-sm font-medium text-muted-foreground">No scheduled medications</p>
        <p className="text-xs text-muted-foreground">
          Scheduled medications will appear here once added to the resident&apos;s medication list.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-700 hover:bg-gray-700">
              <TableHead className="text-white font-bold sticky left-0 z-10 bg-gray-700 min-w-[200px]">
                Medication
              </TableHead>
              <TableHead className="text-white font-bold min-w-[80px]">Dose</TableHead>
              <TableHead className="text-white font-bold min-w-[80px]">Route</TableHead>
              <TableHead className="text-white font-bold min-w-[100px]">Times</TableHead>
              {days.map((day) => (
                <TableHead
                  key={day}
                  className="text-white text-center font-bold min-w-[60px] p-1"
                >
                  {day}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {medications.map((medication, medIndex) => {
              const timesArray = medication.times || [];
              const rowsNeeded = Math.max(timesArray.length, 1);

              return timesArray.map((time: string, timeIndex: number) => (
                <TableRow
                  key={`${medication.id}-${time}`}
                  className={medIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  {/* Medication name (only show on first row for this medication) */}
                  {timeIndex === 0 && (
                    <TableCell
                      rowSpan={rowsNeeded}
                      className="font-medium sticky left-0 z-10 bg-inherit border-r"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="font-bold text-sm">{medication.name}</p>
                        {medication.is_controlled_drug && (
                          <Badge variant="destructive" className="w-fit text-[10px]">
                            ⚠ CD
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Dose (only show on first row) */}
                  {timeIndex === 0 && (
                    <TableCell rowSpan={rowsNeeded} className="text-sm text-gray-600">
                      {medication.strength} {medication.strength_unit}
                    </TableCell>
                  )}

                  {/* Route (only show on first row) */}
                  {timeIndex === 0 && (
                    <TableCell rowSpan={rowsNeeded} className="text-sm text-gray-600">
                      {medication.route || "—"}
                    </TableCell>
                  )}

                  {/* Time for this specific row */}
                  <TableCell className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span>{time}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {medication.time_quantities?.[time] || 1}x
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Calendar cells for each day */}
                  {days.map((day) => {
                    const admin = getAdministrationForCell(medication.id, day, time);
                    const hasRecord = !!admin;
                    const status = admin?.status || "scheduled";

                    return (
                      <TableCell
                        key={day}
                        className={`text-center p-1 cursor-pointer hover:bg-blue-50 transition-colors ${
                          hasRecord ? getStatusBadgeStyle(status) : "bg-blue-50"
                        }`}
                        onClick={() => handleCellClick(medication, day, time)}
                      >
                        {hasRecord ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className="font-bold text-lg">
                              {getStatusSymbol(status)}
                            </span>
                            {admin.administered_by && (
                              <span className="text-[9px] text-gray-600 leading-none">
                                {admin.administered_by.name?.split(" ").map((n: string) => n[0]).join("")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-8 flex items-center justify-center text-gray-400 text-xs">
                            —
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ));
            })}
          </TableBody>
        </Table>
      </div>

      {/* Administration Key */}
      <div className="mt-4 border rounded-lg p-4 bg-gray-50">
        <h3 className="font-bold text-sm mb-3 uppercase text-gray-700">Administration Key</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-green-300 bg-green-100 flex items-center justify-center font-bold text-green-800">
              ✓
            </div>
            <span>Given</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-orange-300 bg-orange-100 flex items-center justify-center font-bold text-orange-800">
              R
            </div>
            <span>Refused</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-gray-300 bg-gray-100 flex items-center justify-center font-bold text-gray-800">
              O
            </div>
            <span>Omitted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-blue-300 bg-blue-100 flex items-center justify-center font-bold text-blue-800">
              N
            </div>
            <span>Not Required</span>
          </div>
        </div>
      </div>

      {/* Administration Modal */}
      {selectedCell && (
        <MedicationAdministrationModal
          isOpen={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          medication={selectedCell.medication}
          date={selectedCell.date}
          month={month}
          year={year}
          time={selectedCell.time}
          sheetId={sheetId}
          existingRecord={getAdministrationForCell(
            selectedCell.medication.id,
            selectedCell.date,
            selectedCell.time
          )}
          onSuccess={() => {
            onRefresh();
            setSelectedCell(null);
          }}
        />
      )}
    </>
  );
}
