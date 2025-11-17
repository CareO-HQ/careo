"use client";

import AuthCard from "@/components/auth/AuthCard";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex flex-col justify-center items-center h-dvh w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthCard action="login" google microsoft />
      </Suspense>
    </div>
  );
}
