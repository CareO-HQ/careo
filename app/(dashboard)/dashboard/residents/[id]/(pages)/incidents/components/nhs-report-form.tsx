"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileBarChart } from "lucide-react";

const nhsReportSchema = z.object({
  trustName: z.string().min(1, "Trust name is required"),
  additionalNotes: z.string().optional(),
});

type NHSReportFormData = z.infer<typeof nhsReportSchema>;

interface NHSReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  residentId: string;
  incident: any;
  user?: any;
  onReportCreated: (reportId: string) => void;
}

export function NHSReportForm({
  isOpen,
  onClose,
  incidentId,
  residentId,
  incident,
  user,
  onReportCreated
}: NHSReportFormProps) {
  const createTrustReport = useMutation(api.trustIncidentReports.create);
  
  const form = useForm<NHSReportFormData>({
    resolver: zodResolver(nhsReportSchema),
    defaultValues: {
      trustName: "",
      additionalNotes: "",
    },
  });

  const onSubmit = async (data: NHSReportFormData) => {
    try {
      const reportId = await createTrustReport({
        incidentId: incidentId as Id<"incidents">,
        residentId: residentId as Id<"residents">,
        trustName: data.trustName,
        reportType: "nhs",
        additionalNotes: data.additionalNotes,
        createdBy: user?.id || "",
        createdByName: user?.name || "Unknown",
        reportData: {
          incidentDate: incident?.date,
          incidentTime: incident?.time,
          incidentTypes: incident?.incidentTypes,
          incidentLevel: incident?.incidentLevel,
          generatedAt: new Date().toISOString()
        }
      });

      toast.success("NHS report created successfully");
      form.reset();
      onClose();
      onReportCreated(reportId);
    } catch (error) {
      console.error("Error creating NHS report:", error);
      toast.error("Failed to create NHS report");
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const getSeverityBadge = () => {
    if (!incident?.incidentLevel) return null;
    
    const level = incident.incidentLevel;
    let variant: "destructive" | "secondary" | "outline" = "outline";
    let color = "";

    if (level === "death" || level === "permanent_harm") {
      variant = "destructive";
      color = "Critical";
    } else if (level === "minor_injury") {
      variant = "secondary"; 
      color = "Moderate";
    } else {
      color = "Low";
    }

    return (
      <Badge variant={variant} className="text-xs">
        {color} Risk
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileBarChart className="w-5 h-5 text-blue-600" />
            </div>
            Create NHS Trust Report
          </DialogTitle>
          <DialogDescription>
            Generate an official NHS trust incident report for regulatory compliance.
          </DialogDescription>
        </DialogHeader>

        {/* Incident Summary */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-sm mb-2">Incident Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Date:</span>
              <span className="ml-2 font-medium">{incident?.date || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500">Time:</span>
              <span className="ml-2 font-medium">{incident?.time || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium">
                {incident?.incidentTypes?.join(", ") || "N/A"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500">Severity:</span>
              <span className="ml-2">{getSeverityBadge()}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="trustName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NHS Trust Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., NHS Foundation Trust, Healthcare NHS Trust"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information for the NHS report..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">NHS Reporting Requirements</p>
                  <p>
                    This report will be formatted according to NHS standards and will include
                    all required incident details, patient information, and clinical data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create NHS Report
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}