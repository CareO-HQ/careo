"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";

interface EmarPdfExportProps {
  residentName: string;
  residentInfo: any;
  medications: any[];
  administrations: any[];
  month: number;
  year: number;
  daysInMonth: number;
  type: "medication" | "prn";
}

// Print styles similar to Kardex
const PRINT_STYLES = `
  @page { size: A4 landscape; margin: 0.5cm; }
  @media print {
    body { margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, sans-serif;
    font-size: 9px;
    color: black;
    margin: 0;
    padding: 0;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid black; padding: 2px 4px; font-size: 8px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .bg-gray-800 { background-color: #1f2937 !important; }
  .bg-gray-700 { background-color: #374151 !important; }
  .bg-gray-200 { background-color: #e5e7eb !important; }
  .bg-gray-100 { background-color: #f3f4f6 !important; }
  .bg-gray-50 { background-color: #f9fafb !important; }
  .bg-white { background-color: #ffffff !important; }
  .bg-green-100 { background-color: #dcfce7 !important; }
  .bg-orange-100 { background-color: #ffedd5 !important; }
  .bg-blue-100 { background-color: #dbeafe !important; }
  .text-white { color: #ffffff !important; }
  .text-red-700 { color: #b91c1c !important; }
  .text-gray-600 { color: #4b5563 !important; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .uppercase { text-transform: uppercase; }
  .border { border: 1px solid black !important; }
  .border-2 { border: 2px solid black !important; }
`;

export function EmarPdfExport({
  residentName,
  residentInfo,
  medications,
  administrations,
  month,
  year,
  daysInMonth,
  type,
}: EmarPdfExportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      alert("Please allow pop-ups for this site to print the MAR sheet.");
      return;
    }

    const title = `${type === "medication" ? "Medication" : "PRN"} MAR - ${residentName} - ${monthName}`;

    printWindow.document.write(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>` +
        `<title>${title}</title>` +
        `<style>${PRINT_STYLES}</style></head><body>${el.innerHTML}</body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const getAdministration = (medicationId: string, day: number, time?: string) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (type === "medication" && time) {
      return administrations.find(
        (a) => a.medication_id === medicationId && a.administration_date === dateStr && a.scheduled_time === time
      );
    } else {
      return administrations.filter(
        (a) => a.medication_id === medicationId && a.administration_date === dateStr
      );
    }
  };

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case "taken": return "T";
      case "refused": return "R";
      case "hospitalised": return "C";
      case "social_leave": return "D";
      case "refused_destroyed": return "E";
      case "not_required": return "NR";
      case "made_available": return "M";
      case "given": return "T"; // Backwards compatibility
      default: return "";
    }
  };

  return (
    <>
      {/* Hidden print content */}
      <div ref={printRef} className="hidden">
        {/* Header */}
        <div className="border-2 border-black" style={{ marginBottom: "8px" }}>
          <div className="bg-gray-800 text-white text-center" style={{ padding: "6px" }}>
            <h1 className="font-bold uppercase" style={{ fontSize: "12px", letterSpacing: "0.05em" }}>
              {type === "medication" ? "MEDICATION" : "PRN"} ADMINISTRATION RECORD (eMAR)
            </h1>
          </div>
          <div className="border-t border-black" style={{ padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <p style={{ fontSize: "9px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Resident Name</p>
              <p className="font-bold" style={{ fontSize: "11px" }}>{residentName}</p>
            </div>
            <div>
              <p style={{ fontSize: "9px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Month/Year</p>
              <p className="font-bold" style={{ fontSize: "11px" }}>{monthName}</p>
            </div>
            {residentInfo?.date_of_birth && (
              <div>
                <p style={{ fontSize: "9px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Date of Birth</p>
                <p className="font-medium" style={{ fontSize: "10px" }}>{format(new Date(residentInfo.date_of_birth), "dd/MM/yyyy")}</p>
              </div>
            )}
            {residentInfo?.room_number && (
              <div>
                <p style={{ fontSize: "9px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Room</p>
                <p className="font-medium" style={{ fontSize: "10px" }}>{residentInfo.room_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* Medication MAR Table */}
        {type === "medication" && (
          <table className="border border-black" style={{ fontSize: "7px" }}>
            <thead>
              <tr className="bg-gray-700">
                <th className="text-white font-bold text-left" style={{ padding: "3px 5px", minWidth: "120px" }}>Medication</th>
                <th className="text-white font-bold text-left" style={{ padding: "3px 5px", width: "60px" }}>Dose</th>
                <th className="text-white font-bold text-left" style={{ padding: "3px 5px", width: "50px" }}>Route</th>
                <th className="text-white font-bold text-left" style={{ padding: "3px 5px", width: "50px" }}>Time</th>
                {days.map((day) => (
                  <th key={day} className="text-white text-center font-bold" style={{ padding: "2px", width: "20px" }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medications.map((med, medIndex) => {
                const times = med.times || [];
                return times.map((time: string, timeIndex: number) => (
                  <tr key={`${med.id}-${time}`} className={medIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {timeIndex === 0 && (
                      <td rowSpan={times.length} className="border" style={{ padding: "3px 5px" }}>
                        <p className="font-bold" style={{ fontSize: "8px" }}>{med.name}</p>
                        {med.is_controlled_drug && <span className="border font-bold" style={{ padding: "0 3px", backgroundColor: "#fee2e2", color: "#b91c1c" }}>CD</span>}
                      </td>
                    )}
                    {timeIndex === 0 && (
                      <td rowSpan={times.length} className="border" style={{ padding: "3px 5px", color: "#4b5563" }}>
                        {med.strength} {med.strength_unit}
                      </td>
                    )}
                    {timeIndex === 0 && (
                      <td rowSpan={times.length} className="border" style={{ padding: "3px 5px", color: "#4b5563" }}>
                        {med.route || "—"}
                      </td>
                    )}
                    <td className="border font-medium" style={{ padding: "3px 5px" }}>{time}</td>
                    {days.map((day) => {
                      const admin = getAdministration(med.id, day, time);
                      const status = admin?.status || "";
                      const bgClass = admin
                        ? (status === "taken" || status === "given")
                          ? "bg-green-100"
                          : status === "refused" || status === "refused_destroyed"
                          ? "bg-red-100"
                          : status === "hospitalised"
                          ? "bg-blue-100"
                          : status === "social_leave"
                          ? "bg-orange-100"
                          : status === "not_required"
                          ? "bg-gray-100"
                          : status === "made_available"
                          ? "bg-purple-100"
                          : "bg-gray-100"
                        : "";
                      return (
                        <td key={day} className={`border text-center ${bgClass}`} style={{ padding: "2px", fontSize: "10px", fontWeight: "bold" }}>
                          {getStatusSymbol(status)}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}

        {/* PRN MAR Table */}
        {type === "prn" && (
          <table className="border border-black" style={{ fontSize: "7px" }}>
            <thead>
              <tr className="bg-gray-700">
                <th className="text-white font-bold text-left" style={{ padding: "3px 5px", minWidth: "140px" }}>Medication</th>
                <th className="text-white font-bold text-left" style={{ padding: "3px 5px", width: "100px" }}>Indication</th>
                <th className="text-white font-bold text-left" style={{ padding: "3px 5px", width: "80px" }}>Max Dose</th>
                {days.map((day) => (
                  <th key={day} className="text-white text-center font-bold" style={{ padding: "2px", width: "20px" }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medications.map((med, index) => (
                <tr key={med.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border" style={{ padding: "3px 5px" }}>
                    <p className="font-bold" style={{ fontSize: "8px" }}>{med.name}</p>
                    <p style={{ fontSize: "7px", color: "#4b5563" }}>
                      {med.strength} {med.strength_unit} — {med.dosage_form}
                    </p>
                    {med.is_controlled_drug && <span className="border font-bold" style={{ padding: "0 3px", backgroundColor: "#fee2e2", color: "#b91c1c" }}>CD</span>}
                  </td>
                  <td className="border" style={{ padding: "3px 5px", fontSize: "7px", color: "#4b5563" }}>
                    {med.instructions || "—"}
                  </td>
                  <td className="border" style={{ padding: "3px 5px", fontSize: "7px", color: "#4b5563" }}>
                    {med.frequency || "As required"}
                  </td>
                  {days.map((day) => {
                    const admins = getAdministration(med.id, day) as any[];
                    const count = admins.length;
                    return (
                      <td key={day} className={`border text-center ${count > 0 ? "bg-green-100" : ""}`} style={{ padding: "2px", fontSize: "9px", fontWeight: "bold" }}>
                        {count > 0 ? count : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Key */}
        <div className="border border-black" style={{ marginTop: "8px", padding: "6px" }}>
          <p className="font-bold uppercase" style={{ fontSize: "8px", marginBottom: "4px" }}>Administration Key</p>
          {type === "medication" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", fontSize: "7px" }}>
              <span>T = Taken</span>
              <span>R = Refused</span>
              <span>C = Hospitalised</span>
              <span>D = Social Leave</span>
              <span>E = Refused/Destroyed</span>
              <span>NR = Not Required</span>
              <span>M = Made Available</span>
            </div>
          )}
          {type === "prn" && (
            <p style={{ fontSize: "7px" }}>Number indicates how many doses were administered on that day.</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "8px", fontSize: "7px", color: "#9ca3af", textAlign: "center" }}>
          Generated {format(new Date(), "dd/MM/yyyy HH:mm")} — CareO Home Management System
        </div>
      </div>

      {/* Print button (visible in UI) */}
      <Button variant="outline" onClick={handlePrint} className="no-print">
        <Printer className="h-4 w-4 mr-2" />
        Print {type === "medication" ? "Medication" : "PRN"} MAR
      </Button>
    </>
  );
}
