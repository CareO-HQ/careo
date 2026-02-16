"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { BodyMapEntry, ConditionType } from "@/types/body-map";
import { format } from "date-fns";

import { FormDateTimePicker } from "@/components/ui/date-time-picker";

const BodyMapEntrySchema = z.object({
    condition_type: z.enum(["wound", "rash", "pain", "bruise", "surgical_site", "pressure_ulcer", "other"]),
    measurements: z.string().optional(),
    notes: z.string().optional(),
    date_time: z.string(),
});

interface BodyMapEntryFormProps {
    regionName: string;
    initialData?: BodyMapEntry;
    onSubmit: (data: z.infer<typeof BodyMapEntrySchema>) => void;
    onCancel: () => void;
    onDelete?: () => void;
    readOnly?: boolean;
}

export function BodyMapEntryForm({
    regionName,
    initialData,
    onSubmit,
    onCancel,
    onDelete,
    readOnly = false,
}: BodyMapEntryFormProps) {
    const form = useForm<z.infer<typeof BodyMapEntrySchema>>({
        resolver: zodResolver(BodyMapEntrySchema),
        defaultValues: {
            condition_type: initialData?.condition_type || "wound",
            measurements: initialData?.measurements || "",
            notes: initialData?.notes || "",
            date_time: initialData?.date_time || new Date().toISOString(),
        },
    });

    return (
        <div className="space-y-6 px-1 pb-6">
            <div>
                <h3 className="text-lg font-medium">Region: {regionName}</h3>
                <p className="text-sm text-muted-foreground">
                    Document medical conditions for this anatomical area.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* ... other fields ... */}
                    <FormField
                        control={form.control}
                        name="condition_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Observation Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={readOnly}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select condition type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="wound">Wound</SelectItem>
                                        <SelectItem value="rash">Rash</SelectItem>
                                        <SelectItem value="pain">Pain</SelectItem>
                                        <SelectItem value="bruise">Bruise</SelectItem>
                                        <SelectItem value="surgical_site">Surgical Site</SelectItem>
                                        <SelectItem value="pressure_ulcer">Pressure Ulcer</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />



                    <FormField
                        control={form.control}
                        name="measurements"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Measurements (e.g. 2cm x 3cm)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter dimensions" {...field} disabled={readOnly} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Additional details..." {...field} disabled={readOnly} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="date_time"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormDateTimePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    dateLabel="Observation Date"
                                    timeLabel="Observation Time"
                                    disabled={readOnly}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />



                    <div className="flex justify-between pt-4">
                        <div className="space-x-2">
                            {!readOnly && <Button type="submit">Save Entry</Button>}
                            <Button type="button" variant="outline" onClick={onCancel}>
                                {readOnly ? "Close" : "Cancel"}
                            </Button>
                        </div>
                        {!readOnly && onDelete && (
                            <Button type="button" variant="destructive" onClick={onDelete}>
                                Delete
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    );
}
