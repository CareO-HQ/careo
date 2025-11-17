"use client";
export default function ResidentsLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <main className="container mx-auto p-6 max-w-6xl">
      {children}
    </main>
  );
}
