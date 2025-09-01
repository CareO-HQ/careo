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
  Upload
} from "lucide-react";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Additional Information</h1>
              <p className="text-muted-foreground">Documents, notes & records for {fullName}</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
        </div>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span>Documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{mockDocuments.length} files</Badge>
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Care Notes</span>
            </div>
            <Badge variant="secondary">{mockNotes.length} notes</Badge>
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-5 h-5 text-pink-600" />
              <span>Photos</span>
            </div>
            <Badge variant="secondary">{mockPhotos.length} photos</Badge>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{mockDocuments.length}</div>
            <p className="text-sm text-muted-foreground">Documents</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{mockNotes.length}</div>
            <p className="text-sm text-muted-foreground">Care Notes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-pink-600">{mockPhotos.length}</div>
            <p className="text-sm text-muted-foreground">Photos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">47</div>
            <p className="text-sm text-muted-foreground">Total Views</p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-6 text-center">
          <ClipboardList className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-purple-800 mb-2">Enhanced Document Management Coming Soon</h3>
          <p className="text-purple-600">
            Advanced file organization, version control, and collaborative editing features are in development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}