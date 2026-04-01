"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { BodyMapData } from "@/types/body-map";
import { BodyMapWorkspace } from "./BodyMapWorkspace";

interface BodyMapDialogProps {
    isOpen: boolean;
    onClose: () => void;
    incidentId?: string;
    residentName?: string;
    incidentDate?: string;
    incidentType?: string;
    initialData?: BodyMapData;
    onSave?: (data: BodyMapData) => void | Promise<void>;
    orgLogoUrl?: string;
    simpleMode?: boolean;
}

export function BodyMapDialog({
    isOpen,
    onClose,
    incidentId,
    residentName,
    incidentDate,
    incidentType,
    initialData,
    onSave,
    orgLogoUrl,
    simpleMode = false
}: BodyMapDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[1300px] w-full h-[90vh] p-0 overflow-hidden border-none shadow-2xl">
                <BodyMapWorkspace
                    incidentId={incidentId}
                    residentName={residentName}
                    incidentDate={incidentDate}
                    incidentType={incidentType}
                    initialData={initialData}
                    onSave={onSave}
                    orgLogoUrl={orgLogoUrl}
                    simpleMode={simpleMode}
                    onClose={onClose}
                />
            </DialogContent>
        </Dialog>
    );
}
