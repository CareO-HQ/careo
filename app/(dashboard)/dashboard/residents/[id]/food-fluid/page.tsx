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
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Utensils,
  Droplets,
  Plus,
  Calendar,
  Clock,
  Eye,
  X,
  Trash2
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

type FoodFluidPageProps = {
  params: Promise<{ id: string }>;
};

export default function FoodFluidPage({ params }: FoodFluidPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get existing diet information
  const existingDiet = useQuery(api.diet.getDietByResidentId, {
    residentId: id as Id<"residents">
  });

  // Auth data
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

  // Mutations
  const createOrUpdateDietMutation = useMutation(api.diet.createOrUpdateDiet);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState(1);

  // Form setup
  const form = useForm<z.infer<typeof DietFormSchema>>({
    resolver: zodResolver(DietFormSchema),
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

  const onSubmit = async (values: z.infer<typeof DietFormSchema>) => {
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
      
      toast.success("Diet information saved successfully");
      form.reset();
      setStep(1);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save diet information");
      console.error("Error saving diet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      // Validate step 1 fields
      const valid = await form.trigger(["dietTypes", "otherDietType", "culturalRestrictions", "allergies"]);
      if (valid) setStep(2);
      else toast.error("Please fill the required fields in this step.");
    } else if (step === 2) {
      // Validate step 2 fields  
      const valid = await form.trigger(["chokingRisk", "foodConsistency", "fluidConsistency"]);
      if (valid) setStep(3);
      else toast.error("Please select the required options in this step.");
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
      <Card className="border-0 ">
        <CardContent className="">
          <div className="flex items-center justify-between">
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
                    Today
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Diet
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Utensils className="w-5 h-5" />
                      <span>Dietary Requirements & Restrictions</span>
                    </DialogTitle>
                    <DialogDescription>
                      Set up dietary requirements, allergies, and assistance needs for {fullName}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-2xl mx-auto">
                      
                      {/* Step 1: Diet Types & Allergies */}
                      {step === 1 && (
                        <>
                          {/* Diet Type Section */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium">Diet Type</h3>
                              <p className="text-sm text-muted-foreground">
                                Select applicable dietary restrictions
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                "Low Fat",
                                "Low Sodium", 
                                "Coeliac",
                                "Diabetic",
                                "Vegetarian",
                                "Vegan"
                              ].map((diet) => (
                                <div key={diet} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={diet}
                                    checked={(form.watch("dietTypes") || []).includes(diet)}
                                    onCheckedChange={(checked) => handleDietTypeChange(diet, checked as boolean)}
                                    disabled={isLoading}
                                  />
                                  <label htmlFor={diet} className="text-sm font-normal cursor-pointer">
                                    {diet}
                                  </label>
                                </div>
                              ))}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="other"
                                  checked={(form.watch("dietTypes") || []).includes("Other")}
                                  onCheckedChange={(checked) => handleDietTypeChange("Other", checked as boolean)}
                                  disabled={isLoading}
                                />
                                <label htmlFor="other" className="text-sm font-normal">Other:</label>
                              </div>
                              {(form.watch("dietTypes") || []).includes("Other") && (
                                <FormField
                                  control={form.control}
                                  name="otherDietType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="Specify other diet type"
                                          disabled={isLoading}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="culturalRestrictions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cultural Restrictions</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g., Halal, Kosher, etc."
                                      disabled={isLoading}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Food Allergy Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">Food Allergy or Intolerance</h3>
                                <p className="text-sm text-muted-foreground">
                                  Add foods that cause allergies or intolerances
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendAllergy({ allergy: "" })}
                                disabled={
                                  isLoading ||
                                  allergyFields.length === MAX_ALLERGIES
                                }
                              >
                                <Plus className="h-4 w-4" />
                                Add Allergy
                              </Button>
                            </div>

                            {allergyFields.length > 0 && (
                              <div
                                className={`space-y-3 ${allergyFields.length > 3 ? "max-h-48 overflow-y-auto" : ""}`}
                              >
                                {allergyFields.map((field, index) => (
                                  <div key={field.id} className="flex items-center gap-3">
                                    <FormField
                                      control={form.control}
                                      name={`allergies.${index}.allergy`}
                                      render={({ field }) => (
                                        <FormItem className="flex-1">
                                          <FormControl>
                                            <Input
                                              placeholder="e.g., Nuts, Dairy, Shellfish"
                                              disabled={isLoading}
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeAllergy(index)}
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {allergyFields.length === 0 && (
                              <div className="p-2 bg-zinc-50 rounded text-xs text-pretty text-muted-foreground">
                                No allergies added yet. Click &quot;Add Allergy&quot; to get started.
                              </div>
                            )}
                          </div>

                          <div className="w-full flex flex-row justify-end">
                            <Button type="button" onClick={handleContinue} disabled={isLoading}>
                              Continue
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Step 2: Risk & Consistency Levels */}
                      {step === 2 && (
                        <>
                          {/* Choking Risk Section */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium">Choking Risk</h3>
                              <p className="text-sm text-muted-foreground">
                                Assess the resident&apos;s choking risk level
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="chokingRisk"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      disabled={isLoading}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="low" id="low-risk" />
                                        <label htmlFor="low-risk" className="text-sm cursor-pointer">Low Risk</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="medium" id="medium-risk" />
                                        <label htmlFor="medium-risk" className="text-sm cursor-pointer">Medium Risk</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="high" id="high-risk" />
                                        <label htmlFor="high-risk" className="text-sm cursor-pointer">High Risk</label>
                                      </div>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Food Consistency Section */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium">Food Consistency</h3>
                              <p className="text-sm text-muted-foreground">
                                Select required food texture level
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="foodConsistency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      disabled={isLoading}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level7" id="level7" />
                                        <label htmlFor="level7" className="text-sm cursor-pointer">Level 7: Easy Chew</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level6" id="level6" />
                                        <label htmlFor="level6" className="text-sm cursor-pointer">Level 6: Soft & Bite-sized</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level5" id="level5" />
                                        <label htmlFor="level5" className="text-sm cursor-pointer">Level 5: Minced & Moist</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level4" id="level4" />
                                        <label htmlFor="level4" className="text-sm cursor-pointer">Level 4: Pureed</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level3" id="level3" />
                                        <label htmlFor="level3" className="text-sm cursor-pointer">Level 3: Liquidised</label>
                                      </div>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Fluid Consistency Section */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium">Fluid Consistency</h3>
                              <p className="text-sm text-muted-foreground">
                                Select required fluid thickness level
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="fluidConsistency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      disabled={isLoading}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level0" id="fluid-level0" />
                                        <label htmlFor="fluid-level0" className="text-sm cursor-pointer">Level 0: Thin</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level1" id="fluid-level1" />
                                        <label htmlFor="fluid-level1" className="text-sm cursor-pointer">Level 1: Slightly Thick</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level2" id="fluid-level2" />
                                        <label htmlFor="fluid-level2" className="text-sm cursor-pointer">Level 2: Mildly Thick</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level3" id="fluid-level3" />
                                        <label htmlFor="fluid-level3" className="text-sm cursor-pointer">Level 3: Moderately Thick</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="level4" id="fluid-level4" />
                                        <label htmlFor="fluid-level4" className="text-sm cursor-pointer">Level 4: Extremely Thick</label>
                                      </div>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="w-full flex flex-row justify-between">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setStep(1)}
                              disabled={isLoading}
                            >
                              Back
                            </Button>
                            <Button type="button" onClick={handleContinue} disabled={isLoading}>
                              Continue
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Step 3: Assistance & Review */}
                      {step === 3 && (
                        <>
                          {/* Assistance Required Section */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium">Assistance Required</h3>
                              <p className="text-sm text-muted-foreground">
                                Does the resident require assistance during meals?
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="assistanceRequired"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      disabled={isLoading}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="assistance-yes" />
                                        <label htmlFor="assistance-yes" className="text-sm cursor-pointer">Yes - Assistance needed</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="assistance-no" />
                                        <label htmlFor="assistance-no" className="text-sm cursor-pointer">No - Independent</label>
                                      </div>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-between">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setStep(2)}
                              disabled={isLoading}
                            >
                              Back
                            </Button>
                            <Button
                              type="submit"
                              disabled={isLoading}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isLoading ? "Saving..." : "Save Diet Information"}
                            </Button>
                          </div>
                        </>
                      )}
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                See All Records
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diet Information Display */}
      {existingDiet && (
        <Card className="overflow-hidden border-0 shadow-sm">
  <CardContent className="p-0">
    {/* Header */}
    <div className="bg-white px-4 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Utensils className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-800">Diet Information</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="h-8 px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          Edit
        </Button>
      </div>
    </div>

    {/* Content */}
    <div className="p-4">
      {/* Responsive row layout */}
      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
        
        {/* Diet Types */}
        {((existingDiet.dietTypes && existingDiet.dietTypes.length > 0) || existingDiet.otherDietType || existingDiet.culturalRestrictions) && (
          <div className="space-y-2 lg:flex-[1_1_260px] min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Diet Types</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {existingDiet.dietTypes && existingDiet.dietTypes.map((diet, index) => (
                <Badge key={index} className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-1 rounded-md">
                  {diet}
                </Badge>
              ))}
              {existingDiet.otherDietType && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-1 rounded-md">
                  {existingDiet.otherDietType}
                </Badge>
              )}
              {existingDiet.culturalRestrictions && (
                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-1 rounded-md">
                  {existingDiet.culturalRestrictions}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Food Allergies */}
        {existingDiet.allergies && existingDiet.allergies.length > 0 && (
          <div className="space-y-2 lg:flex-[1_1_220px] min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Food Allergies</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {existingDiet.allergies.map((allergyObj, index) => (
                <Badge key={index} className="bg-red-100 text-red-800 border-red-300 text-xs px-2 py-1 rounded-md font-medium">
                  {allergyObj.allergy}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Assistance */}
        {existingDiet.assistanceRequired && (
          <div className="space-y-2 lg:flex-[1_1_200px] min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Assistance</span>
            </div>
            <div>
              <Badge
                className={`text-xs px-3 py-1 rounded-md font-medium ${
                  existingDiet.assistanceRequired === 'yes'
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    : 'bg-green-100 text-green-800 border-green-300'
                }`}
              >
                {existingDiet.assistanceRequired === 'yes' ? 'Assistance Required' : 'Independent'}
              </Badge>
            </div>
          </div>
        )}

        {/* Choking Risk */}
        {existingDiet.chokingRisk && (
          <div className="space-y-2 lg:flex-[1_1_200px] min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Choking Risk</span>
            </div>
            <div>
              <Badge
                className={`text-xs px-3 py-1 rounded-md font-medium ${
                  existingDiet.chokingRisk === 'high'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : existingDiet.chokingRisk === 'medium'
                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                    : 'bg-green-100 text-green-800 border-green-300'
                }`}
              >
                {existingDiet.chokingRisk === 'high' ? 'High Risk' :
                 existingDiet.chokingRisk === 'medium' ? 'Medium Risk' : 'Low Risk'}
              </Badge>
            </div>
          </div>
        )}

        {/* Texture Levels */}
        {(existingDiet.foodConsistency || existingDiet.fluidConsistency) && (
          <div className="space-y-2 lg:flex-[2_1_320px] min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Texture Levels</span>
            </div>
            <div className="space-y-1.5">
              {existingDiet.foodConsistency && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 w-8">Food:</span>
                  <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs px-2 py-1 rounded-md">
                    {existingDiet.foodConsistency === 'level7' && 'Level 7 - Easy Chew'}
                    {existingDiet.foodConsistency === 'level6' && 'Level 6 - Soft & Bite-sized'}
                    {existingDiet.foodConsistency === 'level5' && 'Level 5 - Minced & Moist'}
                    {existingDiet.foodConsistency === 'level4' && 'Level 4 - Pureed'}
                    {existingDiet.foodConsistency === 'level3' && 'Level 3 - Liquidised'}
                  </Badge>
                </div>
              )}
              {existingDiet.fluidConsistency && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 w-8">Fluid:</span>
                  <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-xs px-2 py-1 rounded-md">
                    {existingDiet.fluidConsistency === 'level0' && 'Level 0 - Thin'}
                    {existingDiet.fluidConsistency === 'level1' && 'Level 1 - Slightly Thick'}
                    {existingDiet.fluidConsistency === 'level2' && 'Level 2 - Mildly Thick'}
                    {existingDiet.fluidConsistency === 'level3' && 'Level 3 - Moderately Thick'}
                    {existingDiet.fluidConsistency === 'level4' && 'Level 4 - Extremely Thick'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  </CardContent>
</Card>


    
      )}

      {/* Food & Fluid Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Intake Card */}
        <Card className="border">
  <CardHeader className="pb-4">
    <CardTitle className="flex flex-col">
      <span className="font-semibold text-gray-900">Food Intake</span>
      <p className="text-sm font-normal text-gray-500 mt-1">
        Track meals and nutritional intake
      </p>
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="text-center py-8">
      <p className="text-gray-800 font-medium mb-2">No food records today</p>
      <p className="text-sm text-gray-500 mb-4">
        Start tracking {fullName}&apos;s food intake
      </p>
      <Button className="bg-black hover:bg-gray-800 text-white">
        <Plus className="w-4 h-4 mr-2" />
        Add Food Entry
      </Button>
    </div>

    {/* Quick meal buttons */}
    <div className="border-t pt-4">
      <p className="text-xs text-gray-500 mb-2">Quick meal logging:</p>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="text-xs text-gray-700">
          Breakfast
        </Button>
        <Button variant="outline" size="sm" className="text-xs text-gray-700">
          Lunch
        </Button>
        <Button variant="outline" size="sm" className="text-xs text-gray-700">
          Dinner
        </Button>
      </div>
    </div>
  </CardContent>
</Card>


        {/* Fluid Intake Card */}
        <Card className="border">
  <CardHeader className="pb-4">
    <CardTitle className="flex flex-col">
      <span className="font-semibold text-gray-900">Fluid Intake</span>
      <p className="text-sm font-normal text-gray-500 mt-1">
        Monitor hydration levels
      </p>
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="text-center py-8">
      <p className="text-gray-800 font-medium mb-2">No fluid records today</p>
      <p className="text-sm text-gray-500 mb-4">
        Start tracking {fullName}&apos;s fluid intake
      </p>
      <Button className="bg-black hover:bg-gray-800 text-white">
        <Plus className="w-4 h-4 mr-2" />
        Add Fluid Entry
      </Button>
    </div>

    {/* Quick fluid type buttons */}
    <div className="border-t pt-4">
      <p className="text-xs text-gray-500 mb-2">Common fluids:</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="text-xs text-gray-700">
          Water
        </Button>
        <Button variant="outline" size="sm" className="text-xs text-gray-700">
          Tea / Coffee
        </Button>
        <Button variant="outline" size="sm" className="text-xs text-gray-700">
          Juice
        </Button>
        <Button variant="outline" size="sm" className="text-xs text-gray-700">
          Milk
        </Button>
      </div>
    </div>
  </CardContent>
</Card>

      </div>

      {/* Today's Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>Today&apos;s Summary</span>
            <Badge variant="outline" className="ml-auto">
              {getCurrentDate()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <p className="text-sm text-yellow-700">Food entries</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">0 ml</div>
              <p className="text-sm text-blue-700">Fluid intake</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">--</div>
              <p className="text-sm text-gray-700">Last recorded</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}