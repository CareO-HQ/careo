"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Activity,
  User,
  Utensils,
  Shirt,
  Bath,
  Bed,
  CheckCircle,
  Clock,
  AlertTriangle,
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

  const getDependencyIcon = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'mobility':
        return User;
      case 'eating':
        return Utensils;
      case 'dressing':
        return Shirt;
      case 'toileting':
        return Bath;
      default:
        return Activity;
    }
  };

  const getDependencyColor = (level: string) => {
    switch (level) {
      case 'Independent':
        return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' };
      case 'Supervision Needed':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      case 'Assistance Needed':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'Fully Dependent':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

  // Mock today's care tasks
  const todayCare = [
    { time: "07:00", task: "Morning wash", status: "completed", carer: "Sarah M." },
    { time: "08:00", task: "Breakfast assistance", status: "completed", carer: "Sarah M." },
    { time: "10:00", task: "Mobility exercise", status: "completed", carer: "John D." },
    { time: "12:00", task: "Lunch assistance", status: "pending", carer: "Mary K." },
    { time: "14:00", task: "Afternoon medication", status: "pending", carer: "Mary K." },
    { time: "18:00", task: "Dinner assistance", status: "scheduled", carer: "Tom R." },
    { time: "20:00", task: "Evening wash", status: "scheduled", carer: "Tom R." }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' };
      case 'pending':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'scheduled':
        return { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
    }
  };

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

      {/* Today's Care Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Today&apos;s Care Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayCare.map((care, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="text-sm font-mono font-bold text-gray-600 min-w-[50px]">
                  {care.time}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{care.task}</p>
                  <p className="text-sm text-gray-500">Assigned to: {care.carer}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {care.status === "completed" && (
                    <Badge className={`${getStatusColor(care.status).bg} ${getStatusColor(care.status).border} ${getStatusColor(care.status).text}`}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {care.status === "pending" && (
                    <Badge variant="outline" className={`${getStatusColor(care.status).bg} ${getStatusColor(care.status).border} ${getStatusColor(care.status).text}`}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {care.status === "scheduled" && (
                    <Badge variant="outline" className={`${getStatusColor(care.status).bg} ${getStatusColor(care.status).border} ${getStatusColor(care.status).text}`}>
                      <Clock className="w-3 h-3 mr-1" />
                      Scheduled
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Care Dependencies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-purple-600" />
            <span>Care Dependencies</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resident.dependencies && typeof resident.dependencies === 'object' && !Array.isArray(resident.dependencies) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(resident.dependencies as {
                mobility: string;
                eating: string;
                dressing: string;
                toileting: string;
              }).map(([activity, level]) => {
                const Icon = getDependencyIcon(activity);
                const colors = getDependencyColor(level);
                
                return (
                  <Card key={activity} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 ${colors.bg} rounded-lg`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold capitalize text-lg">{activity}</h3>
                          <Badge 
                            variant="outline" 
                            className={`${colors.bg} ${colors.border} ${colors.text} mt-2`}
                          >
                            {level}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Activity-specific guidance */}
                      <div className="mt-3 text-sm text-gray-600">
                        {activity === 'mobility' && level !== 'Independent' && (
                          <p>• Requires assistance with movement and transfers</p>
                        )}
                        {activity === 'eating' && level !== 'Independent' && (
                          <p>• Needs help with meal preparation or feeding</p>
                        )}
                        {activity === 'dressing' && level !== 'Independent' && (
                          <p>• Requires support with clothing and personal appearance</p>
                        )}
                        {activity === 'toileting' && level !== 'Independent' && (
                          <p>• Needs assistance with personal hygiene</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No care dependency information available</p>
              <p className="text-sm text-gray-400 mt-1">Care assessment needed</p>
            </div>
          )}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {todayCare.filter(c => c.status === "completed").length}
            </div>
            <p className="text-sm text-muted-foreground">Completed Today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {todayCare.filter(c => c.status === "pending").length}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {todayCare.filter(c => c.status === "scheduled").length}
            </div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {resident.dependencies && typeof resident.dependencies === 'object' ? 
                Object.keys(resident.dependencies).length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Dependencies</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}