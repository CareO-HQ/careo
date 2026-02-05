"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  AlertTriangle,
  MoreVertical
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "daily" | "incident" | "medical" | "behavioral" | "other">("all");
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<any>(null);
  const ITEMS_PER_PAGE = 10;

  // State for progress notes
  const [progressNotes, setProgressNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canLoadMore, setCanLoadMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [noteStats, setNoteStats] = useState({
    total: 0,
    daily: 0,
    medical: 0,
    incident: 0,
    behavioral: 0,
    other: 0,
  });
  const [resident, setResident] = useState<any>(null);

  // Auth data - matching daily care pattern
  const { profile } = useProfile();
  const { supabase } = useSupabase();

  // Current user info for staff display
  const currentUserName = profile?.name || profile?.email?.split('@')[0] || "";

  // Fetch resident data from Supabase
  useEffect(() => {
    async function fetchResident() {
      if (!supabase || !id) return;
      
      try {
        const { data, error } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching resident:", error);
          // Fallback: set basic resident structure
          setResident({ id, first_name: "Resident", last_name: "" });
        } else {
          setResident(data);
        }
      } catch (error) {
        console.error("Error fetching resident:", error);
        setResident({ id, first_name: "Resident", last_name: "" });
      }
    }
    if (id) {
      fetchResident();
    }
  }, [id, supabase]);

  // Fetch progress notes
  const fetchProgressNotes = async (cursor: string | null = null, append: boolean = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        residentId: id,
        limit: ITEMS_PER_PAGE.toString(),
        filterType: filterType,
      });
      if (searchQuery) {
        params.append("searchQuery", searchQuery);
      }
      if (cursor) {
        params.append("cursor", cursor);
      }

      const response = await fetch(`/api/progress-notes?${params.toString()}`);
      
      // Get response text first to see what we're actually getting
      const responseText = await response.text();
      console.log("API Response Status:", response.status);
      console.log("API Response Text:", responseText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: responseText || `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error("API Error:", errorData);
        throw new Error(errorData.error || `Failed to fetch progress notes: ${response.status}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON:", e, "Response:", responseText);
        throw new Error("Invalid JSON response from server");
      }
      
      if (append) {
        setProgressNotes(prev => [...prev, ...data.page]);
      } else {
        setProgressNotes(data.page);
      }
      
      setCanLoadMore(!data.isDone);
      setNextCursor(data.continueCursor);
    } catch (error) {
      console.error("Error fetching progress notes:", error);
      toast.error("Failed to load progress notes");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/progress-notes/stats?residentId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setNoteStats({
          total: data.totalCount || 0,
          daily: data.dailyCount || 0,
          medical: data.medicalCount || 0,
          incident: data.incidentCount || 0,
          behavioral: data.behavioralCount || 0,
          other: data.otherCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Load more notes
  const loadMore = () => {
    if (nextCursor && canLoadMore) {
      fetchProgressNotes(nextCursor, true);
    }
  };

  // Fetch notes when filters change
  useEffect(() => {
    if (id) {
      fetchProgressNotes(null, false);
      fetchStats();
    }
  }, [id, filterType, searchQuery]);

  const form = useForm<ProgressNoteFormData>({
    resolver: zodResolver(progressNoteSchema),
    defaultValues: {
      type: "daily",
      date: new Date(),
      time: (() => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0');
        return `${hours}:${minutes}`;
      })(),
      note: "",
    },
  });

  const onSubmit = async (data: ProgressNoteFormData) => {
    try {
      if (editingNote) {
        const response = await fetch(`/api/progress-notes/${editingNote.id || editingNote._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: data.type,
            date: format(data.date, 'yyyy-MM-dd'),
            time: data.time,
            note: data.note,
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            errorData = { error: responseText || `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error("API Error:", errorData);
          throw new Error(errorData.error || `Failed to update progress note: ${response.status}`);
        }
        
        toast.success("Progress note updated successfully");
      } else {
        const response = await fetch("/api/progress-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            residentId: id,
            type: data.type,
            date: format(data.date, 'yyyy-MM-dd'),
            time: data.time,
            note: data.note,
            authorId: profile?.id || "",
            authorName: currentUserName || "Unknown",
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            errorData = { error: responseText || `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error("API Error:", errorData);
          throw new Error(errorData.error || `Failed to create progress note: ${response.status}`);
        }
        
        toast.success("Progress note added successfully");
      }
      
      form.reset();
      setIsDialogOpen(false);
      setEditingNote(null);
      fetchProgressNotes(null, false);
      fetchStats();
      
      // Refresh notes and stats
      fetchProgressNotes(null, false);
      fetchStats();
    } catch (error) {
      toast.error("Failed to save progress note");
      console.error("Error saving progress note:", error);
    }
  };

  const handleEdit = (note: any) => {
    setEditingNote(note);
    // Round time to nearest 15-minute interval for dropdown
    const roundTimeTo15Minutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const roundedMinutes = Math.round(minutes / 15) * 15;
      const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
      const finalHours = roundedMinutes === 60 ? (hours + 1) % 24 : hours;
      return `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
    };
    
    form.reset({
      type: note.type,
      date: new Date(note.date),
      time: roundTimeTo15Minutes(note.time || '00:00'),
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
      const response = await fetch(`/api/progress-notes/${noteToDelete.id || noteToDelete._id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete progress note");
      
      toast.success("Progress note deleted successfully");
      setShowDeleteDialog(false);
      setNoteToDelete(null);
      
      // Refresh notes and stats
      fetchProgressNotes(null, false);
      fetchStats();
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

  if (isLoading && progressNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading progress notes...</p>
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

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();


  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Progress Notes</h1>
            <p className="text-muted-foreground text-sm">
              View daily nursing notes and observations for {resident.firstName} {resident.lastName}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => {
                setEditingNote(null);
                form.reset({
                  type: "daily",
                  date: new Date(),
                  time: (() => {
                    const now = new Date();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0');
                    return `${hours}:${minutes}`;
                  })(),
                  note: "",
                });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/residents/${id}/progress-notes/documents`)}
            >
              <Eye className="w-4 h-4 mr-2" />
              All Notes
            </Button>
          </div>
        </div>

        {/* Progress Notes List */}
        <Card className="border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span>Progress Notes</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!progressNotes || progressNotes.length === 0 ? (
              <div className="text-center py-8">
                <NotebookPen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {searchQuery || filterType !== "all"
                    ? "No progress notes found matching your filters"
                    : "No progress notes recorded"}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchQuery || filterType !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Click the Add Progress Note button to add the first note"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {progressNotes.map((note: any) => (
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
                            className={`text-xs border-0 ${note.type === "incident" ? "bg-red-100 text-red-800" :
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

                    <div className="flex items-center mt-3 md:mt-0 md:ml-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="end">
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              className="justify-start h-9 px-2"
                              onClick={() => handleViewNote(note)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start h-9 px-2"
                              onClick={() => handleDownloadNote(note)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            <div className="h-px bg-border my-1" />
                            <Button
                              variant="ghost"
                              className="justify-start h-9 px-2"
                              onClick={() => handleEdit(note)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Note
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start h-9 px-2 text-red-600 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(note)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Note
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ))}

                {/* Load More Button */}
                {canLoadMore && (
                  <div className="flex justify-center pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => loadMore()}
                      disabled={isLoading || !canLoadMore}
                      className="w-full sm:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                          Loading more...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Load More Notes
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {progressNotes.length > 0 && !canLoadMore && (
                  <div className="text-center py-4 border-t">
                    <p className="text-sm text-gray-500">
                      Showing {progressNotes.length} of {noteStats.total} notes
                      {(searchQuery || filterType !== "all") && " (filtered)"}
                    </p>
                  </div>
                )}

                {isLoading && progressNotes.length > 0 && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Progress Note Dialog - Matching Food & Fluid style */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Progress Note - {selectedNote && format(new Date(selectedNote.createdAt), "PPP")}</DialogTitle>
              <DialogDescription>
                Detailed view of this progress note entry
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedNote ? (
                <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">
                          {selectedNote.type.charAt(0).toUpperCase() + selectedNote.type.slice(1)} Note
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-xs border-0 ${selectedNote.type === "incident" ? "bg-red-100 text-red-800" :
                            selectedNote.type === "medical" ? "bg-blue-100 text-blue-800" :
                              selectedNote.type === "behavioral" ? "bg-yellow-100 text-yellow-800" :
                                selectedNote.type === "daily" ? "bg-green-100 text-green-800" :
                                  "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {selectedNote.type.charAt(0).toUpperCase() + selectedNote.type.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {selectedNote.time}
                    </span>
                  </div>

                  <div className="mb-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedNote.note}</p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium">Date:</span> {format(new Date(selectedNote.createdAt), "MMM d, yyyy")}
                    </span>
                    <span>
                      <span className="font-medium">Time:</span> {selectedNote.time}
                    </span>
                    <span>
                      <span className="font-medium">Author:</span> {selectedNote.authorName}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    Recorded by: {selectedNote.authorName} on {format(new Date(selectedNote.createdAt), "PPP")}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 py-8 text-center">No note selected</p>
              )}
            </div>
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
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                type="button"
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
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date);
                                }
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(23, 59, 59, 999);
                                return date > today;
                              }}
                              captionLayout="dropdown"
                              defaultMonth={field.value || new Date()}
                              startMonth={new Date(new Date().getFullYear() - 1, 0)}
                              endMonth={new Date()}
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            {Array.from({ length: 96 }, (_, i) => {
                              const hours = Math.floor(i / 4);
                              const minutes = (i % 4) * 15;
                              const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                              return (
                                <SelectItem key={timeString} value={timeString}>
                                  {timeString}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <AlertTriangle className="w-16 h-16 text-green-600" />
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

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 border border-yellow-200">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {noteStats.behavioral}
                  </div>
                  <p className="text-sm font-medium text-yellow-700">Behavioral Notes</p>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-10">
                  <User className="w-16 h-16 text-yellow-600" />
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
                      className={`text-xs ${noteToDelete.type === "incident" ? "bg-red-100 text-red-800" :
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
    </div>
  );
}