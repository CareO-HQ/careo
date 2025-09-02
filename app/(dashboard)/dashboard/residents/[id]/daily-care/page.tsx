"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Activity,
  User,
  Bed,
  Home
} from "lucide-react";
import { useRouter } from "next/navigation";

type DailyCarePageProps = {
  params: Promise<{ id: string }>;
};

export default function DailyCarePage({ params }: DailyCarePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get today's date
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // State variables
  const [selectedActivity, setSelectedActivity] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [selectedTime, setSelectedTime] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Get personal care task statuses for today
  const personalCareStatuses = useQuery(api.personalCare.getPersonalCareTaskStatuses, {
    residentId: id as Id<"residents">,
    date: today,
  });

  // Mutations
  const updatePersonalCareTask = useMutation(api.personalCare.updatePersonalCareTask);

  // Define activity options
  const activityOptions = [
    { key: "bath", label: "Bath" },
    { key: "dressed", label: "Dressed" },
    { key: "brushed", label: "Brushed" },
  ];
  const statusOptions = [
    { key: "done", label: "Done" },
    { key: "refused", label: "Refused" },
    { key: "not_present", label: "Not present" },
    { key: "na", label: "N/A" },
  ];

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedActivity || !selectedStatus || !selectedTime) return;
    
    try {
      const status = selectedStatus === "done" ? "completed" : "pending";
      
      await updatePersonalCareTask({
        residentId: id as Id<"residents">,
        date: today,
        taskType: selectedActivity,
        status,
        timePeriod: "morning" as "morning" | "afternoon" | "evening" | "night",
        notes: notes || undefined,
      });
      
      // Clear form
      setSelectedActivity("");
      setSelectedStatus("");
      setSelectedTime("");
      setNotes("");
    } catch (error) {
      console.error("Error saving personal care task:", error);
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
        <span className="text-foreground">Daily Care</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Daily Care</h1>
              <p className="text-muted-foreground">Care activities & dependencies for {fullName}</p>
            </div>
          </div>
          <Button 
            variant="outline"
            onClick={() => router.push(`/dashboard/residents/${id}/daily-care/documents`)}
            className="flex items-center space-x-2"
          >
            <Bed className="w-4 h-4" />
            <span>Show All Documents</span>
          </Button>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="flex items-center space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Resident Page</span>
        </Button>
      </div>

      {/* Today's Personal Care */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Today&apos;s Personal Care</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Box - Activity Selection and Time */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Activity</Label>
                <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose activity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activityOptions.map((activity) => (
                      <SelectItem key={activity.key} value={activity.key}>
                        {activity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.key} value={status.key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Time</Label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  placeholder="Select time"
                />
              </div>
              
              <Button 
                onClick={handleSubmit}
                disabled={!selectedActivity || !selectedStatus || !selectedTime}
                className="w-full"
              >
                Save Activity
              </Button>
            </div>

            {/* Right Box - Notes and Save */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add Notes</Label>
                <Input
                  placeholder="Enter notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={!selectedActivity || !selectedStatus || !selectedTime}
                className="w-full"
              >
                Save Care Activity
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Care Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bed className="w-5 h-5 text-indigo-600" />
            <span>Care Notes & Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Personal Preferences</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Prefers shower in the evening</li>
                <li>• Likes to be independent when possible</li>
                <li>• Requires verbal encouragement</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Mobility Aids</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Uses walking frame for mobility</li>
                <li>• Requires non-slip mat in bathroom</li>
                <li>• Bed rails for safety</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {personalCareStatuses ? Object.values(personalCareStatuses).filter(status => status?.status === "completed").length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Care Items Completed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {activityOptions.length}
            </div>
            <p className="text-sm text-muted-foreground">Available Activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {resident?.dependencies && typeof resident.dependencies === 'object' ? 
                Object.keys(resident.dependencies).length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Dependencies</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}