"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface ManagerAuditBreadcrumbItem {
  label: string;
  href?: Route;
  current?: boolean;
}

export interface ManagerAuditProgress {
  total: number;
  reviewed: number;
  compliant: number;
  actionRequired: number;
  nonCompliant: number;
  pct: number;
}

export interface ManagerAuditShellProps {
  /** Breadcrumb items rendered in the top bar (last one is auto-styled as current). */
  breadcrumbs: ManagerAuditBreadcrumbItem[];
  /** Optional back-button target shown to the left of the breadcrumb (mobile-first chevron). */
  backHref?: Route;
  /** Optional handler used when no `backHref` is provided. */
  onBack?: () => void;
  /** Right-aligned action buttons (e.g. New Audit, Complete Audit). */
  topActions?: React.ReactNode;
  /** Optional summary row beneath the breadcrumb (avatar + title + key/value chips). */
  summary?: React.ReactNode;
  /** Optional progress strip beneath the summary. */
  progress?: ManagerAuditProgress;
  /** Use a flush body without the default `bg-card` padding (for grid tables / workspaces). */
  flushBody?: boolean;
  /** Optional extra classes for the inner card. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Outer card shell used across Manager Audit screens, mirroring the
 * Care File Audit visual language (max-w-1400 rounded card with breadcrumb,
 * summary row, and progress strip).
 */
export function ManagerAuditShell({
  breadcrumbs,
  backHref,
  onBack,
  topActions,
  summary,
  progress,
  flushBody = false,
  className,
  children,
}: ManagerAuditShellProps) {
  return (
    <div className="flex w-full flex-col bg-muted/30 pb-8">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1400px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          className
        )}
      >
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-5">
          {backHref ? (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              asChild
            >
              <Link href={backHref} aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          ) : onBack ? (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onBack}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}

          <Breadcrumb className="min-w-0 flex-1 text-muted-foreground">
            <BreadcrumbList className="flex-wrap sm:gap-1">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                const renderAsCurrent = crumb.current ?? isLast;
                return (
                  <React.Fragment key={`${crumb.label}-${idx}`}>
                    <BreadcrumbItem
                      className={cn(
                        isLast && "max-w-[260px] truncate sm:max-w-none"
                      )}
                    >
                      {renderAsCurrent || !crumb.href ? (
                        <BreadcrumbPage className="text-foreground max-w-[260px] truncate font-medium sm:max-w-none">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          {topActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {topActions}
            </div>
          ) : null}
        </div>

        {summary ? (
          <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            {summary}
          </div>
        ) : null}

        {progress ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            <span>
              {progress.reviewed} of {progress.total} items complete
            </span>
            <div className="h-1 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <span className="flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {progress.compliant} compliant
              </span>
              <span className="text-border">·</span>
              <span className="font-medium text-amber-800 dark:text-amber-200">
                {progress.actionRequired} action required
              </span>
              <span className="text-border">·</span>
              <span className="font-medium text-destructive">
                {progress.nonCompliant} non-compliant
              </span>
            </span>
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-1 flex-col",
            flushBody ? "min-h-0" : "bg-background p-4 sm:p-5"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export interface ManagerAuditSummaryProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Optional avatar slot (e.g. <Avatar/>) shown to the left of the title. */
  avatar?: React.ReactNode;
  /** Optional badges shown after the title (e.g. category, staff type). */
  badges?: React.ReactNode;
  /** Key/value chips shown on the right of the summary row. */
  chips?: Array<{ label: string; value: React.ReactNode }>;
}

/**
 * Default summary block layout (avatar + title/subtitle + right-side chips)
 * that matches the Care File Audit summary row. Pass via `summary` prop on
 * `ManagerAuditShell`.
 */
export function ManagerAuditSummary({
  title,
  subtitle,
  avatar,
  badges,
  chips,
}: ManagerAuditSummaryProps) {
  return (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {avatar ? <div className="shrink-0">{avatar}</div> : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-medium leading-tight text-foreground">
              {title}
            </h1>
            {badges}
          </div>
          {subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {chips && chips.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:flex sm:flex-wrap sm:gap-6">
          {chips.map((chip, idx) => (
            <div key={`${chip.label}-${idx}`}>
              <div className="text-muted-foreground">{chip.label}</div>
              <div className="font-medium text-foreground">{chip.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
