import { CircleCheckIcon, CircleDashedIcon, Loader2Icon } from "lucide-react";
import { CareFileFormStatus } from "@/types/care-files";

interface FormStatusIndicatorProps {
  status: CareFileFormStatus;
  className?: string;
}

export default function FormStatusIndicator({
  status,
  className = "h-4 w-4"
}: FormStatusIndicatorProps) {
  switch (status) {
    case "completed":
      return <CircleCheckIcon className={`${className} text-emerald-500`} />;
    case "in-progress":
      return (
        <Loader2Icon className={`${className} text-blue-500 animate-spin`} />
      );
    case "not-started":
    default:
      return (
        <CircleDashedIcon className={`${className} text-muted-foreground/70`} />
      );
  }
}

interface FormStatusBadgeProps {
  status: CareFileFormStatus;
  isAudited?: boolean;
}

export function FormStatusBadge({ status, isAudited }: FormStatusBadgeProps) {
  const getStatusInfo = (
    status: CareFileFormStatus,
    isAudited: boolean = false
  ) => {
    switch (status) {
      case "completed":
        if (isAudited) {
          return {
            text: "Completed & Audited",
            className: "text-emerald-500 bg-emerald-50"
          };
        }
        return {
          text: "Completed",
          className: "text-emerald-500 bg-emerald-50"
        };
      case "in-progress":
        return {
          text: "In Progress",
          className: "text-blue-600 bg-blue-50"
        };
      case "not-started":
      default:
        return {
          text: "",
          className: ""
        };
    }
  };

  const { text, className } = getStatusInfo(status, isAudited || false);

  return <p className={`text-xs px-1 rounded-md ${className}`}>{text}</p>;
}
