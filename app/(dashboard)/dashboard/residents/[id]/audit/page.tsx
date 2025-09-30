"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";

type AuditPageProps = {
  params: Promise<{ id: string }>;
};

export default function AuditPage({ params }: AuditPageProps) {
  const { id } = React.use(params);

  return (
    <div>
      <div className="flex flex-col">
        <p className="font-semibold text-xl">Resident Audit</p>
        <p className="text-sm text-muted-foreground">
          Comprehensive care quality audits and documentation
        </p>
      </div>

      <Tabs defaultValue="care-file" className="w-fit mt-6">
        <TabsList>
          <TabsTrigger value="care-file">Care File</TabsTrigger>
          <TabsTrigger value="nutrition-weight">Nutrition & Weight</TabsTrigger>
          <TabsTrigger value="wounds-tissue">Wounds/Tissue</TabsTrigger>
          <TabsTrigger value="falls">Falls</TabsTrigger>
          <TabsTrigger value="restrictive-practices">Restrictive Practices</TabsTrigger>
          <TabsTrigger value="medication-admin">Medication Admin</TabsTrigger>
          <TabsTrigger value="resident-experience">Resident Experience</TabsTrigger>
        </TabsList>

        <TabsContent value="care-file" className="mt-4">
          <p className="text-muted-foreground">
            Care File – assessments, plans, reviews, consent
          </p>
        </TabsContent>

        <TabsContent value="nutrition-weight" className="mt-4">
          <p className="text-muted-foreground">
            Nutrition & Weight monitoring trends
          </p>
        </TabsContent>

        <TabsContent value="wounds-tissue" className="mt-4">
          <p className="text-muted-foreground">
            Wounds / Tissue Viability (≥ Grade 2 notifications)
          </p>
        </TabsContent>

        <TabsContent value="falls" className="mt-4">
          <p className="text-muted-foreground">
            Falls – post-falls review + trend logging
          </p>
        </TabsContent>

        <TabsContent value="restrictive-practices" className="mt-4">
          <p className="text-muted-foreground">
            Restrictive Practices – oversight, reduction, resident-specific logs
          </p>
        </TabsContent>

        <TabsContent value="medication-admin" className="mt-4">
          <p className="text-muted-foreground">
            Medication administration errors/resident MAR chart audit
          </p>
        </TabsContent>

        <TabsContent value="resident-experience" className="mt-4">
          <p className="text-muted-foreground">
            Resident Experience – satisfaction surveys, meeting notes
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
