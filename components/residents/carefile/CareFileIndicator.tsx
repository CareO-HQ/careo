import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/types";
import { CheckIcon, DownloadIcon, FileIcon } from "lucide-react";

export default function CareFileIndicator({ value }: { value: string }) {
  //   const status: "todo" | "draft" | "completed" = "todo";
  const status: "todo" | "draft" | "completed" = "completed";
  //   const status = "completed";
  const completedAt = new Date();

  const fileUrl = "https://www.google.com";
  //   const fileUrl = null;

  return (
    <div
      className={cn(
        "flex flex-row justify-start items-center gap-2 p-1 pr-2 hover:bg-muted/50 hover:text-primary cursor-pointer transition-colors text-muted-foreground/70 rounded-md",
        status === "completed" && "text-emerald-500"
      )}
    >
      <div
        className={cn(
          "rounded-md p-1",
          status === "completed" && "bg-emerald-100 text-emerald-500"
        )}
      >
        {status === "completed" ? (
          <CheckIcon className="size-4 " />
        ) : (
          <FileIcon className="size-4 " />
        )}
      </div>
      <p className="text-primary">{value}</p>
      {fileUrl && (
        <div className="rounded-md p-1 text-muted-foreground/70 hover:text-primary cursor-pointer transition-colors">
          <DownloadIcon className="size-4 " />
        </div>
      )}
      {status === "completed" && (
        <p className="text-muted-foreground/70 text-xs">
          Completed {formatRelativeTime(completedAt)}
        </p>
      )}
    </div>
  );
}
