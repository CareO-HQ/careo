import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export default function UploadFileModal() {
  return (
    <Dialog>
      <DialogTrigger>
        <p className="text-muted-foreground text-xs cursor-pointer hover:text-primary">
          Upload file
        </p>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>
            Upload a file to the carefile folder
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
