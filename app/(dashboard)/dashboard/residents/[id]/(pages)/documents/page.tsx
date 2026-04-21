"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Folder,
  User,
  Calendar,
  Eye,
  Download,
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  FolderPlus,
  ChevronRight,
  X,
  Edit
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

// Folder Creation Schema
const FolderSchema = z.object({
  name: z.string().min(1, "Folder name is required"),
});

type FolderFormData = z.infer<typeof FolderSchema>;

// Document Upload Schema
const DocumentUploadSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  file: z.any().optional(),
});

type DocumentUploadFormData = z.infer<typeof DocumentUploadSchema>;

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

  // State management
  const [resident, setResident] = React.useState<any>(null);
  const [folders, setFolders] = React.useState<any[]>([]);
  const [files, setFiles] = React.useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = React.useState(false);
  const [isFolderSheetOpen, setIsFolderSheetOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [folderToDelete, setFolderToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = React.useState("");

  // Fetch resident and folders
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch resident
        const { data: residentData, error: residentError } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();

        if (residentError || !residentData) {
          console.error("Error fetching resident:", residentError);
          setResident(null);
          setLoading(false);
          return;
        }

        setResident(residentData);

        // Fetch folders
        const { data: foldersData, error: foldersError } = await supabase
          .from("folders")
          .select("*")
          .eq("resident_id", id)
          .order("created_at", { ascending: false });

        if (foldersError) {
          console.error("Error fetching folders:", foldersError);
        } else {
          setFolders(foldersData || []);
        }

        // Fetch all files for this resident
        const { data: filesData, error: filesError } = await supabase
          .from("files")
          .select("*")
          .eq("resident_id", id)
          .order("created_at", { ascending: false });

        if (filesError) {
          console.error("Error fetching files:", filesError);
        } else {
          setFiles(filesData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Form setup
  const folderForm = useForm<FolderFormData>({
    resolver: zodResolver(FolderSchema),
    defaultValues: {
      name: "",
    },
  });

  const documentForm = useForm<DocumentUploadFormData>({
    resolver: zodResolver(DocumentUploadSchema),
    defaultValues: {
      name: "",
    },
  });

  // Get files for the selected folder
  const folderFiles = selectedFolder ? files.filter((f) => f.folder_id === selectedFolder) : [];

  const handleCreateFolder = async (data: FolderFormData) => {
    try {
      if (!resident || !profile) return;

      // VALIDATION: Check folder limit (1 folder per resident)
      if (folders.length >= 1) {
        toast.error("This resident already has a folder. Only one folder is allowed per resident.");
        return;
      }

      const { error } = await supabase.from("folders").insert([
        {
          name: data.name,
          resident_id: id,
          organization_id: resident.organization_id || profile.active_organization_id,
          care_home_id: resident.care_home_id,
          created_by: profile.id,
        },
      ]);

      if (error) throw error;

      toast.success("Folder created successfully");
      folderForm.reset();
      setIsFolderDialogOpen(false);

      // Refetch folders
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("resident_id", id)
        .order("created_at", { ascending: false });
      setFolders(foldersData || []);
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast.error(error?.message || "Failed to create folder");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // VALIDATION: Check file size (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size exceeds 10MB limit. Please choose a smaller file.");
        e.target.value = ""; // Reset file input
        return;
      }

      setSelectedFile(file);
      // Set default name from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      documentForm.setValue("name", nameWithoutExt);
    }
  };

  const handleUploadDocument = async (data: DocumentUploadFormData) => {
    try {
      if (!selectedFile || !resident || !selectedFolder || !profile) {
        toast.error("Please select a file and folder");
        return;
      }

      // VALIDATION: Check file count in folder (10 files max)
      if (folderFiles.length >= 10) {
        toast.error("Folder has reached maximum limit of 10 files");
        return;
      }

      setIsUploading(true);

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${id}/${selectedFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("resident-files")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create file record in database
      const { error: dbError } = await supabase.from("files").insert([
        {
          name: data.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          storage_path: filePath,
          resident_id: id,
          organization_id: resident.organization_id || profile.active_organization_id,
          care_home_id: resident.care_home_id,
          folder_id: selectedFolder,
          created_by: profile.id,
        },
      ]);

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      documentForm.reset();
      setSelectedFile(null);

      // Refetch files
      const { data: filesData } = await supabase
        .from("files")
        .select("*")
        .eq("resident_id", id)
        .order("created_at", { ascending: false });
      setFiles(filesData || []);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error?.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateFolderName = async (folderId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("folders")
        .update({ name: newName.trim(), updated_at: new Date().toISOString() })
        .eq("id", folderId);

      if (error) throw error;

      toast.success("Folder renamed");
      setEditingFolderId(null);
      setEditingFolderName("");

      // Refetch folders
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("resident_id", id)
        .order("created_at", { ascending: false });
      setFolders(foldersData || []);
    } catch (error) {
      console.error("Error updating folder:", error);
      toast.error("Failed to rename folder");
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      // Delete all files in the folder from storage
      const folderFilesToDelete = files.filter((f) => f.folder_id === folderToDelete.id);
      for (const file of folderFilesToDelete) {
        if (file.storage_path) {
          await supabase.storage.from("resident-files").remove([file.storage_path]);
        }
      }

      // Delete folder record (cascade will delete files records)
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderToDelete.id);

      if (error) throw error;

      toast.success("Folder deleted");
      setFolderToDelete(null);
      setIsFolderSheetOpen(false);
      setSelectedFolder(null);

      // Refetch data
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("resident_id", id)
        .order("created_at", { ascending: false });
      setFolders(foldersData || []);

      const { data: filesData } = await supabase
        .from("files")
        .select("*")
        .eq("resident_id", id)
        .order("created_at", { ascending: false });
      setFiles(filesData || []);
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const fileToDelete = files.find((f) => f.id === fileId);
      if (!fileToDelete) return;

      // Delete from storage
      if (fileToDelete.storage_path) {
        await supabase.storage.from("resident-files").remove([fileToDelete.storage_path]);
      }

      // Delete from database
      const { error } = await supabase.from("files").delete().eq("id", fileId);

      if (error) throw error;

      toast.success("File deleted");

      // Refetch files
      const { data: filesData } = await supabase
        .from("files")
        .select("*")
        .eq("resident_id", id)
        .order("created_at", { ascending: false });
      setFiles(filesData || []);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };


  const getFileIcon = (extension: string) => {
    const ext = extension?.toLowerCase();
    if (ext === "pdf") {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-purple-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper to get signed URL and open file (for private buckets)
  const handleViewFile = async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("resident-files")
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Error getting file URL:", error);
      toast.error("Failed to open file");
    }
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("resident-files")
        .download(storagePath);

      if (error) throw error;
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={resident.image_url} alt={fullName} className="border" />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground text-sm">
              View and manage files and documents for {resident.first_name} {resident.last_name}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col items-end">
              <Button
                onClick={() => setIsFolderDialogOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={folders.length >= 1}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
              {folders.length > 0 && (
                <span className={`text-xs mt-1 ${folders.length >= 1 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                  {folders.length}/1 folder
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Guide */}
        <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md p-3 -mt-2">
          <p className="font-semibold text-blue-900 mb-1.5">Quick Guide:</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li><span className="font-medium">Create folders</span> to organize documents by category (Medical Records, Care Plans, etc.)</li>
            <li><span className="font-medium">Upload files:</span> PDF, JPG, JPEG, PNG, GIF (Max 10MB per file)</li>
            <li><span className="font-medium">Limits:</span> 1 folder per resident, 10 files per folder</li>
          </ul>
        </div>

        {/* Folders List */}
        <div className="flex flex-wrap gap-3">
          {folders.length > 0 ? (
            folders.map((folder) => (
              <Sheet key={folder.id} open={isFolderSheetOpen && selectedFolder === folder.id} onOpenChange={(open) => {
                setIsFolderSheetOpen(open);
                if (!open) {
                  setSelectedFolder(null);
                  setSelectedFile(null);
                  documentForm.reset();
                }
              }}>
                <SheetTrigger asChild>
                  <div
                    className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-all group min-w-[90px] relative"
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToDelete({ id: folder.id, name: folder.name });
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      <Folder className="w-8 h-8 text-gray-600 group-hover:text-gray-700" />
                    </div>
                    <div className="text-center w-full">
                      <p className="font-medium text-xs text-primary line-clamp-2 px-0.5">
                        {folder.name}
                      </p>
                    </div>
                  </div>
                </SheetTrigger>
                <SheetContent size="lg">
                  <SheetHeader>
                    <div className="flex items-center gap-2">
                      {editingFolderId === folder.id ? (
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateFolderName(folder.id, editingFolderName);
                            } else if (e.key === "Escape") {
                              setEditingFolderId(null);
                              setEditingFolderName("");
                            }
                          }}
                          onBlur={() => {
                            if (editingFolderName.trim()) {
                              handleUpdateFolderName(folder.id, editingFolderName);
                            } else {
                              setEditingFolderId(null);
                              setEditingFolderName("");
                            }
                          }}
                          className="text-lg font-semibold bg-transparent border-b border-primary focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <>
                          <SheetTitle>{folder.name}</SheetTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingFolderId(folder.id);
                              setEditingFolderName(folder.name);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    <SheetDescription>Upload and manage documents</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-1 px-4">
                      {/* Upload Section */}
                      <div className="flex flex-col items-center gap-2 mt-10 mb-6">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                            onChange={handleFileChange}
                            className="hidden"
                            id={`file-upload-${folder.id}`}
                            disabled={folderFiles.length >= 10}
                          />
                          <label htmlFor={`file-upload-${folder.id}`}>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              asChild
                              disabled={folderFiles.length >= 10}
                            >
                              <span className="cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                              </span>
                            </Button>
                          </label>
                          {folderFiles.length > 0 && (
                            <span className={`text-xs ${folderFiles.length >= 10 ? 'text-red-600 font-semibold' : folderFiles.length >= 8 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                              {folderFiles.length}/10 files
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Document Name Input - Shows when file selected */}
                      {selectedFile && (
                        <div className="mb-4 p-3 border rounded-md bg-muted/30">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-red-50 rounded-md p-1.5">
                              {getFileIcon(selectedFile.name.split(".").pop() || "")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-primary truncate">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          </div>
                          <Form {...documentForm}>
                            <form onSubmit={documentForm.handleSubmit(handleUploadDocument)} className="space-y-2">
                              <FormField
                                control={documentForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input placeholder="Enter document name..." {...field} className="h-9" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  className="flex-1"
                                  size="sm"
                                  disabled={isUploading}
                                >
                                  {isUploading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Upload
                                    </>
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFile(null);
                                    documentForm.reset();
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </div>
                      )}

                      {/* Files List */}
                      <div className="space-y-2">
                        {folderFiles.length > 0 ? (
                          folderFiles.map((file) => {
                            return (
                              <div key={file.id} className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors px-1">
                                <div className="flex-1 flex items-center gap-2">
                                  <div className="bg-red-50 rounded-md">
                                    <FileText className="w-4 h-4 text-red-500 m-1.5" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-primary">
                                        {file.name}
                                      </p>
                                    </div>
                                    <div className="flex flex-row items-center gap-2">
                                      <p className="text-xs text-muted-foreground">
                                        Uploaded: {new Date(file.created_at).toLocaleDateString("en-GB", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </p>
                                      {file.file_size && (
                                        <p className="text-xs text-muted-foreground">
                                          {formatFileSize(file.file_size)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Eye
                                    className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
                                    onClick={() => handleViewFile(file.storage_path)}
                                  />
                                  <Download
                                    className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
                                    onClick={() => handleDownloadFile(file.storage_path, `${file.name}.pdf`)}
                                  />
                                  <Trash2
                                    className="h-4 w-4 text-muted-foreground/70 hover:text-red-500 cursor-pointer"
                                    onClick={() => handleDeleteFile(file.id)}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="w-full text-center p-2 py-6 border rounded-md bg-muted/60 text-muted-foreground text-xs">
                            No files uploaded yet. Upload a document to get started.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ))
          ) : null}
        </div>

        {/* Create Folder Dialog */}
        <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Create a folder to organize documents for {fullName}
              </DialogDescription>
            </DialogHeader>

            <Form {...folderForm}>
              <form onSubmit={folderForm.handleSubmit(handleCreateFolder)} className="space-y-4">
                <FormField
                  control={folderForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Folder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Medical Records" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFolderDialogOpen(false);
                      folderForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Folder Confirmation Dialog */}
        <Dialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Folder</DialogTitle>
              <DialogDescription>
                Delete &quot;{folderToDelete?.name}&quot; folder and all its files?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFolderToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteFolder}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}