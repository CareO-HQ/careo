"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { multidisciplinaryService } from "@/lib/multidisciplinary-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  User,
  Clock,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Standard MDT professions
const MDT_PROFESSIONS = [
  "GP",
  "District Nurse",
  "Physiotherapist",
  "Occupational Therapist",
  "Dietitian",
  "Speech & Language Therapist (SLT)",
  "Pharmacist",
  "Mental Health Professional",
  "Social Worker",
  "Other"
];

export default function MdtSummaryPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { supabase } = useSupabase();
  const [isPending, startTransition] = useTransition();

  // Core Data States
  const [notes, setNotes] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("all");
  const [selectedResident, setSelectedResident] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  // Pagination & Sorting
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog State
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Verify Roles
  const userRole = profile?.role;
  const isAuthorized = userRole === "manager" || userRole === "owner" || userRole === "nurse" || userRole === "saas_admin" || userRole === "agency_nurse";

  // Fetch Data
  useEffect(() => {
    async function loadData() {
      if (!profile?.active_organization_id || !isAuthorized) {
        setIsLoading(false);
        return;
      }

      try {
        const [notesData, { data: residentsData }] = await Promise.all([
          multidisciplinaryService.getAllNotes(profile.active_organization_id),
          supabase
            .from("residents")
            .select("id, first_name, last_name")
            .eq("organization_id", profile.active_organization_id)
            .eq("status", "active")
        ]);

        setNotes(notesData || []);
        setResidents(residentsData || []);
      } catch (error) {
        console.error("Failed to load summary data:", error);
        toast.error("Failed to load multidisciplinary notes");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [profile, isAuthorized, supabase]);

  // Filters & Search logic
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.residentName.toLowerCase().includes(q) ||
        n.teamMemberName.toLowerCase().includes(q) ||
        (n.profession && n.profession.toLowerCase().includes(q)) ||
        n.reasonForVisit.toLowerCase().includes(q) ||
        n.outcome.toLowerCase().includes(q) ||
        n.signature.toLowerCase().includes(q)
      );
    }

    // Profession filter
    if (selectedProfession !== "all") {
      result = result.filter(n => n.profession === selectedProfession);
    }

    // Resident filter
    if (selectedResident !== "all") {
      result = result.filter(n => n.residentId === selectedResident);
    }

    // Date filter (exact match of YYYY-MM-DD)
    if (selectedDate) {
      result = result.filter(n => n.noteDate === selectedDate);
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(`${a.noteDate}T${a.noteTime || "00:00:00"}`).getTime();
      const timeB = new Date(`${b.noteDate}T${b.noteTime || "00:00:00"}`).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [notes, searchQuery, selectedProfession, selectedResident, selectedDate, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotes.slice(start, start + itemsPerPage);
  }, [filteredNotes, currentPage]);

  const handlePrint = () => {
    window.print();
  };

  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setIsViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-900"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You do not have the required permissions to view the MDT Summary portal.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5 print:hidden">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-indigo-600" /> MDT Summary View
            </h1>
            <p className="text-sm text-gray-500">
              Consolidated logs of all multi-disciplinary team interactions and visits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print View
          </Button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-center">MDT interactions visit log summary report</h1>
        <p className="text-center text-xs text-gray-500">Generated on {format(new Date(), "PPpp")}</p>
      </div>

      {/* Search & Filters */}
      <Card className="shadow-none border border-gray-150 print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-indigo-500" /> Filter Interactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500">Search Keywords</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Reason, outcome, signer..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            {/* Profession Dropdown */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500">Profession Folder</span>
              <Select
                value={selectedProfession}
                onValueChange={(val) => {
                  setSelectedProfession(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All folders..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {MDT_PROFESSIONS.map((prof) => (
                    <SelectItem key={prof} value={prof}>
                      {prof}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resident Dropdown */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500">Resident</span>
              <Select
                value={selectedResident}
                onValueChange={(val) => {
                  setSelectedResident(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All residents..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Residents</SelectItem>
                  {residents.map((res) => (
                    <SelectItem key={res.id} value={res.id}>
                      {res.first_name} {res.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500">Specific Date</span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="shadow-none border border-gray-150 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold text-gray-700 py-3.5 pl-6">Date & Time</TableHead>
                <TableHead className="font-semibold text-gray-700">Resident</TableHead>
                <TableHead className="font-semibold text-gray-700">Professional Name</TableHead>
                <TableHead className="font-semibold text-gray-700">Profession</TableHead>
                <TableHead className="font-semibold text-gray-700">Outcome/Reason Summary</TableHead>
                <TableHead className="font-semibold text-gray-700 print:hidden text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No MDT interactions found matching the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedNotes.map((note) => (
                  <TableRow key={note.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900 py-4 pl-6">
                      <div className="text-sm">{format(new Date(note.noteDate), "dd/MM/yyyy")}</div>
                      <div className="text-xs text-gray-400 font-normal">{note.noteTime || "--:--"}</div>
                    </TableCell>
                    <TableCell className="font-medium text-indigo-900">
                      {note.residentName}
                    </TableCell>
                    <TableCell className="text-gray-700 font-semibold">{note.teamMemberName}</TableCell>
                    <TableCell>
                      <Badge className="bg-indigo-50 hover:bg-indigo-50 border-0 text-indigo-700 text-[10px] px-2 rounded-full">
                        {note.profession || "Other"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm font-semibold text-gray-800 line-clamp-1">
                        Visit Reason: {note.reasonForVisit}
                      </div>
                      <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        Outcome: {note.outcome}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 print:hidden">
                      <Button variant="ghost" size="sm" onClick={() => handleViewNote(note)} className="h-8 hover:bg-indigo-50 hover:text-indigo-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t print:hidden bg-white">
              <span className="text-sm text-gray-500">
                Showing page {currentPage} of {totalPages} ({filteredNotes.length} total entries)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-indigo-900 border-b pb-3 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> Multidisciplinary Interaction Details
            </DialogTitle>
            <DialogDescription>
              Complete details of the multidisciplinary visit record.
            </DialogDescription>
          </DialogHeader>

          {selectedNote && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Resident</p>
                  <p className="font-semibold text-indigo-900 text-sm mt-0.5">{selectedNote.residentName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Date & Time</p>
                  <p className="font-semibold text-gray-800 text-sm mt-0.5">
                    {format(new Date(selectedNote.noteDate), "PPP")} at {selectedNote.noteTime || "--:--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Professional Name</p>
                  <p className="font-semibold text-gray-855 text-sm mt-0.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500" /> {selectedNote.teamMemberName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">MDT Profession Folder</p>
                  <p className="mt-1">
                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-0">{selectedNote.profession || "Other"}</Badge>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-gray-800">Reason for Visit</h4>
                  <div className="p-3.5 bg-white border rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.reasonForVisit}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-gray-800">Outcome & Clinical Recommendations</h4>
                  <div className="p-3.5 bg-white border rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.outcome}
                  </div>
                </div>

                {selectedNote.relativeInformedDetails && (
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-semibold text-gray-800">Relative Contact & Notification Details</h4>
                    <div className="p-3.5 bg-white border rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedNote.relativeInformedDetails}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-4 text-xs text-gray-500 bg-gray-50/50 p-4 rounded-b-xl border">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-600">Digital Signature:</span> {selectedNote.signature}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-600">Created At:</span> {format(new Date(selectedNote.createdAt), "PPpp")}
                  </span>
                </div>
                <Badge variant="outline" className={`${selectedNote.relativeInformed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  Relative {selectedNote.relativeInformed ? 'Informed' : 'Not Informed'}
                </Badge>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
