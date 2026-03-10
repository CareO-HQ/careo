"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Droplet, User, Clock, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { canLogDailyCare } from "@/lib/permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getUKTodayDate, formatTimestampToUKDate } from "@/lib/date-utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/date-time-picker";

type ContinencePageProps = {
  params: Promise<{ id: string }>;
};

export default function ContinencePage({ params }: ContinencePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();
  const [resident, setResident] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBowelDialogOpen, setIsBowelDialogOpen] = React.useState(false);
  const [isUrineDialogOpen, setIsUrineDialogOpen] = React.useState(false);
  const [selectedStoolType, setSelectedStoolType] = React.useState<string>("");
  const [bowelSize, setBowelSize] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [entryTime, setEntryTime] = React.useState(() => {
    // Initialize with current time
    return new Date().toTimeString().slice(0, 5);
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [entries, setEntries] = React.useState<any[]>([]);

  // Urine-specific states
  const [urineType, setUrineType] = React.useState<"normal" | "catheter">("normal");
  const [urineAmount, setUrineAmount] = React.useState<string>("");
  const [urineAmountMl, setUrineAmountMl] = React.useState<string>("");
  const [urineColor, setUrineColor] = React.useState<string>("");
  const [continenceAid, setContinenceAid] = React.useState<string>("");
  const [urineStep, setUrineStep] = React.useState(1);

  const userRole = profile?.role;
  const canLogEntries = canLogDailyCare(userRole);
  const currentUserName = profile?.name || profile?.email?.split('@')[0] || "Staff";

  const resetUrineForm = () => {
    setUrineType("normal");
    setUrineAmount("");
    setUrineAmountMl("");
    setUrineColor("");
    setContinenceAid("");
    setNotes("");
    setEntryTime(new Date().toTimeString().slice(0, 5));
    setUrineStep(1);
  };

  // Bristol Stool Chart Types
  const stoolTypes = [
    { id: "type_1", label: "Type 1", description: "Separate hard lumps", hasImage: true },
    { id: "type_2", label: "Type 2", description: "Lumpy and sausage like", hasImage: true },
    { id: "type_3", label: "Type 3", description: "A sausage shape with cracks in the surface", hasImage: true },
    { id: "type_4", label: "Type 4", description: "Like a smooth, soft sausage or snake", hasImage: true },
    { id: "type_5", label: "Type 5", description: "Soft blobs with clear-cut edges", hasImage: true },
    { id: "type_6", label: "Type 6", description: "Mushy consistency with ragged edges", hasImage: true },
    { id: "type_7", label: "Type 7", description: "Liquid consistency with no solid pieces", hasImage: true },
  ];

  const fetchEntries = React.useCallback(async () => {
    try {
      const today = getUKTodayDate();
      const { data, error } = await supabase
        .from("continence_entries")
        .select(`
          *,
          recorded_by_user:recorded_by (
            id,
            name,
            email
          )
        `)
        .eq("resident_id", id)
        .eq("date", today)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching entries:", error);
        setEntries([]);
        return;
      }

      console.log("Fetched entries:", data);
      setEntries(data || []);
    } catch (err) {
      console.error("Exception fetching entries:", err);
      setEntries([]);
    }
  }, [id]);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Fetch resident data
        const { data, error } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching resident:", error);
          setResident(null);
        } else {
          setResident(data);
        }

        // Try to fetch entries (don't block if table doesn't exist)
        try {
          const today = getUKTodayDate();
          const { data: entriesData, error: entriesError } = await supabase
            .from("continence_entries")
            .select(`
              *,
              recorded_by_user:recorded_by (
                id,
                name,
                email
              )
            `)
            .eq("resident_id", id)
            .eq("date", today)
            .order("created_at", { ascending: false });

          if (entriesError) {
            console.warn("⚠️ Could not fetch continence entries:", entriesError.message);
            console.warn("The continence_entries table may not exist. Run the SQL migration in Supabase.");
            setEntries([]);
          } else {
            console.log("✅ Fetched entries:", entriesData);
            setEntries(entriesData || []);
          }
        } catch (entriesErr) {
          console.warn("Exception fetching entries:", entriesErr);
          setEntries([]);
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleBowelSubmit = async () => {
    if (!selectedStoolType) {
      toast.error("Please select a stool type");
      return;
    }

    if (!bowelSize) {
      toast.error("Please select a size");
      return;
    }

    if (!entryTime) {
      toast.error("Please enter a time");
      return;
    }

    if (!profile?.id) {
      toast.error("User profile not loaded. Please refresh the page.");
      return;
    }

    if (!profile?.active_organization_id) {
      toast.error("No active organization found. Please contact support.");
      return;
    }

    setIsSubmitting(true);
    try {
      const today = getUKTodayDate();

      console.log("Submitting bowel entry with data:", {
        resident_id: id,
        organization_id: profile.active_organization_id,
        entry_type: "bowel",
        date: today,
        time: entryTime,
        stool_type: selectedStoolType,
        bowel_size: bowelSize,
        notes: notes || null,
        recorded_by: profile.id,
      });

      const { data, error } = await supabase
        .from("continence_entries")
        .insert({
          resident_id: id,
          organization_id: profile.active_organization_id,
          care_home_id: profile.active_care_home_id || null,
          team_id: profile.active_team_id || null,
          entry_type: "bowel",
          date: today,
          time: entryTime,
          stool_type: selectedStoolType,
          bowel_size: bowelSize,
          notes: notes || null,
          recorded_by: profile.id,
        })
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      console.log("Successfully inserted entry:", data);

      toast.success("Bowel entry recorded successfully");
      setIsBowelDialogOpen(false);
      setSelectedStoolType("");
      setBowelSize("");
      setNotes("");
      setEntryTime(new Date().toTimeString().slice(0, 5));

      // Refresh entries
      try {
        await fetchEntries();
      } catch (err) {
        console.warn("Could not refresh entries:", err);
      }
    } catch (error: any) {
      console.error("Error recording bowel entry:", error);
      toast.error(`Failed to record bowel entry: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUrineSubmit = async () => {
    if (!urineAmount) {
      toast.error("Please select urine amount");
      return;
    }

    if (urineAmount === "measured" && !urineAmountMl) {
      toast.error("Please enter volume in ml");
      return;
    }

    if (!urineColor) {
      toast.error("Please select urine color");
      return;
    }

    if (!continenceAid) {
      toast.error("Please select continence aid");
      return;
    }

    if (!entryTime) {
      toast.error("Please enter a time");
      return;
    }

    if (!profile?.id) {
      toast.error("User profile not loaded. Please refresh the page.");
      return;
    }

    if (!profile?.active_organization_id) {
      toast.error("No active organization found. Please contact support.");
      return;
    }

    setIsSubmitting(true);
    try {
      const today = getUKTodayDate();

      // Format urine amount display
      let amountDisplay = urineAmount;
      if (urineAmount === "measured") {
        amountDisplay = `${urineAmountMl}ml`;
      }

      const { data, error } = await supabase
        .from("continence_entries")
        .insert({
          resident_id: id,
          organization_id: profile.active_organization_id,
          care_home_id: profile.active_care_home_id || null,
          team_id: profile.active_team_id || null,
          entry_type: "urine",
          date: today,
          time: entryTime,
          urine_color: urineColor,
          urine_amount: amountDisplay,
          continence_aid: continenceAid,
          notes: notes || null,
          recorded_by: profile.id,
        })
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      console.log("Successfully inserted urine entry:", data);

      toast.success("Urine entry recorded successfully");
      setIsUrineDialogOpen(false);
      resetUrineForm();

      // Refresh entries
      try {
        await fetchEntries();
      } catch (err) {
        console.warn("Could not refresh entries:", err);
      }
    } catch (error: any) {
      console.error("Error recording urine entry:", error);
      toast.error(`Failed to record urine entry: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/dashboard/residents/${id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={resident.image_url}
              alt={fullName}
              className="border"
            />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Continence</h1>
            <p className="text-muted-foreground text-sm">
              Track bowel and bladder care for {resident.first_name}{" "}
              {resident.last_name}.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/residents/${id}/continence/documents`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            See All Records
          </Button>
        </div>

        {/* Main Buttons Card */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Droplet className="w-5 h-5 text-teal-600" />
              <span>Continence Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {canLogEntries && (
                <>
                  <Button
                    variant="outline"
                    className="h-20 text-base bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300"
                    onClick={() => {
                      setEntryTime(new Date().toTimeString().slice(0, 5));
                      setIsBowelDialogOpen(true);
                    }}
                  >
                    <div className="flex flex-col items-center space-y-1.5">
                      <User className="w-6 h-6" />
                      <span className="font-semibold">Bowel</span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 text-base bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300"
                    onClick={() => {
                      resetUrineForm();
                      setIsUrineDialogOpen(true);
                    }}
                  >
                    <div className="flex flex-col items-center space-y-1.5">
                      <Droplet className="w-6 h-6" />
                      <span className="font-semibold">Urine</span>
                    </div>
                  </Button>
                </>
              )}
            </div>
            {!canLogEntries && (
              <div className="text-center py-8 text-muted-foreground">
                <p>You do not have permission to log continence entries.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Entries with Tabs */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <span>Today&apos;s Entries</span>
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bowel" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bowel" className="text-sm">Bowel</TabsTrigger>
                <TabsTrigger value="urine" className="text-sm">Urine</TabsTrigger>
              </TabsList>

              {/* Bowel Tab */}
              <TabsContent value="bowel" className="mt-4">
                {(() => {
                  const bowelEntries = entries.filter(e => e.entry_type === "bowel");

                  return bowelEntries.length > 0 ? (
                    <div className="space-y-2">
                      {bowelEntries.map((entry) => {
                        const stoolTypeLabel = entry.stool_type
                          ? stoolTypes.find((t) => t.id === entry.stool_type)
                          : null;

                        return (
                          <div
                            key={entry.id}
                            className="text-sm border-b pb-2 last:border-b-0"
                          >
                            <span className="font-medium">{entry.time}</span>
                            {" - "}
                            {stoolTypeLabel && (
                              <span className="text-muted-foreground">
                                {stoolTypeLabel.label} - {stoolTypeLabel.description}
                              </span>
                            )}
                            {entry.bowel_size && (
                              <span className="text-muted-foreground"> - Size: {entry.bowel_size.toUpperCase()}</span>
                            )}
                            {entry.notes && (
                              <span className="text-muted-foreground"> - {entry.notes}</span>
                            )}
                            <span className="text-xs text-muted-foreground ml-2 italic">
                              sign by {entry.recorded_by_user?.name || entry.recorded_by_user?.email || "Staff"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-amber-100 rounded-full">
                          <User className="w-8 h-8 text-amber-400" />
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">No bowel entries</p>
                      <p className="text-sm text-gray-500">
                        No bowel entries recorded today
                      </p>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* Urine Tab */}
              <TabsContent value="urine" className="mt-4">
                {(() => {
                  const urineEntries = entries.filter(e => e.entry_type === "urine");

                  return urineEntries.length > 0 ? (
                    <div className="space-y-2">
                      {urineEntries.map((entry) => {
                        // Format color display
                        const colorDisplay = entry.urine_color
                          ? entry.urine_color.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                          : '';

                        // Format continence aid display
                        const aidDisplay = entry.continence_aid
                          ? entry.continence_aid.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                          : '';

                        return (
                          <div
                            key={entry.id}
                            className="text-sm border-b pb-2 last:border-b-0"
                          >
                            <span className="font-medium">{entry.time}</span>
                            {" - "}
                            <span className="text-muted-foreground">
                              Amount: {entry.urine_amount || 'N/A'}
                            </span>
                            {entry.urine_color && (
                              <>
                                {" | "}
                                <span className="text-muted-foreground">
                                  Color: {colorDisplay}
                                </span>
                              </>
                            )}
                            {entry.continence_aid && (
                              <>
                                {" | "}
                                <span className="text-muted-foreground">
                                  Aid: {aidDisplay}
                                </span>
                              </>
                            )}
                            {entry.notes && (
                              <>
                                <br />
                                <span className="text-muted-foreground text-xs">Notes: {entry.notes}</span>
                              </>
                            )}
                            <span className="text-xs text-muted-foreground ml-2 italic block mt-1">
                              sign by {entry.recorded_by_user?.name || entry.recorded_by_user?.email || "Staff"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Droplet className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">No urine entries</p>
                      <p className="text-sm text-gray-500">
                        No urine entries recorded today
                      </p>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Bowel Entry Dialog */}
      <Dialog open={isBowelDialogOpen} onOpenChange={setIsBowelDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Bowel Movement</DialogTitle>
            <DialogDescription className="text-sm">
              Select the stool type using the Bristol Stool Chart
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Bristol Stool Chart Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Bristol Stool Chart
              </Label>
              <RadioGroup
                value={selectedStoolType}
                onValueChange={setSelectedStoolType}
                className="grid grid-cols-3 gap-2"
              >
                {stoolTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`relative flex flex-col items-center rounded-lg border-2 p-2 cursor-pointer transition-all ${
                      selectedStoolType === type.id
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStoolType(type.id)}
                  >
                    <RadioGroupItem value={type.id} id={type.id} className="absolute top-1 right-1" />
                    <div className="flex flex-col items-center w-full">
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden mb-2">
                        {type.hasImage ? (
                          <Image
                            src={`/images/bristol-stool-chart/${type.id}.png`}
                            alt={type.label}
                            width={64}
                            height={64}
                            className="object-cover"
                          />
                        ) : (
                          <div className="text-center text-gray-400 text-xs px-1">
                            <p className="text-[10px]">Image</p>
                            <p className="text-[10px]">Soon</p>
                          </div>
                        )}
                      </div>
                      <div className="text-center w-full">
                        <Label
                          htmlFor={type.id}
                          className="text-xs font-semibold cursor-pointer block"
                        >
                          {type.label}
                        </Label>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Size</Label>
              <RadioGroup
                value={bowelSize}
                onValueChange={setBowelSize}
                className="grid grid-cols-4 gap-2"
              >
                <div
                  className={`relative flex items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all ${
                    bowelSize === "s"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setBowelSize("s")}
                >
                  <RadioGroupItem value="s" id="size_s" className="sr-only" />
                  <Label htmlFor="size_s" className="text-sm font-semibold cursor-pointer">
                    S
                  </Label>
                </div>
                <div
                  className={`relative flex items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all ${
                    bowelSize === "m"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setBowelSize("m")}
                >
                  <RadioGroupItem value="m" id="size_m" className="sr-only" />
                  <Label htmlFor="size_m" className="text-sm font-semibold cursor-pointer">
                    M
                  </Label>
                </div>
                <div
                  className={`relative flex items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all ${
                    bowelSize === "l"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setBowelSize("l")}
                >
                  <RadioGroupItem value="l" id="size_l" className="sr-only" />
                  <Label htmlFor="size_l" className="text-sm font-semibold cursor-pointer">
                    L
                  </Label>
                </div>
                <div
                  className={`relative flex items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all ${
                    bowelSize === "xl"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setBowelSize("xl")}
                >
                  <RadioGroupItem value="xl" id="size_xl" className="sr-only" />
                  <Label htmlFor="size_xl" className="text-sm font-semibold cursor-pointer">
                    XL
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Time and Staff */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="time" className="text-sm">Time</Label>
                <TimePicker
                  value={entryTime}
                  onChange={setEntryTime}
                  placeholder="Select time"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff" className="text-sm">Recorded By</Label>
                <Input
                  id="staff"
                  value={currentUserName}
                  disabled
                  className="h-9 bg-gray-50 text-gray-600 text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsBowelDialogOpen(false);
                  setSelectedStoolType("");
                  setBowelSize("");
                  setNotes("");
                  setEntryTime("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBowelSubmit}
                disabled={isSubmitting || !selectedStoolType || !bowelSize || !entryTime}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? "Saving..." : "Record Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Urine Entry Dialog - Step by Step */}
      <Dialog open={isUrineDialogOpen} onOpenChange={(open) => {
        setIsUrineDialogOpen(open);
        if (!open) resetUrineForm();
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Urine Output</DialogTitle>
            <DialogDescription className="text-sm">
              Step {urineStep} of 5
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Type */}
            {urineStep === 1 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-24 text-base ${urineType === "normal" ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                    onClick={() => setUrineType("normal")}
                  >
                    Normal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-24 text-base ${urineType === "catheter" ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                    onClick={() => setUrineType("catheter")}
                  >
                    Catheter
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Amount */}
            {urineStep === 2 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Amount</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-20 ${urineAmount === "small" ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                    onClick={() => {
                      setUrineAmount("small");
                      setUrineAmountMl("");
                    }}
                  >
                    Small
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-20 ${urineAmount === "medium" ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                    onClick={() => {
                      setUrineAmount("medium");
                      setUrineAmountMl("");
                    }}
                  >
                    Medium
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-20 ${urineAmount === "large" ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                    onClick={() => {
                      setUrineAmount("large");
                      setUrineAmountMl("");
                    }}
                  >
                    Large
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-20 ${urineAmount === "measured" ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                    onClick={() => setUrineAmount("measured")}
                  >
                    Measured (ml)
                  </Button>
                </div>
                {urineAmount === "measured" && (
                  <Input
                    type="number"
                    placeholder="Enter volume in ml"
                    value={urineAmountMl}
                    onChange={(e) => setUrineAmountMl(e.target.value)}
                    className="h-12 text-base"
                    min="0"
                    max="2000"
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Step 3: Color */}
            {urineStep === 3 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Color</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "clear_pale_yellow", label: "Clear / Pale Yellow" },
                    { value: "yellow", label: "Yellow" },
                    { value: "dark_yellow_amber", label: "Dark Yellow / Amber" },
                    { value: "brown", label: "Brown" },
                    { value: "red_blood", label: "Red / Blood Present" },
                    { value: "cloudy", label: "Cloudy" },
                  ].map((color) => (
                    <Button
                      key={color.value}
                      type="button"
                      variant="outline"
                      className={`h-12 justify-start ${urineColor === color.value ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                      onClick={() => setUrineColor(color.value)}
                    >
                      {color.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Continence Aid */}
            {urineStep === 4 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Continence Aid</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "toilet", label: "Toilet" },
                    { value: "commode", label: "Commode" },
                    { value: "bedpan", label: "Bedpan" },
                    { value: "urinal_bottle", label: "Urinal Bottle" },
                    { value: "pad", label: "Pad / Incontinence Pad" },
                    { value: "stoma", label: "Stoma / Urostomy" },
                  ].map((aid) => (
                    <Button
                      key={aid.value}
                      type="button"
                      variant="outline"
                      className={`h-12 justify-start ${continenceAid === aid.value ? "bg-blue-100 border-blue-400 text-blue-700" : ""}`}
                      onClick={() => setContinenceAid(aid.value)}
                    >
                      {aid.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Time, Staff & Notes */}
            {urineStep === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="urine_time" className="text-sm">Time</Label>
                    <TimePicker
                      value={entryTime}
                      onChange={setEntryTime}
                      placeholder="Select time"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="urine_staff" className="text-sm">Recorded By</Label>
                    <Input
                      id="urine_staff"
                      value={currentUserName}
                      disabled
                      className="h-9 bg-gray-50 text-gray-600 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="urine_notes" className="text-sm">Additional Notes (Optional)</Label>
                  <Textarea
                    id="urine_notes"
                    placeholder="Enter any additional observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (urineStep === 1) {
                    setIsUrineDialogOpen(false);
                    resetUrineForm();
                  } else {
                    setUrineStep(urineStep - 1);
                  }
                }}
                disabled={isSubmitting}
              >
                {urineStep === 1 ? "Cancel" : "Back"}
              </Button>

              {urineStep < 5 ? (
                <Button
                  type="button"
                  onClick={() => setUrineStep(urineStep + 1)}
                  disabled={
                    (urineStep === 2 && (!urineAmount || (urineAmount === "measured" && !urineAmountMl))) ||
                    (urineStep === 3 && !urineColor) ||
                    (urineStep === 4 && !continenceAid)
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleUrineSubmit}
                  disabled={isSubmitting || !entryTime}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Saving..." : "Record Entry"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
