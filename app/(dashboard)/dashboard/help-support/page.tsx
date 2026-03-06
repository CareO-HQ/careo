"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircleQuestionMarkIcon,
  Mail,
  Phone,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function HelpSupportPage() {
  const router = useRouter();

  const usefulLinks = [
    {
      title: "IDDSI Framework",
      url: "https://www.iddsi.org/standards/framework",
    },
    {
      title: "RQIA Care Standards for Nursing Homes",
      url: "https://www.rqia.org.uk/wpfd_file/care-standards-for-nursing-homes-december-2022/",
    },
    {
      title: "NMC Standards & Code",
      url: "https://www.nmc.org.uk/standards/code/",
    },
    {
      title: "Adult Safeguarding - Northern Ireland",
      url: "https://www.health-ni.gov.uk/articles/adult-safeguarding-prevention-and-protection-partnership",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Help & Support</h1>
            <p className="text-muted-foreground text-sm">
              Get help and access useful healthcare resources
            </p>
          </div>
        </div>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleQuestionMarkIcon className="w-5 h-5" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Email Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Get help via email within 24 hours
                  </p>
                  <a
                    href="mailto:care@careo.com"
                    className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                  >
                    care@careo.com
                  </a>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Phone Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Call us during business hours
                  </p>
                  <a
                    href="tel:+447741068115"
                    className="text-sm text-green-600 hover:underline mt-1 inline-block"
                  >
                    +44 7741068115
                  </a>
                </div>
              </div>
            </div>

            {/* Support Hours */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Support Hours</p>
              <p className="text-sm text-muted-foreground">
                Monday - Friday: 9:00 AM - 5:00 PM (GMT)
              </p>
              <p className="text-sm text-muted-foreground">
                Saturday - Sunday: Closed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Useful Links */}
        <Card>
          <CardHeader>
            <CardTitle>Useful Healthcare Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usefulLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-sm font-medium">{link.title}</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
