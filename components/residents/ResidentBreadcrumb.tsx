"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { usePathname } from "next/navigation";

interface ResidentBreadcrumbProps {
  residentId: string;
}

export default function ResidentBreadcrumb({
  residentId
}: ResidentBreadcrumbProps) {
  const resident = useQuery(api.residents.getById, {
    residentId: residentId as Id<"residents">
  });
  const pathname = usePathname();
  const path = pathname.split("/").pop();

  let pathName = "";
  switch (path) {
    case "care-file":
      pathName = "Care File";
      break;
    case "medication":
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard/residents">Residents</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={`/dashboard/residents/${residentId}`}>
            {resident?.firstName} {resident?.lastName}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{pathName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
