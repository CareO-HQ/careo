import { config } from "@/config";
import { toast } from "sonner";

export function checkFileSecurity(file: File) {
  if (file.size > config.limits.size) {
    toast.error("File is too large");
    return false;
  }
  // Check for dangerous types
  const dangerousTypes = ["php", "asp", "aspx", "jsp", "html", "htm"];
  const extension = file.name.split(".").pop();
  if (extension && dangerousTypes.includes(extension)) {
    toast.error("File type is not allowed");
    return false;
  }
  // Check for dangerous names
  const dangerousNames = ["~"];
  if (dangerousNames.some((name) => file.name.includes(name))) {
    toast.error("File name is invalid");
    return false;
  }
  // Check for dangerous extensions
  const dangerousExtensions = [".exe", ".bat", ".sh", ".cmd", ".ps1"];
  if (dangerousExtensions.some((extension) => file.name.endsWith(extension))) {
    toast.error("File extension is not allowed");
    return false;
  }
  return true;
}
