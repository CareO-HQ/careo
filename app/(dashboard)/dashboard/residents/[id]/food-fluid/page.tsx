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
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Utensils,
  Droplets,
  Plus,
  Calendar,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";

type FoodFluidPageProps = {
  params: Promise<{ id: string }>;
};

export default function FoodFluidPage({ params }: FoodFluidPageProps) {
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

      {/* Header with resident info */}
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

      {/* Resident Information Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="w-20 h-20 mx-auto md:mx-0">
              <AvatarImage
                src={resident.imageUrl}
                alt={fullName}
                className="border"
              />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                  <span className="mr-1">🏠</span>
                  Room {resident.roomNumber || "N/A"}
                </Badge>
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                  <Calendar className="w-3 h-3 mr-1" />
                  {getCurrentDate()}
                </Badge>
                {resident.nhsHealthNumber && (
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                    NHS: {resident.nhsHealthNumber}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Food & Fluid Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Intake Card */}
        <Card className="border-2 border-yellow-200 bg-yellow-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Utensils className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <span className="text-yellow-800">Food Intake</span>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Track meals and nutritional intake
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Utensils className="w-12 h-12 text-yellow-300 mx-auto mb-3" />
              <p className="text-yellow-700 font-medium mb-2">No food records today</p>
              <p className="text-sm text-yellow-600 mb-4">Start tracking {fullName}&apos;s food intake</p>
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Food Entry
              </Button>
            </div>
            
            {/* Quick meal buttons for future implementation */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">Quick meal logging:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">🌅</span>
                  Breakfast
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">☀️</span>
                  Lunch
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">🌙</span>
                  Dinner
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fluid Intake Card */}
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-blue-800">Fluid Intake</span>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Monitor hydration levels
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Droplets className="w-12 h-12 text-blue-300 mx-auto mb-3" />
              <p className="text-blue-700 font-medium mb-2">No fluid records today</p>
              <p className="text-sm text-blue-600 mb-4">Start tracking {fullName}&apos;s fluid intake</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Fluid Entry
              </Button>
            </div>

            {/* Quick fluid type buttons for future implementation */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">Common fluids:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">💧</span>
                  Water
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">☕</span>
                  Tea/Coffee
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">🥤</span>
                  Juice
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <span className="mr-1">🥛</span>
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