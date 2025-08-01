import { cn } from "@/lib/utils";
export default function ContentWrapper({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-dvh items-center justify-center",
        className
      )}
    >
      {children}
    </div>
  );
}
