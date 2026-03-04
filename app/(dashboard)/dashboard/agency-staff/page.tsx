"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Clock, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AgencyStaffPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="p-2 bg-purple-100 rounded-lg">
          <Briefcase className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Agency Staff</h1>
          <p className="text-muted-foreground text-sm">
            Manage temporary and agency staff members
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-6 bg-purple-50 rounded-full">
                <Clock className="w-16 h-16 text-purple-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Coming Soon</h2>
            </div>

            <div className="pt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-purple-700">
                  In Development
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded">
                <Briefcase className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 mb-1">
                  Manage Profile
                </h3>
                <p className="text-xs text-gray-600">
                  Add and manage agency staff profiles
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 mb-1">
                  Induction
                </h3>
                <p className="text-xs text-gray-600">
                  Track induction and training records
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded">
                <Briefcase className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 mb-1">
                  Shift Info
                </h3>
                <p className="text-xs text-gray-600">
                  Monitor agency staff shifts and hours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
