import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const safeFormat = (dateValue: any, formatStr: string) => {
  if (!dateValue) return "N/A";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "N/A";
    return format(date, formatStr);
  } catch (e) {
    return "N/A";
  }
};

export default function CarePlanViewDialog({
  open,
  onOpenChange,
  carePlan
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carePlan: {
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    isLatest: boolean;
  };
}) {
  const [carePlanData, setCarePlanData] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!open || !carePlan.formId) return;

      try {
        setLoading(true);
        // Fetch care plan data
        const { data: carePlanResponse } = await supabase
          .from('care_plan_assessments')
          .select('*')
          .eq('id', carePlan.formId)
          .single();

        if (carePlanResponse) {
          const goals = carePlanResponse.goals || {};
          const flattenedData = {
            ...carePlanResponse,
            name_of_care_plan: carePlanResponse.care_plan_type || goals.nameOfCarePlan || "Care Plan",
            care_plan_number: goals.carePlanNumber || "N/A",
            written_by: goals.writtenBy || carePlanResponse.written_by || "N/A",
            date_written: goals.dateWritten || carePlanResponse.date_written,
            resident_name: goals.residentName || "N/A",
            dob: goals.dob,
            bedroom_number: goals.bedroomNumber || "N/A",
            aims: goals.aims || "N/A",
            identifiedNeeds: carePlanResponse.need_identified || goals.identifiedNeeds || "N/A",
            planned_care_date: carePlanResponse.interventions || [],
          };
          setCarePlanData(flattenedData);
        }

        // Fetch evaluations (assuming there's a care_plan_evaluations table)
        const { data: evaluationsResponse } = await supabase
          .from('care_plan_evaluations')
          .select('*')
          .eq('care_plan_id', carePlan.formId)
          .order('created_at', { ascending: false });
        setEvaluations(evaluationsResponse || []);
      } catch (error) {
        console.error("Error fetching care plan data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, carePlan.formId]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading Care Plan</DialogTitle>
            <DialogDescription>Please wait while we load the care plan details...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!carePlanData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md text-center py-8">
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>Could not find the care plan data.</DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold mb-2">
                {carePlanData.name_of_care_plan}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Care Plan #{carePlanData.care_plan_number} • {carePlanData.written_by} • {safeFormat(carePlanData.date_written, "dd MMM yyyy")}
              </DialogDescription>
            </div>
          </div>
          {!carePlan.isLatest && (
            <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded mt-3">
              This is an archived version of the care plan.
            </div>
          )}
          {carePlan.isLatest && carePlanData.previous_care_plan_id && (
            <div className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded mt-3">
              This is an updated version. Previous versions available in Archive.
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6 pb-8">
            {/* Resident Information */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Resident Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg border">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium break-words">{carePlanData.resident_name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium">{safeFormat(carePlanData.dob, "dd MMM yyyy")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bedroom</p>
                  <p className="text-sm font-medium break-words">{carePlanData.bedroom_number || "N/A"}</p>
                </div>
              </div>
            </section>

            {/* Aims */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Aims</h3>
              <div className="p-4 bg-muted/20 rounded-lg border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {carePlanData.aims || "N/A"}
                </p>
              </div>
            </section>

            {/* Identified Needs */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Identified Needs</h3>
              <div className="p-4 bg-muted/20 rounded-lg border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {carePlanData.identifiedNeeds || "N/A"}
                </p>
              </div>
            </section>

            {/* Planned Care */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Planned Care</h3>
              {carePlanData.planned_care_date && carePlanData.planned_care_date.length > 0 ? (
                <div className="space-y-3">
                  {carePlanData.planned_care_date.map((entry: any, index: number) => (
                    <div key={index} className="p-4 bg-muted/20 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Entry {index + 1}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{safeFormat(entry.date, "dd MMM yyyy")}</span>
                          {entry.time && (
                            <>
                              <span>•</span>
                              <span>{entry.time}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {entry.details || "N/A"}
                      </p>
                      <div className="flex items-center gap-2 pt-1 border-t text-xs flex-wrap">
                        <span className="text-muted-foreground">Signed by:</span>
                        <span className="font-medium break-words">{entry.signature || "N/A"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted/20 rounded-lg border text-center">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No planned care entries</p>
                </div>
              )}
            </section>

            {/* Evaluations */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Evaluations</h3>
              {evaluations && evaluations.length > 0 ? (
                <div className="space-y-3">
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation.id || evaluation._id}
                      className="p-4 bg-muted/20 rounded-lg border space-y-2"
                    >
                      <p className="text-xs text-muted-foreground font-medium">
                        {safeFormat(evaluation.evaluation_date, "dd MMM yyyy 'at' HH:mm")}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {evaluation.progress_notes || evaluation.comments || "No notes provided"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted/20 rounded-lg border text-center">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No evaluations</p>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
