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
  Bed,
  Calendar,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [expandedCard, setExpandedCard] = React.useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = React.useState<{
    fileName: string;
    shift: string;
    date: string;
    activities: number;
    completed: number;
  } | null>(null);
  
  
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get all daily care documents
  const allDailyCareDocuments = useQuery(api.personalCare.getAllPersonalCareRecords, {
    residentId: id as Id<"residents">
  });

  // Group documents by date and shift
  const groupedDocuments = React.useMemo(() => {
    if (!allDailyCareDocuments) return {};
    
    const grouped: Record<string, Record<string, any[]>> = {};
    
    allDailyCareDocuments.forEach((doc) => {
      const date = doc.date;
      const shift = doc.shift || 'Day'; // Default to 'Day' if no shift specified
      
      if (!grouped[date]) {
        grouped[date] = {};
      }
      if (!grouped[date][shift]) {
        grouped[date][shift] = [];
      }
      
      grouped[date][shift].push(doc);
    });
    
    return grouped;
  }, [allDailyCareDocuments]);

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCard(prevExpanded => {
      if (prevExpanded === cardId) {
        // If clicking the same card, close it
        return null;
      } else {
        // If clicking a different card, open only this one
        return cardId;
      }
    });
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
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/residents/${id}/daily-care`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Daily Care
        </Button>
        <span>/</span>
        <span className="text-foreground">All Documents</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bed className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Daily Care Documents</h1>
              <p className="text-muted-foreground">All care activities & records for {fullName}</p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push(`/dashboard/residents/${id}/daily-care`)}
          className="flex items-center space-x-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Back to Daily Care</span>
        </Button>
      </div>

      {/* Daily Care Documents Grouped by Date */}
      {allDailyCareDocuments === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      ) : Object.keys(groupedDocuments).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No daily care documents found</p>
            <p className="text-sm text-muted-foreground">Start adding daily care activities to see records here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDocuments)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, shifts]) => (
              <div key={date} className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Day', 'Night'].map((shift) => {
                    const documents = shifts[shift] || [];
                    const cardId = `${date}-${shift}`;
                    const isExpanded = expandedCard === cardId;
                    const completedCount = documents.filter(doc => doc.status === "completed").length;
                    const totalCount = documents.length;
                    
                    return (
                      <Card key={cardId} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader 
                          onClick={() => toggleCardExpansion(cardId)}
                          className="pb-3"
                        >
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {shift === 'Night' ? (
                                <Moon className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Sun className="w-5 h-5 text-amber-600" />
                              )}
                              <span className="text-base">{shift} Shift</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {totalCount === 0 ? (
                                <Badge variant="outline" className="text-gray-500">
                                  10 files
                                </Badge>
                              ) : (
                                <Badge variant={completedCount === totalCount ? "default" : "secondary"}>
                                  {completedCount}/{totalCount} completed
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        
                        {isExpanded && (
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {Array.from({ length: 10 }, (_, i) => {
                                const fileDate = new Date();
                                fileDate.setDate(fileDate.getDate() - i);
                                const dateStr = fileDate.toISOString().split('T')[0];
                                const randomActivities = Math.floor(Math.random() * 5) + 1;
                                const randomCompleted = Math.floor(Math.random() * randomActivities);
                                
                                const fileName = `${shift}_Shift_${dateStr.replace(/-/g, '_')}.pdf`;
                                
                                return (
                                  <Dialog key={`${shift}-${date}-${i}`}>
                                    <DialogTrigger asChild>
                                      <div 
                                        className={`p-4 border-2 border-dashed rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                                          shift === 'Day' ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' : 'border-purple-200 bg-purple-50 hover:bg-purple-100'
                                        }`}
                                        onClick={() => setSelectedPdf({
                                          fileName,
                                          shift,
                                          date: dateStr,
                                          activities: randomActivities,
                                          completed: randomCompleted
                                        })}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div className="p-2 bg-red-100 rounded-lg">
                                            <FileText className="w-6 h-6 text-red-600" />
                                          </div>
                                          <div>
                                            <h4 className={`font-semibold ${shift === 'Day' ? 'text-blue-800' : 'text-purple-800'}`}>
                                              {fileName}
                                            </h4>
                                            <p className={`text-sm ${shift === 'Day' ? 'text-blue-600' : 'text-purple-600'}`}>
                                              {randomActivities} activities • {randomCompleted} completed
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center space-x-2">
                                          <FileText className="w-5 h-5 text-red-600" />
                                          <span>{fileName}</span>
                                        </DialogTitle>
                                        <DialogDescription>
                                          Daily care activities document for {new Date(dateStr).toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                          })}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className={`p-4 rounded-lg ${shift === 'Day' ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}`}>
                                            <h4 className={`font-semibold ${shift === 'Day' ? 'text-blue-800' : 'text-purple-800'}`}>
                                              Shift Information
                                            </h4>
                                            <p className={`text-sm ${shift === 'Day' ? 'text-blue-600' : 'text-purple-600'}`}>
                                              {shift} Shift
                                            </p>
                                            <p className={`text-sm ${shift === 'Day' ? 'text-blue-600' : 'text-purple-600'}`}>
                                              Date: {new Date(dateStr).toLocaleDateString()}
                                            </p>
                                          </div>
                                          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                                            <h4 className="font-semibold text-gray-800">Activity Summary</h4>
                                            <p className="text-sm text-gray-600">
                                              Total Activities: {randomActivities}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                              Completed: {randomCompleted}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                              Completion Rate: {Math.round((randomCompleted / randomActivities) * 100)}%
                                            </p>
                                          </div>
                                        </div>
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <h4 className="font-semibold text-yellow-800 mb-2">Document Preview</h4>
                                          <p className="text-sm text-yellow-700">
                                            This is a preview of the daily care document. The full PDF contains detailed information about all care activities performed during the {shift.toLowerCase()} shift.
                                          </p>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                );
                              })}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}


    </div>
  );
}