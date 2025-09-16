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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useActiveTeam } from "@/hooks/use-active-team";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "convex/react";
import { FileIcon, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface UploadFileModalProps {
  folderName: string;
  residentId: Id<"residents">;
}

export default function UploadFileModal({
  folderName,
  residentId
}: UploadFileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activeTeamId } = useActiveTeam();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: currentUser } = authClient.useSession();

  const generateUploadUrl = useMutation(api.careFilePdfs.generateUploadUrl);
  const uploadPdf = useMutation(api.careFilePdfs.uploadPdf);

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
    if (!selectedFile || !fileName.trim()) {
      toast.error("Please select a file and enter a name");
      return;
    }

    if (!activeTeamId || !activeOrg?.id || !currentUser?.user.email) {
      toast.error("Missing required information for upload");
      return;
    }

    setIsUploading(true);

    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await result.json();

      // Save PDF metadata
      await uploadPdf({
        fileId: storageId,
        name: fileName.trim(),
        originalName: selectedFile.name,
        folderName,
        residentId,
        organizationId: activeOrg.id,
        teamId: activeTeamId,
        uploadedBy: currentUser.user.email,
        size: selectedFile.size
      });

      toast.success("PDF uploaded successfully");

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
      toast.error("Failed to upload PDF");
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
        <p className="text-muted-foreground text-xs cursor-pointer hover:text-primary">
          Upload file
        </p>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload PDF</DialogTitle>
          <DialogDescription>
            Upload a PDF file to the {folderName} folder. Only PDF files are
            allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter a name for this file"
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                The file will be saved as &ldquo;{fileName.trim() || "Untitled"}
                .pdf&rdquo;
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
            disabled={!selectedFile || !fileName.trim() || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
