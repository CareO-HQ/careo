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
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "@/hooks/use-toast";
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
import React from "react";
import { format } from "date-fns";

type StaffOverviewProps = {
  params: Promise<{ id: string }>;
};

export default function StaffOverviewPage({ params }: StaffOverviewProps) {
  const { id } = React.use(params);
  const { data: activeOrg, isPending: isActiveOrgLoading } = authClient.useActiveOrganization();
  const { data: activeMember, isPending: isActiveMemberLoading } = authClient.useActiveMember();
  const { toast } = useToast();

  useEffect(() => {
    if (!isActiveMemberLoading && activeMember) {
      if (!canViewStaffList(activeMember.role as UserRole)) {
        window.location.href = "/dashboard";
      }
    }
  }, [activeMember, isActiveMemberLoading]);

  if (isActiveOrgLoading || isActiveMemberLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (activeMember && !canViewStaffList(activeMember.role as UserRole)) {
    return null;
  }

  // Find the staff member from organization members
  const staffMember = activeOrg?.members?.find((m) => m.id === id || m.userId === id);

  // Get staff details from local database
  const staffDetails = useQuery(
    api.users.getStaffDetailsByUserId,
    staffMember?.userId ? { userId: staffMember.userId } : "skip"
  );

  // Fetch staff member's profile image from Convex
  const userImage = useQuery(
    api.files.image.getUserImageByUserId,
    staffMember?.userId ? { userId: staffMember.userId } : "skip"
  );

  const updateStaffDetails = useMutation(api.users.updateStaffDetails);
  const generateUploadUrl = useMutation(api.files.image.generateUploadUrl);
  const sendImage = useMutation(api.files.image.sendImage);

  // Form state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    phone: "",
    address: "",
    dateOfJoin: "",
    rightToWorkStatus: "not_verified" as "verified" | "pending" | "expired" | "not_verified",
    nextOfKinName: "",
    nextOfKinRelationship: "",
    nextOfKinPhone: "",
    nextOfKinEmail: "",
    nextOfKinAddress: "",
  });

  // Update form when staff details load
  React.useEffect(() => {
    if (staffDetails) {
      setFormData({
        phone: staffDetails.phone || "",
        address: staffDetails.address || "",
        dateOfJoin: staffDetails.dateOfJoin || "",
        rightToWorkStatus: staffDetails.rightToWorkStatus || "not_verified",
        nextOfKinName: staffDetails.nextOfKinName || "",
        nextOfKinRelationship: staffDetails.nextOfKinRelationship || "",
        nextOfKinPhone: staffDetails.nextOfKinPhone || "",
        nextOfKinEmail: staffDetails.nextOfKinEmail || "",
        nextOfKinAddress: staffDetails.nextOfKinAddress || "",
      });
    }
  }, [staffDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffMember) return;

    try {
      // Update staff details
      await updateStaffDetails({
        userId: staffMember.userId,
        ...formData,
      });

      // Upload photo if selected
      if (selectedFile) {
        const uploadUrl = await generateUploadUrl();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        const { storageId } = await result.json();

        await sendImage({
          storageId,
          type: "profile",
          userId: staffMember.userId,
        });
      }

      toast({
        title: "Success",
        description: "Staff details updated successfully",
      });

      setIsEditOpen(false);
      setSelectedFile(null);

      // Refresh the page to show updates
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update staff details",
        variant: "destructive",
      });
    }
  };

  if (!activeOrg || !staffMember) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const fullName = staffMember.user.name || staffMember.user.email;
  const nameParts = staffMember.user.name?.split(' ') || [];
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : staffMember.user.name?.[0]?.toUpperCase() || staffMember.user.email[0].toUpperCase();

  const memberSince = format(new Date(staffMember.createdAt), 'MMMM dd, yyyy');
  const dateOfJoinFormatted = formData.dateOfJoin ? format(new Date(formData.dateOfJoin), 'MMMM dd, yyyy') : 'Not set';

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
                    currentImageUrl={userImage?.url || staffMember.user.image || ""}
                    fileId={undefined}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    userInitial={fullName.split(' ').map(n => n[0]).join('')}
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
                      <Label htmlFor="dateOfJoin">Date of Join</Label>
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
                              !formData.dateOfJoin && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.dateOfJoin ? (
                              format(new Date(formData.dateOfJoin), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.dateOfJoin ? new Date(formData.dateOfJoin) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setFormData({ ...formData, dateOfJoin: format(date, "yyyy-MM-dd") });
                                setIsDatePickerOpen(false);
                              }
                            }}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(23, 59, 59, 999);
                              return date > today;
                            }}
                            captionLayout="dropdown"
                            defaultMonth={formData.dateOfJoin ? new Date(formData.dateOfJoin) : new Date()}
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
                    <Label htmlFor="rightToWorkStatus">Right to Work Status</Label>
                    <Select
                      value={formData.rightToWorkStatus}
                      onValueChange={(value) => setFormData({ ...formData, rightToWorkStatus: value as typeof formData.rightToWorkStatus })}
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
                      <Label htmlFor="nextOfKinName">Full Name</Label>
                      <Input
                        id="nextOfKinName"
                        value={formData.nextOfKinName}
                        onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                        placeholder="Next of Kin Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nextOfKinRelationship">Relationship</Label>
                      <Input
                        id="nextOfKinRelationship"
                        value={formData.nextOfKinRelationship}
                        onChange={(e) => setFormData({ ...formData, nextOfKinRelationship: e.target.value })}
                        placeholder="e.g., Spouse, Parent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nextOfKinPhone">Phone Number</Label>
                      <Input
                        id="nextOfKinPhone"
                        value={formData.nextOfKinPhone}
                        onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                        placeholder="+44 1234 567890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nextOfKinEmail">Email</Label>
                      <Input
                        id="nextOfKinEmail"
                        type="email"
                        value={formData.nextOfKinEmail}
                        onChange={(e) => setFormData({ ...formData, nextOfKinEmail: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nextOfKinAddress">Address</Label>
                    <Textarea
                      id="nextOfKinAddress"
                      value={formData.nextOfKinAddress}
                      onChange={(e) => setFormData({ ...formData, nextOfKinAddress: e.target.value })}
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
                src={userImage?.url || staffMember.user.image || ""}
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
                <Badge variant="outline" className={getRightToWorkStatusColor(formData.rightToWorkStatus)}>
                  {getRightToWorkStatusText(formData.rightToWorkStatus)}
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
                  <p className="font-medium">{staffMember.user.email}</p>
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
                  <p className="font-medium">{activeOrg.name}</p>
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
                    {formData.dateOfJoin ? dateOfJoinFormatted : <span className="text-muted-foreground">Not set</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <UserCheck className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Right to Work</p>
                  <Badge variant="outline" className={getRightToWorkStatusColor(formData.rightToWorkStatus)}>
                    {getRightToWorkStatusText(formData.rightToWorkStatus)}
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
            {formData.nextOfKinName ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{formData.nextOfKinName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Relationship</p>
                  <p className="font-medium">{formData.nextOfKinRelationship}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{formData.nextOfKinPhone || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{formData.nextOfKinEmail || "Not set"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{formData.nextOfKinAddress || "Not set"}</p>
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
