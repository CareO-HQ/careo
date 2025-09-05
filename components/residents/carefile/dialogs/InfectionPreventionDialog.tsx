"use client";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { useState } from "react";

export default function InfectionPreventionDialog() {
  const [step, setStep] = useState(1);
  return (
    <DialogHeader>
      <DialogTitle>{step === 1 && "Resident's details"}</DialogTitle>
      <DialogDescription>
        {step === 1 && "Gather essential information about the resident"}
      </DialogDescription>
      <div></div>
    </DialogHeader>
  );
}
