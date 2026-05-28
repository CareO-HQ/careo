"use client";

import { AppSidebar } from "@/components/navigation/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, isLoading } = useProfile();
  const router = useRouter();

  // Redirect SaaS Admin to admin dashboard
  useEffect(() => {
    if (!isLoading && profile?.is_saas_admin) {
      router.push("/admin");
    }
  }, [profile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <main className="flex w-full min-w-0 px-6 py-10">
      <AppSidebar />
      <div className="flex min-w-0 w-full flex-1 flex-col">
        <div className="mb-4">
          <SidebarTrigger />
        </div>
        {children}
      </div>
      <Toaster />
    </main>
  );
}
