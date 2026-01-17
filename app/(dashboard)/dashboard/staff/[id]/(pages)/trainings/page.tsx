"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Bell,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { format } from "date-fns";

type TrainingsPageProps = {
  params: Promise<{ id: string }>;
};

type Training = {
  id: string;
  name: string;
  provider: string;
  status: "completed" | "in_progress" | "pending" | "expired";
  completionDate?: string;
  expiryDate?: string;
  certificateUrl?: string;
};

export default function StaffTrainingsPage({ params }: TrainingsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: activeOrg } = authClient.useActiveOrganization();

  // Find the staff member from organization members
  const staffMember = activeOrg?.members?.find((m) => m.id === id || m.userId === id);

  // Fetch staff member's profile image from Convex
  const userImage = useQuery(
    api.files.image.getUserImageByUserId,
    staffMember?.userId ? { userId: staffMember.userId } : "skip"
  );

  // Dialog states
  const [isOnlineDialogOpen, setIsOnlineDialogOpen] = React.useState(false);
  const [isInPersonDialogOpen, setIsInPersonDialogOpen] = React.useState(false);

  // Date picker states
  const [isCompletionDateOpen, setIsCompletionDateOpen] = React.useState(false);

  // Form state for new training
  const [newTraining, setNewTraining] = React.useState({
    name: "",
    provider: "",
    status: "pending" as "completed" | "in_progress" | "pending" | "expired",
    completionDate: "",
    expiryPeriod: "" as "" | "6_months" | "1_year" | "2_years",
  });

  // Dynamic training lists - starts empty
  const [onlineTrainings, setOnlineTrainings] = React.useState<Training[]>([]);
  const [inPersonTrainings, setInPersonTrainings] = React.useState<Training[]>([]);

  // Reset form
  const resetForm = () => {
    setNewTraining({
      name: "",
      provider: "",
      status: "pending",
      completionDate: "",
      expiryPeriod: "",
    });
  };

  // Calculate expiry date based on completion date and expiry period
  const calculateExpiryDate = (completionDate: string, expiryPeriod: string): string | undefined => {
    if (!completionDate || !expiryPeriod) return undefined;

    const completion = new Date(completionDate);
    const expiry = new Date(completion);

    switch (expiryPeriod) {
      case "6_months":
        expiry.setMonth(expiry.getMonth() + 6);
        break;
      case "1_year":
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
      case "2_years":
        expiry.setFullYear(expiry.getFullYear() + 2);
        break;
    }

    return expiry.toISOString();
  };

  // Handle form submission
  const handleAddTraining = (type: "online" | "inperson") => {
    // Calculate expiry date from completion date and expiry period
    const expiryDate = calculateExpiryDate(newTraining.completionDate, newTraining.expiryPeriod);

    // Create new training object with unique ID
    const trainingToAdd: Training = {
      id: Date.now().toString(), // Simple ID generation
      name: newTraining.name,
      provider: newTraining.provider,
      status: newTraining.status,
      completionDate: newTraining.completionDate || undefined,
      expiryDate: expiryDate,
    };

    // Add to appropriate list
    if (type === "online") {
      setOnlineTrainings([...onlineTrainings, trainingToAdd]);
      setIsOnlineDialogOpen(false);
    } else {
      setInPersonTrainings([...inPersonTrainings, trainingToAdd]);
      setIsInPersonDialogOpen(false);
    }

    toast({
      title: "Training Added",
      description: `${newTraining.name} has been added successfully.`,
    });

    resetForm();
  };

  const getStatusBadge = (status: Training["status"]) => {
    const config = {
      completed: {
        icon: CheckCircle2,
        className: "bg-green-100 text-green-800 border-green-300",
        label: "Completed",
      },
      in_progress: {
        icon: Clock,
        className: "bg-blue-100 text-blue-800 border-blue-300",
        label: "In Progress",
      },
      pending: {
        icon: AlertCircle,
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        label: "Pending",
      },
      expired: {
        icon: AlertCircle,
        className: "bg-red-100 text-red-800 border-red-300",
        label: "Expired",
      },
    };

    const { icon: Icon, className, label } = config[status];

    return (
      <Badge variant="table" className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Staff member not found</p>
          <p className="text-muted-foreground">
            The staff member you&apos;re looking for doesn&apos;t exist.
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

  const fullName = staffMember.user.name || staffMember.user.email;
  const nameParts = staffMember.user.name?.split(' ') || [];
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : staffMember.user.name?.[0]?.toUpperCase() || staffMember.user.email[0].toUpperCase();

  return (

<div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={userImage?.url || staffMember.user.image || ""}
              alt={fullName}
              className="border"
            />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-muted-foreground text-sm">
              Training & Certifications
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="relative bg-gray-50 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* ONLINE TRAININGS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Online Trainings</CardTitle>
            <Dialog open={isOnlineDialogOpen} onOpenChange={setIsOnlineDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Training
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Online Training</DialogTitle>
                  <DialogDescription>
                    Add a new online training record for this staff member
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="online-name">Training Name *</Label>
                      <Input
                        id="online-name"
                        placeholder="e.g., Safeguarding Adults"
                        value={newTraining.name}
                        onChange={(e) => setNewTraining({ ...newTraining, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="online-provider">Training Provider *</Label>
                      <Input
                        id="online-provider"
                        placeholder="e.g., Care Skills Academy"
                        value={newTraining.provider}
                        onChange={(e) => setNewTraining({ ...newTraining, provider: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="online-status">Status *</Label>
                    <Select
                      value={newTraining.status}
                      onValueChange={(value) => setNewTraining({ ...newTraining, status: value as typeof newTraining.status })}
                    >
                      <SelectTrigger id="online-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="online-completion">Completion Date</Label>
                      <Popover open={isCompletionDateOpen} onOpenChange={setIsCompletionDateOpen} modal>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newTraining.completionDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {newTraining.completionDate ? (
                              format(new Date(newTraining.completionDate), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={newTraining.completionDate ? new Date(newTraining.completionDate) : undefined}
                            onSelect={(date) => {
                              setNewTraining({
                                ...newTraining,
                                completionDate: date ? date.toISOString() : ""
                              });
                              setIsCompletionDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="online-expiry">Expiry Period</Label>
                      <Select
                        value={newTraining.expiryPeriod}
                        onValueChange={(value) => setNewTraining({ ...newTraining, expiryPeriod: value as typeof newTraining.expiryPeriod })}
                      >
                        <SelectTrigger id="online-expiry">
                          <SelectValue placeholder="Select expiry period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6_months">6 Months</SelectItem>
                          <SelectItem value="1_year">1 Year</SelectItem>
                          <SelectItem value="2_years">2 Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsOnlineDialogOpen(false);
                      resetForm();
                    }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleAddTraining("online")}
                      disabled={!newTraining.name || !newTraining.provider}
                    >
                      Add Training
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Training Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {onlineTrainings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No online trainings recorded
                  </TableCell>
                </TableRow>
              ) : (
                onlineTrainings.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell className="font-medium">{training.name}</TableCell>
                    <TableCell>{training.provider}</TableCell>
                    <TableCell>{getStatusBadge(training.status)}</TableCell>
                    <TableCell>
                      {training.completionDate
                        ? format(new Date(training.completionDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {training.expiryDate
                        ? format(new Date(training.expiryDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* IN-PERSON TRAININGS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>In-person Trainings</CardTitle>
            <Dialog open={isInPersonDialogOpen} onOpenChange={setIsInPersonDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Training
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add In-person Training</DialogTitle>
                  <DialogDescription>
                    Add a new in-person training record for this staff member
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inperson-name">Training Name *</Label>
                      <Input
                        id="inperson-name"
                        placeholder="e.g., Manual Handling"
                        value={newTraining.name}
                        onChange={(e) => setNewTraining({ ...newTraining, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inperson-provider">Training Provider *</Label>
                      <Input
                        id="inperson-provider"
                        placeholder="e.g., Care Training UK"
                        value={newTraining.provider}
                        onChange={(e) => setNewTraining({ ...newTraining, provider: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inperson-status">Status *</Label>
                    <Select
                      value={newTraining.status}
                      onValueChange={(value) => setNewTraining({ ...newTraining, status: value as typeof newTraining.status })}
                    >
                      <SelectTrigger id="inperson-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inperson-completion">Completion Date</Label>
                      <Popover open={isCompletionDateOpen} onOpenChange={setIsCompletionDateOpen} modal>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newTraining.completionDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {newTraining.completionDate ? (
                              format(new Date(newTraining.completionDate), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={newTraining.completionDate ? new Date(newTraining.completionDate) : undefined}
                            onSelect={(date) => {
                              setNewTraining({
                                ...newTraining,
                                completionDate: date ? date.toISOString() : ""
                              });
                              setIsCompletionDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inperson-expiry">Expiry Period</Label>
                      <Select
                        value={newTraining.expiryPeriod}
                        onValueChange={(value) => setNewTraining({ ...newTraining, expiryPeriod: value as typeof newTraining.expiryPeriod })}
                      >
                        <SelectTrigger id="inperson-expiry">
                          <SelectValue placeholder="Select expiry period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6_months">6 Months</SelectItem>
                          <SelectItem value="1_year">1 Year</SelectItem>
                          <SelectItem value="2_years">2 Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsInPersonDialogOpen(false);
                      resetForm();
                    }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleAddTraining("inperson")}
                      disabled={!newTraining.name || !newTraining.provider}
                    >
                      Add Training
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Training Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inPersonTrainings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No in-person trainings recorded
                  </TableCell>
                </TableRow>
              ) : (
                inPersonTrainings.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell className="font-medium">{training.name}</TableCell>
                    <TableCell>{training.provider}</TableCell>
                    <TableCell>{getStatusBadge(training.status)}</TableCell>
                    <TableCell>
                      {training.completionDate
                        ? format(new Date(training.completionDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {training.expiryDate
                        ? format(new Date(training.expiryDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
