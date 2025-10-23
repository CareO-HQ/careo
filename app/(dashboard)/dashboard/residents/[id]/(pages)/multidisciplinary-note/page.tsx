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
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type MultidisciplinaryNotePageProps = {
  params: Promise<{ id: string }>;
};

// Multidisciplinary Note Schema
const MultidisciplinaryNoteSchema = z.object({
  noteDate: z.string().min(1, "Note date is required"),
  noteTime: z.string().min(1, "Note time is required"),
  teamMemberId: z.string().min(1, "Team member is required"),
  reasonForVisit: z.string().min(1, "Reason for visit is required"),
  outcome: z.string().min(1, "Outcome is required"),
  relativeInformed: z.enum(["yes", "no"]),
  relativeInformedDetails: z.string().optional(),
  signature: z.string().min(1, "Signature is required"),
});

type MultidisciplinaryNoteFormData = z.infer<typeof MultidisciplinaryNoteSchema>;

// Team Member Schema
const TeamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().min(1, "Designation is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialty: z.string().min(1, "Specialty/Department is required"),
  organisation: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});

type TeamMemberFormData = z.infer<typeof TeamMemberSchema>;

export default function MultidisciplinaryNotePage({ params }: MultidisciplinaryNotePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Fetch multidisciplinary care team members
  const careTeamMembers = useQuery(api.multidisciplinaryCareTeam.getByResidentId, {
    residentId: id as Id<"residents">
  });

  // Fetch multidisciplinary notes
  const multidisciplinaryNotes = useQuery(api.multidisciplinaryNotes.getByResidentId, {
    residentId: id as Id<"residents">
  });

  // Mutations
  const createTeamMember = useMutation(api.multidisciplinaryCareTeam.create);
  const createNote = useMutation(api.multidisciplinaryNotes.create);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().slice(0, 5);

  // Form setup
  const form = useForm<MultidisciplinaryNoteFormData>({
    resolver: zodResolver(MultidisciplinaryNoteSchema),
    defaultValues: {
      noteDate: today,
      noteTime: currentTime,
      teamMemberId: "",
      reasonForVisit: "",
      outcome: "",
      relativeInformed: "no",
      relativeInformedDetails: "",
      signature: "",
    },
  });

  // Team member form setup
  const teamMemberForm = useForm<TeamMemberFormData>({
    resolver: zodResolver(TeamMemberSchema),
    defaultValues: {
      name: "",
      designation: "",
      phone: "",
      address: "",
      specialty: "",
      organisation: "",
      email: "",
    },
  });

  // Dialog states
  const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);
  const [isTeamMemberDialogOpen, setIsTeamMemberDialogOpen] = React.useState(false);
  const [selectedNote, setSelectedNote] = React.useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false);

  // Multi-step form state
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 2;

  // Auth data
  const { data: user } = authClient.useSession();

  // Set default signature when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('signature', staffName);
    }
  }, [user, form]);

  const handleSubmit = async (data: MultidisciplinaryNoteFormData) => {
    try {
      if (!resident || !user?.user) {
        toast.error("Missing required information");
        return;
      }

      // Handle GP and Care Manager selections
      let teamMemberName = "";
      let teamMemberId = data.teamMemberId;

      if (data.teamMemberId.startsWith('gp-')) {
        teamMemberName = resident.gpName || "";
        // For GP, we'll use a special ID format that doesn't conflict with database IDs
        teamMemberId = `gp-${resident.gpName}`;
      } else if (data.teamMemberId.startsWith('care-manager-')) {
        teamMemberName = resident.careManagerName || "";
        // For Care Manager, we'll use a special ID format
        teamMemberId = `care-manager-${resident.careManagerName}`;
      } else {
        // Regular database team member
        const selectedTeamMember = careTeamMembers?.find(member => member._id === data.teamMemberId);
        if (!selectedTeamMember) {
          toast.error("Selected team member not found");
          return;
        }
        teamMemberName = selectedTeamMember.name;
      }

      // For GP and Care Manager, we need to handle the teamMemberId differently since they're not in the database
      await createNote({
        residentId: id as Id<"residents">,
        teamMemberId: teamMemberId.startsWith('gp-') || teamMemberId.startsWith('care-manager-')
          ? teamMemberId as any // Use the special ID for GP/Care Manager
          : data.teamMemberId as Id<"multidisciplinaryCareTeam">,
        teamMemberName: teamMemberName,
        reasonForVisit: data.reasonForVisit,
        outcome: data.outcome,
        relativeInformed: data.relativeInformed,
        relativeInformedDetails: data.relativeInformedDetails || undefined,
        signature: data.signature,
        noteDate: data.noteDate,
        noteTime: data.noteTime,
        organizationId: resident.organizationId,
        teamId: resident.teamId,
        createdBy: user.user.id,
      });

      toast.success("Multidisciplinary note created successfully");
      form.reset();
      setCurrentStep(1);
      setIsNoteDialogOpen(false);
    } catch (error) {
      console.error("Error creating multidisciplinary note:", error);
      toast.error("Failed to create multidisciplinary note");
    }
  };

  const handleTeamMemberSubmit = async (data: TeamMemberFormData) => {
    try {
      if (!resident || !user?.user) {
        toast.error("Missing required information");
        return;
      }

      await createTeamMember({
        residentId: id as Id<"residents">,
        name: data.name,
        designation: data.designation,
        phone: data.phone || undefined,
        address: data.address || undefined,
        specialty: data.specialty,
        organisation: data.organisation || undefined,
        email: data.email || undefined,
        organizationId: resident.organizationId,
        teamId: resident.teamId,
        createdBy: user.user.id,
      });

      toast.success("Team member added successfully");
      teamMemberForm.reset();
      setIsTeamMemberDialogOpen(false);
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    }
  };

  // Step navigation functions
  const nextStep = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1: // Basic Visit Information (Date, time, team member, reason, outcome)
        const step1Fields = ['noteDate', 'noteTime', 'teamMemberId', 'reasonForVisit', 'outcome'] as const;
        const step1Valid = await form.trigger(step1Fields);
        return step1Valid;
      case 2: // Relative Information & Signature (relativeInformed, signature)
        const step2Fields = ['relativeInformed', 'signature'] as const;
        const step2Valid = await form.trigger(step2Fields);
        return step2Valid;
      default:
        return true;
    }
  };

  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
    setIsNoteDialogOpen(false);
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

  // Use the fetched notes
  const recentNotes = multidisciplinaryNotes || [];

  // Build disciplinary team from resident data and database team members
  const buildDisciplinaryTeam = () => {
    const team = [];

    // Add GP if available
    if (resident?.gpName) {
      team.push({
        name: resident.gpName,
        role: "General Practitioner",
        department: "Medical",
        contact: resident.gpPhone ? `${resident.gpPhone}` : undefined,
        address: resident.gpAddress,
        lastNote: "Available on request",
        isFromResidentData: true
      });
    }

    // Add Care Manager if available
    if (resident?.careManagerName) {
      team.push({
        name: resident.careManagerName,
        role: "Care Manager",
        department: "Social Services",
        contact: resident.careManagerPhone ? `${resident.careManagerPhone}` : undefined,
        address: resident.careManagerAddress,
        lastNote: "Available on request",
        isFromResidentData: true
      });
    }

    // Add team members from database
    if (careTeamMembers) {
      careTeamMembers.forEach((member) => {
        team.push({
          id: member._id,
          name: member.name,
          role: member.designation,
          department: member.specialty,
          contact: member.phone,
          address: member.address,
          email: member.email,
          organisation: member.organisation,
          lastNote: "Database record",
          isFromDatabase: true
        });
      });
    }

    return team;
  };

  const disciplinaryTeam = buildDisciplinaryTeam();


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
            className="mt-4 bg-gray-50 hover:bg-gray-100"
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
            <h1 className="text-xl sm:text-2xl font-bold">Multidisciplinary Note</h1>
            <p className="text-muted-foreground text-sm">
              Team collaboration and care coordination for {resident.firstName} {resident.lastName}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => setIsNoteDialogOpen(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Note
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/residents/${id}/multidisciplinary-note/documents`)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View All Notes
            </Button>
          </div>
        </div>

      {/* Care Team Overview */}
      <Card className="border-0">
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Care Team</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTeamMemberDialogOpen(true)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {disciplinaryTeam.length} team members
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Multidisciplinary Care Team</span>
            </div>
            <div className="flex items-center space-x-2">

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTeamMemberDialogOpen(true)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Member
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {disciplinaryTeam.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disciplinaryTeam.map((member: any, index: number) => (
                <div key={member.id || index} className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      member.isFromResidentData ? 'bg-blue-100' :
                      member.isFromDatabase ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${
                        member.isFromResidentData ? 'text-blue-600' :
                        member.isFromDatabase ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <p className="text-xs text-gray-600">{member.role}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 text-xs">
                      {member.department}
                    </Badge>
                    {member.contact && (
                      <p className="text-xs text-gray-600 break-words">
                        {member.contact}
                      </p>
                    )}
                    {member.email && (
                      <p className="text-xs text-gray-600 break-words">
                        {member.email}
                      </p>
                    )}
                 
             
                 
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No team members found</h3>
                <p className="text-gray-500 text-sm">
                  No GP or Care Manager information is available in the resident data.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Multidisciplinary Notes */}
      <Card className="border-0">
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Recent Notes</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
              {recentNotes.length} recent notes
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Recent Multidisciplinary Notes</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
              {recentNotes.length} recent notes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!recentNotes || recentNotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No multidisciplinary notes recorded</p>
              <p className="text-gray-400 text-sm mt-1">
                Click the Create Note button to add the first note
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <div
                  key={note._id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          Visit by {note.teamMemberName}
                        </h4>
                        <Badge className="text-xs bg-blue-100 text-blue-800 border-0">
                          Team Visit
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{note.noteDate}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{note.noteTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <UserCheck className="w-3 h-3" />
                          <span>{note.signature}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            note.relativeInformed === 'yes'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            Relative {note.relativeInformed === 'yes' ? 'Informed' : 'Not Informed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mt-3 md:mt-0 md:ml-4 justify-end md:justify-start flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setSelectedNote(note);
                        setIsViewDialogOpen(true);
                      }}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Create Multidisciplinary Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Multidisciplinary Note for {fullName}</DialogTitle>
            <DialogDescription>
              Document comprehensive care observations and interdisciplinary collaboration.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">


              {/* Step 1: Basic Visit Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="noteDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note Date *</FormLabel>
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
                          <FormLabel>Note Time *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Team Member Selection */}
                  <FormField
                    control={form.control}
                    name="teamMemberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Member *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team member..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* GP from resident data */}
                            {resident?.gpName && (
                              <SelectItem value={`gp-${resident.gpName.replace(/\s+/g, '-').toLowerCase()}`}>
                                {resident.gpName} - General Practitioner
                              </SelectItem>
                            )}

                            {/* Care Manager from resident data */}
                            {resident?.careManagerName && (
                              <SelectItem value={`care-manager-${resident.careManagerName.replace(/\s+/g, '-').toLowerCase()}`}>
                                {resident.careManagerName} - Care Manager
                              </SelectItem>
                            )}

                            {/* Database team members */}
                            {careTeamMembers?.map((member) => (
                              <SelectItem key={member._id} value={member._id}>
                                {member.name} - {member.designation}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reasonForVisit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Visit *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the reason for this visit..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="outcome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outcome *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the outcome of the visit..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Relative Information & Signature */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="relativeInformed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relative Informed *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Was a relative informed?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="relativeInformedDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Details (if relative was informed)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Who was informed and how (phone, in person, etc.)..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature *</FormLabel>
                        <FormControl>
                          <Input placeholder="Digital signature or full name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="bg-gray-50 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="bg-gray-50 hover:bg-gray-100"
                    >
                      Previous
                    </Button>
                  )}
                </div>

                <div>
                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-700"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="bg-gray-50 hover:bg-gray-100 text-gray-700"
                    >
                      Create Note
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={isTeamMemberDialogOpen} onOpenChange={setIsTeamMemberDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Team Member for {fullName}</DialogTitle>
            <DialogDescription>
              Add a new multidisciplinary care team member for this resident.
            </DialogDescription>
          </DialogHeader>

          <Form {...teamMemberForm}>
            <form onSubmit={teamMemberForm.handleSubmit(handleTeamMemberSubmit)} className="space-y-6">

              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-blue-900">Basic Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={teamMemberForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={teamMemberForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title/Role *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Registered Nurse, Physiotherapist..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={teamMemberForm.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Speciality/Department *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Nursing, Medical, Physiotherapy..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-green-900">Contact Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={teamMemberForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={teamMemberForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={teamMemberForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Full address..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Organization Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-purple-900">Organization</h4>

                <FormField
                  control={teamMemberForm.control}
                  name="organisation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation/Trust</FormLabel>
                      <FormControl>
                        <Input placeholder="NHS Trust, Private Practice, etc..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsTeamMemberDialogOpen(false);
                    teamMemberForm.reset();
                  }}
                  className="bg-gray-50 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-gray-50 hover:bg-gray-100 text-gray-700">
                  Add Team Member
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Note Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Multidisciplinary Note Details</DialogTitle>
            <DialogDescription>
              Complete multidisciplinary note details for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedNote && (
              <div className="space-y-6">
                {/* Note Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Visit Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{format(new Date(selectedNote.noteDate), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">{selectedNote.noteTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Team Member</p>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedNote.teamMemberName}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Relative Informed</p>
                      <Badge className={`${
                        selectedNote.relativeInformed === 'yes'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      } border-0`}>
                        {selectedNote.relativeInformed === 'yes' ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Visit Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Visit Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Reason for Visit</p>
                      <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                        {selectedNote.reasonForVisit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Outcome</p>
                      <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                        {selectedNote.outcome}
                      </p>
                    </div>
                    {selectedNote.relativeInformedDetails && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Relative Contact Details</p>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {selectedNote.relativeInformedDetails}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Record Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Record Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Signed By</p>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedNote.signature}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Created</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{format(new Date(selectedNote.createdAt || selectedNote.noteDate), "PPP")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}