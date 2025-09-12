"use client";

import ResidentBreadcrumb from "@/components/residents/ResidentBreadcrumb";
import { Id } from "@/convex/_generated/dataModel";
import { usePathname } from "next/navigation";

export default function ResidentsLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2] as Id<"residents">;
  return (
    <main className="flex flex-col w-full">
      <div className="-mt-5 mb-5">
        <ResidentBreadcrumb residentId={residentId} />
      </div>

      {children}
    </main>
  );
}
