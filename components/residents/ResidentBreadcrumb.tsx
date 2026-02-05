"use client";

import { useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { usePathname } from "next/navigation";

interface ResidentBreadcrumbProps {
  residentId: string;
}

export default function ResidentBreadcrumb({
  residentId
}: ResidentBreadcrumbProps) {
  const { supabase } = useSupabase();
  const [resident, setResident] = useState<{ firstName: string; lastName: string } | null>(null);
  const pathname = usePathname();
  const path = pathname.split("/").pop();

  useEffect(() => {
    async function fetchResident() {
      const { data, error } = await supabase
        .from("residents")
        .select("first_name, last_name")
        .eq("id", residentId)
        .single();

      if (!error && data) {
        setResident({
          firstName: data.first_name,
          lastName: data.last_name
        });
      }
    }

    if (residentId) {
      fetchResident();
    }
  }, [residentId, supabase]);

  let pathName = "";
  switch (path) {
    case "care-file":
      pathName = "Care File";
      break;
    case "medication":
      pathName = "Medication";
      break;
    case "overview":
      pathName = "Overview";
      break;
    case "food-fluid":
      pathName = "Food & Fluid";
      break;
    case "daily-care":
      pathName = "Daily Care";
      break;
    case "progress-notes":
      pathName = "Progress Notes";
      break;
    case "documents":
      pathName = "Documents";
      break;
    case "night-check":
      pathName = "Night Docs";
      break;
    case "appointments":
      pathName = "Appointments";
      break;
    case "incidents":
      pathName = "Incidents & Falls";
      break;
    case "health-monitoring":
      pathName = "Health & Monitoring";
      break;
    case "clinical":
      pathName = "Clinical";
      break;
    case "lifestyle-social":
      pathName = "Lifestyle & Social";
      break;
    case "hospital-transfer":
      pathName = "Hospital Passport";
      break;
    case "multidisciplinary-note":
      pathName = "Multi Disciplinary Note";
      break;
    default:
      pathName = path || "";
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
            {resident ? `${resident.firstName} ${resident.lastName}` : "Loading..."}
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
