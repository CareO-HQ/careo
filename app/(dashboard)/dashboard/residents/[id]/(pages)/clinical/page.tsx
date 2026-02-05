"use client";

import React, { useEffect, useState, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { useActiveTeam } from "@/hooks/use-active-team";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Heart,
  AlertTriangle,
  Activity,
  FileText,
  Calendar,
  User,
  Plus,
  Eye,
  Trash2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { clinicalService } from "@/lib/clinical-service";
import { hospitalTransferService } from "@/lib/hospital-transfer-service";

type ClinicalPageProps = {
  params: Promise<{ id: string }>;
};

export default function ClinicalPage({ params }: ClinicalPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { activeTeam, activeTeamId, activeOrganizationId } = useActiveTeam();

  // State
  const [resident, setResident] = useState<any | null>(undefined);
  const [latestVitals, setLatestVitals] = useState<any>({});
  const [recentVitals, setRecentVitals] = useState<any[]>([]);
  const [dietInfo, setDietInfo] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);

  // Dialog state
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Data Fetching
  const loadData = useCallback(async () => {
    try {
      // Fetch Resident
      const residentData = await hospitalTransferService.getResidentById(id);
      setResident(residentData || null);

      // Fetch Vitals
      const latest = await clinicalService.getLatestVitals(id);
      setLatestVitals(latest);

      const recent = await clinicalService.getRecentVitals(id, 4);
      setRecentVitals(recent || []);

      // Fetch Diet Info
      const diet = await hospitalTransferService.getDietInformation(id);
      setDietInfo(diet);

      // Fetch Clinical Notes
      const notes = await clinicalService.getClinicalNotes(id, 10);
      setClinicalNotes(notes || []);

    } catch (error) {
      console.error("Error loading clinical data:", error);
      toast.error("Failed to load clinical data");
      setResident(null); // Stop loading spinner
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // Get current date and time in UK Time
  const getCurrentDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now).split('/').reverse().join('-'); // YYYY-MM-DD
  };

  const getCurrentTime = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now); // HH:MM
  };

  // Handle note submission
  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Please enter a note");
      return;
    }

    if (!session?.user?.email) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    if (!resident) {
      toast.error("Resident information not loaded.");
      return;
    }

    const organizationId = activeOrganizationId;
    const teamId = activeTeamId;

    if (!organizationId) {
      toast.error("Organization information is missing.");
      return;
    }

    if (!teamId) {
      toast.error("Team information is missing.");
      return;
    }

    setIsSubmitting(true);

    try {
      await clinicalService.createClinicalNote({
        residentId: id,
        staffName: session.user.name || session.user.email,
        content: noteContent.trim(),
        noteDate: getCurrentDate(),
        noteTime: getCurrentTime(),
        organizationId: organizationId,
        createdBy: session.user.id
      });

      toast.success("Clinical note added successfully");
      setNoteContent("");
      setIsAddNoteDialogOpen(false);
      // Refresh notes
      const notes = await clinicalService.getClinicalNotes(id, 10);
      setClinicalNotes(notes || []);
    } catch (error) {
      console.error("Failed to add clinical note:", error);
      toast.error("Failed to add clinical note");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);

    try {
      await clinicalService.deleteClinicalNote(noteId);
      toast.success("Clinical note deleted successfully");
      // Refresh notes
      const notes = await clinicalService.getClinicalNotes(id, 10);
      setClinicalNotes(notes || []);
    } catch (error) {
      console.error("Failed to delete clinical note:", error);
      toast.error("Failed to delete clinical note");
    } finally {
      setDeletingNoteId(null);
    }
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
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
  const initials = `${resident.firstName?.[0] || ''}${resident.lastName?.[0] || ''}`.toUpperCase();

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'high':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'medium':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'low':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  // Format vital signs data for display
  const formatVitalValue = (vital: any) => {
    if (vital.vitalType === "bloodPressure") {
      return `${vital.value}/${vital.value2} mmHg`;
    }
    return `${vital.value}${vital.unit ? ` ${vital.unit}` : ''}`;
  };

  const getVitalTypeLabel = (vitalType: string) => {
    const labels: Record<string, string> = {
      bloodPressure: "Blood Pressure",
      heartRate: "Heart Rate",
      temperature: "Temperature",
      respiratoryRate: "Respiratory Rate",
      oxygenSaturation: "Oxygen Saturation",
      glucoseLevel: "Blood Sugar",
      weight: "Weight",
      height: "Height"
    };
    return labels[vitalType] || vitalType;
  };

  // Convert recent vitals to display format
  const displayVitals = recentVitals?.slice(0, 4).map(vital => ({
    date: vital.recordDate,
    type: getVitalTypeLabel(vital.vitalType),
    value: formatVitalValue(vital),
    status: "normal" // You can add logic to determine status based on ranges
  })) || [];

  // Get allergies from diet information
  const allergies = dietInfo?.allergies || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Clinical</h1>
            <p className="text-muted-foreground text-sm">
              View health conditions and medical information for {resident.firstName} {resident.lastName}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button onClick={() => setIsAddNoteDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/residents/${id}/clinical/documents`)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Records
            </Button>
          </div>
        </div>

        {/* Health Conditions */}
        {resident.healthConditions && resident.healthConditions.length > 0 && (
          <Card className="border-0">
            <CardHeader>
              {/* Mobile Layout */}
              <CardTitle className="block sm:hidden">
                <div className="flex items-center space-x-2 mb-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  <span>Health Conditions</span>
                </div>
                <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                  {Array.isArray(resident.healthConditions) ? resident.healthConditions.length : 0} conditions
                </Badge>
              </CardTitle>
              {/* Desktop Layout */}
              <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  <span>Health Conditions</span>
                </div>
                <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                  {Array.isArray(resident.healthConditions) ? resident.healthConditions.length : 0} conditions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.isArray(resident.healthConditions) &&
                  typeof resident.healthConditions[0] === "string"
                  ? (resident.healthConditions as string[]).map((condition, index) => (
                    <div key={index} className="flex items-center gap-2.5 p-3 border border-red-200 bg-red-50/50 rounded-lg hover:bg-red-50 transition-colors">
                      <div className="flex-shrink-0 p-1.5 bg-red-100 rounded-md">
                        <Heart className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-red-800 truncate">{condition}</h3>
                        <p className="text-xs text-red-600/80">Chronic</p>
                      </div>
                    </div>
                  ))
                  : (resident.healthConditions as { condition: string }[]).map((item, index) => (
                    <div key={index} className="flex items-center gap-2.5 p-3 border border-red-200 bg-red-50/50 rounded-lg hover:bg-red-50 transition-colors">
                      <div className="flex-shrink-0 p-1.5 bg-red-100 rounded-md">
                        <Heart className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-red-800 truncate">{item.condition}</h3>
                        <p className="text-xs text-red-600/80">Chronic</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Factors */}
        {resident.risks && resident.risks.length > 0 && (
          <Card className="border-0">
            <CardHeader>
              {/* Mobile Layout */}
              <CardTitle className="block sm:hidden">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Risk Factors</span>
                </div>
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                  {Array.isArray(resident.risks) ? resident.risks.length : 0} risks
                </Badge>
              </CardTitle>
              {/* Desktop Layout */}
              <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Risk Factors</span>
                </div>
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                  {Array.isArray(resident.risks) ? resident.risks.length : 0} risks
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.isArray(resident.risks) &&
                  typeof resident.risks[0] === "string"
                  ? (resident.risks as string[]).map((risk, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2.5 p-3 border border-amber-200 bg-amber-50/50 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex-shrink-0 p-1.5 bg-amber-100 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-amber-800 truncate">{risk}</h3>
                        <p className="text-xs text-amber-600/80">Risk factor</p>
                      </div>
                    </div>
                  ))
                  : (resident.risks as { risk: string; level?: string }[]).map((item, index) => {
                    const colors = getRiskLevelColor(item.level);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2.5 p-3 border border-amber-200 bg-amber-50/50 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex-shrink-0 p-1.5 bg-amber-100 rounded-md">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <h3 className="text-sm font-medium text-amber-800 truncate">{item.risk}</h3>
                        </div>
                        {item.level && (
                          <Badge
                            variant="outline"
                            className={`${colors.bg} ${colors.border} ${colors.text} text-xs flex-shrink-0`}
                          >
                            {item.level}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Vital Signs */}
        <Card className="border-0">
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Recent Vital Signs</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                {displayVitals.length} recent readings
              </Badge>
            </CardTitle>
            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Recent Vital Signs</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                {displayVitals.length} recent readings
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayVitals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {displayVitals.map((vital, index) => (
                  <div key={index} className="p-3 border border-blue-200 bg-blue-50/50 rounded-lg hover:bg-blue-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-medium text-blue-800">{vital.type}</h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={vital.status === 'normal'
                          ? 'bg-green-100 text-green-700 border-green-200 text-xs'
                          : 'bg-red-100 text-red-700 border-red-200 text-xs'
                        }
                      >
                        {vital.status}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mb-1.5">{vital.value}</p>
                    <p className="text-xs text-blue-600/80 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {vital.date}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No vital signs recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card className="border-0">
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Allergies & Reactions</span>
              </div>
              <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                {allergies.length} allergies
              </Badge>
            </CardTitle>
            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Allergies & Adverse Reactions</span>
              </div>
              <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                {allergies.length} allergies
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allergies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allergies.map((allergy: any, index: number) => (
                  <div key={index} className="p-3 bg-red-50/50 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex-shrink-0 p-1.5 bg-red-100 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        </div>
                        <h3 className="text-sm font-medium text-red-800 truncate">{allergy.allergy}</h3>
                      </div>
                      {allergy.severity && (
                        <Badge
                          variant="outline"
                          className={allergy.severity === 'Severe'
                            ? 'bg-red-200 text-red-800 border-red-300 text-xs flex-shrink-0'
                            : 'bg-orange-200 text-orange-800 border-orange-300 text-xs flex-shrink-0'
                          }
                        >
                          {allergy.severity}
                        </Badge>
                      )}
                    </div>
                    {allergy.reaction && (
                      <p className="text-xs text-red-600/80">
                        <span className="font-medium">Reaction:</span> {allergy.reaction}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No allergies recorded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clinical Notes */}
        <Card className="border-0">
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span>Clinical Notes</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
                  {clinicalNotes?.length || 0} recent notes
                </Badge>
                <Button size="sm" onClick={() => setIsAddNoteDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Note
                </Button>
              </div>
            </CardTitle>
            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span>Clinical Notes</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
                  {clinicalNotes?.length || 0} recent notes
                </Badge>
                <Button size="sm" onClick={() => setIsAddNoteDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Note
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clinicalNotes && clinicalNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clinicalNotes.map((note) => (
                  <div key={note._id} className="p-3 border border-gray-200 bg-gray-50/50 rounded-lg hover:bg-gray-50 transition-colors group relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-md">
                          <User className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{note.staffName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(note.noteDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteNote(note._id)}
                          disabled={deletingNoteId === note._id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No clinical notes recorded yet</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsAddNoteDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Your First Note
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Clinical Note Dialog */}
        <Dialog open={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Clinical Note</DialogTitle>
              <DialogDescription>
                Record a clinical observation or note for {resident.firstName} {resident.lastName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="note">Clinical Note</Label>
                <Textarea
                  id="note"
                  placeholder="Enter clinical note here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Current date and time will be recorded automatically
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setNoteContent("");
                  setIsAddNoteDialogOpen(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={isSubmitting || !noteContent.trim()}>
                {isSubmitting ? "Adding..." : "Add Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}