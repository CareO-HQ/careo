"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Mail, Phone, Loader2 } from "lucide-react";
import UsefulResources from "@/components/help/UsefulResources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Form validation schema
const supportFormSchema = z.object({
  careHomeName: z.string().min(2, "Care home name is required"),
  staffName: z.string().min(2, "Staff name is required"),
  email: z.string().email("Valid email is required").min(1, "Email is required"),
  contactNumber: z.string().optional(),
  inquiryType: z.enum(["question", "complaint", "support_request"], {
    required_error: "Please select an inquiry type",
  }),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

export default function HelpAndSupportPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      careHomeName: "",
      staffName: "",
      email: "",
      contactNumber: "",
      inquiryType: undefined,
      message: "",
    },
  });

  const onSubmit = async (data: SupportFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/help-support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      toast.success("Thanks for reaching out. We will contact you as soon as possible.");
      form.reset();
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 -ml-2 h-8 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/60"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              Help & Support
            </h1>
            <p className="text-sm text-gray-600">
              Find helpful resources and get in touch with our support team
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Contact & Support Form */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-0.5">
                Contact & Support
              </h2>
              <p className="text-xs text-gray-600">
                Send us your questions, feedback, or support requests
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-lg p-4 shadow-sm shadow-blue-100/20">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
                  <FormField
                    control={form.control}
                    name="careHomeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required className="text-xs font-medium text-gray-700">Care Home Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter care home name"
                            {...field}
                            className="h-8 text-sm bg-white border-gray-200 focus:border-blue-200 focus:ring-1 focus:ring-blue-100 transition-all"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="staffName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required className="text-xs font-medium text-gray-700">Staff Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your name"
                            {...field}
                            className="h-8 text-sm bg-white border-gray-200 focus:border-blue-200 focus:ring-1 focus:ring-blue-100 transition-all"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required className="text-xs font-medium text-gray-700">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your.email@example.com"
                            {...field}
                            className="h-8 text-sm bg-white border-gray-200 focus:border-blue-200 focus:ring-1 focus:ring-blue-100 transition-all"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-700">Contact Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional"
                            {...field}
                            className="h-8 text-sm bg-white border-gray-200 focus:border-blue-200 focus:ring-1 focus:ring-blue-100 transition-all"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inquiryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required className="text-xs font-medium text-gray-700">Inquiry Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm bg-white border-gray-200 focus:border-blue-200 focus:ring-1 focus:ring-blue-100 transition-all">
                              <SelectValue placeholder="Select inquiry type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="question" className="text-sm">Question</SelectItem>
                            <SelectItem value="complaint" className="text-sm">Complaint</SelectItem>
                            <SelectItem value="support_request" className="text-sm">Support Request</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required className="text-xs font-medium text-gray-700">Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your inquiry..."
                            className="min-h-[100px] text-sm resize-none bg-white border-gray-200 focus:border-blue-200 focus:ring-1 focus:ring-blue-100 transition-all"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-8 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-normal transition-all shadow-sm hover:shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Quick Contact Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-lg p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-100/60 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900 mb-0.5">
                    Need immediate assistance?
                  </p>
                  <p className="text-xs text-gray-600">
                    Available Monday to Friday, 9:00 AM - 5:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Useful Resources */}
          <UsefulResources />
        </div>
      </div>
    </div>
  );
}
