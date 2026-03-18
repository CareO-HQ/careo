"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Users, Search, X, Plus, UserPlus } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

interface Collaborator extends User {
  added_at: string;
  added_by?: string;
}

interface CollaboratorsDialogProps {
  folderId: string;
  folderType: "incident" | "wound";
  organizationId: string;
  trigger?: React.ReactNode;
}

export function CollaboratorsDialog({
  folderId,
  folderType,
  organizationId,
  trigger,
}: CollaboratorsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tableName = folderType === "incident" ? "incident_folder_collaborators" : "wound_folder_collaborators";
  const folderColumnName = folderType === "incident" ? "folder_id" : "wound_folder_id";

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
      fetchAvailableUsers();
    }
  }, [isOpen, folderId]);

  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          user_id,
          added_at,
          users:user_id (
            id,
            name,
            email,
            image,
            role
          )
        `)
        .eq(folderColumnName, folderId);

      if (error) throw error;

      const collabList: Collaborator[] = (data || []).map((item: any) => ({
        id: item.users.id,
        name: item.users.name,
        email: item.users.email,
        image: item.users.image,
        role: item.users.role,
        added_at: item.added_at,
      }));

      setCollaborators(collabList);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // Fetch users from the same organization
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("organization_id", organizationId);

      if (teamError) throw teamError;

      const userIds = teamMembers?.map((tm) => tm.user_id) || [];

      if (userIds.length === 0) {
        setAvailableUsers([]);
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, image, role")
        .in("id", userIds);

      if (usersError) throw usersError;

      setAvailableUsers(users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const addCollaborator = async (userId: string) => {
    setIsSaving(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();

      const insertData = {
        [folderColumnName]: folderId,
        user_id: userId,
        added_by: currentUser?.user?.id,
        added_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(tableName)
        .insert(insertData);

      if (error) {
        if (error.code === "23505") {
          toast.error("User is already a collaborator");
          return;
        }
        throw error;
      }

      toast.success("Collaborator added successfully");
      fetchCollaborators();
    } catch (error) {
      console.error("Error adding collaborator:", error);
      toast.error("Failed to add collaborator");
    } finally {
      setIsSaving(false);
    }
  };

  const removeCollaborator = async (userId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(folderColumnName, folderId)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Collaborator removed");
      fetchCollaborators();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error("Failed to remove collaborator");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = availableUsers.filter(
    (user) =>
      !collaborators.some((collab) => collab.id === user.id) &&
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="w-4 h-4 mr-2" />
            Collaborators
            {collaborators.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {collaborators.length}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Collaborators
          </DialogTitle>
          <DialogDescription>
            Add team members who can view and edit this {folderType === "incident" ? "incident" : "wound"} folder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Collaborators */}
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Current Collaborators ({collaborators.length})
            </h4>
            {isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No collaborators added yet
              </div>
            ) : (
              <ScrollArea className="h-[150px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={collab.image} />
                          <AvatarFallback className="text-xs">
                            {getInitials(collab.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{collab.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {collab.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCollaborator(collab.id)}
                        disabled={isSaving}
                        className="h-7 w-7 p-0"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Add New Collaborators */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Add Collaborator</h4>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[150px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {searchQuery
                      ? "No team members found"
                      : "All team members are already collaborators"}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.image} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addCollaborator(user.id)}
                        disabled={isSaving}
                        className="h-7"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
