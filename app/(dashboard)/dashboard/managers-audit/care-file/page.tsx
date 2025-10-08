"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Resident } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAge } from "@/lib/utils";

export default function CareFileAuditPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  const [auditData, setAuditData] = useState<Record<string, {
    lastAudited: string;
    dueDate: string;
    responsibleStaff: string;
  }>>({});

  const handleLastAuditedChange = (residentId: string, date: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        lastAudited: date
      }
    }));
  };

  const handleDueDateChange = (residentId: string, date: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        dueDate: date
      }
    }));
  };

  const handleResponsibleStaffChange = (residentId: string, staff: string) => {
    setAuditData(prev => ({
      ...prev,
      [residentId]: {
        ...prev[residentId],
        responsibleStaff: staff
      }
    }));
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/managers-audit?tab=care-file')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Care File Audit</h1>
          <p className="text-sm text-muted-foreground">
            Care File Audit {activeTeam?.name && `• ${activeTeam.name}`}
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50">
              <TableHead className="h-11 text-xs font-medium">Name</TableHead>
              <TableHead className="h-11 w-48 text-xs font-medium">Last Audited</TableHead>
              <TableHead className="h-11 w-48 text-xs font-medium">Due Date</TableHead>
              <TableHead className="h-11 w-48 text-xs font-medium">Responsible Staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {residents?.map((resident) => {
              const name = `${resident.firstName} ${resident.lastName}`;
              const initials = getInitials(name);
              const age = getAge(resident.dateOfBirth);
              const residentId = resident._id;

              return (
                <TableRow key={residentId} className="border-b last:border-0">
                  <TableCell className="h-14">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={resident.imageUrl} alt={name} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">{age} years</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="h-14">
                    <input
                      type="date"
                      value={auditData[residentId]?.lastAudited || ''}
                      onChange={(e) => handleLastAuditedChange(residentId, e.target.value)}
                      className="text-[13px] border-0 bg-transparent focus:outline-none focus:ring-0"
                    />
                  </TableCell>
                  <TableCell className="h-14">
                    <input
                      type="date"
                      value={auditData[residentId]?.dueDate || ''}
                      onChange={(e) => handleDueDateChange(residentId, e.target.value)}
                      className="text-[13px] border-0 bg-transparent focus:outline-none focus:ring-0"
                    />
                  </TableCell>
                  <TableCell className="h-14">
                    <Select
                      value={auditData[residentId]?.responsibleStaff || ''}
                      onValueChange={(value) => handleResponsibleStaffChange(residentId, value)}
                    >
                      <SelectTrigger className="h-auto w-auto text-[13px] border-0 shadow-none bg-transparent p-0 hover:opacity-80 focus-visible:ring-0 focus-visible:ring-offset-0">
                        {auditData[residentId]?.responsibleStaff ? (
                          <Badge variant="outline" className="bg-white text-foreground text-[13px] px-2 py-0.5 h-6 font-normal">
                            {auditData[residentId].responsibleStaff}
                          </Badge>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">Select staff</span>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
