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
  Clock,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { useRouter } from "next/navigation";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());
  
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
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
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
                  {Object.entries(shifts).map(([shift, documents]) => {
                    const cardId = `${date}-${shift}`;
                    const isExpanded = expandedCards.has(cardId);
                    const completedCount = documents.filter(doc => doc.status === "completed").length;
                    const totalCount = documents.length;
                    
                    return (
                      <Card key={shift} className="cursor-pointer hover:shadow-md transition-shadow">
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
                              <Badge variant={completedCount === totalCount ? "default" : "secondary"}>
                                {completedCount}/{totalCount} completed
                              </Badge>
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
                              {documents.map((document, index) => (
                                <div key={index} className="p-3 border rounded-lg bg-gray-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant={document.status === "completed" ? "default" : "secondary"}>
                                      {document.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </Badge>
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                                      document.status === "completed" ? "bg-green-100 text-green-700" : 
                                      document.status === "refused" ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>
                                      {document.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                  </div>
                                  
                                  {document.notes && (
                                    <div className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded">
                                      <p className="text-sm text-blue-800">
                                        <strong>Notes:</strong> {document.notes}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center space-x-3">
                                      {document.assistanceLevel && (
                                        <span>
                                          <strong>Assistance:</strong> {document.assistanceLevel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                      )}
                                      {document.reasonCode && (
                                        <span>
                                          <strong>Reason:</strong> {document.reasonCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                      )}
                                    </div>
                                    <span>
                                      {new Date(document.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {allDailyCareDocuments ? allDailyCareDocuments.filter(doc => doc.status === "completed").length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Completed Activities</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {allDailyCareDocuments ? allDailyCareDocuments.filter(doc => doc.status === "refused").length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Refused Activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {allDailyCareDocuments ? allDailyCareDocuments.length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {allDailyCareDocuments ? 
                new Set(allDailyCareDocuments.map(doc => doc.date)).size : 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}