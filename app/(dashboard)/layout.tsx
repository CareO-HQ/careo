import { AppSidebar } from "@/components/navigation/AppSidebar";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex p-10 w-full">
      <AppSidebar />
      {children}
      <Toaster />
    </main>
  );
}
