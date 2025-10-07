"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorStateProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  showBackButton?: boolean;
}

export function ErrorState({
  message = "Failed to load data",
  description = "We couldn't load this information. Please check your connection and try again.",
  onRetry,
  showBackButton = true,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <CardTitle>{message}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {onRetry && (
              <Button onClick={onRetry} variant="default" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            {showBackButton && (
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className={onRetry ? "flex-1" : "w-full"}
              >
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
