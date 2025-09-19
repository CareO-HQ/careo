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
import {
  Card,
  CardContent
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
import { Badge } from "@/components/ui/badge";
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
  const [user, setUser] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Get user info
  React.useEffect(() => {
    const getUser = async () => {
      const session = await authClient.getSession();
      if (session?.data) {
        setUser(session.data);
      }
    };
    getUser();
  }, []);

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
          authorId: user?.id || "",
          authorName: user?.name || "Unknown",
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

  const handleDelete = async (noteId: Id<"progressNotes">) => {
    if (confirm("Are you sure you want to delete this progress note?")) {
      try {
        await deleteProgressNote({ noteId });
        toast.success("Progress note deleted successfully");
      } catch (error) {
        toast.error("Failed to delete progress note");
        console.error("Error deleting progress note:", error);
      }
    }
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
  const showPagination = totalNotes > itemsPerPage;

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

      {/* Resident Info Card */}
      <Card className="border-0">
        <CardContent className="p-4">
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
                <h2 className="font-semibold truncate">{fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  Room {resident.roomNumber}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Age</p>
                <p className="font-medium">{calculateAge(resident.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">NHS</p>
                <p className="font-medium truncate">{resident.nhsHealthNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{fullName}</h2>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <span>Room {resident.roomNumber}</span>
                  <span>•</span>
                  <span>Age {calculateAge(resident.dateOfBirth)}</span>
                  <span>•</span>
                  <span>NHS: {resident.nhsHealthNumber || "N/A"}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => {
                setEditingNote(null);
                form.reset();
                setIsDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Progress Note
              </Button>
              <Button onClick={() => router.push(`/dashboard/residents/${id}/progress-notes/documents`)}>All Notes</Button>
            </div>
          </div>

          {/* Mobile Add Button */}
          <div className="sm:hidden mt-4">
            <Button
              className="w-full"
              onClick={() => {
                setEditingNote(null);
                form.reset();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Progress Note
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Progress Notes List */}
      {paginatedNotes.length > 0 ? (
        <>
          <div className="space-y-4">
            {paginatedNotes.map((note: any) => {
              return (
                <Card key={note._id} className="border-0">
                  <CardContent >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-3">

                        <div>
                          <h3 className="font-semibold text-base">{note.type.charAt(0).toUpperCase() + note.type.slice(1)} Note</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                            {note.note}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {note.authorName}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon2 className="h-3 w-3" />
                            {format(new Date(note.createdAt), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {note.time}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewNote(note)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(note)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadNote(note)}
                        >
                          <Download className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Download</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(note._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {showPagination && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handlePageChange(page)}
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
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <NotebookPen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Progress Notes Found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || filterType !== "all"
                ? "No notes match your search criteria."
                : `Start documenting daily progress by adding the first note for ${fullName}.`}
            </p>
            {(!searchQuery && filterType === "all") && (
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingNote(null);
                  form.reset();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Note
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Progress Note Details</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Type</Label>
                  <p className="font-medium">{selectedNote.type}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Time</Label>
                  <p className="font-medium">{selectedNote.time}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedNote.createdAt), "PPp")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Author</Label>
                  <p className="font-medium">{selectedNote.authorName}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground">Note Content</Label>
                <p className="mt-2 whitespace-pre-wrap">{selectedNote.note}</p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadNote(selectedNote)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewDialog(false);
                    handleEdit(selectedNote);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notes</p>
                <p className="text-2xl font-bold">{noteStats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Notes</p>
                <p className="text-2xl font-bold">{noteStats.daily}</p>
              </div>
              <CalendarIcon2 className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medical</p>
                <p className="text-2xl font-bold">{noteStats.medical}</p>
              </div>
              <Plus className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incidents</p>
                <p className="text-2xl font-bold">{noteStats.incident}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}