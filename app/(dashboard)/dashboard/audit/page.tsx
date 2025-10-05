"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audits</h1>
          <p className="text-muted-foreground mt-1">
            Manage and review form audits across your organization
          </p>
        </div>
      </div>

      <Tabs defaultValue="governance" className="w-full">
        <TabsList>
          <TabsTrigger value="governance">Governance</TabsTrigger>
          <TabsTrigger value="medicine">Medicine</TabsTrigger>
          <TabsTrigger value="residents">Residents</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="governance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Governance</CardTitle>
              <CardDescription>
                Governance audit forms and compliance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Governance audits content will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medicine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medicine</CardTitle>
              <CardDescription>
                Medication management and administration audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Medicine audits content will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="residents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Residents</CardTitle>
              <CardDescription>
                Resident care and assessment audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Resident audits content will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>
                Environmental safety and facilities audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Environment audits content will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
