"use client";

import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { Toaster } from "@/components/ui/toaster";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-end px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <LogoutButton />
        </header>
        <main className="flex-1 p-10">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
