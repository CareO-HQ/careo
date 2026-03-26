"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { painAssessmentV2Schema, PainAssessmentV2, BodyMapMarker } from "@/schemas/residents/care-file/painAssessmentV2Schema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState, useTransition, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { submitAssessmentWithVersioning } from "@/lib/form-submission";
import { InteractiveBodyMap } from "@/components/body-map/InteractiveBodyMap";
import { BodyRegion, BodyMapEntry } from "@/types/body-map";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const VIEW_DIV = "w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground opacity-90 whitespace-pre-wrap break-words min-h-10 flex items-center";

interface PainAssessmentV2DialogProps {
  teamId: string;
  residentId: string;
  organizationId: string;
  userId: string;
  userName: string;
  resident: Resident;
  careHomeName?: string;
  onClose?: () => void;
  initialData?: any;
  isEditMode?: boolean;
  isInline?: boolean;
  viewOnly?: boolean;
}

export default function PainAssessmentV2Dialog({
  teamId, residentId, organizationId, userId, userName, resident,
  careHomeName = "", onClose, initialData, isEditMode = false, isInline = false, viewOnly = false
}: PainAssessmentV2DialogProps) {
  const [isLoading, startTransition] = useTransition();

  const data = initialData as any;
  const entries = data?.assessment_entries || {};
  
  const defaultValues: PainAssessmentV2 = {
    residentId: data?.resident_id || residentId,
    teamId: data?.team_id || teamId,
    organizationId: data?.organization_id || organizationId,
    userId: data?.user_id || userId,
    residentName: entries.residentName || data?.residentName || `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
    dateOfBirth: entries.dateOfBirth || data?.dateOfBirth || (resident.date_of_birth ? format(new Date(resident.date_of_birth), "dd/MM/yyyy") : ""),
    roomNumber: entries.roomNumber || data?.roomNumber || resident.room_number || "",
    nameOfHome: entries.nameOfHome || data?.nameOfHome || careHomeName || "",
    assessmentDate: data?.assessment_date ? new Date(data.assessment_date).getTime() : (entries.assessmentDate || Date.now()),
    bodyMapMarkers: entries.bodyMapMarkers || data?.body_map_markers || [],
    descriptionOfPain: entries.descriptionOfPain || data?.description_of_pain || "",
    relievePain: entries.relievePain || data?.relieve_pain || "",
    worsePain: entries.worsePain || data?.worse_pain || "",
    completedBy: data?.completed_by || entries.completedBy || userName,
    role: entries.role || data?.role || "",
    signature: entries.signature || data?.signature || "",
    time: entries.time || data?.time || format(new Date(), "HH:mm"),
    savedAsDraft: data?.savedAsDraft || entries.savedAsDraft || false
  };

  const form = useForm<PainAssessmentV2>({
    resolver: zodResolver(painAssessmentV2Schema) as any,
    mode: "onChange",
    defaultValues
  });

  const bodyMapMarkers = form.watch("bodyMapMarkers");

  // Map markers to BodyMapEntry for the InteractiveBodyMap component
  const bodyMapEntries: BodyMapEntry[] = bodyMapMarkers.map(m => ({
    id: m.id,
    region_id: m.region_id,
    region_name: m.region_name,
    condition_type: "pain",
    severity: 5,
    notes: m.notes,
    date_time: new Date().toISOString(),
    status: "active"
  }));

  const [editingMarker, setEditingMarker] = useState<BodyMapMarker | null>(null);
  const [tempNote, setTempNote] = useState("");

  const handleRegionClick = (region: BodyRegion) => {
    if (viewOnly) return;

    const existingMarker = bodyMapMarkers.find(m => m.region_id === region.region_id);
    
    if (existingMarker) {
      // Open dialog to edit notes for existing marker
      setEditingMarker(existingMarker);
      setTempNote(existingMarker.notes || "");
    } else {
      // Add new marker and open dialog
      const label = String.fromCharCode(65 + bodyMapMarkers.length); // A, B, C...
      const newMarker: BodyMapMarker = {
        id: crypto.randomUUID(),
        region_id: region.region_id,
        region_name: region.region_name,
        label,
        notes: ""
      };
      
      const newMarkers = [...bodyMapMarkers, newMarker];
      form.setValue("bodyMapMarkers", newMarkers);
      setEditingMarker(newMarker);
      setTempNote("");
    }
  };

  const saveMarkerNote = () => {
    if (!editingMarker) return;

    const newMarkers = bodyMapMarkers.map(m => 
      m.id === editingMarker.id ? { ...m, notes: tempNote } : m
    );

    form.setValue("bodyMapMarkers", newMarkers);
    
    // Update description automatically - line by line
    const description = newMarkers
      .map(m => `(${m.label}) ${m.region_name}${m.notes ? `: ${m.notes}` : ""}`)
      .join("\n");
      
    form.setValue("descriptionOfPain", description);
    setEditingMarker(null);
  };

  const removeMarker = (id: string) => {
    const newMarkers = bodyMapMarkers.filter(m => m.id !== id)
      .map((m, i) => ({ ...m, label: String.fromCharCode(65 + i) })); // Re-label
    
    form.setValue("bodyMapMarkers", newMarkers);
    
    const description = newMarkers
      .map(m => `(${m.label}) ${m.region_name}${m.notes ? `: ${m.notes}` : ""}`)
      .join("\n");
    form.setValue("descriptionOfPain", description);
    setEditingMarker(null);
  };

  function onSubmit(values: PainAssessmentV2) {
    startTransition(async () => {
      try {
        const payload = {
          resident_id: residentId,
          organization_id: organizationId,
          assessment_date: new Date(values.assessmentDate).toISOString().split('T')[0],
          assessment_entries: values, // Store everything in the JSONB column
          completed_by: values.completedBy,
          created_by: userId
        };

        await submitAssessmentWithVersioning(
          'pain_assessments',
          payload,
          initialData,
          isEditMode
        );

        toast.success(isEditMode ? "Pain assessment updated!" : "Pain assessment submitted");
        setTimeout(() => onClose?.(), 500);
      } catch (error) {
        console.error("Error submitting:", error);
        toast.error("Failed to submit assessment.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
          <button type="submit" id="care-file-submit-btn" className="hidden" />

          {/* Header Record */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-slate-100 p-2 border-b grid grid-cols-3 gap-0">
              <div className="border-r px-2 font-bold text-xs uppercase">Residents name</div>
              <div className="border-r px-2 font-bold text-xs uppercase">Bedroom number</div>
              <div className="px-2 font-bold text-xs uppercase">Date of birth</div>
            </div>
            <div className="grid grid-cols-3 gap-0">
              <div className="border-r p-2 text-sm min-h-[3rem] flex items-center">{form.getValues("residentName")}</div>
              <div className="border-r p-2 text-sm min-h-[3rem] flex items-center">{form.getValues("roomNumber")}</div>
              <div className="p-2 text-sm min-h-[3rem] flex items-center">{form.getValues("dateOfBirth")}</div>
            </div>
          </div>

          {/* Body Map Section */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Pain Assessment Record</h3>
            <div className="w-full max-w-4xl">
              <InteractiveBodyMap 
                entries={bodyMapEntries}
                onRegionClick={handleRegionClick}
                viewMode={viewOnly}
              />
            </div>
          </div>

          {/* Assessment Fields */}
          <div className="space-y-0 border rounded-md">
            <div className="grid grid-cols-[200px_1fr] border-b">
              <div className="bg-slate-50 p-3 border-r font-bold text-sm flex items-center">Residents description of their pain</div>
              <div className="p-0">
                <FormField
                  control={form.control as any}
                  name="descriptionOfPain"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormControl>
                        {viewOnly ? (
                          <div className={cn(VIEW_DIV, "border-none bg-transparent min-h-[80px] rounded-none px-4")}>{field.value || " "}</div>
                        ) : (
                          <Textarea {...field} className="border-none rounded-none focus-visible:ring-0 min-h-[80px]" />
                        )}
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-[200px_1fr] border-b">
              <div className="bg-slate-50 p-3 border-r font-bold text-sm flex items-center">What will relieve the pain?</div>
              <div className="p-0">
                <FormField
                  control={form.control as any}
                  name="relievePain"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormControl>
                        {viewOnly ? (
                          <div className={cn(VIEW_DIV, "border-none bg-transparent min-h-[80px] rounded-none px-4")}>{field.value || " "}</div>
                        ) : (
                          <Textarea {...field} className="border-none rounded-none focus-visible:ring-0 min-h-[80px]" />
                        )}
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-[200px_1fr]">
              <div className="bg-slate-50 p-3 border-r font-bold text-sm flex items-center">What will make the pain worse?</div>
              <div className="p-0">
                <FormField
                  control={form.control as any}
                  name="worsePain"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormControl>
                        {viewOnly ? (
                          <div className={cn(VIEW_DIV, "border-none bg-transparent min-h-[80px] rounded-none px-4")}>{field.value || " "}</div>
                        ) : (
                          <Textarea {...field} className="border-none rounded-none focus-visible:ring-0 min-h-[80px]" />
                        )}
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="space-y-4 border rounded-md p-4 bg-muted/20">
              <FormField
                control={form.control as any}
                name="completedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold">Name of person completing the assessment</FormLabel>
                    <FormControl>
                      {viewOnly ? (
                        <div className={VIEW_DIV}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="signature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold">Signature</FormLabel>
                    <FormControl>
                      {viewOnly ? (
                        <div className={cn(VIEW_DIV, "font-signature italic text-lg text-primary")}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} placeholder="Electronic Signature" className="font-signature italic text-lg text-primary" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-4 border rounded-md p-4 bg-muted/20">
              <FormField
                control={form.control as any}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold">Job role</FormLabel>
                    <FormControl>
                      {viewOnly ? (
                        <div className={VIEW_DIV}>{field.value || " "}</div>
                      ) : (
                        <Input {...field} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel className="text-xs uppercase font-bold">Date</FormLabel>
                  <div className={VIEW_DIV}>
                    {format(form.getValues("assessmentDate"), "dd/MM/yyyy")}
                  </div>
                </FormItem>
                <FormField
                  control={form.control as any}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold">Time</FormLabel>
                      <FormControl>
                        {viewOnly ? (
                          <div className={VIEW_DIV}>{field.value || " "}</div>
                        ) : (
                          <Input type="time" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Region Note Dialog Overlay */}
      <Dialog open={!!editingMarker} onOpenChange={(open) => !open && setEditingMarker(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Pain Description</DialogTitle>
            <DialogDescription>
              Enter details for the selected region: <strong>{editingMarker?.region_name}</strong> ({editingMarker?.label})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="E.g., Sharp pain when moving, dull ache, etc."
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => editingMarker && removeMarker(editingMarker.id)}
            >
              Remove Marker
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingMarker(null)}>Cancel</Button>
              <Button onClick={saveMarkerNote}>Save Description</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
