import { LocationInfo } from "@/types";

// Helper function to format location display
export const formatLocationDisplay = (
  location: LocationInfo | null | undefined
): string => {
  if (!location) return "Loading location...";

  const parts = [];
  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);

  return parts.length > 0 ? parts.join(", ") : "Unknown location";
};
