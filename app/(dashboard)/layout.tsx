"use client";

import { AppSidebar } from "@/components/navigation/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

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

  // Handle MDT and RQIA session redirects and restriction
  useEffect(() => {
    if (isLoading || !profile) return;

    if (profile.role === "mdt") {
      const sessionCookie = getCookie("mdt_session_data");
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

      if (!sessionCookie) {
        if (currentPath !== "/dashboard/mdt-session") {
          router.push("/dashboard/mdt-session");
        }
      } else {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
          
          // Validate that the session data belongs to the currently logged-in user
          if (sessionData.userId !== profile.id) {
            document.cookie = "mdt_session_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
            if (currentPath !== "/dashboard/mdt-session") {
              router.push("/dashboard/mdt-session");
            }
            return;
          }

          const targetPath = `/dashboard/residents/${sessionData.residentId}/multidisciplinary-note`;
          const isAllowedPath = currentPath === targetPath || currentPath.startsWith(targetPath + "/");
          
          if (!isAllowedPath && currentPath !== "/dashboard/mdt-session") {
            router.push(targetPath as any);
          }
        } catch (e) {
          console.error("Failed to parse MDT session cookie", e);
          if (currentPath !== "/dashboard/mdt-session") {
            router.push("/dashboard/mdt-session");
          }
        }
      }
    }

    // Handle RQIA session redirects and restriction
    if (profile.role === "rqia") {
      const sessionCookie = getCookie("rqia_session_data");
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

      if (!sessionCookie) {
        if (currentPath !== "/dashboard/rqia-session") {
          router.push("/dashboard/rqia-session" as any);
        }
      } else {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie));

          // Validate that the session data belongs to the currently logged-in user
          if (sessionData.userId !== profile.id) {
            document.cookie = "rqia_session_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
            if (currentPath !== "/dashboard/rqia-session") {
              router.push("/dashboard/rqia-session" as any);
            }
            return;
          }

          const isAllowedRqiaPath =
            currentPath === "/dashboard/rqia-portal" ||
            currentPath === "/dashboard/rqia-session" ||
            currentPath.startsWith("/dashboard/residents/");

          if (!isAllowedRqiaPath) {
            router.push("/dashboard/rqia-portal" as any);
          }
        } catch (e) {
          console.error("Failed to parse RQIA session cookie", e);
          if (currentPath !== "/dashboard/rqia-session") {
            router.push("/dashboard/rqia-session" as any);
          }
        }
      }
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
