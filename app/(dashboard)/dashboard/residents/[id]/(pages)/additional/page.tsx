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
  ClipboardList,
  FileText,
  Users,
  Calendar,
  BookOpen,
  Camera,
  Settings,
  Plus,
  Search,
  Download,
  Upload,
  User,
  Eye
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

type AdditionalPageProps = {
  params: Promise<{ id: string }>;
};

export default function AdditionalPage({ params }: AdditionalPageProps) {
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
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

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

  // Mock additional data - in a real app, this would come from the API
  const mockDocuments = [
    {
      id: 1,
      name: "Care Plan Assessment.pdf",
      type: "Care Plan",
      uploadDate: "2024-02-15",
      size: "2.3 MB",
      uploadedBy: "Dr. Sarah Johnson"
    },
    {
      id: 2,
      name: "Medical History Report.pdf",
      type: "Medical Report",
      uploadDate: "2024-01-20",
      size: "1.8 MB",
      uploadedBy: "Nurse Mary Wilson"
    },
    {
      id: 3,
      name: "Family Contact Details.docx",
      type: "Contact Information",
      uploadDate: "2024-01-15",
      size: "245 KB",
      uploadedBy: "Admin Staff"
    }
  ];

  const mockNotes = [
    {
      id: 1,
      title: "Personal Preferences",
      content: "Enjoys classical music and reading. Prefers tea over coffee. Likes to sit by the window in the afternoon.",
      author: "Care Coordinator",
      date: "2024-02-20",
      category: "Personal"
    },
    {
      id: 2,
      title: "Dietary Requirements",
      content: "Vegetarian diet. No known food allergies. Requires soft foods due to dental issues. Favorite meal is pasta.",
      author: "Nutritionist",
      date: "2024-02-18",
      category: "Diet"
    },
    {
      id: 3,
      title: "Social Activities",
      content: "Participates in group activities on Tuesdays and Thursdays. Enjoys card games and gentle exercise classes.",
      author: "Activities Coordinator",
      date: "2024-02-15",
      category: "Activities"
    }
  ];

  const mockPhotos = [
    { id: 1, name: "Profile Photo", date: "2024-02-01" },
    { id: 2, name: "Room Setup", date: "2024-01-15" },
    { id: 3, name: "Family Visit", date: "2024-01-10" }
  ];

  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'care plan':
        return ClipboardList;
      case 'medical report':
        return FileText;
      case 'contact information':
        return Users;
      default:
        return FileText;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'personal':
        return { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' };
      case 'diet':
        return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' };
      case 'activities':
        return { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' };
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
        <span className="text-foreground">Additional Info</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <ClipboardList className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Additional Info</h1>
            <p className="text-muted-foreground text-sm">Notes, documents & additional records</p>
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
                    <FileText className="w-3 h-3 mr-1" />
                    {mockDocuments.length} Docs
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
              <Button
                variant="outline"
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Records
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
                    <ClipboardList className="w-3 h-3 mr-1" />
                    Additional Records
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-green-600 text-white hover:bg-green-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Add Document</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span>Documents</span>
            </div>
            <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
              {mockDocuments.length} files available
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span>Documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
                {mockDocuments.length} files
              </Badge>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockDocuments.map((doc) => {
              const Icon = getDocumentIcon(doc.type);
              return (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{doc.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>Uploaded {doc.uploadDate}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">By {doc.uploadedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Care Notes</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
              {mockNotes.length} care notes
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Care Notes</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">
              {mockNotes.length} care notes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockNotes.map((note) => {
              const colors = getCategoryColor(note.category);
              return (
                <Card key={note.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{note.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant="outline"
                            className={`${colors.bg} ${colors.border} ${colors.text} text-xs`}
                          >
                            {note.category}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            by {note.author}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{note.date}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{note.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Camera className="w-5 h-5 text-pink-600" />
              <span>Photos</span>
            </div>
            <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700">
              {mockPhotos.length} photos
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-5 h-5 text-pink-600" />
              <span>Photos</span>
            </div>
            <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700">
              {mockPhotos.length} photos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockPhotos.map((photo) => (
              <div key={photo.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="font-medium text-sm">{photo.name}</h3>
                <p className="text-xs text-gray-500">{photo.date}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Photo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Record Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Resident ID:</span>
                  <span className="font-mono">{id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>2024-01-15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span>2024-03-01</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Access Log</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Viewed:</span>
                  <span>Today, 2:30 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Viewed By:</span>
                  <span>Sarah Mitchell</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Views:</span>
                  <span>47</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Backup:</span>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">Current</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <span>Records Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">
                {mockDocuments.length}
              </div>
              <p className="text-sm text-gray-700">Documents</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">
                {mockNotes.length}
              </div>
              <p className="text-sm text-indigo-700">Care Notes</p>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="text-2xl font-bold text-pink-600">
                {mockPhotos.length}
              </div>
              <p className="text-sm text-pink-700">Photos</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">47</div>
              <p className="text-sm text-green-700">Record Views</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-green-600" />
            <span>Record Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-6 h-6 mr-3" />
              Add New Document
            </Button>
            <Button
             className="h-16 text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Eye className="w-6 h-6 mr-3" />
              View All Records
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Development Notice */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <ClipboardList className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">Enhanced Features Coming Soon</h3>
          <p className="text-green-600 text-sm">
            Advanced document management, version control, collaborative editing, and enhanced search capabilities are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}