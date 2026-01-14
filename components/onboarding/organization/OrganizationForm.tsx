"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { SaveOnboardingOrganizationForm } from "@/schemas/SaveOnboardingOrganizationForm";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import LogoSelector from "./LogoSelector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTransition, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function OrganizationForm({
  step,
  setStep
}: {
  step: number;
  setStep: (step: number) => void;
}) {
  const [isLoading, startTransition] = useTransition();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const userOrganization = useQuery(
    api.auth.getCurrentUserOrganization,
    !activeOrganization?.id ? {} : "skip"
  );
  const organizationFromInvitations = useQuery(
    api.auth.getOrganizationFromAcceptedInvitations,
    (!activeOrganization?.id && (!userOrganization || userOrganization === null)) ? {} : "skip"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // #region agent log
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userOrgId = userOrganization && 'id' in userOrganization ? userOrganization.id : null;
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:componentState',message:'component state check',data:{hasActiveOrg:!!activeOrganization?.id,activeOrgId:activeOrganization?.id||null,hasUserOrg:!!userOrgId,userOrgId:userOrgId,userOrgLoading:userOrganization===undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    }
  }, [activeOrganization?.id, userOrganization]);
  // #endregion
  const getOrganizationLogoQuery = useQuery(
    api.files.image.getOrganizationLogo,
    (activeOrganization?.name || userOrganization?.name) ? {} : "skip"
  );
  const generateUploadUrlMutation = useMutation(
    api.files.image.generateUploadUrl
  );
  const sendImageMutation = useMutation(api.files.image.sendImage);
  const deleteImageMutation = useMutation(api.files.image.deleteById);
  const createCareHomeMutation = useMutation(api.rbac.careHomes.createCareHome);
  const switchActiveCareHomeMutation = useMutation(api.rbac.careHomes.switchActiveCareHome);
  const setActiveOrganizationMutation = useMutation(api.auth.setActiveOrganization);
  const ensureAndSetActiveOrganizationMutation = useMutation(api.auth.ensureAndSetActiveOrganization);

  const form = useForm<z.infer<typeof SaveOnboardingOrganizationForm>>({
    resolver: zodResolver(SaveOnboardingOrganizationForm),
    defaultValues: {
      name: "",
      exampleData: false
    }
  });

  useEffect(() => {
    if (activeOrganization?.name) {
      form.setValue("name", activeOrganization.name);
    } else if (userOrganization && 'name' in userOrganization && userOrganization.name) {
      form.setValue("name", userOrganization.name);
    }
  }, [activeOrganization?.name, userOrganization, form]);

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof SaveOnboardingOrganizationForm>) {
    startTransition(async () => {
      let organizationId: string | undefined;

      // #region agent log
      if (typeof window !== 'undefined') {
        const userOrgId = userOrganization && 'id' in userOrganization ? userOrganization.id : null;
        fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:entry',message:'onSubmit called',data:{hasActiveOrg:!!activeOrganization?.id,activeOrgId:activeOrganization?.id||null,hasUserOrg:!!userOrgId,userOrgId:userOrgId,userOrgLoading:userOrganization===undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
      }
      // #endregion

      // Get organization ID from activeOrganization, userOrganization query, or invitations
      let orgId: string | undefined = activeOrganization?.id 
        || (userOrganization && 'id' in userOrganization ? userOrganization.id : undefined)
        || (organizationFromInvitations && 'id' in organizationFromInvitations ? organizationFromInvitations.id : undefined);
      
      // If userOrganization is still loading, wait a bit and check again
      if (!orgId && userOrganization === undefined) {
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:waitingForOrg',message:'waiting for userOrganization to load',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        }
        // #endregion
        // Wait a bit for the query to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Re-check after waiting
        const userOrgIdAfterWait = userOrganization && typeof userOrganization === 'object' && 'id' in userOrganization ? (userOrganization as { id: string; name: string }).id : undefined;
        orgId = activeOrganization?.id || userOrgIdAfterWait;
      }

      if (activeOrganization?.name) {
        // Updating existing organization
        await authClient.organization.update(
          {
            data: {
              name: values.name,
              slug: values.name.toLowerCase().replace(/ /g, "-")
            }
          },
          {
            onError: () => {
              toast.error("Error updating organization");
            },
            onSuccess: () => {
              // For existing organizations, we already have the ID
              organizationId = activeOrganization.id;
            }
          }
        );
      } else {
        // IMPORTANT: Owners should NOT create organizations during onboarding.
        // Organizations are created by SaaS Admin when they invite the owner.
        // The organization should already exist at this point.
        // If it doesn't exist in activeOrganization, try to get it from member record
        if (!orgId) {
          // #region agent log
          if (typeof window !== 'undefined') {
            const userOrgId = userOrganization && 'id' in userOrganization ? userOrganization.id : null;
            fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:noOrgId',message:'no organization ID found, trying ensureAndSetActiveOrganization',data:{hasActiveOrg:!!activeOrganization?.id,hasUserOrg:!!userOrgId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          }
          // #endregion
          
          // Last resort: try to fetch and set organization from member record or invitations
          // Retry with delays to wait for member record creation
          let fetchedOrg: { id: string; name: string } | null = null;
          const maxRetries = 3;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              // #region agent log
              if (typeof window !== 'undefined') {
                fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:fetchAttempt',message:`fetching organization attempt ${attempt}/${maxRetries}`,data:{attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              }
              // #endregion
              
              if (attempt > 1) {
                // Wait before retry (exponential backoff)
                await new Promise((resolve) => setTimeout(resolve, attempt * 500));
              }
              
              fetchedOrg = await ensureAndSetActiveOrganizationMutation();
              if (fetchedOrg && 'id' in fetchedOrg && fetchedOrg.id) {
                // #region agent log
                if (typeof window !== 'undefined') {
                  fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:fetchedOrg',message:'fetched organization from member record or invitations',data:{orgId:fetchedOrg.id,orgName:fetchedOrg.name,attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                }
                // #endregion
                orgId = fetchedOrg.id;
                // Wait a moment for session to propagate
                await new Promise((resolve) => setTimeout(resolve, 300));
                break; // Success, exit retry loop
              }
            } catch (error) {
              // #region agent log
              if (typeof window !== 'undefined') {
                fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:fetchError',message:`error fetching organization attempt ${attempt}`,data:{error:error instanceof Error?error.message:String(error),attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              }
              // #endregion
              console.error(`Error fetching organization (attempt ${attempt}):`, error);
              if (attempt === maxRetries) {
                // Last attempt failed
                toast.error("Organization not found. Please contact your administrator.");
                return;
              }
            }
          }
          
          if (!orgId) {
            // #region agent log
            if (typeof window !== 'undefined') {
              fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:noOrgAfterFetch',message:'no organization found after all fetch attempts',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            }
            // #endregion
            toast.error("Organization not found. Please contact your administrator.");
            return;
          }
        }
        
        // If we got organization from userOrganization query but it's not active in session,
        // set it as active BEFORE creating care home
        if (userOrganization && 'id' in userOrganization && userOrganization.id && !activeOrganization?.id) {
          try {
            // #region agent log
            if (typeof window !== 'undefined') {
              fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:setActiveOrg',message:'setting active organization',data:{organizationId:userOrganization && 'id' in userOrganization ? userOrganization.id : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            }
            // #endregion
            const orgIdToSet = userOrganization && 'id' in userOrganization ? userOrganization.id : null;
            if (orgIdToSet) {
              await setActiveOrganizationMutation({
                organizationId: orgIdToSet
              });
              // #region agent log
              if (typeof window !== 'undefined') {
                fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:setActiveOrgSuccess',message:'active organization set successfully',data:{organizationId:orgIdToSet},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              }
              // #endregion
            }
            // Wait a moment for the session to be updated before proceeding
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (error) {
            // #region agent log
            if (typeof window !== 'undefined') {
              fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:setActiveOrgError',message:'error setting active organization',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            }
            // #endregion
            console.error("Error setting active organization:", error);
            // Continue anyway - we have the organizationId
          }
        }
        
        // Use the existing organization ID
        organizationId = orgId;
        
        // CRITICAL: Ensure organization is set in session before creating care home
        // This ensures resolveUser can find the organizationId
        if (organizationId && !activeOrganization?.id) {
          try {
            await ensureAndSetActiveOrganizationMutation();
            // Wait a moment for session to propagate to Convex
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            console.error("Error ensuring active organization before care home creation:", error);
            // Continue anyway - resolveUser has fallback logic
          }
        }
        
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onSubmit:beforeCreateCareHome',message:'about to create care home',data:{organizationId:organizationId||null,hasOrgId:!!organizationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
        }
        // #endregion
        
        // Create a care home (NOT an organization) during onboarding
        // Retry logic in case role isn't set yet or member record isn't available yet
        let retries = 3;
        let careHomeCreated = false;
        
        while (retries > 0 && !careHomeCreated) {
          try {
            // #region agent log
            if (typeof window !== 'undefined') {
              fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onboarding:createCareHome',message:'onboarding createCareHome attempt',data:{retries,name:values.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            }
            // #endregion
            const careHomeResult = await createCareHomeMutation({
              name: values.name
            });
            
            // #region agent log
            if (typeof window !== 'undefined') {
              fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onboarding:result',message:'onboarding createCareHome result',data:{success:careHomeResult.success,hasCareHomeId:!!careHomeResult.careHomeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            }
            // #endregion
            
            if (careHomeResult.success && careHomeResult.careHomeId) {
              careHomeCreated = true;
              // Set this as the active care home
              try {
                await switchActiveCareHomeMutation({
                  careHomeId: careHomeResult.careHomeId
                });
                // #region agent log
                if (typeof window !== 'undefined') {
                  fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onboarding:switchSuccess',message:'switched active care home',data:{careHomeId:String(careHomeResult.careHomeId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                }
                // #endregion
              } catch (switchError) {
                // #region agent log
                if (typeof window !== 'undefined') {
                  fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onboarding:switchError',message:'switch active care home error',data:{error:switchError instanceof Error?switchError.message:String(switchError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                }
                // #endregion
                console.error("Error switching active care home:", switchError);
                // Don't fail if switching fails
              }
            }
          } catch (error) {
            // #region agent log
            if (typeof window !== 'undefined') {
              fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onboarding:error',message:'onboarding createCareHome error',data:{retries,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            }
            // #endregion
            console.error(`Error creating care home during onboarding (${retries} retries left):`, error);
            retries--;
            if (retries > 0) {
              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
        
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationForm.tsx:onboarding:final',message:'onboarding care home creation final',data:{careHomeCreated,retries},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        }
        // #endregion
        
        if (!careHomeCreated) {
          console.warn("Failed to create care home during onboarding. Owner can create it later through the dashboard sidebar.");
          // Don't fail the onboarding - owner can create care home later
        }
      }

      // Only upload image after organization is created/updated and we have the ID
      if (selectedFile && organizationId) {
        if (getOrganizationLogoQuery?.storageId) {
          await deleteImageMutation({
            fileId: getOrganizationLogoQuery.storageId
          });
        }
        const uploadUrl = await generateUploadUrlMutation();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile!.type },
          body: selectedFile
        });
        const { storageId } = await result.json();
        await sendImageMutation({
          storageId,
          type: "organization",
          organizationId:
            organizationId !== "session-based" ? organizationId : undefined // Pass the organization ID explicitly, or rely on session for new orgs
        });
        console.log("userLogo", getOrganizationLogoQuery);
      }

      // Move to next step only after everything is complete
      setStep(step + 1);
    });

    // Do something with the form values.
    // ✅ This will be type-safe and validated.
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <LogoSelector
          disabled={isLoading}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          currentImageUrl={getOrganizationLogoQuery?.url}
          fileId={getOrganizationLogoQuery?.storageId}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Care home name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
                  className="w-full"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="exampleData"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5 mt-4">
                <FormLabel>Example data</FormLabel>
                <FormDescription>
                  Recommended to test the platform.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  disabled={isLoading}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-24 mt-4" 
          disabled={isLoading || (!activeOrganization?.id && (userOrganization === undefined || (userOrganization !== null && userOrganization !== undefined && !('id' in userOrganization))))}
        >
          Continue
        </Button>
      </form>
    </Form>
  );
}
