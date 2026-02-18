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
import { FileIcon, Plus, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface UploadFileModalProps {
  folderName: string;
  residentId: string;
  variant?: "text" | "button" | "icon";
  onUploaded?: () => void;
}

export default function UploadFileModal({
  folderName,
  residentId,
  variant = "text",
  onUploaded
}: UploadFileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activeTeamId } = useActiveTeam();
  const { profile } = useProfile();
  const activeOrgId = profile?.active_organization_id;
  const userEmail = profile?.email;
  const userId = profile?.id;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 25MB");
      return;
    }

    setSelectedFile(file);
    // Strip extension for default display name
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
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
    if (!activeOrgId) missingInfo.push("Organization");
    if (!userId) missingInfo.push("User Session");

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
      // Preserve the original file extension
      const originalExt = selectedFile.name.includes(".")
        ? selectedFile.name.split(".").pop()
        : "";
      const storagePath = `${residentId}/${folderName}/${timestamp}_${sanitizedFileName}${originalExt ? `.${originalExt}` : ""}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resident-files")
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type || "application/octet-stream",
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
            file_type: selectedFile.type || "application/octet-stream",
            file_size: selectedFile.size,
            storage_path: storagePath,
            resident_id: residentId,
            organization_id: activeOrgId,
            folder_name: folderName,
            ...(activeTeamId ? { team_id: activeTeamId } : {}),
            created_by: userId,
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
      toast.success("Document uploaded successfully");

      // Notify parent of new upload
      onUploaded?.();

      // Reset form and close modal
      setSelectedFile(null);
      setFileName("");
      setIsOpen(false);

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
    setFileName("");
    setIsOpen(false);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        ) : variant === "icon" ? (
          <button
            className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Upload document"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        ) : (
          <p className="text-muted-foreground text-xs cursor-pointer hover:text-primary">
            Upload file
          </p>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to the {folderName} folder. PDF, Word, Excel, images and other formats are supported (max 25MB).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <div className="flex items-center gap-2">
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept="*/*"
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
                Choose File
              </Button>
            </div>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
              <div className="bg-red-50 rounded-md">
                <FileIcon className="w-4 h-4 text-red-500 m-1.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
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
              <p className="text-xs text-muted-foreground">
                Original file: {selectedFile?.name}
              </p>
            </div>
          )}

          {/* Missing Context Warning */}
          {(!activeOrgId || !userId) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Missing required information.
                {!activeOrgId && " Organization not found."}
                {!userId && " User session not found."}
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
            disabled={!selectedFile || !fileName.trim() || isUploading || !activeOrgId || !userId}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
