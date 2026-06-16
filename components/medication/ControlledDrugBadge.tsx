import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ControlledDrugBadgeProps {
  isControlled?: boolean | null;
  className?: string;
}

export function ControlledDrugBadge({ isControlled, className }: ControlledDrugBadgeProps) {
  if (!isControlled) return null;

  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      CD
    </Badge>
  );
}
