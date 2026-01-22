"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus, Trash2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AdminProfile {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
}

export default function SaaSAdminsPage() {
    const { profile, isLoading: isProfileLoading } = useProfile();
    const router = useRouter();
    const [admins, setAdmins] = useState<AdminProfile[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Redirect if not SaaS Admin
    useEffect(() => {
        if (!isProfileLoading && profile && !profile.is_saas_admin) {
            router.push("/dashboard");
        }
    }, [profile, isProfileLoading, router]);

    const fetchAdmins = useCallback(async () => {
        if (!profile?.is_saas_admin) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("users")
                .select("id, email, name, created_at")
                .eq("is_saas_admin", true)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setAdmins(data || []);
        } catch (error) {
            console.error("Error fetching admins:", error);
            toast.error("Failed to load SaaS Admins");
        } finally {
            setIsLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        try {
            setIsSubmitting(true);

            // Find user by email
            const { data: userProfile, error: findError } = await supabase
                .from("users")
                .select("id")
                .eq("email", inviteEmail.toLowerCase())
                .single();

            if (findError || !userProfile) {
                throw new Error("User not found. They must sign in at least once before being promoted.");
            }

            // Promote to SaaS Admin
            const { error: updateError } = await supabase
                .from("users")
                .update({ is_saas_admin: true })
                .eq("id", userProfile.id);

            if (updateError) throw updateError;

            toast.success("User promoted to SaaS Admin successfully");
            setIsInviteOpen(false);
            setInviteEmail("");
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.message || "Failed to add admin");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAdmin = async (userId: string) => {
        if (admins && admins.length <= 1) {
            toast.error("Cannot remove the last SaaS Admin to prevent lockout.");
            return;
        }

        if (userId === profile?.id) {
            toast.error("You cannot revoke your own SaaS Admin status.");
            return;
        }

        try {
            const { error } = await supabase
                .from("users")
                .update({ is_saas_admin: false })
                .eq("id", userId);

            if (error) throw error;

            toast.success("SaaS Admin status revoked");
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.message || "Failed to remove admin");
        }
    };

    if (isProfileLoading || (isLoading && !admins)) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
        );
    }

    return (
        <div className="w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium tracking-tight">SaaS Administrators</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage administrative access to the platform command center.
                    </p>
                </div>

                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleAddAdmin}>
                            <DialogHeader>
                                <DialogTitle>Add SaaS Administrator</DialogTitle>
                                <DialogDescription>
                                    Enter the email of an existing user to promote them to SaaS Admin.
                                    They must have already signed into the platform.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@example.com"
                                            className="pl-10"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={() => setIsInviteOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Promote to Admin
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Administrators</CardTitle>
                    <CardDescription>
                        Users with full access to SaaS administration features.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Added On</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!admins || admins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No administrators found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                admins.map((admin) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium">
                                            {admin.name || "Anonymous User"}
                                        </TableCell>
                                        <TableCell>{admin.email}</TableCell>
                                        <TableCell>
                                            {new Date(admin.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="gap-1.5 px-2 bg-blue-50 text-blue-700 border-blue-200">
                                                <Shield className="h-3 w-3" />
                                                Super Admin
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Revoke Admin Access?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will remove <strong>{admin.email}</strong> from the SaaS Admin group.
                                                            They will lose all access to platform-wide settings and management tools.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleRemoveAdmin(admin.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Revoke Access
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
