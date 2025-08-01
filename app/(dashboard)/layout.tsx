import { AppSidebar } from "@/components/navigation/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex h-screen items-center w-full">
      <AppSidebar />
      <SidebarTrigger />
      {children}
    </main>
  );
}
