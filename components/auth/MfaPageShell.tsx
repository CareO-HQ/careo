import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import type { ReactNode } from "react";

/** Logo + card layout shared by the authenticator-app login pages. */
export default function MfaPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-center items-center min-h-dvh px-4 py-8 w-full">
      <Image
        src="/images/CareO_Logo.png"
        alt="CareO"
        width={160}
        height={48}
        className="object-contain max-h-12 w-auto mb-6"
        priority
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export function MfaPageLoading() {
  return (
    <div className="flex flex-col justify-center items-center min-h-dvh w-full">
      <div>Loading...</div>
    </div>
  );
}
