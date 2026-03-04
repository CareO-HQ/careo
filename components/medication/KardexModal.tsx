"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { FileText, Printer, X } from "lucide-react";
import { useState } from "react";

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface Medication {
  id: string;
  name: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  route: string;
  frequency: string;
  schedule_type: string;
  times: string[];
  time_quantities: Record<string, number> | null;
  instructions: string;
  prescriber_name: string;
  start_date: string;
  end_date: string | null;
  is_controlled_drug: boolean;
  status: string;
}

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  room_number?: string;
  nhs_health_number?: string;
  image_url?: string;
  updated_at?: string;
  gp_name?: string;
  gp_address?: string;
}

interface KardexModalProps {
  medications: Medication[];
  resident: Resident;
  inlineMode?: boolean;
}

const UK_TIMEZONE = "Europe/London";

// ΓöÇΓöÇΓöÇ Time Slots Configuration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const TIME_SLOTS: Record<string, string[]> = {
  Morning: ["08:00", "10:00", "12:00"],
  Afternoon: ["14:00", "18:00"],
  Evening: ["22:00", "00:00"],
};

// ΓöÇΓöÇΓöÇ Kardex Print View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function KardexPrintView({ medications, resident }: KardexModalProps) {
  const now = toZonedTime(new Date(), UK_TIMEZONE);
  const monthLabel = format(now, "MMMM yyyy");
  const timeSlotEntries = Object.entries(TIME_SLOTS);

  const activeMeds = medications.filter((m) => m.status === "active");

  // Filter by schedule_type or route for backwards compatibility
  const prn = activeMeds.filter((m) => m.schedule_type === "PRN (As Needed)");
  const topical = activeMeds.filter((m) =>
    m.schedule_type === "Topical" || m.route === "Topical"
  );
  const supplements = activeMeds.filter((m) =>
    m.schedule_type === "Supplement"
  );

  // Scheduled medications are those that don't fall into other categories and have times
  const scheduled = activeMeds.filter(
    (m) =>
      m.schedule_type !== "PRN (As Needed)" &&
      m.schedule_type !== "Topical" &&
      m.schedule_type !== "Supplement" &&
      m.route !== "Topical" &&
      m.times &&
      m.times.length > 0
  );

  return (
    <div className="kardex-print bg-white text-black font-sans text-[10px]" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div className="border-2 border-black mb-2">
        <div className="bg-gray-800 text-white text-center py-1.5">
          <h1 className="text-sm font-bold tracking-wide">MEDICATION ADMINISTRATION RECORD (MAR)</h1>
        </div>
        <div className="grid grid-cols-3 border-t border-black">
          <div className="p-2 border-r border-black flex items-center gap-2">
            {resident.image_url ? (
              <div className="flex-shrink-0 text-center">
                <img
                  src={resident.image_url}
                  alt={`${resident.first_name} ${resident.last_name}`}
                  className="w-20 h-20 rounded-full object-cover border border-gray-300"
                />
                <p className="text-[7px] text-gray-400 mt-0.5 leading-tight">
                  {resident.updated_at
                    ? format(new Date(resident.updated_at), "dd/MM/yyyy")
                    : "—"}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-[9px] text-gray-500 uppercase font-semibold">Resident Name</p>
              <p className="font-bold text-xs">{resident.first_name} {resident.last_name}</p>
            </div>
          </div>
          <div className="p-2 border-r border-black">
            <div className="grid grid-cols-2 gap-1">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">DOB</p>
                <p className="font-medium">
                  {resident.date_of_birth
                    ? format(new Date(resident.date_of_birth), "dd/MM/yyyy")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Room</p>
                <p className="font-medium">{resident.room_number || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">NHS No.</p>
                <p className="font-medium">{resident.nhs_health_number || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Month</p>
                <p className="font-bold">{monthLabel}</p>
              </div>
            </div>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">GP Name</p>
                <p className="font-medium">{resident.gp_name || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">Signature of GP</p>
                <div className="border-b border-black mt-4 w-full" />
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[9px] text-gray-500 uppercase font-semibold">Health Centre</p>
              <p className="font-medium">{resident.gp_address || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Medications */}
      {scheduled.length > 0 && (
        <div className="mb-3">
          <div className="bg-gray-700 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-1">
            Scheduled Medications
          </div>
          <table className="w-full border-collapse border border-black text-[8.5px]">
            <thead>

              {/* Period group headers */}
              <tr className="bg-gray-200">
                <th className="border border-black px-1 py-0.5 text-left w-[140px]" rowSpan={2}>Medication / Dose / Route</th>

                <th className="border border-black px-1 py-0.5 text-left w-[50px]" rowSpan={2}>Strength</th>
                <th className="border border-black px-1 py-0.5 text-left w-[45px]" rowSpan={2}>Route</th>
                <th className="border border-black px-1 py-0.5 text-left w-[70px]" rowSpan={2}>Prescriber</th>
                <th className="border border-black px-1 py-0.5 text-left w-[55px]" rowSpan={2}>Start ΓÇô End</th>
                {timeSlotEntries.map(([period, times]) => (
                  <th
                    key={period}
                    colSpan={times.length}
                    className="border border-black text-center px-1 py-0.5 font-bold"
                  >
                    {period}
                  </th>
                ))}

                <th colSpan={3} className="border border-black text-center px-1 py-0.5 font-bold">
                  Food
                </th>
              </tr>
              {/* Individual time slot headers */}
              <tr className="bg-gray-100">
                {timeSlotEntries.map(([period, times]) =>
                  times.map((time) => (
                    <th
                      key={`${period}-${time}`}
                      className="border border-black text-center px-0 py-0.5 font-medium"
                      style={{ minWidth: "22px", fontSize: "7.5px" }}
                    >
                      {time}
                    </th>
                  ))
                )}
                <th className="border border-black text-center px-0 py-0.5 font-medium" style={{ minWidth: "28px" }}>Before</th>

                <th className="border border-black text-center px-0 py-0.5 font-medium" style={{ minWidth: "28px" }}>With</th>
                <th className="border border-black text-center px-0 py-0.5 font-medium" style={{ minWidth: "28px" }}>After</th>
              </tr>
            </thead>
            <tbody>
              {scheduled.map((med, idx) => {
                const qty = (time: string) =>
                  med.time_quantities?.[time] ?? 1;
                return (
                  <tr key={med.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-black px-1 py-0.5 align-top">
                      <p className="font-bold leading-tight">{med.name}</p>
                      {med.is_controlled_drug && (
                        <p className="text-red-700 font-bold">§ CD</p>
                      )}
                    </td>
                    <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                      {med.strength}{med.strength_unit ? ` ${med.strength_unit}` : ""}
                    </td>
                    <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                      {med.route || "—"}
                    </td>
                    <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                      {med.prescriber_name || "—"}
                    </td>
                    <td className="border border-black px-1 py-0.5 align-top text-gray-600 leading-tight">
                      <div>{med.start_date ? format(new Date(med.start_date), "dd/MM/yy") : "—"}</div>
                      <div>{med.end_date ? format(new Date(med.end_date), "dd/MM/yy") : "Ongoing"}</div>
                    </td>
                    {timeSlotEntries.map(([period, times]) =>
                      times.map((time) => {
                        const isScheduled = med.times.includes(time);
                        return (
                          <td
                            key={`${period}-${time}`}
                            className={`border border-black text-center align-top ${
                              !isScheduled ? "bg-gray-100" : ""
                            }`}

                            style={{ minWidth: "22px", height: "32px" }}
                            title={isScheduled ? `${time} — ${qty(time)} tablet(s)` : "Not scheduled"}
                          >
                            {!isScheduled && (
                              <span className="text-gray-300 text-[7px]">—</span>
                            )}
                          </td>
                        );
                      })
                    )}
                    <td className="border border-black text-center align-top" style={{ minWidth: "28px", height: "32px" }} />
                    <td className="border border-black text-center align-top" style={{ minWidth: "28px", height: "32px" }} />
                    <td className="border border-black text-center align-top" style={{ minWidth: "28px", height: "32px" }} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PRN Medications */}
      {prn.length > 0 && (
        <div className="mb-3">
          <div className="bg-gray-700 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-1">
            PRN (As Required) Medications
          </div>
          <table className="w-full border-collapse border border-black text-[8.5px]">
            <thead>
              {/* Period group headers */}
              <tr className="bg-gray-200">
                <th className="border border-black px-1 py-0.5 text-left w-[140px]" rowSpan={2}>Medication / Dose / Route</th>
                <th className="border border-black px-1 py-0.5 text-left w-[80px]" rowSpan={2}>Indication / Instructions</th>
                <th className="border border-black px-1 py-0.5 text-left w-[60px]" rowSpan={2}>Max Dose / Interval</th>
                <th className="border border-black px-1 py-0.5 text-left w-[70px]" rowSpan={2}>Prescriber</th>
                {timeSlotEntries.map(([period, times]) => (
                  <th
                    key={period}
                    colSpan={times.length}
                    className="border border-black text-center px-1 py-0.5 font-bold"
                  >
                    {period}
                  </th>
                ))}
                <th colSpan={3} className="border border-black text-center px-1 py-0.5 font-bold">
                  Food
                </th>
              </tr>
              {/* Individual time slot headers */}
              <tr className="bg-gray-100">
                {timeSlotEntries.map(([period, times]) =>
                  times.map((time) => (
                    <th
                      key={`${period}-${time}`}
                      className="border border-black text-center px-0 py-0.5 font-medium"
                      style={{ minWidth: "22px", fontSize: "7.5px" }}
                    >
                      {time}
                    </th>
                  ))
                )}
                <th className="border border-black text-center px-0 py-0.5 font-medium" style={{ minWidth: "28px" }}>Before</th>
                <th className="border border-black text-center px-0 py-0.5 font-medium" style={{ minWidth: "28px" }}>With</th>
                <th className="border border-black text-center px-0 py-0.5 font-medium" style={{ minWidth: "28px" }}>After</th>
              </tr>
            </thead>
            <tbody>
              {prn.map((med, idx) => (
                <tr key={med.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-black px-1 py-0.5 align-top">
                    <p className="font-bold leading-tight">{med.name}</p>
                    <p className="text-gray-600">
                      {med.strength}{med.strength_unit ? ` ${med.strength_unit}` : ""}{" "}
                      {med.dosage_form}
                    </p>
                    {med.route && <p className="text-gray-500">Route: {med.route}</p>}
                    {med.is_controlled_drug && (
                      <p className="text-red-700 font-bold">§ CD</p>
                    )}
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                    {med.instructions || "—"}
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600 leading-tight">
                    <div>{med.frequency || "—"}</div>
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                    {med.prescriber_name || "—"}
                  </td>
                  {timeSlotEntries.map(([period, times]) =>
                    times.map((time) => (
                      <td
                        key={`${period}-${time}`}
                        className="border border-black text-center align-top"
                        style={{ minWidth: "22px", height: "32px" }}
                      />
                    ))
                  )}
                  <td className="border border-black text-center align-top" style={{ minWidth: "28px", height: "32px" }} />
                  <td className="border border-black text-center align-top" style={{ minWidth: "28px", height: "32px" }} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Topical Medications */}
      {topical.length > 0 && (
        <div className="mb-3">
          <div className="bg-blue-700 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-1">
            Topical Medications
          </div>
          <table className="w-full border-collapse border border-black text-[8.5px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-1 py-0.5 text-left w-[140px]" rowSpan={2}>Medication / Dose / Route</th>
                <th className="border border-black px-1 py-0.5 text-left w-[80px]" rowSpan={2}>Application Area / Instructions</th>
                <th className="border border-black px-1 py-0.5 text-left w-[60px]" rowSpan={2}>Frequency</th>
                <th className="border border-black px-1 py-0.5 text-left w-[70px]" rowSpan={2}>Prescriber</th>
                {timeSlotEntries.map(([period, times]) => (
                  <th
                    key={period}
                    colSpan={times.length}
                    className="border border-black text-center px-1 py-0.5 font-bold"
                  >
                    {period}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-100">
                {timeSlotEntries.map(([period, times]) =>
                  times.map((time) => (
                    <th
                      key={`${period}-${time}`}
                      className="border border-black text-center px-0 py-0.5 font-medium"
                      style={{ minWidth: "22px", fontSize: "7.5px" }}
                    >
                      {time}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {topical.map((med, idx) => (
                <tr key={med.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-black px-1 py-0.5 align-top">
                    <p className="font-bold leading-tight">{med.name}</p>
                    <p className="text-gray-600">
                      {med.strength}{med.strength_unit ? ` ${med.strength_unit}` : ""}{" "}
                      {med.dosage_form}
                    </p>
                    {med.route && <p className="text-gray-500">Route: {med.route}</p>}
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                    {med.instructions || "—"}
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600 leading-tight">
                    <div>{med.frequency || "—"}</div>
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                    {med.prescriber_name || "—"}
                  </td>
                  {timeSlotEntries.map(([period, times]) =>
                    times.map((time) => (
                      <td
                        key={`${period}-${time}`}
                        className="border border-black text-center align-top"
                        style={{ minWidth: "22px", height: "32px" }}
                      />
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplements */}
      {supplements.length > 0 && (
        <div className="mb-3">
          <div className="bg-green-700 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-1">
            Supplements
          </div>
          <table className="w-full border-collapse border border-black text-[8.5px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-1 py-0.5 text-left w-[140px]" rowSpan={2}>Supplement / Dose</th>
                <th className="border border-black px-1 py-0.5 text-left w-[80px]" rowSpan={2}>Instructions</th>
                <th className="border border-black px-1 py-0.5 text-left w-[60px]" rowSpan={2}>Frequency</th>
                <th className="border border-black px-1 py-0.5 text-left w-[70px]" rowSpan={2}>Prescriber</th>
                {timeSlotEntries.map(([period, times]) => (
                  <th
                    key={period}
                    colSpan={times.length}
                    className="border border-black text-center px-1 py-0.5 font-bold"
                  >
                    {period}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-100">
                {timeSlotEntries.map(([period, times]) =>
                  times.map((time) => (
                    <th
                      key={`${period}-${time}`}
                      className="border border-black text-center px-0 py-0.5 font-medium"
                      style={{ minWidth: "22px", fontSize: "7.5px" }}
                    >
                      {time}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {supplements.map((med, idx) => (
                <tr key={med.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-black px-1 py-0.5 align-top">
                    <p className="font-bold leading-tight">{med.name}</p>
                    <p className="text-gray-600">
                      {med.strength}{med.strength_unit ? ` ${med.strength_unit}` : ""}{" "}
                      {med.dosage_form}
                    </p>
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                    {med.instructions || "—"}
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600 leading-tight">
                    <div>{med.frequency || "—"}</div>
                  </td>
                  <td className="border border-black px-1 py-0.5 align-top text-gray-600">
                    {med.prescriber_name || "—"}
                  </td>
                  {timeSlotEntries.map(([period, times]) =>
                    times.map((time) => (
                      <td
                        key={`${period}-${time}`}
                        className="border border-black text-center align-top"
                        style={{ minWidth: "22px", height: "32px" }}
                      />
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Administration Key */}
      <div className="border border-black mt-2">
        <div className="bg-gray-700 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          Administration Key
        </div>
        <div className="p-2">
          <p className="font-bold mb-1 text-[9px] uppercase">Dosage Direction</p>
        </div>
      </div>

      {/* Staff Signatures */}
      <div className="border border-black mt-2">
        <div className="bg-gray-700 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          Staff Signatures
        </div>
        <div className="p-2">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border-b border-gray-400 h-6" />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-1 text-[8px] text-gray-400 text-center">
        Generated {format(now, "dd/MM/yyyy HH:mm")} — CareO Home Management
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Modal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export default function KardexModal({ medications, resident, inlineMode = false }: KardexModalProps) {
  const [open, setOpen] = useState(false);
  const activeMeds = medications.filter((m) => m.status === "active");

  // ΓöÇΓöÇ Inline mode: render directly in the tab ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (inlineMode) {
    return (
      <>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .kardex-content, .kardex-content * {
              visibility: visible !important;
            }
            .kardex-content {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              padding: 1cm !important;
              box-shadow: none !important;
              border: none !important;
              overflow: visible !important;
            }
            @page { margin: 1cm; size: A4 landscape; }
          }
        `}</style>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Medication Administration Record (MAR)</p>
              <p className="text-sm text-muted-foreground">
                {activeMeds.length} active medication{activeMeds.length !== 1 ? "s" : ""} — {new Date().toLocaleString("en-GB", { month: "long", year: "numeric" })}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print Kardex
            </Button>
          </div>

          {activeMeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No active medications</p>
              <p className="text-xs text-muted-foreground">Add active medications to generate a kardex.</p>
            </div>
          ) : (
            <div className="overflow-auto rounded border bg-white shadow-sm">
              <div className="p-4 kardex-content">
                <KardexPrintView medications={medications} resident={resident} />
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // ΓöÇΓöÇ Dialog mode (legacy, kept for reuse elsewhere) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="w-4 h-4 mr-2" />
        Generate Kardex
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">
                Medication Kardex — {resident.first_name} {resident.last_name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {activeMeds.length} active medication{activeMeds.length !== 1 ? "s" : ""}
                </span>
                <Button size="sm" onClick={() => window.print()} className="h-8">
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print
                </Button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </DialogHeader>

          {activeMeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No active medications</p>
              <p className="text-xs text-muted-foreground">
                There are no active medications to generate a kardex for.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <div className="bg-white shadow-sm rounded border p-4 kardex-content">
                <KardexPrintView medications={medications} resident={resident} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          /* Hide everything except Kardex */
          body * {
            visibility: hidden;
          }

          .kardex-content,
          .kardex-content * {
            visibility: visible !important;
          }

          /* Position Kardex for print */
          .kardex-content {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0.5cm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Hide print button and other UI elements */
          button {
            display: none !important;
          }

          /* Ensure tables print properly */
          .kardex-print table {
            page-break-inside: auto;
          }

          .kardex-print tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          .kardex-print thead {
            display: table-header-group;
          }

          /* Page setup */
          @page {
            margin: 0.5cm;
            size: A4 landscape;
          }

          /* Ensure black text prints */
          .kardex-print * {
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Preserve background colors for headers */
          .kardex-print .bg-gray-800,
          .kardex-print .bg-gray-700,
          .kardex-print .bg-blue-700,
          .kardex-print .bg-green-700,
          .kardex-print .bg-gray-200,
          .kardex-print .bg-gray-100 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
