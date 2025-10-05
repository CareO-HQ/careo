"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export default function FoodFluidPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  // Use optimized batched query (reduces 4 queries to 3!)
  const today = new Date().toISOString().split('T')[0];
  const batchedData = useQuery(api.foodFluidLogs.getResidentFoodFluidData, {
    residentId: id as Id<"residents">,
    date: today
  });

  // Extract resident, diet, and summary from batched response
  const resident = batchedData?.resident ?? null;
  const existingDiet = batchedData?.diet ?? null;
  const logSummary = batchedData?.summary ?? null;

  // Use separate server-filtered queries for food/fluid logs (better than client filtering!)
  const foodLogs = useQuery(api.foodFluidLogs.getTodayFoodLogs, {
    residentId: id as Id<"residents">,
    limit: 100
  });

  const fluidLogs = useQuery(api.foodFluidLogs.getTodayFluidLogs, {
    residentId: id as Id<"residents">,
    limit: 100
  });


  // Auth data
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

  // Mutations
  const createOrUpdateDietMutation = useMutation(api.diet.createOrUpdateDiet);
  const createFoodFluidLogMutation = useMutation(api.foodFluidLogs.createFoodFluidLog);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(1);

  // Food/Fluid Log Dialog state
  const [isFoodFluidDialogOpen, setIsFoodFluidDialogOpen] = React.useState(false);
  const [isLogLoading, setIsLogLoading] = React.useState(false);
  const [entryType, setEntryType] = React.useState<"food" | "fluid">("food");
  const [persistentStaffSignature, setPersistentStaffSignature] = React.useState(user?.user?.name || "");
  const [showLogAnotherActions, setShowLogAnotherActions] = React.useState(false);


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
  React.useEffect(() => {
    if (user?.user?.name && !persistentStaffSignature) {
      setPersistentStaffSignature(user.user.name);
      logForm.setValue('signature', user.user.name);
    }
  }, [user, persistentStaffSignature, logForm]);

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
      });
    }
  }, [existingDiet, form]);

  // Field array for allergies
  const { fields: allergyFields, append: appendAllergy, remove: removeAllergy } = useFieldArray({
    control: form.control,
    name: "allergies",
  });

  const MAX_ALLERGIES = 10;

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

  if (resident === null) {
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

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials =
    `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrentSection = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 7) return "midnight-7am";
    if (hour >= 7 && hour < 12) return "7am-12pm";
    if (hour >= 12 && hour < 17) return "12pm-5pm";
    return "5pm-midnight";
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
      if (!activeOrganization?.id || !user?.user?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      await createOrUpdateDietMutation({
        residentId: id as Id<"residents">,
        dietTypes: values.dietTypes,
        otherDietType: values.otherDietType,
        culturalRestrictions: values.culturalRestrictions,
        allergies: values.allergies,
        chokingRisk: values.chokingRisk,
        foodConsistency: values.foodConsistency,
        fluidConsistency: values.fluidConsistency,
        assistanceRequired: values.assistanceRequired,
        organizationId: activeOrganization.id,
        createdBy: user.user.id,
      });

      toast.success(existingDiet ? "Diet information updated successfully" : "Diet information saved successfully");
      setCurrentStep(1);
      setIsDialogOpen(false);
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
      if (!activeOrganization?.id || !user?.user?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      await createFoodFluidLogMutation({
        residentId: id as Id<"residents">,
        section: values.section,
        typeOfFoodDrink: values.typeOfFoodDrink,
        portionServed: entryType === "food" ? (values.portionServed || "N/A") : "N/A",
        amountEaten: values.amountEaten,
        fluidConsumedMl: values.fluidConsumedMl,
        signature: values.signature,
        organizationId: activeOrganization.id,
        createdBy: user.user.id,
      });

      // Update persistent signature from form
      setPersistentStaffSignature(values.signature);
      
      toast.success("Food/fluid entry logged successfully");

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



  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <span className="text-foreground">Food & Fluid</span>
      </div>

      {/* Header with resident info and action buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Utensils className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Food & Fluid</h1>
              <p className="text-muted-foreground">Nutrition & hydration tracking for {fullName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Resident Information Card with Action Buttons */}
      <Card className="border-0">
        <CardContent className="p-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Diet
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/food-fluid/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                See All Records
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-15 h-15">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{fullName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Diet
              </Button>
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
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Diet Information</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Edit Diet
                </Button>
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Food & Fluid Entry Buttons */}
      <Card>
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
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>Today&apos;s Food &amp; Fluid History</span>
            </div>
            <div className="flex flex-col space-y-2">
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 self-start">
                {new Date().toLocaleDateString()}
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
          <div id="food-fluid-history-content" className="space-y-6">
            {/* Food History Section - TOP */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Utensils className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-900">Food Intake</h3>
              </div>
              {(() => {
                // Use server-filtered foodLogs directly (no client-side filtering needed!)
                const sortedFoodLogs = foodLogs
                  ? [...foodLogs].sort((a, b) => b.timestamp - a.timestamp)
                  : [];

                return sortedFoodLogs.length > 0 ? (
                  <div className="border border-orange-200 bg-orange-50/30 rounded-lg p-4">
                    <div className="space-y-3">
                      {sortedFoodLogs.map((log, index) => (
                          <div key={log._id} className={`py-3 ${index !== sortedFoodLogs.length - 1 ? 'border-b border-orange-200' : ''}`}>
                            <div className="flex-1">
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
                                <div className="flex items-center space-x-2">
                                  <Utensils className="w-4 h-4 text-orange-600" />
                                  <span className="font-medium">{log.typeOfFoodDrink}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="text-xs bg-white">
                                    {getSectionDisplayName(log.section)}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${log.amountEaten === 'All' ? 'bg-green-100 text-green-800 border-green-300' :
                                      log.amountEaten === 'None' ? 'bg-red-100 text-red-800 border-red-300' :
                                        'bg-yellow-100 text-yellow-800 border-yellow-300'
                                      }`}
                                  >
                                    {log.amountEaten}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-sm text-gray-700">
                                <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                                  <p className="mb-1 md:mb-0">
                                    Portion: {log.portionServed}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })} • Logged by {log.signature}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
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
            </div>

            {/* Fluid History Section - BOTTOM */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Droplets className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Fluid Intake</h3>
              </div>
              {(() => {
                // Use server-filtered fluidLogs directly (no client-side filtering needed!)
                const sortedFluidLogs = fluidLogs
                  ? [...fluidLogs].sort((a, b) => b.timestamp - a.timestamp)
                  : [];

                return sortedFluidLogs.length > 0 ? (
                  <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4">
                    <div className="space-y-3">
                      {sortedFluidLogs.map((log, index) => (
                          <div key={log._id} className={`py-3 ${index !== sortedFluidLogs.length - 1 ? 'border-b border-blue-200' : ''}`}>
                            <div className="flex-1">
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
                                <div className="flex items-center space-x-2">
                                  <Droplets className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium">{log.typeOfFoodDrink}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="text-xs bg-white">
                                    {getSectionDisplayName(log.section)}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${log.amountEaten === 'All' ? 'bg-green-100 text-green-800 border-green-300' :
                                      log.amountEaten === 'None' ? 'bg-red-100 text-red-800 border-red-300' :
                                        'bg-yellow-100 text-yellow-800 border-yellow-300'
                                      }`}
                                  >
                                    {log.amountEaten}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-sm text-gray-700">
                                <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                                  <p className="mb-1 md:mb-0">
                                    {log.fluidConsumedMl ? `Volume: ${log.fluidConsumedMl}ml` : `Portion: ${log.portionServed}`}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })} • Logged by {log.signature}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
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
            </div>
          </div>
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
                    ? new Date(logSummary.lastRecorded).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
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
                      <Input
                        placeholder={
                          entryType === "food"
                            ? "e.g., Chicken, Toast, Soup..."
                            : "e.g., Water, Tea, Coffee, Juice..."
                        }
                        {...field}
                      />
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
                      <Input placeholder="Your name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFoodFluidDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLogLoading}>
                  {isLogLoading ? "Saving..." : "Log Entry"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}