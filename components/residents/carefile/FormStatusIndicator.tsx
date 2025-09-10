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
    case "pdf-generating":
    case "in-progress":
      return (
        <Loader2Icon className={`${className} text-yellow-500 animate-spin`} />
      );
    case "pdf-ready":
      return <CircleDashedIcon className={`${className} text-yellow-500`} />;
    case "not-started":
    default:
      return (
        <CircleDashedIcon className={`${className} text-muted-foreground/70`} />
      );
  }
}

interface FormStatusBadgeProps {
  status: CareFileFormStatus;
}

export function FormStatusBadge({ status }: FormStatusBadgeProps) {
  const getStatusInfo = (status: CareFileFormStatus) => {
    switch (status) {
      case "completed":
        return {
          text: "Completed",
          className: "text-emerald-500 bg-emerald-50"
        };
      case "pdf-generating":
        return {
          text: "Generating PDF...",
          className: "text-yellow-600 bg-yellow-50"
        };
      case "pdf-ready":
        return {
          text: "PDF Ready (reloading...)",
          className: "text-yellow-600 bg-yellow-50"
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

  const { text, className } = getStatusInfo(status);

  return <p className={`text-xs px-1 rounded-md ${className}`}>{text}</p>;
}
