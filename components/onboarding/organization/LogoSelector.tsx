"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  ImageCrop,
  ImageCropApply,
  ImageCropContent
} from "@/components/ui/kibo-ui/image-crop";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TrashIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function LogoSelector({
  selectedFile,
  setSelectedFile,
  currentImageUrl,
  fileId,
  disabled
}: {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  currentImageUrl: string | null | undefined;
  fileId: Id<"files"> | null | undefined;
  disabled: boolean;
}) {
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const deleteImageMutation = useMutation(api.files.image.deleteById);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCroppedImage(null);
      setIsModalOpen(true);
    }
  };

  const handleReset = async () => {
    setSelectedFile(null);
    setCroppedImage(null);
    if (fileId) {
      await deleteImageMutation({
        fileId
      });
    }
    setIsModalOpen(false);
  };

  const handleCropComplete = (croppedImageData: string) => {
    setCroppedImage(croppedImageData);
    setIsModalOpen(false);
  };

  return (
    <>
      {croppedImage || currentImageUrl ? (
        <div className="flex flex-col items-start gap-4 w-full mt-4 relative">
          <Label>Logo</Label>
          <label
            className={cn("cursor-pointer", disabled && "cursor-not-allowed")}
          >
            <input
              disabled={disabled}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-20 h-20 rounded-lg border border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden hover:border-primary hover:bg-muted transition-colors shadow-xs">
              <Image
                alt="Profile picture"
                height={96}
                src={croppedImage || currentImageUrl || ""}
                unoptimized
                width={96}
                className="w-full h-full object-cover"
              />
            </div>
          </label>
          <Button
            className="absolute top-22 left-16 rounded-full"
            onClick={handleReset}
            size="icon"
            type="button"
            disabled={disabled}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 w-full mt-4">
          <Label>Logo</Label>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-20 h-20 rounded-lg border border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden hover:border-primary hover:bg-muted transition-colors shadow-xs">
              <div className="bg-muted w-30 h-30 flex flex-col items-center justify-center rounded-full hover:text-primary">
                <UploadIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </label>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop logo</DialogTitle>
            <DialogDescription>
              Adjust the logo to the desired size and position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFile && (
              <ImageCrop
                aspect={1}
                file={selectedFile}
                maxImageSize={1024 * 1024} // 1MB
                onChange={console.log}
                onComplete={console.log}
                onCrop={handleCropComplete}
              >
                <ImageCropContent className="max-w-md mx-auto" />
                <div className="flex items-center justify-end gap-2 mt-4 w-full">
                  <Button onClick={handleReset} type="button" variant="outline">
                    Cancel
                  </Button>
                  <ImageCropApply asChild>
                    <Button type="button" variant="default">
                      Apply
                    </Button>
                  </ImageCropApply>
                </div>
              </ImageCrop>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
