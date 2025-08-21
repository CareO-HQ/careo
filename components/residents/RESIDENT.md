# Resident Forms Guide

## Overview
This guide outlines how to create forms for the CareO care home management application. All resident-related forms should follow these guidelines for consistency and maintainability.

## File Structure

components/residents/
├── forms/                    # All resident forms go here
│   ├── CreateResidentForm.tsx
│   ├── EditResidentForm.tsx
│   ├── MedicalInfoForm.tsx
│   └── ...other forms
├── components/              # Reusable resident components
└── RESIDENT.md             # This guide
```

## Step-by-Step Form Creation

### 1. Create the Schema
**Location**: `/schemas/residents/`
**File naming**: `[FormName]Schema.ts`

```typescript
// Example: /schemas/residents/CreateResidentSchema.ts
import z from "zod";

export const CreateResidentSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  // Add other fields as needed
});
```

### 2. Create the Form Component
**Location**: `/components/residents/forms/`
**File naming**: `[FormName]Form.tsx`

#### Required Imports:
```typescript
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { YourSchema } from "@/schemas/residents/YourSchema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransition } from "react";
import { toast } from "sonner";
```

#### Component Structure:
```typescript
interface YourFormProps {
  onSubmit?: (values: z.infer<typeof YourSchema>) => void;
  onCancel?: () => void;
  defaultValues?: Partial<z.infer<typeof YourSchema>>;
}

export default function YourForm({ onSubmit: onSubmitProp, onCancel, defaultValues }: YourFormProps) {
  const [isLoading, startTransition] = useTransition();
  
  const form = useForm<z.infer<typeof YourSchema>>({
    resolver: zodResolver(YourSchema),
    defaultValues: {
      // Set your defaults here
      ...defaultValues
    }
  });

  function onSubmit(values: z.infer<typeof YourSchema>) {
    startTransition(async () => {
      try {
        if (onSubmitProp) {
          await onSubmitProp(values);
          toast.success("Success message");
          form.reset();
        }
      } catch (error) {
        toast.error("Error message");
        console.error("Error:", error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
        {/* Your form fields here */}
      </form>
    </Form>
  );
}
```

### 3. Form Field Guidelines

#### Required Fields:
- Use `<FormLabel isRequired>` for required fields
- Add proper validation messages in schema

#### Personal Information:
- First Name, Last Name (required)
- Date of Birth (required, type="date")
- Phone Number (optional, with placeholder format)
- Address fields if needed

#### Care Home Specific Fields:
- Room Number
- Admission Date (required)
- Care Level (if applicable)
- Dietary Requirements
- Mobility Status

#### Emergency Contact:
- Contact Name (required)
- Phone Number (required)
- Relationship (required)
- Secondary contact (optional)

#### Medical Information:
- Allergies
- Current Medications
- Medical Conditions
- Doctor Information
- Insurance Details

### 4. Layout Best Practices

#### Use Cards for Grouping:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Personal Information</CardTitle>
    <CardDescription>Basic resident details</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Form fields */}
  </CardContent>
</Card>
```

#### Responsive Grid Layout:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Form fields */}
</div>
```

#### Action Buttons:
```typescript
<div className="flex gap-4 justify-end">
  {onCancel && (
    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
      Cancel
    </Button>
  )}
  <Button type="submit" disabled={isLoading}>
    {isLoading ? "Saving..." : "Save Resident"}
  </Button>
</div>
```

### 5. Data Validation Rules

#### Common Validations:
- **Names**: `z.string().min(1, { message: "Name is required" })`
- **Phone**: `z.string().regex(/^\+?[\d\s\-\(\)]+$/, { message: "Invalid phone format" })`
- **Email**: `z.string().email({ message: "Invalid email format" })`
- **Dates**: `z.string().min(1, { message: "Date is required" })`

#### Care Home Specific:
- **Room Number**: `z.string().regex(/^\d+[A-Z]?$/, { message: "Invalid room format" })`
- **Medical ID**: Validate according to your system requirements

### 6. Error Handling

#### Toast Messages:
- Success: "Resident created successfully"
- Error: "Error creating resident"
- Validation: Use schema validation messages

#### Form Reset:
```typescript
// Reset form after successful submission
form.reset();
```

### 7. Accessibility Guidelines

- Use proper ARIA labels
- Ensure keyboard navigation works
- Provide clear error messages
- Use semantic HTML elements

### 8. Integration with Backend

#### API Integration:
```typescript
// In your page/component that uses the form
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const createResidentMutation = useMutation(api.residents.create);

const handleFormSubmit = async (values: FormData) => {
  await createResidentMutation(values);
};
```

### 9. Testing Considerations

- Test all required field validations
- Test form submission and error states
- Test responsive layout on different screen sizes
- Verify accessibility compliance

### 10. Common Form Types for Care Home

#### Essential Forms:
- `CreateResidentForm.tsx` - New resident admission
- `EditResidentForm.tsx` - Update resident information
- `MedicalInfoForm.tsx` - Medical records and updates
- `EmergencyContactForm.tsx` - Emergency contact management
- `CareNotesForm.tsx` - Daily care notes entry
- `MedicationForm.tsx` - Medication administration
- `IncidentReportForm.tsx` - Incident reporting
- `VisitorForm.tsx` - Visitor registration

#### Optional Forms:
- `DietaryRequirementsForm.tsx`
- `ActivityParticipationForm.tsx`
- `FamilyContactForm.tsx`
- `InsuranceInfoForm.tsx`

## Best Practices Summary

1. **Consistency**: Follow the same structure across all forms
2. **Validation**: Always validate on both client and server
3. **User Experience**: Provide clear feedback and error messages
4. **Security**: Never expose sensitive data unnecessarily
5. **Performance**: Use loading states and optimize re-renders
6. **Accessibility**: Ensure forms are usable by everyone
7. **Documentation**: Comment complex validation logic

## File Naming Convention

- Forms: `[Action][Entity]Form.tsx` (e.g., `CreateResidentForm.tsx`)
- Schemas: `[Action][Entity]Schema.ts` (e.g., `CreateResidentSchema.ts`)
- Types: `[Entity]Types.ts` (e.g., `ResidentTypes.ts`)