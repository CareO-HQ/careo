"use client";

import { Calendar, Clock, Users } from "lucide-react";

export default function RotaPage() {
  return (
    <div className="w-full h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="p-4 bg-primary/10 rounded-full">
            <Calendar className="w-12 h-12 text-primary" />
          </div>
          <div className="p-4 bg-blue-100 rounded-full">
            <Clock className="w-10 h-10 text-blue-600" />
          </div>
          <div className="p-4 bg-green-100 rounded-full">
            <Users className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground">Staff Rota</h1>

        <div className="space-y-2">
          <p className="text-xl font-semibold text-primary">Coming Soon</p>
          <p className="text-muted-foreground">
            We're working on an advanced staff scheduling and rota management system.
          </p>
        </div>

        <div className="pt-4 space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Features in development:</p>
          <ul className="space-y-1">
            <li>• Shift scheduling and management</li>
            <li>• Staff availability tracking</li>
            <li>• Automatic conflict detection</li>
            <li>• Export and print capabilities</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
