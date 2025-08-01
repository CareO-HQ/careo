import { SettingsSidebar } from "@/components/navigation/SettingsSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function SettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SettingsSidebar />
      <div className="h-dvh flex flex-col justify-start w-full p-10 max-w-xl mx-auto">
        {children}
      </div>
    </SidebarProvider>
  );
}
