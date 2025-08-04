export function getLabelClassName(color: string) {
  switch (color) {
    case "red":
      return "bg-red-500/20 border-red-300 text-red-600";
    case "emerald":
      return "bg-emerald-500/20 border-emerald-300 text-emerald-600";
    case "blue":
      return "bg-blue-500/20 border-blue-300 text-blue-600";
    case "yellow":
      return "bg-yellow-500/20 border-yellow-300 text-yellow-600";
    case "pink":
      return "bg-pink-500/20 border-pink-300 text-pink-600";
    case "orange":
      return "bg-orange-500/20 border-orange-300 text-orange-600";
    case "violet":
      return "bg-violet-500/20 border-violet-300 text-violet-600";
    default:
      return "bg-gray-500/20 border-gray-300 text-gray-600";
  }
}
