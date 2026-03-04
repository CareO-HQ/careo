"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Loader2, User, FileText } from "lucide-react";
import { format } from "date-fns";

type WoundAssessment = {
  id: string;
  wound_id: string;
  assessment_date: string;
  length_cm: number | null;
  width_cm: number | null;
  depth_cm: number | null;
  wound_bed_description: string | null;
  exudate_type: string | null;
  exudate_amount: string | null;
  surrounding_skin_condition: string | null;
  odor: string | null;
  pain_level: number | null;
  pain_description: string | null;
  infection_signs: string | null;
  treatment_applied: string | null;
  dressing_type: string | null;
  dressing_frequency: string | null;
  progress_notes: string;
  next_review_date: string | null;
  assessed_by: string;
  assessed_by_job_title: string;
  created_at: string;
};

type WoundAssessmentViewerProps = {
  woundId: string;
};

export function WoundAssessmentViewer({ woundId }: WoundAssessmentViewerProps) {
  const [assessment, setAssessment] = useState<WoundAssessment | null>(null);
  const [allAssessments, setAllAssessments] = useState<WoundAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, [woundId]);

  const fetchAssessments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("wound_assessments")
        .select("*")
        .eq("wound_id", woundId)
        .order("assessment_date", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setAllAssessments(data as WoundAssessment[]);
        setAssessment(data[0] as WoundAssessment); // Show most recent
      }
    } catch (error) {
      console.error("Error fetching wound assessments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No assessments recorded yet</p>
        <p className="text-xs text-muted-foreground">
          Assessment records will appear here once completed
        </p>
      </div>
    );
  }

  const assessmentDate = new Date(assessment.assessment_date);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Wound Assessment Record</h2>
            <Badge variant="secondary" className="text-xs">
              {allAssessments.length} assessment{allAssessments.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(assessmentDate, "PPP 'at' HH:mm")}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{assessment.assessed_by}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wound Measurements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Length</p>
                  <p className="text-lg font-semibold">
                    {assessment.length_cm ? `${assessment.length_cm} cm` : "Not measured"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Width</p>
                  <p className="text-lg font-semibold">
                    {assessment.width_cm ? `${assessment.width_cm} cm` : "Not measured"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Depth</p>
                  <p className="text-lg font-semibold">
                    {assessment.depth_cm ? `${assessment.depth_cm} cm` : "Not measured"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wound Bed Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wound Bed Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessment.wound_bed_description && (
                <div>
                  <p className="text-sm font-medium mb-1">Wound Bed Description</p>
                  <p className="text-sm text-muted-foreground">{assessment.wound_bed_description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Exudate Type</p>
                  <Badge variant="outline" className="capitalize">
                    {assessment.exudate_type || "Not recorded"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Exudate Amount</p>
                  <Badge variant="outline" className="capitalize">
                    {assessment.exudate_amount || "Not recorded"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Surrounding Skin</p>
                  <Badge variant="outline" className="capitalize">
                    {assessment.surrounding_skin_condition || "Not recorded"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Odor</p>
                  <Badge variant="outline" className="capitalize">
                    {assessment.odor || "Not recorded"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pain Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pain Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Pain Level</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        assessment.pain_level !== null && assessment.pain_level > 6
                          ? "bg-red-50 text-red-700 border-red-200"
                          : assessment.pain_level !== null && assessment.pain_level > 3
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }
                    >
                      {assessment.pain_level !== null ? `${assessment.pain_level}/10` : "Not assessed"}
                    </Badge>
                    {assessment.pain_level !== null && (
                      <span className="text-xs text-muted-foreground">
                        {assessment.pain_level === 0
                          ? "No pain"
                          : assessment.pain_level <= 3
                          ? "Mild"
                          : assessment.pain_level <= 6
                          ? "Moderate"
                          : "Severe"}
                      </span>
                    )}
                  </div>
                </div>
                {assessment.pain_description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {assessment.pain_description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Infection Signs */}
          {assessment.infection_signs && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Signs of Infection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{assessment.infection_signs}</p>
              </CardContent>
            </Card>
          )}

          {/* Treatment & Dressing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Treatment & Dressing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessment.treatment_applied && (
                <div>
                  <p className="text-sm font-medium mb-1">Treatment Applied</p>
                  <p className="text-sm text-muted-foreground">{assessment.treatment_applied}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Dressing Type</p>
                  <Badge variant="outline">{assessment.dressing_type || "Not specified"}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Change Frequency</p>
                  <Badge variant="outline">{assessment.dressing_frequency || "Not specified"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {assessment.progress_notes}
              </p>
            </CardContent>
          </Card>

          {/* Next Review */}
          {assessment.next_review_date && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(assessment.next_review_date), "PPP")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessor Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assessed By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{assessment.assessed_by}</p>
                  <p className="text-xs text-muted-foreground">{assessment.assessed_by_job_title}</p>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Assessment Date: {format(assessmentDate, "PPP 'at' HH:mm")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Assessment History */}
          {allAssessments.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assessment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allAssessments.map((a, index) => (
                    <button
                      key={a.id}
                      onClick={() => setAssessment(a)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        a.id === assessment.id
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(a.assessment_date), "PPP")}
                          </p>
                          <p className="text-xs text-muted-foreground">{a.assessed_by}</p>
                        </div>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Latest
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
