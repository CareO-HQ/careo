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
  Users,
  User,
  Calendar,
  Clock,
  Plus,
  Eye,
  Smile,
  Heart,
  Music,
  Coffee,
  BookOpen,
  Camera,
  Phone,
  MessageCircle,
  Activity,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { PersonalInterestsDialog } from "@/components/residents/PersonalInterestsDialog";

type LifestyleSocialPageProps = {
  params: Promise<{ id: string }>;
};

// Social Activity Schema
const SocialActivitySchema = z.object({
  activityDate: z.string().min(1, "Activity date is required"),
  activityTime: z.string().min(1, "Activity time is required"),
  activityType: z.enum([
    "group_activity",
    "one_on_one",
    "family_visit",
    "outing",
    "entertainment",
    "exercise",
    "crafts",
    "music",
    "reading",
    "games",
    "therapy",
    "religious",
    "other"
  ]),
  activityName: z.string().min(1, "Activity name is required"),
  participants: z.string().optional(),
  location: z.string().optional(),
  duration: z.string().optional(),
  engagementLevel: z.enum(["very_engaged", "engaged", "somewhat_engaged", "minimal", "disengaged"]).optional(),
  moodBefore: z.enum(["excellent", "good", "neutral", "poor", "very_poor"]).optional(),
  moodAfter: z.enum(["excellent", "good", "neutral", "poor", "very_poor"]).optional(),
  socialInteraction: z.enum(["active", "responsive", "minimal", "withdrawn"]).optional(),
  enjoyment: z.enum(["loved_it", "enjoyed", "neutral", "disliked", "refused"]).optional(),
  recordedBy: z.string().min(1, "Recorded by is required"),
});

type SocialActivityFormData = z.infer<typeof SocialActivitySchema>;

// Social Connection Schema
const SocialConnectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  type: z.enum(["family", "friend", "staff", "other"]),
  contactFrequency: z.string().min(1, "Contact frequency is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type SocialConnectionFormData = z.infer<typeof SocialConnectionSchema>;

export default function LifestyleSocialPage({ params }: LifestyleSocialPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // State declarations (must come before computed values that use them)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = React.useState(false);
  const [isPersonalInterestsDialogOpen, setIsPersonalInterestsDialogOpen] = React.useState(false);
  const [isSocialConnectionDialogOpen, setIsSocialConnectionDialogOpen] = React.useState(false);
  const [currentActivityStep, setCurrentActivityStep] = React.useState(1);
  const [activitiesPage, setActivitiesPage] = React.useState(1);
  const activitiesPerPage = 10;

  // Fetch personal interests data
  const personalInterests = useQuery(api.personalInterests.getPersonalInterestsByResidentId, {
    residentId: id as Id<"residents">
  });

  // Fetch paginated social activities (server-side pagination)
  const activitiesData = useQuery(api.socialActivities.getPaginatedSocialActivities, {
    residentId: id as Id<"residents">,
    page: activitiesPage,
    pageSize: activitiesPerPage,
  });

  // Fetch social connections
  const socialConnections = useQuery(api.socialConnections.getSocialConnectionsByResidentId, {
    residentId: id as Id<"residents">,
  });

  // Mutations
  const createSocialActivityMutation = useMutation(api.socialActivities.createSocialActivity);
  const createSocialConnectionMutation = useMutation(api.socialConnections.createSocialConnection);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().slice(0, 5);

  // Form setup
  const form = useForm<SocialActivityFormData>({
    resolver: zodResolver(SocialActivitySchema),
    defaultValues: {
      activityDate: today,
      activityTime: currentTime,
      activityType: "group_activity",
      activityName: "",
      participants: "",
      location: "",
      duration: "",
      engagementLevel: "engaged",
      moodBefore: "good",
      moodAfter: "good",
      socialInteraction: "active",
      enjoyment: "enjoyed",
      recordedBy: "",
    },
  });

  // Social connection form setup
  const connectionForm = useForm<SocialConnectionFormData>({
    resolver: zodResolver(SocialConnectionSchema),
    defaultValues: {
      name: "",
      relationship: "",
      type: "family",
      contactFrequency: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  // Auth data
  const { data: user } = authClient.useSession();

  // Update staff field when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('recordedBy', staffName);
    }
  }, [user, form]);

  const handleSubmit = async (data: SocialActivityFormData) => {
    // Prevent submission if not on the final step
    if (currentActivityStep !== 3) {
      return;
    }

    try {
      if (!user?.user?.id) {
        toast.error("Missing user information");
        return;
      }

      const organizationId = user.user.activeTeamId || resident?.organizationId;

      if (!organizationId) {
        toast.error("Missing organization information");
        return;
      }

      await createSocialActivityMutation({
        residentId: id as Id<"residents">,
        activityDate: data.activityDate,
        activityTime: data.activityTime,
        activityType: data.activityType,
        activityName: data.activityName,
        participants: data.participants,
        location: data.location,
        duration: data.duration,
        engagementLevel: data.engagementLevel,
        moodBefore: data.moodBefore,
        moodAfter: data.moodAfter,
        socialInteraction: data.socialInteraction,
        enjoyment: data.enjoyment,
        recordedBy: data.recordedBy,
        organizationId: organizationId,
        createdBy: user.user.id,
      });

      toast.success("Social activity recorded successfully");

      // Reset form with current date/time for next entry
      form.reset({
        activityDate: new Date().toISOString().split('T')[0],
        activityTime: new Date().toTimeString().slice(0, 5),
        activityType: "group_activity",
        activityName: "",
        participants: "",
        location: "",
        duration: "",
        engagementLevel: "engaged",
        moodBefore: "good",
        moodAfter: "good",
        socialInteraction: "active",
        enjoyment: "enjoyed",
        recordedBy: user.user.name || user.user.email?.split('@')[0] || "",
      });

      setCurrentActivityStep(1);
      setIsActivityDialogOpen(false);
    } catch (error) {
      console.error("Error recording social activity:", error);
      toast.error("Failed to record social activity");
    }
  };

  const handleConnectionSubmit = async (data: SocialConnectionFormData) => {
    try {
      if (!user?.user?.id) {
        toast.error("Missing user information");
        return;
      }

      const organizationId = user.user.activeTeamId || resident?.organizationId;

      if (!organizationId) {
        toast.error("Missing organization information");
        return;
      }

      await createSocialConnectionMutation({
        residentId: id as Id<"residents">,
        name: data.name,
        relationship: data.relationship,
        type: data.type,
        contactFrequency: data.contactFrequency,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        organizationId,
        createdBy: user.user.id,
      });

      toast.success("Social connection added successfully");

      // Reset form
      connectionForm.reset();
      setIsSocialConnectionDialogOpen(false);
    } catch (error) {
      console.error("Error adding social connection:", error);
      toast.error("Failed to add social connection");
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

  // Mock lifestyle and social data
  const mockPreferences = {
    interests: ["Reading", "Classical Music", "Garden Walking", "Card Games", "Painting"],
    hobbies: ["Crossword Puzzles", "Knitting", "Bird Watching"],
    socialPreferences: ["Small Groups", "Quiet Activities", "Morning Sessions"],
    favoriteActivities: ["Bingo", "Music Therapy", "Tea Time", "Art & Crafts"]
  };



  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'very_engaged':
        return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' };
      case 'engaged':
        return { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' };
      case 'somewhat_engaged':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      case 'minimal':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'group_activity':
        return <Users className="w-4 h-4" />;
      case 'one_on_one':
        return <User className="w-4 h-4" />;
      case 'family_visit':
        return <Heart className="w-4 h-4" />;
      case 'music':
        return <Music className="w-4 h-4" />;
      case 'exercise':
        return <Activity className="w-4 h-4" />;
      case 'reading':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
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
          <h1 className="text-xl sm:text-2xl font-bold">Lifestyle & Social</h1>
          <p className="text-muted-foreground text-sm">
            View social activities and personal interests for {resident.firstName} {resident.lastName}.
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/residents/${id}/lifestyle-social/documents`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View History
          </Button>
          <Button
            onClick={() => setIsActivityDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Activity
          </Button>
        </div>
      </div>

      {/* Personal Interests & Preferences */}
      <Card className="border-0">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-3">
              <Star className="w-5 h-5 text-yellow-600" />
              <span className="text-gray-900">Personal Interests & Preferences</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPersonalInterestsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {personalInterests ? "Edit" : "Add"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-purple-800 mb-3">Main Interests</h4>
              <div className="flex flex-wrap gap-2">
                {personalInterests?.mainInterests && personalInterests.mainInterests.length > 0 ? (
                  personalInterests.mainInterests.map((interest, index) => (
                    <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No interests added yet</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-3">Hobbies</h4>
              <div className="flex flex-wrap gap-2">
                {personalInterests?.hobbies && personalInterests.hobbies.length > 0 ? (
                  personalInterests.hobbies.map((hobby, index) => (
                    <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                      {hobby}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hobbies added yet</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-green-800 mb-3">Social Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {personalInterests?.socialPreferences && personalInterests.socialPreferences.length > 0 ? (
                  personalInterests.socialPreferences.map((pref, index) => (
                    <Badge key={index} variant="outline" className="bg-green-50 border-green-200 text-green-700">
                      {pref}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No preferences added yet</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-orange-800 mb-3">Favorite Activities</h4>
              <div className="flex flex-wrap gap-2">
                {personalInterests?.favoriteActivities && personalInterests.favoriteActivities.length > 0 ? (
                  personalInterests.favoriteActivities.map((activity, index) => (
                    <Badge key={index} variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                      {activity}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No activities added yet</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Social Activities */}
      <Card className="border-0">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Activity className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">Recent Social Activities</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-700">{activitiesData?.totalCount || 0} Total</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {activitiesData === undefined ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading activities...</p>
            </div>
          ) : activitiesData.totalCount === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No activities recorded</p>
              <p className="text-gray-400 text-sm mt-1">
                Click the Record New Activity button to add the first activity
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {activitiesData.activities.map((activity) => (
                <div
                  key={activity._id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      {getActivityTypeIcon(activity.activityType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{activity.activityName}</h4>
                        <Badge
                          className={`text-xs border-0 ${
                            activity.activityType === "group_activity" ? "bg-purple-100 text-purple-800" :
                            activity.activityType === "one_on_one" ? "bg-blue-100 text-blue-800" :
                            activity.activityType === "family_visit" ? "bg-pink-100 text-pink-800" :
                            activity.activityType === "outing" ? "bg-green-100 text-green-800" :
                            activity.activityType === "exercise" ? "bg-orange-100 text-orange-800" :
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {activity.activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(activity.activityDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{activity.activityTime}</span>
                        </div>
                        {activity.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{activity.location}</span>
                          </div>
                        )}
                        {activity.engagementLevel && (
                          <div className="flex items-center space-x-1">
                            <Smile className="w-3 h-3" />
                            <span>{activity.engagementLevel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* Pagination Controls */}
              {activitiesData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {((activitiesPage - 1) * activitiesPerPage) + 1} to {Math.min(activitiesPage * activitiesPerPage, activitiesData.totalCount)} of {activitiesData.totalCount} activities
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivitiesPage(prev => Math.max(1, prev - 1))}
                      disabled={activitiesPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {activitiesPage} of {activitiesData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivitiesPage(prev => Math.min(activitiesData.totalPages, prev + 1))}
                      disabled={activitiesPage === activitiesData.totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Social Connections */}
      <Card className="border-0">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-gray-900">Social Connections</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSocialConnectionDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!socialConnections || socialConnections.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No social connections added</p>
              <p className="text-gray-400 text-sm mt-1">
                Click Add Member to add the first connection
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialConnections.map((connection) => (
                <div key={connection._id} className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      connection.type === 'family' ? 'bg-blue-100' :
                      connection.type === 'friend' ? 'bg-green-100' :
                      connection.type === 'staff' ? 'bg-purple-100' :
                      'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${
                        connection.type === 'family' ? 'text-blue-600' :
                        connection.type === 'friend' ? 'text-green-600' :
                        connection.type === 'staff' ? 'text-purple-600' :
                        'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{connection.name}</h4>
                      <p className="text-xs text-gray-600">{connection.relationship}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 text-xs">
                      {connection.type.charAt(0).toUpperCase() + connection.type.slice(1)}
                    </Badge>
                    {connection.phone && (
                      <p className="text-xs text-gray-600 break-words">
                        {connection.phone}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lifestyle Summary */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="text-gray-900">Lifestyle Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {activitiesData?.totalCount || 0}
              </div>
              <p className="text-sm text-purple-700">Total Activities</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {personalInterests?.favoriteActivities?.length || 0}
              </div>
              <p className="text-sm text-green-700">Favorite Activities</p>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="text-2xl font-bold text-pink-600">
                {socialConnections?.length || 0}
              </div>
              <p className="text-sm text-pink-700">Social Connections</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {(personalInterests?.mainInterests?.length || 0) + (personalInterests?.hobbies?.length || 0)}
              </div>
              <p className="text-sm text-yellow-700">Personal Interests</p>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Record Social Activity Dialog */}
      <Dialog
        open={isActivityDialogOpen}
        onOpenChange={(open) => {
          setIsActivityDialogOpen(open);
          if (!open) {
            setCurrentActivityStep(1);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Record Social Activity for {fullName}</DialogTitle>
            <DialogDescription>
              Step {currentActivityStep} of 3: {currentActivityStep === 1 ? 'Activity Details' : currentActivityStep === 2 ? 'Assessment & Mood' : 'Review & Confirm'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

              {/* Step 1: Activity Details */}
              {currentActivityStep === 1 && (
                <div className="space-y-6">
                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="activityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activityTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

                  {/* Activity Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-purple-900">Activity Details</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="activityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activity Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select activity type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="group_activity">Group Activity</SelectItem>
                            <SelectItem value="one_on_one">One-on-One</SelectItem>
                            <SelectItem value="family_visit">Family Visit</SelectItem>
                            <SelectItem value="outing">Outing</SelectItem>
                            <SelectItem value="entertainment">Entertainment</SelectItem>
                            <SelectItem value="exercise">Exercise</SelectItem>
                            <SelectItem value="crafts">Arts & Crafts</SelectItem>
                            <SelectItem value="music">Music</SelectItem>
                            <SelectItem value="reading">Reading</SelectItem>
                            <SelectItem value="games">Games</SelectItem>
                            <SelectItem value="therapy">Therapy</SelectItem>
                            <SelectItem value="religious">Religious</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activity Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Music Therapy Session" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participants</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 6 residents" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Activity Room" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 60 minutes" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Assessment & Mood */}
              {currentActivityStep === 2 && (
                <div className="space-y-6">
                  {/* Engagement & Mood Assessment */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-green-900">Assessment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="engagementLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Engagement Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select engagement..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="very_engaged">Very Engaged</SelectItem>
                                <SelectItem value="engaged">Engaged</SelectItem>
                                <SelectItem value="somewhat_engaged">Somewhat Engaged</SelectItem>
                                <SelectItem value="minimal">Minimal</SelectItem>
                                <SelectItem value="disengaged">Disengaged</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="socialInteraction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Social Interaction</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select interaction..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="responsive">Responsive</SelectItem>
                                <SelectItem value="minimal">Minimal</SelectItem>
                                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="moodBefore"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mood Before</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select mood..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="excellent">Excellent</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="neutral">Neutral</SelectItem>
                                <SelectItem value="poor">Poor</SelectItem>
                                <SelectItem value="very_poor">Very Poor</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="moodAfter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mood After</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select mood..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="excellent">Excellent</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="neutral">Neutral</SelectItem>
                                <SelectItem value="poor">Poor</SelectItem>
                                <SelectItem value="very_poor">Very Poor</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="enjoyment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enjoyment Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select enjoyment..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="loved_it">Loved It</SelectItem>
                              <SelectItem value="enjoyed">Enjoyed</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="disliked">Disliked</SelectItem>
                              <SelectItem value="refused">Refused</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Summary */}
              {currentActivityStep === 3 && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      {(() => {
                        const formValues = form.watch();
                        const hasActivity = formValues.activityName?.trim();
                        const hasAssessment = formValues.engagementLevel || formValues.moodBefore || formValues.moodAfter;

                        return (
                          <>
                            {hasActivity && <p><span className="font-medium">Activity:</span> {formValues.activityName}</p>}
                            {formValues.activityType && <p><span className="font-medium">Type:</span> {formValues.activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                            {formValues.activityDate && <p><span className="font-medium">Date:</span> {new Date(formValues.activityDate).toLocaleDateString()}</p>}
                            {formValues.activityTime && <p><span className="font-medium">Time:</span> {formValues.activityTime}</p>}
                            {formValues.participants && <p><span className="font-medium">Participants:</span> {formValues.participants}</p>}
                            {formValues.location && <p><span className="font-medium">Location:</span> {formValues.location}</p>}
                            {formValues.duration && <p><span className="font-medium">Duration:</span> {formValues.duration}</p>}
                            {formValues.engagementLevel && <p><span className="font-medium">Engagement:</span> {formValues.engagementLevel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                            {formValues.moodBefore && <p><span className="font-medium">Mood Before:</span> {formValues.moodBefore.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                            {formValues.moodAfter && <p><span className="font-medium">Mood After:</span> {formValues.moodAfter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                            {formValues.enjoyment && <p><span className="font-medium">Enjoyment:</span> {formValues.enjoyment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>}
                            {!hasActivity && !hasAssessment && (
                              <p className="text-muted-foreground italic">Fill in the previous steps to see summary</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <div>
                  {currentActivityStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentActivityStep(currentActivityStep - 1)}
                    >
                      Previous
                    </Button>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsActivityDialogOpen(false);
                      setCurrentActivityStep(1);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>

                  {currentActivityStep < 3 ? (
                    <Button
                      type="button"
                      onClick={() => setCurrentActivityStep(currentActivityStep + 1)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        form.handleSubmit(handleSubmit)();
                      }}
                    >
                      Record Activity
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Personal Interests Dialog */}
      <PersonalInterestsDialog
        isOpen={isPersonalInterestsDialogOpen}
        onOpenChange={setIsPersonalInterestsDialogOpen}
        residentId={id}
        residentName={fullName}
        organizationId={user?.user?.activeTeamId || ""}
        createdBy={user?.user?.id || ""}
        existingData={personalInterests ? {
          mainInterests: personalInterests.mainInterests,
          hobbies: personalInterests.hobbies,
          socialPreferences: personalInterests.socialPreferences,
          favoriteActivities: personalInterests.favoriteActivities,
        } : undefined}
      />

      {/* Add Social Connection Dialog */}
      <Dialog open={isSocialConnectionDialogOpen} onOpenChange={setIsSocialConnectionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Social Connection for {fullName}</DialogTitle>
            <DialogDescription>
              Add a new social connection or contact person
            </DialogDescription>
          </DialogHeader>

          <Form {...connectionForm}>
            <form onSubmit={connectionForm.handleSubmit(handleConnectionSubmit)} className="space-y-4">
              {/* Name */}
              <FormField
                control={connectionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sarah Wilson" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Relationship & Type */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={connectionForm.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Daughter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={connectionForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Frequency */}
              <FormField
                control={connectionForm.control}
                name="contactFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Contact Frequency</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Daily, Weekly, 3x/week" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={connectionForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={connectionForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={connectionForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSocialConnectionDialogOpen(false);
                    connectionForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Add Connection
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}