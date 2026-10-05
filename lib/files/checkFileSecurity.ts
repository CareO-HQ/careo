import { config } from "@/config";
import { toast } from "sonner";

// Allow-list of document and image types care staff upload. Anything else
// (scripts, executables, HTML/SVG that can carry script) is rejected.
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
  "tif",
  "tiff",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "rtf",
  "txt",
  "csv",
]);

export function checkFileSecurity(file: File) {
  if (file.size > config.limits.size) {
    toast.error("File is too large");
    return false;
  }
  // Check for dangerous names
  const dangerousNames = ["~"];
  if (dangerousNames.some((name) => file.name.includes(name))) {
    toast.error("File name is invalid");
    return false;
  }
  const parts = file.name.toLowerCase().split(".");
  const extension = parts.length > 1 ? parts.pop() : undefined;
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    toast.error("File type is not allowed");
    return false;
  }
  return true;
}
