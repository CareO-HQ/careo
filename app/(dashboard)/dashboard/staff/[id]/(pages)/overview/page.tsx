"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatRoleName } from "@/lib/utils";
import { canViewStaffList, UserRole } from "@/lib/permissions";
import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import ImageSelector from "@/components/onboarding/profile/ImageSelector";
import {
  Mail,
  Phone,
  Calendar,
  Building,
  Shield,
  Users,
  Clock,
  Edit,
  MapPin,
  UserCheck,
  Heart,
  User2Icon
} from "lucide-react";
import { format } from "date-fns";

type StaffOverviewProps = {
  params: Promise<{ id: string }>;
};

export default function StaffOverviewPage({ params }: StaffOverviewProps) {
  const { id } = React.use(params);
  const { profile: currentProfile, refresh: refreshCurrentProfile } = useProfile();
  const { supabase } = useSupabase();

  const [staffMember, setStaffMember] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    phone: "",
    address: "",
    date_of_join: "",
    right_to_work_status: "not_verified",
    next_of_kin_name: "",
    next_of_kin_relationship: "",
    next_of_kin_phone: "",
    next_of_kin_email: "",
    next_of_kin_address: "",
  });

  const fetchStaffMember = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        organizations:active_organization_id (
          id,
          name
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching staff profile:", error);
      setStaffMember(null);
    } else {
      setStaffMember(data);
      // Initialize form data
      setFormData({
        phone: data.phone || "",
        address: data.address || "",
        date_of_join: data.date_of_join || "",
        right_to_work_status: data.right_to_work_status || "not_verified",
        next_of_kin_name: data.next_of_kin_name || "",
        next_of_kin_relationship: data.next_of_kin_relationship || "",
        next_of_kin_phone: data.next_of_kin_phone || "",
        next_of_kin_email: data.next_of_kin_email || "",
        next_of_kin_address: data.next_of_kin_address || "",
      });
    }
    setIsLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchStaffMember();
  }, [fetchStaffMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffMember || !supabase) return;

    try {
      let imageUrl = staffMember.image_url;

      // Handle Image Upload
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${id}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('careo-public')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('careo-public')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Update staff details
      const { error: updateError } = await supabase
        .from("users")
        .update({
          ...formData,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("Staff details updated successfully");
      setIsEditOpen(false);
      setSelectedFile(null);
      fetchStaffMember(); // Refresh data
    } catch (error: any) {
      console.error("Error updating staff:", error);
      toast.error(error.message || "Failed to update staff details");
    }
  };

  if (isLoading || !currentProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentProfile && !canViewStaffList(currentProfile.role as UserRole)) {
    return null;
  }

  if (!staffMember) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Staff member not found</p>
          <p className="text-muted-foreground">The staff member you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const fullName = staffMember.name || staffMember.email;
  const nameParts = staffMember.name?.split(' ') || [];
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : staffMember.name?.[0]?.toUpperCase() || staffMember.email[0].toUpperCase();

  const memberSince = format(new Date(staffMember.created_at), 'MMMM dd, yyyy');
  const dateOfJoinFormatted = formData.date_of_join ? format(new Date(formData.date_of_join), 'MMMM dd, yyyy') : 'Not set';

  const getRightToWorkStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "expired":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getRightToWorkStatusText = (status: string) => {
    switch (status) {
      case "verified":
        return "Verified";
      case "pending":
        return "Pending";
      case "expired":
        return "Expired";
      default:
        return "Not Verified";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile Information</CardTitle>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Staff Details</DialogTitle>
                <DialogDescription>
                  Update staff member information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Photo Upload */}
                <div className="mb-6">
                  <ImageSelector
                    placeholder={<User2Icon strokeWidth={1.5} className="w-14 h-14 text-muted-foreground" />}
                    currentImageUrl={staffMember.image_url || ""}
                    fileId={undefined}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    userInitial={fullName.split(' ').map((n: string) => n[0]).join('')}
                  />
                </div>

                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+44 1234 567890"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="date_of_join">Date of Join</Label>
                      <Popover
                        open={isDatePickerOpen}
                        onOpenChange={setIsDatePickerOpen}
                        modal
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.date_of_join && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.date_of_join ? (
                              format(new Date(formData.date_of_join), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.date_of_join ? new Date(formData.date_of_join) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setFormData({ ...formData, date_of_join: format(date, "yyyy-MM-dd") });
                                setIsDatePickerOpen(false);
                              }
                            }}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(23, 59, 59, 999);
                              return date > today;
                            }}
                            captionLayout="dropdown"
                            defaultMonth={formData.date_of_join ? new Date(formData.date_of_join) : new Date()}
                            startMonth={new Date(new Date().getFullYear() - 50, 0)}
                            endMonth={new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter full address"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="right_to_work_status">Right to Work Status</Label>
                    <Select
                      value={formData.right_to_work_status}
                      onValueChange={(value) => setFormData({ ...formData, right_to_work_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="not_verified">Not Verified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Next of Kin Information */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Next of Kin Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="next_of_kin_name">Full Name</Label>
                      <Input
                        id="next_of_kin_name"
                        value={formData.next_of_kin_name}
                        onChange={(e) => setFormData({ ...formData, next_of_kin_name: e.target.value })}
                        placeholder="Next of Kin Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="next_of_kin_relationship">Relationship</Label>
                      <Input
                        id="next_of_kin_relationship"
                        value={formData.next_of_kin_relationship}
                        onChange={(e) => setFormData({ ...formData, next_of_kin_relationship: e.target.value })}
                        placeholder="e.g., Spouse, Parent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="next_of_kin_phone">Phone Number</Label>
                      <Input
                        id="next_of_kin_phone"
                        value={formData.next_of_kin_phone}
                        onChange={(e) => setFormData({ ...formData, next_of_kin_phone: e.target.value })}
                        placeholder="+44 1234 567890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="next_of_kin_email">Email</Label>
                      <Input
                        id="next_of_kin_email"
                        type="email"
                        value={formData.next_of_kin_email}
                        onChange={(e) => setFormData({ ...formData, next_of_kin_email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="next_of_kin_address">Address</Label>
                    <Textarea
                      id="next_of_kin_address"
                      value={formData.next_of_kin_address}
                      onChange={(e) => setFormData({ ...formData, next_of_kin_address: e.target.value })}
                      placeholder="Enter full address"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-24 h-24">
              <AvatarImage
                src={staffMember.image_url || ""}
                alt={fullName}
                className="border-2"
              />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {formatRoleName(staffMember.role)}
                </Badge>
                <Badge variant="outline" className={getRightToWorkStatusColor(formData.right_to_work_status)}>
                  {getRightToWorkStatusText(formData.right_to_work_status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Member since {memberSince}
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{staffMember.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">
                    {formData.phone || <span className="text-muted-foreground">Not set</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 md:col-span-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {formData.address || <span className="text-muted-foreground">Not set</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Building className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">{staffMember.organizations?.name || "Not assigned"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Shield className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">
                    {formatRoleName(staffMember.role)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Join</p>
                  <p className="font-medium">
                    {formData.date_of_join ? dateOfJoinFormatted : <span className="text-muted-foreground">Not set</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <UserCheck className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Right to Work</p>
                  <Badge variant="outline" className={getRightToWorkStatusColor(formData.right_to_work_status)}>
                    {getRightToWorkStatusText(formData.right_to_work_status)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Next of Kin Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Next of Kin
            </h3>
            {formData.next_of_kin_name ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{formData.next_of_kin_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Relationship</p>
                  <p className="font-medium">{formData.next_of_kin_relationship}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{formData.next_of_kin_phone || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{formData.next_of_kin_email || "Not set"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{formData.next_of_kin_address || "Not set"}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No next of kin information available. Click &quot;Edit Details&quot; to add.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Shifts This Week</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Residents Assigned</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
              <Calendar className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
