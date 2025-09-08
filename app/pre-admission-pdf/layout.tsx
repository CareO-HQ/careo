import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";

export default function PreAdmissionPDFLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
