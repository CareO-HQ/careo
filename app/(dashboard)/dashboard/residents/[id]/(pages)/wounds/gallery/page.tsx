"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Folder,
  Calendar,
  Images,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  fetchWoundGalleryPhotos,
  type WoundGalleryPhotoRecord,
} from "@/lib/wound-gallery-service";

type PageProps = {
  params: Promise<{ id: string }>;
};

type WoundFolder = {
  id: string;
  resident_id: string;
  name: string;
  wound_type: string;
  wound_number: number;
  status?: string;
  created_at: string;
};

export default function WoundGalleryFoldersPage({ params }: PageProps) {
  const { id: residentId } = React.use(params);
  const router = useRouter();

  const [resident, setResident] = useState<any>(null);
  const [folders, setFolders] = useState<WoundFolder[]>([]);
  const [photos, setPhotos] = useState<WoundGalleryPhotoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!residentId) return;
      setIsLoading(true);
      try {
        // Fetch resident
        const { data: resData, error: resError } = await supabase
          .from("residents")
          .select("*")
          .eq("id", residentId)
          .single();

        if (resError) throw resError;
        setResident(resData);

        // Fetch folders
        const { data: foldersData, error: foldersError } = await supabase
          .from("wound_folders")
          .select("*")
          .eq("resident_id", residentId)
          .order("created_at", { ascending: false });

        if (foldersError) throw foldersError;
        setFolders(foldersData || []);

        // Fetch photos
        const photosData = await fetchWoundGalleryPhotos({ residentId });
        setPhotos(photosData || []);
      } catch (err) {
        console.error("Error loading gallery directory:", err);
        toast.error("Failed to load wound folders");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [residentId]);

  // Calculate resident info
  const fullName = useMemo(() => {
    if (!resident?.first_name || !resident?.last_name) return "Unknown Resident";
    return `${resident.first_name} ${resident.last_name}`;
  }, [resident]);

  const initials = useMemo(() => {
    if (!resident?.first_name || !resident?.last_name) return "??";
    return `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();
  }, [resident]);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "healing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "healed":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "deteriorating":
        return "bg-red-100 text-red-800 border-red-200";
      case "infected":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const folderDataList = useMemo(() => {
    return folders.map((folder) => {
      const folderPhotos = photos.filter((p) => p.woundFolderId === folder.id);
      const photoCount = folderPhotos.length;
      const latestPhoto = folderPhotos[0]; // ordered desc in service fetch
      return {
        ...folder,
        photoCount,
        coverUrl: latestPhoto?.signedUrl || null,
      };
    });
  }, [folders, photos]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground text-sm">Loading gallery directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${residentId}/wounds`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-16 h-16">
          <AvatarImage src={resident?.image_url} alt={fullName} className="border" />
          <AvatarFallback className="text-base bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black text-xl">{fullName}</span>
            <span className="text-muted-foreground">/ Wound Gallery</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Select a folder to view and compare photographs
          </p>
        </div>
      </div>

      {/* Directory Folders */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="w-5 h-5 text-blue-600" />
            <span>Wound Folders ({folderDataList.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {folderDataList.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No wound folders found</p>
              <p className="text-gray-400 text-sm mt-1">
                Create a wound assessment folder on the Wounds page first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {folderDataList.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() =>
                    router.push(`/dashboard/residents/${residentId}/wounds/gallery/${folder.id}`)
                  }
                  className="group flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden text-left hover:border-blue-400 hover:shadow-lg transition-all duration-300 w-full"
                >
                  {/* Card Cover Thumbnail */}
                  <div className="relative w-full aspect-[16/10] bg-gray-50 flex items-center justify-center border-b border-gray-100 overflow-hidden">
                    {folder.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={folder.coverUrl}
                        alt={`Cover for ${folder.name}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Folder className="w-6 h-6 text-gray-400" />
                        </div>
                        <span className="text-xs">No photos in folder</span>
                      </div>
                    )}

                    {/* Photo Count Overlay */}
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-2 py-1 rounded-md backdrop-blur-[2px] flex items-center gap-1">
                      <Images className="w-3.5 h-3.5" />
                      {folder.photoCount} {folder.photoCount === 1 ? "Photo" : "Photos"}
                    </div>
                  </div>

                  {/* Card Info Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between w-full space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono font-bold text-xs">
                          Wound #{folder.wound_number}
                        </Badge>
                        {folder.status && (
                          <Badge className={`${getStatusColor(folder.status)} border text-[10px] font-semibold py-0.5 capitalize`}>
                            {folder.status}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm truncate mt-1">
                        {folder.name}
                      </h4>
                    </div>

                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 w-full">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Created {format(new Date(folder.created_at), "dd MMM yyyy")}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
