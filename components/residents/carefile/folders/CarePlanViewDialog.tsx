import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { FileText } from "lucide-react";

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
  // Fetch the full care plan data
  const carePlanData = useQuery(api.careFiles.carePlan.getCarePlanAssessment, {
    assessmentId: carePlan.formId as Id<"carePlanAssessments">
  });

  // Fetch evaluations for this care plan
  const evaluations = useQuery(api.careFiles.carePlan.getCarePlanEvaluations, {
    carePlanId: carePlan.formId as Id<"carePlanAssessments">
  });

  if (!carePlanData) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold mb-2">
                {carePlanData.nameOfCarePlan}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Care Plan #{carePlanData.carePlanNumber} • {carePlanData.writtenBy} • {format(new Date(carePlanData.dateWritten), "dd MMM yyyy")}
              </DialogDescription>
            </div>
          </div>
          {!carePlan.isLatest && (
            <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded mt-3">
              This is an archived version of the care plan.
            </div>
          )}
          {carePlan.isLatest && carePlanData.previousCarePlanId && (
            <div className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded mt-3">
              This is an updated version. Previous versions available in documentation.
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
                  <p className="text-sm font-medium break-words">{carePlanData.residentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium">{format(new Date(carePlanData.dob), "dd MMM yyyy")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bedroom</p>
                  <p className="text-sm font-medium break-words">{carePlanData.bedroomNumber}</p>
                </div>
              </div>
            </section>

            {/* Aims */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Aims</h3>
              <div className="p-4 bg-muted/20 rounded-lg border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {carePlanData.aims}
                </p>
              </div>
            </section>

            {/* Identified Needs */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Identified Needs</h3>
              <div className="p-4 bg-muted/20 rounded-lg border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {carePlanData.identifiedNeeds}
                </p>
              </div>
            </section>

            {/* Planned Care */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Planned Care</h3>
              {carePlanData.plannedCareDate && carePlanData.plannedCareDate.length > 0 ? (
                <div className="space-y-3">
                  {carePlanData.plannedCareDate.map((entry: any, index: number) => (
                    <div key={index} className="p-4 bg-muted/20 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Entry {index + 1}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(entry.date), "dd MMM yyyy")}</span>
                          {entry.time && (
                            <>
                              <span>•</span>
                              <span>{entry.time}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {entry.details}
                      </p>
                      <div className="flex items-center gap-2 pt-1 border-t text-xs flex-wrap">
                        <span className="text-muted-foreground">Signed by:</span>
                        <span className="font-medium break-words">{entry.signature}</span>
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
                      key={evaluation._id}
                      className="p-4 bg-muted/20 rounded-lg border space-y-2"
                    >
                      <p className="text-xs text-muted-foreground font-medium">
                        {format(new Date(evaluation.evaluationDate), "dd MMM yyyy 'at' HH:mm")}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {evaluation.comments}
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
