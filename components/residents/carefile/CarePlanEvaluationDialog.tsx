"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { BookOpenCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CarePlanSheetContent from "./folders/CarePlanSheet";

interface CarePlanEvaluationDialogProps {
  carePlan?: {
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    isLatest: boolean;
  };
}

export default function CarePlanEvaluationDialog({ carePlan }: CarePlanEvaluationDialogProps) {
  const [open, setOpen] = useState(false);

  if (!carePlan) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            title="Care Plan Evaluation"
          >
            <BookOpenCheckIcon className="h-4 w-4 text-muted-foreground/70 hover:text-primary" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Care Plan Evaluation</p>
        </TooltipContent>
      </Tooltip>

      <CarePlanSheetContent
        open={open}
        onOpenChange={setOpen}
        carePlan={carePlan}
      />
    </>
  );
}
