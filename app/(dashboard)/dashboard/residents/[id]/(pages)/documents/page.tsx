"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Queries
  const folders = useQuery(api.folders.getByResident, {
    residentId: id as Id<"residents">,
  });

  const files = useQuery(api.residentFiles.getByResident, {
    residentId: id as Id<"residents">,
  });

  // Mutations
  const createFolder = useMutation(api.folders.create);
  const updateFolder = useMutation(api.folders.update);
  const deleteFolder = useMutation(api.folders.remove);
  const generateUploadUrl = useMutation(api.residentFiles.generateUploadUrl);
  const createFile = useMutation(api.residentFiles.create);
  const deleteFile = useMutation(api.residentFiles.remove);

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

  // Dialog and sheet states
  const [isFolderDialogOpen, setIsFolderDialogOpen] = React.useState(false);
  const [selectedFolder, setSelectedFolder] = React.useState<Id<"folders"> | null>(null);
  const [isFolderSheetOpen, setIsFolderSheetOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [folderToDelete, setFolderToDelete] = React.useState<{ id: Id<"folders">; name: string } | null>(null);
  const [editingFolderId, setEditingFolderId] = React.useState<Id<"folders"> | null>(null);
  const [editingFolderName, setEditingFolderName] = React.useState("");

  // Auth data
  const { data: user } = authClient.useSession();

  // Get files for the selected folder
  const folderFiles = useQuery(
    selectedFolder
      ? api.residentFiles.getByResident
      : "skip",
    selectedFolder
      ? {
          residentId: id as Id<"residents">,
          parentFolderId: selectedFolder,
        }
      : "skip"
  );

  const handleCreateFolder = async (data: FolderFormData) => {
    try {
      if (!resident) return;

      // VALIDATION: Check folder limit (10 folders per resident)
      if (folders && folders.length >= 10) {
        toast.error("Maximum limit of 10 folders per resident reached");
        return;
      }

      await createFolder({
        name: data.name,
        residentId: id as Id<"residents">,
        organizationId: resident.organizationId,
        teamId: resident.teamId,
      });

      toast.success("Folder created successfully");
      folderForm.reset();
      setIsFolderDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast.error(error?.message || "Failed to create folder");
    }
  };

  const handleOpenFolder = (folderId: Id<"folders">) => {
    setSelectedFolder(folderId);
    setIsFolderSheetOpen(true);
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
      if (!selectedFile || !resident || !selectedFolder) {
        toast.error("Please select a file");
        return;
      }

      // VALIDATION: Check file count in folder (50 files max)
      if (folderFiles && folderFiles.length >= 50) {
        toast.error("Folder has reached maximum limit of 50 files");
        return;
      }

      setIsUploading(true);

      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Create file record in the folder
      const extension = selectedFile.name.split(".").pop() || "";
      await createFile({
        storageId,
        name: data.name,
        originalName: selectedFile.name,
        size: selectedFile.size,
        extension,
        residentId: id as Id<"residents">,
        organizationId: resident.organizationId,
        teamId: resident.teamId,
        parentFolderId: selectedFolder,
      });

      toast.success("Document uploaded successfully");
      documentForm.reset();
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error?.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateFolderName = async (folderId: Id<"folders">, newName: string) => {
    if (!newName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }

    try {
      await updateFolder({ folderId, name: newName.trim() });
      toast.success("Folder renamed");
      setEditingFolderId(null);
      setEditingFolderName("");
    } catch (error) {
      console.error("Error updating folder:", error);
      toast.error("Failed to rename folder");
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      await deleteFolder({ folderId: folderToDelete.id });
      toast.success("Folder deleted");
      setFolderToDelete(null);
      setIsFolderSheetOpen(false);
      setSelectedFolder(null);
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder");
    }
  };

  const handleDeleteFile = async (fileId: Id<"files">) => {
    try {
      await deleteFile({ fileId });
      toast.success("File deleted");
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

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
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

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <span className="text-foreground">Documents</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Folder className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground text-sm">Files & document management</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching daily-care pattern */}
      <Card className="border-0">
        <CardContent className="p-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 text-xs">
                    <Folder className="w-3 h-3 mr-1" />
                    {(files?.length || 0)} Files
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setIsFolderDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-15 h-15">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{fullName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 text-xs">
                    <Folder className="w-3 h-3 mr-1" />
                    {(folders?.length || 0) + (files?.length || 0)} Items
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <Button
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={folders && folders.length >= 10}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
                {folders && folders.length > 0 && (
                  <span className={`text-xs mt-1 ${folders.length >= 10 ? 'text-red-600 font-semibold' : folders.length >= 8 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {folders.length}/10 folders
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Folders List */}
      <div className="flex flex-wrap gap-3">
        {folders && folders.length > 0 ? (
          folders.map((folder, index) => (
            <Sheet key={folder._id} open={isFolderSheetOpen && selectedFolder === folder._id} onOpenChange={(open) => {
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
                  onClick={() => handleOpenFolder(folder._id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete({ id: folder._id, name: folder.name });
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
                    {editingFolderId === folder._id ? (
                      <input
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateFolderName(folder._id, editingFolderName);
                          } else if (e.key === "Escape") {
                            setEditingFolderId(null);
                            setEditingFolderName("");
                          }
                        }}
                        onBlur={() => {
                          if (editingFolderName.trim()) {
                            handleUpdateFolderName(folder._id, editingFolderName);
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
                            setEditingFolderId(folder._id);
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
                          id={`file-upload-${folder._id}`}
                          disabled={folderFiles && folderFiles.length >= 50}
                        />
                        <label htmlFor={`file-upload-${folder._id}`}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            asChild
                            disabled={folderFiles && folderFiles.length >= 50}
                          >
                            <span className="cursor-pointer">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </span>
                          </Button>
                        </label>
                        {folderFiles && folderFiles.length > 0 && (
                          <span className={`text-xs ${folderFiles.length >= 50 ? 'text-red-600 font-semibold' : folderFiles.length >= 45 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {folderFiles.length}/50 files
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
                      {folderFiles && folderFiles.length > 0 ? (
                        folderFiles.map((file) => (
                          <div key={file._id} className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors px-1">
                            <div className="flex-1 flex items-center gap-2">
                              <div className="bg-red-50 rounded-md">
                                <FileText className="w-4 h-4 text-red-500 m-1.5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-primary">
                                    {file.name}.{file.extension}
                                  </p>
                                </div>
                                <div className="flex flex-row items-center gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    Uploaded: {new Date(file.uploadedAt || Date.now()).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </p>
                                  {file.size && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(file.size)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {file.url && (
                                <>
                                  <Eye
                                    className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
                                    onClick={() => window.open(file.url, "_blank")}
                                  />
                                  <Download
                                    className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer"
                                    onClick={() => window.open(file.url, "_blank")}
                                  />
                                </>
                              )}
                              <Trash2
                                className="h-4 w-4 text-muted-foreground/70 hover:text-red-500 cursor-pointer"
                                onClick={() => handleDeleteFile(file._id)}
                              />
                            </div>
                          </div>
                        ))
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
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Folder className="w-12 h-12 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-600 font-medium mb-2">No folders yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Create a folder to organize your documents
              </p>
              <Button
                onClick={() => setIsFolderDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Your First Folder
              </Button>
            </CardContent>
          </Card>
        )}
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
  );
}