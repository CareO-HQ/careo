import { cn } from "@/lib/utils";

export default function Stepper({
  step,
  totalSteps
}: {
  step: number;
  totalSteps: number;
}) {
  return (
    <div className="flex flex-col justify-start items-start w-full text-foreground/50 text-sm font-medium gap-2 mt-6">
      <p>
        Step {step} of {totalSteps}
      </p>
      <div className="flex flex-row justify-start items-center gap-2 w-full">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-10 h-1 bg-muted-foreground/15",
              step >= index + 1 && "bg-foreground"
            )}
          ></div>
        ))}
      </div>
    </div>
  );
}
