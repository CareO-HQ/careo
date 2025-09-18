import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export default function HelpSupportDialog({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>We value your feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, reporting bugs, or
            suggesting new features. Your input drives our development
            priorities.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <p>AA</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
