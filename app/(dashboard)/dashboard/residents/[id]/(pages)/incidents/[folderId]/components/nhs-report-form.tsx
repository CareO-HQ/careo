"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
import { FileBarChart, Check, Download } from "lucide-react";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";

const nhsReportSchema = z.object({
  trustName: z.string().min(1, "Trust name is required"),
  additionalNotes: z.string().optional(),
});

type NHSReportFormData = z.infer<typeof nhsReportSchema>;

interface NHSReportFormProps {
  folderId: string;
  residentId: string;
  residentName: string;
  orgLogoUrl?: string;
  careHomeName?: string;
  onSaved?: () => void;
}

export function NHSReportForm({
  folderId,
  residentId,
  residentName,
  orgLogoUrl,
  careHomeName,
  onSaved,
}: NHSReportFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<NHSReportFormData>({
    resolver: zodResolver(nhsReportSchema),
    defaultValues: {
      trustName: "",
      additionalNotes: "",
    },
  });

  const onSubmit = async (data: NHSReportFormData) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("trust_incident_reports")
        .insert({
          folder_id: folderId,
          resident_id: residentId,
          trust_name: data.trustName,
          report_type: "nhs",
          report_data: {
            additionalNotes: data.additionalNotes,
            generatedAt: new Date().toISOString(),
            status: "submitted",
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("NHS report created successfully");
      form.reset();
      onSaved?.();
    } catch (error) {
      console.error("Error creating NHS report:", error);
      toast.error("Failed to create NHS report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const values = form.getValues();
      const [firstName, ...rest] = residentName.split(" ");
      const resident = {
        first_name: firstName || residentName,
        last_name: rest.join(" "),
      };

      await generateCareFilePDF({
        formName: "NHS Trust Report",
        data: values,
        resident,
        orgLogoUrl,
        careHomeName,
      });
    } catch (err) {
      console.error("Error generating NHS PDF:", err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileBarChart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">NHS Trust Report</h2>
            <p className="text-sm text-muted-foreground">
              Generate an official NHS trust incident report for regulatory compliance.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Resident Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-sm mb-2">Resident Information</h3>
            <div className="text-sm">
              <span className="text-gray-500">Resident:</span>
              <span className="ml-2 font-medium">{residentName || "N/A"}</span>
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

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPdf}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : (
                    <>
                      Create NHS Report
                      <Check className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
