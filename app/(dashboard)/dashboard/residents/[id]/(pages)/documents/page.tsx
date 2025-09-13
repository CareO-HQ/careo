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
  Folder,
  User,
  Calendar,
  Clock,
  Plus,
  Eye,
  Download,
  Upload,
  FileText,
  Image,
  File,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

// Document Upload Schema
const DocumentUploadSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  description: z.string().optional(),
  category: z.enum([
    "medical_records",
    "care_plans",
    "assessments", 
    "consent_forms",
    "insurance",
    "identification",
    "family_photos",
    "reports",
    "correspondence",
    "other"
  ]),
  tags: z.string().optional(),
  uploadedBy: z.string().min(1, "Uploader is required"),
});

type DocumentUploadFormData = z.infer<typeof DocumentUploadSchema>;

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Form setup
  const form = useForm<DocumentUploadFormData>({
    resolver: zodResolver(DocumentUploadSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      tags: "",
      uploadedBy: "",
    },
  });

  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");

  // Auth data
  const { data: user } = authClient.useSession();

  // Update staff field when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('uploadedBy', staffName);
    }
  }, [user, form]);

  // Mock mutations (you'll need to implement these in your Convex schema)
  // const uploadDocument = useMutation(api.documents.uploadDocument);
  // const getDocuments = useQuery(api.documents.getDocuments, {
  //   residentId: id as Id<"residents">
  // });

  const handleSubmit = async (data: DocumentUploadFormData) => {
    try {
      // Implement document upload
      // await uploadDocument({
      //   residentId: id as Id<"residents">,
      //   ...data,
      // });

      toast.success("Document uploaded successfully");
      form.reset();
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
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

  // Mock documents data
  const mockDocuments = [
    {
      id: 1,
      title: "Care Plan Assessment",
      category: "care_plans",
      fileType: "pdf",
      size: "2.3 MB",
      uploadDate: "2024-01-15",
      uploadedBy: "Sarah Mitchell",
      description: "Comprehensive care plan assessment and recommendations",
      tags: ["care", "assessment", "planning"]
    },
    {
      id: 2,
      title: "Medical History Report",
      category: "medical_records",
      fileType: "pdf",
      size: "1.8 MB",
      uploadDate: "2024-01-10",
      uploadedBy: "Dr. Johnson",
      description: "Complete medical history and current conditions",
      tags: ["medical", "history", "records"]
    },
    {
      id: 3,
      title: "Consent Form - Medication",
      category: "consent_forms",
      fileType: "pdf",
      size: "0.5 MB",
      uploadDate: "2024-01-08",
      uploadedBy: "Admin Staff",
      description: "Consent for medication administration",
      tags: ["consent", "medication", "legal"]
    },
    {
      id: 4,
      title: "Family Photo",
      category: "family_photos",
      fileType: "jpg",
      size: "3.2 MB",
      uploadDate: "2024-01-05",
      uploadedBy: "Family Member",
      description: "Family gathering during Christmas",
      tags: ["family", "photo", "christmas"]
    },
    {
      id: 5,
      title: "Insurance Documents",
      category: "insurance",
      fileType: "pdf",
      size: "1.1 MB",
      uploadDate: "2024-01-03",
      uploadedBy: "Finance Team",
      description: "Current insurance policy and coverage details",
      tags: ["insurance", "policy", "coverage"]
    }
  ];

  const getFileIcon = (fileType: string, category: string) => {
    if (category === "family_photos" || fileType === "jpg" || fileType === "png") {
      return <Image className="w-5 h-5 text-purple-600" />;
    } else if (fileType === "pdf") {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "medical_records":
        return "bg-red-50 border-red-200 text-red-700";
      case "care_plans":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "assessments":
        return "bg-green-50 border-green-200 text-green-700";
      case "consent_forms":
        return "bg-purple-50 border-purple-200 text-purple-700";
      case "insurance":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "identification":
        return "bg-indigo-50 border-indigo-200 text-indigo-700";
      case "family_photos":
        return "bg-pink-50 border-pink-200 text-pink-700";
      case "reports":
        return "bg-teal-50 border-teal-200 text-teal-700";
      case "correspondence":
        return "bg-cyan-50 border-cyan-200 text-cyan-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "medical_records":
        return "Medical Records";
      case "care_plans":
        return "Care Plans";
      case "assessments":
        return "Assessments";
      case "consent_forms":
        return "Consent Forms";
      case "insurance":
        return "Insurance";
      case "identification":
        return "Identification";
      case "family_photos":
        return "Family Photos";
      case "reports":
        return "Reports";
      case "correspondence":
        return "Correspondence";
      default:
        return "Other";
    }
  };

  // Filter documents based on search and category
  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group documents by category for summary
  const documentsByCategory = mockDocuments.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        <span className="text-foreground">Documents</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Folder className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground text-sm">Files & document management</p>
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
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 text-xs">
                    <Folder className="w-3 h-3 mr-1" />
                    {mockDocuments.length} Files
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsUploadDialogOpen(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
              <Button
                variant="outline"
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Documents
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
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 text-xs">
                    <Folder className="w-3 h-3 mr-1" />
                    {mockDocuments.length} Documents
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsUploadDialogOpen(true)}
                className="bg-yellow-600 text-white hover:bg-yellow-700 hover:text-white"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
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

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-blue-600" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Search documents by title, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="medical_records">Medical Records</SelectItem>
                  <SelectItem value="care_plans">Care Plans</SelectItem>
                  <SelectItem value="assessments">Assessments</SelectItem>
                  <SelectItem value="consent_forms">Consent Forms</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="identification">Identification</SelectItem>
                  <SelectItem value="family_photos">Family Photos</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Categories Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <span>Document Categories</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(documentsByCategory).map(([category, count]) => (
              <div key={category} className={`text-center p-3 rounded-lg border ${getCategoryColor(category)}`}>
                <div className="text-lg font-bold">
                  {count}
                </div>
                <p className="text-xs">{getCategoryLabel(category)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Folder className="w-5 h-5 text-yellow-600" />
              <span>Documents</span>
            </div>
            <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
              {filteredDocuments.length} documents found
            </Badge>
          </CardTitle>
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Folder className="w-5 h-5 text-yellow-600" />
              <span>Documents</span>
            </div>
            <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
              {filteredDocuments.length} documents found
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length > 0 ? (
            <div className="space-y-3">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          {getFileIcon(document.fileType, document.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-sm truncate">{document.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={`${getCategoryColor(document.category)} text-xs`}
                            >
                              {getCategoryLabel(document.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-1">{document.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{document.uploadDate}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{document.uploadedBy}</span>
                            </span>
                            <span>{document.size}</span>
                            <span className="uppercase">{document.fileType}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {document.tags.map((tag, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Folder className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-600 font-medium mb-2">No documents found</p>
              <p className="text-sm text-gray-500">
                {searchQuery || selectedCategory !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : `Upload documents for ${fullName} to get started`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Folder className="w-5 h-5 text-yellow-600" />
            <span>Document Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="w-6 h-6 mr-3" />
              Upload New Document
            </Button>
            <Button
             className="h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Search className="w-6 h-6 mr-3" />
              Advanced Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document for {fullName}</DialogTitle>
            <DialogDescription>
              Upload and categorize documents for this resident.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* Document Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-yellow-900">Document Information</h4>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter document title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the document..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document category..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="medical_records">Medical Records</SelectItem>
                          <SelectItem value="care_plans">Care Plans</SelectItem>
                          <SelectItem value="assessments">Assessments</SelectItem>
                          <SelectItem value="consent_forms">Consent Forms</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="identification">Identification</SelectItem>
                          <SelectItem value="family_photos">Family Photos</SelectItem>
                          <SelectItem value="reports">Reports</SelectItem>
                          <SelectItem value="correspondence">Correspondence</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tags separated by commas..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* File Upload Area */}
              <div className="space-y-4">
                <h4 className="font-medium text-blue-900">File Upload</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                  </p>
                  <Button variant="outline" className="mt-4">
                    Choose File
                  </Button>
                </div>
              </div>

              {/* Staff Information */}
              <FormField
                control={form.control}
                name="uploadedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uploaded By</FormLabel>
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
                    setIsUploadDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-yellow-600 hover:bg-yellow-700">
                  Upload Document
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}