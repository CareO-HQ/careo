"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
  User,
  FileText,
  Filter,
  Download,
  Eye,
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

type SocialActivitiesDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function SocialActivitiesDocumentsPage({ params }: SocialActivitiesDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Dialog state
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Fetch all social activities for this resident
  const allActivities = useQuery(api.socialActivities.getSocialActivitiesByResidentId, {
    residentId,
  });

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from activities
  const availableYears = useMemo(() => {
    if (!allActivities || allActivities.length === 0) {
      const currentYear = new Date().getFullYear();
      return [currentYear, currentYear - 1];
    }
    const years = new Set<number>();
    allActivities.forEach((activity: any) => {
      const year = new Date(activity.activityDate).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allActivities]);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    if (!allActivities) return [];

    const grouped = new Map<string, any[]>();

    allActivities.forEach((activity: any) => {
      const date = activity.activityDate;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(activity);
    });

    return Array.from(grouped.entries()).map(([date, activities]) => ({
      date,
      formattedDate: format(new Date(date), "PPP"),
      activities,
      count: activities.length,
    }));
  }, [allActivities]);

  // Filter and sort
  const filteredReports = useMemo(() => {
    if (!activitiesByDate) return [];

    let filtered = [...activitiesByDate];

    // Filter by year
    if (selectedYear !== "all") {
      filtered = filtered.filter(report => {
        const year = new Date(report.date).getFullYear();
        return year === parseInt(selectedYear);
      });
    }

    // Filter by month
    if (selectedMonth !== "all") {
      filtered = filtered.filter(report => {
        const month = new Date(report.date).getMonth();
        return month === parseInt(selectedMonth);
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.date.includes(searchQuery)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [activitiesByDate, selectedYear, selectedMonth, searchQuery, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredReports.length);
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Stats
  const reportStats = useMemo(() => {
    if (!allActivities) return { total: 0, thisMonth: 0, thisWeek: 0 };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thisMonth = allActivities.filter((activity: any) => {
      const activityDate = new Date(activity.activityDate);
      return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
    }).length;

    const thisWeek = allActivities.filter((activity: any) => {
      const activityDate = new Date(activity.activityDate);
      return activityDate >= oneWeekAgo;
    }).length;

    return {
      total: activitiesByDate.length,
      totalActivities: allActivities.length,
      thisMonth,
      thisWeek,
    };
  }, [allActivities, activitiesByDate]);

  // Handlers
  const handleViewReport = (report: any) => {
    setSelectedDate(report);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const headers = ["Date", "Activities Count", "Activity Names"];
    const rows = filteredReports.map(report => [
      report.date,
      report.count.toString(),
      report.activities.map((a: any) => a.activityName).join("; ")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `social-activities-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReport = (report: any) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    const htmlContent = generatePDFContent({
      resident,
      activities: report.activities,
      date: report.date
    });

    generatePDFFromHTML(htmlContent);
    toast.success(`Social activities report will open for printing`);
  };

  const generatePDFContent = ({ resident, activities, date }: { resident: any; activities: any[]; date: string; }) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="header">
        <h1>Daily Social Activities Report</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Report Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Total Activities</h3>
          <p>${activities.length}</p>
        </div>
      </div>

      <div class="activities">
        <h2>Activities</h2>
        ${activities && activities.length > 0
          ? activities.map((activity: any) => `
              <div class="log-entry">
                <strong>${activity.activityName}</strong> (${activity.activityType.replace(/_/g, ' ')})<br>
                Time: ${activity.activityTime}<br>
                ${activity.location ? `Location: ${activity.location}<br>` : ''}
                ${activity.engagementLevel ? `Engagement: ${activity.engagementLevel.replace(/_/g, ' ')}<br>` : ''}
                Recorded by: ${activity.recordedBy}
              </div>
            `).join('')
          : '<p>No activities recorded for this date.</p>'
        }
      </div>
    `;
  };

  const generatePDFFromHTML = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Social Activities Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
            .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; }
            .log-entry { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            h1 { margin: 0; }
            h2 { margin-top: 20px; }
            h3 { margin: 0; font-size: 14px; color: #666; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!resident || !allActivities) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading social activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}/lifestyle-social`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Lifestyle & Social
        </Button>
        <span>/</span>
        <span className="text-foreground">All Reports</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/lifestyle-social`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Social Activities History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of social activities for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Days</p>
                <p className="text-2xl font-bold text-purple-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">{reportStats.thisMonth}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">This Week</p>
                <p className="text-2xl font-bold text-blue-900">{reportStats.thisWeek}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700">Total Activities</p>
                <p className="text-2xl font-bold text-cyan-900">{reportStats.totalActivities}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Activity className="w-5 h-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filter Reports</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredReports.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by date..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedMonth} onValueChange={(value) => {
              setSelectedMonth(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="0">January</SelectItem>
                <SelectItem value="1">February</SelectItem>
                <SelectItem value="2">March</SelectItem>
                <SelectItem value="3">April</SelectItem>
                <SelectItem value="4">May</SelectItem>
                <SelectItem value="5">June</SelectItem>
                <SelectItem value="6">July</SelectItem>
                <SelectItem value="7">August</SelectItem>
                <SelectItem value="8">September</SelectItem>
                <SelectItem value="9">October</SelectItem>
                <SelectItem value="10">November</SelectItem>
                <SelectItem value="11">December</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={(value) => {
              setSelectedYear(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Activities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No activities found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReports.map((report) => (
                  <TableRow key={report.date}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{report.formattedDate}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                        {report.count} {report.count === 1 ? 'activity' : 'activities'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex} of {filteredReports.length} reports
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Social Activities - {selectedDate?.formattedDate}</DialogTitle>
            <DialogDescription>
              Detailed view of all activities for this date
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 ${(selectedDate?.activities?.length || 0) > 2 ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
            {selectedDate?.activities.map((activity: any, index: number) => (
              <div key={activity._id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{activity.activityName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {activity.activityType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.activityTime}</span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                  {activity.location && (
                    <span><span className="font-medium">Location:</span> {activity.location}</span>
                  )}
                  {activity.participants && (
                    <span><span className="font-medium">Participants:</span> {activity.participants}</span>
                  )}
                  {activity.duration && (
                    <span><span className="font-medium">Duration:</span> {activity.duration}</span>
                  )}
                  {activity.engagementLevel && (
                    <span><span className="font-medium">Engagement:</span> {activity.engagementLevel.replace(/_/g, ' ')}</span>
                  )}
                  {activity.moodBefore && (
                    <span><span className="font-medium">Mood Before:</span> {activity.moodBefore.replace(/_/g, ' ')}</span>
                  )}
                  {activity.moodAfter && (
                    <span><span className="font-medium">Mood After:</span> {activity.moodAfter.replace(/_/g, ' ')}</span>
                  )}
                  {activity.socialInteraction && (
                    <span><span className="font-medium">Social:</span> {activity.socialInteraction.replace(/_/g, ' ')}</span>
                  )}
                  {activity.enjoyment && (
                    <span><span className="font-medium">Enjoyment:</span> {activity.enjoyment.replace(/_/g, ' ')}</span>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  Recorded by: {activity.recordedBy}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
