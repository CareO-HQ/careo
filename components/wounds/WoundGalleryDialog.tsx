"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ImageIcon } from "lucide-react";
import { formatTimestampToUKDateTime } from "@/lib/date-utils";
import {
  fetchWoundGalleryPhotos,
  groupGalleryPhotosByFolder,
  type WoundGalleryPhotoRecord,
} from "@/lib/wound-gallery-service";
import { cn } from "@/lib/utils";

type WoundGalleryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: string;
  woundFolderId?: string;
  title?: string;
};

export function WoundGalleryDialog({
  open,
  onOpenChange,
  residentId,
  woundFolderId,
  title = "Wound Gallery",
}: WoundGalleryDialogProps) {
  const [photos, setPhotos] = useState<WoundGalleryPhotoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<WoundGalleryPhotoRecord | null>(null);

  const groupedPhotos = useMemo(() => {
    if (woundFolderId) {
      return photos.length > 0
        ? [
            {
              folderId: woundFolderId,
              folderLabel: photos[0]?.woundFolderName ?? "Wound folder",
              photos,
            },
          ]
        : [];
    }
    return groupGalleryPhotosByFolder(photos);
  }, [photos, woundFolderId]);

  const loadPhotos = useCallback(async () => {
    if (!residentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWoundGalleryPhotos({ residentId, woundFolderId });
      setPhotos(data);
    } catch (err) {
      console.error("WoundGalleryDialog loadPhotos:", err);
      setError(err instanceof Error ? err.message : "Failed to load gallery photos");
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }, [residentId, woundFolderId]);

  useEffect(() => {
    if (open) {
      loadPhotos();
    } else {
      setPreviewPhoto(null);
    }
  }, [open, loadPhotos]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Timestamped wound photos captured by care staff on mobile.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading gallery...
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">{error}</div>
            ) : photos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No gallery photos yet</p>
                <p className="text-sm mt-1">
                  Photos uploaded from the mobile app will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-8 pb-2">
                {groupedPhotos.map((group) => (
                  <section key={group.folderId}>
                    {!woundFolderId ? (
                      <h3 className="text-sm font-semibold mb-3">{group.folderLabel}</h3>
                    ) : null}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {group.photos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
                          className={cn(
                            "group rounded-lg border overflow-hidden text-left",
                            "hover:ring-2 hover:ring-primary/40 transition-shadow"
                          )}
                        >
                          {photo.signedUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.signedUrl}
                              alt={`Wound photo ${formatTimestampToUKDateTime(photo.capturedAt, "dd/MM/yyyy HH:mm")}`}
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2 space-y-0.5">
                            <p className="text-xs font-medium">
                              {formatTimestampToUKDateTime(photo.capturedAt, "dd/MM/yyyy HH:mm")}
                            </p>
                            {photo.uploaderName ? (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {photo.uploaderName}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewPhoto} onOpenChange={(next) => !next && setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewPhoto
                ? formatTimestampToUKDateTime(previewPhoto.capturedAt, "dd/MM/yyyy HH:mm")
                : "Photo preview"}
            </DialogTitle>
            {previewPhoto?.uploaderName ? (
              <DialogDescription>Uploaded by {previewPhoto.uploaderName}</DialogDescription>
            ) : null}
          </DialogHeader>
          {previewPhoto?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewPhoto.signedUrl}
              alt="Wound gallery preview"
              className="w-full max-h-[70vh] object-contain rounded-md bg-muted"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
