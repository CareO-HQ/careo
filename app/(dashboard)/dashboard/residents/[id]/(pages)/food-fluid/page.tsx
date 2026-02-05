"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { canAddDietMenu, canLogFoodFluidEntry, canManageMenu } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Resident } from "@/types";
import { getUKTodayDate, formatTimestampToUKTime, formatDateForDisplay, UK_TIMEZONE } from "@/lib/date-utils";
import { formatInTimeZone } from "date-fns-tz";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Utensils,
  Droplets,
  Plus,
  Calendar,
  Clock,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Diet Form Schema
const DietFormSchema = z.object({
  dietTypes: z.array(z.string()).optional(),
  otherDietType: z.string().optional(),
  culturalRestrictions: z.string().optional(),
  allergies: z.array(z.object({
    allergy: z.string().min(1, "Allergy name is required")
  })).optional(),
  chokingRisk: z.enum(["low", "medium", "high"]).optional(),
  foodConsistency: z.enum(["level7", "level6", "level5", "level4", "level3"]).optional(),
  fluidConsistency: z.enum(["level0", "level1", "level2", "level3", "level4"]).optional(),
  assistanceRequired: z.enum(["yes", "no"]).optional(),
  chefNotified: z.enum(["yes", "no"]).optional(),
  chefName: z.string().optional(),
}).refine((data) => {
  if (data.chefNotified === "yes" && (!data.chefName || data.chefName.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Chef name is required if chef is notified",
  path: ["chefName"],
});

// Food/Fluid Log Form Schema
const FoodFluidLogSchema = z.object({
  section: z.enum(["midnight-7am", "7am-12pm", "12pm-5pm", "5pm-midnight"]),
  typeOfFoodDrink: z.string().min(1, "Please specify the food or drink").max(100, "Food/drink name too long"),
  portionServed: z.string().optional(),
  amountEaten: z.enum(["None", "1/4", "1/2", "3/4", "All"]),
  fluidConsumedMl: z.number().min(0, "Volume cannot be negative").max(2000, "Volume seems too high").optional().or(z.literal(0)),
  signature: z.string().min(1, "Signature is required").max(50, "Signature too long"),
}).refine((data) => {
  // If it's a food entry (not in fluid list), portionServed should be required
  const fluidTypes = ['Water', 'Tea', 'Coffee', 'Juice', 'Milk', 'Soup', 'Smoothie'];
  const isFluid = fluidTypes.some(type => data.typeOfFoodDrink.toLowerCase().includes(type.toLowerCase()));
  return isFluid || (data.portionServed && data.portionServed.length > 0);
}, {
  message: "Portion served is required for food entries",
  path: ["portionServed"]
});

export default function FoodFluidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [resident, setResident] = useState<Resident | null>(null);
  const [existingDiet, setExistingDiet] = useState<any>(null);
  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  const [fluidLogs, setFluidLogs] = useState<any[]>([]);
  const [logSummary, setLogSummary] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [isAddingDish, setIsAddingDish] = useState(false);
  const [dishName, setDishName] = useState("");

  const { profile } = useProfile();
  const userRole = profile?.role;
  const canManageDietActions = canAddDietMenu(userRole);
  const canManageMenuActions = canManageMenu(userRole);
  const canLogEntries = canLogFoodFluidEntry(userRole);

  const fetchData = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      // Fetch resident
      const { data: residentData } = await supabase
        .from("residents")
        .select("*")
        .eq("id", id)
        .single();

      if (residentData) setResident(residentData as Resident);

      // Fetch diet
      const { data: dietData } = await supabase
        .from("diet_lifestyle")
        .select("*")
        .eq("resident_id", id)
        .single();

      if (dietData) {
        setExistingDiet({
          id: dietData.id,
          residentId: dietData.resident_id,
          organizationId: dietData.organization_id,
          dietTypes: dietData.diet_types || [],
          otherDietType: dietData.other_diet_type || "",
          culturalRestrictions: dietData.cultural_restrictions || "",
          allergies: dietData.allergies || [],
          chokingRisk: dietData.choking_risk,
          foodConsistency: dietData.food_consistency,
          fluidConsistency: dietData.fluid_consistency,
          assistanceRequired: dietData.assistance_required,
          chefNotified: dietData.chef_notified,
          chefName: dietData.chef_name,
        });
      }

      // Use UK timezone for today's date
      const today = getUKTodayDate();

      // Fetch food logs for today
      const { data: foodData } = await supabase
        .from("food_fluid_logs")
        .select("*")
        .eq("resident_id", id)
        .eq("date", today)
        .is("fluid_consumed_ml", null) // Corrected: Use is null check if possible, or filter in JS
        .order("timestamp", { ascending: false });

      // Filter out fluid entries safely
      if (foodData) setFoodLogs(foodData.filter(log => log.fluid_consumed_ml === null));

      // Fetch fluid logs for today
      const { data: fluidData } = await supabase
        .from("food_fluid_logs")
        .select("*")
        .eq("resident_id", id)
        .eq("date", today)
        .not("fluid_consumed_ml", "is", null)
        .order("timestamp", { ascending: false });

      if (fluidData) setFluidLogs(fluidData);

      if (foodData || fluidData) {
        const totalFluid = (fluidData || []).reduce((acc: number, log: any) => acc + (log.fluid_consumed_ml || 0), 0);
        setLogSummary({
          foodEntries: foodData?.length || 0,
          totalFluidIntakeMl: totalFluid,
          lastRecorded: (foodData?.[0]?.timestamp || fluidData?.[0]?.timestamp)
        });
      }

      // Fetch menu items only if organization ID is available
      if (profile?.active_organization_id) {
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("*")
          .eq("organization_id", profile.active_organization_id)
          .order("name", { ascending: true });

        if (menuData) setMenuItems(menuData);
      }

    } catch (error) {
      console.error("Error fetching food/fluid data:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [id, profile?.active_organization_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // Auth data
  // const { data: activeOrganization } = authClient.useActiveOrganization(); // Removed Convex hook
  // const { data: user } = authClient.useSession(); // Removed Convex hook
  // const { data: member } = authClient.useActiveMember(); // Removed Convex hook
  // const userRole = member?.role; // Replaced with useProfile
  // const canManageDietActions = canAddDietMenu(userRole); // Replaced with useProfile
  // const canLogEntries = canLogFoodFluidEntry(userRole); // Replaced with useProfile

  // Mutations (Removed Convex hooks)
  // const createOrUpdateDietMutation = useMutation(api.diet.createOrOrUpdateDiet);
  // const createFoodFluidLogMutation = useMutation(api.foodFluidLogs.createFoodFluidLog);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(1);

  // Food/Fluid Log Dialog state
  const [isFoodFluidDialogOpen, setIsFoodFluidDialogOpen] = React.useState(false);
  const [isLogLoading, setIsLogLoading] = React.useState(false);
  const [entryType, setEntryType] = React.useState<"food" | "fluid">("food");
  const [persistentStaffSignature, setPersistentStaffSignature] = React.useState(profile?.name || "");
  const [showLogAnotherActions, setShowLogAnotherActions] = React.useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = React.useState<string>("food");


  // Form setup
  const form = useForm<z.infer<typeof DietFormSchema>>({
    resolver: zodResolver(DietFormSchema),
    mode: "onSubmit", // Only validate on submit, not onChange
    defaultValues: {
      dietTypes: [],
      otherDietType: "",
      culturalRestrictions: "",
      allergies: [],
      chokingRisk: undefined,
      foodConsistency: undefined,
      fluidConsistency: undefined,
      assistanceRequired: undefined,
      chefNotified: undefined,
      chefName: "",
    },
  });

  // Food/Fluid Log Form setup
  const logForm = useForm<z.infer<typeof FoodFluidLogSchema>>({
    resolver: zodResolver(FoodFluidLogSchema),
    defaultValues: {
      section: "7am-12pm",
      typeOfFoodDrink: "",
      portionServed: "",
      amountEaten: "All",
      fluidConsumedMl: undefined,
      signature: persistentStaffSignature,
    },
  });

  // Update persistent signature when user changes
  useEffect(() => {
    if (profile?.name && !persistentStaffSignature) {
      setPersistentStaffSignature(profile.name);
      logForm.setValue('signature', profile.name);
    }
  }, [profile, persistentStaffSignature, logForm]);

  // Watch the typeOfFoodDrink field to show/hide fluid input


  // Update form when existing diet data is loaded
  React.useEffect(() => {
    if (existingDiet) {
      form.reset({
        dietTypes: existingDiet.dietTypes || [],
        otherDietType: existingDiet.otherDietType || "",
        culturalRestrictions: existingDiet.culturalRestrictions || "",
        allergies: existingDiet.allergies || [],
        chokingRisk: existingDiet.chokingRisk,
        foodConsistency: existingDiet.foodConsistency,
        fluidConsistency: existingDiet.fluidConsistency,
        assistanceRequired: existingDiet.assistanceRequired,
        chefNotified: existingDiet.chef_notified,
        chefName: existingDiet.chef_name || "",
      });
    }
  }, [existingDiet, form]);

  // Field array for allergies
  const { fields: allergyFields, append: appendAllergy, remove: removeAllergy } = useFieldArray({
    control: form.control,
    name: "allergies",
  });

  const MAX_ALLERGIES = 10;

  // Loading state - matches daily-care pattern
  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!resident) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
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
      </div>
    );
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;
  const initials =
    `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();

  const getCurrentDate = () => {
    return formatDateForDisplay(getUKTodayDate());
  };

  const getCurrentSection = () => {
    // Get current hour in UK timezone
    const ukNow = formatInTimeZone(new Date(), UK_TIMEZONE, "HH");
    const hour = parseInt(ukNow);
    if (hour >= 0 && hour < 7) return "midnight-7am";
    if (hour >= 7 && hour < 12) return "7am-12pm";
    if (hour >= 12 && hour < 17) return "12pm-5pm";
    return "5pm-midnight";
  };

  const getCurrentTime = () => {
    return formatTimestampToUKTime(new Date());
  };

  const getSectionDisplayName = (section: string) => {
    const timeMap: Record<string, string> = {
      "midnight-7am": "Midnight - 7:00 AM",
      "7am-12pm": "7:00 AM - 12:00 PM",
      "12pm-5pm": "12:00 PM - 5:00 PM",
      "5pm-midnight": "5:00 PM - Midnight"
    };
    return timeMap[section] || section;
  };



  const onSubmit = async (values: z.infer<typeof DietFormSchema>) => {
    // Prevent submission if not on the final step
    if (currentStep !== 3) {
      console.log('Form submission prevented - not on final step. Current step:', currentStep);
      return;
    }

    setIsLoading(true);
    try {
      if (!profile?.active_organization_id || !profile?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      const { error } = await supabase
        .from("diet_lifestyle")
        .upsert({
          resident_id: id,
          organization_id: profile.active_organization_id,
          diet_types: values.dietTypes,
          other_diet_type: values.otherDietType,
          cultural_restrictions: values.culturalRestrictions,
          allergies: values.allergies,
          choking_risk: values.chokingRisk,
          food_consistency: values.foodConsistency,
          fluid_consistency: values.fluidConsistency,
          assistance_required: values.assistanceRequired,
          chef_notified: values.chefNotified,
          chef_name: values.chefName,
          created_by: profile.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'resident_id' });

      if (error) throw error;

      toast.success(existingDiet ? "Diet information updated successfully" : "Diet information saved successfully");
      setCurrentStep(1);
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save diet information");
      console.error("Error saving diet:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleDietTypeChange = (dietType: string, checked: boolean) => {
    const currentDietTypes = form.getValues("dietTypes") || [];
    if (checked) {
      form.setValue("dietTypes", [...currentDietTypes, dietType]);
    } else {
      form.setValue("dietTypes", currentDietTypes.filter(type => type !== dietType));
    }
  };

  // Food/Fluid Log submission
  const onFoodFluidLogSubmit = async (values: z.infer<typeof FoodFluidLogSchema>) => {
    setIsLogLoading(true);
    try {
      if (!profile?.active_organization_id || !profile?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      const { error } = await supabase
        .from("food_fluid_logs")
        .insert({
          resident_id: id,
          organization_id: profile.active_organization_id,
          section: values.section,
          type_of_food_drink: values.typeOfFoodDrink,
          portion_served: entryType === "food" ? (values.portionServed || "N/A") : "N/A",
          amount_eaten: values.amountEaten,
          fluid_consumed_ml: values.fluidConsumedMl,
          signature: values.signature,
          date: getUKTodayDate(), // Use UK timezone date
          timestamp: new Date().toISOString(), // Keep ISO timestamp for database
          created_by: profile.id,
        });

      if (error) throw error;

      // Update persistent signature from form
      setPersistentStaffSignature(values.signature);

      toast.success("Food/fluid entry logged successfully");
      fetchData();

      // Reset form for next entry but preserve signature
      logForm.reset({
        section: getCurrentSection(),
        typeOfFoodDrink: "",
        portionServed: "",
        amountEaten: "All",
        fluidConsumedMl: undefined,
        signature: values.signature, // Keep the current signature
      });

      // Show quick actions for a few seconds
      setShowLogAnotherActions(true);
      setTimeout(() => setShowLogAnotherActions(false), 5000);

      setIsFoodFluidDialogOpen(false);
    } catch (error) {
      toast.error("Failed to log food/fluid entry");
      console.error("Error logging food/fluid:", error);
    } finally {
      setIsLogLoading(false);
    }
  };

  // Handle Log Another actions
  const handleLogAnother = (type: "food" | "fluid") => {
    setEntryType(type);
    logForm.setValue("section", getCurrentSection());
    logForm.setValue("typeOfFoodDrink", type === "fluid" ? "Water" : "");
    logForm.setValue("fluidConsumedMl", undefined);
    setIsFoodFluidDialogOpen(true);
    setShowLogAnotherActions(false);
  };

  const handleAddDish = async () => {
    if (!dishName.trim()) return;
    setIsAddingDish(true);
    try {
      if (!profile?.active_organization_id || !profile?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          name: dishName.trim(),
          organization_id: profile.active_organization_id,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      setMenuItems(prev => [...prev, data]);
      setDishName("");
      toast.success("Dish added to menu");
    } catch (error) {
      toast.error("Failed to add dish");
      console.error("Error adding dish:", error);
    } finally {
      setIsAddingDish(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", dishId);

      if (error) throw error;

      setMenuItems(prev => prev.filter(item => item.id !== dishId));
      toast.success("Dish removed from menu");
    } catch (error) {
      toast.error("Failed to remove dish");
      console.error("Error removing dish:", error);
    }
  };



  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={resident?.image_url || ""} alt={fullName} className="border" />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Food & Fluid</h1>
            <p className="text-muted-foreground text-sm">
              View nutrition and hydration tracking for {resident?.first_name} {resident?.last_name}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            {canManageDietActions && (
              <>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Diet
                </Button>
                {canManageMenuActions && (
                  <Button
                    variant="outline"
                    onClick={() => setIsMenuDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Menu
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/residents/${id}/food-fluid/documents`)}
            >
              <Eye className="w-4 h-4 mr-2" />
              See All Records
            </Button>
          </div>
        </div>

        {/* Diet Information Section */}
        {existingDiet && (
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Diet Information</span>
                </div>
                {canManageDietActions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Edit Diet
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Diet Types */}
                {(existingDiet.dietTypes && existingDiet.dietTypes.length > 0 ||
                  existingDiet.otherDietType ||
                  existingDiet.culturalRestrictions) && (
                    <div>
                      <p className="text-[11px] font-medium text-gray-500 mb-1">
                        Diet Types
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {existingDiet.dietTypes?.map((diet, i) => (
                          <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {diet}
                          </Badge>
                        ))}
                        {existingDiet.otherDietType && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {existingDiet.otherDietType}
                          </Badge>
                        )}
                        {existingDiet.culturalRestrictions && (
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                            {existingDiet.culturalRestrictions}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                {/* Allergies */}
                {existingDiet.allergies && existingDiet.allergies.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">
                      Allergies
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {existingDiet.allergies?.map((a, i) => (
                        <Badge key={i} className="bg-red-100 text-red-800 border-red-300 text-xs">
                          {a.allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistance */}
                {existingDiet.assistanceRequired && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">
                      Assistance
                    </p>
                    <Badge
                      className={`text-xs ${existingDiet.assistanceRequired === "yes"
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                        : "bg-green-100 text-green-800 border-green-300"
                        }`}
                    >
                      {existingDiet.assistanceRequired === "yes"
                        ? "Assistance Required"
                        : "Independent"}
                    </Badge>
                  </div>
                )}

                {/* Choking Risk */}
                {existingDiet.chokingRisk && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">
                      Choking Risk
                    </p>
                    <Badge
                      className={`text-xs ${existingDiet.chokingRisk === "high"
                        ? "bg-red-100 text-red-800 border-red-300"
                        : existingDiet.chokingRisk === "medium"
                          ? "bg-orange-100 text-orange-800 border-orange-300"
                          : "bg-green-100 text-green-800 border-green-300"
                        }`}
                    >
                      {existingDiet.chokingRisk === "high"
                        ? "High Risk"
                        : existingDiet.chokingRisk === "medium"
                          ? "Medium Risk"
                          : "Low Risk"}
                    </Badge>
                  </div>
                )}

                {/* Food Consistency */}
                {existingDiet.foodConsistency && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">
                      Food Consistency
                    </p>
                    <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs">
                      {existingDiet.foodConsistency === "level7" && "Level 7 - Easy Chew"}
                      {existingDiet.foodConsistency === "level6" && "Level 6 - Soft & Bite-sized"}
                      {existingDiet.foodConsistency === "level5" && "Level 5 - Minced & Moist"}
                      {existingDiet.foodConsistency === "level4" && "Level 4 - Pureed"}
                      {existingDiet.foodConsistency === "level3" && "Level 3 - Liquidised"}
                    </Badge>
                  </div>
                )}

                {/* Fluid Consistency */}
                {existingDiet.fluidConsistency && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">
                      Fluid Consistency
                    </p>
                    <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-xs">
                      {existingDiet.fluidConsistency === "level0" && "Level 0 - Thin"}
                      {existingDiet.fluidConsistency === "level1" && "Level 1 - Slightly Thick"}
                      {existingDiet.fluidConsistency === "level2" && "Level 2 - Mildly Thick"}
                      {existingDiet.fluidConsistency === "level3" && "Level 3 - Moderately Thick"}
                      {existingDiet.fluidConsistency === "level4" && "Level 4 - Extremely Thick"}
                    </Badge>
                  </div>
                )}

                {/* Chef Notification */}
                {existingDiet.chefNotified && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">
                      Chef Notified
                    </p>
                    <Badge
                      className={`text-xs ${existingDiet.chefNotified === "yes"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-gray-100 text-gray-800 border-gray-300"
                        }`}
                    >
                      {existingDiet.chefNotified === "yes"
                        ? `Notified: ${existingDiet.chefName || "Yes"}`
                        : "Not Notified"}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Food & Fluid Entry Buttons */}
        {canLogEntries && (
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Utensils className="w-5 h-5 text-gray-600" />
                <span>Log Food & Fluid Intake</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-16 text-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 hover:border-orange-300"
                  onClick={() => {
                    setEntryType("food");
                    logForm.setValue("section", getCurrentSection());
                    logForm.setValue("typeOfFoodDrink", "");
                    logForm.setValue("fluidConsumedMl", undefined);
                    setIsFoodFluidDialogOpen(true);
                  }}
                >
                  <Utensils className="w-6 h-6 mr-3" />
                  Log Food Entry
                </Button>

                <Button
                  variant="outline"
                  className="h-16 text-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300"
                  onClick={() => {
                    setEntryType("fluid");
                    logForm.setValue("section", getCurrentSection());
                    logForm.setValue("typeOfFoodDrink", "Water");
                    setIsFoodFluidDialogOpen(true);
                  }}
                >
                  <Droplets className="w-6 h-6 mr-3" />
                  Log Fluid Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Log Another Actions */}
        {showLogAnotherActions && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Entry logged successfully!</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogAnotherActions(false)}
                  className="text-green-600 hover:text-green-800"
                >
                  ×
                </Button>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLogAnother("food")}
                  className="flex-1 border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  Log Another Food
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLogAnother("fluid")}
                  className="flex-1 border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Droplets className="w-4 h-4 mr-2" />
                  Log Another Fluid
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Food & Fluid History */}
        <Card className="border-0">
          <CardHeader>
            {/* Mobile Layout */}
            <CardTitle className="block sm:hidden">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <span>Today&apos;s Food &amp; Fluid History</span>
              </div>
              <div className="flex flex-col space-y-2">
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 self-start">
                  {formatInTimeZone(new Date(), UK_TIMEZONE, "dd MMM yyyy")}
                </Badge>
              </div>
            </CardTitle>

            {/* Desktop Layout */}
            <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span>Today&apos;s Food &amp; Fluid History</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                  {getCurrentDate()}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/residents/${id}/food-fluid/documents`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View All Records
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeHistoryTab} onValueChange={setActiveHistoryTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="food" className="text-sm">Food</TabsTrigger>
                <TabsTrigger value="fluid" className="text-sm">Fluid</TabsTrigger>
              </TabsList>

              {/* Food Tab */}
              <TabsContent value="food" className="mt-4">
                {(() => {
                  const sortedFoodLogs = foodLogs
                    ? [...foodLogs].sort((a, b) => b.timestamp - a.timestamp)
                    : [];

                  return sortedFoodLogs.length > 0 ? (
                    <div className="space-y-2">
                      {sortedFoodLogs.map((log) => (
                        <div key={log.id} className="text-sm border-b pb-2 last:border-b-0">
                          <span className="font-medium">
                            {formatTimestampToUKTime(new Date(log.timestamp))}
                          </span>
                          {" - "}
                          <span className="text-muted-foreground">{log.type_of_food_drink}</span>
                          <span className="text-muted-foreground"> - Portion: {log.portion_served}</span>
                          <span className="text-muted-foreground"> - Amount: {log.amount_eaten}</span>
                          <span className="text-xs text-muted-foreground ml-2 italic">sign by {log.signature}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-orange-100 rounded-full">
                          <Utensils className="w-8 h-8 text-orange-400" />
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">No food entries logged today</p>
                      <p className="text-sm text-gray-500">
                        Start tracking {fullName}&apos;s food intake using the food entry button above
                      </p>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* Fluid Tab */}
              <TabsContent value="fluid" className="mt-4">
                {(() => {
                  const sortedFluidLogs = fluidLogs
                    ? [...fluidLogs].sort((a, b) => b.timestamp - a.timestamp)
                    : [];

                  return sortedFluidLogs.length > 0 ? (
                    <div className="space-y-2">
                      {sortedFluidLogs.map((log) => (
                        <div key={log.id} className="text-sm border-b pb-2 last:border-b-0">
                          <span className="font-medium">
                            {formatTimestampToUKTime(new Date(log.timestamp))}
                          </span>
                          {" - "}
                          <span className="text-muted-foreground">{log.type_of_food_drink}</span>
                          <span className="text-muted-foreground">
                            {log.fluid_consumed_ml ? ` - Volume: ${log.fluid_consumed_ml}ml` : ` - Portion: ${log.portion_served}`}
                          </span>
                          <span className="text-muted-foreground"> - Amount: {log.amount_eaten}</span>
                          <span className="text-xs text-muted-foreground ml-2 italic">sign by {log.signature}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Droplets className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">No fluid entries logged today</p>
                      <p className="text-sm text-gray-500">
                        Start tracking {fullName}&apos;s fluid intake using the fluid entry button above
                      </p>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card className="border-0">
          <CardHeader className="">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">Today&apos;s Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 border border-orange-200">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {logSummary?.foodEntries ?? 0}
                  </div>
                  <p className="text-sm font-medium text-orange-700">Food Entries</p>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-10">
                  <Utensils className="w-16 h-16 text-orange-600" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {logSummary?.totalFluidIntakeMl ?? 0}ml
                  </div>
                  <p className="text-sm font-medium text-blue-700">Fluid Intake</p>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-10">
                  <Droplets className="w-16 h-16 text-blue-600" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 border border-gray-200">
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-gray-600 mb-1">
                    {logSummary?.lastRecorded
                      ? formatTimestampToUKTime(new Date(logSummary.lastRecorded))
                      : "--:--"
                    }
                  </div>
                  <p className="text-sm font-medium text-gray-700">Last Recorded</p>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-10">
                  <Clock className="w-16 h-16 text-gray-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Diet Dialog - Multi-Step */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setCurrentStep(1);
            // Reset form to current existing data or defaults when closing
            if (existingDiet) {
              form.reset({
                dietTypes: existingDiet.dietTypes || [],
                otherDietType: existingDiet.otherDietType || "",
                culturalRestrictions: existingDiet.culturalRestrictions || "",
                allergies: existingDiet.allergies || [],
                chokingRisk: existingDiet.chokingRisk,
                foodConsistency: existingDiet.foodConsistency,
                fluidConsistency: existingDiet.fluidConsistency,
                assistanceRequired: existingDiet.assistanceRequired,
              });
            } else {
              form.reset({
                dietTypes: [],
                otherDietType: "",
                culturalRestrictions: "",
                allergies: [],
                chokingRisk: undefined,
                foodConsistency: undefined,
                fluidConsistency: undefined,
                assistanceRequired: undefined,
              });
            }
          }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{existingDiet ? 'Edit' : 'Add'} Diet Information for {fullName}</DialogTitle>
              <DialogDescription>
                Step {currentStep} of 3: {currentStep === 1 ? 'Diet Types & Preferences' : currentStep === 2 ? 'Allergies & Consistency Levels' : 'Assistance & Summary'}
              </DialogDescription>
            </DialogHeader>


            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Step 1: Diet Types & Preferences */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <FormLabel className="text-sm font-medium">Diet Types</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          'Regular Diet',
                          'Diabetic Diet',
                          'Vegetarian',
                          'Vegan',
                          'Kosher',
                          'Halal',
                          'Low Sodium',
                          'Gluten-Free',
                          'Dairy-Free',
                          'Soft Diet',
                          'Pureed Diet',
                          'Liquid Diet'
                        ].map((dietType) => (
                          <div key={dietType} className="flex items-center space-x-2">
                            <Checkbox
                              id={dietType}
                              checked={form.watch('dietTypes')?.includes(dietType) || false}
                              onCheckedChange={(checked) => handleDietTypeChange(dietType, checked as boolean)}
                            />
                            <label
                              htmlFor={dietType}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {dietType}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="otherDietType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Diet Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Specify other dietary requirements..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="culturalRestrictions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cultural/Religious Restrictions</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., No pork, No beef, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Allergies & Consistency Levels */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <FormLabel>Allergies</FormLabel>
                      {allergyFields.map((field, index) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name={`allergies.${index}.allergy`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input placeholder="Enter allergy..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAllergy(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      {allergyFields.length < MAX_ALLERGIES && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendAllergy({ allergy: "" })}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Allergy
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="chokingRisk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Choking Risk Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select choking risk level..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="foodConsistency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Food Consistency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select food consistency level..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="level7">Level 7 - Easy Chew</SelectItem>
                              <SelectItem value="level6">Level 6 - Soft & Bite-sized</SelectItem>
                              <SelectItem value="level5">Level 5 - Minced & Moist</SelectItem>
                              <SelectItem value="level4">Level 4 - Pureed</SelectItem>
                              <SelectItem value="level3">Level 3 - Liquidised</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fluidConsistency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fluid Consistency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fluid consistency level..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="level0">Level 0 - Thin</SelectItem>
                              <SelectItem value="level1">Level 1 - Slightly Thick</SelectItem>
                              <SelectItem value="level2">Level 2 - Mildly Thick</SelectItem>
                              <SelectItem value="level3">Level 3 - Moderately Thick</SelectItem>
                              <SelectItem value="level4">Level 4 - Extremely Thick</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 3: Assistance & Summary */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="assistanceRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assistance Required</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-3"
                            >
                              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                <RadioGroupItem value="yes" id="yes" />
                                <div>
                                  <label htmlFor="yes" className="text-sm font-medium cursor-pointer">Yes, assistance required</label>
                                  <p className="text-xs text-muted-foreground">Resident needs help with eating and drinking</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                <RadioGroupItem value="no" id="no" />
                                <div>
                                  <label htmlFor="no" className="text-sm font-medium cursor-pointer">No, independent</label>
                                  <p className="text-xs text-muted-foreground">Resident can eat and drink independently</p>
                                </div>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="chefNotified"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chef Notified?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="yes" id="chef-yes" />
                                  <label htmlFor="chef-yes" className="text-sm cursor-pointer">Yes</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="no" id="chef-no" />
                                  <label htmlFor="chef-no" className="text-sm cursor-pointer">No</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("chefNotified") === "yes" && (
                        <FormField
                          control={form.control}
                          name="chefName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chef Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter chef's name..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Summary</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        {(() => {
                          const formValues = form.watch();
                          return (
                            <>
                              {formValues.dietTypes?.length && formValues.dietTypes.length > 0 && (
                                <p>Diet Types: {formValues.dietTypes.join(', ')}</p>
                              )}
                              {formValues.chokingRisk && (
                                <p>Choking Risk: {formValues.chokingRisk}</p>
                              )}
                              {formValues.foodConsistency && (
                                <p>Food Consistency: {formValues.foodConsistency}</p>
                              )}
                              {formValues.fluidConsistency && (
                                <p>Fluid Consistency: {formValues.fluidConsistency}</p>
                              )}
                              {formValues.chefNotified === "yes" && (
                                <p>Chef Notified: {formValues.chefName}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <div>
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(currentStep - 1)}
                      >
                        Previous
                      </Button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>

                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={() => setCurrentStep(currentStep + 1)}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          // Only submit when explicitly clicking save
                          form.handleSubmit(onSubmit)();
                        }}
                      >
                        {isLoading ? "Saving..." : existingDiet ? "Update Diet Information" : "Save Diet Information"}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add Menu Dialog */}
        <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Management Menu Items</DialogTitle>
              <DialogDescription>
                Add or remove dishes from the list. These will appear when logging food entries.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter dish name (e.g., Roast Chicken)..."
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDish();
                    }
                  }}
                />
                <Button onClick={handleAddDish} disabled={isAddingDish || !dishName.trim()}>
                  {isAddingDish ? "Adding..." : "Add"}
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Already Added Menu Items</Label>
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  {menuItems.length > 0 ? (
                    <div className="divide-y">
                      {menuItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                          <span className="text-sm font-medium">{item.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDish(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="text-sm">No dishes added to the menu yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsMenuDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Food/Fluid Log Dialog */}
        <Dialog open={isFoodFluidDialogOpen} onOpenChange={setIsFoodFluidDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                Log {entryType === "food" ? "Food" : "Fluid"} Entry for {fullName}
              </DialogTitle>
              <DialogDescription>
                Record {entryType === "food" ? "food consumption" : "fluid intake"} details. Current time: {getCurrentTime()}
              </DialogDescription>
            </DialogHeader>

            <Form {...logForm}>
              <form onSubmit={logForm.handleSubmit(onFoodFluidLogSubmit)} className="space-y-4">
                {/* Section */}
                <FormField
                  control={logForm.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Section</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time section..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="midnight-7am">Midnight - 7:00 AM</SelectItem>
                          <SelectItem value="7am-12pm">7:00 AM - 12:00 PM</SelectItem>
                          <SelectItem value="12pm-5pm">12:00 PM - 5:00 PM</SelectItem>
                          <SelectItem value="5pm-midnight">5:00 PM - Midnight</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Type of Food/Drink */}
                <FormField
                  control={logForm.control}
                  name="typeOfFoodDrink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {entryType === "food" ? "Type of Food" : "Type of Fluid"}
                      </FormLabel>
                      <FormControl>
                        {entryType === "food" ? (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select food item..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {menuItems.length > 0 ? (
                                menuItems.map((item) => (
                                  <SelectItem key={item.id} value={item.name}>
                                    {item.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground">No menu items added. Please add menu items first.</div>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="e.g., Water, Tea, Coffee, Juice..."
                            {...field}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Portion Served (Food only) */}
                {entryType === "food" && (
                  <FormField
                    control={logForm.control}
                    name="portionServed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portion Served</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select portion size..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Full Plate">Full Plate</SelectItem>
                            <SelectItem value="Half Plate">Half Plate</SelectItem>
                            <SelectItem value="Quarter Plate">Quarter Plate</SelectItem>
                            <SelectItem value="1 slice">1 slice</SelectItem>
                            <SelectItem value="2 slices">2 slices</SelectItem>
                            <SelectItem value="1 scoop">1 scoop</SelectItem>
                            <SelectItem value="2 scoops">2 scoops</SelectItem>
                            <SelectItem value="Small portion">Small portion</SelectItem>
                            <SelectItem value="Regular portion">Regular portion</SelectItem>
                            <SelectItem value="Large portion">Large portion</SelectItem>
                            <SelectItem value="1 cup">1 cup</SelectItem>
                            <SelectItem value="1 bowl">1 bowl</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Amount Eaten/Consumed */}
                <FormField
                  control={logForm.control}
                  name="amountEaten"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Consumed</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select amount consumed..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="1/4">1/4</SelectItem>
                          <SelectItem value="1/2">1/2</SelectItem>
                          <SelectItem value="3/4">3/4</SelectItem>
                          <SelectItem value="All">All</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fluid Volume (Fluid only) */}
                {entryType === "fluid" && (
                  <FormField
                    control={logForm.control}
                    name="fluidConsumedMl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume (ml)</FormLabel>
                        <div className="space-y-2">
                          <Select
                            onValueChange={(value) => {
                              if (value === "custom") {
                                // Don't set value for custom, let user input manually
                                return;
                              }
                              field.onChange(parseInt(value));
                            }}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select volume or container..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="custom">Custom Amount</SelectItem>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                Common Containers
                              </div>
                              <SelectItem value="200">Small Glass (200ml)</SelectItem>
                              <SelectItem value="250">Cup (250ml)</SelectItem>
                              <SelectItem value="330">Can (330ml)</SelectItem>
                              <SelectItem value="500">Bottle (500ml)</SelectItem>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                Specific Amounts
                              </div>
                              <SelectItem value="50">50ml</SelectItem>
                              <SelectItem value="100">100ml</SelectItem>
                              <SelectItem value="150">150ml</SelectItem>
                              <SelectItem value="300">300ml</SelectItem>
                              <SelectItem value="400">400ml</SelectItem>
                              <SelectItem value="600">600ml</SelectItem>
                              <SelectItem value="750">750ml</SelectItem>
                              <SelectItem value="1000">1000ml (1L)</SelectItem>
                            </SelectContent>
                          </Select>
                          {/* Show custom input when custom is selected or no preset matches */}
                          {(!field.value || ![50, 100, 150, 200, 250, 300, 330, 400, 500, 600, 750, 1000].includes(field.value)) && (
                            <Input
                              type="number"
                              placeholder="Enter custom amount in ml..."
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              min="0"
                              max="2000"
                            />
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Signature */}
                <FormField
                  control={logForm.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Signature</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your name..."
                          {...field}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFoodFluidDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLogLoading}
                  >
                    {isLogLoading ? "Saving..." : "Save Entry"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}