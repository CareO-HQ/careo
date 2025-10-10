"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, ClipboardCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Audit {
  id: string;
  name: string;
  status: "active" | "inactive" | "pending";
  auditor: string;
  lastAudited: string;
  dueDate: string;
  category: string;
}

export default function CareOAuditPage() {
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);

  // Load audits from localStorage on mount
  useEffect(() => {
    const savedAudits = localStorage.getItem('careo-audits');
    if (savedAudits) {
      setAudits(JSON.parse(savedAudits));
    } else {
      // Set default audit if none exist
      const defaultAudits = [
        {
          id: "1",
          name: "Risk Assessment Audit",
          status: "active",
          auditor: "John Smith",
          lastAudited: "2 months ago",
          dueDate: "1 month",
          category: "resident",
        },
      ];
      setAudits(defaultAudits);
      localStorage.setItem('careo-audits', JSON.stringify(defaultAudits));
    }
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("resident");
  const [formData, setFormData] = useState({
    auditName: "",
    auditorName: "",
    frequency: "",
  });

  const handleNewAudit = () => {
    setIsDialogOpen(true);
  };

  const handleCreateAudit = () => {
    if (!formData.auditName || !formData.auditorName || !formData.frequency) {
      return;
    }

    const newAudit: Audit = {
      id: Date.now().toString(),
      name: formData.auditName,
      status: "active",
      auditor: formData.auditorName,
      lastAudited: "Just now",
      dueDate: formData.frequency,
      category: activeTab,
    };

    const updatedAudits = [...audits, newAudit];
    setAudits(updatedAudits);

    // Save to localStorage
    localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));

    setIsDialogOpen(false);
    setFormData({ auditName: "", auditorName: "", frequency: "" });

    // Navigate to the new audit page
    router.push(`/dashboard/careo-audit/${activeTab}/${newAudit.id}`);
  };

  const filteredAudits = audits.filter(audit => audit.category === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          <h1 className="text-xl font-semibold">Audits</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6 py-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="resident">Resident Audit</TabsTrigger>
              <TabsTrigger value="carefile">Care File Audit</TabsTrigger>
              <TabsTrigger value="governance">Governance & Complaints</TabsTrigger>
              <TabsTrigger value="clinical">Clinical Care & Medicines</TabsTrigger>
              <TabsTrigger value="environment">Environment & Safety</TabsTrigger>
            </TabsList>
            <Button onClick={handleNewAudit} size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-2" />
              New Audit
            </Button>
          </div>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <Button variant="ghost" size="sm" className="h-8">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Sort
        </Button>
        <Button variant="ghost" size="sm" className="h-8">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-12">
                <input type="checkbox" className="rounded border-gray-300" />
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Audit</span>
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Auditor</span>
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Last Audited</span>
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1">
                  <span>Due</span>
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAudits.map((audit) => (
              <TableRow key={audit.id} className="hover:bg-muted/50">
                <TableCell>
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => router.push(`/dashboard/careo-audit/${audit.category}/${audit.id}`)}
                    className="font-medium hover:underline text-left"
                  >
                    {audit.name}
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getStatusColor(audit.status)}>
                    {audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{audit.auditor}</TableCell>
                <TableCell className="text-muted-foreground">{audit.lastAudited}</TableCell>
                <TableCell className="text-muted-foreground">{audit.dueDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>

      {/* New Audit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Audit</DialogTitle>
            <DialogDescription>
              Add a new audit to your system. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="auditName">Audit Name</Label>
              <Input
                id="auditName"
                placeholder="e.g., Risk Assessment Audit"
                value={formData.auditName}
                onChange={(e) =>
                  setFormData({ ...formData, auditName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auditorName">Auditor Name</Label>
              <Input
                id="auditorName"
                placeholder="e.g., John Smith"
                value={formData.auditorName}
                onChange={(e) =>
                  setFormData({ ...formData, auditorName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency of Audit</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 week">Weekly</SelectItem>
                  <SelectItem value="2 weeks">Bi-weekly</SelectItem>
                  <SelectItem value="1 month">Monthly</SelectItem>
                  <SelectItem value="3 months">Quarterly</SelectItem>
                  <SelectItem value="6 months">Semi-annually</SelectItem>
                  <SelectItem value="1 year">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateAudit}>
              Create Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
