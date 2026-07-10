"use client";

import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ImageIcon,
  Upload,
  Clock,
  User,
  Check,
  Laptop,
} from "lucide-react";
import { formatTimestampToUKDateTime } from "@/lib/date-utils";
import { type WoundGalleryPhotoRecord } from "@/lib/wound-gallery-service";
import { cn } from "@/lib/utils";

type WoundPhotoSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: string;
  woundFolderId: string;
  galleryPhotos: WoundGalleryPhotoRecord[];
  isLoadingGallery: boolean;
  selectedGalleryPhotoId: string | null;
  onSelectGalleryPhoto: (photo: WoundGalleryPhotoRecord) => void;
  onSelectLocalFile: (file: File) => void;
};

export function WoundPhotoSelectorDialog({
  open,
  onOpenChange,
  residentId,
  woundFolderId,
  galleryPhotos = [],
  isLoadingGallery,
  selectedGalleryPhotoId,
  onSelectGalleryPhoto,
  onSelectLocalFile,
}: WoundPhotoSelectorDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>("gallery");
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectGalleryItem = (photo: WoundGalleryPhotoRecord) => {
    onSelectGalleryPhoto(photo);
    onOpenChange(false);
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectLocalFile(file);
      onOpenChange(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelectLocalFile(file);
      onOpenChange(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border-gray-200 text-gray-900 rounded-xl shadow-2xl">
        {/* Header with light gradient background */}
        <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 px-6 py-5 border-b border-gray-200/60">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              Select Wound Photograph
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              Choose a photo from the mobile gallery or upload a new photo from your computer.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Tab selection */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 bg-white"
        >
          <div className="px-6 py-3 border-b border-gray-200/60 bg-gray-50/50 flex justify-between items-center">
            <TabsList className="bg-gray-100 text-gray-500 border border-gray-200/50">
              <TabsTrigger
                value="gallery"
                className="text-gray-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all flex items-center gap-1.5 px-4"
              >
                <ImageIcon className="w-4 h-4" />
                Mobile Gallery ({galleryPhotos.length})
              </TabsTrigger>
              <TabsTrigger
                value="local"
                className="text-gray-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all flex items-center gap-1.5 px-4"
              >
                <Laptop className="w-4 h-4" />
                Upload Local File
              </TabsTrigger>
            </TabsList>

            {isLoadingGallery && activeTab === "gallery" && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Syncing mobile uploads...
              </div>
            )}
          </div>

          {/* Gallery Content */}
          <TabsContent value="gallery" className="flex-1 min-h-0 mt-0 focus-visible:ring-0">
            <ScrollArea className="h-full max-h-[50vh] px-6 py-5">
              {isLoadingGallery && galleryPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium">Fetching photos from mobile gallery...</p>
                </div>
              ) : galleryPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">No mobile photos found</p>
                    <p className="text-xs text-gray-500 max-w-sm mt-1 mx-auto">
                      Photos captured by Care Assistants through the mobile app for this wound folder will show up here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("local")}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors mt-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload from computer instead
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-2">
                  {galleryPhotos.map((photo) => {
                    const isSelected = selectedGalleryPhotoId === photo.id;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => handleSelectGalleryItem(photo)}
                        className={cn(
                          "group relative rounded-xl border overflow-hidden bg-white text-left transition-all duration-300 flex flex-col",
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/5"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-md hover:shadow-slate-100"
                        )}
                      >
                        {/* Photo Thumbnail */}
                        <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                          {photo.signedUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.signedUrl}
                              alt="Wound gallery thumbnail"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}

                          {/* Selected checkmark badge overlay */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[1px] flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-lg transform scale-100 transition-transform duration-300">
                                <Check className="w-5 h-5 text-white stroke-[3px]" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Photo Metadata Footer */}
                        <div className="p-3 bg-white space-y-1.5 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              {formatTimestampToUKDateTime(photo.capturedAt, "dd/MM/yyyy HH:mm")}
                            </span>
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
            </ScrollArea>
          </TabsContent>

          {/* Local Upload Content */}
          <TabsContent value="local" className="flex-1 min-h-0 mt-0 focus-visible:ring-0">
            <div className="p-6 h-full max-h-[50vh] flex flex-col justify-center">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 cursor-pointer text-center flex flex-col items-center justify-center min-h-[280px] transition-all duration-300",
                  isDragging
                    ? "border-blue-500 bg-blue-50/30 shadow-inner"
                    : "border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 transition-transform group-hover:scale-105 shadow-sm">
                  <Upload className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Drag & drop your photograph here
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  or <span className="text-blue-600 hover:underline font-medium">click to browse</span> from your computer
                </p>
                <p className="text-[10px] text-gray-400 mt-3">
                  Supports JPEG, PNG, or GIF up to 10MB
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLocalFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
