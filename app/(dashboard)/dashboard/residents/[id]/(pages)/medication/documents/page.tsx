"use client";

import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Resident } from "@/types";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Calendar,
  FileText,
  Filter,
  Download,
  Eye,
  Pill,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type MedicationDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

type MedicationReportByDate = {
  date: string;
  formattedDate: string;
  totalCount: number;
  administeredCount: number;
  missedCount: number;
  refusedCount: number;
  logs: any[];
};

export default function MedicationDocumentsPage({ params }: MedicationDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  // State
  const [resident, setResident] = useState<Resident | null>(null);
  const [allIntakes, setAllIntakes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Dialog state
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: residentData } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();
        if (residentData) setResident(residentData as Resident);

        const { data: intakes } = await supabase
          .from("medication_intakes")
          .select(`
            *,
            medication:medication_id (*),
            administered_by:administered_by_id (name)
          `)
          .eq("resident_id", id);
        setAllIntakes(intakes || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Grouped Reports (by date)
  const reportObjects = useMemo(() => {
    if (!allIntakes.length) return [];

    const grouped = allIntakes.reduce((acc, intake) => {
      const date = format(new Date(intake.scheduled_time), "yyyy-MM-dd");
      if (!acc[date]) {
        acc[date] = {
          date,
          formattedDate: format(new Date(intake.scheduled_time), "PPP"),
          totalCount: 0,
          administeredCount: 0,
          missedCount: 0,
          refusedCount: 0,
          logs: []
        };
      }
      acc[date].totalCount++;
      if (intake.status === "administered" || intake.status === "given") acc[date].administeredCount++;
      else if (intake.status === "missed") acc[date].missedCount++;
      else if (intake.status === "refused") acc[date].refusedCount++;

      acc[date].logs.push({
        medicationName: intake.medication?.name || "N/A",
        dosage: `${intake.medication?.strength} ${intake.medication?.strength_unit}`,
        route: intake.medication?.route || "N/A",
        scheduledTime: format(new Date(intake.scheduled_time), "HH:mm"),
        administeredTime: intake.administered_at ? format(new Date(intake.administered_at), "HH:mm") : undefined,
        status: intake.status,
        signature: intake.administered_by?.name || "-",
        notes: intake.comment || undefined
      });
      return acc;
    }, {} as Record<string, MedicationReportByDate>);

    return Object.values(grouped) as MedicationReportByDate[];
  }, [allIntakes]);

  // Filter and sort
  const filteredReports = useMemo(() => {
    let filtered: MedicationReportByDate[] = [...reportObjects];

    if (selectedYear !== "all") {
      filtered = filtered.filter(report => new Date(report.date).getFullYear() === parseInt(selectedYear));
    }
    if (selectedMonth !== "all") {
      filtered = filtered.filter(report => new Date(report.date).getMonth() === parseInt(selectedMonth));
    }
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.date.includes(searchQuery)
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [reportObjects, searchQuery, selectedYear, selectedMonth, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const totalCount = filteredReports.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredReports.length) return;
    const headers = ["Date", "Total", "Administered", "Missed", "Refused"];
    const rows = filteredReports.map(r => [r.date, r.totalCount, r.administeredCount, r.missedCount, r.refusedCount]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medication-reports-${resident?.first_name}-${resident?.last_name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p>Loading reports...</p></div>;
  }

  if (!resident) {
    return <div className="flex items-center justify-center h-64"><p>Resident not found</p></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}/medication`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg"><Pill className="w-6 h-6 text-purple-600" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Medication Administration Records</h1>
            <p className="text-muted-foreground text-sm">MAR for {resident.first_name} {resident.last_name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-purple-50/50 border-purple-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm font-medium text-purple-700">Total Days</p><p className="text-2xl font-bold text-purple-900">{filteredReports.length}</p></div>
            <FileText className="w-8 h-8 text-purple-200" />
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm font-medium text-green-700">Administered</p><p className="text-2xl font-bold text-green-900">{filteredReports.reduce((s, r) => s + r.administeredCount, 0)}</p></div>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">✓</Badge>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm font-medium text-red-700">Missed/Refused</p><p className="text-2xl font-bold text-red-900">{filteredReports.reduce((s, r) => s + r.missedCount + r.refusedCount, 0)}</p></div>
            <AlertCircle className="w-8 h-8 text-red-200" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Filter Reports</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredReports.length === 0}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search dates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), "MMMM")}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center text-green-600">Admin</TableHead>
              <TableHead className="text-center text-red-600">Missed/Ref</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReports.map((report) => (
              <TableRow key={report.date}>
                <TableCell className="font-medium">{report.formattedDate}</TableCell>
                <TableCell className="text-center"><Badge variant="secondary">{report.totalCount}</Badge></TableCell>
                <TableCell className="text-center font-semibold text-green-600">{report.administeredCount}</TableCell>
                <TableCell className="text-center font-semibold text-red-600">{report.missedCount + report.refusedCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleViewReport(report)}><Eye className="w-4 h-4 mr-2" />View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MAR - {selectedReport?.formattedDate}</DialogTitle>
            <DialogDescription>Administrations for this date</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReport?.logs.map((log: any, i: number) => (
              <div key={i} className="p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold">{log.medicationName}</h4>
                    <p className="text-xs text-muted-foreground">{log.dosage} • {log.route}</p>
                  </div>
                  <Badge variant={log.status === 'administered' || log.status === 'given' ? "default" : "destructive"}>{log.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div><span className="text-muted-foreground">Scheduled:</span> {log.scheduledTime}</div>
                  <div><span className="text-muted-foreground">Administered:</span> {log.administeredTime || "-"}</div>
                  <div><span className="text-muted-foreground">By:</span> {log.signature}</div>
                </div>
                {log.notes && <p className="mt-2 text-xs italic text-muted-foreground">Note: {log.notes}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
