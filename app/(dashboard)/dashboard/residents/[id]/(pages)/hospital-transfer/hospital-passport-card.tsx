import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Printer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HospitalPassportCardProps {
  passport: any;
  resident: any;
  onView: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onDelete: () => void;
}

export function HospitalPassportCard({
  passport,
  resident,
  onView,
  onEdit,
  onPrint,
  onDelete,
}: HospitalPassportCardProps) {
  const getInitials = (name: string) => {
    if (!name) return "R";
    const parts = name.split(' ');
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateValue: string | number | Date) => {
    if (!dateValue) return "Not specified";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London'
    });
  };

  const fullName = `${resident?.firstName || ""} ${resident?.lastName || ""}`.trim() || passport?.generalDetails?.personName || "Resident";

  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-lg border-neutral-200 rounded-xl bg-white group hover:shadow-xl transition-all duration-300">
      {/* Blue Header with Medical Icon */}
      <div className="bg-[#2563EB] p-6 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
        {/* Subtle background pattern/glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        <div className="bg-white rounded-xl p-3 shadow-md relative z-10">
          <Plus className="w-8 h-8 text-[#2563EB] stroke-[3px]" />
        </div>
        <h3 className="text-white font-bold text-sm tracking-[0.15em] uppercase relative z-10">
          Hospital Passport
        </h3>
      </div>

      <CardContent className="p-8 flex flex-col items-center">
        {/* Resident Avatar */}
        <Avatar className="w-28 h-28 border-4 border-white shadow-xl -mt-20 relative z-20 mb-4 ring-2 ring-[#2563EB]/10">
          <AvatarImage src={resident?.imageUrl} className="object-cover" />
          <AvatarFallback className="bg-neutral-100 text-[#2563EB] text-2xl font-bold">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        {/* Resident Name */}
        <h4 className="text-xl font-extrabold text-neutral-900 mb-6 tracking-tight text-center">
          {fullName}
        </h4>

        {/* Info Grid */}
        <div className="w-full space-y-3.5 mb-8">
          <div className="flex justify-between items-center text-sm border-b border-neutral-100 pb-2.5">
            <span className="text-neutral-500 font-medium">NHS:</span>
            <span className="text-neutral-900 font-semibold">{passport?.generalDetails?.nhsNumber || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-neutral-100 pb-2.5">
            <span className="text-neutral-500 font-medium">DOB:</span>
            <span className="text-neutral-900 font-semibold">{formatDate(resident?.dateOfBirth || passport?.generalDetails?.dateOfBirth)}</span>
          </div>
        </div>

        {/* Action Button Grid */}
        <div className="grid grid-cols-4 gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onView}
            className="flex-col h-auto py-2.5 gap-1.5 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 group/btn"
          >
            <Eye className="w-4 h-4 text-neutral-500 group-hover/btn:text-[#2563EB] transition-colors" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600">View</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            className="flex-col h-auto py-2.5 gap-1.5 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 group/btn"
          >
            <Edit className="w-4 h-4 text-neutral-500 group-hover/btn:text-[#2563EB] transition-colors" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600">Edit</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPrint}
            className="flex-col h-auto py-2.5 gap-1.5 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 group/btn"
          >
            <Printer className="w-4 h-4 text-neutral-500 group-hover/btn:text-[#2563EB] transition-colors" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600">Print</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete}
            className="flex-col h-auto py-2.5 gap-1.5 border-neutral-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 group/btn"
          >
            <Trash2 className="w-4 h-4 text-neutral-500 group-hover/btn:text-red-500 transition-colors" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600">Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
