import NewPasswordCard from "@/components/auth/NewPasswordCard";
import { Suspense } from "react";

export default function NewPasswordPage() {
  return (
    <div className="flex flex-col justify-center items-center h-dvh">
      <Suspense fallback={<div>Loading...</div>}>
        <NewPasswordCard />
      </Suspense>
    </div>
  );
}
