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
  editMode?: boolean;
  residentData?: any;
}

export default function CreateResidentDialog({
  isResidentDialogOpen,
  setIsResidentDialogOpen,
  editMode = false,
  residentData
}: CreateResidentDialogProps) {
  return (
    <Dialog open={isResidentDialogOpen} onOpenChange={setIsResidentDialogOpen}>
      {!editMode && (
        <DialogTrigger asChild>
          <SidebarMenuAction>
            <PlusIcon />
            <span className="sr-only">Add Resident</span>
          </SidebarMenuAction>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader className="mb-4">
          <DialogTitle>
            {editMode ? "Edit Resident Profile" : "Create New Resident Profile"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update the resident's personal information and relevant care details."
              : "Enter the resident's personal information and relevant care details to create their profile."
            }
          </DialogDescription>
        </DialogHeader>
        <CreateResidentForm
          onSuccess={() => setIsResidentDialogOpen(false)}
          editMode={editMode}
          residentData={residentData}
        />
      </DialogContent>
    </Dialog>
  );
}
