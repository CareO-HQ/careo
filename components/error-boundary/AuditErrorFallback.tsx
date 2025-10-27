"use client";

import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface AuditErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  context?: "listing" | "editor" | "view";
}

export function AuditErrorFallback({
  error,
  resetError,
  context = "listing"
}: AuditErrorFallbackProps) {
  const router = useRouter();

  const handleReload = () => {
    if (resetError) {
      resetError();
    }
    window.location.reload();
  };

  const handleGoHome = () => {
    router.push("/dashboard/careo-audit?tab=carefile");
  };

  const getContextMessage = () => {
    switch (context) {
      case "editor":
        return "We encountered an error while loading the audit editor. Your work may have been auto-saved.";
      case "view":
        return "We encountered an error while loading the audit details.";
      case "listing":
      default:
        return "We encountered an error while loading the care file audits.";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-lg w-full">
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Message */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-2">
              {getContextMessage()}
            </p>
            {error && (
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-left">
                  <code className="text-xs text-red-600 dark:text-red-400 break-all">
                    {error.message}
                  </code>
                  {error.stack && (
                    <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-40">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleReload}
              className="flex-1"
              size="lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Audits
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              If this problem persists, please contact your system administrator or try again later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
