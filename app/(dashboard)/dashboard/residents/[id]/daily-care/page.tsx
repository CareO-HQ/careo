"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Activity,
  User,
  Utensils,
  Shirt,
  Bath,
  Bed,
  Home
} from "lucide-react";
import { useRouter } from "next/navigation";

type DailyCarePageProps = {
  params: Promise<{ id: string }>;
};

export default function DailyCarePage({ params }: DailyCarePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const [personalCare, setPersonalCare] = React.useState({
    morningWash: false,
    dressed: false,
    nailCare: false,
    incontinence: false,
    hairBrushed: false,
    bedrails: false
  });

  const [extraData, setExtraData] = React.useState("");

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

  const getDependencyIcon = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'mobility':
        return User;
      case 'eating':
        return Utensils;
      case 'dressing':
        return Shirt;
      case 'toileting':
        return Bath;
      default:
        return Activity;
    }
  };

  const getDependencyColor = (level: string) => {
    switch (level) {
      case 'Independent':
        return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' };
      case 'Supervision Needed':
        return { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' };
      case 'Assistance Needed':
        return { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' };
      case 'Fully Dependent':
        return { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
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
        <span className="text-foreground">Daily Care</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Daily Care</h1>
              <p className="text-muted-foreground">Care activities & dependencies for {fullName}</p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="flex items-center space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Resident Page</span>
        </Button>
      </div>

      {/* Today's Personal Care */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Today&apos;s Personal Care</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Morning Wash */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Checkbox 
                id="morningWash"
                checked={personalCare.morningWash}
                onCheckedChange={(checked) => 
                  setPersonalCare(prev => ({ ...prev, morningWash: !!checked }))
                }
              />
              <Label htmlFor="morningWash" className="font-medium cursor-pointer">
                Morning Wash
              </Label>
            </div>

            {/* Dressed */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Checkbox 
                id="dressed"
                checked={personalCare.dressed}
                onCheckedChange={(checked) => 
                  setPersonalCare(prev => ({ ...prev, dressed: !!checked }))
                }
              />
              <Label htmlFor="dressed" className="font-medium cursor-pointer">
                Dressed
              </Label>
            </div>

            {/* Nail Care */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Checkbox 
                id="nailCare"
                checked={personalCare.nailCare}
                onCheckedChange={(checked) => 
                  setPersonalCare(prev => ({ ...prev, nailCare: !!checked }))
                }
              />
              <Label htmlFor="nailCare" className="font-medium cursor-pointer">
                Nail Care
              </Label>
            </div>

            {/* Incontinence */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Checkbox 
                id="incontinence"
                checked={personalCare.incontinence}
                onCheckedChange={(checked) => 
                  setPersonalCare(prev => ({ ...prev, incontinence: !!checked }))
                }
              />
              <Label htmlFor="incontinence" className="font-medium cursor-pointer">
                Incontinence
              </Label>
            </div>

            {/* Hair Brushed */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Checkbox 
                id="hairBrushed"
                checked={personalCare.hairBrushed}
                onCheckedChange={(checked) => 
                  setPersonalCare(prev => ({ ...prev, hairBrushed: !!checked }))
                }
              />
              <Label htmlFor="hairBrushed" className="font-medium cursor-pointer">
                Hair Brushed
              </Label>
            </div>

            {/* Bedrails */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Checkbox 
                id="bedrails"
                checked={personalCare.bedrails}
                onCheckedChange={(checked) => 
                  setPersonalCare(prev => ({ ...prev, bedrails: !!checked }))
                }
              />
              <Label htmlFor="bedrails" className="font-medium cursor-pointer">
                Bedrails Checked
              </Label>
            </div>
          </div>

          {/* Extra Data Input */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="extraData" className="text-sm font-medium text-gray-700">
              Additional Notes (Optional)
            </Label>
            <Input
              id="extraData"
              placeholder="Enter any additional care notes..."
              value={extraData}
              onChange={(e) => setExtraData(e.target.value)}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>


      {/* Care Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bed className="w-5 h-5 text-indigo-600" />
            <span>Care Notes & Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Personal Preferences</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Prefers shower in the evening</li>
                <li>• Likes to be independent when possible</li>
                <li>• Requires verbal encouragement</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Mobility Aids</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Uses walking frame for mobility</li>
                <li>• Requires non-slip mat in bathroom</li>
                <li>• Bed rails for safety</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}