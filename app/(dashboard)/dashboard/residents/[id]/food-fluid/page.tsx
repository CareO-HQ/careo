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
  Trash2,
  Download,
  FileText,
  Printer,
  FolderOpen
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

  // Get current day food/fluid logs
  const currentDayLogs = useQuery(api.foodFluidLogs.getCurrentDayLogs, {
    residentId: id as Id<"residents">
  });

  // Get food/fluid summary for today
  const today = new Date().toISOString().split('T')[0];
  const logSummary = useQuery(api.foodFluidLogs.getFoodFluidSummary, {
    residentId: id as Id<"residents">,
    date: today
  });

  // Get archived logs (limited to recent ones for the records view)
  const archivedLogs = useQuery(api.foodFluidLogs.getArchivedLogs, {
    residentId: id as Id<"residents">,
    limit: 20
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
  const [step, setStep] = React.useState(1);
  
  // Food/Fluid Log Dialog state
  const [isFoodFluidDialogOpen, setIsFoodFluidDialogOpen] = React.useState(false);
  const [isLogLoading, setIsLogLoading] = React.useState(false);
  const [entryType, setEntryType] = React.useState<"food" | "fluid">("food");
  
  // Records View Dialog state
  const [isRecordsDialogOpen, setIsRecordsDialogOpen] = React.useState(false);
  const [selectedDocument, setSelectedDocument] = React.useState<string | null>(null);

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

  // Food/Fluid Log Form setup
  const logForm = useForm<z.infer<typeof FoodFluidLogSchema>>({
    resolver: zodResolver(FoodFluidLogSchema),
    defaultValues: {
      section: "7am-12pm",
      typeOfFoodDrink: "",
      portionServed: "",
      amountEaten: "All",
      fluidConsumedMl: undefined,
      signature: user?.user?.name || "",
    },
  });

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

  const downloadReport = () => {
    const allLogs = [...(currentDayLogs || []), ...(archivedLogs || [])];
    
    // Generate HTML content for the report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Food & Fluid Records - ${fullName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 15px; 
              margin-bottom: 20px; 
            }
            .resident-info { 
              background: #f5f5f5; 
              padding: 10px; 
              margin-bottom: 20px; 
              border-radius: 5px; 
            }
            .section { 
              margin-bottom: 25px; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              color: #333; 
              margin-bottom: 10px; 
              border-bottom: 1px solid #ddd; 
              padding-bottom: 5px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
              font-size: 12px; 
            }
            th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
            }
            .food-entry { background-color: #fff8e7; }
            .fluid-entry { background-color: #e7f3ff; }
            .consumption-all { color: #28a745; font-weight: bold; }
            .consumption-none { color: #dc3545; font-weight: bold; }
            .consumption-partial { color: #fd7e14; font-weight: bold; }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              font-size: 10px; 
              color: #666; 
              border-top: 1px solid #ddd; 
              padding-top: 10px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Food & Fluid Records Report</h1>
            <h2>${fullName}</h2>
            <p>Room: ${resident.roomNumber || 'N/A'} | Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="resident-info">
            <strong>Resident Information:</strong><br>
            Name: ${fullName}<br>
            Room Number: ${resident.roomNumber || 'N/A'}<br>
            Date of Birth: ${resident.dateOfBirth}<br>
            Report Period: ${allLogs.length > 0 ? 
              `${new Date(Math.min(...allLogs.map(l => l.timestamp))).toLocaleDateString()} - ${new Date(Math.max(...allLogs.map(l => l.timestamp))).toLocaleDateString()}` 
              : 'No records available'}
          </div>

          ${allLogs.length > 0 ? 
            Object.entries(
              allLogs.reduce((acc, log) => {
                const date = log.date;
                if (!acc[date]) acc[date] = [];
                acc[date].push(log);
                return acc;
              }, {} as Record<string, typeof allLogs>)
            ).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, logs]: [string, typeof allLogs]) => `
              <div class="section">
                <div class="section-title">
                  ${new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} ${date === today ? '(Today)' : '(Archived)'}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Section</th>
                      <th>Type</th>
                      <th>Food/Drink</th>
                      <th>Portion</th>
                      <th>Consumed</th>
                      <th>Fluid (ml)</th>
                      <th>Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${logs.sort((a, b) => a.timestamp - b.timestamp)
                      .map(log => `
                        <tr class="${['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl ? 'fluid-entry' : 'food-entry'}">
                          <td>${new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>${log.section.replace('-', ' - ')}</td>
                          <td>${['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl ? '🥤 Fluid' : '🍽️ Food'}</td>
                          <td>${log.typeOfFoodDrink}</td>
                          <td>${log.portionServed}</td>
                          <td class="consumption-${log.amountEaten.toLowerCase() === 'all' ? 'all' : log.amountEaten.toLowerCase() === 'none' ? 'none' : 'partial'}">${log.amountEaten}</td>
                          <td>${log.fluidConsumedMl || '-'}</td>
                          <td>${log.signature}</td>
                        </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('') 
            : '<div class="section"><p>No food or fluid records found for this resident.</p></div>'
          }

          <div class="footer">
            <p>This report was generated from the CareO Food & Fluid Management System</p>
            <p>Report contains ${allLogs.length} total entries</p>
          </div>
        </body>
      </html>
    `;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullName.replace(/\s+/g, '_')}_Food_Fluid_Records_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Report downloaded successfully!");
  };

  const generateDocumentsByDate = () => {
    const allLogs = [...(currentDayLogs || []), ...(archivedLogs || [])];
    const logsByDate = allLogs.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    }, {} as Record<string, typeof allLogs>);

    return Object.entries(logsByDate)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, logs]) => ({
        id: date,
        title: new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        type: date === today ? 'current' : 'archived',
        entries: logs.length,
        foodEntries: logs.filter(log => !(['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl)).length,
        fluidEntries: logs.filter(log => ['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl).length,
        totalFluidMl: logs.reduce((sum, log) => sum + (log.fluidConsumedMl || 0), 0),
        date: date
      }));
  };

  const generateDocumentHTML = (documentId: string) => {
    const allLogs = [...(currentDayLogs || []), ...(archivedLogs || [])];
    const documentLogs = allLogs.filter(log => log.date === documentId);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Food & Fluid Record - ${new Date(documentId).toLocaleDateString()}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 15px; 
              margin-bottom: 20px; 
            }
            .resident-info { 
              background: #f5f5f5; 
              padding: 10px; 
              margin-bottom: 20px; 
              border-radius: 5px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
              font-size: 12px; 
            }
            th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
            }
            .food-entry { background-color: #fff8e7; }
            .fluid-entry { background-color: #e7f3ff; }
            .consumption-all { color: #28a745; font-weight: bold; }
            .consumption-none { color: #dc3545; font-weight: bold; }
            .consumption-partial { color: #fd7e14; font-weight: bold; }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              font-size: 10px; 
              color: #666; 
              border-top: 1px solid #ddd; 
              padding-top: 10px; 
            }
            .summary { 
              background: #f8f9fa; 
              padding: 15px; 
              margin-bottom: 20px; 
              border-radius: 5px; 
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DAILY FOOD & FLUID RECORD</h1>
            <h2>${fullName}</h2>
            <h3>${new Date(documentId).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</h3>
            <p>Room: ${resident.roomNumber || 'N/A'} | DOB: ${resident.dateOfBirth}</p>
          </div>

          <div class="resident-info">
            <strong>Resident Information:</strong><br>
            Name: ${fullName}<br>
            Room Number: ${resident.roomNumber || 'N/A'}<br>
            Date of Birth: ${resident.dateOfBirth}<br>
            Record Date: ${new Date(documentId).toLocaleDateString()}
          </div>

          <div class="summary">
            <strong>Daily Summary:</strong><br>
            Total Entries: ${documentLogs.length}<br>
            Food Entries: ${documentLogs.filter(log => !(['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl)).length}<br>
            Fluid Entries: ${documentLogs.filter(log => ['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl).length}<br>
            Total Fluid Intake: ${documentLogs.reduce((sum, log) => sum + (log.fluidConsumedMl || 0), 0)} ml
          </div>

          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Section</th>
                <th>Type</th>
                <th>Food/Drink</th>
                <th>Portion</th>
                <th>Consumed</th>
                <th>Fluid (ml)</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              ${documentLogs.sort((a, b) => a.timestamp - b.timestamp)
                .map(log => `
                  <tr class="${['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl ? 'fluid-entry' : 'food-entry'}">
                    <td>${new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${log.section.replace('-', ' - ')}</td>
                    <td>${['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl ? '🥤 Fluid' : '🍽️ Food'}</td>
                    <td>${log.typeOfFoodDrink}</td>
                    <td>${log.portionServed}</td>
                    <td class="consumption-${log.amountEaten.toLowerCase() === 'all' ? 'all' : log.amountEaten.toLowerCase() === 'none' ? 'none' : 'partial'}">${log.amountEaten}</td>
                    <td>${log.fluidConsumedMl || '-'}</td>
                    <td>${log.signature}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This document was generated from the CareO Food & Fluid Management System</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Document contains ${documentLogs.length} entries for ${new Date(documentId).toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `;
  };

  const viewDocument = (documentId: string) => {
    setSelectedDocument(documentId);
  };

  const printDocument = (documentId: string) => {
    const htmlContent = generateDocumentHTML(documentId);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
      toast.success("Document opened for printing");
    }
  };

  const downloadDocument = (documentId: string) => {
    const htmlContent = generateDocumentHTML(documentId);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullName.replace(/\s+/g, '_')}_Food_Fluid_${documentId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Document downloaded successfully!");
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

  const onFoodFluidLogSubmit = async (values: z.infer<typeof FoodFluidLogSchema>) => {
    setIsLogLoading(true);
    try {
      if (!activeOrganization?.id || !user?.user?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      // Validate that we're not trying to log entries too far in the past
      const selectedSection = values.section;
      
      // Basic time section validation (allowing some flexibility)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Allow logging for current day and previous day (for night shift coverage)
      if (now.getTime() - todayStart.getTime() < 2 * 60 * 60 * 1000) { // Before 2 AM
        // Allow logging previous day's evening entries
        if (!["5pm-midnight", "midnight-7am"].includes(selectedSection)) {
          toast.error("Only evening and night entries can be logged at this time");
          return;
        }
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
      
      toast.success("Food/fluid entry logged successfully");
      
      // Auto-set the section based on current time for next entry
      const nextSection = getCurrentSection();
      
      logForm.reset({
        section: nextSection,
        typeOfFoodDrink: "",
        portionServed: "",
        amountEaten: "All",
        fluidConsumedMl: undefined,
        signature: user.user.name || "",
      });
      setIsFoodFluidDialogOpen(false);
    } catch (error) {
      toast.error("Failed to log food/fluid entry");
      console.error("Error logging food/fluid:", error);
    } finally {
      setIsLogLoading(false);
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
            <div className="flex flex-col space-y-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
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
              
              {/* Food/Fluid Log Dialog */}
              <Dialog open={isFoodFluidDialogOpen} onOpenChange={setIsFoodFluidDialogOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      {entryType === "food" ? (
                        <>
                          <Utensils className="w-5 h-5 text-orange-600" />
                          <span>Log Food Entry</span>
                        </>
                      ) : (
                        <>
                          <Droplets className="w-5 h-5 text-blue-600" />
                          <span>Log Fluid Entry</span>
                        </>
                      )}
                    </DialogTitle>
                    <DialogDescription>
                      Record {entryType} intake for {fullName}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...logForm}>
                    <form onSubmit={logForm.handleSubmit(onFoodFluidLogSubmit)} className="space-y-4">
                      
                      {/* Section Selection */}
                      <FormField
                        control={logForm.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Section</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time section" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="midnight-7am">Midnight - 7am</SelectItem>
                                <SelectItem value="7am-12pm">7am - 12pm</SelectItem>
                                <SelectItem value="12pm-5pm">12pm - 5pm</SelectItem>
                                <SelectItem value="5pm-midnight">5pm - Midnight</SelectItem>
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
                              {entryType === "food" ? "Type of Food" : "Type of Drink"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={
                                  entryType === "food" 
                                    ? "e.g., Toast, Chicken, Soup, Sandwich" 
                                    : "e.g., Water, Tea, Coffee, Juice"
                                }
                                disabled={isLogLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Portion Served - only for food entries */}
                      {entryType === "food" && (
                        <FormField
                          control={logForm.control}
                          name="portionServed"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Portion Served</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select portion size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Small portion">Small portion</SelectItem>
                                  <SelectItem value="Regular portion">Regular portion</SelectItem>
                                  <SelectItem value="Large portion">Large portion</SelectItem>
                                  <SelectItem value="1 slice">1 slice</SelectItem>
                                  <SelectItem value="2 slices">2 slices</SelectItem>
                                  <SelectItem value="3 slices">3 slices</SelectItem>
                                  <SelectItem value="1 piece">1 piece</SelectItem>
                                  <SelectItem value="2 pieces">2 pieces</SelectItem>
                                  <SelectItem value="3 pieces">3 pieces</SelectItem>
                                  <SelectItem value="1 scoop">1 scoop</SelectItem>
                                  <SelectItem value="2 scoops">2 scoops</SelectItem>
                                  <SelectItem value="3 scoops">3 scoops</SelectItem>
                                  <SelectItem value="1 spoonful">1 spoonful</SelectItem>
                                  <SelectItem value="2 spoonfuls">2 spoonfuls</SelectItem>
                                  <SelectItem value="3 spoonfuls">3 spoonfuls</SelectItem>
                                  <SelectItem value="1 bowl">1 bowl</SelectItem>
                                  <SelectItem value="Half bowl">Half bowl</SelectItem>
                                  <SelectItem value="1 plate">1 plate</SelectItem>
                                  <SelectItem value="Half plate">Half plate</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Amount Eaten */}
                      <FormField
                        control={logForm.control}
                        name="amountEaten"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount Consumed</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select amount consumed" />
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

                      {/* Fluid Consumed (ml) - show only for fluid entries */}
                      {entryType === "fluid" && (
                        <FormField
                          control={logForm.control}
                          name="fluidConsumedMl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fluid Amount (ml)</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(Number(value))} 
                                value={field.value?.toString() || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select fluid amount" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="50">50 ml</SelectItem>
                                  <SelectItem value="100">100 ml</SelectItem>
                                  <SelectItem value="150">150 ml</SelectItem>
                                  <SelectItem value="200">200 ml</SelectItem>
                                  <SelectItem value="250">250 ml</SelectItem>
                                  <SelectItem value="300">300 ml</SelectItem>
                                  <SelectItem value="350">350 ml</SelectItem>
                                  <SelectItem value="400">400 ml</SelectItem>
                                  <SelectItem value="450">450 ml</SelectItem>
                                  <SelectItem value="500">500 ml</SelectItem>
                                </SelectContent>
                              </Select>
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
                                placeholder="Staff name/ID"
                                disabled={isLogLoading}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsFoodFluidDialogOpen(false)}
                          disabled={isLogLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLogLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isLogLoading ? "Logging..." : "Log Entry"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Records View Dialog */}
              <Dialog open={isRecordsDialogOpen} onOpenChange={(open) => {
                setIsRecordsDialogOpen(open);
                if (!open) setSelectedDocument(null);
              }}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {selectedDocument ? (
                          <>
                            <FileText className="w-5 h-5" />
                            <span>Document Viewer - {new Date(selectedDocument).toLocaleDateString()}</span>
                          </>
                        ) : (
                          <>
                            <FolderOpen className="w-5 h-5" />
                            <span>Food & Fluid Documents</span>
                          </>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {selectedDocument ? (
                          <>
                            <Button
                              onClick={() => printDocument(selectedDocument)}
                              variant="outline"
                              size="sm"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              Print
                            </Button>
                            <Button
                              onClick={() => downloadDocument(selectedDocument)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              onClick={() => setSelectedDocument(null)}
                              variant="outline"
                              size="sm"
                            >
                              Back to List
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={downloadReport}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download All Records
                          </Button>
                        )}
                      </div>
                    </DialogTitle>
                    <DialogDescription>
                      {selectedDocument 
                        ? `Viewing document for ${fullName} - ${new Date(selectedDocument).toLocaleDateString()}`
                        : `Available food and fluid intake documents for ${fullName}`
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedDocument ? (
                    /* Document Viewer */
                    <div 
                      className="bg-white border rounded-lg p-6 max-h-[70vh] overflow-auto" 
                      style={{ fontFamily: 'serif' }}
                      dangerouslySetInnerHTML={{ 
                        __html: generateDocumentHTML(selectedDocument).replace(/<html>[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*?<\/html>/, '') 
                      }}
                    />
                  ) : (
                    /* Document List */
                    <div className="max-h-[70vh] overflow-auto">
                      {(() => {
                        const documents = generateDocumentsByDate();
                        
                        if (documents.length === 0) {
                          return (
                            <div className="text-center py-12">
                              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <p className="text-lg text-gray-600 mb-2">No Documents Available</p>
                              <p className="text-sm text-gray-500">No food or fluid entries have been logged for this resident.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium text-gray-900">
                                    {new Date(doc.date).toLocaleDateString()}
                                  </span>
                                  {doc.type === 'current' && (
                                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                                      Today
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => viewDocument(doc.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    onClick={() => printDocument(doc.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Print
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsRecordsDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline"
                onClick={() => setIsRecordsDialogOpen(true)}
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
              
              <Button 
                variant="outline"
                onClick={() => setIsRecordsDialogOpen(true)}
              >
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
              className="h-16 text-lg bg-orange-300 hover:bg-orange-400 text-white"
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
              className="h-16 text-lg bg-blue-300 hover:bg-blue-400 text-white"
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

      {/* Today's Log History */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>Today&apos;s Log History</span>
            </div>
            <div className="flex flex-col space-y-2">
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 self-start">
                {new Date().toLocaleDateString()}
              </Badge>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsRecordsDialogOpen(true)}
                className="self-start"
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Records
              </Button>
            </div>
          </CardTitle>
          
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>Today&apos;s Log History</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                {getCurrentDate()}
              </Badge>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsRecordsDialogOpen(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Records
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentDayLogs && currentDayLogs.length > 0 ? (
            <div className="space-y-3">
              {currentDayLogs
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((log) => (
                <div key={log._id} className="flex items-center justify-between p-4  rounded-md border">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl ? (
                          <Droplets className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Utensils className="w-4 h-4 text-orange-600" />
                        )}
                        <span className="font-medium">{log.typeOfFoodDrink}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {log.section.replace('-', ' - ')}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            log.amountEaten === 'All' ? 'bg-green-100 text-green-800 border-green-300' :
                            log.amountEaten === 'None' ? 'bg-red-100 text-red-800 border-red-300' :
                            'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          {log.amountEaten}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>
                        Portion: {log.portionServed}
                        {log.fluidConsumedMl && ` • Volume: ${log.fluidConsumedMl}ml`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} • Logged by {log.signature}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-600 font-medium mb-2">No entries logged today</p>
              <p className="text-sm text-gray-500">
                Start tracking {fullName}&apos;s food and fluid intake using the buttons above
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Summary Card */}
      <Card>
        <CardHeader>
          {/* Mobile Layout */}
          <CardTitle className="block sm:hidden">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span>Today&apos;s Summary</span>
            </div>
            <Badge variant="outline" className="self-start">
              {new Date().toLocaleDateString()}
            </Badge>
          </CardTitle>
          
          {/* Desktop Layout */}
          <CardTitle className="hidden sm:flex sm:items-center sm:space-x-2">
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
              <div className="text-2xl font-bold text-yellow-600">
                {logSummary?.foodEntries ?? 0}
              </div>
              <p className="text-sm text-yellow-700">Food entries</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {logSummary?.totalFluidIntakeMl ?? 0} ml
              </div>
              <p className="text-sm text-blue-700">Fluid intake</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">
                {logSummary?.lastRecorded 
                  ? new Date(logSummary.lastRecorded).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  : "--"
                }
              </div>
              <p className="text-sm text-gray-700">Last recorded</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}