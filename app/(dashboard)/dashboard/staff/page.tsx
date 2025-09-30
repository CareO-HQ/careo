"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Mail, Phone, Plus, UserCheck, Clock } from "lucide-react";

// Mock data for staff members - Replace with actual data from convex later
const mockStaff = [
  {
    id: "1",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@careo.com",
    phone: "+44 7123 456789",
    role: "Care Manager",
    department: "Care Team",
    shift: "Day Shift",
    status: "Active",
    avatar: null,
  },
  {
    id: "2",
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@careo.com",
    phone: "+44 7234 567890",
    role: "Senior Carer",
    department: "Care Team",
    shift: "Night Shift",
    status: "Active",
    avatar: null,
  },
  {
    id: "3",
    firstName: "Emma",
    lastName: "Davis",
    email: "emma.davis@careo.com",
    phone: "+44 7345 678901",
    role: "Registered Nurse",
    department: "Medical",
    shift: "Day Shift",
    status: "Active",
    avatar: null,
  },
  {
    id: "4",
    firstName: "James",
    lastName: "Wilson",
    email: "james.wilson@careo.com",
    phone: "+44 7456 789012",
    role: "Care Assistant",
    department: "Care Team",
    shift: "Evening Shift",
    status: "On Leave",
    avatar: null,
  },
  {
    id: "5",
    firstName: "Lisa",
    lastName: "Anderson",
    email: "lisa.anderson@careo.com",
    phone: "+44 7567 890123",
    role: "Activity Coordinator",
    department: "Activities",
    shift: "Day Shift",
    status: "Active",
    avatar: null,
  },
];

export default function StaffPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStaff = mockStaff.filter((staff) =>
    `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-300";
      case "On Leave":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Inactive":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case "Day Shift":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Evening Shift":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "Night Shift":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="text-muted-foreground">Manage your care team members</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStaff.length}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Duty</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStaff.filter(s => s.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Day Shift</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStaff.filter(s => s.shift === "Day Shift").length}</div>
            <p className="text-xs text-muted-foreground">Staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Night Shift</CardTitle>
            <div className="h-2 w-2 rounded-full bg-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStaff.filter(s => s.shift === "Night Shift").length}</div>
            <p className="text-xs text-muted-foreground">Staff members</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Directory</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => {
                const initials = `${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase();
                return (
                  <TableRow key={staff.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={staff.avatar || ""} alt={`${staff.firstName} ${staff.lastName}`} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{staff.firstName} {staff.lastName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{staff.role}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{staff.department}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getShiftColor(staff.shift)}>
                        {staff.shift}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{staff.email}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{staff.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(staff.status)}>
                        {staff.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredStaff.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No staff members found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}