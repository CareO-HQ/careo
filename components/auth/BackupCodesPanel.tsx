"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyIcon, DownloadIcon, PrinterIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

const HEADER = "CareO backup codes. Each code can be used once if you lose your authenticator app.";

/**
 * Shows freshly generated backup codes once. Continue stays disabled until the user
 * confirms they have saved them.
 */
export default function BackupCodesPanel({
  codes,
  onContinue,
  continueLabel = "Continue",
}: {
  codes: string[];
  onContinue: () => void;
  continueLabel?: string;
}) {
  const [saved, setSaved] = useState(false);
  const checkboxId = useId();
  const text = `${HEADER}\n\n${codes.join("\n")}\n`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Backup codes copied");
    } catch {
      toast.error("Could not copy. Download or print the codes instead.");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "careo-backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function print() {
    const printWindow = window.open("", "_blank", "width=480,height=640");
    if (!printWindow) {
      toast.error("Allow pop-ups to print, or download the codes instead.");
      return;
    }
    const doc = printWindow.document;
    doc.title = "CareO backup codes";
    const heading = doc.createElement("p");
    heading.textContent = HEADER;
    const list = doc.createElement("pre");
    list.style.fontSize = "18px";
    list.textContent = codes.join("\n");
    doc.body.append(heading, list);
    printWindow.print();
    printWindow.close();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Save these codes somewhere safe. If you lose your phone, each code lets you sign in once and set up a new
        authenticator. They will not be shown again.
      </p>
      <ul
        className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-4 font-mono text-sm"
        aria-label="Backup codes"
      >
        {codes.map((code) => (
          <li key={code} className="text-center tracking-wider" data-testid="backup-code">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <CopyIcon className="size-4" /> Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <DownloadIcon className="size-4" /> Download
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={print}>
          <PrinterIcon className="size-4" /> Print
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={checkboxId} checked={saved} onCheckedChange={(value) => setSaved(value === true)} />
        <label htmlFor={checkboxId} className="text-sm">
          I have saved these codes
        </label>
      </div>
      <Button type="button" className="w-full" disabled={!saved} onClick={onContinue}>
        {continueLabel}
      </Button>
    </div>
  );
}
