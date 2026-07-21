"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { FileIcon, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { buildStorageObjectUrl } from "@/lib/storage";

interface UploadFileModalProps {
  folderName: string;
  residentId: string;
  variant?: "text" | "button" | "icon" | "none";
  onUploaded?: () => void;
  defaultFileName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function UploadFileModal({
  folderName,
  residentId,
  variant = "text",
  onUploaded,
  defaultFileName = "",
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: UploadFileModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(defaultFileName);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activeTeamId: defaultActiveTeamId } = useActiveTeam();
  const { profile } = useProfile();
  const activeOrgId = profile?.active_organization_id;
  const userEmail = profile?.email;

  // Helper to read cookie in client components
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Resolve activeTeamId for MDT
  let activeTeamId = defaultActiveTeamId;
  if (profile?.role === "mdt") {
    const sessionCookie = getCookie("mdt_session_data");
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
        if (sessionData?.unitId) {
          activeTeamId = sessionData.unitId;
        }
      } catch (e) {
        console.error("Error parsing MDT session in UploadFileModal", e);
      }
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    // Remove .pdf extension for default name
    const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
    setFileName(nameWithoutExt);
  };

  const handleUpload = async () => {
    // Validate file and name
    if (!selectedFile) {
      toast.error("Please select a PDF file to upload");
      return;
    }

    if (!fileName.trim()) {
      toast.error("Please enter a name for the PDF file");
      return;
    }

    // Validate required context
    const missingInfo: string[] = [];
    if (!activeTeamId) missingInfo.push("Active Team");
    if (!activeOrgId) missingInfo.push("Organization");
    if (!userEmail) missingInfo.push("User Session");

    if (missingInfo.length > 0) {
      toast.error(`Missing required information: ${missingInfo.join(", ")}. Please refresh the page and try again.`);
      return;
    }

    setIsUploading(true);

    try {
      console.log("Starting upload process...");
      console.log("File:", selectedFile.name, "Size:", selectedFile.size);
      console.log("Upload params:", {
        fileName: fileName.trim(),
        folderName,
        residentId,
        organizationId: activeOrgId || "",
        teamId: activeTeamId,
        uploadedBy: userEmail || ""
      });

      // Upload file to Supabase Storage
      console.log("Uploading file to Supabase storage...");
      const sanitizedFileName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = Date.now();
      const storagePath = `${residentId}/${folderName}/${timestamp}_${sanitizedFileName}.pdf`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resident-files")
        .upload(storagePath, selectedFile, {
          contentType: "application/pdf",
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
      }

      console.log("File uploaded successfully:", uploadData);

      // Save file metadata to database
      console.log("Saving file metadata to database...");
      const { error: insertError } = await supabase
        .from("files")
        .insert([
          {
            name: fileName.trim(),
            original_name: selectedFile.name,
            file_type: selectedFile.type || "application/pdf",
            file_size: selectedFile.size,
            storage_path: storagePath,
            public_url: buildStorageObjectUrl("resident-files", storagePath),
            resident_id: residentId,
            organization_id: activeOrgId,
            folder_name: folderName,
            team_id: activeTeamId,
            created_by: profile?.id || userEmail,
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        // Delete uploaded file if metadata save fails
        await supabase.storage.from("resident-files").remove([storagePath]);
        console.error("Metadata insert error:", insertError);
        throw new Error(`Failed to save file metadata: ${insertError.message}`);
      }

      console.log("File metadata saved successfully");
      toast.success("PDF uploaded successfully");

      // Reset form and close modal
      setSelectedFile(null);
      setFileName(defaultFileName);
      setIsOpen(false);
      onUploaded?.();

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to upload PDF: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileName(defaultFileName);
    setIsOpen(false);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {variant !== "none" && (
        <DialogTrigger asChild>
          {variant === "button" ? (
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </Button>
          ) : variant === "icon" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-muted"
              title="Upload PDF"
            >
              <Upload className="h-3 w-3" />
            </Button>
          ) : (
            <p className="text-muted-foreground text-xs cursor-pointer hover:text-primary">
              Upload file
            </p>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload PDF</DialogTitle>
          <DialogDescription>
            Upload a PDF file to the {folderName} folder. Only PDF files are
            allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 w-full min-w-0 overflow-hidden">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select PDF File</Label>
            <div className="flex items-center gap-2">
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose PDF File
              </Button>
            </div>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md w-full overflow-hidden">
              <div className="bg-red-50 rounded-md">
                <FileIcon className="w-4 h-4 text-red-500 m-1.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setFileName("");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* File Name Input */}
          {selectedFile && (
            <div className="space-y-2">
              <Label htmlFor="file-name">
                File Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="file-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter a name for this file"
                disabled={isUploading}
                className={!fileName.trim() ? "border-red-300" : ""}
              />
              <p className="text-xs text-muted-foreground break-all max-w-full">
                The file will be saved as &ldquo;{fileName.trim() || "Untitled"}
                .pdf&rdquo;
              </p>
            </div>
          )}

          {/* Missing Context Warning */}
          {(!activeTeamId || !activeOrgId || !userEmail) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Missing required information.
                {!activeTeamId && " Please select an active team."}
                {!activeOrgId && " Organization not found."}
                {!userEmail && " User session not found."}
                {" "}Please refresh the page and try again.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || !fileName.trim() || isUploading || !activeTeamId || !activeOrgId || !userEmail}
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
