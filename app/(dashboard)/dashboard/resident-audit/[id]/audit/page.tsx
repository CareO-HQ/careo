"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ClipboardList, Calendar as CalendarIcon2, ArrowUpDown, FileText } from "lucide-react";

type AuditPageProps = {
  params: Promise<{ id: string }>;
};

const auditItems = [
  "Care File Audit",
  "Nutrition & Weight Audit",
  "Wounds / Tissue Viability Audit",
  "Incident and Accident Analysis",
  "Restrictive Practices Audit",
  "Medication administration / MAR Audit",
  "Resident Experience ",
  "DNACPR Audit",
  "Choking Risk Audit",
  "Diet Notification Form Audit",
  "Post Fall Management Tracker",
  "Bedrail Audit",
  "Moving & Handling Audit",
  "DOLS Tracker",
  "Care Management Reviews",
  "Meaningful Activities Audit",
];

export default function AuditPage({ params }: AuditPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [rowStatuses, setRowStatuses] = useState<Record<number, string>>({});
  const [auditorNames, setAuditorNames] = useState<Record<number, string>>({});
  const [lastAuditedDates, setLastAuditedDates] = useState<Record<number, string>>({});
  const [dueDates, setDueDates] = useState<Record<number, string>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(`resident-audit-${id}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setRowStatuses(parsed.rowStatuses || {});
        setAuditorNames(parsed.auditorNames || {});
        setLastAuditedDates(parsed.lastAuditedDates || {});
        setDueDates(parsed.dueDates || {});
      } catch (error) {
        console.error("Failed to load audit data from localStorage:", error);
      }
    }
    setIsLoaded(true);
  }, [id]);

  // Save data to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (!isLoaded) return;

    const dataToSave = {
      rowStatuses,
      auditorNames,
      lastAuditedDates,
      dueDates,
    };
    localStorage.setItem(`resident-audit-${id}`, JSON.stringify(dataToSave));
  }, [id, isLoaded, rowStatuses, auditorNames, lastAuditedDates, dueDates]);

  // Get resident data
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const handleStatusChange = (index: number, status: string) => {
    setRowStatuses(prev => ({ ...prev, [index]: status }));
  };

  const handleAuditorChange = (index: number, auditorName: string) => {
    setAuditorNames(prev => ({ ...prev, [index]: auditorName }));
  };

  const handleSortByStatus = () => {
    if (sortOrder === null || sortOrder === 'desc') {
      setSortOrder('asc');
    } else {
      setSortOrder('desc');
    }
  };

  const getStatusOrder = (status: string) => {
    const order: Record<string, number> = {
      'overdue': 1,
      'in-progress': 2,
      'pending': 3,
      'completed': 4,
      'not-applicable': 5,
    };
    return order[status] || 999;
  };

  const getSortedItems = () => {
    const itemsWithIndex = auditItems.map((item, index) => ({ item, index }));

    if (sortOrder === null) {
      return itemsWithIndex;
    }

    return itemsWithIndex.sort((a, b) => {
      const statusA = rowStatuses[a.index] || 'pending';
      const statusB = rowStatuses[b.index] || 'pending';
      const orderA = getStatusOrder(statusA);
      const orderB = getStatusOrder(statusB);

      if (sortOrder === 'asc') {
        return orderA - orderB;
      } else {
        return orderB - orderA;
      }
    });
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case "not-applicable":
        return "bg-gray-900 hover:bg-gray-900";
      case "pending":
        return "bg-gray-100 hover:bg-gray-100";
      case "in-progress":
        return "bg-blue-100 hover:bg-blue-100";
      case "completed":
        return "bg-green-100 hover:bg-green-100";
      case "overdue":
        return "bg-red-100 hover:bg-red-100";
      default:
        return "";
    }
  };

  const handleViewClick = (itemName: string) => {
    const itemId = encodeURIComponent(itemName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'));
    router.push(`/dashboard/resident-audit/${id}/audit/${itemId}`);
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

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading audit...</p>
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
    <div className="w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/resident-audit`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Resident Audit
        </Button>
        <span>/</span>
        <span className="text-foreground">{fullName}</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Resident Audit</h1>
              <p className="text-muted-foreground text-sm">Care quality audits & documentation</p>
            </div>
          </div>
        </div>

        {/* Resident Avatar and Name */}
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
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
            <p className="font-semibold text-sm">{fullName}</p>
            <p className="text-xs text-muted-foreground">Room {resident.roomNumber || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Audit Report Button */}
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          className="gap-2 bg-black text-white hover:bg-black/90"
          onClick={() => router.push(`/dashboard/resident-audit/${id}/audit-report`)}
        >
          <FileText className="h-4 w-4" />
          Audit Report
        </Button>
      </div>

      {/* Audit Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50">
              <TableHead className="h-11 w-12 text-xs font-medium">No</TableHead>
              <TableHead className="h-11 text-xs font-medium">Audit Item</TableHead>
              <TableHead className="h-11 w-40 text-xs font-medium">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2 hover:bg-transparent"
                  onClick={handleSortByStatus}
                >
                  Status
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="h-11 w-48 text-xs font-medium">Auditor Name</TableHead>
              <TableHead className="h-11 w-40 text-xs font-medium">Last Audited Date</TableHead>
              <TableHead className="h-11 w-40 text-xs font-medium">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getSortedItems().map(({ item, index }, displayIndex) => (
              <TableRow
                key={index}
                className="cursor-pointer hover:bg-muted/30 border-b last:border-0"
                onClick={() => handleViewClick(item)}
              >
                <TableCell className="h-14 text-[13px] text-muted-foreground">{displayIndex + 1}</TableCell>
                <TableCell className={`h-14 text-[13px] font-normal hover:text-primary ${
                  rowStatuses[index] === "not-applicable" ? "text-black" :
                  rowStatuses[index] === "pending" ? "text-foreground" :
                  rowStatuses[index] === "in-progress" ? "text-blue-600" :
                  rowStatuses[index] === "completed" ? "text-green-600" :
                  rowStatuses[index] === "overdue" ? "text-red-600" :
                  ""
                }`}>
                  {item}
                </TableCell>
                <TableCell className="h-14" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={rowStatuses[index] || "pending"}
                    onValueChange={(value) => handleStatusChange(index, value)}
                  >
                    <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80">
                      <Badge
                        variant="secondary"
                        className={`text-[13px] px-2 py-0.5 h-6 font-normal ${
                          rowStatuses[index] === "not-applicable" ? "bg-black text-white" :
                          rowStatuses[index] === "pending" ? "bg-yellow-100 text-yellow-700" :
                          rowStatuses[index] === "in-progress" ? "bg-blue-100 text-blue-700" :
                          rowStatuses[index] === "completed" ? "bg-green-100 text-green-700" :
                          rowStatuses[index] === "overdue" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        <SelectValue />
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          Pending
                        </Badge>
                      </SelectItem>
                      <SelectItem value="in-progress">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          In Progress
                        </Badge>
                      </SelectItem>
                      <SelectItem value="completed">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          Completed
                        </Badge>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <Badge variant="secondary" className="bg-red-100 text-red-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                          Overdue
                        </Badge>
                      </SelectItem>
                      <SelectItem value="not-applicable">
                        <Badge variant="secondary" className="bg-black text-white text-[13px] px-2 py-0.5 h-6 font-normal">
                          Not Applicable
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="h-14" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={auditorNames[index] || ""}
                    onValueChange={(value) => handleAuditorChange(index, value)}
                  >
                    <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80">
                      {auditorNames[index] ? (
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          {auditorNames[index]}
                        </Badge>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">Select auditor</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sarah Johnson">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Sarah Johnson
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Michael Chen">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Michael Chen
                        </Badge>
                      </SelectItem>
                      <SelectItem value="Emma Williams">
                        <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                          Emma Williams
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="h-14">
                  <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                    {new Date(2024, 11, 10 + (index % 7)).toLocaleDateString()}
                  </Badge>
                </TableCell>
                <TableCell className="h-14">
                  <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                    {new Date(2024, 11, 20 + (index % 10)).toLocaleDateString()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
