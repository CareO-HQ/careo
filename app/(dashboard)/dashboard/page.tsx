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
    <div className="flex flex-col items-center justify-center min-h-96">
     
      <p className="text-muted-foreground mb-6">Manage your healthcare facility with ease</p>
      <Button onClick={handleLogout}>Log out</Button>
    </div>
  );
}
