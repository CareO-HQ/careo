"use client";

import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { Toaster } from "@/components/ui/toaster";

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex p-10 w-full">
      <AdminSidebar />
      {children}
      <Toaster />
    </main>
  );
}
