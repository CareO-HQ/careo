"use client";

import { useState } from "react";
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
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ClipboardList, Calendar as CalendarIcon2 } from "lucide-react";

type AuditPageProps = {
  params: Promise<{ id: string }>;
};

const auditItems = [
  "Care File – assessments, plans, reviews, consent",
  "Nutrition & Weight monitoring trends",
  "Wounds / Tissue Viability (≥ Grade 2 notifications)",
  "Falls – post-falls review + trend logging",
  "Restrictive Practices – oversight, reduction, resident-specific logs",
  "Medication administration errors/resident MAR chart audit",
  "Resident Experience – satisfaction surveys, meeting notes",
];

export default function AuditPage({ params }: AuditPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [rowStatuses, setRowStatuses] = useState<Record<number, string>>(
    auditItems.reduce((acc, _, index) => ({ ...acc, [index]: "pending" }), {})
  );

  // Get resident data
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const handleStatusChange = (index: number, status: string) => {
    setRowStatuses(prev => ({ ...prev, [index]: status }));
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 hover:bg-gray-100";
      case "in-progress":
        return "bg-blue-100 hover:bg-blue-100";
      case "completed":
        return "bg-green-100 hover:bg-green-100";
      case "overdue":
        return "bg-red-100 hover:bg-red-100";
      case "not-applicable":
        return "bg-purple-100 hover:bg-purple-100";
      default:
        return "";
    }
  };

  const handleViewClick = (itemName: string) => {
    const itemId = encodeURIComponent(itemName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'));
    router.push(`/dashboard/residents/${id}/audit/${itemId}`);
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
        <span className="text-foreground">Audit</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
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

      {/* Resident Info Card */}
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
                  <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 text-xs">
                    <ClipboardList className="w-3 h-3 mr-1" />
                    Audit
                  </Badge>
                </div>
              </div>
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
                  <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 text-xs">
                    <ClipboardList className="w-3 h-3 mr-1" />
                    Audit
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card className="border-0">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Audit Item</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-48">Auditor Name</TableHead>
                <TableHead className="w-40">Last Audited Date</TableHead>
                <TableHead className="w-40">Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditItems.map((item, index) => (
                <TableRow
                  key={index}
                  className={`${getRowClassName(rowStatuses[index])} cursor-pointer`}
                  onClick={() => handleViewClick(item)}
                >
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell
                    className="hover:text-primary"
                  >
                    {item}
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue="pending"
                      value={rowStatuses[index]}
                      onValueChange={(value) => handleStatusChange(index, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="in-progress">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            In Progress
                          </span>
                        </SelectItem>
                        <SelectItem value="completed">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Completed
                          </span>
                        </SelectItem>
                        <SelectItem value="overdue">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Overdue
                          </span>
                        </SelectItem>
                        <SelectItem value="not-applicable">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            Not Applicable
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      placeholder="Enter name"
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
