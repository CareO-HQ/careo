import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { BookOpenCheckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export default function CarePlanEvaluationDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <BookOpenCheckIcon className="h-4 w-4 text-muted-foreground/70 hover:text-primary cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Care Plan Evaluation</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Care Plan Evaluation</DialogTitle>
          <DialogDescription>
            <p>Care Plan Evaluation</p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
