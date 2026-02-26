"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { withRoleGuard } from "@/lib/route-guards";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  room_number: string | null;
  image_url: string | null;
}

interface AuditEntry {
  id?: string;
  resident_id: string;
  salt_assessment_date: string | null;
  salt_report_available: "yes" | "no" | "not_applicable" | null;
  recommendations_consistent: "yes" | "no" | "not_applicable" | null;
  care_plan_reflects_salt: "yes" | "no" | "not_applicable" | null;
  kitchen_has_recommendations: "yes" | "no" | "not_applicable" | null;
  mars_kardex_consistent: "yes" | "no" | "not_applicable" | null;
  comments: string | null;
  residents?: {
    id: string;
    first_name: string;
    last_name: string;
    room_number: string | null;
  };
}

interface Audit {
  id: string;
  audit_type_name: string;
  auditor_name: string;
  status: string;
  started_at: string;
}

function ModifiedDietAuditPage() {
  const router = useRouter();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [availableResidents, setAvailableResidents] = useState<Resident[]>([]);
  const [isAddResidentDialogOpen, setIsAddResidentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load audit data on mount
  useEffect(() => {
    loadAuditData();
    loadAvailableResidents();
  }, []);

  const loadAuditData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/manager-audit/modified-diet");
      if (!response.ok) {
        throw new Error("Failed to load audit data");
      }
      const data = await response.json();
      setAudit(data.audit);
      setEntries(data.entries || []);
    } catch (error) {
      console.error("Error loading audit:", error);
      toast.error("Failed to load audit data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableResidents = async () => {
    try {
      const response = await fetch("/api/residents/active");
      if (!response.ok) {
        throw new Error("Failed to load residents");
      }
      const data = await response.json();
      setAvailableResidents(data.residents || []);
    } catch (error) {
      console.error("Error loading residents:", error);
      toast.error("Failed to load residents");
    }
  };

  const handleAddResident = async (residentId: string) => {
    if (!audit) return;

    // Check if resident already added
    if (entries.some((e) => e.resident_id === residentId)) {
      toast.error("This resident has already been added to the audit");
      return;
    }

    try {
      const response = await fetch("/api/manager-audit/modified-diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId: audit.id,
          residentId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add resident");
      }

      const data = await response.json();

      // Fetch resident details to add to entry
      const resident = availableResidents.find((r) => r.id === residentId);
      const newEntry: AuditEntry = {
        ...data.entry,
        residents: resident
          ? {
              id: resident.id,
              first_name: resident.first_name,
              last_name: resident.last_name,
              room_number: resident.room_number,
            }
          : undefined,
      };

      setEntries([...entries, newEntry]);
      setIsAddResidentDialogOpen(false);
      setSearchQuery("");
      toast.success("Resident added successfully");
    } catch (error) {
      console.error("Error adding resident:", error);
      toast.error("Failed to add resident");
    }
  };

  const handleUpdateEntry = async (
    entryId: string,
    field: string,
    value: string | null
  ) => {
    if (!audit) return;

    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    // Validate: Comments required if any answer is "No"
    const updatedEntry = { ...entry, [field]: value };
    const hasNoAnswer =
      updatedEntry.salt_report_available === "no" ||
      updatedEntry.recommendations_consistent === "no" ||
      updatedEntry.care_plan_reflects_salt === "no" ||
      updatedEntry.kitchen_has_recommendations === "no" ||
      updatedEntry.mars_kardex_consistent === "no";

    if (hasNoAnswer && !updatedEntry.comments && field !== "comments") {
      toast.warning("Comments are required when any answer is 'No'");
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/manager-audit/modified-diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId: audit.id,
          residentId: entry.resident_id,
          saltAssessmentDate: field === "salt_assessment_date" ? value : entry.salt_assessment_date,
          saltReportAvailable:
            field === "salt_report_available" ? value : entry.salt_report_available,
          recommendationsConsistent:
            field === "recommendations_consistent" ? value : entry.recommendations_consistent,
          carePlanReflectsSalt:
            field === "care_plan_reflects_salt" ? value : entry.care_plan_reflects_salt,
          kitchenHasRecommendations:
            field === "kitchen_has_recommendations" ? value : entry.kitchen_has_recommendations,
          marsKardexConsistent:
            field === "mars_kardex_consistent" ? value : entry.mars_kardex_consistent,
          comments: field === "comments" ? value : entry.comments,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update entry");
      }

      const data = await response.json();
      setEntries(
        entries.map((e) =>
          e.id === entryId ? { ...e, ...data.entry } : e
        )
      );

      // Silent save - no toast on success for better UX during typing
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveResident = async (entryId: string) => {
    if (!entryId) return;

    try {
      const response = await fetch(
        `/api/manager-audit/modified-diet?entryId=${entryId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove resident");
      }

      setEntries(entries.filter((e) => e.id !== entryId));
      toast.success("Resident removed from audit");
    } catch (error) {
      console.error("Error removing resident:", error);
      toast.error("Failed to remove resident");
    }
  };

  const handleBack = () => {
    router.push("/dashboard/manager-audit");
  };

  const handleComplete = async () => {
    if (!audit) return;

    // Validate: At least one resident must be added
    if (entries.length === 0) {
      toast.error("Cannot complete audit", {
        description: "Please add at least one resident to the audit",
      });
      return;
    }

    // Validate: Comments required for any "No" answers
    const entriesWithNoAndNoComments = entries.filter((entry) => {
      const hasNoAnswer =
        entry.salt_report_available === "no" ||
        entry.recommendations_consistent === "no" ||
        entry.care_plan_reflects_salt === "no" ||
        entry.kitchen_has_recommendations === "no" ||
        entry.mars_kardex_consistent === "no";
      return hasNoAnswer && !entry.comments;
    });

    if (entriesWithNoAndNoComments.length > 0) {
      toast.error("Cannot complete audit", {
        description: "Comments are required for all entries with 'No' answers",
      });
      return;
    }

    toast.success("Audit completed successfully");
    router.push("/dashboard/manager-audit");
  };

  // Calculate summary statistics
  const totalResidents = entries.length;
  const nonCompliantCount = entries.filter((entry) => {
    return (
      entry.salt_report_available === "no" ||
      entry.recommendations_consistent === "no" ||
      entry.care_plan_reflects_salt === "no" ||
      entry.kitchen_has_recommendations === "no" ||
      entry.mars_kardex_consistent === "no"
    );
  }).length;

  // Filter available residents (exclude already added)
  const addedResidentIds = new Set(entries.map((e) => e.resident_id));
  const filteredAvailableResidents = availableResidents
    .filter((r) => !addedResidentIds.has(r.id))
    .filter((r) =>
      searchQuery
        ? `${r.first_name} ${r.last_name} ${r.room_number || ""}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true
    );

  // Check if entry has any "No" answers
  const hasNoAnswers = (entry: AuditEntry) => {
    return (
      entry.salt_report_available === "no" ||
      entry.recommendations_consistent === "no" ||
      entry.care_plan_reflects_salt === "no" ||
      entry.kitchen_has_recommendations === "no" ||
      entry.mars_kardex_consistent === "no"
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading audit...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Modified Diet & Fluid Audit
            </h2>
            <p className="text-muted-foreground">
              SALT modified diets and fluids compliance audit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-sm text-muted-foreground">Saving...</span>
          )}
          <Button onClick={handleComplete} disabled={entries.length === 0}>
            <Save className="mr-2 h-4 w-4" /> Complete Audit
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Residents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResidents}</div>
            <p className="text-xs text-muted-foreground">
              Added to this audit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {nonCompliantCount}
            </div>
            <p className="text-xs text-muted-foreground">
              With "No" answers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalResidents > 0
                ? Math.round(
                    ((totalResidents - nonCompliantCount) / totalResidents) * 100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Overall compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Alert */}
      {entries.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please add at least one resident to begin the audit.
          </AlertDescription>
        </Alert>
      )}

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Entries</CardTitle>
              <CardDescription>
                Review SALT recommendations compliance for each resident
              </CardDescription>
            </div>
            <Dialog
              open={isAddResidentDialogOpen}
              onOpenChange={setIsAddResidentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Resident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Resident to Audit</DialogTitle>
                  <DialogDescription>
                    Select a resident from the list below to add to this audit
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Filter by name or room number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {!searchQuery && filteredAvailableResidents.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Showing {filteredAvailableResidents.length} available resident{filteredAvailableResidents.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {searchQuery && filteredAvailableResidents.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Found {filteredAvailableResidents.length} resident{filteredAvailableResidents.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {filteredAvailableResidents.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {searchQuery
                          ? "No residents found matching your search"
                          : "All active residents have been added"}
                      </p>
                    ) : (
                      filteredAvailableResidents.map((resident) => (
                        <div
                          key={resident.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => handleAddResident(resident.id)}
                        >
                          <div>
                            <p className="font-medium">
                              {resident.first_name} {resident.last_name}
                            </p>
                            {resident.room_number && (
                              <p className="text-sm text-muted-foreground">
                                Room {resident.room_number}
                              </p>
                            )}
                          </div>
                          <Button size="sm" variant="ghost">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Resident Name & Room</TableHead>
                  <TableHead className="w-[150px]">SALT Assessment Date</TableHead>
                  <TableHead className="w-[120px]">Report Available?</TableHead>
                  <TableHead className="w-[120px]">
                    Recommendations Consistent?
                  </TableHead>
                  <TableHead className="w-[120px]">
                    Care Plan Reflects SALT?
                  </TableHead>
                  <TableHead className="w-[120px]">
                    Kitchen Has Recommendations?
                  </TableHead>
                  <TableHead className="w-[120px]">
                    MARS/KARDEX Consistent?
                  </TableHead>
                  <TableHead className="min-w-[200px]">Comments</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No residents added yet. Click "Add Resident" to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={
                        hasNoAnswers(entry) ? "bg-red-50 dark:bg-red-950/10" : ""
                      }
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p>
                            {entry.residents?.first_name}{" "}
                            {entry.residents?.last_name}
                          </p>
                          {entry.residents?.room_number && (
                            <p className="text-xs text-muted-foreground">
                              Room {entry.residents.room_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={entry.salt_assessment_date || ""}
                          onChange={(e) =>
                            handleUpdateEntry(
                              entry.id!,
                              "salt_assessment_date",
                              e.target.value
                            )
                          }
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.salt_report_available || ""}
                          onValueChange={(value) =>
                            handleUpdateEntry(
                              entry.id!,
                              "salt_report_available",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✅ Yes</SelectItem>
                            <SelectItem value="no">❌ No</SelectItem>
                            <SelectItem value="not_applicable">
                              ⚠️ N/A
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.recommendations_consistent || ""}
                          onValueChange={(value) =>
                            handleUpdateEntry(
                              entry.id!,
                              "recommendations_consistent",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✅ Yes</SelectItem>
                            <SelectItem value="no">❌ No</SelectItem>
                            <SelectItem value="not_applicable">
                              ⚠️ N/A
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.care_plan_reflects_salt || ""}
                          onValueChange={(value) =>
                            handleUpdateEntry(
                              entry.id!,
                              "care_plan_reflects_salt",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✅ Yes</SelectItem>
                            <SelectItem value="no">❌ No</SelectItem>
                            <SelectItem value="not_applicable">
                              ⚠️ N/A
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.kitchen_has_recommendations || ""}
                          onValueChange={(value) =>
                            handleUpdateEntry(
                              entry.id!,
                              "kitchen_has_recommendations",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✅ Yes</SelectItem>
                            <SelectItem value="no">❌ No</SelectItem>
                            <SelectItem value="not_applicable">
                              ⚠️ N/A
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry.mars_kardex_consistent || ""}
                          onValueChange={(value) =>
                            handleUpdateEntry(
                              entry.id!,
                              "mars_kardex_consistent",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✅ Yes</SelectItem>
                            <SelectItem value="no">❌ No</SelectItem>
                            <SelectItem value="not_applicable">
                              ⚠️ N/A
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={entry.comments || ""}
                          onChange={(e) =>
                            handleUpdateEntry(entry.id!, "comments", e.target.value)
                          }
                          placeholder={
                            hasNoAnswers(entry)
                              ? "Comments required for 'No' answers"
                              : "Add comments..."
                          }
                          className={
                            hasNoAnswers(entry) && !entry.comments
                              ? "border-red-500"
                              : ""
                          }
                          rows={2}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveResident(entry.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withRoleGuard(ModifiedDietAuditPage, ["manager", "admin", "owner"]);
