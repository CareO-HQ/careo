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
import CreateResidentDialog from "@/components/residents/CreateResidentDialog";
import {
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  Clock,
  User,
  Mail,
  FileText,
  Users,
  Edit3,
  PhoneCall
} from "lucide-react";
import { useRouter } from "next/navigation";

type OverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default function OverviewPage({ params }: OverviewPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Use optimized query that fetches all related data in one go
  const residentData = useQuery(api.residents.getResidentOverview, {
    residentId: id as Id<"residents">,
    includeAuditLog: false, // Set to true if you want to show recent activity
  });

  const resident = residentData;

  // Use backend-calculated values if available, with memoized fallback
  // IMPORTANT: These hooks must be called before any early returns to comply with Rules of Hooks
  const age = React.useMemo(() => {
    if (!resident || resident.age === undefined) {
      if (!resident?.dateOfBirth) return 0;

      // Fallback calculation
      const today = new Date();
      const birthDate = new Date(resident.dateOfBirth);
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      return calculatedAge;
    }

    return resident.age;
  }, [resident?.age, resident?.dateOfBirth]);

  const lengthOfStayDisplay = React.useMemo(() => {
    if (!resident?.admissionDate) return "";

    if (resident.lengthOfStay) {
      const { days, months, years } = resident.lengthOfStay;

      if (days < 30) {
        return `${days} days`;
      } else if (days < 365) {
        return `${months} month${months > 1 ? 's' : ''}`;
      } else {
        return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`;
      }
    }

    // Fallback calculation
    const today = new Date();
    const admission = new Date(resident.admissionDate);
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
  }, [resident?.lengthOfStay, resident?.admissionDate]);

  // Now safe to do early returns after all hooks have been called
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
        <span className="text-foreground">Overview</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Overview</h1>
            <p className="text-muted-foreground text-sm">Basic information & summary</p>
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
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {age} years old
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-4 h-4" />
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
                    {age} years old
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {lengthOfStayDisplay} stay
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Quick Overview</span>
            </div>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Quick Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {age}
              </div>
              <p className="text-sm text-blue-700">Years Old</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {lengthOfStayDisplay.split(' ')[0]}
              </div>
              <p className="text-sm text-green-700">
                {lengthOfStayDisplay.includes('day') ? 'Days' :
                 lengthOfStayDisplay.includes('month') ? 'Months' : 'Years'} Here
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {resident.emergencyContacts?.length || 0}
              </div>
              <p className="text-sm text-purple-700">Emergency Contacts</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {resident.roomNumber ? 1 : 0}
              </div>
              <p className="text-sm text-orange-700">Room Assigned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Personal Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Full Name</p>
                <p className="font-medium text-sm">{fullName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Date of Birth</p>
                <p className="font-medium text-sm">{resident.dateOfBirth}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Room Number</p>
                <p className="font-medium text-sm">{resident.roomNumber || "Not assigned"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Admission Date</p>
                <p className="font-medium text-sm">{resident.admissionDate}</p>
              </div>
            </div>

            {resident.phoneNumber && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Phone Number</p>
                  <p className="font-medium text-sm">{resident.phoneNumber}</p>
                </div>
              </div>
            )}

            {resident.nhsHealthNumber && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">NHS Health Number</p>
                  <p className="font-medium font-mono text-sm">{resident.nhsHealthNumber}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span>Key Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Next of Kin / Emergency Contacts */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <Users className="w-4 h-4 text-red-600 mr-2" />
                  Next of Kin 
                </h4>
                {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
                  <div className="space-y-3">
                    {resident.emergencyContacts.map((contact: Doc<"emergencyContacts">, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-sm text-gray-900">{contact.name}</h5>
                          {contact.isPrimary && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Relationship:</span> {contact.relationship}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Phone:</span> {contact.phoneNumber}
                          </p>
                          {contact.address && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Address:</span> {contact.address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <Users className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No emergency contacts on file</p>
                  </div>
                )}
              </div>

              {/* GP Details */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <FileText className="w-4 h-4 text-blue-600 mr-2" />
                  GP Details
                </h4>
                {resident.gpName || resident.gpPhone || resident.gpAddress ? (
                  <div className="p-3 border rounded-lg">
                    <div className="mb-2">
                      <h5 className="font-semibold text-sm text-gray-900">
                        {resident.gpName || "General Practitioner"}
                      </h5>
                    </div>
                    <div className="space-y-1">
                      {resident.gpPhone && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Phone:</span> {resident.gpPhone}
                        </p>
                      )}
                      {resident.gpAddress && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Address:</span> {resident.gpAddress}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <FileText className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No GP details on file</p>
                  </div>
                )}
              </div>

              {/* Care Manager Details */}
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center">
                  <User className="w-4 h-4 text-green-600 mr-2" />
                  Care Manager
                </h4>
                {resident.careManagerName || resident.careManagerPhone || resident.careManagerAddress ? (
                  <div className="p-3 border rounded-lg">
                    <div className="mb-2">
                      <h5 className="font-semibold text-sm text-gray-900">
                        {resident.careManagerName || "Care Manager"}
                      </h5>
                    </div>
                    <div className="space-y-1">
                      {resident.careManagerPhone && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Phone:</span> {resident.careManagerPhone}
                        </p>
                      )}
                      {resident.careManagerAddress && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Address:</span> {resident.careManagerAddress}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <User className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No care manager details on file</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Resident Dialog */}
      <CreateResidentDialog
        isResidentDialogOpen={isEditDialogOpen}
        setIsResidentDialogOpen={setIsEditDialogOpen}
        editMode={true}
        residentData={resident}
      />
    </div>
  );
}