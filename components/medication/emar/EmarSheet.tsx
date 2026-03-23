"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { MedicationMarSheet } from "./MedicationMarSheet";
import { PrnMarSheet } from "./PrnMarSheet";
import { EmarPdfExport } from "./EmarPdfExport";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EmarSheetProps {
  residentId: string;
  residentName: string;
  organizationId: string;
  careHomeId: string;
}

export function EmarSheet({
  residentId,
  residentName,
  organizationId,
  careHomeId,
}: EmarSheetProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"medication" | "prn">("medication");
  const [isLoading, setIsLoading] = useState(false);

  // MAR sheet data
  const [medicationSheet, setMedicationSheet] = useState<any>(null);
  const [prnSheet, setPrnSheet] = useState<any>(null);

  // Medications
  const [scheduledMedications, setScheduledMedications] = useState<any[]>([]);
  const [prnMedications, setPrnMedications] = useState<any[]>([]);

  // Administration records
  const [medicationAdministrations, setMedicationAdministrations] = useState<any[]>([]);
  const [prnAdministrations, setPrnAdministrations] = useState<any[]>([]);

  // Resident data
  const [resident, setResident] = useState<any>(null);

  const monthYear = format(selectedMonth, "MMMM yyyy");
  const currentMonth = selectedMonth.getMonth() + 1;
  const currentYear = selectedMonth.getFullYear();
  const daysInMonth = getDaysInMonth(selectedMonth);

  // Fetch or create MAR sheets for the selected month
  const fetchOrCreateMarSheets = async () => {
    setIsLoading(true);
    try {
      // Fetch resident data
      const { data: residentData } = await supabase
        .from('residents')
        .select('*')
        .eq('id', residentId)
        .single();

      if (residentData) {
        setResident(residentData);
      }

      // Fetch or create medication MAR sheet
      const { data: medSheetData, error: medSheetError } = await supabase
        .rpc('get_or_create_emar_sheet', {
          p_resident_id: residentId,
          p_type: 'medication',
          p_organization_id: organizationId,
          p_care_home_id: careHomeId,
        });

      if (medSheetError) throw medSheetError;

      // Fetch or create PRN MAR sheet
      const { data: prnSheetData, error: prnSheetError } = await supabase
        .rpc('get_or_create_emar_sheet', {
          p_resident_id: residentId,
          p_type: 'prn',
          p_organization_id: organizationId,
          p_care_home_id: careHomeId,
        });

      if (prnSheetError) throw prnSheetError;

      // Fetch sheet details
      const { data: medSheet } = await supabase
        .from('emar_sheets')
        .select('*')
        .eq('id', medSheetData)
        .single();

      const { data: prnSheet } = await supabase
        .from('emar_sheets')
        .select('*')
        .eq('id', prnSheetData)
        .single();

      setMedicationSheet(medSheet);
      setPrnSheet(prnSheet);

      // Fetch medications
      await fetchMedications();

      // Fetch administration records
      await fetchAdministrations(medSheetData, prnSheetData);

    } catch (error) {
      console.error('Error fetching/creating MAR sheets:', error);
      toast.error('Failed to load MAR sheets');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch medications for the resident
  const fetchMedications = async () => {
    try {
      const { data: medications } = await supabase
        .from('medications')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'active');

      if (medications) {
        // Filter scheduled medications (exclude PRN)
        const scheduled = medications.filter(
          (med: any) => med.schedule_type !== 'PRN (As Needed)' && med.times && med.times.length > 0
        );

        // Filter PRN medications
        const prn = medications.filter(
          (med: any) => med.schedule_type === 'PRN (As Needed)'
        );

        setScheduledMedications(scheduled);
        setPrnMedications(prn);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  // Fetch administration records for the month
  const fetchAdministrations = async (medSheetId: string, prnSheetId: string) => {
    try {
      // Fetch medication administrations
      const { data: medAdmins } = await supabase
        .from('emar_administrations')
        .select('*, medication:medication_id(*), administered_by:administered_by(name), witness:witness_id(name)')
        .eq('emar_sheet_id', medSheetId);

      // Fetch PRN administrations
      const { data: prnAdmins } = await supabase
        .from('emar_administrations')
        .select('*, medication:medication_id(*), administered_by:administered_by(name), witness:witness_id(name)')
        .eq('emar_sheet_id', prnSheetId);

      setMedicationAdministrations(medAdmins || []);
      setPrnAdministrations(prnAdmins || []);
    } catch (error) {
      console.error('Error fetching administrations:', error);
    }
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  // Go to current month
  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Check if viewing current month
  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth.getMonth() === now.getMonth() && selectedMonth.getFullYear() === now.getFullYear();
  };

  // Check if viewing a future month
  const isFutureMonth = () => {
    const now = new Date();
    return selectedMonth > now;
  };


  useEffect(() => {
    if (residentId && organizationId && careHomeId) {
      fetchOrCreateMarSheets();
    }
  }, [residentId, organizationId, careHomeId, selectedMonth]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-[200px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{monthYear}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isCurrentMonth() && (
            <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
              Today
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {resident && activeTab === "medication" && medicationSheet && (
            <EmarPdfExport
              residentName={residentName}
              residentInfo={resident}
              medications={scheduledMedications}
              administrations={medicationAdministrations}
              month={currentMonth}
              year={currentYear}
              daysInMonth={daysInMonth}
              type="medication"
            />
          )}
          {resident && activeTab === "prn" && prnSheet && (
            <EmarPdfExport
              residentName={residentName}
              residentInfo={resident}
              medications={prnMedications}
              administrations={prnAdministrations}
              month={currentMonth}
              year={currentYear}
              daysInMonth={daysInMonth}
              type="prn"
            />
          )}
        </div>
      </div>

      {/* Status message for archived/future months */}
      {!isCurrentMonth() && (
        <div className={`p-3 rounded-lg ${isFutureMonth() ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
          <p className={`text-sm font-medium ${isFutureMonth() ? 'text-blue-800' : 'text-amber-800'}`}>
            {isFutureMonth()
              ? `Viewing future month: ${monthYear}. No data available yet.`
              : `Viewing archived month: ${monthYear}. This MAR sheet is read-only.`
            }
          </p>
        </div>
      )}

      {/* Tabs for Medication MAR and PRN MAR */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "medication" | "prn")}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="medication">
            Medication MAR
            {scheduledMedications.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                {scheduledMedications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="prn">
            PRN MAR
            {prnMedications.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                {prnMedications.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="medication" className="mt-4">
          <MedicationMarSheet
            residentId={residentId}
            residentName={residentName}
            sheetId={medicationSheet?.id}
            medications={scheduledMedications}
            administrations={medicationAdministrations}
            month={currentMonth}
            year={currentYear}
            daysInMonth={daysInMonth}
            isReadOnly={!isCurrentMonth()}
            onRefresh={fetchOrCreateMarSheets}
          />
        </TabsContent>

        <TabsContent value="prn" className="mt-4">
          <PrnMarSheet
            residentId={residentId}
            residentName={residentName}
            sheetId={prnSheet?.id}
            medications={prnMedications}
            administrations={prnAdministrations}
            month={currentMonth}
            year={currentYear}
            daysInMonth={daysInMonth}
            isReadOnly={!isCurrentMonth()}
            onRefresh={fetchOrCreateMarSheets}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
