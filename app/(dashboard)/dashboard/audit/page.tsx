"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function AuditPage() {
  return (
    <div>
      <div className="flex flex-col">
        <p className="font-semibold text-xl">Audit Management</p>
        <p className="text-sm text-muted-foreground">
          Manage and track care audits
        </p>
      </div>

      <Tabs defaultValue="governance" className="w-fit mt-6">
        <TabsList>
          <TabsTrigger value="governance">Governance & Compliance</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Care & Medicines</TabsTrigger>
          <TabsTrigger value="environment">Environment & Safety</TabsTrigger>
        </TabsList>

        <TabsContent value="governance" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Audit Item</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {governanceItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{item}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      Pending
                    </span>
                  </TableCell>
                  <TableCell>
                    <button className="text-sm text-primary hover:underline">
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="clinical" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Audit Item</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinicalItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{item}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      Pending
                    </span>
                  </TableCell>
                  <TableCell>
                    <button className="text-sm text-primary hover:underline">
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="environment" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Audit Item</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {environmentItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{item}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      Pending
                    </span>
                  </TableCell>
                  <TableCell>
                    <button className="text-sm text-primary hover:underline">
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
