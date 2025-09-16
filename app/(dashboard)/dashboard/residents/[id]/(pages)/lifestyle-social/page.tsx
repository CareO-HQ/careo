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
  MapPin
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

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
  notes: z.string().optional(),
  followUpNeeded: z.string().optional(),
  recordedBy: z.string().min(1, "Recorded by is required"),
});

type SocialActivityFormData = z.infer<typeof SocialActivitySchema>;

export default function LifestyleSocialPage({ params }: LifestyleSocialPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

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
      notes: "",
      followUpNeeded: "",
      recordedBy: "",
    },
  });

  // Dialog states
  const [isActivityDialogOpen, setIsActivityDialogOpen] = React.useState(false);

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
    try {
      // Implement social activity record creation
      toast.success("Social activity recorded successfully");
      form.reset();
      setIsActivityDialogOpen(false);
    } catch (error) {
      console.error("Error recording social activity:", error);
      toast.error("Failed to record social activity");
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

  const mockRecentActivities = [
    {
      id: 1,
      date: "2024-01-15",
      time: "14:30",
      activity: "Music Therapy Session",
      type: "group_activity",
      participants: "6 residents",
      location: "Activity Room",
      engagement: "very_engaged",
      mood: "excellent",
      duration: "60 minutes"
    },
    {
      id: 2,
      date: "2024-01-14",
      time: "10:00",
      activity: "Garden Walking",
      type: "exercise",
      participants: "2 residents + staff",
      location: "Garden",
      engagement: "engaged",
      mood: "good",
      duration: "45 minutes"
    },
    {
      id: 3,
      date: "2024-01-13",
      time: "15:00",
      activity: "Family Visit",
      type: "family_visit",
      participants: "Daughter and grandson",
      location: "Resident Room",
      engagement: "very_engaged",
      mood: "excellent",
      duration: "90 minutes"
    }
  ];

  const mockSocialConnections = [
    {
      name: "Margaret Thompson",
      relationship: "Roommate",
      frequency: "Daily",
      type: "friendship"
    },
    {
      name: "Sarah Wilson",
      relationship: "Daughter",
      frequency: "Weekly",
      type: "family"
    },
    {
      name: "Tom Richards",
      relationship: "Activity Partner",
      frequency: "3x/week",
      type: "friendship"
    }
  ];

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
        <span className="text-foreground">Lifestyle & Social</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Lifestyle & Social</h1>
            <p className="text-muted-foreground text-sm">Social activities & personal interests</p>
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
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {mockRecentActivities.length} Activities
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsActivityDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Activity
              </Button>
              <Button
                variant="outline"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
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
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Social & Lifestyle
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsActivityDialogOpen(true)}
                className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Record Activity</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Interests & Preferences */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <span>Personal Interests</span>
            </div>
            <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
              {mockPreferences.interests.length + mockPreferences.hobbies.length} interests
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <span>Personal Interests & Preferences</span>
            </div>
            <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
              {mockPreferences.interests.length + mockPreferences.hobbies.length} interests
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-purple-800 mb-3">Main Interests</h4>
              <div className="flex flex-wrap gap-2">
                {mockPreferences.interests.map((interest, index) => (
                  <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-3">Hobbies</h4>
              <div className="flex flex-wrap gap-2">
                {mockPreferences.hobbies.map((hobby, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                    {hobby}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-green-800 mb-3">Social Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {mockPreferences.socialPreferences.map((pref, index) => (
                  <Badge key={index} variant="outline" className="bg-green-50 border-green-200 text-green-700">
                    {pref}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-orange-800 mb-3">Favorite Activities</h4>
              <div className="flex flex-wrap gap-2">
                {mockPreferences.favoriteActivities.map((activity, index) => (
                  <Badge key={index} variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Social Activities */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-green-600" />
              <span>Recent Activities</span>
            </div>
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
              {mockRecentActivities.length} recent activities
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <span>Recent Social Activities</span>
            </div>
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
              {mockRecentActivities.length} recent activities
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockRecentActivities.map((activity) => (
              <Card key={activity.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        {getActivityTypeIcon(activity.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{activity.activity}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{activity.date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{activity.time}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{activity.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline"
                        className={getEngagementColor(activity.engagement).bg + ' ' + 
                                   getEngagementColor(activity.engagement).border + ' ' +
                                   getEngagementColor(activity.engagement).text}
                      >
                        {activity.engagement.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Participants:</span>
                      <p className="text-gray-700">{activity.participants}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p className="text-gray-700">{activity.duration}</p>
                    </div>
                    <div>
                      <span className="font-medium">Mood:</span>
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 ml-1">
                        {activity.mood}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Connections */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="w-5 h-5 text-pink-600" />
              <span>Social Connections</span>
            </div>
            <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700">
              {mockSocialConnections.length} connections
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-pink-600" />
              <span>Social Connections</span>
            </div>
            <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700">
              {mockSocialConnections.length} connections
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockSocialConnections.map((connection, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    {connection.type === 'family' ? <Heart className="w-4 h-4 text-pink-600" /> : <Users className="w-4 h-4 text-pink-600" />}
                  </div>
                  <div>
                    <h4 className="font-semibold">{connection.name}</h4>
                    <p className="text-sm text-gray-600">{connection.relationship}</p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Contact Frequency:</span>
                  <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700 ml-2">
                    {connection.frequency}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lifestyle Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Lifestyle Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {mockRecentActivities.length}
              </div>
              <p className="text-sm text-purple-700">Recent Activities</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {mockPreferences.favoriteActivities.length}
              </div>
              <p className="text-sm text-green-700">Favorite Activities</p>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="text-2xl font-bold text-pink-600">
                {mockSocialConnections.length}
              </div>
              <p className="text-sm text-pink-700">Social Connections</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {mockPreferences.interests.length}
              </div>
              <p className="text-sm text-yellow-700">Personal Interests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Social Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setIsActivityDialogOpen(true)}
            >
              <Plus className="w-6 h-6 mr-3" />
              Record New Activity
            </Button>
            <Button
             className="h-16 text-lg bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Eye className="w-6 h-6 mr-3" />
              View Activity History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Record Social Activity Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Social Activity for {fullName}</DialogTitle>
            <DialogDescription>
              Record social activities, engagement levels, and observations.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
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

              {/* Notes */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the activity, resident's participation, and any notable observations..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUpNeeded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Needed</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any follow-up actions or recommendations..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
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
                    setIsActivityDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Record Activity
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Development Notice */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-purple-800 mb-2">Enhanced Features Coming Soon</h3>
          <p className="text-purple-600 text-sm">
            Advanced social analytics, activity recommendations, mood tracking trends, and personalized engagement plans are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}