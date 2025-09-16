"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  ClipboardList,
  User,
  Calendar,
  Clock,
  Plus,
  Eye,
  UserCheck,
  FileText,
  Stethoscope,
  Brain,
  Heart,
  Activity,
  Pill,
  Users,
  Target,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type MultidisciplinaryNotePageProps = {
  params: Promise<{ id: string }>;
};

// Multidisciplinary Note Schema
const MultidisciplinaryNoteSchema = z.object({
  noteDate: z.string().min(1, "Note date is required"),
  noteTime: z.string().min(1, "Note time is required"),
  discipline: z.enum([
    "nursing",
    "medical",
    "physiotherapy",
    "occupational_therapy",
    "social_work",
    "dietitian",
    "pharmacy",
    "psychology",
    "speech_therapy",
    "activities",
    "chaplaincy",
    "family",
    "other"
  ]),
  noteType: z.enum([
    "assessment",
    "progress_note",
    "incident_report",
    "care_plan_review",
    "family_meeting",
    "discharge_planning",
    "medication_review",
    "behavioral_observation",
    "goal_review",
    "interdisciplinary_consultation",
    "other"
  ]),
  priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
  subject: z.string().min(1, "Subject is required"),
  objectiveFindings: z.string().optional(),
  subjectiveObservations: z.string().optional(),
  assessment: z.string().optional(),
  interventions: z.string().optional(),
  plan: z.string().optional(),
  goals: z.string().optional(),
  followUpRequired: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpWith: z.string().optional(),
  signatures: z.string().optional(),
  witnessSignature: z.string().optional(),
  recordedBy: z.string().min(1, "Recorded by is required"),
});

type MultidisciplinaryNoteFormData = z.infer<typeof MultidisciplinaryNoteSchema>;

export default function MultidisciplinaryNotePage({ params }: MultidisciplinaryNotePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().slice(0, 5);

  // Form setup
  const form = useForm<MultidisciplinaryNoteFormData>({
    resolver: zodResolver(MultidisciplinaryNoteSchema),
    defaultValues: {
      noteDate: today,
      noteTime: currentTime,
      discipline: "nursing",
      noteType: "progress_note",
      priority: "normal",
      subject: "",
      objectiveFindings: "",
      subjectiveObservations: "",
      assessment: "",
      interventions: "",
      plan: "",
      goals: "",
      followUpRequired: "",
      followUpDate: "",
      followUpWith: "",
      signatures: "",
      witnessSignature: "",
      recordedBy: "",
    },
  });

  // Dialog states
  const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);

  // Auth data
  const { data: user } = authClient.useSession();

  // Update staff field when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('recordedBy', staffName);
    }
  }, [user, form]);

  const handleSubmit = async (data: MultidisciplinaryNoteFormData) => {
    try {
      // Implement multidisciplinary note creation
      toast.success("Multidisciplinary note created successfully");
      form.reset();
      setIsNoteDialogOpen(false);
    } catch (error) {
      console.error("Error creating multidisciplinary note:", error);
      toast.error("Failed to create multidisciplinary note");
    }
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

  // Mock multidisciplinary notes data
  const mockRecentNotes = [
    {
      id: 1,
      date: "2024-01-15",
      time: "14:30",
      discipline: "nursing",
      noteType: "progress_note",
      priority: "normal",
      subject: "Weekly Care Plan Review",
      author: "Sarah Mitchell, RN",
      summary: "Resident showing good progress with mobility exercises. Blood pressure stable. Family meeting scheduled for next week.",
      followUp: "Continue current medication regimen",
      status: "active"
    },
    {
      id: 2,
      date: "2024-01-14",
      time: "10:00",
      discipline: "physiotherapy",
      noteType: "assessment",
      priority: "high",
      subject: "Mobility Assessment Update",
      author: "Dr. Johnson, PT",
      summary: "Significant improvement in range of motion. Resident able to walk 20 meters with minimal assistance. Recommend increased therapy sessions.",
      followUp: "Schedule 3x weekly PT sessions",
      status: "completed"
    },
    {
      id: 3,
      date: "2024-01-13",
      time: "16:45",
      discipline: "medical",
      noteType: "medication_review",
      priority: "urgent",
      subject: "Medication Adjustment Required",
      author: "Dr. Williams, MD",
      summary: "Blood pressure medication showing good response. Minor side effects noted. Recommend dosage adjustment and monitoring.",
      followUp: "Review in 48 hours",
      status: "pending"
    }
  ];

  const mockDisciplinaryTeam = [
    { name: "Dr. Sarah Williams", role: "General Practitioner", department: "Medical", lastNote: "2024-01-13" },
    { name: "Sarah Mitchell", role: "Registered Nurse", department: "Nursing", lastNote: "2024-01-15" },
    { name: "Dr. Tom Johnson", role: "Physiotherapist", department: "Therapy", lastNote: "2024-01-14" },
    { name: "Emma Wilson", role: "Social Worker", department: "Social Services", lastNote: "2024-01-10" },
    { name: "Lisa Brown", role: "Dietitian", department: "Nutrition", lastNote: "2024-01-08" },
    { name: "Mark Davis", role: "Activities Coordinator", department: "Activities", lastNote: "2024-01-12" }
  ];

  const getDisciplineIcon = (discipline: string) => {
    switch (discipline) {
      case 'nursing':
        return <UserCheck className="w-4 h-4" />;
      case 'medical':
        return <Stethoscope className="w-4 h-4" />;
      case 'physiotherapy':
        return <Activity className="w-4 h-4" />;
      case 'occupational_therapy':
        return <Brain className="w-4 h-4" />;
      case 'social_work':
        return <Users className="w-4 h-4" />;
      case 'dietitian':
        return <Heart className="w-4 h-4" />;
      case 'pharmacy':
        return <Pill className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getDisciplineColor = (discipline: string) => {
    switch (discipline) {
      case 'nursing':
        return { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' };
      case 'medical':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'physiotherapy':
        return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' };
      case 'occupational_therapy':
        return { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' };
      case 'social_work':
        return { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-700' };
      case 'dietitian':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'pharmacy':
        return { bg: 'bg-cyan-100', border: 'border-cyan-200', text: 'text-cyan-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      case 'high':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'normal':
        return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' };
      case 'low':
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="w-3 h-3 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'pending':
        return <AlertTriangle className="w-3 h-3 text-orange-600" />;
      default:
        return <FileText className="w-3 h-3 text-gray-600" />;
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
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
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
        <span className="text-foreground">Multidisciplinary Note</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Multidisciplinary Note</h1>
            <p className="text-muted-foreground text-sm">Team collaboration & care coordination</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching daily-care pattern */}
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
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 text-xs">
                    <ClipboardList className="w-3 h-3 mr-1" />
                    {mockRecentNotes.length} Notes
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsNoteDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Note
              </Button>
              <Button
                variant="outline"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Notes
              </Button>
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
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </Badge>
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 text-xs">
                    <ClipboardList className="w-3 h-3 mr-1" />
                    Multidisciplinary Care
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsNoteDialogOpen(true)}
                className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Create Note</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Notes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Care Team Overview */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Care Team</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {mockDisciplinaryTeam.length} team members
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Multidisciplinary Care Team</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {mockDisciplinaryTeam.length} team members
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockDisciplinaryTeam.map((member, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{member.name}</h4>
                    <p className="text-xs text-gray-600">{member.role}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 text-xs">
                    {member.department}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    Last note: {member.lastNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Multidisciplinary Notes */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Recent Notes</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
              {mockRecentNotes.length} recent notes
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Recent Multidisciplinary Notes</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
              {mockRecentNotes.length} recent notes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockRecentNotes.map((note) => (
              <Card key={note.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getDisciplineColor(note.discipline).bg}`}>
                        {getDisciplineIcon(note.discipline)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">{note.subject}</h4>
                          <Badge 
                            variant="outline"
                            className={`${getDisciplineColor(note.discipline).bg} ${getDisciplineColor(note.discipline).border} ${getDisciplineColor(note.discipline).text} text-xs`}
                          >
                            {note.discipline.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{note.date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{note.time}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{note.author}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline"
                        className={`${getPriorityColor(note.priority).bg} ${getPriorityColor(note.priority).border} ${getPriorityColor(note.priority).text} text-xs`}
                      >
                        {note.priority}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(note.status)}
                        <span className="text-xs text-gray-500 capitalize">{note.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Summary:</span>
                      <p className="text-gray-700 mt-1">{note.summary}</p>
                    </div>
                    
                    {note.followUp && (
                      <div>
                        <span className="font-medium">Follow-up:</span>
                        <p className="text-gray-700 mt-1">{note.followUp}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Note Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <span>Note Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">
                {mockRecentNotes.length}
              </div>
              <p className="text-sm text-indigo-700">Total Notes</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {mockDisciplinaryTeam.length}
              </div>
              <p className="text-sm text-blue-700">Team Members</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {mockRecentNotes.filter(n => n.status === 'completed').length}
              </div>
              <p className="text-sm text-green-700">Completed</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {mockRecentNotes.filter(n => n.status === 'pending').length}
              </div>
              <p className="text-sm text-orange-700">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <span>Note Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIsNoteDialogOpen(true)}
            >
              <Plus className="w-6 h-6 mr-3" />
              Create New Note
            </Button>
            <Button
             className="h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Eye className="w-6 h-6 mr-3" />
              View All Notes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Multidisciplinary Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Multidisciplinary Note for {fullName}</DialogTitle>
            <DialogDescription>
              Document comprehensive care observations and interdisciplinary collaboration.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="noteDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="noteTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Note Classification */}
              <div className="space-y-4">
                <h4 className="font-medium text-indigo-900">Note Classification</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="discipline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discipline</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select discipline..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="nursing">Nursing</SelectItem>
                            <SelectItem value="medical">Medical</SelectItem>
                            <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                            <SelectItem value="occupational_therapy">Occupational Therapy</SelectItem>
                            <SelectItem value="social_work">Social Work</SelectItem>
                            <SelectItem value="dietitian">Dietitian</SelectItem>
                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                            <SelectItem value="psychology">Psychology</SelectItem>
                            <SelectItem value="speech_therapy">Speech Therapy</SelectItem>
                            <SelectItem value="activities">Activities</SelectItem>
                            <SelectItem value="chaplaincy">Chaplaincy</SelectItem>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="noteType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select note type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="assessment">Assessment</SelectItem>
                            <SelectItem value="progress_note">Progress Note</SelectItem>
                            <SelectItem value="incident_report">Incident Report</SelectItem>
                            <SelectItem value="care_plan_review">Care Plan Review</SelectItem>
                            <SelectItem value="family_meeting">Family Meeting</SelectItem>
                            <SelectItem value="discharge_planning">Discharge Planning</SelectItem>
                            <SelectItem value="medication_review">Medication Review</SelectItem>
                            <SelectItem value="behavioral_observation">Behavioral Observation</SelectItem>
                            <SelectItem value="goal_review">Goal Review</SelectItem>
                            <SelectItem value="interdisciplinary_consultation">Interdisciplinary Consultation</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject/Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the note's focus..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SOAP Note Format */}
              <div className="space-y-4">
                <h4 className="font-medium text-green-900">SOAP Note Documentation</h4>
                
                <FormField
                  control={form.control}
                  name="subjectiveObservations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{`Subjective (S) - Patient's reported experience`}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What the resident reports, family observations, complaints, concerns..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objectiveFindings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objective (O) - Measurable and observable data</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Vital signs, physical examination findings, test results, observations..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment (A) - Professional analysis</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Clinical judgment, diagnosis, problem identification, progress evaluation..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan (P) - Treatment plan and next steps</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Treatment modifications, interventions, monitoring plans, next steps..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Fields */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="interventions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interventions Provided</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Specific interventions, treatments, or actions taken..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goals and Outcomes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Short-term and long-term goals, expected outcomes..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Follow-up Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-purple-900">Follow-up Requirements</h4>
                
                <FormField
                  control={form.control}
                  name="followUpRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Required</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe any follow-up actions needed..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="followUpDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow-up Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="followUpWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow-up With</FormLabel>
                        <FormControl>
                          <Input placeholder="Specific person or discipline..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Signatures */}
              <div className="space-y-4">
                <h4 className="font-medium text-orange-900">Signatures & Authentication</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="signatures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Signature</FormLabel>
                        <FormControl>
                          <Input placeholder="Digital signature or initials..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="witnessSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Witness Signature (if required)</FormLabel>
                        <FormControl>
                          <Input placeholder="Witness signature or initials..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Staff Information */}
              <FormField
                control={form.control}
                name="recordedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recorded By</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        className="bg-gray-50 text-gray-600"
                        placeholder="Current user"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNoteDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Create Note
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Development Notice */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <ClipboardList className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-indigo-800 mb-2">Enhanced Features Coming Soon</h3>
          <p className="text-indigo-600 text-sm">
            Advanced note templates, voice-to-text documentation, automated care plan integration, and comprehensive reporting tools are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}