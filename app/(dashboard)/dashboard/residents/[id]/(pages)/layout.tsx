"use client";
export default function ResidentsLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <main className="flex flex-col w-full">
      {children}
    </main>
  );
}
