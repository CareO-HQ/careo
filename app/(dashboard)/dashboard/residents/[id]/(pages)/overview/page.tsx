"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Id, Doc } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Phone,
  Calendar,
  MapPin,
  Clock,
  User,
  Mail,
  FileText,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";

type OverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default function OverviewPage({ params }: OverviewPageProps) {
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
  const initials =
    `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

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

  const calculateLengthOfStay = (admissionDate: string) => {
    const today = new Date();
    const admission = new Date(admissionDate);
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Overview</h1>
              <p className="text-muted-foreground">Basic information for {fullName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="w-24 h-24 mx-auto md:mx-0">
              <AvatarImage src="" alt={fullName} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold">{fullName}</h2>
              <p className="text-lg text-muted-foreground mt-1">
                {calculateAge(resident.dateOfBirth)} years old
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                  Room {resident.roomNumber || "N/A"}
                </Badge>
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                  {calculateLengthOfStay(resident.admissionDate)} stay
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Personal Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-medium">{resident.dateOfBirth}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Room Number</p>
                <p className="font-medium">{resident.roomNumber || "Not assigned"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Admission Date</p>
                <p className="font-medium">{resident.admissionDate}</p>
              </div>
            </div>

            {resident.phoneNumber && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="font-medium">{resident.phoneNumber}</p>
                </div>
              </div>
            )}

            {resident.nhsHealthNumber && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">NHS Health Number</p>
                  <p className="font-medium font-mono">{resident.nhsHealthNumber}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-red-600" />
              <span>Emergency Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
              <div className="space-y-4">
                {resident.emergencyContacts.map((contact: Doc<"emergencyContacts">, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                      {contact.isPrimary && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          Primary Contact
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Relationship:</span> {contact.relationship}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Phone:</span> {contact.phoneNumber}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No emergency contacts on file</p>
                <p className="text-sm text-gray-400 mt-1">Contact information should be added for safety</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {calculateAge(resident.dateOfBirth)}
              </div>
              <p className="text-sm text-gray-600">Years Old</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {calculateLengthOfStay(resident.admissionDate).split(' ')[0]}
              </div>
              <p className="text-sm text-gray-600">
                {calculateLengthOfStay(resident.admissionDate).includes('day') ? 'Days' : 
                 calculateLengthOfStay(resident.admissionDate).includes('month') ? 'Months' : 'Years'} Here
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {resident.emergencyContacts?.length || 0}
              </div>
              <p className="text-sm text-gray-600">Emergency Contacts</p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {resident.roomNumber ? 1 : 0}
              </div>
              <p className="text-sm text-gray-600">Room Assigned</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}