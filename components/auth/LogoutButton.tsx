"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LogoutButtonProps {
    className?: string;
    redirectUrl?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    showText?: boolean;
}

export function LogoutButton({
    className,
    redirectUrl = "/",
    variant = "ghost",
    showText = true,
}: LogoutButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        try {
            setIsLoading(true);
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        // Invalidate router cache to ensure fresh state
                        router.refresh();
                        // Client-side navigation
                        router.push(redirectUrl as any);
                    },
                },
            });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            size="sm"
            className={cn("gap-2", className)}
            onClick={handleLogout}
            disabled={isLoading}
            aria-label="Log out"
        >
            <LogOut className="h-4 w-4" />
            {showText && <span>Log out</span>}
        </Button>
    );
}
