"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditHistoryItem {
  id: string;
  name: string;
  completedAt: number;
  status: string;
  category: string;
  auditor?: string;
  totalResidents?: number;
  totalQuestions?: number;
}

interface AuditHistoryProps {
  auditName: string;
  auditCategory: string;
  maxItems?: number;
  currentAuditId?: string;
}

export function AuditHistory({
  auditName,
  auditCategory,
  maxItems = 10,
  currentAuditId,
}: AuditHistoryProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);

  // Load audit history from localStorage
  useEffect(() => {
    const loadAuditHistory = () => {
      const completedAudits = localStorage.getItem("completed-audits");
      console.log("=== AUDIT HISTORY LOOKUP ===");
      console.log("Looking for audits named:", `"${auditName}"`);
      console.log("In category:", auditCategory);
      console.log("Excluding audit ID:", currentAuditId);
      console.log("Raw localStorage:", completedAudits);

      if (completedAudits) {
        const audits = JSON.parse(completedAudits);
        console.log("=== AUDIT HISTORY DEBUG ===");
        console.log("Total audits in localStorage:", audits.length);
        console.log("All audits:", audits);

        // Debug: Show why each audit is included/excluded
        audits.forEach((audit: any, index: number) => {
          const nameMatch = audit.name === auditName;
          const categoryMatch = audit.category === auditCategory;
          const statusMatch = audit.status === "completed";
          const idCheck = currentAuditId ? audit.id !== currentAuditId : true;
          const originalIdCheck = currentAuditId ? audit.originalAuditId !== currentAuditId : true;
          const willBeIncluded = nameMatch && categoryMatch && statusMatch && idCheck && originalIdCheck;

          console.log(`Audit ${index + 1}:`, {
            name: audit.name,
            nameMatch,
            category: audit.category,
            categoryMatch,
            status: audit.status,
            statusMatch,
            id: audit.id,
            idCheck: `${audit.id} !== ${currentAuditId} = ${idCheck}`,
            originalAuditId: audit.originalAuditId,
            originalIdCheck: `${audit.originalAuditId} !== ${currentAuditId} = ${originalIdCheck}`,
            included: willBeIncluded
          });
        });

        // Filter audits by name and category - SHOW ALL completed audits
        // Only exclude if viewing a completed audit (id matches)
        // Don't exclude based on originalAuditId when on edit page
        const filteredAudits = audits
          .filter(
            (audit: any) =>
              audit.name === auditName &&
              audit.category === auditCategory &&
              audit.status === "completed" &&
              // Only exclude the exact audit being viewed (by completion id)
              (currentAuditId ? audit.id !== currentAuditId : true)
          )
          .sort((a: any, b: any) => b.completedAt - a.completedAt)
          .slice(0, maxItems);

        const matchingByName = audits.filter((a: any) => a.name === auditName).length;
        console.log(`Found ${matchingByName} audits named "${auditName}"`);
        console.log("After all filters:", filteredAudits.length, "audits to display");
        console.log("Filtered audit history:", filteredAudits);
        console.log("=========================");

        // Transform to AuditHistoryItem format
        const historyItems: AuditHistoryItem[] = filteredAudits.map((audit: any) => ({
          id: audit.id,
          name: audit.name,
          completedAt: audit.completedAt,
          status: audit.status,
          category: audit.category,
          totalResidents: audit.answers
            ? new Set(audit.answers.map((a: any) => a.residentId)).size
            : 0,
          totalQuestions: audit.questions ? audit.questions.length : 0,
        }));

        setAuditHistory(historyItems);
      }
    };

    // Initial load
    loadAuditHistory();

    // Set up interval to refresh every 2 seconds to catch new completions
    const interval = setInterval(loadAuditHistory, 2000);

    // Listen for storage events (in case of updates from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "completed-audits") {
        loadAuditHistory();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [auditName, auditCategory, currentAuditId, maxItems]);

  // Always show the section, even if empty
  const hasHistory = auditHistory.length > 0;

  return (
    <div className="border-t mt-6 pt-6" data-audit-history>
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h3 className="text-lg font-semibold">Audit History</h3>
          <p className="text-sm text-muted-foreground">
            {hasHistory
              ? `Showing ${auditHistory.length} of last 10 completed ${auditName} audit${auditHistory.length !== 1 ? "s" : ""}`
              : `No previous ${auditName} audits completed yet`
            }
          </p>
        </div>
        {hasHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Expand
              </>
            )}
          </Button>
        )}
      </div>

      {hasHistory && isExpanded && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="font-medium">Completed Date</TableHead>
                <TableHead className="font-medium">Time</TableHead>
                <TableHead className="font-medium">Residents</TableHead>
                <TableHead className="font-medium">Questions</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditHistory.map((audit) => (
                <TableRow key={audit.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {format(new Date(audit.completedAt), "PPP")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(audit.completedAt), "p")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {audit.totalResidents || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {audit.totalQuestions || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      Completed
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        router.push(
                          `/dashboard/careo-audit/${audit.category}/${audit.id}/view` as any
                        )
                      }
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!hasHistory && (
        <div className="border rounded-lg p-8 text-center bg-muted/30">
          <p className="text-sm text-muted-foreground mb-2">
            Complete this audit to start building your audit history.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Once you complete audits with the name &quot;{auditName}&quot;, they will appear here.
          </p>
          <details className="mt-4 text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:underline">
              🔍 Debug Info (click to expand)
            </summary>
            <div className="mt-2 p-3 bg-background rounded text-xs font-mono">
              <div><strong>Looking for:</strong></div>
              <div>- Audit Name: &quot;{auditName}&quot;</div>
              <div>- Category: &quot;{auditCategory}&quot;</div>
              <div>- Status: &quot;completed&quot;</div>
              <div className="mt-2"><strong>Check browser console (F12) for full details</strong></div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs h-7"
                onClick={() => {
                  const data = localStorage.getItem("completed-audits");
                  console.clear();
                  console.log("=== MANUAL DEBUG CHECK ===");
                  console.log("Raw localStorage data:", data);
                  if (data) {
                    const parsed = JSON.parse(data);
                    console.log("Total audits:", parsed.length);
                    console.log("All audits:", parsed);
                    parsed.forEach((a: any, i: number) => {
                      console.log(`${i + 1}. ${a.name} (${a.category}) - ${a.status}`);
                    });
                  }
                  alert(`Found ${data ? JSON.parse(data).length : 0} completed audits in localStorage. Check console for details.`);
                }}
              >
                🔍 Check localStorage
              </Button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
