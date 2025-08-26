import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { PlusIcon } from "lucide-react";
import { CreateResidentForm } from "./forms/CreateResidentForm";

interface CreateResidentDialogProps {
  isResidentDialogOpen: boolean;
  setIsResidentDialogOpen: (open: boolean) => void;
}

export default function CreateResidentDialog({
  isResidentDialogOpen,
  setIsResidentDialogOpen
}: CreateResidentDialogProps) {
  return (
    <Dialog open={isResidentDialogOpen} onOpenChange={setIsResidentDialogOpen}>
      <DialogTrigger asChild>
        <SidebarMenuAction>
          <PlusIcon />
          <span className="sr-only">Add Resident</span>
        </SidebarMenuAction>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="mb-4">
          <DialogTitle>Create New Resident Profile</DialogTitle>
          <DialogDescription>
            Enter the resident’s personal information and relevant care details
            to create their profile.
          </DialogDescription>
        </DialogHeader>
        <CreateResidentForm onSuccess={() => setIsResidentDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
