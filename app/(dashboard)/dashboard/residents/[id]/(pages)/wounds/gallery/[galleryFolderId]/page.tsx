"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Images,
  Loader2,
  AlertCircle,
  ImageIcon,
  Clock,
  User,
  Check,
  Columns,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  fetchWoundGalleryPhotos,
  type WoundGalleryPhotoRecord,
} from "@/lib/wound-gallery-service";
import { formatTimestampToUKDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string; galleryFolderId: string }>;
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

export default function WoundGalleryFolderDetailPage({ params }: PageProps) {
  const { id: residentId, galleryFolderId } = React.use(params);
  const router = useRouter();

  const [folder, setFolder] = useState<WoundFolder | null>(null);
  const [photos, setPhotos] = useState<WoundGalleryPhotoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compare mode states
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<WoundGalleryPhotoRecord[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Single photo preview state
  const [previewPhoto, setPreviewPhoto] = useState<WoundGalleryPhotoRecord | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!residentId || !galleryFolderId) return;
      setIsLoading(true);
      try {
        // Fetch folder
        const { data: folderData, error: folderError } = await supabase
          .from("wound_folders")
          .select("*")
          .eq("id", galleryFolderId)
          .single();

        if (folderError) throw folderError;
        setFolder(folderData);

        // Fetch photos
        const photosData = await fetchWoundGalleryPhotos({
          residentId,
          woundFolderId: galleryFolderId,
        });
        setPhotos(photosData || []);
      } catch (err) {
        console.error("Error loading gallery folder:", err);
        toast.error("Failed to load photographs");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [residentId, galleryFolderId]);

  const handlePhotoClick = (photo: WoundGalleryPhotoRecord) => {
    if (isCompareMode) {
      const isAlreadySelected = selectedPhotos.some((p) => p.id === photo.id);
      if (isAlreadySelected) {
        setSelectedPhotos(selectedPhotos.filter((p) => p.id !== photo.id));
      } else {
        if (selectedPhotos.length >= 2) {
          toast.error("You can only compare up to 2 photos. Deselect one first.");
          return;
        }
        setSelectedPhotos([...selectedPhotos, photo]);
      }
    } else {
      setPreviewPhoto(photo);
    }
  };

  const handleToggleCompareMode = () => {
    setIsCompareMode(!isCompareMode);
    setSelectedPhotos([]);
  };

  const handleCloseCompareDialog = () => {
    setIsCompareOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedPhotos([]);
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground text-sm">Loading photographs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl relative pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/residents/${residentId}/wounds/gallery`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-black text-xl">
                {folder?.name || "Wound Gallery"}
              </span>
              {folder?.status && (
                <Badge className={`${getStatusColor(folder.status)} border text-[10px] font-semibold py-0.5 capitalize`}>
                  {folder.status}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Created {folder ? format(new Date(folder.created_at), "dd MMM yyyy") : ""}</span>
            </p>
          </div>
        </div>

        {photos.length > 1 && (
          <Button
            variant={isCompareMode ? "secondary" : "outline"}
            onClick={handleToggleCompareMode}
            className={cn("gap-1.5 font-semibold text-xs h-9", isCompareMode && "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700")}
          >
            <Columns className="w-4 h-4" />
            {isCompareMode ? "Exit Compare Mode" : "Compare Photos"}
          </Button>
        )}
      </div>

      {/* Grid of photos */}
      <div className="bg-white border rounded-xl p-6">
        {photos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-800 text-sm">No photos found</p>
            <p className="text-xs text-gray-500 max-w-xs mt-1 mx-auto">
              Photos uploaded by mobile Care Assistants for this wound folder will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => {
              const isSelected = selectedPhotos.some((p) => p.id === photo.id);
              return (
                <button
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo)}
                  className={cn(
                    "group relative rounded-xl border bg-white overflow-hidden text-left flex flex-col transition-all duration-300 w-full",
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/5"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-lg hover:shadow-slate-100"
                  )}
                >
                  {/* Thumbnail Image */}
                  <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                    {photo.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.signedUrl}
                        alt="Wound photograph"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}

                    {/* Compare Checkboxes overlay */}
                    {isCompareMode && (
                      <div className="absolute top-2 right-2 z-20">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-md transition-all duration-200",
                            isSelected
                              ? "bg-blue-600 border-white"
                              : "bg-black/40 border-white hover:bg-black/60"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3.5px]" />}
                        </div>
                      </div>
                    )}

                    {/* Selected state blur backdrop (compare mode) */}
                    {isCompareMode && isSelected && (
                      <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-[0.5px]" />
                    )}
                  </div>

                  {/* Photo metadata */}
                  <div className="p-3 space-y-1.5 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{formatTimestampToUKDateTime(photo.capturedAt, "dd/MM/yyyy HH:mm")}</span>
                    </div>
                    {photo.uploaderName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{photo.uploaderName}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating compare action bar */}
      {isCompareMode && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-800 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white border-0 font-bold px-2 py-0.5 rounded">
              {selectedPhotos.length} / 2
            </Badge>
            <span className="text-xs font-medium text-slate-300">
              {selectedPhotos.length === 2
                ? "Ready to compare!"
                : "Select 2 photos to compare side-by-side"}
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            {selectedPhotos.length > 0 && (
              <button
                onClick={handleClearSelection}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
            <Button
              onClick={() => setIsCompareOpen(true)}
              disabled={selectedPhotos.length !== 2}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 h-8 rounded-full font-bold transition-all flex items-center gap-1"
            >
              <Columns className="w-3.5 h-3.5" />
              Compare
            </Button>
            <button
              onClick={handleToggleCompareMode}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen single image lightbox dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={(next) => !next && setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl bg-white border-gray-200 text-gray-900 rounded-xl overflow-hidden p-0 gap-0 shadow-2xl">
          <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-base font-bold text-gray-900">
                {previewPhoto
                  ? formatTimestampToUKDateTime(previewPhoto.capturedAt, "dd/MM/yyyy HH:mm")
                  : "Photo Preview"}
              </DialogTitle>
              {previewPhoto?.uploaderName && (
                <DialogDescription className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-gray-400" />
                  <span>Uploaded by {previewPhoto.uploaderName}</span>
                </DialogDescription>
              )}
            </DialogHeader>
          </div>

          <div className="p-4 bg-gray-100 flex items-center justify-center max-h-[70vh] min-h-[300px]">
            {previewPhoto?.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewPhoto.signedUrl}
                alt="Wound gallery preview"
                className="max-w-full max-h-[60vh] object-contain rounded-md shadow-md bg-white border"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Side-by-Side Compare Dialog */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] w-[95vw] bg-white border-gray-200 text-gray-900 rounded-xl overflow-hidden p-0 gap-0 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-slate-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Columns className="w-5 h-5 text-blue-600" />
                Side-by-Side Comparison
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Comparing two progress stages side-by-side.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseCompareDialog}
              className="h-8 border-gray-200"
            >
              Close Comparison
            </Button>
          </div>

          {/* Split comparison content panels */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 bg-gray-50 overflow-y-auto">
            {/* Panel Left */}
            {selectedPhotos[0] && (
              <div className="flex flex-col h-full min-h-0 bg-white">
                {/* Meta details */}
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>
                      {formatTimestampToUKDateTime(selectedPhotos[0].capturedAt, "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  {selectedPhotos[0].uploaderName && (
                    <div className="flex items-center gap-1 text-gray-500 font-medium">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{selectedPhotos[0].uploaderName}</span>
                    </div>
                  )}
                </div>
                {/* Image block */}
                <div className="flex-1 p-5 flex items-center justify-center min-h-[250px] bg-gray-100/50">
                  {selectedPhotos[0].signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedPhotos[0].signedUrl}
                      alt="Left compare preview"
                      className="max-w-full max-h-[50vh] object-contain rounded-lg shadow border bg-white"
                    />
                  ) : null}
                </div>
              </div>
            )}

            {/* Panel Right */}
            {selectedPhotos[1] && (
              <div className="flex flex-col h-full min-h-0 bg-white">
                {/* Meta details */}
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>
                      {formatTimestampToUKDateTime(selectedPhotos[1].capturedAt, "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  {selectedPhotos[1].uploaderName && (
                    <div className="flex items-center gap-1 text-gray-500 font-medium">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{selectedPhotos[1].uploaderName}</span>
                    </div>
                  )}
                </div>
                {/* Image block */}
                <div className="flex-1 p-5 flex items-center justify-center min-h-[250px] bg-gray-100/50">
                  {selectedPhotos[1].signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedPhotos[1].signedUrl}
                      alt="Right compare preview"
                      className="max-w-full max-h-[50vh] object-contain rounded-lg shadow border bg-white"
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
