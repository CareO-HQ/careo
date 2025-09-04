"use client";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function PreAdmissionDialog() {
  const [step, setStep] = useState<number>(1);

  const handleNext = () => {
    setStep(step + 1);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && "Pre-Admission Assessment Form"}
          {step === 2 && "Header information"}
        </DialogTitle>
        <DialogDescription>
          {step === 1 &&
            "Gather essential information about the resident before their admission."}
          {step === 2 && "Basic information about the care home"}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-row justify-end gap-2 items-center">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleNext}>
          {step === 1 ? "Start Assessment" : "Next"}
        </Button>
      </div>
    </>
  );
}
