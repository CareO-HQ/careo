import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import CreateLabelForm from "./CreateLabelForm";
import { useState } from "react";

export default function CreateLabelModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <PlusIcon />
          Add label
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create label</DialogTitle>
          <DialogDescription>
            Labels will be available across your organization.
          </DialogDescription>
        </DialogHeader>
        <CreateLabelForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
