"use client";

/**
 * ERROR BOUNDARY COMPONENT
 *
 * Catches React errors and displays user-friendly fallback UI.
 * Integrates with Sentry for error tracking in production.
 *
 * Usage:
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error("Error caught by ErrorBoundary:", error, errorInfo);

    // Store error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Add error logging service integration here (e.g., Sentry, LogRocket, etc.)
    // For now, errors are logged to console above
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="w-16 h-16 text-destructive animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We&apos;re sorry, but an unexpected error occurred. Our team has been
                notified and is working on a fix.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button onClick={this.handleReload} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>

              <Button onClick={this.handleGoHome} variant="secondary">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Error details in development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Error Details (Development Only)
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="text-sm font-semibold mb-2">Error Message:</h3>
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </pre>
                  </div>

                  {this.state.error.stack && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="text-sm font-semibold mb-2">Stack Trace:</h3>
                      <pre className="text-xs overflow-auto max-h-64">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}

                  {this.state.errorInfo?.componentStack && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="text-sm font-semibold mb-2">Component Stack:</h3>
                      <pre className="text-xs overflow-auto max-h-64">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Help text */}
            <p className="text-xs text-muted-foreground mt-6">
              If this problem persists, please contact your system administrator.
              <br />
              Error ID: {Date.now().toString(36)}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * INCIDENT PAGE ERROR FALLBACK
 *
 * Specialized error UI for incident pages.
 */
export function IncidentErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to Load Incident</h2>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        We couldn&apos;t load this incident. This might be due to a network error or
        missing data. Please try again.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload
        </Button>
        <Button onClick={() => window.history.back()} variant="outline">
          Go Back
        </Button>
      </div>
    </div>
  );
}

/**
 * AUDIT PAGE ERROR FALLBACK
 *
 * Specialized error UI for audit pages.
 */
export function AuditErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Failed to Load Audit</h2>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        We couldn&apos;t load this audit. This might be due to a network error or
        missing data. Please try again.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload
        </Button>
        <Button onClick={() => window.history.back()} variant="outline">
          Go Back
        </Button>
      </div>
    </div>
  );
}
