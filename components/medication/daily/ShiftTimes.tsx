"use client";

import { config } from "@/config";
import { cn } from "@/lib/utils";

export default function ShiftTimes({
  selectedTime,
  setSelectedTime
}: {
  selectedTime: string | null;
  setSelectedTime: (time: string) => void;
}) {
  return (
    <div className="flex flex-row gap-6">
      {config.times.map(({ name, values }) => (
        <div
          key={name}
          className="flex flex-row justify-start items-center gap-2"
        >
          <p className="text-sm text-muted-foreground">{name}</p>
          <div className="flex flex-row justify-start items-start gap-2">
            {values.map((value) => (
              <div
                key={value}
                className={cn(
                  "px-2 py-1 text-sm font-medium rounded-md border transition-colors cursor-pointer",
                  selectedTime === value
                    ? "bg-green-100 border-green-500 text-green-800 hover:bg-green-200"
                    : "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                )}
                onClick={() => setSelectedTime(value)}
              >
                {value}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
