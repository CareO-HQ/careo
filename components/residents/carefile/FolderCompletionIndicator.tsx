import { cn } from "@/lib/utils";

interface FolderProgressIndicatorProps {
  completedCount: number;
  totalCount: number;
  className?: string;
}

export function FolderProgressIndicator({
  completedCount,
  totalCount,
  className = ""
}: FolderProgressIndicatorProps) {
  if (completedCount === 0) {
    return null;
  }

  const isAllCompleted = completedCount === totalCount;

  if (!isAllCompleted) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium",
          isAllCompleted && "text-emerald-500 bg-emerald-50"
        )}
      >
        Completed
      </span>
    </div>
  );
}
