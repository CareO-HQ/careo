"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PrnAdministrationModal } from "./PrnAdministrationModal";

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
}: PrnMarSheetProps) {
  const [selectedCell, setSelectedCell] = useState<{
    medication: any;
    date: number;
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

  // Handle cell click
  const handleCellClick = (medication: any, day: number) => {
    if (isReadOnly) return;
    setSelectedCell({ medication, date: day });
  };

  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center border rounded-lg bg-muted/30">
        <p className="text-sm font-medium text-muted-foreground">No PRN medications</p>
        <p className="text-xs text-muted-foreground">
          PRN (as-required) medications will appear here once added to the resident&apos;s medication list.
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
              <TableHead className="text-white font-bold min-w-[150px]">Indication</TableHead>
              <TableHead className="text-white font-bold min-w-[120px]">Max Daily Dose</TableHead>
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
            {medications.map((medication, index) => (
              <TableRow
                key={medication.id}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {/* Medication name and details */}
                <TableCell className="font-medium sticky left-0 z-10 bg-inherit border-r">
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-sm">{medication.name}</p>
                    <p className="text-xs text-gray-600">
                      {medication.strength} {medication.strength_unit} — {medication.dosage_form}
                    </p>
                    {medication.route && (
                      <p className="text-xs text-gray-500">Route: {medication.route}</p>
                    )}
                    {medication.is_controlled_drug && (
                      <Badge variant="destructive" className="w-fit text-[10px]">
                        ⚠ CD
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Indication */}
                <TableCell className="text-sm text-gray-600">
                  {medication.instructions || "—"}
                </TableCell>

                {/* Max Daily Dose */}
                <TableCell className="text-sm text-gray-600">
                  {medication.frequency || "As required"}
                </TableCell>

                {/* Calendar cells for each day */}
                {days.map((day) => {
                  const admins = getAdministrationsForCell(medication.id, day);
                  const adminCount = admins.length;

                  return (
                    <TableCell
                      key={day}
                      className={`text-center p-1 cursor-pointer hover:bg-green-50 transition-colors ${
                        adminCount > 0 ? "bg-green-50 border-green-200" : "bg-blue-50"
                      }`}
                      onClick={() => handleCellClick(medication, day)}
                    >
                      {adminCount > 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="font-bold text-lg text-green-700">
                            {adminCount}
                          </span>
                          <span className="text-[9px] text-gray-600 leading-none">
                            {adminCount === 1 ? "dose" : "doses"}
                          </span>
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Information box */}
      <div className="mt-4 border rounded-lg p-4 bg-blue-50 border-blue-200">
        <h3 className="font-bold text-sm mb-2 text-blue-900">PRN Administration Guide</h3>
        <p className="text-sm text-blue-800">
          Click on any calendar cell to record a PRN medication administration. The number indicates
          how many times the medication was given on that day. Each administration requires a reason,
          dose, and outcome to be recorded.
        </p>
      </div>

      {/* PRN Administration Modal */}
      {selectedCell && (
        <PrnAdministrationModal
          isOpen={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          medication={selectedCell.medication}
          date={selectedCell.date}
          month={month}
          year={year}
          sheetId={sheetId}
          existingRecords={getAdministrationsForCell(
            selectedCell.medication.id,
            selectedCell.date
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
