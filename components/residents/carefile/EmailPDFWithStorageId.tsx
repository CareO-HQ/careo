import EmailPDF from "./EmailPDF";

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
  // TODO: Implement PDF storage ID retrieval with Supabase
  // For now, use formId as a placeholder
  const storageId = formId;

  return (
    <EmailPDF
      pdfStorageId={storageId}
      filename={filename}
      residentName={residentName}
    />
  );
}
