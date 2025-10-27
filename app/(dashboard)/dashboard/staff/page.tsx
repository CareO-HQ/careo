"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Mail, Phone, Plus, X } from "lucide-react";

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
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            {/* Search by name */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 max-w-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {filteredStaff.length} of {mockStaff.length} staff member(s)
            </div>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
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
              {filteredStaff.length ? (
                filteredStaff.map((staff) => {
                  const initials = `${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase();
                  return (
                    <TableRow key={staff.id} className="cursor-pointer hover:bg-muted/50">
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
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">No staff members found matching your search.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
