"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        }
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Button onClick={handleLogout}>Log out</Button>
    </div>
  );
}
