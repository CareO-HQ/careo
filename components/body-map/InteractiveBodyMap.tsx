"use client";

import React from "react";
import { BODY_REGIONS } from "@/lib/config/body-regions";
import { BodyRegion, BodyView, BodyMapEntry } from "@/types/body-map";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InteractiveBodyMapProps {
    entries: BodyMapEntry[];
    onRegionClick: (region: BodyRegion) => void;
    isLoading?: boolean;
    selectedRegionId?: string | null;
    viewMode?: boolean;
}

export function InteractiveBodyMap({
    entries,
    onRegionClick,
    isLoading,
    selectedRegionId,
    viewMode = false
}: InteractiveBodyMapProps) {
    const [hoveredRegion, setHoveredRegion] = React.useState<string | null>(null);

    // Both views are now displayed side-by-side
    const regions = BODY_REGIONS;

    const getEntriesForRegion = (regionId: string) => {
        return entries.filter(e => e.region_id === regionId);
    };

    return (
        <div className="flex flex-col items-center space-y-4 w-full h-full max-h-[850px]">
            <div className="relative border rounded-xl bg-white w-full max-w-[850px] aspect-[577/515] shadow-sm overflow-hidden">
                {/* Body Map Template Image */}
                <div className="absolute inset-0">
                    <img
                        src="/images/body_template_without_rectangular_boxes.png"
                        alt="Body Map"
                        className="w-full h-full object-fill"
                    />
                </div>

                {/* Clickable Rectangles */}
                {regions.map((region) => {
                    const regionEntries = getEntriesForRegion(region.region_id);
                    const hasEntry = regionEntries.length > 0;
                    const isHovered = hoveredRegion === region.region_id;

                    return (
                        <div
                            key={region.region_id}
                            className={cn(
                                "absolute border-2 transition-all cursor-pointer group flex items-center justify-center rounded-sm",
                                region.region_id === selectedRegionId
                                    ? "bg-yellow-400/40 border-yellow-500 z-50 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse"
                                    : isHovered
                                        ? "bg-blue-400/30 border-blue-500 z-40"
                                        : hasEntry
                                            ? "bg-purple-400/30 border-purple-400 hover:bg-purple-400/50"
                                            : "bg-slate-100/30 border-slate-300/60 hover:bg-blue-100/40 hover:border-blue-400/60",
                                hasEntry && "animate-in fade-in zoom-in duration-300"
                            )}
                            style={{
                                left: `${region.x}%`,
                                top: `${region.y}%`,
                                width: `${region.width}%`,
                                height: `${region.height}%`,
                            }}
                            onClick={() => onRegionClick(region)}
                            onMouseEnter={() => setHoveredRegion(region.region_id)}
                            onMouseLeave={() => setHoveredRegion(null)}
                        >
                            {/* Hover Tooltip - Quick View */}
                            {isHovered && regionEntries.length > 0 && (
                                <div className={cn(
                                    "absolute left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white p-2 rounded shadow-xl text-[10px] z-[100] pointer-events-none animate-in fade-in",
                                    region.y < 30
                                        ? "top-full mt-2"
                                        : "bottom-full mb-2"
                                )}>
                                    <div className="font-bold border-b border-white/20 pb-1 mb-1">
                                        {region.region_name}
                                    </div>
                                    {regionEntries.map((entry, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                            <div className="flex justify-between items-center">
                                                <span className="capitalize">{entry.condition_type}</span>
                                            </div>
                                            <div className="text-white/70 italic line-clamp-1">
                                                {entry.notes || "No notes"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}
            </div>

            <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-transparent border border-slate-300"></div>
                    <span>Clear</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-400/30 border border-purple-400"></div>
                    <span>Marked Observation</span>
                </div>
            </div>
        </div>
    );
}
