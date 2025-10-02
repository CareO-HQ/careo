"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [rowStatuses, setRowStatuses] = useState<Record<number, string>>({});
  const [auditorNames, setAuditorNames] = useState<Record<number, string>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(`home-audit-${category}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setRowStatuses(parsed.rowStatuses || {});
        setAuditorNames(parsed.auditorNames || {});
      } catch (error) {
        console.error("Failed to load audit data from localStorage:", error);
      }
    } else {
      // Initialize with pending status if no saved data
      setRowStatuses(items.reduce((acc, _, index) => ({ ...acc, [index]: "pending" }), {}));
    }
    setIsLoaded(true);
  }, [category, items]);

  // Save data to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (!isLoaded) return;

    const dataToSave = {
      rowStatuses,
      auditorNames,
    };
    localStorage.setItem(`home-audit-${category}`, JSON.stringify(dataToSave));
  }, [category, isLoaded, rowStatuses, auditorNames]);

  const handleViewClick = (itemName: string) => {
    const itemId = encodeURIComponent(itemName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'));
    router.push(`/dashboard/home-audit/${category}/${itemId}`);
  };

  const handleStatusChange = (index: number, status: string) => {
    setRowStatuses(prev => ({ ...prev, [index]: status }));
  };

  const handleAuditorChange = (index: number, auditor: string) => {
    setAuditorNames(prev => ({ ...prev, [index]: auditor }));
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
      'n/a': 6,
    };
    return order[status] || 999;
  };

  const getSortedItems = () => {
    const itemsWithIndex = items.map((item, index) => ({ item, index }));

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

  return (
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
                rowStatuses[index] === "n/a" ? "text-gray-600" :
                rowStatuses[index] === "pending" ? "text-foreground" :
                rowStatuses[index] === "in-progress" ? "text-blue-600" :
                rowStatuses[index] === "completed" ? "text-green-600" :
                rowStatuses[index] === "overdue" ? "text-red-600" :
                rowStatuses[index] === "not-applicable" ? "text-purple-600" :
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
                        rowStatuses[index] === "n/a" ? "bg-gray-100 text-gray-700" :
                        rowStatuses[index] === "pending" ? "bg-yellow-100 text-yellow-700" :
                        rowStatuses[index] === "in-progress" ? "bg-blue-100 text-blue-700" :
                        rowStatuses[index] === "completed" ? "bg-green-100 text-green-700" :
                        rowStatuses[index] === "overdue" ? "bg-red-100 text-red-700" :
                        rowStatuses[index] === "not-applicable" ? "bg-purple-100 text-purple-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      <SelectValue />
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n/a">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-[13px] px-2 py-0.5 h-6 font-normal">
                        N/A
                      </Badge>
                    </SelectItem>
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
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[13px] px-2 py-0.5 h-6 font-normal">
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
  );
};

export default function AuditPage() {
  return (
    <div className="w-full">
      <div className="flex flex-col mb-6">
        <p className="font-semibold text-xl">Home Audit</p>
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
