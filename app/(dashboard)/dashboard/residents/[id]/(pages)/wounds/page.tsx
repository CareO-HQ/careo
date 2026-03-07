"use client";

import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { formatDateForDisplay } from "@/lib/date-utils";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Eye,
  AlertCircle,
  Activity,
  Bandage,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  FileText,
  Folder,
  ChevronDown,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { useActiveTeam } from "@/hooks/use-active-team";
import { authClient } from "@/lib/auth-client";
import { InteractiveBodyMap } from "@/components/body-map/InteractiveBodyMap";
import { BodyRegion } from "@/types/body-map";

type WoundsPageProps = {
  params: Promise<{ id: string }>;
};

type Wound = {
  id: string;
  resident_id: string;
  wound_name: string;
  location: string;
  wound_type: string;
  stage: string | null;
  status: string;
  date_identified: string;
  last_reviewed_date: string | null;
  last_reviewed_by: string | null;
  length_cm: number | null;
  width_cm: number | null;
  depth_cm: number | null;
  treatment_plan: string | null;
  dressing_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function WoundsPage({ params }: WoundsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id;
  const { activeOrganizationId, activeTeam } = useActiveTeam();
  const { data: session } = authClient.useSession();

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [selectedWoundType, setSelectedWoundType] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Data state
  const [resident, setResident] = useState<any>(null);
  const [allWounds, setAllWounds] = useState<Wound[]>([]);
  const [woundFolders, setWoundFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!residentId) return;
      setIsLoading(true);

      try {
        // Fetch resident
        const { data: resData, error: resError } = await supabase
          .from("residents")
          .select("*")
          .eq("id", residentId)
          .single();

        if (resError) {
          console.error("Error fetching resident:", resError);
          toast.error("Failed to load resident data");
          setResident(null);
          setIsLoading(false);
          return;
        }

        setResident(resData);

        // Fetch wound folders and wounds - don't fail if table doesn't exist
        try {
          // Fetch folders
          const { data: foldersData, error: foldersError } = await supabase
            .from("wound_folders")
            .select("*")
            .eq("resident_id", residentId)
            .order("created_at", { ascending: false });

          if (foldersError) {
            console.warn("Wound folders table may not exist yet. Please apply the migration:", foldersError);
            setMigrationNeeded(true);
            setWoundFolders([]);
          } else {
            setWoundFolders(foldersData || []);
          }

          // Fetch wounds (latest wound per folder for display)
          const { data: woundsData, error: woundsError } = await supabase
            .from("wounds")
            .select("*")
            .eq("resident_id", residentId)
            .order("created_at", { ascending: false });

          if (!woundsError && woundsData) {
            setAllWounds(woundsData);
          }
        } catch (woundError) {
          console.warn("Error loading wounds - migration may not be applied:", woundError);
          setMigrationNeeded(true);
          setWoundFolders([]);
          setAllWounds([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [residentId]);

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.first_name || !resident?.last_name) return "Unknown Resident";
    return `${resident.first_name} ${resident.last_name}`;
  }, [resident]);

  // Get unique wound types for filter
  const availableTypes = useMemo(() => {
    if (!allWounds || allWounds.length === 0) return [];
    const types = new Set<string>();
    allWounds.forEach(wound => {
      if (wound.wound_type) {
        types.add(wound.wound_type);
      }
    });
    return Array.from(types).sort();
  }, [allWounds]);

  // Filter and sort wounds
  const filteredWounds = useMemo(() => {
    if (!allWounds) return [];

    let filtered = [...allWounds];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(wound =>
        wound.wound_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wound.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wound.wound_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wound.stage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(wound => wound.status === selectedStatus);
    }

    // Apply type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(wound => wound.wound_type === selectedType);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date_identified).getTime();
      const dateB = new Date(b.date_identified).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [allWounds, searchQuery, selectedStatus, selectedType, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredWounds.length / itemsPerPage);
  const paginatedWounds = filteredWounds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewWound = (wound: Wound) => {
    setSelectedWound(wound);
    setIsViewDialogOpen(true);
  };

  const handleCreateWound = () => {
    setIsCreateDialogOpen(true);
    setCreateStep(1);
    setSelectedWoundType("");
    setSelectedRegion(null);
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleWoundTypeSelect = (type: string) => {
    setSelectedWoundType(type);
    setCreateStep(2);
  };

  const handleRegionSelect = (region: BodyRegion) => {
    setSelectedRegion(region);
  };

  const handleBodyMapNext = () => {
    if (!selectedRegion) {
      toast.error("Please select a location on the body map");
      return;
    }
    setCreateStep(3);
  };

  const handleBackToStep1 = () => {
    setCreateStep(1);
  };

  const handleBackToStep2 = () => {
    setCreateStep(2);
  };

  const handleCreateWoundSubmit = async () => {
    if (!selectedWoundType || !selectedDate || !selectedRegion) {
      toast.error("Please complete all steps");
      return;
    }

    try {
      // Validate authentication using Supabase auth API
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        toast.error("You must be logged in to create a wound");
        return;
      }

      // Validate organization
      if (!activeOrganizationId) {
        toast.error("Organization context is missing. Please refresh the page.");
        return;
      }

      const folderName = `${selectedWoundType} - ${format(new Date(selectedDate), "dd-MM-yyyy")}`;

      // Create folder first
      const { data: folderData, error: folderError } = await supabase
        .from("wound_folders")
        .insert({
          resident_id: residentId,
          organization_id: activeOrganizationId,
          name: folderName,
          wound_type: selectedWoundType,
        })
        .select()
        .single();

      if (folderError) {
        console.error("Error creating wound folder:", folderError);
        throw new Error(`Failed to create wound folder: ${folderError.message}`);
      }

      // Create the initial wound record with body map location
      const { data: woundData, error: woundError } = await supabase
        .from("wounds")
        .insert({
          resident_id: residentId,
          organization_id: activeOrganizationId,
          care_home_id: resident?.care_home_id,
          team_id: activeTeam?.id || resident?.team_id,
          wound_folder_id: folderData.id,
          wound_name: folderName,
          location: selectedRegion.region_name,
          wound_type: selectedWoundType,
          status: "active",
          date_identified: selectedDate,
          created_by: user.id,
        })
        .select()
        .single();

      if (woundError) {
        console.error("Error creating wound:", woundError);
        throw new Error(`Failed to create wound: ${woundError.message}`);
      }

      // Refresh data
      const { data: foldersData, error: foldersError } = await supabase
        .from("wound_folders")
        .select("*")
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false });

      if (!foldersError && foldersData) {
        setWoundFolders(foldersData);
      }

      const { data: woundsData, error: woundsError } = await supabase
        .from("wounds")
        .select("*")
        .eq("resident_id", residentId)
        .order("date_identified", { ascending: false });

      if (!woundsError && woundsData) {
        setAllWounds(woundsData);
      }

      setIsCreateDialogOpen(false);
      toast.success("Wound created successfully");

      // Navigate to wound folder
      router.push(`/dashboard/residents/${residentId}/wounds/${folderData.id}`);
    } catch (error: any) {
      console.error("Error creating wound:", error);
      toast.error(error?.message || "Failed to create wound. Please check console for details.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "healing":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "healed":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "deteriorating":
        return "bg-red-100 text-red-800 border-red-200";
      case "infected":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleStatusChange = async (woundId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("wounds")
        .update({ status: newStatus })
        .eq("id", woundId);

      if (error) throw error;

      // Refresh wounds data
      const { data: woundsData } = await supabase
        .from("wounds")
        .select("*")
        .eq("resident_id", residentId)
        .order("date_identified", { ascending: false });

      if (woundsData) {
        setAllWounds(woundsData);
      }

      toast.success(`Wound status updated to ${newStatus}`);
    } catch (error: any) {
      console.error("Error updating wound status:", error);
      toast.error("Failed to update wound status");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healing":
        return <TrendingUp className="w-3 h-3" />;
      case "deteriorating":
        return <TrendingDown className="w-3 h-3" />;
      case "healed":
        return <Activity className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  // Loading state
  if (isLoading || !resident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading wounds...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const woundStats = {
    total: allWounds.length,
    thisMonth: allWounds.filter(wound => {
      const woundDate = new Date(wound.date_identified);
      const now = new Date();
      return woundDate.getMonth() === now.getMonth() && woundDate.getFullYear() === now.getFullYear();
    }).length,
    thisWeek: allWounds.filter(wound => {
      const woundDate = new Date(wound.date_identified);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return woundDate >= weekAgo;
    }).length,
    active: allWounds.filter(w => w.status === "active" || w.status === "deteriorating" || w.status === "infected").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Migration Warning Banner */}
      {migrationNeeded && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Database Migration Required</h3>
                <p className="text-sm text-orange-800 mt-1">
                  The wounds tables have not been created yet. Please apply the migration file:
                </p>
                <code className="block mt-2 p-2 bg-orange-100 rounded text-xs text-orange-900">
                  supabase/migrations/20260304000000_create_wounds_table.sql
                </code>
                <p className="text-xs text-orange-700 mt-2">
                  Run: <code className="bg-orange-100 px-1 rounded">npx supabase db push</code> or apply manually in Supabase dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Bandage className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Wounds</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of wounds and assessments for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="border-0 bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-700">Total Wounds</p>
              <p className="text-lg font-bold text-red-900 mt-0.5">{woundStats.total}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>

        <div className="border-0 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-700">This Month</p>
              <p className="text-lg font-bold text-green-900 mt-0.5">{woundStats.thisMonth}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700">This Week</p>
              <p className="text-lg font-bold text-blue-900 mt-0.5">{woundStats.thisWeek}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-700">Active</p>
              <p className="text-lg font-bold text-orange-900 mt-0.5">{woundStats.active}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filter Wounds</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by wound name, location, type..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="healing">Healing</SelectItem>
                <SelectItem value="healed">Healed</SelectItem>
                <SelectItem value="deteriorating">Deteriorating</SelectItem>
                <SelectItem value="infected">Infected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Wound Folders Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Wound Folders ({woundFolders.length})</span>
            <Button
              onClick={handleCreateWound}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Wound
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {woundFolders.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No wounds found</p>
              <p className="text-gray-400 text-sm mt-1">
                Click &apos;Add Wound&apos; to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wound</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {woundFolders.map((folder) => {
                    // Find the latest wound for this folder
                    const wound = allWounds.find(w => w.wound_folder_id === folder.id);

                    return (
                      <TableRow
                        key={folder.id}
                        className="bg-blue-50/50 hover:bg-blue-100/50 cursor-pointer"
                        onClick={() => router.push(`/dashboard/residents/${residentId}/wounds/${folder.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-900">{folder.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{wound?.location || "To be specified"}</TableCell>
                        <TableCell>{folder.wound_type}</TableCell>
                        <TableCell>
                          {wound?.stage ? (
                            <Badge variant="outline" className="text-xs">
                              {wound.stage}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {wound ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1 focus:outline-none">
                                  <Badge className={`${getStatusColor(wound.status)} border-0 text-xs`}>
                                    {getStatusIcon(wound.status)}
                                    <span className="ml-1 capitalize">{wound.status}</span>
                                  </Badge>
                                  <ChevronDown className="w-3 h-3 text-gray-400" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(wound.id, "active")}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span>Active</span>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(wound.id, "healed")}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    <span>Healed</span>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(wound.id, "healing")}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <span>Healing</span>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(wound.id, "deteriorating")}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span>Deteriorating</span>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(wound.id, "infected")}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    <span>Infected</span>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 border-0 text-xs">
                              New
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {wound?.last_reviewed_date ? (
                            <div>
                              <div className="text-sm">{formatDateForDisplay(wound.last_reviewed_date)}</div>
                              {wound.last_reviewed_by && (
                                <div className="text-xs text-gray-500">by {wound.last_reviewed_by}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not reviewed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Wound Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className={`max-h-[90vh] flex flex-col ${createStep === 2 ? "max-w-4xl" : "max-w-md sm:max-w-md"}`}>
          {createStep === 1 ? (
            <>
              <DialogHeader className="pb-2 flex-shrink-0">
                <DialogTitle className="text-sm font-semibold">Step 1: Select Wound Type</DialogTitle>
                <DialogDescription className="text-[10px]">
                  Choose the type of wound to document
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-1.5 overflow-y-auto pr-1 flex-1">
                {[
                  { key: "Pressure Ulcer", color: "bg-red-100 text-red-600" },
                  { key: "Skin Tear", color: "bg-orange-100 text-orange-600" },
                  { key: "Leg Ulcer (Venous)", color: "bg-blue-100 text-blue-600" },
                  { key: "Leg Ulcer (Arterial)", color: "bg-purple-100 text-purple-600" },
                  { key: "Leg Ulcer (Mixed)", color: "bg-indigo-100 text-indigo-600" },
                  { key: "Diabetic Foot Ulcer", color: "bg-green-100 text-green-600" },
                  { key: "Surgical Wound", color: "bg-teal-100 text-teal-600" },
                  { key: "Burn", color: "bg-yellow-100 text-yellow-600" },
                  { key: "Traumatic Wound", color: "bg-pink-100 text-pink-600" },
                  { key: "Other", color: "bg-gray-100 text-gray-600" },
                ].map((option) => (
                  <div
                    key={option.key}
                    className="cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors border bg-white rounded-lg"
                    onClick={() => handleWoundTypeSelect(option.key)}
                  >
                    <div className="p-2.5">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-md ${option.color}`}>
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs">{option.key}</h3>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : createStep === 2 ? (
            <>
              <DialogHeader className="pb-2 flex-shrink-0">
                <DialogTitle className="text-sm font-semibold">Step 2: Select Wound Location</DialogTitle>
                <DialogDescription className="text-[10px]">
                  Click on the body map to mark where the wound is located
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto py-4">
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Wound Type:</span> {selectedWoundType}
                  </p>
                  {selectedRegion && (
                    <p className="text-xs text-primary font-medium mt-1">
                      <span className="font-medium">Selected Location:</span> {selectedRegion.region_name}
                    </p>
                  )}
                </div>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="max-h-[55vh] overflow-auto">
                    <div className="scale-90 origin-top">
                      <InteractiveBodyMap
                        entries={[]}
                        onRegionClick={handleRegionSelect}
                        selectedRegionId={selectedRegion?.region_id || null}
                        viewMode={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between space-x-2 pt-4 border-t flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleBackToStep1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleBodyMapNext}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="pb-2 flex-shrink-0">
                <DialogTitle className="text-sm font-semibold">Step 3: Date Identified</DialogTitle>
                <DialogDescription className="text-[10px]">
                  When was this wound first identified?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 flex-1">
                <div className="space-y-2">
                  <div className="text-xs space-y-1 mb-3">
                    <p><span className="font-medium">Wound Type:</span> {selectedWoundType}</p>
                    <p><span className="font-medium">Location:</span> {selectedRegion?.region_name}</p>
                  </div>
                  <Label htmlFor="wound-date" className="text-sm font-medium">
                    Date Identified
                  </Label>
                  <Input
                    id="wound-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: Today&apos;s date
                  </p>
                </div>
              </div>
              <div className="flex justify-between space-x-2 pt-4 border-t flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleBackToStep2}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWoundSubmit}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Wound
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Wound Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wound Details</DialogTitle>
            <DialogDescription>
              Complete wound information for {fullName}
            </DialogDescription>
          </DialogHeader>
          {selectedWound && (
            <div className="space-y-6">
              {/* Wound Overview */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Wound Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Wound Name</p>
                    <p className="font-medium">{selectedWound.wound_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{selectedWound.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{selectedWound.wound_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stage</p>
                    <p className="font-medium">{selectedWound.stage || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge className={`${getStatusColor(selectedWound.status)}`}>
                      {getStatusIcon(selectedWound.status)}
                      <span className="ml-1 capitalize">{selectedWound.status}</span>
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date Identified</p>
                    <p className="font-medium">{formatDateForDisplay(selectedWound.date_identified)}</p>
                  </div>
                </div>
              </div>

              {/* Measurements */}
              {(selectedWound.length_cm || selectedWound.width_cm || selectedWound.depth_cm) && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Measurements</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedWound.length_cm && (
                      <div>
                        <p className="text-sm text-gray-500">Length</p>
                        <p className="font-medium">{selectedWound.length_cm} cm</p>
                      </div>
                    )}
                    {selectedWound.width_cm && (
                      <div>
                        <p className="text-sm text-gray-500">Width</p>
                        <p className="font-medium">{selectedWound.width_cm} cm</p>
                      </div>
                    )}
                    {selectedWound.depth_cm && (
                      <div>
                        <p className="text-sm text-gray-500">Depth</p>
                        <p className="font-medium">{selectedWound.depth_cm} cm</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Treatment */}
              {(selectedWound.treatment_plan || selectedWound.dressing_type) && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Treatment</h3>
                  {selectedWound.treatment_plan && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 mb-1">Treatment Plan</p>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                        {selectedWound.treatment_plan}
                      </p>
                    </div>
                  )}
                  {selectedWound.dressing_type && (
                    <div>
                      <p className="text-sm text-gray-500">Dressing Type</p>
                      <p className="font-medium">{selectedWound.dressing_type}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedWound.notes && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Clinical Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {selectedWound.notes}
                  </p>
                </div>
              )}

              {/* Last Review */}
              {selectedWound.last_reviewed_date && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Review Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Last Reviewed</p>
                      <p className="font-medium">{formatDateForDisplay(selectedWound.last_reviewed_date)}</p>
                    </div>
                    {selectedWound.last_reviewed_by && (
                      <div>
                        <p className="text-sm text-gray-500">Reviewed By</p>
                        <p className="font-medium">{selectedWound.last_reviewed_by}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => {
              router.push(`/dashboard/residents/${residentId}/wounds/${selectedWound?.id}/edit`);
            }}>
              Edit Wound
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
