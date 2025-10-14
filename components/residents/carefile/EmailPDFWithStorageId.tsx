import { useQuery } from "convex/react";
import EmailPDF from "./EmailPDF";
import { api } from "@/convex/_generated/api";

interface EmailPDFWithStorageIdProps {
  formKey: string;
  formId: string;
  filename: string;
  residentName?: string;
}

export default function EmailPDFWithStorageId({
  formKey,
  formId,
  filename,
  residentName
}: EmailPDFWithStorageIdProps) {
  const storageId = useQuery(api.emailHelpers.getPDFStorageId, {
    formKey,
    formId
  });

  // Don't render if we don't have a storage ID yet
  if (!storageId) {
    return (
      <div className="h-4 w-4 bg-muted-foreground/20 rounded animate-pulse" />
    );
  }

  return (
    <EmailPDF
      pdfStorageId={storageId}
      filename={filename}
      residentName={residentName}
    />
  );
}
