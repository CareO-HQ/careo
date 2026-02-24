
"use client";

import CareFileFolder from "@/components/residents/carefile/folders/CareFileFolder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { config } from "@/config";
import { useProfile } from "@/hooks/use-profile";
import { canFillCareFileForms } from "@/lib/permissions";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CareFilePage() {
  const careFiles = config.careFiles;
  const router = useRouter();
  const { profile } = useProfile();
  const userRole = profile?.role;
  const canFillForms = canFillCareFileForms(userRole);

  const path = usePathname();
  const pathname = path.split("/");
  const residentId = pathname[pathname.length - 2];

  const [resident, setResident] = useState<any>(undefined);
  const [preAdmissionState, setPreAdmissionState] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!residentId) return;

      try {
        // Fetch Resident
        const { data: rData, error } = await supabase
          .from('residents')
          .select('*')
          .eq('id', residentId)
          .single();

        if (error) throw error;
        setResident(rData);

        // Check Pre-Admission State (simplistically check if any form exists)
        const { count } = await supabase
          .from('pre_admission_care_files')
          .select('*', { count: 'exact', head: true })
          .eq('resident_id', residentId);

        setPreAdmissionState(count ? count > 0 : false);

      } catch (e) {
        console.error("Error fetching resident or care file state:", e);
        setResident(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [residentId]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${residentId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={resident.image_url} alt={fullName} className="border" />
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Care File</h1>
          <p className="text-muted-foreground text-sm">
            View and manage care files for {resident.first_name} {resident.last_name}.
          </p>
        </div>
      </div>

      {/* Care Files Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {careFiles.map(
          (file, index) =>
            file.type === "folder" && (
              <CareFileFolder
                index={index}
                key={file.key}
                folderName={file.value}
                folderKey={file.key}
                carePlan={file.carePlan}
                description={file.description}
                forms={file.forms}
                preAddissionState={preAdmissionState}
                residentId={residentId as any} // Cast as any or string depending on interface
                canFillForms={canFillForms}
              />
            )
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border my-6"></div>

      {/* Additional Folders Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All Care Plans */}
        <Card
          className="cursor-pointer shadow-none hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 border-cyan-200 bg-white h-24"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/all-care-plans`)}
        >
          <CardContent className="p-4 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-cyan-700 line-clamp-1">All Care Plans</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">View all care plans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Assessments */}
        <Card
          className="cursor-pointer shadow-none hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 border-teal-200 bg-white h-24"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/all-risk-assessments`)}
        >
          <CardContent className="p-4 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-teal-700 line-clamp-1">All Assessments</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">View all risk assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archived Care Plans */}
        <Card
          className="cursor-pointer shadow-none hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 border-amber-200 bg-white h-24"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/archived-care-plans`)}
        >
          <CardContent className="p-4 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-amber-700 line-clamp-1">Archived Care Plans</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">View archived plans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archived Assessments */}
        <Card
          className="cursor-pointer shadow-none hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 border-slate-300 bg-white h-24"
          onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/archived-risk-assessments`)}
        >
          <CardContent className="p-4 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-700 line-clamp-1">Archived Assessments</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">View archived assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
