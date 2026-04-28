"use client";

import React, { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Plus, Printer } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { resolveStorageObjectUrl } from "@/lib/storage";
import { RefusedMedicationSchema, type RefusedMedicationFormValues } from "@/schemas/residents/medication/refusedMedicationSchema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RefusedMarSheetProps {
  residentId: string;
  residentName: string;
  organizationId: string;
  teamId?: string;
  userId: string;
  userName: string;
  resident?: any;
  careHomeName?: string;
}

export function RefusedMarSheet({
  residentId,
  residentName,
  organizationId,
  teamId,
  userId,
  userName,
  resident,
  careHomeName,
}: RefusedMarSheetProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [dateOpen, setDateOpen] = useState(false);

  const residentImageUrl = resolveStorageObjectUrl("careo-public", resident?.image_url);

  const form = useForm<RefusedMedicationFormValues>({
    resolver: zodResolver(RefusedMedicationSchema),
    defaultValues: {
      residentId,
      organizationId,
      teamId,
      userId,
      date: Date.now(),
      medicationId: "",
      dose: "",
      count: "",
      reasonForReturn: "",
      reasonForRefused: "",
      signature: userName,
    },
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medication_refusals")
        .select("*, medication:medication_id(name)")
        .eq("resident_id", residentId)
        .order("date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch records: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("id, name, strength, strength_unit")
        .eq("resident_id", residentId)
        .eq("status", "active");

      if (error) throw error;
      setMedications(data || []);
    } catch (error: any) {
      console.error("Error fetching medications:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchMedications();
  }, [residentId]);

  const onSubmit = (values: RefusedMedicationFormValues) => {
    startTransition(async () => {
      try {
        const { error } = await supabase.from("medication_refusals").insert({
          resident_id: values.residentId,
          medication_id: values.medicationId,
          date: format(new Date(values.date), "yyyy-MM-dd"),
          dose: values.dose,
          count: values.count,
          reason_for_return: values.reasonForReturn,
          reason_for_refused: values.reasonForRefused,
          signature: values.signature,
          organization_id: values.organizationId,
          team_id: values.teamId,
          created_by: values.userId,
        });

        if (error) throw error;

        toast.success("Record added successfully");
        setIsDialogOpen(false);
        form.reset({
          ...form.getValues(),
          medicationId: "",
          dose: "",
          count: "",
          reasonForReturn: "",
          reasonForRefused: "",
          signature: userName,
        });
        fetchRecords();
      } catch (error: any) {
        toast.error("Error: " + error.message);
      }
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  const getAllergies = () => {
    if (!resident?.allergies || resident.allergies.length === 0) return "None recorded";
    return resident.allergies.join(", ");
  };

  const handlePrintPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    doc.setFontSize(16);
    doc.text("REFUSED/RETURNED MEDICATION LOG", margin, 14);

    doc.setFontSize(10);
    doc.text(`Resident: ${residentName}`, margin, 22);
    doc.text(`DOB: ${formatDate(resident?.date_of_birth)}`, margin, 27);
    doc.text(`Care Home: ${careHomeName || "—"}`, margin, 32);

    const tableData = records.map((r) => [
      format(new Date(r.date), "dd/MM/yyyy"),
      r.medication?.name || "—",
      r.dose || "—",
      r.count || "—",
      r.reason_for_refused || "—",
      r.reason_for_return || "—",
      r.signature,
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Date", "Medication", "Dose", "Count", "Reason (Refused)", "Reason (Return)", "Signed"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8 },
    });

    doc.save(`Refused_Medication_${residentName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header same as other MAR */}
      <div className="bg-white border-2 border-black overflow-x-auto">
        <div className="border-b-2 border-black">
          <div className="bg-gray-700 text-white font-bold text-sm p-2 border-b-2 border-black">
            REFUSED / RETURNED MEDICATION LOG
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr] gap-0">
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

            <div className="border-r-2 border-black">
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">Name: </span>
                <span className="text-sm font-medium">{residentName}</span>
              </div>
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">DOB: </span>
                <span className="text-sm font-medium">{formatDate(resident?.date_of_birth)}</span>
              </div>
              <div className="p-2">
                <span className="font-bold text-xs uppercase text-gray-700">Allergies: </span>
                <span className="text-sm font-medium text-red-700">{getAllergies()}</span>
              </div>
            </div>

            <div>
              <div className="border-b border-black p-2">
                <span className="font-bold text-xs uppercase text-gray-700">Care Home: </span>
                <span className="text-sm font-medium">{careHomeName || "—"}</span>
              </div>
              <div className="p-2">
                <span className="font-bold text-xs uppercase text-gray-700">NHS Number: </span>
                <span className="text-sm font-medium">{resident?.nhs_number || "Not recorded"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Refusal / Return
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Refused / Returned Medication</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Read only info fields as requested: Name, DOB */}
                  <div className="space-y-2">
                    <FormLabel className="text-xs">Resident Name</FormLabel>
                    <Input value={residentName} disabled className="h-9 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <FormLabel className="text-xs">Date of Birth</FormLabel>
                    <Input value={formatDate(resident?.date_of_birth)} disabled className="h-9 text-xs" />
                  </div>

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Date</FormLabel>
                        <Popover open={dateOpen} onOpenChange={setDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-9 pl-3 text-left font-normal text-xs",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd/MM/yyyy")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(d) => {
                                if (d) {
                                  field.onChange(d.getTime());
                                  setDateOpen(false);
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medicationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Medication</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select medication" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {medications.map((med) => (
                              <SelectItem key={med.id} value={med.id} className="text-xs">
                                {med.name} ({med.strength} {med.strength_unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Dose</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="e.g. 1 tablet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Count</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="e.g. 28" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reasonForRefused"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs">Reason for refused</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="Why was it refused?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reasonForReturn"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs">Reason for return</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs" placeholder="Why is it being returned? (Optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs">Sign (Prefilled)</FormLabel>
                        <FormControl>
                          <Input className="h-9 text-xs bg-muted" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isPending} className="gap-2">
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Record
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintPDF} disabled={records.length === 0}>
          <Printer className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Records Table */}
      <div className="border-2 border-black bg-white overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-700 text-white font-bold">
              <th className="border border-black p-2 text-left">Date</th>
              <th className="border border-black p-2 text-left">Medication</th>
              <th className="border border-black p-2 text-left">Dose</th>
              <th className="border border-black p-2 text-left">Count</th>
              <th className="border border-black p-2 text-left">Reason (Refused)</th>
              <th className="border border-black p-2 text-left">Reason (Return)</th>
              <th className="border border-black p-2 text-left">Signed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-gray-500">Loading records...</p>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No refusal or return records found for this resident.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="border border-black p-2 whitespace-nowrap">
                    {format(new Date(record.date), "dd/MM/yyyy")}
                  </td>
                  <td className="border border-black p-2 font-medium">
                    {record.medication?.name || "Unknown Medication"}
                  </td>
                  <td className="border border-black p-2">
                    {record.dose}
                  </td>
                  <td className="border border-black p-2">
                    {record.count}
                  </td>
                  <td className="border border-black p-2">
                    {record.reason_for_refused}
                  </td>
                  <td className="border border-black p-2">
                    {record.reason_for_return || "—"}
                  </td>
                  <td className="border border-black p-2 italic">
                    {record.signature}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
