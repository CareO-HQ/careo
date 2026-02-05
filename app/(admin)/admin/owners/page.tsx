"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Users,
  Building2,
  Heart,
  UserPlus,
  Search,
  Settings2,
  Plus,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
    </div>
  );
}

interface Owner {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  nisccRegistrationNumber: string | null;
  isOnboardingComplete: boolean;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    status: "active" | "suspended" | "deactivated";
  };
  stats: {
    careHomeCount: number;
    unitCount: number;
    residentCount: number;
    staffCount: number;
  };
}

export default function OwnersPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const router = useRouter();
  const [owners, setOwners] = useState<Owner[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states for the drawer
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    niscc: "",
    organizationName: "",
    status: "active" as "active" | "suspended" | "deactivated",
    statusReason: "",
  });

  // Redirect if not SaaS Admin
  useEffect(() => {
    if (!isProfileLoading && profile && !profile.is_saas_admin) {
      router.push("/dashboard");
    }
  }, [profile, isProfileLoading, router]);

  const fetchOwners = useCallback(async () => {
    if (!profile?.is_saas_admin) return;

    try {
      setIsLoading(true);
      // Fetch profiles that are likely owners (have an active organization and are not saas admin)
      // Note: In a real app, you might want a more explicit check for 'owner' role
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          id, email, name, phone, niscc_registration_number, is_onboarding_complete, created_at,
          active_organization_id,
          organizations!active_organization_id (
            id, name, slug,
            organization_status (status),
            care_homes (count),
            teams (count),
            residents (count),
            staff:users (count)
          )
        `)
        .not("active_organization_id", "is", null)
        .eq("is_saas_admin", false);

      if (usersError) throw usersError;

      const formattedOwners: Owner[] = (usersData || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        phone: p.phone,
        nisccRegistrationNumber: p.niscc_registration_number,
        isOnboardingComplete: p.is_onboarding_complete,
        createdAt: p.created_at,
        organization: {
          id: p.organizations?.id || "",
          name: p.organizations?.name || "Unknown",
          slug: p.organizations?.slug || "",
          status: p.organizations?.organization_status?.[0]?.status || "active",
        },
        stats: {
          careHomeCount: p.organizations?.care_homes?.[0]?.count || 0,
          unitCount: p.organizations?.teams?.[0]?.count || 0,
          residentCount: p.organizations?.residents?.[0]?.count || 0,
          staffCount: p.organizations?.staff?.[0]?.count || 0,
        }
      }));

      setOwners(formattedOwners);
    } catch (error) {
      console.error("Error fetching owners:", error);
      toast.error("Failed to load owners");
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const filteredOwners = useMemo(() => {
    if (!owners) return [];
    return owners.filter((owner) => {
      const matchesSearch =
        owner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.organization.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || owner.organization.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [owners, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!owners) return { total: 0, activeOrgs: 0, totalResidents: 0, recentSignups: 0 };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return {
      total: owners.length,
      activeOrgs: owners.filter(o => o.organization.status === "active").length,
      totalResidents: owners.reduce((acc, o) => acc + o.stats.residentCount, 0),
      recentSignups: owners.filter(o => new Date(o.createdAt) > thirtyDaysAgo).length,
    };
  }, [owners]);

  const handleEdit = (owner: Owner) => {
    setSelectedOwner(owner);
    setFormData({
      name: owner.name || "",
      phone: owner.phone || "",
      niscc: owner.nisccRegistrationNumber || "",
      organizationName: owner.organization.name,
      status: owner.organization.status,
      statusReason: "",
    });
    setIsDrawerOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedOwner) return;
    setIsUpdating(true);
    try {
      // 1. Update User
      const { error: userError } = await supabase
        .from("users")
        .update({
          name: formData.name,
          phone: formData.phone === "" ? null : formData.phone,
          niscc_registration_number: formData.niscc === "" ? null : formData.niscc,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedOwner.id);

      if (userError) throw userError;

      // 2. Update Organization Name
      const { error: orgError } = await supabase
        .from("organizations")
        .update({
          name: formData.organizationName,
          slug: formData.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedOwner.organization.id);

      if (orgError) throw orgError;

      // 3. Update Organization Status
      const { error: statusError } = await supabase
        .from("organization_status")
        .upsert({
          organization_id: selectedOwner.organization.id,
          status: formData.status,
          reason: formData.statusReason === "" ? null : formData.statusReason,
          deactivated_at: formData.status !== "active" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        });

      if (statusError) throw statusError;

      toast.success("Account updated successfully");
      setIsDrawerOpen(false);
      fetchOwners(); // Refresh list
    } catch (error) {
      console.error(error);
      toast.error("Failed to update account");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isProfileLoading || (isLoading && !owners)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile?.is_saas_admin) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page. This area is reserved for SaaS Administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Owner Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage care home owners and their organizational health.
          </p>
        </div>
        <Link href="/admin/owners/create">
          <Button size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-all">
            <Plus className="h-5 w-5 mr-2" />
            New Owner Account
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Owners", value: stats.total, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Active Organizations", value: stats.activeOrgs, icon: Building2, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Residents Managed", value: stats.totalResidents, icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
          { label: "New Signups (30d)", value: stats.recentSignups, icon: UserPlus, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((kpi, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</CardTitle>
              <div className={`p-2 rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by owner name, email or organization..."
              className="pl-9 h-11 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] h-11">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Healthy</SelectItem>
              <SelectItem value="suspended">Suspended Locked</SelectItem>
              <SelectItem value="deactivated">Deactivated Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold text-foreground">Owner & Email</TableHead>
                <TableHead className="font-semibold text-foreground">Organization</TableHead>
                <TableHead className="font-semibold text-foreground">Fleet Size</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Managed Residents</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="w-[80px] text-right pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.length > 0 ? (
                filteredOwners.map((owner) => (
                  <TableRow key={owner.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{owner.name || "Unnamed Owner"}</span>
                        <span className="text-xs text-muted-foreground tracking-tight">{owner.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{owner.organization.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-70">
                          {owner.organization.slug}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                          {owner.stats.careHomeCount} Homes
                        </span>
                        <span className="bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full border border-secondary">
                          {owner.stats.unitCount} Units
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-foreground">{owner.stats.residentCount}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Residents</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          owner.organization.status === "active" ? "default" :
                            owner.organization.status === "suspended" ? "secondary" : "destructive"
                        }
                        className="rounded-full shadow-sm"
                      >
                        {owner.organization.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleEdit(owner)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                    {owners ? "No owners match your filters." : "Discovering owners..."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Edit Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-md border-l shadow-2xl">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-2xl font-bold">Manage Account</SheetTitle>
            <SheetDescription>
              Update information for <span className="font-semibold text-primary">{selectedOwner?.name || selectedOwner?.email}</span>.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="owner-name">Owner Name</Label>
              <Input
                id="owner-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner-phone">Phone Number</Label>
                <Input
                  id="owner-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-niscc">NISCC Registration</Label>
                <Input
                  id="owner-niscc"
                  value={formData.niscc}
                  onChange={(e) => setFormData(prev => ({ ...prev, niscc: e.target.value }))}
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={formData.organizationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Note: Updating organization name will also refresh its URL slug.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-status">Organization Status</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger id="org-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Full Access)</SelectItem>
                    <SelectItem value="suspended">Suspended (Read Only)</SelectItem>
                    <SelectItem value="deactivated">Deactivated (Locked)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status !== "active" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label htmlFor="status-reason">Reason for Status Change</Label>
                  <Input
                    id="status-reason"
                    placeholder="e.g. Failure to comply with billing terms"
                    value={formData.statusReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, statusReason: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-muted/20 border-t">
            <Button
              className="w-full h-12 text-lg font-semibold rounded-xl shadow-lg border-b-4 active:border-b-0 transition-all border-primary-foreground/20"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? "Processing Update..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
