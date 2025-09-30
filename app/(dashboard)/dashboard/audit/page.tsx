"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const governanceItems = [
  "Reg 29 Monthly Monitoring Visit & Action Plan",
  "Annual Governance/Quality Report",
  "Reg 30 Notifiable Events compliance",
  "Complaints – trend analysis & learning",
  "Incidents/Near Misses – trend analysis & learning",
  "Safeguarding – ASC annual position report & training coverage",
  "Service User / Relative Feedback – surveys, meetings, forums",
  "Staff Training / Supervision audit",
  "Policies & Procedures compliance",
];

const clinicalItems = [
  "Medicines Management (overall, including CD balance checks)",
  "Infection Prevention & Control – hand hygiene, environment, PPE, decontamination",
  "Mattress Supervision / Integrity audits",
];

const environmentItems = [
  "Fire Safety – FRA, drills, PEEPs, alarm & emergency lighting testing",
  "Legionella – risk assessment, flushing, temperatures, descaling, logs",
  "LOLER – hoists/slings servicing (6-monthly thorough examination)",
  "Medical Devices – servicing, decontamination, incident logs",
  "Electrical Safety – EICR, PAT (risk-based)",
  "Gas Safety – annual Gas Safe certificates",
  "Food Safety – HACCP system, temps, cleaning, allergens, diary verification",
];

const AuditTable = ({ items, category }: { items: string[]; category: string }) => {
  const router = useRouter();
  const [rowStatuses, setRowStatuses] = useState<Record<number, string>>(
    items.reduce((acc, _, index) => ({ ...acc, [index]: "pending" }), {})
  );

  const handleViewClick = (itemName: string) => {
    const itemId = encodeURIComponent(itemName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'));
    router.push(`/dashboard/audit/${category}/${itemId}`);
  };

  const handleStatusChange = (index: number, status: string) => {
    setRowStatuses(prev => ({ ...prev, [index]: status }));
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-50/50 hover:bg-gray-50/50";
      case "in-progress":
        return "bg-blue-50/50 hover:bg-blue-50/50";
      case "completed":
        return "bg-green-50/50 hover:bg-green-50/50";
      case "overdue":
        return "bg-red-50/50 hover:bg-red-50/50";
      case "not-applicable":
        return "bg-purple-50/50 hover:bg-purple-50/50";
      default:
        return "";
    }
  };

  return (
    <div className="w-full">
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
          {items.map((item, index) => (
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
    </div>
  );
};

export default function AuditPage() {
  return (
    <div className="w-full">
      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Audit Management</p>
        <p className="text-sm text-muted-foreground">
          Manage and track care audits
        </p>
      </div>

      <Tabs defaultValue="governance" className="w-full">
        <TabsList>
          <TabsTrigger value="governance">Governance & Compliance</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Care & Medicines</TabsTrigger>
          <TabsTrigger value="environment">Environment & Safety</TabsTrigger>
        </TabsList>

        <TabsContent value="governance" className="mt-4">
          <AuditTable items={governanceItems} category="governance" />
        </TabsContent>

        <TabsContent value="clinical" className="mt-4">
          <AuditTable items={clinicalItems} category="clinical" />
        </TabsContent>

        <TabsContent value="environment" className="mt-4">
          <AuditTable items={environmentItems} category="environment" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
