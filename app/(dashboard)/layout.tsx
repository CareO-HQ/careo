"use client";

import { AppSidebar } from "@/components/navigation/AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const saasAdminStatus = useQuery(api.saasAdmin.getSaasAdminStatus);
  const router = useRouter();

  // Redirect SaaS Admin to admin dashboard
  useEffect(() => {
    if (saasAdminStatus?.isSaasAdmin) {
      router.push("/admin");
    }
  }, [saasAdminStatus, router]);

  return (
    <main className="flex p-10 w-full">
      <AppSidebar />
      {children}
      <Toaster />
    </main>
  );
}
