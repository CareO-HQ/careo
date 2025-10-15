"use client";

import CareFileFolder from "@/components/residents/carefile/folders/CareFileFolder";
import CareFileSidebar from "@/components/residents/carefile/folders/CareFileSidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { config } from "@/config";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { DownloadIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function CareFilePage() {
  const careFiles = config.careFiles;
  const [selectedFolder, setSelectedFolder] = useState<{
    index: number;
    folderName: string;
    folderKey: string;
    carePlan: boolean;
    description: string;
    forms: { type: string; key: string; value: string }[] | undefined;
  } | null>(null);

  const [selectedCarePlan, setSelectedCarePlan] = useState<{
    name: string;
    date: number;
  } | null>(null);

  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [evaluations, setEvaluations] = useState<Array<{
    date: string;
    time: string;
    evaluation: string;
    nextEvaluation: string;
    staff: string;
  }>>([]);

  const { data: session } = authClient.useSession();

  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2] as Id<"residents">;

  const preAddissionState = useQuery(
    api.careFiles.preadmission.hasPreAdmissionForm,
    {
      residentId: residentId as Id<"residents">
    }
  );

  return (
    <div className="flex h-full">
      {/* Left side - Folder list or Care Plan Detail */}
      <div className="flex flex-col flex-1 border-r overflow-y-auto">{selectedCarePlan ? (
          /* Care Plan Detail View */
          <div className="flex flex-col h-full max-w-4xl w-full ml-0 mr-auto">
            <div className="px-8 pt-8 pb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedCarePlan(null)}
                className="w-fit px-2 -ml-2 mb-6 text-sm"
              >
                ← Back to Care Files
              </Button>
              <h1 className="font-semibold text-2xl mb-2">{selectedCarePlan.name}</h1>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(selectedCarePlan.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            </div>

            <div className="flex-1 px-8 pb-8">
              <div className="border rounded-lg p-6 space-y-8 bg-card">
                <div>
                  <h3 className="font-semibold text-base mb-3">Identified Needs</h3>
                  <p className="text-sm leading-relaxed">
                  {selectedCarePlan.name === "Mobility and Falls Prevention" &&
                    "Resident requires assistance with mobilisation due to reduced strength in lower limbs. History of falls."}
                  {selectedCarePlan.name === "Nutrition and Hydration" &&
                    "Resident has poor appetite and reduced fluid intake. Weight loss of 3kg in last month. Risk of dehydration and malnutrition."}
                  {selectedCarePlan.name === "Personal Care and Dignity" &&
                    "Resident requires full assistance with personal care. Sensitive about maintaining dignity and privacy."}
                  {selectedCarePlan.name === "Medication Management" &&
                    "Resident on multiple medications for chronic conditions. Requires administration support and monitoring for side effects."}
                  {selectedCarePlan.name === "Social and Emotional Wellbeing" &&
                    "Resident showing signs of low mood and social isolation. Previously enjoyed arts and crafts, visiting with family."}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">Aims</h3>
                <p className="text-sm leading-relaxed">
                  {selectedCarePlan.name === "Mobility and Falls Prevention" &&
                    "Maintain current mobility level, prevent falls, increase confidence in walking with appropriate aids."}
                  {selectedCarePlan.name === "Nutrition and Hydration" &&
                    "Improve nutritional intake, maintain adequate hydration, monitor weight weekly, achieve weight stabilisation."}
                  {selectedCarePlan.name === "Personal Care and Dignity" &&
                    "Provide compassionate personal care while maintaining dignity, encourage independence where possible, respect privacy preferences."}
                  {selectedCarePlan.name === "Medication Management" &&
                    "Ensure safe medication administration, monitor effectiveness and side effects, maintain accurate records."}
                  {selectedCarePlan.name === "Social and Emotional Wellbeing" &&
                    "Improve mood and engagement, facilitate family contact, encourage participation in activities, reduce feelings of loneliness."}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-4">Planned Care Activities</h3>
                <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
                  {selectedCarePlan.name === "Mobility and Falls Prevention" && (
                    <>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Physiotherapy exercises - leg strengthening, 15 minutes daily</p>
                        <p className="text-xs text-muted-foreground">Time: 09:00 | Signed by: R. Wilson</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Walking practice with zimmer frame in corridor</p>
                        <p className="text-xs text-muted-foreground">Time: 14:00 | Signed by: M. Jones</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Review mobility equipment for suitability</p>
                        <p className="text-xs text-muted-foreground">Time: 10:00 | Signed by: A. Williams</p>
                      </div>
                    </>
                  )}
                  {selectedCarePlan.name === "Nutrition and Hydration" && (
                    <>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Fortified breakfast with supplement drink. Record intake.</p>
                        <p className="text-xs text-muted-foreground">Time: 08:00 | Signed by: L. Brown</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Offer preferred meals - smaller portions more frequently</p>
                        <p className="text-xs text-muted-foreground">Time: 12:00 | Signed by: K. Taylor</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Fluid monitoring - encourage 1500ml daily. Use preferred beverages.</p>
                        <p className="text-xs text-muted-foreground">Time: Throughout day | Signed by: P. Davis</p>
                      </div>
                    </>
                  )}
                  {selectedCarePlan.name === "Personal Care and Dignity" && (
                    <>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Morning wash - ensure door closed, explain each step, allow choices on clothing</p>
                        <p className="text-xs text-muted-foreground">Time: 07:30 | Signed by: R. Wilson</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Evening routine - respect preferred bedtime, assist with night attire</p>
                        <p className="text-xs text-muted-foreground">Time: 20:00 | Signed by: S. Anderson</p>
                      </div>
                    </>
                  )}
                  {selectedCarePlan.name === "Medication Management" && (
                    <>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Administer prescribed medications with food. Check for any adverse reactions.</p>
                        <p className="text-xs text-muted-foreground">Time: 08:00 & 20:00 | Signed by: T. Martin</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Monitor blood pressure weekly. Report any readings outside normal range.</p>
                        <p className="text-xs text-muted-foreground">Time: As needed | Signed by: N. Clark</p>
                      </div>
                    </>
                  )}
                  {selectedCarePlan.name === "Social and Emotional Wellbeing" && (
                    <>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Invite to arts and crafts session in lounge. One-to-one support if needed.</p>
                        <p className="text-xs text-muted-foreground">Time: 10:00 | Signed by: E. Roberts</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Arrange video call with family members. Assist with technology.</p>
                        <p className="text-xs text-muted-foreground">Time: 15:00 | Signed by: H. Thomas</p>
                      </div>
                      <div className="border-b last:border-b-0 p-5 hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium mb-2">Spend 15 minutes chatting about interests, look at photo albums together</p>
                        <p className="text-xs text-muted-foreground">Time: Daily | Signed by: C. Walker</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            </div>

            {/* Evaluation Button at Bottom */}
            <div className="border-t px-8 py-6 flex flex-col items-center gap-6">
              <Button
                variant="default"
                size="lg"
                className="px-12"
                onClick={() => setIsEvaluationDialogOpen(true)}
              >
                Evaluation
              </Button>

              {/* Display Evaluations */}
              {evaluations.length > 0 && (
                <div className="w-full max-w-3xl space-y-4">
                  <h3 className="font-semibold text-base">Previous Evaluations</h3>
                  {evaluations.map((evaluation, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-card space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(evaluation.date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })} at {evaluation.time}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">By {evaluation.staff}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Next: {new Date(evaluation.nextEvaluation).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                      <p className="text-sm leading-relaxed">{evaluation.evaluation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Folder List View */
          <>
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <p className="font-semibold text-xl">Care File</p>
            <p className="text-sm text-muted-foreground">
              Create and manage the care files for the resident.
            </p>
          </div>
          <Button variant="ghost" disabled>
            <DownloadIcon />
            Download all files
          </Button>
        </div>
        <div className="flex flex-col max-w-md">
          {careFiles.map(
            (file, index) =>
              file.type === "folder" && (
                <CareFileFolder
                  index={index}
                  key={file.key}
                  folderName={file.value}
                  folderKey={file.key}
                  carePlan={file.carePlan}
                  description={file.description}
                  forms={file.forms}
                  preAddissionState={preAddissionState}
                  residentId={residentId}
                  onFolderClick={() =>
                    setSelectedFolder({
                      index,
                      folderName: file.value,
                      folderKey: file.key,
                      carePlan: file.carePlan,
                      description: file.description,
                      forms: file.forms
                    })
                  }
                  isSelected={selectedFolder?.folderKey === file.key}
                />
              )
          )}
        </div>
          </>
        )}
      </div>

      {/* Right side - Persistent sidebar */}
      {selectedFolder && (
        <CareFileSidebar
          {...selectedFolder}
          residentId={residentId}
          onClose={() => setSelectedFolder(null)}
          onCarePlanClick={(carePlan) => setSelectedCarePlan(carePlan)}
        />
      )}

      {/* Evaluation Dialog */}
      <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Care Plan Evaluation</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 mt-2" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const newEvaluation = {
              date: formData.get("date") as string,
              time: formData.get("time") as string,
              evaluation: formData.get("evaluation") as string,
              nextEvaluation: formData.get("nextEvaluation") as string,
              staff: session?.user?.name || "",
            };
            setEvaluations([...evaluations, newEvaluation]);
            setIsEvaluationDialogOpen(false);
            e.currentTarget.reset();
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-sm">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="h-9"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time" className="text-sm">Time</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  defaultValue={new Date().toTimeString().slice(0, 5)}
                  className="h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evaluation" className="text-sm">Evaluation</Label>
              <Textarea
                id="evaluation"
                name="evaluation"
                placeholder="Enter evaluation notes..."
                className="min-h-[80px] text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nextEvaluation" className="text-sm">Next Evaluation</Label>
              <Input id="nextEvaluation" name="nextEvaluation" type="date" className="h-9" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff" className="text-sm">Staff</Label>
              <Input
                id="staff"
                name="staff"
                value={session?.user?.name || ""}
                readOnly
                className="bg-muted h-9"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEvaluationDialogOpen(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">Submit Evaluation</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
