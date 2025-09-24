"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  ArrowLeft,
  FileText,
  Plus,
  Clock,
  User,
  Calendar as CalendarIcon2,
  CalendarIcon,
  Edit,
  Trash2,
  NotebookPen,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type ProgressNotesPageProps = {
  params: Promise<{ id: string }>;
};

const progressNoteSchema = z.object({
  type: z.enum(["daily", "incident", "medical", "behavioral", "other"]),
  date: z.date({
    required_error: "Date is required",
  }),
  time: z.string().min(1, "Time is required"),
  note: z.string().min(10, "Note must be at least 10 characters"),
});

type ProgressNoteFormData = z.infer<typeof progressNoteSchema>;

export default function ProgressNotesPage({ params }: ProgressNotesPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [searchQuery] = useState("");
  const [filterType] = useState<string>("all");
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<any>(null);
  const itemsPerPage = 5;

  // Auth data - matching daily care pattern
  const { data: user } = authClient.useSession();
  
  // Current user info for staff display
  const currentUserName = user?.user?.name || user?.user?.email?.split('@')[0] || "";

  // Get resident data
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get progress notes
  const progressNotes = useQuery(api.progressNotes.getByResidentId, {
    residentId: id as Id<"residents">
  });

  // Create progress note mutation
  const createProgressNote = useMutation(api.progressNotes.create);

  // Update progress note mutation
  const updateProgressNote = useMutation(api.progressNotes.update);

  // Delete progress note mutation
  const deleteProgressNote = useMutation(api.progressNotes.deleteNote);

  const form = useForm<ProgressNoteFormData>({
    resolver: zodResolver(progressNoteSchema),
    defaultValues: {
      type: "daily",
      date: new Date(),
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      note: "",
    },
  });

  const onSubmit = async (data: ProgressNoteFormData) => {
    try {
      if (editingNote) {
        await updateProgressNote({
          noteId: editingNote._id,
          type: data.type,
          date: format(data.date, 'yyyy-MM-dd'),
          time: data.time,
          note: data.note,
        });
        toast.success("Progress note updated successfully");
      } else {
        await createProgressNote({
          residentId: id as Id<"residents">,
          type: data.type,
          date: format(data.date, 'yyyy-MM-dd'),
          time: data.time,
          note: data.note,
          authorId: user?.user?.id || "",
          authorName: currentUserName || "Unknown",
          createdAt: new Date().toISOString(),
        });
        toast.success("Progress note added successfully");
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingNote(null);
    } catch (error) {
      toast.error("Failed to save progress note");
      console.error("Error saving progress note:", error);
    }
  };

  const handleEdit = (note: any) => {
    setEditingNote(note);
    form.reset({
      type: note.type,
      date: new Date(note.date),
      time: note.time,
      note: note.note,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (note: any) => {
    setNoteToDelete(note);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    
    try {
      await deleteProgressNote({ noteId: noteToDelete._id });
      toast.success("Progress note deleted successfully");
      setShowDeleteDialog(false);
      setNoteToDelete(null);
    } catch (error) {
      toast.error("Failed to delete progress note");
      console.error("Error deleting progress note:", error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setNoteToDelete(null);
  };

  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setShowViewDialog(true);
  };

  const handleDownloadNote = (note: any) => {
    const htmlContent = generateNotePDF(note);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-note-${note.createdAt}-${note._id.slice(-6)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Progress note downloaded successfully");
  };

  const generateNotePDF = (note: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Progress Note - ${note.type} - ${format(new Date(note.createdAt), "PPP")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 20px; }
            .section { margin-bottom: 20px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .header { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Progress Note</h1>
            <div class="field">
              <span class="label">Resident:</span>
              <span class="value">${fullName}</span>
            </div>
            <div class="field">
              <span class="label">Date:</span>
              <span class="value">${format(new Date(note.createdAt), "PPp")}</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Note Details</h2>
            <div class="field">
              <span class="label">Type:</span>
              <span class="value">${note.type}</span>
            </div>
            <div class="field">
              <span class="label">Time:</span>
              <span class="value">${note.time}</span>
            </div>
          </div>

          <div class="section">
            <h2>Note Content</h2>
            <p>${note.note}</p>
          </div>

          <div class="section">
            <h2>Author Information</h2>
            <div class="field">
              <span class="label">Written By:</span>
              <span class="value">${note.authorName}</span>
            </div>
            <div class="field">
              <span class="label">Date:</span>
              <span class="value">${format(new Date(note.createdAt), "PPP")}</span>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const filteredNotes = progressNotes?.filter((note: any) => {
    const matchesSearch =
      note.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || note.type === filterType;
    return matchesSearch && matchesFilter;
  }) || [];

  // Pagination logic
  const totalNotes = filteredNotes.length;
  const totalPages = Math.ceil(totalNotes / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotes = filteredNotes.slice(startIndex, endIndex);
  const showPagination = totalNotes > 0; // Always show pagination when there are notes

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
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

  if (resident === undefined || progressNotes === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading progress notes...</p>
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

  // Calculate stats
  const noteStats = {
    total: progressNotes?.length || 0,
    daily: progressNotes?.filter((n: any) => n.type === 'daily').length || 0,
    medical: progressNotes?.filter((n: any) => n.type === 'medical').length || 0,
    incident: progressNotes?.filter((n: any) => n.type === 'incident').length || 0,
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
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
        <span className="text-foreground">Progress Notes</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <NotebookPen className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Progress Notes</h1>
            <p className="text-muted-foreground text-sm">Daily nursing notes & observations</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching incidents pattern */}
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
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <NotebookPen className="w-3 h-3 mr-1" />
                    Progress Notes
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                className="bg-black hover:bg-gray-800 text-white"
                onClick={() => {
                  setEditingNote(null);
                  form.reset();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Progress Note
              </Button>
            </div>
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
                    <CalendarIcon2 className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <NotebookPen className="w-3 h-3 mr-1" />
                    Progress Notes
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-black hover:bg-gray-800 text-white"
                onClick={() => {
                  setEditingNote(null);
                  form.reset();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Progress Note
              </Button>

              <Button
             onClick={() => router.push(`/dashboard/residents/${id}/progress-notes/documents`)}
              >
                All Notes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Recent Progress Notes - Matching incidents pattern */}
      <Card className="border-0">
        <CardHeader className="">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">Recent Progress Notes</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-700">{progressNotes?.length || 0} Total</Badge>
           
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!progressNotes || progressNotes.length === 0 ? (
            <div className="text-center py-8">
              <NotebookPen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No progress notes recorded</p>
              <p className="text-gray-400 text-sm mt-1">
                Click the Add Progress Note button to add the first note
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedNotes.map((note: any) => (
                <div
                  key={note._id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <NotebookPen className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {note.type.charAt(0).toUpperCase() + note.type.slice(1)} Note
                        </h4>
                        <Badge
                          className={`text-xs border-0 ${
                            note.type === "incident" ? "bg-red-100 text-red-800" :
                            note.type === "medical" ? "bg-blue-100 text-blue-800" :
                            note.type === "behavioral" ? "bg-yellow-100 text-yellow-800" :
                            note.type === "daily" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon2 className="w-3 h-3" />
                          <span>{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{note.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{note.authorName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-3 md:mt-0 md:ml-4 justify-end md:justify-start flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleViewNote(note)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownloadNote(note)}
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEdit(note)}
                      title="Edit Note"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(note)}
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {showPagination && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalNotes)} of {totalNotes} progress notes
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Progress Note Dialog - Matching incidents pattern */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Progress Note Details</DialogTitle>
            <DialogDescription>
              Complete progress note for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedNote && (
              <div className="space-y-6">
                {/* Note Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Note Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">{format(new Date(selectedNote.createdAt), "PPp")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Note Type</p>
                      <Badge
                        className={`${
                          selectedNote.type === "incident" ? "bg-red-100 text-red-800" :
                          selectedNote.type === "medical" ? "bg-blue-100 text-blue-800" :
                          selectedNote.type === "behavioral" ? "bg-yellow-100 text-yellow-800" :
                          selectedNote.type === "daily" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {selectedNote.type.charAt(0).toUpperCase() + selectedNote.type.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time Recorded</p>
                      <p className="font-medium">{selectedNote.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Author</p>
                      <p className="font-medium">{selectedNote.authorName}</p>
                    </div>
                  </div>
                </div>

                {/* Note Content */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Note Content</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedNote.note}</p>
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Record Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="font-medium">{selectedNote.authorName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Created</p>
                      <p className="font-medium">{format(new Date(selectedNote.createdAt), "PPP")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowViewDialog(false);
                handleEdit(selectedNote);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Edit Progress Note" : "Add Progress Note"}
            </DialogTitle>
            <DialogDescription>
              Document daily observations and important events for {fullName}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="incident">Incident</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Staff Field - Matching daily care pattern */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Staff</Label>
                  <Input
                    value={currentUserName || "Current User"}
                    disabled
                    className="h-9 bg-gray-50 text-gray-600"
                    placeholder="Current user"
                  />
                  <p className="text-xs text-gray-500">
                    This note will be recorded under your name and cannot be changed.
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress Note</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter detailed progress note..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingNote(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingNote ? "Update Note" : "Add Note"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Care Notes Summary - Matching incidents pattern */}
      <Card className="border-0">
        <CardHeader className="">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-gray-900">Care Notes Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 border border-purple-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {noteStats.total}
                </div>
                <p className="text-sm font-medium text-purple-700">Total Notes</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <FileText className="w-16 h-16 text-purple-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {noteStats.daily}
                </div>
                <p className="text-sm font-medium text-blue-700">Daily Notes</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <CalendarIcon2 className="w-16 h-16 text-blue-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 border border-green-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {noteStats.medical}
                </div>
                <p className="text-sm font-medium text-green-700">Medical Notes</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <Plus className="w-16 h-16 text-green-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-4 border border-red-200">
              <div className="relative z-10">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {noteStats.incident}
                </div>
                <p className="text-sm font-medium text-red-700">Incident Notes</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-10">
                <AlertTriangle className="w-16 h-16 text-red-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <span>Delete Progress Note</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this progress note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {noteToDelete && (
            <div className="space-y-4">
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge
                    className={`text-xs ${
                      noteToDelete.type === "incident" ? "bg-red-100 text-red-800" :
                      noteToDelete.type === "medical" ? "bg-blue-100 text-blue-800" :
                      noteToDelete.type === "behavioral" ? "bg-yellow-100 text-yellow-800" :
                      noteToDelete.type === "daily" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {noteToDelete.type.charAt(0).toUpperCase() + noteToDelete.type.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {format(new Date(noteToDelete.createdAt), "MMM d, yyyy")} at {noteToDelete.time}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {noteToDelete.note}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Created by: {noteToDelete.authorName}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={cancelDelete}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}