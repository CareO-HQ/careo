"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { UploadIcon, FileDownIcon, AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveResidentCountsByTeam,
  getCapacityWarningMessage,
  shouldWarnCapacity,
} from "@/lib/team-capacity";

interface BulkUploadResidentsProps {
  onSuccess?: () => void;
}

interface CSVRow {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  phone_number?: string;
  room_number: string;
  admission_date: string;
  nhs_health_number: string;
  team_name: string;
  dependency_mobility: string;
  dependency_eating: string;
  dependency_dressing: string;
  dependency_toileting: string;
  gp_name?: string;
  gp_address?: string;
  gp_phone?: string;
  care_manager_name?: string;
  care_manager_address?: string;
  care_manager_phone?: string;
  emergency_contact_1_name?: string;
  emergency_contact_1_phone?: string;
  emergency_contact_1_relationship?: string;
  emergency_contact_1_address?: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_2_relationship?: string;
  emergency_contact_2_address?: string;
  emergency_contact_3_name?: string;
  emergency_contact_3_phone?: string;
  emergency_contact_3_relationship?: string;
  emergency_contact_3_address?: string;
  health_conditions?: string;
  risks?: string;
  [key: string]: string | undefined;
}

interface UploadRow {
  index: number;
  data: CSVRow;
  status: "pending" | "success" | "error";
  error?: string;
  warning?: string;
}

export function BulkUploadResidents({ onSuccess }: BulkUploadResidentsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadRow[]>([]);
  const { supabase } = useSupabase();
  const { profile } = useProfile();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults([]);
    }
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const data: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = {} as CSVRow;
      // Improved simple CSV parser: split by comma but respect quotes
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let charIndex = 0; charIndex < lines[i].length; charIndex++) {
        const char = lines[i][charIndex];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      headers.forEach((header, index) => {
        let value = values[index] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        row[header] = value;
      });
      data.push(row);
    }
    return data;
  };

  const downloadSampleCSV = () => {
    const headers = [
      "first_name", "middle_name", "last_name", "date_of_birth", "phone_number", 
      "room_number", "admission_date", "nhs_health_number", "team_name",
      "dependency_mobility", "dependency_eating", "dependency_dressing", "dependency_toileting",
      "gp_name", "gp_address", "gp_phone",
      "care_manager_name", "care_manager_address", "care_manager_phone",
      "emergency_contact_1_name", "emergency_contact_1_phone", "emergency_contact_1_relationship", "emergency_contact_1_address",
      "emergency_contact_2_name", "emergency_contact_2_phone", "emergency_contact_2_relationship", "emergency_contact_2_address",
      "emergency_contact_3_name", "emergency_contact_3_phone", "emergency_contact_3_relationship", "emergency_contact_3_address",
      "health_conditions", "risks"
    ];
    const sampleRow = [
      "John", "William", "Doe", "1945-05-15", "0123456789", 
      "101", "2024-01-01", "NHS123456", "Unit A",
      "Prompt Needed", "Independent", "Independent", "Independent",
      "Dr. Smith", "123 GP Street", "0987654321",
      "Jane Wilson", "456 Care Road", "0112233445",
      "Mary Doe", "07788990011", "Spouse", "789 Family Ave",
      "Robert Doe", "07788990022", "Son", "789 Family Ave",
      "", "", "", "", // Empty third contact
      "Diabetes|Hypertension", "Fall risk:high|Choking risk:low"
    ];
    
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "residents_bulk_upload_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file || !profile?.active_organization_id || !profile?.active_care_home_id) {
      toast.error("File or organization context missing");
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error("No data found in CSV");
        return;
      }

      // 1. Fetch all teams for the care home to map names
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, bed_count")
        .eq("care_home_id", profile.active_care_home_id);

      if (teamsError) throw teamsError;

      const teamMap = new Map(teams?.map((t) => [t.name.toLowerCase(), t.id]));
      const teamBedCountMap = new Map(
        teams?.map((t) => [t.id, t.bed_count as number | null]) ?? []
      );
      const teamNameMap = new Map(teams?.map((t) => [t.id, t.name]) ?? []);
      const teamRunningCounts = await getActiveResidentCountsByTeam(
        supabase,
        profile.active_care_home_id
      );

      const uploadResults: UploadRow[] = rows.map((row, i) => ({
        index: i,
        data: row,
        status: "pending"
      }));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Validation
          const requiredFields = [
            "first_name", "last_name", "date_of_birth", "room_number", 
            "admission_date", "nhs_health_number", "team_name",
            "dependency_mobility", "dependency_eating", "dependency_dressing", "dependency_toileting"
          ];

          for (const field of requiredFields) {
            if (!row[field]) throw new Error(`Missing required field: ${field}`);
          }

          const teamId = teamMap.get(row.team_name.toLowerCase());
          if (!teamId) throw new Error(`Team '${row.team_name}' not found`);

          const bedCount = teamBedCountMap.get(teamId);
          const currentCount = teamRunningCounts.get(teamId) ?? 0;
          const projectedCount = currentCount + 1;
          let capacityWarning: string | undefined;

          if (shouldWarnCapacity(bedCount, projectedCount)) {
            capacityWarning = getCapacityWarningMessage(
              teamNameMap.get(teamId) ?? row.team_name,
              currentCount,
              bedCount,
              projectedCount
            );
          }

          // Prepare payload
          const residentPayload = {
            first_name: row.first_name,
            middle_name: row.middle_name || null,
            last_name: row.last_name,
            date_of_birth: row.date_of_birth,
            phone_number: row.phone_number || null,
            room_number: row.room_number,
            admission_date: row.admission_date,
            team_id: teamId,
            nhs_health_number: row.nhs_health_number,
            gp_name: row.gp_name || null,
            gp_address: row.gp_address || null,
            gp_phone: row.gp_phone || null,
            care_manager_name: row.care_manager_name || null,
            care_manager_address: row.care_manager_address || null,
            care_manager_phone: row.care_manager_phone || null,
            health_conditions: row.health_conditions ? row.health_conditions.split("|") : [],
            risks: row.risks ? row.risks.split("|").map((r: string) => {
              const [name, level] = r.split(":");
              return { risk: name.trim(), level: (level?.trim().toLowerCase() || "low") };
            }) : [],
            dependencies: {
              mobility: row.dependency_mobility,
              eating: row.dependency_eating,
              dressing: row.dependency_dressing,
              toileting: row.dependency_toileting,
            },
            organization_id: profile.active_organization_id,
            care_home_id: profile.active_care_home_id,
            created_by: profile.id,
          };

          // Insert resident
          const { data: newResident, error: insertError } = await supabase
            .from("residents")
            .insert(residentPayload)
            .select()
            .single();

          if (insertError) throw insertError;

          // 2. Insert emergency contacts (multiple)
          const contactsPayload: any[] = [];
          for (let contactIdx = 1; contactIdx <= 3; contactIdx++) {
            const name = row[`emergency_contact_${contactIdx}_name` as keyof CSVRow];
            const phone = row[`emergency_contact_${contactIdx}_phone` as keyof CSVRow];
            const relationship = row[`emergency_contact_${contactIdx}_relationship` as keyof CSVRow];
            const address = row[`emergency_contact_${contactIdx}_address` as keyof CSVRow];

            if (name && phone) {
              contactsPayload.push({
                resident_id: newResident.id,
                name,
                phone_number: phone,
                relationship: relationship || "Family",
                address: address || null,
                is_primary: contactIdx === 1, // Set the first one as primary by default
                organization_id: profile.active_organization_id,
              });
            }
          }

          if (contactsPayload.length > 0) {
            const { error: contactError } = await supabase
              .from("emergency_contacts")
              .insert(contactsPayload);

            if (contactError) console.error("Error inserting contacts:", contactError);
          }

          uploadResults[i].status = "success";
          if (capacityWarning) {
            uploadResults[i].warning = capacityWarning;
          }
          teamRunningCounts.set(teamId, projectedCount);
        } catch (err: any) {
          uploadResults[i].status = "error";
          uploadResults[i].error = err.message;
        }
      }

      setResults(uploadResults);
      const successCount = uploadResults.filter(r => r.status === "success").length;
      const errorCount = uploadResults.filter(r => r.status === "error").length;
      const warningCount = uploadResults.filter(r => r.warning).length;

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} residents`);
        window.dispatchEvent(new CustomEvent("residents-updated"));
      }
      if (warningCount > 0) {
        toast.warning(
          `${warningCount} row${warningCount === 1 ? "" : "s"} added at or over unit bed capacity`
        );
      }
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} rows`);
      }

      if (successCount > 0 && onSuccess) {
        // Optional: Close dialog on success
        // onSuccess(); 
      }

    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast.error("An error occurred during bulk upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="bg-muted/50 p-4 rounded-lg border border-dashed flex flex-col items-center justify-center gap-4">
        <UploadIcon className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Select CSV File</p>
          <p className="text-xs text-muted-foreground mt-1">Upload exactly formatted CSV for bulk resident addition</p>
        </div>
        <Input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          disabled={isUploading}
          className="max-w-[250px]"
        />
        <Button 
          variant="link" 
          size="sm" 
          onClick={downloadSampleCSV}
          className="flex items-center gap-2"
        >
          <FileDownIcon className="h-4 w-4" />
          Download Sample Template
        </Button>
      </div>

      <Button 
        onClick={handleUpload} 
        disabled={!file || isUploading} 
        className="w-full"
      >
        {isUploading ? "Uploading..." : "Start Bulk Upload"}
      </Button>

      {results.length > 0 && (
        <div className="mt-6 space-y-3 max-h-[300px] overflow-y-auto border rounded-md p-2">
          <p className="text-sm font-semibold sticky top-0 bg-background py-1">Results:</p>
          {results.map((res, i) => (
            <div key={i} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0 last:pb-0">
              {res.status === "success" ? (
                <CheckCircle2Icon className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              ) : res.status === "error" ? (
                <AlertCircleCircleIcon className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin mt-0.5 shrink-0" />
              )}
              <div className="flex-1 overflow-hidden">
                <p className={cn(
                  "font-medium",
                  res.status === "success" ? "text-green-700" : res.status === "error" ? "text-destructive" : ""
                )}>
                  Row {res.index + 1}: {res.data.first_name} {res.data.last_name}
                </p>
                {res.error && <p className="text-muted-foreground break-words">{res.error}</p>}
                {res.warning && (
                  <p className="text-amber-600 break-words">{res.warning}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Fixed typo in icon name
const AlertCircleCircleIcon = AlertCircleIcon;
