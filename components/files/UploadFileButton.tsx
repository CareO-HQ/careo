"use client";

import { Button } from "@/components/ui/button";
import { checkFileSecurity } from "@/lib/files/checkFileSecurity";
import { FileUpIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";

export default function UploadFileButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validFile, setValidFile] = useState<File | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!checkFileSecurity(file)) {
        return;
      }
      setValidFile(file);
    }
  };

  if (validFile) {
    return (
      <Dialog open onOpenChange={() => setValidFile(null)}>
        <DialogContent>AAA</DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="*/*"
      />
      <Button variant="outline" onClick={handleButtonClick}>
        <FileUpIcon />
        Upload file
      </Button>
    </>
  );
}
