"use client";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { professionalRegistrationSchema } from "@/schemas/settings/professionalRegistrationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSupabase } from "@/components/providers/SupabaseProvider";

interface ProfessionalRegistrationFormProps {
  nmcPinNumber: string;
  nmcRenewalFeeDate: string;
  nisccRegistrationNumber: string;
  nisccRegistrationDate: string;
  nisccAnnualFeeDate: string;
  isPending: boolean;
}

type DateFieldName =
  | "nmc_renewal_fee_date"
  | "niscc_registration_date"
  | "niscc_annual_fee_date";

function RegistrationDateField({
  label,
  fieldName,
  value,
  onChange,
  disabled,
  openDatePickers,
  setOpenDatePickers,
}: {
  label: string;
  fieldName: DateFieldName;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  openDatePickers: Record<string, boolean>;
  setOpenDatePickers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Popover
        open={openDatePickers[fieldName] ?? false}
        onOpenChange={(open) =>
          setOpenDatePickers((prev) => ({ ...prev, [fieldName]: open }))
        }
        modal
      >
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              type="button"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpenDatePickers((prev) => ({ ...prev, [fieldName]: false }));
              }
            }}
            captionLayout="dropdown"
            defaultMonth={value ? new Date(value) : new Date()}
            startMonth={new Date(new Date().getFullYear() - 50, 0)}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );
}

export default function ProfessionalRegistrationForm({
  nmcPinNumber,
  nmcRenewalFeeDate,
  nisccRegistrationNumber,
  nisccRegistrationDate,
  nisccAnnualFeeDate,
  isPending,
}: ProfessionalRegistrationFormProps) {
  const { supabase } = useSupabase();
  const { profile, refresh: refreshProfile } = useProfile();
  const [isLoading, startTransition] = useTransition();
  const [openDatePickers, setOpenDatePickers] = useState<Record<string, boolean>>({});

  const form = useForm<z.infer<typeof professionalRegistrationSchema>>({
    resolver: zodResolver(professionalRegistrationSchema),
    defaultValues: {
      nmc_pin_number: nmcPinNumber ?? "",
      nmc_renewal_fee_date: nmcRenewalFeeDate ?? "",
      niscc_registration_number: nisccRegistrationNumber ?? "",
      niscc_registration_date: nisccRegistrationDate ?? "",
      niscc_annual_fee_date: nisccAnnualFeeDate ?? "",
    },
  });

  useEffect(() => {
    form.setValue("nmc_pin_number", nmcPinNumber ?? "");
    form.setValue("nmc_renewal_fee_date", nmcRenewalFeeDate ?? "");
    form.setValue("niscc_registration_number", nisccRegistrationNumber ?? "");
    form.setValue("niscc_registration_date", nisccRegistrationDate ?? "");
    form.setValue("niscc_annual_fee_date", nisccAnnualFeeDate ?? "");
  }, [
    nmcPinNumber,
    nmcRenewalFeeDate,
    nisccRegistrationNumber,
    nisccRegistrationDate,
    nisccAnnualFeeDate,
    form,
  ]);

  const onSubmit = (values: z.infer<typeof professionalRegistrationSchema>) => {
    startTransition(async () => {
      if (!profile?.id) {
        toast.error("User profile not found");
        return;
      }

      try {
        const { error: updateError } = await supabase
          .from("users")
          .update({
            nmc_pin_number: values.nmc_pin_number || null,
            nmc_renewal_fee_date: values.nmc_renewal_fee_date || null,
            niscc_registration_number: values.niscc_registration_number || null,
            niscc_registration_date: values.niscc_registration_date || null,
            niscc_annual_fee_date: values.niscc_annual_fee_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        await refreshProfile();
        toast.success("Professional registration details updated successfully");
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update registration details";
        console.error("Error updating professional registration:", error);
        toast.error(message);
      }
    });
  };

  const fieldDisabled = isPending || isLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
        <FormField
          control={form.control}
          name="nmc_pin_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NMC PIN Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter NMC PIN"
                  disabled={fieldDisabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nmc_renewal_fee_date"
          render={({ field }) => (
            <RegistrationDateField
              label="NMC Renewal Fee Date"
              fieldName="nmc_renewal_fee_date"
              value={field.value ?? ""}
              onChange={field.onChange}
              disabled={fieldDisabled}
              openDatePickers={openDatePickers}
              setOpenDatePickers={setOpenDatePickers}
            />
          )}
        />
        <FormField
          control={form.control}
          name="niscc_registration_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NISCC Registration Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter NISCC registration number"
                  disabled={fieldDisabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="niscc_registration_date"
          render={({ field }) => (
            <RegistrationDateField
              label="NISCC Registration Date"
              fieldName="niscc_registration_date"
              value={field.value ?? ""}
              onChange={field.onChange}
              disabled={fieldDisabled}
              openDatePickers={openDatePickers}
              setOpenDatePickers={setOpenDatePickers}
            />
          )}
        />
        <FormField
          control={form.control}
          name="niscc_annual_fee_date"
          render={({ field }) => (
            <RegistrationDateField
              label="Annual Fee Date"
              fieldName="niscc_annual_fee_date"
              value={field.value ?? ""}
              onChange={field.onChange}
              disabled={fieldDisabled}
              openDatePickers={openDatePickers}
              setOpenDatePickers={setOpenDatePickers}
            />
          )}
        />
        <Button type="submit" disabled={fieldDisabled}>
          {isLoading ? "Saving..." : "Save registration details"}
        </Button>
      </form>
    </Form>
  );
}
