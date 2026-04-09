"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ProgressStep = {
  id: string;
  label: string;
  completed: boolean;
  current?: boolean;
};

type WoundProgressTrackerProps = {
  hasBodyMap: boolean;
  hasInitialAssessment: boolean;
  hasPhotograph: boolean;
  hasOngoingAssessment: boolean;
  hasEvaluation: boolean;
  hasCarePlan: boolean;
};

export function WoundProgressTracker({
  hasBodyMap,
  hasInitialAssessment,
  hasPhotograph,
  hasOngoingAssessment,
  hasEvaluation,
  hasCarePlan,
}: WoundProgressTrackerProps) {
  const steps: ProgressStep[] = [
    { id: "bodymap", label: "Body Map", completed: hasBodyMap },
    { id: "initial", label: "Initial Assessment", completed: hasInitialAssessment },
    { id: "ongoing", label: "Ongoing Assessment", completed: hasOngoingAssessment },
    { id: "evaluation", label: "Wound Treatment", completed: hasEvaluation },
    { id: "photograph", label: "Photograph", completed: hasPhotograph },
    { id: "careplan", label: "Care Plan", completed: hasCarePlan },
  ];

  // Calculate current step (first incomplete step)
  const currentStepIndex = steps.findIndex((step) => !step.completed);
  if (currentStepIndex !== -1) {
    steps[currentStepIndex].current = true;
  }

  return (
    <div className="bg-white border-b px-6 py-2">
      <div className="flex items-center justify-between max-w-7xl">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div className="flex flex-col items-center gap-0.5 relative">
              {/* Circle */}
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center border transition-all",
                  step.completed
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : step.current
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                )}
              >
                {step.completed && (
                  <Check className="w-2.5 h-2.5" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-medium text-center max-w-[60px] leading-tight",
                  step.completed
                    ? "text-emerald-700"
                    : step.current
                      ? "text-blue-700 font-semibold"
                      : "text-gray-500"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-px mx-1.5 mb-3">
                <div
                  className={cn(
                    "h-full transition-all",
                    steps[index].completed && steps[index + 1].completed
                      ? "bg-emerald-500"
                      : steps[index].completed
                        ? "bg-gradient-to-r from-emerald-500 to-gray-300"
                        : "bg-gray-300"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
