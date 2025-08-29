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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { TrashIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

export default function ImageSelector({
  selectedFile,
  setSelectedFile,
  currentImageUrl,
  fileId,
  userInitial,
  placeholder
}: {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  currentImageUrl: string | null | undefined;
  fileId: Id<"files"> | null | undefined;
  userInitial: string;
  placeholder?: React.ReactNode;
}) {
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const deleteImageMutation = useMutation(api.files.image.deleteById);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validImageTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validImageTypes.includes(file.type)) {
        toast.error("Please select a valid image file (JPEG, JPG, PNG)");
        return;
      }

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

  const handleCropComplete = async (croppedImageData: string) => {
    setCroppedImage(croppedImageData);
    setIsModalOpen(false);

    // Convert cropped image data to File object
    try {
      const response = await fetch(croppedImageData);
      const blob = await response.blob();
      const croppedFile = new File(
        [blob],
        selectedFile?.name || "cropped-image.png",
        {
          type: blob.type || "image/png"
        }
      );
      setSelectedFile(croppedFile);
    } catch (error) {
      toast.error("Failed to process cropped image");
    }
  };

  return (
    <>
      {croppedImage || currentImageUrl ? (
        <div className="flex flex-col items-center gap-4 w-full mt-4 relative">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-32 h-32 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden hover:border-primary hover:bg-muted transition-colors shadow-xs">
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
            className="absolute top-22 right-46 rounded-full"
            onClick={handleReset}
            size="icon"
            type="button"
            variant="outline"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full mt-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-32 h-32 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden hover:border-primary hover:bg-muted transition-colors shadow-xs">
              <div className="bg-muted w-30 h-30 flex flex-col items-center justify-center rounded-full">
                {placeholder ? (
                  placeholder
                ) : (
                  <div className="text-primary font-semibold text-2xl text-center">
                    {userInitial}
                  </div>
                )}
              </div>
            </div>
          </label>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
            <DialogDescription>
              Adjust the image to the desired size and position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFile && (
              <ImageCrop
                aspect={1}
                file={selectedFile}
                maxImageSize={2 * 1024 * 1024} // 2MB
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
