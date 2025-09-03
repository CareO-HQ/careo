import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// dateOfBirth is like 2025-08-15
export function getAge(dateOfBirth: string) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  console.log(birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function getColorForBadge(value: string): string {
  // Define available Tailwind color classes for badges
  const colors = [
    "bg-blue-50 text-blue-800 border-blue-300",
    "bg-red-50 text-red-800 border-red-300",
    "bg-pink-50 text-pink-800 border-pink-300",
    "bg-indigo-50 text-indigo-800 border-indigo-300",
    "bg-teal-50 text-teal-800 border-teal-300",
    "bg-cyan-50 text-cyan-800 border-cyan-300",
    "bg-lime-50 text-lime-800 border-lime-300",
    "bg-emerald-50 text-emerald-800 border-emerald-300"
  ];

  // Create a simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get consistent index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
