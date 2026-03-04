"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { specimenRecordSchema, SpecimenRecordFormData } from "@/schemas/residents/care-file/specimenRecordSchema";
import { Resident } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash, Edit, Check } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { toast } from "sonner";
import { useSpecimenRecords } from "@/hooks/use-specimen-records";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SpecimenRecordLogDialogProps {
    teamId: string;
    residentId: string;
    organizationId: string;
    userId: string;
    userName: string;
    resident: Resident;
    onClose?: () => void;
    initialData?: any;
    isEditMode?: boolean;
    isInline?: boolean;
    viewOnly?: boolean;
    refreshForms?: () => void;
    onSaveSuccess?: (data: any) => void;
    orgLogoUrl?: string;
    careHomeName?: string;
}

export default function SpecimenRecordLogDialog({
    teamId,
    residentId,
    organizationId,
    userId,
    userName,
    resident,
    onClose,
    initialData,
    isEditMode = false,
    isInline = false,
    viewOnly = false,
    refreshForms,
    onSaveSuccess,
    orgLogoUrl,
    careHomeName,
}: SpecimenRecordLogDialogProps) {
    const { supabase } = useSupabase();
    const [isSaving, startTransition] = useTransition();
    const { specimenRecords, isLoading: isRecordsLoading, refreshRecords, handleDeleteRecord } = useSpecimenRecords(residentId);

    const [obtainedDatePopoverOpen, setObtainedDatePopoverOpen] = useState(false);
    const [receivedDatePopoverOpen, setReceivedDatePopoverOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const defaultValues = {
        residentName: `${resident.first_name || ""} ${resident.last_name || ""}`.trim(),
        residentDateOfBirth: resident.date_of_birth ? new Date(resident.date_of_birth).getTime() : Date.now(),
        bedroomNumber: resident.room_number || "",
        dateTimeObtained: Date.now(),
        specimenType: "",
        specimenRequested: "",
        staffObtainingSignature: userName,
        dateResultsReceived: null,
        results: "",
        staffReceivingSignature: "",
        status: "active" as const
    };

    const form = useForm<SpecimenRecordFormData>({
        resolver: zodResolver(specimenRecordSchema) as any,
        defaultValues: defaultValues as any
    });

    const onSubmit = async (values: any) => {
        const formData = values as SpecimenRecordFormData;
        startTransition(async () => {
            try {
                const payload = {
                    resident_id: residentId,
                    organization_id: organizationId,
                    team_id: teamId || null,
                    created_by: userId,
                    date_time_obtained: new Date(values.dateTimeObtained).toISOString(),
                    specimen_type: values.specimenType,
                    specimen_requested: values.specimenRequested,
                    staff_obtaining_signature: values.staffObtainingSignature,
                    date_results_received: values.dateResultsReceived ? new Date(values.dateResultsReceived).toISOString() : null,
                    results: values.results,
                    staff_receiving_signature: values.staffReceivingSignature,
                };

                const { error } = await supabase
                    .from("specimen_records")
                    .insert(payload);

                if (error) throw error;

                toast.success("Specimen record added successfully");

                // Reset form but keep auto-filled fields
                form.reset({
                    ...defaultValues,
                    dateTimeObtained: Date.now(), // update to current time
                });

                refreshRecords();
                refreshForms?.();
                onSaveSuccess?.(payload);
            } catch (error) {
                console.error("Error saving specimen record:", error);
                toast.error("Failed to save specimen record");
            }
        });
    };

    const confirmDelete = async () => {
        if (recordToDelete) {
            await handleDeleteRecord(recordToDelete);
            setIsDeleteDialogOpen(false);
            setRecordToDelete(null);
        }
    };

    return (
        <div className="flex flex-col space-y-8">
            {!isInline && (
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Record of Specimens</DialogTitle>
                    <DialogDescription className="text-center font-semibold text-primary uppercase">
                        Specimen Record Log
                    </DialogDescription>
                </DialogHeader>
            )}

            {/* Resident Info Header - Non-editable display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/30">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Residents Name</p>
                    <p className="font-medium">{defaultValues.residentName}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Date of Birth</p>
                    <p className="font-medium">{format(new Date(defaultValues.residentDateOfBirth), "PPP")}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Bedroom Number</p>
                    <p className="font-medium">{defaultValues.bedroomNumber || "N/A"}</p>
                </div>
            </div>

            {/* Entry Form */}
            {!viewOnly && (
                <Card className="p-6 border-primary/20 bg-primary/5 max-w-3xl mx-auto w-full">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="space-y-6">
                                <div className="border-b pb-2 mb-4">
                                    <h3 className="text-sm font-bold uppercase text-primary">Obtaining Specimen</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="dateTimeObtained"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel required>Date and time obtained</FormLabel>
                                                <div className="flex gap-2">
                                                    <Popover open={obtainedDatePopoverOpen} onOpenChange={setObtainedDatePopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn("flex-grow pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                                >
                                                                    {field.value ? format(field.value, "PP") : <span>Pick a date</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={new Date(field.value)}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        const current = new Date(field.value);
                                                                        date.setHours(current.getHours(), current.getMinutes());
                                                                        field.onChange(date.getTime());
                                                                        setObtainedDatePopoverOpen(false);
                                                                    }
                                                                }}
                                                                disabled={(date) => date > new Date()}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormControl>
                                                        <Input
                                                            type="time"
                                                            className="w-[120px]"
                                                            value={format(field.value, "HH:mm")}
                                                            onChange={(e) => {
                                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                                const newDate = new Date(field.value);
                                                                newDate.setHours(hours, minutes);
                                                                field.onChange(newDate.getTime());
                                                            }}
                                                        />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="specimenType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Type of specimen</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g. Urine, Stool" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="specimenRequested"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Specimen requested</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g. MCS" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="staffObtainingSignature"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel required>Signature of staff obtaining</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="border-b pb-2 mb-4">
                                    <h3 className="text-sm font-bold uppercase text-primary">Results Information</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="dateResultsReceived"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Date and time results received</FormLabel>
                                                <div className="flex gap-2">
                                                    <Popover open={receivedDatePopoverOpen} onOpenChange={setReceivedDatePopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn("flex-grow pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                                >
                                                                    {field.value ? format(field.value, "PP") : <span>Pick a date</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value ? new Date(field.value) : undefined}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        const current = field.value ? new Date(field.value) : new Date();
                                                                        date.setHours(current.getHours(), current.getMinutes());
                                                                        field.onChange(date.getTime());
                                                                    } else {
                                                                        field.onChange(null);
                                                                    }
                                                                    setReceivedDatePopoverOpen(false);
                                                                }}
                                                                disabled={(date) => date > new Date()}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormControl>
                                                        <Input
                                                            type="time"
                                                            className="w-[120px]"
                                                            disabled={!field.value}
                                                            value={field.value ? format(field.value, "HH:mm") : "00:00"}
                                                            onChange={(e) => {
                                                                if (!field.value) return;
                                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                                const newDate = new Date(field.value);
                                                                newDate.setHours(hours, minutes);
                                                                field.onChange(newDate.getTime());
                                                            }}
                                                        />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="results"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Results</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="staffReceivingSignature"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Signature of staff receiving</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button type="submit" disabled={isSaving} size="lg" className="w-full md:w-auto px-8">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Add Specimen Record
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Card>
            )}

            {/* Historical Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Specimen Records Log</h3>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateCareFilePDF({
                                formName: "Specimen Record Log",
                                data: specimenRecords,
                                resident: resident,
                                orgLogoUrl: orgLogoUrl,
                                careHomeName: careHomeName
                            })}
                            disabled={specimenRecords.length === 0}
                        >
                            Generate PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => refreshRecords()} disabled={isRecordsLoading}>
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[180px]">Date/Time Obtained</TableHead>
                                <TableHead>Type of specimen</TableHead>
                                <TableHead>Specimen requested</TableHead>
                                <TableHead>Obtained By</TableHead>
                                <TableHead>Results Date</TableHead>
                                <TableHead>Results</TableHead>
                                <TableHead>Received By</TableHead>
                                {!viewOnly && <TableHead className="w-[50px]"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isRecordsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        Loading records...
                                    </TableCell>
                                </TableRow>
                            ) : specimenRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No specimen records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                specimenRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(record.date_time_obtained), "dd/MM/yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell>{record.specimen_type}</TableCell>
                                        <TableCell>{record.specimen_requested}</TableCell>
                                        <TableCell>{record.staff_obtaining_signature}</TableCell>
                                        <TableCell>
                                            {record.date_results_received ? format(new Date(record.date_results_received), "dd/MM/yyyy HH:mm") : "-"}
                                        </TableCell>
                                        <TableCell>{record.results || "-"}</TableCell>
                                        <TableCell>{record.staff_receiving_signature || "-"}</TableCell>
                                        {!viewOnly && (
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        setRecordToDelete(record.id);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this specimen record
                            from the database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Record
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Add simple Card component if not already available in UI
function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}>
            {children}
        </div>
    );
}
