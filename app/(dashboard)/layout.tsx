import { AppSidebar } from "@/components/navigation/AppSidebar";
// import { SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex p-10 w-full">
      <AppSidebar />
      {children}
    </main>
  );
}
