"use client";

import CareFileFolder from "@/components/residents/carefile/folders/CareFileFolder";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { config } from "@/config";
import { useProfile } from "@/hooks/use-profile";
import { canFillCareFileForms } from "@/lib/permissions";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CareFileV2Page() {
    const careFiles = config.careFilesV2;
    const router = useRouter();
    const { profile } = useProfile();
    const userRole = profile?.role;
    const canFillForms = canFillCareFileForms(userRole);

    const path = usePathname();
    const pathname = path.split("/");
    const residentId = pathname[pathname.length - 2];

    const [resident, setResident] = useState<any>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!residentId) return;

            try {
                const { data: rData, error } = await supabase
                    .from('residents')
                    .select('*')
                    .eq('id', residentId)
                    .single();

                if (error) throw error;
                setResident(rData);
            } catch (e) {
                console.error("Error fetching resident:", e);
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
                <Avatar className="w-16 h-16">
                    <AvatarImage src={resident.image_url} alt={fullName} className="border" />
                    <AvatarFallback className="text-base bg-primary/10 text-primary">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-black text-xl">{fullName}</span>
                        <span className="text-muted-foreground">/ Care File</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        View and manage care files
                    </p>
                </div>
            </div>

            {/* Care Files Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {careFiles.map((file, index) => (
                    <CareFileFolder
                        index={index}
                        key={file.key}
                        folderName={file.value}
                        folderKey={file.key}
                        carePlan={file.carePlan as boolean}
                        description={file.description as any}
                        forms={file.forms as any}
                        preAddissionState={false}
                        residentId={residentId as any}
                        canFillForms={canFillForms}
                        basePath={`/dashboard/residents/${residentId}/care-file-v2`}
                        version="v2"
                    />
                ))}
            </div>

            {/* Separator Line like in the photo */}
            <hr className="my-4 border-t border-gray-100" />

            {/* Additional Folders Row (Themed as per photo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* All Care Plans */}
                <div
                    className="w-full aspect-[5/2] flex flex-col justify-center gap-1 border-2 border-[#86D7DD] hover:bg-[#86D7DD]/5 cursor-pointer transition-all rounded-2xl px-6 py-4 group"
                    onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/all-care-plans?v=v2`)}
                >
                    <p className="text-[#007C89] text-lg font-bold">All Care Plans</p>
                    <p className="text-[#6B7280] text-sm">View all care plans</p>
                </div>

                {/* All Assessments */}
                <div
                    className="w-full aspect-[5/2] flex flex-col justify-center gap-1 border-2 border-[#A5F3FC] hover:bg-[#A5F3FC]/5 cursor-pointer transition-all rounded-2xl px-6 py-4 group"
                    onClick={() => router.push(`/dashboard/residents/${residentId}/care-file/all-risk-assessments?v=v2`)}
                >
                    <p className="text-[#0E7490] text-lg font-bold">All Assessments</p>
                    <p className="text-[#6B7280] text-sm">View all risk assessments</p>
                </div>
            </div>
        </div>
    );
}
