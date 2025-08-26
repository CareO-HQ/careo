import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CreateMedicationForm from "../forms/CreateMedicationForm";

export default function CreateMedicationDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Medication</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>DEMO Create Medication</DialogTitle>
        </DialogHeader>
        <CreateMedicationForm />
      </DialogContent>
    </Dialog>
  );
}
