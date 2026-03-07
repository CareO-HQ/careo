"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Eye, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import { withRoleGuard } from "@/lib/route-guards";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

interface HistoryRecord {
  id: string;
  completedDate: string;
  auditor: string;
  frequency: string;
  status: "completed" | "partial";
  notes?: string;
}

interface ResidentCareFileHistoryPageProps {
  params: Promise<{ residentId: string }>;
}

function ResidentCareFileHistoryPage({ params }: ResidentCareFileHistoryPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const residentId = resolvedParams.residentId;

  const [isLoading, setIsLoading] = useState(true);
  const [resident, setResident] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    loadResidentData();
    loadHistory();
  }, [residentId]);

  const loadResidentData = async () => {
    try {
      const { data: resData } = await supabase
        .from('residents')
        .select('*')
        .eq('id', residentId)
        .single();

      if (resData) {
        setResident({
          _id: resData.id,
          firstName: resData.first_name || resData.firstName,
          lastName: resData.last_name || resData.lastName,
          roomNumber: resData.room_number || resData.roomNumber,
          imageUrl: resData.image_url || resData.imageUrl
        });
      }
    } catch (error) {
      console.error("Error loading resident:", error);
      toast.error("Failed to load resident data");
    }
  };

  const loadHistory = async () => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem(`care-file-audit-history-${residentId}`);
    if (savedHistory) {
      setHistoryRecords(JSON.parse(savedHistory));
    } else {
      // Mock data for demonstration
      setHistoryRecords([
        {
          id: "1",
          completedDate: new Date(2024, 0, 15).toISOString(),
          auditor: "Jane Smith",
          frequency: "monthly",
          status: "completed",
          notes: "All documentation up to date"
        },
        {
          id: "2",
          completedDate: new Date(2023, 11, 15).toISOString(),
          auditor: "John Doe",
          frequency: "monthly",
          status: "completed",
          notes: "Minor updates required"
        },
      ]);
    }
    setIsLoading(false);
  };

  const handleBack = () => {
    router.push("/dashboard/manager-audit");
  };

  const handleViewReport = (recordId: string) => {
    toast.info("Opening detailed report...");
    // Navigate to specific report view
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/history/${recordId}`);
  };

  const handleDownloadReport = (recordId: string) => {
    toast.success("Downloading report...");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center space-x-3">
            {resident && (
              <>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={resident.imageUrl} />
                  <AvatarFallback className="text-sm">
                    {resident.firstName[0]}{resident.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {resident.firstName} {resident.lastName}
                  </h2>
                  <p className="text-muted-foreground">
                    Care File Audit History {resident.roomNumber && `• Room ${resident.roomNumber}`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <Badge variant="outline">{historyRecords.length} Previous Audits</Badge>
      </div>

      {/* History Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px] font-semibold">Completed Date</TableHead>
              <TableHead className="font-semibold">Auditor</TableHead>
              <TableHead className="w-[120px] font-semibold">Frequency</TableHead>
              <TableHead className="w-[120px] font-semibold">Status</TableHead>
              <TableHead className="w-[300px] font-semibold">Notes</TableHead>
              <TableHead className="text-right w-[150px] font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-sm text-muted-foreground">No audit history found for this resident.</p>
                    <p className="text-xs text-muted-foreground">
                      Complete a care file audit to see history here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              historyRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(record.completedDate), "PPP")}</span>
                    </div>
                  </TableCell>
                  <TableCell>{record.auditor}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      record.frequency === "monthly" ? "text-blue-600" :
                      record.frequency === "quarterly" ? "text-green-600" :
                      record.frequency === "6month" ? "text-orange-600" :
                      "text-purple-600"
                    }>
                      {record.frequency}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.status === "completed" ? "default" : "secondary"}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReport(record.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReport(record.id)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {historyRecords.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Showing {historyRecords.length} completed audit{historyRecords.length !== 1 ? 's' : ''}</p>
          <p>Most recent audit: {format(new Date(historyRecords[0].completedDate), "PPP")}</p>
        </div>
      )}
    </div>
  );
}

export default withRoleGuard(ResidentCareFileHistoryPage, ["manager", "admin", "owner"]);
