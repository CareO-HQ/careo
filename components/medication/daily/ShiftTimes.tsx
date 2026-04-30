"use client";
 
import { config } from "@/config";
import { cn } from "@/lib/utils";
import { getNearestMedicationTime } from "@/lib/date-utils";
import { useMemo } from "react";
 
export default function ShiftTimes({
  selectedTime,
  setSelectedTime
}: {
  selectedTime: string | null;
  setSelectedTime: (time: string) => void;
}) {
  // Flatten all times from config to determine neighbors
  const allTimes = useMemo(() => config.times.flatMap(t => t.values), []);
  
  // Find the "current" time section based on wall clock
  const currentTime = useMemo(() => getNearestMedicationTime(allTimes), [allTimes]);
  
  // Determine which buttons should be enabled (current + left neighbor + right neighbor)
  const enabledIndices = useMemo(() => {
    if (!currentTime) return [];
    const idx = allTimes.indexOf(currentTime);
    if (idx === -1) return [];
    
    const indices = [idx];
    if (idx > 0) indices.push(idx - 1);
    if (idx < allTimes.length - 1) indices.push(idx + 1);
    return indices;
  }, [allTimes, currentTime]);

  return (
    <div className="flex flex-row gap-6">
      {config.times.map(({ name, values }) => (
        <div
          key={name}
          className="flex flex-row justify-start items-center gap-2"
        >
          <p className="text-sm text-muted-foreground">{name}</p>
          <div className="flex flex-row justify-start items-start gap-2">
            {values.map((value) => {
              const globalIndex = allTimes.indexOf(value);
              const isEnabled = enabledIndices.includes(globalIndex);
              const isSelected = selectedTime === value;

              return (
                <div
                  key={value}
                  className={cn(
                    "px-2 py-1 text-sm font-medium rounded-md border transition-colors",
                    isEnabled 
                      ? "cursor-pointer" 
                      : "opacity-40 cursor-not-allowed grayscale",
                    isSelected
                      ? "bg-green-100 border-green-500 text-green-800 hover:bg-green-200"
                      : isEnabled 
                        ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                        : "bg-gray-100 border-gray-200 text-gray-400"
                  )}
                  onClick={() => isEnabled && setSelectedTime(value)}
                >
                  {value}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
