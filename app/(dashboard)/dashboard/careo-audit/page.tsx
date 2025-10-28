"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, ArrowUpDown, SlidersHorizontal, ClipboardCheck, Eye, Download, Trash2, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";

interface Audit {
  id: string;
  name: string;
  status: "new" | "in-progress" | "completed" | "due";
  auditor: string;
  lastAudited: string;
  dueDate: string;
  category: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
}

interface Resident {
  _id: Id<"residents">;
  firstName: string;
  lastName: string;
  roomNumber?: string;
  dateOfBirth: string;
  teamId: string;
  teamName?: string;
  imageUrl?: string;
}

function CareOAuditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [audits, setAudits] = useState<Audit[]>([]);
  const { activeTeamId, activeOrganizationId } = useActiveTeam();
  const { data: session } = authClient.useSession();

  // Get tab from URL query params, default to "resident"
  const tabFromUrl = searchParams.get("tab") || "resident";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Database queries for resident audit templates (organization-wide, shared across all teams)
  // Templates are shared across all teams in the organization so any team can use them
  const residentTemplates = useQuery(
    api.auditTemplates.getTemplatesByOrganizationAndCategory,
    activeOrganizationId ? { organizationId: activeOrganizationId, category: "resident" } : "skip"
  );

  // Query latest completions for all templates (team-specific)
  // Each team tracks their own completion instances of the shared templates
  const latestCompletions = useQuery(
    api.auditResponses.getAllLatestResponsesByTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Mutations
  const createTemplate = useMutation(api.auditTemplates.createTemplate);
  const deleteTemplate = useMutation(api.auditTemplates.deleteTemplate);
  const createGovernanceTemplate = useMutation(api.governanceAuditTemplates.createTemplate);
  const deleteGovernanceTemplate = useMutation(api.governanceAuditTemplates.deleteTemplate);
  const createClinicalTemplate = useMutation(api.clinicalAuditTemplates.createTemplate);
  const deleteClinicalTemplate = useMutation(api.clinicalAuditTemplates.deleteTemplate);
  const createEnvironmentTemplate = useMutation(api.environmentAuditTemplates.createTemplate);
  const deleteEnvironmentTemplate = useMutation(api.environmentAuditTemplates.deleteTemplate);

  // Fetch residents for the active team
  const residents = useQuery(
    api.residents.getByTeamId,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Fetch care file audit templates
  const careFileTemplates = useQuery(
    api.careFileAuditTemplates.getTemplatesByOrganization,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Fetch all latest care file audit responses for the team
  const careFileResponses = useQuery(
    api.careFileAuditResponses.getAllLatestResponsesByTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Fetch governance audit templates (organization-wide)
  const governanceTemplates = useQuery(
    api.governanceAuditTemplates.getActiveTemplates,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Fetch clinical audit templates (organization-wide)
  const clinicalTemplates = useQuery(
    api.clinicalAuditTemplates.getActiveTemplates,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Fetch environment audit templates (organization-wide)
  const environmentTemplates = useQuery(
    api.environmentAuditTemplates.getActiveTemplates,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Fetch all latest completions for governance audits
  const governanceCompletions = useQuery(
    api.governanceAuditResponses.getAllLatestCompletionsByOrganization,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Fetch all latest completions for clinical audits
  const clinicalCompletions = useQuery(
    api.clinicalAuditResponses.getAllLatestCompletionsByOrganization,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Fetch all latest completions for environment audits
  const environmentCompletions = useQuery(
    api.environmentAuditResponses.getAllLatestCompletionsByOrganization,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );

  // Separate useEffect for governance templates to avoid infinite loop
  useEffect(() => {
    if (activeTab === "governance" && governanceTemplates) {
      const templatesAsAudits: Audit[] = governanceTemplates.map((template) => {
        // Find the latest completion for this template
        const latestCompletion = governanceCompletions?.find(
          (completion) => completion.templateId === template._id
        );

        return {
          id: template._id,
          name: template.name,
          status: latestCompletion ? "completed" : "new",
          auditor: latestCompletion?.auditedBy || template.createdBy,
          lastAudited: latestCompletion?.completedAt
            ? new Date(latestCompletion.completedAt).toLocaleDateString()
            : "-",
          dueDate: latestCompletion?.nextAuditDue
            ? new Date(latestCompletion.nextAuditDue).toLocaleDateString()
            : "-",
          category: "governance",
          frequency: template.frequency,
        };
      });
      setAudits(templatesAsAudits);
    }
  }, [activeTab, governanceTemplates, governanceCompletions]);

  // Separate useEffect for clinical templates to avoid infinite loop
  useEffect(() => {
    if (activeTab === "clinical" && clinicalTemplates) {
      const templatesAsAudits: Audit[] = clinicalTemplates.map((template) => {
        // Find the latest completion for this template
        const latestCompletion = clinicalCompletions?.find(
          (completion) => completion.templateId === template._id
        );

        return {
          id: template._id,
          name: template.name,
          status: latestCompletion ? "completed" : "new",
          auditor: latestCompletion?.auditedBy || template.createdBy,
          lastAudited: latestCompletion?.completedAt
            ? new Date(latestCompletion.completedAt).toLocaleDateString()
            : "-",
          dueDate: latestCompletion?.nextAuditDue
            ? new Date(latestCompletion.nextAuditDue).toLocaleDateString()
            : "-",
          category: "clinical",
          frequency: template.frequency,
        };
      });
      setAudits(templatesAsAudits);
    }
  }, [activeTab, clinicalTemplates, clinicalCompletions]);

  // Separate useEffect for environment templates to avoid infinite loop
  useEffect(() => {
    if (activeTab === "environment" && environmentTemplates) {
      const templatesAsAudits: Audit[] = environmentTemplates.map((template) => {
        // Find the latest completion for this template
        const latestCompletion = environmentCompletions?.find(
          (completion) => completion.templateId === template._id
        );

        return {
          id: template._id,
          name: template.name,
          status: latestCompletion ? "completed" : "new",
          auditor: latestCompletion?.auditedBy || template.createdBy,
          lastAudited: latestCompletion?.completedAt
            ? new Date(latestCompletion.completedAt).toLocaleDateString()
            : "-",
          dueDate: latestCompletion?.nextAuditDue
            ? new Date(latestCompletion.nextAuditDue).toLocaleDateString()
            : "-",
          category: "environment",
          frequency: template.frequency,
        };
      });
      setAudits(templatesAsAudits);
    }
  }, [activeTab, environmentTemplates, environmentCompletions]);

  // Load audits from database templates (priority) or localStorage (fallback)
  useEffect(() => {
    console.log("Loading audits - activeTab:", activeTab, "residentTemplates:", residentTemplates?.length);

    // Skip this useEffect for governance, clinical, and environment - handled by separate useEffect above
    if (activeTab === "governance" || activeTab === "clinical" || activeTab === "environment") {
      return;
    }

    // If we have templates from database, use those for resident tab
    if (activeTab === "resident" && residentTemplates && residentTemplates.length > 0) {
      // Convert database templates to audit format for display
      const templatesAsAudits: Audit[] = residentTemplates.map((template) => {
        // Find latest completion for this template
        const latestCompletion = latestCompletions?.find(
          (completion) => completion.templateId === template._id
        );

        // Debug logging
        if (template.name === "Wound") {
          console.log("Wound audit debug:", {
            template,
            latestCompletion,
            hasCompletion: !!latestCompletion,
            completionStatus: latestCompletion?.status,
          });
        }

        // Only show dates if audit has been completed
        // Check both that completion exists AND status is "completed"
        const isCompleted = latestCompletion && latestCompletion.status === "completed";

        // Format dates - only show if completed
        const lastAudited = isCompleted && latestCompletion.completedAt
          ? new Date(latestCompletion.completedAt).toLocaleDateString('en-GB')
          : "-";

        const nextAudit = isCompleted && latestCompletion.nextAuditDue
          ? new Date(latestCompletion.nextAuditDue).toLocaleDateString('en-GB')
          : "-";

        return {
          id: template._id,
          name: template.name,
          status: isCompleted ? "completed" : "new",
          auditor: latestCompletion?.auditedBy || template.createdBy,
          lastAudited,
          dueDate: nextAudit,
          category: "resident",
          frequency: template.frequency,
        };
      });
      setAudits(templatesAsAudits);
      return; // Skip localStorage loading
    }

    // Fallback to localStorage for other tabs or if no templates
    const savedAudits = localStorage.getItem('careo-audits');
    if (savedAudits) {
      let audits = JSON.parse(savedAudits);

      // For resident tab, completely ignore localStorage
      // All resident audits should come from database only
      if (activeTab === "resident") {
        console.log("Resident tab: Ignoring all localStorage audits");
        setAudits([]);
        return;
      }

      // Filter out resident audits from localStorage for other tabs
      audits = audits.filter((audit: Audit) => audit.category !== "resident");

      // Save filtered audits back to localStorage to clean up
      localStorage.setItem('careo-audits', JSON.stringify(audits));

      // Migration: Add default frequency to audits that don't have it
      let hasUpdates = false;
      audits = audits.map((audit: any) => {
        if (!audit.frequency) {
          hasUpdates = true;
          return { ...audit, frequency: "monthly" };
        }
        return audit;
      });

      // Save back if we added frequencies
      if (hasUpdates) {
        localStorage.setItem('careo-audits', JSON.stringify(audits));
      }

      setAudits(audits);
    } else {
      // Set default audit if none exist
      const defaultAudits = [
        {
          id: "1",
          name: "Risk Assessment Audit",
          status: "new" as const,
          auditor: "John Smith",
          lastAudited: "--",
          dueDate: "--",
          category: "resident",
          frequency: "monthly" as const,
        },
      ];
      setAudits(defaultAudits);
      localStorage.setItem('careo-audits', JSON.stringify(defaultAudits));
    }
  }, [activeTab, residentTemplates, latestCompletions]);

  // Check and update due status for audits based on frequency
  // NOTE: This only applies to localStorage-based audits, not database audits
  useEffect(() => {
    if (audits.length === 0) return;

    // Skip this effect for resident tab - database audits handle their own status
    if (activeTab === "resident") {
      console.log("Skipping localStorage status check for database audits");
      return;
    }

    const frequencyDays: { [key: string]: number } = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };

    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return;

    let allCompletedAudits = JSON.parse(completedAudits);

    // Migration: Add default frequency to completed audits that don't have it
    let hasCompletedUpdates = false;
    allCompletedAudits = allCompletedAudits.map((completedAudit: any) => {
      if (!completedAudit.frequency) {
        hasCompletedUpdates = true;
        // Try to find the matching audit to get its frequency
        const matchingAudit = audits.find(
          (a) => a.name === completedAudit.name && a.category === completedAudit.category
        );
        return { ...completedAudit, frequency: matchingAudit?.frequency || "monthly" };
      }
      return completedAudit;
    });

    // Save back if we added frequencies to completed audits
    if (hasCompletedUpdates) {
      localStorage.setItem('completed-audits', JSON.stringify(allCompletedAudits));
    }
    let hasUpdates = false;
    const updatedAudits = audits.map((audit) => {
      // Skip if no frequency set
      if (!audit.frequency) return audit;

      // Find all completed audits for this audit name and category
      const matchingCompletedAudits = allCompletedAudits.filter(
        (a: any) =>
          a.name === audit.name &&
          a.category === audit.category &&
          a.status === "completed"
      );

      if (matchingCompletedAudits.length === 0) return audit;

      // Find the most recent completion
      const latestCompleted = matchingCompletedAudits.sort(
        (a: any, b: any) => b.completedAt - a.completedAt
      )[0];

      // Calculate days since last completion
      const daysSinceCompletion = Math.floor(
        (Date.now() - latestCompleted.completedAt) / (1000 * 60 * 60 * 24)
      );

      const daysUntilDue = frequencyDays[audit.frequency.toLowerCase()] || 30;

      // If days passed exceeds the frequency, mark as due
      if (daysSinceCompletion >= daysUntilDue && audit.status !== "due") {
        hasUpdates = true;
        return {
          ...audit,
          status: "due" as const,
        };
      }

      // If still completed and not due yet, keep status as completed
      if (audit.status === "completed" && daysSinceCompletion < daysUntilDue) {
        return audit;
      }

      return audit;
    });

    // Only update state and localStorage if there were changes
    if (hasUpdates) {
      setAudits(updatedAudits);
      localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));
    }
  }, [audits]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    auditName: "",
    auditorName: "",
    frequency: "",
  });

  const handleNewAudit = () => {
    setIsDialogOpen(true);
  };

  const handleCreateAudit = async () => {
    if (!formData.auditName || !formData.frequency) {
      toast.error("Please fill in all required fields");
      return;
    }

    // For resident tab, create template in database
    if (activeTab === "resident" && activeTeamId && activeOrganizationId && session?.user) {
      try {
        const templateId = await createTemplate({
          name: formData.auditName,
          category: "resident",
          questions: [], // Start with empty questions, user will add them
          frequency: formData.frequency as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
          teamId: activeTeamId, // Team where it was created (for tracking purposes)
          organizationId: activeOrganizationId, // Organization-wide template
          createdBy: session.user.name || session.user.email || "Unknown",
        });

        setIsDialogOpen(false);
        setFormData({ auditName: "", auditorName: "", frequency: "" });

        toast.success(`Template "${formData.auditName}" created successfully!`);

        // Navigate to the new template to add questions
        router.push(`/dashboard/careo-audit/${activeTab}/${templateId}`);
      } catch (error) {
        console.error("Failed to create template:", error);
        toast.error("Failed to create audit template");
      }
    } else if (activeTab === "governance" && activeOrganizationId && session?.user) {
      // For governance tab, create template in database
      try {
        const templateId = await createGovernanceTemplate({
          name: formData.auditName,
          items: [], // Start with empty items, user will add them in the editor
          frequency: formData.frequency as "monthly" | "quarterly" | "6months" | "yearly",
          organizationId: activeOrganizationId,
          createdBy: session.user.name || session.user.email || "Unknown",
        });

        setIsDialogOpen(false);
        setFormData({ auditName: "", auditorName: "", frequency: "" });

        toast.success(`Governance audit "${formData.auditName}" created successfully!`);

        // Navigate to the governance audit editor
        router.push(`/dashboard/careo-audit/${activeTab}/${templateId}`);
      } catch (error) {
        console.error("Failed to create governance template:", error);
        toast.error("Failed to create governance audit template");
      }
    } else if (activeTab === "clinical" && activeOrganizationId && session?.user) {
      // For clinical tab, create template in database
      try {
        const templateId = await createClinicalTemplate({
          name: formData.auditName,
          items: [], // Start with empty items, user will add them in the editor
          frequency: formData.frequency as "monthly" | "quarterly" | "6months" | "yearly",
          organizationId: activeOrganizationId,
          createdBy: session.user.name || session.user.email || "Unknown",
        });

        setIsDialogOpen(false);
        setFormData({ auditName: "", auditorName: "", frequency: "" });

        toast.success(`Clinical audit "${formData.auditName}" created successfully!`);

        // Navigate to the clinical audit editor
        router.push(`/dashboard/careo-audit/${activeTab}/${templateId}`);
      } catch (error) {
        console.error("Failed to create clinical template:", error);
        toast.error("Failed to create clinical audit template");
      }
    } else if (activeTab === "environment" && activeOrganizationId && session?.user) {
      // For environment tab, create template in database
      try {
        const templateId = await createEnvironmentTemplate({
          name: formData.auditName,
          items: [], // Start with empty items, user will add them in the editor
          frequency: formData.frequency as "monthly" | "quarterly" | "6months" | "yearly",
          organizationId: activeOrganizationId,
          createdBy: session.user.name || session.user.email || "Unknown",
        });

        setIsDialogOpen(false);
        setFormData({ auditName: "", auditorName: "", frequency: "" });

        toast.success(`Environment audit "${formData.auditName}" created successfully!`);

        // Navigate to the environment audit editor
        router.push(`/dashboard/careo-audit/${activeTab}/${templateId}`);
      } catch (error) {
        console.error("Failed to create environment template:", error);
        toast.error("Failed to create environment audit template");
      }
    } else {
      // Fallback to localStorage for other tabs
      const newAudit: Audit = {
        id: Date.now().toString(),
        name: formData.auditName,
        status: "new",
        auditor: session?.user?.name || session?.user?.email || "Unknown User",
        lastAudited: "--",
        dueDate: "--",
        category: activeTab,
        frequency: formData.frequency as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
      };

      const updatedAudits = [...audits, newAudit];
      setAudits(updatedAudits);
      localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));

      setIsDialogOpen(false);
      setFormData({ auditName: "", auditorName: "", frequency: "" });
      router.push(`/dashboard/careo-audit/${activeTab}/${newAudit.id}`);
    }
  };

  const handleDeleteClick = (audit: Audit) => {
    setOpenDropdownId(null); // Close the dropdown menu
    setAuditToDelete(audit);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!auditToDelete) return;

    const auditId = auditToDelete.id;

    // Close dialog first
    setIsDeleteDialogOpen(false);
    setAuditToDelete(null);

    try {
      // Check if it's a database audit (Convex ID starts with lowercase letter)
      const isConvexId = /^[a-z]/.test(auditId);

      if (auditToDelete.category === "resident" && isConvexId) {
        // Delete resident template from database
        console.log("Deleting resident template from database:", auditId);
        await deleteTemplate({
          templateId: auditId as Id<"residentAuditTemplates">,
        });
        toast.success("Audit deleted successfully");
      } else if (auditToDelete.category === "governance" && isConvexId) {
        // Delete governance template from database
        console.log("Deleting governance template from database:", auditId);
        await deleteGovernanceTemplate({
          templateId: auditId as Id<"governanceAuditTemplates">,
        });
        toast.success("Governance audit deleted successfully");
      } else if (auditToDelete.category === "clinical" && isConvexId) {
        // Delete clinical template from database
        console.log("Deleting clinical template from database:", auditId);
        await deleteClinicalTemplate({
          templateId: auditId as Id<"clinicalAuditTemplates">,
        });
        toast.success("Clinical audit deleted successfully");
      } else if (auditToDelete.category === "environment" && isConvexId) {
        // Delete environment template from database
        console.log("Deleting environment template from database:", auditId);
        await deleteEnvironmentTemplate({
          templateId: auditId as Id<"environmentAuditTemplates">,
        });
        toast.success("Environment audit deleted successfully");
      } else {
        // Delete from localStorage
        console.log("Deleting from localStorage:", auditId);
        const savedAudits = localStorage.getItem('careo-audits');
        if (savedAudits) {
          const audits = JSON.parse(savedAudits);
          const updatedAudits = audits.filter((audit: Audit) => audit.id !== auditId);
          localStorage.setItem('careo-audits', JSON.stringify(updatedAudits));

          // Also update state
          setAudits(prev => prev.filter(audit => audit.id !== auditId));
        }
        toast.success("Audit deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete audit:", error);
      toast.error("Failed to delete audit. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setAuditToDelete(null);
  };

  const handleDownloadAudit = (audit: Audit) => {
    setOpenDropdownId(null);

    // Check if audit is completed
    if (audit.status === "completed") {
      // For completed audits, open the view page which has print/download functionality
      const viewUrl = `/dashboard/careo-audit/${audit.category}/${audit.id}/view`;

      // Open in new tab
      window.open(viewUrl, '_blank');

      toast.success("Audit opened in new tab", {
        description: "Click 'Download PDF' to save the audit report",
      });
    } else {
      // For incomplete audits, show a warning
      toast.warning("Audit not completed yet", {
        description: "Please complete the audit before downloading",
      });
    }
  };

  const filteredAudits = audits.filter(audit => audit.category === activeTab);

  // State to store resident completion percentages for care file audits
  const [residentCompletions, setResidentCompletions] = useState<{[residentId: string]: number}>({});

  // Calculate overall completion percentage for a resident's care file audits
  const calculateResidentCareFileCompletion = (residentId: string): number => {
    if (!careFileTemplates || !careFileResponses) {
      return 0;
    }

    if (careFileTemplates.length === 0) {
      return 0;
    }

    // Get all responses for this resident
    const residentResponses = careFileResponses.filter(
      (response: any) => response.residentId === residentId && response.status === "completed"
    );

    if (residentResponses.length === 0) {
      return 0;
    }

    // Calculate percentage for each template
    let totalPercentage = 0;

    careFileTemplates.forEach((template: any) => {
      // Find the latest response for this template and resident
      const templateResponses = residentResponses.filter(
        (response: any) => response.templateId === template._id
      );

      if (templateResponses.length > 0) {
        // Get the latest completion
        const latestCompletion = templateResponses.sort(
          (a: any, b: any) => (b.completedAt || 0) - (a.completedAt || 0)
        )[0];

        // Calculate percentage based on compliant/checked items
        const totalItems = latestCompletion.items?.length || 0;
        if (totalItems === 0) {
          totalPercentage += 0;
        } else {
          const compliantItems = latestCompletion.items?.filter(
            (item: any) => item.status === 'compliant' || item.status === 'checked'
          ).length || 0;
          const percentage = Math.round((compliantItems / totalItems) * 100);
          totalPercentage += percentage;
        }
      } else {
        // Template not completed, counts as 0%
        totalPercentage += 0;
      }
    });

    // Return average percentage
    return Math.round(totalPercentage / careFileTemplates.length);
  };

  // State to store last audited and next audit dates for residents
  const [residentDates, setResidentDates] = useState<{[residentId: string]: {lastAudited: string, nextAudit: string}}>({});

  // Calculate last audited and next audit dates for a resident
  const calculateResidentDates = (residentId: string): {lastAudited: string, nextAudit: string} => {
    if (!careFileTemplates || !careFileResponses) {
      return { lastAudited: '-', nextAudit: '-' };
    }

    if (careFileTemplates.length === 0) {
      return { lastAudited: '-', nextAudit: '-' };
    }

    // Get all responses for this resident
    const residentResponses = careFileResponses.filter(
      (response: any) => response.residentId === residentId && response.status === "completed"
    );

    if (residentResponses.length === 0) {
      return { lastAudited: '-', nextAudit: '-' };
    }

    // Check if ALL templates have been completed
    let allTemplatesComplete = true;
    let latestCompletionDate: number | null = null;
    let earliestNextDue: number | null = null;

    careFileTemplates.forEach((template: any) => {
      // Find the latest response for this template and resident
      const templateResponses = residentResponses.filter(
        (response: any) => response.templateId === template._id
      );

      if (templateResponses.length > 0) {
        // Get the latest completion
        const latestCompletion = templateResponses.sort(
          (a: any, b: any) => (b.completedAt || 0) - (a.completedAt || 0)
        )[0];

        // Check if this template is 100% complete
        const totalItems = latestCompletion.items?.length || 0;
        const compliantItems = latestCompletion.items?.filter(
          (item: any) => item.status === 'compliant' || item.status === 'checked'
        ).length || 0;
        const percentage = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 0;

        if (percentage !== 100) {
          allTemplatesComplete = false;
        }

        // Track the latest completion date across all templates
        if (!latestCompletionDate || (latestCompletion.completedAt && latestCompletion.completedAt > latestCompletionDate)) {
          latestCompletionDate = latestCompletion.completedAt || 0;
        }

        // Track the earliest next due date
        if (latestCompletion.nextAuditDue) {
          if (!earliestNextDue || latestCompletion.nextAuditDue < earliestNextDue) {
            earliestNextDue = latestCompletion.nextAuditDue;
          }
        }
      } else {
        // Template not completed
        allTemplatesComplete = false;
      }
    });

    // Format last audited date (only show if ALL templates are 100% complete)
    const formattedLastAudited = (allTemplatesComplete && latestCompletionDate)
      ? new Date(latestCompletionDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : '-';

    // Format next audit date (show the earliest next due date if available, regardless of completion)
    const formattedNextAudit = earliestNextDue
      ? new Date(earliestNextDue).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : '-';

    return { lastAudited: formattedLastAudited, nextAudit: formattedNextAudit };
  };

  // Calculate completion percentages for all residents when they load or tab changes
  useEffect(() => {
    if (activeTab === 'carefile' && residents && residents.length > 0 && careFileTemplates && careFileResponses) {
      const completions: {[residentId: string]: number} = {};
      const dates: {[residentId: string]: {lastAudited: string, nextAudit: string}} = {};

      residents.forEach(resident => {
        completions[resident._id] = calculateResidentCareFileCompletion(resident._id);
        dates[resident._id] = calculateResidentDates(resident._id);
      });

      setResidentCompletions(completions);
      setResidentDates(dates);
    }
  }, [residents, activeTab, careFileTemplates, careFileResponses]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "due":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "New";
      case "in-progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "due":
        return "Due";
      default:
        return status;
    }
  };

  const getFrequencyLabel = (frequency?: string) => {
    if (!frequency) return "Not set";
    switch (frequency.toLowerCase()) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      case "quarterly":
        return "Quarterly";
      case "yearly":
        return "Yearly";
      default:
        return frequency;
    }
  };

  const getLastAuditedDate = (audit: Audit) => {
    // For database audits (Convex IDs), use the audit's lastAudited property directly
    const isConvexId = /^[a-z]/.test(audit.id);
    if (isConvexId) {
      return audit.lastAudited || "-";
    }

    // For localStorage audits, check completed-audits
    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return "--";

    const allCompletedAudits = JSON.parse(completedAudits);
    const matchingCompletedAudits = allCompletedAudits.filter(
      (a: any) =>
        a.name === audit.name &&
        a.category === audit.category &&
        a.status === "completed"
    );

    if (matchingCompletedAudits.length === 0) return "--";

    // Find the most recent completion
    const latestCompleted = matchingCompletedAudits.sort(
      (a: any, b: any) => b.completedAt - a.completedAt
    )[0];

    // Format the date
    const date = new Date(latestCompleted.completedAt);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDueDate = (audit: Audit) => {
    // For database audits (Convex IDs), use the audit's dueDate property directly
    const isConvexId = /^[a-z]/.test(audit.id);
    if (isConvexId) {
      return audit.dueDate || "-";
    }

    // For localStorage audits, check completed-audits
    const completedAudits = localStorage.getItem('completed-audits');
    if (!completedAudits) return "--";

    const allCompletedAudits = JSON.parse(completedAudits);
    const matchingCompletedAudits = allCompletedAudits.filter(
      (a: any) =>
        a.name === audit.name &&
        a.category === audit.category &&
        a.status === "completed"
    );

    if (matchingCompletedAudits.length === 0) return "--";

    // Find the most recent completion
    const latestCompleted = matchingCompletedAudits.sort(
      (a: any, b: any) => b.completedAt - a.completedAt
    )[0];

    // Get frequency from audit or from completed audit
    const frequency = audit.frequency || latestCompleted.frequency;
    if (!frequency) return "--";

    const frequencyDays: { [key: string]: number } = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };

    const daysToAdd = frequencyDays[frequency.toLowerCase()] || 30;
    const dueDate = new Date(latestCompleted.completedAt);
    dueDate.setDate(dueDate.getDate() + daysToAdd);

    return dueDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background -ml-10 -mr-10 -mt-10 -mb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          <h1 className="text-xl font-semibold">Audits</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6 py-3">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          router.push(`/dashboard/careo-audit?tab=${value}`);
        }}>
          <TabsList>
            <TabsTrigger value="resident">Resident Audit</TabsTrigger>
            <TabsTrigger value="carefile">Care File Audit</TabsTrigger>
            <TabsTrigger value="governance">Governance & Complaints</TabsTrigger>
            <TabsTrigger value="clinical">Clinical Care & Medicines</TabsTrigger>
            <TabsTrigger value="environment">Environment & Safety</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          {/* No filters for any tabs */}
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "carefile" && (
            <Button onClick={handleNewAudit} size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-2" />
              New Audit
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {activeTab === "carefile" ? (
          // Residents Table for Care File Audit
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-12 border-r last:border-r-0">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  <div className="flex items-center gap-1">
                    <span>Resident</span>
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Status
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Last Audited
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Next Audit
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {residents && residents.length > 0 ? (
                residents.map((resident) => (
                  <TableRow key={resident._id} className="hover:bg-muted/50">
                    <TableCell className="border-r last:border-r-0">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      <button
                        onClick={() => router.push(`/dashboard/careo-audit/${resident._id}/carefileaudit`)}
                        className="flex items-center gap-3 font-medium hover:underline text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={resident.imageUrl} alt={`${resident.firstName} ${resident.lastName}`} />
                          <AvatarFallback>
                            {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{resident.firstName} {resident.lastName}</span>
                      </button>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0">
                      {(() => {
                        const completionPercentage = residentCompletions[resident._id] ?? 0;
                        return (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {completionPercentage}%
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground border-r last:border-r-0">
                      {residentDates[resident._id]?.lastAudited || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground border-r last:border-r-0">
                      {residentDates[resident._id]?.nextAudit || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {residents === undefined ? "Loading residents..." : "No residents found in this team"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          // Audits Table for other tabs
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-12 border-r last:border-r-0">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Audit
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Status
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Auditor
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Last Audited
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0">
                  Next Audit
                </TableHead>
                <TableHead className="font-medium border-r last:border-r-0 w-20">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={filteredAudits.length}>
              {filteredAudits.map((audit) => (
                <TableRow key={audit.id} className="hover:bg-muted/50">
                  <TableCell className="border-r last:border-r-0">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">
                    <button
                      onClick={() => router.push(`/dashboard/careo-audit/${audit.category}/${audit.id}`)}
                      className="font-medium hover:underline text-left"
                    >
                      {audit.name}
                    </button>
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">
                    <Badge variant="secondary" className={getStatusColor(audit.status)}>
                      {getStatusLabel(audit.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="border-r last:border-r-0">{audit.auditor}</TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">{getLastAuditedDate(audit)}</TableCell>
                  <TableCell className="text-muted-foreground border-r last:border-r-0">{getDueDate(audit)}</TableCell>
                  <TableCell className="border-r last:border-r-0">
                    <DropdownMenu
                      open={openDropdownId === audit.id}
                      onOpenChange={(open) => {
                        setOpenDropdownId(open ? audit.id : null);
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setOpenDropdownId(null);
                            router.push(`/dashboard/careo-audit/archived?name=${encodeURIComponent(audit.name)}&category=${audit.category}&templateId=${audit.id}`);
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archived
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(audit);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Bottom border */}
        <div className="border-t"></div>
      </div>

      {/* New Audit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Audit</DialogTitle>
            <DialogDescription>
              Add a new audit to your system. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="auditName">Audit Name</Label>
              <Input
                id="auditName"
                placeholder="e.g., Risk Assessment Audit"
                value={formData.auditName}
                onChange={(e) =>
                  setFormData({ ...formData, auditName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auditorName">Auditor Name</Label>
              <Input
                id="auditorName"
                value={session?.user?.name || session?.user?.email || "Unknown User"}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency of Audit</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateAudit}>
              Create Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setAuditToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Audit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this audit? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <span className="font-semibold">Audit Name:</span> {auditToDelete?.name}
            </p>
            <p className="text-sm mt-2">
              <span className="font-semibold">Auditor:</span> {auditToDelete?.auditor}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CareOAuditPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <CareOAuditPageContent />
    </Suspense>
  );
}
