"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  Calendar,
  MapPin,
  AlertTriangle,
  Heart,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";

type ResidentPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function ResidentPage({ params }: ResidentPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

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
            The resident youre looking for doesnt exist.
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

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-muted-foreground">
              Detailed information about {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="text-center pb-4">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src="" alt={fullName} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{fullName}</CardTitle>
              <CardDescription>
                Room {resident.roomNumber || "N/A"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>DOB: {resident.dateOfBirth}</span>
                </div>
                {resident.phoneNumber && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{resident.phoneNumber}</span>
                  </div>
                )}
                {resident.roomNumber && (
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>Room {resident.roomNumber}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Admitted: {resident.admissionDate}</span>
                </div>
                {resident.nhsHealthNumber && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-muted-foreground">NHS:</span>
                    <span className="font-mono">
                      {resident.nhsHealthNumber}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          {resident.emergencyContacts &&
            resident.emergencyContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {resident.emergencyContacts.map((contact, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{contact.name}</span>
                          {contact.isPrimary && (
                            <Badge variant="outline" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contact.relationship}
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="w-3 h-3" />
                          <span>{contact.phoneNumber}</span>
                        </div>
                        {index < resident.emergencyContacts.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Right Column - Medical Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Health Conditions */}
          {resident.healthConditions &&
            resident.healthConditions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span>Health Conditions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(resident.healthConditions) &&
                    typeof resident.healthConditions[0] === "string"
                      ? (resident.healthConditions as string[]).map(
                          (condition, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-red-50 border-red-200"
                            >
                              {condition}
                            </Badge>
                          )
                        )
                      : (
                          resident.healthConditions as { condition: string }[]
                        ).map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-red-50 border-red-200"
                          >
                            {item.condition}
                          </Badge>
                        ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Risks */}
          {resident.risks && resident.risks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Risk Factors</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.isArray(resident.risks) &&
                  typeof resident.risks[0] === "string"
                    ? (resident.risks as string[]).map((risk, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200"
                        >
                          <span>{risk}</span>
                        </div>
                      ))
                    : (
                        resident.risks as { risk: string; level?: string }[]
                      ).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200"
                        >
                          <span>{item.risk}</span>
                          {item.level && (
                            <Badge
                              variant={
                                item.level === "high"
                                  ? "destructive"
                                  : item.level === "medium"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {item.level}
                            </Badge>
                          )}
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dependencies */}
          {resident.dependencies && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <span>Care Dependencies</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(resident.dependencies) ? (
                  <div className="flex flex-wrap gap-2">
                    {(resident.dependencies as string[]).map((dep, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-blue-50 border-blue-200"
                      >
                        {dep}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(
                      resident.dependencies as {
                        mobility: string;
                        eating: string;
                        dressing: string;
                        toileting: string;
                      }
                    ).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <span className="font-medium capitalize">{key}</span>
                        <Badge
                          variant={
                            value === "Independent" ? "outline" : "secondary"
                          }
                          className="text-xs"
                        >
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
