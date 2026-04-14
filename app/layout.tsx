import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { PostHogProvider } from "@/components/providers/PosthogProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "CareO",
  description: "Comprehensive healthcare management platform",
  icons: {
    icon: "/careo_favicon.jpeg",
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Force request-time rendering so Next.js can apply per-request CSP nonces.
  await headers();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <PostHogProvider>
          <SupabaseProvider>
            <NuqsAdapter>
              <SidebarProvider>
                <div className="flex flex-col justify-start h-dvh w-full">
                  {children}
                </div>
              </SidebarProvider>
            </NuqsAdapter>
          </SupabaseProvider>
        </PostHogProvider>
        <Toaster />
      </body>
    </html>
  );
}
