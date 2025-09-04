"use client";

import ResidentBreadcrumb from "@/components/residents/ResidentBreadcrumb";

export default function ResidentsLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex flex-col w-full">
      <div className="-mt-5 mb-5">
        <ResidentBreadcrumb residentId={"m571wt5ddrg078zejvf16atkmx7pvb1r"} />
      </div>

      {children}
    </main>
  );
}
